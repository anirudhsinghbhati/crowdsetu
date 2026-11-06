import asyncio
import json
import random
from datetime import datetime, timezone
from typing import Set, Dict, Any, Optional
from fastapi import WebSocket

from app.config import ENABLE_SIMULATION, SIMULATION_INTERVAL_SECONDS
from app.database import get_db
from app.services.zone_service import (
    get_all_zones,
    compute_level,
    check_expired_overrides,
    get_zone_by_id,
)
from app.services.alert_service import create_alert
from app.services.device_service import update_device_status, get_device_by_id

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        message_str = json.dumps(message)
        dead_connections = set()
        async with self._lock:
            for connection in self.active_connections:
                try:
                    await connection.send_text(message_str)
                except Exception:
                    dead_connections.add(connection)
            for dead in dead_connections:
                self.active_connections.remove(dead)

# Global manager instance
manager = ConnectionManager()

# Background simulation task reference
_simulation_task: Optional[asyncio.Task] = None
_simulation_running = True

def set_simulation_state(enabled: bool):
    global _simulation_running
    _simulation_running = enabled

async def run_simulation_loop():
    while True:
        try:
            await asyncio.sleep(SIMULATION_INTERVAL_SECONDS)

            # 1. Check for expired overrides
            expired_zones = check_expired_overrides()
            for ez in expired_zones:
                await manager.broadcast({
                    "type": "density",
                    "zone_id": ez.id,
                    "count": ez.count,
                    "level": ez.level,
                    "ts": datetime.now(timezone.utc).isoformat(),
                })

            if not ENABLE_SIMULATION or not _simulation_running:
                continue

            # Pick a random zone to update
            zones = get_all_zones()
            if not zones:
                continue

            zone = random.choice(zones)
            delta = random.randint(-3, 4)
            new_count = max(20, min(zone.capacity + 20, zone.count + delta))

            # Calculate natural level from thresholds
            natural_level = compute_level(
                new_count,
                zone.capacity,
                zone.yellow_pct or 70,
                zone.red_pct or 90
            )

            current_level = zone.override.level if zone.override else natural_level

            # Update sparkline
            new_sparkline = zone.sparkline or []
            if len(new_sparkline) >= 6:
                new_sparkline = new_sparkline[1:] + [new_count]
            else:
                new_sparkline.append(new_count)

            # Update zone in database
            now_iso = datetime.now(timezone.utc).isoformat()
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    UPDATE zones
                    SET count = ?, level = ?, sparkline_json = ?
                    WHERE id = ?;
                    """,
                    (new_count, current_level, json.dumps(new_sparkline), zone.id)
                )

                # Append density history point periodically
                cursor.execute(
                    "INSERT INTO zone_density_history (zone_id, ts, count, level) VALUES (?, ?, ?, ?);",
                    (zone.id, now_iso, new_count, current_level)
                )

            # Broadcast density update
            await manager.broadcast({
                "type": "density",
                "zone_id": zone.id,
                "count": new_count,
                "level": current_level,
                "ts": now_iso,
            })

            # 35% chance to update net flow
            if random.random() < 0.35:
                net = random.randint(-15, 25)
                with get_db() as conn:
                    cursor = conn.cursor()
                    cursor.execute("UPDATE zones SET net_flow = ? WHERE id = ?;", (net, zone.id))
                    now_hm = datetime.now().strftime("%H:%M")
                    entries = max(0, 30 + net // 2)
                    exits = max(0, 30 - net // 2)
                    cursor.execute(
                        "INSERT INTO zone_flow_history (zone_id, ts, entries, exits, net, window) VALUES (?, ?, ?, ?, ?, ?);",
                        (zone.id, now_hm, entries, exits, net, "5m")
                    )

                await manager.broadcast({
                    "type": "flow",
                    "zone_id": zone.id,
                    "net": net,
                    "window": "5m",
                    "ts": now_iso,
                })

            # 8% chance to trigger an alert if zone is red
            if current_level == "red" and random.random() < 0.08:
                pct = round((new_count / zone.capacity) * 100)
                alert = create_alert(
                    zone_id=zone.id,
                    level="red",
                    msg=f"Surge in {zone.name}: density reached {pct}% capacity."
                )
                await manager.broadcast({
                    "type": "alert",
                    "id": alert.id,
                    "zone_id": zone.id,
                    "level": "red",
                    "msg": alert.msg,
                    "ts": alert.ts,
                })

            # 5% chance of camera 7 (CAM-EL-02) status jitter
            if random.random() < 0.05:
                dev = get_device_by_id(7)
                if dev:
                    new_status = "online" if dev.status == "offline" else "offline"
                    updated_dev = update_device_status(7, new_status)
                    if updated_dev:
                        await manager.broadcast({
                            "type": "device",
                            "id": 7,
                            "status": updated_dev.status,
                            "ts": now_iso,
                        })

        except asyncio.CancelledError:
            break
        except Exception as e:
            # Prevent crashes in background loop
            await asyncio.sleep(1.0)

def start_simulation():
    global _simulation_task
    if _simulation_task is None or _simulation_task.done():
        _simulation_task = asyncio.create_task(run_simulation_loop())

def stop_simulation():
    global _simulation_task
    if _simulation_task and not _simulation_task.done():
        _simulation_task.cancel()
        _simulation_task = None
