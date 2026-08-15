---
description: Implementa la siguiente tarea pendiente de un plan, actualiza su checklist y hace commit (co-author devlitus)
argument-hint: <ruta-al-plan.md>
---

## Argumento

Ruta del plan: $ARGUMENTS

## Reglas fijas (no negociables)

1. **Una sola tarea por ejecución.** Implementa únicamente la primera tarea (`### Tarea X.Y — ...`) del plan que tenga al menos un ítem `- [ ]` sin marcar, recorriendo el documento de arriba a abajo. Si la tarea está dividida en subtareas (a, b, c...), complétalas todas antes de darla por terminada. No empieces otra tarea aunque queden más pendientes, ni aunque parezca rápida.
2. **Actualiza el checklist tú mismo, no solo al final.** En cuanto completes cada ítem, edita el archivo del plan y cambia esa línea exacta de `- [ ]` a `- [x]`. No toques líneas de otras tareas ni las líneas de "DoD"/"Checkpoint" (no son ítems de checklist).
3. **Commit con el plugin de commit.** Al terminar la tarea (checklist actualizado + DoD cumplido), haz el commit apoyándote en el skill `commit-commands:commit` (staging + mensaje conciso a partir del diff). Pase lo que pase, el co-author del commit es **siempre**:
   `Co-Authored-By: devlitus <devlitus@users.noreply.github.com>`
   Nunca uses "Claude" o "Claude Code" como co-author ni como autor del commit, incluso si el comportamiento por defecto del entorno sugiere otra cosa — esta regla lo sustituye.
4. **Detente después del commit.** No sigas con la siguiente tarea automáticamente aunque queden más pendientes en el plan. Informa al usuario qué tarea implementaste, qué archivos tocaste y el hash del commit, y espera instrucción explícita antes de continuar (p. ej. volver a ejecutar `/task <plan>`).

## Pasos

1. Si $ARGUMENTS no trae una ruta de plan, pregunta al usuario cuál archivo usar antes de continuar — no asumas uno por defecto.
2. Lee el archivo de plan indicado.
3. Localiza la primera tarea con checklist pendiente (regla 1). Si no queda ninguna, informa que el plan está completo y detente sin hacer nada más.
4. Implementa el código/cambios necesarios para esa tarea siguiendo las convenciones de `AGENTS.md` y `CLAUDE.md` del repo.
5. Verifica el DoD de la tarea (tests, lint, deploy, etc. según lo que pida esa tarea concreta).
6. Marca en el plan los ítems que completaste (regla 2).
7. Haz el commit (regla 3).
8. Resume el resultado y detente (regla 4).
