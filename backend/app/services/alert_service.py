from datetime import datetime, timezone
from typing import List, Optional, Literal
from app.database import get_db
from app.models.alert import Alert
from app.models.zone import StatusLevel

def row_to_alert(row) -> Alert:
    return Alert(
        id=row["id"],
        zone_id=row["zone_id"],
        zone_name=row["zone_name"],
        level=row["level"],
        msg=row["msg"],
        status=row["status"],
        ts=row["ts"],
        snapshot_url=row["snapshot_url"],
    )

def get_alerts(status_filter: Literal["open", "ack", "all"] = "all") -> List[Alert]:
    with get_db() as conn:
        cursor = conn.cursor()
        if status_filter in ("open", "ack"):
            cursor.execute(
                "SELECT * FROM alerts WHERE status = ? ORDER BY id DESC LIMIT 100;",
                (status_filter,)
            )
        else:
            cursor.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT 100;")
        rows = cursor.fetchall()
        return [row_to_alert(r) for r in rows]

def get_alert_by_id(alert_id: int) -> Optional[Alert]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM alerts WHERE id = ?;", (alert_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return row_to_alert(row)

def acknowledge_alert(alert_id: int) -> Optional[Alert]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE alerts SET status = 'ack' WHERE id = ?;", (alert_id,))
        if cursor.rowcount == 0:
            return None
        cursor.execute("SELECT * FROM alerts WHERE id = ?;", (alert_id,))
        row = cursor.fetchone()
        return row_to_alert(row)

def create_alert(zone_id: int, level: StatusLevel, msg: str, snapshot_url: Optional[str] = None) -> Alert:
    with get_db() as conn:
        cursor = conn.cursor()
        # Find zone name
        cursor.execute("SELECT name FROM zones WHERE id = ?;", (zone_id,))
        zrow = cursor.fetchone()
        zone_name = zrow["name"] if zrow else f"Zone {zone_id}"

        # Generate id
        cursor.execute("SELECT MAX(id) FROM alerts;")
        max_id = cursor.fetchone()[0] or 100
        new_id = max_id + 1

        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO alerts (id, zone_id, zone_name, level, msg, status, ts, snapshot_url)
            VALUES (?, ?, ?, ?, ?, 'open', ?, ?);
            """,
            (new_id, zone_id, zone_name, level, msg, now_iso, snapshot_url)
        )
        return Alert(
            id=new_id,
            zone_id=zone_id,
            zone_name=zone_name,
            level=level,
            msg=msg,
            status="open",
            ts=now_iso,
            snapshot_url=snapshot_url,
        )
