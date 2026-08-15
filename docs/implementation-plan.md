# Plan de Implementación — Jira Portfolio Health (MVP)

> Fuente: [`jira-portfolio-health-mvp.md`](../jira-portfolio-health-mvp.md)
>
> Estado inicial: app Forge creada desde template `jira-global-page-ui-kit` (hello-world).
> Existen: `manifest.yml` (módulo `jira:globalPage`, runtime `nodejs24.x`), `src/index.js` (resolver vacío), `src/frontend/index.jsx` (UI Kit placeholder).

## Resumen de fases

| Fase | Nombre | Objetivo | Referencia MVP |
|------|--------|----------|----------------|
| 0 | Setup y decisiones técnicas | Dejar la base del repo lista y cerrar decisiones de arquitectura | §21, §24, §25 |
| 1 | Foundation | Instalación, selección de proyectos, capa de integración Jira, modelo interno, persistencia | Sprint 1, §21, §22 |
| 2 | Metrics | Calcular métricas de las 5 dimensiones a partir de datos de Jira | Sprint 2, §9–§13 |
| 3 | Health Engine | Scores, thresholds, factores explicables, recomendaciones | Sprint 3, §8, §14, §15, §17, §23 |
| 4 | Dashboard | Portfolio overview, attention queue, detalle de proyecto | Sprint 4, §7, §16, §18, §26 |
| 5 | Historical data | Snapshots diarios, tendencias, detección de deterioro | Sprint 5, §19 |
| 6 | Alerts + polish | Reglas de alerta, empty/error states, performance, permisos, release | Sprint 6, §20, §24, §25, §29 |

Convenciones del plan:

- Cada tarea indica los archivos que crea o modifica.
- Las tareas grandes están divididas en subtareas accionables.
- "DoD" = criterio de aceptación verificable de la tarea.
- Al final de cada fase hay un checkpoint de validación (lint, deploy, tests).

---

## Fase 0 — Setup y decisiones técnicas

Objetivo: preparar el entorno y cerrar las decisiones de arquitectura antes de escribir lógica de negocio. No toca funcionalidad de producto.

### Tarea 0.1 — Verificar entorno Forge

- [x] Ejecutar `pwd` y confirmar que estamos en la raíz de la app (`W:/addon/jira-portfolio-health`).
- [x] Verificar login: `forge whoami`. → Carles Pedrero (developercarles@gmail.com).
- [x] Ejecutar `forge lint` sobre el template actual para confirmar que la base es válida. → "No issues found."
- [x] Ejecutar `forge deploy --non-interactive -e development` del template y `forge install --non-interactive --site <site> --product jira --environment development` para validar el flujo completo de despliegue con el hello-world. → Deploy OK (app v4.1.0); instalación ya existente (`0a6e1d8f-...`, site `developercarles.atlassian.net`, producto Jira) actualizada con `--upgrade` y confirmada "at the latest".
- **DoD:** la app hello-world se ve en la global page de Jira del sitio de desarrollo. → Deploy/instalación verificados por CLI (site up-to-date); confirmación visual en el navegador pendiente de que el usuario la haga o la pida explícitamente.

### Tarea 0.2 — Decisiones de arquitectura (documentar en `docs/architecture-decisions.md`)

- [x] **Almacenamiento de snapshots:** usar Forge KVS (`@forge/kvs`) con clave `snapshot:<projectKey>:<yyyy-mm-dd>`. Decisión: KVS por simplicidad frente a SQL; volumen bajo (1 snapshot/proyecto/día). (§19, §22)
- [x] **Configuración del addon (proyectos seleccionados, thresholds):** KVS con clave `config:portfolio`. (§4.1, §14)
- [x] **Llamadas a Jira API:** desde resolvers de backend con `.asUser()` (respeta permisos del usuario, §24 Permissions, §25) — NO `requestJira` desde frontend, porque los cálculos pesados deben ejecutarse en backend y cachearse (§24 Performance).
- [x] **Snapshot diario:** módulo `scheduledTrigger` (cron diario) que recorre los proyectos seleccionados y persiste snapshots. (§19)
- [x] **Framework de tests:** Jest (estándar en proyectos Forge, funciona con nodejs24.x y módulos ESM del template).
- **DoD:** documento creado con cada decisión y su justificación.

