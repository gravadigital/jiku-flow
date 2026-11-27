# Specify and build a requirement

For a feature or an improvement that changes something documented: a new behavior, a rule, a contract,
a screen. For a bug or a small change, see [Fix a bug or make a small change](direct-change.md). The
parts of the initial plan arrive as drafts and go through the same cycle, in the order of their number.

```text
Jiku (Análisis) → Planificación → /jflow-spec {id} → approval (En cola) → /jflow-build {id} → review and merge → deploy (Revisión) → Resuelto
```

## 1. Specify — `/jflow-spec {id} [what you want to add or change]`

Moving the requirement to **Planificación** is the signal that it is to be specified; in any other
state the skill warns and asks. Claude acts as a critical partner, not a scribe:

1. **Reads the requirement** fully from Jiku: description, every comment, attachments, and whatever
   specification it already has. The text you write after the id is added to the request.
2. **Locates it in the product:** the part of the definition it touches, the discovery for what is
   not built yet, and the other open requirements.
3. **Contrasts everything** and tells you what it found: contradictions with rules or decisions,
   overlap with what is built or with another pending requirement, something out of scope, a contract
   external integrators use, gaps. What is already written in the requirement is input, not truth: if
   Claude disagrees, it shows it as a conflict and you decide.
4. **Asks what must be decided**, with its recommendation first, and writes every answer to a draft:
   - scope (includes, excludes, depends on) and proposal;
   - rules, failure conditions, decisions and the key technical detail (data, interface, flows,
     architecture). Every conflict is yours: keep what exists or revert it, with its reason;
   - acceptance criteria, each with an ID, verifiable, saying whether it adds, modifies or removes
     something.
5. **Checks the dependents:** requirements that depend on this one and cite what it changes. You
   decide whether to adjust them later (`/jflow-spec` on each) or leave them.
6. **One review.** You get a link to the draft and a summary: scope, rules and decisions, criteria,
   the assumptions made and what stays out of scope. That review is the approval; if you ask for
   changes, it applies them and shows you again.
7. **Writes the specification to Jiku**, marked «Specification: ready». The repository is not touched.

If the requirement depends on one not yet merged, it tells you and goes on: you can specify ahead, but
it can only be built once the other is in `dev`. A dependency on a cancelled requirement is a conflict
you resolve.

The draft lives in your system's temp folder while you work; if the machine restarts mid-session, the
draft is lost and the specification starts again (Claude tells you).

## 2. Approve

In Jiku, as usual: the client or the team approves, and the requirement moves to **En cola**.

## 3. Build — `/jflow-build {id}`

Before starting it checks that you are on `dev`, up to date and clean (behind the remote it stops until
you pull; on another branch it asks — it may be a resumption), and that the requirement is En cola.
It reads `_jflow/prd/architecture/testing.md` to find the entries the requirement touches: if testing
them end to end needs values missing from `.env` (test identities, a sandbox), it asks you to fill them
in now. From there it is autonomous:

1. **Reads and checks the specification.** It stops, before anything else, on a draft, on a dependency
   not merged in `dev`, or when the product changed in a way that invalidates the specification — and
   tells you to run `/jflow-spec {id}`.
2. **Branch** `feat/{id}-{slug}` from `dev` (or resumes the open one).
3. **Plans** its own way, and sweeps for gaps before writing code: visible behavior the specification
   does not fix. The large ones are asked now, all at once (see below). Until here Jiku is untouched:
   if it stops, the requirement keeps its state.
4. **Builds**, moving the requirement to Desarrollo: test-first, one test per criterion, tagged with
   its ID.
5. **Applies the specification to the definition** in the same branch: blocks, domain, contracts,
   schema, flows, decisions, parameters, how each entry is tested, and the guides (`README.md`, the
   operations guide, `AGENTS.md`).
6. **Proves it:** `make check`, coverage, evidence from the JUnit reports, and the difference with the
   specification, until everything passes.
