import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Button, Input, PasswordInput } from '../components/ui';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch {
      // Error handled in store
    }
  };

  const handleQuickLogin = async (user: string) => {
    setUsername(user);
    setPassword('demo123');
    try {
      await login(user, 'demo123');
      navigate('/dashboard');
    } catch {
      // Error handled in store
    }
  };

  return (
    <div className="min-h-screen w-screen bg-bg text-text flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Left side quiet schematic site map outline decoration */}
      <div className="absolute left-[-100px] md:left-12 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none w-[500px] h-[500px]">
        <svg viewBox="0 0 500 500" className="w-full h-full stroke-muted fill-none stroke-[1.5]">
          {/* Main gate */}
          <rect x="50" y="200" width="90" height="70" rx="6" />
          <text x="95" y="240" fill="currentColor" stroke="none" fontSize="12" textAnchor="middle">Main Gate</text>
          
          {/* Path 1 */}
          <line x1="140" y1="235" x2="200" y2="235" strokeDasharray="4 4" />
          
          {/* Ghat Approach */}
          <rect x="200" y="170" width="100" height="130" rx="6" />
          <text x="250" y="240" fill="currentColor" stroke="none" fontSize="12" textAnchor="middle">Ghat Approach</text>
          
          {/* Path 2 */}
          <line x1="300" y1="235" x2="350" y2="235" strokeDasharray="4 4" />
          
          {/* Sanctum Corridor */}
          <rect x="350" y="140" width="110" height="190" rx="6" />
          <text x="405" y="240" fill="currentColor" stroke="none" fontSize="12" textAnchor="middle">Sanctum Corridor</text>
          
          {/* Exit lane loop */}
          <path d="M 405 330 C 405 420, 160 420, 95 270" strokeDasharray="4 4" />
          <rect x="200" y="380" width="90" height="50" rx="6" />
          <text x="245" y="410" fill="currentColor" stroke="none" fontSize="11" textAnchor="middle">Exit Lane</text>
        </svg>
      </div>

      {/* Centered 360px card */}
      <div className="w-full max-w-[360px] bg-panel border border-border rounded-panel p-8 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-control bg-accent/20 border border-accent/40 items-center justify-center text-accent font-bold text-2xl mb-3">
            CS
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text">CrowdSetu</h1>
          <p className="text-xs text-muted mt-1">Control room sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) clearError();
            }}
            placeholder="Enter username"
            autoFocus
            required
          />

          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) clearError();
            }}
            placeholder="Enter password"
            required
          />

          {error && (
            <div
              className="p-2.5 rounded-control bg-status-red/10 border border-status-red/40 text-status-red text-xs font-medium"
              role="alert"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full h-11 text-sm font-semibold"
            loading={isLoading}
          >
            Sign in
          </Button>
        </form>

        {/* Quick Demo Role Selector */}
        <div className="mt-6 pt-5 border-t border-border/60">
          <p className="text-[11px] font-medium text-muted uppercase tracking-wider text-center mb-2.5">
            Quick Demo Login
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="py-1.5 px-2 bg-bg border border-border hover:border-accent text-xs rounded-control transition-colors font-medium text-text hover:text-accent"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('operator')}
              className="py-1.5 px-2 bg-bg border border-border hover:border-accent text-xs rounded-control transition-colors font-medium text-text hover:text-accent"
            >
              Operator
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('viewer')}
              className="py-1.5 px-2 bg-bg border border-border hover:border-accent text-xs rounded-control transition-colors font-medium text-text hover:text-accent"
            >
              Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
