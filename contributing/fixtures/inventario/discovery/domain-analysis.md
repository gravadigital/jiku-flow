---
created: 2026-11-07
last_updated: 2026-11-07
status: closed
functional_analysis: _jflow/discovery/functional-analysis.md
---

# Análisis de dominio — Inventario

## Glosario
| Término | Definición |
|---|---|
| Préstamo sin devolver | Préstamo en estado ACTIVO o VENCIDO. Es lo que cuenta para el **tope de préstamos por empleado** y lo que impide la baja o la reparación de un equipo |
| Vencimiento | Último día del préstamo. El préstamo vence al terminar ese día, en la zona horaria del producto (NFR-09); hasta entonces sigue ACTIVO |
| Día del vencimiento | El día calendario del vencimiento. Es el día en que sale el aviso «vence hoy» (VEN-02) |
| Bloqueo | Período, de la **duración del bloqueo**, en que una cuenta no puede ingresar por haber llegado a los **intentos fallidos antes del bloqueo**. No es un estado de la cuenta: la cuenta sigue ACTIVA |
| Administrador activo | Cuenta con rol ADMINISTRADOR en estado ACTIVA. Es quien recibe NOT-03 |
| Empleado eliminado | Lo que se muestra en lugar del nombre de una cuenta ANONIMIZADA, en los préstamos y en los historiales |

## Entidades

### Cuenta
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Nombre | texto | sí | se reemplaza por un valor anónimo al anonimizar (RET-01) | sí |
| Email | email | sí | único entre las cuentas no anonimizadas, sin distinguir mayúsculas; se reemplaza por un valor anónimo al anonimizar (RET-01, RET-03) | sí |
| Rol | enum | sí | EMPLEADO / ADMINISTRADOR; sin default (se elige al invitar); no cambia | no |
| Estado | enum | sí | INVITADA / ACTIVA / DESACTIVADA / ANONIMIZADA; default INVITADA | no |
| Contraseña | texto | solo si ya la definió (ACC-02) | al menos 8 caracteres | no |
| Token de invitación | texto | solo si INVITADA | único; uno vigente por cuenta: reenviar lo reemplaza (ACC-03) | no |
| Vencimiento de la invitación | fecha y hora | solo si INVITADA | el momento de la invitación más la **vigencia de la invitación** | no |
| Token de recuperación | texto | no | único; de un solo uso; uno vigente por cuenta | no |
| Vencimiento del token de recuperación | fecha y hora | solo si hay token de recuperación | el momento del pedido más la **vigencia del link de recuperación** | no |
| Intentos fallidos seguidos | número | sí | default 0; vuelve a 0 con un ingreso correcto, el fin del bloqueo o un restablecimiento (ACC-08, ACC-11) | no |
| Bloqueada hasta | fecha y hora | no | solo durante un bloqueo: el momento del último intento fallido más la **duración del bloqueo** | no |
| Fecha de desactivación | fecha y hora | solo si DESACTIVADA | la de la última desactivación (RET-05) | no |

**Relaciones:** una Cuenta con rol EMPLEADO tiene muchos Préstamos.

**Baja:** nunca se elimina. Se desactiva (ACC-13) y, al cumplirse el **plazo de retención de cuentas desactivadas**, se anonimiza (RET-01).

### Equipo
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Tipo | enum | sí | NOTEBOOK / MONITOR / TECLADO / MOUSE / CAMARA / OTRO; sin default | no |
| Marca | texto | sí | — | no |
| Modelo | texto | sí | — | no |
| Número de serie | texto | sí | único entre todos los equipos, incluidos los dados de baja (EQU-03) | no |
| Estado | enum | sí | DISPONIBLE / PRESTADO / EN_REPARACION / DADO_DE_BAJA; default DISPONIBLE | no |

**Relaciones:** tiene muchos Préstamos.

**Baja:** nunca se elimina. La baja es un estado definitivo (EQU-07).

### Préstamo
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Equipo | referencia a Equipo | sí | DISPONIBLE al momento del pedido (PRE-02) | no |
| Empleado | referencia a Cuenta | sí | cuenta con rol EMPLEADO, ACTIVA al momento del pedido (PRE-10) | no |
| Inicio | fecha y hora | sí | el momento del pedido | no |
| Vencimiento | fecha | sí | al crearse, según PRE-03; cambia solo con una extensión (PRE-09) | no |
| Vencimiento original | fecha | solo si se extendió | el vencimiento previo a la extensión; la extensión no supera el **plazo máximo de extensión** contado desde él | no |
| Devolución | fecha y hora | solo si DEVUELTO | el momento en que se registró la devolución | no |
| Estado | enum | sí | ACTIVO / VENCIDO / DEVUELTO; default ACTIVO | no |

**Atributos derivados**
| Atributo | Regla de cálculo |
|---|---|
| Extendido | Sí si tiene vencimiento original |

**Relaciones:** pertenece a un Equipo y a una Cuenta (el empleado); tiene muchos Avisos programados.

**Baja:** nunca se elimina. Si su empleado se anonimiza, se conserva y figura como «empleado eliminado» (RET-02).

