---
created: 2026-11-07
last_updated: 2026-11-07
status: closed
base_documents: docs/brief.md
---

# Análisis funcional — Turnos móvil

## Resumen
**Turnos móvil** — App móvil (Android e iOS) para reservar turnos en una peluquería. Los clientes se
registran y piden o cancelan turnos eligiendo servicio, peluquero y horario; la dueña, con otro rol en
la misma app, carga los servicios y los horarios de cada peluquero y ve la agenda del día.

## Actores
| ID | Actor | Acceso | Recuperación de acceso |
|---|---|---|---|
| U-01 | Dueña | Email y contraseña; la cuenta la crea el equipo técnico, con el rol de dueña | Link por email para elegir una contraseña nueva |
| U-02 | Cliente | Email y contraseña; crea su cuenta registrándose en la app | Link por email para elegir una contraseña nueva |
| U-03 | Sistema | — | — |

## Superficies
| Superficie | Plataforma | Actores | Viewports |
|---|---|---|---|
| App del cliente | mobile-app | U-02 | phone (principal) |
| Gestión de la peluquería | mobile-app | U-01 | phone (principal) |

La dueña y el cliente usan la misma app; cada uno ve la cara que corresponde a su rol.

## Funcionalidades
| Bloque | Prefijo | Superficie(s) |
|---|---|---|
| Acceso | ACC | App del cliente, Gestión de la peluquería |
| Catálogo de servicios | CAT | Gestión de la peluquería |
| Peluqueros y horarios | PEL | Gestión de la peluquería |
| Reserva | RES | App del cliente |
| Mis turnos | MIS | App del cliente |
| Cancelación | CAN | App del cliente, Gestión de la peluquería |
| Agenda del día | AGE | Gestión de la peluquería |

### ACC — Acceso
**Superficie(s):** App del cliente, Gestión de la peluquería

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| ACC-01 | Registrarse con nombre, teléfono, email y contraseña. El email no se verifica: la cuenta queda activa y puede reservar apenas se registra | U-02 |
| ACC-02 | Un email identifica una sola cuenta | — |
| ACC-03 | Iniciar sesión con email y contraseña. Al entrar, cada actor ve la cara de su rol: el cliente, la App del cliente; la dueña, la Gestión de la peluquería | U-01, U-02 |
| ACC-04 | La cuenta de la dueña no se crea desde la app: la crea el equipo técnico, con el rol de dueña | — |
| ACC-05 | La sesión se renueva con cada uso y vence tras la **duración de sesión sin uso** | — |
| ACC-06 | Cerrar sesión | U-01, U-02 |
| ACC-07 | Pedir la recuperación de la contraseña indicando el email. Si el email tiene cuenta, el sistema envía por email un link para elegir una contraseña nueva. El link abre la app en el celular, en la pantalla para elegirla | U-01, U-02 |
| ACC-08 | El link de recuperación vale durante la **vigencia del link de recuperación** y se usa una sola vez. Pedir uno nuevo invalida el anterior | — |
| ACC-09 | Elegir una contraseña nueva con el link cierra las sesiones abiertas de esa cuenta y levanta el bloqueo por intentos fallidos, si lo hay. No hay otra forma de cambiar la contraseña | Sistema |
| ACC-10 | Tras **intentos fallidos antes del bloqueo** consecutivos, la cuenta no puede iniciar sesión durante la **duración del bloqueo**. Al terminar el bloqueo, o al iniciar sesión con éxito, el contador vuelve a cero | — |
| ACC-11 | Editar su nombre y su teléfono. El email no se cambia | U-02 |
| ACC-12 | Borrar su cuenta, reingresando la contraseña y tras una advertencia de que se cancelan sus turnos próximos y se borran todos sus datos | U-02 |
| ACC-13 | Al borrar la cuenta se cancelan sus turnos próximos, que liberan el horario, y se borran la cuenta, sus datos personales y todos sus turnos, pasados y cancelados incluidos. Sus sesiones se cierran | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| ACC-E1 | Registro con un email que ya tiene cuenta | Se rechaza indicando que ya existe una cuenta con ese email |
| ACC-E2 | Dos registros a la vez con el mismo email | Se crea una sola cuenta; el otro recibe ACC-E1 |
| ACC-E3 | Inicio de sesión con un email sin cuenta o con la contraseña equivocada | Se rechaza con el mismo mensaje en los dos casos, sin indicar cuál de los dos datos falló, y suma un intento fallido si el email tiene cuenta |
| ACC-E4 | Inicio de sesión de una cuenta bloqueada por intentos fallidos | Se rechaza indicando que la cuenta está bloqueada temporalmente y que puede recuperar la contraseña. El intento no extiende el bloqueo |
| ACC-E5 | Pedido de recuperación para un email sin cuenta | Se responde lo mismo que para un email con cuenta («si el email tiene cuenta, te enviamos un link») y no se envía nada |
| ACC-E6 | Link de recuperación vencido, ya usado o reemplazado por uno más nuevo | Se rechaza indicando que el link no es válido y que puede pedir otro |
| ACC-E7 | El email de recuperación no llega o rebota | El sistema no reintenta; el usuario puede pedir otro link |
| ACC-E8 | La sesión vence mientras el usuario está haciendo algo | La acción no se ejecuta y la app pide iniciar sesión; después el usuario la repite |
| ACC-E9 | Borrado de cuenta con la contraseña equivocada | No se borra nada y se indica que la contraseña es incorrecta |
| ACC-E10 | La cuenta se borró o cambió la contraseña mientras tenía una sesión abierta en otro celular | La próxima acción en ese celular falla como ACC-E8 |
| ACC-E11 | El link de recuperación se abre en un dispositivo sin la app | En un celular lleva a la tienda de la app (Google Play o App Store); en una computadora muestra una página que indica abrir el link desde el celular con la app instalada |
| ACC-E12 | Se supera el **límite de intentos de autenticación** en el inicio de sesión, el registro o el pedido de recuperación | Se rechaza indicando que espere un momento antes de volver a intentar |

