---
created: 2026-10-11
last_updated: 2026-10-11
status: closed
base_documents: docs/definicion-producto.md
---

# Análisis funcional — Turnero

## Resumen

**Turnero** — Sistema de gestión y reserva de turnos. Un administrador mantiene el catálogo
(profesionales, servicios, disponibilidad, bloqueos) y opera la agenda desde un panel; los clientes
reservan un turno desde una cara pública, sin registrarse.

## Actores

| ID | Actor | Acceso | Recuperación de acceso |
|---|---|---|---|
| U-01 | Administrador | Usuario y contraseña | Sin recuperación por email; la repone infraestructura con el procedimiento del runbook de despliegue |
| U-02 | Cliente | Anónimo; cancela con un link con token | No aplica |
| U-03 | Sistema | — | — |

## Superficies

| Superficie | Plataforma | Actores | Viewports |
|---|---|---|---|
| Panel de administración | web | U-01 | desktop (principal), mobile |
| Reserva pública | web | U-02 | mobile (principal), desktop |

## Funcionalidades

| Bloque | Prefijo | Superficie(s) |
|---|---|---|
| Acceso | ACC | Panel de administración |
| Catálogo | CAT | Panel de administración |
| Agenda | AGE | Panel de administración |
| Historial del turno | HIS | Panel de administración |
| Reserva | RES | Reserva pública, Panel de administración (turno manual) |
| Reprogramación | REP | Panel de administración |
| Cancelación por el cliente | CAN | Reserva pública (link) |
| Recordatorio | REC | — (proceso del sistema) |
| Ausente automático | AUS | — (proceso del sistema) |
| Retención y anonimización | RET | — (proceso del sistema) |
| Notificaciones | NOT | — (transversal) |

### ACC — Acceso
**Superficie(s):** Panel de administración

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| ACC-01 | Ingresar al panel con usuario y contraseña | U-01 |
| ACC-02 | No hay recuperación de contraseña por email. La reposición de credenciales la hace infraestructura, con el procedimiento documentado en el runbook de despliegue | — |
| ACC-03 | Las cuentas de administrador las crea y las elimina infraestructura, con el procedimiento documentado en el runbook de despliegue. El panel no tiene alta ni baja de administradores. Al eliminar una cuenta, el historial conserva su nombre de usuario como autor de sus eventos | — |
| ACC-04 | El panel no permite cambiar la contraseña: solo infraestructura cambia credenciales (ACC-02) | — |
| ACC-05 | La sesión vence tras la **inactividad máxima de sesión** | — |
| ACC-06 | Cerrar la sesión desde el panel; la sesión queda invalidada | U-01 |
| ACC-07 | Una misma cuenta puede tener varias sesiones abiertas a la vez, una por dispositivo, independientes entre sí | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| ACC-E1 | Usuario o contraseña incorrectos | El ingreso se rechaza con un mensaje que no indica cuál de los dos es incorrecto |
| ACC-E2 | Se alcanzan los **intentos fallidos antes del bloqueo de ingreso**, seguidos, sobre un mismo usuario | El ingreso de ese usuario se bloquea durante la **duración del bloqueo de ingreso**, aun con la contraseña correcta. Un ingreso exitoso reinicia el conteo |
| ACC-E3 | La sesión venció por inactividad y el administrador intenta una acción | La acción no se ejecuta; vuelve al ingreso y pierde lo no guardado |

