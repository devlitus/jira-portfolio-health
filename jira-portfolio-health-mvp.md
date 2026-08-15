# MVP — Jira Portfolio Health

## 1. Objetivo

Construir un addon para Jira Cloud que permita a un PMO, Project Manager o Engineering Manager responder rápidamente:

> **¿Qué proyectos necesitan mi atención y por qué?**

El MVP no debe intentar convertirse en otro Gantt, roadmap, resource planner o sistema PPM completo. Debe centrarse en:

1. Calcular un **Health Score** por proyecto.
2. Identificar los proyectos con mayor riesgo.
3. Explicar **por qué** un proyecto está sano o en riesgo.
4. Mostrar **acciones recomendadas** basadas en datos de Jira.
5. Permitir visualizar la evolución del health score con el tiempo.

La propuesta de valor es:

> **"Portfolio Health te dice dónde intervenir, por qué y qué deberías revisar primero."**

---

## 2. Usuario objetivo

### Primary persona

**PMO / Project Manager / Engineering Manager**

Perfil:

- Utiliza Jira Cloud.
- Supervisa varios proyectos o equipos.
- Tiene dificultad para detectar problemas antes de que impacten a fechas o presupuesto.
- No quiere configurar decenas de campos manualmente.
- Necesita una vista ejecutiva, no otra vista técnica de Jira.

### Secondary persona

**Jira Administrator**

Necesita:

- Instalación sencilla.
- Permisos claros.
- Poco mantenimiento.
- Configuración mínima.
- No depender de modificaciones masivas del esquema de Jira.

---

# 3. Problema que resuelve

Un portfolio puede contener cientos o miles de issues.

Jira permite consultar esos datos, pero el usuario necesita responder preguntas como:

- ¿Qué proyecto está empeorando?
- ¿Cuál tiene más riesgo de retrasarse?
- ¿Qué proyecto tiene problemas de capacidad?
- ¿Dónde está creciendo el scope?
- ¿Qué dependencias están bloqueando el delivery?
- ¿Qué proyectos requieren intervención esta semana?

El MVP debe convertir estos datos en una **cola de atención priorizada**.

---

# 4. Principios de producto

## 4.1 Zero/Low Configuration

Tras instalar:

1. Seleccionar proyectos.
2. Ejecutar análisis.
3. Mostrar resultados.

No exigir inicialmente:

- 20 campos personalizados.
- Baselines manuales.
- Configuración compleja.
- Metodología concreta.
- Definición previa de KPIs.

## 4.2 Explainable by default

Nunca mostrar únicamente:

> Health = 61

Mostrar:

> Health = 61 porque el proyecto tiene +28% de scope, 123% de capacidad y 3 dependencias bloqueadas.

## 4.3 Actionable

Cada problema importante debe poder traducirse en una recomendación.

Ejemplo:

> Backend capacity = 123%

Recomendación:

> Revisar asignación del equipo Backend o reducir trabajo comprometido.

## 4.4 No AI required for MVP

El cálculo debe ser determinista y reproducible.

La IA puede añadirse posteriormente para:

- Resumir.
- Explicar.
- Recomendar.
- Responder preguntas en lenguaje natural.

---

# 5. Alcance del MVP

## Incluido

- Selección de proyectos.
- Dashboard de portfolio.
- Health Score por proyecto.
- Ranking de proyectos.
- Cinco dimensiones de salud:
  - Schedule
  - Delivery
  - Scope
  - Capacity
  - Dependencies
- Explicación de los principales factores.
- Vista de detalle por proyecto.
- Histórico del Health Score.
- Reglas de alerta básicas.
- Persistencia de snapshots.

## Fuera de alcance

- Gantt completo.
- Roadmap.
- Time tracking.
- Gestión financiera.
- OKRs.
- Resource planner avanzado.
- What-if scenarios.
- IA generativa.
- Integración con Slack.
- PDF avanzado.
- Benchmarks entre clientes.
- Multi-tenant complejo de métricas externas.

---

# 6. Flujo de usuario

```text
Install App
    |
    v
Select Projects
    |
    v
Run Initial Scan
    |
    v
Portfolio Dashboard
    |
    +--> Project Health
    |
    +--> Why is it unhealthy?
    |
    +--> Recommended Actions
    |
    +--> Project History
```

---

# 7. Pantalla principal

## Portfolio Dashboard

Debe mostrar primero una visión ejecutiva.

