import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useLiveStore } from '../store/live';
import { useToast } from '../components/ui/Toast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Chip,
  Button,
  Sparkline,
  Skeleton,
} from '../components/ui';
import {
  IconHeatmap,
  IconReports,
  IconArrowUp,
  IconArrowDown,
  IconAlertCircle,
  IconAlertTriangle,
} from '../components/ui/icons';
import type { Zone, Alert } from '../api/types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const liveZones = useLiveStore((state) => state.zones);
  const liveAlerts = useLiveStore((state) => state.recentAlerts);
  const liveDeviceStatuses = useLiveStore((state) => state.deviceStatuses);

  // 1. Fetch baseline zones from REST
  const {
    data: restZones,
    isLoading: zonesLoading,
    error: zonesError,
  } = useQuery({
    queryKey: ['zones'],
    queryFn: () => api.zones.list(),
  });

  // 2. Fetch baseline alerts
  const {
    data: restAlerts,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['alerts', 'all'],
    queryFn: () => api.alerts.list('all'),
  });

  // 3. Fetch baseline devices
  const { data: restDevices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.devices.list(),
  });

  // Merge REST baseline with real-time Zustand state
  const mergedZones: Zone[] = useMemo(() => {
    if (!restZones) return [];
    return restZones.map((zone) => {
      const live = liveZones[zone.id];
      if (!live) return zone;
      return {
        ...zone,
        count: live.count,
        level: live.level,
        net_flow: live.net_flow !== undefined ? live.net_flow : zone.net_flow,
      };
    });
  }, [restZones, liveZones]);

  // Combined alerts: live alert events prepended, deduplicated
  const alertsList: Alert[] = useMemo(() => {
    const combined = [...liveAlerts, ...(restAlerts || [])];
    const seen = new Set<number>();
    return combined.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [liveAlerts, restAlerts]);

  // Handle acknowledge action directly from ticker
  const handleAcknowledge = async (alertId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.alerts.acknowledge(alertId);
      refetchAlerts();
      showToast(`Alert #${alertId} acknowledged`, 'success');
    } catch {
      showToast('Failed to acknowledge alert', 'error');
    }
  };

  // Metrics computation
  const totalPeople = useMemo(() => {
    return mergedZones
      .filter((z) => z.level !== 'grey')
      .reduce((sum, z) => sum + z.count, 0);
  }, [mergedZones]);

  const redZonesCount = useMemo(() => {
    return mergedZones.filter((z) => z.level === 'red').length;
  }, [mergedZones]);

  const openAlerts = useMemo(() => {
    return alertsList.filter((a) => a.status === 'open');
  }, [alertsList]);

  const offlineDevicesCount = useMemo(() => {
    if (!restDevices) return 1;
    return restDevices.filter((d) => {
      const liveStatus = liveDeviceStatuses[d.id];
      const status = liveStatus || d.status;
      return status === 'offline';
    }).length;
  }, [restDevices, liveDeviceStatuses]);

  if (zonesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (zonesError) {
    return (
      <Card className="p-8 text-center border-status-red/40 bg-status-red/5">
        <p className="text-status-red font-semibold">Unable to load dashboard zones.</p>
        <p className="text-xs text-muted mt-1">Please ensure mock layer or backend service is active.</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Live crowd overview</h1>
          <p className="text-xs text-muted mt-1">
            4 monitored zones · Camera estimates, not a headcount
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<IconHeatmap size={16} />}
            onClick={() => navigate('/heatmap')}
          >
            View heatmap
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<IconReports size={16} />}
            onClick={() => {
              showToast('Exporting dashboard telemetry CSV...', 'info');
            }}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Active Metering / Instruction Banner */}
      <div className="p-4 rounded-panel bg-panel border-l-4 border-l-accent border-y border-r border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-control bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
            <IconAlertTriangle size={18} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text">Main Gate metering in effect</h4>
            <p className="text-xs text-muted mt-0.5">
              Direct new arrivals to Ghat Approach. Exit Lane count unavailable; manual observation requested.
            </p>
          </div>
        </div>
        <div className="text-right text-[11px] text-muted shrink-0">
          Issued 10:23 · Control room
        </div>
      </div>

      {/* 4 Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tile 1: Total People */}
        <Card className="p-5">
          <p className="text-xs font-medium text-muted">Total people on site</p>
          <div className="text-3xl font-bold text-text mt-2 tabular-nums">
            {totalPeople.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted mt-1">3 of 4 zones reporting</p>
        </Card>

        {/* Tile 2: Zones in Red */}
        <Card className={`p-5 ${redZonesCount > 0 ? 'border-status-red/50 bg-status-red/5' : ''}`}>
          <p className="text-xs font-medium text-muted">Zones in red</p>
          <div className={`text-3xl font-bold mt-2 tabular-nums ${redZonesCount > 0 ? 'text-status-red' : 'text-text'}`}>
            {redZonesCount}
          </div>
          <p className="text-[11px] text-muted mt-1">
            {redZonesCount > 0 ? 'Main Gate above 80%' : 'All zones within limits'}
          </p>
        </Card>

        {/* Tile 3: Open Alerts */}
        <Card className={`p-5 ${openAlerts.length > 0 ? 'border-status-yellow/50' : ''}`}>
          <p className="text-xs font-medium text-muted">Open alerts</p>
          <div className="text-3xl font-bold text-status-yellow mt-2 tabular-nums">
            {openAlerts.length}
          </div>
          <p className="text-[11px] text-muted mt-1">
            {openAlerts.length} need acknowledgement
          </p>
        </Card>

        {/* Tile 4: Devices Offline */}
        <Card className="p-5">
          <p className="text-xs font-medium text-muted">Devices offline</p>
          <div className="text-3xl font-bold text-text mt-2 tabular-nums">
            {offlineDevicesCount}
          </div>
          <p className="text-[11px] text-muted mt-1">CAM-04 · Exit Lane</p>
        </Card>
      </div>

      {/* Zone Cards Grid and Right Live Alert Ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Zone Cards */}
        <div className="lg:col-span-2 space-y-4">
          {mergedZones.map((zone) => {
            const isRed = zone.level === 'red';
            const isYellow = zone.level === 'yellow';
            const isGrey = zone.level === 'grey';
            const occupancyPct = Math.round((zone.count / zone.capacity) * 100);
            const netFlow = zone.net_flow ?? 0;

            return (
              <Card
                key={zone.id}
                highlightRed={isRed}
                highlightYellow={isYellow}
                className="p-5 cursor-pointer hover:border-accent/60 transition-all duration-200"
                onClick={() => navigate(`/zones/${zone.id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-text">{zone.name}</h3>
                    <p className="text-xs text-muted">
                      {isGrey ? 'CAM-04 · Check requested' : `CAM-0${zone.id} · Camera estimate`}
                    </p>
                  </div>
                  <div>
                    <Chip
                      level={zone.level}
                      label={
                        isRed
                          ? 'High crowd'
                          : isYellow
                          ? 'Moderate crowd'
                          : isGrey
                          ? 'Offline'
                          : 'Normal crowd'
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="text-3xl font-bold text-text tabular-nums">
                      {isGrey ? '—' : zone.count.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {isGrey
                        ? `Capacity ${zone.capacity.toLocaleString()} · No recent signal`
                        : `${zone.count.toLocaleString()} / ${zone.capacity.toLocaleString()} · ${occupancyPct}% occupied`}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 self-end">
                    {/* Net Flow indicator */}
                    {!isGrey && (
                      <div
                        className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${
                          netFlow > 0 ? (isRed ? 'text-status-red' : 'text-accent') : 'text-[#2FA866]'
                        }`}
                      >
                        {netFlow >= 0 ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}
                        <span>{netFlow >= 0 ? `+${netFlow}` : netFlow} / min</span>
                      </div>
                    )}

                    {/* Sparkline mini chart */}
                    <div className="text-right">
                      <Sparkline
                        data={zone.sparkline || [zone.count * 0.8, zone.count * 0.9, zone.count]}
                        color={isRed ? '#D93C3C' : isYellow ? '#E5B91F' : '#2FA866'}
                        width={85}
                        height={24}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Right Col: Live Alert Ticker */}
        <div className="space-y-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="py-3.5 px-5">
              <CardTitle className="text-sm font-semibold">Live alert ticker</CardTitle>
              <span className="text-[11px] text-muted">Newest first</span>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/60 flex-1 overflow-y-auto max-h-[640px]">
              {alertsList.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted">
                  No active alerts recorded.
                </div>
              ) : (
                alertsList.slice(0, 10).map((alert) => {
                  const isOpen = alert.status === 'open';
                  const isRed = alert.level === 'red';

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 transition-colors ${
                        isOpen ? 'bg-panel hover:bg-border/20' : 'bg-bg/40 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isRed ? (
                            <IconAlertCircle size={15} className="text-status-red shrink-0" />
                          ) : (
                            <IconAlertTriangle size={15} className="text-status-yellow shrink-0" />
                          )}
                          <h5 className="text-xs font-semibold text-text line-clamp-1">
                            {alert.msg}
                          </h5>
                        </div>
                        <span className="text-[10px] text-muted shrink-0 tabular-nums">
                          {new Date(alert.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted mt-1.5 leading-relaxed line-clamp-2">
                        {alert.zone_name ? `Zone: ${alert.zone_name}. ` : ''}
                        {alert.msg}
                      </p>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40">
                        <span className="text-[10px] text-muted">
                          {isOpen ? 'Assigned · Device team' : 'Acknowledged'}
                        </span>
                        {isOpen ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2.5 text-[11px]"
                            onClick={(e) => handleAcknowledge(alert.id, e)}
                          >
                            Acknowledge
                          </Button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate('/alerts')}
                            className="text-[11px] text-accent hover:underline font-medium"
                          >
                            View report
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
