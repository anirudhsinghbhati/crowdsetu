import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useLive } from '../hooks/useLive';
import { useLiveStore } from '../store/live';
import { translations } from '../i18n';
import type { StatusLevel } from '../api/types';

export const GateDisplay: React.FC = () => {
  const { gateId } = useParams<{ gateId: string }>();
  const { isConnected, lastMessageTimestamp } = useLive();
  const liveZones = useLiveStore((state) => state.zones);

  const [currentTime, setCurrentTime] = useState<string>('');
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);

  // Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 10-Second Watchdog Timer for SAFETY RULE
  useEffect(() => {
    const checkWatchdog = () => {
      const elapsed = Date.now() - lastMessageTimestamp;
      if (elapsed > 10000 || !isConnected) {
        setIsTimedOut(true);
      } else {
        setIsTimedOut(false);
      }
    };

    checkWatchdog();
    const interval = setInterval(checkWatchdog, 1000);
    return () => clearInterval(interval);
  }, [lastMessageTimestamp, isConnected]);

  // Fetch baseline zones
  const { data: zones } = useQuery({
    queryKey: ['zones'],
    queryFn: () => api.zones.list(),
  });

  // Resolve gate's active zone
  const targetZone = useMemo(() => {
    if (!zones) return null;
    // Map gateId (e.g. "gate-1", "1", "main-gate")
    if (gateId === 'gate-2' || gateId === '2') return zones[1];
    if (gateId === 'gate-3' || gateId === '3') return zones[2];
    if (gateId === 'gate-4' || gateId === '4') return zones[3];
    return zones[0]; // Default to Main Gate
  }, [zones, gateId]);

  // Live state with watchdog fallback
  const activeLevel: StatusLevel = useMemo(() => {
    // CRITICAL SAFETY RULE: If timeout or disconnected, show GREY
    if (isTimedOut || !isConnected) {
      return 'grey';
    }

    if (!targetZone) return 'green';

    // If manual override exists on zone, use override
    if (targetZone.override) {
      return targetZone.override.level;
    }

    // Otherwise use real-time zone level from Zustand or baseline
    const live = liveZones[targetZone.id];
    return live ? live.level : targetZone.level;
  }, [isTimedOut, isConnected, targetZone, liveZones]);

  // Visual styling configurations based on active level
  const config = useMemo(() => {
    switch (activeLevel) {
      case 'green':
        return {
          bg: 'bg-[#2FA866]',
          textPrimary: 'text-white',
          textMuted: 'text-white/80',
          icon: (
            <svg className="w-32 h-32 md:w-44 md:h-44 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="16 10 10.5 15.5 8 13" />
            </svg>
          ),
          messageEn: translations.en.display.green,
          messageHi: translations.hi.display.green,
          messageGu: translations.gu.display.green,
          altRoute: null,
        };

      case 'yellow':
        return {
          bg: 'bg-[#E5B91F]',
          textPrimary: 'text-[#14181F]',
          textMuted: 'text-[#14181F]/80',
          icon: (
            <svg className="w-32 h-32 md:w-44 md:h-44 text-[#14181F] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          ),
          messageEn: translations.en.display.yellow,
          messageHi: translations.hi.display.yellow,
          messageGu: translations.gu.display.yellow,
          altRoute: null,
        };

      case 'red':
        return {
          bg: 'bg-[#D93C3C]',
          textPrimary: 'text-white',
          textMuted: 'text-white/85',
          icon: (
            <svg className="w-32 h-32 md:w-44 md:h-44 text-white shrink-0 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" x2="9" y1="9" y2="15" />
              <line x1="9" x2="15" y1="9" y2="15" />
            </svg>
          ),
          messageEn: translations.en.display.red,
          messageHi: translations.hi.display.red,
          messageGu: translations.gu.display.red,
          altRoute: 'Alternate path: Ghat Approach West →',
        };

      case 'grey':
      default:
        return {
          bg: 'bg-[#7A8190]',
          textPrimary: 'text-white',
          textMuted: 'text-white/85',
          icon: (
            <svg className="w-32 h-32 md:w-44 md:h-44 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="4" />
              <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            </svg>
          ),
          messageEn: translations.en.display.grey,
          messageHi: translations.hi.display.grey,
          messageGu: translations.gu.display.grey,
          altRoute: isTimedOut ? 'Signal offline · Safety protocol active' : null,
        };
    }
  }, [activeLevel, isTimedOut]);

  return (
    <div
      className={`w-screen h-screen flex flex-col justify-between p-12 md:p-16 select-none transition-colors duration-500 ${config.bg}`}
    >
      {/* Top Header: Gate identifier */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-control bg-black/20 flex items-center justify-center font-bold text-xl text-white">
            CS
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white uppercase">
              {targetZone?.name || 'Gate 1 (Main Gate)'}
            </h2>
            <p className="text-sm text-white/70">Public Gate Guidance</p>
          </div>
        </div>

        {/* Safety timeout indicator badge */}
        {isTimedOut && (
          <div className="px-4 py-2 rounded-control bg-black/30 text-white text-xs font-mono font-semibold tracking-wider">
            WATCHDOG SAFE MODE: 10S TIMEOUT REACHED
          </div>
        )}
      </div>

      {/* Center Huge Message Block (min 120px readable from 15 meters) */}
      <div className="flex flex-col items-center justify-center text-center my-auto space-y-8">
        {/* Status Icon */}
        <div className="mb-2">{config.icon}</div>

        {/* English Message (Largest, min 120px on 1920x1080 display screens) */}
        <h1
          className={`text-6xl sm:text-7xl md:text-8xl lg:text-[110px] xl:text-[124px] font-black tracking-tight leading-none ${config.textPrimary}`}
        >
          {config.messageEn}
        </h1>

        {/* Hindi & Gujarati Stacked Messages */}
        <div className="space-y-4 max-w-5xl">
          <p className={`text-3xl sm:text-4xl md:text-5xl font-bold leading-tight ${config.textMuted}`}>
            {config.messageHi}
          </p>
          <p className={`text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight ${config.textMuted}`}>
            {config.messageGu}
          </p>
        </div>

        {/* Alternate Route Arrow (For RED state) */}
        {config.altRoute && (
          <div className="mt-6 px-8 py-4 rounded-panel bg-black/30 border border-white/20 flex items-center gap-4">
            <span className="text-3xl md:text-4xl font-extrabold text-white">
              {config.altRoute}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Footer: Tiny clock bottom-right only */}
      <div className="flex items-center justify-between pt-6 border-t border-black/10">
        <span className="text-xs text-white/50">
          CrowdSetu Pilgrimage Site Operations · Sector A
        </span>
        <div className="text-sm md:text-base font-mono font-bold text-white/80 tabular-nums">
          {currentTime}
        </div>
      </div>
    </div>
  );
};
