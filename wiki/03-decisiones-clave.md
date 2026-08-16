# 3. Decisiones clave

Resumen en términos simples de las decisiones técnicas más relevantes. El detalle completo, con justificación técnica, está en `docs/architecture-decisions.md`.

## Dónde se guardan los datos

Todo se guarda en el almacenamiento propio de Forge (la plataforma de Atlassian sobre la que corre el addon) — no hay ninguna base de datos externa. Esto significa menos infraestructura que mantener y menos superficie de riesgo de seguridad, a cambio de algunas limitaciones técnicas menores (documentadas y ya resueltas en el diseño).

## Qué datos puede ver el addon

El addon **siempre respeta los permisos de Jira del usuario que lo usa**: nunca muestra información de un proyecto o issue que esa persona no podría ver directamente en Jira. Las llamadas a Jira se hacen desde el "backend" del addon (no directamente desde el navegador), lo que además permite cachear resultados y que el dashboard cargue rápido sin repetir todo el análisis cada vez que se abre.

## Snapshot diario

Una vez al día, el addon guarda automáticamente una "foto" del estado de cada proyecto monitorizado (sin intervención del usuario). Esto es lo que permite mostrar tendencias e histórico, y detectar cuándo un proyecto está empeorando con el tiempo.

## Sin IA en el MVP

El cálculo del Health Score es 100% determinista: mismas reglas, mismos datos → mismo resultado siempre. No se usa ningún modelo de IA para calcular scores ni recomendaciones en esta versión — eso reduce riesgo (nada de "alucinaciones" en un número que se usa para decisiones) y evita enviar datos de Jira a servicios externos. La IA queda como posible mejora futura, no como parte del MVP.

## Interfaz construida a medida (Custom UI)

La mayoría de addons de Jira usan un kit de componentes visuales predefinido de Atlassian ("UI Kit"). Este proyecto usa en su lugar una interfaz React construida a medida (Custom UI) — más esfuerzo de desarrollo, pero más control sobre cómo se ve y se comporta el dashboard, importante para un producto donde la primera impresión visual (ver salud del portfolio en menos de 10 segundos) es parte del valor.

## Sin tests suficientes = sin penalización

Cuando no hay datos suficientes para calcular una métrica (por ejemplo, un proyecto sin fechas de entrega o sin datos de carga de trabajo), el addon **nunca inventa un valor ni penaliza el score** — muestra explícitamente "N/A — Insufficient data". Es una decisión de producto deliberada para que el Health Score sea siempre justo y confiable.
