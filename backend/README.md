# CrowdSetu — Backend API & Real-time Engine

The real-time backend service for **CrowdSetu**, a crowd monitoring and management system designed for high-density pilgrimage sites in India (e.g., Somnath, Kedarnath).

Built with **FastAPI**, **SQLite** (WAL-mode persistence), and **WebSockets**, this service computes zone density, flow, threshold alerts, handles pilgrim QR token registration/verification, streams live camera feeds, and broadcasts real-time telemetry to the admin dashboard, public gate displays, and mobile scanner devices.

---

## Features

* **High-Performance REST API**: Base path `/api` powered by FastAPI and Pydantic v2 validation.
* **Real-Time WebSocket Sync**: `/ws/live` streams instant density variations, net flow updates, threshold breaches, and device heartbeats with zero polling.
* **Automatic Simulation Engine**: Built-in background worker provides realistic crowd dynamics, time-series history, and automated override expiry when live CV feeds are idle.
* **Role-Based Access Control**: JWT Bearer authentication with `admin`, `operator`, and `viewer` roles.
* **Pilgrim Token Issuance & Verification**: Fast generation of tamper-proof `TK-XXXX.${sig}` QR tokens signed via HMAC-SHA256, strictly preserving pilgrim privacy (zero PII encoded in QR).
* **Live MJPEG Camera Feeds**: Dynamic multipart video streaming (`/api/cameras/{id}/stream`) rendering perspective corridor geometry, simulated bounding boxes, and camera HUD metadata.
* **Computer Vision Ingestion**: Ingests bounding box counts and flow rates from external computer vision / edge models (`POST /api/cv/telemetry`).
* **Multi-Format Reports**: Automated generation of CSV and formatted PDF audit reports using ReportLab.
* **Production Ready**: Fully dockerized with multi-container orchestration (`docker-compose.yml`).

---

## Tech Stack

* **Framework**: FastAPI + Starlette + Uvicorn
* **Database**: SQLite3 with Write-Ahead Logging (`WAL`)
* **Security & Auth**: PyJWT + PBKDF2 HMAC password hashing
* **Real-time Protocol**: Standard WebSockets (RFC 6455)
* **Graphics & Video**: Pillow (PIL) for MJPEG frame generation
* **Reporting**: ReportLab (PDF) + standard CSV
* **Testing**: Pytest + HTTPX

---

## Directory Structure

