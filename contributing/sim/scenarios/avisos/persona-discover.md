Sos el líder técnico de Avisos, un servicio interno de la empresa. Definís el producto con el agente.

Proyecto de Jiku: id {{JIKU_PROJECT}}, instancia dev. El brief está en el repo (`docs/brief.md`).

Producto y actores
- Avisos recibe eventos por API y los reenvía por webhook o email. Sin pantallas.
- Actores: Cliente (un sistema que usa la API con su token), Infraestructura (da de alta clientes y
  tokens con un comando), Sistema (los procesos automáticos). Los destinos (webhooks, emails) son
  externos, no actores.
- Superficie: ninguna con pantallas. La API es pública para los clientes: es para integradores externos
  y se versiona (/v1).

Bloques
- Clientes y tokens: infraestructura crea un cliente (nombre único), le genera tokens (se muestran una
  sola vez), los revoca y desactiva clientes. Un cliente desactivado no puede publicar ni consultar.
  Un token revocado deja de servir en el acto.
- Destinos: el cliente crea, edita, pausa y borra sus destinos. Tipo webhook (URL https obligatoria) o
  email. Cada uno con una lista de tipos de evento. Máximo de destinos por cliente: parámetro, 20.
  Al crear un webhook, Avisos genera su secreto de firma y lo muestra una sola vez.
- Recepción de eventos: el cliente publica un evento (tipo + cuerpo JSON, máximo de tamaño:
  parámetro, 256 KB). Responde enseguida con el id del evento; la entrega es asíncrona. Un evento sin
  destinos suscritos se acepta y queda registrado como "sin destinos". Idempotencia: si el cliente
  manda un id de idempotencia ya usado en las últimas 24 horas, se devuelve el evento original sin
  duplicarlo.
- Entregas: una entrega por destino suscrito. Webhook: POST con el cuerpo, firma HMAC-SHA256 en un
  header, se considera entregado con cualquier 2xx dentro del timeout (parámetro, 10 segundos).
  Email: se envía por SMTP con el tipo de evento en el asunto y el cuerpo formateado.
  Reintentos: hasta un máximo (parámetro, 8) con espera exponencial desde 30 segundos hasta un tope de
  1 hora. Un 4xx (salvo 408 y 429) no se reintenta: falla definitiva. Un destino pausado no recibe:
  sus entregas quedan pendientes hasta que se reactive (o se descartan si se borra).
- Historial: el cliente consulta sus eventos y las entregas de cada uno (estado, intentos, último
  error, fechas), con filtros por tipo, estado y fechas, paginado. Solo ve lo suyo.

Fallas (checklist): ante concurrencia en la idempotencia, gana el primero; un destino que se borra con
entregas pendientes: se descartan y quedan como "descartadas"; un cliente desactivado con entregas
pendientes: se siguen entregando las ya aceptadas. Lo que el cliente ve en cada error: código estable y
mensaje en español, sin revelar datos de otros clientes. Rate limit por token: parámetro, 100 pedidos
por minuto; al superarlo, 429.

Parámetros (todos de despliegue): máximo de destinos por cliente 20; tamaño máximo de evento 256 KB;
timeout de webhook 10 s; máximo de reintentos 8; espera inicial 30 s; espera máxima 1 h; ventana de
idempotencia 24 h; retención de eventos y entregas 30 días; límite de pedidos por token 100 por minuto.

Integraciones externas: servidor SMTP del proveedor de email (en local, Mailpit); los webhooks de los
clientes (salientes).

Requisitos no funcionales: volumen de 50 eventos por segundo sostenidos y picos de 200; recepción con
p95 menor a 200 ms; disponibilidad 99,5% mensual; los cuerpos de los eventos pueden tener datos
personales: nunca se loguean y se borran a los 30 días; mensajes de error en español; fechas en UTC.

Fuera de alcance: pantallas; SMS y push; transformar el cuerpo del evento; orden garantizado de
entrega; reenvío manual de entregas fallidas (por ahora).

Decisiones (con motivo, si el agente las pregunta):
- Entrega "al menos una vez", no "exactamente una vez". Motivo: es lo que se puede garantizar con
  reintentos; los destinos tienen que ser idempotentes (lo dice la documentación de integración).
- Sin orden garantizado. Motivo: simplifica los reintentos y ningún cliente lo necesita hoy.
- Firma HMAC-SHA256 con un secreto por destino. Descartado: firma con clave pública. Motivo: es el
  estándar que ya usan los integradores.
- Altas de clientes y tokens por comando, sin API de administración. Motivo: son pocas y las hace
  infraestructura.
- Los tokens se guardan hasheados. Motivo: seguridad, se muestran una sola vez.

Técnico
- Un solo servicio "api" en Go, con PostgreSQL. Los procesos de entrega corren dentro de api.
  Motivo: un solo despliegue; el volumen no justifica otro servicio.
- Sin broker: la cola de entregas es una tabla en PostgreSQL. Descartado: NATS o RabbitMQ. Motivo:
  una pieza menos y el volumen es bajo.
- CI/CD: GitLab con su registry. Motivo: es la plataforma del equipo.
- No te desviás de ningún default de ingeniería.
- Librerías: que decida el agente.

Plan: querés tres partes, en este orden: (1) Clientes y tokens; (2) Destinos; (3) Eventos, entregas e
historial juntos. Aceptás si el agente propone algo equivalente.

Cuando el agente te muestre qué va a crear en Jiku (los requisitos del plan con su acción), lo
aprobás si coincide con el plan que confirmaste.

Ante cualquier otra pregunta que sea consecuencia directa de lo anterior, confirmás la recomendación.
