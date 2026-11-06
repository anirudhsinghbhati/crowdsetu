import sqlite3
import json
import os
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Generator
from contextlib import contextmanager

from app.config import DATABASE_PATH

def hash_password(password: str) -> str:
    # PBKDF2-HMAC-SHA256 with fixed salt for demo simplicity / security
    salt = b"crowdsetu_secure_salt_2026"
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return key.hex()

def verify_password(plain_password: str, hashed: str) -> bool:
    return hash_password(plain_password) == hashed

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db() -> None:
    """Initializes tables and seeds starting data if empty."""
    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                name TEXT,
                last_login TEXT,
                created_at TEXT NOT NULL
            );
        """)

        # 2. Zones table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS zones (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                capacity INTEGER NOT NULL,
                count INTEGER NOT NULL,
                level TEXT NOT NULL,
                yellow_pct INTEGER NOT NULL DEFAULT 70,
                red_pct INTEGER NOT NULL DEFAULT 90,
                net_flow INTEGER NOT NULL DEFAULT 0,
                sparkline_json TEXT,
                override_level TEXT,
                override_en TEXT,
                override_hi TEXT,
                override_gu TEXT,
                override_duration_min INTEGER,
                override_applied_at TEXT,
                override_expires_at TEXT
            );
        """)

        # 3. Zone density history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS zone_density_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                zone_id INTEGER NOT NULL,
                ts TEXT NOT NULL,
                count INTEGER NOT NULL,
                level TEXT NOT NULL,
                FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
            );
        """)

        # 4. Zone flow history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS zone_flow_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                zone_id INTEGER NOT NULL,
                ts TEXT NOT NULL,
                entries INTEGER NOT NULL,
                exits INTEGER NOT NULL,
                net INTEGER NOT NULL,
                window TEXT NOT NULL DEFAULT '5m',
                FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
            );
        """)

        # 5. Alerts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY,
                zone_id INTEGER NOT NULL,
                zone_name TEXT,
                level TEXT NOT NULL,
                msg TEXT NOT NULL,
                status TEXT NOT NULL, -- 'open' or 'ack'
                ts TEXT NOT NULL,
                snapshot_url TEXT,
                FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
            );
        """)

        # 6. Devices table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL, -- 'camera', 'scanner', 'display'
                zone_id INTEGER NOT NULL,
                zone_name TEXT,
                status TEXT NOT NULL, -- 'online', 'offline', 'degraded'
                last_seen TEXT NOT NULL,
                battery INTEGER,
                signal INTEGER,
                ip TEXT,
                FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
            );
        """)

        # 7. Pilgrim Tokens table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pilgrim_tokens (
                token TEXT PRIMARY KEY,
                sig TEXT NOT NULL,
                group_size INTEGER NOT NULL,
                gate TEXT NOT NULL,
                name TEXT,
                issued_at TEXT NOT NULL
            );
        """)

        # 8. Pilgrim Scans table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pilgrim_scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT NOT NULL,
                checkpoint TEXT NOT NULL,
                direction TEXT NOT NULL, -- 'IN' or 'OUT'
                ts TEXT NOT NULL,
                FOREIGN KEY (token) REFERENCES pilgrim_tokens(token) ON DELETE CASCADE
            );
        """)

        # 9. Reports table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                date_range TEXT NOT NULL,
                zones TEXT NOT NULL,
                generated TEXT NOT NULL,
                format TEXT NOT NULL, -- 'PDF' or 'CSV'
                status TEXT NOT NULL,
                file_path TEXT
            );
        """)

        # Seed initial users if table is empty
        cursor.execute("SELECT COUNT(*) FROM users;")
        if cursor.fetchone()[0] == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            initial_users = [
                ("admin", hash_password("admin123"), "admin", "Duty Officer (Chief Admin)", "Today, 10:45 AM", now_iso),
                ("operator", hash_password("demo123"), "operator", "Shift Control Operator", "Today, 08:30 AM", now_iso),
                ("viewer", hash_password("demo123"), "viewer", "Guest Observer", "Yesterday, 04:15 PM", now_iso),
            ]
            cursor.executemany(
                "INSERT INTO users (username, password_hash, role, name, last_login, created_at) VALUES (?, ?, ?, ?, ?, ?);",
                initial_users
            )

        # Seed initial zones if table is empty
        cursor.execute("SELECT COUNT(*) FROM zones;")
        if cursor.fetchone()[0] == 0:
            initial_zones = [
                (1, "Main Gate", 600, 280, "green", 70, 90, 18, json.dumps([210, 230, 250, 265, 275, 280])),
                (2, "Ghat Approach", 500, 360, "yellow", 70, 90, 24, json.dumps([280, 310, 325, 340, 355, 360])),
                (3, "Sanctum Corridor", 450, 412, "red", 75, 90, 42, json.dumps([290, 330, 370, 395, 405, 412])),
                (4, "Exit Lane", 400, 110, "green", 70, 85, -32, json.dumps([140, 135, 125, 120, 115, 110])),
            ]
            cursor.executemany(
                """
                INSERT INTO zones (id, name, capacity, count, level, yellow_pct, red_pct, net_flow, sparkline_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                initial_zones
            )

            # Seed realistic density history for each zone
            now = datetime.now(timezone.utc)
            for z_id, z_name, cap, current_count, _, yellow_p, red_p, _, _ in initial_zones:
                for i in range(24, -1, -1):
                    point_time = (now - timedelta(minutes=i * 15)).isoformat()
                    # compute realistic count wave
                    import math
                    base = cap * 0.55
                    wave = math.sin(i / 3.0) * (cap * 0.25)
                    cnt = int(max(20, min(cap + 20, base + wave)))
                    pct = (cnt / cap) * 100
                    lvl = "red" if pct >= red_p else ("yellow" if pct >= yellow_p else "green")
                    cursor.execute(
                        "INSERT INTO zone_density_history (zone_id, ts, count, level) VALUES (?, ?, ?, ?);",
                        (z_id, point_time, cnt, lvl)
                    )

                # Seed realistic flow history
                for i in range(12, -1, -1):
                    point_time = (now - timedelta(minutes=i * 5)).strftime("%H:%M")
                    entries = 35 + (i * 3) % 25
                    exits = 25 + (i * 4) % 20
                    net = entries - exits
                    cursor.execute(
                        "INSERT INTO zone_flow_history (zone_id, ts, entries, exits, net, window) VALUES (?, ?, ?, ?, ?, ?);",
                        (z_id, point_time, entries, exits, net, "5m")
                    )

        # Seed initial devices if table is empty
        cursor.execute("SELECT COUNT(*) FROM devices;")
        if cursor.fetchone()[0] == 0:
            initial_devices = [
                (1, "CAM-MG-01", "camera", 1, "Main Gate", "online", "Just now", None, 95, "192.168.1.101"),
                (2, "CAM-MG-02", "camera", 1, "Main Gate", "online", "Just now", None, 92, "192.168.1.102"),
                (3, "CAM-GA-01", "camera", 2, "Ghat Approach", "online", "Just now", None, 88, "192.168.1.103"),
                (4, "CAM-GA-02", "camera", 2, "Ghat Approach", "degraded", "45s ago", None, 45, "192.168.1.104"),
                (5, "CAM-SC-01", "camera", 3, "Sanctum Corridor", "online", "Just now", None, 98, "192.168.1.105"),
                (6, "CAM-EL-01", "camera", 4, "Exit Lane", "online", "Just now", None, 91, "192.168.1.106"),
                (7, "CAM-EL-02", "camera", 4, "Exit Lane", "offline", "12 min ago", None, 0, "192.168.1.107"),
                (8, "SCAN-GATE-1", "scanner", 1, "Main Gate", "online", "Just now", 84, None, "192.168.1.201"),
                (9, "SCAN-SANCTUM", "scanner", 3, "Sanctum Corridor", "online", "Just now", 67, None, "192.168.1.202"),
                (10, "DISP-GATE-1", "display", 1, "Main Gate", "online", "Just now", None, 99, "192.168.1.210"),
            ]
            cursor.executemany(
                """
                INSERT INTO devices (id, name, type, zone_id, zone_name, status, last_seen, battery, signal, ip)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                initial_devices
            )

        # Seed initial alerts if table is empty
        cursor.execute("SELECT COUNT(*) FROM alerts;")
        if cursor.fetchone()[0] == 0:
            now = datetime.now(timezone.utc)
            initial_alerts = [
                (91, 3, "Sanctum Corridor", "red", "Capacity threshold breached: 412 / 450 people (91.5%). High surge detected.", "open", (now - timedelta(minutes=2)).isoformat(), None),
                (90, 2, "Ghat Approach", "yellow", "Density approaching 72% capacity. Queue buildup at barricade 4.", "open", (now - timedelta(minutes=14)).isoformat(), None),
                (89, 1, "Main Gate", "yellow", "Entry flow spike (+65 people/5m) during evening aarti arrival.", "ack", (now - timedelta(minutes=48)).isoformat(), None),
                (88, 3, "Sanctum Corridor", "red", "Brief bottleneck cleared near sanctum sanctorum entry point.", "ack", (now - timedelta(minutes=95)).isoformat(), None),
            ]
            cursor.executemany(
                """
                INSERT INTO alerts (id, zone_id, zone_name, level, msg, status, ts, snapshot_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """,
                initial_alerts
            )

        # Seed initial pilgrim token & scans if empty
        cursor.execute("SELECT COUNT(*) FROM pilgrim_tokens;")
        if cursor.fetchone()[0] == 0:
            now = datetime.now(timezone.utc)
            token = "TK-7842"
            cursor.execute(
                """
                INSERT INTO pilgrim_tokens (token, sig, group_size, gate, name, issued_at)
                VALUES (?, ?, ?, ?, ?, ?);
                """,
                (token, "8f9c1a7d", 4, "Gate 1 (Main Gate)", "Sharma Family", (now - timedelta(minutes=35)).isoformat())
            )

            scans = [
                (token, "Main Gate Scanner A", "IN", (now - timedelta(minutes=32)).strftime("%I:%M %p")),
                (token, "Ghat Barricade Scanner", "IN", (now - timedelta(minutes=18)).strftime("%I:%M %p")),
                (token, "Sanctum Security Check", "IN", (now - timedelta(minutes=4)).strftime("%I:%M %p")),
            ]
            cursor.executemany(
                "INSERT INTO pilgrim_scans (token, checkpoint, direction, ts) VALUES (?, ?, ?, ?);",
                scans
            )

        # Seed initial reports history if empty
        cursor.execute("SELECT COUNT(*) FROM reports;")
        if cursor.fetchone()[0] == 0:
            initial_reports = [
                ("1", "Alert log · Sector A", "08 Oct 2026", "All 4 zones", "08 Oct · 09:50", "CSV", "Available", None),
                ("2", "Daily summary · Sector A", "07 Oct 2026", "All 4 zones", "07 Oct · 23:59", "PDF", "Available", None),
                ("3", "Peak crowd · Main Gate", "07 Oct 2026", "Main Gate", "07 Oct · 18:10", "PDF", "Available", None),
                ("4", "Flow · Sector A", "07 Oct 2026", "All 4 zones", "07 Oct · 14:05", "CSV", "Available", None),
            ]
            cursor.executemany(
                """
                INSERT INTO reports (id, name, date_range, zones, generated, format, status, file_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """,
                initial_reports
            )
