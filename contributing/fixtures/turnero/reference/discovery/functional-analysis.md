---
created: 2026-10-10
last_updated: 2026-10-10
status: closed
base_documents: docs/definicion-producto.md
---

# Análisis funcional — Turnero

## Resumen

**Turnero** — Sistema de gestión y reserva de turnos. Un administrador mantiene el catálogo y opera
la agenda desde un panel; los clientes reservan desde una cara pública, sin registro.

## Actores

| ID | Actor | Acceso | Recuperación de acceso |
|---|---|---|---|
| U-01 | Administrador | Usuario y contraseña | Sin recuperación por email; la repone infraestructura con el procedimiento del runbook de despliegue |
| U-02 | Cliente | Anónimo; cancela su turno con un link con token | No aplica |
| U-03 | Sistema | — | — |

## Superficies

| Superficie | Plataforma | Actores | Viewports |
|---|---|---|---|
| Panel de administración | web | U-01 | desktop (principal), mobile |
| Reserva pública | web | U-02 | mobile (principal), desktop |

## Funcionalidades

| Bloque | Prefijo | Superficie(s) |
|---|---|---|
| Acceso | ACC | Panel de administración |
| Catálogo | CAT | Panel de administración |
| Agenda | AGE | Panel de administración |
| Reserva | RES | Reserva pública, Panel de administración (turno manual) |
| Reprogramación | REP | Panel de administración |
| Cancelación por el cliente | CAN | Reserva pública (link) |
| Ausente automático | AUS | — (proceso del sistema) |
| Retención y anonimización | RET | — (proceso del sistema) |
| Notificaciones | NOT | — (transversal) |

### ACC — Acceso
**Superficie(s):** Panel de administración

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| ACC-01 | Iniciar sesión con usuario y contraseña | U-01 |
| ACC-02 | Cerrar sesión | U-01 |
| ACC-03 | La sesión vence tras la **duración máxima de sesión** sin actividad | — |
| ACC-04 | No hay recuperación de contraseña por email ni cambio de contraseña desde el panel; la reposición la hace infraestructura (DEC-06) | — |
| ACC-05 | Las cuentas de administrador las crea infraestructura; no hay alta de cuentas desde el panel | — |
| ACC-06 | Puede haber varias sesiones abiertas a la vez con la misma cuenta; cada una vence por su cuenta | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| ACC-E1 | Usuario o contraseña incorrectos | Se rechaza con un mensaje genérico, sin indicar cuál de los dos falló |
| ACC-E2 | Se alcanzan los **intentos fallidos antes del bloqueo** seguidos | La cuenta se bloquea durante la **duración del bloqueo por intentos fallidos**; un intento durante el bloqueo se rechaza con el mismo mensaje genérico |
| ACC-E3 | La sesión venció mientras operaba | Vuelve al inicio de sesión; lo que no se guardó se pierde |