### Tarea 0.3 — Preparar tooling del repo

- [ ] Instalar dependencias de desarrollo: `npm install --save-dev jest @forge/kvs` (kvs va en dependencies: ajustar según corresponda: `npm install @forge/kvs` y `npm install --save-dev jest`).
- [ ] Configurar script `test` en `package.json` (`"test": "jest"`).
- [ ] Crear estructura de carpetas de backend:

  ```text
  src/
    index.js                 # resolvers (puente UI <-> backend)
    jira/                    # Jira Integration Layer
    metrics/                 # Data Normalizer + cálculo de métricas
    health/                  # Health Engine + Recommendation Engine
    storage/                 # Snapshot Service + config
    triggers/                # scheduled trigger (snapshot diario)
    frontend/
      index.jsx              # dashboard
      components/            # componentes UI Kit
  __tests__/                 # tests unitarios
  ```

- **DoD:** `npm test` corre (aunque no haya tests aún o solo uno trivial) y `forge lint` pasa.

### Checkpoint Fase 0

- `forge lint` OK, `npm test` OK, app desplegada e instalada en development.
- Decisiones de arquitectura documentadas.

---

## Fase 1 — Foundation (Sprint 1)

Objetivo: el usuario puede seleccionar proyectos, guardar esa configuración y el backend sabe leer datos básicos de Jira. Sin scores todavía.

### Tarea 1.1 — Definir scopes y manifest

- [ ] Añadir scopes mínimos en `manifest.yml`: `read:jira-work`, `read:jira-user` (revisar con `forge lint`; añadir `storage:app` lo gestiona KVS automáticamente al importarlo — validar con lint).
- [ ] Añadir módulo `scheduledTrigger` (diario, p. ej. a las 06:00) con su función asociada (el handler puede ser un stub por ahora).
- [ ] Ejecutar `forge lint`, `forge deploy --non-interactive -e development` y `forge install --non-interactive --upgrade ...` (obligatorio al añadir scopes).
- **DoD:** manifest válido con scopes y trigger desplegado.

### Tarea 1.2 — Modelo interno de datos (Data Normalizer)

Archivo: `src/metrics/model.js`

- [ ] Definir los tipos (JSDoc, vanilla JS) según §22: `Project`, `ProjectSnapshot`, `HealthFactor`, `NormalizedIssue`.
- [ ] `NormalizedIssue` debe contener solo lo necesario: `key`, `statusCategory` (To Do / In Progress / Done), `assigneeId`, `dueDate`, `created`, `resolutionDate`, `storyPoints` (si existe), `labels`, `links` (blockedBy/blocks con dirección y timestamps), `history` (fechas de transición de estado, solo lo imprescindible para cycle time y reopened).
- [ ] Función `normalizeIssue(jiraIssue) -> NormalizedIssue` que mapea la respuesta REST al modelo interno.
- **DoD:** normalizer con test unitario sobre un JSON de ejemplo de la API de Jira.

### Tarea 1.3 — Jira Integration Layer

Archivo: `src/jira/client.js`

Tarea grande — subtareas:

- [ ] **1.3.a — Listar proyectos:** `listProjects(asUserApi)` usando `GET /rest/api/3/project/search` con paginación. Devuelve `{ id, key, name }[]`.
- [ ] **1.3.b — Obtener issues de un proyecto:** `getProjectIssues(projectKey)` usando `GET /rest/api/3/search/jql` (JQL: `project = <KEY>`), con:
  - campos mínimos: `summary,status,assignee,duedate,created,resolutiondate,customfield (story points),issuelinks`;
  - `expand=changelog` para transiciones de estado y reopened (§10, §11);
  - paginación completa (nextPageToken).
- [ ] **1.3.c — Resiliencia:** manejo de errores por proyecto: si un proyecto falla (permisos, proyecto vacío), devolver `{ ok: false, reason }` en vez de lanzar excepción que tumbe todo el análisis (§24 Resilience).
- [ ] **1.3.d — Rate limiting:** reintentos sencillos con backoff ante 429.
- **DoD:** funciones cubiertas con tests unitarios (mock de `api.asUser()`), paginación y error paths probados.

### Tarea 1.4 — Persistencia de configuración

Archivo: `src/storage/configStore.js`

