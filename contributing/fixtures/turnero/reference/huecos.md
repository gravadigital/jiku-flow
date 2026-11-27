# Huecos del brief de Turnero

Todo lo que el discovery de referencia (`docs/discovery/`) define y `contributing/fixtures/turnero/brief.md`
no dice. Cada respuesta es una decisión del **cliente**: el usuario simulado del banco la da tal
cual cuando el skill pregunta, para que todas las variantes reciban las mismas respuestas.

**Estado: aprobado (2026-10-10).** Las respuestas las propuso el agente y las revisó el usuario.
Si una cambia, se actualiza también la referencia: si no, el banco mide contra un cliente distinto
del que contesta.

Lo que el brief sí define no está acá: el simulador lo responde leyendo el brief.

---

## Funcional

### Superficies

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-01 | ¿Desde qué dispositivo se usa el panel de administración? | Desktop principal; también mobile | Superficies |
| H-02 | ¿La reserva pública se soporta también en desktop? | Sí, mobile principal y desktop | Superficies |

### Acceso

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-03 | ¿Cuánto dura una sesión del administrador sin actividad? | 8 horas | ACC-03, Parámetros |
| H-04 | ¿Qué pasa tras varios intentos fallidos de inicio de sesión? | Tras 5 seguidos, la cuenta se bloquea 15 minutos | ACC-E2, Parámetros |
| H-05 | ¿Se puede cambiar la contraseña desde el panel? | No; la repone infraestructura | ACC-04, DEC-06, Fuera de alcance |
| H-06 | ¿Quién crea las cuentas de administrador? | Infraestructura; no hay alta desde el panel | ACC-05 |
| H-07 | ¿Qué ve el administrador si se equivoca de usuario o contraseña, o si le vence la sesión? | Mensaje genérico sin decir cuál falló; al vencer la sesión vuelve al login y pierde lo no guardado | ACC-E1, ACC-E3 |

### Catálogo

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-08 | La duración múltiplo de 15 minutos, ¿es el mismo valor que la grilla de horarios? ¿Hay una duración máxima? | Sí, el mismo parámetro. Máximo 4 horas | CAT-04, Parámetros |
| H-09 | ¿Un profesional puede tener varias franjas el mismo día (por ejemplo, mañana y tarde)? | Sí | CAT-07 |
| H-10 | ¿Se puede reactivar un profesional o un servicio desactivado? ¿Se restauran sus turnos? | Sí se reactiva; los turnos cancelados no se restauran | CAT-11 |
| H-11 | ¿Qué pasa si dos franjas del mismo día se superponen, o un bloqueo termina antes de empezar? | Se rechaza | CAT-E2, CAT-E3 |
| H-12 | ¿Qué pasa si se confirma una reserva mientras se desactiva el profesional? | Prospera la que llega primero; si la reserva llega primero, entra en la cascada | CAT-E4 |
| H-13 | ¿Se puede desasignar un servicio de un profesional? ¿Qué pasa con sus turnos futuros de ese servicio? | Sí; los turnos se mantienen, solo deja de ofrecerse | CAT-06, CAT-E5 |

### Agenda

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-14 | ¿La agenda muestra solo el día actual, o se puede navegar a otros días? | Por defecto el día actual; se puede navegar a cualquier día | AGE-01 |
| H-15 | ¿Se puede marcar atendido o ausente antes de la hora del turno? | No, solo a partir de la hora de inicio | AGE-03, AGE-04, AGE-E2 |
| H-16 | El historial registra "cambios de datos". ¿Se pueden editar los datos de un turno? | No. Un cambio de horario es una reprogramación; cualquier otro cambio es cancelar y reservar de nuevo | AGE-08, DEC-08 |
| H-17 | ¿Qué pasa si el administrador actúa sobre un turno que otro canal ya cerró, o si se corta la actualización en tiempo real? | Se rechaza mostrando el estado actual; si se corta la conexión, avisa y se reconecta solo | AGE-E1, AGE-E3 |
| H-18 | El brief dice que una reprogramación "cuenta como cancelación en las estadísticas". ¿Hay estadísticas en v1? | No: estadísticas y reportes quedan fuera de alcance. El rastro de la reprogramación queda en el historial | REP-05, Fuera de alcance |

### Reserva

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-19 | ¿Qué ve el cliente si ya tiene un turno activo? | Se rechaza al confirmar, indicando que ya tiene un turno activo y que puede cancelarlo con el link de su email. En el panel, se muestra el turno existente | RES-E3 |
| H-20 | ¿Qué pasa si el horario llega a su hora de inicio mientras el cliente completa los datos? | Se rechaza y vuelve a elegir horario | RES-E4 |
| H-21 | ¿Qué pasa si el email tiene un formato inválido? | Se rechaza antes de confirmar, indicando el campo | RES-E5 |
| H-22 | "Menor cantidad de turnos ese día": ¿cuentan los cancelados? | No, solo los no cancelados | RES-11 |

