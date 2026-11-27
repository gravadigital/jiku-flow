---
created: 2026-10-11
last_updated: 2026-10-11
status: closed
service: api
technical_analysis: docs/discovery/technical-analysis.md
domain_analysis: docs/discovery/domain-analysis.md
---

# Esquema de base — api

## Base

| Servicio dueño | Motor | Usada por |
|---|---|---|
| api | PostgreSQL | — |

## Decisiones del esquema

| Decisión | Valor | Descartado |
|---|---|---|
| Concurrencia | No aplica: los conflictos se resuelven con locks de fila y actualizaciones condicionales (Garantías); la edición del catálogo es de último que guarda | Columna version en profesionales y servicios |
| Multi-tenancy | No aplica: un solo consultorio (múltiples sedes está fuera de alcance) | — |
| Historial | Evento de turno, para los turnos; nada más | Auditoría por trigger de los cambios del catálogo |
| Borrado | No aplica: borrado físico donde el dominio elimina (asignaciones, franjas, bloqueos, cuentas); sin deleted_at | deleted_at |
| Moneda | Una sola: pesos argentinos, sin columna de moneda | — |
| Tokens reenviados | El token de cancelación se guarda como hash para validarlo y cifrado con una clave fuera de la base para armar el link de NOT-01, NOT-05, NOT-06 y sus reintentos | Un token nuevo en cada email |

## Esquema

