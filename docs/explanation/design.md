# Design decisions

Why jiku flow is built the way it is. Each section states the choice, the reason, and what it rules
out. The mechanics are in the [reference](../reference/README.md).

## The problem

An agent that implements without context does what it is asked, even when it contradicts what the
product already decided. An agent buried in instructions — catalogs of conventions, step-by-step task
plans — works worse and costs more: it repeats what the model already knows and keeps it from
choosing well. And in both cases "it is done" is a claim, not a verified fact.

jiku flow answers with three ideas: the product has a **living definition** that every request is
weighed against; **the input and the output are controlled, the middle is free**; and **done means
verified**, by tests and by an agent that did not write the code.

---

## The specification lives in Jiku, and the requirement is the unit of work

**Choice.** One Jiku requirement = one specification = one branch = one MR. The specification is
three fields of the requirement — scope, proposal, acceptance criteria — and nothing of it is stored
in the repository. Its id names everything done for it: the branch, the commits, the `Origin` of
every definition row it touches, its local criteria in test names.

**Why.**

- The people who ask for the work and decide its priority — the team, the client — already live in
  the tool that manages it. A specification there is read where the decision is made, in a language
  the client can read, next to the comments, the state and the hours.
- Requirements wait, get postponed, get cancelled. A specification stored in the repository would
  either describe things that will never exist or need a separate lifecycle. In Jiku, a cancelled
  requirement simply takes its specification with it.
- One id across tools makes everything traceable without a mapping table: from a row of the
  definition (`Origin: #812`) to the requirement that put it there, to its branch, its commits and
  its MR.

**What it rules out.** Code-level detail in the specification (files, functions, test names): that
is the implementation's decision and lives only in the code. And editing the definition from a
specification: a specification declares a change; the definition changes only when it is built.

## The definition describes only what is built

**Choice.** `_jflow/` documents the product as it is in `dev`: every block, rule, entity, contract
and flow there exists. What is still to build lives in Jiku requirements (and, for a new product, in
its discovery). The definition changes in the same branch as the code that makes it true.

**Why.**

- Any agent, any time, can trust the definition: it is a description, not a plan. A request is
  challenged against what really exists, and a check like "this operation is in the contract" means
  the operation works.
- Code and documentation reach `dev` together and are reviewed together. They cannot drift by one
  merge.
- A definition that mixes the target with the current state needs a status on every piece and
  discipline to keep it right; the moment one status is wrong, nothing can be trusted.

**What it costs.** What is planned but not built must be found in Jiku and the discovery, not in one
place. The plan's drafts carry the technical detail transcribed from the discovery, so each
requirement is enough to build its part.

## Deterministic work in scripts, judgment in the agent

**Choice.** Everything that can be computed is a command of `jflow.py`: splitting the discovery into
the plan, writing the base definition, indexes, consistency checks, ID allocation, loading the
context of a task, reading and writing specifications in Jiku, branches, coverage, evidence, the
difference between a specification and what is built, the MR text, the CHANGELOG, the status. The
agent decides, interprets and talks to the user; the script executes.

**Why.**

- A script does not get a format wrong, does not skip a row, and costs nothing to run again. Prose
  instructions for mechanical work are expensive, and the model follows them less reliably the longer
  they get.
- A script can be tested. A check's error message is the instruction: the agent fixes what it says.
- The evidence is computed from the test reports, not written by the agent that would benefit from
  it.

**What it rules out.** Choosing an ID by reading the files, editing a generated index, calling the
Jiku CLI directly from a skill, or drafting the evidence table by hand.

## IDs, and criteria traced to tests

**Choice.** Every row that can be cited has a stable ID that is never reused (`CAN-E1`, `INV-02`,
`DEC-T05`). An acceptance criterion is an ID of the definition, or a local criterion (`812-AC-01`)
only for what is not product definition. Every test that proves a criterion carries its ID in
brackets: `[CAN-E1] does not cancel an appointment that already started`.

**Why.**

- **Coverage outlives the requirement.** The test of `CAN-E1` keeps protecting that rule after the
  requirement that added it is closed: `jflow.py coverage --all` can tell at any time which rules of
  the product have a test.
- A criterion that maps to nothing in the definition is a signal that the definition is missing a
  rule. Adding the row fixes the definition instead of hiding the rule in one requirement.
- IDs let the scripts compute instead of guess: which files to load for a task, which requirements a
  change affects, whether a specification cites something that does not exist.
- Open requirements in Jiku reserve the IDs they add. Two specifications of the same block, written in
  parallel, cannot take the same new ID; that is why `next-id` asks Jiku and stops when it cannot.

## Done means verified: the clean-context verifier

