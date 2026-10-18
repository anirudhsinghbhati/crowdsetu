import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useLiveStore } from '../store/live';
import {
  Card,
  Tabs,
  Chip,
  Button,
  Skeleton,
} from '../components/ui';
import {
  IconArrowUp,
  IconArrowDown,
} from '../components/ui/icons';
import type { Zone } from '../api/types';

export const Heatmap: React.FC = () => {
  const navigate = useNavigate();
  const liveZones = useLiveStore((state) => state.zones);
  const [viewMode, setViewMode] = useState<string>('flow');
  const [selectedZoneId, setSelectedZoneId] = useState<number>(3); // Default Sanctum Corridor

  // Fetch baseline zones
  const { data: restZones, isLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: () => api.zones.list(),
  });

  // Merge live zone state
  const zones: Zone[] = useMemo(() => {
    if (!restZones) return [];
    return restZones.map((z) => {
      const live = liveZones[z.id];
      if (!live) return z;
      return {
        ...z,
        count: live.count,
        level: live.level,
        net_flow: live.net_flow !== undefined ? live.net_flow : z.net_flow,
      };
    });
  }, [restZones, liveZones]);

  const selectedZone = useMemo(() => {
    return zones.find((z) => z.id === selectedZoneId) || zones[0];
  }, [zones, selectedZoneId]);

  const totalPeople = useMemo(() => {
    return zones.filter((z) => z.level !== 'grey').reduce((acc, z) => acc + z.count, 0);
  }, [zones]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[560px]" />
          <Skeleton className="h-[560px]" />
        </div>
      </div>
    );
  }

  // Zone status fill helper (70% opacity as per README)
  const getZoneFill = (level: string) => {
    switch (level) {
      case 'red':
        return 'rgba(217, 60, 60, 0.75)';
      case 'yellow':
        return 'rgba(229, 185, 31, 0.75)';
      case 'green':
        return 'rgba(47, 168, 102, 0.75)';
      case 'grey':
      default:
        return 'rgba(122, 129, 144, 0.4)';
    }
  };

  const getZoneStroke = (zoneId: number, level: string) => {
    if (selectedZoneId === zoneId) return '#E8962E'; // Saffron selection border
    switch (level) {
      case 'red':
        return '#D93C3C';
      case 'yellow':
        return '#E5B91F';
      case 'green':
        return '#2FA866';
      case 'grey':
      default:
        return '#2B3340';
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Site heatmap</h1>
          <p className="text-xs text-muted mt-1">
            4 monitored zones · {totalPeople.toLocaleString()} people reported from 3 zones
          </p>
        </div>

        {/* Segmented Toggle: Density | Flow | Combined */}
        <Tabs
          variant="segmented"
          activeTab={viewMode}
          onChange={setViewMode}
          tabs={[
            { id: 'density', label: 'Density' },
            { id: 'flow', label: 'Flow' },
            { id: 'combined', label: 'Combined' },
          ]}
        />
      </div>

      {/* Main Grid: SVG Map on Left, Zone Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Schematic SVG Map */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-text uppercase tracking-wider">
              {viewMode === 'flow'
                ? 'Net movement by zone'
                : viewMode === 'density'
                ? 'Density distribution'
                : 'Combined Density & Net Flow'}
            </span>
            <span className="text-[11px] font-mono text-muted">Snapshot · Real-time</span>
          </div>

          {/* Interactive SVG Site Map */}
          <div className="w-full aspect-[4/3] bg-bg/80 border border-border/70 rounded-panel relative p-4 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 700 500" className="w-full h-full select-none">
              <defs>
                {/* Arrow markers */}
                <marker
                  id="flow-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#E8962E" />
                </marker>
              </defs>

              {/* Connecting Corridors / Pathways */}
              <g className="stroke-border/80 fill-none stroke-[22] stroke-linecap-round stroke-linejoin-round">
                {/* Main Gate to Ghat Approach */}
                <path d="M 180 180 L 350 180 L 350 160" />
                {/* Ghat Approach to Sanctum */}
                <path d="M 520 220 L 520 320 L 450 320" />
                {/* Sanctum to Exit Lane */}
                <path d="M 280 340 L 180 340 L 180 360" />
              </g>

              {/* Flow Directional Lines and Badges */}
              {(viewMode === 'flow' || viewMode === 'combined') && (
                <g>
                  {/* Flow Arrow 1: Main Gate into Ghat Approach */}
                  <line
                    x1="260"
                    y1="180"
                    x2="380"
                    y2="180"
                    stroke="#E8962E"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    markerEnd="url(#flow-arrow)"
                  />
                  <rect x="270" y="195" width="105" height="24" rx="4" fill="#14181F" stroke="#E8962E" strokeWidth="1" />
                  <text x="322" y="211" fill="#E8962E" fontSize="11" fontWeight="bold" textAnchor="middle">
                    ↑ +42 people/min
                  </text>

                  {/* Flow Arrow 2: Sanctum Corridor net leaving */}
                  <line
                    x1="380"
                    y1="390"
                    x2="260"
                    y2="390"
                    stroke="#2FA866"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    markerEnd="url(#flow-arrow)"
                  />
                  <rect x="260" y="405" width="130" height="24" rx="4" fill="#14181F" stroke="#2FA866" strokeWidth="1" />
                  <text x="325" y="421" fill="#2FA866" fontSize="11" fontWeight="bold" textAnchor="middle">
                    ← -6 people/min · Leaving
                  </text>
                </g>
              )}

              {/* ZONE 1: MAIN GATE (Top-Left) */}
              {(() => {
                const z = zones[0];
                const isSelected = selectedZoneId === z?.id;
                return (
                  <g
                    className="cursor-pointer transition-transform hover:opacity-95"
                    onClick={() => setSelectedZoneId(z?.id || 1)}
                  >
                    <polygon
                      points="80,100 240,100 270,140 270,220 80,220"
                      fill={getZoneFill(z?.level || 'green')}
                      stroke={getZoneStroke(1, z?.level || 'green')}
                      strokeWidth={isSelected ? 3.5 : 2}
                    />
                    <text x="100" y="135" fill="#FFFFFF" fontSize="15" fontWeight="bold">
                      Main Gate
                    </text>
                    <text x="100" y="170" fill="#FFFFFF" fontSize="24" fontWeight="bold" className="tabular-nums">
                      {z?.count.toLocaleString()}
                    </text>
                    <text x="100" y="195" fill="rgba(255,255,255,0.85)" fontSize="12">
                      {Math.round(((z?.count || 0) / (z?.capacity || 1)) * 100)}% · High crowd
                    </text>
                  </g>
                );
              })()}

              {/* ZONE 2: GHAT APPROACH (Top-Right) */}
              {(() => {
                const z = zones[1];
                const isSelected = selectedZoneId === z?.id;
                return (
                  <g
                    className="cursor-pointer transition-transform hover:opacity-95"
                    onClick={() => setSelectedZoneId(z?.id || 2)}
                  >
                    <polygon
                      points="420,90 600,90 630,130 630,220 420,220"
                      fill={getZoneFill(z?.level || 'yellow')}
                      stroke={getZoneStroke(2, z?.level || 'yellow')}
                      strokeWidth={isSelected ? 3.5 : 2}
                    />
                    <text x="440" y="125" fill="#14181F" fontSize="15" fontWeight="bold">
                      Ghat Approach
                    </text>
                    <text x="440" y="160" fill="#14181F" fontSize="24" fontWeight="bold" className="tabular-nums">
                      {z?.count.toLocaleString()}
                    </text>
                    <text x="440" y="185" fill="#14181F" fontSize="12" fontWeight="600">
                      {Math.round(((z?.count || 0) / (z?.capacity || 1)) * 100)}% · Moderate crowd
                    </text>
                  </g>
                );
              })()}

              {/* ZONE 3: SANCTUM CORRIDOR (Center-Bottom) */}
              {(() => {
                const z = zones[2];
                const isSelected = selectedZoneId === z?.id;
                return (
                  <g
                    className="cursor-pointer transition-transform hover:opacity-95"
                    onClick={() => setSelectedZoneId(z?.id || 3)}
                  >
                    <rect
                      x="280"
                      y="260"
                      width="330"
                      height="120"
                      rx="8"
                      fill={getZoneFill(z?.level || 'red')}
                      stroke={getZoneStroke(3, z?.level || 'red')}
                      strokeWidth={isSelected ? 3.5 : 2}
                    />
                    <text x="305" y="295" fill="#FFFFFF" fontSize="16" fontWeight="bold">
                      Sanctum Corridor
                    </text>
                    <text x="305" y="335" fill="#FFFFFF" fontSize="28" fontWeight="bold" className="tabular-nums">
                      {z?.count.toLocaleString()}
                    </text>
                    <text x="305" y="360" fill="rgba(255,255,255,0.85)" fontSize="13">
                      {Math.round(((z?.count || 0) / (z?.capacity || 1)) * 100)}% · Capacity {z?.capacity}
                    </text>
                  </g>
                );
              })()}

              {/* ZONE 4: EXIT LANE (Bottom-Left) */}
              {(() => {
                const z = zones[3];
                const isSelected = selectedZoneId === z?.id;
                return (
                  <g
                    className="cursor-pointer transition-transform hover:opacity-95"
                    onClick={() => setSelectedZoneId(z?.id || 4)}
                  >
                    <polygon
                      points="80,310 230,310 230,420 80,420"
                      rx="6"
                      fill={getZoneFill(z?.level || 'grey')}
                      stroke={getZoneStroke(4, z?.level || 'grey')}
                      strokeWidth={isSelected ? 3.5 : 2}
                    />
                    <text x="100" y="345" fill="#E8E6DF" fontSize="15" fontWeight="bold">
                      Exit Lane
                    </text>
                    <text x="100" y="385" fill="#98A0AE" fontSize="13">
                      Offline · No current data
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Bottom Footnote & Legend */}
          <div className="mt-4 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted">
            <span className="text-[11px]">
              Arrows show net direction; numbers show people per minute.
            </span>
            {/* Bottom Legend */}
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#2FA866]" />
                <span>Green &lt;50%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#E5B91F]" />
                <span>Yellow 50–79%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#D93C3C]" />
                <span>Red ≥80%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#7A8190]" />
                <span>Offline</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Col: Selected Zone Inspector Panel */}
        {selectedZone && (
          <Card className="p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div>
                <span className="text-xs font-mono text-muted uppercase tracking-wider block">
                  Selected zone · CAM-0{selectedZone.id}
                </span>
                <h2 className="text-xl font-bold text-text mt-1">{selectedZone.name}</h2>
                <div className="mt-2">
                  <Chip
                    level={selectedZone.level}
                    label={
                      selectedZone.level === 'red'
                        ? 'High crowd'
                        : selectedZone.level === 'yellow'
                        ? 'Moderate crowd'
                        : selectedZone.level === 'grey'
                        ? 'Offline'
                        : 'Low crowd'
                    }
                  />
                </div>
              </div>

              {/* Big Live Count & Capacity Bar */}
              <div className="pt-2">
                <div className="text-4xl font-black text-text tabular-nums">
                  {selectedZone.level === 'grey' ? '—' : selectedZone.count.toLocaleString()}
                </div>
                <span className="text-xs text-muted">people · Camera estimate</span>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Capacity {selectedZone.capacity}</span>
                    <span className="font-semibold text-text tabular-nums">
                      {Math.round((selectedZone.count / selectedZone.capacity) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        selectedZone.level === 'red'
                          ? 'bg-status-red'
                          : selectedZone.level === 'yellow'
                          ? 'bg-status-yellow'
                          : 'bg-status-green'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((selectedZone.count / selectedZone.capacity) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Trend & Net Flow */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-bg rounded-control border border-border">
                  <span className="text-[11px] text-muted block">Trend (Last 5 min)</span>
                  <div className="flex items-center gap-1 text-sm font-semibold text-text mt-1">
                    <IconArrowDown size={14} className="text-[#2FA866]" />
                    <span>↓ 30 people</span>
                  </div>
                </div>

                <div className="p-3 bg-bg rounded-control border border-border">
                  <span className="text-[11px] text-muted block">Net flow</span>
                  <div className="flex items-center gap-1 text-sm font-semibold text-text mt-1">
                    <IconArrowUp size={14} className="text-accent" />
                    <span>-6 people/min</span>
                  </div>
                </div>
              </div>

              {/* Active Notice / Incident in Zone */}
              <div className="p-3.5 bg-status-yellow/10 border border-status-yellow/30 rounded-control">
                <h5 className="text-xs font-semibold text-status-yellow">Queue obstruction · Open</h5>
                <p className="text-[11px] text-muted mt-1 leading-snug">
                  Barrier check requested at corridor junction. Acknowledged by R. Mehta at 10:20.
                </p>
              </div>
            </div>

            {/* Action to open full zone detail */}
            <Button
              variant="primary"
              className="w-full h-11"
              onClick={() => navigate(`/zones/${selectedZone.id}`)}
            >
              Open zone
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};
