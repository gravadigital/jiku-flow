---
created: 2026-10-10
last_updated: 2026-10-10
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
| Concurrencia | No aplica: los conflictos se resuelven con bloqueos de fila (Garantías) | Columna version en turnos |
| Multi-tenancy | No aplica: un solo consultorio | — |
| Historial | Evento de turno, para los turnos; nada más | Auditoría por trigger en todas las tablas |
| Borrado | No aplica | deleted_at |
| Moneda | Una sola: pesos argentinos, sin columna de moneda | Columna price_currency |
| Tokens reenviados | El token de cancelación se guarda también cifrado, con una clave fuera de la base, para armar el link del recordatorio (NOT-06) | Un token nuevo en cada email |

## Esquema

```dbml
Enum availability_slot_weekday {
  monday [note: 'lunes']
  tuesday [note: 'martes']
  wednesday [note: 'miércoles']
  thursday [note: 'jueves']
  friday [note: 'viernes']
  saturday [note: 'sábado']
  sunday [note: 'domingo']
}

Enum time_block_scope {
  one_professional [note: 'un profesional']
  all [note: 'todos']
}

Enum appointment_status {
  booked [note: 'RESERVADO']
  attended [note: 'ATENDIDO']
  no_show [note: 'AUSENTE']
  cancelled [note: 'CANCELADO']
}

Enum appointment_origin {
  public [note: 'público']
  panel [note: 'panel']
}

Enum appointment_event_type {
  created [note: 'creación']
  status_changed [note: 'cambio de estado']
  rescheduled [note: 'reprogramación']
  notification_discarded [note: 'notificación descartada']
}

Enum appointment_event_channel {
  public [note: 'público']
  panel [note: 'panel']
  system [note: 'sistema']
}

Enum pending_notification_status {
  pending [note: 'pendiente']
  sent [note: 'enviada']
  discarded [note: 'descartada']
}

// módulo access
Table admin_accounts {
  id uuid [pk, default: `uuidv7()`]
  username text [not null, unique, note: 'Usuario']
  password_hash text [not null, note: 'Contraseña']
  failed_attempts integer [not null, default: 0, note: 'Intentos fallidos']
  locked_until timestamptz [null, note: 'Bloqueada hasta']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Cuenta de administrador — credenciales del panel; las crea y elimina infraestructura'
}

// módulo catalog
Table professionals {
  id uuid [pk, default: `uuidv7()`]
  name text [not null, note: 'Nombre']
  active boolean [not null, default: true, note: 'Activo']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Profesional — se desactiva, nunca se elimina'
}

Table services {
  id uuid [pk, default: `uuidv7()`]
  name text [not null, note: 'Nombre']
  duration_minutes integer [not null, note: 'Duración']
  price_cents bigint [null, note: 'Precio informativo']
  active boolean [not null, default: true, note: 'Activo']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Servicio — se desactiva, nunca se elimina'
}

Table professional_services {
  id uuid [pk, default: `uuidv7()`]
  professional_id uuid [not null, ref: > professionals.id, note: 'Profesional']
  service_id uuid [not null, ref: > services.id, note: 'Servicio']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    (professional_id, service_id) [unique, name: 'professional_services_unique_pair']
  }
  Note: 'Entidad: Asignación — qué servicios presta cada profesional; se elimina al desasignar'
}

Table availability_slots {
  id uuid [pk, default: `uuidv7()`]
  professional_id uuid [not null, ref: > professionals.id, note: 'Profesional']
  weekday availability_slot_weekday [not null, note: 'Día de la semana']
  start_time time [not null, note: 'Desde']
  end_time time [not null, note: 'Hasta']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Disponibilidad semanal — franjas de atención por día de la semana'
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
  Note: 'Entidad: Bloqueo — feriados y licencias; se elimina, nunca se edita'
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
  identity_key text [not null, note: 'Clave de identidad · dato personal']
  status appointment_status [not null, default: 'booked', note: 'Estado']
  origin appointment_origin [not null, note: 'Origen']
  cancellation_reason text [null, note: 'Motivo de cancelación']
  cancel_token_hash text [not null, unique, note: 'Token de cancelación']
  cancel_token_encrypted bytea [not null, note: 'Token de cancelación · cifrado para el recordatorio (NOT-06)']
  original_appointment_id uuid [null, unique, ref: > appointments.id, note: 'Turno original · INV-04']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    identity_key [name: 'appointments_identity_key']
    (professional_id, starts_at) [name: 'appointments_professional_day']
  }
  Note: 'Entidad: Turno — reserva de un horario con un profesional y un servicio; nunca se elimina, se anonimiza'
}

Table appointment_events {
  id uuid [pk, default: `uuidv7()`]
  appointment_id uuid [not null, ref: > appointments.id, note: 'Turno']
  type appointment_event_type [not null, note: 'Tipo']
  previous_status appointment_status [null, note: 'Estado anterior']
  new_status appointment_status [null, note: 'Estado nuevo']
  detail text [null, note: 'Detalle · dato personal']
  author text [not null, note: 'Autor']
  channel appointment_event_channel [not null, note: 'Canal']
  occurred_at timestamptz [not null, note: 'Fecha y hora']
  created_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Evento de turno — historial de solo inserción (INV-05)'
}

// módulo notifications
Table pending_notifications {
  id uuid [pk, default: `uuidv7()`]
  appointment_id uuid [not null, ref: > appointments.id, note: 'NOT-E1']
  notification text [not null, note: 'NOT-E1: NOT-01 a NOT-06']
  recipient_email text [not null, note: 'NOT-E1 · dato personal']
  status pending_notification_status [not null, default: 'pending', note: 'NOT-E1']
  attempts integer [not null, default: 0, note: 'NOT-E1']
  next_attempt_at timestamptz [not null, default: `now()`, note: 'NOT-E1']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    (status, next_attempt_at) [name: 'pending_notifications_due']
  }
  Note: 'Técnica: cola de notificaciones pendientes, con reintentos (NOT-E1)'
}
```