### CAT — Catálogo
**Superficie(s):** Panel de administración

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| CAT-01 | Alta y edición de profesionales, con nombre. El nombre es único entre profesionales, sin distinguir mayúsculas | U-01 |
| CAT-02 | Desactivar un profesional. No existe la eliminación de profesionales | U-01 |
| CAT-03 | Al desactivar un profesional, sus turnos en RESERVADO cuyo inicio es posterior al momento de la desactivación se cancelan automáticamente, con motivo completado por el sistema, y se envía NOT-04 a cada cliente. Los turnos ya iniciados siguen su curso | Sistema |
| CAT-04 | Antes de desactivar un profesional o un servicio, el panel muestra cuántos turnos se cancelarán y pide confirmación | U-01 |
| CAT-05 | Alta y edición de servicios, con nombre, duración y precio opcional en pesos argentinos (mayor o igual a 0). El nombre es único entre servicios, sin distinguir mayúsculas | U-01 |
| CAT-06 | La duración de un servicio es un múltiplo de la **granularidad de la grilla**, desde ese mismo valor hasta la **duración máxima de servicio** inclusive | — |
| CAT-07 | El precio de un servicio es de uso interno: no se muestra en la Reserva pública | — |
| CAT-08 | Desactivar un servicio. Sus turnos en RESERVADO cuyo inicio es posterior al momento de la desactivación se cancelan con el mismo procedimiento de CAT-03 | U-01 |
| CAT-09 | Reactivar un profesional o un servicio desactivado. Vuelve a ofrecerse con su disponibilidad y sus asignaciones; los turnos cancelados en cascada siguen cancelados | U-01 |
| CAT-10 | Asignar servicios a profesionales y quitar asignaciones: define qué profesional puede prestar qué servicio (muchos a muchos) | U-01 |
| CAT-11 | Quitar una asignación no afecta los turnos ya reservados de ese profesional para ese servicio: solo deja de ofrecerse hacia adelante | — |
| CAT-12 | Un servicio sin ningún profesional activo asignado no se ofrece en la Reserva pública | — |
| CAT-13 | Cargar la disponibilidad semanal de cada profesional, en franjas horarias por día de la semana. Puede haber varias franjas por día, sin superponerse entre sí | U-01 |
| CAT-14 | El inicio y el fin de cada franja de disponibilidad y de cada bloqueo caen en la grilla de **granularidad de la grilla** | — |
| CAT-15 | Registrar bloqueos con motivo, rango continuo de fecha y hora de inicio a fecha y hora de fin (puede abarcar varios días) y alcance: un profesional o todos | U-01 |
| CAT-16 | Eliminar un bloqueo que todavía no terminó. Un bloqueo no se edita: para cambiarlo se elimina y se registra otro. Al eliminarlo, sus turnos dejan de destacarse salvo que caigan en otro bloqueo o fuera de la disponibilidad | U-01 |
| CAT-17 | Un bloqueo no cancela turnos: los turnos que caen dentro quedan destacados en la agenda (AGE-01) | — |
| CAT-18 | Cambiar la disponibilidad semanal o la duración de un servicio no altera los turnos ya reservados. Los turnos que quedan fuera de la disponibilidad nueva se destacan en la agenda (AGE-01) | — |
| CAT-19 | Ver el listado de profesionales y el de servicios, con activos e inactivos y su estado visible. Reactivar no pide confirmación ni notifica | U-01 |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| CAT-E1 | Nombre de profesional o de servicio repetido | Se rechaza indicando que el nombre ya existe |
| CAT-E2 | Duración fuera de rango o que no es múltiplo de la **granularidad de la grilla** | Se rechaza indicando los valores admitidos |
| CAT-E3 | Franja que se superpone con otra del mismo profesional y día, o con inicio o fin fuera de la grilla, o con fin no posterior al inicio | Se rechaza indicando el motivo |
| CAT-E4 | Bloqueo con fin no posterior al momento de registrarlo, con fin no posterior al inicio, o con extremos fuera de la grilla | Se rechaza indicando el motivo |
| CAT-E5 | Se intenta eliminar un bloqueo que ya terminó | Se rechaza: un bloqueo terminado queda como registro |
| CAT-E6 | Un cliente confirma una reserva sobre un profesional o servicio mientras el administrador lo desactiva | Prevalece lo que llega primero: si la reserva se confirmó antes, se cancela en la cascada con NOT-04; si llega después, se rechaza y el cliente vuelve a elegir horario (RES-E1) |

