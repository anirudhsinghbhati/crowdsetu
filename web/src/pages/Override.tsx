import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import {
  Card,
  Chip,
  Button,
  Input,
  Select,
  Modal,
} from '../components/ui';
import { IconAlertTriangle } from '../components/ui/icons';


export const Override: React.FC = () => {
  const { showToast } = useToast();
  const [selectedZoneId, setSelectedZoneId] = useState<number>(1); // Default Main Gate
  const [statusLevel, setStatusLevel] = useState<'green' | 'yellow' | 'red'>('red');
  const [msgEn, setMsgEn] = useState<string>('High crowd. Follow staff guidance. Do not rush.');
  const [msgHi, setMsgHi] = useState<string>('भीड़ अधिक है। कर्मचारियों के निर्देशों का पालन करें। जल्दबाजी न करें।');
  const [msgGu, setMsgGu] = useState<string>('ભીડ વધારે છે. કર્મચારીઓની સૂચનાઓનું પાલન કરો. ઉતાવળ ન કરો.');
  const [duration, setDuration] = useState<string>('15');
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch zones list
  const { data: zones, refetch } = useQuery({
    queryKey: ['zones'],
    queryFn: () => api.zones.list(),
  });

  const selectedZone = useMemo(() => {
    return zones?.find((z) => z.id === selectedZoneId) || zones?.[0] || null;
  }, [zones, selectedZoneId]);

  // Active override check
  const activeOverrideZone = useMemo(() => {
    return zones?.find((z) => !!z.override) || null;
  }, [zones]);

  const handleApplyOverride = async () => {
    if (!selectedZone) return;
    setIsSubmitting(true);
    try {
      await api.zones.override(selectedZone.id, {
        level: statusLevel,
        message: { en: msgEn, hi: msgHi, gu: msgGu },
        duration_min: parseInt(duration, 10),
      });
      await refetch();
      setIsConfirmOpen(false);
      showToast(`Override applied to ${selectedZone.name}`, 'success');
    } catch {
      showToast('Failed to apply override', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOverride = async (zoneId: number) => {
    try {
      await api.zones.cancelOverride(zoneId);
      await refetch();
      showToast('Manual override cancelled. Automatic sensor estimates restored.', 'info');
    } catch {
      showToast('Failed to cancel override', 'error');
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Manual override</h1>
        <p className="text-xs text-muted mt-1">
          Control gate guidance for a selected zone without changing sensor estimates.
        </p>
      </div>

      {/* Active Override Banner */}
      {activeOverrideZone && (
        <div className="p-4 rounded-panel bg-panel border-l-4 border-l-status-red border-y border-r border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-control bg-status-red/10 text-status-red flex items-center justify-center shrink-0 mt-0.5">
              <IconAlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text">
                Active override · {activeOverrideZone.name} · Red / High crowd
              </h4>
              <p className="text-xs text-muted mt-0.5">
                Applied by duty officer · Gate guidance is manually controlled; sensor estimate remains{' '}
                {activeOverrideZone.count.toLocaleString()} / {activeOverrideZone.capacity.toLocaleString()} (
                {Math.round((activeOverrideZone.count / activeOverrideZone.capacity) * 100)}%).
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCancelOverride(activeOverrideZone.id)}
          >
            Cancel override
          </Button>
        </div>
      )}

      {/* Main Grid: Zones Selector on Left, Form & Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Zone Selection */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
            Zones
          </span>
          {zones?.map((z) => {
            const isSelected = z.id === selectedZoneId;
            const hasOverride = !!z.override;

            return (
              <Card
                key={z.id}
                className={`p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-accent bg-panel shadow-md'
                    : 'border-border/80 hover:border-border hover:bg-border/10'
                }`}
                onClick={() => setSelectedZoneId(z.id)}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text">{z.name}</h4>
                  {hasOverride ? (
                    <Chip level="red" size="sm" label="Override" />
                  ) : (
                    <Chip level={z.level} size="sm" />
                  )}
                </div>
                <p className="text-xs text-muted mt-2">
                  {hasOverride ? 'Active manual override' : 'Automatic · Sensor estimates'}
                </p>
                <span className="text-xs text-text font-mono mt-0.5 block tabular-nums">
                  {z.count.toLocaleString()} / {z.capacity.toLocaleString()} ·{' '}
                  {Math.round((z.count / z.capacity) * 100)}%
                </span>
              </Card>
            );
          })}
        </div>

        {/* Right 2 Cols: Form and Live Preview */}
        {selectedZone && (
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-6">
              {/* Zone Header and Sensor Reading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
                <div>
                  <h2 className="text-lg font-bold text-text">{selectedZone.name}</h2>
                  <p className="text-xs text-muted">
                    Sensor reading · CAM-0{selectedZone.id}: {selectedZone.count.toLocaleString()} /{' '}
                    {selectedZone.capacity.toLocaleString()} ({Math.round((selectedZone.count / selectedZone.capacity) * 100)}%)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Current status:</span>
                  <Chip level={selectedZone.level} />
                </div>
              </div>

              {/* Status Segmented Control */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted block uppercase tracking-wider">
                  Set status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusLevel('green');
                      setMsgEn('Open. Please proceed.');
                      setMsgHi('खुला है। कृपया आगे बढ़ें।');
                      setMsgGu('ખુલ્લું છે. કૃપા કરીને આગળ વધો.');
                    }}
                    className={`py-2 px-3 rounded-control text-xs font-bold border transition-colors ${
                      statusLevel === 'green'
                        ? 'bg-[#2FA866]/20 border-[#2FA866] text-[#2FA866]'
                        : 'bg-bg border-border text-muted hover:text-text'
                    }`}
                  >
                    Green · Low crowd
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusLevel('yellow');
                      setMsgEn('Busy. Move slowly.');
                      setMsgHi('व्यस्त है। धीरे चलें।');
                      setMsgGu('ભીડ છે. ધીમે ચાલો.');
                    }}
                    className={`py-2 px-3 rounded-control text-xs font-bold border transition-colors ${
                      statusLevel === 'yellow'
                        ? 'bg-[#E5B91F]/20 border-[#E5B91F] text-[#E5B91F]'
                        : 'bg-bg border-border text-muted hover:text-text'
                    }`}
                  >
                    Yellow · Moderate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusLevel('red');
                      setMsgEn('High crowd. Follow staff guidance. Do not rush.');
                      setMsgHi('भीड़ अधिक है। कर्मचारियों के निर्देशों का पालन करें। जल्दबाजी न करें।');
                      setMsgGu('ભીડ વધારે છે. કર્મચારીઓની સૂચનાઓનું પાલન કરો. ઉતાવળ ન કરો.');
                    }}
                    className={`py-2 px-3 rounded-control text-xs font-bold border transition-colors ${
                      statusLevel === 'red'
                        ? 'bg-[#D93C3C]/20 border-[#D93C3C] text-[#D93C3C]'
                        : 'bg-bg border-border text-muted hover:text-text'
                    }`}
                  >
                    Red · High crowd
                  </button>
                </div>
              </div>

              {/* Custom Messages in EN, HI, GU */}
              <div className="space-y-4 pt-2">
                <Input
                  label="Custom message · English"
                  value={msgEn}
                  onChange={(e) => setMsgEn(e.target.value)}
                />
                <Input
                  label="Custom message · Hindi (हिन्दी)"
                  value={msgHi}
                  onChange={(e) => setMsgHi(e.target.value)}
                />
                <Input
                  label="Custom message · Gujarati (ગુજરાતી)"
                  value={msgGu}
                  onChange={(e) => setMsgGu(e.target.value)}
                />
              </div>

              {/* Duration Dropdown */}
              <div className="w-full sm:w-60">
                <Select
                  label="Duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  options={[
                    { value: '15', label: '15 minutes' },
                    { value: '60', label: '1 hour' },
                    { value: '240', label: 'Until cancelled' },
                  ]}
                />
              </div>

              {/* Live Preview on Gate Display Card */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">
                  Preview on gate display
                </span>
                <div
                  className={`p-6 rounded-panel border text-center transition-colors ${
                    statusLevel === 'red'
                      ? 'bg-[#D93C3C] text-white border-white/20'
                      : statusLevel === 'yellow'
                      ? 'bg-[#E5B91F] text-[#14181F] border-black/20'
                      : 'bg-[#2FA866] text-white border-white/20'
                  }`}
                >
                  <h3 className="text-2xl font-black">{msgEn}</h3>
                  <p className="text-base font-bold mt-2 opacity-90">{msgHi}</p>
                  <p className="text-sm font-semibold mt-1 opacity-90">{msgGu}</p>
                  <span className="text-[10px] uppercase font-mono tracking-wider block mt-4 opacity-75">
                    Manual Guidance · For {duration} min
                  </span>
                </div>
              </div>

              {/* Apply Action Button */}
              <div className="pt-4 border-t border-border flex justify-end">
                <Button
                  variant="danger"
                  className="h-11 px-6 font-semibold"
                  onClick={() => setIsConfirmOpen(true)}
                >
                  Apply override
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={`Apply override to ${selectedZone?.name}?`}
        description="This replaces the active guidance on public gate signage. Staff must verify message accuracy."
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-bg border border-border rounded-panel space-y-2">
            <div className="flex items-center gap-2">
              <Chip level={statusLevel} label={`Red · High crowd - ${duration} min`} />
              <span className="text-muted">Starts on apply</span>
            </div>
            <p className="text-sm font-semibold text-text mt-2">{msgEn}</p>
            <p className="text-xs text-muted">{msgHi}</p>
            <p className="text-xs text-muted">{msgGu}</p>
          </div>

          <div className="p-3 bg-status-yellow/10 border border-status-yellow/30 text-status-yellow rounded-control">
            <strong>Sensor reading stays unchanged:</strong> Actual count ({selectedZone?.count} people)
            remains visible to staff.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting}>
              Keep current override
            </Button>
            <Button variant="primary" onClick={handleApplyOverride} loading={isSubmitting}>
              Confirm override
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
