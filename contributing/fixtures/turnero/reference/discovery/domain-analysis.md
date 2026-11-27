---
created: 2026-10-10
last_updated: 2026-10-10
status: closed
functional_analysis: docs/discovery/functional-analysis.md
---

# Análisis de dominio — Turnero

## Glosario

| Término | Definición |
|---|---|
| Cliente | Persona que reserva. No es una cuenta ni una entidad: es la agrupación de turnos bajo una misma clave de identidad |
| Clave de identidad | Email del cliente normalizado (ver atributo derivado de Turno). Gobierna el tope de turnos activos y el plazo de retención |
| Turno activo | Turno en estado RESERVADO |
| Turno futuro | Turno cuya hora de inicio todavía no llegó |
| Grilla | Horarios de inicio posibles: múltiplos de la **granularidad de la grilla** contados desde las 00:00 |
| Canal de origen | Por dónde se originó un cambio en un turno: público, panel o sistema. El atributo Origen del turno usa solo los dos primeros, porque es el canal por el que se creó |
| "Cualquiera" | Opción de reserva sin profesional elegido; el sistema asigna uno al confirmar (RES-11) |
| Franja | Intervalo de horas de un día de la semana en el que un profesional atiende |

## Entidades

### Cuenta de administrador
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Usuario | texto | sí | único | no |
| Contraseña | texto | sí | se guarda de forma no reversible; nunca se muestra | no |
| Intentos fallidos | número | sí | default 0; vuelve a 0 al iniciar sesión | no |
| Bloqueada hasta | fecha y hora | no | solo si alcanzó los **intentos fallidos antes del bloqueo** | no |

**Relaciones:** es autor de muchos Eventos de turno.

**Baja:** la elimina infraestructura (ACC-05). Los eventos que firmó conservan el nombre de usuario
como autor.

### Profesional
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Nombre | texto | sí | — | no |
| Activo | booleano | sí | default sí | no |

**Relaciones:** presta muchos Servicios (vía Asignación); tiene muchas Disponibilidades semanales,
muchos Bloqueos y muchos Turnos.

**Baja:** se desactiva, nunca se elimina (CAT-01). Al desactivarse se cancelan sus turnos futuros
(CAT-02). Se puede reactivar (CAT-11).

### Servicio
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Nombre | texto | sí | — | no |
| Duración | duración | sí | múltiplo de la **granularidad de la grilla**, hasta la **duración máxima de un servicio** (CAT-04) | no |
| Precio informativo | dinero | no | uso interno; no se muestra en la cara pública | no |
| Activo | booleano | sí | default sí | no |

**Relaciones:** lo prestan muchos Profesionales (vía Asignación); tiene muchos Turnos.

**Baja:** se desactiva, nunca se elimina. Al desactivarse se cancelan sus turnos futuros (CAT-05).
Se puede reactivar (CAT-11).

### Asignación
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Profesional | referencia a Profesional | sí | — | no |
| Servicio | referencia a Servicio | sí | única por par profesional–servicio | no |

**Relaciones:** une un Profesional con un Servicio.

**Baja:** se elimina al desasignar (CAT-06); no afecta los turnos existentes (CAT-E5).

### Disponibilidad semanal
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Profesional | referencia a Profesional | sí | — | no |
| Día de la semana | enum | sí | lunes / martes / miércoles / jueves / viernes / sábado / domingo | no |
| Desde | hora | sí | alineada a la **granularidad de la grilla** | no |
| Hasta | hora | sí | posterior a Desde; alineada a la **granularidad de la grilla**; no se superpone con otra franja del mismo profesional y día (CAT-E2) | no |

**Relaciones:** pertenece a un Profesional.

**Baja:** se elimina; no afecta los turnos existentes (CAT-10).

### Bloqueo
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Motivo | texto | sí | — | no |
| Inicio | fecha y hora | sí | alineado a la **granularidad de la grilla** | no |
| Fin | fecha y hora | sí | posterior a Inicio (CAT-E3) y al momento de registrarlo; alineado a la **granularidad de la grilla** (CAT-13) | no |
| Alcance | enum | sí | un profesional / todos | no |
| Profesional | referencia a Profesional | solo si Alcance es "un profesional" | — | no |

**Relaciones:** puede pertenecer a un Profesional.

