

# ROLE
You are a senior frontend engineer. Build the complete FRONTEND ONLY of
a final-year B.Tech project called "CrowdSetu". Do not build any backend,
CV model or Android app. Everything that is not frontend is replaced by
a mock layer that I can switch off later.

# PROJECT
CrowdSetu is a real-time crowd monitoring and management system for
pilgrimage sites in India. Cameras feed a computer-vision service that
counts people per zone. A backend (FastAPI) computes density levels
(green / yellow / red), flow (entries minus exits) and alerts, and
pushes them live. This frontend is what humans use:
1. Admin control-room panel (staff monitor and act).
2. Public gate display (pilgrims at gates see colour + message).
3. Registration kiosk (staff register groups and print QR slips).
The Android checkpoint-scanner app is a separate project. Ignore it.

# TECH STACK (fixed, do not change)
React 18 + TypeScript + Vite, Tailwind CSS, React Router v6,
TanStack Query (REST data), Zustand (live state), Recharts (charts),
qrcode.react (QR). No Redux, no UI kit that fights Tailwind.
Node 20. ESLint + Prettier.

# DESIGN SOURCE
The Figma frames are the source of truth for layout, spacing, colors,
typography, components and states. Match them closely.
Design tokens (put in tailwind.config.js and use only these):
- bg #14181F, panel #1D232D, border #2B3340, text #E8E6DF,
  muted #98A0AE, accent #E8962E
- status: green #2FA866, yellow #E5B91F, red #D93C3C, grey #7A8190
- font Noto Sans (supports Hindi and Gujarati), radius 6px controls,
  10px panels, 8px spacing grid, no gradients
- Status is never conveyed by colour alone: always add a label or icon.
- Sentence case. Buttons use plain verbs. Errors say what happened and
  how to fix it.
Build shared components first: Button, Input, Select, Chip (status),
Card, Table, Tabs, Modal/ConfirmDialog, Drawer, Toast, Skeleton,
EmptyState, ErrorState, Sidebar, Topbar, StatusDot, Sparkline.
Every page must have loading, empty, error and offline states.

# PAGES AND ROUTES
Admin (login required, sidebar layout):
- /login            Sign in
- /dashboard        4 summary tiles, zone cards (count, status chip,
                    net flow, sparkline), live alert ticker
- /heatmap          SVG site map, zones filled by status, toggle
                    Density | Flow | Combined, selected-zone panel, legend
- /cameras          2x2 / 3x3 grid of MJPEG feeds with live count overlay,
                    offline tile state, expand view
- /zones/:id        density line chart with yellow/red threshold lines,
                    net flow bar chart, range selector (1h, 6h, 24h,
                    custom), recent alerts, saved clip thumbnails
- /alerts           tabs Open | Acknowledged | All, filters, table,
                    Acknowledge action, side drawer with detail
- /flow             entries vs exits chart, per-zone table, Export CSV
- /devices          online/offline/degraded counts, device table
- /override         per-zone manual status + multilingual message,
                    preview of gate display, confirm dialog, cancel override
- /settings         tabs Thresholds | Zones | Users, sticky save bar
- /reports          choose type/range/zones/format, generate, history
Public (no login, no sidebar, full screen):
- /display/:gateId  1920x1080 states GREEN "Open. Please proceed",
                    YELLOW "Busy. Move slowly", RED "Full. Use alternate
                    route" (+ arrow and path name), GREY "Follow staff
                    instructions". Message in English, Hindi, Gujarati.
                    SAFETY RULE: if no live message for 10 seconds, or
                    the connection is down, show GREY. Never show a
                    stale green.
Kiosk (staff login, large touch targets 56px+, tablet 1024x768):
- /kiosk/register   group size stepper, entry gate buttons, optional
                    name, "Issue QR", language switch EN/HI/GU,
                    note "No ID is stored."
- /kiosk/token/:id  58mm printable slip (site name, QR, token ID,
                    group size, gate, time). Use @media print CSS so only
                    the slip prints. Print-failure state.
- /kiosk/lookup     search by token ID, result card with scan timeline,
                    not-found state

