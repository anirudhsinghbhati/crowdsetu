import { mockApi } from './mock';
import type {
  AuthResponse,
  Zone,
  ZoneDensityPoint,
  ZoneFlowPoint,
  Alert,
  Device,
  PilgrimToken,
} from './types';

const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === undefined
    ? true
    : import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.VITE_USE_MOCK === true;

const TOKEN_KEY = 'crowdsetu_jwt_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// Generic fetch wrapper for real mode
async function realFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearStoredToken();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `Request failed: ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.message || parsed.detail) errorMsg = parsed.message || parsed.detail;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

// Unified api client
export const api = {
  auth: {
    login: async (credentials: { username: string; password?: string }): Promise<AuthResponse> => {
      if (USE_MOCK) return mockApi.login(credentials);
      return realFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
  },

  zones: {
    list: async (): Promise<Zone[]> => {
      if (USE_MOCK) return mockApi.getZones();
      return realFetch<Zone[]>('/zones');
    },

    getDensity: async (zoneId: number, from?: string, to?: string): Promise<ZoneDensityPoint[]> => {
      if (USE_MOCK) return mockApi.getZoneDensity(zoneId, from, to);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return realFetch<ZoneDensityPoint[]>(`/zones/${zoneId}/density?${params.toString()}`);
    },

    getFlow: async (zoneId: number, window = '5m'): Promise<ZoneFlowPoint[]> => {
      if (USE_MOCK) return mockApi.getZoneFlow(zoneId, window);
      return realFetch<ZoneFlowPoint[]>(`/zones/${zoneId}/flow?window=${window}`);
    },

    override: async (
      zoneId: number,
      data: { level: 'green' | 'yellow' | 'red'; message: { en: string; hi: string; gu: string }; duration_min: number }
    ): Promise<Zone> => {
      if (USE_MOCK) return mockApi.overrideZone(zoneId, data);
      return realFetch<Zone>(`/zones/${zoneId}/override`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    cancelOverride: async (zoneId: number): Promise<Zone> => {
      if (USE_MOCK) return mockApi.cancelZoneOverride(zoneId);
      return realFetch<Zone>(`/zones/${zoneId}/override`, {
        method: 'DELETE',
      });
    },

    updateThresholds: async (zoneId: number, yellowPct: number, redPct: number): Promise<Zone> => {
      if (USE_MOCK) return mockApi.updateZoneThresholds(zoneId, yellowPct, redPct);
      return realFetch<Zone>(`/zones/${zoneId}/thresholds`, {
        method: 'PUT',
        body: JSON.stringify({ yellow_pct: yellowPct, red_pct: redPct }),
      });
    },
  },

  alerts: {
    list: async (status: 'open' | 'ack' | 'all' = 'all'): Promise<Alert[]> => {
      if (USE_MOCK) return mockApi.getAlerts(status);
      return realFetch<Alert[]>(`/alerts?status=${status}`);
    },

    acknowledge: async (id: number): Promise<Alert> => {
      if (USE_MOCK) return mockApi.acknowledgeAlert(id);
      return realFetch<Alert>(`/alerts/${id}/ack`, {
        method: 'POST',
      });
    },
  },

  devices: {
    list: async (): Promise<Device[]> => {
      if (USE_MOCK) return mockApi.getDevices();
      return realFetch<Device[]>('/devices');
    },
  },

  pilgrims: {
    register: async (data: { group_size: number; gate: string; name?: string }): Promise<PilgrimToken> => {
      if (USE_MOCK) return mockApi.registerPilgrim(data);
      return realFetch<PilgrimToken>('/pilgrims/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    lookup: async (token: string): Promise<PilgrimToken> => {
      if (USE_MOCK) return mockApi.getPilgrimToken(token);
      return realFetch<PilgrimToken>(`/pilgrims/${encodeURIComponent(token)}`);
    },
  },

  cameras: {
    getStreamUrl: (id: number): string => {
      if (USE_MOCK) {
        // Return dummy feed url or data
        return `/api/cameras/${id}/stream`;
      }
      return `/api/cameras/${id}/stream`;
    },
  },
};
