// Set de iconos SVG inline (Tarea A.2, Adaptación 2): sustituye a Material
// Symbols del mockup sin depender de fonts.googleapis.com/CDN externo.
import React from 'react';

export interface IconProps {
  /** Ancho/alto en px (viewBox 24x24). */
  size?: number;
  className?: string;
}

const IconBase: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 20,
  className,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const DashboardIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </IconBase>
);

export const AnalyticsIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="5" y1="21" x2="5" y2="10" />
    <line x1="12" y1="21" x2="12" y2="4" />
    <line x1="19" y1="21" x2="19" y2="14" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </IconBase>
);

export const SettingsIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </IconBase>
);

export const WarningIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M12 3.5 2.5 20.5h19z" />
    <line x1="12" y1="9.5" x2="12" y2="14.5" />
    <line x1="12" y1="17.5" x2="12" y2="17.5" />
  </IconBase>
);

export const InfoIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <line x1="12" y1="7.5" x2="12" y2="7.5" />
  </IconBase>
);

export const RefreshIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
    <polyline points="21 3 21 8 16 8" />
    <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
    <polyline points="3 21 3 16 8 16" />
  </IconBase>
);

export const ArrowUpIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="6 11 12 5 18 11" />
  </IconBase>
);

export const ArrowDownIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="18 13 12 19 6 13" />
  </IconBase>
);

export const ArrowForwardIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="13 6 19 12 13 18" />
  </IconBase>
);

export const FilterIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polygon points="4 4 20 4 14 12.5 14 19 10 21 10 12.5" />
  </IconBase>
);

export const MoreVertIcon: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
);

export const NotificationsIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M6 10a6 6 0 1 1 12 0c0 3.2 1 5 2 6.5H4c1-1.5 2-3.3 2-6.5Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </IconBase>
);

export const CalendarIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <line x1="3" y1="9.5" x2="21" y2="9.5" />
    <line x1="8" y1="2.5" x2="8" y2="6.5" />
    <line x1="16" y1="2.5" x2="16" y2="6.5" />
  </IconBase>
);

export const PackageIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M3.5 7 12 3l8.5 4-8.5 4-8.5-4Z" />
    <path d="M3.5 7v10l8.5 4 8.5-4V7" />
    <line x1="12" y1="11" x2="12" y2="21" />
  </IconBase>
);

export const LayersIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polygon points="12 3 21 8 12 13 3 8 12 3" />
    <polyline points="3 13 12 18 21 13" />
    <polyline points="3 17.5 12 22.5 21 17.5" />
  </IconBase>
);

export const UsersIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
    <circle cx="17.5" cy="9" r="2.6" />
    <path d="M15.2 12.3a5.2 5.2 0 0 1 5.9 5.1" />
  </IconBase>
);

export const LinkIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M9.5 14.5 14.5 9.5" />
    <path d="M11 6.5 13 4.5a3.6 3.6 0 0 1 5 5l-2 2" />
    <path d="M13 17.5 11 19.5a3.6 3.6 0 0 1-5-5l2-2" />
  </IconBase>
);

export const CheckIcon: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="4 12.5 9.5 18 20 6" />
  </IconBase>
);
