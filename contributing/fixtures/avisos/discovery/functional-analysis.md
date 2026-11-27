---
created: 2026-11-07
last_updated: 2026-11-07
status: closed
base_documents: docs/brief.md
---

# Análisis funcional — Avisos

## Resumen
**Avisos** — Servicio que recibe eventos de sus clientes por una API y los reenvía a los destinos que
cada cliente configuró (webhooks HTTP o direcciones de email), con reintentos y un historial de
entregas consultable. No tiene pantallas: se usa por API y se administra por línea de comandos.

## Actores
| ID | Actor | Acceso | Recuperación de acceso |
|---|---|---|---|
| U-01 | Cliente (un sistema interno de la empresa o un cliente externo) | Token de API; puede tener varios tokens vigentes a la vez | Infraestructura le emite un token nuevo con el comando y revoca el perdido o filtrado |
| U-02 | Equipo de infraestructura | Comando de administración, ejecutado por quien tiene acceso a la infraestructura del servicio. El producto no tiene cuentas de operador | No aplica: el acceso lo da la infraestructura, no el producto |
| U-03 | Sistema | — | — |

## Superficies
No hay superficies con pantallas. El Cliente (U-01) usa el producto por una API HTTP y el Equipo de
infraestructura (U-02) lo administra con un comando de línea.

| Superficie | Plataforma | Actores | Viewports |
|---|---|---|---|

## Funcionalidades
| Bloque | Prefijo | Superficie(s) |
|---|---|---|
| Clientes y tokens | ACC | — (API y comando de administración) |
| Destinos | DES | — (API) |
| Publicación de eventos | EVE | — (API) |
| Entrega | ENT | — (proceso del sistema) |
| Historial de entregas | HIS | — (API) |
| Retención | RET | — (proceso del sistema) |

### ACC — Clientes y tokens
**Superficie(s):** — (API y comando de administración)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| ACC-01 | Dar de alta un cliente con el comando de administración, con un nombre único entre todos los clientes | U-02 |
| ACC-02 | Emitir un token de API para un cliente activo con el comando de administración, con una etiqueta única entre los tokens del cliente. El token completo se muestra una sola vez, al emitirlo. Un cliente puede tener varios tokens vigentes a la vez, sin tope | U-02 |
| ACC-03 | Revocar un token de API con el comando de administración. Un token revocado deja de autenticar para siempre | U-02 |
| ACC-04 | Listar los tokens de un cliente con su etiqueta, sus primeros caracteres, su fecha de emisión y si está revocado | U-02 |
| ACC-05 | Listar los clientes con su nombre, si está activo o desactivado y su fecha de alta | U-02 |
| ACC-06 | Los tokens no vencen: valen hasta que se revocan | — |
| ACC-07 | Desactivar un cliente con el comando de administración. Un cliente desactivado no puede publicar eventos ni consultar nada por la API. Las entregas ya aceptadas de sus eventos se siguen entregando. Su historial queda hasta que lo borre la retención (RET-01) | U-02 |
| ACC-08 | Reactivar un cliente desactivado con el comando de administración. Sus tokens no revocados vuelven a autenticar | U-02 |
| ACC-09 | Toda operación de la API se autentica con un token vigente de un cliente activo y actúa en nombre de ese cliente, solo sobre sus propios datos | — |
| ACC-10 | Cada token puede hacer como máximo el **límite de pedidos por token** a la API, contando todos los pedidos (publicar, destinos e historial) | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| ACC-E1 | El nombre del cliente ya existe (incluido el caso de dos altas simultáneas con el mismo nombre) | Prospera una sola alta; la otra falla indicando que el nombre ya está en uso |
| ACC-E2 | Se emite un token para un cliente desactivado o inexistente | El comando falla indicando que el cliente está desactivado o no existe |
| ACC-E3 | La API recibe un token inexistente, revocado o de un cliente desactivado | Se rechaza como no autenticado, con la misma respuesta en los tres casos |
| ACC-E4 | Se revoca un token ya revocado, o se desactiva un cliente ya desactivado, o se reactiva uno activo | El comando no cambia nada e informa el estado en que ya estaba |
| ACC-E5 | Un token supera el **límite de pedidos por token** | El pedido se rechaza con "demasiados pedidos" (HTTP 429) y no se procesa |
| ACC-E6 | La etiqueta ya la usa otro token del mismo cliente | El comando falla indicando que la etiqueta ya está en uso |

