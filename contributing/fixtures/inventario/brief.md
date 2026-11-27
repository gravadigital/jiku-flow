# Inventario — brief

La oficina presta equipos a los empleados (notebooks, monitores, teclados, cámaras) y lo lleva en una
planilla que nunca está al día. Queremos una aplicación web, **Inventario**, para registrar los equipos,
quién tiene cada uno y hasta cuándo, con avisos cuando un préstamo está por vencer.

- Un **administrador** da de alta los equipos (tipo, marca, modelo, número de serie), los da de baja y
  ve todos los préstamos.
- Cada **empleado** entra con su usuario, ve los equipos disponibles, pide un préstamo y lo devuelve.
  Ve sus préstamos y su historial.
- Un préstamo tiene un plazo; antes de vencer, el empleado recibe un email de aviso. Si vence sin
  devolverse, le llega otro aviso a él y uno al administrador.
- Los avisos los manda un proceso aparte que escucha lo que pasa con los préstamos.
