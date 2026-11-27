# Working on jiku flow

This repository is jiku flow itself: the methodology that gets installed into a product's `.claude/`.
Start with [contributing/README.md](contributing/README.md); the architecture is in
[contributing/how-it-works.md](contributing/how-it-works.md).

## What is where

- `.claude/` — what `install.sh` installs: skills, the verifier agent, specs, templates, hooks,
  `scripts/jflow.py` + `scripts/jflowlib/`, migrations, `VERSION`, `CHANGELOG.md`. Note that this
  repository's own `.claude/CLAUDE.md` and `settings.json` are the ones shipped to products.
- `install.sh` — the installer; `docs/` — documentation for users; `contributing/` — for contributors:
  tests, fixtures, the simulator, and how to create skills, write migrations and release.
- `rules/skill.md` and `templates/skill.md` — mandatory rules and structure of every skill.

## Rules

1. **Language.** Everything in this repository is English: skills, specs, code, comments, docs,
   commits. The products jiku flow builds follow `.claude/specs/language.md`. Talk to the user in the
   language they write in.
2. **Deterministic work goes in `jflow.py`, judgment in the skills.** A skill never does by prose what a
   script can do repeatably.
3. **Both structure languages keep working.** Structural names of the documents people read live in
   `.claude/scripts/jflowlib/lang.py`; a new heading, column or fixed value goes there in English and
   Spanish.
4. **Before creating or editing a skill**, read `templates/skill.md` and `rules/skill.md`
   (see [contributing/creating-skills.md](contributing/creating-skills.md)).
5. **Test every change** with `python3 contributing/tests/run.py`. Scripts are tried on throwaway
   copies built from `contributing/fixtures/`, never on this repository. A change to a skill's
   behaviour is tried with a simulated session (see [contributing/testing.md](contributing/testing.md)).
   Simulated sessions that write to Jiku use a dev instance and a new project, never production.
6. **Migrations** follow [contributing/migrations.md](contributing/migrations.md): idempotent,
   self-contained, run with `bash` (never `source`), registered in `.claude/migrations/README.md`.
7. **Releases** follow [contributing/releasing.md](contributing/releasing.md). Never lower
   `.claude/VERSION`; a migration with a target above it is unreachable until a release reaches it.
8. **Add an entry to `[Unreleased]`** in `.claude/CHANGELOG.md` for every user-visible change.
