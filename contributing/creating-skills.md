# Creating and editing skills

A skill is one workflow the agent runs when the user types `/jflow-…`. Before creating or editing one,
read the two sources this page summarises:

- [`templates/skill.md`](../templates/skill.md): the structure, with a complete example.
- [`rules/skill.md`](../rules/skill.md): the mandatory and conditional rules.

---

## Location and naming

```
.claude/skills/{skill-name}/SKILL.md
```

- Flat names with hyphens, prefixed `jflow-` (`jflow-build`, `jflow-product-discover`). The prefix is
  how the hooks recognise a jiku flow skill and how installed products tell them from their own.
- The `name` in the frontmatter equals the folder name.

## Frontmatter

```yaml
---
name: jflow-example
description: One line, shown in autocomplete
allowed-tools: "Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion"
argument-hint: "[jiku-requirement-id]"   # only when the user knows what to pass
---
```

- `allowed-tools`: only what the skill needs. Read-only: `"Read, Glob, Grep, Bash"`. Add `Agent` to
  delegate, `WebSearch, WebFetch` to research.
- No `model:`: skills run on the session's model.
- Jiku ids are plain numbers (`812`).

## Structure

Sections in this order:

1. **`# {Skill Name}`**: a readable title.
2. **`## Purpose`**: one or two lines, a **Flow** diagram of the steps, the **Result**, and **This
   command does NOT** (the scope limit, naming the skill that does it).
3. **`## References`**: links to the specs it applies, as markdown links
   (`**Read [Requirement Spec](.claude/specs/requirement.md)** and apply it.`). Skills read specs; they
   do not adopt roles. Omit the section if no spec applies.
4. **`## CRITICAL RULES`**: a numbered list, including the mandatory rules below.
5. **`## Execution`**: `### Step N: {Name}` with sub-steps `**N.M {Name}**`, `---` between steps, and
   `**WAIT for user confirmation.**` where input is needed. Loop-based interactive skills use
   `### Loop:` instead.
6. **`## Output`**: the files it creates or changes, or "Text output only".

## Mandatory rules

Put these in `## CRITICAL RULES` (exact wording in [`rules/skill.md`](../rules/skill.md)):

1. **Language.** The skill is written in English. It talks to the user in the user's language; what
   people of the product read goes in the product language; git, code and agent documents in English.
   See [`.claude/specs/language.md`](../.claude/specs/language.md). Use the structural names of
   `jflow.py lang-terms`, never your own translation.
2. **Deterministic work through `jflow.py`.** List the commands the skill uses. If it needs a new
   deterministic operation, add a command to `jflow.py` (logic in `jflowlib/`, standard library only)
   instead of describing the procedure.
3. **Content to files, not to chat.** Save, show a summary, let the user review the file, with its
   absolute path as a link. Interactive skills save first, then validate with `AskUserQuestion`.
4. **Fixed locations.** Use the paths of the [Product Definition](../.claude/specs/product-definition.md)
   spec directly.

Conditional rules, when they apply: **ABORT if {condition}**, **{Argument} required**, **Extract, don't
invent** (skills that read code or documents into the definition), **Research before choosing** (skills
that pick libraries or tools).

## Kinds of skill

| Kind | Rule |
|---|---|
| Interactive (`jflow-product-discover`, `jflow-spec`, `jflow-release`) | The user decides every rule; what is written is confirmed with `AskUserQuestion` |
| Autonomous (`jflow-product-scaffold`, `jflow-product-brownfield`, `jflow-build`, `jflow-fix`) | Only the git and state checks at the start may ask; after that, never ask about the process. They end with `jflow-verifier-agent` and are done only on APPROVED |
| Read-only (`jflow-status`) | Never writes, in the repository or in Jiku |

Every skill that works on a requirement checks git (`jflow.py git-check`) and the requirement's Jiku
state at the start, and warns and asks when they are not the expected ones.

## Pre-injection

`` !`command` `` lines run before the skill loads. Use them only for lightweight checks (`ls`,
`grep -H "^status:"`, `git status --porcelain | head`). Never `cat` a document: the skill reads it at the
step that needs it, so it does not fill the context on every run.

---

## Testing a skill

1. **Check the structure** against the checklist at the end of
   [`templates/skill.md`](../templates/skill.md).
2. **Run the fast tests** (`python3 contributing/tests/run.py`) if you added or changed a `jflow.py`
   command the skill uses; add a test for it.
3. **Run it in a throwaway product**: copy `.claude/` into a new git repository with a fixture from
   [`contributing/fixtures/`](fixtures/) (its discovery goes to `_jflow/discovery/`), point
   `_jflow/project.yaml` at a test Jiku project, and run the skill. Set `JFLOW_JIKU_DRY_RUN=1` (or
   `jiku.writes: false`) to see what would be written to Jiku without writing it.
4. **Run a simulated session** when the skill's behaviour changes: [`contributing/sim/`](sim/) runs the
   skill end to end with a simulated user answering from a scenario. See [Testing](testing.md).
5. **Document it**: list the skill in [`docs/`](../docs/) and `.claude/METHODOLOGY.md`, and add an entry
   under `## [Unreleased]` in `.claude/CHANGELOG.md`.

Do not add a skill for maintaining jiku flow itself (a release skill, for example) to `.claude/skills/`:
everything there is installed in every product.
