from crowdsetu.alerts import AlertLevel, AlertStateMachine
from crowdsetu.camera_health import CameraHealthState


THRESHOLDS = {"watch": 1.0, "warning": 2.0, "critical": 3.0}


def test_escalation_requires_consecutive_samples():
    machine = AlertStateMachine(THRESHOLDS, consecutive_samples=2, cooldown_samples=0)
    assert machine.update(3.1).level == AlertLevel.NORMAL
    decision = machine.update(3.1)
    assert decision.level == AlertLevel.CRITICAL
    assert decision.changed and decision.should_notify


def test_hysteresis_prevents_flapping_near_warning_clear():
    machine = AlertStateMachine(THRESHOLDS, consecutive_samples=1, clear_fraction=0.8, cooldown_samples=0)
    assert machine.update(2.2).level == AlertLevel.WARNING
    assert machine.update(1.7).level == AlertLevel.WARNING
    assert machine.update(1.5).level == AlertLevel.WATCH


def test_cooldown_deduplicates_repeated_notifications():
    machine = AlertStateMachine(THRESHOLDS, consecutive_samples=1, cooldown_samples=3)
    assert machine.update(3.1).should_notify
    assert not machine.update(3.2).should_notify
    assert not machine.update(3.3).should_notify
    assert not machine.update(3.4).should_notify


def test_rate_of_change_can_raise_watch_recommendation():
    machine = AlertStateMachine(THRESHOLDS, consecutive_samples=1, cooldown_samples=0, rate_of_change_threshold=1)
    machine.update(0.2)
    decision = machine.update(1.3)
    assert decision.rate_of_change
    assert decision.level == AlertLevel.WATCH
    assert decision.should_notify


def test_invalid_camera_health_never_notifies_crowd_alert():
    machine = AlertStateMachine(THRESHOLDS, consecutive_samples=1, cooldown_samples=0)
    decision = machine.update(10.0, CameraHealthState.BLANK)
    assert decision.health_blocked
    assert not decision.should_notify
    assert decision.level == AlertLevel.NORMAL
