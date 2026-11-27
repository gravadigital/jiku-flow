---
created: 2026-11-07
last_updated: 2026-11-07
status: closed
functional_analysis: _jflow/discovery/functional-analysis.md
---

# Análisis de dominio — Avisos

## Glosario
| Término | Definición |
|---|---|
| Tipo de evento | Texto libre, de hasta 100 caracteres, que clasifica un evento (por ejemplo `pedido.aprobado`). Un destino recibe un evento si está suscrito a su tipo, por coincidencia exacta: sin comodines y distinguiendo mayúsculas de minúsculas (`Pedido.Aprobado` y `pedido.aprobado` son tipos distintos) |
| Falla transitoria | Resultado de un intento que se reintenta (ENT-05): en un webhook, sin respuesta dentro del **plazo de respuesta de un webhook**, error de conexión, 5xx, 408 o 429; en un email, el servidor de correo no responde o rechaza en forma temporal |
| Falla definitiva | Resultado de un intento que no se reintenta (ENT-06): en un webhook, un 3xx o un 4xx distinto de 408 y 429; en un email, un rechazo permanente del servidor de correo |
| Comando de administración | Herramienta de línea de comandos con la que el Equipo de infraestructura opera los clientes y sus tokens. No es parte de la API |
| Al menos una vez | Garantía de la entrega: un destino puede recibir el mismo evento más de una vez, y lo reconoce por el identificador del evento |

## Entidades

### Cliente
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Nombre | texto | sí | único entre todos los clientes | no |
| Estado | enum | sí | ACTIVO / DESACTIVADO; default ACTIVO | no |

**Relaciones:** tiene muchos Tokens de API, muchos Destinos y muchos Eventos.

**Baja:** se desactiva, nunca se elimina (ACC-07). Se puede reactivar (ACC-08).

### Token de API
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Cliente | referencia a Cliente | sí | el cliente está ACTIVO al emitirlo | no |
| Etiqueta | texto | sí | única entre los tokens del cliente | no |
| Token | texto | sí | único entre todos los tokens; se muestra completo una sola vez, al emitirlo (ACC-02) | no |
| Estado | enum | sí | VIGENTE / REVOCADO; default VIGENTE | no |

**Atributos derivados**
| Atributo | Regla de cálculo |
|---|---|
| Prefijo | Los primeros caracteres del token, que lo identifican en el listado (ACC-04) |

**Relaciones:** pertenece a un Cliente.

**Baja:** nunca se elimina; se revoca (ACC-03).

### Destino
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Cliente | referencia a Cliente | sí | — | no |
| Tipo | enum | sí | WEBHOOK / EMAIL; sin default; no cambia después de crearlo | no |
| URL | texto | solo si WEBHOOK | URL HTTPS válida; única entre los destinos del cliente | no |
| Dirección de email | email | solo si EMAIL | única entre los destinos del cliente | sí |
| Secreto de firma | texto | solo si WEBHOOK | se genera al crearlo; se muestra una sola vez, en la respuesta de la creación; no cambia (DES-04) | no |
| Estado | enum | sí | ACTIVO / PAUSADO; default ACTIVO | no |

**Relaciones:** pertenece a un Cliente; tiene una o más Suscripciones; tiene muchas Entregas.

**Baja:** se elimina (DES-08). Sus entregas conservan el tipo y la dirección del destino, y quedan sin referencia a él.

### Suscripción
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Destino | referencia a Destino | sí | — | no |
| Tipo de evento | texto | sí | hasta 100 caracteres; único entre las suscripciones del destino | no |

**Relaciones:** pertenece a un Destino.

**Baja:** se elimina al quitar el tipo del destino (DES-06) o al borrar el destino (DES-08).

### Evento
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Cliente | referencia a Cliente | sí | el cliente está ACTIVO al publicarlo | no |
| Tipo de evento | texto | sí | no vacío; hasta 100 caracteres | no |
| Cuerpo | texto (JSON) | sí | JSON válido; no supera el **tamaño máximo del cuerpo de un evento**; no cambia | sí |
| Clave de idempotencia | texto | no | — | no |
| Fecha de publicación | fecha y hora | sí | — | no |

**Relaciones:** pertenece a un Cliente; tiene cero o más Entregas.

**Baja:** se elimina, con sus entregas e intentos, al cumplir el **plazo de retención** (RET-01).

### Entrega
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Evento | referencia a Evento | sí | — | no |
| Destino | referencia a Destino | no | un destino del mismo cliente que el evento, suscrito a su tipo al publicarlo; queda vacía si el destino se borra (DES-08) | no |
| Tipo de destino | enum | sí | WEBHOOK / EMAIL; copia del tipo del destino al publicarse el evento | no |
| Dirección del destino | texto | sí | copia de la URL o dirección de email del destino al publicarse el evento; se conserva aunque el destino se borre (HIS-03) | sí |
| Estado | enum | sí | EN_CURSO / ENTREGADA / FALLIDA / AGOTADA / DESCARTADA; default EN_CURSO | no |
| Próximo intento | fecha y hora | solo si EN_CURSO | — | no |