### DES — Destinos
**Superficie(s):** — (API)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| DES-01 | Crear un destino de tipo webhook, con su URL, que debe ser HTTPS | U-01 |
| DES-02 | Crear un destino de tipo email, con su dirección | U-01 |
| DES-03 | Cada destino se suscribe a uno o más tipos de evento, sin tope. El tipo de evento es texto libre (por ejemplo `pedido.aprobado`) y se compara por coincidencia exacta | U-01 |
| DES-04 | Al crear un webhook se genera su secreto de firma, uno por destino, que se muestra una sola vez en la respuesta de la creación. El secreto no cambia mientras el destino exista | Sistema |
| DES-05 | Listar sus destinos y ver uno, con su tipo, su URL o dirección, sus tipos de evento y si está pausado. El secreto de firma no se vuelve a mostrar | U-01 |
| DES-06 | Modificar la URL o dirección y los tipos de evento de un destino. Los reintentos siguientes de sus entregas en curso usan la URL o dirección nueva | U-01 |
| DES-07 | Pausar y reanudar un destino. Mientras está pausado no se le entrega nada: las entregas de los eventos que recibe quedan en curso hasta que se reanude | U-01 |
| DES-08 | Borrar un destino. Sus entregas en curso se descartan y quedan en el historial como descartadas | U-01 |
| DES-09 | Un cliente tiene como máximo el **tope de destinos por cliente** | — |
| DES-10 | Un cliente no puede tener dos destinos con la misma URL o la misma dirección de email | — |
| DES-11 | Los destinos de un evento se fijan al publicarlo: crear, modificar las suscripciones o borrar un destino no agrega ni quita entregas de eventos ya publicados, salvo el descarte de DES-08 | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| DES-E1 | El cliente ya tiene el **tope de destinos por cliente** | La creación se rechaza indicando que alcanzó el tope |
| DES-E2 | La URL no es HTTPS o no es válida, o la dirección de email no es válida, o la lista de tipos de evento queda vacía | La operación se rechaza indicando el campo inválido |
| DES-E3 | La URL o dirección ya la usa otro destino del mismo cliente (incluido el caso de dos creaciones simultáneas) | Prospera una sola; la otra se rechaza indicando que el destino ya existe |
| DES-E4 | El destino no existe o es de otro cliente | Se responde "no encontrado", igual en los dos casos |
| DES-E5 | Dos modificaciones simultáneas del mismo destino | Gana la que se aplica última; cada una reemplaza los datos que envía |
| DES-E6 | Se pausa un destino ya pausado o se reanuda uno activo | No cambia nada y responde el estado actual |

### EVE — Publicación de eventos
**Superficie(s):** — (API)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| EVE-01 | Publicar un evento con un tipo (texto de hasta 100 caracteres), un cuerpo JSON y, opcionalmente, una clave de idempotencia. La respuesta devuelve el identificador del evento | U-01 |
| EVE-02 | Un evento publicado genera una entrega para cada destino del cliente suscrito a su tipo en el momento de publicarlo (DES-11), incluidos los pausados, cuyas entregas quedan en curso (DES-07) | Sistema |
| EVE-03 | Un evento de un tipo sin destinos suscritos se acepta y queda registrado con cero entregas | Sistema |
| EVE-04 | Si el cliente publica con una clave de idempotencia que ya usó dentro de la **vigencia de la clave de idempotencia**, se devuelve el evento original y no se crea otro, aunque el tipo o el cuerpo sean distintos. Las claves son de cada cliente: la misma clave de dos clientes no se cruza | Sistema |
| EVE-05 | El cuerpo de un evento no supera el **tamaño máximo del cuerpo de un evento** | — |
| EVE-06 | Cuando la publicación responde con éxito, el evento y sus entregas ya quedaron registrados: un evento aceptado no se pierde | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| EVE-E1 | El cuerpo supera el **tamaño máximo del cuerpo de un evento** | La publicación se rechaza indicando el tamaño máximo; no se registra nada |
| EVE-E2 | El cuerpo no es JSON válido, o el tipo está vacío o es demasiado largo | La publicación se rechaza indicando el campo inválido; no se registra nada |
| EVE-E3 | Dos publicaciones simultáneas del mismo cliente con la misma clave de idempotencia | Se crea un solo evento y las dos reciben ese mismo evento |
| EVE-E4 | Se publica con una clave cuya **vigencia de la clave de idempotencia** ya pasó | Se crea un evento nuevo |

