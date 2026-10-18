import React, { useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import {
  Card,
  Button,
  Input,
  EmptyState,
} from '../components/ui';
import { IconSearch, IconQrCode } from '../components/ui/icons';
import type { PilgrimToken } from '../api/types';

export const KioskLookup: React.FC = () => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('TK-7842');
  const [tokenResult, setTokenResult] = useState<PilgrimToken | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notFound, setNotFound] = useState<boolean>(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setNotFound(false);
    setHasSearched(true);

    try {
      const res = await api.pilgrims.lookup(searchQuery.trim());
      setTokenResult(res);
    } catch {
      setTokenResult(null);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateScan = () => {
    setSearchQuery('TK-7842');
    showToast('Simulated barcode / QR scanner input received', 'info');
    setTimeout(() => {
      handleSearch();
    }, 400);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 select-none">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Token Checkpoint Lookup</h1>
        <p className="text-xs text-muted mt-1">
          Verify group registrations and inspect checkpoint scan history across sectors.
        </p>
      </div>

      {/* Big Search Field Card */}
      <Card className="p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter Token ID (e.g. TK-7842 or CS-10482)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 text-base font-mono uppercase"
                leftIcon={<IconSearch size={20} />}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="kiosk"
                onClick={handleSimulateScan}
                icon={<IconQrCode size={20} />}
                title="Scan QR using camera"
              >
                Scan QR
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="kiosk"
                loading={isLoading}
              >
                Lookup
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Result Card */}
      {tokenResult && (
        <Card className="p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
            <div>
              <span className="text-xs text-muted block">Token ID</span>
              <h2 className="text-2xl font-bold font-mono text-accent">{tokenResult.token}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-control bg-[#2FA866]/15 border border-[#2FA866]/30 text-[#2FA866] text-xs font-bold">
                Valid Registration
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-bg border border-border rounded-panel text-xs">
            <div>
              <span className="text-muted block">Party Size</span>
              <span className="text-base font-bold text-text tabular-nums">
                {tokenResult.group_size} people
              </span>
            </div>
            <div>
              <span className="text-muted block">Assigned Gate</span>
              <span className="text-base font-bold text-text">{tokenResult.gate}</span>
            </div>
            <div>
              <span className="text-muted block">Leader Name</span>
              <span className="text-base font-semibold text-text">{tokenResult.name || 'Anonymous'}</span>
            </div>
            <div>
              <span className="text-muted block">Issued At</span>
              <span className="text-base font-mono text-muted">
                {new Date(tokenResult.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Timeline of Checkpoint Scans */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
              Checkpoint scan timeline
            </h3>

            {tokenResult.scans.length === 0 ? (
              <p className="text-xs text-muted p-4 bg-bg rounded-control border border-border">
                No checkpoints scanned yet. The group has not entered through an active scanner.
              </p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {tokenResult.scans.map((scan, i) => (
                  <div key={i} className="relative flex items-start gap-4">
                    <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-accent border-2 border-bg shrink-0" />
                    <div className="flex-1 p-3.5 bg-bg border border-border rounded-control flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-text">{scan.checkpoint}</h4>
                        <span className="text-[11px] text-muted">
                          Direction:{' '}
                          <strong
                            className={scan.direction === 'IN' ? 'text-[#2FA866]' : 'text-accent'}
                          >
                            {scan.direction}
                          </strong>
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-text tabular-nums">
                        {scan.ts}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Not Found State */}
      {hasSearched && notFound && (
        <EmptyState
          title="Token not found"
          description="Check the ID or scan again. Ensure the code begins with TK- or CS- and the group completed registration."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('TK-7842');
                handleSearch();
              }}
            >
              Try sample token TK-7842
            </Button>
          }
        />
      )}
    </div>
  );
};
