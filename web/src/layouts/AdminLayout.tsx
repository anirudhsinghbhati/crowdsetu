import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/ui/Sidebar';
import { Topbar } from '../components/ui/Topbar';
import { useAuthStore } from '../store/auth';
import { useLive } from '../hooks/useLive';
import { useLiveStore } from '../store/live';

export const AdminLayout: React.FC = () => {
  const { role, username, logout } = useAuthStore();
  const { isConnected } = useLive();
  const { recentAlerts } = useLiveStore();
  const navigate = useNavigate();

  const openAlertsCount = recentAlerts.filter((a) => a.status === 'open').length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
      {/* Sidebar nav */}
      <Sidebar userRole={role} alertCount={openAlertsCount} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          siteName="Somnath Temple Complex"
          isConnected={isConnected}
          user={{
            username: username || 'admin',
            role,
          }}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-bg">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
