# Security Review — Jira Portfolio Health

> Tarea 6.4 del [plan de implementación](implementation-plan.md) (§24 Permissions, §25 Seguridad).
> Referencia de arquitectura: [`architecture-decisions.md`](architecture-decisions.md) #3.
> Apoyo: skill `forge-security-review` (rutas/reglas usadas como checklist manual; el script de análisis
> estático empaquetado (`scripts/run_static_analysis.ps1`) descarga y ejecuta `fsrt.exe`, un binario externo, y
> además tiene un bug de binding de parámetros en PowerShell — falla con `The variable '$ForgeProjectRootDirectory'
> cannot be retrieved` porque `Set-StrictMode`/`$ErrorActionPreference` preceden al bloque `param()`. No forma
> parte del código shipped (`skills/` está gitignored), así que no se ha corregido; la auditoría de abajo es
> manual, evidenciada con `grep`/lectura de código en vez de con su salida).

## 1. Todas las llamadas a Jira usan `.asUser()`

**Regla (ya documentada en `architecture-decisions.md` #3):** todo resolver interactivo llama a Jira con
`api.asUser()`, nunca `api.asApp()`, para que el addon jamás muestre datos de un issue que el usuario que abre el
dashboard no podría consultar directamente en Jira (§24 Permissions).

**Evidencia (`grep -rn "asUser()\|asApp()" src`):**

| Archivo | Auth | Contexto |
|---|---|---|
| `src/index.ts:43` | `asUser()` | resolver `getProjects` |
| `src/index.ts:68` | `asUser()` | resolver `runAnalysis` |
| `src/index.ts:90` | `asUser()` | `loadDashboardEntries()` (compartida por `getDashboard`/`getAttentionQueue`/`getProjectDetail`) |
| `src/triggers/dailySnapshot.ts:37` | `asApp()` | `scheduledTrigger` diario (Tarea 5.2) |

Los tres resolvers invocables desde la UI (los únicos que responden a una sesión de usuario interactiva) usan
`asUser()`. La única excepción es el trigger diario, que **no tiene usuario interactivo que impersonar** — es la
excepción ya prevista y documentada en `architecture-decisions.md` #3 ("esa decisión cubre resolvers
interactivos... un scheduled trigger no tiene contexto de usuario"), repetida en el comentario de cabecera de
`dailySnapshot.ts`. `analyzeProject`/`getProjectIssues` solo necesitan `requestJira`, que `AsAppFetchMethods`
expone igual que `AsUserFetchMethods` (`src/jira/client.ts`'s `JiraFetchApi` solo depende de ese método común), así
que no hay una ruta alternativa con `asUser()` disponible para un trigger sin sesión.

**Nota de diseño (no un hallazgo, documentada para que quede explícita):** el trigger con `asApp()` puede leer y
snapshotear proyectos a los que el usuario que originalmente seleccionó el proyecto en `config:portfolio` tenía
acceso en su momento, sin volver a comprobar permisos por usuario en cada ejecución diaria — es inherente a un
job sin usuario interactivo (mismo modelo que cualquier `scheduledTrigger` de Forge) y no expone nada nuevo al
frontend: el dashboard solo lee `latest:<projectKey>`/snapshots ya escritos por el propio addon, nunca los
resultados crudos del trigger directamente sin pasar por un resolver `asUser()`.

**Conclusión:** cumple. Ninguna llamada a Jira desde un resolver interactivo usa `asApp()`; la única llamada
`asApp()` existente está justificada y ya documentada.

## 2. Revisión de scopes (least privilege)

**Scopes declarados (`manifest.yml`):**

```yaml
permissions:
  scopes:
    - read:jira-work
    - read:jira-user
    - storage:app
```

**Uso de cada scope:**

- **`read:jira-work`** — `src/jira/client.ts`: `GET /rest/api/3/project/search` (`listProjects`) y
  `GET /rest/api/3/search/jql` (`getProjectIssues`, con `expand=changelog`). Es el scope base para leer
  proyectos/issues/changelog; usado en cada análisis.
- **`read:jira-user`** — necesario para que el campo `assignee` de la respuesta de `search/jql` incluya el
  `accountId` del usuario asignado (`src/metrics/model.ts:211`, `assigneeId: fields.assignee?.accountId ?? null`),
  consumido por `computeCapacityMetrics` (§12, WIP por usuario). Con las scopes granulares de Jira Cloud,
  `read:jira-work` cubre issues/proyectos pero no los datos de usuario embebidos en ellos (assignee/reporter);
  eso requiere `read:jira-user` aparte. Es el único scope de usuario declarado y el único dato de usuario leído
  en todo el código es ese `accountId` — nunca `displayName`, `emailAddress` ni `avatarUrls` (verificado con
  `grep -rn "displayName\|avatarUrl\|emailAddress" src`, sin resultados).
- **`storage:app`** — usado por `@forge/kvs` (`src/storage/configStore.ts`, `snapshotStore.ts`, `alertStore.ts`,
  y `kvs.get`/`kvs.set` de `latest:<projectKey>` en `src/index.ts`). Ya se había confirmado en la Tarea 1.1 que
  `forge lint` no exige declararlo explícitamente al importar `@forge/kvs`, pero está declarado igualmente en el
  manifest — sin cambios respecto a la Tarea 1.1.

**Scopes NO usados que sí podrían tentar a añadirse pero no están declarados (confirmando que no hay exceso "por
si acaso"):** no hay `write:jira-work` (el addon nunca escribe en Jira, solo lee), no hay `manage:jira-project`,
ni scopes de administración, ni `read:jira-work`/`write` de Confluence u otros productos.

**Conclusión:** los 3 scopes declarados se usan y son el mínimo necesario para el alcance actual del MVP.
No se elimina ninguno.

## 3. Auditoría de logs (sin contenido de issues)

**Evidencia (`grep -rn "console\.(log|error|warn|info|debug)" src`):** el único archivo con logging en todo
`src/` es `src/triggers/dailySnapshot.ts` (líneas 46, 67, 74) — ningún resolver, ni `jira/client.ts`, ni las
capas `metrics/`/`health/`/`storage/` loguean nada.

| Línea | Mensaje | Contenido |
|---|---|---|
| 46 | `` `dailySnapshot: analysis failed for ${projectKey} (${elapsedMs}ms)` `` | project key + duración |
| 67–70 | `` `dailySnapshot: saved snapshot for ${projectKey} (${elapsedMs}ms)` `` + recuento de alertas | project key + duración + **conteo** de alertas (nunca su `message`) |
| 74–76 | `` `dailySnapshot: completed ${...} project(s) in ${...}ms` `` | conteo de proyectos + duración total |

Ninguna línea interpola `summary`, `description`, título de issue, nombre de usuario, ni el contenido (`message`)
de un `HealthFactor`/alerta — solo identificadores de proyecto (`projectKey`, ya públicos en la propia URL del
proyecto en Jira) y métricas de tiempo/conteo. Esto ya estaba documentado como invariante de diseño en el
comentario de cabecera del propio archivo (líneas 21–24) desde la Tarea 6.1.c.

**Conclusión:** cumple §25 ("Logs sin contenido sensible de issues"). Sin cambios necesarios.

## 4. Nada se envía a servicios externos

**Evidencia:**

- `grep -rn "fetch(\|https?://\|XMLHttpRequest\|axios" src` → sin resultados en `src/jira`, `src/health`,
  `src/metrics`, `src/storage`, `src/triggers` ni `src/frontend`. La única forma de hacer peticiones HTTP en todo
  el código es `api.requestJira` (`@forge/api`), que solo puede apuntar a la API de Jira del propio sitio Cloud
  (`route\`...\``, nunca una URL arbitraria).
- `manifest.yml` no declara `permissions.external.fetch` ni `remotes` — Forge exige declarar explícitamente
  cualquier dominio externo al que la app pueda hacer egress (CSP/egress control), y el manifest no tiene esa
  sección, así que la plataforma bloquearía cualquier intento de `fetch` a un host externo aunque el código
  lo intentara.
- `package.json` (`dependencies`) solo incluye el SDK de Forge (`@forge/api`, `@forge/bridge`, `@forge/kvs`,
  `@forge/resolver`) y React/React-DOM — ninguna librería de terceros con capacidad de red (sin cliente HTTP,
  sin SDK de analítica, sin SDK de proveedores de IA).

**Conclusión:** cumple §25 ("No enviar datos a proveedores externos de IA en el MVP"). No hay ningún egress
declarado ni código capaz de generarlo.

## Resumen

| Ítem del checklist (Tarea 6.4) | Resultado |
|---|---|
| Todas las llamadas a Jira usan `.asUser()` | ✅ Cumple (única excepción `asApp()` en el trigger diario, justificada y ya documentada) |
| Revisar scopes / least privilege | ✅ Los 3 scopes declarados se usan; ninguno de más |
| Auditoría de logs sin contenido de issues | ✅ Cumple; único archivo con logs es `dailySnapshot.ts`, solo project key + timings/conteos |
| Nada se envía a servicios externos | ✅ Sin egress declarado en el manifest ni código capaz de generarlo |

No se requirió ningún cambio de código para esta tarea: la arquitectura ya cumplía las cuatro reglas desde
fases anteriores (§24/§25 se tuvieron en cuenta desde la Tarea 0.2/1.3/3.5/5.2/6.1). Este documento deja la
evidencia y el razonamiento por escrito como el checklist de seguridad que pide el DoD de la Tarea 6.4.
