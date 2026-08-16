# Portfolio Health for Jira

Addon de **Forge** para Jira Cloud que calcula un **Health Score** explicado por proyecto y prioriza en qué proyectos del portfolio hay que intervenir primero — sin Gantt, sin roadmap, sin configuración compleja.

> **Estado:** MVP funcionalmente completo. Fases 0–5 del plan cerradas; Fase 6 (alertas, robustez y release) en progreso. Ver [`wiki/02-estado-actual.md`](wiki/02-estado-actual.md) para el detalle por fases.

## Qué hace

1. El usuario selecciona qué proyectos de Jira quiere monitorizar.
2. La app analiza cada proyecto en 5 dimensiones: **Schedule, Delivery, Scope, Capacity, Dependencies**.
3. Cada dimensión produce un score explicado (nunca solo un número — siempre con el factor que lo justifica).
4. Los scores se combinan en un **Health Score** por proyecto, con thresholds Healthy / At Risk / Critical.
5. El dashboard prioriza los proyectos peor puntuados en una **Attention Queue**, con recomendaciones accionables.
6. Un `scheduledTrigger` diario guarda un snapshot por proyecto, lo que habilita tendencia, histórico y detección de deterioro.

Para la visión de producto completa (usuario objetivo, alcance, fórmulas de scoring, UX) ver [`jira-portfolio-health-mvp.md`](jira-portfolio-health-mvp.md).

## Documentación

| Para... | Ir a |
|---|---|
| Resumen ejecutivo del proyecto (no técnico) | [`wiki/`](wiki/) |
| Especificación de producto completa | [`jira-portfolio-health-mvp.md`](jira-portfolio-health-mvp.md) |
| Plan de implementación fase a fase | [`docs/plans/implementation-plan.md`](docs/plans/implementation-plan.md) |
| Decisiones de arquitectura y su justificación | [`docs/architecture-decisions.md`](docs/architecture-decisions.md) |
| Sistema de diseño de la UI | [`DESIGN.md`](DESIGN.md) |
| Cómo trabajar en este repo (Forge CLI, deploy, seguridad) | [`AGENTS.md`](AGENTS.md) |
| Guía para Claude Code en este repo | [`CLAUDE.md`](CLAUDE.md) |

## Arquitectura (resumen)

- **Frontend:** `src/frontend/` — React 18 + TypeScript (**Custom UI**, no UI Kit — ver `CLAUDE.md`), bundlado con esbuild + Tailwind v4 en `static/main/`.
- **Backend:** `src/index.ts` (resolvers), `src/jira/` (integración Jira REST), `src/metrics/` (cálculo de las 5 dimensiones, funciones puras), `src/health/` (scoring, factores, recomendaciones, alertas), `src/storage/` (config + snapshots en Forge KVS), `src/triggers/` (snapshot diario).
- **Módulo Forge:** `jira:globalPage` único (`manifest.yml`), scopes `read:jira-work`, `read:jira-user`, `storage:app`.

## Requisitos

- [Forge CLI](https://developer.atlassian.com/platform/forge/set-up-forge/) instalado y con sesión iniciada (`forge login`).
- Node.js compatible con el runtime `nodejs24.x` declarado en `manifest.yml`.

## Desarrollo

```sh
npm install                 # dependencias

npm run build                # build de producción (CSS + JS) a static/main/
npm run watch                 # build + watch en desarrollo (JS y CSS en paralelo)

npm test                      # suite de tests (Jest)
npm run lint                  # ESLint sobre src/**/*.{ts,tsx}

npm run seed:demo             # sembrar datos de demo (scripts/seed-demo-data.mjs)
```

## Desplegar e instalar

```sh
forge lint                                              # validar manifest.yml
npm run build                                            # regenerar static/main/bundle.js antes de deploy
forge deploy --non-interactive -e development             # desplegar al entorno de desarrollo
forge install --non-interactive --upgrade ...              # instalar/actualizar en el sitio (obligatorio si cambian scopes)
forge tunnel                                              # proxy de invocaciones en local durante desarrollo
```

Ver `AGENTS.md` para el flujo completo de deploy/install y las reglas de seguridad y almacenamiento del repo.

## Soporte

Ver [Get help](https://developer.atlassian.com/platform/forge/get-help/) para dudas sobre la plataforma Forge en general.
