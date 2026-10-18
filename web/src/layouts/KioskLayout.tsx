import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import type { Language } from '../i18n';
import { IconQrCode, IconSearch } from '../components/ui/icons';
import { KioskContext } from '../context/KioskContext';

export const KioskLayout: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');

  return (
    <KioskContext.Provider value={{ language, setLanguage }}>
      <div className="min-h-screen bg-bg text-text flex flex-col select-none">
        {/* Tablet Kiosk Header */}
        <header className="h-20 bg-panel border-b border-border px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-control bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold text-xl">
              CS
            </div>
            <div>
              <h1 className="text-lg font-bold text-text">CrowdSetu Registration Kiosk</h1>
              <p className="text-xs text-muted">Tablet Registration Terminal • Gate 1</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Tab navigation */}
            <nav className="flex items-center p-1 bg-bg border border-border rounded-control gap-1">
              <NavLink
                to="/kiosk/register"
                className={({ isActive }) =>
                  `px-5 py-2.5 rounded-control text-sm font-semibold transition-colors flex items-center gap-2 ${
                    isActive ? 'bg-panel text-accent border border-border' : 'text-muted hover:text-text'
                  }`
                }
              >
                <IconQrCode size={18} />
                <span>Register</span>
              </NavLink>
              <NavLink
                to="/kiosk/lookup"
                className={({ isActive }) =>
                  `px-5 py-2.5 rounded-control text-sm font-semibold transition-colors flex items-center gap-2 ${
                    isActive ? 'bg-panel text-accent border border-border' : 'text-muted hover:text-text'
                  }`
                }
              >
                <IconSearch size={18} />
                <span>Token Lookup</span>
              </NavLink>
            </nav>

            {/* Language Switch: EN, हिंदी, ગુજરાતી */}
            <div className="flex items-center p-1 bg-bg border border-border rounded-control gap-1">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-2 rounded-control text-xs font-bold transition-colors ${
                  language === 'en' ? 'bg-accent text-bg shadow-sm' : 'text-muted hover:text-text'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-3 py-2 rounded-control text-xs font-bold transition-colors ${
                  language === 'hi' ? 'bg-accent text-bg shadow-sm' : 'text-muted hover:text-text'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('gu')}
                className={`px-3 py-2 rounded-control text-xs font-bold transition-colors ${
                  language === 'gu' ? 'bg-accent text-bg shadow-sm' : 'text-muted hover:text-text'
                }`}
              >
                ગુજરાતી
              </button>
            </div>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 p-6 md:p-8 flex items-center justify-center">
          <div className="w-full max-w-4xl">
            <Outlet />
          </div>
        </main>
      </div>
    </KioskContext.Provider>
  );
};
