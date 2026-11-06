from typing import Optional, List, Literal
from pydantic import BaseModel, Field

StatusLevel = Literal["green", "yellow", "red", "grey"]

class MultilingualMessage(BaseModel):
    en: str
    hi: str
    gu: str

class ZoneOverride(BaseModel):
    level: StatusLevel
    message: MultilingualMessage
    duration_min: int
    applied_at: str
    expires_at: Optional[str] = None

class Zone(BaseModel):
    id: int
    name: str
    capacity: int
    level: StatusLevel
    count: int
    yellow_pct: Optional[int] = 70
    red_pct: Optional[int] = 90
    net_flow: Optional[int] = 0
    sparkline: Optional[List[int]] = None
    override: Optional[ZoneOverride] = None

class ZoneDensityPoint(BaseModel):
    ts: str
    count: int
    level: StatusLevel

class ZoneFlowPoint(BaseModel):
    ts: str
    entries: int
    exits: int
    net: int

class OverrideRequest(BaseModel):
    level: Literal["green", "yellow", "red"]
    message: MultilingualMessage
    duration_min: int

class UpdateThresholdsRequest(BaseModel):
    yellow_pct: int = Field(..., ge=10, le=95)
    red_pct: int = Field(..., ge=20, le=100)
