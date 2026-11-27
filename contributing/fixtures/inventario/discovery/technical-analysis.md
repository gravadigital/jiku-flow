---
created: 2026-11-07
last_updated: 2026-11-07
status: closed
functional_analysis: _jflow/discovery/functional-analysis.md
domain_analysis: _jflow/discovery/domain-analysis.md
---

# Análisis técnico — Inventario

## Servicios
| Servicio | Tipo | Lenguaje | Superficies | Expone |
|---|---|---|---|---|
| api | service | node (TypeScript) | — | HTTP + NATS |
| worker | service | node (TypeScript) | — | — |
| web | frontend | astro (SSR, adaptador de Node) | Aplicación web | — |

## Módulos

### api
| Módulo | Entidades | Bloques |
|---|---|---|
| access | Cuenta | ACC, RET |
| inventory | Equipo | EQU |
| loans | Préstamo | PRE |

**Interacciones**
| De → A | Para qué | Requisito |
|---|---|---|
| loans → access | Verificar que quien pide sea una cuenta EMPLEADO activa y bloquear su fila para contar sus préstamos sin devolver | PRE-02, PRE-04, PRE-10 |
| loans → inventory | Verificar que el equipo esté DISPONIBLE y cambiar su estado al prestar y al devolver, en la misma transacción | PRE-02, PRE-05, PRE-06 |
| loans → access | Resolver los destinatarios de un aviso (email del empleado si su cuenta está ACTIVA; emails de los administradores activos) para responder al worker | VEN-05, ACC-15, NOT-03 |

### worker
| Módulo | Entidades | Bloques |
|---|---|---|
| reminders | Aviso programado | VEN |
| notifications | — | NOT |

**Interacciones**
| De → A | Para qué | Requisito |
|---|---|---|
| reminders → notifications | Encolar NOT-01, o NOT-02 y NOT-03, para los destinatarios resueltos | VEN-01, VEN-02 |

El paso a vencido (VEN-03, y su recuperación en VEN-06) lo ejecuta un proceso de api.loans, porque el
Préstamo es de la api (DEC-T05); el resto de VEN vive en worker.reminders.

## Persistencia e infraestructura
| Componente | Tecnología | Dueño | Usado por | Para qué |
|---|---|---|---|---|
| Base principal | PostgreSQL | api | — | Cuenta, Equipo, Préstamo; outbox de eventos |
| Base del worker | PostgreSQL | worker | — | Aviso programado (VEN-01..06); cola de emails con reintentos (NOT-E1, NOT-E2) |
| Bus de mensajes | NATS JetStream | api | worker (consume los eventos de préstamos y cuentas; pide destinatarios por request-reply) | VEN-01, VEN-02, VEN-04, VEN-05, NOT-04, NOT-05 |

## Comunicación
| De → A | Protocolo | Tipo | Para qué |
|---|---|---|---|
| web → api | HTTP | sincrónica | Todas las lecturas y escrituras de la aplicación web (ACC, EQU, PRE) |
| api → worker | NATS pub/sub | asincrónica | Eventos de préstamos y cuentas (PRE-02, PRE-05, PRE-06, PRE-09, ACC-01, ACC-03, ACC-07, ACC-16, ACC-18) |
| worker → api | NATS request-reply | sincrónica | Estado del préstamo y destinatarios en el momento de enviar un aviso (VEN-05, ACC-15, NOT-03) |
| worker → servidor SMTP | SMTP | asincrónica | NOT-01..05 (INT-01). En local, Mailpit |

**Eventos**
| Evento | Publica | Consume | Transición |
|---|---|---|---|
| loan.created | api | worker | Préstamo: (creación) → ACTIVO |
| loan.returned | api | worker | Préstamo: ACTIVO → DEVUELTO, VENCIDO → DEVUELTO |
| loan.extended | api | worker | Préstamo: VENCIDO → ACTIVO, o cambio de vencimiento sin cambio de estado (PRE-09) |
| account.invited | api | worker | Cuenta: (creación) → INVITADA, DESACTIVADA → INVITADA, o nuevo token en INVITADA (ACC-03) |
| account.password_reset_requested | api | worker | Sin transición: nuevo token de recuperación en una Cuenta ACTIVA (ACC-07) |

