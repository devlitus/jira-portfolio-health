# Architecture Decisions — Jira Portfolio Health

> Referencia: [`jira-portfolio-health-mvp.md`](../jira-portfolio-health-mvp.md) — decisiones cerradas en la Fase 0 (Tarea 0.2) del [plan de implementación](implementation-plan.md), antes de escribir lógica de negocio.

## 1. Almacenamiento de snapshots

**Decisión:** Forge KVS (`@forge/kvs`) con clave `snapshot:<projectKey>:<yyyy-mm-dd>`.

**Justificación:** el volumen es bajo y predecible — 1 snapshot por proyecto por día (§19) — muy por debajo de lo que justificaría el overhead de modelar y mantener un esquema SQL (Forge SQL). KVS por clave permite lectura directa de un snapshot concreto (`projectKey` + fecha) sin necesidad de queries relacionales. El modelo `ProjectSnapshot` (§22) es un documento autocontenido (health score + 5 dimension scores + métricas resumidas), lo cual encaja de forma natural con almacenamiento clave-valor en vez de filas normalizadas.

**Trade-off aceptado:** KVS no soporta range queries por prefijo de forma nativa en todos los casos, por lo que leer "los últimos N días" (Tarea 5.1.b) requerirá mantener un índice auxiliar por proyecto (`snapshots-index:<projectKey>`) con la lista de fechas disponibles. Se documenta como riesgo conocido en el plan (sección "Riesgos y dependencias transversales").

## 2. Configuración del addon

**Decisión:** Forge KVS con clave `config:portfolio` para proyectos seleccionados y thresholds.

**Justificación:** es un único documento de configuración por instalación del addon (no por usuario, no por proyecto), alineado con el principio de "Zero/Low Configuration" (§4.1): tras instalar, el flujo es seleccionar proyectos → ejecutar análisis → mostrar resultados, sin campos personalizados ni baselines manuales. Un único registro KVS es suficiente y evita la complejidad de un esquema SQL para algo que en esencia es `{ selectedProjectKeys, thresholds, baselinePolicy }`. Los thresholds de status (§14: Healthy 80-100, At Risk 60-79, Critical 0-59) deben poder almacenarse como configuración aunque en el MVP tengan valores por defecto fijos — KVS cubre ese requisito sin trabajo adicional.

## 3. Llamadas a la API de Jira

**Decisión:** todas las llamadas a Jira se hacen desde resolvers de backend usando `api.asUser()`. El frontend **no** usa `requestJira` de `@forge/bridge` para leer datos de negocio.

**Justificación:**
- **Permisos (§24 Permissions, §25 Seguridad):** `.asUser()` respeta las restricciones de visibilidad del usuario que abre el dashboard — el addon nunca debe mostrar datos de issues que el usuario no podría consultar directamente en Jira. Es la recomendación explícita de `AGENTS.md` (sección "Security").
- **Performance y cacheo (§24 Performance):** el pipeline `Jira data → sync/cache → metrics → snapshot → frontend` implica que los cálculos pesados (normalización de issues, changelog, métricas de las 5 dimensiones, health score) deben ejecutarse una sola vez en el backend y el resultado cachearse en KVS (`latest:<projectKey>`), no recalcularse en cada carga del dashboard. Si el frontend llamara directamente a Jira con `requestJira`, cada carga de pantalla dispararía de nuevo todo el análisis.

**Nota:** esto diverge de la sugerencia genérica de `AGENTS.md` ("Architecture Tips" — preferir `requestJira` desde el frontend por simplicidad). Se documenta como excepción intencional para este proyecto: la naturaleza agregada y costosa del análisis de portfolio (múltiples proyectos, changelog completo, paginación) exige backend + cache, no llamadas directas desde el cliente.

## 4. Snapshot diario

**Decisión:** módulo `scheduledTrigger` (cron diario, p. ej. 06:00) registrado en `manifest.yml`, con handler en `src/triggers/dailySnapshot.js`, que recorre los proyectos seleccionados (`config:portfolio`) y persiste un `ProjectSnapshot` por proyecto.

**Justificación:** es el mecanismo nativo de Forge para trabajo periódico sin intervención del usuario, requerido para habilitar tendencias, detección de deterioro, gráficos y alertas (§19). Frecuencia inicial de 1 snapshot/día, suficiente para el MVP y con bajo consumo de invocaciones (documentado como aceptable en Tarea 6.3 del plan). En la Fase 1 el módulo se declara con un handler stub; la lógica completa (análisis + persistencia + idempotencia) se implementa en la Fase 5 (Tarea 5.2), una vez exista el pipeline de análisis (Fase 3).

## 5. Framework de tests

**Decisión:** Jest.

**Justificación:** es el estándar de facto en proyectos Forge y funciona sin fricción con el runtime `nodejs24.x` del template y con los módulos ESM que trae. El plan exige funciones puras y testeables para las 5 dimensiones de métricas (§23) y para el health score — Jest cubre ese caso de uso (tests unitarios con datasets sintéticos) sin necesitar configuración adicional relevante para el alcance del MVP.

---

## Nota sobre UI

Estas decisiones son independientes de la elección de Custom UI vs. UI Kit (ya cerrada y documentada en `CLAUDE.md`/`AGENTS.md`): afectan a la capa de backend/datos, no a la capa de presentación.