**Ejemplos**
- CAT-03: se desactiva a Ana a las 10:20. Su turno de 10:00 (en RESERVADO) sigue su curso; el de 11:00 se cancela y su cliente recibe NOT-04.
- CAT-16: un bloqueo del lunes 9:00 al miércoles 18:00 se puede eliminar el martes; el jueves ya no.

### AGE — Agenda
**Superficie(s):** Panel de administración

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| AGE-01 | Ver la agenda de un día, con todos los profesionales a la vez en una columna por profesional (los activos y cualquier inactivo con turnos ese día) y los turnos de cada uno en orden cronológico, con su estado visible. Se destacan los turnos en RESERVADO que caen dentro de un bloqueo (CAT-17) o fuera de la disponibilidad semanal del profesional (CAT-18) | U-01 |
| AGE-02 | La agenda muestra por defecto el día actual y se puede navegar a cualquier día, pasado o futuro | U-01 |
| AGE-03 | Buscar turnos, pasados y futuros, por email, nombre o teléfono del cliente, sin distinguir mayúsculas y con coincidencia parcial. Cada resultado muestra fecha y hora, profesional, servicio y estado, del más reciente al más antiguo. Los turnos anonimizados no aparecen | U-01 |
| AGE-04 | La agenda se actualiza sola, sin recarga manual: las reservas, cancelaciones y cambios de estado hechos por otra vía aparecen sin intervención del administrador, dentro del target de NFR-04 | Sistema |
| AGE-05 | Marcar como ATENDIDO un turno en RESERVADO, desde su hora de inicio | U-01 |
| AGE-06 | Marcar como AUSENTE un turno en RESERVADO, desde su hora de inicio, sin esperar la **ventana de ausente automático** | U-01 |
| AGE-07 | Cancelar un turno en RESERVADO, aunque su hora de inicio ya haya pasado, indicando un motivo obligatorio, de texto libre de hasta 500 caracteres. Envía NOT-02 | U-01 |
| AGE-08 | ATENDIDO, AUSENTE y CANCELADO son estados terminales: no se revierten | — |
| AGE-09 | Los datos del cliente de un turno no se editan | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| AGE-E1 | El administrador actúa sobre un turno que cambió de estado por otra vía entre que lo vio y que actuó (el cliente lo canceló, el sistema lo marcó ausente, otra sesión del panel) | Prevalece el primer cambio. La acción se rechaza con un aviso que indica el estado actual del turno, y la agenda se actualiza |
| AGE-E2 | Se intenta marcar ATENDIDO o AUSENTE un turno cuya hora de inicio no llegó | Se rechaza indicando que todavía no empezó |
| AGE-E3 | Se cancela sin motivo | Se rechaza indicando que el motivo es obligatorio |
| AGE-E4 | Se corta la conexión que actualiza la agenda | La agenda muestra un aviso de que no está actualizada y reintenta conectarse sola. Al reconectar se recarga con el estado actual y quita el aviso |

### HIS — Historial del turno
**Superficie(s):** Panel de administración

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| HIS-01 | Consultar el historial completo de un turno, desde la agenda o desde la búsqueda: cada evento con autor, fecha y hora, y canal de origen (público, panel o sistema), del más antiguo al más reciente | U-01 |
| HIS-02 | Se registra un evento por: la creación del turno; cada cambio de estado, con el motivo si es una cancelación; el encadenamiento de una reprogramación, en el original y en el nuevo (REP-05); la anonimización de sus datos (RET-05); y cada email no entregado (NOT-E2, NOT-E3) | Sistema |
| HIS-03 | El autor de un evento es el usuario administrador que actuó (canal panel), "Cliente" (canal público) o "Sistema" (canal sistema) | — |
| HIS-04 | Los eventos del historial son inmutables: no se editan ni se borran. La única excepción es la anonimización de los datos personales que contengan (RET-04) | — |

