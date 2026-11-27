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
| Concurrencia | No aplica: los conflictos se resuelven con bloqueos de fila y restricciones (Garantías); en destinos gana la última modificación (DES-E5) | Columna version en destinos |
| Multi-tenancy | El cliente es el inquilino: `client_id` en destinos, eventos y entregas, primero en sus índices y únicos compuestos. El alcance lo aplica api (ACC-09), sin row-level security | Row-level security por cliente; no aplica |
| Historial | Solo los intentos de entrega (`delivery_attempts`) | Auditoría por trigger de clientes, tokens y destinos |
| Borrado | No aplica: el borrado es físico; un destino borrado deja una copia de su tipo y su dirección en sus entregas, y los eventos se borran por retención | deleted_at en destinos |
| Tokens reenviados | El secreto de firma de un webhook se lee en cada envío: se guarda cifrado con AES-GCM, con la clave en una variable de entorno de api. El token de API no se reentrega: solo su hash | Guardar el secreto en claro |

## Esquema

```dbml
Enum client_status {
  active [note: 'ACTIVO']
  deactivated [note: 'DESACTIVADO']
}

Enum api_token_status {
  active [note: 'VIGENTE']
  revoked [note: 'REVOCADO']
}

Enum destination_type {
  webhook [note: 'WEBHOOK']
  email [note: 'EMAIL']
}

Enum destination_status {
  active [note: 'ACTIVO']
  paused [note: 'PAUSADO']
}

Enum delivery_status {
  in_progress [note: 'EN_CURSO']
  delivered [note: 'ENTREGADA']
  failed [note: 'FALLIDA']
  exhausted [note: 'AGOTADA']
  discarded [note: 'DESCARTADA']
}

Enum delivery_attempt_result {
  success [note: 'ÉXITO']
  transient_failure [note: 'FALLA_TRANSITORIA']
  permanent_failure [note: 'FALLA_DEFINITIVA']
}

Enum delivery_attempt_failure_reason {
  no_response [note: 'SIN_RESPUESTA']
  connection_error [note: 'ERROR_DE_CONEXION']
  http_response [note: 'RESPUESTA_HTTP']
  smtp_rejection [note: 'RECHAZO_SMTP']
}

// módulo access
Table clients {
  id uuid [pk, default: `uuidv7()`]
  name text [not null, unique, note: 'Nombre · ACC-E1']
  status client_status [not null, default: 'active', note: 'Estado']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  Note: 'Entidad: Cliente — sistema interno o cliente externo que usa la API; su fecha de alta es created_at (ACC-05)'
}

Table api_tokens {
  id uuid [pk, default: `uuidv7()`]
  client_id uuid [not null, ref: > clients.id, note: 'Cliente']
  label text [not null, note: 'Etiqueta']
  token_hash text [not null, unique, note: 'Token · se guarda solo su SHA-256 (CRED-01)']
  token_prefix text [not null, note: 'Prefijo']
  status api_token_status [not null, default: 'active', note: 'Estado']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    (client_id, label) [unique, note: 'ACC-E6']
  }
  Note: 'Entidad: Token de API — credencial de un cliente (CRED-01); su fecha de emisión es created_at (ACC-04)'
}

Table rate_limit_windows {
  id uuid [pk, default: `uuidv7()`]
  api_token_id uuid [not null, ref: > api_tokens.id, note: 'ACC-10']
  window_start timestamptz [not null, note: 'ACC-10: comienzo del minuto que cuenta']
  request_count integer [not null, note: 'ACC-10: pedidos hechos en ese minuto']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    (api_token_id, window_start) [unique, note: 'ACC-10']
  }
  Note: 'Técnica: contador del límite de pedidos por token, por token y minuto (ACC-10, DEC-T04)'
}

// módulo destinations
Table destinations {
  id uuid [pk, default: `uuidv7()`]
  client_id uuid [not null, ref: > clients.id, note: 'Cliente']
  type destination_type [not null, note: 'Tipo']
  url text [null, note: 'URL']
  email text [null, note: 'Dirección de email · dato personal']
  signing_secret_encrypted bytea [null, note: 'Secreto de firma · cifrado con AES-GCM (CRED-02)']
  status destination_status [not null, default: 'active', note: 'Estado']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    (client_id, url) [unique, note: 'INV-02, DES-E3']
    (client_id, email) [unique, note: 'INV-02, DES-E3']
    (client_id, id) [unique, note: 'INV-05: destino de la clave foránea compuesta de deliveries']
  }
  Note: 'Entidad: Destino — webhook o dirección de email de un cliente'
}

Table subscriptions {
  id uuid [pk, default: `uuidv7()`]
  destination_id uuid [not null, ref: > destinations.id, note: 'Destino']
  event_type text [not null, note: 'Tipo de evento']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    (destination_id, event_type) [unique]
    event_type [note: 'EVE-02: destinos suscritos a un tipo']
  }
  Note: 'Entidad: Suscripción — un tipo de evento al que está suscrito un destino'
}

// módulo events
Table events {
  id uuid [pk, default: `uuidv7()`]
  client_id uuid [not null, ref: > clients.id, note: 'Cliente']
  event_type text [not null, note: 'Tipo de evento']
  body jsonb [not null, note: 'Cuerpo · dato personal']
  idempotency_key text [null, note: 'Clave de idempotencia']
  published_at timestamptz [not null, default: `now()`, note: 'Fecha de publicación']
  created_at timestamptz [not null, default: `now()`]
  indexes {
    (client_id, published_at) [note: 'HIS-02: listado del más reciente al más antiguo']
    (client_id, event_type, published_at) [note: 'HIS-02: filtro por tipo']
    published_at [note: 'RET-01: eventos vencidos']
    (client_id, id) [unique, note: 'INV-05: destino de la clave foránea compuesta de deliveries']
  }
  Note: 'Entidad: Evento — evento publicado por un cliente; de solo inserción: nunca se modifica, solo lo borra la retención (RET-01, RET-02)'
}

Table idempotency_keys {
  id uuid [pk, default: `uuidv7()`]
  client_id uuid [not null, ref: > clients.id, note: 'INV-03']
  key text [not null, note: 'INV-03: la clave de idempotencia']
  event_id uuid [not null, ref: > events.id, note: 'INV-03: el evento que la usó']
  expires_at timestamptz [not null, note: 'INV-03: publicación + vigencia de la clave de idempotencia']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    (client_id, key) [unique, note: 'INV-03, EVE-E3']
    event_id
  }
  Note: 'Técnica: claves de idempotencia por cliente; una clave vencida se reemplaza en la transacción de la publicación nueva (INV-03, EVE-04, EVE-E4)'
}

// módulo delivery
Table deliveries {
  id uuid [pk, default: `uuidv7()`]
  client_id uuid [not null, ref: > clients.id, note: 'INV-05']
  event_id uuid [not null, note: 'Evento']
  destination_id uuid [null, note: 'Destino']
  destination_type destination_type [not null, note: 'Tipo de destino']
  destination_address text [not null, note: 'Dirección del destino · dato personal']
  status delivery_status [not null, default: 'in_progress', note: 'Estado']
  next_attempt_at timestamptz [null, note: 'Próximo intento']
  attempt_count integer [not null, default: 0, note: 'Cantidad de intentos']
  locked_until timestamptz [null, note: 'INV-06, DES-08: reserva de la entrega mientras una réplica la intenta']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  indexes {
    next_attempt_at [note: 'ENT-02..07, ENT-E1: entregas en curso vencidas (índice parcial, ver restricciones)']
    event_id
    destination_id
    (client_id, status) [note: 'HIS-02: filtro por resultado']
  }
  Note: 'Entidad: Entrega — un evento para un destino; es también la cola de entregas (DEC-T03, ENT-02..07, ENT-E1)'
}

Table delivery_attempts {
  id uuid [pk, default: `uuidv7()`]
  delivery_id uuid [not null, ref: > deliveries.id, note: 'Entrega']
  attempted_at timestamptz [not null, note: 'Fecha']
  sent_to text [not null, note: 'Enviado a · dato personal']
  result delivery_attempt_result [not null, note: 'Resultado']
  failure_reason delivery_attempt_failure_reason [null, note: 'Motivo de falla']
  response_code integer [null, note: 'Código de respuesta']
  response_body text [null, note: 'Respuesta']
  created_at timestamptz [not null, default: `now()`]
  indexes {
    (delivery_id, attempted_at)
  }
  Note: 'Entidad: Intento — un intento de entrega; de solo inserción (INV-08)'
}

Ref: deliveries.(client_id, event_id) > events.(client_id, id) [delete: cascade]
Ref: deliveries.(client_id, destination_id) > destinations.(client_id, id)
```

