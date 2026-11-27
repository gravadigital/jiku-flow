---
created: 2026-10-11
last_updated: 2026-10-11
status: closed
functional_analysis: docs/discovery/functional-analysis.md
domain_analysis: docs/discovery/domain-analysis.md
---

# Análisis técnico — Turnero

## Servicios

| Servicio | Tipo | Lenguaje | Superficies | Expone |
|---|---|---|---|---|
| api | service | node | — | HTTP |
| web | frontend | nextjs | Panel de administración, Reserva pública | — |

## Módulos

### api
| Módulo | Entidades | Bloques |
|---|---|---|
| access | Cuenta de administrador | ACC |
| catalog | Profesional, Servicio, Asignación, Franja de disponibilidad, Bloqueo | CAT |
| scheduling | Turno, Evento de turno | AGE, HIS, RES, REP, CAN, REC, AUS, RET |
| notifications | — | NOT |

**Interacciones**
| De → A | Para qué | Requisito |
|---|---|---|
| catalog → scheduling | Contar y cancelar en cascada los turnos con inicio futuro de un profesional o servicio que se desactiva, en la misma transacción | CAT-03, CAT-04, CAT-08 |
| scheduling → catalog | Consultar servicios y profesionales activos, asignaciones, franjas de disponibilidad y bloqueos para calcular horarios ofrecidos y turnos destacados | RES-04, RES-06, RES-13, AGE-01 |
| scheduling → notifications | Encolar cada notificación en la misma transacción que el cambio del turno | NOT-01..06 |
| notifications → scheduling | Registrar el evento "email no entregado" en el historial del turno | NOT-E2, NOT-E3 |
| scheduling → access | Obtener el usuario de la cuenta que actúa, para el autor del evento | HIS-03 |

## Persistencia e infraestructura

| Componente | Tecnología | Dueño | Usado por | Para qué |
|---|---|---|---|---|
| Base principal | PostgreSQL | api | — | Todas las entidades, más las tablas técnicas de sesiones de administrador (ACC-05..07) y de notificaciones pendientes (NOT-E1..E3) |

## Comunicación

| De → A | Protocolo | Tipo | Para qué |
|---|---|---|---|
| web → api | HTTP | sincrónica | Todas las lecturas y escrituras del panel y de la reserva pública |
| api → web | SSE | asincrónica | Agenda en tiempo real y aviso de desconexión (AGE-04, AGE-E4, NFR-04) |
| api → servidor SMTP | SMTP | asincrónica | Notificaciones por email (NOT-01..06) |

## Autenticación y autorización

| Actor | Credencial | Sesión | Alcance |
|---|---|---|---|
| U-01 Administrador | Usuario y contraseña al ingresar; luego JWT de acceso de 15 minutos más refresh token rotativo, en cookies httpOnly | El refresh token vence tras la **inactividad máxima de sesión** sin uso y se rota en cada renovación; una sesión por dispositivo (ACC-07); cerrar sesión revoca el refresh token (ACC-06) | Todos los datos |
| U-02 Cliente | Ninguna para reservar; token de cancelación en el link para su turno | — (el token sirve mientras el turno esté en RESERVADO y no haya empezado) | Servicios activos sin precio, profesionales habilitados y horarios ofrecidos, sin datos de otros turnos. Con el token, solo fecha, hora, servicio y profesional de su turno |

| De → A | Autenticación |
|---|---|
| web → api | Reenvía el JWT del administrador; las llamadas de la reserva pública van sin credencial, salvo el token de cancelación |

## Garantías

