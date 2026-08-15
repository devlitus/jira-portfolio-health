# Performance Notes — Jira Portfolio Health

> Tarea 6.3 del [plan de implementación](implementation-plan.md) (§24 Requisitos no funcionales — Performance).
> Referencia de arquitectura: [`architecture-decisions.md`](architecture-decisions.md) #3 y #4.

## 1. Tiempo de carga del dashboard (objetivo: < 10 s, §7)

**Invariante de arquitectura (ya vigente antes de esta tarea):** los tres resolvers que sirven las pantallas
principales — `getDashboard`, `getAttentionQueue`, `getProjectDetail` (`src/index.ts`) — nunca llaman a Jira ni
reejecutan `analyzeProject`. Los tres comparten `loadDashboardEntries()`, que solo lee:

- `kvs.get('latest:<projectKey>')` — último análisis cacheado por `runAnalysis` (Tarea 3.5) o por el trigger
  diario (Tarea 5.2).
- `getSnapshots(projectKey, 14)` — historial de snapshots para trend/deterioro (Tareas 5.3/5.4).
- `getAlerts(projectKey)` — alertas guardadas (Tarea 6.1).

y `listProjects(asUser())` una vez para resolver nombres de proyecto actuales. Las tres lecturas KVS por proyecto
se lanzan en paralelo (`Promise.all` dentro de `loadDashboardEntries`), y los N proyectos seleccionados también se
procesan en paralelo — así que el coste de I/O de la carga del dashboard no crece linealmente con el número de
proyectos: es, en esencia, una ronda de lecturas KVS concurrentes, independientemente de si hay 3 o 25 proyectos
seleccionados. Esto cumple el pipeline exigido por §24: `Jira data → sync/cache → metrics → snapshot → frontend`
— el `frontend` nunca vuelve a tocar `Jira data` en la ruta de carga.

**Medición local (paso de reducción en memoria):** `__tests__/performance.test.ts` mide el único tramo de este
pipeline que corre de forma síncrona en el proceso del resolver — reducir las `DashboardEntry[]` ya cacheadas
(salida de `loadDashboardEntries`) a los modelos de vista de las tres pantallas (`buildDashboardSummary`,
`buildAttentionQueue`, `buildProjectDetail`) — sobre un dataset sintético de 25 proyectos (por encima del objetivo
"10+" de la tarea). Resultado: cada reducción completa en el orden de 1 ms, muy por debajo del presupuesto de 10 s;
no es el paso que podría comprometer el objetivo.

**Lo que esta medición NO cubre:** la latencia real de red de las llamadas a `kvs.get`/`kvs.query` contra el
runtime de Forge, que solo se puede observar desplegado en un sitio real. Con 25 proyectos seleccionados,
`loadDashboardEntries` dispara 25 × 3 = 75 lecturas KVS, todas en paralelo (no en serie) gracias al `Promise.all`
anidado ya existente. Dado que Forge KVS está pensado para lecturas por clave de baja latencia y que estas
lecturas no dependen unas de otras, el tiempo total esperado es cercano al de una sola lectura KVS más el overhead
de invocación del resolver — con margen amplio sobre el presupuesto de 10 s. **Verificación visual pendiente:**
medir el tiempo de carga real del dashboard con 10+ proyectos reales en el sitio de desarrollo queda para que el
usuario la haga o la pida explícitamente (mismo patrón que las Tareas 0.1/1.5.d/3.5/4.1/4.3/4.4/5.2/5.3/5.4/6.1/6.2).

## 2. Paralelización acotada del análisis (`runAnalysis`)

**Antes:** `runAnalysis` (`src/index.ts`) ejecutaba `Promise.all` sin límite sobre `config.selectedProjectKeys` —
cada elemento es un `analyzeProject()` completo (búsqueda paginada de issues + `expand=changelog`, Tarea 1.3.b).
Con un portfolio de 10+ proyectos, eso dispara 10+ pipelines de análisis completos en paralelo, cada uno con su
propia paginación, contra la misma instancia de Jira — riesgo de acumular 429 más allá de lo que el reintento por
request (`requestJiraWithRetry`, Tarea 1.3.d) puede absorber, y de saturar el límite de conexiones salientes
concurrentes de la invocación de Forge.

**Cambio:** nueva función `mapWithConcurrency(items, limit, fn)` en `src/jira/client.ts` (cubierta por
`__tests__/jiraClient.test.ts`: orden de resultados preservado, límite de concurrencia respetado, casos borde de
lista vacía / límite mayor que el nº de items / rechazo propagado). `runAnalysis` la usa con
`ANALYSIS_CONCURRENCY_LIMIT = 5` (`src/index.ts`): como máximo 5 análisis de proyecto en vuelo a la vez,
preservando el orden de resultados y sin cambiar el comportamiento de resiliencia existente (un fallo de proyecto
sigue devolviéndose como `{ ok: false, reason }` sin abortar el resto, §24 Resilience).

**Por qué 5:** es un valor conservador y documentado en el código — suficiente para no serializar el análisis
completo de portfolios grandes en un solo hilo (los primeros 5 proyectos empiezan de inmediato), pero lo bastante
bajo para dejar margen frente a los límites de tasa de Jira Cloud incluso en portfolios de 20+ proyectos. No hay un
número "correcto" verificable sin medir contra un sitio real con un portfolio grande; si en producción se observan
429 persistentes pese al backoff existente, bajar este límite es el primer ajuste a probar.

**Nota — mismo patrón en el trigger diario:** `src/triggers/dailySnapshot.ts` (Tarea 5.2) tiene el mismo
`Promise.all` sin acotar sobre los proyectos seleccionados. La Tarea 6.3 del plan solo pide el ajuste acotado en el
resolver `runAnalysis`, así que el trigger se deja tal cual por ahora (ver punto 3 — su consumo de invocaciones ya
es aceptable independientemente de la concurrencia interna); si el portfolio crece lo suficiente para que esto
importe, aplicar `mapWithConcurrency` ahí también es la misma solución.

## 3. Consumo de invocaciones del trigger diario

El `scheduledTrigger` (`manifest.yml`, handler `src/triggers/dailySnapshot.ts`) se ejecuta **1 vez al día**
(`interval: day`, Tarea 1.1) sin importar cuántos proyectos estén seleccionados: el recorrido de todos los
proyectos ocurre dentro de esa única invocación (paralelizado con `Promise.all`, ver punto 2), no como una
invocación por proyecto. Por tanto el consumo de invocaciones del trigger es constante — 1/día — y no escala con
el tamaño del portfolio; la única variable que crece con el nº de proyectos es la duración de esa invocación
(tiempo de análisis + guardado de snapshot + evaluación de alertas por proyecto), no su frecuencia. Se considera
aceptable para el MVP (documentado ya como decisión en `architecture-decisions.md` #4); no se han identificado
límites de invocaciones diarias de Forge que un único trigger diario pueda aproximarse a agotar.

## Resumen

| Ítem | Estado |
|------|--------|
| Medición de la reducción en memoria del dashboard (25 proyectos sintéticos) | Hecha — `__tests__/performance.test.ts`, < 1 ms por reducción |
| Medición de la latencia real de KVS con 10+ proyectos en el sitio de desarrollo | Pendiente de verificación visual por el usuario |
| Paralelización acotada de `runAnalysis` | Hecha — `mapWithConcurrency`, límite 5 |
| Revisión de consumo de invocaciones del trigger diario | Hecha — 1/día, constante, aceptable |
