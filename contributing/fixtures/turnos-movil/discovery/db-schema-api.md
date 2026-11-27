---
created: 2026-11-07
last_updated: 2026-11-07
status: closed
service: api
technical_analysis: _jflow/discovery/technical-analysis.md
domain_analysis: _jflow/discovery/domain-analysis.md
---

# Esquema de base — api

## Base
| Servicio dueño | Motor | Usada por |
|---|---|---|
| api | PostgreSQL | — |

## Decisiones del esquema
| Decisión | Valor | Descartado |
|---|---|---|
| Concurrencia | No aplica: los conflictos se resuelven con las restricciones y los bloqueos de fila de Garantías | Columna version en servicios y peluqueros |
| Multi-tenancy | No aplica: una sola peluquería por instalación | Columna tenant_id en cada tabla |
| Historial | No aplica: el turno guarda su estado, quién lo canceló y el motivo; no se registra cada cambio | Tabla de eventos de turno; auditoría por trigger en todas las tablas |
| Borrado | No aplica: servicios y peluqueros se desactivan; la cuenta se borra físicamente con todo lo suyo (DEC-10) | deleted_at en cuentas |
| Moneda | Una sola: pesos argentinos, sin columna de moneda | Columna price_currency |
| Tokens reenviados | No aplica: el link de recuperación no se reenvía; cada pedido crea un token nuevo y se guarda solo su hash (ACC-08) | Guardar el token cifrado para reenviar el mismo link |

## Esquema

