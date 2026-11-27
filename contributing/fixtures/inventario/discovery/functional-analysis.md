---
created: 2026-11-07
last_updated: 2026-11-07
status: closed
base_documents: docs/brief.md
---

# Análisis funcional — Inventario

## Resumen
**Inventario** — Aplicación web para registrar los equipos que la oficina presta a sus empleados
(notebooks, monitores, teclados, cámaras), quién tiene cada uno y hasta cuándo. Avisa por email al
empleado cuando un préstamo está por vencer y, el día que vence sin haberse devuelto, al empleado y a los
administradores.

## Actores
| ID | Actor | Acceso | Recuperación de acceso |
|---|---|---|---|
| U-01 | Administrador | Usuario y contraseña; la cuenta la crea otro administrador (la primera, en el despliegue) | Restablecimiento de contraseña con un link enviado a su email |
| U-02 | Empleado | Usuario y contraseña; la cuenta la crea un administrador. No hay registro abierto | Restablecimiento de contraseña con un link enviado a su email |
| U-03 | Sistema | — | — |

## Superficies
| Superficie | Plataforma | Actores | Viewports |
|---|---|---|---|
| Aplicación web | web | U-01, U-02 | desktop (principal), mobile |

## Funcionalidades
| Bloque | Prefijo | Superficie(s) |
|---|---|---|
| Acceso | ACC | Aplicación web |
| Equipos | EQU | Aplicación web |
| Préstamos | PRE | Aplicación web |
| Vencimientos | VEN | — (proceso del sistema) |
| Retención | RET | — (proceso del sistema) |
| Notificaciones | NOT | — (transversal) |

### ACC — Acceso
**Superficie(s):** Aplicación web

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| ACC-01 | Invitar una cuenta con nombre, email y rol (empleado o administrador). La cuenta queda invitada y se envía NOT-04, con un link para definir la contraseña válido durante la **vigencia de la invitación** | U-01 |
| ACC-02 | Aceptar la invitación definiendo la contraseña desde el link. La cuenta queda activa | U-01, U-02 |
| ACC-03 | Reenviar la invitación de una cuenta invitada: genera un link nuevo, invalida el anterior y envía NOT-04 | U-01 |
| ACC-04 | Ingresar con email y contraseña | U-01, U-02 |
| ACC-05 | La sesión vence tras la **inactividad máxima de sesión** sin actividad | — |
| ACC-06 | Cerrar la sesión | U-01, U-02 |
| ACC-07 | Pedir el restablecimiento de la contraseña indicando el email. Si hay una cuenta activa con ese email, se envía NOT-05, con un link de un solo uso válido durante la **vigencia del link de recuperación** | U-01, U-02 |
| ACC-08 | Restablecer la contraseña desde el link. Termina un bloqueo vigente y reinicia el contador de intentos fallidos | U-01, U-02 |
| ACC-09 | Cambiar la propia contraseña con la sesión abierta, indicando la actual | U-01, U-02 |
| ACC-10 | Al cambiar o restablecer la contraseña se cierran todas las otras sesiones de la cuenta | Sistema |
| ACC-11 | Al llegar a los **intentos fallidos antes del bloqueo** seguidos, la cuenta queda bloqueada durante la **duración del bloqueo** y se cierran sus sesiones. Cuentan los ingresos (ACC-04) y los cambios de contraseña (ACC-09) con la contraseña incorrecta. Un ingreso correcto o el fin del bloqueo reinician el contador | Sistema |
| ACC-12 | Ver la lista de cuentas con nombre, email, rol y estado (invitada, activa, desactivada), con búsqueda por nombre o email | U-01 |
| ACC-13 | Desactivar una cuenta: se cierran sus sesiones en el acto y no puede volver a entrar. Desactivar una cuenta invitada invalida su link de invitación | U-01 |
| ACC-14 | Un administrador no puede desactivar su propia cuenta | — |
| ACC-15 | Desactivar un empleado no cambia sus préstamos sin devolver. Desde la desactivación, el empleado deja de recibir NOT-01 y NOT-02; NOT-03 sigue llegando a los administradores | — |
| ACC-16 | Reactivar una cuenta desactivada. Si ya había definido su contraseña, vuelve a entrar con ella; si estaba invitada, se reenvía la invitación como en ACC-03 | U-01 |
| ACC-17 | El email identifica la cuenta: no hay dos cuentas con el mismo email | — |
| ACC-18 | En el despliegue, si no existe ninguna cuenta de administrador, se crea una cuenta invitada con rol administrador, con el nombre y el email de la configuración del entorno, y se envía NOT-04 | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| ACC-E1 | Email inexistente, contraseña incorrecta, cuenta invitada, cuenta desactivada o cuenta bloqueada (aun con la contraseña correcta) | Se rechaza el ingreso con el mismo mensaje genérico de credenciales inválidas. No se revela si la cuenta existe ni si está bloqueada |
| ACC-E2 | Pedido de restablecimiento para un email sin cuenta activa | Se responde lo mismo que con una cuenta activa («si la cuenta existe, te enviamos un email») y no se envía nada |
| ACC-E3 | Link de invitación vencido, ya usado o invalidado | Se rechaza indicando que el link no es válido y que hay que pedirle al administrador que reenvíe la invitación |
| ACC-E4 | Link de recuperación vencido o ya usado | Se rechaza indicando que el link no es válido; se puede pedir uno nuevo |
| ACC-E5 | Invitar un email que ya tiene una cuenta, en cualquier estado | Se rechaza indicando que el email ya tiene una cuenta |
| ACC-E6 | Contraseña nueva de menos de 8 caracteres | Se rechaza indicando el mínimo |
| ACC-E7 | Cambio de contraseña con la actual incorrecta | Se rechaza y cuenta como intento fallido (ACC-11) |
| ACC-E8 | La sesión venció o la cuenta fue desactivada mientras la persona opera | La acción se rechaza y la persona tiene que volver a entrar |
| ACC-E9 | Un administrador intenta desactivar su propia cuenta | Se rechaza (ACC-14) |
| ACC-E10 | Dos administradores actúan a la vez sobre la misma cuenta (por ejemplo, uno la desactiva y otro reenvía la invitación) | Se aplica la primera; la segunda se evalúa sobre el estado nuevo y, si ya no corresponde, se rechaza indicando el estado actual |
| ACC-E11 | Un empleado intenta una acción de administrador | Se rechaza |
| ACC-E12 | Un cliente supera el **límite de intentos de autenticación por cliente** en el ingreso, el pedido de restablecimiento o el uso de un link de invitación o de recuperación | Se rechaza indicando que se reintente más tarde |

