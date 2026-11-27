# Skills and subagent

jiku flow is nine skills and one subagent, installed in `.claude/`. Each skill is a `SKILL.md` in
`.claude/skills/{name}/`; the subagent is `.claude/agents/jflow-verifier-agent.md`. For when to use
each one, see the [guides](../guides/README.md); this page is what each one does, asks, reads and
writes.

| Skill | Arguments | Mode | Writes in the repository | Writes in Jiku |
|---|---|---|---|---|
| [`/jflow-product-discover`](#jflow-product-discover) | `[brief …]` | Interactive | `_jflow/project.yaml`, `_jflow/discovery/`, on `dev` | The base requirement and one per part of the plan, as drafts, in Planificación |
| [`/jflow-product-scaffold`](#jflow-product-scaffold) | `{id}` | Technical questions first, then autonomous | Skeleton, definition of the base, guides; branch `feat/{id}-base-product` | Specification of the base (ready); Desarrollo; closing comment; what is seen out of scope |
| [`/jflow-product-brownfield`](#jflow-product-brownfield) | `[id]` | Autonomous, with one round of questions | The repository brought to the minimum, the definition of what exists, guides, adoption report; branch `feat/{id}-adoption` | The adoption requirement (if missing), one incidencia per security bug, closing comment |
| [`/jflow-spec`](#jflow-spec) | `{id} [text]` | Interactive | Nothing | Scope, proposal, criteria, the ready line; Desarrollo when reopening; what is postponed, if the user agrees |
| [`/jflow-build`](#jflow-build) | `{id}` | Autonomous, after the start checks and one round for large gaps | Code, tests, definition, contracts, guides; branch `feat/{id}-{slug}` | Desarrollo; answers to large gaps in the specification; decided criteria; closing comment; what is seen out of scope |
| [`/jflow-fix`](#jflow-fix) | `{id} {what}` | Autonomous | Code and tests; branch `fix/{id}-{slug}` | A task; Desarrollo if the user agrees; closing comment; what is seen out of scope |
| [`/jflow-status`](#jflow-status) | — | Read-only | Nothing | Nothing |
| [`/jflow-release`](#jflow-release) | — | One confirmation | `CHANGELOG.md` on `dev`; merge to `main`, tag | A comment on every released requirement; an incidencia if the regression fails |
| [`/jflow-framework-update`](#jflow-framework-update) | — | Asks only about local changes | `.claude/` (not committed) | Nothing |

## Common rules

- **Language.** Every skill talks to the user in the language the user writes in, writes what people
  of the product read in the product language, and writes git, code and agent documents in English.
  See [Language](language.md).
- **Start checks.** Every skill that works on a requirement runs `jflow.py git-check` and reads the
  requirement from Jiku (`jflow.py jiku fetch`) first. When the branch or the Jiku state is not the
  expected one it warns and asks (the user is responsible), stops when continuing would do damage
  (`BEHIND`, `DIRTY`), and aborts on a `cancelado` requirement.
- **Deterministic work through `jflow.py`.** IDs, indexes, checks, evidence, branches and every read
  or write to Jiku go through the [script](scripts.md), never by hand.
- **Done means verified.** The skills that build (`/jflow-product-scaffold`, `/jflow-build`,
  `/jflow-fix`, `/jflow-product-brownfield`) finish only when the [verifier](#jflow-verifier-agent)
  approves.
- **The agent never** approves, prioritizes, merges, deploys, or moves a requirement to En cola,
  Revisión, Resuelto or Cancelado. It opens no MR/PR: it pushes the branch and leaves the
  description in the working folder.
- **What is seen out of scope goes to Jiku, not into the branch.** See
  [What is seen out of scope](#what-is-seen-out-of-scope).

Expected Jiku state at the start:

| Skill | Expected | Otherwise |
|---|---|---|
| `/jflow-spec` | `planificacion` | `analisis`, `en_cola`, `desarrollo`: warn and ask. `revision`, `resuelto`: warn that it will be reopened and, on confirmation, move it to `desarrollo` |
| `/jflow-build` | `en_cola` | Warn and ask (`desarrollo` may be a resumption or a reopening) |
| `/jflow-fix` | `desarrollo` | Offer to move it to `desarrollo`; continue either way |
| `/jflow-product-scaffold` | `en_cola` or `planificacion` | Warn and ask |
| `/jflow-product-brownfield` | — | Moves the adoption requirement to `desarrollo` |

---

## `/jflow-product-discover`

Defines a new product with the user and plans it. The only step where the user participates
heavily. Follows the [Discovery spec](../../.claude/specs/discovery.md).

1. **Link.** Without `_jflow/project.yaml`, asks for the Jiku project id (a person creates the
   project), the instance (`prod`, or `dev` for tests) and the product language (Spanish by
   default), runs `init-project`, checks the link with `jiku list`, and runs `branches` so that
   `main` and `dev` exist. Works on `dev`.
2. **Brief.** Reads every brief given as an argument (or found in `docs/*.md`), or starts from scratch.
3. **Discovery,** document by document, each one closed before the next:
   `functional-analysis.md` → `domain-analysis.md` → `technical-analysis.md` →
   `db-schema-{service}.md` (one per service that owns a database). Each section is written to the
   file, reviewed there and confirmed alone; the database schema is reviewed whole. A gap that adds
   a rule is always asked; only wording and direct consequences are proposed, as listed assumptions
   (at most five per section). Every decision has a reason, marked `(proposed)` when the agent
   drafted it and `Not given by the user` when there is none. The language of each service and the
   CI platform are always asked; libraries are not. The session can stop and resume: the document is
   the memory.
4. **Final verification:** `discovery-check --final` and a read of every document together.
5. **The plan.** `plan-blocks`, then the agent proposes parts (one or more blocks, one requirement
   and one MR each) in build order; `plan-build` places every piece in the first part where what it
   cites exists. The user decides the parts, their order and titles, and whether an earlier part needs
   a reduced version of a row moved later.
6. **Jiku.** Resolves the drafts' markers, runs `plan-check`, shows `plan-push --preview`, and on
   approval creates the base and every part in Jiku as drafts («Specification: draft»).
7. **Close.** Commits the discovery on `dev` and runs `branches --push`.

Aborts if `_jflow/prd/` exists: the discovery is frozen once the product is built. Does not create
the definition, contracts or code, choose libraries, or define UX.

**Next:** `/jflow-product-scaffold {base id}`.

## `/jflow-product-scaffold`

Specifies and builds the base product («0 · Base product») from the closed discovery.

1. **Checks.** `git-check --mode base` (`DEV_HAS_MORE` asks), `discovery-check --final`, the base
   requirement in Jiku. A branch `feat/{id}-base-product` that exists means a resumed run: it
   continues at the first step whose result is missing.
2. **Technical specification (the only step that asks).** From the draft in Jiku, sweeps what the
   discovery cannot know and asks it grouped, each with a recommendation: how each surface is tested
   end to end and what CI builds, by platform (`web`, `mobile-app`, `desktop-app`); how each entry
   enters as its actor, how each role gets a test identity, how each external system is replaced;
   how each NFR is verified (`test` with `Tested in`, `alert`, `review`); whether the tools exist
   where they will run; CI secrets; shared infrastructure. The user reviews the whole draft once;
   `spec check`, `spec push`, `branch {id} base-product`, `jiku state … desarrollo`.
3. **Definition of the base:** `def-base`, then resolves its markers from the discovery only;
   `def-index`, `def-check`.
4. **Stack.** For each service (language fixed by the discovery), researches the official
   documentation and release notes now and records the choices in the service's `AGENTS.md`.
5. **Skeleton.** Per service: configuration validated from environment variables, OpenTelemetry,
   health endpoints, RFC 9457 errors, graceful shutdown, database and migrations setup, empty modules,
   one minimal page per surface; tests at every level with JUnit output and one end-to-end test per
   entry; the fake issuer and replacements of external systems; the contract with the system
   operations; Dockerfiles, Compose, Makefiles, CI; `.env.example`; `AGENTS.md`/`CLAUDE.md`;
   `README.md`, the operations guide and `CHANGELOG.md` in the product language. No functional block.
6. **Prove, verify, close:** `make check`, `coverage`, `evidence`, `def-check`, the end-to-end
   suite; the verifier until it approves; push, `mr-text`, the Jiku comment.

**Next:** merge the MR, then for each part, in order, `/jflow-spec` and `/jflow-build`.

## `/jflow-product-brownfield`

Adopts a product that already has code, and leaves it ready to specify and implement. Ends only with
the product ready.

1. **Check and link.** `git-check --mode implement`; `init-project` if there is no link (asks project,
   instance, language); creates the adoption requirement if no id is given; `branch {id} adoption`.
   Aborts if `_jflow/prd/` exists, except when resuming its own branch.
2. **Survey and baseline.** One subagent per service surveys the code (stack, modules, entities,
   schema, operations, processes, integrations, auth, tests, configuration, paths that point to it,
   observability, deviations from the defaults, suspected bugs). Meanwhile, the agent runs the
   repository's own commands before changing anything and writes `baseline.md`.
3. **One round of questions:** values only the user has (written to `.env.example`, filled by the
   user in `.env`, never in the chat); identities or systems that cannot be faked for end-to-end
   tests; behaviors that may be on purpose or a mistake («On purpose» / «It is a mistake» /
   «I don't know»), with security ones asked apart, stating the risk.
4. **The minimum** of [Engineering](../../.claude/specs/engineering.md) (M1–M9), checked with
   `conformance`: services in `services/` (with `git mv`, every reference updated), Makefiles, `.env.example`,
   Compose with the schema built by migrations from empty, tests with JUnit, CI through `make`, and
   one end-to-end test per entry against `make up`. Product logic is not changed, except to make an
   existing failing test pass.
5. **Definition of what exists,** every row `Origin: initial`; decisions only with evidence of
   intent; `def-testing`, `def-index`, `def-check`.
6. **Guides and the adoption report** (`docs/adopcion.md` or `docs/adoption.md`): suspected bugs,
   behaviors to confirm, defaults not followed with their effort, other improvements, what was
   recorded in Jiku.
7. **Verify** with no round limit, until approved. After the round of questions it asks only what
   blocks the product being ready; «Stop the adoption» commits what is done, and running the skill
   again with the id resumes on the branch.
8. **Close:** one incidencia per security bug in Jiku, the report updated with their ids, push, the
   comment, the MR text.

Only security bugs go to Jiku; everything else goes to the report.

## `/jflow-spec`

Specifies a Jiku requirement with the user, or changes an existing specification. The agent is a
critical partner, not a scribe. The repository is read-only here.

1. **Load.** `jiku fetch` (every comment and attachment), the state check, `spec order` (a pending
   dependency is a warning; a cancelled one is a conflict), `spec draft`.
2. **Locate** the request in the product: `load --overview` and what it touches, `out-of-scope.md`,
   the discovery and the open requirements for what is not built yet, the contracts when an
   interface changes.
3. **Analyze:** what contradicts, overlaps, is out of scope, breaks a contract, needs a decision, is
   left open, hides scope, disagrees with what the requirement already says, or drops something the
   product shows or does today (checked on the code of each screen the request changes).
4. **Decide with the user**, recommendation first: scope and proposal; every rule, failure condition,
   decision and technical detail; the failure checklist of the discovery; a sweep of everything
   `/jflow-build` would have to stop for (business rules and limits, effect on what is in
   progress, security and permissions, stored values, time, concurrency, platform). NFRs this
   requirement proves become local criteria. Engineering defaults the scope triggers come in without
   asking. A design the product must look like becomes a «Visual reference».
5. **Criteria:** every requirement, failure condition, invariant and guarantee added or modified, with
   IDs from `next-id`; local `{id}-AC-NN` only for what is not definition.
6. **Review once.** With `spec check` clean and the dependents seen (`spec order --source draft`), the
   user reads the whole draft (the agent gives its absolute path and a summary: scope, rules and
   decisions, criteria, assumptions, defaults that came in, out of scope, dependents). That review is
   the approval: `spec push` writes it to Jiku with the line «Specification: ready ({date})».

Does not touch the repository, write code, or approve the requirement.

**Next:** a person approves it (En cola); then `/jflow-build {id}`.

## `/jflow-build`

Implements a specified requirement end to end: full freedom on how, none on what.

1. **Check.** `git-check --mode implement`, `jiku fetch`, `spec order` (stops without asking while a
   dependency is not merged or is cancelled), the state; reads `testing.md` and asks for missing
   `.env` values of the entries it touches.
2. **Specification:** `spec check --implement`. Stops on a draft (`S18`), unreadable criteria,
   dependencies not merged, IDs that no longer fit, or anything that would leave the definition
   contradicting itself: the fix is `/jflow-spec {id}`.
3. **Branch and what is left:** `branch` (new, resumed, or reopened as `-2`, `-3`…), `spec diff`
   (on a reopening, only the difference), `load --requirement`.
4. **Plan and sweep.** Lists every behavior a user or integrator will observe and checks the
   specification fixes it. What it does not fix falls in four closed categories:

   | Category | What | What happens |
   |---|---|---|
   | 1. Small | A text the definition does not fix, order or presentation, an internal technical value, a value whoever deploys configures, a request with no effect | Decided and listed in `decided-{id}.md`; rows it adds go to the definition and, at close, to Jiku (`spec amend`, «Decided in the implementation») |
   | 2. Correction on the way | Something already built that is wrong by the definition, in what this requirement changes, small, with no new behavior, decision, other service or stored data | Fixed with its test and listed in `corrected-{id}.md` |
   | 3. Large | A business rule or limit, effect on what is in progress, security, stored values, time, concurrency, a contradiction, something that would stop working. Anything in doubt | Asked in one round before building; the answer is written to the specification in Jiku first |
   | 4. Out of scope | Everything else seen | To Jiku at close |

   With a visual reference, it captures the product as it is and compares with the design before
   splitting the work. It may split the work across subagents.
5. **Build,** test-first per criterion (tests tagged `[ID]`), moving the requirement to Desarrollo
   only now. Applies the specification to the definition in the same branch, with `Origin: #{id}`:
   rows, entities, decisions, parameters, schema with a new migration, contracts, flows,
   `testing.md`, and the guides.
6. **Prove:** `make check`, `coverage`, `evidence`, `spec diff`, `def-check`; the end-to-end tests of
   every entry it touches against `make up`, with screenshots at two sizes; `make test-perf` when a
   criterion proves an NFR by load; `visual-pairs` until no zone differs except the decided ones.
7. **Verify** until approved; stops after a finding survives three fixes or after eight rounds, and
   then does not push.
8. **Close:** what was seen out of scope to Jiku, `spec amend`, push, `mr-text`, the Jiku comment in
   business terms.

**Next:** the user opens the MR to `dev`, reviews it, tries it and merges it.

## `/jflow-fix`

A bug, or a small change that touches nothing documented, as a task of an existing requirement.

- **Small** means it adds or modifies no requirement, failure condition, invariant, guarantee,
  decision, parameter, NFR, attribute, state, table, column, contract operation or flow. A bug fix
  that makes the code match the definition is small; a bug the definition does not cover adds a rule
  and is not. In doubt, it asks. Not small → it stops and points to `/jflow-spec`.
- Branch `fix/{id}-{slug}` and a Jiku task. A bug is reproduced by a failing test (tagged with the ID
  it violates) before it is fixed; an improvement gets its test (a local tag from `next-id {id}-AC` if
  no ID applies).
- Never touches `_jflow/`. Corrections on the way follow the same four conditions as `/jflow-build`.
- Proves with `make check`, `evidence --ids`, `def-check` and the end-to-end tests of the entries it
  touches; verifies; pushes; writes `mr-{id}-{slug}.md` and the Jiku comment.

## `/jflow-status`

Read-only dashboard: `git-check --mode read` and `status`. Shows the stage and the open requirements
grouped by next action — open issues, drafts to specify, to specify, specified waiting for approval,
to implement, queued waiting for another requirement, in implementation, merged not released,
released not moved to review, in review, to release, inconsistencies — each with the command to run
next. Without Jiku, it shows only git and says so.

## `/jflow-release`

Releases what `dev` has and `main` does not. Also triggered by «versioná», «liberá», «nueva versión»
in a product repository. Aborts without `_jflow/project.yaml`.

1. `git-check --mode implement`.
2. **Regression on `dev`, locally:** `make check`, the whole `make test-e2e` suite, `make test-perf` if
   there are NFRs verified by load. A failure stops the release and is recorded as an incidencia.
3. `release-info`: the requirements and the suggested version, and the open incidencias. One
   confirmation: the version, and whether to list open incidencias as «Known issues».
4. `changelog {version}`, reviewed for wording; commit `chore: release {version}` on `dev`.
5. Merge `dev` into `main` (`--no-ff`), tag `v{version}`, push. The first release creates `main`.
   If `main` is protected, it undoes the local merge and says to open the MR, tagging after it.
6. A comment on every released requirement: «Included in version {version}».

Does not deploy or move states: Revisión comes after the deploy, and it is a person's.

## `/jflow-framework-update`

Updates jiku flow in the repository to the latest version (or a given one), through
`.claude/scripts/framework-update.sh`: compare versions, summarize the CHANGELOG, detect local
changes, back up `.claude/` to the system's temp folder, install with the new version's `jflow.py`,
run the script migrations, then the agent migrations listed in `.claude/agent-migrations-pending.md`,
verify and clean up. For every `MODIFIED` or `CLASH` file it asks: take the new version (yours saved
as `.bkp`), keep yours (the new one saved as `.new`), show the diff, or cancel. Only files in
`.claude/.jflow-manifest`, jiku flow's entries in `settings.json` and its block in `.claude/CLAUDE.md`
change. Nothing is committed: the user reviews and commits (`chore: update jiku flow to {version}`).

To install jiku flow in a repository that does not have it, use `install.sh` (see the
[README](../../README.md)).

---

## `jflow-verifier-agent`

The subagent that decides whether the work is done. Launched by `/jflow-product-scaffold`,
`/jflow-build`, `/jflow-fix` and `/jflow-product-brownfield` before they finish. It runs in a clean
context — it did not write the code and does not trust its claims — with `Read`, `Grep`, `Glob` and
`Bash`, and never modifies anything. It writes in English (its report goes into the MR text), quoting
the specification as written.

**Input:** the requirement id and title; the path of the Jiku copy (for a direct change, its
description and the IDs it must prove; for an adoption, the baseline, corrections, answers and
report); the branch and its base; anything extra to check; the previous round's findings.

**Checks, in order, collecting every finding:**

1. **Build and tests:** `make check`, `coverage`, `evidence --dry`, `spec diff` (nothing pending),
   `def-check`; `make up`, `make test-e2e`, `make down`, and `make test-perf` when a criterion proves
   an NFR by load.
   - **1a. End to end, per entry:** every entry the work touches has an end-to-end test that runs
     against `make up` and enters as the actor does, with the identities and replacements
     `testing.md` says, and nobody intervening. A test that calls the service's own code is an
     integration test, not this one. `testing.md` is up to date.
   - **1b. Screenshots:** objective defects (cut text, overlaps, controls out of view, empty screens,
     unreadable contrast, wrong screen), not taste. A touched screen without a screenshot is a finding.
   - **1c. Visual reference:** `visual-pairs`, every pair and zone; every difference that is not a
     decided one or the data is a finding.
2. **Each criterion really proven:** a test proves a criterion only if it would fail without the
   behavior, uses the public interface, sets up the condition and asserts the observable result.
   Tests of invariants, guarantees and parallel requests run **10 times in a row**; one failure is a
   finding.
3. **Definition and contracts match what was built, both ways:** every criterion applied as its
   `Change` says, with `Origin`; every technical detail, parameter and decision; contracts with their
   extensions matching the code; schema and migrations agreeing; and every observable behavior of the
   code documented. **3b:** what `decided-{id}.md` lists is only small things; anything large, or not
   listed, is a silent decision and a finding.
4. **Scope:** nothing outside the requirement's scope; for a direct change, nothing documented
   changed. Each correction on the way meets the four conditions and has its test.
5. **Engineering defaults** the change touches: secrets, input validation, outbound address guard,
   authorization, error shape, tests and JUnit, migrations, `AGENTS.md`, `README.md`, the operations
   guide, observability, dependencies.
6. **Decisions:** nothing contradicts a decision the specification does not revert.

**Adoption** replaces checks 2–5 with: the definition describes the code as it is, both ways; no
decision lacks evidence of intent; the minimum holds, proved by running it; no regression from the
baseline and every failing test now passes; only structure changed; the report is right, with the
security bugs apart.

**Output:** a table of checks, the verdict **APPROVED** (only with zero findings) or **REJECTED** with
each finding and its `file:line`, and a mandatory «Out of scope» section.

**Rounds.** On REJECTED the skill fixes the cause (every place of the kind the finding names, not
only the one cited) and launches a new verifier with the previous findings. `/jflow-build`,
`/jflow-fix` and `/jflow-product-scaffold` stop when a finding survives three fixes or after eight
rounds: they do not push or comment as done, and report what is open. The adoption has no round
limit; a finding that survives three fixes becomes a question to the user.

## What is seen out of scope

While specifying, building or verifying, an agent sees things that are not the requirement's scope.
What the product must not lose goes to Jiku through `jflow.py out-of-scope`, never into the branch:

| Kind | Goes to |
|---|---|
| 1. A bug in what is built | `incidencia` |
| 2. An intermittent test (also one that fails on `dev`) | `incidencia` |
| 3. A security risk | Its own `incidencia` |
| 4. Something postponed on purpose | A comment on the requirement that will do it (`--to N`), or a new requirement |
| 5. The definition or tests out of date where the work does not touch | `incidencia` (`--type otro` when nothing behaves wrong) |
| 6. A problem of jiku flow or the environment | Only the final report |
| 7. An opinion | Only the final report, if worth it |

The autonomous skills collect kinds 1, 2 and 5 into **one** incidencia per run, «Seen in #{id}: …»,
with one line per item, each security risk apart, and record it at close (also when they stop).
`/jflow-spec` asks before creating anything. An item an open requirement already covers becomes a
comment there. The verifier never writes to Jiku: the skill records what it reports, even from a
rejected round. `/jflow-product-brownfield` sends only security bugs to Jiku.
