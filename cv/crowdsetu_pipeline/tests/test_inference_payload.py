import numpy as np

from crowdsetu.config import AppConfig
from crowdsetu.inference import InferenceService
from crowdsetu.payloads import AlertPayload


def config():
    return AppConfig.model_validate({
        "model": {"checkpoint_path": "model.pth", "device": "cpu", "version": "test-v1"},
        "cameras": [{
            "camera_id": "cam-1",
            "source": "file.mp4",
            "zones": [{
                "zone_id": "zone-1",
                "polygon": [[0, 0], [32, 0], [32, 32], [0, 32]],
                "real_area_sqm": 10,
            }],
        }],
    })


class ConstantModel:
    def __call__(self, tensor):
        return tensor[:, :1, ::8, ::8] * 0


def test_invalid_camera_frame_never_becomes_alert():
    service = InferenceService(ConstantModel(), config(), "cam-1")
    result = service.process_frame("cam-1", np.zeros((32, 32, 3), dtype=np.uint8))
    assert result.camera_health.value == "blank"
    assert not result.alert


def test_alert_payload_has_versioned_fields():
    service = InferenceService(ConstantModel(), config(), "cam-1")
    result = service.process_frame("cam-1", np.zeros((32, 32, 3), dtype=np.uint8))
    payload = AlertPayload.from_result(result)
    assert payload.schema_version == "1.0"
    assert payload.camera_id == "cam-1"
    assert payload.timestamp.tzinfo is not None


def test_healthy_frame_returns_model_and_health_metadata():
    service = InferenceService(ConstantModel(), config(), "cam-1")
    frame = np.zeros((32, 32, 3), dtype=np.uint8)
    frame[::2, ::2] = 100
    result = service.process_frame("cam-1", frame)
    assert result.camera_health.value == "healthy"
    assert result.model_version == "test-v1"