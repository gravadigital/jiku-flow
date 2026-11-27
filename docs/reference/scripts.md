# `jflow.py` commands

```bash
python3 .claude/scripts/jflow.py [--root ROOT] <command> [options]
```

`jflow.py` is the deterministic half of jiku flow: everything that can be computed instead of judged
(reading the discovery, building the plan, indexing and checking the definition, allocating IDs,
loading context, reading and writing specifications in Jiku, branches, evidence, MR text, release,
status) lives here, and the skills call it. It uses only the Python standard library. Run it from the
repository root; `--root` points it at another repository. `-h` after any command prints its options.

What the commands print is always English. What they write for people (Jiku fields, the CHANGELOG,
the plan's drafts) follows the product language: see [Language](language.md).

On this page: [Discovery and plan](#discovery-and-plan) · [Definition](#definition) ·
[Specification](#specification) · [Git](#git) · [Tests and evidence](#tests-and-evidence) ·
[Release](#release) · [Project and status](#project-and-status) · [Jiku](#jiku) ·
[Install](#install) · [Language](#language) · [Other scripts](#other-scripts) ·
[Working folder](#the-working-folder)

## Discovery and plan

Used by [`/jflow-product-discover`](skills.md#jflow-product-discover) and
[`/jflow-product-scaffold`](skills.md#jflow-product-scaffold).

| Command | What it does |
|---|---|
| `discovery-check [--final]` | Mechanical check of `_jflow/discovery/`: structure of each document, required sections, every decision with its reason, no pending markers in a closed document. `--final` adds the cross-document checks run before the last schema closes |
| `plan-blocks` | Lists the blocks of the discovery with their entities, the blocks they cite and their surfaces: the input for proposing the parts of the initial plan |
| `plan-build --plan FILE [--force]` | Writes one requirement draft per part of the plan, plus the base product (from `.claude/templates/{es,en}/base-requirement.md`), to `plan/` in the working folder. Puts every piece of the discovery in the first part where everything it cites exists, computes the dependencies, and warns about every row moved to a later part than its block's. It refuses to overwrite drafts edited by hand after it wrote them; `--force` regenerates them and loses those edits |
| `plan-check` | Checks the drafts. `P1`: a part cites something a later part adds |
| `plan-push --product NAME [--preview]` | Creates the plan in Jiku: the base first, then every part in order, in `planificacion`, public, titled with their order (`0 · Base product` / `0 · Producto base`, `1 · …`), with «Depends on» pointing to the real ids and the draft line at the end of the description. It reads the project first and never creates a part twice (an open requirement with the same title counts as created); it resumes where it stopped. `--preview` only lists each requirement with its action («create» or «already in Jiku») |
| `def-base [--plan FILE] [--force]` | Writes the product-level definition of the base from the discovery: index (actors, surfaces), glossary, NFRs, out of scope, the decisions and parameters that belong to no block (`--plan` distributes them), services, persistence and communication, the shared part of each schema, and `architecture/testing.md` with a row per entry point. Leaves `{{fill: …}}` markers for what needs judgment |

The plan file (`plan.json`):

```json
{"parts": [{"title": "Panel access", "blocks": ["ACC"], "auth": true, "entities": ["Administrator account"]}]}
```

`auth: true` marks the part that builds authentication; `entities` fixes which entities a part
creates when matching by name is ambiguous.

## Definition

Used by every skill that builds; see [Documents](documents.md) for what they check.

| Command | What it does |
|---|---|
| `def-index` | Regenerates the generated indexes: `prd/blocks/index.md`, `prd/domain/index.md`, `flows/index.md`. Never edit them by hand |
| `def-check` | Consistency of the definition, the contracts and the guides: every cited ID exists; bold parameters exist; every entity has exactly one owner module; every invariant has a guarantee; `last_requirement`/`last_failure` up to date; indexes current; every `Origin` valid; contract extensions (`x-requirements`, `x-origin`, `x-failure`, also on shared responses); flows; `testing.md` complete (`T1` entry points, `T2` roles, `T3` external integrations); no `{{…}}` marker left; `README.md` and the operations guide present (`H1`) and with no unfilled marker (`H2`) |
| `def-testing [--origin ORIGIN]` | Creates or completes `_jflow/prd/architecture/testing.md`: adds a row, with `{{fill}}` markers, for every surface, exposed interface, role and external integration that does not say yet how it is tested end to end. `--origin` sets the `Origin` of the new rows (`initial` or `#id`) |
| `next-id KIND [--count N] [--requirement ID] [--offline]` | The next free IDs of a kind: `CAN` (a block's requirement, by its prefix), `CAN-E` (failure condition), `INV`, `GAR`, `DEC`, `DEC-T`, `NFR`, `INT`, `CRED`, `U`, `{id}-AC` (local criterion). Looks at the definition and at every open requirement in Jiku, which reserve the IDs they add. `--requirement` is the requirement being specified (its own IDs are not reserved against it). `--offline` skips Jiku and does not guarantee the ID is free. Without Jiku and without `--offline`, it stops |
| `load [--block P] [--id ID] [--entity NAME] [--module svc.mod] [--requirement ID] [--source jiku\|draft] [--overview]` | Assembles the definition context of a task with only what it touches (every option repeatable): the index, the blocks, their decisions (by `Affects`), glossary, the parameters they name, their entities, the invariants and guarantees of those, the NFRs of their surfaces and services, the interactions and flows that cite them, and the contract operations that cite them. `--requirement` takes the keys from a specification (in Jiku, or the local draft with `--source draft`). `--overview` gives the index, blocks, domain and services. It lists the files it read |

## Specification

`spec {draft|check|push|show|diff|order|amend} ID [--source jiku|draft] [--implement] [--offline] [--dry]`.
The format they read and write is the [Requirement Spec](../../.claude/specs/requirement.md).

| Command | What it does |
|---|---|
| `spec draft ID` | Creates the local draft of the specification in the working folder (`spec-{id}.md`), from what the requirement already has in Jiku, or empty; or says it is resuming an existing draft. Prints its path |
| `spec check ID [--source draft] [--implement] [--offline]` | Checks the specification (`S1`–`S19`, listed below). `--source draft` checks the local draft instead of Jiku. `--implement` adds what must hold to build it: dependencies merged in `dev`, kept decisions still in force (`S9`), the «ready» line (`S18`) |
| `spec order ID [--source draft]` | Where the requirement stands: each dependency (`MERGED`, `PENDING`, `CANCELLED`) and the open requirements that depend on it, with the IDs they cite that this one modifies, removes or reverts. The last line, `order: …`, is what `/jflow-build` stops on |
| `spec push ID` | Writes the draft to Jiku (scope, proposal, acceptance criteria), sets the line «Specification: ready ({date})» at the end of the description, and deletes the draft. Refuses if the specification changed in Jiku since the draft started. Never changes the state |
| `spec show ID` | Prints the specification Jiku has |
| `spec diff ID` | What is left to do on the current branch: the specification against the branch's definition and tests (criteria new, changed or extra; decisions; parameters), and the definition of `dev` against the branch's (a decision that changed without being reverted, a row that changed without a criterion, an out-of-scope row removed without its decision) |
| `spec amend ID [--dry]` | Appends to the criteria in Jiku the IDs `/jflow-build` decided (from `decided-{id}.md`, with the text of the branch's definition), under «Decided in the implementation: …». Touches nothing else. `--dry` only shows them |

The checks of `spec check`:

| Code | Checks |
|---|---|
| `S1` | The three fields have content |
| `S2` | Every criterion row can be read |
| `S3` | `Change` valid; every ID is a definition ID or `{id}-AC-NN`; every criterion has text |
| `S4` | `modify`/`remove` on an ID that exists (or a dependency adds); `add` on a free ID |
| `S5` | No ID it adds is added by another open requirement |
| `S6` | Decision types; `new` and `reverts` have a reason; `keeps`/`reverts` cite an existing decision |
| `S7` | Parameters' `Change` |
| `S8` | No `{{…}}` marker left |
| `S9` | (`--implement`) Every dependency is merged in `dev`; no `keeps` decision was reverted since |
| `S10` | Every cited ID exists, is added by this specification, or by a dependency |
| `S11` | The criterion of an invariant or guarantee says exactly what its row says |
| `S12` | Every invariant or guarantee added or modified is a criterion |
| `S13` | A parameter that changes value is not still stated with its old value by an untouched decision or row |
| `S14` | A parameter is modified/removed only if it exists, added only if it does not |
| `S15` | `keeps`/`reverts` only on decisions; a decision, credential or actor is never a criterion |
| `S16` | Bringing in an item of «Out of scope» needs the decision that brings it in |
| `S17` | An «Excludes» line that leaves something for another requirement names it (`#id`) |
| `S18` | (`--implement`) The description says «Specification: ready» |
| `S19` | Every NFR row of the base says how it is verified (`test` with `Tested in`, `alert`, `review`) |

## Git

| Command | What it does |
|---|---|
| `branches [--push]` | Makes sure `main` and `dev` exist (in an empty repository, with a first commit) and leaves the copy on `dev`. With `--push`: also checks nothing is left uncommitted and pushes both if there is a remote |
| `git-check --mode implement\|base\|read` | Where the working copy stands before a skill starts. Prints one of `OK`, `BEHIND`, `DIRTY`, `OTHER_BRANCH`, `NO_REMOTE`, `NO_DEV`, and, in `base` mode, `DEV_HAS_MORE` (`dev` has files besides the discovery and jiku flow). `read` does not report `DIRTY`. Each skill decides what each result means (see [Skills](skills.md)) |
| `branch ID SLUG [--kind feat\|fix]` | Creates the requirement's branch from `dev` (`feat/{id}-{slug}` or `fix/{id}-{slug}`), resumes it if it is open, or creates `-2`, `-3`… if it was already merged (a reopened requirement). Prints `new`, `resumed` or `new (reopened N)` |

## Tests and evidence

| Command | What it does |
|---|---|
| `coverage [ID] [--all] [--ids A,B]` | Which IDs have a test that names them in brackets (`[CAN-E1] …`), scanning the tests of the repository. With an id: the criteria of its specification. `--all`: every ID of the definition that must have a test. `--ids`: a given list |
| `evidence [ID] [--ids A,B] [--dry]` | Criterion → test → result, computed from the JUnit reports in `reports/junit/`. Saves it to `evidence-{id}.md` in the working folder for the MR text; `--dry` does not save. `--ids` for a change without a specification |
| `visual-pairs ID [--source jiku\|draft]` | When the specification has a «Visual reference»: puts each screen of the design package next to its screenshot, whole and by zones, in `reports/screenshots/{id}/pairs/`, and lists the decided differences. Prints `MISSING` for a reference or screenshot that is not there. If Jiku does not answer, it uses the last copy from `jiku fetch` and says so |
| `mr-text ID [--verdict FILE]` | Writes the MR/PR description (`mr-{id}.md` in the working folder): scope, evidence, new and reverted decisions, the definition files changed, what was decided and corrected in the implementation, what was recorded out of scope, and the verifier's verdict |

## Release

Used by [`/jflow-release`](skills.md#jflow-release).

| Command | What it does |
|---|---|
| `release-info` | The requirements in `dev` that `main` does not have (from commits with `(#id)`), the suggested version and why, and the open incidencias. Suggestion: MAJOR when a contract's `info.version` major grew; MINOR when there is a `funcionalidad` (or it is the first version, `0.1.0`); PATCH otherwise |
| `changelog VERSION [--ids A,B] [--known-issues] [--dry]` | Adds the version's section below `[Unreleased]` (`[Sin publicar]`) of `CHANGELOG.md`, with headings in the product language: moves there the hand-written entries that cite a released requirement and writes the rest from the Jiku titles (without the plan's order prefix). `--ids` overrides the requirements; `--known-issues` adds the open incidencias as «Known issues»; `--dry` prints without writing |

## Project and status

| Command | What it does |
|---|---|
| `init-project --project-id N [--instance dev\|prod] [--platform gitlab\|github] [--language CODE] [--dry-run-jiku]` | Creates `_jflow/project.yaml` (Jiku project and instance, git platform and branches, product language), the `.gitignore` entries, and, when missing, `AGENTS.md` and `CLAUDE.md` (English), `README.md` and the operations guide (from the templates of the product language). `--language` defaults to `es`. `--dry-run-jiku` writes `writes: false` |
| `conformance` | Mechanical deviations of the repository from jiku flow: each check marked `minimum` (the adoption minimum, M1–M9) or `default` (followed from then on). Includes that `testing.md` exists and that `make test-e2e` of each service with an entry runs a test rather than printing a message |
| `status [--offline]` | The product's stage (not defined · discovery in progress · discovery closed, no base · base built) and the open requirements grouped by next action, crossed with git: open issues, drafts to specify, to specify, specified waiting for approval, to implement, queued waiting for another requirement, in implementation, merged not released, released not moved to review, in review, to release, inconsistencies. `--offline`: only git |
| `out-of-scope ID --title T (--description D \| --file F) [--type funcionalidad\|mejora\|incidencia\|otro] [--to N] [--skill S]` | Records in Jiku something seen outside the scope of requirement `ID`: a new requirement (an `incidencia` by default; internal, in `analisis`, with `Origin: #{id} ({skill})` in its description) or, with `--to N`, a comment on the requirement that already covers it. It also notes it for the MR and the closing comment |
| `out-of-scope ID --list` | What was recorded out of scope for that requirement |
| `workdir` | Prints the [working folder](#the-working-folder) of the repository |

## Jiku

`jiku {fetch|state|comment|task|new|list} [ID] [VALUE] [options]`. Every call goes through the
configuration file of the project's instance (`~/.config/jiku/config.{instance}.yaml`), marks the
write as done by an agent, prints the method and payload, and logs it to `jiku-log.jsonl` in the
working folder. See [Jiku spec](../../.claude/specs/jiku.md).

| Command | What it does |
|---|---|
| `jiku fetch ID` | Reads the whole requirement (description, every comment with its author, attachments, specification) and writes a copy, `jiku-{id}.md`, to the working folder. Prints its path |
| `jiku state ID planificacion\|desarrollo` | Changes the state. The agent may set only these two; every other state is a person's decision |
| `jiku comment ID (--file F \| TEXT)` | An internal comment |
| `jiku task ID --title T [--description D]` | A task under the requirement (area development, active, the person of the token as responsible) |
| `jiku new --title T [--description D] [--type T] [--state S] [--visibility internal\|public]` | A new requirement in the project. Defaults: type `funcionalidad`, state `analisis`, visibility `internal` |
| `jiku list` | The requirements of the project |

**Dry-run.** `writes: false` in `_jflow/project.yaml`, or `JFLOW_JIKU_DRY_RUN=1` for one run: writes
are printed, not sent. Reads always go to Jiku.

## Install

| Command | What it does |
|---|---|
| `install [--keep FILE …] [--dry] [--verbose]` | Installs or updates jiku flow into the `.claude/` of `--root`. Run it from the downloaded copy (that is what `install.sh` and `/jflow-framework-update` do), so an update follows the new version's rules. Only jiku flow's files change: it records them, with their hash, in `.claude/.jflow-manifest`, merges its own permissions and hooks into `settings.json` and its own block into `.claude/CLAUDE.md`, and never touches the user's files. A file the user modified is replaced (theirs saved as `.bkp`) unless listed in `--keep` (then the new one is saved as `.new`). `--dry` only shows what would change, by kind (`NEW`, `UPDATE`, `MODIFIED`, `CLASH`, `REMOVE`, `KEEP_REMOVED`) |

## Language

| Command | What it does |
|---|---|
| `lang-terms [--grep TEXT]` | The structural names of the documents people read, in English and Spanish (from `jflowlib/lang.py`), and the product language in effect. `--grep` filters them. See [Language](language.md) |

## Other scripts

| Script | What it does |
|---|---|
| `.claude/scripts/check-discovery.py` | The discovery checker that `discovery-check` runs |
| `.claude/scripts/framework-update.sh {check-version\|fetch-remote [vX.Y.Z]\|compare\|changelog\|detect-changes\|backup\|update [--keep …]\|migrate\|verify\|cleanup}` | The mechanical steps of [`/jflow-framework-update`](skills.md#jflow-framework-update): download a version, compare it with `.claude/.jflow-version`, show its CHANGELOG, detect local changes, back up `.claude/` to the system's temp folder, install, run migrations, verify |
| `.claude/scripts/migrate.sh` | Runs the script migrations between the installed version and the new one, updates `.claude/.jflow-version`, and lists the agent migrations in `.claude/agent-migrations-pending.md`. See [contributing/migrations.md](../../contributing/migrations.md) |

## The working folder

`jflow.py workdir` prints it: `{system temp}/jflow/{repo}-{hash}`, one per repository, outside the
repository and lost on reboot by design. It holds what a run needs but the repository must not keep:

| File | Written by |
|---|---|
| `jiku-{id}.md` | `jiku fetch`: the copy of the requirement the agent reads |
| `spec-{id}.md` | `spec draft`: the draft of a specification, until `spec push` |
| `plan.json`, `plan/` | `/jflow-product-discover` and `plan-build`: the plan and its drafts |
| `evidence-{id}.md` | `evidence` |
| `decided-{id}.md`, `corrected-{id}.md` | `/jflow-build` and `/jflow-fix`: what the implementation decided and corrected on the way |
| `out-of-scope-{id}.md` | `out-of-scope` |
| `verdict-{id}.md` | The skill, with the verifier's approved verdict |
| `mr-{id}.md` | `mr-text` (`/jflow-fix` writes `mr-{id}-{slug}.md`) |
| `jiku-comment-{id}.md` | The skill, before `jiku comment` |
| `baseline.md`, `corrections.md`, `answers.md` | `/jflow-product-brownfield` |
| `jiku-log.jsonl` | Every write to Jiku, sent or dry-run |
