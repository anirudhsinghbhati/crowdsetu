from typing import List
from fastapi import APIRouter, HTTPException, status
from app.models.pilgrim import (
    PilgrimToken,
    RegisterPilgrimRequest,
    RecordScanRequest,
    PilgrimScan,
)
from app.services.pilgrim_service import (
    register_pilgrim,
    get_pilgrim_token,
    record_scan,
    batch_record_scans,
)

router = APIRouter(prefix="", tags=["Pilgrims & Kiosk"])

@router.post("/pilgrims/register", response_model=PilgrimToken, status_code=status.HTTP_201_CREATED)
def register(req: RegisterPilgrimRequest):
    return register_pilgrim(req.group_size, req.gate, req.name)

@router.get("/pilgrims/{token}", response_model=PilgrimToken)
def lookup(token: str):
    item = get_pilgrim_token(token)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found. Check the ID or scan again."
        )
    return item

@router.post("/pilgrims/scan", response_model=PilgrimToken)
def scan_token(req: RecordScanRequest):
    updated_token, _ = record_scan(
        token_input=req.token,
        checkpoint=req.checkpoint,
        direction=req.direction,
        ts=req.ts,
        sig=req.sig,
    )
    if not updated_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found or invalid"
        )
    return updated_token

@router.post("/pilgrims/scans")
def batch_scans(scans: List[RecordScanRequest]):
    raw_scans = [s.model_dump() for s in scans]
    count = batch_record_scans(raw_scans)
    return {"message": f"Successfully synced {count} scans", "synced_count": count}

@router.get("/checkpoints")
def list_checkpoints():
    return [
        {"id": 1, "name": "Main Gate Scanner A", "zone_id": 1, "zone_name": "Main Gate"},
        {"id": 2, "name": "Main Gate Scanner B", "zone_id": 1, "zone_name": "Main Gate"},
        {"id": 3, "name": "Ghat Barricade Scanner", "zone_id": 2, "zone_name": "Ghat Approach"},
        {"id": 4, "name": "Sanctum Security Check", "zone_id": 3, "zone_name": "Sanctum Corridor"},
        {"id": 5, "name": "Exit Gate Scanner", "zone_id": 4, "zone_name": "Exit Lane"},
    ]