### EQU — Equipos
**Superficie(s):** Aplicación web

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| EQU-01 | Dar de alta un equipo con tipo, marca, modelo y número de serie, todos obligatorios. El equipo queda disponible | U-01 |
| EQU-02 | El tipo es uno de una lista fija: notebook, monitor, teclado, mouse, cámara u otro | — |
| EQU-03 | El número de serie es único entre todos los equipos, incluidos los dados de baja | — |
| EQU-04 | Editar el tipo, la marca, el modelo o el número de serie de un equipo disponible, prestado o en reparación. No cambia su préstamo | U-01 |
| EQU-05 | Poner en reparación un equipo disponible. Mientras está en reparación no se presta | U-01 |
| EQU-06 | Volver a poner disponible un equipo en reparación | U-01 |
| EQU-07 | Dar de baja un equipo disponible o en reparación. La baja es definitiva: el equipo no se presta, no se edita y no vuelve a estar disponible | U-01 |
| EQU-08 | Ver la lista de equipos con tipo, marca, modelo, número de serie y estado (disponible, prestado, en reparación, dado de baja), con filtros por tipo y por estado y búsqueda por número de serie, marca o modelo | U-01 |
| EQU-09 | Ver el detalle de un equipo con su historial de préstamos (empleado, fecha de inicio, vencimiento y fecha de devolución), del más reciente al más antiguo | U-01 |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| EQU-E1 | Alta o edición con un número de serie que ya tiene otro equipo | Se rechaza indicando que el número de serie ya existe |
| EQU-E2 | Alta o edición con un dato obligatorio vacío | Se rechaza indicando el campo que falta |
| EQU-E3 | Dar de baja o poner en reparación un equipo prestado | Se rechaza indicando que primero tiene que devolverse |
| EQU-E4 | El administrador da de baja o pone en reparación un equipo a la vez que un empleado lo pide prestado | Prospera la primera. Si fue el préstamo, la acción del administrador se rechaza como en EQU-E3; si fue la del administrador, el pedido se rechaza como en PRE-E1 |
| EQU-E5 | Editar, poner en reparación o volver a disponible un equipo dado de baja | Se rechaza indicando que el equipo está dado de baja |
| EQU-E6 | Un empleado intenta una acción de este bloque | Se rechaza |

