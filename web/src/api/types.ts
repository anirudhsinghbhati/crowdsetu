// TypeScript definitions for CrowdSetu REST and WebSocket data contracts

export type StatusLevel = 'green' | 'yellow' | 'red' | 'grey';
export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  username: string;
  role: UserRole;
  name?: string;
  lastLogin?: string;
}

export interface AuthResponse {
  token: string;
  role: UserRole;
  username: string;
}

export interface Zone {
  id: number;
  name: string;
  capacity: number;
  level: StatusLevel;
  count: number;
  yellow_pct?: number;
  red_pct?: number;
  net_flow?: number;
  sparkline?: number[];
  override?: ZoneOverride | null;
}

export interface ZoneDensityPoint {
  ts: string;
  count: number;
  level: StatusLevel;
}

export interface ZoneFlowPoint {
  ts: string;
  entries: number;
  exits: number;
  net: number;
}

export interface MultilingualMessage {
  en: string;
  hi: string;
  gu: string;
}

export interface ZoneOverride {
  level: StatusLevel;
  message: MultilingualMessage;
  duration_min: number;
  applied_at: string;
  expires_at?: string;
}

export interface Alert {
  id: number;
  zone_id: number;
  zone_name?: string;
  level: StatusLevel;
  msg: string;
  status: 'open' | 'ack';
  ts: string;
  snapshot_url?: string;
}

export type DeviceType = 'camera' | 'scanner' | 'display';
export type DeviceStatus = 'online' | 'offline' | 'degraded';

export interface Device {
  id: number;
  name: string;
  type: DeviceType;
  zone_id: number;
  zone_name?: string;
  status: DeviceStatus;
  last_seen: string;
  battery?: number;
  signal?: number;
  ip?: string;
}

export interface PilgrimScan {
  checkpoint: string;
  direction: 'IN' | 'OUT';
  ts: string;
}

export interface PilgrimToken {
  token: string;
  sig: string;
  group_size: number;
  gate: string;
  name?: string;
  issued_at: string;
  scans: PilgrimScan[];
}

export interface CameraFeed {
  id: number;
  name: string;
  zone_id: number;
  zone_name: string;
  status: 'online' | 'offline';
  count: number;
  level: StatusLevel;
  stream_url: string;
  last_seen?: string;
}

// WebSocket Live Messages Contract
export type LiveMessage =
  | {
      type: 'density';
      zone_id: number;
      count: number;
      level: StatusLevel;
      ts: string;
    }
  | {
      type: 'flow';
      zone_id: number;
      net: number;
      window: string;
      ts?: string;
    }
  | {
      type: 'alert';
      id: number;
      zone_id: number;
      level: StatusLevel;
      msg: string;
      ts: string;
    }
  | {
      type: 'device';
      id: number;
      status: DeviceStatus;
      ts?: string;
    };