| Regla | Mecanismo | Dónde |
|---|---|---|
| INV-01 No superposición | Restricción de exclusión sobre profesional + rango [inicio, fin) de los turnos no cancelados | Base principal |
| INV-02 Tope de turnos activos | Dentro de la transacción de reserva y de reprogramación: lock por clave de identidad y conteo de turnos en RESERVADO contra el **tope de turnos activos por cliente** | api.scheduling |
| INV-03 Inactivo sin turnos futuros | La desactivación y la cancelación en cascada van en una sola transacción, con lock sobre la fila del profesional o servicio; la reserva toma el mismo lock y verifica que siga activo (CAT-E6) | api.catalog → api.scheduling |
| INV-04 Un sucesor por reprogramación | Restricción de unicidad sobre "turno original" | Base principal |
| INV-05 Historial inmutable | Tabla de solo inserción: un trigger rechaza todo DELETE y todo UPDATE salvo el de los datos del cliente que hace la anonimización | Base principal |
| INV-06 Un evento por transición | Toda transición pasa por una única operación del módulo que actualiza el estado e inserta el evento en la misma transacción | api.scheduling |
| INV-07 Franjas sin superposición | Restricción de exclusión sobre profesional + día de la semana + rango [inicio, fin) | Base principal |
| INV-08 Anonimización conjunta por clave | Cada clave se anonimiza en una sola transacción, tomando el mismo lock por clave de identidad que la reserva (RET-E2) | api.scheduling |
| INV-09 Un recordatorio por turno | Actualización condicional de "recordatorio enviado" (solo si es no y el turno sigue en RESERVADO) en la misma transacción que encola NOT-06 | api.scheduling |
| REP-02 Reprogramación atómica | Una sola transacción: cancela el original, crea el sucesor, inserta los eventos y encola NOT-05 | api.scheduling |
| AGE-E1, CAN-E3, AUS-E2 Prevalece el primer cambio | Toda transición es una actualización condicional "solo si sigue en RESERVADO"; si no afecta filas, se rechaza con el estado actual | api.scheduling |
| RES-E1, RES-15 Una sola reserva por horario | La violación de INV-01 se traduce en RES-E1; con "cualquiera" se prueban los candidatos en orden de RES-14 dentro de la transacción, y solo falla si todos chocan (RES-E2) | api.scheduling |
| NOT-E1..E3 Entrega de emails | Tabla de notificaciones pendientes escrita en la misma transacción que el cambio del turno; un despachador las envía con los **reintentos de envío de email** espaciados 1, 5, 15, 30 y 60 minutos; un rechazo definitivo no se reintenta | Base principal + api.notifications |
| REC-E1, AUS-E1, RET-E1 Procesos tras una caída | Cada proceso busca todo lo vencido desde su última ejecución, no solo lo del último intervalo | api.scheduling |
| Procesos con varias instancias de api | Cada proceso programado toma un lock exclusivo de la base antes de correr; solo una instancia lo ejecuta a la vez | Base principal + api.scheduling |
| AGE-04 Agenda en tiempo real con varias instancias | Cada cambio de turno se publica con LISTEN/NOTIFY de PostgreSQL; cada instancia de api lo reenvía por SSE a sus paneles conectados | Base principal + api.scheduling |
| ACC-E2 Bloqueo por intentos | Incremento atómico de "intentos fallidos consecutivos" y verificación de "bloqueada hasta" en la misma operación de ingreso | api.access |
| RES-17 Token único | Restricción de unicidad sobre el token de cancelación | Base principal |
| CAT-01, CAT-05 Nombres únicos | Índice único sobre el nombre en minúsculas | Base principal |

## Flujos clave

### Reserva y turno manual, con "cualquiera" (RES-01, RES-02, RES-14, RES-15, RES-18)
Un cliente (o el administrador por teléfono) reserva un turno, eligiendo o no profesional; el sistema asigna uno libre, garantiza que nadie más tomó el horario y confirma por email.

1. web → api.scheduling: pide horarios ofrecidos → api.catalog: servicios activos, asignaciones, franjas y bloqueos (RES-04..08, RES-13)
2. web → api.scheduling: confirma con nombre, teléfono y email (RES-E5)
3. api.scheduling: una transacción → lock por clave de identidad y conteo contra el tope (INV-02, RES-E3) → lock sobre profesional y servicio, verifica que sigan activos (INV-03, CAT-E6) → valida que el inicio no llegó (RES-E4)
4. api.scheduling: con "cualquiera", ordena candidatos por carga del día y desempata al azar (RES-14); inserta el turno con duración y token (RES-16, RES-17) → INV-01 (exclusión); si choca, prueba el siguiente candidato (RES-15) o falla (RES-E1, RES-E2)
5. api.scheduling: inserta el evento de creación con los datos del cliente (INV-06) → encola NOT-01 en api.notifications (RES-18) → NOTIFY a la agenda (AGE-04)
6. api.notifications → servidor SMTP: envía NOT-01 con reintentos (NOT-E1..E3)

