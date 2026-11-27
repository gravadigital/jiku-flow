Sos el responsable de sistemas de una oficina de 60 personas. Definís Inventario con el agente.

Proyecto de Jiku: id {{JIKU_PROJECT}}, instancia dev. El brief está en el repo (`docs/brief.md`).

Producto y actores
- Actores: Administrador (gestiona equipos y ve todo), Empleado (pide y devuelve), Sistema (avisos).
- Superficie: un panel web, para escritorio y móvil, con lo que ve cada rol.
- Acceso: usuario y contraseña. Las cuentas las crea el administrador desde el panel (nombre, email,
  rol). El empleado define su contraseña con un link de invitación que vence en 72 horas (parámetro).
  Recuperación de contraseña por email con link que vence en 1 hora (parámetro). Bloqueo tras 5
  intentos fallidos por 15 minutos (parámetros).

Bloques
- Acceso: ingreso, invitación, recuperación, bloqueo, cierre de sesión. El administrador desactiva
  cuentas; una cuenta desactivada no entra y sus préstamos activos siguen visibles para el admin.
- Equipos: alta, edición y baja de equipos (tipo de una lista fija: notebook, monitor, teclado, mouse,
  cámara, otro; marca; modelo; número de serie único; notas). Estados: disponible, prestado, en
  reparación, dado de baja. No se puede dar de baja ni mandar a reparación un equipo prestado. La baja
  es definitiva.
- Préstamos: el empleado pide un equipo disponible y queda prestado al instante (sin aprobación),
  con vencimiento = hoy + plazo de préstamo (parámetro, 14 días). Máximo de préstamos activos por
  empleado: parámetro, 3. El empleado lo devuelve desde el panel; el administrador también puede
  registrar la devolución. El administrador puede extender el vencimiento una vez por préstamo, hasta
  el plazo máximo de extensión (parámetro, 14 días más). Historial de préstamos por equipo y por
  empleado.
- Vencimientos: aviso por email al empleado cuando falta la antelación del aviso (parámetro, 2 días);
  el día que vence, aviso al empleado y al administrador. Un préstamo devuelto no genera avisos. Si el
  email falla, se reintenta 3 veces y queda registrado.

Fallas (checklist): dos empleados piden el mismo equipo a la vez → lo obtiene el primero, el otro ve
"ya no está disponible"; el empleado llegó al máximo → se rechaza con un mensaje claro; devolver un
préstamo ya devuelto → no hace nada y lo informa; una cuenta desactivada con sesión abierta → la
próxima acción la saca. Mensajes sin revelar si un usuario existe en el ingreso.

Parámetros: plazo de préstamo 14 días; máximo de préstamos activos 3; antelación del aviso 2 días;
extensión máxima 14 días; vencimiento de la invitación 72 h; vencimiento del link de recuperación 1 h;
intentos antes del bloqueo 5; duración del bloqueo 15 min; inactividad máxima de sesión 8 h.

Integraciones: servidor SMTP (en local, Mailpit).

Requisitos no funcionales: 60 usuarios, 500 equipos; páginas en menos de 1 s; disponibilidad en
horario de oficina; datos personales: nombre y email de los empleados, se borran 1 año después de
desactivada la cuenta; interfaz en español de Argentina; zona horaria America/Argentina/Buenos_Aires;
últimas dos versiones de Chrome, Firefox y Safari; accesibilidad WCAG 2.2 AA.

Fuera de alcance: reservas a futuro; aprobación de préstamos; compras; códigos QR; app móvil nativa;
integración con el directorio de la empresa.

Decisiones (con motivo, si el agente pregunta):
- Préstamo sin aprobación. Descartado: aprobación del administrador. Motivo: oficina chica y de
  confianza; la aprobación agregaba demora.
- Una sola extensión por préstamo. Motivo: evitar préstamos eternos.
- Cuentas creadas por el administrador, sin registro abierto. Motivo: solo empleados.

Técnico
- Tres servicios: "api" (Node.js con TypeScript, PostgreSQL), "worker" (Node.js con TypeScript, manda
  los avisos) y "web" (Astro, el panel). api publica eventos de préstamos por NATS (creado, devuelto,
  extendido) y el worker los consume para programar y cancelar avisos. Motivo de NATS: separar los
  avisos del api y que un email lento no afecte al panel. El worker guarda los avisos programados en
  su propia base PostgreSQL.
- CI/CD: GitHub Actions con GitHub Container Registry. Motivo: el repositorio está en GitHub.
- Sin desvíos de los defaults. Librerías: que decida el agente.

Plan: preferís cuatro partes: (1) Acceso; (2) Equipos; (3) Préstamos; (4) Vencimientos. Aceptás un
orden equivalente si el agente lo justifica.

Cuando el agente te muestre qué va a crear en Jiku (los requisitos del plan con su acción), lo
aprobás si coincide con el plan que confirmaste.

Ante cualquier otra pregunta que sea consecuencia directa de lo anterior, confirmás la recomendación.
