// "Select projects to monitor" setup screen (§26, Tarea 1.5.c).
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
    <section>
      <h1>Welcome to Portfolio Health</h1>
      <p>Select projects to monitor</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onStartAnalysis();
        }}
      >
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {projects.map((project) => (
            <li key={project.key}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedKeys.has(project.key)}
                  onChange={() => onToggle(project.key)}
                />
                {' '}
                {project.name}
              </label>
            </li>
          ))}
        </ul>
        <button type="submit" disabled={selectedKeys.size === 0}>
          Start analysis
        </button>
      </form>
    </section>
  );
};
