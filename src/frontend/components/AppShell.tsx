// Shell de navegación (Tarea B.1): sidebar fijo desktop + topbar delgada
// mobile del sistema "Executive Oversight", adaptado a la máquina de estados
// real de la app (Adaptación 4 del plan de refactor UI — no hay rutas, solo
// "Dashboard" / "Configuration" y un breadcrumb de proyecto en detail).
// Componente puro en props: no conoce `status` de index.tsx.
import React from 'react';
import { AnalyticsIcon, DashboardIcon, SettingsIcon } from './ui/icons';

export type AppShellView = 'dashboard' | 'configuration' | 'detail';

export interface AppShellProps {
  activeView: AppShellView;
  onNavigateDashboard: () => void;
  onNavigateConfiguration: () => void;
  /** Nombre del proyecto mostrado como breadcrumb cuando activeView === 'detail'. */
  detailProjectName?: string;
  children: React.ReactNode;
}

const NAV_ITEM_BASE =
  'flex w-full items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-left font-label-bold text-label-bold transition-colors';
const NAV_ITEM_ACTIVE = 'border-primary bg-secondary-container text-primary';
const NAV_ITEM_INACTIVE =
  'border-transparent text-on-surface-variant hover:bg-surface-container-high';

export const AppShell: React.FC<AppShellProps> = ({
  activeView,
  onNavigateDashboard,
  onNavigateConfiguration,
  detailProjectName,
  children,
}) => {
  // El drill-down a Project Detail parte del Dashboard (no existe un item de
  // nav propio, Adaptación 4), así que "Dashboard" queda resaltado también
  // en detail; el breadcrumb debajo de la nav indica el proyecto abierto.
  const dashboardActive = activeView === 'dashboard' || activeView === 'detail';

  return (
    <div className="flex h-screen overflow-hidden bg-surface-slate font-sans text-on-surface antialiased">
      <nav className="fixed left-0 top-0 z-50 flex h-16 w-full items-center gap-2 border-b border-outline-variant bg-surface px-margin lg:hidden">
        <AnalyticsIcon size={22} className="text-primary" />
        <span className="font-headline-lg text-headline-lg font-bold text-primary">
          Portfolio Pulse
        </span>
      </nav>

      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-outline-variant bg-surface-slate lg:flex">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 px-6 py-6">
          <AnalyticsIcon size={24} className="text-primary" />
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-primary">
              Portfolio Pulse
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Executive Command
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-2 px-4 py-6">
          <button
            type="button"
            onClick={onNavigateDashboard}
            className={`${NAV_ITEM_BASE} ${dashboardActive ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE}`}
          >
            <DashboardIcon size={20} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            onClick={onNavigateConfiguration}
            className={`${NAV_ITEM_BASE} ${
              activeView === 'configuration' ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE
            }`}
          >
            <SettingsIcon size={20} />
            <span>Configuration</span>
          </button>
          {activeView === 'detail' && detailProjectName && (
            <p className="px-4 pt-2 font-body-sm text-body-sm text-on-surface-variant">
              Dashboard / <span className="text-on-surface">{detailProjectName}</span>
            </p>
          )}
        </nav>
      </aside>

      <main className="h-full flex-1 overflow-y-auto pt-16 lg:ml-64 lg:pt-0">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-gutter px-margin py-stack-lg">
          {children}
        </div>
      </main>
    </div>
  );
};
