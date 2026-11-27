# Turnero — Definición de producto (v1)

**Estado:** cerrado para desarrollo
**Fecha:** 15/09/2026

> Todas las decisiones de producto están tomadas. No quedan puntos abiertos. La sección 11 documenta las consecuencias asumidas de las decisiones que tenían alternativa.

---

## 1. Resumen

Turnero es un sistema de gestión y reserva de turnos con dos caras:

- **Panel de administración**, operado por un único administrador, que mantiene el catálogo (profesionales, servicios, disponibilidad, bloqueos) y opera la agenda del día.
- **Cara pública**, donde el cliente reserva un turno en menos de un minuto y sin registrarse.

Sobre ambas corren tres comportamientos transversales: notificaciones por email, marcado automático de ausencia y retención acotada de datos personales.

**Principio rector:** la agenda nunca se superpone. Es la invariante dura del sistema y cualquier decisión de diseño se subordina a ella. Es también la única regla que no admite excepción en ningún canal.

---

## 2. Actores

| Actor | Descripción | Acceso |
|---|---|---|
| **Administrador** | Único usuario del panel. Mantiene el catálogo y opera la agenda diaria. | Usuario y contraseña |
| **Cliente** | Persona que reserva un turno. No tiene cuenta ni historial propio. | Anónimo |
| **Profesional** | Entidad del catálogo que presta servicios y tiene disponibilidad. No es usuario del sistema en v1. | Sin acceso |
| **Sistema** | Procesos automáticos: recordatorios, marcado de ausencia, cancelaciones en cascada, anonimización. | — |

El acceso al panel es con usuario y contraseña, **sin recuperación por email**. La reposición de credenciales es una tarea de infraestructura y debe estar documentada en el runbook de despliegue.

---

## 3. Modelo de dominio

**Profesional** — nombre, estado activo/inactivo. Se desactiva, nunca se elimina.

**Servicio** — nombre, duración (múltiplo de 15 minutos), precio informativo de uso interno, estado activo/inactivo.

**Asignación profesional–servicio** — relación muchos a muchos. Define qué profesional puede prestar qué servicio.

**Disponibilidad semanal** — franjas horarias por profesional y día de la semana. Plantilla recurrente de trabajo.

**Bloqueo** — interrupción puntual con fecha/rango horario, motivo y alcance: un profesional o todos.

**Turno** — profesional, servicio, fecha y hora de inicio, duración heredada del servicio, datos del cliente (nombre, teléfono, email), estado, origen, motivo de cancelación si aplica, token de cancelación.

**Cliente** — no es una cuenta. Es la agrupación de turnos bajo una misma **clave de identidad**: el email normalizado.

**Evento de turno** — registro inmutable de auditoría: qué cambió, quién lo hizo, cuándo y por qué canal.

### 3.1 Clave de identidad del cliente

El email se normaliza para obtener la clave que gobierna el tope de turnos activos y el plazo de retención:

1. Se pasa a minúsculas.
2. Se elimina el sufijo `+alias` de la parte local.
3. Se eliminan los puntos de la parte local.

La regla se aplica **igual para todos los dominios**. Los emails se envían siempre a la dirección tal como la escribió el cliente, no a la forma normalizada.

---

## 4. Estados del turno

```
   RESERVADO ──┬──► ATENDIDO
               ├──► AUSENTE    (manual, o automático a los 30')
               └──► CANCELADO
```

Los tres estados de salida son **terminales**. No hay reversión, incluido el ausente automático.

La **reprogramación no es una transición de estado**: cancela el turno original y crea uno nuevo encadenado en estado `RESERVADO` (ver 5.2).

---

## 5. Panel de administración

### 5.1 Catálogo

