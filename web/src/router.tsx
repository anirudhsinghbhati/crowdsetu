import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { AdminLayout } from './layouts/AdminLayout';
import { KioskLayout } from './layouts/KioskLayout';
import { DisplayLayout } from './layouts/DisplayLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Alerts } from './pages/Alerts';
import { GateDisplay } from './pages/GateDisplay';
import { Heatmap } from './pages/Heatmap';
import { Cameras } from './pages/Cameras';
import { ZoneDetail } from './pages/ZoneDetail';
import { Flow } from './pages/Flow';
import { Devices } from './pages/Devices';
import { Override } from './pages/Override';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { KioskRegister } from './pages/KioskRegister';
import { KioskSlip } from './pages/KioskSlip';
import { KioskLookup } from './pages/KioskLookup';

// Protected Route Guard
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'operator' | 'viewer')[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth */}
        <Route path="/login" element={<Login />} />

        {/* Public Gate Signage Display (Full-screen, no login) */}
        <Route path="/display" element={<DisplayLayout />}>
          <Route path=":gateId" element={<GateDisplay />} />
          <Route index element={<Navigate to="/display/gate-1" replace />} />
        </Route>

        {/* Tablet Registration Kiosk */}
        <Route path="/kiosk" element={<KioskLayout />}>
          <Route path="register" element={<KioskRegister />} />
          <Route path="token/:id" element={<KioskSlip />} />
          <Route path="lookup" element={<KioskLookup />} />
          <Route index element={<Navigate to="/kiosk/register" replace />} />
        </Route>

        {/* Admin Control Room Panel (Protected) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="heatmap" element={<Heatmap />} />
          <Route path="cameras" element={<Cameras />} />
          <Route path="zones/:id" element={<ZoneDetail />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="flow" element={<Flow />} />
          <Route path="devices" element={<Devices />} />
          <Route
            path="override"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operator']}>
                <Override />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