### CAT — Catálogo
**Superficie(s):** Panel de administración

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| CAT-01 | Alta, edición y desactivación de profesionales, con nombre. No existe la eliminación | U-01 |
| CAT-02 | Al desactivar un profesional, sus turnos futuros (hora de inicio posterior a ahora) en RESERVADO se cancelan automáticamente, con motivo completado por el sistema, y a cada cliente se le envía NOT-04. Antes de ejecutar, el panel muestra cuántos turnos se darán de baja y pide confirmación | U-01 |
| CAT-03 | Alta, edición y desactivación de servicios, con nombre, duración y precio informativo. El precio es de uso interno: no se muestra en la cara pública | U-01 |
| CAT-04 | La duración de un servicio es un múltiplo de la **granularidad de la grilla**, entre una vez la granularidad y la **duración máxima de un servicio** | — |
| CAT-05 | Al desactivar un servicio, sus turnos futuros en RESERVADO se cancelan con el mismo procedimiento de CAT-02 | U-01 |
| CAT-06 | Asignación y desasignación de servicios a profesionales. Un servicio sin ningún profesional activo asignado no se ofrece en la reserva | U-01 |
| CAT-07 | Carga de la disponibilidad semanal de cada profesional, en franjas horarias por día de la semana. Un mismo día puede tener varias franjas | U-01 |
| CAT-08 | Registro de bloqueos puntuales (feriados, licencias), con motivo, inicio y fin, y alcance: un profesional o todos | U-01 |
| CAT-09 | Un bloqueo no cancela turnos: los turnos que caen dentro quedan destacados en la agenda (AGE-01) para que el administrador decida sobre cada uno | — |
| CAT-10 | Cambiar la disponibilidad semanal, la duración de un servicio, una asignación o un bloqueo no altera los turnos ya reservados. Los que quedan fuera de la nueva disponibilidad se destacan en la agenda (AGE-01), igual que los afectados por un bloqueo | — |
| CAT-11 | Reactivar un profesional o un servicio desactivado. Los turnos cancelados al desactivarlo no se restauran | U-01 |
| CAT-12 | Eliminar un bloqueo. Un bloqueo no se edita: para corregirlo se elimina y se registra de nuevo. Al eliminarlo, sus turnos dejan de destacarse y el horario vuelve a ofrecerse | U-01 |
| CAT-13 | El inicio y el fin de un bloqueo se alinean a la **granularidad de la grilla**, y el fin es posterior al momento de registrarlo | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| CAT-E1 | La duración de un servicio no cumple CAT-04 | Se rechaza indicando los valores permitidos |
| CAT-E2 | Dos franjas de disponibilidad del mismo profesional y día se superponen | Se rechaza indicando la franja con la que choca |
| CAT-E3 | El inicio de un bloqueo es posterior a su fin | Se rechaza |
| CAT-E6 | Un bloqueo no cumple CAT-13 (desalineado, o termina en el pasado) | Se rechaza al guardar, indicando el motivo |
| CAT-E4 | Una reserva se confirma mientras se está desactivando el profesional o el servicio | Prospera la operación que llega primero. Si la desactivación llega primero, la reserva falla y el cliente vuelve a elegir; si la reserva llega primero, el turno nuevo entra en la cancelación en cascada |
| CAT-E5 | Se desasigna un servicio de un profesional que tiene turnos futuros de ese servicio | Los turnos existentes se mantienen (CAT-10); solo deja de ofrecerse para reservas nuevas |

### AGE — Agenda
**Superficie(s):** Panel de administración

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| AGE-01 | Vista de la agenda de un día por profesional, ordenada cronológicamente, con el estado de cada turno visible y los turnos afectados por un bloqueo destacados. Por defecto muestra el día actual y se puede navegar a cualquier otro día | U-01 |
| AGE-02 | La agenda que se está mirando se actualiza sola, sin recarga manual: las reservas, cancelaciones y cambios de estado aparecen sin intervención del administrador | Sistema |
| AGE-03 | Marcar un turno como atendido, a partir de su hora de inicio | U-01 |
| AGE-04 | Marcar un turno como ausente manualmente, a partir de su hora de inicio, sin esperar al marcado automático (AUS-01) | U-01 |
| AGE-05 | Cancelar un turno en RESERVADO, aunque ya haya empezado, indicando el motivo, que es obligatorio. Envía NOT-02 | U-01 |
| AGE-06 | Consultar el historial completo de cada turno: cada cambio de estado, con autor, fecha y hora, y canal de origen | U-01 |
| AGE-07 | Los eventos del historial no se editan ni se borran | — |
| AGE-08 | Los datos de un turno (cliente, profesional, servicio, horario) no se editan: un cambio de horario es una reprogramación (REP) y cualquier otro cambio es cancelar y reservar de nuevo | — |
| AGE-09 | Buscar turnos por email, nombre o teléfono del cliente, con su estado y fecha | U-01 |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| AGE-E1 | Se marca o cancela un turno que otro canal ya llevó a un estado terminal | Se rechaza indicando el estado actual; la agenda ya lo muestra actualizado (AGE-02) |
| AGE-E2 | Se intenta marcar atendido o ausente antes de la hora de inicio | Se rechaza |
| AGE-E3 | Se pierde la conexión que mantiene la agenda actualizada | El panel muestra que la agenda puede estar desactualizada y se reconecta solo; al reconectar, se actualiza |