- [ ] `getConfig()` / `saveConfig()` sobre KVS, clave `config:portfolio`.
- [ ] Esquema de config: `{ selectedProjectKeys: string[], thresholds?: {...}, baselinePolicy: "first-snapshot" }`.
- [ ] Defaults de thresholds según §14 (`healthy: 80, atRisk: 60`) y §11 (scope: 5/15/25%).
- **DoD:** tests unitarios de round-trip con mock de KVS.

### Tarea 1.5 — Pantalla de setup (selección de proyectos)

Archivos: `src/frontend/index.jsx`, `src/frontend/components/ProjectSelector.jsx`, resolver en `src/index.js`

Tarea grande — subtareas:

- [ ] **1.5.a — Resolver `getProjects`:** devuelve la lista de proyectos visibles para el usuario (usa 1.3.a).
- [ ] **1.5.b — Resolvers `getConfig` / `saveConfig`:** exponen 1.4 al frontend.
- [ ] **1.5.c — UI de setup:** si no hay proyectos seleccionados, mostrar la pantalla "Select projects to monitor" (§26) con checkboxes + botón `[Start analysis]` (componentes UI Kit: `Checkbox`, `Button`, `Form` — NUNCA `<div>`, usar `Box`/`Stack`).
- [ ] **1.5.d — Estado de carga:** pantalla "Analyzing portfolio..." con pasos (§26 Loading) mientras corre el primer análisis (por ahora el análisis será un stub que solo guarda config).
- **DoD:** flujo manual verificado en el sitio de desarrollo: instalar → seleccionar proyectos → guardar → recargar y la selección persiste.

### Checkpoint Fase 1

- Selección de proyectos persistida y recuperable.
- Backend capaz de listar issues normalizados de un proyecto real del sitio de desarrollo.
- `forge lint` + `npm test` OK.

---

## Fase 2 — Metrics (Sprint 2)

Objetivo: a partir de los issues normalizados, calcular las métricas brutas de las 5 dimensiones. Todas las funciones son puras y testeables (§23).

Archivos: `src/metrics/schedule.js`, `src/metrics/delivery.js`, `src/metrics/scope.js`, `src/metrics/capacity.js`, `src/metrics/dependencies.js`, `src/metrics/index.js`

### Tarea 2.1 — Métricas de Schedule (§9)

- [ ] `overdueRatio = overdueIssues / issuesWithDueDate` (si `issuesWithDueDate === 0` → métrica `null`, no 0 — §24 Resilience).
- [ ] `completionRatio = doneIssues / totalIssues`.
- [ ] Conteo de issues sin due date dentro del conjunto planificado.
- **DoD:** tests con datasets sintéticos: proyecto sin atrasos, con atrasos, sin due dates (caso `null`).

### Tarea 2.2 — Métricas de Delivery (§10)

Tarea grande — subtareas:

- [ ] **2.2.a — Throughput semanal:** issues completados por semana (últimas 4–6 semanas), usando `resolutionDate`.
- [ ] **2.2.b — Tendencia de throughput:** variación % entre la media de las 2 últimas semanas y las 2 anteriores.
- [ ] **2.2.c — Reopened ratio:** issues con transición Done → no-Done en changelog / total de issues completados.
- [ ] **2.2.d — Edad media de issues en progreso:** días desde transición a In Progress (changelog) hasta hoy.
- **DoD:** tests por subtarea, incluyendo changelog vacío (cycle time no disponible → `null`).

### Tarea 2.3 — Métricas de Scope (§11)

- [ ] `currentScope = totalIssues` (o suma de story points si existen — decidir: issues para MVP).
- [ ] `scopeGrowthPercent = (currentScope - baselineScope) / baselineScope * 100`.
- [ ] Baseline = primer snapshot almacenado por la app (§11 "cuando no exista baseline formal"). Función `getBaseline(projectKey)` en `src/storage/snapshotStore.js` (stub en esta fase, se completa en Fase 5; en Fase 2 el baseline se recibe como parámetro).
- **DoD:** tests: 0%, +10%, +30%, sin baseline (→ `null`).

### Tarea 2.4 — Métricas de Capacity (§12)

