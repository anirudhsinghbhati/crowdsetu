import { create } from 'zustand';
import type { LiveMessage, StatusLevel, Alert, DeviceStatus } from '../api/types';

interface LiveZoneState {
  count: number;
  level: StatusLevel;
  net_flow?: number;
  lastUpdated: number;
}

interface LiveState {
  isConnected: boolean;
  lastMessageTimestamp: number;
  zones: Record<number, LiveZoneState>;
  recentAlerts: Alert[];
  deviceStatuses: Record<number, DeviceStatus>;

  // Actions
  setConnected: (connected: boolean) => void;
  handleMessage: (message: LiveMessage) => void;
  addAlert: (alert: Alert) => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  isConnected: false,
  lastMessageTimestamp: Date.now(),
  zones: {},
  recentAlerts: [],
  deviceStatuses: {},

  setConnected: (connected: boolean) => {
    set({
      isConnected: connected,
      lastMessageTimestamp: connected ? Date.now() : 0,
    });
  },

  handleMessage: (message: LiveMessage) => {
    const now = Date.now();
    switch (message.type) {
      case 'density':
        set((state) => ({
          lastMessageTimestamp: now,
          zones: {
            ...state.zones,
            [message.zone_id]: {
              count: message.count,
              level: message.level,
              net_flow: state.zones[message.zone_id]?.net_flow,
              lastUpdated: now,
            },
          },
        }));
        break;

      case 'flow':
        set((state) => ({
          lastMessageTimestamp: now,
          zones: {
            ...state.zones,
            [message.zone_id]: {
              count: state.zones[message.zone_id]?.count ?? 0,
              level: state.zones[message.zone_id]?.level ?? 'green',
              net_flow: message.net,
              lastUpdated: now,
            },
          },
        }));
        break;

      case 'alert':
        set((state) => {
          const newAlert: Alert = {
            id: message.id,
            zone_id: message.zone_id,
            level: message.level,
            msg: message.msg,
            status: 'open',
            ts: message.ts,
          };
          // Filter duplicates
          const exists = state.recentAlerts.some((a) => a.id === message.id);
          if (exists) return state;
          return {
            lastMessageTimestamp: now,
            recentAlerts: [newAlert, ...state.recentAlerts].slice(0, 50),
          };
        });
        break;

      case 'device':
        set((state) => ({
          lastMessageTimestamp: now,
          deviceStatuses: {
            ...state.deviceStatuses,
            [message.id]: message.status,
          },
        }));
        break;
    }
  },

  addAlert: (alert: Alert) => {
    set((state) => ({
      recentAlerts: [alert, ...state.recentAlerts.filter((a) => a.id !== alert.id)].slice(0, 50),
    }));
  },
}));