## Restricciones que DBML no expresa

| Nombre | Tabla | Tipo | Definición | Garantía |
|---|---|---|---|---|
| appointments_inv01_no_overlap | appointments | exclusión | `EXCLUDE USING gist (professional_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status <> 'cancelled')`; requiere la extensión `btree_gist` | INV-01 |
| appointments_ends_at_consistent | appointments | chequeo | `ends_at = starts_at + duration_minutes * interval '1 minute'` | Fin (Inicio + Duración) |
| appointments_cancellation_reason_required | appointments | chequeo | `cancellation_reason IS NOT NULL` si y solo si `status = 'cancelled'` | Motivo de cancelación (solo si CANCELADO) |
| appointment_events_status_change | appointment_events | chequeo | `previous_status` y `new_status` no nulos si y solo si `type = 'status_changed'` | Estado anterior y Estado nuevo (solo si cambio de estado) |
| appointment_events_inv05_insert_only | appointment_events | permiso | El usuario de base de la aplicación tiene solo `INSERT` y `SELECT` sobre la tabla | INV-05 |
| appointment_events_inv05_anonymize | appointment_events | función | `anonymize_client(identity_key)`: reemplaza por «Anonimizado» los datos personales de los turnos y eventos de una clave; es la única forma de modificar eventos | INV-05 |
| availability_slots_end_after_start | availability_slots | chequeo | `end_time > start_time` | Hasta (posterior a Desde) |
| availability_slots_no_overlap | availability_slots | exclusión | `EXCLUDE USING gist (professional_id WITH =, weekday WITH =, tsrange('2000-01-01'::date + start_time, '2000-01-01'::date + end_time) WITH &&)` | CAT-E2 |
| time_blocks_ends_after_starts | time_blocks | chequeo | `ends_at > starts_at` | CAT-E3 |
| set_updated_at | todas las tablas con `updated_at` | función | Trigger `BEFORE UPDATE` que asigna `updated_at = now()` | Convención de auditoría |
| time_blocks_professional_by_scope | time_blocks | chequeo | `professional_id IS NOT NULL` si y solo si `scope = 'one_professional'` | Profesional (solo si Alcance es un profesional) |

## Atributos derivados

| Entidad | Atributo | Se guarda | Por |
|---|---|---|---|
| Turno | Fin | columna `ends_at` | INV-01 |
| Turno | Clave de identidad | columna `identity_key` | INV-02 |