- [ ] WIP por usuario: issues In Progress agrupados por assignee (ignorar unassigned).
- [ ] `averageWipPerUser`, `maxWipPerUser`, señal `workloadSignal: LOW | NORMAL | HIGH` comparando WIP actual vs. media histórica del propio proyecto (en MVP: umbrales fijos documentados, p. ej. HIGH si WIP/usuario > 1.5× media de usuarios activos).
- [ ] Si hay menos de N usuarios con WIP (datos insuficientes) → `capacity: null` con reason "Insufficient workload/capacity data" (§12 — no inventar datos).
- **DoD:** tests: proyecto sano, sobrecargado, sin assignees (→ `null`).

### Tarea 2.5 — Métricas de Dependencies (§13)

- [ ] `blockedCount`: issues con link entrante "is blocked by" cuyo bloqueante no está Done.
- [ ] `blockedAge`: días desde que se creó el link de bloqueo (o proxy: desde última actualización si el changelog no lo da — documentar la aproximación).
- [ ] `dependentProjectCount`: nº de proyectos distintos de los bloqueantes (dependencias cross-project).
- **DoD:** tests: sin bloqueos, bloqueos recientes, bloqueos > 5 días, dependencias externas al proyecto.

### Tarea 2.6 — Orquestador de métricas

Archivo: `src/metrics/index.js`

- [ ] `computeProjectMetrics(normalizedIssues, baseline) -> ProjectMetrics` que agrupa las 5 dimensiones y nunca lanza excepción por datos faltantes (cada dimensión devuelve métricas o `null`).
- **DoD:** test de integración con un dataset sintético completo.

### Checkpoint Fase 2

- Cobertura de tests sobre las 5 dimensiones, incluidos los casos `null` (§30 "Missing data").
- Ninguna función de métricas hace I/O (puras).

---

## Fase 3 — Health Engine (Sprint 3)

Objetivo: convertir métricas en scores explicables y recomendaciones. Todo determinista (§4.4).

Archivos: `src/health/score.js`, `src/health/dimensions.js`, `src/health/factors.js`, `src/health/recommendations.js`

### Tarea 3.1 — Fórmula del Health Score (§8, §23)

- [ ] Implementar `calculateHealthScore(scores)` con la fórmula alternativa recomendada: Schedule 30%, Delivery 25%, Scope 15%, Capacity 15%, Dependencies 15%.
- [ ] Manejo de dimensiones `null`: redistribuir el peso proporcionalmente entre las dimensiones disponibles (§24 — no penalizar por falta de datos). Documentar la regla.
- [ ] `Math.round` y clamp a [0, 100].
- **DoD:** tests unitarios incluido el caso §30 "Healthy project" (esperado ≥ 90).

### Tarea 3.2 — Dimension scores con factores (§9–§13, §15)

Tarea grande — una subtarea por dimensión; cada una devuelve `{ score, factors: HealthFactor[] }` (estructura JSON del §15):

- [ ] **3.2.a — Schedule score:** penalizaciones por `overdueRatio` y completion estancada. Escala orientativa §9 (100 sin señales → 20 retraso crítico). Factores tipo `OVERDUE_ISSUES` con `impact` y `message`.
- [ ] **3.2.b — Delivery score:** esquema de penalizaciones §10 (-20 throughput bajando >20%, -10 reopened elevado, -10 issues envejecidos).
- [ ] **3.2.c — Scope score:** thresholds §11 (0–5% healthy, 5–15% warning, 15–25% risk, >25% crítico). DoD incluye test §30 "Scope creep" (30% → score ≤ 40).
- [ ] **3.2.d — Capacity score:** según `workloadSignal`; `null` si no hay datos.
- [ ] **3.2.e — Dependencies score:** penalización por `blockedCount` y `blockedAge` (> 5 días). DoD incluye test §30 "Blocked dependencies".
- **DoD global:** cada score lleva sus factores explicables; mensajes en inglés (convención del repo) listos para mostrar en UI.

### Tarea 3.3 — Status thresholds (§14)

- [ ] `getStatus(healthScore, thresholds) -> "HEALTHY" | "AT_RISK" | "CRITICAL"` con defaults 80/60 leídos de config.
- **DoD:** tests de frontera (79/80/81, 59/60/61).

### Tarea 3.4 — Recommendation Engine (§17)

Archivo: `src/health/recommendations.js`