**Ejemplos**
- EVE-04: el cliente publica `pedido.aprobado` con la clave `abc` a las 10:00 y la conexión se corta. A las 10:01 reintenta con la clave `abc` → recibe el mismo evento, sin duplicar entregas. Al día siguiente, a las 10:05, publica otra vez con `abc` → se crea un evento nuevo.

### ENT — Entrega
**Superficie(s):** — (proceso del sistema)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| ENT-01 | Intentar cada entrega en curso. A un webhook: un POST a su URL con el cuerpo JSON del evento tal como se publicó y cabeceras con el identificador del evento, su tipo, su fecha de publicación y la firma. A una dirección de email: un correo con asunto «[Avisos] {tipo}» y un cuerpo con el identificador del evento, su fecha de publicación y el cuerpo JSON formateado | Sistema |
| ENT-02 | La entrega a un webhook es exitosa cuando responde un código 2xx dentro del **plazo de respuesta de un webhook** | Sistema |
| ENT-03 | Los webhooks van firmados con HMAC-SHA256 y el secreto de firma del destino (DES-04), de modo que el destino pueda verificar que vienen de Avisos | Sistema |
| ENT-04 | La entrega a un email es exitosa cuando el servidor de correo la acepta. Un rebote posterior no se registra | Sistema |
| ENT-05 | Una falla transitoria se reintenta: en un webhook, sin respuesta dentro del **plazo de respuesta de un webhook**, error de conexión, 5xx, 408 o 429; en un email, el servidor de correo no responde o rechaza en forma temporal | Sistema |
| ENT-06 | Una falla definitiva no se reintenta y deja la entrega fallida: en un webhook, un 3xx (las redirecciones no se siguen) o un 4xx distinto de 408 y 429; en un email, un rechazo permanente del servidor de correo | Sistema |
| ENT-07 | La primera espera entre intentos es la **espera inicial entre reintentos** y se duplica en cada reintento, sin superar la **espera máxima entre reintentos**. Después del primer intento, una entrega se reintenta como máximo el **máximo de reintentos por entrega** (el primer intento no cuenta como reintento); si el último reintento falla en forma transitoria, la entrega queda agotada | Sistema |
| ENT-08 | La entrega es "al menos una vez": un destino puede recibir el mismo evento más de una vez y lo reconoce por su identificador. No hay garantía de orden entre eventos | — |
| ENT-09 | A un destino pausado no se le intenta nada y la pausa no consume intentos. Al reanudarlo, sus entregas en curso se intentan enseguida y conservan los intentos ya hechos | Sistema |
| ENT-10 | Cada intento queda registrado con su fecha, la URL o dirección a la que se envió, su resultado y, si falló, el motivo (sin respuesta a tiempo, error de conexión, el código de respuesta del webhook o la respuesta del servidor de correo) | Sistema |
| ENT-11 | El resultado de una entrega es uno de: en curso, entregada, fallida (falla definitiva), agotada (se acabaron los intentos) o descartada (se borró su destino, DES-08, o la retención la descartó, RET-02) | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| ENT-E1 | Avisos estuvo detenido y pasó el momento de algunos intentos | Al volver, las entregas vencidas se intentan enseguida. La caída no consume intentos ni agota entregas |
| ENT-E2 | El cliente borra o pausa el destino mientras un intento está en curso | El intento termina y su resultado queda registrado. Si falló, la entrega queda descartada (borrado) o en curso sin consumir más intentos hasta que se reanude (pausa) |
| ENT-E3 | El cliente modifica la URL o dirección del destino entre dos intentos | El intento siguiente usa la URL o dirección nueva (DES-06) |
| ENT-E4 | El cliente dueño del evento se desactiva con entregas en curso | Las entregas siguen su curso (ACC-07, DEC-01) |