7. **Verifies.** `jflow-verifier-agent`, in a clean context and read-only, checks that every criterion
   is proven by a real passing test and that the definition and contracts are true. On rejection,
   Claude fixes and verifies again.
8. **Closes:** pushes, leaves the MR text with the evidence and the verdict, and comments in Jiku.

If a finding survives three fixes, or after eight verification rounds, it stops and tells you: the
requirement is not done, and nothing is pushed.

### Slow tests, at the close

While building, Claude iterates with the fast tests (unit, component, widget). Before the verifier it
brings the product up with `make up` and runs what closes the requirement:

- **One end-to-end test per entry it touches** (a screen, an API, a bus), entering as the actor does —
  the browser or the app, an HTTP client with a role's token, an authenticated broker client — and
  proving its criteria. An entry that cannot be tested is never skipped silently: it is fixed or the
  run stops.
- **Screenshots** of every screen it touches, at two sizes, in `reports/screenshots/{id}/`. The
  verifier looks at them for objective defects (cut text, overlapping elements, an empty screen); taste
  is left to your review.
- **Performance tests** when a criterion proves a non-functional requirement by load.

**When the requirement comes with a design** (a package of screens, a prototype), the specification
carries it as a **visual reference**: each design screen with the route and state it corresponds to,
and a closed list of what may differ, each with its decision. Everything else must look the same.
`jflow.py visual-pairs {id}` puts each capture next to its reference, whole and by zones; Claude fixes
until no undecided difference remains, and the verifier goes through the same pairs.

### What it decides, fixes or asks

When the specification does not fix something a user or an integrator can observe, it falls in one of
four closed categories:

| Category | Examples | What happens |
|---|---|---|
| **Small** — decided and listed | A text the definition does not fix; the order or format of a list; an internal technical value (a timeout, retries); a value whoever deploys configures (documented, never invented); a request with no effect | Listed under «Decided in the implementation» in the MR and the Jiku comment; what adds to the definition (a failure condition, a limit) is also appended to the specification. The next `/jflow-spec` on the requirement shows it to you to confirm or change |
| **Correction on the way** — fixed and listed | Something already built that is wrong according to the definition, inside what this work changes, small, with no new behavior, no decision, no other service and no stored data | Fixed with its test, listed as fixed along the way; the verifier checks each one |
| **Large** — asked | A business rule or limit; an effect on what is in progress; security or permissions; what a stored value means; time; concurrency; anything contradicting the definition or the design; something that would stop working; anything on no list | Asked at once, with options and a recommendation. Your answer is written to the specification in Jiku and the build goes on. It offers «Stop and re-specify» only when the answer would make the requirement much larger (a new entity, service or integration, a data migration) |
| **Out of scope** — to Jiku, not the branch | A bug elsewhere, an intermittent test, a security risk, something postponed | See [What is seen out of scope](jiku.md#what-is-seen-out-of-scope) |

It never asks about the process (whether to go on, verify again, fix a finding). Deciding or fixing
something without listing it is a verifier finding.

## 4. Review and merge

Open the MR from the branch to `dev` with the text Claude leaves. It has the scope, the evidence table
(each criterion → its test → the result), the decisions and the changes to the definition. Try it
with `make up`, review the diff of `_jflow/`, and merge it. After the deploy, move the requirement to
Revisión in Jiku.

## Changing a requirement

Always with `/jflow-spec {id} {what changes}`, even if the change came from the client or you edited
it in Jiku:

- **Not built yet:** it updates the specification.
- **Being built** (open branch): it updates the specification; `/jflow-build {id}` resumes the branch
  and adapts only what changed.
- **Already merged** (Revisión or Resuelto): Claude warns that it will be reopened and, if you confirm,
  moves it to Desarrollo. `/jflow-build {id}` works on a new branch (`feat/{id}-{slug}-2`) and applies
  only the difference with what is in `dev`.