### Aviso programado
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Préstamo | referencia a Préstamo | sí | — | no |
| Tipo | enum | sí | PREVIO / VENCE_HOY; sin default. PREVIO envía NOT-01; VENCE_HOY envía NOT-02 y NOT-03 | no |
| Vencimiento | fecha | sí | el vencimiento del préstamo cuando se programó | no |
| Programado para | fecha y hora | sí | PREVIO: la **hora de los avisos** del día que está la **anticipación del aviso de vencimiento** antes del vencimiento; VENCE_HOY: la **hora de los avisos** del día del vencimiento | no |
| Estado | enum | sí | PROGRAMADO / ENVIADO / CANCELADO / DESCARTADO; default PROGRAMADO | no |

**Relaciones:** pertenece a un Préstamo.

**Baja:** nunca se elimina; termina en ENVIADO, CANCELADO o DESCARTADO.

## Estados

### Cuenta

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| INVITADA | inicial | La cuenta existe pero la persona todavía no definió su contraseña; no puede ingresar |
| ACTIVA | intermedio | La persona puede ingresar (salvo durante un bloqueo) |
| DESACTIVADA | intermedio | Un administrador le quitó el acceso; no puede ingresar y puede reactivarse |
| ANONIMIZADA | terminal | Se cumplió el plazo de retención desactivada: sus datos personales se reemplazaron y la cuenta ya no se puede usar ni reactivar |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | INVITADA | ACC-01, ACC-18 |
| INVITADA | ACTIVA | ACC-02 |
| INVITADA | DESACTIVADA | ACC-13 |
| ACTIVA | DESACTIVADA | ACC-13 |
| DESACTIVADA | ACTIVA | ACC-16 (si ya había definido su contraseña) |
| DESACTIVADA | INVITADA | ACC-16 (si nunca definió su contraseña) |
| DESACTIVADA | ANONIMIZADA | RET-01 |

### Equipo

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| DISPONIBLE | inicial | El equipo está en la oficina y se puede pedir prestado |
| PRESTADO | intermedio | El equipo tiene un préstamo sin devolver |
| EN_REPARACION | intermedio | El equipo está fuera de servicio temporalmente; no se presta |
| DADO_DE_BAJA | terminal | El equipo salió del inventario de forma definitiva |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | DISPONIBLE | EQU-01 |
| DISPONIBLE | PRESTADO | PRE-02 |
| PRESTADO | DISPONIBLE | PRE-05, PRE-06 |
| DISPONIBLE | EN_REPARACION | EQU-05 |
| EN_REPARACION | DISPONIBLE | EQU-06 |
| DISPONIBLE | DADO_DE_BAJA | EQU-07 |
| EN_REPARACION | DADO_DE_BAJA | EQU-07 |

### Préstamo

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| ACTIVO | inicial | El empleado tiene el equipo y el vencimiento no pasó |
| VENCIDO | intermedio | Terminó el día del vencimiento y el equipo no se devolvió |
| DEVUELTO | terminal | Se registró la devolución del equipo |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | ACTIVO | PRE-02 |
| ACTIVO | VENCIDO | VEN-03, VEN-06 |
| VENCIDO | ACTIVO | PRE-09 |
| ACTIVO | DEVUELTO | PRE-05, PRE-06 |
| VENCIDO | DEVUELTO | PRE-05, PRE-06 |

### Aviso programado

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| PROGRAMADO | inicial | El aviso está esperando su hora |
| ENVIADO | terminal | El aviso se envió a sus destinatarios |
| CANCELADO | terminal | El préstamo se devolvió o se extendió antes de la hora del aviso |
| DESCARTADO | terminal | El aviso no se envió porque, al llegar su hora, no tenía destinatarios o ya no estaba vigente después de una caída |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | PROGRAMADO | PRE-02, VEN-04 |
| PROGRAMADO | ENVIADO | VEN-01, VEN-02 |
| PROGRAMADO | CANCELADO | PRE-05, PRE-06, VEN-04, VEN-05 |
| PROGRAMADO | DESCARTADO | VEN-05, VEN-06 |

## Invariantes
| ID | Regla | Entidades | Aplicada en |
|---|---|---|---|
| INV-01 | Un equipo tiene como máximo un préstamo sin devolver, y está PRESTADO si y solo si lo tiene. Un equipo DISPONIBLE, EN_REPARACION o DADO_DE_BAJA no tiene préstamos sin devolver | Equipo, Préstamo | PRE-02, PRE-05, PRE-06, PRE-E1, PRE-E2, EQU-05, EQU-07, EQU-E3, EQU-E4 |
| INV-02 | Un empleado nunca tiene más préstamos sin devolver que el **tope de préstamos por empleado** | Cuenta, Préstamo | PRE-02, PRE-04, PRE-E3, PRE-E4 |
| INV-03 | Todo préstamo pertenece a una cuenta con rol EMPLEADO | Cuenta, Préstamo | PRE-02, PRE-10 |
| INV-04 | Nunca se desactiva al último administrador activo: una vez que hay uno, siempre queda al menos uno | Cuenta | ACC-13, ACC-14, ACC-18, ACC-E8, ACC-E9, ACC-E10 |
| INV-05 | Para cada préstamo, vencimiento y tipo hay como máximo un aviso programado no cancelado: cada aviso (NOT-01, y NOT-02 con NOT-03) se envía como máximo una vez por préstamo y por vencimiento | Préstamo, Aviso programado | VEN-01, VEN-02, VEN-04, VEN-06 |