### RES — Reserva
**Superficie(s):** Reserva pública, Panel de administración (turno manual)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| RES-01 | Reservar un turno sin registrarse, eligiendo servicio, profesional (o "cualquiera"), día y horario, con nombre, teléfono y email | U-02 |
| RES-02 | Cargar un turno manual para un cliente que se comunicó por teléfono, con nombre, teléfono y email obligatorios | U-01 |
| RES-03 | Las reglas de este bloque (RES-04 a RES-11) aplican igual en los dos canales. No hay excepción administrativa | — |
| RES-04 | Solo se listan servicios activos con al menos un profesional activo asignado. El precio no se muestra | — |
| RES-05 | Los horarios de inicio se ofrecen según la **granularidad de la grilla**, contada desde las 00:00 | — |
| RES-06 | Un horario se ofrece si la franja completa del servicio cae dentro de la disponibilidad semanal del profesional, no pisa un bloqueo vigente y no pisa otro turno no cancelado | — |
| RES-07 | Un horario se puede reservar hasta su hora exacta de inicio (**anticipación mínima de reserva**); pasada esa hora, deja de ofrecerse | — |
| RES-08 | Solo se ofrecen horarios dentro del **horizonte de reserva** | — |
| RES-09 | Un cliente no puede tener más turnos en RESERVADO que el **tope de turnos activos por cliente**, contados por clave de identidad. Un turno en RESERVADO cuenta aunque su hora ya haya pasado, hasta que se cierre por cualquier vía | — |
| RES-10 | Con "cualquiera", se muestra la unión de los horarios libres de todos los profesionales activos habilitados para el servicio | — |
| RES-11 | Al confirmar con "cualquiera", se asigna el profesional libre en ese horario con menos turnos no cancelados ese día; ante empate, uno al azar | Sistema |
| RES-12 | El turno se crea en RESERVADO, con su canal de origen (público o panel) y un token de cancelación propio (CAN-02) | Sistema |
| RES-13 | Al confirmar, en los dos canales, se envía NOT-01, que siempre indica el profesional asignado | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| RES-E1 | Dos reservas concurrentes sobre el mismo horario y profesional | Prospera una. La otra recibe un aviso de que el horario se ocupó y vuelve a elegir horario, con la disponibilidad actualizada |
| RES-E2 | Con "cualquiera", el profesional asignado se ocupó entre la vista y la confirmación | Se asigna otro que siga libre en ese horario. Solo falla si se ocuparon todos, y entonces aplica RES-E1 |
| RES-E3 | El cliente ya alcanzó el **tope de turnos activos por cliente** | La reserva se rechaza al confirmar, indicando que ya tiene un turno activo y que puede cancelarlo con el link de su email. En el panel, el mensaje indica el turno activo existente |
| RES-E4 | El horario elegido llegó a su hora de inicio antes de confirmar | La reserva se rechaza y vuelve a elegir horario |
| RES-E5 | El email tiene un formato inválido | Se rechaza antes de confirmar, indicando el campo |

**Ejemplos**
- RES-06: servicio de 45 min, profesional disponible de 9:00 a 12:00, con un turno de 10:00 a
  10:30. Se ofrecen 9:00 y 9:15; 9:30 no (terminaría 10:15 y pisa el turno); de 10:30 a 11:15 sí;
  11:30 no (se pasa de las 12:00).
- RES-09: `Juan.Perez+turnos@gmail.com` y `juanperez@gmail.com` son el mismo cliente: si el
  primero tiene un turno en RESERVADO, el segundo no puede reservar.
- RES-11: a las 10:00 están libres Ana (3 turnos ese día) y Luis (2) → Luis. Los dos con 2 → uno
  al azar.

### REP — Reprogramación
**Superficie(s):** Panel de administración

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| REP-01 | Reprogramar un turno en RESERVADO, aunque ya haya empezado, a otro día y horario, con el mismo profesional y el mismo servicio | U-01 |
| REP-02 | Reprogramar ejecuta, en una sola operación atómica: (1) la cancelación del turno original, con motivo completado por el sistema, y (2) la creación de un turno nuevo en el horario destino, en RESERVADO y encadenado al original | Sistema |
| REP-03 | El turno nuevo se valida con las mismas reglas que cualquier reserva (RES-05 a RES-09) | — |
| REP-04 | Por ser atómica, la operación no dispara el **tope de turnos activos por cliente** en el paso intermedio | — |
| REP-05 | El historial del turno original registra que su cancelación se originó en una reprogramación, y el turno nuevo referencia al original | Sistema |
| REP-06 | Solo se envía NOT-05. No se envía la notificación de cancelación del original | Sistema |
| REP-07 | El token de cancelación del original queda invalidado; el turno nuevo tiene el suyo, incluido en NOT-05 | Sistema |
| REP-08 | El recordatorio (NOT-06) del turno nuevo se envía según su nueva fecha, con las reglas de siempre | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| REP-E1 | El horario destino no está disponible | No se ejecuta nada: el turno original queda intacto |
| REP-E2 | El turno original ya no está en RESERVADO (otro canal lo cerró) | Se rechaza indicando el estado actual |

