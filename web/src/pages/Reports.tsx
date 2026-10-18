import React, { useState } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import { useToast } from '../components/ui/Toast';
import {
  Card,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui';

interface ReportHistoryItem {
  id: string;
  name: string;
  dateRange: string;
  zones: string;
  generated: string;
  format: 'PDF' | 'CSV';
  status: string;
}

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const [reportType, setReportType] = useState<string>('Daily summary');
  const [format, setFormat] = useState<'PDF' | 'CSV'>('PDF');
  const [selectedZones, setSelectedZones] = useState<Record<string, boolean>>({
    'Main Gate': true,
    'Ghat Approach': true,
    'Sanctum Corridor': true,
    'Exit Lane': true,
  });

  const [history, setHistory] = useState<ReportHistoryItem[]>([
    {
      id: '1',
      name: 'Alert log · Sector A',
      dateRange: '08 Oct 2026',
      zones: 'All 4 zones',
      generated: '08 Oct · 09:50',
      format: 'CSV',
      status: 'Available',
    },
    {
      id: '2',
      name: 'Daily summary · Sector A',
      dateRange: '07 Oct 2026',
      zones: 'All 4 zones',
      generated: '07 Oct · 23:59',
      format: 'PDF',
      status: 'Available',
    },
    {
      id: '3',
      name: 'Peak crowd · Main Gate',
      dateRange: '07 Oct 2026',
      zones: 'Main Gate',
      generated: '07 Oct · 18:10',
      format: 'PDF',
      status: 'Available',
    },
    {
      id: '4',
      name: 'Flow · Sector A',
      dateRange: '07 Oct 2026',
      zones: 'All 4 zones',
      generated: '07 Oct · 14:05',
      format: 'CSV',
      status: 'Available',
    },
  ]);

  const toggleZone = (zoneName: string) => {
    setSelectedZones((prev) => ({ ...prev, [zoneName]: !prev[zoneName] }));
  };

  const handleGenerate = () => {
    const newReport: ReportHistoryItem = {
      id: `${Date.now()}`,
      name: `${reportType} · Sector A`,
      dateRange: 'Today · 08 Oct 2026',
      zones: 'All 4 zones',
      generated: 'Just now',
      format,
      status: 'Available',
    };
    setHistory([newReport, ...history]);
    showToast(`Report generated in ${format} format`, 'success');
  };

  const handleDownload = (name: string, fmt: string) => {
    showToast(`Downloading ${name}.${fmt.toLowerCase()}`, 'info');
  };

  const previewChartData = [
    { time: '06:00', val: 300 },
    { time: '07:00', val: 650 },
    { time: '08:00', val: 1200 },
    { time: '09:00', val: 2100 },
    { time: '09:42', val: 2610 },
    { time: '10:24', val: 2244 },
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Reports</h1>
        <p className="text-xs text-muted mt-1">
          Generate a site report from the selected demo period and zones.
        </p>
      </div>

      {/* 2 Cols: Report Options and Preview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Report Options */}
        <Card className="p-6 space-y-5">
          <h2 className="text-sm font-semibold text-text">Report options</h2>

          {/* Choose Report Type Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted block">Choose report type</span>
            <div className="grid grid-cols-2 gap-2">
              {['Daily summary', 'Peak crowd', 'Alert log', 'Flow'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReportType(type)}
                  className={`py-2 px-3 text-xs font-semibold rounded-control border transition-colors ${
                    reportType === type
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-bg border-border text-muted hover:text-text'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted block">Date range</span>
            <div className="p-2.5 bg-bg border border-border rounded-control text-xs font-mono text-text">
              08 Oct 2026 — 08 Oct 2026
            </div>
            <span className="text-[10px] text-muted block">Today · Partial day · 00:00–10:24:32 IST</span>
          </div>

          {/* Zones Multi-Select */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted block">Zones</span>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(selectedZones).map((zoneName) => (
                <label
                  key={zoneName}
                  className="flex items-center gap-2.5 p-2 rounded-control bg-bg border border-border cursor-pointer hover:border-accent/40"
                >
                  <input
                    type="checkbox"
                    checked={selectedZones[zoneName]}
                    onChange={() => toggleZone(zoneName)}
                    className="accent-accent w-4 h-4 rounded"
                  />
                  <span className="text-xs text-text">{zoneName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Format (CSV, PDF) */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted block">Format</span>
            <div className="inline-flex p-1 bg-bg border border-border rounded-control gap-1">
              {(['CSV', 'PDF'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-control transition-colors ${
                    format === fmt ? 'bg-panel text-accent border border-border' : 'text-muted hover:text-text'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <Button variant="primary" className="w-full h-11" onClick={handleGenerate}>
            Generate report
          </Button>
        </Card>

        {/* Right Card: Report Preview */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/80">
            <h2 className="text-sm font-semibold text-text">Report preview</h2>
            <span className="text-xs font-mono text-accent">{format} · Concept data</span>
          </div>

          <div>
            <h3 className="text-base font-bold text-text">{reportType} · Sector A</h3>
            <p className="text-xs text-muted mt-0.5">
              08 Oct 2026 · 00:00–10:24:32 IST · 4 zones
            </p>
          </div>

          {/* Small Preview Trend Chart */}
          <div className="h-32 bg-bg border border-border rounded-panel p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={previewChartData}>
                <Line
                  type="monotone"
                  dataKey="val"
                  stroke="#E8962E"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="p-3 bg-bg rounded-control border border-border">
              <span className="text-[11px] text-muted block">Latest reported total</span>
              <span className="text-2xl font-bold text-text tabular-nums">2,244</span>
              <span className="text-[10px] text-muted block">3/4 zones reporting</span>
            </div>
            <div className="p-3 bg-bg rounded-control border border-border">
              <span className="text-[11px] text-muted block">Peak reported total</span>
              <span className="text-2xl font-bold text-text tabular-nums">2,610</span>
              <span className="text-[10px] text-muted block">09:42 IST · Demo estimate</span>
            </div>
          </div>

          <div className="p-3 bg-panel border border-border rounded-control text-xs text-muted leading-relaxed">
            <strong className="text-text block mb-1">3 unresolved alerts · 2 need acknowledgement</strong>
            Main Gate, Ghat Approach, Sanctum Corridor and Exit Lane included. Exit Lane count unavailable since 10:22:18; missing values are marked.
          </div>
        </Card>
      </div>

      {/* Generated Report History Table */}
      <Card>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Generated report history</h3>
          <span className="text-xs text-muted">{history.length} available reports · Demo archive</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Date range</TableHead>
              <TableHead>Zones</TableHead>
              <TableHead>Generated · IST</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-semibold text-text">{item.name}</TableCell>
                <TableCell className="text-muted text-xs">{item.dateRange}</TableCell>
                <TableCell className="text-xs">{item.zones}</TableCell>
                <TableCell className="text-xs font-mono text-muted">{item.generated}</TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-bg border border-border">
                    {item.format}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-[#2FA866] font-medium">{item.status}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleDownload(item.name, item.format)}
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
