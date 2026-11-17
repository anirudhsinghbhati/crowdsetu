"""CPU-testable inference facade for the backend integration boundary."""

from __future__ import annotations

import time

import numpy as np

from crowdsetu.alerts import AlertLevel, AlertStateMachine
from crowdsetu.camera_health import CameraHealthMonitor, CameraHealthState
from crowdsetu.config import AppConfig, CameraConfig, ZoneConfig
from crowdsetu.smoothing import TemporalSmoother
from density_pipeline import DensityPipeline, ZoneResult


class InferenceService:
    """Process one configured zone per call and return an enriched ZoneResult.

    A camera with multiple zones can create one service per zone, or call
    ``process_all_zones``. No physical action is executed by this class.
    """

    def __init__(self, model, config: AppConfig, camera_id: str, zone_id: str | None = None):
        camera = self._find_camera(config, camera_id)
        self.camera: CameraConfig = camera
        self.zone: ZoneConfig = self._find_zone(camera, zone_id)
        self.model_version = config.model.version
        self.pipeline = DensityPipeline(model, device=config.model.device)
        self.health = CameraHealthMonitor()
        self.smoother = TemporalSmoother(self.zone.smoothing)
        self.alerts = AlertStateMachine(self.zone.thresholds)

    def process_frame(self, camera_id: str, frame: np.ndarray) -> ZoneResult:
        if camera_id != self.camera.camera_id:
            raise ValueError(f"unknown camera_id for service: {camera_id}")
        health = self.health.assess(frame)
        threshold = self.zone.thresholds["critical"]
        if not health.usable:
            return ZoneResult(
                zone_id=self.zone.zone_id,
                timestamp=time.time(),
                estimated_count=0.0,
                density_score=0.0,
                threshold=threshold,
                alert=False,
                suggested_action="Ask a human operator to inspect or restore the camera feed.",
                density_map=np.zeros((1, 1), dtype=np.float32),
                camera_id=camera_id,
                model_version=self.model_version,
                camera_health=health.state,
                alert_level=self.alerts.level,
            )

        self.pipeline.scale_factor = self.zone.calibration.scale_factor
        raw_result = self.pipeline.run_on_zone(frame, self.zone, threshold)
        smoothed_count = self.smoother.update(raw_result.estimated_count).value
        smoothed_density = smoothed_count / self.zone.real_area_sqm
        decision = self.alerts.update(smoothed_density, health.state)
        return ZoneResult(
            zone_id=raw_result.zone_id,
            timestamp=raw_result.timestamp,
            estimated_count=round(smoothed_count, 1),
            density_score=round(smoothed_density, 3),
            threshold=threshold,
            alert=decision.level != AlertLevel.NORMAL,
            suggested_action=decision.recommended_action,
            density_map=raw_result.density_map,
            camera_id=camera_id,
            model_version=self.model_version,
            camera_health=health.state,
            alert_level=decision.level,
        )

    @staticmethod
    def _find_camera(config: AppConfig, camera_id: str) -> CameraConfig:
        for camera in config.cameras:
            if camera.camera_id == camera_id:
                return camera
        raise ValueError(f"unknown camera_id: {camera_id}")

    @staticmethod
    def _find_zone(camera: CameraConfig, zone_id: str | None) -> ZoneConfig:
        if zone_id is None:
            if len(camera.zones) != 1:
                raise ValueError("zone_id is required when a camera has multiple zones")
            return camera.zones[0]
        for zone in camera.zones:
            if zone.zone_id == zone_id:
                return zone
        raise ValueError(f"unknown zone_id: {zone_id}")


__all__ = ["InferenceService"]