### CAN — Cancelación por el cliente
**Superficie(s):** Reserva pública (link)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| CAN-01 | Cancelar el propio turno desde el link del email, sin autenticarse y sin indicar motivo, hasta la hora de inicio del turno. Envía NOT-03 | U-02 |
| CAN-02 | Cada turno tiene un token de cancelación único, largo y aleatorio, que se invalida al usarse o al volverse terminal el turno | Sistema |
| CAN-03 | Antes de cancelar, el link muestra los datos del turno y pide confirmación | U-02 |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| CAN-E1 | El token no existe o ya fue invalidado | Se muestra que el link no es válido, sin revelar datos de ningún turno |
| CAN-E2 | Ya pasó la hora de inicio del turno | Se rechaza indicando que el turno ya no se puede cancelar online |

### AUS — Ausente automático
**Superficie(s):** — (proceso del sistema)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| AUS-01 | Un turno en RESERVADO pasa a AUSENTE cuando transcurre la **ventana de marcado automático de ausente** desde su hora de inicio sin que el administrador lo haya marcado | Sistema |
| AUS-02 | El cambio queda en el historial con autor y canal "sistema" | Sistema |
| AUS-03 | El estado es definitivo: no se revierte | — |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| AUS-E1 | El administrador marca el turno en el mismo momento en que corre el proceso | Prospera la operación que llega primero; la otra no cambia nada |
| AUS-E2 | El proceso no corrió a tiempo (el sistema estuvo caído) | Al volver, marca todos los turnos que ya cumplieron la ventana |

### RET — Retención y anonimización
**Superficie(s):** — (proceso del sistema)

**Requisitos**
| ID | Requisito | Actor |
|---|---|---|
| RET-01 | Los datos personales del cliente (nombre, teléfono, email) se conservan durante el **plazo de retención de datos del cliente**, contado desde el inicio de su turno más reciente, en cualquier estado | — |
| RET-02 | El plazo se cuenta por clave de identidad: un turno nuevo reinicia el plazo sobre todos los turnos anteriores del mismo cliente | — |
| RET-03 | Cumplido el plazo, los datos personales se anonimizan: se reemplazan por el texto «Anonimizado». El turno y su historial se conservan: fecha, profesional, servicio, estados, autores y canales | Sistema |
| RET-04 | La anonimización alcanza también a los datos personales que hayan quedado dentro de los eventos del historial | Sistema |
| RET-05 | El proceso corre una vez por día | Sistema |

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| RET-E1 | El proceso no corrió algún día | La próxima corrida anonimiza todo lo que ya cumplió el plazo |
| RET-E2 | El cliente reserva un turno nuevo mientras la anonimización procesa sus turnos | Gana el turno nuevo: reinicia el plazo y ese cliente no se anonimiza en esa corrida |

### NOT — Notificaciones
**Superficie(s):** — (transversal)

**Requisitos**
| ID | Evento | Canal | Destinatario | Contenido |
|---|---|---|---|---|
| NOT-01 | Confirmación de reserva (RES-13) | Email | Cliente | Datos del turno, profesional asignado y link de cancelación |
| NOT-02 | Cancelación por el administrador (AGE-05) | Email | Cliente | Aviso de baja del turno |
| NOT-03 | Cancelación por el propio cliente (CAN-01) | Email | Cliente | Confirmación de la cancelación |
| NOT-04 | Cancelación en cascada por desactivación (CAT-02, CAT-05) | Email | Cliente | Aviso de baja del turno |
| NOT-05 | Reprogramación (REP-06) | Email | Cliente | Nuevo día y horario, con el link de cancelación nuevo |
| NOT-06 | Recordatorio | Email | Cliente | Datos del turno y link de cancelación. Uno solo por turno, la **antelación del recordatorio** antes del inicio |

- NOT-06 no se envía si el turno se reservó con menos de la **antelación del recordatorio** por
  delante, ni si el turno ya no está en RESERVADO.
- Si NOT-06 no salió a tiempo (el sistema estuvo caído), se envía al reanudar mientras el turno siga
  en RESERVADO y no haya llegado su hora de inicio; si no, se omite.
- Los emails se envían a la dirección tal como la escribió el cliente, no a la clave de
  identidad.

**No se notifica:**
- Nada al administrador: se entera por la agenda en tiempo real (AGE-02).
- La cancelación del turno original en una reprogramación (REP-06).
- El paso automático a AUSENTE (AUS-01).
- Los rebotes posteriores a un envío que el servidor de email aceptó: no se detectan.

**Condiciones de falla**
| ID | Condición | Resultado |
|---|---|---|
| NOT-E1 | Falla transitoria al enviar un email | Se reintenta. Un email que no sale nunca deja el turno en un estado inconsistente: la operación que lo disparó ya quedó hecha |
| NOT-E2 | El email se reintentó sin éxito hasta agotar los **reintentos de envío de email** | Se descarta y queda registrado en el historial del turno |
| NOT-E3 | El servidor de email rechaza el envío de forma definitiva | No se reintenta; queda registrado en el historial del turno |