```
backend/
├── app/
│   ├── config.py              # Environment configuration & defaults
│   ├── database.py            # SQLite connection, schema migration & seed data
│   ├── main.py                # FastAPI application entrypoint & middleware
│   ├── models/                # Pydantic data schemas
│   │   ├── alert.py
│   │   ├── auth.py
│   │   ├── cv.py
│   │   ├── device.py
│   │   ├── pilgrim.py
│   │   ├── report.py
│   │   ├── websocket.py
│   │   └── zone.py
│   ├── routers/               # API route definitions
│   │   ├── alerts.py
│   │   ├── auth.py
│   │   ├── cameras.py
│   │   ├── cv.py
│   │   ├── devices.py
│   │   ├── health.py
│   │   ├── pilgrims.py
│   │   ├── reports.py
│   │   └── zones.py
│   ├── services/              # Business logic & background workers
│   │   ├── alert_service.py
│   │   ├── auth_service.py
│   │   ├── device_service.py
│   │   ├── live_engine.py     # WebSocket manager & live simulation
│   │   ├── pilgrim_service.py # HMAC token generation & scanner verification
│   │   ├── report_service.py  # PDF/CSV generation
│   │   ├── stream_service.py  # Dynamic MJPEG camera stream generator
│   │   └── zone_service.py    # Occupancy math, thresholds & overrides
│   └── websocket/
│       └── live.py            # /ws/live endpoint
├── tests/                     # Comprehensive test suite (20 tests)
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

---

## Getting Started

### 1. Prerequisites
* Python 3.10+ (tested through Python 3.14)
* pip

### 2. Installation
Navigate to the `backend` folder and install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### 3. Run the Development Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The server will boot, initialize the SQLite database, seed baseline zones and devices, and start the live simulation engine.

* **API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## Default Demo Credentials

| Role | Username | Password | Privileges |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full access: thresholds, user creation, zone overrides, alerts |
| **Operator** | `operator` | `demo123` | Operational access: alert acknowledgments, manual overrides |
| **Viewer** | `viewer` | `demo123` | Read-only access: dashboards, heatmaps, cameras |

---

## API Endpoints Reference

### Authentication & Users
* `POST /api/auth/login` — Sign in with username & password, returns JWT token and role.
* `GET /api/users` — List active staff accounts (requires authenticated user).
* `POST /api/users` — Add a new user account (Admin only).
* `DELETE /api/users/{username}` — Remove a user account (Admin only).

### Zones & Density
* `GET /api/zones` — List all monitored zones with live counts, levels, sparklines, and active overrides.
* `GET /api/zones/{id}` — Get single zone details.
* `GET /api/zones/{id}/density?from=&to=` — Time-series occupancy points for threshold charts.
* `GET /api/zones/{id}/flow?window=5m` — Time-series entry, exit, and net flow data.
* `PUT /api/zones/{id}/override` — Apply manual status override and multilingual display message.
* `DELETE /api/zones/{id}/override` — Cancel manual override and revert to natural capacity level.
* `PUT /api/zones/{id}/thresholds` — Update warning (`yellow_pct`) and critical (`red_pct`) limits.

### Alerts
* `GET /api/alerts?status=open|ack|all` — List safety and surge alerts.
* `GET /api/alerts/{id}` — Get alert details.
* `POST /api/alerts/{id}/ack` — Acknowledge an alert.

### Devices
* `GET /api/devices` — Status of cameras, QR scanners, and gate displays.
* `POST /api/devices/{id}/heartbeat` — Ingest device telemetry (battery, signal, online status).

### Pilgrims & Kiosk
* `POST /api/pilgrims/register` — Register a pilgrim group (group size, gate, optional name); returns token ID and HMAC signature.
* `GET /api/pilgrims/{token}` — Look up token scan history (supports raw token or full QR payload `${token}.${sig}`).
* `POST /api/pilgrims/scan` — Record a single checkpoint scan.
* `POST /api/pilgrims/scans` — Batch offline scan sync for mobile scanner apps.
* `GET /api/checkpoints` — List known checkpoint locations.

### Cameras & Video Streaming
* `GET /api/cameras/{id}/stream` — Live multipart MJPEG video stream (`<img src="/api/cameras/1/stream">`).

### Reports
* `GET /api/reports` — List generated historical reports.
* `POST /api/reports/generate` — Generate a new Daily summary, Peak crowd, Alert log, or Flow report.
* `GET /api/reports/{id}/download?format=pdf|csv` — Download generated PDF or CSV file.
* `GET /api/flow/export?window=5m` — Direct CSV download of flow telemetry.

### Computer Vision Edge Ingestion
* `POST /api/cv/telemetry` — Ingest edge CV detections (`count`, `entries_delta`, `exits_delta`, `fps`); triggers automatic alerts if thresholds are breached and broadcasts live via WebSockets.

---

## WebSocket Live Protocol (`/ws/live`)

Clients connect to `ws://localhost:8000/ws/live`. Upon connection, the backend immediately pushes initial states for all zones and devices, followed by real-time events.

### Message Formats

#### 1. Density Update
```json
{
  "type": "density",
  "zone_id": 3,
  "count": 412,
  "level": "red",
  "ts": "2026-11-06T16:30:00.000Z"
}
```

#### 2. Flow Update
```json
{
  "type": "flow",
  "zone_id": 3,
  "net": 42,
  "window": "5m",
  "ts": "2026-11-06T16:30:00.000Z"
}
```

#### 3. Surge Alert
```json
{
  "type": "alert",
  "id": 92,
  "zone_id": 3,
  "level": "red",
  "msg": "Surge in Sanctum Corridor: density reached 92% capacity.",
  "ts": "2026-11-06T16:30:00.000Z"
}
```

#### 4. Device Status
```json
{
  "type": "device",
  "id": 7,
  "status": "offline",
  "ts": "2026-11-06T16:30:00.000Z"
}
```

---

## Running the Automated Test Suite

The test suite covers authentication, zone thresholds, overrides, alerts, pilgrim token issuance/lookup, devices, reports (PDF & CSV), and live WebSocket streaming:

```bash
python -m pytest backend/tests -v
```

All 20 test cases run against an isolated SQLite test database with zero side effects.

---

## Docker Deployment

To build and run the backend container standalone:
```bash
docker build -t crowdsetu-backend ./backend
docker run -p 8000:8000 crowdsetu-backend
```

Or run the full stack (FastAPI backend + React frontend) via root Docker Compose:
```bash
docker compose up --build
```
This serves the frontend at [http://localhost](http://localhost) and the API at [http://localhost:8000](http://localhost:8000).

