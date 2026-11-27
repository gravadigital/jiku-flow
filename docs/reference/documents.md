# Product documents

What a product repository that uses jiku flow contains, and the format of each document. This page
is a summary for people; the full format, with every rule, is in the specs the agent reads:
[Product Definition](../../.claude/specs/product-definition.md),
[Requirement Spec](../../.claude/specs/requirement.md),
[Database](../../.claude/specs/database.md),
[Engineering](../../.claude/specs/engineering.md),
[Discovery](../../.claude/specs/discovery.md),
[Language](../../.claude/specs/language.md).

The headings and column names below are the English ones. Where a document follows the product
language, a Spanish product uses the Spanish names: see [Language](language.md).

## The repository

Every product is a monorepo:

```
AGENTS.md  CLAUDE.md           Agents: how to work in this repo (English; CLAUDE.md is "@AGENTS.md")
README.md  CHANGELOG.md        People, in the product language
Makefile                       The single entry point for running anything
docker-compose.yml             The whole product, locally
.env.example                   Every variable with safe defaults; .env is git-ignored
.gitlab-ci.yml | .github/workflows/
services/{service}/            One folder per service
  AGENTS.md  CLAUDE.md         Stack, commands, structure, canonical examples, recurring errors
  Dockerfile  Makefile
docs/                          People, in the product language
  operacion.md | operations.md      Operations guide (always)
  integracion.md | integration.md   Integration guide (only with external integrators)
  adopcion.md | adoption.md         Adoption report (only in an adopted product)
_jflow/                        Agents: the workflow's memory
  project.yaml                 Jiku project and instance, git, product language
  discovery/                   The original analysis (frozen once the product is built)
  prd/                         The product definition: only what is built
  apis/                        Contracts (OpenAPI / AsyncAPI)
  db-schemas/                  One database schema per service that owns a database
  flows/                       Operations that cross modules or services
  references/                  Documentation of external systems
reports/                       Test reports and screenshots (git-ignored)
.claude/                       jiku flow, plus the user's own skills and settings
```

`_jflow/` has an underscore, not a dot, so searches do not skip it.

**Branches:** `dev` is integration; `main` is production, tagged `vX.Y.Z` by `/jflow-release`;
`feat/{id}-{slug}` for a specified requirement (`-2`, `-3`… when it is reopened), `fix/{id}-{slug}`
for a direct change, both from `dev`. The base product is `feat/{id}-base-product`, the adoption
`feat/{id}-adoption`.

**Commits:** Conventional Commits in English, with the requirement: `feat(api): cancel by link (#812)`.
`/jflow-release` and `jflow.py status` find requirements through that `(#id)`.

## `_jflow/project.yaml`

```yaml
language: es              # product language; Spanish when unset
jiku:
  project_id: 42          # the Jiku project of this repository
  instance: prod          # dev | prod → ~/.config/jiku/config.{instance}.yaml
  writes: true            # false = dry-run: print what would be sent, send nothing
git:
  platform: gitlab        # gitlab | github
  integration_branch: dev
  production_branch: main
```

Written by `jflow.py init-project`. Committed.

## The definition (`_jflow/prd/`, `apis/`, `db-schemas/`, `flows/`)

What the product is, its rules, what is built and why. Written for agents: tables with fixed
columns, stable IDs, no narrative. Its structure is English; its content is in the product language,
copied word for word from the specifications and the discovery. It **describes only what is built**:
in `dev`, everything documented exists. It has three parts:

| Part | Files |
|---|---|
| Product and business | `prd/index.md`, `prd/blocks/`, `prd/domain/`, `prd/parameters.md`, `prd/nfr.md`, `prd/out-of-scope.md` |
| Current state | `prd/architecture/`, `apis/`, `db-schemas/`, `flows/` |
| History | `prd/decisions.md` |

### Files

