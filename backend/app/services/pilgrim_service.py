import hmac
import hashlib
import random
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from app.config import SECRET_KEY
from app.database import get_db
from app.models.pilgrim import PilgrimToken, PilgrimScan

def generate_signature(token: str) -> str:
    h = hmac.new(SECRET_KEY.encode("utf-8"), token.encode("utf-8"), hashlib.sha256)
    return h.hexdigest()[:8]

def verify_token_signature(token: str, sig: str) -> bool:
    expected = generate_signature(token)
    return hmac.compare_digest(expected.lower(), sig.lower())

def register_pilgrim(group_size: int, gate: str, name: Optional[str] = None) -> PilgrimToken:
    with get_db() as conn:
        cursor = conn.cursor()
        while True:
            random_hex = f"{random.randint(0, 0xFFFF):04X}"
            token = f"TK-{random_hex}"
            cursor.execute("SELECT token FROM pilgrim_tokens WHERE token = ?;", (token,))
            if not cursor.fetchone():
                break

        sig = generate_signature(token)
        now_iso = datetime.now(timezone.utc).isoformat()

        cursor.execute(
            """
            INSERT INTO pilgrim_tokens (token, sig, group_size, gate, name, issued_at)
            VALUES (?, ?, ?, ?, ?, ?);
            """,
            (token, sig, group_size, gate, name, now_iso)
        )

        return PilgrimToken(
            token=token,
            sig=sig,
            group_size=group_size,
            gate=gate,
            name=name,
            issued_at=now_iso,
            scans=[],
        )

def get_pilgrim_token(token_input: str) -> Optional[PilgrimToken]:
    # Clean input and handle full QR string `${token}.${sig}`
    clean_input = token_input.strip()
    if "." in clean_input:
        token_str = clean_input.split(".", 1)[0].upper()
    else:
        token_str = clean_input.upper()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pilgrim_tokens WHERE upper(token) = ?;", (token_str,))
        row = cursor.fetchone()
        if not row:
            return None

        cursor.execute(
            "SELECT checkpoint, direction, ts FROM pilgrim_scans WHERE token = ? ORDER BY id ASC;",
            (row["token"],)
        )
        scan_rows = cursor.fetchall()
        scans = [
            PilgrimScan(
                checkpoint=sr["checkpoint"],
                direction=sr["direction"],
                ts=sr["ts"]
            )
            for sr in scan_rows
        ]

        return PilgrimToken(
            token=row["token"],
            sig=row["sig"],
            group_size=row["group_size"],
            gate=row["gate"],
            name=row["name"],
            issued_at=row["issued_at"],
            scans=scans,
        )

def record_scan(
    token_input: str,
    checkpoint: str,
    direction: str = "IN",
    ts: Optional[str] = None,
    sig: Optional[str] = None
) -> Tuple[Optional[PilgrimToken], Optional[PilgrimScan]]:
    token_obj = get_pilgrim_token(token_input)
    if not token_obj:
        return None, None

    scan_time = ts or datetime.now().strftime("%I:%M %p")
    norm_direction = direction.upper() if direction.upper() in ("IN", "OUT") else "IN"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO pilgrim_scans (token, checkpoint, direction, ts)
            VALUES (?, ?, ?, ?);
            """,
            (token_obj.token, checkpoint, norm_direction, scan_time)
        )

    updated_token = get_pilgrim_token(token_obj.token)
    new_scan = PilgrimScan(checkpoint=checkpoint, direction=norm_direction, ts=scan_time)
    return updated_token, new_scan

def batch_record_scans(scans_data: List[dict]) -> int:
    inserted = 0
    with get_db() as conn:
        cursor = conn.cursor()
        for s in scans_data:
            token_in = s.get("token", "").strip().upper()
            if "." in token_in:
                token_in = token_in.split(".", 1)[0]
            checkpoint = s.get("checkpoint", "Mobile Scanner")
            direction = s.get("direction", "IN").upper()
            ts = s.get("ts") or datetime.now().strftime("%I:%M %p")

            # Check if token exists
            cursor.execute("SELECT token FROM pilgrim_tokens WHERE token = ?;", (token_in,))
            if cursor.fetchone():
                cursor.execute(
                    "INSERT INTO pilgrim_scans (token, checkpoint, direction, ts) VALUES (?, ?, ?, ?);",
                    (token_in, checkpoint, direction, ts)
                )
                inserted += 1
    return inserted

