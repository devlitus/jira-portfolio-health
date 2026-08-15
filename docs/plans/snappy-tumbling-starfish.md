# Plan (draft): Refactor de UI al sistema de diseño "Executive Oversight"

## Contexto

El frontend actual (`src/frontend/`) es funcional pero visualmente mínimo: HTML semántico sin estilos, heredado de las tareas 4.x-6.x del plan de implementación. `DESIGN.md` define un sistema de diseño completo ("Executive Oversight": paleta semántica de semáforo, tipografía Inter/JetBrains Mono, grid de 12 columnas, tarjetas tonales) y `stitch_nvp_reference_dashboard/` (`code.html` + `screen.png`) es un mockup estático de referencia generado con Tailwind CDN que ilustra ese sistema aplicado a la pantalla de Dashboard.

El objetivo es re-estilizar los componentes reales de la app (que ya leen datos reales del resolver vía `invoke`, Tarea 4.1-4.4/6.2) para que se vean como el mockup, usando el Tailwind v4 ya configurado en esta sesión (`src/frontend/styles.css`, `npm run build`). El mockup **no se copia literalmente**: solo cubre la pantalla de Dashboard con datos inventados y asume un shell de navegación multi-página que no existe en esta app (page global única con máquina de estados). La sección "Adaptaciones" documenta cada punto donde diverjo del HTML de referencia y por qué.

No hay tests de componentes de frontend (`src/frontend/**/*.test.tsx` no existe; los tests actuales son todos de lógica pura en `__tests__/`), así que este refactor no requiere migrar snapshots ni tests DOM.

Convenciones de este plan (igual que `docs/implementation-plan.md`): cada tarea indica los archivos que crea o modifica, las tareas grandes están divididas en subtareas accionables, y cada tarea cierra con un "DoD" (criterio de aceptación verificable).

## Adaptaciones respecto al mockup (decisiones, no preguntas abiertas)

1. **Fuentes: sin CDN, stack de sistema aproximado.** El mockup carga Inter y JetBrains Mono desde `fonts.googleapis.com`. `manifest.yml` no declara egress para dominios externos, y el CSP de Forge Custom UI bloquearía esa carga sin declararlo explícitamente (y añadir egress solo por estética no está justificado). V1 usa una pila de fuentes de sistema que aproxima Inter/JetBrains Mono (`ui-sans-serif, system-ui, "Segoe UI", ...` / `ui-monospace, "Cascadia Code", "Roboto Mono", monospace`), declarada como `--font-sans`/`--font-mono`. Auto-hospedar los woff2 reales (`@fontsource/inter` + `@fontsource/jetbrains-mono`) queda como fast-follow opcional.
2. **Iconos: SVG inline propios, no Material Symbols.** Mismo motivo de CSP/egress. Set pequeño (10-12 iconos) como componentes React con `currentColor`, sin petición externa.
3. **Sin modo oscuro en v1.** `DESIGN.md` no describe paleta dark (las clases `dark:` de `code.html` son boilerplate del generador). Solo se implementa el tema claro del frontmatter.
4. **Shell de navegación adaptado a la máquina de estados real.** La app es un único `jira:globalPage` con estados (`loading/setup/analyzing/ready/detail/error` en `index.tsx`), no rutas. Del sidebar del mockup: "Dashboard" vuelve a `status='ready'`; "Configuration" dispara lo mismo que el botón actual "Edit selection" (`status='setup'`); se elimina el link "Project Detail" (no es un destino navegable en frío) y en su lugar, en `status==='detail'`, se muestra el nombre del proyecto como breadcrumb. El shell envuelve todos los estados salvo el `loading` inicial (spinner centrado sin chrome).
5. **"Lead: Nombre" → project key.** No hay campo de responsable a nivel de proyecto en el modelo de datos. La sub-línea bajo el nombre de proyecto usa `projectKey` (dato real) en vez de inventar un lead.
6. **"Last refreshed: Just now" se omite.** No hay timestamp de última sincronización expuesto por `DashboardSummary` hoy (fast-follow posible). El botón sí se mapea 1:1: `onRerunAnalysis`/`isRerunning` → "Re-run analysis" con icono refresh.
7. **Sección "Recent Alerts" nueva** (sin equivalente en el mockup): `summary.alerts` (§20, ya en `Dashboard.tsx`) se muestra como card `lg:col-span-12` debajo de "Health by Project", en formato compacto de una línea.
8. **Responsive sí se implementa** (especificado en `DESIGN.md` § Layout & Spacing, no es hipotético): breakpoints `lg`/`md`. El sidebar en mobile se simplifica a una topbar delgada solo con branding, sin drawer.
9. **Copys con datos reales**, no literales del mockup (p.ej. el conteo de proyectos sale de `summary.projects.length`).