### RES — Reserva
**Superficie(s):** Reserva pública, Panel de administración (turno manual)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| RES-01 | Reservar un turno sin registrarse, eligiendo servicio, profesional habilitado o "cualquiera", día y horario, con nombre, teléfono y email | U-02 |
| RES-02 | Cargar un turno manual para un cliente que se comunicó por teléfono, eligiendo servicio, profesional habilitado o "cualquiera", día y horario, con nombre, teléfono y email obligatorios | U-01 |
| RES-03 | Las reglas de este bloque aplican igual en los dos canales. No hay excepción administrativa | — |
| RES-04 | Solo se ofrecen servicios activos con al menos un profesional activo asignado, y para cada servicio, sus profesionales activos asignados | — |
| RES-05 | Los horarios de inicio se ofrecen en una grilla fija de **granularidad de la grilla** | — |
| RES-06 | Un horario se ofrece si la franja completa que ocuparía el servicio cae dentro de la disponibilidad semanal del profesional, no pisa un bloqueo vigente y no pisa otro turno que no esté en CANCELADO | — |
| RES-07 | **Anticipación mínima de reserva**: un horario se puede reservar hasta su hora exacta de inicio; pasada esa hora, deja de ofrecerse | — |
| RES-08 | Solo se ofrecen horarios de hoy y de los días calendario siguientes dentro del **horizonte de reserva**, contado a partir de mañana | — |
| RES-09 | Un cliente no puede superar el **tope de turnos activos por cliente**, contado por clave de identidad. Un turno en RESERVADO cuenta aunque su hora ya haya pasado, hasta que se cierre por cualquier vía. Se valida al confirmar | — |
| RES-10 | La clave de identidad del cliente es su email normalizado: en minúsculas, sin el sufijo +alias de la parte local y sin los puntos de la parte local. La regla es igual para todos los dominios | — |
| RES-11 | Los emails se envían a la dirección tal como la escribió el cliente, no a la clave de identidad | — |
| RES-12 | Antes de pedir los datos, la Reserva pública indica que cada persona puede tener un solo turno activo a la vez | — |
| RES-13 | Con "cualquiera", se ofrece la unión de los horarios libres de todos los profesionales activos habilitados para el servicio | — |
| RES-14 | Al confirmar con "cualquiera", se asigna el profesional con menos turnos ese día (cuentan RESERVADO, ATENDIDO y AUSENTE; no CANCELADO); ante empate, uno al azar | Sistema |
| RES-15 | Si el profesional que correspondía quedó ocupado entre la vista y la confirmación, se asigna otro que siga libre en ese horario, con la misma regla de RES-14 | Sistema |
| RES-16 | El turno toma la duración que tiene el servicio al momento de reservar | Sistema |
| RES-17 | Al confirmar se genera un token de cancelación único por turno, largo y aleatorio (su uso, en CAN) | Sistema |
| RES-18 | Al confirmar se envía NOT-01, también en el turno manual. Indica siempre el profesional asignado | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| RES-E1 | Dos reservas concurrentes sobre el mismo horario y profesional | Prospera una. La otra recibe un aviso claro y vuelve a la selección de horario, con la grilla actualizada y los datos cargados conservados |
| RES-E2 | Con "cualquiera", todos los profesionales habilitados se ocuparon entre la vista y la confirmación | La reserva falla como en RES-E1 |
| RES-E3 | El cliente ya alcanzó el **tope de turnos activos por cliente** | La reserva se rechaza indicando que ya tiene un turno activo y que puede cancelarlo desde el link de su email. No muestra la fecha ni el profesional de ese turno |
| RES-E4 | Al confirmar, el horario elegido ya empezó | La reserva se rechaza con un aviso y vuelve a la selección de horario como en RES-E1 |
| RES-E5 | Nombre, teléfono o email faltantes o con formato inválido (nombre de 2 a 100 caracteres; teléfono de 8 a 15 dígitos, que acepta +, espacios y guiones; email con formato válido) | La reserva se rechaza indicando el campo inválido |

