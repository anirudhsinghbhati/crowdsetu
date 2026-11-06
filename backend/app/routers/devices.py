from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from app.models.device import Device, DeviceHeartbeatRequest
from app.services.device_service import (
    get_all_devices,
    get_device_by_id,
    update_device_heartbeat,
)
from app.services.live_engine import manager

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("", response_model=List[Device])
def list_devices():
    return get_all_devices()

@router.get("/{device_id}", response_model=Device)
def get_device(device_id: int):
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@router.post("/{device_id}/heartbeat", response_model=Device)
async def device_heartbeat(device_id: int, req: DeviceHeartbeatRequest):
    dev = update_device_heartbeat(
        device_id=device_id,
        status=req.status,
        battery=req.battery,
        signal=req.signal,
        ip=req.ip
    )
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")

    await manager.broadcast({
        "type": "device",
        "id": dev.id,
        "status": dev.status,
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    return dev