---

## Fase A — Tokens y primitivas compartidas

Objetivo: dejar la base de diseño (colores, tipografía, iconos, badges reutilizables) antes de tocar ninguna pantalla.

### Tarea A.1 — Design tokens en Tailwind (`@theme`)

- [x] Transcribir 1:1 el frontmatter de `DESIGN.md` (colors, typography, rounded, spacing) a un bloque `@theme` en `src/frontend/styles.css` (`--color-*`, `--font-*`, `--text-*`, `--radius-*`, `--spacing-*`).
- [x] Definir `--font-sans`/`--font-mono` con los stacks de sistema de la Adaptación 1 (no Inter/JetBrains Mono reales).
- [x] Aplicar `background`/`color`/`font-family` base sobre `body`.
- **DoD:** `npm run build:css` genera utilidades tipo `bg-surface`, `text-display-hero`, `rounded-lg`, `p-gutter` sin warnings; un `className` de prueba con esas clases se ve reflejado en `static/main/styles.css`.

### Tarea A.2 — Set de iconos SVG inline

- [x] Crear `src/frontend/components/ui/icons.tsx` con 10-12 iconos como componentes React (`currentColor`, tamaño vía prop): dashboard, chart/analytics, settings, warning, info, refresh, arrow-up, arrow-down, arrow-forward, filter, more-vert, notifications.
- **DoD:** cada icono renderiza sin dependencias externas ni `<link>`/`fetch` a CDN.

### Tarea A.3 — Consolidar `StatusBadge` y `TrendBadge`

- [x] Crear `src/frontend/components/ui/StatusBadge.tsx`, reemplazando las copias duplicadas de `STATUS_LABELS`/`STATUS_COLORS`/`StatusBadge` en `Dashboard.tsx` y `ProjectDetail.tsx` por un único componente (estilo "Status Chip": fondo sólido, texto blanco, `label-bold` uppercase).
- [x] Crear `src/frontend/components/ui/TrendBadge.tsx`, que convierte el string de tendencia (`↑`/`↓`/`→`/`—` de `src/health/trend.ts`) en el badge circular con color semántico del mockup.
- **DoD:** `Dashboard.tsx` y `ProjectDetail.tsx` importan `StatusBadge` desde `ui/` (cero definiciones locales duplicadas); `TrendBadge` queda listo para usarse en la Fase C y D.

---

## Fase B — Shell de navegación

Objetivo: envolver la app en el sidebar/topbar del sistema de diseño, mapeado a la máquina de estados real (Adaptación 4).

### Tarea B.1 — `AppShell.tsx`

- [ ] Crear `src/frontend/components/AppShell.tsx`: sidebar fijo desktop (branding, nav "Dashboard"/"Configuration", breadcrumb de proyecto en `detail`) + topbar delgada mobile (solo branding, sin drawer).
- **DoD:** `AppShell` es puro en props (`activeView`, `onNavigateDashboard`, `onNavigateConfiguration`, `detailProjectName?`) — no conoce el estado interno de `index.tsx`.

### Tarea B.2 — Integrar `AppShell` en `index.tsx`

- [ ] Envolver el contenido de los estados `setup/analyzing/ready/detail/error` en `<AppShell>`; dejar `loading` fuera (spinner centrado sin chrome).
- [ ] Conectar "Dashboard" → `setStatus('ready')` (solo si `dashboard` ya existe) y "Configuration" → `setStatus('setup')`, reusando la lógica que hoy dispara el botón "Edit selection".
- **DoD:** navegar por los 5 estados no rompe el flujo existente (`invoke` calls intactas); `npm run lint` pasa.

---

## Fase C — Dashboard (`Dashboard.tsx`)

### Tarea C.1 — Hero de salud + desglose de estados

