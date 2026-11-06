import pytest

def test_list_devices(client):
    res = client.get("/api/devices")
    assert res.status_code == 200
    devices = res.json()
    assert len(devices) >= 10
    types = {d["type"] for d in devices}
    assert "camera" in types
    assert "scanner" in types
    assert "display" in types

def test_device_heartbeat(client):
    res = client.post("/api/devices/1/heartbeat", json={"status": "online", "battery": 95, "signal": 99})
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["status"] == "online"
    assert data["last_seen"] == "Just now"
    assert data["signal"] == 99