| File | Columns / content |
|---|---|
| `prd/index.md` | The product in 2–3 lines; `Actors` (`ID · Actor · Access · Access recovery · Origin`); `Surfaces` (`Surface · Platform · Actors · Viewports · Service · Origin`, platform `web`, `mobile-app` or `desktop-app`); `Documentation`, a fixed table of which file to load when |
| `prd/blocks/{PREFIX}.md` | One functional block: frontmatter (`prefix`, `name`, `surfaces`, `covers`, `entities`, `last_requirement`, `last_failure`); `Requirements` (`ID · Requirement · Actor · Origin`); `Failure conditions` (`ID · Condition · Result · Origin`); optional `Configurations` and `Examples`. The `NOT` block (notifications) uses `ID · Event · Channel · Recipient · Content · Origin` and adds `Not notified` |
| `prd/blocks/index.md` | Generated: `Prefix · Block · Surfaces · Covers · Last ID` |
| `prd/parameters.md` | `Parameter · Value · Variable · Origin`. A parameter is the value of a business rule, cited by its name in bold; `Variable` is the environment variable with its default (`BOOKING_HORIZON_DAYS=30`) |
| `prd/decisions.md` | `Product` and `Technical` (`ID · Topic · Decision · Rejected · Reason · Affects · Origin`); `Reverted` (`ID · Topic · Said · Reverted by · Reason · Now`). `Rejected` is what is not done; `Affects` is the loading key |
| `prd/nfr.md` | `ID · Category · Requirement · Target · Scope · Verification · Tested in · Origin`. `Verification`: `test` (in the requirement of `Tested in`: `base` or `#id`), `alert` (in the operations guide) or `review` (the verifier checks it) |
| `prd/out-of-scope.md` | `Out of scope · Origin`. Bringing an item in needs a decision |
| `prd/domain/{entity}.md` | One entity: frontmatter (`entity`, `tables`, `describes`); `Attributes` (`Attribute · Type · Required · Constraints · Personal data · Origin`); `Derived attributes`; `Relationships`; `Removal`; `States`; `Transitions` (`From · To · Triggered by · Origin`) |
| `prd/domain/index.md` | Generated: `Entity · File · Tables · Describes` |
| `prd/domain/glossary.md` | `Term · Definition · Origin` |
| `prd/domain/invariants.md` | `ID · Rule · Entities · Applied in · Origin` |
| `prd/architecture/services.md` | `Services` (`Service · Type · Language · Surfaces · Exposes · Folder · Origin`); `Modules` per service (`Module · Entities · Responsibility · Origin`); `Interactions` (`From → To · Purpose · Blocks · Origin`). Every entity has exactly one owner module |
| `prd/architecture/integration.md` | `Persistence and infrastructure`; `Communication`; `Events` (if there is a bus); `External integrations` (`ID · System · Direction · Data · When · Source of truth · Reference · Origin`) |
| `prd/architecture/auth.md` | `Credentials`, `Use`, `Roles`, `External identity providers`, in OAuth 2.0 / OIDC vocabulary |
| `prd/architecture/guarantees.md` | `ID · Guarantee · Rule · Mechanism · Where · Origin`. Every invariant has at least one guarantee |
| `prd/architecture/testing.md` | How the product is tested end to end: `Entry points` (`Entry point · Type · Service · Actors · How it is tested · Test · Origin`, one per surface and per exposed interface), `Test identities` (one per role), `External systems` (one per integration), `How to run them` |
| `apis/{service}.openapi.yaml` / `.asyncapi.yaml` | The contract, written only when the operation is built. OpenAPI 3.1+ or AsyncAPI 3; `info.version` semver; one tag per module plus `system`. Every operation has `x-requirements`, `x-origin`, `security` and `x-roles`; every error response has `x-failure`; every security scheme has `x-credential` |
| `db-schemas/{service}.md` | `Base`, `Schema decisions`, `Schema` (DBML, each table, column and enum value citing its origin in a note), `Constraints DBML does not express`, `Derived attributes`. The migrations implement it; identifiers are English |
| `flows/{flow}.md` | Frontmatter (`flow`, `requirements`, `modules`) and steps `# · From → To · What happens · Operation / table · Rules`, naming real operations and tables |
| `flows/index.md` | Generated: `Flow · Requirements · Modules` |

### IDs

