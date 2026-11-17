"""
preprocessing.py
-----------------
Your part of the pipeline: turn a raw CCTV frame into a clean tensor CSRNet can consume,
and handle the OpenCV-side plumbing (video/RTSP capture, zone cropping, frame sampling).

Design notes for CrowdSetu specifically:
  - Each physical "zone" (a gate, a queue corridor, a courtyard section) should map to
    ONE rectangular or polygon ROI in the camera frame. Define these once per camera
    during setup (see ZoneConfig below) rather than processing the whole frame as one blob —
    otherwise a dense corner of frame gives a false high reading for the whole area.
  - CSRNet was trained on ImageNet-normalized inputs, so normalization MUST match training
    (mean/std below) or the density numbers will be systematically wrong.
  - Frame sampling: you do NOT need to run inference on every frame of a video feed.
    Crowd density does not change meaningfully frame-to-frame at 25-30fps. Sample every
    N seconds (e.g. every 1-2s) per camera to keep GPU/CPU load sane across 4 temples x
    many cameras.
"""

from dataclasses import dataclass, field
from typing import List, Tuple, Optional

import cv2
import numpy as np
import torch

# ImageNet normalization stats (must match what CSRNet's VGG16 frontend was trained with)
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


@dataclass
class ZoneConfig:
    """
    Defines one monitored zone within a camera's field of view.

    polygon: list of (x, y) pixel points in the ORIGINAL frame defining the zone boundary
             (use a simple rectangle to start: 4 corner points).
    real_area_sqm: the REAL WORLD area (in square meters) that this polygon covers on the
             ground. You get this by measuring the physical space (tape measure / floor
             plan / known tile sizes) — this is what turns "estimated head count in this
             region" into "people per square meter", which is the number that actually
             predicts stampede risk.
    zone_id: identifier matching the zone in your backend DB.
    """
    zone_id: str
    polygon: List[Tuple[int, int]]
    real_area_sqm: float
    perspective_weight_map: Optional[np.ndarray] = field(default=None, repr=False)


def open_capture(source) -> cv2.VideoCapture:
    """
    source can be:
      - an int (0, 1, ...) for a local webcam,
      - a file path (for testing on a recorded clip),
      - an RTSP/HTTP URL string supplied through a secret-managed environment setting
    """
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        raise IOError(f"Could not open video source: {source}")
    return cap


def sample_frames(cap: cv2.VideoCapture, sample_every_sec: float = 1.5):
    """
    Generator that yields frames sampled at a fixed time interval instead of every frame,
    so you don't waste compute re-scoring near-identical consecutive frames.
    """
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_interval = max(1, int(round(fps * sample_every_sec)))
    frame_idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_idx % frame_interval == 0:
            yield frame, frame_idx
        frame_idx += 1


def crop_zone(frame: np.ndarray, zone: ZoneConfig) -> Tuple[np.ndarray, Tuple[int, int]]:
    """
    Crops the bounding rectangle of the zone polygon and masks out anything outside the
    actual polygon (important if the zone isn't a clean rectangle, e.g. an L-shaped corridor).
    Returns (cropped_masked_frame, (x_offset, y_offset)) — offset is useful if you later
    want to draw the heatmap back onto the full frame.
    """
    pts = np.array(zone.polygon, dtype=np.int32)
    frame_height, frame_width = frame.shape[:2]
    x, y, w, h = cv2.boundingRect(pts)
    x_start, y_start = max(x, 0), max(y, 0)
    x_end, y_end = min(x + w, frame_width), min(y + h, frame_height)
    if x_start >= x_end or y_start >= y_end:
        raise ValueError(f"Zone '{zone.zone_id}' does not overlap the frame")

    cropped = frame[y_start:y_end, x_start:x_end].copy()

    mask = np.zeros(cropped.shape[:2], dtype=np.uint8)
    shifted_pts = pts - [x_start, y_start]
    cv2.fillPoly(mask, [shifted_pts], 255)
    masked = cv2.bitwise_and(cropped, cropped, mask=mask)

    return masked, (x_start, y_start)


def preprocess_for_model(bgr_frame: np.ndarray, target_max_dim: int = 1024) -> torch.Tensor:
    """
    Full OpenCV -> tensor pipeline for one zone crop:
      1. Resize (cap the longest side; CSRNet is fully convolutional so exact size is
         flexible, but very large frames blow up GPU memory for no accuracy benefit).
      2. BGR -> RGB (OpenCV loads BGR, torchvision/ImageNet models expect RGB).
      3. Scale to [0, 1], then normalize with ImageNet mean/std.
      4. HWC -> CHW, add batch dimension.
    Returns a torch.Tensor of shape (1, 3, H, W), ready for model(tensor).
    """
    h, w = bgr_frame.shape[:2]
    scale = min(1.0, target_max_dim / max(h, w))
    if scale < 1.0:
        bgr_frame = cv2.resize(bgr_frame, (int(w * scale), int(h * scale)),
                                interpolation=cv2.INTER_AREA)

    rgb = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    normalized = (rgb - IMAGENET_MEAN) / IMAGENET_STD
    chw = np.transpose(normalized, (2, 0, 1))
    tensor = torch.from_numpy(chw).unsqueeze(0).float()
    return tensor
