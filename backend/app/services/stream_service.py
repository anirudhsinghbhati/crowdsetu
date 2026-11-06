import io
import time
import math
import random
import asyncio
from datetime import datetime
from typing import AsyncGenerator
from PIL import Image, ImageDraw, ImageFont

from app.services.zone_service import get_zone_by_id
from app.services.device_service import get_device_by_id

def create_camera_frame(camera_id: int, frame_idx: int) -> bytes:
    width, height = 480, 270
    img = Image.new("RGB", (width, height), color=(14, 17, 22)) # #0E1116
    draw = ImageDraw.Draw(img)

    # Find associated zone
    zone_id = 1
    zone_name = "Main Gate"
    count = 280
    capacity = 600
    level = "green"
    is_offline = False

    device = get_device_by_id(camera_id)
    if device:
        zone_id = device.zone_id
        if device.status == "offline":
            is_offline = True
    else:
        zone_id = camera_id

    zone = get_zone_by_id(zone_id)
    if zone:
        zone_name = zone.name
        count = zone.count
        capacity = zone.capacity
        level = zone.level
        if zone.level == "grey":
            is_offline = True

    # If offline, render offline test card
    if is_offline or camera_id == 7:
        # Static noise effect
        for _ in range(400):
            rx = random.randint(0, width - 1)
            ry = random.randint(0, height - 1)
            noise_val = random.randint(40, 100)
            draw.point((rx, ry), fill=(noise_val, noise_val, noise_val))

        draw.rectangle([(width // 2 - 140, height // 2 - 35), (width // 2 + 140, height // 2 + 35)], fill=(25, 30, 40), outline=(122, 129, 144), width=2)
        draw.text((width // 2 - 100, height // 2 - 18), "CAMERA FEED OFFLINE", fill=(217, 60, 60))
        draw.text((width // 2 - 110, height // 2 + 5), "NO SIGNAL · RETRYING...", fill=(152, 160, 174))
    else:
        # Perspective corridor geometry
        vanishing_x, vanishing_y = width // 2, height // 2 - 20
        # Draw perspective floor lines
        floor_color = (35, 45, 60)
        draw.line([(0, height), (vanishing_x - 30, vanishing_y + 30)], fill=floor_color, width=1)
        draw.line([(width, height), (vanishing_x + 30, vanishing_y + 30)], fill=floor_color, width=1)
        draw.line([(width // 4, height), (vanishing_x - 10, vanishing_y + 30)], fill=floor_color, width=1)
        draw.line([(width * 3 // 4, height), (vanishing_x + 10, vanishing_y + 30)], fill=floor_color, width=1)

        # Perspective ceiling lines
        ceil_color = (25, 33, 45)
        draw.line([(0, 0), (vanishing_x - 40, vanishing_y - 20)], fill=ceil_color, width=1)
        draw.line([(width, 0), (vanishing_x + 40, vanishing_y - 20)], fill=ceil_color, width=1)

        # Draw corridor portals
        for dist in [0.2, 0.45, 0.7, 0.95]:
            w_box = int(width * dist)
            h_box = int(height * dist)
            bx1 = vanishing_x - w_box // 2
            by1 = vanishing_y - h_box // 2
            bx2 = vanishing_x + w_box // 2
            by2 = vanishing_y + h_box // 2
            draw.rectangle([(bx1, by1), (bx2, by2)], outline=(30, 40, 52), width=1)

        # Draw simulated moving people / bounding boxes according to count
        dot_color = (47, 168, 102) # Green
        if level == "yellow":
            dot_color = (229, 185, 31)
        elif level == "red":
            dot_color = (217, 60, 60)

        num_blobs = min(35, max(8, count // 15))
        random.seed(frame_idx // 3) # Jitter smoothly
        for b in range(num_blobs):
            depth = 0.25 + (b / num_blobs) * 0.7
            spread_x = int((vanishing_x - 30) * depth)
            pos_x = vanishing_x + int((math.sin(b * 1.7 + frame_idx * 0.08) * spread_x))
            pos_y = int(vanishing_y + 30 + depth * (height - vanishing_y - 50))
            blob_size = max(3, int(10 * depth))

            # Bounding box simulation
            draw.rectangle(
                [(pos_x - blob_size, pos_y - blob_size * 2), (pos_x + blob_size, pos_y)],
                outline=dot_color,
                width=1
            )
            # Dot representing head
            draw.ellipse(
                [(pos_x - blob_size // 2, pos_y - blob_size * 2 - blob_size),
                 (pos_x + blob_size // 2, pos_y - blob_size * 2)],
                fill=dot_color
            )

    # HUD Overlay
    # Top banner dark bar
    draw.rectangle([(0, 0), (width, 24)], fill=(15, 20, 26, 200))
    # Bottom banner dark bar
    draw.rectangle([(0, height - 26), (width, height)], fill=(15, 20, 26, 200))

    # Top Left: Camera ID + Status
    cam_name = device.name if device else f"CAM-0{camera_id}"
    draw.text((10, 5), f"{cam_name} [LIVE]", fill=(47, 168, 102) if not is_offline else (217, 60, 60))

    # Top Right: Timestamp IST
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
    draw.text((width - 165, 5), now_str, fill=(152, 160, 174))

    # Bottom Left: Zone Name
    draw.text((10, height - 20), f"Zone {zone_id}: {zone_name}", fill=(232, 230, 223))

    # Bottom Right: Occupancy info
    pct = round((count / capacity) * 100, 1) if capacity > 0 else 0
    count_str = f"Occupancy: {count}/{capacity} ({pct}%)"
    draw.text((width - 180, height - 20), count_str, fill=(232, 150, 46)) # Saffron

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=75)
    return buf.getvalue()

async def generate_mjpeg_stream(camera_id: int) -> AsyncGenerator[bytes, None]:
    frame_idx = 0
    while True:
        frame_idx += 1
        frame_bytes = create_camera_frame(camera_id, frame_idx)
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )
        await asyncio.sleep(0.2) # ~5 FPS
