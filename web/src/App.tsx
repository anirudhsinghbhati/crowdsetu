import React, { useState } from 'react';
import {
  Button,
  Input,
  Select,
  Chip,
  StatusDot,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  ToastProvider,
  Sparkline,
  Stepper,
} from './components/ui';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stepperVal, setStepperVal] = useState(4);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg text-text p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">CrowdSetu Design System</h1>
          <p className="text-sm text-muted mt-1">
            Verification frame for Step 2(a): design tokens and shared components.
          </p>
        </div>

        {/* Status Chips and Dots */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-panel border border-border rounded-panel">
          <Chip level="green" />
          <Chip level="yellow" />
          <Chip level="red" />
          <Chip level="grey" />
          <div className="h-6 w-px bg-border mx-2" />
          <StatusDot level="green" pulse label="Live" />
          <StatusDot level="yellow" label="Busy" />
          <StatusDot level="red" pulse label="Alert" />
          <StatusDot level="grey" label="Offline" />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Acknowledge</Button>
          <Button variant="secondary">View details</Button>
          <Button variant="danger">Apply override</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary" size="kiosk">Issue QR (Kiosk)</Button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Inputs & Stepper</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Username" placeholder="e.g. operator_1" />
              <Select
                label="Zone selector"
                options={[
                  { value: '1', label: 'Main Gate' },
                  { value: '2', label: 'Ghat Approach' },
                  { value: '3', label: 'Sanctum Corridor' },
                  { value: '4', label: 'Exit Lane' },
                ]}
              />
              <Stepper value={stepperVal} onChange={setStepperVal} label="Group size (Tablet)" />
            </CardContent>
          </Card>

          <Card highlightRed>
            <CardHeader>
              <CardTitle>Critical Zone Card (Red Highlight)</CardTitle>
              <Chip level="red" label="92% Full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold tabular-nums">412</span>
                <span className="text-xs text-muted">Cap: 450</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>30-min Trend:</span>
                <Sparkline data={[120, 180, 240, 310, 390, 412]} color="#D93C3C" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tabs & Segmented</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                variant="segmented"
                activeTab={activeTab}
                onChange={setActiveTab}
                tabs={[
                  { id: 'overview', label: 'Density' },
                  { id: 'flow', label: 'Flow' },
                  { id: 'combined', label: 'Combined' },
                ]}
              />
              <p className="text-xs text-muted">
                Active mode: <strong className="text-accent">{activeTab}</strong>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table Sample */}
        <Card>
          <CardHeader>
            <CardTitle>Table with Offline and Red Alert Highlights</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow isRedAlert>
                  <TableCell>11:15:30</TableCell>
                  <TableCell className="font-medium">Sanctum Corridor</TableCell>
                  <TableCell><Chip level="red" size="sm" /></TableCell>
                  <TableCell>Density exceeded 90% threshold (412 people)</TableCell>
                  <TableCell><span className="text-xs text-status-red font-semibold">Open</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>11:10:00</TableCell>
                  <TableCell className="font-medium">Ghat Approach</TableCell>
                  <TableCell><Chip level="yellow" size="sm" /></TableCell>
                  <TableCell>Slow queue buildup at checkpoint 2</TableCell>
                  <TableCell><span className="text-xs text-status-yellow font-medium">Acknowledged</span></TableCell>
                </TableRow>
                <TableRow isOffline>
                  <TableCell>11:05:12</TableCell>
                  <TableCell className="font-medium">Gate 3 Camera</TableCell>
                  <TableCell><Chip level="grey" size="sm" /></TableCell>
                  <TableCell>Device disconnected. Last seen 12 min ago.</TableCell>
                  <TableCell><span className="text-xs text-status-grey font-medium">Offline</span></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ToastProvider>
  );
};

export default App;