- [ ] Card `lg:col-span-8`: score `display-hero` + `/100`, subtítulo con copy real (Adaptación 9), barras Critical/At Risk/Healthy con `statusCounts` real.
- **DoD:** los 3 conteos y el `overallHealth` mostrados coinciden con `summary` sin datos hardcodeados.

### Tarea C.2 — Tabla "Health by Project"

- [ ] Migrar `ProjectRow`/tabla a los estilos de `code.html` (zebra, `data-mono` para score, `TrendBadge`, `StatusBadge`, sub-línea con `projectKey` en vez de "Lead").
- [ ] Conservar el badge de alertas (`⚠`) existente, integrado al nuevo estilo de fila.
- **DoD:** cada fila sigue siendo clicable (`onSelectProject`) y conserva los 3 casos de `reasonKind` (`no-analysis`/`failed`/`insufficient-data`).

### Tarea C.3 — Sección "Recent Alerts" (nueva, Adaptación 7)

- [ ] Card `lg:col-span-12` debajo de la tabla, listando `summary.alerts` en formato compacto (proyecto, mensaje, fecha), mismo lenguaje visual que Attention Queue.
- **DoD:** con `alerts.length === 0` se muestra un estado vacío consistente con el resto (no una sección vacía silenciosa).

---

## Fase D — Attention Queue (`AttentionQueue.tsx`)

### Tarea D.1 — Tarjetas con borde-acento por severidad

- [ ] Re-estilizar `AttentionQueueCard` como tarjeta con borde izquierdo de 4px por `status` (rojo/ámbar), `TrendBadge`, línea "Main issue" con icono `info`.
- **DoD:** el estado vacío ("Nothing needs attention") y `onSelectProject` se conservan.

---

## Fase E — Project Detail (`ProjectDetail.tsx`)

Sin referencia visual directa del mockup (`code.html` solo cubre Dashboard) — se extrapola con los mismos tokens.

### Tarea E.1 — Header + Dimensiones

- [ ] Header con nombre, `StatusBadge`, trend line (`data-mono`, formato `78 → 71 → 64 → 55 → 42`).
- [ ] Lista de 5 dimensiones (`DimensionRow`) como card con divisores suaves, `status` por dimensión vía `StatusBadge`, "N/A — Insufficient data" para dimensiones nulas (§12/§24, sin penalizar datos faltantes).
- **DoD:** los 3 casos (`reason`/`reasonKind` ausente, `failed`, sin análisis) se distinguen visualmente igual que hoy en texto plano.

### Tarea E.2 — "Why?" y "Recommended actions"

- [ ] Listas de `factors`/`recommendations` con tooltips explicativos (fondo slate oscuro, texto `body-sm` blanco) por factor, siguiendo "Explainer Tooltips" de `DESIGN.md`.
- **DoD:** factores ordenados por impacto (ya vienen ordenados del backend) se muestran sin reordenar en el cliente.

---

## Fase F — Project Selector y estados vacíos/error

### Tarea F.1 — `ProjectSelector.tsx` (setup screen)

- [ ] Re-estilizar el checklist de proyectos y el estado "No projects found" con los tokens (card, checkboxes, botón primario Atlassian-blue).
- **DoD:** `selectedKeys.size === 0` sigue deshabilitando "Start analysis".

### Tarea F.2 — Estados vacíos/error inline en `index.tsx`

- [ ] Re-estilizar `status==='loading'`, `status==='error'` y `status==='analyzing'` (lista de `ANALYSIS_STEPS`) con los mismos tokens, sin nuevos archivos compartidos (uso único).
- **DoD:** `role="alert"` en el estado de error se conserva para accesibilidad.

---

## Fase G — Verificación

### Tarea G.1 — Build y checks estáticos

- [ ] `npm run build` (Tailwind + esbuild) sin errores.
- [ ] `npm run lint` y `npm test` sin romper nada (no tocan `src/health`/`src/metrics`, y no hay tests de componentes que migrar).
- **DoD:** los 3 comandos pasan en verde.

### Tarea G.2 — Chequeo visual

- [ ] Levantar la app (skill `run`, tunnel/browser) y comparar Dashboard contra `screen.png` a 1280px+.
- [ ] Spot-check de Attention Queue, tabla, Project Detail y Project Selector en viewport `md`/mobile.
- **DoD:** paleta semántica (verde/ámbar/rojo por umbral), tipografía y bordes coinciden con `DESIGN.md` en las 4 pantallas.
