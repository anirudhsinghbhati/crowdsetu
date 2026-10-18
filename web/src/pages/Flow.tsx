import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useToast } from '../components/ui/Toast';
import {
  Card,
  Select,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui';
import { IconReports, IconAlertTriangle } from '../components/ui/icons';

interface FlowDataPoint {
  time: string;
  entries: number;
  exits: number;
  net: number;
}

export const Flow: React.FC = () => {
  const { showToast } = useToast();
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [windowRange, setWindowRange] = useState<string>('5m');

  // Realistic entries vs exits timeseries data
  const chartData: FlowDataPoint[] = useMemo(() => {
    return [
      { time: '10:20:32', entries: 90, exits: 54, net: 36 },
      { time: '10:21:32', entries: 100, exits: 58, net: 42 },
      { time: '10:22:32', entries: 110, exits: 60, net: 50 },
      { time: '10:23:32', entries: 130, exits: 62, net: 68 },
      { time: '10:24:32', entries: 140, exits: 66, net: 74 },
    ];
  }, []);

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Zone,Entries,Exits,Net,PeakTime\n' +
      'Main Gate,340,130,+210,10:24\n' +
      'Ghat Approach,170,80,+90,10:23\n' +
      'Sanctum Corridor,60,90,-30,10:21\n' +
      'Exit Lane,Unavailable,Unavailable,Unavailable,CAM-04 offline\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'crowdsetu_flow_telemetry.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Flow data exported to CSV', 'success');
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Flow</h1>
          <p className="text-xs text-muted mt-1">
            Entries, exits and net movement across reporting zones.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<IconReports size={16} />}
          onClick={handleExportCSV}
        >
          Export CSV
        </Button>
      </div>

      {/* Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="w-full sm:w-64">
          <Select
            label="Zone"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            options={[
              { value: 'all', label: 'All reporting zones' },
              { value: '1', label: 'Main Gate' },
              { value: '2', label: 'Ghat Approach' },
              { value: '3', label: 'Sanctum Corridor' },
            ]}
          />
        </div>

        {/* Window Selector */}
        <div className="flex flex-col gap-1.5 self-start sm:self-auto">
          <span className="text-xs font-medium text-muted">Window</span>
          <div className="inline-flex p-1 bg-panel border border-border rounded-control gap-1">
            {['5m', '15m', '1h'].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindowRange(w)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-control transition-colors ${
                  windowRange === w
                    ? 'bg-bg text-accent border border-border shadow-sm'
                    : 'text-muted hover:text-text'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <span className="text-xs font-medium text-muted block">Entries · 5 min total</span>
          <div className="text-3xl font-bold text-text mt-2 tabular-nums">570</div>
          <span className="text-[11px] text-muted mt-1 block">People entering reporting zones</span>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-medium text-muted block">Exits · 5 min total</span>
          <div className="text-3xl font-bold text-text mt-2 tabular-nums">300</div>
          <span className="text-[11px] text-muted mt-1 block">People leaving reporting zones</span>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-medium text-muted block">Net · 5 min total</span>
          <div className="text-3xl font-bold text-accent mt-2 tabular-nums">+270</div>
          <span className="text-[11px] text-muted mt-1 block">570 entries – 300 exits</span>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-medium text-muted block">Peak entries</span>
          <div className="text-3xl font-bold text-text mt-2 tabular-nums">140</div>
          <span className="text-[11px] text-muted mt-1 block">10:23:32–10:24:32 · 1 min bin</span>
        </Card>
      </div>

      {/* Main Chart: Entries vs Exits */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-text">Entries vs exits</h3>
            <p className="text-xs text-muted">People per 1 min bin · Five-minute window</p>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <span className="flex items-center gap-1.5 text-accent">
              <span className="w-3 h-0.5 bg-accent" />
              Entries · Solid line
            </span>
            <span className="flex items-center gap-1.5 text-text">
              <span className="w-3 h-0.5 border-t border-dashed border-text" />
              Exits · Dashed line
            </span>
            <span className="flex items-center gap-1.5 text-muted">
              <span className="w-3 h-3 bg-accent/20 rounded-sm" />
              Net · Shaded area
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8962E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E8962E" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#98A0AE" fontSize={10} tickLine={false} />
              <YAxis stroke="#98A0AE" fontSize={10} tickLine={false} domain={[0, 160]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1D232D',
                  borderColor: '#2B3340',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#E8E6DF',
                }}
              />
              {/* Shaded net area */}
              <Area
                type="monotone"
                dataKey="net"
                stroke="none"
                fill="url(#netFill)"
              />
              {/* Solid line entries */}
              <Line
                type="monotone"
                dataKey="entries"
                stroke="#E8962E"
                strokeWidth={2.5}
                dot={false}
              />
              {/* Dashed line exits */}
              <Line
                type="monotone"
                dataKey="exits"
                stroke="#E8E6DF"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Movement by Zone Table */}
      <Card>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Movement by zone</h3>
          <span className="text-xs text-muted">Totals for 10:19:32–10:24:32 IST</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Entries</TableHead>
                <TableHead>Exits</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Peak time · IST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold text-text">Main Gate</TableCell>
                <TableCell>340</TableCell>
                <TableCell>130</TableCell>
                <TableCell className="text-accent font-bold">+210</TableCell>
                <TableCell className="text-muted">10:24 · Entry peak</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold text-text">Ghat Approach</TableCell>
                <TableCell>170</TableCell>
                <TableCell>80</TableCell>
                <TableCell className="text-accent font-bold">+90</TableCell>
                <TableCell className="text-muted">10:23 · Entry peak</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold text-text">Sanctum Corridor</TableCell>
                <TableCell>60</TableCell>
                <TableCell>90</TableCell>
                <TableCell className="text-[#2FA866] font-bold">-30</TableCell>
                <TableCell className="text-muted">10:21 · Entry peak</TableCell>
              </TableRow>
              <TableRow isOffline>
                <TableCell className="font-semibold text-muted">Exit Lane</TableCell>
                <TableCell className="text-muted">Unavailable</TableCell>
                <TableCell className="text-muted">Unavailable</TableCell>
                <TableCell className="text-muted">Unavailable</TableCell>
                <TableCell className="text-muted">CAM-04 offline · Last seen 10:22:18</TableCell>
              </TableRow>
              <TableRow className="border-t-2 border-border/80 font-bold bg-panel">
                <TableCell className="text-text font-bold">Reporting zones total</TableCell>
                <TableCell>570</TableCell>
                <TableCell>300</TableCell>
                <TableCell className="text-accent font-bold">+270</TableCell>
                <TableCell className="text-muted">10:24 · 140 entries / bin</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Offline Alert Banner */}
      <div className="p-4 rounded-panel bg-panel border border-border flex items-center gap-3">
        <IconAlertTriangle size={18} className="text-status-yellow shrink-0" />
        <div>
          <h5 className="text-xs font-semibold text-text">Exit Lane movement unavailable</h5>
          <p className="text-[11px] text-muted mt-0.5">
            The camera is offline. Missing movement is excluded from totals, not recorded as zero. Request a manual observation before changing exit guidance.
          </p>
        </div>
      </div>
    </div>
  );
};
