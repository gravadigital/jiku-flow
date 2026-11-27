---
created: 2026-11-07
last_updated: 2026-11-07
status: closed
functional_analysis: _jflow/discovery/functional-analysis.md
---

# Análisis de dominio — Turnos móvil

## Glosario
| Término | Definición |
|---|---|
| Turno próximo | Turno en estado RESERVADO cuyo inicio todavía no llegó. Es lo que cuenta para el **tope de turnos próximos por cliente** y lo que el cliente puede cancelar |
| Turno pasado | Turno no cancelado cuyo inicio ya llegó. Mientras sigue en RESERVADO se muestra como «pasado»; en ASISTIÓ o NO ASISTIÓ, con la marca de la dueña |
| Horario semanal | Conjunto de franjas de un peluquero, por día de la semana. Se repite igual todas las semanas: no hay excepciones por fecha |
| Peluquero ofrecible | Para un servicio: peluquero activo, que hace ese servicio y tiene al menos una franja (PEL-09) |
| Horario ofrecido | Inicio posible de un turno para un servicio y un peluquero, según RES-03 y RES-04 |
| «Cualquiera» | Opción de reserva sin peluquero elegido; el sistema asigna uno al confirmar (RES-05) |
| Turno destacado | Turno próximo que hoy no se podría reservar, por alguno de los motivos de PEL-10. No es un estado: se calcula |
| Peluquería | Quien cancela cuando cancela la dueña. Es el valor que ve el cliente en «cancelado por» |

## Entidades

### Cuenta
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Rol | enum | sí | CLIENTE / DUEÑA; default CLIENTE. Una cuenta creada por registro es siempre CLIENTE; DUEÑA solo la crea el equipo técnico (ACC-04). No cambia | no |
| Nombre | texto | sí | hasta 100 caracteres; editable solo por el cliente (ACC-11) | sí |
| Teléfono | teléfono | solo si CLIENTE | de 8 a 15 dígitos, con un `+` inicial opcional; editable (ACC-11) | sí |
| Email | email | sí | formato de email válido; único entre las cuentas sin distinguir mayúsculas (ACC-02); no se cambia (ACC-11) | sí |
| Contraseña | texto | sí | al menos 8 caracteres; se guarda de forma irreversible, nunca en claro | no |
| Intentos fallidos | número | sí | entero ≥ 0; default 0. Se reinicia según ACC-09 y ACC-10 | no |
| Bloqueada hasta | fecha y hora | no | se completa al llegar a los **intentos fallidos antes del bloqueo** (ACC-10) | no |

**Atributos derivados**
| Atributo | Regla de cálculo |
|---|---|
| Bloqueada | Bloqueada hasta tiene valor y es posterior al momento actual |

**Relaciones:** una Cuenta CLIENTE tiene muchos Turnos; toda Cuenta tiene muchas Sesiones y muchos Links de recuperación.

**Baja:** se elimina. Una cuenta CLIENTE la borra el propio cliente (ACC-12, ACC-13), junto con sus turnos, sesiones y links de recuperación. Una cuenta DUEÑA no se borra desde la app.

### Sesión
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Cuenta | referencia a Cuenta | sí | — | no |
| Último uso | fecha y hora | sí | se actualiza con cada uso (ACC-05) | no |

**Atributos derivados**
| Atributo | Regla de cálculo |
|---|---|
| Vencida | Pasó la **duración de sesión sin uso** desde el último uso |

**Relaciones:** pertenece a una Cuenta.

**Baja:** se elimina al cerrar sesión (ACC-06), al vencer (ACC-05), al elegir una contraseña nueva (ACC-09) y al borrar la cuenta (ACC-13).

### Link de recuperación
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Cuenta | referencia a Cuenta | sí | — | no |
| Vence | fecha y hora | sí | momento del pedido más la **vigencia del link de recuperación** | no |
| Estado | enum | sí | VIGENTE / USADO / REEMPLAZADO; default VIGENTE | no |

**Atributos derivados**
| Atributo | Regla de cálculo |
|---|---|
| Válido | Estado VIGENTE y Vence posterior al momento actual |

**Relaciones:** pertenece a una Cuenta.

**Baja:** se elimina al borrar la cuenta (ACC-13). Usado, reemplazado o vencido deja de ser válido (ACC-08).

### Servicio
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Nombre | texto | sí | hasta 60 caracteres; único sin distinguir mayúsculas, contando los desactivados (CAT-04) | no |
| Duración | duración | sí | múltiplo de la **granularidad de la grilla**, entre la **duración mínima de un servicio** y la **duración máxima de un servicio** (CAT-02) | no |
| Precio | dinero | sí | pesos enteros, mayor que cero (CAT-03) | no |
| Activo | booleano | sí | default: sí | no |

**Relaciones:** lo hacen muchos Peluqueros; tiene muchos Turnos.

**Baja:** se desactiva, nunca se elimina (CAT-07, CAT-09). Sus turnos próximos se mantienen y se destacan (PEL-10).

### Peluquero
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Nombre | texto | sí | hasta 60 caracteres; único sin distinguir mayúsculas, contando los desactivados (PEL-02) | no |
| Activo | booleano | sí | default: sí | no |

**Relaciones:** hace muchos Servicios, y cada Servicio lo hacen muchos Peluqueros, sin repetir el par; al crearse no hace ninguno (PEL-01, PEL-04). Tiene muchas Franjas (su horario semanal) y muchos Turnos.