Ejemplo:

```text
PORTFOLIO HEALTH

Overall Health
74 / 100

3 Critical
5 At Risk
7 On Track


TOP ATTENTION

1. Payments Platform      42 🔴
2. CRM Migration           58 🟠
3. Mobile App              61 🟠


HEALTH BY PROJECT

Project             Health   Trend    Status
------------------------------------------------
Payments Platform     42      ↓       Critical
CRM Migration         58      ↓       At Risk
Mobile App             61      →       At Risk
Analytics               82      ↑       Healthy
Internal Tools          91      ↑       Healthy
```

### Regla UX

La primera vista debe responder en menos de 10 segundos:

- ¿Cómo está mi portfolio?
- ¿Qué proyectos están peor?
- ¿Han empeorado?

---

# 8. Health Score

## 8.1 Fórmula inicial

```text
Health Score =
    Schedule     * 0.25
  + Delivery     * 0.20
  + Scope        * 0.15
  + Capacity     * 0.15
  + Dependencies * 0.15
  + Risk Buffer  * 0.10
```

Para simplificar el MVP se puede implementar inicialmente sin Risk Buffer y redistribuir sus puntos.

Alternativa inicial:

```text
Schedule       30%
Delivery       25%
Scope          15%
Capacity       15%
Dependencies   15%
```

Recomendación: comenzar con la segunda fórmula.

---

# 9. Schedule Score

Objetivo:

Detectar señales de retraso.

## Inputs

- Due dates.
- Overdue issues.
- Milestones disponibles.
- Issues sin fecha dentro del conjunto planificado.
- Forecast basado en ritmo histórico.
- Fecha objetivo del proyecto cuando exista.

## MVP inicial

Calcular:

### overdue ratio

```text
overdue_ratio =
    overdue_issues / issues_with_due_date
```

### completion ratio

```text
completion_ratio =
    done_issues / total_issues
```

### schedule score

Ejemplo conceptual:

```text
100 = sin señales negativas

80  = algunos atrasos
60  = retraso moderado
40  = retraso importante
20  = retraso crítico
```

No es necesario crear una fórmula matemáticamente perfecta en la primera versión. Lo importante es que:

- sea consistente;
- sea explicable;
- pueda ajustarse más adelante.

---

# 10. Delivery Score

Objetivo:

Determinar si el equipo está entregando trabajo de forma consistente.

## Inputs

- Issues completados.
- Cycle time, si está disponible.
- Throughput.
- Reopened issues.
- Estado de issues.
- Evolución de trabajo completado.

## MVP

Usar principalmente:

- throughput semanal;
- tendencia de throughput;
- ratio de issues reabiertos;
- edad de issues en progreso.

Ejemplo:

```text
Delivery Score = 100

-20  throughput bajando >20%
-10  reopened ratio elevado
-10  muchos issues envejecidos
```

---

# 11. Scope Score

Objetivo:

Detectar scope creep.

## Principio

El sistema debe detectar si el proyecto está creciendo mientras se ejecuta.

## Inputs

- Issues creados.
- Issues eliminados/cancelados, si la fuente lo permite.
- Story points añadidos.
- Cambios del volumen de trabajo.
- Changelog.

## MVP inicial

Comparar:

```text
initial_scope
vs
current_scope
```

Cuando no exista baseline formal:

Usar el primer snapshot almacenado por la aplicación como baseline.

Ejemplo:

```text
Initial scope: 240 issues
Current scope: 300 issues

Scope growth = +25%
```

Interpretación:

```text
0-5%       Healthy
5-15%      Warning
15-25%     Risk
>25%       Critical
```

Estos thresholds deben ser configurables posteriormente.

---

# 12. Capacity Score

## Objetivo

Detectar sobreasignación de trabajo.

## Problema importante

Jira no siempre proporciona suficiente información para conocer la capacidad real de una persona.

Por eso el MVP NO debe pretender calcular una capacidad financiera o laboral perfecta.

### Estrategia MVP

Usar indicadores observables:

- número de issues assigned;
- issues in progress;
- story points en progreso, si existen;
- WIP por usuario;
- WIP por equipo.

## Ejemplo

```text
Backend Team

Average WIP/user: 5.2
Current WIP/user: 8.7

Capacity signal: HIGH
```

Si no existe suficiente información para calcular capacity:

```text
Capacity: N/A

Reason:
Insufficient workload/capacity data.
```

