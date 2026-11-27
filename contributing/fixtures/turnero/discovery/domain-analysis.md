---
created: 2026-10-11
last_updated: 2026-10-11
status: closed
functional_analysis: docs/discovery/functional-analysis.md
---

# Análisis de dominio — Turnero

## Glosario

| Término | Definición |
|---|---|
| Cliente | Persona que reserva. No es una entidad ni una cuenta: es la agrupación de los turnos que comparten una misma clave de identidad |
| Clave de identidad | Email del cliente normalizado (atributo derivado de Turno). Gobierna el tope de turnos activos y la retención |
| Turno activo | Turno en estado RESERVADO, haya pasado o no su hora de inicio |
| Estado terminal | ATENDIDO, AUSENTE o CANCELADO. Un turno en estado terminal está cerrado |
| Profesional habilitado | Profesional activo con una Asignación al servicio en cuestión |
| "Cualquiera" | Opción de reserva sin profesional elegido; el sistema asigna uno al confirmar (RES-14) |
| Grilla | Horarios alineados a la **granularidad de la grilla**, contados desde las 00:00 de cada día |
| Horario ofrecido | Horario de inicio de la grilla que cumple RES-06, RES-07 y RES-08 para un profesional y un servicio |
| Carga del día | Cantidad de turnos no cancelados de un profesional en un día; criterio de reparto de "cualquiera" |
| Turno destacado | Turno en RESERVADO que se superpone con un bloqueo vigente o que queda fuera de la disponibilidad semanal de su profesional |
| Cancelación en cascada | Cancelación automática de los turnos en RESERVADO con inicio futuro de un profesional o servicio que se desactiva (CAT-03, CAT-08) |
| Canal de origen | Por dónde se originó un evento de un turno: público, panel o sistema. El atributo Origen del turno usa solo los dos primeros: es el canal por el que se creó |

## Entidades

### Cuenta de administrador
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Usuario | texto | sí | único | no |
| Contraseña | texto | sí | nunca se muestra ni se guarda en claro | no |
| Intentos fallidos consecutivos | número | sí | entero mayor o igual a 0; default 0; vuelve a 0 con un ingreso exitoso (ACC-E2) | no |
| Bloqueada hasta | fecha y hora | no | se completa al alcanzar los **intentos fallidos antes del bloqueo de ingreso** (ACC-E2) | no |

**Relaciones:** ninguna; los Eventos de turno guardan su usuario como texto.

**Baja:** se elimina, solo por infraestructura (ACC-03). El historial conserva su usuario como autor.

### Profesional
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Nombre | texto | sí | de 1 a 100 caracteres; único entre profesionales sin distinguir mayúsculas | no |
| Activo | booleano | sí | default sí | no |

**Relaciones:** presta muchos Servicios (vía Asignación); tiene muchas Franjas de disponibilidad, muchos Bloqueos de alcance individual y muchos Turnos.

**Baja:** se desactiva, nunca se elimina (CAT-02); se puede reactivar (CAT-09). Al desactivarse se cancelan sus turnos en cascada (CAT-03).

### Servicio
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Nombre | texto | sí | de 1 a 100 caracteres; único entre servicios sin distinguir mayúsculas | no |
| Duración | duración | sí | múltiplo de la **granularidad de la grilla**, desde ese valor hasta la **duración máxima de servicio** inclusive | no |
| Precio | dinero | no | en pesos argentinos; mayor o igual a 0; no se muestra en la Reserva pública | no |
| Activo | booleano | sí | default sí | no |

**Relaciones:** lo prestan muchos Profesionales (vía Asignación); tiene muchos Turnos.

**Baja:** se desactiva, nunca se elimina (CAT-08); se puede reactivar (CAT-09). Al desactivarse se cancelan sus turnos en cascada (CAT-08).

### Asignación
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Profesional | referencia a Profesional | sí | — | no |
| Servicio | referencia a Servicio | sí | — | no |

**Relaciones:** une un Profesional con un Servicio; el par es único.

**Baja:** se elimina (CAT-10). No afecta los turnos ya reservados (CAT-11).

