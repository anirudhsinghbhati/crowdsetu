"""Verify ShanghaiTech density-map sums against annotated head counts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import cv2
import numpy as np
import scipy.io as sio

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from generate_density_maps import resolve_part_dir


def load_head_points(path: Path) -> np.ndarray:
    mat = sio.loadmat(path)
    return mat["image_info"][0, 0][0, 0][0].astype(np.float64)


def _write_overlay(image_path: Path, density_path: Path, output_path: Path) -> None:
    image = cv2.imread(str(image_path))
    density = np.load(density_path)
    normalized = density - density.min()
    if normalized.max() > 0:
        normalized = normalized / normalized.max()
    heatmap = cv2.applyColorMap((normalized * 255).astype(np.uint8), cv2.COLORMAP_JET)
    heatmap = cv2.resize(heatmap, (image.shape[1], image.shape[0]), interpolation=cv2.INTER_CUBIC)
    overlay = cv2.addWeighted(image, 0.55, heatmap, 0.45, 0)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), overlay)


def verify_split(
    dataset_root: Path,
    split: str,
    tolerance: float,
    top_k: int,
    density_root: Path | None = None,
    samples_dir: Path | None = None,
    sample_count: int = 0,
) -> dict:
    split_root = dataset_root / split
    image_dir = split_root / "images"
    density_dir = (
        density_root / dataset_root.name / split if density_root is not None else split_root / "density_maps"
    )
    ground_truth_dir = split_root / "ground-truth"
    if not image_dir.is_dir() or not density_dir.is_dir() or not ground_truth_dir.is_dir():
        raise FileNotFoundError(
            f"Expected images, density_maps, and ground-truth under {split_root}"
        )

    records = []
    missing = []
    for image_path in sorted(image_dir.iterdir()):
        if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue
        stem = image_path.stem
        mat_path = ground_truth_dir / f"GT_{stem}.mat"
        density_path = density_dir / f"{stem}.npy"
        if not mat_path.exists() or not density_path.exists():
            missing.append(stem)
            continue
        expected = float(len(load_head_points(mat_path)))
        observed = float(np.load(density_path).sum())
        relative_error = abs(observed - expected) / max(expected, 1.0)
        records.append(
            {
                "image": image_path.name,
                "annotated_count": expected,
                "density_sum": observed,
                "relative_error": relative_error,
                "within_tolerance": relative_error <= tolerance,
            }
        )

    offenders = sorted(records, key=lambda record: record["relative_error"], reverse=True)
    if samples_dir and records:
        for record in records[:sample_count]:
            image_path = image_dir / record["image"]
            density_path = density_dir / f"{image_path.stem}.npy"
            output_path = samples_dir / f"{dataset_root.name}_{split}_{image_path.stem}.jpg"
            _write_overlay(image_path, density_path, output_path)
    relative_errors = [record["relative_error"] for record in records]
    return {
        "dataset_root": str(dataset_root),
        "split": split,
        "tolerance": tolerance,
        "images_checked": len(records),
        "missing_files": missing,
        "within_tolerance": sum(record["within_tolerance"] for record in records),
        "outside_tolerance": sum(not record["within_tolerance"] for record in records),
        "mean_relative_error": float(np.mean(relative_errors)) if relative_errors else None,
        "max_relative_error": float(np.max(relative_errors)) if relative_errors else None,
        "worst_offenders": offenders[:top_k],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset_root", required=True, type=Path)
    parser.add_argument("--part", choices=["part_A", "part_B"], default=None)
    parser.add_argument("--split", default="train_data", choices=["train_data", "test_data"])
    parser.add_argument("--density_root", default=None, type=Path)
    parser.add_argument("--tolerance", type=float, default=0.01)
    parser.add_argument("--top_k", type=int, default=10)
    parser.add_argument("--report", default=None, type=Path)
    parser.add_argument("--samples_dir", default=None, type=Path)
    parser.add_argument("--sample_count", default=0, type=int)
    args = parser.parse_args()
    part_dir = resolve_part_dir(args.dataset_root, args.part)
    report = verify_split(
        part_dir,
        args.split,
        args.tolerance,
        args.top_k,
        density_root=args.density_root,
        samples_dir=args.samples_dir,
        sample_count=args.sample_count,
    )
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["outside_tolerance"] == 0 and not report["missing_files"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