- [ ] Tabla de reglas simples (data-driven, array de reglas `{ when, recommendation }`), NO IA:
  - `scope_growth > 20%` → "Review or remove low-priority scope."
  - `blocked_issues >= 3` → "Review the top blockers and assign owners."
  - `overdue_ratio > 0.20` → "Review project schedule and overdue work."
  - `workload_signal == HIGH` → "Review WIP and team allocation."
- [ ] Ordenar recomendaciones por impacto del factor que las origina; limitar a top 3 por proyecto.
- **DoD:** tests por cada regla + caso sin recomendaciones (proyecto sano).

### Tarea 3.5 — Orquestador del análisis

Archivo: `src/health/analyzeProject.js`

- [ ] `analyzeProject(projectKey)`: client Jira → normalizer → metrics → dimension scores → health score → recommendations → objeto resultado completo (listo para persistir como snapshot en Fase 5 y para servir al dashboard).
- [ ] Resolver `runAnalysis` en `src/index.js` que ejecuta el análisis para todos los proyectos seleccionados y guarda el resultado más reciente en KVS (`latest:<projectKey>`) para que el dashboard no recalcule en cada carga (§24 Performance).
- **DoD:** el botón "Start analysis" de la Fase 1 ejecuta el pipeline completo real; resultado cacheado en KVS.

### Checkpoint Fase 3

- Todos los tests críticos de §30 en verde.
- Análisis end-to-end real sobre proyectos del sitio de desarrollo.

---

## Fase 4 — Dashboard (Sprint 4)

Objetivo: las tres pantallas principales del MVP, respondiendo en < 10 s (§7 Regla UX).

Archivos: `src/frontend/index.jsx`, `src/frontend/components/*.jsx`

### Tarea 4.1 — Portfolio overview (§7, §26)

Tarea grande — subtareas:

- [ ] **4.1.a — Resolver `getDashboard`:** devuelve overall health (media de health scores de proyectos), conteos por status y la lista de proyectos con health/trend/status desde KVS `latest:*`.
- [ ] **4.1.b — Cabecera ejecutiva:** "Overall Health 74/100" + conteos Critical/At Risk/On Track (`Heading`, `Lozenge`, `Inline`).
- [ ] **4.1.c — Top Attention:** los 3 proyectos con peor health (`SectionMessage` o lista con `Lozenge` de color por status).
- [ ] **4.1.d — Tabla Health by Project:** `DynamicTable` (NUNCA `Table`) con columnas Project / Health / Trend / Status; trend de momento placeholder "—" (se rellena en Fase 5).
- **DoD:** dashboard carga en < 10 s con datos reales del sitio de desarrollo.

### Tarea 4.2 — Attention Queue (§18)

- [ ] Resolver `getAttentionQueue`: ordena por severidad DESC → health ASC → deterioro reciente DESC (deterioro: stub 0 hasta Fase 5, orden ya implementado).
- [ ] Componente `AttentionQueue.jsx`: tarjetas con lozenge de status, health, "Main issue" (factor de mayor impacto) y enlace al detalle.
- **DoD:** orden verificado con test unitario del criterio de ordenación.

### Tarea 4.3 — Project Detail (§16)

Tarea grande — subtareas:

- [ ] **4.3.a — Resolver `getProjectDetail(projectKey)`:** devuelve snapshot más reciente + dimensiones + factores + recomendaciones.
- [ ] **4.3.b — Cabecera:** nombre, health con lozenge, línea de tendencia (placeholder hasta Fase 5).
- [ ] **4.3.c — Sección DIMENSIONS:** las 5 dimensiones con su score y lozenge por color; si una dimensión es `null`, mostrar "N/A — Insufficient data" (§12, §24).
- [ ] **4.3.d — Sección "Why?":** lista numerada de los factores ordenados por impacto, con sus mensajes explicativos (§16).
- [ ] **4.3.e — Sección "Recommended actions":** top 3 recomendaciones del Recommendation Engine.
- **DoD:** navegación dashboard → detalle → volver, cumpliendo la regla de oro §36: el usuario ve qué pasa, por qué y qué revisar.

### Tarea 4.4 — Navegación entre pantallas

- [ ] Estado de vista en el frontend (setup / loading / dashboard / detalle) sin salir de la global page.
- [ ] Botón "Re-run analysis" en el dashboard que dispara `runAnalysis` y refresca.
- **DoD:** flujo completo §6 navegable sin recargar la página.