**Choice.** No skill that builds can declare its own work done. A subagent, `jflow-verifier-agent`,
in a clean context, read-only, re-runs the checks and the tests, reads each test, compares the
definition and the contracts with the code in both directions, and answers APPROVED or REJECTED with
findings at `file:line`. The skill fixes and launches a new verifier, which receives the previous
findings.

**Why.**

- The agent that wrote the code is the worst judge of it: it remembers what it meant, not what it
  wrote. A fresh context sees the diff and the tests as they are.
- "The tests pass" is not enough. A test proves a criterion only if it would fail without the
  behavior, through the public interface, asserting the observable result. A test that mocks the
  behavior under test proves nothing; the verifier reads the tests to find those.
- An intermittent guarantee is a broken guarantee. The tests of invariants, guarantees and parallel
  requests run ten times in a row: one failure is a finding, even if a retry would hide it.
- The verifier also checks the other direction: behavior the code has and the definition does not
  — a limit, a new variable, an error with no failure condition — is a silent decision, and a
  finding.

**Rounds.** A finding is fixed at its cause: every place of the kind it names, not just the one
cited, or the same finding returns in the next round. The work stops after a finding survives three
fixes or after eight rounds, and then the branch is not pushed: an honest report of what is open is
worth more than a merge of something unverified. The adoption is the exception: it has no round
limit, because it must end with the product ready.

## End to end, entering as the actor

**Choice.** Every product says in its definition (`prd/architecture/testing.md`) how each entry point
is tested end to end, how each role gets a test identity, and how each external system is replaced.
An end-to-end test runs against `make up` and enters as the actor does — the browser or the app, an
HTTP client with a real token, a broker client authenticated as the actor — never by calling the
service's own code. Identity is replaced at the boundary, by default with a fake issuer in the test
profile.

**Why.** Integration tests that call a handler in process skip exactly what fails in production:
authentication, the broker, the browser. And if a product cannot be tried without a person typing
credentials, nobody — agent or verifier — will try it. With identities and external systems
replaced by configuration, "done" means the same thing in every product, and needs nobody in the loop.

**The slow levels run locally.** Emulators, browsers across versions and load tests are too heavy
for small CI runners, and flaky on shared machines. They run at the close of each requirement (for
what it touches, before and by the verifier) and as a full regression before every release. CI runs
the fast part of `make check` on every MR.

## The user decides; the agent challenges

**Choice.** Every rule, decision, criterion and scope boundary is the user's. The agent proposes,
with its recommendation first, and asks. What a requirement already says — even a specification
written earlier — is input, not truth: the agent contrasts it with the definition and the other open
requirements, and shows every disagreement as a conflict for the user to decide. Every decision
records what was rejected and why, in the user's words; a reason the agent drafted and the user only
accepted is marked `(proposed)`.

**Why.**

- A fabricated rule is worse than a missing one: it looks decided, so nobody questions it.
- A transcribing agent turns a client's vague request into a confident specification. A challenging
  one finds the contradictions, the overlaps with other open requirements, and what the request would
  silently drop from today's product — while the user is still there to decide.
- Recording what was rejected is what stops the next person, or agent, from "fixing" it. Marking
  whose reason it is keeps the agent's reasoning from passing as the user's.

**Asking less, better.** `/jflow-spec` writes every answer to a draft and asks for one review of the
whole draft, with its path, instead of confirming each part. The discovery confirms each section
alone, because that is where the product is being defined.

## What the implementation may decide

**Choice.** The specification fixes what; the implementation is free on how. What the specification
leaves open and a user or integrator would observe falls in four closed categories: **small** things
the implementation decides and lists (a text, an order, an internal value, a deployment variable);
**corrections on the way** it fixes and lists (something already built that is wrong by the
definition, in what it already changes, small, without a new behavior or decision); **large** gaps
it asks — all at once, before building — and writes into the specification in Jiku before building
them; and what is **out of scope**, which goes to Jiku. Anything not on a list, or in doubt, is large.
The wire format and input bounds are not gaps at all: the engineering defaults fix them, and the
contract records them.

**Why.**

- Stopping for every unspecified text makes autonomy useless; deciding a business rule silently makes
  the specification meaningless. Closed lists put the line where the verifier can check it.
- Asking the large gaps in one round, before building, means the user answers once and the rest of
  the run needs nobody. Writing the answers to Jiku keeps the specification the single truth.
- Small decisions that add a definition row are appended to the specification, marked «Decided in the
  implementation», so the next `/jflow-spec` shows them to the user to keep or change.

## The initial plan, in parts, built in order

**Choice.** At the end of the discovery, the product is split into parts — one or more functional
blocks each, one requirement and one MR each — in an order where everything a part cites exists by
then. `plan-build` places every piece of the discovery in the first part where what it cites
exists; a row that cites a later part moves there, and the user decides whether an earlier part
needs a reduced version. Every part is created in Jiku as a **draft**, and each one is specified with
`/jflow-spec` when its turn comes, against what has been built by then.