### PRE — Préstamos
**Superficie(s):** Aplicación web

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| PRE-01 | Ver los equipos disponibles con tipo, marca y modelo, con filtro por tipo | U-02 |
| PRE-02 | Pedir un préstamo de un equipo disponible. El préstamo queda activo en el acto, con el vencimiento de PRE-03, y el equipo pasa a prestado | U-02 |
| PRE-03 | El vencimiento de un préstamo es el final del último día del **plazo de préstamo**, contado en días corridos desde el día siguiente al pedido | — |
| PRE-04 | Un empleado no puede tener más préstamos sin devolver (activos o vencidos) que el **tope de préstamos por empleado** | — |
| PRE-05 | Devolver un préstamo propio, activo o vencido. El préstamo queda devuelto con la fecha de devolución y el equipo vuelve a estar disponible en el acto | U-02 |
| PRE-06 | Registrar la devolución de cualquier préstamo activo o vencido, con el mismo efecto que PRE-05 | U-01 |
| PRE-07 | Ver sus préstamos sin devolver (equipo, inicio, vencimiento y estado) y su historial de préstamos devueltos (equipo, inicio, vencimiento y devolución) | U-02 |
| PRE-08 | Ver todos los préstamos con equipo, empleado, inicio, vencimiento, devolución y estado (activo, vencido, devuelto), con filtro por estado y búsqueda por empleado o número de serie. Por defecto, primero los activos y vencidos, ordenados por vencimiento | U-01 |
| PRE-09 | Extender el vencimiento de un préstamo activo o vencido, una sola vez por préstamo, a una fecha posterior al vencimiento original y dentro del **plazo máximo de extensión** contado desde él. Un préstamo vencido que se extiende vuelve a activo | U-01 |
| PRE-10 | Los préstamos los pide solo el empleado, para sí mismo. Un administrador no pide préstamos ni los registra a nombre de un empleado | — |
| PRE-11 | Pedir, devolver y extender un préstamo no envían notificaciones | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| PRE-E1 | El equipo dejó de estar disponible entre que el empleado lo vio y lo pidió (otro lo pidió, se puso en reparación o se dio de baja) | Se rechaza indicando que el equipo ya no está disponible, con la lista de disponibles actualizada |
| PRE-E2 | Dos empleados piden el mismo equipo a la vez | Prospera uno; el otro recibe PRE-E1 |
| PRE-E3 | El empleado ya alcanzó el **tope de préstamos por empleado** | Se rechaza indicando que alcanzó el tope y que tiene que devolver un equipo para pedir otro |
| PRE-E4 | El mismo empleado hace pedidos a la vez que juntos superan el **tope de préstamos por empleado** | Prosperan solo los que entran en el tope; el resto recibe PRE-E3 |
| PRE-E5 | Devolver o extender un préstamo que ya fue devuelto (por el empleado o por un administrador) | Se rechaza indicando que el préstamo ya fue devuelto |
| PRE-E6 | Extender un préstamo que ya fue extendido | Se rechaza indicando que solo se extiende una vez |
| PRE-E7 | La fecha de extensión no es posterior al vencimiento original, excede el **plazo máximo de extensión** o ya pasó | Se rechaza indicando el rango de fechas válido |
| PRE-E8 | El préstamo vence mientras el empleado lo está devolviendo | La devolución se acepta: un préstamo vencido también se devuelve |
| PRE-E9 | Un empleado intenta ver o devolver un préstamo de otro empleado | Se rechaza |
| PRE-E10 | Un administrador intenta pedir un préstamo, o un empleado extender uno | Se rechaza |

**Ejemplos**
- PRE-03: pedido el lunes 2 → vence al terminar el lunes 16.
- PRE-09: vencimiento original el lunes 16 → se puede extender hasta el lunes 30 inclusive. Si ese préstamo venció y hoy es el martes 31, ya no se puede extender (PRE-E7).
- PRE-04: un empleado con una notebook activa y un monitor vencido puede pedir un equipo más; con tres sin devolver, no.

