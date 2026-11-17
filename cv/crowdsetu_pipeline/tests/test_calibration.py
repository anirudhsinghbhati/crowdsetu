import numpy as np
import pytest

from scripts.calibrate_scale import fit_zone_calibration


def test_scale_calibration_reports_mae_and_bias():
    metrics = fit_zone_calibration([1, 2, 3], [2, 4, 6])
    assert metrics["scale_factor"] == pytest.approx(2.0)
    assert metrics["mae"] == pytest.approx(0.0)
    assert metrics["bias"] == pytest.approx(0.0)
    assert metrics["samples"] == 3


def test_scale_calibration_rejects_invalid_counts():
    with pytest.raises(ValueError):
        fit_zone_calibration([1, -2], [1, 2])
    with pytest.raises(ValueError):
        fit_zone_calibration([], [])