### Franja de disponibilidad
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Profesional | referencia a Profesional | sí | — | no |
| Día de la semana | enum | sí | LUNES / MARTES / MIÉRCOLES / JUEVES / VIERNES / SÁBADO / DOMINGO; sin default | no |
| Hora de inicio | hora | sí | alineada a la grilla | no |
| Hora de fin | hora | sí | alineada a la grilla; posterior a la hora de inicio, dentro del mismo día (hasta las 24:00) | no |

**Relaciones:** pertenece a un Profesional.

**Baja:** se elimina, al editar la disponibilidad semanal (CAT-13). No altera los turnos ya reservados (CAT-18).

### Bloqueo
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Motivo | texto | sí | de 1 a 200 caracteres | no |
| Inicio | fecha y hora | sí | alineado a la grilla | no |
| Fin | fecha y hora | sí | alineado a la grilla; posterior al inicio y al momento de registrarlo (CAT-E4) | no |
| Alcance | enum | sí | PROFESIONAL / TODOS; sin default | no |
| Profesional | referencia a Profesional | solo si Alcance es PROFESIONAL | — | no |

**Relaciones:** pertenece a un Profesional, o a ninguno si su alcance es TODOS.

**Baja:** se elimina solo si todavía no terminó (CAT-16); uno terminado queda como registro (CAT-E5).

### Turno
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Profesional | referencia a Profesional | sí | habilitado para el servicio al momento de reservar | no |
| Servicio | referencia a Servicio | sí | activo al momento de reservar | no |
| Inicio | fecha y hora | sí | alineado a la grilla | no |
| Duración | duración | sí | se copia del servicio al reservar; no cambia si cambia el servicio (RES-16) | no |
| Nombre del cliente | texto | sí | de 2 a 100 caracteres; "Anonimizado" tras la anonimización | sí |
| Teléfono del cliente | teléfono | sí | de 8 a 15 dígitos, acepta +, espacios y guiones; "Anonimizado" tras la anonimización | sí |
| Email del cliente | email | sí | se guarda tal como lo escribió el cliente; "Anonimizado" tras la anonimización | sí |
| Estado | enum | sí | RESERVADO / ATENDIDO / AUSENTE / CANCELADO; default RESERVADO | no |
| Origen | enum | sí | canal por el que se creó: PÚBLICO / PANEL; sin default | no |
| Motivo de cancelación | texto | solo si CANCELADO | hasta 500 caracteres. Lo escribe el administrador (AGE-07) o lo completa el sistema: "Reprogramado" (REP-02), "Cancelado por el cliente" (CAN-03), "Profesional desactivado" o "Servicio desactivado" (CAT-03, CAT-08) | no |
| Token de cancelación | texto | sí | único entre todos los turnos; largo y aleatorio (RES-17) | no |
| Turno original | referencia a Turno | no | solo si el turno se creó por una reprogramación | no |
| Recordatorio enviado | booleano | sí | default no; pasa a sí al enviarse NOT-06 (REC-01) | no |
| Anonimizado | booleano | sí | default no; pasa a sí al anonimizarse (RET-03) | no |

**Atributos derivados**
| Atributo | Regla de cálculo |
|---|---|
| Fin | Inicio + Duración |
| Clave de identidad | Email del cliente en minúsculas, sin el sufijo +alias y sin los puntos de la parte local, igual para todos los dominios (RES-10). Vacía si el turno está anonimizado |
| Token vigente | El token sirve si el turno está en RESERVADO y su inicio no llegó (CAN-01, CAN-04) |
| Destacado | Está en RESERVADO y se superpone con un bloqueo vigente del profesional (o de alcance TODOS), o no cae completo dentro de una franja de disponibilidad de su profesional |
| Turno sucesor | El turno cuyo Turno original es este; existe solo si se canceló por una reprogramación |

**Relaciones:** pertenece a un Profesional y a un Servicio; tiene muchos Eventos de turno; puede referenciar a un Turno original y tener un Turno sucesor.

**Baja:** nunca se elimina. Al cumplirse el **plazo de retención de datos del cliente** se anonimizan sus datos personales (RET-03).

