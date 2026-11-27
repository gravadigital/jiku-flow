# How jiku flow uses Jiku

Jiku owns the requirement: who asked, priority, state, visibility, hours — and its specification
(scope, proposal and acceptance criteria). The repository owns the product. This guide says what
Claude reads and writes in Jiku, and what stays in people's hands. To install the CLI and link a
repository, see [Install and set up](install.md).

## The rules

- **Through the script only.** Skills never call the `jiku` CLI directly: `jflow.py` picks the
  instance's configuration, builds the payloads, honors dry-run and logs every write.
- **In your name.** The CLI uses your token; every write is marked as done by an agent.
- **Facts, not judgments.** Claude moves a requirement to **Desarrollo** when it creates its branch
  (or reopens it with your confirmation). Approving, prioritizing, merging, deploying and closing are
  people's: Claude never sets En cola, Revisión, Resuelto or Cancelado.
- **No code in Jiku.** What Claude writes is functional plus the key technical detail (data,
  interface, flows, architecture) — never files, functions or test names. The client may read it, so
  it is in the product language.
- **Internal comments.** Every comment Claude writes is internal.
- **Read before writing.** No requirement is created twice; a specification that changed in Jiku
  since Claude started drafting it is not overwritten.

## States

| State | Meaning in jiku flow | Who moves it |
|---|---|---|
| Análisis | The request arrived | People |
| Planificación | To specify, or specified and waiting for approval | People; the plan's requirements are born here |
| En cola | Approved, waiting for its turn | People |
| Desarrollo | Implementation, verification, MR and its human review, until the merge | Claude, when it creates the branch or reopens a requirement with your confirmation |
| Revisión | In production; making sure it works and is stable | People |
| Resuelto / Cancelado | Closed | People |

Each skill checks the state it expects and, in any other, **warns and asks** — you are responsible:

| Skill | Expects | Otherwise |
|---|---|---|
| `/jflow-spec` | Planificación | Warns and asks. Revisión or Resuelto: offers to reopen it. Cancelado: stops |
| `/jflow-product-scaffold` | Planificación or En cola | Warns and asks |
| `/jflow-build` | En cola | Warns and asks (Desarrollo may be a resumption). Cancelado: stops |
| `/jflow-fix` | Desarrollo | Offers to move it there. Cancelado: stops |

## What Claude writes

| When | What |
|---|---|
| End of `/jflow-product-discover` | The **base product** requirement («0 · Base product», «0 · Producto base» in Spanish) and one requirement per part of the plan, numbered in build order, with a draft scope, proposal and criteria, in Planificación, public. You approve the list first |
| `/jflow-spec`, and Step 1 of `/jflow-product-scaffold` | Scope, proposal and acceptance criteria, after you review the draft. It does not change the state |
| `/jflow-spec` on a requirement in Revisión or Resuelto, if you confirm | Reopens it: Desarrollo |
| `/jflow-build`, `/jflow-fix`, `/jflow-product-scaffold` creating the branch | Desarrollo |
| Start of `/jflow-fix` | A **task** under the requirement, assigned to you |
| End of `/jflow-build`, when it decided small things | The decided criteria appended to the specification, under «Decided in the implementation» |
| End of `/jflow-product-scaffold`, `/jflow-product-brownfield`, `/jflow-build`, `/jflow-fix` | An internal **comment**: what the product does now, the criteria met in business terms, the verification |
| `/jflow-product-brownfield` | The adoption requirement (if you did not pass one) and one **incidencia** per security bug. Everything else goes to the adoption report in the repository, not to Jiku |
| Things seen out of scope while working | See below |
| `/jflow-release` | A comment on every released requirement: the version it shipped in. A regression failure, as an incidencia |

## Draft or ready

The last line of a requirement's description says whether it can be built:

- «Specification: draft» («Especificación: borrador») — written by the plan, generated from the
  discovery and not yet reviewed against what is built.
- «Specification: ready ({date})» («Especificación: lista») — written when `/jflow-spec` (or
  `/jflow-product-scaffold` for the base) pushes the specification.

`/jflow-build` refuses anything but ready, and `/jflow-status` lists drafts apart. A requirement created
by hand has no line until it is specified.

## What is seen out of scope

While specifying, building or verifying, Claude sees things that do not belong to the requirement. It
never fixes them in the branch — that would be scope creep — but it does not lose them either:

| Seen | Goes to |
|---|---|
| A bug in what is built, an intermittent test, the definition or tests out of date elsewhere | One internal **incidencia** per run, «Seen in #{id}: …», in Análisis, one line per item |
| A security risk | Its own incidencia |
| Something postponed on purpose to another requirement | A comment on that requirement (or a new one if none covers it) |
| A problem of jiku flow or the environment; an idea or a refactor | Not Jiku: the final report |

If an open requirement already covers an item, it becomes a comment there. `/jflow-spec`, with you
present, asks before creating anything. Every item is also listed in the MR and the Jiku comment.
`/jflow-status` shows open incidencias with their origin, and `/jflow-release` lists them before
tagging.

The one exception is a **correction on the way** in `/jflow-build` and `/jflow-fix`: something
already built that is wrong according to the definition, inside what the work already changes, small,
with no new behavior, no decision, no other service and no stored data. It is fixed with its test and
listed in the MR as fixed along the way; the verifier checks each one.

## Dry-run

`writes: false` in `_jflow/project.yaml`, or `JFLOW_JIKU_DRY_RUN=1` for one run, makes every write print
what it would send instead of sending it. Useful to try things, but the specification lives in Jiku: a
full flow needs real writes (use a test project, ideally on a non-production instance). Every write,
sent or not, is also logged in the working folder (`python3 .claude/scripts/jflow.py workdir` prints
it).

## When Jiku fails

| Situation | What happens |
|---|---|
| CLI not installed, not logged in, or the instance's config file missing | Claude tells you how to log in (`jiku --config ~/.config/jiku/config.{instance}.yaml login`, `jiku doctor`). Steps that need to read the specification stop |
| Requirement not found, or from another project | The skill stops: wrong id, no access, or not this repository's |
| A write is refused | Claude reports the error and the exact command to retry, and continues |