### CAT — Catálogo de servicios
**Superficie(s):** Gestión de la peluquería

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| CAT-01 | Crear un servicio con nombre, duración y precio, todos obligatorios. Se crea activo | U-01 |
| CAT-02 | La duración es múltiplo de la **granularidad de la grilla**, entre la **duración mínima de un servicio** y la **duración máxima de un servicio** | — |
| CAT-03 | El precio es un importe en pesos enteros, mayor que cero. Se muestra al cliente como referencia, con formato $ 12.500: no se cobra en la app | — |
| CAT-04 | No puede haber dos servicios con el mismo nombre, sin distinguir mayúsculas y contando los desactivados | — |
| CAT-05 | Ver la lista de todos los servicios, activos y desactivados | U-01 |
| CAT-06 | Editar el nombre, la duración y el precio de un servicio. Los turnos ya reservados conservan la duración y el precio con que se reservaron; el cambio vale para las reservas nuevas | U-01 |
| CAT-07 | Desactivar un servicio: deja de ofrecerse para reservas nuevas. Sus turnos próximos se mantienen y se destacan en la agenda (PEL-10); la dueña los cancela uno por uno si quiere (CAN-03) | U-01 |
| CAT-08 | Reactivar un servicio desactivado | U-01 |
| CAT-09 | Los servicios no se borran | — |
| CAT-10 | Qué peluqueros hacen cada servicio se define en PEL-04 | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| CAT-E1 | Crear o renombrar un servicio con un nombre que ya existe | Se rechaza indicando que ya hay un servicio con ese nombre |
| CAT-E2 | Duración fuera del rango o que no es múltiplo de la **granularidad de la grilla**; precio vacío, con decimales o no mayor que cero | Se rechaza indicando el campo inválido |
| CAT-E3 | La dueña desactiva un servicio mientras un cliente está reservándolo | La reserva falla como RES-E2 |
| CAT-E4 | La dueña alarga un servicio | Los turnos ya reservados no cambian (CAT-06); no se generan superposiciones |

