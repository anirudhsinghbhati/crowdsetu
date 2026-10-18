import type {
  Zone,
  ZoneDensityPoint,
  ZoneFlowPoint,
  Alert,
  Device,
  PilgrimToken,
  LiveMessage,
  User,
  AuthResponse,
} from './types';

// Initial realistic zones
const mockZones: Zone[] = [
  {
    id: 1,
    name: 'Main Gate',
    capacity: 600,
    count: 280,
    level: 'green',
    yellow_pct: 70,
    red_pct: 90,
    net_flow: 18,
    sparkline: [210, 230, 250, 265, 275, 280],
    override: null,
  },
  {
    id: 2,
    name: 'Ghat Approach',
    capacity: 500,
    count: 360,
    level: 'yellow',
    yellow_pct: 70,
    red_pct: 90,
    net_flow: 24,
    sparkline: [280, 310, 325, 340, 355, 360],
    override: null,
  },
  {
    id: 3,
    name: 'Sanctum Corridor',
    capacity: 450,
    count: 412,
    level: 'red',
    yellow_pct: 75,
    red_pct: 90,
    net_flow: 42,
    sparkline: [290, 330, 370, 395, 405, 412],
    override: null,
  },
  {
    id: 4,
    name: 'Exit Lane',
    capacity: 400,
    count: 110,
    level: 'green',
    yellow_pct: 70,
    red_pct: 85,
    net_flow: -32,
    sparkline: [140, 135, 125, 120, 115, 110],
    override: null,
  },
];

// Initial realistic alerts
let mockAlerts: Alert[] = [
  {
    id: 91,
    zone_id: 3,
    zone_name: 'Sanctum Corridor',
    level: 'red',
    msg: 'Capacity threshold breached: 412 / 450 people (91.5%). High surge detected.',
    status: 'open',
    ts: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 90,
    zone_id: 2,
    zone_name: 'Ghat Approach',
    level: 'yellow',
    msg: 'Density approaching 72% capacity. Queue buildup at barricade 4.',
    status: 'open',
    ts: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    id: 89,
    zone_id: 1,
    zone_name: 'Main Gate',
    level: 'yellow',
    msg: 'Entry flow spike (+65 people/5m) during evening aarti arrival.',
    status: 'ack',
    ts: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
  },
  {
    id: 88,
    zone_id: 3,
    zone_name: 'Sanctum Corridor',
    level: 'red',
    msg: 'Brief bottleneck cleared near sanctum sanctorum entry point.',
    status: 'ack',
    ts: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
  },
];

// Initial realistic devices
const mockDevices: Device[] = [
  { id: 1, name: 'CAM-MG-01', type: 'camera', zone_id: 1, zone_name: 'Main Gate', status: 'online', last_seen: 'Just now', signal: 95 },
  { id: 2, name: 'CAM-MG-02', type: 'camera', zone_id: 1, zone_name: 'Main Gate', status: 'online', last_seen: 'Just now', signal: 92 },
  { id: 3, name: 'CAM-GA-01', type: 'camera', zone_id: 2, zone_name: 'Ghat Approach', status: 'online', last_seen: 'Just now', signal: 88 },
  { id: 4, name: 'CAM-GA-02', type: 'camera', zone_id: 2, zone_name: 'Ghat Approach', status: 'degraded', last_seen: '45s ago', signal: 45 },
  { id: 5, name: 'CAM-SC-01', type: 'camera', zone_id: 3, zone_name: 'Sanctum Corridor', status: 'online', last_seen: 'Just now', signal: 98 },
  { id: 6, name: 'CAM-EL-01', type: 'camera', zone_id: 4, zone_name: 'Exit Lane', status: 'online', last_seen: 'Just now', signal: 91 },
  { id: 7, name: 'CAM-EL-02', type: 'camera', zone_id: 4, zone_name: 'Exit Lane', status: 'offline', last_seen: '12 min ago', signal: 0 },
  { id: 8, name: 'SCAN-GATE-1', type: 'scanner', zone_id: 1, zone_name: 'Main Gate', status: 'online', last_seen: 'Just now', battery: 84 },
  { id: 9, name: 'SCAN-SANCTUM', type: 'scanner', zone_id: 3, zone_name: 'Sanctum Corridor', status: 'online', last_seen: 'Just now', battery: 67 },
  { id: 10, name: 'DISP-GATE-1', type: 'display', zone_id: 1, zone_name: 'Main Gate', status: 'online', last_seen: 'Just now', signal: 99 },
];

