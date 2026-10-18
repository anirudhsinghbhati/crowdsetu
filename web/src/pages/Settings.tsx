import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import {
  Card,
  Tabs,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  Input,
  Select,
} from '../components/ui';


interface ZoneThresholdDraft {
  yellow_pct: number;
  red_pct: number;
}

export const Settings: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'thresholds' | 'zones' | 'users'>('thresholds');
  const [drafts, setDrafts] = useState<Record<number, ZoneThresholdDraft>>({});
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'operator' | 'viewer'>('operator');

  // Fetch zones
  const { data: zones, refetch } = useQuery({
    queryKey: ['zones'],
    queryFn: () => api.zones.list(),
  });

  const hasUnsavedChanges = Object.keys(drafts).length > 0;

  const handleSliderChange = (zoneId: number, field: 'yellow_pct' | 'red_pct', value: number) => {
    const currentZone = zones?.find((z) => z.id === zoneId);
    if (!currentZone) return;

    setDrafts((prev) => ({
      ...prev,
      [zoneId]: {
        yellow_pct: field === 'yellow_pct' ? value : prev[zoneId]?.yellow_pct ?? currentZone.yellow_pct ?? 50,
        red_pct: field === 'red_pct' ? value : prev[zoneId]?.red_pct ?? currentZone.red_pct ?? 80,
      },
    }));
  };

  const handleDiscard = () => {
    setDrafts({});
    showToast('Unsaved changes discarded', 'info');
  };

  const handleSave = async () => {
    try {
      for (const [zoneIdStr, draft] of Object.entries(drafts)) {
        await api.zones.updateThresholds(parseInt(zoneIdStr, 10), draft.yellow_pct, draft.red_pct);
      }
      setDrafts({});
      await refetch();
      showToast('Threshold changes saved successfully', 'success');
    } catch {
      showToast('Failed to save threshold changes', 'error');
    }
  };

  return (
    <div className="space-y-6 select-none pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Settings</h1>
        <p className="text-xs text-muted mt-1">
          Site configuration · Changes apply only after you save.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as 'thresholds' | 'zones' | 'users')}
        tabs={[
          { id: 'thresholds', label: 'Thresholds' },
          { id: 'zones', label: 'Zones' },
          { id: 'users', label: 'Users' },
        ]}
      />

      {/* TAB 1: THRESHOLDS */}
      {activeTab === 'thresholds' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/80">
              <div>
                <h3 className="text-sm font-semibold text-text">Occupancy thresholds</h3>
                <p className="text-xs text-muted">
                  Per-zone capacity · Percent of capacity triggering warning and critical states.
                </p>
              </div>
              <span className="text-xs text-muted">Per-zone capacity · Percent of capacity</span>
            </div>

            <div className="space-y-6">
              {zones?.map((zone) => {
                const yellowVal = drafts[zone.id]?.yellow_pct ?? zone.yellow_pct ?? 50;
                const redVal = drafts[zone.id]?.red_pct ?? zone.red_pct ?? 80;
                const isEdited = drafts[zone.id] !== undefined;

                return (
                  <div
                    key={zone.id}
                    className={`p-4 rounded-panel border transition-colors ${
                      isEdited ? 'border-accent bg-accent/5' : 'border-border/70 bg-bg/50'
                    }`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* Zone Name & Capacity */}
                      <div className="lg:col-span-3">
                        <h4 className="text-sm font-bold text-text">{zone.name}</h4>
                        <span className="text-xs text-muted">Capacity {zone.capacity}</span>
                        {isEdited && (
                          <span className="text-[10px] text-accent font-semibold block mt-1">
                            Unsaved edits
                          </span>
                        )}
                      </div>

                      {/* Yellow at % Slider */}
                      <div className="lg:col-span-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-status-yellow font-medium">Yellow at %</span>
                          <span className="font-bold tabular-nums text-text">{yellowVal}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="80"
                          value={yellowVal}
                          onChange={(e) =>
                            handleSliderChange(zone.id, 'yellow_pct', parseInt(e.target.value, 10))
                          }
                          className="w-full accent-status-yellow cursor-pointer"
                        />
                      </div>

                      {/* Red at % Slider */}
                      <div className="lg:col-span-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-status-red font-medium">Red at %</span>
                          <span className="font-bold tabular-nums text-text">{redVal}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="95"
                          value={redVal}
                          onChange={(e) =>
                            handleSliderChange(zone.id, 'red_pct', parseInt(e.target.value, 10))
                          }
                          className="w-full accent-status-red cursor-pointer"
                        />
                      </div>

                      {/* Live Preview Bar */}
                      <div className="lg:col-span-3 space-y-1.5">
                        <span className="text-[11px] text-muted block">Live preview</span>
                        <div className="h-3 w-full rounded-full overflow-hidden flex bg-border">
                          <div style={{ width: `${yellowVal}%` }} className="bg-[#2FA866] h-full" />
                          <div
                            style={{ width: `${redVal - yellowVal}%` }}
                            className="bg-[#E5B91F] h-full"
                          />
                          <div style={{ width: `${100 - redVal}%` }} className="bg-[#D93C3C] h-full" />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted">
                          <span>Low &lt;{yellowVal}%</span>
                          <span>Moderate {yellowVal}–{redVal}%</span>
                          <span>High ≥{redVal}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: ZONES */}
      {activeTab === 'zones' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <span className="text-xs text-muted block">Configured zones</span>
              <div className="text-3xl font-bold text-text mt-2">4</div>
              <span className="text-[11px] text-muted">Sector A · All zones enabled</span>
            </Card>
            <Card className="p-5">
              <span className="text-xs text-muted block">Configured capacity</span>
              <div className="text-3xl font-bold text-text mt-2">4,100</div>
              <span className="text-[11px] text-muted">Sum of zone limits</span>
            </Card>
            <Card className="p-5">
              <span className="text-xs text-muted block">Reporting sources</span>
              <div className="text-3xl font-bold text-[#2FA866] mt-2">3 / 4</div>
              <span className="text-[11px] text-muted">Exit Lane requires attention</span>
            </Card>
          </div>

          <Card>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">Configured zones</h3>
              <span className="text-xs text-muted">Saved configuration · No pending changes</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone name</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Assigned source devices</TableHead>
                  <TableHead>Gate displays</TableHead>
                  <TableHead>Source availability</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones?.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell className="font-semibold text-text">{z.name}</TableCell>
                    <TableCell>{z.capacity.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs text-muted">
                      CAM-0{z.id} · QR-0{z.id}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted">
                      DSP-0{z.id}
                    </TableCell>
                    <TableCell>
                      {z.level === 'grey' ? (
                        <span className="text-xs text-status-grey font-medium">Offline · CAM-04</span>
                      ) : (
                        <span className="text-xs text-[#2FA866] font-medium">Reporting · CAM-0{z.id}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => showToast(`Zone configuration editor for ${z.name}`, 'info')}
                      >
                        Edit zone
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 3: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <span className="text-xs text-muted block">Active users</span>
              <div className="text-3xl font-bold text-text mt-2">5</div>
              <span className="text-[11px] text-muted">All assigned to Sector A</span>
            </Card>
            <Card className="p-5">
              <span className="text-xs text-muted block">Admins</span>
              <div className="text-3xl font-bold text-text mt-2">2</div>
              <span className="text-[11px] text-muted">Site configuration and access</span>
            </Card>
            <Card className="p-5">
              <span className="text-xs text-muted block">Operators / Viewers</span>
              <div className="text-3xl font-bold text-text mt-2">2 / 1</div>
              <span className="text-[11px] text-muted">Operational response / Read-only access</span>
            </Card>
          </div>

          <Card>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text">Site users</h3>
                <span className="text-xs text-muted">5 users · Saved access assignments</span>
              </div>
              <Button variant="primary" size="sm" onClick={() => setIsAddUserOpen(true)}>
                Add user
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Last login · IST</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: 'A. Shah', email: 'a.shah@crowdsetu.example', role: 'Admin', access: 'Active · Current', last: 'Today · 10:45' },
                  { name: 'P. Joshi', email: 'p.joshi@crowdsetu.example', role: 'Admin', access: 'Active', last: 'Yesterday · 14:02' },
                  { name: 'R. Mehta', email: 'r.mehta@crowdsetu.example', role: 'Operator', access: 'Active', last: 'Today · 08:30' },
                  { name: 'S. Patel', email: 's.patel@crowdsetu.example', role: 'Operator', access: 'Active', last: 'Today · 06:04' },
                  { name: 'N. Desai', email: 'n.desai@crowdsetu.example', role: 'Viewer', access: 'Active', last: 'Yesterday · 09:12' },
                ].map((u, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-semibold text-text">{u.name}</TableCell>
                    <TableCell className="text-muted font-mono text-xs">{u.email}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-control text-xs font-semibold bg-bg border border-border">
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[#2FA866]">{u.access}</TableCell>
                    <TableCell className="text-xs text-muted font-mono">{u.last}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => showToast(`Edit permissions for ${u.name}`, 'info')}
                      >
                        Edit user
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Sticky Save Changes Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-panel border-t border-accent/60 shadow-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3 pl-4">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
            <span className="text-sm font-semibold text-text">
              {Object.keys(drafts).length} unsaved change(s) pending application
            </span>
          </div>
          <div className="flex items-center gap-3 pr-4">
            <Button variant="secondary" onClick={handleDiscard}>
              Discard
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save changes
            </Button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Add control-room user"
        description="Configure access role for staff member."
      >
        <div className="space-y-4">
          <Input
            label="Full name"
            placeholder="e.g. Vikram Trivedi"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <Select
            label="Role"
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'operator' | 'viewer')}
            options={[
              { value: 'operator', label: 'Operator (Monitor, Acknowledge, Override)' },
              { value: 'viewer', label: 'Viewer (Read-only observer)' },
              { value: 'admin', label: 'Admin (Full access, Settings & Users)' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                showToast(`User ${newUserName || 'New staff'} invited`, 'success');
                setIsAddUserOpen(false);
                setNewUserName('');
              }}
            >
              Add user
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