### PEL — Peluqueros y horarios
**Superficie(s):** Gestión de la peluquería

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| PEL-01 | Crear un peluquero con su nombre. Se crea activo, sin servicios y sin horario | U-01 |
| PEL-02 | No puede haber dos peluqueros con el mismo nombre, sin distinguir mayúsculas y contando los desactivados | — |
| PEL-03 | Ver la lista de todos los peluqueros, activos y desactivados, y editar el nombre de uno | U-01 |
| PEL-04 | Definir qué servicios hace cada peluquero, agregando o quitando servicios | U-01 |
| PEL-05 | Definir el horario semanal de cada peluquero: para cada día de la semana, cero o más franjas con hora de inicio y de fin | U-01 |
| PEL-06 | Las horas de inicio y fin de una franja son múltiplos de la **granularidad de la grilla**, el inicio es anterior al fin, las dos caen en el mismo día y las franjas de un mismo día no se superponen | — |
| PEL-07 | Un cambio de horario o de servicios vale para las reservas nuevas; los turnos ya reservados no cambian | — |
| PEL-08 | Desactivar un peluquero, que deja de ofrecerse para reservas nuevas, y reactivarlo. Los peluqueros no se borran | U-01 |
| PEL-09 | Un peluquero se ofrece para un servicio solo si está activo, hace ese servicio y tiene horario | — |
| PEL-10 | Un turno próximo se mantiene aunque ya no se pueda reservar, y se destaca en la agenda indicando el motivo: el peluquero está desactivado, ya no hace el servicio, el servicio está desactivado o el turno quedó fuera del horario semanal. Deja de destacarse si la causa desaparece | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| PEL-E1 | Crear o renombrar un peluquero con un nombre que ya existe | Se rechaza indicando que ya hay un peluquero con ese nombre |
| PEL-E2 | Una franja con horas que no son múltiplo de la **granularidad de la grilla**, con el inicio igual o posterior al fin, o superpuesta con otra del mismo día | Se rechaza indicando la franja inválida; el horario guardado no cambia |
| PEL-E3 | La dueña cambia el horario, quita un servicio o desactiva un peluquero que tiene turnos próximos afectados | El cambio se aplica; los turnos afectados se mantienen y se destacan (PEL-10) |
| PEL-E4 | La dueña cambia el horario o los servicios de un peluquero mientras un cliente está reservando con él | Si el horario elegido dejó de ofrecerse, la reserva falla como RES-E2 |