**Ejemplos**
- RES-06: servicio de 45 minutos, profesional disponible de 9:00 a 12:00, con un turno de 10:00 a 10:30. Se ofrecen 9:00 y 9:15; 9:30 no (terminaría 10:15); de 10:30 a 11:15 sí; 11:30 no.
- RES-08: hoy es 1/3 → se ofrecen horarios desde ahora hasta el 31/3 inclusive.
- RES-10: `Juan.Perez+turnos@Gmail.com` y `juanperez@gmail.com` tienen la misma clave de identidad, `juanperez@gmail.com`.
- RES-14: Ana tiene 3 turnos ese día y Luis 2 → Luis. Los dos con 2 → uno al azar.

### REP — Reprogramación
**Superficie(s):** Panel de administración

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| REP-01 | Reprogramar un turno en RESERVADO a otro día y horario, con el mismo profesional y el mismo servicio, aunque su hora de inicio ya haya pasado | U-01 |
| REP-02 | Reprogramar ejecuta, en una sola operación atómica: (1) la cancelación del turno original, con el motivo "Reprogramado" completado por el sistema, y (2) la creación de un turno nuevo en el horario destino, en RESERVADO, con los mismos datos del cliente y encadenado al original | Sistema |
| REP-03 | El horario destino se valida igual que una reserva cualquiera (RES-06, RES-07, RES-08); el horario del turno original cuenta como libre | — |
| REP-04 | Al ser atómica, la operación no dispara el **tope de turnos activos por cliente** en el paso intermedio | — |
| REP-05 | El original queda en CANCELADO como cualquier cancelación. El historial de los dos turnos registra el encadenamiento y que la cancelación se originó en una reprogramación | — |
| REP-06 | Solo se envía NOT-05. No se envía la notificación de cancelación del original | Sistema |
| REP-07 | El token de cancelación del original queda invalidado. El turno nuevo tiene su propio token, incluido en NOT-05 | Sistema |
| REP-08 | El turno nuevo toma la duración vigente del servicio (RES-16) y recibe NOT-06 para su fecha nueva, como cualquier turno (REC-01) | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| REP-E1 | El horario destino no está disponible, ya empezó o se ocupó entre la vista y la confirmación | No se ejecuta nada: el turno original queda intacto. Se avisa y se vuelve a la selección de horario con la grilla actualizada |
| REP-E2 | El turno original cambió de estado entre la vista y la confirmación | Como AGE-E1: no se ejecuta nada |

**Ejemplos**
- REP-03: turno de 10:00 a 10:45; reprogramarlo a 10:15 es válido si de 10:45 a 11:00 está libre, porque su propio horario cuenta como libre.

### CAN — Cancelación por el cliente
**Superficie(s):** Reserva pública (link)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| CAN-01 | Cancelar el turno desde el link de NOT-01, NOT-05 o NOT-06, sin autenticarse, hasta la hora de inicio del turno | U-02 |
| CAN-02 | Abrir un link válido no cancela: muestra fecha, hora, servicio y profesional del turno y pide confirmar la cancelación | U-02 |
| CAN-03 | El motivo lo completa el sistema: "Cancelado por el cliente". El cliente no escribe motivo | Sistema |
| CAN-04 | El token se invalida al usarse o cuando el turno pasa a un estado terminal | — |
| CAN-05 | Al cancelar se envía NOT-03 | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| CAN-E1 | El turno ya empezó, al abrir el link o al confirmar | No se cancela. Se informa que ya no se puede cancelar online |
| CAN-E2 | El token ya se usó, no existe, o el turno ya está en un estado terminal (incluido el original de una reprogramación), al abrir el link o al confirmar | No se cancela. Se informa que el link ya no es válido |
| CAN-E3 | El cliente confirma justo cuando el administrador o el sistema cambian el estado del turno | Prevalece el primer cambio; si no fue la cancelación del cliente, aplica CAN-E2 |

En CAN-E1 y CAN-E2 no se muestra ningún dato del turno.