### Reprogramación (REP-01..08)
El administrador mueve un turno a otro horario del mismo profesional; el original queda cancelado, el nuevo reservado y el cliente recibe un solo aviso.

1. web → api.scheduling: pide horarios ofrecidos del mismo profesional y servicio, contando como libre el horario del original (REP-03)
2. web → api.scheduling: confirma el horario destino
3. api.scheduling: una sola transacción (REP-02) → cancela el original con motivo "Reprogramado" solo si sigue en RESERVADO (REP-E2) → crea el sucesor con un token nuevo (INV-04, REP-07) → INV-01 (REP-E1) → INV-02 sin disparar en el paso intermedio (REP-04) → eventos de cambio de estado y de reprogramación en los dos turnos (INV-06)
4. api.scheduling → api.notifications: solo NOT-05 (REP-06) → NOTIFY a la agenda

### Desactivación con cascada (CAT-03, CAT-04, CAT-08, CAT-E6)
El administrador desactiva un profesional o un servicio; el panel le muestra cuántos turnos se cancelan y, al confirmar, se cancelan y se avisa a cada cliente.

1. web → api.catalog: pide la cantidad de turnos afectados → api.scheduling: cuenta los RESERVADO con inicio futuro (CAT-04)
2. web → api.catalog: confirma → una transacción con lock sobre la fila (INV-03): marca inactivo → api.scheduling: cancela cada turno con inicio futuro con motivo "Profesional desactivado" o "Servicio desactivado", con sus eventos (INV-06)
3. api.scheduling → api.notifications: NOT-04 por turno → NOTIFY a la agenda
4. Una reserva concurrente espera el lock: si llegó antes, su turno entra en la cascada; si llega después, ve el inactivo y falla como RES-E1 (CAT-E6)

### Cancelación por el cliente (CAN-01..05)
El cliente abre el link de su email, ve su turno y confirma la cancelación.

1. web → api.scheduling: abre el link con el token → token vigente (RESERVADO y sin empezar) → devuelve fecha, hora, servicio y profesional (CAN-02); si no, CAN-E1 o CAN-E2 sin datos del turno
2. web → api.scheduling: confirma → actualización condicional "solo si sigue en RESERVADO y no empezó" (CAN-E3) con motivo "Cancelado por el cliente" (CAN-03) → evento (INV-06)
3. api.scheduling → api.notifications: NOT-03 (CAN-05) → NOTIFY a la agenda

### Procesos programados (REC-01..03, AUS-01..05, RET-01..05)
Tres procesos dentro de api, cada uno con su lock exclusivo: recordatorio y ausente cada minuto, anonimización diaria a las 3:00.

1. api.scheduling (cada minuto): busca turnos en RESERVADO cuyo inicio está a la **antelación del recordatorio** o menos, sin recordatorio enviado, reservados con al menos esa antelación y sin empezar (REC-02, REC-E1) → actualización condicional y encola NOT-06 (INV-09)
2. api.scheduling (cada minuto): busca turnos en RESERVADO cuyo inicio más la **ventana de ausente automático** ya pasó (AUS-E1) → actualización condicional a AUSENTE con evento de canal sistema y hora real (AUS-02, AUS-E2) → NOTIFY a la agenda
3. api.scheduling (diario, 3:00): busca claves de identidad cuyo turno más reciente empezó hace más del **plazo de retención de datos del cliente** (RET-E1) → por cada clave, una transacción con el lock de la clave (INV-08, RET-E2): reemplaza los datos en turnos y eventos de creación, elimina la clave e inserta el evento "datos anonimizados" (RET-03..05)