### Reprogramación

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-23 | ¿Al reprogramar se puede cambiar de profesional o de servicio? | No: mismo profesional y mismo servicio, otro día u horario | REP-01 |
| H-24 | ¿Qué pasa si el turno a reprogramar ya no está reservado? | Se rechaza indicando el estado actual | REP-E2 |

### Cancelación por el cliente

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-25 | ¿El link cancela directamente o pide confirmación? | Muestra los datos del turno y pide confirmación | CAN-03 |
| H-26 | ¿Qué ve el cliente si el link no es válido o el turno ya empezó? | "Link no válido", sin revelar datos; si ya empezó, que no se puede cancelar online | CAN-E1, CAN-E2 |

### Procesos del sistema

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-27 | ¿Qué pasa si el administrador marca un turno justo cuando corre el marcado automático, o si el proceso no corrió a tiempo? | Prospera lo que llega primero; al volver, el proceso marca todo lo vencido | AUS-E1, AUS-E2 |
| H-28 | ¿Cada cuánto corre la anonimización? ¿Y si un día no corre? | Una vez por día; la próxima corrida anonimiza todo lo vencido | RET-05, RET-E1 |

### Notificaciones

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-29 | ¿Qué dice el recordatorio? ¿Se envía si el turno ya se canceló? | Datos del turno y link de cancelación; solo si sigue reservado | NOT-06 |
| H-30 | ¿Cuántas veces se reintenta un email? ¿Y si no sale nunca? | 5 reintentos; después se descarta y queda en el historial del turno | NOT-E2, Parámetros |
| H-31 | ¿Se avisa al cliente cuando el sistema lo marca ausente? | No | NOT (no se notifica) |

### Requisitos no funcionales

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-32 | ¿Cuántos profesionales, turnos por mes y clientes simultáneos se esperan? | Decenas de profesionales como máximo; cientos de turnos por mes; decenas de clientes simultáneos en el pico | NFR-01..03 |
| H-33 | ¿Cuánto puede tardar la carga de horarios? ¿Y un cambio en aparecer en la agenda? | Menos de 2 segundos; menos de 5 segundos | NFR-05, NFR-06 |
| H-34 | ¿Qué disponibilidad se espera? | 24/7, tolerando cortes breves de mantenimiento | NFR-07 |
| H-35 | ¿Qué normativa de datos aplica? | Ley 25.326 (Argentina) | NFR-09 |
| H-36 | ¿Qué nivel de accesibilidad? | WCAG 2.2 AA en la reserva pública; el panel no aplica | NFR-10 |
| H-37 | ¿Qué formatos de fecha y hora? | dd/mm/aaaa, 24 horas | NFR-13 |
| H-38 | ¿Qué navegadores se soportan? | Las dos últimas versiones de Chrome, Safari, Firefox y Edge, en escritorio y móvil | NFR-14 |

---

## Encontrados en la primera corrida

Huecos que el skill encontró y la referencia no tenía (corrida `discovery-c__20261010-020044`, Opus).
Las respuestas son las que se dieron en esa corrida: la opción que recomendó el skill.

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-50 | ¿El panel puede buscar turnos por datos del cliente, por ejemplo cuando llama para cancelar? | Sí, por email, nombre o teléfono, con su estado y fecha | AGE-09 |
| H-51 | ¿Puede haber varias sesiones abiertas a la vez con la misma cuenta? | Sí; cada una vence por su cuenta | ACC-06 |
| H-52 | En la cascada, ¿qué es un «turno futuro»? ¿Se cancela uno que ya empezó y sigue en RESERVADO? | Solo los de hora de inicio posterior a ahora; los que ya empezaron los cierra el administrador o el ausente automático | CAT-02, Glosario |
| H-53 | ¿Un bloqueo se puede editar o eliminar? | Eliminar sí, editar no. Al eliminarlo, sus turnos dejan de destacarse y el horario vuelve a ofrecerse | CAT-12 |
| H-54 | Si un turno queda fuera de la nueva disponibilidad semanal, ¿se destaca en la agenda? | Sí, igual que uno bajo un bloqueo | CAT-10 |
| H-55 | ¿El turno manual también envía el email de confirmación? | Sí, igual que la reserva pública | RES-13 |
| H-56 | ¿Qué turnos se pueden reprogramar? | Cualquiera en RESERVADO, aunque ya haya empezado | REP-01 |
| H-57 | ¿El cliente indica un motivo al cancelar desde el link? | No | CAN-01 |
| H-58 | ¿El administrador puede cancelar un turno que ya empezó y sigue en RESERVADO? | Sí | AGE-05 |
| H-59 | Si el sistema estuvo caído cuando tocaba enviar un recordatorio, ¿qué pasa? | Se envía al reanudar, si el turno sigue en RESERVADO y no llegó su hora de inicio; si no, se omite | NOT-06 |
| H-60 | «Desde su último turno»: ¿qué fecha es esa? | El inicio del turno más reciente del cliente, en cualquier estado | RET-01 |
| H-61 | ¿Qué pasa si un cliente reserva mientras la anonimización procesa sus turnos viejos? | Gana el turno nuevo: reinicia el plazo y ese cliente no se anonimiza en esa corrida | RET-E2 |
| H-62 | ¿Qué pasa si el servidor de email rechaza un envío de forma definitiva? | No se reintenta y queda en el historial del turno. Los rebotes posteriores a un envío aceptado no se detectan | NOT-E3, NOT (no se notifica) |
| H-63 | «Cortes breves de mantenimiento»: ¿qué tan breves y cuándo? | Hasta 15 minutos, entre las 2:00 y las 6:00 | NFR-07 |
| H-64 | ¿La grilla se cuenta desde las 00:00 o desde el inicio de cada franja? | Desde las 00:00 | RES-05, Glosario |
| H-65 | Al anonimizar, ¿con qué se reemplazan nombre, teléfono y email? | Con el texto «Anonimizado» | RET-03 |
| H-66 | El nombre del profesional, ¿es dato personal? | No: es dato del catálogo | Profesional |
| H-67 | ¿Los extremos de un bloqueo se alinean a la grilla? ¿Se puede registrar uno en el pasado? | Alineados a la grilla; el fin tiene que ser posterior al momento de registrarlo, si no se rechaza | CAT-13, CAT-E6 |
| H-68 | ¿Un turno ATENDIDO o AUSENTE sigue ocupando su franja? | Sí: solo cancelar la libera | INV-01 |

