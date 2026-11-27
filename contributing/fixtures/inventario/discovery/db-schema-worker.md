---
created: 2026-11-07
last_updated: 2026-11-07
status: closed
service: worker
technical_analysis: _jflow/discovery/technical-analysis.md
domain_analysis: _jflow/discovery/domain-analysis.md
---

# Esquema de base — worker

## Base
| Servicio dueño | Motor | Usada por |
|---|---|---|
| worker | PostgreSQL | — |

## Decisiones del esquema
| Decisión | Valor | Descartado |
|---|---|---|
| Concurrencia | No aplica: cada aviso y cada email los toma una sola revisión, con bloqueo de fila (`FOR UPDATE SKIP LOCKED`) | Columna version |
| Multi-tenancy | No aplica: una sola oficina | tenant_id en cada tabla |
| Historial | No aplica: los avisos y los emails terminados quedan como registro | Auditoría por trigger |
| Borrado | No aplica | deleted_at |
| Datos personales en la cola de emails | El destinatario y el contenido se guardan solo mientras el email está pendiente; al enviarse, fallar o rebotar se borran y queda el registro (DEC-T07, NOT-E1, NOT-E2) | Conservarlos y anonimizarlos con RET |

## Esquema

```dbml
Enum reminder_kind {
  due_soon [note: 'PREVIO']
  due_today [note: 'VENCE_HOY']
}

Enum reminder_status {
  scheduled [note: 'PROGRAMADO']
  sent [note: 'ENVIADO']
  cancelled [note: 'CANCELADO']
  discarded [note: 'DESCARTADO']
}

Enum outbound_email_kind {
  due_soon [note: 'NOT-01']
  due_today_employee [note: 'NOT-02']
  due_today_admin [note: 'NOT-03']
  invitation [note: 'NOT-04']
  password_reset [note: 'NOT-05']
}

Enum outbound_email_status {
  pending [note: 'NOT-E1: pendiente de envío o de reintento']
  sent [note: 'NOT-E1: enviado']
  failed [note: 'NOT-E1: fallido tras agotar los reintentos']
  bounced [note: 'NOT-E2: rebotado']
}

// módulo reminders
Table reminders {
  id uuid [pk, default: `uuidv7()`]
  loan_id uuid [not null, note: 'Préstamo']
  kind reminder_kind [not null, note: 'Tipo']
  due_date date [not null, note: 'Vencimiento']
  scheduled_at timestamptz [not null, note: 'Programado para']
  status reminder_status [not null, default: 'scheduled', note: 'Estado']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    loan_id
    (status, scheduled_at)
  }
  Note: 'Entidad: Aviso programado — aviso previo o de «vence hoy» de un préstamo. loan_id es el id del préstamo en la base de la api: sin clave foránea, porque está en otra base'
}

// módulo notifications
Table outbound_emails {
  id uuid [pk, default: `uuidv7()`]
  kind outbound_email_kind [not null, note: 'NOT-01..05']
  reminder_id uuid [null, ref: > reminders.id, note: 'VEN-01, VEN-02']
  account_id uuid [null, note: 'NOT-04, NOT-05, NOT-E2']
  recipient text [null, note: 'NOT-E1 · dato personal']
  content jsonb [null, note: 'NOT-E1 · dato personal']
  status outbound_email_status [not null, default: 'pending', note: 'NOT-E1, NOT-E2']
  attempts integer [not null, default: 0, note: 'NOT-E1']
  next_attempt_at timestamptz [null, note: 'NOT-E1']
  last_error text [null, note: 'NOT-E1, NOT-E2']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    reminder_id
    account_id
    (status, next_attempt_at)
  }
  Note: 'Técnica: cola de emails con reintentos (Garantías: NOT-E1 Reintento de email). account_id es el id de la cuenta en la base de la api, sin clave foránea. El contenido lleva el link de CRED-02 o CRED-03 mientras está pendiente'
}

Table processed_events {
  id uuid [pk, note: 'Consumo de eventos']
  created_at timestamptz [not null, default: `now()`]
  Note: 'Técnica: id de cada evento de JetStream ya procesado, para consumir de forma idempotente (Garantías: Consumo de eventos). Solo inserción'
}
```

## Restricciones que DBML no expresa
| Nombre | Tabla | Tipo | Definición | Garantía |
|---|---|---|---|---|
| reminders_inv05_one_per_due_date | reminders | único parcial | `UNIQUE (loan_id, due_date, kind) WHERE status <> 'cancelled'` | INV-05 |
| outbound_emails_pii_only_pending | outbound_emails | chequeo | `(status = 'pending') = (recipient IS NOT NULL AND content IS NOT NULL)` | Datos personales en la cola de emails (DEC-T07) |
| outbound_emails_next_attempt_pending | outbound_emails | chequeo | `status = 'pending' OR next_attempt_at IS NULL` | NOT-E1 |
| outbound_emails_attempts_non_negative | outbound_emails | chequeo | `attempts >= 0` | NOT-E1 |
| outbound_emails_reference | outbound_emails | chequeo | `(kind IN ('due_soon', 'due_today_employee', 'due_today_admin')) = (reminder_id IS NOT NULL)` y `(kind IN ('invitation', 'password_reset')) = (account_id IS NOT NULL)` | NOT-01..05 |
| set_updated_at | reminders, outbound_emails | función | trigger `BEFORE UPDATE` que mantiene `updated_at` | Convención de auditoría |

## Atributos derivados
| Entidad | Atributo | Se guarda | Por |
|---|---|---|---|
| — | — | no hay atributos derivados en Aviso programado | — |