## Autenticación y autorización

### Credenciales
| ID | Credencial | Emisor | Se obtiene | Vida y renovación | Revocación |
|---|---|---|---|---|---|
| CRED-01 | Sesión | api.access | Email y contraseña (ACC-04) | Vence tras la **inactividad máxima de sesión**; cada actividad la renueva | Cerrar sesión (ACC-06); desactivación (ACC-13); bloqueo (ACC-11); cambio o restablecimiento de contraseña revoca las otras sesiones (ACC-10) |
| CRED-02 | Token de invitación | api.access, al invitar | En el link de NOT-04 | **Vigencia de la invitación**; un solo uso | Al usarse (ACC-02), al reenviar (ACC-03), al desactivar la cuenta (ACC-13) |
| CRED-03 | Token de recuperación | api.access, al pedir el restablecimiento | En el link de NOT-05 | **Vigencia del link de recuperación**; un solo uso | Al usarse (ACC-08) o al pedir otro (uno vigente por cuenta) |
| CRED-04 | Usuario de NATS por servicio | Configuración del servidor NATS | Variables de entorno de cada servicio | Sin vencimiento; se rota por configuración | Cambiando la configuración del servidor NATS |

### Uso
| Credencial | Rol | Desde | Pasa por | Verifica |
|---|---|---|---|---|
| CRED-01 | admin, employee | Aplicación web | web: la recibe en cookie y la reenvía | api |
| CRED-02 | — | Aplicación web, link de NOT-04 | web: la reenvía | api |
| CRED-03 | — | Aplicación web, link de NOT-05 | web: la reenvía | api |
| ninguna | anonymous | Aplicación web (ingreso, pedido de restablecimiento) | web | api |
| CRED-04 | servicio | api, worker | — | NATS (permisos por subject: la api publica eventos y responde pedidos; el worker consume eventos y hace pedidos) |

### Roles
| Rol | Actores | Permite |
|---|---|---|
| admin | U-01 | Todas las operaciones de ACC, EQU y PRE sobre todas las cuentas, equipos y préstamos, salvo pedir préstamos (PRE-10) y desactivar su propia cuenta (ACC-14) |
| employee | U-02 | Su propia sesión y contraseña; ver los equipos DISPONIBLES; pedir préstamos para sí y ver y devolver solo sus propios préstamos |
| anonymous | — | Ingresar, pedir el restablecimiento de contraseña y usar los links de CRED-02 y CRED-03 |

