# Plan: Refactor de UI hacia el prototipo "Portfolio Health Dashboard (Standalone).html"

## Contexto

`Portfolio Health Dashboard (Standalone).html` (raíz del repo) es un prototipo estático autoexportado (bundle con recursos comprimidos, no legible como HTML plano) que muestra un sistema visual distinto al que implementó `docs/plans/snappy-tumbling-starfish.md` (sidebar izquierdo "Executive Oversight"). Para poder planear este refacto sin adivinar, el prototipo se sirvió localmente (`node` + servidor HTTP estático) y se inspeccionó con Playwright: capturas de sus 4 pantallas (Setup, Dashboard, Recommended Actions, Project Detail) y el árbol de accesibilidad. Esa inspección es la fuente de verdad de este plan — no el HTML crudo del archivo.

Reproducir las capturas si hace falta releer el diseño durante la implementación:

```bash
node -e "const h=require('http'),fs=require('fs'),p=require('path');h.createServer((q,r)=>{const f=p.join(__dirname,decodeURIComponent(q.url==='/'?'/Portfolio Health Dashboard (Standalone).html':q.url));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200);r.end(d)})}).listen(8934)" &
```

y luego navegar con Playwright/Chrome a `http://localhost:8934/`, haciendo clic en cada tab (Dashboard / Recommended Actions / Setup) y en una fila de la tabla "Health by project" para llegar a Project Detail.

**Diferencia estructural clave con el estado actual:** el prototipo reemplaza el sidebar izquierdo (`AppShell.tsx` actual) por una barra de tabs horizontal ("Portfolio Health" + Dashboard / Recommended Actions / Setup), añade una pantalla nueva sin equivalente hoy ("Recommended Actions", agregando recomendaciones de todos los proyectos monitoreados en una sola lista), y rediseña Project Detail (selector de proyecto por tabs, gráfico de tendencia real en vez de texto, barras de progreso por dimensión, tarjetas numeradas "Why?").

Este refacto reutiliza los design tokens ya existentes en `src/frontend/styles.css` (colores, radios, tipografía) — el prototipo usa la misma paleta semántica semáforo y el mismo azul primario (`#0052CC`/`#003D9B`), así que **no hace falta una fase de tokens nueva**, solo iconos SVG adicionales.

Convenciones de este plan (igual que `docs/implementation-plan.md` y el plan anterior): cada tarea indica los archivos que crea o modifica, las tareas grandes están divididas en subtareas accionables, y cada tarea cierra con un "DoD" verificable. Checkboxes empiezan sin marcar.

## Adaptaciones respecto al prototipo (decisiones, no preguntas abiertas)

