# How jiku flow works

The architecture, for people changing it. For what a user sees, read [`docs/`](../docs/) and
[`.claude/METHODOLOGY.md`](../.claude/METHODOLOGY.md) first.

---

## Three kinds of pieces

| Piece | Where | What it holds | Who reads it |
|---|---|---|---|
| **Skills** | `.claude/skills/{name}/SKILL.md` | One workflow each: its steps, what it asks, where it stops. The judgment | The agent, when the user runs `/jflow-…` |
| **Specs** | `.claude/specs/*.md` | Rules shared by several skills: document formats, IDs, engineering defaults, Jiku, language | Skills link to them under `## References`; the agent reads them at run time |
| **`jflow.py`** | `.claude/scripts/jflow.py` + `jflowlib/` | Everything repeatable: parsing, checks, IDs, context loading, Jiku I/O, branches, coverage, evidence, MR text, changelog, status, install | Skills call it; tests exercise it |

The split is the main design rule: **the agent decides and interprets; the script computes.** A skill
says *when* to run `jflow.py spec check 812` and *what to do* with its observations; it never explains
how to check a specification. That keeps results reproducible, keeps skills short (they are loaded into
the context on every run), and makes the deterministic half testable without a model.

`jflow.py -h` lists the commands; `jflow.py <command> -h` documents each one. The modules:

| Module | Owns |
|---|---|
| `transcribe.py` | Reading a closed discovery into a model of the whole product |
| `plan.py` | The initial plan: one requirement draft per part, the base requirement, `plan-check` |
| `definition.py` | The definition: model, generated indexes, `def-check`, `next-id`, `load` |
| `spec.py` | The specification of a requirement: parse, draft, `spec check` |
| `diff.py` | What is left to do: the specification against the branch's definition and tests |
| `jiku.py` | Jiku through its CLI (`jiku`), with a dry-run mode |
| `evidence.py` | Coverage by ID and evidence from JUnit reports |
| `visual.py` | Screens of a design package paired with screenshots |
| `conformance.py` | Mechanical checks of a repository against the adoption minimum and the defaults |
| `workflow.py` | Git checks, branches, MR text, release, changelog, project setup, status |
| `install.py` | Install and update, with the manifest |
| `lang.py` | Structural names in English and Spanish |
| `md.py`, `repo.py` | Markdown tables and sections, minimal YAML; repository layout and configuration |

---

## The documents

A product repository is always a monorepo with a fixed layout (see the
[Product Definition](../.claude/specs/product-definition.md) spec), so skills use fixed paths and there
is no file index.

| Document | Where | Written by | Read by |
|---|---|---|---|
| **Discovery** | `_jflow/discovery/` (functional, domain, technical, one DB schema per service) | `/jflow-product-discover`, with the user. Frozen afterwards: it is history | `plan-build` and `def-base` (via `transcribe.py`); `/jflow-spec` and `/jflow-build` as detail for parts not built yet |
| **Specification** | Jiku: the requirement's Scope, Proposal (with its Technical detail) and Acceptance criteria fields | `plan-push` (drafts of the initial plan), `/jflow-spec` (via `spec draft` / `spec push`), `/jflow-build` for what it had to ask (`spec amend`) | `/jflow-build`, `/jflow-fix`, the verifier, `spec diff`, `next-id` |
| **Definition** | `_jflow/prd/`, `apis/`, `db-schemas/`, `flows/`, `references/` | `/jflow-product-scaffold` or `/jflow-product-brownfield` first; then only `/jflow-build` and `/jflow-fix`, in the requirement's branch | Every skill, through `jflow.py load`; `def-check`; the verifier |
| **Evidence** | The MR/PR text and a comment in Jiku | `jflow.py evidence` and `mr-text`, from `reports/junit/` | The person who reviews and merges |
| **Docs for people** | `README.md`, `docs/`, `CHANGELOG.md` of the product | Scaffold and brownfield create them; build and release update them | People |
| **Working files** | System temp folder, one subfolder per repository (`jflow.py workdir`) | Drafts, Jiku copies, MR text, verifier verdicts | The same run; lost on reboot by design |

`_jflow/project.yaml` links the repository to its Jiku project (`jiku.project_id`, `jiku.instance`),
and sets the git platform, branches and `language`.

The definition describes **only what is built**: in `dev`, what is documented is merged. What is still
to build lives in Jiku, as requirements with their specifications. A specification declares a change
(each criterion row has `Change`: add, modify, remove); `/jflow-build` applies it to the definition in
the branch; `spec diff` compares the two.

---

## Structure in two languages (`lang.py`)

Documents people read have a fixed structure (headings, table columns, a few fixed values) that the
scripts parse. That structure is written in Spanish for Spanish products and in English for every
other language; content is always in the product language. The definition is the exception: its
structure is always English.

- `TERMS` maps each English structural name to its Spanish name (`"Acceptance criteria"` →
  `"Criterios de aceptación"`); `ALIASES` adds other Spanish forms.
- **Reading:** `canon(s)` turns either name into the English one (and keeps change marks:
  `Autenticación (agrega)` → `Authentication (add)`). `Sections` is a dict of `{heading: lines}` that
  also finds `## Entidades` by `get("Entities")`. `value(s)` normalises a fixed value in a cell.
  `md.sections()` and the table readers apply them, so the rest of the code only knows English names.