### VEN — Vencimientos
**Superficie(s):** — (proceso del sistema)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| VEN-01 | A la **hora de los avisos** del día que está la **anticipación del aviso de vencimiento** antes del día del vencimiento, envía NOT-01 al empleado de cada préstamo activo que vence ese día | Sistema |
| VEN-02 | A la **hora de los avisos** del día del vencimiento, para cada préstamo activo que vence ese día, envía NOT-02 al empleado y NOT-03 a cada administrador activo | Sistema |
| VEN-03 | Al terminar el día del vencimiento, cada préstamo que sigue sin devolverse pasa a vencido. No se envía otro aviso | Sistema |
| VEN-04 | Cada aviso se envía una sola vez por préstamo y por vencimiento. Si un administrador extiende el préstamo (PRE-09), NOT-01, NOT-02 y NOT-03 se vuelven a enviar según el nuevo vencimiento | Sistema |
| VEN-05 | Cada aviso se decide préstamo por préstamo en el momento de enviarlo: si el préstamo ya está devuelto, no se envía. Para un empleado desactivado se aplica ACC-15 | Sistema |
| VEN-06 | Si el proceso no corrió a su hora (el sistema estuvo caído), al volver envía solo los avisos que siguen vigentes: NOT-01 si todavía no es el día del vencimiento; NOT-02 y NOT-03 si todavía es ese día. Si el préstamo ya pasó su vencimiento, lo pasa a vencido y no envía nada | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| VEN-E1 | El empleado devuelve el préstamo en el mismo momento en que sale un aviso | Si la devolución quedó registrada antes, el aviso no sale (VEN-05); si quedó después, el aviso ya enviado queda enviado y el préstamo queda devuelto |
| VEN-E2 | El sistema estuvo caído a la hora de los avisos o al terminar el día del vencimiento | Se aplica VEN-06 |
| VEN-E3 | Falla el envío de un email | Se aplica la falla de NOT |

**Ejemplos**
- VEN-01 y VEN-02: préstamo pedido el lunes 2, vence al terminar el lunes 16. NOT-01 sale el sábado 14 a la **hora de los avisos**; NOT-02 y NOT-03, el lunes 16 a la misma hora. Si se devuelve el domingo 15, no sale ninguno de los dos del lunes. Si no se devuelve, desde la medianoche del lunes 16 al martes 17 figura vencido.
- VEN-04: el administrador extiende ese préstamo el martes 17 hasta el miércoles 25 → NOT-01 sale el lunes 23 y NOT-02 y NOT-03 el miércoles 25.
- VEN-06: el sistema estuvo caído desde el sábado 14 a las 8:00 hasta el domingo 15 → al volver envía NOT-01. Si volviera el martes 17, no envía nada y el préstamo queda vencido.

### RET — Retención
**Superficie(s):** — (proceso del sistema)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| RET-01 | Al cumplirse el **plazo de retención de cuentas desactivadas** desde la desactivación de una cuenta (de empleado o de administrador) que sigue desactivada, anonimiza su nombre y su email | Sistema |
| RET-02 | La cuenta anonimizada y sus préstamos se conservan: en los préstamos y en los historiales figura como «empleado eliminado» | — |
| RET-03 | Una cuenta anonimizada no aparece en la lista de cuentas (ACC-12), no se puede reactivar (ACC-16) y su email queda libre para una cuenta nueva (ACC-17) | — |
| RET-04 | Una cuenta con préstamos sin devolver se anonimiza igual; el administrador puede registrar su devolución (PRE-06) | — |
| RET-05 | Si la cuenta se reactiva antes de cumplirse el plazo, no se anonimiza; si se vuelve a desactivar, el plazo se cuenta desde la última desactivación | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| RET-E1 | El proceso no corrió cuando se cumplía el plazo (el sistema estuvo caído) | Al volver, anonimiza todas las cuentas cuyo plazo ya se cumplió |
| RET-E2 | Un administrador reactiva una cuenta en el mismo momento en que el proceso la anonimiza | Prospera la primera. Si ganó la anonimización, la reactivación se rechaza indicando que la cuenta fue eliminada; si ganó la reactivación, la cuenta no se anonimiza |

**Ejemplos**
- RET-01 y RET-05: cuenta desactivada el 10/03/2026, reactivada el 01/06/2026 y desactivada otra vez el 15/09/2026 → se anonimiza al cumplirse el plazo desde el 15/09/2026.