## Fuera de alcance

- Múltiples consultorios o sedes
- Pagos y señas
- Turnos recurrentes
- Lista de espera
- Cuentas de cliente con historial propio
- Recordatorios por SMS o WhatsApp
- App móvil nativa
- Acceso para profesionales
- Idiomas además del español
- Pantalla de configuración de parámetros
- Notificaciones al administrador
- Recuperación y cambio de contraseña
- Estadísticas y reportes

## Parámetros

| Parámetro | Valor | ¿Editable por un usuario? |
|---|---|---|
| Horizonte de reserva | 30 días | no |
| Tope de turnos activos por cliente | 1 | no |
| Granularidad de la grilla | 15 minutos | no |
| Duración máxima de un servicio | 4 horas | no |
| Anticipación mínima de reserva | ninguna (hasta la hora de inicio) | no |
| Ventana de marcado automático de ausente | 30 minutos | no |
| Antelación del recordatorio | 24 horas | no |
| Plazo de retención de datos del cliente | 12 meses | no |
| Duración máxima de sesión | 8 horas | no |
| Intentos fallidos antes del bloqueo | 5 | no |
| Duración del bloqueo por intentos fallidos | 15 minutos | no |
| Reintentos de envío de email | 5 | no |

## Integraciones externas

No hay integraciones externas.

## Requisitos no funcionales

| ID | Categoría | Requisito | Target |
|---|---|---|---|
| NFR-01 | Volumen | Profesionales activos | Decenas como máximo |
| NFR-02 | Volumen | Turnos reservados por mes | Cientos |
| NFR-03 | Volumen | Clientes reservando a la vez en el pico | Decenas |
| NFR-04 | Tiempos | Reserva completa desde la cara pública | Menos de 1 minuto, desde el teléfono |
| NFR-05 | Tiempos | Carga de los horarios disponibles | Menos de 2 segundos |
| NFR-06 | Tiempos | Un cambio aparece en la agenda que se está mirando | Menos de 5 segundos |
| NFR-07 | Disponibilidad | Cara pública y panel | 24/7; cortes de mantenimiento de hasta 15 minutos, entre las 2:00 y las 6:00 |
| NFR-08 | Privacidad y cumplimiento | Datos personales guardados | Nombre, teléfono y email del cliente |
| NFR-09 | Privacidad y cumplimiento | Normativa | Ley 25.326 de Protección de Datos Personales (Argentina) |
| NFR-10 | Accesibilidad | Nivel | WCAG 2.2 AA en la reserva pública; el panel no aplica |
| NFR-11 | Idioma, zona horaria y formatos | Idioma | Español únicamente |
| NFR-12 | Idioma, zona horaria y formatos | Zona horaria | Una sola: America/Argentina/Buenos_Aires |
| NFR-13 | Idioma, zona horaria y formatos | Formatos | Fecha dd/mm/aaaa, hora de 24 horas |
| NFR-14 | Compatibilidad | Navegadores | Las dos últimas versiones de Chrome, Safari, Firefox y Edge, en escritorio y móvil |

## Decisiones tomadas

| ID | Tema | Decisión | Descartado | Afecta |
|---|---|---|---|---|
| DEC-01 | Bloqueo vs. desactivación | Un bloqueo no cancela turnos (se destacan); desactivar un profesional o un servicio sí cancela en cascada | Tratar los dos casos igual | CAT-02, CAT-05, CAT-09 |
| DEC-02 | Clave de identidad | Los puntos de la parte local del email se ignoran en todos los dominios | Aplicarlo solo a Gmail | RES-09, RET-02 |
| DEC-03 | Tope en el panel | El tope de turnos activos aplica también en el panel | Excepción administrativa | RES-03 |
| DEC-04 | Reprogramación | Cancela el original y crea uno nuevo encadenado | Editar la fecha del turno existente | REP-02 |
| DEC-05 | Reparto de "cualquiera" | Se mide la carga por cantidad de turnos | Medirla por minutos de trabajo | RES-11 |
| DEC-06 | Acceso del administrador | Sin recuperación ni cambio de contraseña | Recuperación por email | U-01, ACC-04 |
| DEC-07 | Ausente | El marcado automático es definitivo | Permitir revertirlo | AUS-03 |
| DEC-08 | Edición de turnos | Los datos de un turno no se editan | Editar datos del turno | AGE-08 |
