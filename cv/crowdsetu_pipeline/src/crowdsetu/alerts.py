"""Human-operator crowd alert state machine.

Default thresholds are assumed placeholders inspired by Fruin pedestrian Level of
Service density bands. Venue authorities must confirm thresholds before deployment.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from crowdsetu.camera_health import CameraHealthState


DEFAULT_THRESHOLDS = {"watch": 1.5, "warning": 3.0, "critical": 4.0}


class AlertLevel(StrEnum):
    NORMAL = "normal"
    WATCH = "watch"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass(frozen=True)
class AlertDecision:
    level: AlertLevel
    changed: bool
    should_notify: bool
    rate_of_change: bool
    health_blocked: bool
    recommended_action: str
    reason: str


class AlertStateMachine:
    def __init__(
        self,
        thresholds: dict[str, float] | None = None,
        consecutive_samples: int = 2,
        clear_fraction: float = 0.8,
        cooldown_samples: int = 3,
        rate_of_change_threshold: float = 1.0,
    ):
        self.thresholds = thresholds or DEFAULT_THRESHOLDS.copy()
        if not (self.thresholds["watch"] < self.thresholds["warning"] < self.thresholds["critical"]):
            raise ValueError("alert thresholds must be ordered watch < warning < critical")
        if consecutive_samples < 1 or cooldown_samples < 0:
            raise ValueError("sample counts must be non-negative and consecutive_samples must be positive")
        if not 0 < clear_fraction < 1:
            raise ValueError("clear_fraction must be between 0 and 1")
        self.consecutive_samples = consecutive_samples
        self.clear_fraction = clear_fraction
        self.cooldown_samples = cooldown_samples
        self.rate_of_change_threshold = rate_of_change_threshold
        self.level = AlertLevel.NORMAL
        self._pending_level: AlertLevel | None = None
        self._pending_count = 0
        self._samples_since_notification = cooldown_samples
        self._previous_density: float | None = None

    def _level_for_density(self, density: float) -> AlertLevel:
        if density >= self.thresholds["critical"]:
            return AlertLevel.CRITICAL
        if density >= self.thresholds["warning"]:
            return AlertLevel.WARNING
        if density >= self.thresholds["watch"]:
            return AlertLevel.WATCH
        return AlertLevel.NORMAL

    def _hysteresis_level(self, density: float, candidate: AlertLevel) -> AlertLevel:
        clear_thresholds = {
            AlertLevel.WATCH: self.thresholds["watch"] * self.clear_fraction,
            AlertLevel.WARNING: self.thresholds["warning"] * self.clear_fraction,
            AlertLevel.CRITICAL: self.thresholds["critical"] * self.clear_fraction,
        }
        if self.level in clear_thresholds and density >= clear_thresholds[self.level]:
            return max(self.level, candidate, key=list(AlertLevel).index)
        return candidate

    def update(
        self,
        density: float,
        camera_health: CameraHealthState = CameraHealthState.HEALTHY,
    ) -> AlertDecision:
        self._samples_since_notification += 1
        rate_of_change = (
            self._previous_density is not None
            and density - self._previous_density >= self.rate_of_change_threshold
        )
        self._previous_density = density

        if camera_health != CameraHealthState.HEALTHY:
            return AlertDecision(
                level=self.level,
                changed=False,
                should_notify=False,
                rate_of_change=False,
                health_blocked=True,
                recommended_action="Ask a human operator to inspect or restore the camera feed.",
                reason=f"crowd alert blocked by camera health: {camera_health.value}",
            )

        candidate = self._hysteresis_level(density, self._level_for_density(density))
        if rate_of_change and candidate == AlertLevel.NORMAL:
            candidate = AlertLevel.WATCH
        if candidate != self.level:
            if candidate != self._pending_level:
                self._pending_level = candidate
                self._pending_count = 1
            else:
                self._pending_count += 1
            if self._pending_count >= self.consecutive_samples:
                previous = self.level
                self.level = candidate
                self._pending_level = None
                self._pending_count = 0
                changed = True
            else:
                previous = self.level
                changed = False
        else:
            previous = self.level
            self._pending_level = None
            self._pending_count = 0
            changed = False

        notify = (changed or rate_of_change) and self._samples_since_notification >= self.cooldown_samples
        if notify:
            self._samples_since_notification = 0
        return AlertDecision(
            level=self.level,
            changed=changed,
            should_notify=notify,
            rate_of_change=rate_of_change,
            health_blocked=False,
            recommended_action=self._recommendation(self.level),
            reason=f"density={density:.3f}, previous_level={previous.value}",
        )

    @staticmethod
    def _recommendation(level: AlertLevel) -> str:
        return {
            AlertLevel.NORMAL: "Continue routine human monitoring.",
            AlertLevel.WATCH: "Ask a human operator to monitor the zone closely.",
            AlertLevel.WARNING: "Ask a human operator to assess flow and consider controlled entry.",
            AlertLevel.CRITICAL: "Ask a human operator to coordinate crowd-flow intervention immediately.",
        }[level]
