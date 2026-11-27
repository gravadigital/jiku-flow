# Contributing to jiku flow

This folder is for people who change jiku flow itself: its skills, specs, scripts and templates. If you
want to *use* jiku flow on a product, start with [`docs/`](../docs/).

| Read | When |
|---|---|
| [How it works](how-it-works.md) | Before your first change: the pieces, the documents, the language layer, the installer, the design decisions |
| [Creating skills](creating-skills.md) | Adding or editing a skill in `.claude/skills/` |
| [Testing](testing.md) | Before opening a PR: the fast tests and the simulated sessions |
| [Migrations](migrations.md) | A change that needs installed products to move files or content |
| [Releasing](releasing.md) | Publishing a version |

---

## What is where

```
.claude/                      what gets installed in a product repository
├── skills/{name}/SKILL.md    the skills (/jflow-*): judgment, written for the agent
├── agents/                   jflow-verifier-agent: clean-context, read-only verification
├── specs/                    shared rules the skills read: product definition, requirement,
│                             engineering, database, jiku, discovery, functional analysis, language
├── scripts/
│   ├── jflow.py              the single entry point for everything deterministic
│   ├── jflowlib/             its modules (standard library only)
│   ├── check-discovery.py    mechanical checks of the discovery
│   ├── framework-update.sh   the mechanical half of /jflow-framework-update
│   └── migrate.sh            runs the migrations between two versions
├── templates/                discovery templates, AGENTS.md; documents for people under es/ and en/
├── hooks/                    pre-compact and session-resume: resume a skill after compaction
├── migrations/               migrations between versions (README.md has the contract)
├── settings.json, CLAUDE.md  merged into the product's own files, not copied over them
├── METHODOLOGY.md            the one-page summary installed with the product
├── CHANGELOG.md              the changelog of jiku flow (Keep a Changelog, English)
└── VERSION                   the version, and nothing else
install.sh                    the installer (curl | bash); delegates to `jflow.py install`
docs/                         documentation for users of jiku flow
rules/skill.md                mandatory rules for every skill
templates/skill.md            the structure every skill follows
contributing/
├── tests/run.py              the fast tests: scripts and installer, no Jiku, no model
├── fixtures/                 closed discoveries and briefs of sample products (turnero, avisos, …)
└── sim/                      simulated sessions: a skill run end to end against a simulated user
```

Everything under `.claude/` ships to products. `rules/`, `templates/`, `docs/` and `contributing/` do
not.

---

## Principles a change must respect

1. **Deterministic work goes in `jflow.py`, judgment in skills.** If a step can be computed (parse,
   index, check, allocate an ID, move a state, build a table, talk to Jiku), it is a `jflow.py` command
   and the skill calls it. A skill never describes in prose a procedure a script can run.
2. **Skills, specs, templates for agents and the verifier are written in English.** They tell the
   agent to talk to the user in the user's language.
3. **Follow [`.claude/specs/language.md`](../.claude/specs/language.md).** What people of the product
   read (Jiku, the discovery, `README.md`, `docs/`, `CHANGELOG.md`) is in the product language; git,
   code, identifiers and agent documents are in English; the definition (`_jflow/prd/`) has English
   structure and content in the product language.
4. **Structural names live in [`jflowlib/lang.py`](../.claude/scripts/jflowlib/lang.py), and both
   languages must keep working.** A heading, column or fixed value a script reads or writes goes into
   `TERMS` with its English and Spanish names. Code reads with `canon()`/`Sections` and writes with
   `say()`/`localize()`; it never hard-codes a Spanish string. A product in Spanish and a product in
   English must both pass the tests.
5. **Never break traceability IDs.** Criteria, rules, invariants, guarantees, decisions and NFRs are
   cited by stable IDs (`CAN-03`, `INV-02`, `DEC-04`, `812-AC-01`); tests carry them in brackets
   (`[CAN-E1]`), and coverage, evidence, `spec check` and `spec diff` rely on that. Do not change an ID
   format, reuse an ID, or rename a column that holds them without updating every reader and writer.
6. **A skill change that breaks installed products ships a migration.** See [Migrations](migrations.md).

---

## How a change flows

1. **Branch** from `main`: `feat/…`, `fix/…`, `docs/…`.
2. **Change.** Skills: follow [Creating skills](creating-skills.md). Scripts: add the command to
   `jflow.py` and its logic to `jflowlib/`.
3. **Run the fast tests**:
   ```bash
   python3 contributing/tests/run.py
   ```
   Add a test when you add or change a command. Use a fixture from
   [`contributing/fixtures/`](fixtures/); never run scripts against this repository.
4. **Run simulated sessions** when the behaviour of a skill changes (what it asks, decides or writes):
   see [Testing](testing.md) and [`contributing/sim/`](sim/). They cost model tokens; a script-only
   change does not need them.
5. **Update the documentation**: [`docs/`](../docs/) if users see the change, `.claude/METHODOLOGY.md`
   if the summary changes, and an entry under `## [Unreleased]` in `.claude/CHANGELOG.md` (Added,
   Changed, Fixed, Removed).
6. **Open a PR** against `main` with what changed, why, and how you tested it (test output, the
   sessions you ran).

---

## Code style

- **Python: standard library only**, 3.9 or later. No third-party packages, no YAML library (`md.py`
  has a minimal reader for the subset jiku flow writes).
- **English** identifiers, comments, docstrings, commit messages and command output.
- Each `jflowlib` module starts with a docstring saying what it owns and which spec it implements.
- `jflow.py` commands print observations one per line and exit non-zero when there are any; checks
  name each observation with a code (`[S10]`, `[P1]`) so skills and tests can match them.
- Bash scripts: `set -e`, functions, their own `log_*` helpers; no `source` of other scripts.
- Keep Jiku out of the tests: `JFLOW_JIKU_DRY_RUN=1` prints what would be sent instead of sending it.
