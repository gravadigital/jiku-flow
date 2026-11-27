---
created: 2026-11-07
last_updated: 2026-11-07
status: closed
functional_analysis: _jflow/discovery/functional-analysis.md
domain_analysis: _jflow/discovery/domain-analysis.md
---

# Análisis técnico — Avisos

## Servicios
| Servicio | Tipo | Lenguaje | Superficies | Expone |
|---|---|---|---|---|
| api | service | go | — | HTTP + CLI |

La API HTTP la usa el Cliente (U-01). El CLI es el comando de administración del Equipo de
infraestructura (U-02): se ejecuta dentro del contenedor de api. Los procesos de entrega (ENT) y de
retención (RET) corren dentro de api, en todas sus réplicas.

## Módulos

### api
| Módulo | Entidades | Bloques |
|---|---|---|
| access | Cliente, Token de API | ACC |
| destinations | Destino, Suscripción | DES |
| events | Evento | EVE, HIS, RET |
| delivery | Entrega, Intento | ENT |

**Interacciones**
| De → A | Para qué | Requisito |
|---|---|---|
| destinations, events → access | Autenticar el token, resolver el cliente activo y aplicar el **límite de pedidos por token** en cada pedido de la API | ACC-09, ACC-10 |
| events → destinations | Obtener los destinos del cliente suscritos al tipo del evento al publicarlo | EVE-02, DES-11 |
| events → delivery | Crear las entregas del evento en la misma transacción que el evento | EVE-02, EVE-06 |
| events → delivery | Leer las entregas y los intentos de un evento para el historial | HIS-02, HIS-03 |
| events → delivery | Descartar las entregas en curso de los eventos que cumplen el **plazo de retención** antes de borrarlos | RET-01, RET-02 |
| destinations → delivery | Descartar las entregas en curso de un destino que se borra | DES-08, ENT-E2 |
| delivery → destinations | Leer la URL o dirección actual, el secreto de firma y si el destino está pausado antes de cada intento | ENT-01, ENT-03, ENT-09, DES-06 |

## Persistencia e infraestructura
| Componente | Tecnología | Dueño | Usado por | Para qué |
|---|---|---|---|---|
| Base principal | PostgreSQL | api | — | Todas las entidades. También es la cola de entregas: las réplicas toman de la tabla de entregas las que están en curso y vencidas (ENT-01, ENT-07, EVE-06), y guarda el contador del **límite de pedidos por token** por token y minuto (ACC-10) |

## Comunicación
| De → A | Protocolo | Tipo | Para qué |
|---|---|---|---|
| Sistemas de los clientes (U-01) → api | HTTP | sincrónica | Toda la API: autenticación y límite (ACC-09, ACC-10), destinos (DES-01..08), publicación (EVE-01) e historial (HIS-01..03) |
| api → servidor SMTP del proveedor de email (en local, Mailpit) | SMTP | asincrónica | Emails de las entregas (ENT-01, ENT-04, INT-01) |
| api → webhooks de los clientes | HTTP | asincrónica | POST firmado de las entregas (ENT-01..03, INT-02) |

No hay bus entre servicios: hay un solo servicio.

## Autenticación y autorización

### Credenciales
| ID | Credencial | Emisor | Se obtiene | Vida y renovación | Revocación |
|---|---|---|---|---|---|
| CRED-01 | Token de API | api.access, con el comando de administración | Lo emite el Equipo de infraestructura (ACC-02); se muestra completo una sola vez y se guarda solo su hash | No vence (ACC-06); no se renueva: se emite otro | Revocarlo con el comando (ACC-03); deja de autenticar mientras su cliente esté desactivado (ACC-07, ACC-08) |
| CRED-02 | Secreto de firma de un webhook | api.destinations, al crear el destino | En la respuesta de la creación del webhook, una sola vez (DES-04) | Mientras exista el destino; no cambia | Borrando el destino (DES-08) |

### Uso
| Credencial | Rol | Desde | Pasa por | Verifica |
|---|---|---|---|---|
| CRED-01 | client | Sistema del cliente, en la cabecera `Authorization: Bearer` de cada pedido | — | api |
| CRED-02 | — | api, al firmar cada POST a un webhook: HMAC-SHA256 sobre la marca de tiempo y el cuerpo, con la marca de tiempo en una cabecera (ENT-03) | — | El webhook del cliente |
| ninguna | operator | Comando de administración, ejecutado dentro del contenedor de api | — | — (lo protege el acceso a la infraestructura) |

