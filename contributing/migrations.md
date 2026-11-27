# Migrations

A migration moves an installed product from one version of jiku flow to the next when a change cannot
be applied by just replacing the files of `.claude/`: renaming a folder of `_jflow/`, changing a field
of `project.yaml`, reshaping a document. The full contract is in
[`.claude/migrations/README.md`](../.claude/migrations/README.md); the runner is
[`.claude/scripts/migrate.sh`](../.claude/scripts/migrate.sh).

The chain starts at **1.0.0**. There are no migrations yet; number new ones from `001`
(`001-rename-something.sh`, `002-reshape-something.md`).

---

## When they run

`/jflow-framework-update` installs the new files and then runs `framework-update.sh migrate`, which runs
`migrate.sh` in the product:

1. `PROJECT_VERSION` = `.claude/.jflow-version` (the version the product is at). If it is missing, the
   installed `VERSION` is taken, so nothing runs.
2. `WORKFLOW_TARGET` = `.claude/VERSION` (the version just installed).
3. Every `NNN-*.sh` whose target satisfies `PROJECT_VERSION < target <= WORKFLOW_TARGET` runs, in file
   name order.
4. Every `NNN-*.md` in the same range is listed in `.claude/agent-migrations-pending.md`.
5. `.jflow-version` is set to `WORKFLOW_TARGET`.

A fresh install writes `.jflow-version` with the installed version, so it runs no migrations. If the
project is already newer than the installed version, `migrate.sh` warns and runs nothing.

## Script or agent

| Type | File | Use when | Runs |
|---|---|---|---|
| **Script** | `NNN-name.sh` | The change is mechanical: move files, edit YAML, delete folders | `migrate.sh` executes it |
| **Agent** | `NNN-name.md` | The change needs interpretation: infer content, choose a layout, resolve a conflict | Listed in `agent-migrations-pending.md`; the agent runs it during the same `/jflow-framework-update`, which deletes the file once all are done |

Choose agent whenever a script would have to **guess**: a script that invents a value produces a
document nobody can tell apart from a real decision.

Targets are declared differently:

```bash
# NNN-name.sh
TARGET_VERSION="1.2.0"
```

```markdown
---
target_version: "1.2.0"
requires: "_jflow/prd/"          # optional: a path that must exist for it to apply
description: "One line shown to the user in the pending list"
---

# Migration NNN: Title

## Purpose      what changed and why a script cannot do it
## Execution    numbered steps; step 0 detects "already applied" and stops
```

An agent migration is a prompt: it must say how to detect it already ran, what to do per file, and
where to stop and ask. If it rewrites documentation people read, it shows the proposed changes for
review in one batch instead of editing silently.

## Rules for writing one

1. **Idempotent.** It can run twice without harm: check whether the change is already applied first.
2. **Self-contained.** It runs as `bash file.sh` in its own process and inherits nothing: define your
   own `log_*`, colours and paths, and call your own `main` at the end.
3. **Exit non-zero on failure.** The runner stops the whole chain at the first failed migration.
4. **Migrate data completely before removing the old structure.**
5. **Register it** in the "Migration Files" section of `.claude/migrations/README.md`, and mention it in
   the CHANGELOG entry so users know the update changes their files.

## The reachability rule

A migration whose target is **above** `.claude/VERSION` never runs and nothing warns: `WORKFLOW_TARGET`
is that file. That is fine for a change still under test (it stays dormant until a release reaches it),
but it must be deliberate. A release that ships new migrations sets `VERSION` to at least their highest
target; see [Releasing](releasing.md). Never lower `VERSION`.

## Invariants of `migrate.sh`

Each of these once caused migrations to be lost silently. Do not change them; if you touch the runner,
re-test with a product that skips several versions.

- **Child process, never `source`.** Migrations run with `bash "$migration_file"`. They all define
  `TARGET_VERSION` and `log_*`; sourced, they overwrote the runner's and the chain stopped after the
  first migration. A child process also keeps the runner's `set -e` out of them.
- **The runner's target is `WORKFLOW_TARGET`**, not `TARGET_VERSION`, so no migration can overwrite it.
- **The pending list is cumulative.** `detect_agent_migrations` keeps entries already in
  `agent-migrations-pending.md` that the agent has not run yet. Otherwise a later run rewrote the file
  with a newer range and dropped agent migrations that were never applied.
- Only files named `NNN-*.sh` and `NNN-*.md` are migrations; the README in the same folder is not.

---

## Testing a migration

Never on this repository. In a throwaway copy of a product that **skips more than one migration**:

```bash
tmp=$(mktemp -d) && cd "$tmp" && git init -q
cp -r /path/to/jiku-flow/.claude .                      # the version with the new migrations
mkdir -p _jflow && cp -r /path/to/jiku-flow/contributing/fixtures/turnero/discovery _jflow/discovery
# ...then bring the product files into the shape of the old version the migrations start from
echo "1.0.0" > .claude/.jflow-version                   # a version below every target in the range
bash .claude/scripts/migrate.sh
bash .claude/scripts/migrate.sh                         # second run: idempotent, nothing changes
cat .claude/.jflow-version                              # = .claude/VERSION
cat .claude/agent-migrations-pending.md                 # every .md of the range is listed
```

Check that every script migration in the range ran, that `.jflow-version` reached the target, and
that the product files are in the new shape. For an agent migration, run `/jflow-framework-update`'s
agent step (or ask Claude Code to execute the listed file) on that copy and review the result.

If the migration is mechanical and worth keeping, add a test for it to
[`contributing/tests/run.py`](tests/run.py), next to the installer tests.