1. **Sin chrome falso de Jira.** El prototipo dibuja una barra superior negra falsa (logo "Northwind Workspace", buscador, campana, avatar "AM") y un breadcrumb "Apps › Portfolio Health" para simular que está embebido en Jira. Esta app **ya está embebida de verdad** en un `jira:globalPage` — Jira renderiza su propio chrome real alrededor del iframe. Replicar una versión falsa (con texto/avatar inventados) sería redundante y engañoso. Se omite por completo; el refacto empieza directamente en la barra de tabs local de la app ("Portfolio Health" + Dashboard/Recommended Actions/Setup), que sí es contenido nuestro.
2. **"Recommended Actions" solo muestra lo que el motor real produce.** El prototipo incluye en esa pantalla una regla `THROUGHPUT DOWN > 20%` y un ítem informativo "Data Platform — scope growth 5-15%: Monitor..." que **no existen** en `src/health/recommendations.ts` (motor real, §17: solo 4 reglas — `SCOPE_GROWTH`, `BLOCKED_ISSUES`, `OVERDUE_ISSUES`, `CAPACITY_OVERLOAD`, máx. 3 por proyecto). No se inventan reglas nuevas para igualar el mock pixel a pixel (violaría el invariante de CLAUDE.md de no fabricar lógica/datos fuera de spec). La pantalla replica el layout y el lenguaje visual; con datos reales se verá más corta que la captura de referencia cuando pocas reglas disparen.
3. **Etiqueta de regla = condición real, no texto libre.** El pill mono-uppercase junto a cada recomendación ("SCOPE GROWTH > 20%", "BLOCKED ISSUES ≥ 3", "OVERDUE RATIO > 0.20", "WORKLOAD SIGNAL = HIGH") se genera desde un mapa estático `code → texto`, pero los 4 textos son literalmente las condiciones ya codificadas en `RULES` de `recommendations.ts` — no son inventados, solo se les da forma legible.
4. **Severidad de cada recomendación = magnitud real de `impact`.** El prototipo colorea cada fila (rojo/ámbar/gris) por severidad, pero esa taxonomía no existe hoy por recomendación. Se deriva de `HealthFactor.impact` del factor asociado (mismo `code`), reutilizando la escala ilustrativa ya presente en `dimensions.ts` (20/40/60/80 puntos): `|impact| >= 40` → `CRITICAL`, `>= 20` → `AT_RISK`, si no → `HEALTHY`. Reutiliza `HealthStatus`/colores existentes, sin inventar un 4° nivel.
5. **"Mark reviewed" es estado de sesión, no persistido.** El prototipo tiene un botón "Mark reviewed" por fila. No hay hoy KVS ni resolver para persistir revisiones de recomendaciones (agregar eso es trabajo de backend, fuera de "refacto de UI"). v1: estado local en `index.tsx` (un `Set<string>` de `projectKey:code` revisados en memoria), se pierde al recargar. Fast-follow: persistir en KVS si se pide explícitamente.
6. **Botón "View recommended actions →" navega a la pantalla global, sin filtrar por proyecto.** El prototipo no muestra que filtre — es la forma más simple y evita inventar un parámetro de filtro que no se ve en la captura.
7. **Se preserva "Recent Alerts" en el Dashboard**, aunque el prototipo no lo muestra (su captura no baja tan lejos / no lo modela). Es un dato real ya implementado (§20, Tarea 6.1.d) que no tiene sentido borrar solo por fidelidad pixel a pixel; se re-estiliza con el nuevo lenguaje visual del refacto (mismo criterio que la Adaptación 7 del plan anterior, que ya añadió esta sección sin equivalente en su mockup).
8. **Sin sparkline en la card "Overall health".** El prototipo dibuja una mini-línea bajo el score agregado del portafolio. No existe una serie histórica de `overallHealth` (solo hay `trendLine` por proyecto, Tarea 5.3) — computar una nueva serie agregada es trabajo de backend fuera de alcance. Se omite; la card muestra el número y el texto explicativo, igual que hoy.
9. **Loading inicial fuera de alcance** (pedido explícito del usuario — "menos el loading"). El spinner centrado de `status === 'loading'` en `index.tsx` no se toca.
10. **Responsive**: la barra de tabs pasa a scroll horizontal (`overflow-x-auto`) en viewports angostos en vez de colapsar a drawer (ya no hay sidebar que colapsar). El resto de breakpoints (`lg`/`md`) sigue el mismo criterio que el plan anterior.

---

## Fase A — Iconos nuevos

Objetivo: dejar listos los iconos que usan las fases siguientes (Project Detail, tabs) antes de tocar pantallas.

### Tarea A.1 — Iconos de dimensión y navegación

- [x] Añadir a `src/frontend/components/ui/icons.tsx` (mismo patrón `IconBase`/`currentColor` que los existentes, sin dependencias externas): `CalendarIcon` (Schedule), `PackageIcon` (Delivery), `LayersIcon` (Scope), `UsersIcon` (Capacity), `LinkIcon` (Dependencies), `CheckIcon` (usado por "Mark reviewed").
- **DoD:** cada icono nuevo renderiza a 20px/24px sin warnings de TypeScript; no hay imports ni `<link>` externos.

---

## Fase B — Shell de navegación (tabs horizontales)

Objetivo: reemplazar el sidebar de `AppShell.tsx` por la barra de tabs del prototipo (Adaptación 1: sin chrome falso de Jira), y cablear el nuevo estado `recommended` en la máquina de estados de `index.tsx`.

### Tarea B.1 — Reescribir `AppShell.tsx`