| ID | Requisito |
|---|---|
| ADM-01 | Alta, edición y **desactivación** de profesionales. No existe la eliminación: desactivar preserva la integridad del historial. |
| ADM-02 | Al desactivar un profesional, sus turnos futuros en estado `RESERVADO` se **cancelan automáticamente** con aviso por email al cliente. El panel muestra cuántos turnos se darán de baja y pide confirmación antes de ejecutar. El motivo de cancelación lo completa el sistema. |
| ADM-03 | Alta, edición y desactivación de servicios, con nombre, duración y precio informativo. El precio es de **uso interno**: no se muestra en la cara pública. |
| ADM-04 | La duración de un servicio solo admite **múltiplos de 15 minutos**. |
| ADM-05 | Al desactivar un servicio, sus turnos futuros se cancelan automáticamente con el mismo procedimiento de ADM-02. |
| ADM-06 | Asignación de servicios a profesionales. Un servicio sin ningún profesional activo asignado no se ofrece públicamente. |
| ADM-07 | Carga de disponibilidad semanal por profesional, en franjas horarias por día de la semana. |
| ADM-08 | Registro de bloqueos puntuales (feriados, licencias) con motivo, alcance temporal y alcance por profesional: uno o todos. |
| ADM-09 | Un bloqueo **no cancela turnos**. Los turnos que caen dentro quedan **destacados** en la agenda para que el administrador decida sobre cada uno. |
| ADM-10 | Cambiar la disponibilidad semanal o la duración de un servicio no altera retroactivamente los turnos ya reservados. |

> **Asimetría deliberada entre ADM-09 y ADM-02/05:** el bloqueo es temporal y el turno puede reubicarse con el mismo profesional, por eso se decide caso por caso. La desactivación es definitiva y no hay a quién reubicarlo, por eso se cancela en cascada.

### 5.2 Operación de la agenda

| ID | Requisito |
|---|---|
| ADM-11 | Vista de agenda del día por profesional, ordenada cronológicamente, con el estado de cada turno visible y los turnos afectados por bloqueos destacados. |
| ADM-12 | La agenda del día se **actualiza sola**, sin recarga manual. Las reservas y cancelaciones de último momento aparecen en pantalla sin intervención del administrador. |
| ADM-13 | Marcar un turno como **atendido**. |
| ADM-14 | Marcar un turno como **ausente** manualmente, sin esperar los 30 minutos del proceso automático. |
| ADM-15 | **Cancelar** un turno indicando motivo. El motivo es obligatorio cuando la cancelación es manual. |
| ADM-16 | **Reprogramar** un turno a un horario nuevo, según el modelo de 5.3. |
| ADM-17 | Carga de **turnos manuales** para clientes que se comunicaron por teléfono. Requiere nombre, teléfono y **email, siempre obligatorio**. |
| ADM-18 | El panel aplica **las mismas reglas de reserva que la cara pública**: tope de turnos activos, horizonte de 30 días y no superposición. No hay excepción administrativa. |
| ADM-19 | Consulta del **historial completo** de cada turno: cada cambio de estado o de datos, con autor, fecha y hora, y **canal de origen** (público, panel o sistema). |
| ADM-20 | Los eventos del historial son inmutables: no se editan ni se borran. |

### 5.3 Modelo de reprogramación

Reprogramar un turno ejecuta, **en una sola operación atómica**:

1. Cancelación del turno original, con motivo completado por el sistema.
2. Creación de un turno nuevo en el horario destino, encadenado al original, en estado `RESERVADO`.

Reglas asociadas:

| ID | Requisito |
|---|---|
| ADM-21 | La validación de no superposición y disponibilidad aplica al turno nuevo igual que en una reserva cualquiera. |
| ADM-22 | Al ser atómica, la operación **no dispara el tope de turnos activos** en el paso intermedio. |
| ADM-23 | La cancelación técnica **cuenta como cancelación normal** en las estadísticas. El historial deja registrado que se originó en una reprogramación. |
| ADM-24 | La reprogramación envía **únicamente** el email de reprogramación. No se envía el email de cancelación del turno original. |
| ADM-25 | El token de cancelación del turno original queda invalidado. El turno nuevo tiene su propio token, incluido en el email de reprogramación. |
| ADM-26 | Como el turno nuevo nunca recibió recordatorio, el aviso de 24 horas se dispara naturalmente para la fecha nueva. No hay regla especial. |

---

## 6. Reserva pública

**Objetivo de experiencia:** reserva completa en menos de un minuto, sin registro, sin contraseña, sin verificación previa.