```dbml
Enum availability_slot_weekday {
  monday [note: 'LUNES']
  tuesday [note: 'MARTES']
  wednesday [note: 'MIÉRCOLES']
  thursday [note: 'JUEVES']
  friday [note: 'VIERNES']
  saturday [note: 'SÁBADO']
  sunday [note: 'DOMINGO']
}

Enum time_block_scope {
  professional [note: 'PROFESIONAL']
  all [note: 'TODOS']
}

Enum appointment_status {
  booked [note: 'RESERVADO']
  attended [note: 'ATENDIDO']
  no_show [note: 'AUSENTE']
  cancelled [note: 'CANCELADO']
}

Enum appointment_origin {
  public [note: 'PÚBLICO']
  panel [note: 'PANEL']
}

Enum appointment_event_type {
  created [note: 'CREACIÓN']
  status_changed [note: 'CAMBIO DE ESTADO']
  rescheduled [note: 'REPROGRAMACIÓN']
  anonymized [note: 'ANONIMIZACIÓN']
  email_not_delivered [note: 'EMAIL NO ENTREGADO']
}

Enum appointment_event_channel {
  public [note: 'PÚBLICO']
  panel [note: 'PANEL']
  system [note: 'SISTEMA']
}

Enum notification_type {
  booking_confirmation [note: 'NOT-01']
  cancelled_by_admin [note: 'NOT-02']
  cancelled_by_client [note: 'NOT-03']
  cancelled_by_deactivation [note: 'NOT-04']
  rescheduled [note: 'NOT-05']
  reminder [note: 'NOT-06']
}

Enum appointment_event_failure_cause {
  retries_exhausted [note: 'REINTENTOS AGOTADOS']
  permanent_rejection [note: 'RECHAZO DEFINITIVO']
}

Enum notification_outbox_status {
  pending [note: 'Técnica: pendiente de envío (NOT-E1)']
  sent [note: 'Técnica: aceptado por el servidor SMTP']
  failed [note: 'Técnica: descartado (NOT-E2, NOT-E3)']
}

// módulo access
Table admin_accounts {
  id uuid [pk, default: `uuidv7()`]
  username text [not null, unique, note: 'Usuario']
  password_hash text [not null, note: 'Contraseña']
  failed_login_attempts integer [not null, default: 0, note: 'Intentos fallidos consecutivos']
  locked_until timestamptz [null, note: 'Bloqueada hasta']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Cuenta de administrador — credenciales y estado de ingreso; la crea y elimina infraestructura (ACC-03)'
}

Table admin_sessions {
  id uuid [pk, default: `uuidv7()`]
  admin_account_id uuid [not null, ref: > admin_accounts.id, note: 'ACC-07: una sesión por dispositivo; se borra con la cuenta']
  refresh_token_hash text [not null, unique, note: 'ACC-05: SHA-256 del refresh token vigente; se reemplaza en cada rotación']
  expires_at timestamptz [not null, note: 'ACC-05: último uso + inactividad máxima de sesión']
  revoked_at timestamptz [null, note: 'ACC-06: cierre de sesión']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    admin_account_id
  }
  Note: 'Técnica: sesión de administrador con refresh token rotativo (ACC-05, ACC-06, ACC-07, DEC-T10)'
}

// módulo catalog
Table professionals {
  id uuid [pk, default: `uuidv7()`]
  name text [not null, note: 'Nombre']
  active boolean [not null, default: true, note: 'Activo']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Profesional — quien presta servicios; se desactiva, nunca se elimina'
}

Table services {
  id uuid [pk, default: `uuidv7()`]
  name text [not null, note: 'Nombre']
  duration_minutes integer [not null, note: 'Duración']
  price_cents bigint [null, note: 'Precio']
  active boolean [not null, default: true, note: 'Activo']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Servicio — prestación con duración y precio de uso interno; se desactiva, nunca se elimina'
}

Table professional_services {
  id uuid [pk, default: `uuidv7()`]
  professional_id uuid [not null, ref: > professionals.id, note: 'Profesional']
  service_id uuid [not null, ref: > services.id, note: 'Servicio']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (professional_id, service_id) [unique]
    service_id
  }
  Note: 'Entidad: Asignación — qué profesional presta qué servicio; se elimina (CAT-10)'
}

Table availability_slots {
  id uuid [pk, default: `uuidv7()`]
  professional_id uuid [not null, ref: > professionals.id, note: 'Profesional']
  weekday availability_slot_weekday [not null, note: 'Día de la semana']
  start_time time [not null, note: 'Hora de inicio']
  end_time time [not null, note: 'Hora de fin']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    professional_id
  }
  Note: 'Entidad: Franja de disponibilidad — plantilla semanal de trabajo de un profesional; se elimina'
}

Table time_blocks {
  id uuid [pk, default: `uuidv7()`]
  reason text [not null, note: 'Motivo']
  starts_at timestamptz [not null, note: 'Inicio']
  ends_at timestamptz [not null, note: 'Fin']
  scope time_block_scope [not null, note: 'Alcance']
  professional_id uuid [null, ref: > professionals.id, note: 'Profesional']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    professional_id
    (starts_at, ends_at)
  }
  Note: 'Entidad: Bloqueo — interrupción puntual para un profesional o para todos; se elimina solo si no terminó'
}

// módulo scheduling
Table appointments {
  id uuid [pk, default: `uuidv7()`]
  professional_id uuid [not null, ref: > professionals.id, note: 'Profesional']
  service_id uuid [not null, ref: > services.id, note: 'Servicio']
  starts_at timestamptz [not null, note: 'Inicio']
  duration_minutes integer [not null, note: 'Duración']
  ends_at timestamptz [not null, note: 'Fin']
  client_name text [not null, note: 'Nombre del cliente · dato personal']
  client_phone text [not null, note: 'Teléfono del cliente · dato personal']
  client_email text [not null, note: 'Email del cliente · dato personal']
  identity_key text [null, note: 'Clave de identidad · dato personal']
  status appointment_status [not null, default: 'booked', note: 'Estado']
  origin appointment_origin [not null, note: 'Origen']
  cancellation_reason text [null, note: 'Motivo de cancelación']
  cancel_token_hash text [not null, unique, note: 'Token de cancelación']
  cancel_token_encrypted text [not null, note: 'Tokens reenviados: token cifrado para armar el link (NOT-01, NOT-05, NOT-06)']
  original_appointment_id uuid [null, unique, ref: - appointments.id, note: 'Turno original']
  reminder_sent boolean [not null, default: false, note: 'Recordatorio enviado']
  anonymized boolean [not null, default: false, note: 'Anonimizado']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    professional_id
    service_id
    (professional_id, starts_at)
    (identity_key, status)
    (status, starts_at)
  }
  Note: 'Entidad: Turno — reserva de un horario con un profesional y un servicio. Unicidad de cancel_token_hash: RES-17; de original_appointment_id: INV-04'
}

Table appointment_events {
  id uuid [pk, default: `uuidv7()`]
  appointment_id uuid [not null, ref: > appointments.id, note: 'Turno']
  type appointment_event_type [not null, note: 'Tipo']
  occurred_at timestamptz [not null, default: `now()`, note: 'Fecha y hora']
  channel appointment_event_channel [not null, note: 'Canal']
  author text [not null, note: 'Autor']
  previous_status appointment_status [null, note: 'Estado anterior']
  new_status appointment_status [null, note: 'Estado nuevo']
  reason text [null, note: 'Motivo']
  related_appointment_id uuid [null, ref: > appointments.id, note: 'Turno relacionado']
  notification notification_type [null, note: 'Notificación']
  failure_cause appointment_event_failure_cause [null, note: 'Causa de no entrega']
  client_data jsonb [null, note: 'Datos del cliente · dato personal']
  created_at timestamptz [not null, default: `now()`]

  indexes {
    (appointment_id, occurred_at)
    related_appointment_id
  }
  Note: 'Entidad: Evento de turno — historial inmutable de cada turno (INV-05, INV-06)'
}

// módulo notifications
Table notification_outbox {
  id uuid [pk, default: `uuidv7()`]
  appointment_id uuid [not null, ref: > appointments.id, note: 'NOT-01..06: turno del que se arma el email al enviarlo']
  type notification_type [not null, note: 'NOT-01..06: qué notificación es']
  status notification_outbox_status [not null, default: 'pending', note: 'NOT-E1, NOT-E2, NOT-E3']
  attempts integer [not null, default: 0, note: 'NOT-E1: intentos hechos, hasta los reintentos de envío de email']
  next_attempt_at timestamptz [not null, default: `now()`, note: 'NOT-E1: espaciado 1, 5, 15, 30 y 60 minutos (DEC-T09)']
  sent_at timestamptz [null, note: 'NOT-E1: aceptado por el servidor SMTP']
  last_error text [null, note: 'NOT-E2, NOT-E3: último error del servidor SMTP']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    appointment_id
    (status, next_attempt_at)
  }
  Note: 'Técnica: notificaciones pendientes, escritas en la misma transacción que el cambio del turno (NOT-E1, NOT-E2, NOT-E3, DEC-T06)'
}
```

