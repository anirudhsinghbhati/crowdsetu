import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  IconDashboard,
  IconHeatmap,
  IconCameras,
  IconAlerts,
  IconFlow,
  IconDevices,
  IconOverride,
  IconSettings,
  IconReports,
} from './icons';

export interface SidebarProps {
  userRole?: 'admin' | 'operator' | 'viewer';
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole = 'admin', alertCount = 0 }) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <IconDashboard size={18} />, allowedRoles: ['admin', 'operator', 'viewer'] },
    { to: '/heatmap', label: 'Site Heatmap', icon: <IconHeatmap size={18} />, allowedRoles: ['admin', 'operator', 'viewer'] },
    { to: '/cameras', label: 'Cameras', icon: <IconCameras size={18} />, allowedRoles: ['admin', 'operator', 'viewer'] },
    {
      to: '/alerts',
      label: 'Alerts',
      icon: <IconAlerts size={18} />,
      badge: alertCount > 0 ? alertCount : undefined,
      allowedRoles: ['admin', 'operator', 'viewer'],
    },
    { to: '/flow', label: 'Flow', icon: <IconFlow size={18} />, allowedRoles: ['admin', 'operator', 'viewer'] },
    { to: '/devices', label: 'Devices', icon: <IconDevices size={18} />, allowedRoles: ['admin', 'operator', 'viewer'] },
    { to: '/override', label: 'Override', icon: <IconOverride size={18} />, allowedRoles: ['admin', 'operator'] },
    { to: '/settings', label: 'Settings', icon: <IconSettings size={18} />, allowedRoles: ['admin'] },
    { to: '/reports', label: 'Reports', icon: <IconReports size={18} />, allowedRoles: ['admin', 'operator', 'viewer'] },
  ];

  const visibleItems = navItems.filter((item) => item.allowedRoles.includes(userRole));

  return (
    <aside className="w-60 bg-panel border-r border-border flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-border/80 flex items-center gap-3">
        <div className="w-8 h-8 rounded-control bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold text-lg">
          CS
        </div>
        <div>
          <h1 className="text-sm font-bold text-text tracking-wide uppercase">CrowdSetu</h1>
          <p className="text-[11px] text-muted">Control Room</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-control text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent border border-accent/30 font-semibold'
                  : 'text-muted hover:text-text hover:bg-bg/60'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-status-red text-white tabular-nums">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Quick shortcuts to other modules for demo convenience */}
      <div className="p-3 border-t border-border/60">
        <p className="text-[10px] font-medium text-muted uppercase tracking-wider px-2 mb-2">
          Other Portals
        </p>
        <div className="space-y-1">
          <NavLink
            to="/display/gate-1"
            target="_blank"
            className="flex items-center gap-2 px-3 py-1.5 rounded-control text-xs text-muted hover:text-text hover:bg-bg/60"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-status-green" />
            Gate Display (1920x1080)
          </NavLink>
          <NavLink
            to="/kiosk/register"
            target="_blank"
            className="flex items-center gap-2 px-3 py-1.5 rounded-control text-xs text-muted hover:text-text hover:bg-bg/60"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Kiosk Register (Tablet)
          </NavLink>
        </div>
      </div>
    </aside>
  );
};
