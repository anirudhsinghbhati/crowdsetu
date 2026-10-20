import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { useLiveStore } from '../store/live';
import { useAuthStore } from '../store/auth';
import {
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  Chip,
  Button,
  Drawer,
  EmptyState,
  Select,
} from '../components/ui';
import { IconCheck } from '../components/ui/icons';
import type { Alert } from '../api/types';

export const Alerts: React.FC = () => {
  const { showToast } = useToast();
  const role = useAuthStore((state) => state.role);
  const liveAlerts = useLiveStore((state) => state.recentAlerts);
  const [activeTab, setActiveTab] = useState<'open' | 'ack' | 'all'>('open');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [drawerAlert, setDrawerAlert] = useState<Alert | null>(null);

  // Fetch baseline alerts
  const { data: restAlerts, refetch, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.alerts.list('all'),
  });

  // Merge live alerts with baseline
  const mergedAlerts: Alert[] = useMemo(() => {
    const combined = [...liveAlerts, ...(restAlerts || [])];
    const seen = new Set<number>();
    return combined.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [liveAlerts, restAlerts]);

  // Tab and filter processing
  const filteredAlerts = useMemo(() => {
    return mergedAlerts.filter((alert) => {
      // Tab filter
      if (activeTab === 'open' && alert.status !== 'open') return false;
      if (activeTab === 'ack' && alert.status !== 'ack') return false;

      // Zone filter
      if (selectedZone !== 'all' && alert.zone_name !== selectedZone) return false;

      // Level filter
      if (selectedLevel !== 'all' && alert.level !== selectedLevel) return false;

      return true;
    });
  }, [mergedAlerts, activeTab, selectedZone, selectedLevel]);

  // Summary counts
  const openCount = useMemo(() => mergedAlerts.filter((a) => a.status === 'open').length, [mergedAlerts]);
  const ackCount = useMemo(() => mergedAlerts.filter((a) => a.status === 'ack').length, [mergedAlerts]);

  const handleAcknowledge = async (alertId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.alerts.acknowledge(alertId);
      refetch();
      showToast(`Alert #${alertId} acknowledged`, 'success');
      if (drawerAlert && drawerAlert.id === alertId) {
        setDrawerAlert({ ...drawerAlert, status: 'ack' });
      }
    } catch {
      showToast('Failed to acknowledge alert', 'error');
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Alerts</h1>
        <p className="text-xs text-muted mt-1">
          Review unresolved events and coordinate a verified response.
        </p>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-medium text-muted">Open alerts</p>
          <div className="text-3xl font-bold text-text mt-2 tabular-nums">{openCount}</div>
          <p className="text-[11px] text-muted mt-1">Unresolved events across zones</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium text-muted">Need acknowledgement</p>
          <div className="text-3xl font-bold text-status-yellow mt-2 tabular-nums">{openCount}</div>
          <p className="text-[11px] text-muted mt-1">Main Gate and Exit Lane</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium text-muted">Acknowledged, still open</p>
          <div className="text-3xl font-bold text-[#2FA866] mt-2 tabular-nums">{ackCount}</div>
          <p className="text-[11px] text-muted mt-1">Sanctum Corridor · Barrier check in progress</p>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
          <Tabs
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as 'open' | 'ack' | 'all')}
            tabs={[
              { id: 'open', label: 'Open', count: openCount },
              { id: 'ack', label: 'Acknowledged', count: ackCount },
              { id: 'all', label: 'All', count: mergedAlerts.length },
            ]}
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Zone"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            options={[
              { value: 'all', label: 'All zones' },
              { value: 'Main Gate', label: 'Main Gate' },
              { value: 'Ghat Approach', label: 'Ghat Approach' },
              { value: 'Sanctum Corridor', label: 'Sanctum Corridor' },
              { value: 'Exit Lane', label: 'Exit Lane' },
            ]}
          />

          <Select
            label="Level"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            options={[
              { value: 'all', label: 'All levels' },
              { value: 'red', label: 'High crowd / Critical' },
              { value: 'yellow', label: 'Moderate crowd / Warning' },
              { value: 'grey', label: 'Offline / Device unavailable' },
            ]}
          />

          <Select
            label="Date range"
            options={[
              { value: 'today', label: 'Today · 00:00–Current' },
              { value: '1h', label: 'Past 1 hour' },
              { value: '24h', label: 'Past 24 hours' },
            ]}
          />
        </div>

        {/* Alerts Table */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted">Loading alerts...</div>
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            title="No open alerts. All zones are within limits."
            description="There are currently no unresolved surge or barrier events recorded for this selection."
            icon={<IconCheck size={28} className="text-[#2FA866]" />}
          />
        ) : (
          <div className="overflow-hidden border border-border/70 rounded-panel mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time · IST</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert, index) => {
                  const isOpen = alert.status === 'open';
                  const isFirstOpen = isOpen && index === 0;

                  return (
                    <TableRow
                      key={alert.id}
                      isRedAlert={isFirstOpen && alert.level === 'red'}
                      clickable
                      onClick={() => setDrawerAlert(alert)}
                    >
                      <TableCell className="font-mono text-xs text-muted">
                        {new Date(alert.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="font-semibold text-text">
                        {alert.zone_name || `Zone ${alert.zone_id}`}
                      </TableCell>
                      <TableCell>
                        <Chip
                          level={alert.level}
                          size="sm"
                          label={
                            alert.level === 'red'
                              ? 'High crowd'
                              : alert.level === 'yellow'
                              ? 'Moderate crowd'
                              : 'Device unavailable'
                          }
                        />
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-xs font-medium text-text leading-snug">{alert.msg}</p>
                      </TableCell>
                      <TableCell>
                        {isOpen ? (
                          <span className="text-xs font-bold text-status-yellow">Open</span>
                        ) : (
                          <span className="text-xs font-medium text-muted">Acknowledged</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isOpen ? (
                          role !== 'viewer' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => handleAcknowledge(alert.id, e)}
                            >
                              Acknowledge
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerAlert(alert);
                              }}
                            >
                              Inspect
                            </Button>
                          )
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawerAlert(alert);
                            }}
                          >
                            View report
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Side Event Drawer */}
      <Drawer
        isOpen={!!drawerAlert}
        onClose={() => setDrawerAlert(null)}
        title="Event details"
        subtitle={drawerAlert ? `AL-0${drawerAlert.id} · ${new Date(drawerAlert.ts).toLocaleString()}` : ''}
        width="lg"
      >
        {drawerAlert && (
          <div className="space-y-6 select-none">
            {/* Title & Level Chip */}
            <div>
              <h3 className="text-lg font-bold text-text">{drawerAlert.msg}</h3>
              <div className="flex items-center gap-3 mt-2">
                <Chip
                  level={drawerAlert.level}
                  label={drawerAlert.level === 'red' ? 'High crowd' : 'Moderate crowd'}
                />
                <span className="text-xs text-muted">
                  {drawerAlert.status === 'open' ? 'Open · Not acknowledged' : 'Acknowledged'}
                </span>
              </div>
            </div>

            {/* Sensor Reading */}
            <Card className="p-4 bg-bg border-border">
              <span className="text-xs text-muted block">Current sensor reading · CAM-0{drawerAlert.zone_id}</span>
              <div className="text-2xl font-bold text-text mt-1 tabular-nums">
                1,248 / 1,500 · 83%
              </div>
              <span className="text-[11px] text-muted">Camera estimate · Real-time update</span>
            </Card>

            {/* Density Graph Around Event */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Density around event
                </h4>
                <span className="text-[11px] text-status-red font-medium">80% High crowd threshold</span>
              </div>
              <div className="h-44 bg-bg border border-border rounded-panel p-3 relative flex items-center justify-center">
                <svg viewBox="0 0 400 120" className="w-full h-full">
                  {/* Threshold Guide line */}
                  <line x1="20" y1="35" x2="380" y2="35" stroke="#D93C3C" strokeDasharray="4 4" strokeWidth="1.5" />
                  <text x="25" y="30" fill="#D93C3C" fontSize="10">80% threshold</text>
                  
                  {/* Curve surging into red */}
                  <path
                    d="M 20 85 Q 120 75 220 55 T 320 28 L 380 26"
                    fill="none"
                    stroke="#E8962E"
                    strokeWidth="2.5"
                  />

                  {/* Vertical event marker line */}
                  <line x1="320" y1="10" x2="320" y2="105" stroke="#E8E6DF" strokeWidth="1.5" strokeDasharray="2 2" />
                  <circle cx="320" cy="28" r="4" fill="#D93C3C" stroke="#E8E6DF" strokeWidth="1.5" />
                  <text x="300" y="115" fill="#98A0AE" fontSize="10">10:23 event</text>
                </svg>
              </div>
            </div>

            {/* Saved Clip CCTV wireframe thumbnail */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Saved clip (Schematic corridor)
              </h4>
              <div className="h-36 bg-bg border border-border rounded-panel relative flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 300 100" className="w-full h-full stroke-muted/40 fill-none">
                  {/* Wireframe corridor */}
                  <polygon points="20 10, 280 10, 210 30, 90 30" />
                  <polygon points="20 90, 280 90, 210 70, 90 70" />
                  <line x1="20" y1="10" x2="90" y2="30" />
                  <line x1="280" y1="10" x2="210" y2="30" />
                  <line x1="20" y1="90" x2="90" y2="70" />
                  <line x1="280" y1="90" x2="210" y2="70" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-accent text-bg flex items-center justify-center shadow-lg">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                </div>
                <span className="absolute bottom-2 right-3 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                  30 s clip
                </span>
              </div>
            </div>

            {/* Owner assignment & Action */}
            <div className="pt-4 border-t border-border space-y-4">
              <Select
                label="Assignee"
                defaultValue="S. Patel / MG-02"
                options={[
                  { value: 'S. Patel / MG-02', label: 'S. Patel / MG-02 (Main Gate Team)' },
                  { value: 'R. Mehta / SC-01', label: 'R. Mehta / SC-01 (Sanctum Patrol)' },
                  { value: 'Device team', label: 'Device Team / Network Support' },
                ]}
              />

              {drawerAlert.status === 'open' ? (
                role !== 'viewer' ? (
                  <Button
                    variant="primary"
                    className="w-full h-11"
                    onClick={() => handleAcknowledge(drawerAlert.id)}
                  >
                    Acknowledge
                  </Button>
                ) : (
                  <div className="p-3 bg-bg border border-border text-muted text-xs font-medium rounded-control text-center">
                    Read-only observer mode (Acknowledgement requires operator or admin role)
                  </div>
                )
              ) : (
                <div className="p-3 bg-[#2FA866]/10 border border-[#2FA866]/30 text-[#2FA866] text-xs font-semibold rounded-control text-center">
                  Alert has been acknowledged by duty operator.
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