---

## Esquema de base

Lo que el esquema puede preguntar: los nombres en inglés con alternativas reales y las elecciones
técnicas que los documentos anteriores no tomaron. El resto se deriva (ver `db-schema-api.md`).

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-69 | ¿Cómo se llama en inglés el Turno: `appointments` o `bookings`? | `appointments` | db-schema-api |
| H-70 | ¿Y el Bloqueo: `time_blocks`, `blocks` o `blackouts`? | `time_blocks` | db-schema-api |
| H-71 | ¿Y la Disponibilidad semanal: `availability_slots` o `weekly_availabilities`? | `availability_slots` | db-schema-api |
| H-72 | ¿Y la Asignación: `professional_services` o `assignments`? | `professional_services` | db-schema-api |
| H-73 | ¿Y la Cuenta de administrador: `admin_accounts` o `admins`? | `admin_accounts` | db-schema-api |
| H-74 | ¿Y el estado RESERVADO: `booked` o `reserved`? | `booked` | db-schema-api |
| H-75 | La no superposición necesita la extensión `btree_gist` de PostgreSQL. ¿Se habilita? | Sí | db-schema-api (INV-01) |
| H-76 | ¿Alguna entidad se edita en paralelo y necesita control de versión (concurrencia optimista)? | No: alcanza con los bloqueos de fila de las garantías | Decisiones del esquema |
| H-77 | ¿El producto atiende a varias organizaciones (multi-tenancy)? | No: un solo consultorio | Decisiones del esquema |
| H-78 | ¿Qué historial se guarda? | El de los turnos (Evento de turno); nada más | Decisiones del esquema |
| H-79 | ¿Alguna entidad necesita poder recuperarse después de borrada? | No | Decisiones del esquema |
| H-80 | ¿Una sola moneda o varias? | Una sola: pesos argentinos | Decisiones del esquema |
| H-81 | El recordatorio lleva el link de cancelación, pero el token se guarda como hash. ¿Un token nuevo en cada email, o se guarda cifrado? | Se guarda también cifrado, para que el link del primer email siga funcionando | Decisiones del esquema |

---

## Dominio

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-39 | ¿El precio informativo de un servicio es obligatorio? | No | Servicio |
| H-40 | Si infraestructura elimina una cuenta de administrador, ¿qué pasa con el historial que firmó? | Los eventos conservan el nombre de usuario como autor | Cuenta de administrador |

---

## Técnico

El brief no define nada técnico. Estas son las elecciones que el skill tiene que preguntar (o
proponer y confirmar); el resto se infiere.

| ID | Pregunta | Respuesta | Dónde queda |
|---|---|---|---|
| H-41 | ¿Qué lenguajes? | Node para la API, Next.js para la web | Servicios |
| H-42 | ¿Una app web para las dos superficies, o una por superficie? | Una sola | DEC-T01 |
| H-43 | ¿Los procesos automáticos corren en la API o en un worker aparte? | En la API | DEC-T02 |
| H-44 | ¿Cómo se actualiza la agenda en tiempo real? | Server-Sent Events | DEC-T03 |
| H-45 | ¿GitLab o GitHub? | GitLab | DEC-T04 |
| H-46 | ¿Cola de emails en Redis o en la base? | Tabla de pendientes en PostgreSQL | DEC-T05 |
| H-47 | ¿Qué proveedor de email? | SMTP genérico, configurable por entorno | DEC-T06 |
| H-48 | ¿Cómo se autentica el administrador? | JWT en cookie httpOnly, con refresh (default del catálogo) | Autenticación |
| H-49 | ¿Alguna desviación del catálogo de convenciones (otro ORM, otro framework)? | Ninguna | — |
