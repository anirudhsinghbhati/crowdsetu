from fastapi import APIRouter
from datetime import datetime, timezone
from app.services.zone_service import get_all_zones
from app.services.device_service import get_all_devices
from app.services.live_engine import manager

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    zones = get_all_zones()
    devices = get_all_devices()
    return {
        "status": "healthy",
        "service": "CrowdSetu Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "active_ws_clients": len(manager.active_connections),
        "zones_count": len(zones),
        "devices_count": len(devices),
    }