```dbml
Enum account_role {
  client [note: 'CLIENTE']
  owner [note: 'DUEÑA']
}

Enum password_reset_link_status {
  active [note: 'VIGENTE']
  used [note: 'USADO']
  replaced [note: 'REEMPLAZADO']
}

Enum working_hour_weekday {
  monday [note: 'LUNES']
  tuesday [note: 'MARTES']
  wednesday [note: 'MIÉRCOLES']
  thursday [note: 'JUEVES']
  friday [note: 'VIERNES']
  saturday [note: 'SÁBADO']
  sunday [note: 'DOMINGO']
}

Enum appointment_status {
  booked [note: 'RESERVADO']
  attended [note: 'ASISTIÓ']
  no_show [note: 'NO ASISTIÓ']
  cancelled [note: 'CANCELADO']
}

Enum appointment_cancelled_by {
  client [note: 'CLIENTE']
  salon [note: 'PELUQUERÍA']
}

// módulo access
Table accounts {
  id uuid [pk, default: `uuidv7()`]
  role account_role [not null, default: 'client', note: 'Rol']
  name text [not null, note: 'Nombre · dato personal']
  phone text [null, note: 'Teléfono · dato personal']
  email text [not null, unique, note: 'Email · dato personal · INV-04, ACC-E2']
  password_hash text [not null, note: 'Contraseña']
  failed_login_attempts integer [not null, default: 0, note: 'Intentos fallidos']
  locked_until timestamptz [null, note: 'Bloqueada hasta']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Cuenta — cuenta de un cliente o de la dueña, con sus credenciales'
}

Table sessions {
  id uuid [pk, default: `uuidv7()`]
  account_id uuid [not null, note: 'Cuenta']
  token_hash text [not null, unique, note: 'CRED-01']
  last_used_at timestamptz [not null, default: `now()`, note: 'Último uso']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Sesión — sesión abierta de una cuenta en un celular'
  Indexes {
    account_id
  }
}

Table password_reset_links {
  id uuid [pk, default: `uuidv7()`]
  account_id uuid [not null, note: 'Cuenta']
  token_hash text [not null, unique, note: 'CRED-02']
  expires_at timestamptz [not null, note: 'Vence']
  status password_reset_link_status [not null, default: 'active', note: 'Estado']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Link de recuperación — link enviado por email para elegir una contraseña nueva'
  Indexes {
    account_id
  }
}

// módulo catalog
Table services {
  id uuid [pk, default: `uuidv7()`]
  name text [not null, note: 'Nombre']
  duration_minutes integer [not null, note: 'Duración']
  price_cents bigint [not null, note: 'Precio']
  active boolean [not null, default: true, note: 'Activo']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Servicio — servicio que ofrece la peluquería'
}

Table stylists {
  id uuid [pk, default: `uuidv7()`]
  name text [not null, note: 'Nombre']
  active boolean [not null, default: true, note: 'Activo']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Peluquero — peluquero que atiende turnos'
}

Table stylist_services {
  id uuid [pk, default: `uuidv7()`]
  stylist_id uuid [not null, note: 'PEL-04']
  service_id uuid [not null, note: 'PEL-04']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Técnica: relación Peluquero–Servicio, qué servicios hace cada peluquero, sin repetidos (PEL-04)'
  Indexes {
    (stylist_id, service_id) [unique]
    service_id
  }
}

Table working_hours {
  id uuid [pk, default: `uuidv7()`]
  stylist_id uuid [not null, note: 'Peluquero']
  weekday working_hour_weekday [not null, note: 'Día de la semana']
  start_time time [not null, note: 'Hora de inicio']
  end_time time [not null, note: 'Hora de fin']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Franja — franja del horario semanal de un peluquero'
  Indexes {
    stylist_id
  }
}

// módulo scheduling
Table appointments {
  id uuid [pk, default: `uuidv7()`]
  account_id uuid [not null, note: 'Cliente']
  service_id uuid [not null, note: 'Servicio']
  stylist_id uuid [not null, note: 'Peluquero']
  starts_at timestamptz [not null, note: 'Inicio']
  duration_minutes integer [not null, note: 'Duración']
  ends_at timestamptz [not null, note: 'Fin']
  price_cents bigint [not null, note: 'Precio']
  status appointment_status [not null, default: 'booked', note: 'Estado']
  cancelled_by appointment_cancelled_by [null, note: 'Cancelado por']
  cancellation_reason text [null, note: 'Motivo de cancelación']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Turno — reserva de un horario de un cliente con un peluquero para un servicio'
  Indexes {
    account_id
    service_id
    (stylist_id, starts_at)
    starts_at
  }
}

Ref: sessions.account_id > accounts.id [delete: cascade]
Ref: password_reset_links.account_id > accounts.id [delete: cascade]
Ref: appointments.account_id > accounts.id [delete: cascade]
Ref: stylist_services.stylist_id > stylists.id [delete: restrict]
Ref: stylist_services.service_id > services.id [delete: restrict]
Ref: working_hours.stylist_id > stylists.id [delete: restrict]
Ref: appointments.service_id > services.id [delete: restrict]
Ref: appointments.stylist_id > stylists.id [delete: restrict]
```

