import pytest

def test_list_alerts(client):
    res = client.get("/api/alerts?status=all")
    assert res.status_code == 200
    alerts = res.json()
    assert len(alerts) >= 4

    # Test open filter
    res_open = client.get("/api/alerts?status=open")
    assert res_open.status_code == 200
    for a in res_open.json():
        assert a["status"] == "open"

def test_acknowledge_alert(client):
    # Get open alert
    res_open = client.get("/api/alerts?status=open")
    open_alerts = res_open.json()
    assert len(open_alerts) > 0
    target_id = open_alerts[0]["id"]

    # Acknowledge
    res_ack = client.post(f"/api/alerts/{target_id}/ack")
    assert res_ack.status_code == 200
    assert res_ack.json()["status"] == "ack"

    # Verify acknowledged
    res_get = client.get(f"/api/alerts/{target_id}")
    assert res_get.status_code == 200
    assert res_get.json()["status"] == "ack"