# DATA CONTRACT (build against this exactly)
REST (base path /api, JWT in Authorization: Bearer header; on 401 clear
token and go to /login):
POST /auth/login {username,password} -> {token, role}
GET  /zones -> [{id,name,capacity,level,count}]
GET  /zones/{id}/density?from&to -> [{ts,count,level}]
GET  /zones/{id}/flow?window=5m -> [{ts,entries,exits,net}]
GET  /alerts?status=open|ack|all -> [{id,zone_id,level,msg,status,ts}]
POST /alerts/{id}/ack
PUT  /zones/{id}/override {level,message:{en,hi,gu},duration_min}
DELETE /zones/{id}/override
PUT  /zones/{id}/thresholds {yellow_pct,red_pct}
GET  /devices -> [{id,name,type,zone_id,status,last_seen}]
POST /pilgrims/register {group_size,gate,name?} -> {token,sig,issued_at}
GET  /pilgrims/{token} -> {token,group_size,gate,issued_at,scans:[...]}
GET  /cameras/{id}/stream -> MJPEG (use <img src>)
WebSocket /ws/live, JSON messages:
{"type":"density","zone_id":3,"count":412,"level":"red","ts":"..."}
{"type":"flow","zone_id":3,"net":85,"window":"5m"}
{"type":"alert","id":91,"zone_id":3,"level":"red","msg":"...","ts":"..."}
{"type":"device","id":7,"status":"offline"}
QR content = `${token}.${sig}`. No personal data inside the QR.

# ARCHITECTURE RULES
- Single `api()` client in src/api/client.ts. All requests go through it.
- Mock layer in src/api/mock.ts, toggled by VITE_USE_MOCK=true. It must
  return realistic data for every endpoint above, and fake live WebSocket
  messages every ~1.5 s (including occasional red zones, alerts, a device
  going offline). The app must be fully demoable with mocks and no backend.
- Real mode: Vite dev proxy /api -> http://localhost:8000 and
  /ws -> ws://localhost:8000. Write nginx.conf for production with the
  same proxying.
- Live hook useLive(): auto-reconnect every 2 s, exposes connected state,
  writes to a Zustand store. REST data from TanStack Query, live data
  from Zustand; live value overrides REST value in the UI.
- Show a global "Disconnected, retrying" indicator in the Topbar.
- TS types in src/api/types.ts (hand-written now; script `npm run types`
  regenerates from FastAPI OpenAPI later).
- Role-based UI: Admin (everything), Operator (no Settings/Users),
  Viewer (read only: hide Acknowledge, Override, Save buttons).
- Responsive: admin works from 1280px up; kiosk on tablet; display scales
  to any 16:9 screen with viewport units.
- Accessibility: keyboard focus visible, labels on inputs, aria-live for
  new alerts, contrast AA, prefers-reduced-motion respected.
- Languages: English default; Hindi and Gujarati strings for the display
  and kiosk via a simple i18n dictionary (no heavy library needed).
- No localStorage for anything but the JWT. No secrets in code.

# FOLDER STRUCTURE
web/
  src/
    api/ (client.ts, mock.ts, types.ts)
    components/ui/ (shared components)
    components/ (ZoneCard, AlertTicker, SiteMap, CameraTile, ...)
    hooks/ (useLive.ts, useAuth.ts, useZones.ts, ...)
    store/ (live.ts, auth.ts)
    pages/ (one file or folder per route above)
    layouts/ (AdminLayout, KioskLayout, DisplayLayout)
    i18n/ (en.ts, hi.ts, gu.ts)
    styles/
  tailwind.config.js, vite.config.ts, nginx.conf, Dockerfile, README.md

# HOW TO WORK
1. First reply with a short plan: component list, route map, and any
   questions about the Figma. Wait for my "go".
2. Then build in this order, committing after each step:
   a) project setup + design tokens + shared components
   b) auth, layouts, routing, api client, mock layer, useLive
   c) Dashboard, Alerts, Display (core demo path)
   d) Heatmap, Zone detail, Cameras, Flow
   e) Devices, Override, Settings, Reports
   f) Kiosk pages + print slip
   g) polish: states, a11y, responsive, i18n, README, Dockerfile
3. After each step, run `npm run build` and `npm run lint`; fix errors
   before continuing. Do not leave TODOs or placeholder lorem ipsum.
4. Do not add features, pages or libraries I did not list. Ask first.
5. Keep files small and typed. No `any` unless commented why.

# DEFINITION OF DONE
- `npm install && npm run dev` with VITE_USE_MOCK=true shows every page
  working with live-updating fake data.
- Switching VITE_USE_MOCK=false works against the contract above with
  no code changes except env.