### Checkpoint Fase 4

- Las 4 prioridades del dashboard (§26) visibles: overall health, attention queue, health by project, (trend pendiente de Fase 5).
- Revisión UX: un usuario nuevo entiende la pantalla sin documentación (§29).

---

## Fase 5 — Historical data (Sprint 5)

Objetivo: snapshots diarios, tendencias y detección de deterioro.

### Tarea 5.1 — Snapshot Service

Archivo: `src/storage/snapshotStore.js`

Tarea grande — subtareas:

- [ ] **5.1.a — `saveSnapshot(projectKey, snapshot)`:** KVS clave `snapshot:<projectKey>:<yyyy-mm-dd>` con el formato `ProjectSnapshot` de §22.
- [ ] **5.1.b — `getSnapshots(projectKey, days)`:** lectura de los últimos N días (consultar capacidad de query por prefijo de KVS; si no basta, mantener un índice por proyecto `snapshots-index:<projectKey>` con las fechas).
- [ ] **5.1.c — `getBaseline(projectKey)`:** primer snapshot del proyecto (cierra la Tarea 2.3).
- [ ] **5.1.d — Retención:** borrar snapshots > 90 días (MVP; documentar decisión).
- **DoD:** tests con mock de KVS: guardar, leer rango, baseline, retención.

### Tarea 5.2 — Scheduled trigger diario (§19)

Archivo: `src/triggers/dailySnapshot.js`

- [ ] Completar el handler del `scheduledTrigger` (registrado en Fase 1): para cada proyecto seleccionado → `analyzeProject` → `saveSnapshot`.
- [ ] Idempotencia: si ya existe snapshot de hoy, sobrescribir (misma clave) — seguro ante re-ejecuciones.
- [ ] Logs sin contenido sensible (§25): solo project key y timings, nunca summaries de issues.
- **DoD:** verificado con `forge logs --since 15m -e development` tras forzar una ejecución.

### Tarea 5.3 — Trends en UI

- [ ] Resolver `getTrend(projectKey, days)` → serie de health scores.
- [ ] Columna Trend del dashboard (↑/↓/→ comparando con snapshot de hace 7 días).
- [ ] Línea de tendencia en Project Detail (§16: `78 → 71 → 64 → 55 → 42`); si el tiempo lo permite, `LineChart` de UI Kit.
- **DoD:** con snapshots sembrados manualmente en KVS, la UI muestra tendencias correctas.

### Tarea 5.4 — Detección de deterioro

- [ ] Función `computeDeterioration(projectKey)` = health actual − health de hace 14 días.
- [ ] Integrar en Attention Queue: criterio "recent deterioration DESC" (completa Tarea 4.2) y mostrar "↓ -19 in 14 days" (§18).
- **DoD:** test unitario del cálculo + verificación visual en la queue.

### Checkpoint Fase 5

- Snapshots diarios persistiendo sin intervención.
- Trends visibles en dashboard y detalle.

---

## Fase 6 — Alerts + polish (Sprint 6)

Objetivo: cerrar el MVP con alertas, robustez y validación de la Definition of Done (§29).

### Tarea 6.1 — Motor de alertas (§20)

Archivo: `src/health/alerts.js`

Tarea grande — subtareas:

- [ ] **6.1.a — Reglas:** implementar las 5 reglas del §20 comparando snapshot actual vs. anterior (drop ≥ 10 puntos; transición Healthy→At Risk; At Risk→Critical; nueva dependencia crítica; scope growth > threshold).
- [ ] **6.1.b — Persistencia de alertas:** KVS `alerts:<projectKey>` (lista acotada, p. ej. últimas 20).
- [ ] **6.1.c — Generación:** el trigger diario (Tarea 5.2) evalúa reglas tras guardar el snapshot.
- [ ] **6.1.d — UI:** sección de alertas en dashboard (`SectionMessage`) y badge en el proyecto afectado. Sin integraciones externas (fuera de alcance).
- **DoD:** tests por regla; alerta visible en UI tras sembrar snapshots que la disparen.

### Tarea 6.2 — Empty y error states (§26)

