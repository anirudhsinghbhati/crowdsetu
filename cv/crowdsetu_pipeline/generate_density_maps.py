"""
generate_density_maps.py
--------------------------
Converts ShanghaiTech dataset's raw point annotations (one (x,y) dot per person's head,
stored in .mat files) into the Gaussian density maps CSRNet actually trains on.

Why this step exists: the dataset doesn't give you density maps directly — it gives you
"here are the 47 (x,y) pixel coordinates of 47 heads in this image." CSRNet needs a
continuous density SURFACE as its training target, not discrete points. We build that by
placing a small 2D Gaussian "blob" at each head location and summing them — this way,
summing the resulting density map gives back exactly the original head count (each
Gaussian integrates to 1), and it gives the model a smooth signal to regress instead
of a series of impossible-to-hit delta spikes.

Two sigma strategies (matching the original CSRNet paper):
  - FIXED sigma: same blob size everywhere. Simpler, works fine for Part B (sparser,
    more uniform crowds — most images are indoor/street scenes with people at
    roughly the same scale).
  - GEOMETRY-ADAPTIVE sigma: blob size scales with local crowd density (uses each
    point's distance to its nearest neighbors) — better for Part A's extremely dense,
    highly-perspective-distorted scenes, but needs scipy.spatial.KDTree and is slower
    to generate.

Recommendation for your project timeline: start with Part B + fixed sigma. It trains
much faster on a free Colab GPU and is enough to get a real, working checkpoint for
your demo. Mention Part A / adaptive sigma as a "with more time/compute" extension
in your report.

Usage:
    python generate_density_maps.py --dataset_root /content/ShanghaiTech/part_B_final \
        --split train_data --sigma_mode fixed --sigma 15

Expects the standard ShanghaiTech layout:
    part_B_final/
      train_data/
        images/IMG_1.jpg, IMG_2.jpg, ...
        ground-truth/GT_IMG_1.mat, GT_IMG_2.mat, ...
      test_data/
        images/...
        ground-truth/...

Writes one .npy density map per image, same filename stem, into a sibling
`density_maps/` folder next to `images/`.
"""

import argparse
import os
import time
from functools import lru_cache
from pathlib import Path

import numpy as np
import scipy.io as sio
from scipy.spatial import KDTree

from crowdsetu.logging import configure_logging, get_logger, log_context


logger = get_logger(__name__)


def load_head_points(mat_path: str) -> np.ndarray:
    """
    ShanghaiTech .mat files store points at image_info[0,0][0,0][0], an (N, 2) array
    of (x, y) pixel coordinates. Structure is a MATLAB-style nested struct — this is
    the standard, well-documented layout for this dataset.
    """
    mat = sio.loadmat(mat_path)
    points = mat["image_info"][0, 0][0, 0][0]
    points = np.asarray(points, dtype=np.float64)
    if points.size == 0:
        return np.empty((0, 2), dtype=np.float64)
    points = points.reshape(-1, 2)
    return points


@lru_cache(maxsize=512)
def _gaussian_kernel(sigma_key: float) -> np.ndarray:
    radius = max(1, int(np.ceil(3 * sigma_key)))
    coordinates = np.arange(-radius, radius + 1, dtype=np.float32)
    xx, yy = np.meshgrid(coordinates, coordinates)
    kernel = np.exp(-(xx * xx + yy * yy) / (2 * sigma_key * sigma_key))
    return kernel.astype(np.float32)


def _add_normalized_gaussian(density: np.ndarray, x: int, y: int, sigma: float) -> None:
    kernel = _gaussian_kernel(round(float(sigma), 3))
    radius_y, radius_x = kernel.shape[0] // 2, kernel.shape[1] // 2
    height, width = density.shape
    x_start, x_end = max(0, x - radius_x), min(width, x + radius_x + 1)
    y_start, y_end = max(0, y - radius_y), min(height, y + radius_y + 1)
    kernel_x_start = x_start - (x - radius_x)
    kernel_y_start = y_start - (y - radius_y)
    kernel_crop = kernel[
        kernel_y_start:kernel_y_start + (y_end - y_start),
        kernel_x_start:kernel_x_start + (x_end - x_start),
    ]
    density[y_start:y_end, x_start:x_end] += kernel_crop / kernel_crop.sum()


def fixed_sigma_density_map(image_shape, points: np.ndarray, sigma: float = 15.0) -> np.ndarray:
    """
    Places a fixed-size Gaussian at every head point and sums them. Fast, and a good
    fit for ShanghaiTech Part B where crowds are sparser and roughly uniform in scale.
    """
    h, w = image_shape[:2]
    density = np.zeros((h, w), dtype=np.float32)
    if len(points) == 0:
        return density

    for x, y in points:
        if 0 <= x < w and 0 <= y < h:
            xi = min(max(int(round(x)), 0), w - 1)
            yi = min(max(int(round(y)), 0), h - 1)
            _add_normalized_gaussian(density, xi, yi, sigma)

    return density


