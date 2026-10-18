import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'segmented';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}) => {
  if (variant === 'segmented') {
    return (
      <div className={`inline-flex p-1 bg-bg border border-border rounded-control gap-1 ${className}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-control transition-colors select-none flex items-center gap-1.5 ${
                isActive
                  ? 'bg-panel text-text shadow-sm border border-border/80'
                  : 'text-muted hover:text-text'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isActive ? 'bg-accent/20 text-accent font-semibold' : 'bg-panel text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`border-b border-border flex items-center gap-6 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 select-none ${
              isActive ? 'text-accent' : 'text-muted hover:text-text'
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full tabular-nums ${
                  isActive ? 'bg-accent/20 text-accent font-bold' : 'bg-panel text-muted border border-border/60'
                }`}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t" />
            )}
          </button>
        );
      })}
    </div>
  );
};