**Baja:** se elimina, nunca se edita (CAT-12); sus turnos dejan de destacarse.

### Turno
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Profesional | referencia a Profesional | sí | activo al momento de reservar | no |
| Servicio | referencia a Servicio | sí | activo y asignado al profesional al momento de reservar | no |
| Inicio | fecha y hora | sí | alineado a la **granularidad de la grilla** | no |
| Duración | duración | sí | se copia del servicio al reservar; no cambia si cambia el servicio (CAT-10) | no |
| Nombre del cliente | texto | sí | — | sí |
| Teléfono del cliente | teléfono | sí | — | sí |
| Email del cliente | email | sí | se guarda tal como lo escribió el cliente | sí |
| Estado | enum | sí | RESERVADO / ATENDIDO / AUSENTE / CANCELADO; default RESERVADO | no |
| Origen | enum | sí | canal por el que se creó: público / panel | no |
| Motivo de cancelación | texto | solo si CANCELADO | — | no |
| Token de cancelación | texto | sí | único por turno (CAN-02) | no |
| Turno original | referencia a Turno | no | solo si viene de una reprogramación | no |

**Atributos derivados**
| Atributo | Regla de cálculo |
|---|---|
| Fin | Inicio + Duración |
| Clave de identidad | Email del cliente en minúsculas, sin el sufijo `+alias` y sin puntos en la parte local. Igual para todos los dominios (DEC-02). Es dato personal |

**Relaciones:** pertenece a un Profesional y a un Servicio; tiene muchos Eventos de turno; puede
referenciar a un Turno original y ser referenciado por un sucesor.

**Baja:** nunca se elimina. Cumplido el **plazo de retención de datos del cliente**, se anonimizan
sus datos personales: se reemplazan por «Anonimizado» (RET-03).

### Evento de turno
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Turno | referencia a Turno | sí | — | no |
| Tipo | enum | sí | creación / cambio de estado / reprogramación / notificación descartada | no |
| Estado anterior | enum | solo si Tipo es "cambio de estado" | valores de Estado del Turno | no |
| Estado nuevo | enum | solo si Tipo es "cambio de estado" | valores de Estado del Turno | no |
| Detalle | texto | no | motivo, turno sucesor o notificación descartada | sí |
| Autor | texto | sí | usuario del administrador, "cliente" o "sistema" | no |
| Canal | enum | sí | público / panel / sistema | no |
| Fecha y hora | fecha y hora | sí | — | no |

**Relaciones:** pertenece a un Turno.

**Baja:** nunca se elimina ni se modifica (AGE-07), salvo la anonimización del Detalle (RET-04).

## Estados

### Turno

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| RESERVADO | inicial | El turno está tomado y todavía no se resolvió |
| ATENDIDO | terminal | El cliente fue atendido |
| AUSENTE | terminal | El cliente no se presentó |
| CANCELADO | terminal | El turno se dio de baja, por cualquier vía |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | RESERVADO | RES-12, REP-02 |
| RESERVADO | ATENDIDO | AGE-03 |
| RESERVADO | AUSENTE | AGE-04 (manual), AUS-01 (automático) |
| RESERVADO | CANCELADO | AGE-05, CAN-01, CAT-02, CAT-05, REP-02 |

## Invariantes

| ID | Regla | Entidades | Aplicada en |
|---|---|---|---|
| INV-01 | Dos turnos no cancelados del mismo profesional nunca se superponen en el tiempo | Turno | RES-02, RES-06, RES-E1, REP-03 |
| INV-02 | Un cliente nunca tiene más turnos en RESERVADO que el **tope de turnos activos por cliente** | Turno | RES-03, RES-09, REP-04 |
| INV-03 | Un profesional o un servicio inactivo no tiene turnos futuros en RESERVADO | Profesional, Servicio, Turno | CAT-02, CAT-05, CAT-E4 |
| INV-04 | Un turno cancelado por una reprogramación tiene exactamente un turno sucesor | Turno | REP-02 |
| INV-05 | Un evento de turno nunca se modifica ni se borra, salvo la anonimización | Evento de turno | AGE-07, RET-04 |
| INV-06 | Un token de cancelación solo es válido mientras su turno está en RESERVADO y no fue usado | Turno | CAN-02, REP-07 |