Todas las claves foráneas son `ON DELETE RESTRICT, ON UPDATE RESTRICT`, salvo `admin_sessions.admin_account_id`, que es `ON DELETE CASCADE`: las sesiones se van con la cuenta (ACC-03).

## Restricciones que DBML no expresa

| Nombre | Tabla | Tipo | Definición | Garantía |
|---|---|---|---|---|
| btree_gist | — | función | `CREATE EXTENSION IF NOT EXISTS btree_gist` | INV-01, INV-07 |
| appointments_inv01_no_overlap | appointments | exclusión | `EXCLUDE USING gist (professional_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status <> 'cancelled')` | INV-01 |
| availability_slots_inv07_no_overlap | availability_slots | exclusión | `EXCLUDE USING gist (professional_id WITH =, weekday WITH =, tsrange(date '2000-01-01' + start_time, date '2000-01-01' + end_time, '[)') WITH &&)` | INV-07 |
| appointment_events_inv05_append_only | appointment_events | función | Trigger `BEFORE UPDATE OR DELETE`: rechaza todo DELETE y todo UPDATE que cambie una columna distinta de `client_data` | INV-05 |
| appointments_notify_change | appointments | función | Trigger `AFTER INSERT OR UPDATE`: `pg_notify('appointments_changed', id)` para la agenda en tiempo real | AGE-04 |
| set_updated_at | todas salvo appointment_events | función | Trigger `BEFORE UPDATE` que pone `updated_at = now()` | Convención de auditoría |
| professionals_cat01_name_unique | professionals | único parcial | Índice único sobre `lower(name)` | CAT-01 |
| services_cat05_name_unique | services | único parcial | Índice único sobre `lower(name)` | CAT-05 |
| professionals_name_length | professionals | chequeo | `char_length(name) BETWEEN 1 AND 100` | Nombre (de 1 a 100 caracteres) |
| services_name_length | services | chequeo | `char_length(name) BETWEEN 1 AND 100` | Nombre (de 1 a 100 caracteres) |
| services_duration_positive | services | chequeo | `duration_minutes > 0`. El múltiplo de la **granularidad de la grilla** y el máximo los valida api (CAT-E2): son parámetros de despliegue | CAT-06 |
| services_price_non_negative | services | chequeo | `price_cents IS NULL OR price_cents >= 0` | CAT-05 |
| admin_accounts_failed_attempts_non_negative | admin_accounts | chequeo | `failed_login_attempts >= 0` | Intentos fallidos consecutivos |
| availability_slots_end_after_start | availability_slots | chequeo | `end_time > start_time` | CAT-E3 |
| time_blocks_end_after_start | time_blocks | chequeo | `ends_at > starts_at` | CAT-E4 |
| time_blocks_scope_professional | time_blocks | chequeo | `(scope = 'professional') = (professional_id IS NOT NULL)` | Profesional (solo si Alcance es PROFESIONAL) |
| time_blocks_reason_length | time_blocks | chequeo | `char_length(reason) BETWEEN 1 AND 200` | Motivo (de 1 a 200 caracteres) |
| appointments_ends_at_derived | appointments | chequeo | `ends_at = starts_at + make_interval(mins => duration_minutes)` | Fin (derivado), INV-01 |
| appointments_duration_positive | appointments | chequeo | `duration_minutes > 0` | Duración |
| appointments_cancellation_reason_required | appointments | chequeo | `(status = 'cancelled') = (cancellation_reason IS NOT NULL)` y `char_length(cancellation_reason) <= 500` | Motivo de cancelación (solo si CANCELADO) |
| appointments_identity_key_anonymized | appointments | chequeo | `anonymized = (identity_key IS NULL)` | Clave de identidad (vacía si anonimizado), RET-03 |
| appointments_identity_key_lowercase | appointments | chequeo | `identity_key = lower(identity_key)` | RES-10 |
| appointments_client_name_length | appointments | chequeo | `anonymized OR char_length(client_name) BETWEEN 2 AND 100` | Nombre del cliente (de 2 a 100 caracteres) |
| appointments_not_own_original | appointments | chequeo | `original_appointment_id IS NULL OR original_appointment_id <> id` | INV-04 |
| appointment_events_type_fields | appointment_events | chequeo | `previous_status` y `new_status` no nulos si y solo si `type = 'status_changed'`; `reason` no nulo si y solo si `new_status = 'cancelled'`; `related_appointment_id` no nulo si y solo si `type = 'rescheduled'`; `notification` y `failure_cause` no nulos si y solo si `type = 'email_not_delivered'`; `client_data` no nulo si y solo si `type = 'created'` | Obligatoriedad condicional de Evento de turno |
| notification_outbox_attempts_non_negative | notification_outbox | chequeo | `attempts >= 0` | NOT-E1 |
| pii_comments | appointments, appointment_events | función | `COMMENT ON COLUMN … IS '[pii] …'` en `client_name`, `client_phone`, `client_email`, `identity_key` y `client_data` | NFR-07, RET-03 |

## Atributos derivados

| Entidad | Atributo | Se guarda | Por |
|---|---|---|---|
| Turno | Fin | columna `ends_at` | INV-01 |
| Turno | Clave de identidad | columna `identity_key` | INV-02, INV-08 |
| Turno | Token vigente | no: se calcula de `status` y `starts_at` | — |
| Turno | Destacado | no: se calcula con bloqueos y franjas al leer la agenda | — |
| Turno | Turno sucesor | no: se lee por `original_appointment_id` | — |