### 6.1 Flujo

1. El cliente elige un **servicio**.
2. Elige un **profesional** entre los habilitados, o la opción **"cualquiera"**.
3. Elige **día y horario** entre los disponibles.
4. Deja **nombre, teléfono y email**.
5. Confirma. Recibe el email de confirmación con link de cancelación.

### 6.2 Requisitos

| ID | Requisito |
|---|---|
| PUB-01 | Solo se listan servicios activos con al menos un profesional activo asignado. El precio no se muestra. |
| PUB-02 | Los horarios de inicio se ofrecen en una **grilla fija de 15 minutos**. |
| PUB-03 | Un horario se ofrece si la franja completa que ocuparía el servicio cae dentro de la disponibilidad semanal del profesional, no pisa un bloqueo vigente y no pisa otro turno. |
| PUB-04 | **No hay anticipación mínima.** Un horario se puede reservar hasta su **hora exacta de inicio**; pasada esa hora, deja de ofrecerse. |
| PUB-05 | **Horizonte de 30 días** hacia adelante. |
| PUB-06 | **Máximo de 1 turno activo** por clave de identidad. Un turno en estado `RESERVADO` bloquea al cliente, incluso si su hora ya pasó, hasta que se cierre por cualquier vía. |
| PUB-07 | **No superposición:** ante dos reservas concurrentes sobre el mismo horario y profesional, solo una prospera. La otra recibe un aviso claro y vuelve al paso de selección de horario, con la grilla actualizada. |
| PUB-08 | El link de cancelación permite al cliente cancelar sin autenticarse, **hasta la hora de inicio del turno**. Token único por turno, largo, aleatorio, invalidado al usarse o al volverse terminal el turno. |

### 6.3 Resolución de "cualquiera"

| ID | Requisito |
|---|---|
| PUB-09 | El cliente ve la unión de horarios libres de todos los profesionales activos habilitados para el servicio. |
| PUB-10 | Al confirmar, el sistema asigna el profesional con **menor cantidad de turnos ese día**. |
| PUB-11 | Ante empate, la elección es **aleatoria**. |
| PUB-12 | Si el profesional que correspondía quedó ocupado entre la vista y la confirmación, el sistema asigna otro que siga libre en ese horario. La reserva **solo falla si se ocuparon todos**. |
| PUB-13 | El email de confirmación indica siempre qué profesional quedó asignado. |

---

## 7. Comportamientos transversales

### 7.1 Notificaciones por email

| ID | Evento | Contenido |
|---|---|---|
| TRV-01 | Confirmación de reserva | Datos del turno, profesional asignado y link de cancelación. |
| TRV-02 | Cancelación por el administrador | Aviso de baja del turno. |
| TRV-03 | Cancelación por el propio cliente vía link | Confirmación de la cancelación. |
| TRV-04 | Cancelación en cascada por desactivación | Aviso de baja del turno. |
| TRV-05 | Reprogramación | Nuevo día y horario, con link de cancelación nuevo. |
| TRV-06 | Recordatorio | **Único**, 24 horas antes del turno. |

- El recordatorio se envía una sola vez por turno. Si el turno se reserva con menos de 24 horas de anticipación, no se envía.
- No hay notificaciones por email al administrador. Se entera por la agenda en tiempo real (ADM-12).

### 7.2 Marcado automático de ausente

| ID | Requisito |
|---|---|
| TRV-07 | Un turno en `RESERVADO` pasa automáticamente a `AUSENTE` transcurridos **30 minutos** de su hora de inicio sin novedad del administrador. |
| TRV-08 | El evento queda registrado en el historial con autor y canal "sistema". |
| TRV-09 | El estado es **definitivo**. No se revierte. |
| TRV-10 | Al cerrarse el turno, el cliente queda liberado del tope de PUB-06 y puede volver a reservar. |

### 7.3 Retención y anonimización