### RES — Reserva
**Superficie(s):** App del cliente

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| RES-01 | Reservar un turno eligiendo servicio, peluquero (o «cualquiera»), día y horario. Se ven el precio y la duración del servicio | U-02 |
| RES-02 | Solo se ofrecen los servicios activos que hace al menos un peluquero ofrecible (PEL-09), y para cada servicio, los peluqueros ofrecibles para él | — |
| RES-03 | Un horario se ofrece para un peluquero si empieza en un múltiplo de la **granularidad de la grilla**, la franja completa del servicio cae dentro de una franja de su horario semanal y no pisa otro turno reservado de ese peluquero | — |
| RES-04 | Solo se ofrecen horarios que empiezan al menos con la **anticipación mínima de reserva** y dentro del **horizonte de reserva**, contado como hoy más esa cantidad de días completos | — |
| RES-05 | Con «cualquiera» se ofrecen los horarios en que al menos un peluquero ofrecible para el servicio está libre. Al confirmar se asigna, entre los libres en ese horario, el que tiene menos turnos reservados ese día; ante empate, uno al azar | Sistema |
| RES-06 | Un cliente no puede superar el **tope de turnos próximos por cliente**. Un turno cuenta desde que se reserva hasta su hora de inicio o hasta que se cancela | — |
| RES-07 | Los turnos de un mismo cliente pueden superponerse en el tiempo (por ejemplo, para él y un familiar con distintos peluqueros) | — |
| RES-08 | El turno guarda la duración y el precio del servicio al momento de reservar (CAT-06) | Sistema |
| RES-09 | Al confirmar, el turno queda reservado y el cliente ve el servicio, el peluquero asignado, el día, el horario y el precio. No se envía ninguna notificación | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| RES-E1 | Dos reservas concurrentes sobre el mismo horario y peluquero, o sobre el último peluquero libre con «cualquiera» | Prospera una. La otra recibe un aviso y vuelve a elegir horario, con la disponibilidad actualizada |
| RES-E2 | Entre que el cliente vio el horario y confirmó, dejó de ofrecerse: pasó la **anticipación mínima de reserva**, o la dueña desactivó el servicio o al peluquero, le quitó el servicio o cambió su horario | Se rechaza con un aviso y vuelve a elegir horario, con la disponibilidad actualizada |
| RES-E3 | El cliente ya tiene el **tope de turnos próximos por cliente**, incluso si lo alcanza con otra reserva suya confirmada al mismo tiempo | Se rechaza indicando que ya tiene el máximo de turnos próximos y que puede cancelar uno |
| RES-E4 | No hay ningún servicio ofrecible, o ningún horario libre para el servicio y peluquero elegidos dentro del horizonte | Se indica que no hay horarios disponibles |

**Ejemplos**
- RES-03: servicio de 45 min, peluquero con franja de 9:00 a 13:00 y un turno de 10:00 a 10:30. Se ofrecen 9:00 y 9:15; 9:30 no (terminaría 10:15); de 10:30 a 12:15 sí; 12:30 no (terminaría 13:15).
- RES-04: hoy es 1/3 a las 10:00. El primer horario ofrecido es 12:00 del 1/3; el último día ofrecido es el 31/3.
- RES-05: Ana tiene 3 turnos ese día y Luis 2, los dos libres a las 16:00 → Luis. Los dos con 2 → uno al azar.

### MIS — Mis turnos
**Superficie(s):** App del cliente

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| MIS-01 | Ver sus turnos próximos (reservados y que todavía no empezaron), del más cercano al más lejano | U-02 |
| MIS-02 | Ver su historial: sus turnos cancelados y sus turnos pasados, del más reciente al más antiguo, sin límite de antigüedad mientras exista la cuenta | U-02 |
| MIS-03 | Cada turno muestra servicio y peluquero (con su nombre actual), día, horario, precio guardado (RES-08) y estado. El estado de un turno pasado es «pasado» mientras la dueña no marcó la asistencia, y «asistió» o «no asistió» cuando la marcó (AGE). Un turno cancelado indica quién lo canceló (el cliente o la peluquería) y el motivo, si lo hay | — |
| MIS-04 | Desde un turno próximo puede cancelarlo (CAN-01) | U-02 |
| MIS-05 | Un turno próximo destacado en la agenda (PEL-10) se le muestra al cliente como cualquier otro, sin aviso | — |
| MIS-06 | «No asistió» no tiene ninguna consecuencia para el cliente: puede seguir reservando | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| MIS-E1 | El cliente intenta ver un turno que no es suyo | Se responde como si el turno no existiera |
| MIS-E2 | Un turno próximo empieza mientras el cliente tiene la lista abierta | Al actualizar la lista pasa al historial como «pasado»; si intenta cancelarlo, falla como CAN-E1 |
| MIS-E3 | La dueña cancela un turno mientras el cliente lo está viendo | Al actualizar la lista lo ve cancelado por la peluquería, con el motivo si lo hay |

Concurrencia: no aplica, es solo lectura (la cancelación está en CAN).