- [ ] Empty state: portfolio sin proyectos seleccionados → redirige a setup (`EmptyState`).
- [ ] Empty state: proyecto sin issues / sin datos suficientes → mensaje "N/A — Insufficient data", sin penalización de score.
- [ ] Error state: fallo de API de Jira por proyecto → el proyecto aparece como "Analysis unavailable" sin romper el resto del dashboard.
- [ ] Error state: permisos insuficientes sobre un proyecto → mensaje claro al usuario.
- **DoD:** cada estado forzado manualmente y verificado en el sitio de desarrollo.

### Tarea 6.3 — Performance (§24)

- [ ] Medir tiempo de carga del dashboard con 10+ proyectos (objetivo < 10 s; el dashboard lee de KVS, nunca recalcula).
- [ ] Si el análisis completo es lento: paralelizar proyectos con `Promise.all` acotado en el resolver `runAnalysis`.
- [ ] Revisar consumo de invocaciones del trigger (1 invocación/día que recorre proyectos — aceptable; documentar).
- **DoD:** mediciones registradas en `docs/performance-notes.md`.

### Tarea 6.4 — Permisos y seguridad (§24, §25)

- [ ] Verificar que todas las llamadas a Jira usan `.asUser()` (ningún dato que el usuario no pueda ver).
- [ ] Revisar scopes: eliminar los que no se usen (least privilege).
- [ ] Auditoría de logs: ningún log con summaries/descripciones de issues.
- [ ] Confirmar que no se envía nada a servicios externos.
- **DoD:** checklist de seguridad completado; se puede usar la skill `forge-security-review` como apoyo.

### Tarea 6.5 — Telemetría mínima (§27)

- [ ] Registrar eventos de producto en logs (sin contenido de issues): install, first scan completed, dashboard opened, project detail opened, alert triggered.
- **DoD:** eventos visibles en `forge logs`.

### Tarea 6.6 — Validación final y release

Tarea grande — subtareas:

- [ ] **6.6.a — Definition of Done (§29):** recorrer las 14 casillas una a una y evidenciar cada una.
- [ ] **6.6.b — Tests:** suite completa en verde (`npm test`), incluidos los tests críticos de §30.
- [ ] **6.6.c — Review:** ejecutar la skill `forge-app-review` (pre-release readiness) y resolver hallazgos bloqueantes.
- [ ] **6.6.d — Deploy a staging/production:** `forge deploy --non-interactive -e production` e `forge install --non-interactive --upgrade ...` si hay cambios de scopes.
- [ ] **6.6.e — README:** actualizar con qué hace la app, cómo instalarla y cómo desarrollar.
- **DoD:** MVP instalado y funcionando en producción del sitio de desarrollo; §29 completo.

### Checkpoint Fase 6

- MVP completo según §29.
- Hipótesis §32 listas para validar con usuarios reales (§33 — fuera del scope de ingeniería).

---

## Riesgos y dependencias transversales

- **Rate limits de Jira API** en proyectos grandes: mitigado en 1.3.d (backoff) y 6.3 (medición). Si aparece antes, adelantar paginación incremental.
- **Changelog no disponible o incompleto** (proyectos con mucho histórico): cycle time / reopened pueden ser `null`; el diseño de `null`-scores (Fase 2/3) ya lo absorbe.
- **Story points no estandarizados** (custom field varía por instancia): MVP usa conteo de issues; story points solo si el campo está claramente identificado.
- **KVS no permite range queries por prefijo en todos los casos:** la Tarea 5.1.b contempla índice alternativo.
- **Límite de ejecución del scheduled trigger** (tiempo/invocación): si un portfolio grande no cabe en una ejecución, dividir en lotes por proyecto (se detectará en 5.2/6.3).

## Orden de ejecución resumido

```text
Fase 0  Setup ──────────────────────┐
Fase 1  Foundation (selección+cfg)  │
Fase 2  Metrics (puras, testeadas)  │  cadena crítica:
Fase 3  Health Engine + análisis    │  cada fase depende
Fase 4  Dashboard (3 pantallas)     │  de la anterior
Fase 5  Snapshots + trends          │
Fase 6  Alerts + polish + release ──┘
```

Posibles solapes una vez cerrada la Fase 3: la UI de Fase 4 puede avanzar con datos sembrados en KVS mientras se implementa Fase 5 en paralelo.
