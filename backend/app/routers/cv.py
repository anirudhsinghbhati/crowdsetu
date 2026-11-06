import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from app.models.cv import CVTelemetryRequest
from app.models.zone import Zone
from app.database import get_db
from app.services.zone_service import get_zone_by_id, compute_level, row_to_zone
from app.services.alert_service import create_alert
from app.services.live_engine import manager

router = APIRouter(prefix="/cv", tags=["Computer Vision Ingestion"])

@router.post("/telemetry", response_model=Zone)
async def ingest_cv_telemetry(req: CVTelemetryRequest):
    zone = get_zone_by_id(req.zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    new_count = req.count
    natural_level = compute_level(
        new_count,
        zone.capacity,
        zone.yellow_pct or 70,
        zone.red_pct or 90
    )
    current_level = zone.override.level if zone.override else natural_level

    new_sparkline = zone.sparkline or []
    if len(new_sparkline) >= 6:
        new_sparkline = new_sparkline[1:] + [new_count]
    else:
        new_sparkline.append(new_count)

    now_iso = req.timestamp or datetime.now(timezone.utc).isoformat()
    net = (req.entries_delta or 0) - (req.exits_delta or 0)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE zones
            SET count = ?, level = ?, sparkline_json = ?, net_flow = ?
            WHERE id = ?;
            """,
            (new_count, current_level, json.dumps(new_sparkline), net, zone.id)
        )
        cursor.execute(
            "INSERT INTO zone_density_history (zone_id, ts, count, level) VALUES (?, ?, ?, ?);",
            (zone.id, now_iso, new_count, current_level)
        )
        cursor.execute("SELECT * FROM zones WHERE id = ?;", (zone.id,))
        updated_zone = row_to_zone(cursor.fetchone())

    # Broadcast density update
    await manager.broadcast({
        "type": "density",
        "zone_id": zone.id,
        "count": new_count,
        "level": current_level,
        "ts": now_iso,
    })

    # If entries/exits changed, broadcast flow
    if req.entries_delta or req.exits_delta:
        await manager.broadcast({
            "type": "flow",
            "zone_id": zone.id,
            "net": net,
            "window": "5m",
            "ts": now_iso,
        })

    # Alert if breached red
    pct = (new_count / zone.capacity) * 100 if zone.capacity > 0 else 0
    if natural_level == "red" and pct >= (zone.red_pct or 90):
        alert = create_alert(
            zone_id=zone.id,
            level="red",
            msg=f"Computer Vision alert: Zone {zone.name} reached {round(pct)}% capacity ({new_count}/{zone.capacity})."
        )
        await manager.broadcast({
            "type": "alert",
            "id": alert.id,
            "zone_id": zone.id,
            "level": "red",
            "msg": alert.msg,
            "ts": alert.ts,
        })

    return updated_zone