def geometry_adaptive_density_map(image_shape, points: np.ndarray, beta: float = 0.3,
                                    k_neighbors: int = 3, min_sigma: float = 2.0,
                                    max_sigma: float = 20.0) -> np.ndarray:
    """
    CSRNet paper's approach for dense, highly congested scenes (ShanghaiTech Part A):
    the Gaussian's spread at each point is proportional to that point's average
    distance to its k nearest neighboring heads. Dense areas -> smaller blobs
    (heads are small/close together); sparse areas -> larger blobs. This roughly
    compensates for perspective distortion (near/large heads vs far/small heads)
    better than a single fixed sigma.
    """
    h, w = image_shape[:2]
    density = np.zeros((h, w), dtype=np.float32)
    n_points = len(points)
    if n_points == 0:
        return density

    if n_points > k_neighbors:
        tree = KDTree(points)
        distances, _ = tree.query(points, k=k_neighbors + 1)  # +1: includes the point itself
        avg_distances = distances[:, 1:].mean(axis=1)
    else:
        avg_distances = np.full(n_points, (h + w) / 8.0)  # fallback for very sparse images

    for i, (x, y) in enumerate(points):
        if 0 <= x < w and 0 <= y < h:
            xi = min(max(int(round(x)), 0), w - 1)
            yi = min(max(int(round(y)), 0), h - 1)
            sigma = np.clip(beta * avg_distances[i], min_sigma, max_sigma)
            _add_normalized_gaussian(density, xi, yi, sigma)

    return density


def resolve_part_dir(dataset_root: str | Path, part: str | None) -> Path:
    root = Path(dataset_root)
    if root.name in {"part_A", "part_A_final", "part_B", "part_B_final"}:
        return root
    if part is None:
        raise ValueError("--part is required when --dataset_root is the ShanghaiTech parent")
    candidates = [root / part, root / f"{part}_final"]
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    raise FileNotFoundError(f"Could not find {part} or {part}_final below {root}")


def process_split(
    dataset_root: str,
    split: str,
    sigma_mode: str,
    sigma: float,
    part: str | None = None,
    output_root: str | None = None,
    overwrite: bool = False,
):
    import cv2  # local import: only needed here, keeps the module importable without cv2

    part_dir = resolve_part_dir(dataset_root, part)
    images_dir = part_dir / split / "images"
    gt_dir = part_dir / split / "ground-truth"
    out_dir = (
        Path(output_root) / part_dir.name / split
        if output_root
        else part_dir / split / "density_maps"
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    image_files = sorted(
        f for f in os.listdir(images_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))
    )
    started = time.perf_counter()
    logger.info(
        "density map generation started",
        **log_context(images_dir=str(images_dir), output_dir=str(out_dir), image_count=len(image_files)),
    )

    processed = 0
    skipped = 0
    for i, fname in enumerate(image_files):
        stem = os.path.splitext(fname)[0]
        mat_path = os.path.join(gt_dir, f"GT_{stem}.mat")
        if not os.path.exists(mat_path):
            logger.warning("ground-truth file missing", **log_context(filename=fname))
            continue

        image = cv2.imread(os.path.join(images_dir, fname))
        if image is None:
            logger.warning("image could not be read", **log_context(filename=fname))
            continue

        points = load_head_points(mat_path)

        if sigma_mode == "fixed":
            density = fixed_sigma_density_map(image.shape, points, sigma=sigma)
        else:
            density = geometry_adaptive_density_map(image.shape, points)

        out_path = out_dir / f"{stem}.npy"
        if out_path.exists() and not overwrite:
            skipped += 1
            continue
        np.save(out_path, density)
        processed += 1

        if (i + 1) % 50 == 0 or (i + 1) == len(image_files):
            logger.info("density map progress", **log_context(processed=i + 1, total=len(image_files)))

    logger.info(
        "density map generation complete",
        **log_context(
            output_dir=str(out_dir),
            generated=processed,
            skipped=skipped,
            elapsed_seconds=round(time.perf_counter() - started, 3),
        ),
    )


if __name__ == "__main__":
    configure_logging()
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset_root", required=True,
                         help="Path to ShanghaiTech parent or a part_A/part_B directory")
    parser.add_argument("--part", choices=["part_A", "part_B"], default=None,
                         help="Part name when dataset_root is the parent directory")
    parser.add_argument("--split", default="train_data", choices=["train_data", "test_data"])
    parser.add_argument("--sigma_mode", default="fixed", choices=["fixed", "adaptive"])
    parser.add_argument("--sigma", type=float, default=15.0, help="Used only if sigma_mode=fixed")
    parser.add_argument("--output_root", default=None,
                         help="External output root, e.g. dataset/density_maps")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    process_split(
        args.dataset_root,
        args.split,
        args.sigma_mode,
        args.sigma,
        part=args.part,
        output_root=args.output_root,
        overwrite=args.overwrite,
    )