| Element | ID | Defined in |
|---|---|---|
| Actor | `U-01` | `prd/index.md` |
| Block requirement | `CAN-03` (the block's prefix) | `prd/blocks/CAN.md` |
| Failure condition | `CAN-E1` | `prd/blocks/CAN.md` |
| Notification | `NOT-02` | `prd/blocks/NOT.md` |
| Invariant | `INV-02` | `prd/domain/invariants.md` |
| Guarantee | `GAR-04` | `prd/architecture/guarantees.md` |
| Credential | `CRED-01` | `prd/architecture/auth.md` |
| External integration | `INT-01` | `prd/architecture/integration.md` |
| NFR | `NFR-04` | `prd/nfr.md` |
| Product / technical decision | `DEC-07` / `DEC-T05` | `prd/decisions.md` |
| Local criterion of a requirement | `812-AC-01` | The specification in Jiku |
| Parameter | its name, in bold | `prd/parameters.md` |
| Entity | its name in the product language | `prd/domain/{entity}.md` |
| Module | `{service}.{module}` | `prd/architecture/services.md` |
| Operation | `operationId` | `apis/` |
| Jiku requirement | `#812` | Jiku |

IDs are never reused: a removed row's ID stays burned. New IDs come only from `jflow.py next-id`,
which also counts the IDs that open requirements in Jiku reserve.

**Origin.** Every row has an `Origin`: `initial` (written by the scaffold or the adoption) or the
Jiku requirement that added or last changed it (`#812`). Contracts carry it as `x-origin`.

### Who writes what

| Document | Created by | Changed by |
|---|---|---|
| Product level (index, glossary, NFRs, out of scope, decisions of no block), services, persistence and communication, the shared part of each schema, `testing.md` | `/jflow-product-scaffold` (`jflow.py def-base`) | `/jflow-build` |
| Blocks, entities, invariants, guarantees, parameters, modules, integrations, credentials, tables, flows, contracts | `/jflow-build`, applying the specification of the requirement that builds them | `/jflow-build` |
| Everything, for an existing product | `/jflow-product-brownfield`, from the code | `/jflow-build` |
| Generated indexes | `jflow.py def-index` | `jflow.py def-index` |
| `discovery/` | `/jflow-product-discover` | Nobody: frozen |

`/jflow-spec` and `/jflow-fix` never change the definition. `jflow.py def-check` checks it after every
change.

## The specification (in Jiku)

The specification of a requirement lives in three fields of the Jiku requirement, in markdown, so the
team and the client read it where they manage the work. Nothing of it is stored in the repository. It
is functional plus the key technical detail, never code.

| Jiku field | Section | Contains |
|---|---|---|
| `scope` | Scope | `Includes`, `Excludes`, `Depends on` (the `#id`s that must be merged in `dev` before building this one, or «Nothing.») |
| `technicalSolution` | Proposal | The solution in business terms; `Parameters` (`Change · Parameter · Value · Variable`); `Decisions` (`Type · ID · Topic · Decision · Rejected · Reason · Affects`, type `new`, `reverts` or `keeps`); `Technical detail`: only the subsections that change — `Blocks`, `Data`, `Invariants and guarantees`, `Schema`, `Interface`, `Flows`, `Glossary`, `Architecture`, `Visual reference` |
| `acceptanceCriteria` | Acceptance criteria | `Change · ID · Criterion`, with `add`, `modify` (the full new text) or `remove` |

Example of acceptance criteria (product language English):

```markdown
| Change | ID | Criterion |
|---|---|---|
| modify | CAN-01 | Cancel the appointment from the email link until the **cancellation margin after start** has passed |
| add | CAN-E4 | The configured margin is not lower than the **no-show window** → api does not start |
| add | 812-AC-01 | Cancellations pending at deploy time follow the new rule |
```

- A criterion's `ID` is a definition ID (requirement, failure condition, invariant, guarantee, NFR)
  or a local criterion `{id}-AC-NN`, only for what is not product definition.
- The `Criterion` is the row as it will read in the definition, copied there word for word. A failure
  condition is `condition → result`.
- Every criterion has at least one test whose name carries the ID in brackets: `[CAN-E4] …`.
- **Visual reference**, when the requirement comes with a design: `Package: {path in the repo}`, a
  table `Screen · Reference · Route · State`, and the closed list `Decided difference · Screens ·
  Decision`. Everything not listed must look as the reference does.
- After `/jflow-build`, a line «Decided in the implementation: A, B.» below the criteria marks the
  criteria the implementation added (only small things).

**Draft or ready.** The last line of the requirement's description says whether it can be built:
«Specification: draft» (written by `plan-push`, generated from the discovery and not yet reviewed
against what is built) or «Specification: ready ({date})» (written by `spec push`). In Spanish,
«Especificación: borrador» / «Especificación: lista ({fecha})». `/jflow-build` does not start on
anything but ready. A requirement created by hand has no line until it is specified.

**States** are Jiku's: `analisis` (arrived), `planificacion` (to specify, or specified and waiting for
approval), `en_cola` (approved), `desarrollo` (implementation, verification, MR and human review,
until the merge), `revision` (in production, being watched), `resuelto`, `cancelado`. The plan's
requirements are created in `planificacion`; after that the agent moves a requirement only to
`desarrollo` (when it starts building, or when the user confirms reopening it). Every other move is a
person's.

**Types** are Jiku's: `funcionalidad` and `mejora` are specified and built; an `incidencia` or a small
`mejora` goes through `/jflow-fix`; `otro`.

## The discovery (`_jflow/discovery/`)

The analysis of a new product, written with the user by `/jflow-product-discover`, decision-complete,
in the product language (structure in Spanish for a Spanish product, in English otherwise):