**Baja:** se desactiva, nunca se elimina (PEL-08). Sus turnos próximos se mantienen y se destacan (PEL-10).

### Franja
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Peluquero | referencia a Peluquero | sí | — | no |
| Día de la semana | enum | sí | LUNES / MARTES / MIÉRCOLES / JUEVES / VIERNES / SÁBADO / DOMINGO; sin default | no |
| Hora de inicio | hora | sí | múltiplo de la **granularidad de la grilla** (PEL-06) | no |
| Hora de fin | hora | sí | múltiplo de la **granularidad de la grilla**, posterior a la hora de inicio, en el mismo día (PEL-06) | no |

**Relaciones:** pertenece a un Peluquero.

**Baja:** se elimina cuando la dueña la quita del horario semanal (PEL-05). Los turnos ya reservados no cambian (PEL-07).

### Turno
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Cliente | referencia a Cuenta | sí | cuenta con rol CLIENTE | no |
| Servicio | referencia a Servicio | sí | activo al momento de reservar | no |
| Peluquero | referencia a Peluquero | sí | ofrecible para el servicio al momento de reservar; con «cualquiera», el asignado por RES-05 | no |
| Inicio | fecha y hora | sí | alineado a la **granularidad de la grilla**; un horario ofrecido al momento de reservar (RES-03, RES-04) | no |
| Duración | duración | sí | se copia del servicio al reservar; no cambia si cambia el servicio (RES-08) | no |
| Precio | dinero | sí | se copia del servicio al reservar; no cambia si cambia el servicio (RES-08) | no |
| Estado | enum | sí | RESERVADO / ASISTIÓ / NO ASISTIÓ / CANCELADO; default RESERVADO | no |
| Cancelado por | enum | solo si CANCELADO | CLIENTE / PELUQUERÍA | no |
| Motivo de cancelación | texto | solo si cancelado por PELUQUERÍA | hasta 200 caracteres; opcional si cancelado por CLIENTE (CAN-01, CAN-03, CAN-04) | no |

**Atributos derivados**
| Atributo | Regla de cálculo |
|---|---|
| Fin | Inicio más Duración |
| Próximo | Estado RESERVADO e Inicio posterior al momento actual |
| Motivos de destacado | Solo para un turno próximo: todos los que apliquen de «peluquero desactivado», «el peluquero ya no hace el servicio», «servicio desactivado», «fuera del horario semanal» (el turno no cae entero dentro de una franja del peluquero). Vacío si ninguno aplica (PEL-10) |

**Relaciones:** pertenece a una Cuenta (el cliente), a un Servicio y a un Peluquero.

**Baja:** se elimina solo al borrar la cuenta del cliente (ACC-13). Si no, nunca: un turno cancelado queda en CANCELADO.

## Estados

### Turno

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| RESERVADO | inicial | El turno está tomado y la dueña todavía no marcó la asistencia. Antes del inicio es un turno próximo; después, un turno pasado sin marcar |
| ASISTIÓ | intermedio | La dueña marcó que el cliente se presentó |
| NO ASISTIÓ | intermedio | La dueña marcó que el cliente no se presentó |
| CANCELADO | terminal | El turno se dio de baja antes de su inicio, por el cliente o por la peluquería |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | RESERVADO | RES-01, RES-09 |
| RESERVADO | CANCELADO | CAN-01, CAN-03, ACC-13 |
| RESERVADO | ASISTIÓ | AGE-07 |
| RESERVADO | NO ASISTIÓ | AGE-07 |
| ASISTIÓ | NO ASISTIÓ | AGE-07 |
| NO ASISTIÓ | ASISTIÓ | AGE-07 |

### Link de recuperación

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| VIGENTE | inicial | Se envió y todavía no se usó ni se reemplazó. Puede haber vencido (ver Válido) |
| USADO | terminal | Se eligió una contraseña nueva con él |
| REEMPLAZADO | terminal | Se pidió otro link para la misma cuenta |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | VIGENTE | ACC-07 |
| VIGENTE | USADO | ACC-09 |
| VIGENTE | REEMPLAZADO | ACC-08 |

## Invariantes
| ID | Regla | Entidades | Aplicada en |
|---|---|---|---|
| INV-01 | Dos turnos no cancelados del mismo peluquero nunca se superponen en el tiempo | Turno | RES-03, RES-05, RES-E1 |
| INV-02 | Un cliente nunca tiene más turnos próximos que el **tope de turnos próximos por cliente** | Turno, Cuenta | RES-06, RES-E3, CAN-06 |
| INV-03 | Las franjas de un mismo peluquero y día de la semana nunca se superponen | Franja | PEL-05, PEL-06, PEL-E2 |
| INV-04 | No hay dos cuentas con el mismo email, ni dos servicios ni dos peluqueros con el mismo nombre, sin distinguir mayúsculas | Cuenta, Servicio, Peluquero | ACC-02, ACC-E2, CAT-04, PEL-02 |
| INV-05 | Una cuenta tiene a lo sumo un link de recuperación VIGENTE | Link de recuperación | ACC-07, ACC-08 |
| INV-06 | Al borrarse una cuenta no queda ningún turno, sesión ni link de recuperación suyo | Cuenta, Turno, Sesión, Link de recuperación | ACC-13 |
| INV-07 | Un turno solo pasa a ASISTIÓ o NO ASISTIÓ después de su inicio, y solo pasa a CANCELADO antes de su inicio | Turno | AGE-07, AGE-E1, CAN-01, CAN-03, CAN-E2 |
