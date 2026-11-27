# Avisos — brief

La empresa tiene varios sistemas internos y algunos clientes que necesitan avisarle a terceros cuando pasa
algo (se aprobó un pedido, venció un pago, cambió un estado). Hoy cada sistema implementa sus propios
envíos, con reintentos a medias y sin registro. Queremos un servicio único, **Avisos**, que reciba
eventos por una API y los reenvíe a los destinos configurados.

- Cada **cliente** (un sistema interno o un cliente externo) se identifica con un **token de API**.
  Un cliente puede tener varios tokens (para rotarlos).
- Cada cliente configura sus **destinos**: un webhook HTTP (URL) o una dirección de email. Cada destino
  se suscribe a uno o más **tipos de evento** (texto libre, por ejemplo `pedido.aprobado`).
- El cliente **publica eventos** con un tipo y un cuerpo JSON. Avisos lo entrega a todos los destinos
  del cliente suscritos a ese tipo.
- Las entregas se **reintentan** con espera creciente si el destino falla. Los webhooks van firmados
  para que el destino pueda verificar que vienen de Avisos.
- El cliente puede **consultar el historial** de entregas de sus eventos: qué se entregó, qué falló y
  por qué.
- No hay pantallas: todo se usa por API. Las altas de clientes y tokens las hace el equipo de
  infraestructura con un comando.