### REC — Recordatorio
**Superficie(s):** — (proceso del sistema)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| REC-01 | Se envía NOT-06 una sola vez por turno en RESERVADO, cuando falta la **antelación del recordatorio** para su inicio | Sistema |
| REC-02 | Si al reservarse el turno falta menos de la **antelación del recordatorio** para su inicio, no se envía | — |
| REC-03 | Al momento de enviar se verifica que el turno siga en RESERVADO; si no, no se envía | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| REC-E1 | El sistema estuvo caído cuando tocaba enviar el recordatorio | Se envía apenas vuelve, si el turno sigue en RESERVADO y todavía no empezó; si ya empezó, no se envía |
| REC-E2 | El turno se cancela o se reprograma mientras se envía el recordatorio | Aplica REC-03: prevalece lo que ocurre primero; si la cancelación llegó antes, no se envía |

**Ejemplos**
- REC-02: turno del martes 10:00 reservado el lunes 9:00 → recibe NOT-06 el lunes 10:00. Reservado el lunes 11:00 → no recibe recordatorio.

### AUS — Ausente automático
**Superficie(s):** — (proceso del sistema)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| AUS-01 | Un turno en RESERVADO pasa a AUSENTE cuando transcurre la **ventana de ausente automático** desde su hora de inicio sin novedad del administrador | Sistema |
| AUS-02 | El cambio queda en el historial con autor y canal "sistema" | Sistema |
| AUS-03 | El AUSENTE automático es definitivo: no se revierte | — |
| AUS-04 | Al cerrarse el turno, el cliente deja de contar para el **tope de turnos activos por cliente** | — |
| AUS-05 | Aplica también a los turnos destacados por un bloqueo o por quedar fuera de la disponibilidad (AGE-01): si el administrador no decidió antes, pasan a AUSENTE | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| AUS-E1 | El sistema estuvo caído cuando vencía la ventana de uno o más turnos | Se marcan AUSENTE apenas vuelve. El evento registra la hora real en que se marcó |
| AUS-E2 | El administrador marca ATENDIDO o cancela en el mismo instante en que el sistema marca AUSENTE | Prevalece el primer cambio que se registra; el otro se rechaza (AGE-E1). Si prevaleció el sistema, el AUSENTE es definitivo |

**Ejemplos**
- AUS-01: turno de 10:00 sin novedad → a las 10:30 pasa a AUSENTE. Si el administrador lo marcó ATENDIDO a las 10:25, no cambia.

### RET — Retención y anonimización
**Superficie(s):** — (proceso del sistema)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| RET-01 | Los datos personales del cliente (nombre, teléfono y email) se conservan durante el **plazo de retención de datos del cliente**, contado desde la fecha y hora de inicio de su turno más reciente, en cualquier estado | — |
| RET-02 | El plazo se computa por clave de identidad: un turno nuevo lo reinicia sobre todos los turnos anteriores del mismo cliente | — |
| RET-03 | Cumplido el plazo, se anonimizan los datos personales de todos los turnos de ese cliente: el nombre, el teléfono y el email se reemplazan por el texto "Anonimizado", y la clave de identidad se elimina. El turno y su historial se conservan: fecha, profesional, servicio, estados, motivos, autores y canales | Sistema |
| RET-04 | La anonimización alcanza a los datos personales que hayan quedado dentro de los eventos del historial | Sistema |
| RET-05 | La anonimización registra un evento "datos anonimizados" en el historial de cada turno, con autor y canal sistema | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| RET-E1 | El proceso no corrió cuando vencía el plazo (sistema caído) | En la siguiente ejecución anonimiza todo lo vencido |
| RET-E2 | El mismo cliente confirma una reserva mientras se anonimizan sus datos | Prevalece lo que ocurre primero: si la reserva se confirmó antes, el plazo se reinició y ese cliente no se anonimiza; si la anonimización terminó antes, el turno nuevo conserva sus datos y empieza un plazo nuevo |

**Ejemplos**
- RET-01: último turno del cliente el 10/3/2026 (aunque haya sido cancelado) → sus datos se anonimizan a partir del 10/3/2027. Si reserva otro para el 5/2/2027, el plazo pasa a correr desde el 5/2/2027 para todos sus turnos.

