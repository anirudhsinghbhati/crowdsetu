import pytest

def test_cv_telemetry_ingest(client):
    payload = {
        "zone_id": 1,
        "count": 550, # breaches 90% of capacity 600 -> red
        "entries_delta": 45,
        "exits_delta": 10,
        "fps": 24.5
    }
    res = client.post("/api/cv/telemetry", json=payload)
    assert res.status_code == 200
    zone = res.json()
    assert zone["count"] == 550
    assert zone["level"] == "red"
    assert zone["net_flow"] == 35

    # Check alert was generated
    alerts_res = client.get("/api/alerts?status=open")
    assert alerts_res.status_code == 200
    latest_alert = alerts_res.json()[0]
    assert "Computer Vision alert" in latest_alert["msg"] or "reached" in latest_alert["msg"]

