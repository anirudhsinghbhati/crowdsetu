"""
demo_run.py
------------
End-to-end example: video -> zones -> density scores -> alerts -> (optional) push to
your teammate's FastAPI backend. Run this on a test video first (e.g. any crowd/mall/
festival footage clip) before trying live RTSP camera feeds.

Usage:
    python demo_run.py --video sample_crowd.mp4

For a real deployment, `source` would be an RTSP URL from a temple's CCTV system instead
of a file path.
"""

import argparse
import os

import cv2
import requests  # optional: only needed if pushing alerts to the backend

from csrnet_model import load_csrnet
from preprocessing import open_capture, sample_frames
from density_pipeline import DensityPipeline, render_heatmap_overlay
from crowdsetu.config import AppConfig, load_config
from crowdsetu.logging import configure_logging, get_logger, log_context


logger = get_logger(__name__)


def push_alert_to_backend(result, backend_url, api_key_env):
    if not backend_url:
        return
    payload = {
        "zone_id": result.zone_id,
        "timestamp": result.timestamp,
        "estimated_count": result.estimated_count,
        "density_score": result.density_score,
        "alert": result.alert,
        "suggested_action": result.suggested_action,
    }
    try:
        api_key = os.getenv(api_key_env)
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        requests.post(backend_url, json=payload, headers=headers, timeout=2)
    except requests.RequestException as e:
        logger.warning("backend alert delivery failed", exc_info=True, **log_context(error=str(e)))


def main(video_source, config: AppConfig, checkpoint_path=None, show_window=True):
    model_path = checkpoint_path or str(config.model.checkpoint_path)
    model = load_csrnet(checkpoint_path=model_path, device=config.model.device)
    pipeline = DensityPipeline(model, device=config.model.device)

    cap = open_capture(video_source)
    camera = config.cameras[0]

    for frame, _frame_idx in sample_frames(
        cap, sample_every_sec=config.runtime.sample_interval_seconds
    ):
        for zone in camera.zones:
            pipeline.scale_factor = zone.calibration.scale_factor
            result = pipeline.run_on_zone(frame, zone, zone.thresholds["critical"])

            logger.info(
                "zone result",
                **log_context(
                    camera_id=str(video_source),
                    zone_id=result.zone_id,
                    count=result.estimated_count,
                    density_per_sqm=result.density_score,
                    alert=result.alert,
                    suggested_action=result.suggested_action,
                ),
            )

            if result.alert:
                push_alert_to_backend(result, config.backend.url, config.backend.api_key_env)

            if show_window:
                overlay = render_heatmap_overlay(frame, result.density_map)
                label = f"{zone.zone_id}: {result.density_score} ppl/m2"
                color = (0, 0, 255) if result.alert else (0, 200, 0)
                cv2.putText(overlay, label, (20, 40), cv2.FONT_HERSHEY_SIMPLEX,
                            1.0, color, 2)
                cv2.imshow("CrowdSetu - Density Preview", overlay)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break

    cap.release()
    if show_window:
        cv2.destroyAllWindows()


if __name__ == "__main__":
    configure_logging()
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True, help="Path to a test video, or RTSP URL")
    parser.add_argument("--config", required=True, help="Path to validated YAML configuration")
    parser.add_argument("--checkpoint", default=None, help="Path to fine-tuned CSRNet .pth")
    parser.add_argument("--no-window", action="store_true", help="Disable cv2.imshow (headless run)")
    args = parser.parse_args()

    video_source = int(args.video) if args.video.isdigit() else args.video
    app_config = load_config(args.config)
    main(video_source, app_config, checkpoint_path=args.checkpoint, show_window=not args.no_window)