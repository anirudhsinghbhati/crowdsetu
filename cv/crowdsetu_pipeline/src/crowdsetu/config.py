"""Validated application configuration loaded from YAML and environment variables."""

from __future__ import annotations

import os
import math
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CalibrationConfig(StrictModel):
    scale_factor: float = Field(default=1.0, gt=0)
    homography: list[list[float]] | None = None

    @field_validator("homography")
    @classmethod
    def validate_homography(cls, value: list[list[float]] | None) -> list[list[float]] | None:
        if value is not None and (len(value) != 3 or any(len(row) != 3 for row in value)):
            raise ValueError("homography must be a 3x3 matrix")
        return value


class SmoothingConfig(StrictModel):
    method: str = "ema"
    window_size: int = Field(default=5, ge=1)
    ema_alpha: float = Field(default=0.4, gt=0, le=1)
    outlier_factor: float = Field(default=3.0, gt=0)
    warmup_samples: int = Field(default=3, ge=1)

    @field_validator("method")
    @classmethod
    def validate_method(cls, value: str) -> str:
        if value not in {"ema", "median"}:
            raise ValueError("smoothing method must be 'ema' or 'median'")
        return value


class ZoneConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zone_id: str = Field(min_length=1)
    polygon: list[tuple[int, int]] = Field(min_length=3)
    real_area_sqm: float = Field(gt=0)
    thresholds: dict[str, float] = Field(
        default_factory=lambda: {
            "watch": 1.5,
            "warning": 3.0,
            "critical": 4.0,
        }
    )
    calibration: CalibrationConfig = Field(default_factory=CalibrationConfig)
    smoothing: SmoothingConfig = Field(default_factory=SmoothingConfig)

    @field_validator("polygon")
    @classmethod
    def validate_polygon(cls, value: list[tuple[int, int]]) -> list[tuple[int, int]]:
        if len(set(value)) != len(value):
            raise ValueError("polygon points must be unique")
        area = sum(
            value[index][0] * value[(index + 1) % len(value)][1]
            - value[(index + 1) % len(value)][0] * value[index][1]
            for index in range(len(value))
        )
        if math.isclose(area, 0.0):
            raise ValueError("polygon must enclose a non-zero area")
        return value

    @field_validator("thresholds")
    @classmethod
    def validate_thresholds(cls, value: dict[str, float]) -> dict[str, float]:
        required = {"watch", "warning", "critical"}
        if set(value) != required:
            raise ValueError("thresholds must contain exactly watch, warning, and critical")
        if any(threshold < 0 for threshold in value.values()):
            raise ValueError("thresholds must be non-negative")
        if not value["watch"] < value["warning"] < value["critical"]:
            raise ValueError("thresholds must be ordered watch < warning < critical")
        return value


class CameraConfig(StrictModel):
    camera_id: str = Field(min_length=1)
    source: str = Field(min_length=1)
    zones: list[ZoneConfig] = Field(min_length=1)
    enabled: bool = True

    @model_validator(mode="after")
    def unique_zone_ids(self) -> "CameraConfig":
        zone_ids = [zone.zone_id for zone in self.zones]
        if len(zone_ids) != len(set(zone_ids)):
            raise ValueError("zone_id values must be unique within a camera")
        return self


class ModelConfig(StrictModel):
    checkpoint_path: Path
    device: str = "cpu"
    version: str = Field(min_length=1)


class BackendConfig(StrictModel):
    url: str | None = None
    api_key_env: str = "CROWDSETU_BACKEND_API_KEY"
    timeout_seconds: float = Field(default=2.0, gt=0)


class RuntimeConfig(StrictModel):
    sample_interval_seconds: float = Field(default=1.5, gt=0)
    log_level: str = "INFO"
    frame_retention_enabled: bool = False
    data_dir: Path = Path("data")


class AppConfig(StrictModel):
    model: ModelConfig
    cameras: list[CameraConfig] = Field(min_length=1)
    backend: BackendConfig = Field(default_factory=BackendConfig)
    runtime: RuntimeConfig = Field(default_factory=RuntimeConfig)

    @model_validator(mode="after")
    def unique_camera_ids(self) -> "AppConfig":
        camera_ids = [camera.camera_id for camera in self.cameras]
        if len(camera_ids) != len(set(camera_ids)):
            raise ValueError("camera_id values must be unique")
        return self


def load_config(path: str | Path, environ: dict[str, str] | None = None) -> AppConfig:
    """Load and validate a YAML config without accepting secrets in the file."""
    config_path = Path(path)
    with config_path.open("r", encoding="utf-8") as config_file:
        raw: dict[str, Any] = yaml.safe_load(config_file) or {}

    env = os.environ if environ is None else environ
    raw = _expand_environment_placeholders(raw, env)
    return AppConfig.model_validate(raw)


def _expand_environment_placeholders(value: Any, environ: dict[str, str]) -> Any:
    if isinstance(value, dict):
        return {key: _expand_environment_placeholders(item, environ) for key, item in value.items()}
    if isinstance(value, list):
        return [_expand_environment_placeholders(item, environ) for item in value]
    if isinstance(value, str) and value.startswith("${") and value.endswith("}"):
        return environ.get(value[2:-1])
    return value


__all__ = [
    "AppConfig",
    "BackendConfig",
    "CalibrationConfig",
    "CameraConfig",
    "ModelConfig",
    "RuntimeConfig",
    "SmoothingConfig",
    "ZoneConfig",
    "load_config",
    "ValidationError",
]