### NOT — Notificaciones
**Superficie(s):** — (transversal)

**Requisitos**
| ID | Evento | Canal | Destinatario | Contenido |
|---|---|---|---|---|
| NOT-01 | Confirmación de reserva o de turno manual (RES-18) | email | Cliente | Fecha, hora, servicio, profesional asignado y link de cancelación |
| NOT-02 | Cancelación por el administrador (AGE-07) | email | Cliente | Aviso de baja del turno, con su fecha, hora, servicio y profesional. Sin el motivo |
| NOT-03 | Cancelación por el cliente vía link (CAN-05) | email | Cliente | Confirmación de la cancelación, con fecha, hora, servicio y profesional |
| NOT-04 | Cancelación en cascada por desactivación (CAT-03, CAT-08) | email | Cliente | Aviso de baja del turno, con su fecha, hora, servicio y profesional. Sin el motivo |
| NOT-05 | Reprogramación (REP-06) | email | Cliente | Nuevo día y horario, servicio y profesional, con el link de cancelación nuevo |
| NOT-06 | Recordatorio (REC-01) | email | Cliente | Fecha, hora, servicio y profesional del turno, y su link de cancelación |

**No se notifica:**
- Al administrador, por ningún evento: se entera por la agenda (AGE-04)
- La cancelación del turno original en una reprogramación (REP-06)
- El paso a ATENDIDO o a AUSENTE (manual o automático)
- La anonimización (RET-03)
- La reactivación de un profesional o un servicio (CAT-09)

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| NOT-E1 | Falla transitoria al enviar un email | Se reintenta hasta los **reintentos de envío de email**. La operación que lo disparó queda hecha igual: un email que no sale no deja el turno en un estado inconsistente |
| NOT-E2 | Se agotan los reintentos | El email se descarta y queda un evento "email no entregado" en el historial del turno, indicando cuál |
| NOT-E3 | El servidor de email rechaza el envío de forma definitiva | No se reintenta; queda un evento "email no entregado" en el historial del turno, indicando cuál |
| NOT-E4 | El email rebota después de que el servidor lo aceptó | No se detecta |

## Fuera de alcance

- Múltiples consultorios o sedes
- Pagos y señas
- Turnos recurrentes
- Lista de espera
- Cuentas de cliente con historial propio
- Recordatorios por SMS o WhatsApp
- App móvil nativa
- Acceso y roles para profesionales
- Idiomas además del español
- Pantalla de configuración de parámetros
- Notificaciones al administrador
- Recuperación de contraseña
- Estadísticas e indicadores (cancelaciones, ausentismo)

## Parámetros

| Parámetro | Valor | ¿Editable por un usuario? |
|---|---|---|
| Anticipación mínima de reserva | Ninguna: hasta la hora exacta de inicio | no |
| Horizonte de reserva | 30 días | no |
| Tope de turnos activos por cliente | 1 | no |
| Granularidad de la grilla | 15 minutos | no |
| Duración máxima de servicio | 4 horas | no |
| Ventana de ausente automático | 30 minutos | no |
| Antelación del recordatorio | 24 horas | no |
| Plazo de retención de datos del cliente | 12 meses | no |
| Inactividad máxima de sesión | 8 horas | no |
| Intentos fallidos antes del bloqueo de ingreso | 5 intentos | no |
| Duración del bloqueo de ingreso | 15 minutos | no |
| Reintentos de envío de email | 5 reintentos | no |

## Integraciones externas

No hay integraciones externas.

## Requisitos no funcionales

