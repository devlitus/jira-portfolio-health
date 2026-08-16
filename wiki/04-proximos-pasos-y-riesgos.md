# 4. Próximos pasos y riesgos

## Para cerrar el MVP (Fase 6 restante)

1. **Telemetría mínima** — registrar de forma anónima si el producto se usa (instalación, primer análisis, aperturas de dashboard/detalle, alertas disparadas), sin guardar contenido de issues.
2. **Validación final y release** — repasar la checklist de requisitos del MVP uno por uno, pasar la suite de tests completa, hacer una revisión de pre-release, actualizar el README del repo, y decidir cuándo y cómo desplegar a producción (hoy solo está desplegado en el entorno de desarrollo).

No hay bloqueos técnicos conocidos para completar esto — es trabajo de cierre, no de investigación.

## Riesgos técnicos conocidos (ya identificados y mitigados en el diseño)

- **Límites de la API de Jira en portfolios grandes**: mitigado con reintentos automáticos y medición de rendimiento; si aparece con volumen alto se ajustará la forma de paginar los datos.
- **Historial incompleto en proyectos muy antiguos**: algunas métricas (tiempo de ciclo, issues reabiertos) pueden quedar en "sin datos" en vez de un número — es el comportamiento esperado, no un fallo.
- **Story points no estandarizados** entre instancias de Jira: el MVP cuenta issues en vez de story points salvo que el campo esté claramente identificado.
- **Límite de tiempo de ejecución del proceso diario** en portfolios muy grandes: se detectará con el uso real y se resolvería dividiendo el trabajo en lotes.

Ninguno de estos riesgos afecta a portfolios de tamaño normal; están documentados para no sorprender si el producto escala a muchos proyectos.

## Después del MVP: validar con usuarios reales

Antes de invertir en una v2, el plan de producto contempla validar con al menos 10 usuarios de Jira (PMOs/PMs/EMs) hipótesis como:

- ¿Realmente cuesta identificar proyectos en riesgo con Jira estándar?
- ¿Un score explicado es más útil que un dashboard lleno de métricas sueltas?
- ¿Los usuarios valoran más las recomendaciones que el número de score en sí?
- ¿La instalación sin configuración compleja mejora la adopción?
- ¿Los usuarios vuelven cada semana si la cola de atención es útil?

La métrica de éxito del producto no es el número de instalaciones, sino: **qué porcentaje de usuarios activos abre la cola de atención y revisa al menos un proyecto cada semana**. Eso es lo que indicaría que el producto realmente ayuda a decidir dónde intervenir.

## Posibles extensiones futuras (fuera del MVP)

Escenarios "what-if" (¿qué pasa si retraso el proyecto X 4 semanas?), predicción de cumplimiento de fecha, explicación por IA, notificaciones a Slack/email, y salud financiera (presupuesto/coste real) cuando existan datos fiables para ello. Ninguna de estas está planificada para el MVP.