### CAN — Cancelación
**Superficie(s):** App del cliente, Gestión de la peluquería

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| CAN-01 | Cancelar un turno próximo propio hasta el **plazo de cancelación del cliente** antes de su inicio, con un motivo opcional | U-02 |
| CAN-02 | Pasado ese plazo el cliente ya no puede cancelar desde la app: ve un mensaje que le indica llamar al **teléfono de la peluquería** | — |
| CAN-03 | Cancelar, desde la agenda, cualquier turno reservado que todavía no empezó, sin plazo mínimo, con un motivo obligatorio | U-01 |
| CAN-04 | El motivo es texto libre de hasta 200 caracteres | — |
| CAN-05 | El turno cancelado guarda quién lo canceló (el cliente o la peluquería) y el motivo, si lo hay. El cliente lo ve en su historial (MIS-03); la dueña, en la agenda (AGE) | Sistema |
| CAN-06 | Cancelar libera el horario enseguida para nuevas reservas y el turno deja de contar para el **tope de turnos próximos por cliente** | Sistema |
| CAN-07 | Una cancelación no se puede deshacer | — |
| CAN-08 | Cancelar no envía ninguna notificación (DEC-07) | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| CAN-E1 | El cliente intenta cancelar pasado el plazo, incluso si el plazo venció mientras tenía la pantalla abierta | Se rechaza con el mensaje de CAN-02; el turno sigue reservado |
| CAN-E2 | La dueña intenta cancelar un turno que ya empezó, incluso si empezó mientras tenía la pantalla abierta | Se rechaza indicando que el turno ya empezó; puede marcar la asistencia (AGE) |
| CAN-E3 | El cliente y la dueña cancelan el mismo turno a la vez, o se intenta cancelar un turno ya cancelado | Vale la primera cancelación. La otra se rechaza indicando que el turno ya estaba cancelado |
| CAN-E4 | El cliente intenta cancelar un turno que no es suyo | Se responde como si el turno no existiera |
| CAN-E5 | La dueña cancela sin motivo, o un motivo de más de 200 caracteres | Se rechaza indicando el campo inválido |

### AGE — Agenda del día
**Superficie(s):** Gestión de la peluquería

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| AGE-01 | Ver la agenda de un día: por defecto la de hoy, y puede ir a cualquier día anterior o posterior | U-01 |
| AGE-02 | La agenda lista los turnos del día, reservados y cancelados, por horario de inicio. Los cancelados se marcan como tales | — |
| AGE-03 | Cada turno muestra horario, servicio, peluquero, nombre y teléfono del cliente, y estado. Un cancelado muestra quién lo canceló y el motivo, si lo hay; un destacado, el motivo por el que está destacado (PEL-10) | — |
| AGE-04 | Filtrar la agenda por peluquero. Por defecto muestra todos | U-01 |
| AGE-05 | La agenda se actualiza cuando la dueña la refresca o vuelve a la app; no se actualiza sola | — |
| AGE-06 | Desde un turno que no empezó, cancelarlo (CAN-03) | U-01 |
| AGE-07 | Marcar un turno reservado como «asistió» o «no asistió», desde su hora de inicio, y corregir la marca en cualquier momento cambiando de una a la otra. Una vez marcado, el turno no vuelve a quedar sin marcar | U-01 |
| AGE-08 | No hay búsqueda de clientes ni de turnos: la dueña encuentra un turno yendo a su día | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| AGE-E1 | La dueña intenta marcar la asistencia de un turno que todavía no empezó | Se rechaza indicando que se marca desde la hora de inicio |
| AGE-E2 | La dueña intenta marcar la asistencia de un turno cancelado | Se rechaza indicando que el turno está cancelado |
| AGE-E3 | La dueña actúa sobre un turno que cambió desde que cargó la agenda (el cliente lo canceló, o borró su cuenta y el turno ya no existe) | Se rechaza indicando que el turno cambió, y la agenda se refresca |
| AGE-E4 | Un cliente reserva o cancela mientras la dueña tiene la agenda abierta | No se ve hasta que la dueña refresca (AGE-05) |

