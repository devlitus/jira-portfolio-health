// Attention Queue (Tarea 4.2, §18): "Today's Attention" — the projects that
// most need a human look, already ordered by the resolver
// (src/health/attentionQueue.ts). No computation here, just rendering.
import React from 'react';
import type { AttentionQueueEntry } from '../../health/attentionQueue';
import type { HealthStatus } from '../../metrics/model';

interface AttentionQueueProps {
  entries: AttentionQueueEntry[];
  /** Wired up once the Project Detail screen exists (Tarea 4.3/4.4). */
  onSelectProject?: (projectKey: string) => void;
}

const STATUS_ICON: Record<HealthStatus, string> = {
  CRITICAL: '🔴',
  AT_RISK: '🟠',
  HEALTHY: '🟢',
};

const AttentionQueueCard: React.FC<{
  entry: AttentionQueueEntry;
  onSelectProject?: (projectKey: string) => void;
}> = ({ entry, onSelectProject }) => (
  <li>
    <p>
      {STATUS_ICON[entry.status]} {entry.projectName}
    </p>
    <p>Health {entry.healthScore}</p>
    {entry.mainIssue && <p>Main issue: {entry.mainIssue}</p>}
    <button type="button" onClick={() => onSelectProject?.(entry.projectKey)}>
      View details
    </button>
  </li>
);

export const AttentionQueue: React.FC<AttentionQueueProps> = ({ entries, onSelectProject }) => (
  <section>
    <h2>Today&apos;s Attention</h2>
    {entries.length === 0 ? (
      <p>Nothing needs attention right now.</p>
    ) : (
      <ol>
        {entries.map((entry) => (
          <AttentionQueueCard key={entry.projectKey} entry={entry} onSelectProject={onSelectProject} />
        ))}
      </ol>
    )}
  </section>
);
