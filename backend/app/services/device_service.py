from datetime import datetime
from typing import List, Optional
from app.database import get_db
from app.models.device import Device, DeviceStatus

def row_to_device(row) -> Device:
    return Device(
        id=row["id"],
        name=row["name"],
        type=row["type"],
        zone_id=row["zone_id"],
        zone_name=row["zone_name"],
        status=row["status"],
        last_seen=row["last_seen"],
        battery=row["battery"],
        signal=row["signal"],
        ip=row["ip"],
    )

def get_all_devices() -> List[Device]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM devices ORDER BY id ASC;")
        rows = cursor.fetchall()
        return [row_to_device(r) for r in rows]

def get_device_by_id(device_id: int) -> Optional[Device]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM devices WHERE id = ?;", (device_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return row_to_device(row)

def update_device_status(device_id: int, status: DeviceStatus) -> Optional[Device]:
    with get_db() as conn:
        cursor = conn.cursor()
        last_seen = "Just now" if status == "online" else "Recent"
        cursor.execute(
            "UPDATE devices SET status = ?, last_seen = ? WHERE id = ?;",
            (status, last_seen, device_id)
        )
        if cursor.rowcount == 0:
            return None
        cursor.execute("SELECT * FROM devices WHERE id = ?;", (device_id,))
        return row_to_device(cursor.fetchone())

def update_device_heartbeat(
    device_id: int,
    status: Optional[DeviceStatus] = "online",
    battery: Optional[int] = None,
    signal: Optional[int] = None,
    ip: Optional[str] = None
) -> Optional[Device]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM devices WHERE id = ?;", (device_id,))
        row = cursor.fetchone()
        if not row:
            return None

        new_status = status or row["status"]
        new_battery = battery if battery is not None else row["battery"]
        new_signal = signal if signal is not None else row["signal"]
        new_ip = ip if ip is not None else row["ip"]
        last_seen = "Just now"

        cursor.execute(
            """
            UPDATE devices
            SET status = ?, battery = ?, signal = ?, ip = ?, last_seen = ?
            WHERE id = ?;
            """,
            (new_status, new_battery, new_signal, new_ip, last_seen, device_id)
        )
        cursor.execute("SELECT * FROM devices WHERE id = ?;", (device_id,))
        return row_to_device(cursor.fetchone())
