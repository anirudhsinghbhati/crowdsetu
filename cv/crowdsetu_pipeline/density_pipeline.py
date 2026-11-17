"""
density_pipeline.py
--------------------
Ties together: OpenCV preprocessing -> CSRNet inference -> output processing.

This is the "process the output" part of your task: turning a raw density map
(a 2D array of floats where each pixel is a fractional "amount of person" at that
location) into the numbers CrowdSetu's backend actually needs:

    1. estimated_count   = sum of all values in the density map
    2. density_score     = estimated_count / real_area_sqm   (people per m²)
    3. alert decision     = compare density_score against the zone's configured threshold
    4. heatmap overlay    = for the admin dashboard's live visual

IMPORTANT — perspective/calibration caveat (read this, it matters for your demo):
CSRNet's raw pixel-sum count assumes a roughly uniform camera-to-ground mapping.
Real CCTV cameras are mounted at an angle, so people near the camera occupy far more
pixels than people far away — a naive "just sum the density map" will OVER-count near
zones and UNDER-count far zones relative to real people. Two practical fixes, in order
of effort:
    (a) Quick/MVP: use a single empirically-tuned scale_factor per camera, calibrated
        by counting real people in a test frame and dividing by the raw model sum.
    (b) Better: build a per-pixel perspective weight map (denser weight for far-away
        pixels) using known reference object sizes or a homography to the ground plane,
        then do a WEIGHTED sum instead of a flat sum. See `build_perspective_weight_map`.
For your college project demo, (a) is perfectly defensible — just document that you're
aware of the limitation and treat it as a "Phase 2 refinement" in your report.
"""

from dataclasses import dataclass
from typing import Dict, Optional
import time

import cv2
import numpy as np
import torch

from crowdsetu.alerts import AlertLevel
from crowdsetu.camera_health import CameraHealthState
from preprocessing import ZoneConfig, crop_zone, preprocess_for_model


@dataclass
class ZoneResult:
    zone_id: str
    timestamp: float
    estimated_count: float
    density_score: float          # people per square meter
    threshold: float
    alert: bool
    suggested_action: Optional[str]
    density_map: np.ndarray       # raw model output, kept for heatmap rendering
    camera_id: str = ""
    model_version: str = "unknown"
    camera_health: CameraHealthState = CameraHealthState.HEALTHY
    alert_level: AlertLevel = AlertLevel.NORMAL


class DensityPipeline:
    def __init__(self, model, device: str = "cpu", scale_factor: float = 1.0):
        """
        Args:
            model: a loaded CSRNet (see csrnet_model.load_csrnet)
            device: "cpu" or "cuda"
            scale_factor: empirical calibration constant (see module docstring, option (a)).
                          Multiplies the raw model count. Start at 1.0, calibrate against
                          a manually-counted reference frame, then fix per camera.
        """
        self.model = model
        self.device = device
        self.scale_factor = scale_factor

    @torch.no_grad()
    def run_on_zone(
        self,
        frame: np.ndarray,
        zone: ZoneConfig,
        density_threshold: float,
        action_map: Dict[str, str] = None,
    ) -> ZoneResult:
        """
        Full pipeline for a single zone in a single frame.

        action_map: optional dict of {"warning": "...", "critical": "..."} style messages;
                    here we just use a single threshold -> single suggested action for
                    simplicity, but you can extend to multi-level (amber/red) easily.
        """
        cropped, _offset = crop_zone(frame, zone)
        tensor = preprocess_for_model(cropped).to(self.device)

        output = self.model(tensor)                      # shape (1, 1, h', w')
        density_map = output.squeeze().cpu().numpy()      # shape (h', w')

        raw_count = float(density_map.sum())
        estimated_count = raw_count * self.scale_factor
        density_score = estimated_count / zone.real_area_sqm if zone.real_area_sqm > 0 else 0.0

        alert = density_score >= density_threshold
        suggested_action = None
        if alert:
            suggested_action = (
                action_map.get("critical", "Ask a human operator to coordinate crowd-flow intervention.")
                if action_map else
                "Ask a human operator to coordinate crowd-flow intervention."
            )

        return ZoneResult(
            zone_id=zone.zone_id,
            timestamp=time.time(),
            estimated_count=round(estimated_count, 1),
            density_score=round(density_score, 3),
            threshold=density_threshold,
            alert=alert,
            suggested_action=suggested_action,
            density_map=density_map,
        )


def render_heatmap_overlay(original_frame: np.ndarray, density_map: np.ndarray,
                            alpha: float = 0.45) -> np.ndarray:
    """
    Produces a color heatmap overlay for the admin dashboard preview — this is the
    "process the output visually" piece. Not required for the alert logic itself,
    but very useful for demos and for the control room UI.
    """
    h, w = original_frame.shape[:2]
    norm = density_map - density_map.min()
    if norm.max() > 0:
        norm = norm / norm.max()
    norm_uint8 = (norm * 255).astype(np.uint8)
    norm_resized = cv2.resize(norm_uint8, (w, h), interpolation=cv2.INTER_CUBIC)
    heatmap = cv2.applyColorMap(norm_resized, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(heatmap, alpha, original_frame, 1 - alpha, 0)
    return overlay


def build_perspective_weight_map(frame_shape, near_weight: float, far_weight: float) -> np.ndarray:
    """
    Skeleton for option (b) in the module docstring: a simple linear vertical gradient
    weight map assuming the camera looks roughly "downward and outward" (far = top of
    frame, near = bottom of frame — typical for elevated CCTV). Multiply this elementwise
    against the density map BEFORE summing, instead of using a flat scale_factor.

    This is a starting approximation, not a full homography — good enough to mention
    in your report as the "next step beyond MVP calibration".
    """
    h, w = frame_shape[:2]
    gradient = np.linspace(far_weight, near_weight, h, dtype=np.float32)
    weight_map = np.tile(gradient.reshape(h, 1), (1, w))
    return weight_map