No inventar datos.

---

# 13. Dependencies Score

## Objetivo

Detectar dependencias que pueden afectar al portfolio.

## Inputs

- Blocked issues.
- Linked issues.
- Issues bloqueadas.
- Dependencias externas.
- Edad del bloqueo.

## Métricas

```text
blocked_count
blocked_age
dependent_project_count
```

Ejemplo:

```text
3 blocked issues
2 blockers > 5 days

Dependency Score = 48
```

---

# 14. Status thresholds

```text
80-100   Healthy 🟢
60-79    At Risk 🟠
0-59     Critical 🔴
```

Los thresholds deben almacenarse como configuración, aunque en el MVP pueden tener valores por defecto fijos.

---

# 15. Explicación del score

Cada dimensión debe almacenar sus factores.

Ejemplo:

```json
{
  "dimension": "schedule",
  "score": 42,
  "factors": [
    {
      "type": "OVERDUE_ISSUES",
      "value": 17,
      "impact": -20,
      "message": "17 issues are overdue"
    },
    {
      "type": "BLOCKED_ISSUES",
      "value": 3,
      "impact": -10,
      "message": "3 blocked issues are affecting delivery"
    }
  ]
}
```

El frontend puede utilizar estos factores para construir la explicación.

---

# 16. Project Detail

Al seleccionar un proyecto:

```text
PROJECT HEALTH

Payments Platform
Health: 42 🔴

Trend
──────────────
78 → 71 → 64 → 55 → 42


DIMENSIONS

Schedule       38 🔴
Delivery       71 🟢
Scope          43 🔴
Capacity       39 🔴
Dependencies   41 🔴
```

Después:

## Why?

```text
1. Capacity overload
Backend workload is significantly above the normal WIP level.

2. Scope growth
Current scope is 27% larger than the initial baseline.

3. Blocked dependencies
3 issues have been blocked for more than 5 days.
```

---

# 17. Recommended Actions

El MVP debe usar reglas simples.

Ejemplo:

```text
IF scope_growth > 20%
THEN
  recommendation =
  "Review or remove low-priority scope."

IF blocked_issues >= 3
THEN
  recommendation =
  "Review the top blockers and assign owners."

IF overdue_ratio > 0.20
THEN
  recommendation =
  "Review project schedule and overdue work."

IF workload_signal == HIGH
THEN
  recommendation =
  "Review WIP and team allocation."
```

No utilizar IA todavía.

---

# 18. Attention Queue

Esta debe ser una de las partes más visibles.

Orden:

```text
severity DESC
+
health score ASC
+
recent deterioration DESC
```

Ejemplo:

```text
TODAY'S ATTENTION

🔴 Payments Platform
Health 42
↓ -19 in 14 days

Main issue:
27% scope growth


🔴 CRM Migration
Health 47
↓ -15 in 14 days

Main issue:
4 blocked dependencies


🟠 Mobile App
Health 63
↓ -8 in 14 days

Main issue:
Delivery slowdown
```

---

# 19. Historical snapshots

El addon debe almacenar snapshots periódicos.

Ejemplo:

```text
project_id
timestamp
health_score
schedule_score
delivery_score
scope_score
capacity_score
dependency_score
```

Frecuencia inicial:

```text
1 snapshot / day
```

Esto permite:

- trends;
- detectar deterioro;
- gráficos;
- alertas.

---

# 20. Alertas

MVP básico:

### Alert rule 1

Health drops >= 10 points.

### Alert rule 2

Health changes from Healthy -> At Risk.

### Alert rule 3

Health changes from At Risk -> Critical.

### Alert rule 4

New critical dependency detected.

### Alert rule 5

Scope growth exceeds threshold.

Inicialmente la alerta puede mostrarse dentro de Jira.

Integraciones externas quedan para una versión posterior.

---

# 21. Arquitectura recomendada

La arquitectura exacta depende de la tecnología elegida, pero separar claramente:

```text
Frontend
   |
   v
Backend / App API
   |
   +---- Jira REST API
   |
   +---- Jira Changelog
   |
   +---- Health Engine
   |
   +---- Snapshot Storage
```

## Components

### Jira Integration Layer

Responsable de:

- proyectos;
- issues;
- statuses;
- assignees;
- links;
- changelog;
- sprint data cuando sea necesario.

### Data Normalizer

Transforma Jira a un modelo interno común.

### Health Engine

