from typing import Optional
from pydantic import BaseModel

class CVTelemetryRequest(BaseModel):
    zone_id: int
    count: int
    entries_delta: Optional[int] = 0
    exits_delta: Optional[int] = 0
    fps: Optional[float] = None
    timestamp: Optional[str] = None