- **Writing:** code builds text with English structure; `localize(md, lang)` translates headings,
  columns, the fixed values of `Change`/`Type`/`Verification` and fixed phrases; `say(term, lang)` gives
  one name. `structure(lang)` is `es` or `en`.
- `doc_file()` and `template()` pick `docs/operacion.md` or `docs/operations.md`, and
  `.claude/templates/es/` or `en/`.

Adding a structural name: add it to `TERMS`, read it with `canon`/`Sections`, write it with
`say`/`localize`, and check the round trip in both languages (`contributing/tests/run.py` has one).
`jflow.py lang-terms` prints the table for skill authors.

---

## Install and update (`jflowlib/install.py`)

`install.sh` and `/jflow-framework-update` both download a release (the highest `vX.Y.Z` tag, or the
one asked for) and run **the downloaded copy's** `jflow.py install`, so an update always follows the
new version's rules.

- Every file of the shipped `.claude/` belongs to jiku flow, except the local state
  (`.jflow-version`, `.jflow-manifest`, `settings.local.json`, `local-config.yaml`,
  `agent-migrations-pending.md`) and the two shared files.
- `.claude/.jflow-manifest` records each shipped file with its hash at install time. On update, a file
  whose hash still matches is replaced silently; one the user changed is `MODIFIED`, and the user chooses
  to keep it (the new one is saved as `.new`) or replace it (theirs is saved as `.bkp`). A file the new
  version dropped is removed unless the user changed it. Without a manifest, a differing file is a
  `CLASH`.
- **Shared files are merged:** `settings.json` gets jiku flow's permissions and hooks (and loses the
  ones a previous version added and this one no longer has); `CLAUDE.md` gets jiku flow's text between
  two markers. The user's own entries stay.
- Anything else in `.claude/` (the user's skills, agents) is never touched.

`install.sh` writes `.claude/.jflow-version` with the installed version, so a fresh install runs no
migrations. An update runs `migrate.sh` from the old `.jflow-version` to the new `VERSION`; see
[Migrations](migrations.md).

---

## Hooks

Long skills can outlive the context window. Two hooks (in `settings.json`, both need `jq`):

- **PreCompact** (`jflow-pre-compact.sh`) finds the last `jflow-*` skill in the transcript and saves its
  name under `~/.claude/state/`.
- **SessionStart** (`jflow-session-resume.sh`), only when the session restarts after a compaction,
  tells the agent to re-read that skill's `SKILL.md` and continue from the step it was at.

Other skills are ignored. `JFLOW_HOOKS_DEBUG=1` logs to `~/.claude/state/hooks.log`.

---

## The verifier loop

`/jflow-product-scaffold`, `/jflow-product-brownfield`, `/jflow-build` and `/jflow-fix` end by launching
`jflow-verifier-agent` (`.claude/agents/`): a subagent with a clean context and read-only tools. It
re-runs `make check`, `coverage`, `evidence`, `spec diff`, `def-check` and the end-to-end levels, reads
the tests, and checks that each criterion is proven by a test that would fail without the behaviour.
Its verdict is APPROVED only with zero findings.

On REJECTED the skill fixes **every place of the kind** the finding names (not only the cited one) and
launches a new verifier with the previous findings. It stops when a finding survives three fixes or
after eight rounds, and then reports honestly that the work is not done: no push, no "done" comment in
Jiku. The adoption has no round limit; what survives three fixes becomes a question for the user.

---

## Design decisions and why

| Decision | Reason |
|---|---|
| The specification lives in Jiku; the repository holds the definition of what is built | Jiku is where requirements are managed and approved; keeping pending work out of the repo means `dev` never documents what does not exist |
| Acceptance criteria are IDs of the definition, and tests carry the ID (`[CAN-E1] …`) | Coverage outlives the requirement: the test keeps protecting the rule after the requirement closes. A criterion that maps to no definition row shows the definition is missing something |
| Evidence is computed from JUnit reports | The agent cannot claim a test passed; the script reads the result |
| A clean-context, read-only verifier decides when work is done | The implementing agent is biased by its own reasoning; a fresh one re-runs everything and trusts nothing |
| `next-id` reserves IDs against the open specifications in Jiku | Two requirements specified in parallel would otherwise take the same new ID |
| Each part of the initial plan contains only what it can build alone (`plan-check` P1) | A part that cites what a later part adds cannot be built or tested alone, and merging it would document unbuilt behaviour |
| Every write to Jiku reads first; hand edits are not overwritten | People edit requirements in Jiku; a regenerated draft or a stale push must not erase their work |
| The implementation decides small gaps, asks large ones, and writes the answer to the specification | Small gaps (texts, ordering, internal values) would stall the run; business rules, security, data meaning and concurrency must not be decided silently |
| What is seen out of scope goes to Jiku (`out-of-scope`) | Bugs and follow-ups found during a run were otherwise lost in a report nobody reads |
| Adoption brings the repo to a minimum without changing product logic; only security bugs go to Jiku | The goal is a product ready to specify and build; flooding Jiku with mixed bugs, improvements and conventions made it unusable |
| No stack catalog; the agent researches current official docs | A catalog goes stale; the user fixes the language and the agent decides the rest with a recorded reason |
| `_jflow/` with an underscore | Dot-folders are ignored by many search tools; agents need to find it |
| Working files in the system temp folder | The repository stays clean; nothing half-written gets committed |
| Fixed monorepo layout | Skills use paths directly; no index to maintain or get out of date |
| Python standard library only | Nothing to install in a product repository beyond `python3` |