## Fuera de alcance
- Pagos y señas
- Notificaciones push
- Recordatorios
- Cualquier otra notificación (email o SMS), salvo el email de recuperación de contraseña
- Versión web
- Varias sucursales
- Listas de espera
- Carga de turnos por la dueña
- Acceso para los peluqueros
- Diseño para tablet
- Inicio de sesión con Google, Apple o código por SMS
- Verificación del email al registrarse
- Pantalla de cambio de contraseña
- Bloqueos, vacaciones o cierres que no sean el horario semanal
- Búsqueda de clientes o de turnos
- Actualización automática de la agenda
- Deshacer una cancelación
- Consecuencias por ausencias

## Parámetros
| Parámetro | Valor | ¿Editable por un usuario? |
|---|---|---|
| Duración de sesión sin uso | 30 días | no |
| Intentos fallidos antes del bloqueo | 5 | no |
| Duración del bloqueo | 15 minutos | no |
| Vigencia del link de recuperación | 1 hora | no |
| Límite de intentos de autenticación | 20 por minuto, por cliente | no |
| Granularidad de la grilla | 15 minutos | no |
| Duración mínima de un servicio | 15 minutos | no |
| Duración máxima de un servicio | 4 horas | no |
| Horizonte de reserva | 30 días | no |
| Anticipación mínima de reserva | 2 horas | no |
| Tope de turnos próximos por cliente | 2 | no |
| Plazo de cancelación del cliente | 1 hora | no |
| Teléfono de la peluquería | Lo carga el equipo técnico al instalar el producto | no |

## Integraciones externas
No hay integraciones externas.

El email de recuperación de contraseña (ACC-07) se envía por SMTP (Mailpit en el entorno local): es infraestructura y se registra en el análisis técnico.

## Requisitos no funcionales
| ID | Categoría | Requisito | Target |
|---|---|---|---|
| NFR-01 | Volumen | Clientes registrados | 500 (cientos) |
| NFR-02 | Volumen | Peluqueros | 3 (unidades) |
| NFR-03 | Volumen | Turnos reservados por mes | Cientos |
| NFR-04 | Volumen | Clientes usando la app a la vez en el pico | Decenas |
| NFR-05 | Tiempos | Respuesta del sistema a cada acción del usuario | Menos de 1 segundo |
| NFR-06 | Disponibilidad | Toda la app | 24/7; se tolera hasta 1 hora de caída por mes |
| NFR-07 | Privacidad y cumplimiento | Datos personales guardados | Nombre, teléfono y email del cliente; nombre y email de la dueña. Aplica la Ley 25.326 de Protección de Datos Personales de Argentina |
| NFR-08 | Accesibilidad | — | No aplica |
| NFR-09 | Idioma, zona horaria y formatos | Idioma | Español únicamente |
| NFR-10 | Idioma, zona horaria y formatos | Zona horaria | Una sola: America/Argentina/Buenos_Aires |
| NFR-11 | Idioma, zona horaria y formatos | Formatos | Fechas dd/mm/aaaa, horas en 24 h, importes en pesos con formato $ 12.500 |
| NFR-12 | Compatibilidad | Sistemas operativos | Android 10 o superior e iOS 16 o superior |

