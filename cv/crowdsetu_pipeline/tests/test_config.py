from pathlib import Path

import pytest
from pydantic import ValidationError

from crowdsetu.config import AppConfig, load_config


BASE_CONFIG = {
    "model": {
        "checkpoint_path": "checkpoints/model.pth",
        "device": "cpu",
        "version": "test-v1",
    },
    "cameras": [
        {
            "camera_id": "camera-1",
            "source": "video.mp4",
            "zones": [
                {
                    "zone_id": "zone-1",
                    "polygon": [[0, 0], [100, 0], [100, 100]],
                    "real_area_sqm": 20,
                    "thresholds": {"watch": 1, "warning": 2, "critical": 3},
                }
            ],
        }
    ],
}


def test_valid_config_parses():
    config = AppConfig.model_validate(BASE_CONFIG)
    assert config.cameras[0].zones[0].real_area_sqm == 20


def test_duplicate_camera_ids_are_rejected():
    invalid = {**BASE_CONFIG, "cameras": [BASE_CONFIG["cameras"][0], BASE_CONFIG["cameras"][0]]}
    with pytest.raises(ValidationError, match="camera_id values must be unique"):
        AppConfig.model_validate(invalid)


def test_threshold_order_is_rejected():
    invalid = {**BASE_CONFIG}
    invalid["cameras"] = [{**BASE_CONFIG["cameras"][0], "zones": [{
        **BASE_CONFIG["cameras"][0]["zones"][0],
        "thresholds": {"watch": 3, "warning": 2, "critical": 1},
    }]}]
    with pytest.raises(ValidationError, match="thresholds must be ordered"):
        AppConfig.model_validate(invalid)


def test_degenerate_polygon_is_rejected():
    invalid = {**BASE_CONFIG}
    invalid["cameras"] = [{**BASE_CONFIG["cameras"][0], "zones": [{
        **BASE_CONFIG["cameras"][0]["zones"][0],
        "polygon": [[0, 0], [1, 1], [2, 2]],
    }]}]
    with pytest.raises(ValidationError, match="non-zero area"):
        AppConfig.model_validate(invalid)


def test_yaml_backend_url_can_come_from_environment(tmp_path: Path):
    config_path = tmp_path / "config.yaml"
    config_path.write_text(
        """model:\n  checkpoint_path: model.pth\n  version: test-v1\ncameras:\n  - camera_id: cam\n    source: file.mp4\n    zones:\n    - zone_id: zone\n      polygon: [[0, 0], [1, 0], [1, 1]]\n      real_area_sqm: 1\nbackend:\n  url: ${CROWDSETU_BACKEND_URL}\n""",
        encoding="utf-8",
    )
    config = load_config(config_path, {"CROWDSETU_BACKEND_URL": "https://example.test/alert"})
    assert config.backend.url == "https://example.test/alert"
