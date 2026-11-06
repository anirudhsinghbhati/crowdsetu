from typing import Union, Literal, Optional
from pydantic import BaseModel
from app.models.zone import StatusLevel
from app.models.device import DeviceStatus

class DensityMessage(BaseModel):
    type: Literal["density"] = "density"
    zone_id: int
    count: int
    level: StatusLevel
    ts: str

class FlowMessage(BaseModel):
    type: Literal["flow"] = "flow"
    zone_id: int
    net: int
    window: str = "5m"
    ts: Optional[str] = None

class AlertMessage(BaseModel):
    type: Literal["alert"] = "alert"
    id: int
    zone_id: int
    level: StatusLevel
    msg: str
    ts: str

class DeviceMessage(BaseModel):
    type: Literal["device"] = "device"
    id: int
    status: DeviceStatus
    ts: Optional[str] = None

LiveMessage = Union[DensityMessage, FlowMessage, AlertMessage, DeviceMessage]