| ID | Requisito |
|---|---|
| TRV-11 | Los datos personales del cliente (nombre, teléfono, email) se conservan **12 meses desde su último turno**. |
| TRV-12 | El cómputo es por clave de identidad: un turno nuevo reinicia el plazo sobre todos los turnos anteriores del mismo cliente. |
| TRV-13 | Cumplido el plazo, los datos se **anonimizan**. El turno y su historial se conservan íntegros: fecha, profesional, servicio, estados, autores y canales. |
| TRV-14 | La anonimización alcanza también a los datos personales que hubieran quedado dentro de los eventos del historial. |

---

## 8. Parámetros

Viven en **configuración de despliegue**. Cambiarlos requiere un deploy; no hay pantalla de ajustes en v1.

| Parámetro | Valor |
|---|---|
| Anticipación mínima de reserva | Ninguna (hasta la hora exacta de inicio) |
| Horizonte de reserva | 30 días |
| Máximo de turnos activos por cliente | 1 |
| Granularidad de la grilla | 15 minutos |
| Ventana de marcado automático de ausente | 30 minutos |
| Antelación del recordatorio | 24 horas |
| Plazo de retención de datos del cliente | 12 meses |

---

## 9. Requisitos no funcionales

- **Integridad de agenda.** La no superposición se garantiza a nivel de almacenamiento (restricción de unicidad o bloqueo transaccional), no solo por validación en la interfaz. Es el requisito técnico más importante del sistema.
- **Atomicidad de la reprogramación.** Cancelación y creación ocurren en una única transacción.
- **Agenda en tiempo real.** La pantalla del día se actualiza sin recarga manual.
- **Zona horaria.** Operación en una única zona horaria: America/Argentina/Buenos_Aires. Atención al manejo de fechas en los procesos automáticos.
- **Entrega de emails.** Reintento ante fallo transitorio. Un email que no sale no puede dejar el turno en estado inconsistente.
- **Uso móvil.** La cara pública se usa mayormente desde el teléfono; el objetivo de "menos de un minuto" se mide ahí.
- **Auditoría inmutable.** Los eventos de historial no se editan ni se borran.
- **Reposición de credenciales.** Al no haber recuperación por email, el procedimiento de reseteo del administrador debe estar documentado en el runbook de infraestructura.
- **Idioma.** Español únicamente.

---

## 10. Fuera de alcance de v1

- Múltiples consultorios o sedes
- Pagos y señas
- Turnos recurrentes
- Lista de espera
- Cuentas de cliente con historial propio
- Recordatorios por SMS o WhatsApp
- App móvil nativa
- Roles por profesional
- Idiomas además del español
- Pantalla de configuración de parámetros
- Notificaciones por email al administrador
- Recuperación de contraseña

---

## 11. Consecuencias asumidas

Decisiones tomadas con conocimiento de su costo. No son pendientes: son riesgos aceptados que conviene tener a la vista durante el desarrollo y la operación.

**Normalización de puntos pareja para todos los dominios.** Ignorar los puntos es una convención de Gmail, no del estándar. En dominios corporativos, dos personas distintas pueden colisionar en la misma clave de identidad y la segunda no podrá reservar online. Sin excepción administrativa (ADM-18), tampoco podrá reservar por teléfono.

**Tope de 1 turno activo con simetría entre canales.** El cliente que quiere dos servicios distintos, o un turno para un familiar, o un control a tres meses, recibe "no se puede" por los dos canales. Conviene que el texto de la cara pública lo explicite para no trasladar la discusión al teléfono.

**Reprogramación contada como cancelación.** La estadística de cancelados incluye reprogramaciones y no mide abandono real. El rastro queda en el historial, no en el número.

**Ausente definitivo.** El cliente que llega pasados los 30 minutos queda registrado como ausente de forma permanente, salvo que el administrador lo haya marcado atendido antes. Con un solo administrador atendiendo, la ventana es corta y el indicador de ausentismo va a leerse alto.

**Carga medida por cantidad de turnos.** Un profesional con tres servicios cortos cuenta más cargado que uno con dos largos. El reparto de "cualquiera" es predecible pero no refleja minutos reales de trabajo.

**Acceso sin recuperación de contraseña.** Con un único administrador, olvidar la contraseña deja el panel inaccesible hasta una intervención manual sobre la base de datos.
