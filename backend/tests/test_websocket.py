import json
import pytest

def test_websocket_live_connection(client):
    with client.websocket_connect("/ws/live") as websocket:
        # Client receives initial zone density events upon connecting
        received_types = []
        for _ in range(5):
            msg_raw = websocket.receive_text()
            msg = json.loads(msg_raw)
            received_types.append(msg.get("type"))
            assert msg["type"] in ("density", "flow", "device")
            assert "zone_id" in msg or "id" in msg

        assert "density" in received_types
