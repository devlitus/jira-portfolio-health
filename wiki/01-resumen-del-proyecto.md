# 1. Resumen del proyecto

## Qué es

**Portfolio Health for Jira** es un addon (app de Forge) para Jira Cloud que responde una pregunta muy concreta:

> **¿Qué proyectos necesitan mi atención y por qué?**

No es otro Gantt, roadmap o gestor de recursos. Es una capa de análisis sobre los proyectos que ya existen en Jira: calcula un **Health Score** (0–100) por proyecto, explica qué lo está empeorando y sugiere qué revisar primero.

Posicionamiento: **"Know which projects need attention before they become problems."**

## A quién va dirigido

- **PMO / Project Manager / Engineering Manager** (usuario principal): supervisa varios proyectos a la vez y hoy no tiene forma rápida de saber cuáles están en riesgo sin entrar proyecto a proyecto.
- **Administrador de Jira** (usuario secundario): necesita que la instalación sea simple, con permisos claros y sin mantenimiento.

## Problema que resuelve

Un portfolio puede tener cientos de issues repartidos en varios proyectos. Jira permite consultarlos, pero no responde directamente preguntas como:

- ¿Qué proyecto está empeorando?
- ¿Cuál tiene más riesgo de retrasarse?
- ¿Dónde está creciendo el alcance (scope) sin control?
- ¿Qué dependencias están bloqueando la entrega?
- ¿Qué proyectos requieren intervención esta semana?

El addon convierte esos datos en una **cola de atención priorizada**, en vez de obligar a revisar cada proyecto manualmente.

## Cómo funciona (alto nivel)

1. El usuario selecciona qué proyectos de Jira quiere monitorizar.
2. La app analiza esos proyectos en 5 dimensiones: **Schedule** (plazos), **Delivery** (ritmo de entrega), **Scope** (crecimiento de alcance), **Capacity** (carga de trabajo del equipo) y **Dependencies** (bloqueos).
3. Cada dimensión produce un score explicado — nunca solo un número, siempre con el motivo ("Health = 61 porque el proyecto tiene +28% de scope, 123% de capacidad y 3 dependencias bloqueadas").
4. Los scores se combinan en un **Health Score** general por proyecto.
5. El dashboard prioriza los proyectos peor puntuados en una **Attention Queue**, con una recomendación de acción por cada uno.
6. Cada día la app guarda una foto (snapshot) del estado, para poder mostrar tendencia y detectar deterioro.

## Principios de producto

- **Configuración mínima**: instalar → seleccionar proyectos → ver resultados. Sin campos personalizados ni configuración compleja.
- **Explicable siempre**: ningún score se muestra sin su porqué.
- **Accionable**: cada problema relevante viene con una recomendación concreta.
- **Sin IA en el MVP**: el cálculo es determinista y reproducible (reglas fijas, no modelos de lenguaje). La IA queda como posible mejora futura.

## Qué incluye el MVP

- Selección de proyectos a monitorizar.
- Dashboard de portfolio con salud general y ranking de proyectos.
- Las 5 dimensiones de salud, con explicación de factores.
- Vista de detalle por proyecto ("por qué" + acciones recomendadas).
- Histórico del Health Score y tendencia.
- Alertas básicas (caída de score, cambio de estado, scope creep, etc.).

## Qué queda fuera (a propósito)

Gantt completo, roadmap, time tracking, gestión financiera, OKRs, planificador de recursos avanzado, escenarios "what-if", IA generativa, integración con Slack, informes en PDF, benchmarks entre clientes. Todo esto queda para una posible versión futura, una vez validado que el MVP resuelve el problema real.