## Garantías
| Regla | Mecanismo | Dónde |
|---|---|---|
| INV-01 Un préstamo sin devolver por equipo | Índice único parcial sobre el equipo en los préstamos ACTIVO o VENCIDO; el pedido bloquea la fila del equipo, verifica DISPONIBLE y cambia su estado en la misma transacción que crea el préstamo; la devolución, igual | Base principal + api.loans |
| INV-02 Tope de préstamos por empleado | Dentro de la transacción del pedido, bloqueo de la fila de la cuenta del empleado y conteo de sus préstamos sin devolver | api.loans |
| INV-03 Préstamos solo de empleados | Verificación del rol dentro de la transacción del pedido; el rol de una cuenta no cambia | api.loans |
| INV-04 Último administrador activo | ACC-14 rechaza la autodesactivación; la desactivación bloquea la fila del administrador que actúa y verifica que siga ACTIVA en la misma transacción | api.access |
| INV-05 Un aviso por préstamo, vencimiento y tipo | Índice único parcial sobre préstamo + vencimiento + tipo en los avisos no cancelados | Base del worker |
| ACC-17 Email único | Índice único sobre el email, guardado en minúsculas; al anonimizar, el email se reemplaza por un valor único, así el original queda libre (RET-03) | Base principal |
| EQU-03 Número de serie único | Índice único sobre el número de serie | Base principal |
| ACC-E12 Límite de intentos de autenticación | Contador por dirección del cliente en una ventana deslizante; la web reenvía la dirección real del navegador y la api solo la acepta de la web | api.access |
| ACC-11 Contador de intentos | Incremento atómico en la base, con el bloqueo calculado en la misma sentencia | api.access |
| Publicación de eventos | Outbox transaccional: el evento se guarda en la misma transacción que el cambio y un proceso de la api lo publica en JetStream con reintentos; se borra del outbox al publicarse | Base principal + api |
| Consumo de eventos | JetStream con confirmación explícita y reentrega; el worker procesa cada evento de forma idempotente (id del evento + INV-05) | worker.reminders, worker.notifications |
| Links de acceso en tránsito (CRED-02, CRED-03) | Stream con retención por interés: el mensaje se borra cuando el worker lo confirma; la cola de emails borra el cuerpo al enviarse o descartarse | NATS JetStream + Base del worker |
| NOT-E1 Reintento de email | Cola de emails con reintentos hasta los **reintentos de envío de email** dentro de la **ventana de reintento de email**; después, fallido | Base del worker + worker.notifications |
| VEN-05 Decisión al enviar | Request-reply a la api en el momento de enviar; si la api no responde, el aviso sigue PROGRAMADO y se reintenta en la próxima revisión mientras siga vigente (VEN-06) | worker.reminders |
| VEN-06 Recuperación de avisos | Revisión cada minuto y al arrancar: los avisos PROGRAMADO con hora pasada se envían si siguen vigentes y se descartan si no | worker.reminders |
| VEN-03 Paso a vencido | Proceso a las 00:00 de la zona del producto y al arrancar: pasa a VENCIDO todo préstamo ACTIVO con vencimiento anterior a hoy | api.loans |
| RET-01 Anonimización | Proceso diario a las 03:00 y al arrancar; cada cuenta se anonimiza en su propia transacción, bloqueando su fila (RET-E2) | api.access |

## Flujos clave

### Pedido de préstamo (PRE-02, PRE-04, PRE-E1..E4)
Un empleado pide un equipo disponible; queda prestado en el acto y el worker programa sus dos avisos.

1. web → api.loans: pide el préstamo de un equipo (CRED-01, rol employee)
2. api.loans → api.access: bloquea la fila de la cuenta, verifica EMPLEADO ACTIVA (INV-03) y cuenta sus préstamos sin devolver (INV-02) → si llegó al tope: PRE-E3
3. api.loans → api.inventory: bloquea la fila del equipo y verifica DISPONIBLE → si no: PRE-E1
4. api.loans: en la misma transacción crea el préstamo ACTIVO con su vencimiento (PRE-03), pasa el equipo a PRESTADO (INV-01) y guarda loan.created en el outbox
5. api → NATS: publica loan.created → worker.reminders: crea los avisos PREVIO y VENCE_HOY (INV-05)

### Aviso de vencimiento (VEN-01, VEN-02, VEN-05, NOT-01..03)
A la hora de los avisos, el worker manda el aviso previo o el de «vence hoy» solo si el préstamo sigue sin devolver, a los destinatarios vigentes.

1. worker.reminders: en la revisión de cada minuto toma los avisos PROGRAMADO con hora cumplida (VEN-06)
2. worker.reminders → api.loans (NATS request-reply): estado del préstamo y destinatarios → api.access (ACC-15, NOT-03)
3. Si el préstamo está DEVUELTO: el aviso pasa a CANCELADO. Si no hay destinatarios: DESCARTADO. Si la api no responde: sigue PROGRAMADO
4. worker.reminders → worker.notifications: encola NOT-01, o NOT-02 y NOT-03; el aviso pasa a ENVIADO
5. worker.notifications → servidor SMTP: envía con reintentos (NOT-E1); registra los rebotes (NOT-E2)

### Devolución y extensión (PRE-05, PRE-06, PRE-09, VEN-04)
El empleado o un administrador registra la devolución, o un administrador extiende el vencimiento; los avisos pendientes se cancelan o se reprograman.

