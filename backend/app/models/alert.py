from typing import Optional, Literal
from pydantic import BaseModel
from app.models.zone import StatusLevel

class Alert(BaseModel):
    id: int
    zone_id: int
    zone_name: Optional[str] = None
    level: StatusLevel
    msg: str
    status: Literal["open", "ack"]
    ts: str
    snapshot_url: Optional[str] = None