// Initial pilgrim tokens
const mockTokens: Map<string, PilgrimToken> = new Map([
  [
    'TK-7842',
    {
      token: 'TK-7842',
      sig: '8f9c1a7d',
      group_size: 4,
      gate: 'Gate 1 (Main Gate)',
      name: 'Sharma Family',
      issued_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      scans: [
        { checkpoint: 'Main Gate Scanner A', direction: 'IN', ts: new Date(Date.now() - 32 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { checkpoint: 'Ghat Barricade Scanner', direction: 'IN', ts: new Date(Date.now() - 18 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { checkpoint: 'Sanctum Security Check', direction: 'IN', ts: new Date(Date.now() - 4 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ],
    },
  ],
]);

// Mock Users
export const mockUsersList: User[] = [
  { username: 'admin', role: 'admin', name: 'Duty Officer (Chief Admin)', lastLogin: 'Today, 10:45 AM' },
  { username: 'operator', role: 'operator', name: 'Shift Control Operator', lastLogin: 'Today, 08:30 AM' },
  { username: 'viewer', role: 'viewer', name: 'Guest Observer', lastLogin: 'Yesterday, 04:15 PM' },
];

// Live WebSocket listeners subscriber list
type LiveListener = (msg: LiveMessage) => void;
const listeners = new Set<LiveListener>();

export const subscribeMockLive = (callback: LiveListener) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

const broadcastLive = (msg: LiveMessage) => {
  listeners.forEach((fn) => fn(msg));
};

// Periodic live simulator (~1.5s interval)
let liveSimulationTimer: number | null = null;

export const startMockLiveStream = () => {
  if (typeof window === 'undefined' || liveSimulationTimer !== null) return;

  liveSimulationTimer = window.setInterval(() => {
    if (listeners.size === 0) return;

    // Pick random zone
    const zoneIndex = Math.floor(Math.random() * mockZones.length);
    const zone = mockZones[zoneIndex];
    if (!zone) return;

    // Slight count variation: -3 to +4
    const delta = Math.floor(Math.random() * 8) - 3;
    const newCount = Math.max(20, Math.min(zone.capacity + 20, zone.count + delta));
    zone.count = newCount;

    // Determine status level based on thresholds
    const pct = (newCount / zone.capacity) * 100;
    let newLevel: 'green' | 'yellow' | 'red' = 'green';
    if (pct >= (zone.red_pct || 90)) {
      newLevel = 'red';
    } else if (pct >= (zone.yellow_pct || 70)) {
      newLevel = 'yellow';
    }
    zone.level = zone.override ? zone.override.level : newLevel;

    // Update sparkline
    if (zone.sparkline) {
      zone.sparkline = [...zone.sparkline.slice(1), newCount];
    }

    // Broadcast density update
    broadcastLive({
      type: 'density',
      zone_id: zone.id,
      count: newCount,
      level: zone.level,
      ts: new Date().toISOString(),
    });

    // Occasionally broadcast net flow (~30% chance)
    if (Math.random() < 0.35) {
      const net = Math.floor(Math.random() * 30) - 10;
      zone.net_flow = net;
      broadcastLive({
        type: 'flow',
        zone_id: zone.id,
        net,
        window: '5m',
      });
    }

    // Rare chance of new alert if red zone (~8% chance)
    if (newLevel === 'red' && Math.random() < 0.08) {
      const newAlertId = Math.floor(Date.now() / 1000) % 10000;
      const newAlert: Alert = {
        id: newAlertId,
        zone_id: zone.id,
        zone_name: zone.name,
        level: 'red',
        msg: `Surge in ${zone.name}: density reached ${Math.round(pct)}% capacity.`,
        status: 'open',
        ts: new Date().toISOString(),
      };
      mockAlerts = [newAlert, ...mockAlerts];
      broadcastLive({
        type: 'alert',
        id: newAlert.id,
        zone_id: zone.id,
        level: 'red',
        msg: newAlert.msg,
        ts: newAlert.ts,
      });
    }

    // Rare device status jitter (~5% chance)
    if (Math.random() < 0.05) {
      const devIndex = Math.floor(Math.random() * mockDevices.length);
      const dev = mockDevices[devIndex];
      if (dev && dev.id === 7) {
        dev.status = dev.status === 'offline' ? 'online' : 'offline';
        dev.last_seen = dev.status === 'online' ? 'Just now' : '10s ago';
        broadcastLive({
          type: 'device',
          id: dev.id,
          status: dev.status,
        });
      }
    }
  }, 1500);
};

export const stopMockLiveStream = () => {
  if (liveSimulationTimer !== null) {
    clearInterval(liveSimulationTimer);
    liveSimulationTimer = null;
  }
};

// MOCK REST API IMPLEMENTATION
export const mockApi = {
  // POST /auth/login
  login: async (credentials: { username: string; password?: string }): Promise<AuthResponse> => {
    await new Promise((r) => setTimeout(r, 200));
    const user = mockUsersList.find((u) => u.username.toLowerCase() === credentials.username.toLowerCase());
    if (!user) {
      throw new Error('Wrong username or password');
    }
    return {
      token: `mock-jwt-token-for-${user.username}`,
      role: user.role,
      username: user.username,
    };
  },

  // GET /zones
  getZones: async (): Promise<Zone[]> => {
    await new Promise((r) => setTimeout(r, 150));
    return JSON.parse(JSON.stringify(mockZones));
  },

  // GET /zones/{id}/density?from&to
  getZoneDensity: async (zoneId: number, _from?: string, _to?: string): Promise<ZoneDensityPoint[]> => {
    await new Promise((r) => setTimeout(r, 150));
    const zone = mockZones.find((z) => z.id === zoneId) || mockZones[0];
    const points: ZoneDensityPoint[] = [];
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
      const base = zone.capacity * 0.55;
      const wave = Math.sin(i / 3) * (zone.capacity * 0.3);
      const noise = (Math.random() - 0.5) * 30;
      const count = Math.round(Math.max(20, Math.min(zone.capacity + 25, base + wave + noise)));
      const pct = (count / zone.capacity) * 100;
      const level = pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green';
      points.push({ ts, count, level });
    }
    return points;
  },

  // GET /zones/{id}/flow?window=5m
  getZoneFlow: async (_zoneId: number, _window: string = '5m'): Promise<ZoneFlowPoint[]> => {
    await new Promise((r) => setTimeout(r, 150));
    const points: ZoneFlowPoint[] = [];
    const now = Date.now();
    for (let i = 12; i >= 0; i--) {
      const ts = new Date(now - i * 5 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const entries = Math.floor(Math.random() * 45) + 30;
      const exits = Math.floor(Math.random() * 40) + 20;
      points.push({
        ts,
        entries,
        exits,
        net: entries - exits,
      });
    }
    return points;
  },

  // GET /alerts?status=open|ack|all
  getAlerts: async (status: 'open' | 'ack' | 'all' = 'all'): Promise<Alert[]> => {
    await new Promise((r) => setTimeout(r, 150));
    if (status === 'open') return mockAlerts.filter((a) => a.status === 'open');
    if (status === 'ack') return mockAlerts.filter((a) => a.status === 'ack');
    return mockAlerts;
  },

  // POST /alerts/{id}/ack
  acknowledgeAlert: async (id: number): Promise<Alert> => {
    await new Promise((r) => setTimeout(r, 150));
    const alert = mockAlerts.find((a) => a.id === id);
    if (!alert) throw new Error('Alert not found');
    alert.status = 'ack';
    return alert;
  },

  // PUT /zones/{id}/override
  overrideZone: async (
    zoneId: number,
    data: { level: 'green' | 'yellow' | 'red'; message: { en: string; hi: string; gu: string }; duration_min: number }
  ): Promise<Zone> => {
    await new Promise((r) => setTimeout(r, 150));
    const zone = mockZones.find((z) => z.id === zoneId);
    if (!zone) throw new Error('Zone not found');
    zone.override = {
      level: data.level,
      message: data.message,
      duration_min: data.duration_min,
      applied_at: new Date().toISOString(),
    };
    zone.level = data.level;
    broadcastLive({
      type: 'density',
      zone_id: zone.id,
      count: zone.count,
      level: data.level,
      ts: new Date().toISOString(),
    });
    return zone;
  },

  // DELETE /zones/{id}/override
  cancelZoneOverride: async (zoneId: number): Promise<Zone> => {
    await new Promise((r) => setTimeout(r, 150));
    const zone = mockZones.find((z) => z.id === zoneId);
    if (!zone) throw new Error('Zone not found');
    zone.override = null;
    return zone;
  },

  // PUT /zones/{id}/thresholds {yellow_pct, red_pct}
  updateZoneThresholds: async (zoneId: number, yellowPct: number, redPct: number): Promise<Zone> => {
    await new Promise((r) => setTimeout(r, 150));
    const zone = mockZones.find((z) => z.id === zoneId);
    if (!zone) throw new Error('Zone not found');
    zone.yellow_pct = yellowPct;
    zone.red_pct = redPct;
    return zone;
  },

  // GET /devices
  getDevices: async (): Promise<Device[]> => {
    await new Promise((r) => setTimeout(r, 150));
    return JSON.parse(JSON.stringify(mockDevices));
  },

  // POST /pilgrims/register {group_size, gate, name?} -> {token, sig, issued_at}
  registerPilgrim: async (data: { group_size: number; gate: string; name?: string }): Promise<PilgrimToken> => {
    await new Promise((r) => setTimeout(r, 200));
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const token = `TK-${randomHex}`;
    const sig = Math.random().toString(16).substring(2, 10);
    const newEntry: PilgrimToken = {
      token,
      sig,
      group_size: data.group_size,
      gate: data.gate,
      name: data.name,
      issued_at: new Date().toISOString(),
      scans: [],
    };
    mockTokens.set(token, newEntry);
    return newEntry;
  },

  // GET /pilgrims/{token}
  getPilgrimToken: async (token: string): Promise<PilgrimToken> => {
    await new Promise((r) => setTimeout(r, 200));
    const item = mockTokens.get(token.trim().toUpperCase());
    if (!item) {
      throw new Error('Token not found. Check the ID or scan again.');
    }
    return item;
  },
};