**Ejemplos**
- ENT-07: con **espera inicial entre reintentos** de 30 s, **espera máxima entre reintentos** de 1 h y **máximo de reintentos por entrega** de 8: el primer intento falla a las 10:00:00 → reintentos a las 10:00:30, 10:01:30, 10:03:30, 10:07:30, 10:15:30, 10:31:30, 11:03:30 y 12:03:30 (la octava espera sería de 64 min y queda en 1 h). Son 9 intentos en total; si el de las 12:03:30 falla en forma transitoria, la entrega queda agotada.
- ENT-05/ENT-06: el webhook responde 503 → se reintenta; responde 404 → queda fallida sin reintentar; responde 301 → queda fallida.

### HIS — Historial de entregas
**Superficie(s):** — (API)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| HIS-01 | Consultar el historial de entregas de sus eventos: qué se entregó, qué falló y por qué | U-01 |
| HIS-02 | Listar sus eventos, paginado y del más reciente al más antiguo, con filtros por tipo, por resultado de entrega (eventos con al menos una entrega en ese resultado, ENT-11) y por rango de fechas de publicación | U-01 |
| HIS-03 | Ver un evento con su tipo, su fecha de publicación, su cuerpo JSON y sus entregas; de cada entrega, el destino (su tipo y la URL o dirección que tenía al publicarse el evento, que se conservan aunque el destino se borre), el resultado, la cantidad de intentos, la fecha del último intento, el último error y la lista de intentos (ENT-10) | U-01 |
| HIS-04 | De un intento fallido de webhook se guardan y se muestran, además del código, los primeros bytes del cuerpo de la respuesta, hasta el **tamaño guardado de la respuesta de un webhook** | Sistema |
| HIS-05 | El cliente solo ve sus propios eventos y entregas. Lo que borró la retención (RET-01) ya no aparece | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| HIS-E1 | El evento no existe, es de otro cliente o ya lo borró la retención | Se responde "no encontrado", igual en todos los casos |
| HIS-E2 | Un filtro tiene un valor inválido (un resultado que no existe, una fecha mal formada, un rango con el inicio después del fin) | La consulta se rechaza indicando el filtro inválido |

### RET — Retención
**Superficie(s):** — (proceso del sistema)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| RET-01 | Borrar automáticamente cada evento, con su cuerpo, sus entregas y sus intentos, cuando cumple el **plazo de retención** contado desde su publicación, sin excepción | Sistema |
| RET-02 | Si al cumplir el plazo el evento tiene entregas en curso (por ejemplo, de un destino pausado), se descartan, no se intentan más y se borran con el evento | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| RET-E1 | El proceso no corrió a tiempo (Avisos estuvo detenido) | Al volver, borra todos los eventos que ya cumplieron el **plazo de retención** |
| RET-E2 | El borrado coincide con un intento de entrega en curso del mismo evento | El intento termina, pero su resultado no se registra: el evento y sus entregas ya se borraron |
| RET-E3 | El cliente consulta un evento mientras se borra | Lo ve completo si la consulta llegó antes del borrado; si no, recibe "no encontrado" (HIS-E1) |

## Fuera de alcance
- Pantallas o interfaz gráfica de cualquier tipo
- Avisarle al cliente cuando una entrega se agota: lo ve en el historial (HIS-01)
- Reenvío manual de entregas fallidas o agotadas
- Registro de rebotes de email posteriores a la aceptación del servidor de correo
- Garantía de orden de entrega y entrega "exactamente una vez"
- Alta de clientes y emisión de tokens por la API (solo por el comando de administración)
- Rotación del secreto de firma de un webhook
- Comodines en las suscripciones a tipos de evento

## Parámetros
| Parámetro | Valor | ¿Editable por un usuario? |
|---|---|---|
| Tope de destinos por cliente | 20 destinos | no |
| Límite de pedidos por token | 100 pedidos por minuto | no |
| Tamaño máximo del cuerpo de un evento | 256 KB | no |
| Vigencia de la clave de idempotencia | 24 horas | no |
| Plazo de respuesta de un webhook | 10 segundos | no |
| Máximo de reintentos por entrega | 8 reintentos | no |
| Espera inicial entre reintentos | 30 segundos | no |
| Espera máxima entre reintentos | 1 hora | no |
| Tamaño guardado de la respuesta de un webhook | 2 KB | no |
| Plazo de retención | 30 días | no |

