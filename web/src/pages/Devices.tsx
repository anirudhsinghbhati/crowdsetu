import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useLiveStore } from '../store/live';
import { useToast } from '../components/ui/Toast';
import {
  Card,
  Input,
  Select,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  EmptyState,
} from '../components/ui';
import {
  IconSearch,
  IconAlertTriangle,
} from '../components/ui/icons';
import type { Device } from '../api/types';

export const Devices: React.FC = () => {
  const { showToast } = useToast();
  const liveDeviceStatuses = useLiveStore((state) => state.deviceStatuses);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedHealth, setSelectedHealth] = useState<string>('all');
  const [detailDevice, setDetailDevice] = useState<Device | null>(null);

  // Fetch baseline devices
  const { data: restDevices, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.devices.list(),
  });

  // Merge live status from Zustand
  const devices: Device[] = useMemo(() => {
    if (!restDevices) return [];
    return restDevices.map((d) => {
      const liveStatus = liveDeviceStatuses[d.id];
      return {
        ...d,
        status: liveStatus || d.status,
      };
    });
  }, [restDevices, liveDeviceStatuses]);

  // Compute counts
  const onlineCount = useMemo(() => devices.filter((d) => d.status === 'online').length, [devices]);
  const offlineCount = useMemo(() => devices.filter((d) => d.status === 'offline').length, [devices]);
  const degradedCount = useMemo(() => devices.filter((d) => d.status === 'degraded').length, [devices]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((dev) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = dev.name.toLowerCase().includes(query);
        const matchZone = dev.zone_name?.toLowerCase().includes(query);
        if (!matchName && !matchZone) return false;
      }

      if (selectedType !== 'all' && dev.type !== selectedType) return false;
      if (selectedHealth !== 'all' && dev.status !== selectedHealth) return false;

      return true;
    });
  }, [devices, searchQuery, selectedType, selectedHealth]);

  return (
    <div className="space-y-6 select-none">
      {/* Header and Add Device Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Devices</h1>
          <p className="text-xs text-muted mt-1">
            {devices.length} configured devices · {onlineCount + degradedCount}/{devices.length} reporting · Last checked real-time IST.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => showToast('Device discovery wizard opening...', 'info')}
        >
          Add device
        </Button>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <span className="text-xs font-medium text-muted block">Online</span>
          <div className="text-3xl font-bold text-text mt-2 tabular-nums">{onlineCount}</div>
          <span className="text-[11px] text-muted mt-1 block">Receiving updates normally</span>
        </Card>

        <Card className="p-5 border-status-grey/40">
          <span className="text-xs font-medium text-muted block">Offline</span>
          <div className="text-3xl font-bold text-status-grey mt-2 tabular-nums">{offlineCount}</div>
          <span className="text-[11px] text-muted mt-1 block">CAM-04 · Exit Lane · Last seen 12 min ago</span>
        </Card>

        <Card className="p-5 border-status-yellow/40">
          <span className="text-xs font-medium text-muted block">Degraded</span>
          <div className="text-3xl font-bold text-status-yellow mt-2 tabular-nums">{degradedCount}</div>
          <span className="text-[11px] text-muted mt-1 block">CAM-GA-02 · Weak signal, still reporting</span>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Search devices"
            placeholder="Name or device ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<IconSearch size={15} />}
          />

          <Select
            label="Type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            options={[
              { value: 'all', label: 'All types (Camera, Scanner, Display)' },
              { value: 'camera', label: 'Cameras only' },
              { value: 'scanner', label: 'QR Scanners only' },
              { value: 'display', label: 'Displays only' },
            ]}
          />

          <Select
            label="Health"
            value={selectedHealth}
            onChange={(e) => setSelectedHealth(e.target.value)}
            options={[
              { value: 'all', label: 'All statuses (Online, Offline, Degraded)' },
              { value: 'online', label: 'Online' },
              { value: 'offline', label: 'Offline' },
              { value: 'degraded', label: 'Degraded' },
            ]}
          />
        </div>

        {/* Table / Empty State */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted">Loading device telemetry...</div>
        ) : filteredDevices.length === 0 ? (
          <EmptyState
            title="No devices configured"
            description="Add a camera, QR scanner or display, then assign it to a zone. Device health and last-seen timestamps will appear after the first update."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                  setSelectedHealth('all');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto border border-border/80 rounded-panel mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last seen · IST</TableHead>
                  <TableHead>Battery / Signal</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((dev) => {
                  const isOffline = dev.status === 'offline';

                  return (
                    <TableRow key={dev.id} isOffline={isOffline}>
                      <TableCell className="font-semibold text-text">{dev.name}</TableCell>
                      <TableCell className="capitalize text-muted">{dev.type}</TableCell>
                      <TableCell>{dev.zone_name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              dev.status === 'online'
                                ? 'bg-[#2FA866]'
                                : dev.status === 'degraded'
                                ? 'bg-[#E5B91F]'
                                : 'bg-[#7A8190]'
                            }`}
                          />
                          <span
                            className={`text-xs font-semibold capitalize ${
                              dev.status === 'online'
                                ? 'text-text'
                                : dev.status === 'degraded'
                                ? 'text-status-yellow'
                                : 'text-status-grey'
                            }`}
                          >
                            {dev.status}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted">{dev.last_seen}</TableCell>
                      <TableCell className="text-xs tabular-nums text-muted">
                        {dev.battery !== undefined
                          ? `${dev.battery}% · Battery`
                          : dev.signal !== undefined
                          ? dev.signal > 0
                            ? `${dev.signal}% signal`
                            : 'No signal'
                          : 'Wired'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setDetailDevice(dev)}
                        >
                          View details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Offline Alert Banner */}
      <div className="p-4 rounded-panel bg-panel border border-border flex items-center gap-3">
        <IconAlertTriangle size={18} className="text-status-yellow shrink-0" />
        <div>
          <h5 className="text-xs font-semibold text-text">CAM-04 is not reporting</h5>
          <p className="text-[11px] text-muted mt-0.5">
            Updates stopped at 10:22:18 IST. Check power and network at Exit Lane; request a manual count while the camera is unavailable. DSP-02 is still reporting with weak signal.
          </p>
        </div>
      </div>

      {/* Device Details Modal */}
      {detailDevice && (
        <Modal
          isOpen={!!detailDevice}
          onClose={() => setDetailDevice(null)}
          title={`${detailDevice.name} — Technical Details`}
          description={`Assigned to ${detailDevice.zone_name} · Type: ${detailDevice.type}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-bg border border-border rounded-panel">
              <div>
                <span className="text-muted block">Status</span>
                <span className="text-sm font-bold capitalize text-text">{detailDevice.status}</span>
              </div>
              <div>
                <span className="text-muted block">Last Seen</span>
                <span className="text-sm font-mono text-text">{detailDevice.last_seen}</span>
              </div>
              <div>
                <span className="text-muted block">IP Address</span>
                <span className="text-sm font-mono text-text">192.168.1.{100 + detailDevice.id}</span>
              </div>
              <div>
                <span className="text-muted block">Firmware</span>
                <span className="text-sm font-mono text-text">v2.4.1-rc3</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="secondary" onClick={() => setDetailDevice(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  showToast(`Ping packet sent to ${detailDevice.name}`, 'success');
                  setDetailDevice(null);
                }}
              >
                Ping device
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