### Roles
| Rol | Actores | Permite |
|---|---|---|
| client | U-01 | Toda la API (destinos, publicación, historial), solo sobre los datos del cliente dueño del token: sus destinos, sus eventos y sus entregas (ACC-09) |
| operator | U-02 | Todo el comando de administración, sobre todos los clientes y tokens. No usa la API |

## Garantías
| Regla | Mecanismo | Dónde |
|---|---|---|
| INV-01 Tope de destinos por cliente | La creación cuenta los destinos dentro de una transacción con bloqueo de la fila del cliente | api.destinations |
| INV-02 Destinos sin duplicados | Restricciones de unicidad sobre cliente + URL y cliente + dirección de email | Base principal |
| INV-03 Clave de idempotencia única en su vigencia | Registro de claves con unicidad sobre cliente + clave; la publicación inserta la clave en su transacción y reemplaza una clave vencida en la misma transacción. Ante el conflicto, la publicación que pierde devuelve el evento de la ganadora (EVE-E3) | Base principal + api.events |
| INV-04 Evento con todas sus entregas (EVE-06) | El evento, su clave y sus entregas se insertan en una sola transacción; la respuesta sale después del commit | api.events → api.delivery |
| INV-05 Entrega, destino y evento del mismo cliente | Las claves foráneas de la entrega hacia el evento y hacia el destino incluyen el cliente | Base principal |
| INV-06 Ningún intento con el destino pausado ni sobre una entrega cerrada | Cada réplica toma entregas en curso y vencidas con bloqueo de fila (SKIP LOCKED) y, en la misma consulta, solo si su destino está ACTIVO; las reserva corriéndoles el próximo intento antes de llamar al destino | api.delivery |
| INV-07 Tope de reintentos | El intento que alcanza el **máximo de reintentos por entrega** y falla en forma transitoria pasa la entrega a AGOTADA en la misma transacción que lo registra | api.delivery |
| INV-08 Intentos inmutables | La tabla de intentos es de solo inserción: el código no la actualiza; solo la retención borra | Base principal + api.delivery |
| ENT-02..07 Reintentos | Cola en la tabla de entregas: estado EN_CURSO + próximo intento. Cada réplica sondea cada segundo las entregas vencidas | Base principal + api.delivery |
| ENT-08 Al menos una vez | El resultado se registra después de la llamada; si la réplica muere durante un intento, la reserva vence y la entrega se vuelve a intentar | api.delivery |
| ENT-E1 Caída | Las entregas vencidas siguen en la tabla y se toman al volver; la caída no registra intentos | Base principal + api.delivery |
| DES-08, ENT-E2 Borrado de un destino | En una transacción se borra el destino y pasan a DESCARTADA sus entregas en curso que no están reservadas; la que está en un intento queda sin destino y, al terminar, pasa a ENTREGADA si el intento fue exitoso o a DESCARTADA si falló | api.destinations → api.delivery |
| ACC-E1, ACC-E6, DES-E3 Altas simultáneas | Restricciones de unicidad sobre el nombre del cliente, sobre cliente + etiqueta del token y las de INV-02 | Base principal |
| ACC-10 Límite de pedidos por token | Contador por token y minuto, incrementado de forma atómica en cada pedido | Base principal + api.access |
| RET-01, RET-02 Retención | Proceso que corre cada hora en una réplica a la vez (bloqueo consultivo de la base) y borra en lotes los eventos vencidos con sus entregas e intentos, en cascada | api.events + Base principal |
| RET-E2 Borrado durante un intento | El registro del intento de una entrega que ya no existe se descarta sin error | api.delivery |

## Flujos clave

### Publicación de un evento (EVE-01..06)
Un sistema cliente publica un evento; Avisos lo registra junto con una entrega por cada destino
suscrito y responde su identificador.

