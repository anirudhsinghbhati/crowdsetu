import React from 'react';
import { StatusDot } from './StatusDot';
import { Chip } from './Chip';
import { IconLogout, IconUser } from './icons';

export interface TopbarProps {
  siteName?: string;
  isConnected: boolean;
  user?: {
    username: string;
    role: 'admin' | 'operator' | 'viewer';
  } | null;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  siteName = 'Somnath Temple Complex',
  isConnected,
  user,
  onLogout,
}) => {
  return (
    <header className="h-16 px-6 bg-panel border-b border-border flex items-center justify-between shrink-0 select-none">
      {/* Site Name */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-text tracking-wide">
          {siteName}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-control bg-bg border border-border text-muted">
          Zone Monitoring Active
        </span>
      </div>

      {/* Connection Status and User Profile */}
      <div className="flex items-center gap-5">
        {/* Live indicator / Disconnected retrying */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1 rounded-control text-xs border ${
            isConnected
              ? 'bg-[#2FA866]/10 border-[#2FA866]/30 text-[#2FA866]'
              : 'bg-status-red/10 border-status-red/30 text-status-red animate-pulse'
          }`}
          role="status"
          aria-live="polite"
        >
          <StatusDot
            level={isConnected ? 'green' : 'red'}
            pulse={isConnected}
            size="sm"
          />
          <span className="font-medium">
            {isConnected ? 'Live WebSocket' : 'Disconnected, retrying...'}
          </span>
        </div>

        {/* User and Role */}
        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-border/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-muted">
                <IconUser size={15} />
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold text-text block leading-none">
                  {user.username}
                </span>
                <span className="text-[10px] text-muted capitalize">
                  {user.role}
                </span>
              </div>
            </div>

            <Chip
              level={user.role === 'admin' ? 'yellow' : user.role === 'operator' ? 'green' : 'grey'}
              label={user.role.toUpperCase()}
              size="sm"
              showIcon={false}
            />

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-control text-muted hover:text-status-red hover:bg-bg transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <IconLogout size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
