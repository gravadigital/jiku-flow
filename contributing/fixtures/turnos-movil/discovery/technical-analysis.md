---
created: 2026-11-07
last_updated: 2026-11-07
status: closed
functional_analysis: _jflow/discovery/functional-analysis.md
domain_analysis: _jflow/discovery/domain-analysis.md
---

# Análisis técnico — Turnos móvil

## Servicios
| Servicio | Tipo | Lenguaje | Superficies | Expone |
|---|---|---|---|---|
| api | service | go | — | HTTP |
| app | frontend | flutter | App del cliente, Gestión de la peluquería | — |

`app` es una sola aplicación para Android e iOS; muestra la cara de cada superficie según el rol de la cuenta (ACC-03). `api` sirve además la página que se muestra al abrir el link de recuperación desde una computadora (ACC-E11) y los archivos de asociación de dominio que permiten que el link abra la app (ACC-07).

## Módulos

### api
| Módulo | Entidades | Bloques |
|---|---|---|
| access | Cuenta, Sesión, Link de recuperación | ACC |
| catalog | Servicio, Peluquero, Franja | CAT, PEL |
| scheduling | Turno | RES, MIS, CAN, AGE |

**Interacciones**
| De → A | Para qué | Requisito |
|---|---|---|
| scheduling → catalog | Consultar servicios activos, peluqueros ofrecibles y sus franjas para calcular los horarios ofrecidos y validar la reserva | RES-02, RES-03, RES-05, RES-E2 |
| scheduling → catalog | Consultar el estado del peluquero, del servicio, la relación entre ambos y las franjas para calcular los motivos de destacado | PEL-10, AGE-03 |
| access → scheduling | Cancelar los turnos próximos y borrar todos los turnos de una cuenta que se borra, en la misma transacción | ACC-13 |

## Persistencia e infraestructura
| Componente | Tecnología | Dueño | Usado por | Para qué |
|---|---|---|---|---|
| Base principal | PostgreSQL | api | — | Todas las entidades |

## Comunicación
| De → A | Protocolo | Tipo | Para qué |
|---|---|---|---|
| app → api | HTTP | sincrónica | Todas las lecturas y escrituras de las dos superficies |
| api → servidor SMTP | SMTP | sincrónica | Email de recuperación de contraseña (ACC-07), enviado dentro del pedido; si falla, la respuesta al usuario no cambia (ACC-E5) y no se reintenta (ACC-E7). Cualquier servidor SMTP configurado por variables de entorno; en el entorno local, Mailpit |

## Autenticación y autorización

### Credenciales
| ID | Credencial | Emisor | Se obtiene | Vida y renovación | Revocación |
|---|---|---|---|---|---|
| CRED-01 | Sesión de la app | api.access | Email y contraseña (ACC-03) | Una por celular; una cuenta puede tener varias a la vez. Se renueva con cada uso; vence tras la **duración de sesión sin uso** (ACC-05) | Cerrar sesión (ACC-06); elegir una contraseña nueva cierra todas las de la cuenta (ACC-09); borrar la cuenta (ACC-13) |
| CRED-02 | Token del link de recuperación | api.access, al pedir la recuperación | En el link del email (ACC-07) | Durante la **vigencia del link de recuperación**; un solo uso (ACC-08) | Al usarse (ACC-09) o al pedir otro (ACC-08) |

### Uso
| Credencial | Rol | Desde | Pasa por | Verifica |
|---|---|---|---|---|
| CRED-01 | cliente | App del cliente | — | api |
| CRED-01 | dueña | Gestión de la peluquería | — | api |
| CRED-02 | — | Link del email, abierto en app | — | api |
| ninguna | — | app: registro, inicio de sesión y pedido de recuperación | — | api |

### Roles
| Rol | Actores | Permite |
|---|---|---|
| cliente | U-02 | Su propia cuenta y sus propios turnos; consulta el catálogo ofrecible (servicios, peluqueros y horarios ofrecidos). Nunca ve datos de otros clientes: un horario ocupado solo deja de ofrecerse |
| dueña | U-01 | Todo el catálogo (servicios, peluqueros, franjas) y todos los turnos, con nombre y teléfono del cliente (no su email). No edita ni borra cuentas de clientes ni reserva turnos |

## Garantías
| Regla | Mecanismo | Dónde |
|---|---|---|
| INV-01 Sin superposición por peluquero | Restricción de exclusión sobre peluquero + rango [inicio, fin) para turnos no cancelados | Base principal |
| INV-02 Tope de turnos próximos | Conteo dentro de la transacción de reserva, con bloqueo de la fila de la cuenta del cliente | api.scheduling |
| INV-03 Sin superposición de franjas | Restricción de exclusión sobre peluquero + día de la semana + rango de horas | Base principal |
| INV-04 Unicidad de email y nombres | Índices únicos sobre el email y los nombres en minúsculas | Base principal |
| INV-05 Un link vigente por cuenta | Índice único parcial sobre la cuenta para links VIGENTE; el pedido nuevo marca el anterior REEMPLAZADO en la misma transacción | Base principal + api.access |
| INV-06 Nada huérfano al borrar una cuenta | Claves foráneas con borrado en cascada desde la cuenta, dentro de una sola transacción | Base principal + api.access |
| INV-07 Asistencia después del inicio, cancelación antes | Actualización condicional sobre el estado y la hora de inicio, con el reloj del servidor, dentro de la transacción | api.scheduling |
| RES-E1 Solo una reserva prospera | La restricción de INV-01 rechaza la segunda; con «cualquiera», se prueba el siguiente peluquero libre por orden de RES-05 antes de rechazar | Base principal + api.scheduling |
| CAN-E3 Vale la primera cancelación | Actualización condicional: solo cambia un turno en RESERVADO | api.scheduling |
| ACC-E2 Una sola cuenta por email | Índice único de INV-04 | Base principal |
| ACC-10 Contador de intentos fallidos | Incremento atómico en la base; el bloqueo se fija en la misma actualización | api.access |
| ACC-09 Contraseña nueva atómica | Una sola transacción: cambia la contraseña, marca el link USADO, borra las sesiones y reinicia el contador | api.access |
| ACC-13 Borrado de cuenta atómico | Una sola transacción: cancela los turnos próximos, borra la cuenta y en cascada todo lo suyo | api.access → api.scheduling |
| ACC-E12 Límite de intentos de autenticación | Limitador por dirección de origen del cliente en registro, inicio de sesión y pedido de recuperación | api.access |