### Envío de emails (NOT-E1..E4)
Cada notificación encolada sale por SMTP; si falla, se reintenta y, si no sale, queda en el historial del turno.

1. api.notifications (continuo): toma las notificaciones pendientes cuyo próximo intento llegó → servidor SMTP
2. Falla transitoria → programa el siguiente intento con el espaciado de la garantía, hasta los **reintentos de envío de email** (NOT-E1)
3. Reintentos agotados o rechazo definitivo → descarta y pide a api.scheduling el evento "email no entregado" con la notificación y la causa (NOT-E2, NOT-E3)

### Agenda en tiempo real (AGE-01, AGE-04, AGE-E4)
El administrador mira la agenda del día y ve aparecer reservas, cancelaciones y cambios de estado sin recargar.

1. web → api.scheduling: carga la agenda del día con turnos destacados → api.catalog: franjas y bloqueos (AGE-01)
2. web → api: abre la conexión SSE autenticada con el JWT
3. Cualquier cambio de turno → NOTIFY de PostgreSQL → cada instancia de api reenvía el evento por SSE (NFR-04)
4. Si se corta la conexión, web muestra el aviso, reconecta y recarga la agenda (AGE-E4)

### Ingreso y sesión (ACC-01, ACC-05..07, ACC-E1..E3)
El administrador ingresa con usuario y contraseña, trabaja sin volver a ingresar mientras haya actividad y puede cerrar sesión.

1. web → api.access: usuario y contraseña → verifica "bloqueada hasta" e incrementa o reinicia los intentos en la misma operación (ACC-E1, ACC-E2)
2. api.access: crea una sesión con refresh token y emite el JWT de acceso, en cookies httpOnly (ACC-07)
3. web → api: cada llamada con el JWT; al vencer, renueva con el refresh token, que se rota; si pasó la **inactividad máxima de sesión**, falla y vuelve al ingreso (ACC-05, ACC-E3)
4. web → api.access: cerrar sesión revoca el refresh token (ACC-06)

## Decisiones técnicas

| ID | Tema | Decisión | Descartado | Afecta |
|---|---|---|---|---|
| DEC-T01 | Lenguaje del backend | node (TypeScript) | golang | api |
| DEC-T02 | Frontends | Una sola app Next.js sirve las dos superficies | Una app por superficie | web |
| DEC-T03 | Procesos automáticos | Corren dentro de api, como tareas programadas | Un worker aparte | REC, AUS, RET, NOT |
| DEC-T04 | Agenda en tiempo real | Server-Sent Events | WebSocket; polling cada 3 segundos | AGE-04 |
| DEC-T05 | Proveedor de email | Servidor SMTP genérico, configurado en el despliegue | Resend; Amazon SES | NOT |
| DEC-T06 | Cola de emails | Tabla de notificaciones pendientes en PostgreSQL | BullMQ con Redis | NOT-E1, NOT-E2, NOT-E3 |
| DEC-T07 | Frecuencia del recordatorio y del ausente | Cada 1 minuto | Cada 5 minutos | REC-01, AUS-01 |
| DEC-T08 | Frecuencia de la anonimización | Una vez por día, a las 3:00 | Cada hora; a las 0:00 | RET-03 |
| DEC-T09 | Espaciado de los reintentos de email | 1, 5, 15, 30 y 60 minutos | Cada 1 minuto; cada 10 minutos | NOT-E1 |
| DEC-T10 | Sesión del administrador | JWT de acceso de 15 minutos y refresh token rotativo guardado en base | Sesión opaca en base con cookie | ACC-05, ACC-06, ACC-07 |
| DEC-T11 | Garantía del tope | Transacción con lock por clave de identidad y conteo contra el parámetro | Índice único parcial sobre turnos en RESERVADO | INV-02 |
| DEC-T12 | CI/CD | GitLab (pipeline ci-gitlab, registry privado de GitLab) | GitHub Actions con GitHub Container Registry | api, web |
