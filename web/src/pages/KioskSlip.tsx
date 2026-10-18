import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { Card, Button, Skeleton } from '../components/ui';
import { IconPrinter, IconAlertTriangle } from '../components/ui/icons';

export const KioskSlip: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [printError, setPrintError] = useState<string | null>(null);

  const tokenParam = id || 'TK-7842';

  // Fetch token details
  const { data: pilgrim, isLoading, error } = useQuery({
    queryKey: ['pilgrim-token', tokenParam],
    queryFn: () => api.pilgrims.lookup(tokenParam),
    retry: 1,
  });

  const handlePrint = () => {
    try {
      setPrintError(null);
      window.print();
      showToast('Print command sent to thermal receipt printer', 'success');
    } catch {
      setPrintError('Thermal printer not responding. Check paper roll and USB connection.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto p-8 space-y-4 text-center">
        <Skeleton className="h-80 w-64 mx-auto" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Fallback demo data if not yet registered in memory
  const tokenData = pilgrim || {
    token: tokenParam,
    sig: '8f9c1a7d',
    group_size: 4,
    gate: 'Gate 1 (Main Gate)',
    name: 'Pilgrim Group',
    issued_at: new Date().toISOString(),
    scans: [],
  };

  const qrValue = `${tokenData.token}.${tokenData.sig}`;

  return (
    <div className="max-w-md mx-auto space-y-6 select-none">
      {/* Screen Title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-text">Pilgrim QR Slip</h1>
        <p className="text-xs text-muted mt-1">
          58mm thermal receipt preview · Ready to print
        </p>
      </div>

      {/* 58mm Thermal Receipt Card Container */}
      <Card className="p-6 flex flex-col items-center border-border shadow-2xl bg-white text-black rounded-panel overflow-hidden">
        {/* Printable Slip Element (Target of @media print) */}
        <div id="printable-slip" className="w-[58mm] text-center flex flex-col items-center">
          <div className="border-b border-dashed border-black/40 pb-2 mb-3 w-full">
            <h2 className="text-sm font-bold tracking-wide uppercase">CrowdSetu</h2>
            <p className="text-[10px] text-black/70">Somnath Temple Complex</p>
            <p className="text-[9px] font-mono text-black/60">Pilgrim Access Slip</p>
          </div>

          {/* QR Code */}
          <div className="my-2 p-2 bg-white border border-black/20 rounded">
            <QRCodeSVG value={qrValue} size={140} level="M" />
          </div>

          {/* Token Details */}
          <div className="space-y-1 w-full text-left pt-2 border-t border-dashed border-black/40 text-[11px]">
            <div className="flex justify-between">
              <span className="text-black/60">Token ID:</span>
              <span className="font-mono font-bold">{tokenData.token}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60">Party Size:</span>
              <span className="font-bold">{tokenData.group_size} people</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60">Entry Gate:</span>
              <span className="font-bold">{tokenData.gate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60">Issued:</span>
              <span className="font-mono text-[10px]">
                {new Date(tokenData.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-black/20 w-full text-center">
            <p className="text-[9px] font-bold text-black/80">
              SHOW THIS AT ALL CHECKPOINTS
            </p>
            <p className="text-[8px] text-black/60 mt-0.5">
              Privacy note: No personal ID is stored.
            </p>
          </div>
        </div>
      </Card>

      {/* Print Error State */}
      {printError && (
        <div
          className="p-4 rounded-control bg-status-red/10 border border-status-red text-status-red text-xs flex items-start gap-3"
          role="alert"
        >
          <IconAlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Print failed</h4>
            <p className="mt-0.5">{printError}</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-status-yellow text-center">
          Note: Previewing demonstration slip data.
        </p>
      )}

      {/* Action Buttons (Non-printed screen controls) */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button
          variant="secondary"
          size="kiosk"
          onClick={() => navigate('/kiosk/register')}
        >
          New registration
        </Button>
        <Button
          variant="primary"
          size="kiosk"
          icon={<IconPrinter size={20} />}
          onClick={handlePrint}
        >
          Print slip
        </Button>
      </div>
    </div>
  );
};