| ID | Categoría | Requisito | Target |
|---|---|---|---|
| NFR-01 | Volumen | Turnos reservados por mes | Cientos |
| NFR-02 | Volumen | Profesionales en el catálogo | Decenas como máximo |
| NFR-03 | Volumen | Clientes reservando a la vez en el pico | Decenas |
| NFR-04 | Tiempos | Aparición en la agenda de un cambio hecho por otra vía | Menos de 5 segundos |
| NFR-05 | Tiempos | Reserva completa desde la Reserva pública | Menos de 1 minuto, desde el teléfono |
| NFR-06 | Disponibilidad | Reserva pública, Panel de administración y procesos del sistema | 24/7. Se toleran cortes de mantenimiento de hasta 15 minutos entre las 2:00 y las 6:00 |
| NFR-07 | Privacidad y cumplimiento | Datos personales guardados | Nombre, teléfono y email del cliente |
| NFR-08 | Privacidad y cumplimiento | Regulación aplicable | Ley 25.326 de Protección de Datos Personales (Argentina) |
| NFR-09 | Accesibilidad | Reserva pública | WCAG 2.2 nivel AA |
| NFR-10 | Accesibilidad | Panel de administración | No aplica |
| NFR-11 | Idioma, zona horaria y formatos | Idioma | Español únicamente |
| NFR-12 | Idioma, zona horaria y formatos | Zona horaria | Una sola: America/Argentina/Buenos_Aires, también para los procesos del sistema |
| NFR-13 | Idioma, zona horaria y formatos | Formatos | Fecha dd/mm/aaaa, hora en 24 horas (14:30); moneda en pesos con signo $ y punto como separador de miles |
| NFR-14 | Compatibilidad | Navegadores | Las dos últimas versiones de Chrome, Safari, Firefox y Edge, en escritorio y móvil |

## Decisiones tomadas

| ID | Tema | Decisión | Descartado | Afecta |
|---|---|---|---|---|
| DEC-01 | Bloqueo vs. desactivación | Un bloqueo no cancela turnos (se destacan); desactivar un profesional o un servicio cancela en cascada | Tratar los dos casos igual | CAT-03, CAT-08, CAT-17 |
| DEC-02 | Normalización del email | Se quitan los puntos de la parte local en todos los dominios | Quitar los puntos solo en dominios que siguen la convención de Gmail | RES-10 |
| DEC-03 | Tope de turnos activos | Mismas reglas en los dos canales | Excepción administrativa en el panel | RES-03, RES-09 |
| DEC-04 | Reprogramación | Cancelación del original más creación de un turno nuevo encadenado; cuenta como cancelación | Reprogramar como transición de estado del mismo turno | REP-02, REP-05 |
| DEC-05 | Ausente automático | Definitivo, sin reversión | Permitir revertirlo | AUS-03 |
| DEC-06 | Reparto de "cualquiera" | Se mide la carga por cantidad de turnos del día | Medirla por minutos de trabajo | RES-14 |
| DEC-07 | Acceso del administrador | Sin recuperación de contraseña | Recuperación por email | U-01, ACC-02 |
| DEC-08 | Parámetros | Viven en la configuración de despliegue; cambiarlos requiere un deploy | Pantalla de ajustes | Parámetros |
| DEC-09 | Alcance de la cascada | Se cancelan solo los turnos cuyo inicio es posterior a la desactivación | Cancelar todo turno en RESERVADO, aunque ya haya empezado | CAT-03, CAT-08 |
| DEC-10 | Quitar una asignación | Los turnos ya reservados se mantienen | Cancelarlos en cascada | CAT-11 |
| DEC-11 | Cambios a un bloqueo | Solo se elimina (si no terminó); no se edita | Permitir editarlo | CAT-16 |
| DEC-12 | Datos del cliente de un turno | No se editan | Editar nombre y teléfono, o los tres datos | AGE-09 |
| DEC-13 | Confirmación del turno manual | Envía NOT-01 igual que la reserva pública | No enviar confirmación | RES-18 |
| DEC-14 | Alcance de la reprogramación | Solo cambia día y horario | Cambiar también el profesional o el servicio | REP-01 |
| DEC-15 | Procesos tras una caída | El recordatorio se envía tarde si el turno no empezó; el ausente se marca al volver | Omitir el recordatorio; dejar el ausente al administrador | REC-E1, AUS-E1 |
| DEC-16 | Cuentas de administrador | Las crea, repone y elimina infraestructura | Alta de administradores desde el panel | ACC-03 |