### Evento de turno
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Turno | referencia a Turno | sí | — | no |
| Tipo | enum | sí | CREACIÓN / CAMBIO DE ESTADO / REPROGRAMACIÓN / ANONIMIZACIÓN / EMAIL NO ENTREGADO; sin default (HIS-02) | no |
| Fecha y hora | fecha y hora | sí | momento real en que ocurrió (AUS-E1) | no |
| Canal | enum | sí | PÚBLICO / PANEL / SISTEMA; sin default | no |
| Autor | texto | sí | usuario de la cuenta de administrador si el canal es PANEL; "Cliente" si es PÚBLICO; "Sistema" si es SISTEMA (HIS-03). Se conserva aunque la cuenta se elimine (ACC-03) | no |
| Estado anterior | enum | solo si Tipo es CAMBIO DE ESTADO | valores del Estado del Turno | no |
| Estado nuevo | enum | solo si Tipo es CAMBIO DE ESTADO | valores del Estado del Turno | no |
| Motivo | texto | solo si el Estado nuevo es CANCELADO | el motivo de cancelación del turno | no |
| Turno relacionado | referencia a Turno | solo si Tipo es REPROGRAMACIÓN | en el original, el turno nuevo; en el nuevo, el original | no |
| Notificación | enum | solo si Tipo es EMAIL NO ENTREGADO | NOT-01 / NOT-02 / NOT-03 / NOT-04 / NOT-05 / NOT-06 | no |
| Causa de no entrega | enum | solo si Tipo es EMAIL NO ENTREGADO | REINTENTOS AGOTADOS / RECHAZO DEFINITIVO; sin default (NOT-E2, NOT-E3) | no |
| Datos del cliente | texto | solo si Tipo es CREACIÓN | nombre, teléfono y email del cliente al crearse el turno; "Anonimizado" tras la anonimización (RET-04) | sí |

**Relaciones:** pertenece a un Turno; puede referenciar a un Turno relacionado.

**Baja:** nunca: no se edita ni se borra (HIS-04). Solo sus datos personales se anonimizan (RET-04).

## Estados

### Turno

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| RESERVADO | inicial | El turno está tomado y todavía no se resolvió; ocupa su horario y cuenta para el tope del cliente |
| ATENDIDO | terminal | El cliente se presentó y fue atendido |
| AUSENTE | terminal | El cliente no se presentó |
| CANCELADO | terminal | El turno se dio de baja, por cualquier vía, incluida una reprogramación; libera su horario |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | RESERVADO | RES-01, RES-02, REP-02 |
| RESERVADO | ATENDIDO | AGE-05 |
| RESERVADO | AUSENTE | AGE-06 (manual), AUS-01 (automático) |
| RESERVADO | CANCELADO | AGE-07, CAN-01, CAT-03, CAT-08, REP-02 |

## Invariantes

| ID | Regla | Entidades | Aplicada en |
|---|---|---|---|
| INV-01 | Dos turnos no cancelados del mismo profesional nunca se superponen en el tiempo | Turno | RES-06, RES-E1, RES-15, REP-03, REP-E1 |
| INV-02 | Una clave de identidad nunca tiene más turnos en RESERVADO que el **tope de turnos activos por cliente** | Turno | RES-03, RES-09, RES-E3, REP-04 |
| INV-03 | Un profesional o un servicio inactivo no tiene turnos en RESERVADO con inicio futuro | Profesional, Servicio, Turno | CAT-03, CAT-08, CAT-E6 |
| INV-04 | Un turno cancelado por una reprogramación tiene exactamente un turno sucesor, con el mismo profesional, el mismo servicio y los mismos datos del cliente; un turno tiene a lo sumo un sucesor | Turno | REP-01, REP-02, REP-05 |
| INV-05 | Un evento de turno nunca se modifica ni se borra, salvo la anonimización de sus datos personales | Evento de turno | HIS-04, RET-04 |
| INV-06 | Cada turno tiene exactamente un evento de creación y un evento de cambio de estado por cada transición que tuvo | Turno, Evento de turno | HIS-02, AUS-02 |
| INV-07 | Dos franjas de disponibilidad del mismo profesional y día de la semana nunca se superponen | Franja de disponibilidad | CAT-13, CAT-E3 |
| INV-08 | Los turnos de una misma clave de identidad se anonimizan juntos: o ninguno está anonimizado o lo están todos, y solo cuando pasó el **plazo de retención de datos del cliente** desde el inicio del más reciente | Turno, Evento de turno | RET-01, RET-02, RET-03, RET-E2 |
| INV-09 | Un turno recibe NOT-06 a lo sumo una vez | Turno | REC-01, REC-03 |
