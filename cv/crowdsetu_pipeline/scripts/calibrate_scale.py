"""Fit per-zone count scale factors from manual CSV annotations."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

import cv2
import matplotlib.pyplot as plt
import numpy as np

from csrnet_model import load_csrnet
from crowdsetu.config import load_config
from density_pipeline import DensityPipeline
from preprocessing import open_capture


def fit_zone_calibration(raw_counts: list[float], manual_counts: list[float]) -> dict[str, float]:
    raw = np.asarray(raw_counts, dtype=np.float64)
    manual = np.asarray(manual_counts, dtype=np.float64)
    if raw.size == 0 or raw.size != manual.size:
        raise ValueError("raw and manual count arrays must be non-empty and equal length")
    if np.any(raw < 0) or np.any(manual < 0):
        raise ValueError("counts must be non-negative")
    denominator = float(np.dot(raw, raw))
    scale_factor = float(np.dot(raw, manual) / denominator) if denominator else 1.0
    calibrated = raw * scale_factor
    errors = calibrated - manual
    return {
        "scale_factor": scale_factor,
        "mae": float(np.abs(errors).mean()),
        "bias": float(errors.mean()),
        "samples": int(raw.size),
    }


def save_error_plot(path: Path, raw_counts, manual_counts, scale_factor: float, zone_id: str) -> None:
    raw = np.asarray(raw_counts)
    manual = np.asarray(manual_counts)
    calibrated = raw * scale_factor
    figure, axis = plt.subplots(figsize=(7, 5))
    axis.scatter(manual, calibrated, label="calibrated model", alpha=0.8)
    limits = [0, max(float(manual.max()), float(calibrated.max()), 1.0)]
    axis.plot(limits, limits, "k--", label="ideal")
    axis.set_xlabel("Manual count")
    axis.set_ylabel("Calibrated model count")
    axis.set_title(f"Calibration error: {zone_id}")
    axis.legend()
    figure.tight_layout()
    figure.savefig(path, dpi=150)
    plt.close(figure)


def calibrate_video(config_path: Path, video_path: Path, manual_csv: Path, checkpoint: str | None,
                    output_json: Path, plot_dir: Path) -> dict:
    config = load_config(config_path)
    model_path = checkpoint or str(config.model.checkpoint_path)
    model = load_csrnet(model_path, device=config.model.device)
    cameras = {camera.camera_id: camera for camera in config.cameras}
    cap = open_capture(str(video_path))
    rows_by_zone = defaultdict(lambda: {"raw": [], "manual": []})
    with manual_csv.open(newline="", encoding="utf-8") as csv_file:
        rows = csv.DictReader(csv_file)
        for row in rows:
            camera = cameras.get(row.get("camera_id", next(iter(cameras))))
            if camera is None:
                raise ValueError(f"unknown camera_id: {row.get('camera_id')}")
            zone = next((item for item in camera.zones if item.zone_id == row["zone"]), None)
            if zone is None:
                raise ValueError(f"unknown zone: {row['zone']}")
            frame_number = int(row["frame"])
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ok, frame = cap.read()
            if not ok:
                raise ValueError(f"could not read frame {frame_number}")
            pipeline = DensityPipeline(model, device=config.model.device, scale_factor=1.0)
            result = pipeline.run_on_zone(frame, zone, zone.thresholds["critical"])
            rows_by_zone[zone.zone_id]["raw"].append(result.estimated_count)
            rows_by_zone[zone.zone_id]["manual"].append(float(row["manual_count"]))
    cap.release()

    report = {"status": "measured_from_manual_csv", "zones": {}}
    plot_dir.mkdir(parents=True, exist_ok=True)
    for zone_id, values in rows_by_zone.items():
        metrics = fit_zone_calibration(values["raw"], values["manual"])
        report["zones"][zone_id] = metrics
        save_error_plot(plot_dir / f"{zone_id}_calibration.png", values["raw"], values["manual"], metrics["scale_factor"], zone_id)
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--video", required=True, type=Path)
    parser.add_argument("--manual_csv", required=True, type=Path)
    parser.add_argument("--checkpoint", default=None)
    parser.add_argument("--output_json", default="reports/calibration.json", type=Path)
    parser.add_argument("--plot_dir", default="reports/calibration_plots", type=Path)
    args = parser.parse_args()
    report = calibrate_video(args.config, args.video, args.manual_csv, args.checkpoint, args.output_json, args.plot_dir)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
