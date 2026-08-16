// Attention Queue (Tarea 4.2, §18; re-estilizado Tarea C.2): "Today's
// Attention" — the projects that most need a human look, already ordered by
// the resolver (src/health/attentionQueue.ts). No computation here, just
// rendering.
//
// Tarea C.2: 3 cards en fila (en vez de la lista vertical de 1 columna del
// diseño anterior), cada una con `StatusBadge` arriba-izq, score bold
// arriba-der, nombre de proyecto, línea de deterioro y línea de contexto
// (`mainIssue`) sin icono — el status ya lo comunica el badge, así que se
// quita el borde-acento y el `TrendBadge` que llevaba la card anterior.
import React from 'react';
import type { AttentionQueueEntry } from '../../health/attentionQueue';
import { StatusBadge } from './ui/StatusBadge';
import { WarningIcon } from './ui/icons';

interface AttentionQueueProps {
  entries: AttentionQueueEntry[];
  /** Opens the Project Detail screen (Tarea 4.3) for this project. */
  onSelectProject?: (projectKey: string) => void;
}

const AttentionQueueCard: React.FC<{
  entry: AttentionQueueEntry;
  onSelectProject?: (projectKey: string) => void;
}> = ({ entry, onSelectProject }) => (
  <li>
    <button
      type="button"
      onClick={() => onSelectProject?.(entry.projectKey)}
      className="group flex w-full flex-col gap-1 rounded-xl border border-outline-variant bg-surface p-4 text-left shadow-sm transition-colors hover:bg-surface-container-low"
    >
      <div className="flex items-start justify-between gap-2">
        <StatusBadge status={entry.status} />
        <span className="font-data-mono text-data-mono font-bold text-text-heading">{entry.healthScore}</span>
      </div>
      <h3 className="font-label-bold text-label-bold text-text-heading transition-colors group-hover:text-primary">
        {entry.projectName}
      </h3>
      {entry.deteriorationLabel && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">{entry.deteriorationLabel}</p>
      )}
      {entry.mainIssue && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Main issue: {entry.mainIssue}</p>
      )}
    </button>
  </li>
);

export const AttentionQueue: React.FC<AttentionQueueProps> = ({ entries, onSelectProject }) => (
  <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
    <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-slate p-4">
      <WarningIcon size={18} className="text-status-critical" />
      <h2 className="font-headline-sm text-headline-sm uppercase text-text-heading">Today&apos;s Attention</h2>
    </div>
    {entries.length === 0 ? (
      <p className="p-6 text-center font-body-sm text-body-sm text-on-surface-variant">
        Nothing needs attention right now.
      </p>
    ) : (
      <ol className="grid grid-cols-1 gap-gutter p-4 md:grid-cols-3">
        {entries.map((entry) => (
          <AttentionQueueCard key={entry.projectKey} entry={entry} onSelectProject={onSelectProject} />
        ))}
      </ol>
    )}
  </section>
);