## Decisiones tomadas
| ID | Tema | Decisión | Descartado | Motivo | Afecta |
|---|---|---|---|---|---|
| DEC-01 | Peluqueros | Los peluqueros no usan la app: son datos que carga la dueña | Darles acceso para ver su agenda | La agenda la maneja la dueña | U-01 |
| DEC-02 | Acceso del cliente | Email y contraseña | Código por SMS o WhatsApp; inicio de sesión con Google o Apple | Es lo más simple y sin costo | ACC-01, ACC-03 |
| DEC-03 | Recuperación de contraseña del cliente | Link por email para elegir una contraseña nueva | Que se la resetee la dueña; sin recuperación | No depende de la dueña: el cliente lo resuelve solo | ACC-07 |
| DEC-04 | Alta de la cuenta de la dueña | La crea el equipo técnico | Registrarse como cliente y que se le asigne el rol | Es una sola cuenta | ACC-04 |
| DEC-05 | Dispositivos | Solo teléfono; en una tablet la app se ve como en un teléfono, sin diseño propio | Diseñar también para tablet | Todos lo usan en el celular | Superficies |
| DEC-06 | Turnos cargados por la dueña | Solo los clientes reservan, desde la app | Que la dueña cargue turnos para clientes que llaman o van al local | Todos deben reservar por la app | RES-01 |
| DEC-07 | Notificaciones | No hay notificaciones; el cliente se entera de una cancelación de la dueña viéndola en la app | Push o email al cliente cuando la dueña cancela; recordatorio y confirmación | Simplificar la primera versión | CAN-08 |
| DEC-08 | Turnos que ve el cliente | Próximos e historial, incluidos los cancelados | Solo los próximos | Para ver los cancelados | MIS-02 |
| DEC-09 | Verificación del email | El email no se verifica al registrarse | Enviar un link y no dejar reservar hasta confirmarlo | Fricción en el registro; el teléfono alcanza para contactar al cliente | ACC-01 |
| DEC-10 | Borrado de la cuenta del cliente | Se borra todo, incluidos los turnos pasados | Anonimizar los datos y conservar los turnos | Privacidad | ACC-13 |
| DEC-11 | Cambio de contraseña | Solo con el link de recuperación | Una pantalla de cambio con la contraseña actual | El link ya lo resuelve | ACC-09 |
| DEC-12 | Baja de un servicio | Se desactiva y se puede reactivar; no se borra | Borrarlo | Los turnos lo siguen nombrando | CAT-07, CAT-08, CAT-09 |
| DEC-13 | Turnos de un servicio desactivado | Se mantienen | Cancelarlos en cascada; no permitir desactivar con turnos próximos | La dueña prefiere avisar ella a los clientes | CAT-07 |
| DEC-14 | Excepciones al horario | No hay bloqueos ni cierres: vacaciones o días libres se resuelven editando el horario semanal | Bloqueos por peluquero; cierres de toda la peluquería | Simplificar la primera versión | PEL-05 |
| DEC-15 | Turnos que quedan fuera por un cambio | Se mantienen y se destacan en la agenda | Cancelarlos en cascada; no permitir el cambio | La dueña prefiere avisar ella a los clientes | PEL-10, CAT-07 |
| DEC-16 | Reparto de «cualquiera» | Se asigna el peluquero libre con menos turnos reservados ese día; ante empate, al azar | Uno al azar entre los libres, sin mirar la carga | Repartir el trabajo parejo | RES-05 |
| DEC-17 | Tope y anticipación | Hasta 2 turnos próximos por cliente, que pueden superponerse; se reserva con al menos 2 horas de anticipación | Tope de 1 o sin tope; 1 hora o sin mínimo | Reservar para otro; tiempo para organizarse | RES-04, RES-06, RES-07 |
| DEC-18 | Asistencia | La dueña marca «asistió» o «no asistió» en los turnos pasados; faltar no tiene consecuencias para el cliente | Que no se marque asistencia (todo turno pasado figura como realizado); bloquear al cliente tras varias ausencias | Saber quién falta | MIS-03, MIS-06 |
| DEC-19 | Plazo de cancelación del cliente | Hasta 1 hora antes del inicio; después llama a la peluquería | Hasta el inicio; hasta 2 o 24 horas antes | Que el horario se pueda reocupar | CAN-01, CAN-02 |
| DEC-20 | Motivo de cancelación | Obligatorio para la dueña, opcional para el cliente | Opcional para ambos; nunca | El cliente no recibe aviso | CAN-01, CAN-03 |
| DEC-21 | Búsqueda en la agenda | No hay búsqueda: la dueña navega al día del turno | Buscar al cliente por nombre, teléfono o email | Simplificar la primera versión | AGE-08 |
| DEC-22 | Actualización de la agenda | Al refrescar o volver a la app | Actualización automática en pocos segundos | Alcanza y es más simple | AGE-05 |
