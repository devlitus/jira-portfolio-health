import React from 'react';
import { createRoot } from 'react-dom/client';

// Simple "Hello world" page.
// This is a Custom UI app: the frontend is a standard React application
// bundled to static files (see the `build` script in package.json) and
// served by Forge from the `static/main` resource declared in manifest.yml.
//
// To talk to Jira from here, use `@forge/bridge` (e.g. `requestJira`) —
// UI Kit components from `@forge/react` are NOT available in Custom UI.
const App: React.FC = () => {
  return <h1>Hello world!</h1>;
};

// Mount the React tree into the <div id="root"> element of index.html.
const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
