import pytest

def test_get_zones(client):
    res = client.get("/api/zones")
    assert res.status_code == 200
    zones = res.json()
    assert len(zones) == 4
    names = [z["name"] for z in zones]
    assert "Main Gate" in names
    assert "Ghat Approach" in names
    assert "Sanctum Corridor" in names
    assert "Exit Lane" in names

def test_zone_density_and_flow(client):
    res_density = client.get("/api/zones/4/density")
    assert res_density.status_code == 200
    density_pts = res_density.json()
    assert len(density_pts) > 0
    assert "count" in density_pts[0]
    assert "level" in density_pts[0]

    res_flow = client.get("/api/zones/4/flow?window=5m")
    assert res_flow.status_code == 200
    flow_pts = res_flow.json()
    assert len(flow_pts) > 0
    assert "entries" in flow_pts[0]
    assert "exits" in flow_pts[0]
    assert "net" in flow_pts[0]

def test_override_and_cancel(client):
    # Test on Zone 4 (Exit Lane: count 110, capacity 400, naturally green)
    override_payload = {
        "level": "red",
        "message": {
            "en": "Exit lane temporarily closed for cleaning",
            "hi": "सफाई के लिए निकास लेन अस्थायी रूप से बंद",
            "gu": "સફાઈ માટે એક્ઝિટ લેન અસ્થાયી રૂપે બંધ છે"
        },
        "duration_min": 15
    }
    res = client.put("/api/zones/4/override", json=override_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["level"] == "red"
    assert data["override"] is not None
    assert data["override"]["level"] == "red"
    assert data["override"]["message"]["en"] == override_payload["message"]["en"]

    # Verify persisted in get_zones
    res_check = client.get("/api/zones")
    z4 = next(z for z in res_check.json() if z["id"] == 4)
    assert z4["level"] == "red"

    # Cancel override
    res_cancel = client.delete("/api/zones/4/override")
    assert res_cancel.status_code == 200
    data_cancelled = res_cancel.json()
    assert data_cancelled["override"] is None
    assert data_cancelled["level"] == "green" # Naturally green

def test_update_thresholds(client):
    res = client.put("/api/zones/2/thresholds", json={"yellow_pct": 65, "red_pct": 85})
    assert res.status_code == 200
    data = res.json()
    assert data["yellow_pct"] == 65
    assert data["red_pct"] == 85