Responsable exclusivamente de:

```text
Jira data
   ↓
Metrics
   ↓
Dimension Scores
   ↓
Portfolio Health Score
```

### Recommendation Engine

Convierte factores en acciones.

### Snapshot Service

Persistencia temporal para tendencias.

### Frontend

Dashboard + Project Detail + Configuration.

---

# 22. Modelo de datos

## Project

```typescript
type Project = {
  id: string;
  key: string;
  name: string;
  jiraCloudId: string;
};
```

## ProjectSnapshot

```typescript
type ProjectSnapshot = {
  projectId: string;
  timestamp: string;

  healthScore: number;

  scheduleScore: number;
  deliveryScore: number;
  scopeScore: number;
  capacityScore: number;
  dependencyScore: number;

  metrics: {
    totalIssues: number;
    doneIssues: number;
    overdueIssues: number;
    blockedIssues: number;
    inProgressIssues: number;
    scopeGrowthPercent?: number;
    workloadSignal?: "LOW" | "NORMAL" | "HIGH";
  };
};
```

## HealthFactor

```typescript
type HealthFactor = {
  dimension:
    | "SCHEDULE"
    | "DELIVERY"
    | "SCOPE"
    | "CAPACITY"
    | "DEPENDENCIES";

  severity: "INFO" | "WARNING" | "CRITICAL";

  impact: number;

  message: string;

  metadata?: Record<string, unknown>;
};
```

---

# 23. Cálculo del score

Implementar una función pura.

```typescript
type DimensionScores = {
  schedule: number;
  delivery: number;
  scope: number;
  capacity: number;
  dependencies: number;
};

function calculateHealthScore(scores: DimensionScores): number {
  return Math.round(
    scores.schedule * 0.30 +
    scores.delivery * 0.25 +
    scores.scope * 0.15 +
    scores.capacity * 0.15 +
    scores.dependencies * 0.15
  );
}
```

La función debe tener tests unitarios.

---

# 24. Requisitos no funcionales

## Performance

La carga del dashboard debe ser rápida incluso con múltiples proyectos.

No recalcular todo Jira en cada request.

Usar:

```text
Jira data
   ↓
sync / cache
   ↓
metrics
   ↓
snapshot
   ↓
frontend
```

## Resilience

Si una métrica no puede calcularse:

```text
score = null
```

y NO:

```text
score = 0
```

No penalizar artificialmente un proyecto por falta de datos.

## Permissions

Respetar siempre permisos de Jira.

El addon nunca debe mostrar datos de issues que el usuario no puede consultar.

---

# 25. Seguridad

Requisitos:

- OAuth 2.0 / mecanismo oficial de autenticación de Atlassian.
- Least privilege.
- No almacenar más datos Jira de los necesarios.
- Cifrar información persistida.
- Logs sin contenido sensible de issues.
- No enviar datos a proveedores externos de IA en el MVP.

---

# 26. MVP UX

## Setup

```text
Welcome to Portfolio Health

Select projects to monitor

[ ] Payments
[ ] CRM
[ ] Mobile
[ ] Analytics

[Start analysis]
```

## Loading

```text
Analyzing portfolio...

✓ Loading projects
✓ Reading issues
✓ Calculating metrics
✓ Calculating health
✓ Saving baseline

Portfolio ready
```

## Dashboard

Debe priorizar:

1. Overall health.
2. Attention queue.
3. Health by project.
4. Portfolio trend.

---

# 27. Telemetría del producto

Medir:

- installation;
- first scan completed;
- number of projects monitored;
- dashboard opened;
- project detail opened;
- recommendation clicked;
- configuration changed;
- alert triggered.

No recopilar contenido de issues para analítica de producto.

---

# 28. Roadmap de implementación

## Sprint 1 — Foundation

- Crear app.
- Autenticación.
- Selección de proyectos.
- Jira API client.
- Modelo interno.
- Persistencia.

## Sprint 2 — Metrics

Implementar:

- Schedule.
- Delivery.
- Scope.
- Capacity signal.
- Dependencies.

## Sprint 3 — Health Engine

- Score.
- Thresholds.
- Factors.
- Recommendations.
- Unit tests.

## Sprint 4 — Dashboard

- Portfolio overview.
- Attention queue.
- Project cards.
- Project detail.

## Sprint 5 — Historical data

- Daily snapshots.
- Trend chart.
- Health deterioration detection.

## Sprint 6 — Alerts + polish

