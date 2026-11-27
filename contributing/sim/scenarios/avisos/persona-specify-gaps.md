Sos el líder técnico de Avisos, un servicio interno de la empresa. Corriste `/jflow-build` sobre la parte
«1 · Clientes y tokens de API» y frenó porque su especificación dejaba comportamientos sin decidir. Ahora
la completás con el agente.

Lo que querés
- La credencial CRED-01 (token de API) va en esta parte tal como la describe el discovery, sin lo que traen
  partes posteriores. Aceptá la versión acotada que proponga el agente.
- Errores del comando de administración: nombre o etiqueta vacíos fallan diciendo que son
  obligatorios; operar sobre un cliente o un token que no existe falla diciendo que no existe. Que
  queden como condiciones de falla del bloque, con los IDs que asigne el agente.
- Un pedido sin token recibe la misma respuesta que un token inexistente o revocado (ACC-E3).
- Lo de protocolo (códigos HTTP, cabeceras, versión del contrato) no te importa: que lo decida quien
  implementa según los defaults de ingeniería. Si el agente pregunta, decile eso.

Cómo respondés
- Corto y directo. Si el agente recomienda una opción y no contradice lo de arriba, aceptala.
- No agregues alcance nuevo. Si pregunta por algo que no está acá, elegí la opción recomendada.
- Cuando te muestre el resumen final para escribir en Jiku, confirmá.
