from typing import Optional, Literal
from pydantic import BaseModel

DeviceType = Literal["camera", "scanner", "display"]
DeviceStatus = Literal["online", "offline", "degraded"]

class Device(BaseModel):
    id: int
    name: str
    type: DeviceType
    zone_id: int
    zone_name: Optional[str] = None
    status: DeviceStatus
    last_seen: str
    battery: Optional[int] = None
    signal: Optional[int] = None
    ip: Optional[str] = None

class DeviceHeartbeatRequest(BaseModel):
    status: Optional[DeviceStatus] = "online"
    battery: Optional[int] = None
    signal: Optional[int] = None
    ip: Optional[str] = None