### NOT — Notificaciones
**Superficie(s):** — (transversal)

**Requisitos**
| ID | Evento | Canal | Destinatario | Contenido |
|---|---|---|---|---|
| NOT-01 | Un préstamo activo vence dentro de la **anticipación del aviso de vencimiento** (VEN-01) | email | Empleado del préstamo | El equipo (tipo, marca, modelo y número de serie) y la fecha de vencimiento |
| NOT-02 | Un préstamo activo vence hoy (VEN-02) | email | Empleado del préstamo | El equipo y que vence hoy: hay que devolverlo antes de que termine el día |
| NOT-03 | Un préstamo activo vence hoy (VEN-02) | email | Cada administrador activo | El equipo, el empleado y que el préstamo vence hoy sin haberse devuelto |
| NOT-04 | Invitación de una cuenta (ACC-01, ACC-03, ACC-16, ACC-18) | email | Persona invitada | Link para definir la contraseña y su vencimiento |
| NOT-05 | Pedido de restablecimiento de contraseña (ACC-07) | email | Titular de la cuenta | Link para restablecer la contraseña y su vencimiento |

**No se notifica:**
- Pedir, devolver o extender un préstamo (PRE-11)
- El paso de un préstamo a vencido al terminar el día (VEN-03)
- El cambio o restablecimiento de una contraseña
- El bloqueo de una cuenta por intentos fallidos
- La desactivación o reactivación de una cuenta (salvo el reenvío de la invitación de ACC-16)
- El alta, la edición, la reparación o la baja de un equipo
- La anonimización de una cuenta (RET-01)

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| NOT-E1 | El email no se puede enviar (el proveedor no responde o da error) | Se reintenta hasta los **reintentos de envío de email** dentro de la **ventana de reintento de email**; si sigue fallando, se descarta y queda registrado como fallido. La operación que lo disparó no se deshace |
| NOT-E2 | El email rebota (la dirección no existe o el servidor de destino lo rechaza) | Queda registrado como rebotado. No se reintenta ni se avisa a nadie |

## Fuera de alcance
- Importar los datos de la planilla actual: los equipos se cargan a mano
- Reservar un equipo para una fecha futura
- Aprobación de préstamos
- Compras de equipos
- Códigos QR en los equipos
- Integración con el directorio de la empresa
- App nativa
- Avisos por push o SMS
- Reportes y exportación de listas
- Fotos o adjuntos de los equipos

## Parámetros
| Parámetro | Valor | ¿Editable por un usuario? |
|---|---|---|
| Vigencia de la invitación | 72 horas | no |
| Vigencia del link de recuperación | 1 hora | no |
| Inactividad máxima de sesión | 8 horas | no |
| Intentos fallidos antes del bloqueo | 5 | no |
| Duración del bloqueo | 15 minutos | no |
| Plazo de préstamo | 14 días corridos | no |
| Tope de préstamos por empleado | 3 | no |
| Plazo máximo de extensión | 14 días corridos | no |
| Anticipación del aviso de vencimiento | 2 días | no |
| Hora de los avisos | 9:00 | no |
| Reintentos de envío de email | 3 | no |
| Ventana de reintento de email | 1 hora | no |
| Plazo de retención de cuentas desactivadas | 1 año | no |
| Límite de intentos de autenticación por cliente | 20 por minuto | no |

## Integraciones externas
| ID | Sistema | Dirección | Datos | Cuándo | Fuente de verdad |
|---|---|---|---|---|---|
| INT-01 | Servidor SMTP | Envía | Los emails de NOT-01 a NOT-05 (invitación, restablecimiento de contraseña y avisos de vencimiento) | Ante cada notificación | Producto |

