// Shell de navegación (Tarea B.1, refacto UI docs/plans/vivid-marching-otter.md):
// barra de tabs horizontal ("Portfolio Health" + Dashboard / Recommended
// Actions / Setup) en vez del sidebar fijo + topbar mobile del sistema
// anterior (Adaptación 1: sin chrome falso de Jira — la app ya está embebida
// de verdad en un jira:globalPage, Jira dibuja su propio chrome real).
// Componente puro en props: no conoce `status` de index.tsx.
import React from 'react';
import { AnalyticsIcon } from './ui/icons';

export type AppShellView = 'dashboard' | 'recommended' | 'configuration';

export interface AppShellProps {
  activeView: AppShellView;
  onNavigateDashboard: () => void;
  onNavigateRecommended: () => void;
  onNavigateConfiguration: () => void;
  children: React.ReactNode;
}

const TAB_BASE =
  'shrink-0 border-b-2 px-1 py-4 font-label-bold text-label-bold transition-colors';
const TAB_ACTIVE = 'border-primary-container text-primary';
const TAB_INACTIVE = 'border-transparent text-on-surface-variant hover:text-on-surface';

export const AppShell: React.FC<AppShellProps> = ({
  activeView,
  onNavigateDashboard,
  onNavigateRecommended,
  onNavigateConfiguration,
  children,
}) => {
  return (
    <div className="min-h-screen bg-surface-slate font-sans text-on-surface antialiased">
      <header className="border-b border-outline-variant bg-surface">
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 overflow-x-auto px-margin">
          <div className="flex shrink-0 items-center gap-2 py-4">
            <AnalyticsIcon size={22} className="text-primary" />
            <span className="font-headline-sm text-headline-sm font-bold text-primary">
              Portfolio Health
            </span>
          </div>
          <nav className="flex shrink-0 items-center gap-6">
            <button
              type="button"
              onClick={onNavigateDashboard}
              className={`${TAB_BASE} ${activeView === 'dashboard' ? TAB_ACTIVE : TAB_INACTIVE}`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={onNavigateRecommended}
              className={`${TAB_BASE} ${activeView === 'recommended' ? TAB_ACTIVE : TAB_INACTIVE}`}
            >
              Recommended Actions
            </button>
            <button
              type="button"
              onClick={onNavigateConfiguration}
              className={`${TAB_BASE} ${activeView === 'configuration' ? TAB_ACTIVE : TAB_INACTIVE}`}
            >
              Setup
            </button>
          </nav>
        </div>
      </header>

      <main>
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-gutter px-margin py-stack-lg">
          {children}
        </div>
      </main>
    </div>
  );
};