- Alert rules.
- Empty states.
- Error states.
- Performance.
- Permission validation.

---

# 29. Definition of Done

El MVP está listo cuando:

- [ ] Se puede instalar la aplicación.
- [ ] Se pueden seleccionar proyectos.
- [ ] Se puede ejecutar un análisis.
- [ ] Se calcula Health Score de forma determinista.
- [ ] Cada score tiene explicación.
- [ ] Se muestran los proyectos más problemáticos.
- [ ] Se pueden consultar las cinco dimensiones.
- [ ] Se almacenan snapshots diarios.
- [ ] Se visualiza la tendencia.
- [ ] Se generan recomendaciones básicas.
- [ ] Se respetan permisos de Jira.
- [ ] Hay tests para el Health Engine.
- [ ] La aplicación funciona con proyectos pequeños y grandes razonablemente.
- [ ] Un usuario nuevo puede entender el dashboard sin documentación adicional.

---

# 30. Tests críticos

## Health Engine

### Healthy project

Input:

```text
Schedule: 95
Delivery: 90
Scope: 95
Capacity: 90
Dependencies: 100
```

Expected:

```text
Health >= 90
```

### Scope creep

Input:

```text
Scope growth: 30%
```

Expected:

```text
Scope score <= 40
```

### Blocked dependencies

Input:

```text
Blocked issues: 5
Blocked > 5 days: 3
```

Expected:

```text
Dependency score decreases significantly.
```

### Missing data

Input:

```text
Capacity data unavailable
```

Expected:

```text
Capacity = null
```

No false penalty.

---

# 31. Métrica principal de éxito del producto

No medir solamente instalaciones.

La métrica principal debería ser:

> **Percentage of active users who open the Attention Queue and then inspect at least one project each week.**

Porque el valor del producto está en ayudar a decidir dónde intervenir.

Métricas secundarias:

- Time to first useful insight.
- Weekly active PMOs.
- Projects monitored per account.
- Alert-to-action rate.
- Retention after 30 days.

---

# 32. Hipótesis que debemos validar

Antes de construir V2:

### H1

Los PMOs tienen dificultad para identificar proyectos en riesgo con Jira estándar.

### H2

Un Health Score explicado es más útil que un dashboard lleno de métricas.

### H3

Los usuarios valoran más las recomendaciones que el score.

### H4

La instalación sin configuración compleja aumenta la adopción.

### H5

Los usuarios vuelven semanalmente si reciben una Attention Queue útil.

---

# 33. Investigación con usuarios

Antes de implementar demasiadas funcionalidades:

Entrevistar al menos 10 usuarios de Jira.

Preguntas:

1. ¿Cuántos proyectos supervisas?
2. ¿Cómo sabes actualmente que un proyecto está en riesgo?
3. ¿Qué métricas miras?
4. ¿Cuánto tardas en preparar un portfolio review?
5. ¿Qué información de Jira no consigues fácilmente?
6. ¿Qué problemas descubres demasiado tarde?
7. ¿Qué herramientas complementarias utilizas?
8. ¿Qué te gustaría recibir automáticamente cada lunes?
9. ¿Pagarías por una herramienta que detectara esos problemas?
10. ¿Qué tendría que hacer para sustituir tu proceso actual?

No presentarles primero la solución. Primero validar el problema.

---

# 34. V2 — posibles extensiones

Después de validar el MVP:

## What-if scenarios

```text
What if I delay Project A by 4 weeks?
```

## Predictive delivery

Estimar probabilidad de cumplir fecha.

## AI explanation

```text
Why is this project getting worse?
```

## Slack / email

Enviar automáticamente:

```text
Your portfolio has 3 new risks this week.
```

## Financial health

Cuando existan datos fiables:

- budget;
- forecast;
- actual cost;
- ROI.

---

# 35. Posicionamiento

Evitar:

> "Advanced Project Management for Jira"

Es demasiado genérico.

Preferir:

> **Portfolio Health for Jira**

Subtítulo:

> **Know which projects need attention before they become problems.**

O:

> **Turn Jira data into an executive portfolio health report.**

---

# 36. Regla de oro del producto

El usuario nunca debería preguntarse:

> "¿Qué significa este gráfico?"

Debe poder responder inmediatamente:

> **"Este proyecto está empeorando por estas tres razones y estas son las cosas que debería revisar."**

Ese es el núcleo del MVP.