## Requisitos no funcionales
| ID | Categoría | Requisito | Target |
|---|---|---|---|
| NFR-01 | Volumen | Empleados con cuenta | Decenas |
| NFR-02 | Volumen | Equipos registrados | Cientos |
| NFR-03 | Volumen | Préstamos por mes | Decenas |
| NFR-04 | Tiempos | Respuesta de cada acción de la aplicación (pedir, devolver, buscar, listar) | Menos de 1 segundo |
| NFR-05 | Disponibilidad | Aplicación web y avisos | Lunes a viernes de 8 a 20; fuera de ese horario se toleran caídas y mantenimientos |
| NFR-06 | Privacidad y cumplimiento | Datos personales guardados | Nombre y email de cada cuenta y el historial de préstamos de cada empleado; se anonimizan según RET. Aplica la Ley 25.326 de Protección de Datos Personales |
| NFR-07 | Accesibilidad | Nivel de conformidad de la aplicación web | WCAG 2.2 AA |
| NFR-08 | Idioma, zona horaria y formatos | Idioma | Español de Argentina únicamente |
| NFR-09 | Idioma, zona horaria y formatos | Zona horaria | Una sola: America/Argentina/Buenos_Aires. Los días de vencimiento, la hora de los avisos y los plazos se cuentan en ella |
| NFR-10 | Idioma, zona horaria y formatos | Formato de fecha | dd/mm/aaaa |
| NFR-11 | Compatibilidad | Navegadores | Las dos últimas versiones de Chrome, Firefox y Safari, en desktop y mobile |

## Decisiones tomadas
| ID | Tema | Decisión | Descartado | Motivo | Afecta |
|---|---|---|---|---|---|
| DEC-01 | Forma de acceso | Usuario y contraseña propios del producto, para administrador y empleado | SSO con Google Workspace; link mágico por email | Sin dependencias: no depender de un proveedor externo para entrar | U-01, U-02 |
| DEC-02 | Alta de cuentas de empleado | Las crea un administrador; no hay registro abierto | Autorregistro con el dominio de la oficina | El producto es solo para empleados | U-02 |
| DEC-03 | Recuperación de acceso | Restablecimiento de contraseña por link al email | Que la reponga el administrador; sin recuperación | Autonomía: que cada uno la recupere solo, sin depender del administrador | U-01, U-02 |
| DEC-04 | Alta de administradores | Un administrador crea otros administradores; el primero se crea en el despliegue | Que solo los cree infraestructura | Sumar un administrador sin pedirle nada a infraestructura | U-01 |
| DEC-05 | Superficies | Una sola aplicación web para administrador y empleado; cada uno ve lo que le corresponde a su rol | Un panel de administración y un portal del empleado separados | Los dos ven los mismos equipos y préstamos; separarlo duplica pantallas | U-01, U-02 |
| DEC-06 | Desactivar un empleado con préstamos activos | Se permite; los préstamos siguen activos y sus avisos van solo a los administradores | Rechazar la desactivación hasta que devuelva los equipos | Si alguien deja la oficina hay que cortarle el acceso ya; los equipos se recuperan aparte | ACC-13, ACC-15 |
| DEC-07 | Vencimiento de la sesión | Por inactividad | A un plazo fijo desde el ingreso | Que no se corte en medio de la jornada si la están usando | ACC-05 |
| DEC-08 | Tipos de equipo | Lista fija, con «otro» | Una lista que mantiene el administrador | Son pocos tipos y casi no cambian; con «otro» alcanza | EQU-02 |
| DEC-09 | Baja de un equipo | Definitiva; lo que puede volver se pone en reparación | Baja reversible | Lo que puede volver se marca en reparación; la baja es para lo que ya no vuelve | EQU-05, EQU-07 |
| DEC-10 | Plazo del préstamo | Fijo, igual para todos los préstamos | Que el empleado elija la fecha hasta un máximo; un plazo por tipo de equipo | Simplicidad: un solo plazo para todos es más fácil de controlar | PRE-03 |
| DEC-11 | Préstamos simultáneos | Varios por empleado, hasta un tope | Sin tope; uno por tipo | Con notebook, monitor y teclado alcanza para trabajar | PRE-04 |
| DEC-12 | Extensión del plazo | Solo la hace un administrador, una vez por préstamo y con un máximo | Sin extensión; renovación por el empleado | Evitar préstamos eternos | PRE-09 |
| DEC-13 | Momento del aviso de vencimiento | El día del vencimiento, a la hora de los avisos, mientras el préstamo todavía está activo («vence hoy») | Avisar al día siguiente, ya vencido; adelantar el vencimiento al inicio del último día | Que el empleado todavía pueda devolverlo a tiempo y el administrador se entere el mismo día | VEN-02, NOT-02, NOT-03 |
| DEC-14 | Borrado de datos de cuentas desactivadas | Anonimizar nombre y email y conservar la cuenta y sus préstamos | Borrar la cuenta y sus préstamos | Que el historial de cada equipo siga completo | RET-01, RET-02 |
