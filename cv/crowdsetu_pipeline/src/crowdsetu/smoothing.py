"""Temporal smoothing and robust outlier rejection for zone measurements."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from statistics import median

from crowdsetu.config import SmoothingConfig


@dataclass(frozen=True)
class SmoothingResult:
    value: float
    warmup: bool
    outlier_rejected: bool


class TemporalSmoother:
    def __init__(self, config: SmoothingConfig):
        self.config = config
        self._values: deque[float] = deque(maxlen=config.window_size)
        self._ema: float | None = None

    @property
    def sample_count(self) -> int:
        return len(self._values)

    def reset(self) -> None:
        self._values.clear()
        self._ema = None

    def update(self, value: float) -> SmoothingResult:
        value = float(value)
        outlier_rejected = False
        if len(self._values) >= 3:
            baseline = median(self._values)
            deviation = abs(value - baseline)
            allowed = self.config.outlier_factor * max(abs(baseline) * 0.1, 1.0)
            if deviation > allowed:
                value = baseline
                outlier_rejected = True

        self._values.append(value)
        if self.config.method == "median":
            smoothed = float(median(self._values))
        else:
            self._ema = value if self._ema is None else (
                self.config.ema_alpha * value + (1 - self.config.ema_alpha) * self._ema
            )
            smoothed = self._ema

        return SmoothingResult(
            value=smoothed,
            warmup=len(self._values) < self.config.warmup_samples,
            outlier_rejected=outlier_rejected,
        )
