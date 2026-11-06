from typing import Optional, List, Literal
from pydantic import BaseModel, Field

class PilgrimScan(BaseModel):
    checkpoint: str
    direction: Literal["IN", "OUT"]
    ts: str

class PilgrimToken(BaseModel):
    token: str
    sig: str
    group_size: int
    gate: str
    name: Optional[str] = None
    issued_at: str
    scans: List[PilgrimScan] = []

class RegisterPilgrimRequest(BaseModel):
    group_size: int = Field(..., ge=1, le=50)
    gate: str
    name: Optional[str] = None

class RecordScanRequest(BaseModel):
    token: str
    sig: Optional[str] = None
    checkpoint: str
    direction: Literal["IN", "OUT"] = "IN"
    ts: Optional[str] = None

