import json
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.live_engine import manager
from app.services.zone_service import get_all_zones
from app.services.device_service import get_all_devices

router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws/live")
@router.websocket("/ws")
async def websocket_live_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Immediately push initial state of all zones upon connection
        zones = get_all_zones()
        now_iso = datetime.now(timezone.utc).isoformat()
        for z in zones:
            await websocket.send_text(json.dumps({
                "type": "density",
                "zone_id": z.id,
                "count": z.count,
                "level": z.level,
                "ts": now_iso,
            }))
            if z.net_flow:
                await websocket.send_text(json.dumps({
                    "type": "flow",
                    "zone_id": z.id,
                    "net": z.net_flow,
                    "window": "5m",
                    "ts": now_iso,
                }))

        # Also push device statuses
        devices = get_all_devices()
        for d in devices:
            await websocket.send_text(json.dumps({
                "type": "device",
                "id": d.id,
                "status": d.status,
                "ts": now_iso,
            }))

        # Keep connection open, handle client messages / pings
        while True:
            text = await websocket.receive_text()
            if text.strip().lower() == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "ts": datetime.now(timezone.utc).isoformat()}))

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)