- /display/:gateId turns grey after 10 s without messages.
- Kiosk slip prints only the slip.
- Matches the Figma frames, build and lint pass, README explains run,
  env vars, routes and how to swap mock for real backend.

  figma public link : https://www.figma.com/design/JS2q28lfVeDjX5taejsfgm/Untitled?node-id=0-1&t=1WrIEpU7EImzwuTc-1

  Paste the **Global prompt** first in every tool session (Figma Make, Google Stitch, v0, Lovable, etc.), then paste one page prompt at a time.

---

## Global prompt (paste first)

```
You are designing UI for "CrowdSetu", a real-time crowd monitoring and
management system for pilgrimage sites in India. Users: control-room
staff (admin panel), pilgrims at gates (public display), registration
desk staff (kiosk), and security staff with phones (Android app).

Design system:
- Colors: background #14181F, panel #1D232D, border #2B3340, text
  #E8E6DF, muted text #98A0AE, accent saffron #E8962E.
  Status colors (only for crowd level): green #2FA866, yellow #E5B91F,
  red #D93C3C, offline grey #7A8190.
- Font: Noto Sans (supports Hindi and Gujarati). Scale: 12/14/16/20/28/48.
  Numbers use tabular figures.
- Radius 6px on controls, 10px on panels. No gradients, no heavy shadows.
- Status is never shown by color alone: always add a label or icon.
- Sentence case everywhere. Buttons use plain verbs ("Acknowledge",
  "Issue QR"). Errors say what happened and how to fix it.
- Admin: desktop 1440px, dark, dense but readable, left sidebar nav
  (Dashboard, Heatmap, Cameras, Alerts, Flow, Devices, Override,
  Settings, Reports). Top bar shows site name, live connection status
  and logged-in user.
- Include hover, focus, empty, loading and error states.
- Use realistic placeholder data (zones: Main Gate, Ghat Approach,
  Sanctum Corridor, Exit Lane).
Output clean, componentized frames with consistent spacing (8px grid).
```

---

## Admin panel

**1. Login**
```
Login page, 1440px, dark. Centered 360px card: app name "CrowdSetu",
subtitle "Control room sign in", username, password with show/hide,
"Sign in" button (saffron), inline error state "Wrong username or
password". No signup link. Left side: a quiet site map outline.
```

**2. Dashboard**
```
Dashboard. Top row: 4 summary tiles (total people on site, zones in
red, open alerts, devices offline). Below: grid of zone cards. Each
card has zone name, big live count, status chip (green/yellow/red with
label), net flow arrow with number, tiny 30-minute sparkline. Right
column: live alert ticker (newest first, zone, message, time ago).
Show the red card with a subtle border highlight.
```

**3. Site heatmap**
```
Heatmap page. Large schematic site map (SVG style, zones as shapes
filled with status color at 70% opacity, zone name and count inside).
Top-right segmented toggle: Density | Flow | Combined. In Flow mode,
show arrows on paths with net numbers. Right panel: selected zone
details (count, capacity %, trend, flow, "Open zone" button). Bottom
legend: Green, Yellow, Red, Offline with thresholds.
```

**4. Cameras**
```
Camera grid page. Layout toggle 2x2 / 3x3. Each tile: video feed
placeholder, camera name, a small overlay chip with live count and
status color, bottom-left "Live" dot, top-right "Expand" icon. Show
one tile in "Camera offline" state (grey, last seen time, "Retry").
Expanded state: one big feed with density overlay and zone side panel.
```

**5. Zone detail**
```
Zone detail page for "Sanctum Corridor". Header: name, status chip,
count, capacity. Two charts: density over time (line with threshold
lines yellow and red) and net flow per 5 minutes (bars, positive and
negative). Time range selector (1h, 6h, 24h, custom). Below: table of
recent alerts and a row of saved clip thumbnails with timestamps.
```

**6. Alerts**
```
Alerts page. Tabs: Open | Acknowledged | All. Filters: zone, level,
date range. Table columns: time, zone, level chip, message, status,
action ("Acknowledge"). Newest open alert at the top with a red left
border. Row click opens a side drawer with density graph around the
event and a saved clip. Empty state: "No open alerts. All zones are
within limits."
```

**7. Flow**
```
Flow page. Selector: zone and window (5m, 15m, 1h). Main chart: entries
vs exits as two lines, with net as a shaded area. Table below: per
zone entries, exits, net, peak time. Top-right "Export CSV" button.
```

