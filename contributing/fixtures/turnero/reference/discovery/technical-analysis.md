---
created: 2026-10-10
last_updated: 2026-10-10
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
| catalog | Profesional, Servicio, Asignación, Disponibilidad semanal, Bloqueo | CAT |
| scheduling | Turno, Evento de turno | AGE, RES, REP, CAN, AUS, RET |
| notifications | — | NOT |

**Interacciones**
| De → A | Para qué | Requisito |
|---|---|---|
| catalog → scheduling | Cancelar los turnos futuros de un profesional o servicio desactivado | CAT-02, CAT-05 |
| catalog → scheduling | Contar los turnos que se darán de baja, antes de confirmar la desactivación | CAT-02 |
| scheduling → catalog | Consultar disponibilidad, bloqueos, asignaciones y estado de profesionales y servicios | RES-04, RES-06, RES-10, AGE-01 |
| scheduling → notifications | Encolar la notificación de cada cambio de turno que notifica, y el recordatorio | NOT-01..06 |
| notifications → scheduling | Registrar en el historial una notificación descartada | NOT-E2 |
| access → scheduling | Identificar al administrador como autor de los eventos | AGE-06 |

## Persistencia e infraestructura

| Componente | Tecnología | Dueño | Usado por | Para qué |
|---|---|---|---|---|
| Base principal | PostgreSQL | api | — | Todas las entidades, más la cola de notificaciones pendientes (NOT-E1) |

## Comunicación

| De → A | Protocolo | Tipo | Para qué |
|---|---|---|---|
| web → api | HTTP | sincrónica | Todas las lecturas y escrituras del panel y de la reserva pública |
| api → web | SSE | asincrónica | Agenda en tiempo real (AGE-02, NFR-06) |
| api → servidor SMTP | SMTP | asincrónica | Notificaciones por email (NOT-01..06) |

## Autenticación y autorización

| Actor | Credencial | Sesión | Alcance |
|---|---|---|---|
| U-01 Administrador | JWT en cookie httpOnly | Vence tras la **duración máxima de sesión** sin actividad (ACC-03); con refresh | Todos los datos |
| U-02 Cliente | Ninguna para reservar; token de cancelación en el link para cancelar | — (el token vale para un uso, CAN-02) | Reservar; ver y cancelar solo el turno de su token |

| De → A | Autenticación |
|---|---|
| web → api | Reenvía el JWT del administrador en el panel; la reserva pública y el link de cancelación no llevan credencial de usuario |

## Garantías

| Regla | Mecanismo | Dónde |
|---|---|---|
| INV-01 No superposición | Restricción de exclusión sobre profesional + rango [inicio, fin) de los turnos no cancelados | Base principal |
| INV-02 Tope de turnos activos | Verificación dentro de la transacción de reserva y de reprogramación, con bloqueo por clave de identidad | api.scheduling |
| INV-03 Inactivo sin turnos futuros | La desactivación y la cancelación en cascada van en la misma transacción, con bloqueo sobre el profesional o servicio; la reserva verifica que estén activos dentro de su transacción | api.catalog → api.scheduling |
| INV-04 Un sucesor por reprogramación | Restricción de unicidad sobre "turno original" | Base principal |
| INV-05 Historial inmutable | Tabla de solo inserción; la única actualización permitida es la anonimización del detalle | Base principal |
| INV-06 Token válido | El token se invalida en la misma transacción que cierra o reprograma el turno | api.scheduling |
| REP-02 Reprogramación atómica | Una sola transacción | api.scheduling |
| RES-E1 Reservas concurrentes | Lo resuelve INV-01: la segunda inserción falla y se traduce en el aviso al cliente | Base principal |
| CAT-E4, AUS-E1 Operaciones simultáneas sobre el mismo turno o profesional | Transacciones con bloqueo sobre el registro; la segunda ve el estado ya cambiado | Base principal |
| NOT-E1 Reintento de email | Las notificaciones se insertan en una tabla de pendientes dentro de la transacción que las dispara; un proceso de api las envía y reintenta hasta los **reintentos de envío de email** | Base principal + api.notifications |
| RET-E2 Reserva durante la anonimización | La anonimización de un cliente y la reserva toman el mismo bloqueo por clave de identidad; la anonimización vuelve a verificar el plazo dentro de su transacción | api.scheduling |
| AUS-E2, RET-E1 Procesos que no corrieron | Los procesos automáticos buscan todo lo vencido, no solo lo del último intervalo | api.scheduling |

