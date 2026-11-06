import pytest

def test_register_and_lookup_pilgrim(client):
    # Register
    reg_payload = {
        "group_size": 5,
        "gate": "Gate 1 (Main Gate)",
        "name": "Verma Family"
    }
    res_reg = client.post("/api/pilgrims/register", json=reg_payload)
    assert res_reg.status_code == 201
    data = res_reg.json()
    assert data["token"].startswith("TK-")
    assert len(data["sig"]) == 8
    assert data["group_size"] == 5
    assert data["gate"] == "Gate 1 (Main Gate)"
    assert data["name"] == "Verma Family"
    assert data["scans"] == []

    # Lookup by token
    token = data["token"]
    res_lookup = client.get(f"/api/pilgrims/{token}")
    assert res_lookup.status_code == 200
    assert res_lookup.json()["token"] == token

    # Lookup by combined QR payload (token.sig)
    res_lookup_qr = client.get(f"/api/pilgrims/{token}.{data['sig']}")
    assert res_lookup_qr.status_code == 200
    assert res_lookup_qr.json()["token"] == token

def test_record_scan(client):
    # Register pilgrim
    res_reg = client.post("/api/pilgrims/register", json={"group_size": 2, "gate": "Gate 2"})
    token = res_reg.json()["token"]

    # Record scan
    scan_payload = {
        "token": token,
        "checkpoint": "Main Gate Scanner A",
        "direction": "IN"
    }
    res_scan = client.post("/api/pilgrims/scan", json=scan_payload)
    assert res_scan.status_code == 200
    updated_data = res_scan.json()
    assert len(updated_data["scans"]) == 1
    assert updated_data["scans"][0]["checkpoint"] == "Main Gate Scanner A"
    assert updated_data["scans"][0]["direction"] == "IN"

def test_lookup_nonexistent_token(client):
    res = client.get("/api/pilgrims/TK-999999")
    assert res.status_code == 404