1. Sistema del cliente → api.access: autentica el token y suma el pedido al contador (ACC-09, ACC-10) → si falla: ACC-E3 o ACC-E5
2. api.events: valida el tipo y el cuerpo (EVE-05) → si falla: EVE-E1 o EVE-E2
3. api.events: si trae clave de idempotencia vigente del mismo cliente → devuelve el evento original (EVE-04, DEC-04)
4. api.events → api.destinations: destinos del cliente suscritos al tipo, incluidos los pausados (EVE-02, DES-11)
5. api.events → api.delivery: una transacción → evento + clave + una entrega EN_CURSO por destino, con próximo intento = ahora (INV-03, INV-04, INV-05); ante conflicto de clave, EVE-E3
6. api.events: responde el identificador después del commit (EVE-06)

### Entrega con reintentos (ENT-01..10)
Una réplica toma una entrega vencida, la intenta y registra el resultado; si falla en forma
transitoria, la reprograma con espera exponencial.

1. api.delivery: cada segundo toma entregas EN_CURSO vencidas con destino ACTIVO, con bloqueo de fila, y las reserva (INV-06, DEC-T06)
2. api.delivery → api.destinations: URL o dirección actual y secreto de firma (DES-06, ENT-03)
3. api.delivery → webhook del cliente (HTTP, firmado según DEC-T05) o → servidor SMTP (ENT-01, INT-01, INT-02)
4. api.delivery: una transacción → registra el intento (ENT-10, INV-08) y decide: éxito → ENTREGADA (ENT-02, ENT-04); falla definitiva → FALLIDA (ENT-06); falla transitoria → próximo intento con la espera que corresponde (ENT-05, ENT-07) o AGOTADA si era el último reintento (INV-07)
5. Si la réplica muere antes del paso 4, la reserva vence y otra réplica la retoma (ENT-08, ENT-E1)

### Borrado de un destino con entregas en curso (DES-08, ENT-E2)
El cliente borra un destino; sus entregas en curso quedan descartadas y el historial conserva a dónde
iban.

1. Sistema del cliente → api.destinations: borra el destino → si no es suyo o no existe: DES-E4
2. api.destinations → api.delivery: una transacción → borra el destino y pasa a DESCARTADA sus entregas en curso no reservadas; las entregas conservan el tipo y la dirección del destino (DEC-03)
3. api.delivery: un intento que estaba en curso termina → ENTREGADA si fue exitoso, DESCARTADA si falló (ENT-E2)

### Retención (RET-01, RET-02)
Cada hora, una réplica borra los eventos que cumplieron el plazo, con todo lo que cuelga de ellos.

1. api.events: toma el bloqueo consultivo; si otra réplica lo tiene, no hace nada (DEC-T07)
2. api.events → api.delivery: en lotes, descarta las entregas en curso de los eventos vencidos (RET-02, DEC-08)
3. api.events: borra los eventos vencidos con sus entregas e intentos, en cascada (RET-01); un intento que termina después se descarta (RET-E2)

## Decisiones técnicas
| ID | Tema | Decisión | Descartado | Motivo | Afecta |
|---|---|---|---|---|---|
| DEC-T01 | Servicios | Un solo servicio, api, con la entrega y la retención adentro | Dos servicios: api y un worker aparte | Un solo despliegue; el volumen no justifica otro servicio | api, ENT, RET |
| DEC-T02 | Lenguaje de api | Go | Node (TypeScript); Python | Concurrencia y un binario | api |
| DEC-T03 | Cola de entregas | Tabla de entregas en la base principal, tomada por las réplicas con bloqueo de fila (SKIP LOCKED) | Un bus de mensajes: NATS JetStream o RabbitMQ | Una pieza menos y el volumen es bajo | ENT, EVE-06 |
| DEC-T04 | Contador del límite de pedidos | En la base principal, por token y minuto | Redis; en memoria por réplica | Exacto y sin otra pieza | ACC-10 |
| DEC-T05 | Contenido firmado del webhook | HMAC-SHA256 sobre la marca de tiempo y el cuerpo, con la marca de tiempo en una cabecera | Firmar solo el cuerpo | Evitar reenvíos | ENT-03, DEC-02 |
| DEC-T06 | Detección de entregas por intentar | Cada réplica sondea la tabla de entregas cada segundo | LISTEN/NOTIFY con sondeo de respaldo | Simple y alcanza | ENT, NFR-05 |
| DEC-T07 | Frecuencia de la retención | Cada hora | Una vez por día | Lotes chicos y plazo justo | RET-01 |
| DEC-T08 | CI/CD | GitLab, con su registry de contenedores | GitHub Actions con GitHub Container Registry | Es la plataforma del equipo | api |