**8. Devices**
```
Devices page. Summary row: online, offline, degraded counts. Table:
device name, type (camera / QR scanner / display), zone, status dot
with label, last seen, battery or signal if applicable. Offline rows
highlighted. Row action: "View details". Empty state for no devices.
```

**9. Override**
```
Manual override page. Left: zone list. Right form for selected zone:
current status, "Set status" segmented (Green, Yellow, Red), custom
message in English/Hindi/Gujarati inputs, duration dropdown (15 min,
1 h, until cancelled), a "Preview on gate display" mini preview, and a
red-bordered "Apply override" button with a confirmation dialog.
Show an active-override banner with "Cancel override".
```

**10. Settings**
```
Settings page with tabs: Thresholds, Zones, Users. Thresholds: per-zone
rows with capacity, yellow at % and red at % using sliders plus number
inputs, and a live preview bar. Users tab: table with role (Admin,
Operator, Viewer), last login, "Add user" button. Sticky "Save changes"
bar appearing when edits exist.
```

**11. Reports**
```
Reports page. Choose report type (Daily summary, Peak crowd, Alert
log, Flow), date range, zones multi-select, format (CSV, PDF). Right:
preview card with a small chart and key numbers. Button "Generate
report". Below: history table of generated reports with "Download".
```

---

## Public gate display

**12-15. Display states (1920x1080, one frame each)**
```
Full-screen gate display, no navigation, no small text. Solid background
for the state, huge message centered (min 120px), readable from 15
meters. States:
GREEN #2FA866: "Open. Please proceed" with a large check icon.
YELLOW #E5B91F: "Busy. Move slowly" with a slow-down icon.
RED #D93C3C: "Full. Use alternate route" with a big arrow toward the
alternate path and the path name.
GREY #7A8190: "Follow staff instructions" with a staff icon.
Show the message in English, Hindi and Gujarati stacked, English
largest. Use dark text on yellow, white text on others. Tiny clock
bottom-right only.
```

---

## Registration kiosk (tablet 1024x768, light or dark, large touch targets)

**16. Register**
```
Kiosk registration screen. Large touch targets (min 56px). Fields:
group size (stepper with big + and -), entry gate (large buttons),
optional name. One primary button "Issue QR". Language switch top
right (EN, हिंदी, ગુજરાતી). Short privacy note: "No ID is stored."
```

**17. QR slip**
```
Printable slip, 58mm thermal receipt width. Contains: site name, large
QR code, token ID in monospace, group size, gate, issue time, and
"Show this at checkpoints". On screen: slip preview with "Print slip"
and "New registration" buttons, plus print-failure error state.
```

**18. Lookup**
```
Lookup screen. Big search field (token ID) with "Scan QR" button.
Result card: token, group size, gate, issue time, timeline of
checkpoint scans (checkpoint, IN/OUT, time). Not-found state: "Token
not found. Check the ID or scan again."
```

---

## Android app (360x800, dark)

**19. Login**
```
Mobile login, dark. App name, username, password, "Sign in" button
full width, offline-capable note "Works without internet after first
sign in".
```

**20. Pick checkpoint**
```
Mobile screen. Title "Select checkpoint". List of checkpoints with
name and zone. Below: large IN | OUT segmented toggle. Bottom button
"Start scanning". Remember last choice.
```

**21. Scan**
```
Mobile scan screen. Full-screen camera preview with a square QR frame.
Top bar: checkpoint name and direction chip (IN green, OUT blue) and a
flashlight toggle. Bottom sheet: last scan result (token, time), and a
banner "12 scans pending sync" with a sync icon. States: success (green
flash and tick), duplicate scan (yellow, "Already scanned"), invalid QR
(red, "Not a CrowdSetu code"), offline (grey cloud-off icon in top bar).
```

**22. Sync status**
```
Mobile screen. Big status: "All synced" or "12 pending". Last sync
time, button "Sync now", and a list of pending scans (token, time,
status). Error state: "No connection. Scans are saved and will sync
automatically."
```

---

## Tips

- Generate **Global prompt → Dashboard → Heatmap** first. Reuse the output as the reference for the rest ("use the same design system as the previous frames").
- If a tool drifts from the style, add: "Keep the same colors, font and components as the Dashboard frame."
- Export frames to Figma, then build components in React. Tailwind color names: map the hex values above into `tailwind.config.js`.

I can write the Tailwind theme file with these exact colors, or turn this into a Markdown file you can download.