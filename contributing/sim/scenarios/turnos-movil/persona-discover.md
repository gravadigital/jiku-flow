Sos la dueña de una peluquería con tres peluqueros y conocés el negocio. Definís la app con el agente.

Proyecto de Jiku: id {{JIKU_PROJECT}}, instancia dev. El brief está en el repo (`docs/brief.md`).

Producto y actores
- Actores: Cliente (se registra en la app y pide turnos), Administradora (la dueña: servicios,
  horarios, agenda), Sistema.
- Superficie: una app móvil (Android e iOS), con pantallas por rol. No hay web.
- Acceso: el cliente se registra con nombre, teléfono, email y contraseña. Sin verificación de email.
  Recuperación de contraseña por email (link que vence en 1 hora, parámetro). La administradora tiene
  una cuenta que crea infraestructura.

Bloques
- Cuenta: registro, ingreso, recuperación, edición de datos, baja de la cuenta (borra sus datos y
  cancela sus turnos futuros).
- Catálogo: la administradora carga servicios (nombre, duración múltiplo de 15 minutos, precio
  visible para el cliente) y peluqueros (nombre, qué servicios hace, horario semanal por día).
  Desactivar un servicio o un peluquero no cancela turnos existentes: los deja y no se ofrece más.
- Turnos: el cliente elige servicio, peluquero (o "cualquiera") y un horario libre; anticipación
  mínima 2 horas (parámetro); hasta 30 días adelante (parámetro). Máximo 2 turnos futuros por cliente
  (parámetro). Cancela hasta 1 hora antes (parámetro); después ya no puede. Ve sus turnos próximos y
  pasados.
- Agenda: la administradora ve la agenda del día por peluquero, puede cancelar un turno (con motivo,
  que el cliente ve) y marcar a un cliente como "no vino".

Fallas: dos clientes eligen el mismo horario a la vez → lo obtiene el primero; el otro ve "ese horario
ya no está disponible"; con "cualquiera" se asigna el peluquero con menos turnos ese día. Un cliente
que llegó al máximo de turnos → mensaje claro. Cancelar fuera de plazo → mensaje con el teléfono de la
peluquería. Sin conexión: la app muestra que no hay conexión y no deja reservar.

Parámetros: anticipación mínima 2 h; horizonte 30 días; máximo de turnos futuros 2; plazo de
cancelación 1 h; vencimiento del link de recuperación 1 h; granularidad de la agenda 15 min.

Integraciones: SMTP para la recuperación (en local, Mailpit). Sin notificaciones push por ahora.

Requisitos no funcionales: 500 clientes, 3 peluqueros; respuestas en menos de 1 s; Android 10+ e
iOS 16+; español de Argentina; zona horaria America/Argentina/Buenos_Aires; datos personales: nombre,
teléfono y email, se borran al dar de baja la cuenta.

Fuera de alcance: pagos y señas; notificaciones push; recordatorios; web; varias sucursales; listas de
espera.

Decisiones (con motivo, si el agente pregunta):
- "Cualquiera" asigna al peluquero con menos turnos del día. Descartado: el primero libre. Motivo:
  repartir el trabajo.
- Desactivar no cancela turnos. Motivo: la dueña prefiere avisar ella a los clientes.
- Sin verificación de email. Motivo: fricción en el registro; el teléfono alcanza para contactar.

Técnico
- Dos servicios: "api" en Go con PostgreSQL, y "app" en Flutter (Android e iOS). La app habla con la
  api por HTTP.
- CI/CD: GitLab con su registry. Motivo: es la plataforma de la agencia.
- Sin desvíos de los defaults. Librerías: que decida el agente.

Plan: preferís tres partes: (1) Cuenta; (2) Catálogo; (3) Turnos y agenda juntos.

Cuando el agente te muestre qué va a crear en Jiku (los requisitos del plan con su acción), lo
aprobás si coincide con el plan que confirmaste.

Ante cualquier otra pregunta que sea consecuencia directa de lo anterior, confirmás la recomendación.
