// "Select projects to monitor" setup screen (§26, Tarea 1.5.c).
//
// Tarea F.1 (DESIGN.md § Components/Shapes): checklist como card tonal con
// filas divididas, checkboxes nativos con accent-color de marca y botón
// primario Atlassian-blue (`--color-primary-container`), siguiendo el mismo
// lenguaje visual que Dashboard.tsx/AttentionQueue.tsx.
import React from 'react';
import type { Project } from '../../metrics/model';

interface ProjectSelectorProps {
  projects: Project[];
  selectedKeys: Set<string>;
  onToggle: (projectKey: string) => void;
  onStartAnalysis: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedKeys,
  onToggle,
  onStartAnalysis,
}) => {
  return (
    <section className="flex flex-col gap-gutter">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-text-heading">Welcome to Portfolio Health</h1>
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">Select projects to monitor</p>
      </div>

      {projects.length === 0 ? (
        // Empty state (Tarea 6.2, §26): no Jira projects visible to this user
        // — nothing to select yet, so show that plainly instead of a dead-end
        // empty checkbox list with a permanently disabled button.
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <p className="p-6 text-center font-body-sm text-body-sm text-on-surface-variant">
            No projects found. You may not have access to any Jira projects yet, or none exist on this site.
          </p>
        </section>
      ) : (
        <form
          className="flex flex-col gap-gutter"
          onSubmit={(event) => {
            event.preventDefault();
            onStartAnalysis();
          }}
        >
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
            <div className="border-b border-outline-variant bg-surface-slate p-4">
              <h2 className="font-headline-sm text-headline-sm uppercase text-text-heading">Projects</h2>
            </div>
            <ul className="divide-y divide-outline-variant/50">
              {projects.map((project) => (
                <li key={project.key}>
                  <label className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-surface-container-low">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(project.key)}
                      onChange={() => onToggle(project.key)}
                      className="h-5 w-5 shrink-0 rounded border-outline-variant accent-primary-container"
                    />
                    <span>
                      <span className="block font-label-bold text-label-bold text-text-heading">
                        {project.name}
                      </span>
                      <span className="block font-body-sm text-body-sm text-on-surface-variant">
                        {project.key}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <button
            type="submit"
            disabled={selectedKeys.size === 0}
            className="self-start rounded bg-primary-container px-6 py-2 font-label-bold text-label-bold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start analysis
          </button>
        </form>
      )}
    </section>
  );
};
