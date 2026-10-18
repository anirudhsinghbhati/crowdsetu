import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { api } from '../api/client';
import { useLiveStore } from '../store/live';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Chip,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from '../components/ui';
import { IconCameras } from '../components/ui/icons';
import type { Zone } from '../api/types';

export const ZoneDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const zoneId = parseInt(id || '3', 10);
  const liveZones = useLiveStore((state) => state.zones);
  const [timeRange, setTimeRange] = useState<string>('1h');

  // Fetch zones list
  const { data: zones } = useQuery({
    queryKey: ['zones'],
    queryFn: () => api.zones.list(),
  });

  // Fetch zone density history
  const { data: densityPoints, isLoading: densityLoading } = useQuery({
    queryKey: ['zone-density', zoneId, timeRange],
    queryFn: () => api.zones.getDensity(zoneId),
  });

  // Fetch zone flow history
  const { data: flowPoints } = useQuery({
    queryKey: ['zone-flow', zoneId],
    queryFn: () => api.zones.getFlow(zoneId, '5m'),
  });

  // Fetch alerts
  const { data: allAlerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.alerts.list('all'),
  });

  // Target zone resolution
  const zone: Zone = useMemo(() => {
    const baseline = zones?.find((z) => z.id === zoneId) || {
      id: zoneId,
      name: 'Sanctum Corridor',
      capacity: 600,
      count: 312,
      level: 'yellow' as const,
      yellow_pct: 50,
      red_pct: 80,
      net_flow: -6,
    };
    const live = liveZones[zoneId];
    if (!live) return baseline;
    return {
      ...baseline,
      count: live.count,
      level: live.level,
      net_flow: live.net_flow !== undefined ? live.net_flow : baseline.net_flow,
    };
  }, [zones, zoneId, liveZones]);

  // Zone specific alerts
  const zoneAlerts = useMemo(() => {
    if (!allAlerts) return [];
    return allAlerts.filter((a) => a.zone_id === zoneId);
  }, [allAlerts, zoneId]);

  const yellowThresholdValue = Math.round((zone.capacity * (zone.yellow_pct || 50)) / 100);
  const redThresholdValue = Math.round((zone.capacity * (zone.red_pct || 80)) / 100);

  // Formatted chart points
  const formattedDensity = useMemo(() => {
    if (!densityPoints) return [];
    return densityPoints.map((pt) => ({
      time: new Date(pt.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      count: pt.count,
      level: pt.level,
    }));
  }, [densityPoints]);

  const formattedFlow = useMemo(() => {
    if (!flowPoints) return [];
    return flowPoints.map((pt) => ({
      time: pt.ts,
      net: pt.net,
      entries: pt.entries,
      exits: pt.exits,
    }));
  }, [flowPoints]);

  return (
    <div className="space-y-6 select-none">
      {/* Header and Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">{zone.name}</h1>
          <p className="text-xs text-muted mt-1">
            Zone detail · CAM-0{zone.id} · Camera estimates, not a headcount
          </p>
        </div>

        {/* 1h | 6h | 24h | Custom selector */}
        <div className="inline-flex p-1 bg-panel border border-border rounded-control gap-1 self-start sm:self-auto">
          {['1h', '6h', '24h', 'Custom'].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-control transition-colors ${
                timeRange === range
                  ? 'bg-bg text-accent font-semibold border border-border'
                  : 'text-muted hover:text-text'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Top Summary Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <Chip
              level={zone.level}
              label={
                zone.level === 'red'
                  ? 'High crowd'
                  : zone.level === 'yellow'
                  ? 'Moderate crowd'
                  : 'Normal crowd'
              }
            />

            <div>
              <div className="text-3xl font-black text-text tabular-nums">
                {zone.count.toLocaleString()} people
              </div>
              <span className="text-xs text-muted">Updated real-time IST</span>
            </div>

            <div className="h-10 w-px bg-border/80 hidden sm:block" />

            <div>
              <div className="text-base font-semibold text-text tabular-nums">
                {zone.count.toLocaleString()} / {zone.capacity.toLocaleString()} ·{' '}
                {Math.round((zone.count / zone.capacity) * 100)}%
              </div>
              <span className="text-xs text-muted">Zone capacity</span>
            </div>

            <div className="h-10 w-px bg-border/80 hidden sm:block" />

            <div>
              <div className="text-base font-semibold text-text tabular-nums">
                {zone.net_flow !== undefined && zone.net_flow >= 0 ? `+${zone.net_flow}` : zone.net_flow} people/min
              </div>
              <span className="text-xs text-muted">30 fewer people in the last 5 min</span>
            </div>
          </div>

          <Button
            variant="secondary"
            icon={<IconCameras size={16} />}
            onClick={() => navigate('/cameras')}
          >
            View camera
          </Button>
        </div>
      </Card>

      {/* Two Main Charts: Density over Time and Net Flow per 5 minutes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Density with Threshold Lines */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text">Density over time</h3>
              <p className="text-xs text-muted">People · Capacity {zone.capacity}</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-status-yellow">● Yellow: {yellowThresholdValue}</span>
              <span className="text-status-red">● Red: {redThresholdValue}</span>
            </div>
          </div>

          <div className="h-64 w-full">
            {densityLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedDensity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="time" stroke="#98A0AE" fontSize={10} tickLine={false} />
                  <YAxis stroke="#98A0AE" fontSize={10} domain={[0, zone.capacity + 50]} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1D232D',
                      borderColor: '#2B3340',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#E8E6DF',
                    }}
                  />
                  <ReferenceLine
                    y={yellowThresholdValue}
                    stroke="#E5B91F"
                    strokeDasharray="4 4"
                    label={{ value: `Yellow: ${yellowThresholdValue}`, fill: '#E5B91F', fontSize: 10, position: 'top' }}
                  />
                  <ReferenceLine
                    y={redThresholdValue}
                    stroke="#D93C3C"
                    strokeDasharray="4 4"
                    label={{ value: `Red: ${redThresholdValue}`, fill: '#D93C3C', fontSize: 10, position: 'top' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#E8962E"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#E8962E' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Chart 2: Net Flow per 5 minutes Bar Chart */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text">Net flow per 5 minutes</h3>
              <p className="text-xs text-muted">People / 5 min (positive = entering, negative = leaving)</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-accent">■ Entering</span>
              <span className="text-muted">■ Leaving</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="time" stroke="#98A0AE" fontSize={10} tickLine={false} />
                <YAxis stroke="#98A0AE" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1D232D',
                    borderColor: '#2B3340',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#E8E6DF',
                  }}
                />
                <ReferenceLine y={0} stroke="#2B3340" />
                <Bar dataKey="net" radius={[2, 2, 0, 0]}>
                  {formattedFlow.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.net >= 0 ? '#E8962E' : '#2FA866'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Alerts in this Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Recent alerts</CardTitle>
          <span className="text-xs text-muted">Filtered for {zone.name}</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time · IST</TableHead>
                <TableHead>Alert</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acknowledgement</TableHead>
                <TableHead>Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zoneAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted">
                    No recent alerts recorded for this zone.
                  </TableCell>
                </TableRow>
              ) : (
                zoneAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-mono text-xs text-muted">
                      {new Date(alert.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-semibold text-text">{alert.msg}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-semibold ${
                          alert.status === 'open' ? 'text-status-yellow' : 'text-muted'
                        }`}
                      >
                        {alert.status === 'open' ? 'Open · Acknowledged' : 'Closed · Reviewed'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted">R. Mehta · 10:20</TableCell>
                    <TableCell className="text-xs text-text">Barrier check completed</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Row of Saved Clip Thumbnails */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Saved clips</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Queue obstruction', duration: '30 s', time: '10:19:06–10:19:36 IST' },
            { title: 'Junction review', duration: '30 s', time: '09:58:12–09:58:42 IST' },
            { title: 'Density threshold', duration: '20 s', time: '09:41:08–09:41:28 IST' },
          ].map((clip, idx) => (
            <Card key={idx} className="p-4 space-y-3 hover:border-accent/60 transition-colors">
              <div className="h-32 bg-bg border border-border rounded-panel relative flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 300 100" className="w-full h-full stroke-muted/30 fill-none">
                  <polygon points="20 10, 280 10, 210 30, 90 30" />
                  <polygon points="20 90, 280 90, 210 70, 90 70" />
                  <line x1="20" y1="10" x2="90" y2="30" />
                  <line x1="280" y1="10" x2="210" y2="30" />
                  <line x1="20" y1="90" x2="90" y2="70" />
                  <line x1="280" y1="90" x2="210" y2="70" />
                </svg>
                <div className="w-10 h-10 rounded-full bg-accent/90 text-bg flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                  {clip.duration}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text">{clip.title}</h4>
                <p className="text-[11px] font-mono text-muted mt-0.5">{clip.time}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
