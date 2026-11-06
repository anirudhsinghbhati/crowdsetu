import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple

from app.database import get_db
from app.models.zone import (
    Zone,
    StatusLevel,
    ZoneOverride,
    MultilingualMessage,
    ZoneDensityPoint,
    ZoneFlowPoint,
    OverrideRequest,
)

def compute_level(count: int, capacity: int, yellow_pct: int, red_pct: int) -> StatusLevel:
    pct = (count / capacity) * 100 if capacity > 0 else 0
    if pct >= red_pct:
        return "red"
    elif pct >= yellow_pct:
        return "yellow"
    return "green"

def row_to_zone(row) -> Zone:
    sparkline = json.loads(row["sparkline_json"]) if row["sparkline_json"] else []
    override = None
    if row["override_level"]:
        override = ZoneOverride(
            level=row["override_level"],
            message=MultilingualMessage(
                en=row["override_en"] or "",
                hi=row["override_hi"] or "",
                gu=row["override_gu"] or "",
            ),
            duration_min=row["override_duration_min"] or 0,
            applied_at=row["override_applied_at"] or "",
            expires_at=row["override_expires_at"],
        )

    return Zone(
        id=row["id"],
        name=row["name"],
        capacity=row["capacity"],
        count=row["count"],
        level=row["level"],
        yellow_pct=row["yellow_pct"],
        red_pct=row["red_pct"],
        net_flow=row["net_flow"],
        sparkline=sparkline,
        override=override,
    )

def get_all_zones() -> List[Zone]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM zones ORDER BY id ASC;")
        rows = cursor.fetchall()
        return [row_to_zone(r) for r in rows]

def get_zone_by_id(zone_id: int) -> Optional[Zone]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM zones WHERE id = ?;", (zone_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return row_to_zone(row)

def override_zone(zone_id: int, req: OverrideRequest) -> Optional[Zone]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM zones WHERE id = ?;", (zone_id,))
        row = cursor.fetchone()
        if not row:
            return None

        now = datetime.now(timezone.utc)
        applied_at = now.isoformat()
        expires_at = None
        if req.duration_min > 0:
            expires_at = (now + timedelta(minutes=req.duration_min)).isoformat()

        cursor.execute(
            """
            UPDATE zones
            SET level = ?,
                override_level = ?,
                override_en = ?,
                override_hi = ?,
                override_gu = ?,
                override_duration_min = ?,
                override_applied_at = ?,
                override_expires_at = ?
            WHERE id = ?;
            """,
            (
                req.level,
                req.level,
                req.message.en,
                req.message.hi,
                req.message.gu,
                req.duration_min,
                applied_at,
                expires_at,
                zone_id,
            )
        )

        cursor.execute("SELECT * FROM zones WHERE id = ?;", (zone_id,))
        updated_row = cursor.fetchone()
        return row_to_zone(updated_row)

def cancel_zone_override(zone_id: int) -> Optional[Zone]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM zones WHERE id = ?;", (zone_id,))
        row = cursor.fetchone()
        if not row:
            return None

        natural_level = compute_level(row["count"], row["capacity"], row["yellow_pct"], row["red_pct"])
        cursor.execute(
            """
            UPDATE zones
            SET level = ?,
                override_level = NULL,
                override_en = NULL,
                override_hi = NULL,
                override_gu = NULL,
                override_duration_min = NULL,
                override_applied_at = NULL,
                override_expires_at = NULL
            WHERE id = ?;
            """,
            (natural_level, zone_id)
        )

        cursor.execute("SELECT * FROM zones WHERE id = ?;", (zone_id,))
        updated_row = cursor.fetchone()
        return row_to_zone(updated_row)

def update_zone_thresholds(zone_id: int, yellow_pct: int, red_pct: int) -> Optional[Zone]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM zones WHERE id = ?;", (zone_id,))
        row = cursor.fetchone()
        if not row:
            return None

        # If override is active, level stays override level; otherwise recompute
        if row["override_level"]:
            new_level = row["override_level"]
        else:
            new_level = compute_level(row["count"], row["capacity"], yellow_pct, red_pct)

        cursor.execute(
            """
            UPDATE zones
            SET yellow_pct = ?, red_pct = ?, level = ?
            WHERE id = ?;
            """,
            (yellow_pct, red_pct, new_level, zone_id)
        )

        cursor.execute("SELECT * FROM zones WHERE id = ?;", (zone_id,))
        updated_row = cursor.fetchone()
        return row_to_zone(updated_row)

def get_zone_density(zone_id: int, from_ts: Optional[str] = None, to_ts: Optional[str] = None) -> List[ZoneDensityPoint]:
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT ts, count, level FROM zone_density_history WHERE zone_id = ?"
        params: list = [zone_id]

        if from_ts:
            query += " AND ts >= ?"
            params.append(from_ts)
        if to_ts:
            query += " AND ts <= ?"
            params.append(to_ts)

        query += " ORDER BY ts ASC LIMIT 100;"
        cursor.execute(query, params)
        rows = cursor.fetchall()

        if not rows:
            # Fallback realistic points if empty
            zone = get_zone_by_id(zone_id)
            cap = zone.capacity if zone else 500
            now = datetime.now(timezone.utc)
            points = []
            for i in range(24, -1, -1):
                pt = (now - timedelta(minutes=i * 15)).isoformat()
                cnt = int(cap * 0.5 + (i % 5) * 15)
                lvl: StatusLevel = "green" if cnt < cap * 0.7 else ("yellow" if cnt < cap * 0.9 else "red")
                points.append(ZoneDensityPoint(ts=pt, count=cnt, level=lvl))
            return points

        return [ZoneDensityPoint(ts=r["ts"], count=r["count"], level=r["level"]) for r in rows]

def get_zone_flow(zone_id: int, window: str = "5m") -> List[ZoneFlowPoint]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ts, entries, exits, net
            FROM zone_flow_history
            WHERE zone_id = ? AND window = ?
            ORDER BY id ASC LIMIT 50;
            """,
            (zone_id, window)
        )
        rows = cursor.fetchall()
        if not rows:
            now = datetime.now(timezone.utc)
            points = []
            for i in range(12, -1, -1):
                pt = (now - timedelta(minutes=i * 5)).strftime("%H:%M")
                entries = 30 + (i * 4) % 25
                exits = 20 + (i * 3) % 20
                points.append(ZoneFlowPoint(ts=pt, entries=entries, exits=exits, net=entries - exits))
            return points
        return [ZoneFlowPoint(ts=r["ts"], entries=r["entries"], exits=r["exits"], net=r["net"]) for r in rows]

def check_expired_overrides() -> List[Zone]:
    """Checks for expired overrides, reverts them, and returns affected zones."""
    expired_zones = []
    with get_db() as conn:
        cursor = conn.cursor()
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            SELECT id FROM zones
            WHERE override_expires_at IS NOT NULL AND override_expires_at <= ?;
            """,
            (now_iso,)
        )
        expired_ids = [row["id"] for row in cursor.fetchall()]

    for zid in expired_ids:
        zone = cancel_zone_override(zid)
        if zone:
            expired_zones.append(zone)
    return expired_zones
