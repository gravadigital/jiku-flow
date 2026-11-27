# The method

How work moves through jiku flow, from an idea to a released version, and who does what at each
step. For why each piece is the way it is, see [Design decisions](design.md).

## The pieces

| Piece | Where | Who writes it |
|---|---|---|
| **Requirement and its specification** — who asked, priority, state; scope, proposal, acceptance criteria | Jiku | The client or the team creates the requirement; `/jflow-product-discover` creates the initial plan's; `/jflow-spec` specifies it with the user |
| **Product definition** — what is built, its rules, why | `_jflow/` in the product repository | `/jflow-product-scaffold` or `/jflow-product-brownfield` at the start; then every `/jflow-build` |
| **Code and tests** | `services/` | `/jflow-product-scaffold`, `/jflow-build`, `/jflow-fix` |
| **Evidence** — each criterion, its test, its result | The MR/PR and a Jiku comment | `jflow.py evidence`, from the test reports |
| **Documentation for people** | `README.md`, `docs/`, `CHANGELOG.md` | The same skills, as what they describe changes |
| **Engineering defaults** — how every product is built, tested, observed, versioned | `.claude/specs/engineering.md` | jiku flow |

**Jiku manages, the repository defines, the evidence closes.** What is still to build lives in Jiku
requirements; what is built lives in the definition; whether something is done is decided by tests
and a verifier, not by a claim.

## Controlled input, controlled output, free middle

- **Input:** a specification whose every rule was decided by the user and whose every acceptance
  criterion has an ID.
- **Output:** each criterion proven by a passing test that carries its ID, the definition and
  contracts updated, and a clean-context verifier's approval.
- **Middle:** how to build it — libraries, structure, patterns, tests at which level — is the
  model's, researched from the current official documentation, and recorded in each service's
  `AGENTS.md`.

What is not free: the engineering defaults (Compose and Make, tests against a real database,
contracts verified by tests, the error shape, input bounds, the outbound address guard,
OpenTelemetry, health and monitoring, branches, versioning) and the acceptance criteria.

## A new product

```
Jiku: a person creates the project
  │
  ├─ /jflow-product-discover        the user defines the product, section by section
  │     discovery on dev, plan in Jiku: the base requirement and one per part, as drafts
  │
  ├─ /jflow-product-scaffold {base} technical questions, then on its own:
  │     skeleton of every service, product-level definition, guides — branch, verified, MR
  │
  └─ for each part, in order:
        /jflow-spec {id}  →  a person approves (En cola)  →  /jflow-build {id}  →  MR to dev
```

The discovery is the one step where the user participates heavily: it is decision-complete, so the
steps after it can run on their own. It ends in the initial plan: the product split into parts, each
one requirement and one MR, in an order where no part needs what a later one brings. Every part is
specified against what is already built when its turn comes, then built.

## An existing product

```
/jflow-product-brownfield  →  definition of what exists, repository at the minimum,
                              adoption report, security incidencias in Jiku  →  MR
```

Then the same cycle as any product. The adoption changes how the repository is laid out, run and
tested, never what the product does.

## A feature or improvement

```
Jiku: Análisis      the request arrives (client or team)
  │ a person decides to specify it
Jiku: Planificación
  │ /jflow-spec {id}         the user decides; the agent challenges
  │ a person approves it
Jiku: En cola
  │ /jflow-build {id}        the agent builds and proves it
Jiku: Desarrollo  →  MR  →  human review  →  merge to dev
  │ /jflow-release, deploy
Jiku: Revisión  →  Resuelto
```

**Changing something already specified or built** is always `/jflow-spec {id} {what changes}`. A
requirement already merged is reopened (back to Desarrollo), never duplicated; `/jflow-build` then
builds only the difference between the new specification and what `dev` has, on a new branch
(`feat/{id}-{slug}-2`).

## A bug or a small change

`/jflow-fix {id} {what}` → MR. Small means it adds or modifies nothing documented: no requirement,
rule, decision, parameter, contract, table or flow. A bug — the product does not do what the
definition says — is small. A bug the definition does not cover adds a rule, so it is specified like
any other change.

## A version

`/jflow-release`: a regression of the whole product on `dev`, locally; the suggested version, one
confirmation; the CHANGELOG; `dev` merged into `main` and tagged; a note on every released
requirement. Deploying, and moving requirements to Revisión, are people's.

## Who does what

| People | The agent |
|---|---|
| Create the Jiku project | Links the repository to it |
| Decide every rule, decision and criterion | Proposes, challenges, records the reason |
| Approve, prioritize (En cola) | Moves a requirement to Desarrollo when it starts building it, or when the user confirms reopening it |
| Open, review, try and merge the MR | Pushes the branch and leaves the MR description, with the evidence and the verdict |
| Deploy, Revisión, Resuelto, Cancelado | Nothing |
| Release a version (one confirmation) | Regression, CHANGELOG, merge to `main`, tag, notes in Jiku |

Everything the agent writes to Jiku goes in the name of the person at the keyboard (their token),
marked as done by an agent, functional plus the key technical detail, never code. Comments are
internal.

## Where each skill stops and asks

| Skill | Asks |
|---|---|
| `/jflow-product-discover` | Throughout: it is the definition of the product |
| `/jflow-spec` | Every decision, and one review of the whole draft before writing to Jiku |
| `/jflow-product-scaffold` | Only the technical specification, at the start |
| `/jflow-build` | The start checks, and the large gaps, all in one round before building |
| `/jflow-fix` | Only if it is unsure the change is small |
| `/jflow-product-brownfield` | One round after the survey; later, only what blocks the product being ready |
| `/jflow-release` | The version |

The autonomous skills never ask about the process — whether to go on, verify again, fix a finding or
record what they saw. They do it, and report it at the end.