**Atributos derivados**
| Atributo | Regla de cálculo |
|---|---|
| Cantidad de intentos | Cantidad de Intentos de la entrega |
| Reintentos realizados | Cantidad de intentos menos uno (el primero no es un reintento); nunca más que el **máximo de reintentos por entrega** |
| Fecha del último intento | Fecha del Intento más reciente |
| Último error | Motivo de falla del Intento más reciente, si falló |

**Relaciones:** pertenece a un Evento; pertenece a un Destino mientras el destino exista; tiene muchos Intentos.

**Baja:** se elimina con su evento (RET-01).

### Intento
| Atributo | Tipo | Obligatorio | Restricciones | Dato personal |
|---|---|---|---|---|
| Entrega | referencia a Entrega | sí | — | no |
| Fecha | fecha y hora | sí | — | no |
| Enviado a | texto | sí | la URL o dirección de email que tenía el destino al hacer el intento (DES-06, ENT-10) | sí |
| Resultado | enum | sí | ÉXITO / FALLA_TRANSITORIA / FALLA_DEFINITIVA; sin default | no |
| Motivo de falla | enum | solo si falló | SIN_RESPUESTA / ERROR_DE_CONEXION / RESPUESTA_HTTP / RECHAZO_SMTP | no |
| Código de respuesta | número | solo si hubo respuesta HTTP o SMTP | — | no |
| Respuesta | texto | no | solo en intentos fallidos; hasta el **tamaño guardado de la respuesta de un webhook** en un webhook (HIS-04); en un email, la respuesta del servidor de correo | no |

**Relaciones:** pertenece a una Entrega.

**Baja:** se elimina con su entrega (RET-01).

## Estados

### Cliente

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| ACTIVO | inicial | Puede usar la API y recibir tokens nuevos |
| DESACTIVADO | intermedio | Dado de baja: sus tokens no autentican y no se le emiten tokens; sus entregas ya aceptadas siguen su curso |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | ACTIVO | ACC-01 |
| ACTIVO | DESACTIVADO | ACC-07 |
| DESACTIVADO | ACTIVO | ACC-08 |

### Token de API

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| VIGENTE | inicial | Autentica, si su cliente está ACTIVO |
| REVOCADO | terminal | No autentica nunca más |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | VIGENTE | ACC-02 |
| VIGENTE | REVOCADO | ACC-03 |

### Destino

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| ACTIVO | inicial | Recibe sus entregas |
| PAUSADO | intermedio | No se le intenta nada; sus entregas quedan en curso sin consumir intentos |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | ACTIVO | DES-01, DES-02 |
| ACTIVO | PAUSADO | DES-07 |
| PAUSADO | ACTIVO | DES-07 |

### Entrega

**Estados**
| Estado | Tipo | Significado |
|---|---|---|
| EN_CURSO | inicial | Todavía no se entregó y le quedan intentos, o su destino está pausado |
| ENTREGADA | terminal | Un intento fue exitoso |
| FALLIDA | terminal | Un intento tuvo una falla definitiva |
| AGOTADA | terminal | El último reintento permitido tuvo una falla transitoria |
| DESCARTADA | terminal | Dejó de intentarse porque se borró su destino o porque su evento cumplió el plazo de retención |

**Transiciones**
| Desde | Hacia | Disparado por |
|---|---|---|
| (creación) | EN_CURSO | EVE-02 |
| EN_CURSO | ENTREGADA | ENT-02, ENT-04 |
| EN_CURSO | FALLIDA | ENT-06 |
| EN_CURSO | AGOTADA | ENT-07 |
| EN_CURSO | DESCARTADA | DES-08, ENT-E2, RET-02 |

## Invariantes
| ID | Regla | Entidades | Aplicada en |
|---|---|---|---|
| INV-01 | Un cliente nunca tiene más destinos que el **tope de destinos por cliente** | Cliente, Destino | DES-09, DES-E1 |
| INV-02 | Dos destinos del mismo cliente nunca tienen la misma URL ni la misma dirección de email | Destino | DES-06, DES-10, DES-E3 |
| INV-03 | Dos eventos del mismo cliente nunca tienen la misma clave de idempotencia si se publicaron dentro de la **vigencia de la clave de idempotencia** uno del otro | Evento | EVE-04, EVE-E3, EVE-E4 |
| INV-04 | Un evento aceptado tiene exactamente una entrega por cada destino de su cliente que estaba suscrito a su tipo al publicarlo, registradas junto con el evento | Evento, Entrega, Suscripción | EVE-02, EVE-03, EVE-06, DES-11 |
| INV-05 | Una entrega y su destino son siempre del mismo cliente que su evento | Entrega, Evento, Destino | EVE-02, ACC-09 |
| INV-06 | Ningún intento empieza mientras su destino está PAUSADO, ni sobre una entrega que no está EN_CURSO | Intento, Entrega, Destino | DES-07, ENT-09, ENT-E2 |
| INV-07 | Una entrega nunca tiene más reintentos que el **máximo de reintentos por entrega** | Entrega, Intento | ENT-07 |
| INV-08 | Un intento registrado nunca se modifica | Intento | ENT-10, HIS-03 |