## Restricciones que DBML no expresa
| Nombre | Tabla | Tipo | Definición | Garantía |
|---|---|---|---|---|
| set_updated_at | todas las tablas con `updated_at` | función | Función `set_updated_at()` y un trigger `BEFORE UPDATE` por tabla | Convención de auditoría |
| api_tokens_client_fk | api_tokens | clave foránea | `client_id` → `clients(id)` `ON DELETE RESTRICT`: un cliente nunca se elimina, se desactiva | Baja de Cliente (ACC-07) |
| rate_limit_windows_token_fk | rate_limit_windows | clave foránea | `api_token_id` → `api_tokens(id)` `ON DELETE CASCADE` | ACC-10 |
| destinations_type_fields | destinations | chequeo | Si `type = 'webhook'`: `url` y `signing_secret_encrypted` no nulos y `email` nulo. Si `type = 'email'`: `email` no nulo, `url` y `signing_secret_encrypted` nulos | URL y Secreto de firma (solo si WEBHOOK); Dirección de email (solo si EMAIL) |
| destinations_url_https | destinations | chequeo | `url IS NULL OR url LIKE 'https:%'` | DES-01 |
| destinations_type_immutable | destinations | función | Trigger `BEFORE UPDATE` que rechaza el cambio de `type` | Tipo (no cambia después de crearlo) |
| subscriptions_destination_fk | subscriptions | clave foránea | `destination_id` → `destinations(id)` `ON DELETE CASCADE` | Baja de Suscripción (DES-08) |
| subscriptions_event_type_length | subscriptions | chequeo | `char_length(event_type) BETWEEN 1 AND 100` | Tipo de evento (hasta 100 caracteres) |
| events_event_type_length | events | chequeo | `char_length(event_type) BETWEEN 1 AND 100` | Tipo de evento (EVE-E2) |
| events_insert_only | events | permiso | El rol de la aplicación no tiene `UPDATE` sobre `events` | Cuerpo (no cambia) |
| idempotency_keys_event_fk | idempotency_keys | clave foránea | `event_id` → `events(id)` `ON DELETE CASCADE` | RET-01 |
| deliveries_inv05_event_fk | deliveries | clave foránea | `(client_id, event_id)` → `events(client_id, id)` `ON DELETE CASCADE` | INV-05, RET-01 |
| deliveries_inv05_destination_fk | deliveries | clave foránea | `(client_id, destination_id)` → `destinations(client_id, id)` `ON DELETE SET NULL (destination_id)`: al borrar el destino, la entrega queda sin destino y conserva su copia | INV-05, DES-08 |
| deliveries_next_attempt_required | deliveries | chequeo | `next_attempt_at IS NOT NULL` si y solo si `status = 'in_progress'` | Próximo intento (solo si EN_CURSO) |
| deliveries_due | deliveries | índice parcial | Índice (no único) sobre `next_attempt_at` `WHERE status = 'in_progress'` | ENT-02..07, ENT-E1 |
| deliveries_attempt_count_positive | deliveries | chequeo | `attempt_count >= 0` | Cantidad de intentos |
| delivery_attempts_delivery_fk | delivery_attempts | clave foránea | `delivery_id` → `deliveries(id)` `ON DELETE CASCADE` | RET-01 |
| delivery_attempts_failure_reason_required | delivery_attempts | chequeo | `failure_reason IS NOT NULL` si y solo si `result <> 'success'` | Motivo de falla (solo si falló) |
| delivery_attempts_inv08_insert_only | delivery_attempts | permiso | El rol de la aplicación no tiene `UPDATE` sobre `delivery_attempts` | INV-08 |

## Atributos derivados
| Entidad | Atributo | Se guarda | Por |
|---|---|---|---|
| Token de API | Prefijo | columna `token_prefix` | ACC-04: el token se guarda solo como hash, así que el prefijo no se puede calcular después |
| Entrega | Cantidad de intentos | columna `attempt_count` | INV-07: la transición a AGOTADA se decide en la transacción que registra el intento |
| Entrega | Reintentos realizados | no: se calcula (`attempt_count - 1`) | — |
| Entrega | Fecha del último intento | no: se calcula | — |
| Entrega | Último error | no: se calcula | — |
