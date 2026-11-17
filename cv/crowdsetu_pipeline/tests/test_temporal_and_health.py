import numpy as np

from crowdsetu.camera_health import CameraHealthMonitor, CameraHealthState
from crowdsetu.config import SmoothingConfig
from crowdsetu.smoothing import TemporalSmoother


def test_ema_warmup_and_spike_rejection():
    smoother = TemporalSmoother(SmoothingConfig(warmup_samples=3, ema_alpha=0.5))
    first = smoother.update(10)
    second = smoother.update(10)
    third = smoother.update(10)
    spike = smoother.update(100)
    assert first.warmup and second.warmup
    assert not third.warmup
    assert spike.outlier_rejected
    assert spike.value == 10


def test_median_rejects_drop_after_stable_values():
    smoother = TemporalSmoother(SmoothingConfig(method="median", window_size=5))
    for value in (20, 20, 20):
        smoother.update(value)
    result = smoother.update(0)
    assert result.outlier_rejected
    assert result.value == 20


def test_camera_health_detects_invalid_frames():
    monitor = CameraHealthMonitor()
    assert monitor.assess(np.zeros((32, 32, 3), dtype=np.uint8)).state == CameraHealthState.BLANK
    assert monitor.assess(np.full((32, 32, 3), 10, dtype=np.uint8)).state == CameraHealthState.TOO_DARK
    assert monitor.assess(np.full((32, 32, 3), 245, dtype=np.uint8)).state == CameraHealthState.OVEREXPOSED
    assert monitor.assess(np.full((32, 32, 3), 100, dtype=np.uint8)).state == CameraHealthState.BLOCKED


def test_camera_health_detects_frozen_frames_after_warmup():
    monitor = CameraHealthMonitor(frozen_samples=3)
    frame = np.zeros((32, 32, 3), dtype=np.uint8)
    frame[::2, ::2] = 100
    assert monitor.assess(frame).state == CameraHealthState.HEALTHY
    assert monitor.assess(frame).state == CameraHealthState.HEALTHY
    assert monitor.assess(frame).state == CameraHealthState.FROZEN