- [x] Reemplazar el `<aside>` sidebar + `<nav>` mobile actuales por una única barra horizontal: título "Portfolio Health" (no clicable) + 3 tabs (Dashboard / Recommended Actions / Setup) con subrayado azul (`border-primary-container`/`text-primary`) en el tab activo, `overflow-x-auto` para viewports angostos (Adaptación 10).
- [x] Nuevo tipo `AppShellView = 'dashboard' | 'recommended' | 'configuration'` (se quita `'detail'`: Project Detail ya no tiene representación propia en la nav — sigue resaltando "Dashboard" como hoy, mismo criterio que la Adaptación 4 del plan anterior).
- [x] Quitar la prop `detailProjectName` y el breadcrumb que dependía de ella (Project Detail ahora lleva su propio selector de proyecto y link "← All projects", Fase E).
- [x] Quitar el `<main>` con `lg:ml-64`/`pt-16` (ya no hay sidebar fijo); el contenido pasa a fluir bajo la barra de tabs con el mismo contenedor `mx-auto max-w-[1280px] px-margin py-stack-lg`.
- **DoD:** `AppShell` sigue siendo puro en props; ningún viewport queda sin forma de navegar a las 3 pantallas (probar `lg` y `md`/mobile).

### Tarea B.2 — Cablear `recommended` en `index.tsx`

- [x] Añadir `'recommended'` a `Status`; nueva rama en `renderContent()` que monta `RecommendedActions` (Fase D) cuando `status === 'recommended'`.
- [x] `AppShellView` derivado: `status === 'recommended' ? 'recommended' : status === 'setup' ? 'configuration' : 'dashboard'` (detail sigue resolviendo a `'dashboard'`, ver Tarea B.1).
- [x] Nuevo handler `onNavigateRecommended` en `AppShell`, gateado igual que `onNavigateDashboard` (solo navega si `dashboard` ya existe — Adaptación 4 del plan anterior, mismo motivo: no tiene sentido mostrar recomendaciones sin análisis corrido).
- [x] Renombrar el label de nav "Configuration" → "Setup" (texto del prototipo); el handler sigue siendo el mismo `setStatus('setup')`.
- **DoD:** navegar por los 4 estados (`ready`/`recommended`/`setup`/`detail`) no rompe las llamadas `invoke` existentes; `npm run lint` pasa.

---

## Fase C — Dashboard (`Dashboard.tsx`)

Objetivo: pasar del hero de una sola card + barras de status a las 4 cards del prototipo, y ajustar la tabla/Today's Attention a su estilo visual (dato real en todos los casos, ver Adaptación 8 para lo que se omite).

### Tarea C.1 — Hero de 4 cards

