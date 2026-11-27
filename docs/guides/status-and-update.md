# Status, releases and updates

## See where things are — `/jflow-status`

Read-only: it never writes to the repository or to Jiku. It shows:

- **The product's stage:** not defined, discovery in progress, discovery closed without a base, or
  base built — with the next skill to run.
- **Open incidencias,** with the requirement each one was seen in.
- **Every open requirement grouped by its next action:** drafts to specify, to specify, specified and
  waiting for approval, to build, queued waiting for another requirement, being built (with its branch),
  merged but not released, released but not moved to Revisión, in review.
- **What to release:** what `dev` has that `main` does not.
- **Inconsistencies** between Jiku and git (for example, a requirement in Desarrollo with no branch).

If Jiku does not answer, it shows only git. The raw data: `python3 .claude/scripts/jflow.py status`.

## Ask about the product

There is no separate skill: ask Claude in the repository. The product's `AGENTS.md` tells it to load
the part of the definition it needs and answer citing IDs; for a new idea, it tells you which rules and
decisions it touches and whether it would be a requirement (`/jflow-spec`) or a small change
(`/jflow-fix`).

## Release a version — `/jflow-release`

Also triggered by saying "release", "new version" or similar in a product repository.

1. **Checks** that you are on `dev`, up to date, with something to release.
2. **Runs the full regression locally:** `make check`, the whole end-to-end suite (browsers, or the
   Android emulator for a mobile app) and `make test-perf` if the product has load-tested requirements.
   These levels do not run in each MR's CI. If something fails, it stops before merging or tagging,
   records it as an incidencia in Jiku and tells you the version is not ready. If your machine cannot
   run a level (no Docker, no KVM), it asks; it never skips one silently.
3. **Lists the requirements** merged in `dev` and not in `main`, with the open incidencias, and
   suggests a semantic version: **major** if a contract with external integrators changed
   incompatibly, **minor** if there are features, **patch** if there are only fixes. You confirm the
   version — the only confirmation — and whether the CHANGELOG lists the open incidencias as known
   issues.
4. **Writes the CHANGELOG section** on `dev`, in the product language, from the Jiku titles and the
   entries written by hand under `[Unreleased]`.
5. **Merges `dev` into `main`, tags `vX.Y.Z` and pushes.** On the first release it creates `main`.
   If `main` is protected, it leaves everything ready and tells you to open the MR from `dev` to `main`
   and tag after merging. The tag's pipeline builds the images and each client (a signed mobile app,
   for example); the CI secrets it needs are described in the product's operations guide.
6. **Comments on each released requirement** in Jiku with its version. It does not change states:
   moving to Revisión happens after the deploy, and that is yours.

It does not deploy.

## Update jiku flow — `/jflow-framework-update`

Run it inside Claude Code, in the product repository. It updates to the latest release, or to the
version you name (`/jflow-framework-update v1.2.0`):

1. Downloads the version and compares it with the installed one (`.claude/.jflow-version`).
2. Summarizes what changes, from the CHANGELOG.
3. Lists what the update would do. Only jiku flow's files change — the ones in
   `.claude/.jflow-manifest`, its entries in `settings.json` and its block in `.claude/CLAUDE.md`;
   your own skills, agents and settings are never touched. If you modified one of jiku flow's files,
   you choose: take the new version (yours is kept as `{file}.bkp`), keep yours (the new one is saved
   as `{file}.new`), or see the diff first. A file the new version drops but you changed is left in
   place.
4. Backs up the current `.claude/` to the system's temp folder, and updates.
5. Runs the migrations between the two versions: the mechanical ones by script, and the ones that need
   judgment by Claude.
6. Verifies and reports. Nothing is committed: review `git status` and commit
   (`chore: update jiku flow to X.Y.Z`).

To install jiku flow in a repository that does not have it, use `install.sh`
([Install and set up](install.md)).