1. web → api.loans: devuelve (employee, solo su préstamo; o admin) o extiende (admin)
2. api.loans: devolución → en una transacción, el préstamo pasa a DEVUELTO, el equipo a DISPONIBLE (INV-01) y se guarda loan.returned en el outbox → si ya estaba devuelto: PRE-E5
3. api.loans: extensión → verifica PRE-E6 y PRE-E7; en una transacción guarda el vencimiento original y el nuevo, pasa VENCIDO → ACTIVO si corresponde y guarda loan.extended en el outbox
4. api → NATS → worker.reminders: loan.returned cancela los avisos PROGRAMADO; loan.extended los cancela y crea los del nuevo vencimiento (INV-05)

### Paso a vencido (VEN-03, VEN-06)
Al terminar el día del vencimiento, los préstamos sin devolver pasan a vencido, aunque el sistema haya estado caído.

1. api.loans: a las 00:00 de la zona del producto y al arrancar, pasa a VENCIDO todo préstamo ACTIVO con vencimiento anterior a hoy. No publica eventos ni avisos

### Invitación y restablecimiento (ACC-01, ACC-03, ACC-07, ACC-16, ACC-18, NOT-04, NOT-05)
Un administrador invita una cuenta (o la reenvía o reactiva), o alguien pide restablecer su contraseña; el worker manda el email con el link.

1. web → api.access: invita, reenvía o reactiva (admin), o pide el restablecimiento (anonymous); en el despliegue, ACC-18
2. api.access: en una transacción crea o actualiza la cuenta, guarda el token hasheado (CRED-02 o CRED-03) y guarda account.invited o account.password_reset_requested en el outbox, con el link → para un email sin cuenta activa no guarda nada (ACC-E2)
3. api → NATS → worker.notifications: encola NOT-04 o NOT-05 y lo envía por SMTP (NOT-E1); el mensaje se borra del stream al confirmarse

## Decisiones técnicas
| ID | Tema | Decisión | Descartado | Motivo | Afecta |
|---|---|---|---|---|---|
| DEC-T01 | Envío de avisos | Un servicio aparte, worker, que consume los eventos de la api y programa y envía los avisos | Un módulo de notificaciones dentro de la api | Que la api no espere: un email lento no afecta al panel | worker, VEN, NOT |
| DEC-T02 | Bus entre api y worker | NATS JetStream, con outbox en la api | Outbox en PostgreSQL leído por el worker con LISTEN/NOTIFY | Separar los avisos de la api: un email lento no afecta al panel | api, worker |
| DEC-T03 | Lenguajes | api y worker en Node.js con TypeScript; web en Astro | Go para api y worker; Next.js o React SPA para la web | Un solo lenguaje: TypeScript en todo el producto; Astro porque la web es simple y liviana | api, worker, web |
| DEC-T04 | CI/CD | GitHub Actions, con GitHub Container Registry | GitLab CI con su registry | El repositorio está en GitHub | todos los servicios |
| DEC-T05 | Paso a vencido | Lo ejecuta un proceso de la api | Que el worker publique el vencimiento y la api lo consuma | El préstamo es de la api; el worker solo manda avisos | VEN-03, VEN-06 |
| DEC-T06 | Emails de acceso | También los envía el worker, a partir de eventos de la api | Que la api los envíe directo por SMTP | Que la api no espere: un email lento no afecta al panel | NOT-04, NOT-05 |
| DEC-T07 | Destinatarios de los avisos | El worker se los pide a la api por request-reply al enviar | Que el worker mantenga una copia de las cuentas | Que el worker no guarde datos personales | VEN-05, NOT-03, RET-01 |
| DEC-T08 | Modo de la web | Astro con servidor (SSR) que reenvía la sesión a la api | Astro estático con llamadas directas del navegador a la api | Que el navegador no hable directo con la api | web |
| DEC-T09 | Autenticación en NATS | Un usuario por servicio, con permisos por subject | Sin autenticación, confiando en la red privada | Mínimo privilegio: cada servicio solo toca sus subjects | api, worker |
| DEC-T10 | Frecuencia de los procesos | Worker: cada minuto; paso a vencido: 00:00; anonimización: diaria a las 03:00; todos también al arrancar | Todos cada 5 minutos | Acompañan las reglas: el aviso sale a su hora, el vencido al terminar el día y la retención se cuenta en días | VEN-01, VEN-02, VEN-03, VEN-06, RET-01 |
