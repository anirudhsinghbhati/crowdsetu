import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useLiveStore } from '../store/live';
import { useToast } from '../components/ui/Toast';
import {
  Card,
  Chip,
  Button,
  Modal,
} from '../components/ui';
import {
  IconExpand,
  IconRefresh,
  IconAlertTriangle,
} from '../components/ui/icons';
import type { Zone } from '../api/types';

export const Cameras: React.FC = () => {
  const { showToast } = useToast();
  const liveZones = useLiveStore((state) => state.zones);
  const [layoutMode, setLayoutMode] = useState<'2x2' | '3x3'>('2x2');
  const [expandedZoneId, setExpandedZoneId] = useState<number | null>(null);

  // Fetch baseline zones
  const { data: restZones } = useQuery({
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
      };
    });
  }, [restZones, liveZones]);

  const expandedZone = useMemo(() => {
    return zones.find((z) => z.id === expandedZoneId) || null;
  }, [zones, expandedZoneId]);

  const handleRetryCamera = (zoneName: string) => {
    showToast(`Re-negotiating camera stream for ${zoneName}...`, 'info');
    setTimeout(() => {
      showToast(`Camera feed for ${zoneName} restored`, 'success');
    }, 1200);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header and Layout Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Cameras</h1>
          <p className="text-xs text-muted mt-1">4 cameras · 3 reporting · 1 offline</p>
        </div>

        {/* 2x2 | 3x3 layout toggle */}
        <div className="inline-flex p-1 bg-panel border border-border rounded-control gap-1">
          <button
            type="button"
            onClick={() => setLayoutMode('2x2')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-control transition-colors ${
              layoutMode === '2x2'
                ? 'bg-bg text-accent border border-border shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            2x2
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('3x3')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-control transition-colors ${
              layoutMode === '3x3'
                ? 'bg-bg text-accent border border-border shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            3x3
          </button>
        </div>
      </div>

      {/* Camera Feeds Grid */}
      <div
        className={`grid gap-6 ${
          layoutMode === '2x2' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {zones.map((zone) => {
          const isOffline = zone.level === 'grey';
          const isRed = zone.level === 'red';
          const isYellow = zone.level === 'yellow';

          if (isOffline) {
            return (
              <Card key={zone.id} className="p-0 overflow-hidden flex flex-col justify-between">
                {/* Offline State Container */}
                <div className="aspect-video bg-bg/90 border-b border-border p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-status-yellow/10 border border-status-yellow/30 text-status-yellow flex items-center justify-center mb-3">
                    <IconAlertTriangle size={24} />
                  </div>
                  <h3 className="text-base font-bold text-text">Camera offline</h3>
                  <p className="text-xs text-muted max-w-sm mt-1 leading-relaxed">
                    Last seen 10:22:18 IST · No current count. Retry the connection or request a manual observation.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    icon={<IconRefresh size={14} />}
                    onClick={() => handleRetryCamera(zone.name)}
                  >
                    Retry
                  </Button>
                </div>

                {/* Bottom Zone Label */}
                <div className="p-4 flex items-center justify-between bg-panel">
                  <div>
                    <h4 className="text-sm font-semibold text-text">{zone.name}</h4>
                    <p className="text-xs text-muted">CAM-04 · Unavailable · Capacity {zone.capacity}</p>
                  </div>
                  <Chip level="grey" label="Offline" />
                </div>
              </Card>
            );
          }

          return (
            <Card key={zone.id} className="p-0 overflow-hidden flex flex-col justify-between group">
              {/* Camera Video Feed Simulation (Corridor Perspective Canvas) */}
              <div className="aspect-video bg-[#0E1116] border-b border-border relative overflow-hidden flex items-center justify-center">
                {/* Simulated Perspective Wireframe Hallway with crowd points */}
                <svg viewBox="0 0 400 225" className="w-full h-full stroke-muted/25 fill-none">
                  {/* Perspective vanishing grid lines */}
                  <polygon points="40 20, 360 20, 260 70, 140 70" />
                  <polygon points="40 205, 360 205, 260 155, 140 155" />
                  <line x1="40" y1="20" x2="140" y2="70" />
                  <line x1="360" y1="20" x2="260" y2="70" />
                  <line x1="40" y1="205" x2="140" y2="155" />
                  <line x1="360" y1="205" x2="260" y2="155" />

                  {/* Simulated people dots with bboxes */}
                  <g className="fill-text/80 stroke-none">
                    <circle cx="160" cy="110" r="3.5" />
                    <circle cx="185" cy="115" r="4" />
                    <circle cx="210" cy="108" r="3.5" />
                    <circle cx="235" cy="112" r="4" />
                    <circle cx="150" cy="130" r="4.5" />
                    <circle cx="180" cy="135" r="5" />
                    <circle cx="220" cy="132" r="5" />
                    <circle cx="250" cy="138" r="4.5" />
                  </g>
                </svg>

                {/* Top Overlay: Live Count & Status Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded bg-black/80 backdrop-blur-sm border border-border/70 flex items-center gap-2 shadow">
                    <span className="text-xs font-bold text-white tabular-nums">
                      {zone.count.toLocaleString()}
                    </span>
                    <Chip
                      level={zone.level}
                      size="sm"
                      label={isRed ? 'High crowd' : isYellow ? 'Moderate crowd' : 'Normal'}
                    />
                  </div>
                </div>

                {/* Top-Right: Expand Button */}
                <button
                  type="button"
                  onClick={() => setExpandedZoneId(zone.id)}
                  className="absolute top-3 right-3 p-1.5 rounded bg-black/80 hover:bg-black text-white/80 hover:text-white transition-colors"
                  title="Expand camera view"
                >
                  <IconExpand size={16} />
                </button>

                {/* Bottom Overlay: Live Dot and Timestamp */}
                <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 text-[11px] text-white">
                    <span className="w-2 h-2 rounded-full bg-[#2FA866] animate-pulse" />
                    Live
                  </span>
                  <span className="text-[10px] font-mono text-white/75 bg-black/60 px-1.5 py-0.5 rounded">
                    10:24:32 IST · Demo
                  </span>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="p-4 flex items-center justify-between bg-panel">
                <div>
                  <h4 className="text-sm font-semibold text-text">{zone.name}</h4>
                  <p className="text-xs text-muted">
                    CAM-0{zone.id} · {Math.round((zone.count / zone.capacity) * 100)}% · Capacity{' '}
                    {zone.capacity.toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedZoneId(zone.id)}
                  className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                >
                  <span>Expand</span>
                  <IconExpand size={13} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Expanded Camera Modal */}
      {expandedZone && (
        <Modal
          isOpen={!!expandedZone}
          onClose={() => setExpandedZoneId(null)}
          title={`${expandedZone.name} — Live Feed`}
          description={`CAM-0${expandedZone.id} · Monitored Pilgrimage Sector`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="aspect-video bg-[#0E1116] border border-border rounded-panel relative flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 600 340" className="w-full h-full stroke-muted/30 fill-none">
                <polygon points="60 30, 540 30, 390 100, 210 100" />
                <polygon points="60 310, 540 310, 390 240, 210 240" />
                <line x1="60" y1="30" x2="210" y2="100" />
                <line x1="540" y1="30" x2="390" y2="100" />
                <line x1="60" y1="310" x2="210" y2="240" />
                <line x1="540" y1="310" x2="390" y2="240" />
              </svg>
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded bg-black/80 border border-white/20 flex items-center gap-3">
                <span className="text-lg font-bold text-white tabular-nums">
                  {expandedZone.count.toLocaleString()} people
                </span>
                <Chip level={expandedZone.level} />
              </div>
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-black/80 text-xs font-medium text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2FA866] animate-pulse" />
                  Live MJPEG Stream Active
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-bg rounded-control border border-border text-xs">
              <div>
                <span className="text-muted block">Zone Capacity</span>
                <span className="text-sm font-bold text-text tabular-nums">{expandedZone.capacity}</span>
              </div>
              <div>
                <span className="text-muted block">Occupancy</span>
                <span className="text-sm font-bold text-text tabular-nums">
                  {Math.round((expandedZone.count / expandedZone.capacity) * 100)}%
                </span>
              </div>
              <div>
                <span className="text-muted block">Resolution</span>
                <span className="text-sm font-bold text-text">1080p @ 25fps</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