**Why.**

- Each part must be built, tested and merged on its own, and the definition in `dev` must describe
  only what is built. A part that cites what a later part brings can do neither.
- The discovery is written before anything exists. By the time part 3 is built, parts 1 and 2 have
  answered questions the discovery could not; specifying part 3 against them catches the gaps that
  would otherwise stop the implementation halfway.
- The order in the title (`1 · …`, `2 · …`) and the dependencies (`Depends on`) make the build order
  explicit: `/jflow-build` refuses to start while a dependency is not merged.

## The base product is a requirement like any other

**Choice.** The skeleton — every service, the test harness at every level, the fake issuer, CI,
observability, the guides, the product-level definition — is the first requirement, specified (its
technical questions asked first) and built on its own branch, verified, with an MR.

**Why.** It goes through the same review, evidence and verifier as every other change, and the
questions only the user can answer — how each platform is tested, how each NFR is verified, which
tools and CI secrets exist — are settled before anything is built, not discovered halfway.

## Adopting a product: the minimum, nothing more

**Choice.** An existing product is adopted by surveying its code into the definition **as it is**,
and bringing the repository to a minimum (M1–M9): the layout, Make, JUnit reports, Compose with the
schema built from empty, a green `make check`, CI through `make`, the guides, one end-to-end test per
entry. Product logic is not changed — except to make an existing failing test pass, since the test is
evidence of what the product must do. Every other deviation from the defaults, every suspected bug
and every doubtful behavior goes to an adoption report; only security bugs go to Jiku. A decision is
recorded only with evidence of intent. The adoption ends only with the product ready.

**Why.**

- The minimum is exactly what the skills and the verifier run. Without it nothing else works; beyond
  it, aligning an existing product to every default of a new one is a large project that the team,
  not the adoption, should decide on.
- Documenting what should be instead of what is would make the definition lie on day one.
- A behavior that may be an accident, recorded as a decision, would protect a bug forever. Asking
  once ("on purpose / a mistake / I don't know") and recording only what has evidence keeps the
  decisions honest.
- Loading every finding into Jiku buries the few that matter. A report the user reads once, plus the
  security bugs as incidencias, keeps Jiku for work someone will do.

## What is seen out of scope goes to Jiku

**Choice.** A bug in what is built, an intermittent test, a security risk, something postponed, the
definition out of date elsewhere: the agent never fixes it in the branch, and never forgets it. It
records it in Jiku — one incidencia per run, each security risk apart, a comment where an open
requirement already covers it. The verifier reports these in a mandatory section, and the skill
records them even from a rejected round.

**Why.** Fixing it in the branch is scope creep, and makes the MR hard to review. Mentioning it only
in a chat or an MR loses it the day the session ends. Jiku is where the team decides what to do next.

## Read Jiku before writing; interactive skills show, autonomous ones report

**Choice.** Every write to Jiku looks at what is there first: the plan never creates a part twice,
a specification edited in Jiku since its draft started is not overwritten. The interactive skills
show what they are about to write and write only on approval. The autonomous ones work on
requirements that already exist and report everything they wrote. The agent records facts (it moves
a requirement to Desarrollo when it starts building) and never judgments (approval, priority, merge,
deploy, "stable").

**Why.** Jiku is shared with people and clients; a duplicated requirement or a lost edit costs trust
that no automation saves. And the states that mean a decision belong to whoever is accountable for
it.

## Free stack, researched now

**Choice.** No stack catalog. The user fixes the language of each service in the discovery and any
constraint in a requirement; the agent chooses everything else from the official documentation and
release notes, checked at that moment, and records it in the service's `AGENTS.md`. A choice that
discards an alternative the product cares about is a technical decision, with its reason.

**Why.** A catalog ages the day it is written, and training data is older still. What the agent
chooses is visible and reviewable, and the next agent finds it in `AGENTS.md` instead of re-deciding.

## Languages: people read theirs, agents and git read English

**Choice.** The conversation follows the user. What people of the product read — Jiku, the
discovery, the README, `docs/`, the CHANGELOG — is in the product language, with a structure in
Spanish for a Spanish product and in English otherwise. The definition has an English structure and
its content in the product language. Code, git and agent documents are English. See
[Language](../reference/language.md).

**Why.**

- The client reads Jiku and the guides; they must read their own language.
- The rows of the definition are copied word for word from the criteria in Jiku, and the checks
  compare them. Translating them would break that comparison; keeping them in the product language
  keeps one text for each rule.
- Identifiers in English keep the contract cheap: a schema in one language behind a contract in
  another adds a translation layer every query, mapper and test pays for.
- A fixed, finite structure vocabulary (`jflow.py lang-terms`) lets the scripts read documents in
  either structure language.
