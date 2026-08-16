# 2. Estado actual

El proyecto se construye en 7 fases (Fase 0 a Fase 6). A fecha de hoy:

| Fase | Objetivo | Estado |
|------|----------|--------|
| 0 — Setup y decisiones técnicas | Preparar el repo y cerrar decisiones de arquitectura | ✅ Completa |
| 1 — Foundation | Instalación, selección de proyectos, conexión con Jira | ✅ Completa |
| 2 — Metrics | Cálculo de las métricas de las 5 dimensiones | ✅ Completa |
| 3 — Health Engine | Scores, explicación de factores, recomendaciones | ✅ Completa |
| 4 — Dashboard | Las 3 pantallas principales (portfolio, cola de atención, detalle) | ✅ Completa |
| 5 — Historical data | Snapshots diarios, tendencias, detección de deterioro | ✅ Completa |
| 6 — Alerts + polish | Alertas, estados vacíos/error, rendimiento, seguridad, telemetría, release | 🟡 En progreso |

**Resumen:** el producto está funcionalmente completo — todas las capacidades descritas en el MVP (selección de proyectos, análisis, dashboard, cola de atención, detalle, histórico, alertas) están implementadas y con tests automáticos en verde. Lo que queda es cerrar la fase final antes de considerarlo listo para producción.

## Qué funciona hoy

- Instalar la app y seleccionar qué proyectos monitorizar.
- Ejecutar un análisis y ver el dashboard: salud general del portfolio, conteo de proyectos críticos / en riesgo / sanos, y ranking por proyecto.
- Cola de atención priorizada (peor salud primero) con el motivo principal de cada problema.
- Detalle de proyecto: score de las 5 dimensiones, explicación ("Why?") y hasta 3 recomendaciones.
- Tendencia del score en el tiempo y flechas de mejora/empeoramiento.
- Alertas automáticas (caída de score ≥10 puntos, cambio de estado Healthy→At Risk→Critical, scope creep, dependencias críticas nuevas).
- Manejo de casos límite: proyecto sin datos suficientes, fallo de permisos, fallo de la API de Jira — todo sin romper el resto del dashboard.

## Lo que falta para cerrar la Fase 6

- **Telemetría mínima**: registrar en logs eventos de uso (instalación, primer análisis, apertura de dashboard/detalle, alerta disparada) — sin contenido de issues, solo para saber si el producto se usa.
- **Validación final y release**: repasar la checklist de "Definition of Done" del MVP punto por punto, pasar la suite de tests completa una vez más, hacer una revisión de pre-release, actualizar el README del repo, y decidir el despliegue a producción (todavía no se ha desplegado a producción — solo al entorno de desarrollo).

## Nota sobre verificación visual

La mayoría de tareas están verificadas por tests automáticos y por despliegue al entorno de desarrollo (`forge deploy` + `forge install`), pero varias tareas del plan dejan pendiente una **confirmación visual manual** en el navegador (por ejemplo, ver el flujo completo de principio a fin, o ver las flechas de tendencia con datos reales de varios días). Esto es intencional — se hace bajo demanda para no bloquear el avance — pero conviene tenerlo en cuenta antes de dar el MVP por "verificado en producción".
