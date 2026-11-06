from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from app.models.zone import (
    Zone,
    ZoneDensityPoint,
    ZoneFlowPoint,
    OverrideRequest,
    UpdateThresholdsRequest,
)
from app.services.zone_service import (
    get_all_zones,
    get_zone_by_id,
    get_zone_density,
    get_zone_flow,
    override_zone,
    cancel_zone_override,
    update_zone_thresholds,
)
from app.services.live_engine import manager

router = APIRouter(prefix="/zones", tags=["Zones"])

@router.get("", response_model=List[Zone])
def list_zones():
    return get_all_zones()

@router.get("/{zone_id}", response_model=Zone)
def get_zone(zone_id: int):
    zone = get_zone_by_id(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone

@router.get("/{zone_id}/density", response_model=List[ZoneDensityPoint])
def get_density(zone_id: int, from_ts: Optional[str] = None, to_ts: Optional[str] = None):
    zone = get_zone_by_id(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return get_zone_density(zone_id, from_ts, to_ts)

@router.get("/{zone_id}/flow", response_model=List[ZoneFlowPoint])
def get_flow(zone_id: int, window: str = "5m"):
    zone = get_zone_by_id(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return get_zone_flow(zone_id, window)

@router.put("/{zone_id}/override", response_model=Zone)
async def set_override(zone_id: int, req: OverrideRequest):
    zone = override_zone(zone_id, req)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    # Broadcast live update
    await manager.broadcast({
        "type": "density",
        "zone_id": zone.id,
        "count": zone.count,
        "level": zone.level,
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    return zone

@router.delete("/{zone_id}/override", response_model=Zone)
async def remove_override(zone_id: int):
    zone = cancel_zone_override(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    # Broadcast live update
    await manager.broadcast({
        "type": "density",
        "zone_id": zone.id,
        "count": zone.count,
        "level": zone.level,
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    return zone

@router.put("/{zone_id}/thresholds", response_model=Zone)
async def update_thresholds(zone_id: int, req: UpdateThresholdsRequest):
    zone = update_zone_thresholds(zone_id, req.yellow_pct, req.red_pct)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    await manager.broadcast({
        "type": "density",
        "zone_id": zone.id,
        "count": zone.count,
        "level": zone.level,
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    return zone

