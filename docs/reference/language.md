# Language

Which language each thing jiku flow writes is in. The agent follows
[`.claude/specs/language.md`](../../.claude/specs/language.md); this page is the same rules for the
people who use it.

## The rules

1. **The conversation follows you.** The agent talks to you in the language you write in, even
   though the skills are written in English. It does not have to be the product language.
2. **What people of the product read is in the product language.** Jiku, the discovery, `README.md`,
   `docs/` and `CHANGELOG.md` are written in the `language` of `_jflow/project.yaml` (`es`, `en`,
   `pt`, any language code). **Spanish when unset.** It is asked when the project is linked
   (`/jflow-product-discover`, `/jflow-product-brownfield`) and never guessed.
3. **What only agents read is English.** `AGENTS.md`, `CLAUDE.md`, `project.yaml`, code, comments,
   identifiers and the output of `jflow.py`.
4. **Git is English.** Commit messages, MR/PR text, branch names and test names. What the MR quotes
   from the specification (its scope, a decision) stays as it was written.
5. **Structure and content.** The documents people read have a fixed structure that `jflow.py` reads:
   headings, table columns, bold labels and the fixed values of some columns (`add`, `new`, `test`…).
   That structure is **Spanish for a Spanish product and English for any other language**; the
   content is in the product language. The scripts read both structures.
6. **The definition** (`_jflow/prd/`, `apis/`, `db-schemas/`, `flows/`) always has an English
   structure, whatever the product language, and its content in the product language: its rows are
   copied word for word from the criteria in Jiku and from the discovery, and the checks compare
   them. Domain names (entities, surfaces, blocks, parameters, states, roles) are the product's own
   vocabulary; identifiers in code and contracts are their English translation.
7. **Nothing you wrote is translated.** A quote from the discovery, your words, a requirement title
   stay as they are.

## What goes in which language

| What | Language |
|---|---|
| Messages to you | Yours |
| Jiku: specification, comments, tasks, incidencias, release notes, the titles of the plan | Product |
| Discovery (`_jflow/discovery/`) | Product (structure Spanish for `es`, English otherwise) |
| `README.md`, `docs/`, `CHANGELOG.md` | Product |
| Texts and error messages the product shows its users | Product (the product's own NFR of language decides the rest) |
| Definition (`_jflow/prd/`, `apis/`, `db-schemas/`, `flows/`) | Structure English, content product |
| `AGENTS.md`, `CLAUDE.md`, `project.yaml` | English |
| Commits, MR/PR text, branch names, test names | English |
| Code, comments, identifiers, tables, columns, enums, API paths and fields, `jflow.py` output | English |

A product in Portuguese, for example, has its Jiku specification, README and guides in Portuguese,
with English headings and column names (`Scope`, `Acceptance criteria`, `add`…); a product in
Spanish has the same documents with Spanish headings (`Alcance`, `Criterios de aceptación`,
`agrega`…).

## Configuration

```yaml
# _jflow/project.yaml
language: es        # es | en | any language code; structure: Spanish for es, English otherwise
```

`jflow.py init-project --language {code}` writes it. Changing it later changes only what is written
from then on: documents already written keep their language, and the scripts keep reading them.

## Files that depend on the language

| Document | Spanish (`es`) | Any other language |
|---|---|---|
| Operations guide | `docs/operacion.md` | `docs/operations.md` |
| Integration guide | `docs/integracion.md` | `docs/integration.md` |
| Adoption report | `docs/adopcion.md` | `docs/adoption.md` |
| Templates for people | `.claude/templates/es/` | `.claude/templates/en/` (the agent writes them in the product language) |
| Base requirement title | `0 · Producto base` | `0 · Base product` |
| Ready line in Jiku | «Especificación: lista ({fecha})» | «Specification: ready ({date})» |
| Draft line in Jiku | «Especificación: borrador» | «Specification: draft» |
| Unreleased section | `[Sin publicar]` | `[Unreleased]` |

`README.md` and `CHANGELOG.md` keep their names in every language.

## Vocabulary

The structural names, English and Spanish. Use these exact names, never a translation of your own:
the scripts look for them. The complete current list:

```bash
python3 .claude/scripts/jflow.py lang-terms             # all of them, and the product language in effect
python3 .claude/scripts/jflow.py lang-terms --grep Scope
```

The ones used most:

| English | Spanish |
|---|---|
| Scope · Includes · Excludes · Depends on | Alcance · Incluye · No incluye · Depende de |
| Proposal · Parameters · Decisions · Technical detail | Propuesta · Parámetros · Decisiones · Detalle técnico |
| Acceptance criteria · Change · Criterion | Criterios de aceptación · Cambio · Criterio |
| Type · Topic · Decision · Rejected · Reason · Affects | Tipo · Tema · Decisión · Descartado · Motivo · Afecta |
| add · modify · remove | agrega · modifica · elimina |
| new · reverts · keeps | nueva · revierte · respeta |
| Blocks · Data · Invariants and guarantees · Schema · Interface · Flows · Glossary · Architecture | Bloques · Datos · Invariantes y garantías · Esquema · Interfaz · Flujos · Glosario · Arquitectura |
| Visual reference · Package · Screen · Reference · Route · State · Decided difference | Referencia visual · Paquete · Pantalla · Referencia · Ruta · Estado · Diferencia decidida |
| Decided in the implementation | Decidido en la implementación |
| Non-functional requirements · Verification · Tested in | Requisitos no funcionales · Verificación · Prueba en |
| test · alert · review | prueba · alerta · revisión |
| Specification: draft · ready | Especificación: borrador · lista |
| Origin · initial | Origen · inicial |
| Out of scope | Fuera de alcance |
| Base product | Producto base |
| Functional analysis · Domain analysis · Technical analysis · Base schema | Análisis funcional · Análisis de dominio · Análisis técnico · Esquema de base |
| Actors · Surfaces · Platform · Features · External integrations · Decisions taken | Actores · Superficies · Plataforma · Funcionalidades · Integraciones externas · Decisiones tomadas |
| Entities · States · Invariants · Guarantees · Key flows · Technical decisions | Entidades · Estados · Invariantes · Garantías · Flujos clave · Decisiones técnicas |
| Requirements · Failure conditions · Condition · Result | Requisitos · Condiciones de falla · Condición · Resultado |
| Unreleased · Added · Changed · Fixed · Removed · Known issues | Sin publicar · Agregado · Cambiado · Corregido · Eliminado · Problemas conocidos |
| Services and health · Background processes · Configuration · Observability · Recommended alerts · CI secrets · Deployment | Servicios y salud · Procesos en segundo plano · Configuración · Observabilidad · Alertas recomendadas · Secretos del CI · Despliegue |

Jiku's own values — the states (`analisis`, `planificacion`, `en_cola`, `desarrollo`, `revision`,
`resuelto`, `cancelado`) and the types (`funcionalidad`, `mejora`, `incidencia`, `otro`) — are
identifiers of Jiku and the same in every language.