## Flujos clave

### Reserva (RES-01, RES-05, RES-06)
Un cliente elige servicio, peluquero o «cualquiera», día y horario, y confirma; el turno queda reservado o recibe un aviso para elegir de nuevo.

1. app → api.scheduling: pide horarios ofrecidos → api.catalog: servicio activo, peluqueros ofrecibles y franjas (RES-02, RES-03) → se descuentan los turnos no cancelados y se aplican anticipación y horizonte (RES-04)
2. app → api.scheduling: confirma con la sesión (CRED-01, rol cliente)
3. api.scheduling: transacción → bloquea la cuenta y cuenta sus turnos próximos (INV-02) → si llegó al tope: RES-E3
4. api.scheduling → api.catalog: revalida servicio, peluquero y franja → si dejó de ofrecerse: RES-E2
5. api.scheduling: con «cualquiera», ordena los peluqueros libres por turnos del día (RES-05) → inserta el turno copiando duración y precio (RES-08) → INV-01 (restricción de exclusión); si choca, prueba el siguiente; si no queda ninguno: RES-E1

### Cancelación (CAN-01, CAN-03, CAN-E3)
El cliente cancela un turno propio dentro del plazo, o la dueña cancela cualquier turno que no empezó con un motivo; el horario queda libre.

1. app → api.scheduling: cancela con la sesión (CRED-01) → cliente: solo su turno (CAN-E4); dueña: motivo obligatorio (CAN-E5)
2. api.scheduling: actualización condicional → RESERVADO y antes del plazo (cliente, CAN-E1) o del inicio (dueña, CAN-E2) (INV-07) → si no cambió nada: CAN-E3
3. El horario vuelve a ofrecerse en la próxima consulta (CAN-06); no se envía nada (CAN-08)

### Recuperación de contraseña (ACC-07, ACC-08, ACC-09)
Quien olvidó la contraseña pide un link, lo abre en el celular y elige una nueva; sus otras sesiones se cierran.

1. app → api.access: pide la recuperación (límite ACC-E12) → si el email tiene cuenta: marca el link anterior REEMPLAZADO y crea uno VIGENTE (INV-05) → api → servidor SMTP: envía el link; la respuesta es la misma con o sin cuenta (ACC-E5)
2. El link abre la app (ACC-07); sin la app: tienda o página de api (ACC-E11)
3. app → api.access: envía el token (CRED-02) y la contraseña nueva → transacción ACC-09 → si el link no es válido: ACC-E6

### Borrado de cuenta (ACC-12, ACC-13)
El cliente borra su cuenta reingresando la contraseña; desaparecen sus datos y sus turnos, y los horarios próximos quedan libres.

1. app → api.access: pide el borrado con la sesión y la contraseña → si no coincide: ACC-E9
2. api.access: una sola transacción → api.scheduling: cancela los turnos próximos → borra la cuenta y en cascada turnos, sesiones y links (INV-06)
3. La sesión de otro celular falla en su próxima acción (ACC-E10)

### Agenda del día (AGE-01, AGE-03, AGE-07, PEL-10)
La dueña ve los turnos de un día con los destacados y marca la asistencia de los que ya empezaron.

1. app → api.scheduling: pide la agenda del día, con filtro de peluquero opcional (AGE-04), con la sesión (rol dueña)
2. api.scheduling → api.catalog: estado de peluqueros y servicios, servicios de cada peluquero y franjas → calcula los motivos de destacado de cada turno próximo (PEL-10)
3. app → api.scheduling: marca la asistencia → actualización condicional: inicio ya cumplido y turno no cancelado (INV-07, AGE-E1, AGE-E2); si el turno cambió o no existe: AGE-E3

## Decisiones técnicas
| ID | Tema | Decisión | Descartado | Motivo | Afecta |
|---|---|---|---|---|---|
| DEC-T01 | Lenguaje de la app | Flutter | React Native (Expo); nativo con Kotlin y Swift | Un solo código para Android e iOS | app |
| DEC-T02 | Lenguaje de la API | Go | Node (TypeScript); Python | Eficiencia y despliegue simple | api |
| DEC-T03 | CI/CD | GitLab, con su registry de contenedores | GitHub Actions con GitHub Container Registry | Es la plataforma de la agencia | todos los servicios |
| DEC-T04 | Destino del link de recuperación | El link abre la app (deep link); sin la app, tienda o página informativa | Una página web mínima para elegir la contraseña; un código en el email | No sumar una superficie web | ACC-07, ACC-E11 |
