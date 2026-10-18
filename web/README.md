# CrowdSetu — Web Frontend

CrowdSetu is a real-time crowd monitoring and management system designed for pilgrimage sites in India (e.g., Somnath, Kedarnath). This package contains the complete frontend web application encompassing:

1. **Admin Control-Room Panel** (`/dashboard`, `/heatmap`, `/cameras`, `/zones/:id`, `/alerts`, `/flow`, `/devices`, `/override`, `/settings`, `/reports`)
2. **Public Gate Signage Display** (`/display/:gateId`)
3. **Registration Kiosk Terminal** (`/kiosk/register`, `/kiosk/token/:id`, `/kiosk/lookup`)

---

## Tech Stack

* **Framework**: React 18 + TypeScript + Vite
* **Styling**: Tailwind CSS with customized dark theme tokens and strict 8px grid
* **Data Fetching**: TanStack Query v5 (REST baseline)
* **Live State**: Zustand (Real-time WebSocket sync with REST-to-live merge)
* **Charts**: Recharts (density thresholds line chart, entries vs exits area chart, net flow bar chart)
* **QR Codes**: `qrcode.react` (58mm thermal slip generation)
* **Icons**: Custom inline SVG design system (zero conflicting icon library dependencies)
* **Typography**: Noto Sans (Latin, Devanagari, Gujarati) with tabular numerals

---

## Design Tokens

Defined in `tailwind.config.js`:
* **Background**: `#14181F`
* **Panels**: `#1D232D` (radius 10px)
* **Borders**: `#2B3340`
* **Text**: `#E8E6DF` (primary), `#98A0AE` (muted)
* **Accent Saffron**: `#E8962E`
* **Status Colors**:
  * Green: `#2FA866` (Normal / Open)
  * Yellow: `#E5B91F` (Moderate / Busy)
  * Red: `#D93C3C` (Critical / Surge / Full)
  * Grey: `#7A8190` (Offline / Degraded / Safe Mode)

---

## Getting Started

### Prerequisites
* Node.js 20 or higher
* npm 10 or higher

### Installation & Local Development

1. Navigate to the `web` directory:
   ```bash
   cd web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Mock Mode vs. Real Mode

The application includes an in-memory simulation engine that emits live WebSocket events every ~1.5s, simulating random density variations, surge alerts, and device telemetry.

### Toggling Modes
Control this via the `.env` file or environment variables:

* **Mock Mode (Default)**:
  ```env
  VITE_USE_MOCK=true
  ```
  Runs completely offline with zero backend needed. Every page, chart, and alert updates in real-time.

* **Real Mode**:
  ```env
  VITE_USE_MOCK=false
  ```
  Vite proxies all `/api` requests to `http://localhost:8000` and all `/ws` connections to `ws://localhost:8000`.

---

## Demo Accounts

For rapid evaluation on `/login`:

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full access: all monitoring, alerts, overrides, and `/settings` (thresholds, zones, users). |
| **Operator** | `operator` | `demo123` | Operational access: monitoring, alerts acknowledge, and manual override. `/settings` restricted. |
| **Viewer** | `viewer` | `demo123` | Read-only access: view dashboards, heatmaps, cameras, and reports. Actions disabled. |

---

## Route Map

### 1. Admin Control Room (Sidebar Layout)
* `/login` — Sign in with quiet site map outline and quick demo credentials.
* `/dashboard` — 4 summary tiles, zone cards with live counts and sparklines, live alert ticker.
* `/heatmap` — Schematic SVG site map with Density, Flow, and Combined view modes.
* `/cameras` — 2x2 and 3x3 grid of simulated perspective feeds with count overlays and offline retry state.
* `/zones/:id` — Density chart with yellow/red threshold reference lines, 5m net flow bar chart, and saved clips.
* `/alerts` — Open, Acknowledged, and All tabs; newest alert highlighted with red border; slide-out event drawer.
* `/flow` — Entries vs exits area chart, per-zone table, and CSV telemetry export.
* `/devices` — Online/Offline/Degraded status indicators and technical device inspector.
* `/override` — Zone status override with multi-language inputs (EN, HI, GU), gate display preview, and confirmation dialog.
* `/settings` — Interactive yellow/red threshold sliders with live preview bar, zone limits, and user management.
* `/reports` — Audit report generator with preview card, PDF/CSV format selection, and download history.

### 2. Public Gate Display
* `/display/:gateId` — 1920x1080 full-screen signage; Green, Yellow, Red (with alternate route), and Grey states; 120px+ multilingual stacked text (English, Hindi, Gujarati).
* **Safety Watchdog Rule**: Automatically falls back to GREY `#7A8190` if no live message is received within 10 seconds or connection is lost.

### 3. Registration Kiosk
* `/kiosk/register` — Tablet-optimized touch UI (min 56px targets), group size stepper, gate assignment, EN/HI/GU toggle.
* `/kiosk/token/:id` — 58mm thermal printable slip with QR code (`${token}.${sig}`). Uses `@media print` CSS so only the slip prints.
* `/kiosk/lookup` — Monospace token search with simulated scanner trigger and checkpoint scan timeline.

---

## Production Build & Docker

### Local Production Build & Lint
```bash
npm run lint
npm run build
npm run preview
```

### Docker Deployment
Build and run the production image using the multi-stage Dockerfile and Nginx configuration:
```bash
docker build -t crowdsetu-web .
docker run -p 80:80 crowdsetu-web
```
Open [http://localhost](http://localhost) to view the deployed application.
