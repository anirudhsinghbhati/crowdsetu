"""Versioned, backend-facing alert payload models."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field

from crowdsetu.alerts import AlertLevel
from crowdsetu.camera_health import CameraHealthState
from density_pipeline import ZoneResult


class AlertPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = "1.0"
    camera_id: str = Field(min_length=1)
    zone_id: str = Field(min_length=1)
    timestamp: datetime
    count: float = Field(ge=0)
    density: float = Field(ge=0)
    level: AlertLevel
    threshold: float = Field(ge=0)
    recommended_action: str = Field(min_length=1)
    model_version: str = Field(min_length=1)
    camera_health: CameraHealthState = CameraHealthState.HEALTHY

    @classmethod
    def from_result(cls, result: ZoneResult) -> "AlertPayload":
        timestamp = datetime.fromtimestamp(result.timestamp, timezone.utc)
        return cls(
            camera_id=result.camera_id,
            zone_id=result.zone_id,
            timestamp=timestamp,
            count=result.estimated_count,
            density=result.density_score,
            level=result.alert_level,
            threshold=result.threshold,
            recommended_action=result.suggested_action or "Continue routine human monitoring.",
            model_version=result.model_version,
            camera_health=result.camera_health,
        )


__all__ = ["AlertPayload"]