## Restricciones que DBML no expresa
| Nombre | Tabla | Tipo | Definición | Garantía |
|---|---|---|---|---|
| btree_gist | — | función | `CREATE EXTENSION IF NOT EXISTS btree_gist`, para las restricciones de exclusión con igualdad sobre uuid y enum | INV-01, INV-03 |
| set_updated_at | todas | función | Función `set_updated_at()` y un trigger `BEFORE UPDATE` por tabla que actualiza `updated_at` | Convención de auditoría |
| accounts_email_lowercase | accounts | chequeo | `email = lower(email)`: el email se normaliza al escribirlo | INV-04, ACC-02 |
| accounts_name_length | accounts | chequeo | `char_length(name) BETWEEN 1 AND 100` | Nombre (hasta 100 caracteres) |
| accounts_phone_required_for_client | accounts | chequeo | `role <> 'client' OR phone IS NOT NULL` | Teléfono (solo si CLIENTE) |
| accounts_phone_format | accounts | chequeo | `phone IS NULL OR phone ~ '^\+?[0-9]{8,15}$'` | Teléfono (de 8 a 15 dígitos, `+` opcional) |
| accounts_failed_login_attempts_nonnegative | accounts | chequeo | `failed_login_attempts >= 0` | Intentos fallidos (entero ≥ 0) |
| password_reset_links_inv05_one_active | password_reset_links | único parcial | `UNIQUE (account_id) WHERE status = 'active'` | INV-05 |
| services_inv04_name_unique | services | único parcial | `UNIQUE (lower(name))`: único sin distinguir mayúsculas, conservando cómo se escribió para mostrarlo | INV-04, CAT-04 |
| services_name_length | services | chequeo | `char_length(name) BETWEEN 1 AND 60` | Nombre (hasta 60 caracteres) |
| services_duration_positive | services | chequeo | `duration_minutes > 0`. El rango y el múltiplo de la grilla dependen de parámetros y los valida api.catalog | Duración (CAT-02) |
| services_price_whole_pesos | services | chequeo | `price_cents > 0 AND price_cents % 100 = 0` | Precio (pesos enteros, mayor que cero) |
| stylists_inv04_name_unique | stylists | único parcial | `UNIQUE (lower(name))`: único sin distinguir mayúsculas, conservando cómo se escribió | INV-04, PEL-02 |
| stylists_name_length | stylists | chequeo | `char_length(name) BETWEEN 1 AND 60` | Nombre (hasta 60 caracteres) |
| timerange | working_hours | función | `CREATE TYPE timerange AS RANGE (subtype = time)`, para comparar franjas | INV-03 |
| working_hours_time_order | working_hours | chequeo | `start_time < end_time` | Hora de fin (posterior a la de inicio) |
| working_hours_inv03_no_overlap | working_hours | exclusión | `EXCLUDE USING gist (stylist_id WITH =, weekday WITH =, timerange(start_time, end_time) WITH &&)` | INV-03 |
| appointments_inv01_no_overlap | appointments | exclusión | `EXCLUDE USING gist (stylist_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status <> 'cancelled')` | INV-01, RES-E1 |
| appointments_ends_at_consistent | appointments | chequeo | `ends_at = starts_at + duration_minutes * interval '1 minute'` | Fin (Inicio más Duración) |
| appointments_duration_positive | appointments | chequeo | `duration_minutes > 0` | Duración |
| appointments_price_whole_pesos | appointments | chequeo | `price_cents > 0 AND price_cents % 100 = 0` | Precio |
| appointments_cancelled_by_required | appointments | chequeo | `(status = 'cancelled') = (cancelled_by IS NOT NULL)` | Cancelado por (solo si CANCELADO) |
| appointments_cancellation_reason_rules | appointments | chequeo | `(cancelled_by IS NOT NULL OR cancellation_reason IS NULL) AND (cancelled_by IS DISTINCT FROM 'salon' OR cancellation_reason IS NOT NULL)` | Motivo de cancelación (solo si cancelado por PELUQUERÍA; opcional si por CLIENTE) |
| appointments_cancellation_reason_length | appointments | chequeo | `cancellation_reason IS NULL OR char_length(cancellation_reason) <= 200` | Motivo de cancelación (hasta 200 caracteres) |

INV-06 se implementa con las claves foráneas `ON DELETE CASCADE` desde `accounts` (bloque Ref del esquema); el resto de las garantías de la base están en esta tabla. Que el cliente de un turno tenga rol CLIENTE lo valida api.scheduling al reservar: una restricción de chequeo no puede leer otra tabla.

## Atributos derivados
| Entidad | Atributo | Se guarda | Por |
|---|---|---|---|
| Cuenta | Bloqueada | no: se calcula con `locked_until` | — |
| Sesión | Vencida | no: se calcula con `last_used_at` y la **duración de sesión sin uso** | — |
| Link de recuperación | Válido | no: se calcula con `status` y `expires_at` | — |
| Turno | Fin | columna `ends_at` | INV-01 |
| Turno | Próximo | no: se calcula con `status` y `starts_at` | — |
| Turno | Motivos de destacado | no: se calcula al armar la agenda | — |