| Document | Contains |
|---|---|
| `functional-analysis.md` | Summary, actors, surfaces, functional blocks with requirements and failure conditions, notifications, parameters, external integrations, NFRs, out of scope, decisions taken |
| `domain-analysis.md` | Glossary, entities, states, invariants |
| `technical-analysis.md` | Services, modules, persistence and infrastructure, communication, authentication and authorization, guarantees, key flows, technical decisions |
| `db-schema-{service}.md` | One per service that owns a database: DBML, constraints DBML does not express, derived attributes |

Each has a frontmatter with `status` (`in-progress` → `closed`). Once the plan is created it is
history: it is never edited again, and changes go through Jiku requirements.

## Documents for people

In the product language, from the templates in `.claude/templates/{es,en}/`.

| Document | What it is | Kept by |
|---|---|---|
| `README.md` | What the product is and for whom; how to start it and the URL of each surface, the API and the local tools; local setup (the `.env` values and how to obtain them); the main `make` commands; where the documentation is | Created by the scaffold or the adoption (`init-project` copies the template); updated by every requirement that changes a command, URL, surface or setup step |
| Operations guide (`docs/operacion.md` / `docs/operations.md`) | Health of each service, background processes, configuration variables, observability, recommended alerts from the NFRs, CI secrets, downloadable builds, deployment | Every requirement that adds a service, process, integration or alert |
| Integration guide (`docs/integracion.md` / `docs/integration.md`) | Only with external integrators: how to authenticate, which operations to use, how versions change, linking to `_jflow/apis/` | Every requirement that changes an operation integrators use |
| Adoption report (`docs/adopcion.md` / `docs/adoption.md`) | Only in an adopted product: suspected bugs, behaviors to confirm, jiku flow defaults the product does not follow (with the effort to adopt them), other suggested improvements, what was recorded in Jiku | Nobody: a record of the adoption day |
| `CHANGELOG.md` | Keep a Changelog, with `[Unreleased]` (`[Sin publicar]`) on top and each entry citing its requirement (`#812`) | `/jflow-release` (`jflow.py changelog`) |

`docs/` never repeats the definition. `jflow.py def-check` fails if `README.md` or the operations
guide is missing or has unfilled markers.

## Documents for agents

| Document | Contains |
|---|---|
| `AGENTS.md` (root) | What the product is and where its definition lives; the `make` targets; the workflow (requirements, branches, specifications, evidence, what never to do); where things are |
| `services/{service}/AGENTS.md` | `Stack` (`Concern · Choice · Version · Why`), commands, structure, canonical examples, recurring errors |
| `CLAUDE.md` (next to each `AGENTS.md`) | Only `@AGENTS.md`, so Claude Code loads it in that folder |

Always English, always true: a change to a command, service or practice updates them in the same
branch.

## Reports

| Path | Contains |
|---|---|
| `reports/junit/{service}-{level}.xml` | JUnit XML of each service and test level, written by `make test`; `jflow.py evidence` reads them |
| `reports/screenshots/{id}/` | Screenshots of every screen a requirement touches, at two sizes |
| `reports/screenshots/{id}/pairs/` | Each screen of the visual reference next to its screenshot, whole and by zones (`visual-pairs`) |

Git-ignored. The evidence itself goes to the MR description and, in business terms, to the Jiku
comment.

## jiku flow's own files in `.claude/`

| Path | Contains |
|---|---|
| `skills/jflow-*/SKILL.md` | The [skills](skills.md) |
| `agents/jflow-verifier-agent.md` | The verifier |
| `specs/` | What the agent reads: `product-definition`, `requirement`, `jiku`, `engineering`, `database`, `discovery`, `functional-analysis`, `language` |
| `templates/` | Discovery templates, `AGENTS.md`, `service-AGENTS.md`; for people, by language, `es/` and `en/` (`base-requirement.md`, `README.md`, the operations guide, the adoption report) |
| `scripts/` | `jflow.py` and `jflowlib/`, `check-discovery.py`, `migrate.sh`, `framework-update.sh` |
| `hooks/` | Pre-compact and session-resume hooks, so a long skill resumes after a context compaction |
| `migrations/` | Migrations between versions of jiku flow |
| `METHODOLOGY.md`, `VERSION`, `CHANGELOG.md` | The methodology in one page; the version; jiku flow's changes |
| `settings.json`, `CLAUDE.md` | Shared with the user: jiku flow manages only its own entries and its own marked block |
| `.jflow-manifest` | Added by the installation: every file of jiku flow with its hash at install time, so an update knows what the user modified |
| `.jflow-version` | Added by the installation: the installed version, which migrations start from |
