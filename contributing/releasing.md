# Releasing jiku flow

A release is a `vX.Y.Z` tag on `main`. `install.sh` and `/jflow-framework-update` install the highest
`vX.Y.Z` tag by default, so **pushing a tag publishes the version** to everyone who installs or updates.

This process is for jiku flow itself. Products built with jiku flow release with `/jflow-release`.

---

## Choosing the version

[Semantic Versioning](https://semver.org/), from the point of view of a product that has jiku flow
installed:

| Type | When | Examples |
|---|---|---|
| **MAJOR** (X.0.0) | Incompatible: products or users must change something | Removing or renaming a skill or a `jflow.py` command; changing the layout of `_jflow/`; changing a document format or an ID format so that existing documents no longer parse |
| **MINOR** (0.X.0) | New, compatible functionality | A new skill, spec, template, command or check; a significant improvement to a skill |
| **PATCH** (0.0.X) | Fixes and small adjustments | Bug fixes in skills or scripts, wording, documentation, configuration |

A change that ships a migration is at least MINOR.

---

## Steps

### 1. Update the documentation

- [`README.md`](../README.md) and [`docs/`](../docs/) describe the current behaviour; the skills listed
  match `.claude/skills/`.
- [`.claude/METHODOLOGY.md`](../.claude/METHODOLOGY.md) matches the skills and flows.

### 2. Update the CHANGELOG

In [`.claude/CHANGELOG.md`](../.claude/CHANGELOG.md) ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
English), turn `## [Unreleased]` into the version and open a new empty one above it:

```markdown
## [Unreleased]

## [1.2.0] - 2026-12-01

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Removed
- ...
```

Keep only the categories that apply. Be concise; **bold** what users must notice, above all an update
that changes their files (a migration) or needs an action from them. Users read this section in
`/jflow-framework-update` before deciding to update.

### 3. Bump `VERSION`

`.claude/VERSION` holds only the number (`1.2.0`), with no spaces or extra lines. Never lower it.

### 4. Check that the migrations are reachable

`migrate.sh` runs a migration only if its target is `<= VERSION`; a higher target never runs and nothing
warns (see [Migrations](migrations.md)).

```bash
cat .claude/VERSION
grep -h "^TARGET_VERSION=" .claude/migrations/*.sh 2>/dev/null | sort -u
grep -h "^target_version:" .claude/migrations/[0-9]*.md 2>/dev/null | sort -u
```

- If the release includes new migrations, `VERSION` must be `>=` their highest target.
- A target above `VERSION` on purpose (a change still under test) is fine: it stays dormant. Make sure it
  is deliberate, and do not raise `VERSION` just to activate it.

### 5. Run the tests

```bash
python3 contributing/tests/run.py
```

All green. If skills changed since the last release, the simulated sessions in
[`contributing/sim/`](sim/) should have been run on the PRs that changed them (see
[Testing](testing.md)).

### 6. Commit and tag

```bash
git add -A && git commit -m "chore: release vX.Y.Z"
git tag -a vX.Y.Z -m "jiku flow X.Y.Z"
git push --follow-tags
```

### 7. The GitHub release

Pushing the tag is enough: the [Release workflow](../.github/workflows/release.yml) checks that the tag
matches `.claude/VERSION`, runs the tests, and creates the release with the CHANGELOG section of the
version as its notes (`.github/scripts/release-notes.py`). Check it in the repository's Actions tab. If
it fails, fix the cause, and run it again by hand (Actions → Release → Run workflow, with the tag).

### 8. Check the install

In a throwaway git repository:

```bash
curl -fsSL https://raw.githubusercontent.com/gravadigital/jiku-flow/main/install.sh | bash
cat .claude/VERSION        # the new version
```

And in a product on the previous version, `/jflow-framework-update` offers the new one.
