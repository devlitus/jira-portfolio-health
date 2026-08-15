# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Eres un experto en desarrollo de software y en la plataforma Atlassian Forge. Tu tarea es ayudar a los desarrolladores a implementar la aplicación de salud del portafolio de Jira según las especificaciones y el plan de implementación. Debes dar instrucciones claras, concisas y precisas, y no inventar información que no esté en los documentos de especificación o en el código existente.

## Source of truth

**`AGENTS.md` is the source of truth for how to work in this repo** (Forge CLI usage, deployment/install flow, security rules, storage rules, manifest editing). Read it before making changes. Do not duplicate its content here — this file only adds what `AGENTS.md` doesn't cover.

One critical override to note when reading `AGENTS.md`: that file's default policy is UI-Kit-only (`@forge/react`, no plain React). **This repo overrides that** — see `AGENTS.md`'s "UI approach: Custom UI (project decision)" section. This app uses **Custom UI**: a real React + TypeScript frontend in `src/frontend/`, not UI Kit.

## Architecture

This is a Forge app with a single `jira:globalPage` module (`manifest.yml`), currently at an early scaffold stage — most of the product described below is not implemented yet.

- **Frontend**: `src/frontend/index.tsx` — React 18 + TypeScript, bundled by esbuild into `static/main/bundle.js`, served via the `static/main` resource and mounted into `static/main/index.html`'s `#root`. Talk to Jira from the browser via `@forge/bridge` (`requestJira`, `invoke`, etc.) — there is no backend resolver yet.
- **Backend**: none yet. No `src/index.js`, no resolvers, no scheduled trigger. `manifest.yml` currently declares zero scopes.

The product spec and phased build plan live in `jira-portfolio-health-mvp.md` (full MVP spec — data model, scoring formulas, UX, non-functional requirements) and `docs/implementation-plan.md` (phase-by-phase task breakdown referencing that spec), both in Spanish. When implementing product logic, treat `jira-portfolio-health-mvp.md` as the spec and `docs/implementation-plan.md` as the plan of record for what's built vs. pending — check it to see which phase/task is in progress before assuming a module doesn't exist yet.

Planned backend layout (per the implementation plan, not yet created):
```
src/
  index.js       # resolvers (bridge between UI and backend)
  jira/          # Jira REST integration (list projects, fetch issues + changelog)
  metrics/       # pure functions computing the 5 health dimensions (schedule, delivery, scope, capacity, dependencies)
  health/        # score aggregation, thresholds, explainable factors, recommendations
  storage/       # config + daily snapshot persistence (Forge KVS)
  triggers/      # daily scheduledTrigger for snapshotting
```

Core product invariant from the spec worth knowing before touching scoring code: a metric that can't be computed (missing data) must be `null`, never `0` — the health engine must not penalize projects for missing data, and must redistribute dimension weights proportionally when a dimension is `null`.

## Local agent tooling

`agent/`, `data/`, `skills/`, and `skills-lock.json` are gitignored — they're Claude/Forge-skill scaffolding (`forge-app-builder`, `forge-app-review`, `forge-connector`, `forge-cost-optimizer`, `forge-debugger`, `forge-security-review`) pulled from `atlassian/forge-skills`, not part of the shipped app.
