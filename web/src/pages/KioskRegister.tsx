import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { useKiosk } from '../context/KioskContext';
import { getTranslation } from '../i18n';
import {
  Card,
  Button,
  Input,
  Select,
  Stepper,
} from '../components/ui';
import { IconQrCode, IconPrinter } from '../components/ui/icons';
import { QRCodeSVG } from 'qrcode.react';

export const KioskRegister: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { language } = useKiosk();
  const t = getTranslation(language).kiosk;

  const [leadName, setLeadName] = useState<string>('M. Desai');
  const [mobileOptional, setMobileOptional] = useState<string>('');
  const [partySize, setPartySize] = useState<number>(4);
  const [selectedGate, setSelectedGate] = useState<string>('Ghat Approach');
  const [guidanceLanguage, setGuidanceLanguage] = useState<string>('Gujarati');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Last issued demo token for quick access
  const lastIssuedToken = {
    token: 'CS-10482',
    sig: '8f9c1a7d',
    group_size: 3,
    gate: 'Ghat Approach',
  };

  const handleIssueQR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.pilgrims.register({
        group_size: partySize,
        gate: selectedGate,
        name: leadName || undefined,
      });
      showToast(t.tokenIssued, 'success');
      navigate(`/kiosk/token/${res.token}`);
    } catch {
      showToast('Registration failed. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">{t.title}</h1>
          <p className="text-xs text-muted mt-0.5">
            Pilgrimage site · Sector A · 10:24 IST · Desk RD-02
          </p>
        </div>
        <span className="text-xs font-mono text-muted bg-panel px-3 py-1.5 rounded-control border border-border">
          Shift A · 42 groups issued
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <form onSubmit={handleIssueQR} className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-6">
            <h2 className="text-sm font-semibold text-text">Group details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Group lead name"
                placeholder="e.g. M. Desai"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
              />
              <Input
                label="Mobile number (optional)"
                placeholder="Not provided"
                value={mobileOptional}
                onChange={(e) => setMobileOptional(e.target.value)}
                helperText="No phone is required to receive a printed QR."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              <Stepper
                value={partySize}
                onChange={setPartySize}
                label={`${t.groupSize} (include children & adults)`}
              />
              <Select
                label="Guidance language"
                value={guidanceLanguage}
                onChange={(e) => setGuidanceLanguage(e.target.value)}
                options={[
                  { value: 'Gujarati', label: 'Gujarati / ગુજરાતી' },
                  { value: 'Hindi', label: 'Hindi / हिन्दी' },
                  { value: 'English', label: 'English' },
                ]}
              />
            </div>

            {/* Gate and Slot Selection */}
            <div className="pt-4 border-t border-border/80 space-y-4">
              <h3 className="text-sm font-semibold text-text">Gate and slot assignment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label={t.selectGate}
                  value={selectedGate}
                  onChange={(e) => setSelectedGate(e.target.value)}
                  options={[
                    { value: 'Ghat Approach', label: 'Ghat Approach (Recommended)' },
                    { value: 'Main Gate', label: 'Main Gate (Metered)' },
                    { value: 'Sanctum Corridor', label: 'Sanctum Direct Entry' },
                  ]}
                />
                <Select
                  label="Entry slot · IST"
                  defaultValue="10:30–10:45"
                  options={[
                    { value: '10:30–10:45', label: '10:30–10:45 IST' },
                    { value: '10:45–11:00', label: '10:45–11:00 IST' },
                    { value: '11:00–11:15', label: '11:00–11:15 IST' },
                  ]}
                />
              </div>

              {/* Metering Guidance Alert */}
              <div className="p-3 bg-status-yellow/10 border border-status-yellow/30 text-xs rounded-control text-status-yellow">
                Main Gate is metered. Use Ghat Approach for new arrivals. Confirm the route with the group before issuing.
              </div>
            </div>

            {/* Privacy Note */}
            <p className="text-xs text-muted flex items-center gap-1.5 pt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FA866]" />
              {t.noIdNote}
            </p>

            {/* Issue QR Submit Button (Min 56px touch target) */}
            <Button
              type="submit"
              variant="primary"
              size="kiosk"
              className="w-full text-lg font-bold shadow-lg"
              loading={isSubmitting}
              icon={<IconQrCode size={22} />}
            >
              {t.issueQr}
            </Button>
          </Card>
        </form>

        {/* Right Col: Summary & Last Issued QR */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text">Confirm before issuing</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted">Party size</span>
                <span className="font-bold text-text tabular-nums">{partySize} people</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted">Entry gate</span>
                <span className="font-bold text-text">{selectedGate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted">Entry slot</span>
                <span className="font-bold text-text font-mono">10:30–10:45 IST</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted">Language</span>
                <span className="font-bold text-text">{guidanceLanguage}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Delivery</span>
                <span className="font-bold text-accent">Printed QR Slip (58mm)</span>
              </div>
            </div>
            <p className="text-[11px] text-muted">
              Tell the group to arrive during the assigned slot and stay together at the gate.
            </p>
          </Card>

          {/* Last Issued QR */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-text uppercase tracking-wider">
                Last issued QR
              </h4>
              <span className="text-[10px] text-[#2FA866] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2FA866]" />
                Printed · 10:22
              </span>
            </div>

            <div className="flex items-center gap-4 p-3 bg-bg border border-border rounded-control">
              <div className="p-1 bg-white rounded">
                <QRCodeSVG value={`${lastIssuedToken.token}.${lastIssuedToken.sig}`} size={64} />
              </div>
              <div>
                <span className="text-sm font-bold font-mono text-text block">
                  {lastIssuedToken.token}
                </span>
                <span className="text-xs text-muted block">
                  {lastIssuedToken.group_size} people · {lastIssuedToken.gate}
                </span>
                <span className="text-[10px] text-muted font-mono">10:30–10:45 IST</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs"
              icon={<IconPrinter size={14} />}
              onClick={() => navigate(`/kiosk/token/${lastIssuedToken.token}`)}
            >
              Reprint slip
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
