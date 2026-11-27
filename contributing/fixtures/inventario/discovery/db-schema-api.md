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
| Concurrencia | No aplica: los conflictos se resuelven con bloqueos de fila (Garantías); en una edición simultánea de datos de un equipo, gana la última | Columna version en devices |
| Multi-tenancy | No aplica: una sola oficina | tenant_id en cada tabla |
| Historial | No aplica: los préstamos son el historial de cada equipo | Auditoría por trigger de equipos y cuentas |
| Borrado | No aplica: las cuentas se desactivan y se anonimizan, los equipos se dan de baja y los préstamos se conservan | deleted_at |
| Tokens reenviados | Un token nuevo en cada envío: reenviar la invitación o pedir otro restablecimiento reemplaza el hash y el anterior deja de servir (ACC-03, CRED-03) | — |

## Esquema

```dbml
Enum account_role {
  employee [note: 'EMPLEADO']
  admin [note: 'ADMINISTRADOR']
}

Enum account_status {
  invited [note: 'INVITADA']
  active [note: 'ACTIVA']
  deactivated [note: 'DESACTIVADA']
  anonymized [note: 'ANONIMIZADA']
}

Enum device_type {
  notebook [note: 'NOTEBOOK']
  monitor [note: 'MONITOR']
  keyboard [note: 'TECLADO']
  mouse [note: 'MOUSE']
  camera [note: 'CAMARA']
  other [note: 'OTRO']
}

Enum device_status {
  available [note: 'DISPONIBLE']
  on_loan [note: 'PRESTADO']
  in_repair [note: 'EN_REPARACION']
  retired [note: 'DADO_DE_BAJA']
}

Enum loan_status {
  active [note: 'ACTIVO']
  overdue [note: 'VENCIDO']
  returned [note: 'DEVUELTO']
}

// módulo access
Table accounts {
  id uuid [pk, default: `uuidv7()`]
  name text [not null, note: 'Nombre · dato personal']
  email text [not null, unique, note: 'Email · dato personal']
  role account_role [not null, note: 'Rol']
  status account_status [not null, default: 'invited', note: 'Estado']
  password_hash text [null, note: 'Contraseña']
  invitation_token_hash text [null, unique, note: 'Token de invitación']
  invitation_expires_at timestamptz [null, note: 'Vencimiento de la invitación']
  password_reset_token_hash text [null, unique, note: 'Token de recuperación']
  password_reset_expires_at timestamptz [null, note: 'Vencimiento del token de recuperación']
  failed_login_attempts integer [not null, default: 0, note: 'Intentos fallidos seguidos']
  locked_until timestamptz [null, note: 'Bloqueada hasta']
  deactivated_at timestamptz [null, note: 'Fecha de desactivación']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Cuenta — cuenta de un empleado o de un administrador, con sus credenciales. Al anonimizarse, nombre y email se reemplazan por valores únicos sin datos personales (RET-01, RET-03)'
}

Table sessions {
  id uuid [pk, default: `uuidv7()`]
  account_id uuid [not null, ref: > accounts.id, note: 'CRED-01']
  token_hash text [not null, unique, note: 'CRED-01']
  last_activity_at timestamptz [not null, note: 'ACC-05']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    account_id
  }
  Note: 'Técnica: sesión de CRED-01; vence tras la inactividad máxima de sesión y se borra al revocarse (ACC-05, ACC-06, ACC-10, ACC-11, ACC-13)'
}

// módulo inventory
Table devices {
  id uuid [pk, default: `uuidv7()`]
  type device_type [not null, note: 'Tipo']
  brand text [not null, note: 'Marca']
  model text [not null, note: 'Modelo']
  serial_number text [not null, unique, note: 'Número de serie']
  status device_status [not null, default: 'available', note: 'Estado']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    (status, type)
  }
  Note: 'Entidad: Equipo — equipo que la oficina presta'
}

// módulo loans
Table loans {
  id uuid [pk, default: `uuidv7()`]
  device_id uuid [not null, ref: > devices.id, note: 'Equipo']
  account_id uuid [not null, ref: > accounts.id, note: 'Empleado']
  started_at timestamptz [not null, note: 'Inicio']
  due_date date [not null, note: 'Vencimiento']
  original_due_date date [null, note: 'Vencimiento original']
  returned_at timestamptz [null, note: 'Devolución']
  status loan_status [not null, default: 'active', note: 'Estado']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    device_id
    account_id
    (status, due_date)
  }
  Note: 'Entidad: Préstamo — préstamo de un equipo a un empleado'
}

// técnica
Table outbox_events {
  id uuid [pk, default: `uuidv7()`]
  subject text [not null, note: 'Publicación de eventos']
  payload jsonb [not null, note: 'Publicación de eventos · dato personal']
  created_at timestamptz [not null, default: `now()`]
  Note: 'Técnica: outbox de eventos hacia NATS JetStream; cada fila se borra al publicarse (Garantías: Publicación de eventos). El payload de los eventos de cuenta lleva el email y el link'
}
```

## Restricciones que DBML no expresa
| Nombre | Tabla | Tipo | Definición | Garantía |
|---|---|---|---|---|
| loans_inv01_one_open_per_device | loans | único parcial | `UNIQUE (device_id) WHERE status IN ('active', 'overdue')` | INV-01 |
| accounts_email_lowercase | accounts | chequeo | `email = lower(email)`; con el índice único de `email` | ACC-17 |
| devices_serial_number_key | devices | único | índice único de `serial_number` (en el DBML) | EQU-03 |
| accounts_password_required | accounts | chequeo | `status <> 'active' OR password_hash IS NOT NULL` | Contraseña (solo si ya la definió) |
| accounts_invitation_required | accounts | chequeo | `(status = 'invited') = (invitation_token_hash IS NOT NULL AND invitation_expires_at IS NOT NULL)` | Token y vencimiento de la invitación (solo si INVITADA) |
| accounts_password_reset_pair | accounts | chequeo | `(password_reset_token_hash IS NULL) = (password_reset_expires_at IS NULL)` | Vencimiento del token de recuperación |
| accounts_deactivated_at_required | accounts | chequeo | `status <> 'deactivated' OR deactivated_at IS NOT NULL` | Fecha de desactivación (solo si DESACTIVADA) |
| accounts_failed_attempts_non_negative | accounts | chequeo | `failed_login_attempts >= 0` | Intentos fallidos seguidos |
| loans_returned_at_required | loans | chequeo | `(status = 'returned') = (returned_at IS NOT NULL)` | Devolución (solo si DEVUELTO) |
| loans_extension_after_original | loans | chequeo | `original_due_date IS NULL OR due_date > original_due_date` | PRE-09 |
| set_updated_at | accounts, sessions, devices, loans | función | trigger `BEFORE UPDATE` que mantiene `updated_at` | Convención de auditoría |

## Atributos derivados
| Entidad | Atributo | Se guarda | Por |
|---|---|---|---|
| Préstamo | Extendido | no: se calcula (`original_due_date IS NOT NULL`) | — |