## Integraciones externas
| ID | Sistema | Dirección | Datos | Cuándo | Fuente de verdad |
|---|---|---|---|---|---|
| INT-01 | Servidor SMTP del proveedor de email (en local, Mailpit) | Envía | El correo de cada entrega a un destino de email (ENT-01) | En cada intento de entrega a un destino de email | Avisos, para el evento; la respuesta del servidor decide el resultado del intento (ENT-04..06) |
| INT-02 | Webhooks de los clientes (salientes) | Envía | El POST firmado de cada entrega a un destino webhook (ENT-01, ENT-03) | En cada intento de entrega a un destino webhook | Avisos, para el evento; la respuesta del webhook decide el resultado del intento (ENT-02, ENT-05, ENT-06) |

Las fallas de las dos integraciones son condiciones de falla del bloque ENT.

## Requisitos no funcionales
| ID | Categoría | Requisito | Target |
|---|---|---|---|
| NFR-01 | Volumen | Clientes | Decenas |
| NFR-02 | Volumen | Eventos publicados, sostenido | 50 eventos por segundo |
| NFR-03 | Volumen | Eventos publicados, en el pico | 200 eventos por segundo |
| NFR-04 | Tiempos | Respuesta de la API a una publicación | Menos de 200 ms en el 95% de los pedidos |
| NFR-05 | Tiempos | Desde la publicación hasta el primer intento de entrega, sin contar destinos pausados | Menos de 5 segundos en el 95% de los casos |
| NFR-06 | Disponibilidad | API y entrega | 24/7, con 99,5% de disponibilidad mensual |
| NFR-07 | Privacidad y cumplimiento | Datos personales guardados | Los que traigan los cuerpos de los eventos y las direcciones de email de los destinos. Aplica la Ley 25.326 de Protección de Datos Personales (Argentina); el borrado lo define RET |
| NFR-08 | Accesibilidad | — | No aplica: no hay pantallas |
| NFR-09 | Idioma, zona horaria y formatos | Idioma de los mensajes de la API, del comando y del texto fijo de los emails | Español únicamente |
| NFR-10 | Idioma, zona horaria y formatos | Fechas en la API, las cabeceras del webhook y los emails | ISO 8601 en UTC |
| NFR-11 | Compatibilidad | — | No aplica: no hay pantallas; se usa por una API HTTP |

## Decisiones tomadas
| ID | Tema | Decisión | Descartado | Motivo | Afecta |
|---|---|---|---|---|---|
| DEC-01 | Entregas en curso al desactivar un cliente | Las entregas ya aceptadas se siguen entregando | Cancelarlas al desactivar | Lo que Avisos aceptó tiene que llegar a sus destinos aunque después se dé de baja al cliente | ACC-07 |
| DEC-02 | Firma de los webhooks | HMAC-SHA256 con un secreto por destino | Firma con clave pública | HMAC es el estándar que ya usan los integradores | DES-04, ENT-03 |
| DEC-03 | Entregas en curso al borrar un destino | Se descartan y quedan en el historial como descartadas | Seguir entregándolas | Si lo borró, no lo quiere | DES-08 |
| DEC-04 | Clave de idempotencia repetida con otro contenido | Se devuelve el evento original | Rechazar la publicación | La clave identifica la publicación; el contenido del reintento no importa | EVE-04 |
| DEC-05 | Qué fallas se reintentan | Solo las transitorias; un 4xx distinto de 408 y 429 es falla definitiva | Reintentar toda respuesta que no sea 2xx | Reintentar no lo arregla | ENT-05, ENT-06 |
| DEC-06 | Orden de entrega | Sin garantía de orden | Entregar en orden por destino | Simplifica los reintentos y ningún cliente lo necesita hoy | ENT-08 |
| DEC-07 | Rebotes de email | No se registran | Integrar los avisos de rebote del proveedor | No vale la integración | ENT-04 |
| DEC-08 | Entregas en curso al cumplirse la retención | Se descartan y el evento se borra igual; es la única excepción a DEC-01 | Esperar a que terminen para borrar | Los cuerpos de los eventos pueden tener datos personales y se borran a los 30 días sin excepción; el plazo de retención se cumple siempre | RET-01, RET-02 |
