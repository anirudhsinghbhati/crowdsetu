"""Frame-quality checks that prevent invalid video from becoming zero counts."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

import cv2
import numpy as np


class CameraHealthState(StrEnum):
    HEALTHY = "healthy"
    BLANK = "blank"
    BLOCKED = "blocked"
    FROZEN = "frozen"
    TOO_DARK = "too_dark"
    OVEREXPOSED = "overexposed"


@dataclass(frozen=True)
class CameraHealth:
    state: CameraHealthState
    reason: str

    @property
    def usable(self) -> bool:
        return self.state == CameraHealthState.HEALTHY


class CameraHealthMonitor:
    def __init__(
        self,
        frozen_samples: int = 3,
        blank_value: int = 2,
        dark_mean: float = 20.0,
        overexposed_mean: float = 235.0,
        blocked_variance: float = 4.0,
        frozen_delta: float = 0.5,
    ):
        self.frozen_samples = frozen_samples
        self.blank_value = blank_value
        self.dark_mean = dark_mean
        self.overexposed_mean = overexposed_mean
        self.blocked_variance = blocked_variance
        self.frozen_delta = frozen_delta
        self._previous_gray: np.ndarray | None = None
        self._unchanged_samples = 0

    def assess(self, frame: np.ndarray) -> CameraHealth:
        if frame is None or frame.size == 0:
            return CameraHealth(CameraHealthState.BLANK, "empty frame")
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim == 3 else frame
        mean = float(gray.mean())
        variance = float(gray.var())
        if float(gray.max()) <= self.blank_value:
            return CameraHealth(CameraHealthState.BLANK, "frame is near-uniform black")
        if mean <= self.dark_mean:
            return CameraHealth(CameraHealthState.TOO_DARK, "frame mean is below darkness threshold")
        if mean >= self.overexposed_mean:
            return CameraHealth(CameraHealthState.OVEREXPOSED, "frame mean is above exposure threshold")
        if variance <= self.blocked_variance:
            return CameraHealth(CameraHealthState.BLOCKED, "frame has near-zero visual variance")

        if self._previous_gray is not None and gray.shape == self._previous_gray.shape:
            delta = float(np.mean(cv2.absdiff(gray, self._previous_gray)))
            self._unchanged_samples = self._unchanged_samples + 1 if delta <= self.frozen_delta else 0
        else:
            self._unchanged_samples = 0
        self._previous_gray = gray.copy()
        if self._unchanged_samples >= self.frozen_samples - 1:
            return CameraHealth(CameraHealthState.FROZEN, "consecutive frames are unchanged")
        return CameraHealth(CameraHealthState.HEALTHY, "frame passed quality checks")