## Flujos clave

### Reserva con "cualquiera" (RES-01, RES-11)
Un cliente reserva un turno sin elegir profesional; el sistema le asigna uno libre en el horario
elegido y le confirma por email.

1. web → api.scheduling: pide horarios libres → api.catalog: disponibilidad, bloqueos y asignaciones
2. web → api.scheduling: confirma → se asigna el profesional libre con menos turnos ese día (RES-11)
3. api.scheduling: transacción → INV-01 (restricción de exclusión) + INV-02 (tope por clave de identidad) + INV-03 (profesional y servicio activos)
   → si INV-01 falla: RES-E2 (otro profesional libre) o RES-E1 (aviso al cliente)
4. En la misma transacción: evento de creación + NOT-01 en la tabla de pendientes
5. api.notifications: envía NOT-01 por SMTP, con reintentos (NOT-E1)
6. api → web: la agenda del profesional asignado se actualiza por SSE (AGE-02)

### Desactivación de un profesional (CAT-02)
El administrador da de baja a un profesional; sus turnos futuros se cancelan y cada cliente recibe
el aviso.

1. web → api.catalog: pide cuántos turnos se darán de baja → api.scheduling: cuenta los turnos futuros en RESERVADO
2. web → api.catalog: confirma la desactivación
3. api.catalog → api.scheduling: en la misma transacción, cancela cada turno futuro con motivo del sistema (INV-03) y encola NOT-04 por cada uno
4. api → web: la agenda se actualiza por SSE (AGE-02)

### Reprogramación (REP-01, REP-02)
El administrador mueve un turno a otro horario; el turno original queda cancelado, el nuevo queda
reservado y el cliente recibe un solo aviso.

1. web → api.scheduling: reprograma un turno en RESERVADO a un horario nuevo
2. api.scheduling: una sola transacción → cancela el original + crea el sucesor (INV-04) + invalida el token original (INV-06)
   → valida el sucesor con RES-05..09; INV-02 no se dispara en el paso intermedio (REP-04)
3. En la misma transacción: eventos de reprogramación en los dos turnos + solo NOT-05 en pendientes (REP-06)

### Cancelación por el cliente (CAN-01)
El cliente abre el link de su email y cancela su turno sin autenticarse.

1. web → api.scheduling: consulta el turno por token → si el token no es válido, CAN-E1
2. web → api.scheduling: confirma la cancelación → transacción: verifica que no pasó la hora de inicio (CAN-E2), cancela, invalida el token (INV-06), encola NOT-03
3. api → web: la agenda se actualiza por SSE (AGE-02)

### Marcado automático de ausente (AUS-01)
Pasada la ventana desde el inicio de un turno sin novedad, el sistema lo marca ausente.

1. api.scheduling (proceso periódico): busca los turnos en RESERVADO cuyo inicio + **ventana de marcado automático de ausente** ya pasó (AUS-E2)
2. Por cada uno, transacción con bloqueo: si sigue en RESERVADO, pasa a AUSENTE con evento de autor "sistema" (AUS-02); si no, no hace nada (AUS-E1)
3. api → web: la agenda se actualiza por SSE (AGE-02)

## Decisiones técnicas

| ID | Tema | Decisión | Descartado | Afecta |
|---|---|---|---|---|
| DEC-T01 | Frontends | Una sola app sirve las dos superficies | Una app por superficie | web |
| DEC-T02 | Procesos automáticos | Corren dentro de api, con un planificador propio (AUS cada minuto, RET una vez por día, envío de pendientes continuo) | Un worker aparte | AUS, RET, NOT |
| DEC-T03 | Agenda en tiempo real | Server-Sent Events | Polling; WebSockets | AGE-02 |
| DEC-T04 | CI/CD | GitLab (pipeline ci-gitlab, registry privado de GitLab) | GitHub + Docker Hub | todos los servicios |
| DEC-T05 | Cola de notificaciones | Tabla de pendientes en PostgreSQL | Cola en Redis (BullMQ, convención queue del catálogo) | NOT-E1 |
| DEC-T06 | Proveedor de email | SMTP genérico; el servidor se configura por entorno | Un proveedor con API propia | NOT |