- [x] Sustituir la card `lg:col-span-8` actual por una fila de 4 cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` o similar): "Overall health" (score grande + `/100`, sin sparkline — Adaptación 8), "Critical" (número + icono, borde-acento izquierdo rojo), "At Risk" (ámbar), "Healthy" (verde) — reutilizando `statusCounts` real.
- [x] Quitar `HealthStatusBar`/`HEALTH_BAR_ROWS` (las barras proporcionales del diseño anterior no están en el prototipo; las 3 cards de conteo las reemplazan).
- **DoD:** los 4 números mostrados coinciden con `summary` sin datos hardcodeados; `overallHealth === null` sigue mostrando `N/A` en vez de romper el layout.

### Tarea C.2 — "Today's Attention" (dentro de Dashboard, ya no en `AttentionQueue.tsx` separado)

- [x] En el prototipo, "Today's Attention" vive como sección propia del Dashboard (no un componente aparte con su propio marco de card) — mover su renderizado a `Dashboard.tsx` como 3 cards en fila (`grid-cols-1 md:grid-cols-3`), cada una: badge de status arriba-izq, score bold arriba-der, nombre de proyecto, línea de deterioro (`deteriorationLabel`, ya existe), línea de contexto (`mainIssue`, ya existe, sin el icono `info` que tiene hoy).
- [x] Decidir entre mover el componente `AttentionQueue.tsx` completo a `Dashboard.tsx` o mantenerlo como archivo separado pero re-estilizado a 3-cards-en-fila en vez de lista vertical de 1 columna; cualquiera de las dos es válida mientras `index.tsx` siga pasándole `attentionQueue`/`onSelectProject` sin cambios de contrato.
- **DoD:** `entries.length === 0` sigue mostrando el estado vacío existente ("Nothing needs attention"); `onSelectProject` se conserva.

### Tarea C.3 — Tabla "Health by Project"

- [x] Columna Health: quitar el punto de color (`STATUS_DOT_CLASS`) delante del número — el prototipo muestra el score en texto plano, el color ya lo lleva la columna Status.
- [x] Columna Trend: cambiar `TrendBadge` (badge circular con fondo) por una flecha plana coloreada (mismo criterio semántico ↑ verde / ↓ rojo / → ámbar / — gris, pero sin el círculo de fondo) — evaluar si esto se resuelve con una prop `variant="plain"` en `TrendBadge` o un componente nuevo; **no** eliminar `TrendBadge` en sí porque `AttentionQueue`/Tarea C.2 lo sigue usando en su forma actual.
- [x] Conservar zebra, badge de alertas (`⚠`) y subtítulo `projectKey` bajo el nombre — el prototipo no los muestra en su dataset de demo (sin alertas), pero son datos reales existentes que no hay motivo para quitar.
- **DoD:** los 3 casos de `reasonKind` (`no-analysis`/`failed`/`insufficient-data`) se siguen distinguiendo visualmente; fila sigue siendo clicable.

### Tarea C.4 — "Recent Alerts" (se conserva, Adaptación 7)

- [x] Sin cambios funcionales; solo ajustar espaciado/tipografía si hace falta para que combine con el resto de cards re-estilizadas en esta fase.
- **DoD:** `alerts.length === 0` sigue mostrando el estado vacío existente.

---

## Fase D — Recommended Actions (pantalla nueva)

Objetivo: nueva pantalla top-level que agrega recomendaciones de todos los proyectos monitoreados, reutilizando el resolver `getProjectDetail` ya existente (sin nuevo endpoint de backend — Adaptación 2).

### Tarea D.1 — Agregación pura en frontend

- [x] Crear `src/frontend/lib/recommendedActions.ts`: función pura `buildRecommendedActions(details: ProjectDetailData[]): RecommendedActionItem[]` que, por cada `ProjectDetail`, mapea `recommendations` a `{ projectKey, projectName, code, message, severity, ruleLabel }`:
  - `severity`: busca el `HealthFactor` con el mismo `code` en `detail.factors` y aplica el umbral de la Adaptación 4 (`|impact| >= 40` → `CRITICAL`, `>= 20` → `AT_RISK`, si no → `HEALTHY`); si no hay factor asociado, `HEALTHY` (nunca inventar severidad alta sin dato).
  - `ruleLabel`: mapa estático de 4 entradas (Adaptación 3) — `SCOPE_GROWTH → 'SCOPE GROWTH > 20%'`, `BLOCKED_ISSUES → 'BLOCKED ISSUES ≥ 3'`, `OVERDUE_ISSUES → 'OVERDUE RATIO > 0.20'`, `CAPACITY_OVERLOAD → 'WORKLOAD SIGNAL = HIGH'`.
  - Orden final: por proyecto ascendente en `healthScore` (peor primero, `null` al final), preservando dentro de cada proyecto el orden ya devuelto por el backend (por impacto).
- [x] Test `__tests__/recommendedActions.test.ts`: cubre severidad por los 3 umbrales, `ruleLabel` de las 4 reglas, orden entre proyectos, y el caso de 0 recomendaciones globales.
- **DoD:** `npm test` verde; la función no llama a `invoke` ni toca KVS (pura, mismo criterio que `src/health/dashboard.ts`).

### Tarea D.2 — Carga en `index.tsx`

- [x] Nuevo estado `recommendedActions: RecommendedActionItem[] | null` + `reviewedKeys: Set<string>` (Adaptación 5, clave `${projectKey}:${code}`).
- [x] Al navegar a `status === 'recommended'`, si `recommendedActions` es `null`, disparar `invoke('getProjectDetail', { projectKey })` para cada `dashboard.projects[].projectKey` (`Promise.all`), pasar el resultado a `buildRecommendedActions`, guardar en estado. Refrescar (volver a `null`) cuando se corre un nuevo análisis (`runAnalysis`/`rerunAnalysis`) para no mostrar datos obsoletos.
- [x] Handler `toggleReviewed(projectKey, code)` que añade/quita de `reviewedKeys`.
- **DoD:** entrar y salir de la pantalla repetidamente no dispara llamadas duplicadas innecesarias mientras `recommendedActions` siga poblado; errores de `invoke` caen en el mismo estado `error` que el resto de la app.

### Tarea D.3 — Componente `RecommendedActions.tsx`

- [x] Crear `src/frontend/components/RecommendedActions.tsx`: título + subtítulo ("Rule-based recommendations across your monitored projects, ordered by severity."), lista de cards con borde-acento izquierdo por `severity` (reusa `STATUS_BORDER_CLASS`-style ya visto en `AttentionQueue.tsx`), icono de severidad (warning para `CRITICAL`/`AT_RISK`, info para `HEALTHY`), `projectName` + `ruleLabel` (mono uppercase, `text-body-sm`) en la cabecera de la fila, mensaje de la recomendación debajo, botón "Mark reviewed" a la derecha que llama `onToggleReviewed` — filas ya revisadas quedan atenuadas (`opacity-60`) con el botón mostrando "Reviewed" (icono `CheckIcon`).
- [x] Estado vacío: "No recommendations right now — every monitored project looks healthy." cuando la lista agregada está vacía (0 proyectos con recomendaciones, caso legítimo dado el motor real de 4 reglas — Adaptación 2).
- **DoD:** cada card sigue el mismo lenguaje visual (`rounded-xl border border-outline-variant bg-surface shadow-sm`) que el resto de la app; el botón es accesible por teclado (`<button>` nativo, no `<div onClick>`).

---

## Fase E — Project Detail (`ProjectDetail.tsx`)

Objetivo: selector de proyecto por tabs, gráfico de tendencia real, barras de dimensión, tarjetas "Why?" numeradas, y CTA a Recommended Actions en vez de lista inline.

### Tarea E.1 — Selector de proyecto (tabs) + header

- [x] Nueva prop `allProjects: DashboardProjectRow[]` (de `dashboard.projects`, ya disponible en `index.tsx`) y `onSelectProject: (key) => void` (reusa la función `selectProject` existente). Tira horizontal de pills, una por proyecto monitoreado, resaltando el activo (`bg-secondary-container text-primary` o similar), sobre "← All projects" (mismo link que hoy, renombrado del actual "← Back to dashboard").
- [x] Header: nombre + `StatusBadge` a la izquierda, score grande (`display-hero` o un tamaño intermedio) + "Health / 100" a la derecha (antes era una sola línea "Health: 42/100").
- **DoD:** hacer clic en otro proyecto de la tira dispara `onSelectProject` y actualiza toda la pantalla sin pasar por Dashboard; el proyecto activo es visualmente distinguible.

### Tarea E.2 — `TrendChart` (gráfico de línea SVG)

- [x] Crear `src/frontend/components/ui/TrendChart.tsx`: recibe el string `trend` (formato `formatTrendLine`, ej. `"78 → 71 → 64 → 55 → 42"`, o el placeholder `—`, o mezcla con `N/A`), lo parsea a puntos numéricos (ignora `N/A`/placeholder), dibuja un `<svg>` inline con `<polyline>` + `<circle>` por punto (azul, mismo `--color-primary-container`) escalado al rango de los datos, con las etiquetas de los valores debajo de cada punto (`data-mono`).
- [x] Estado sin datos suficientes (0 o 1 punto numérico): mensaje "Not enough history yet" en vez de un SVG vacío o roto.
- [x] Reemplazar la línea `Trend: {trend}` de `ProjectDetail.tsx` por `<TrendChart trend={trend} />` dentro de una card `TREND — LAST 5 SNAPSHOTS`.
- **DoD:** con `trend === '—'` no rompe (muestra el estado "Not enough history"); con 5 puntos reales dibuja una polilínea proporcional sin librería externa.

### Tarea E.3 — Dimensiones como barras

- [x] Redisear `DimensionRow`: icono por dimensión (Fase A: Calendar/Package/Layers/Users/Link), label, barra horizontal (`h-2 rounded-full`, ancho `${score}%`, color por `status` reusando `STATUS_DOT_CLASS`-equivalente ya usado en Dashboard/AttentionQueue), score numérico a la derecha. Caso `null` conserva el texto "N/A — Insufficient data" (sin barra, o barra vacía gris) — mismo criterio §12/§24 que hoy.
- **DoD:** los 3 casos (dimensión con score, dimensión `null`, proyecto sin análisis) se distinguen igual que antes, ahora con barra en vez de `StatusBadge` por fila.

### Tarea E.4 — "Why?" con tarjetas numeradas

- [x] Mapa estático `FACTOR_TITLES: Record<string, string>` (mismo patrón que `DIMENSION_LABELS`) para los 10 códigos reales de factor (`OVERDUE_ISSUES`, `STALLED_COMPLETION`, `THROUGHPUT_DECLINING`, `REOPENED_ISSUES`, `AGED_IN_PROGRESS_ISSUES`, `SCOPE_GROWTH`, `CAPACITY_OVERLOAD`, `BLOCKED_ISSUES`, `AGED_BLOCKERS`, `EXTERNAL_DEPENDENCIES` — ver `src/health/dimensions.ts`), con títulos cortos tipo "Capacity overload", "Scope growth", etc.
- [x] Redisear `FactorRow`: numeral grande en azul (posición en la lista, 1-indexado) + título (`FACTOR_TITLES[factor.code]`, fallback al propio `code` si falta alguno) + `factor.message` debajo. Quitar el patrón `ExplainerTooltip`/hover (ya no aplica: el mensaje pasa a estar siempre visible, no detrás de un tooltip — mejora de accesibilidad, no regresión).
- **DoD:** factores siguen sin reordenarse en cliente (ya vienen ordenados por impacto); los 10 códigos tienen título mapeado (test o revisión manual contra `dimensions.ts`).

### Tarea E.5 — Quitar "Recommended actions" inline, añadir CTA

- [ ] Eliminar la sección "Recommended actions" (lista + `RecommendationRow`) de `ProjectDetail.tsx` — pasa a vivir solo en la pantalla global (Fase D, Adaptación 6).
- [ ] Añadir botón "View recommended actions →" al final de la pantalla, nueva prop `onViewRecommendedActions: () => void` conectada en `index.tsx` a `setStatus('recommended')`.
- **DoD:** `Recommendation`/`RecommendationRow` quedan sin referencias muertas en `ProjectDetail.tsx` (`npm run lint` no marca imports sin usar).

---

## Fase F — Setup y estados inline

Objetivo: alinear `ProjectSelector.tsx` y los estados `analyzing`/`error` de `index.tsx` al nuevo lenguaje visual (sin sidebar) y a las copys del prototipo.

### Tarea F.1 — `ProjectSelector.tsx`

- [ ] Actualizar subtítulo a la copy del prototipo: "Select the projects you want to monitor. That's it — no baselines, no custom fields. You can add more projects later." (reemplaza "Select projects to monitor").
- [ ] Añadir contador "`{selectedKeys.size} of {projects.length} selected`" junto al botón "Start analysis" (dato real, no existe hoy).
- **DoD:** `selectedKeys.size === 0` sigue deshabilitando "Start analysis"; el contador se actualiza al togglear checkboxes.

### Tarea F.2 — Estados `analyzing`/`error` bajo el nuevo shell

- [ ] Revisar que ambos estados rendericen correctamente sin el sidebar (ya no hay `lg:ml-64`/`pt-16` que compensar — Tarea B.1); ajustar solo si el layout se ve descentrado.
- **DoD:** `role="alert"` en el estado de error se conserva; `ANALYSIS_STEPS` se sigue mostrando igual que hoy (fuera de alcance, Adaptación 9 aplica solo a `loading`, no a `analyzing`).

---

## Fase G — Verificación

### Tarea G.1 — Build y checks estáticos

- [ ] `npm run build` (Tailwind + esbuild) sin errores.
- [ ] `npm run lint` y `npm test` (incluye el nuevo `recommendedActions.test.ts` de la Tarea D.1) sin romper nada.
- **DoD:** los 3 comandos pasan en verde.

### Tarea G.2 — Chequeo visual contra el prototipo

- [ ] Levantar la app (skill `run`) y, por separado, el prototipo estático (receta en Contexto) para comparar lado a lado las 4 pantallas: Dashboard, Recommended Actions, Project Detail, Setup.
- [ ] Spot-check en viewport `md`/mobile: la barra de tabs hace scroll horizontal en vez de romper el layout (Adaptación 10).
- **DoD:** paleta semántica, tipografía y estructura de cards coinciden con el prototipo salvo las Adaptaciones documentadas arriba (chrome de Jira, sparkline, reglas fabricadas, persistencia de "reviewed").
