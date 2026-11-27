# Skill Template

Structure template for workflow skills. All skills must follow this format.

---

## File Location

Each skill lives in its own folder:

```
.claude/skills/{skill-name}/SKILL.md
```

Use flat naming with hyphens: `jflow-product-discover`, `jflow-build`, `jflow-status`.

---

## Section Structure

```markdown
---
name: {skill-name}
description: {one-line description}
allowed-tools: "{tool1, tool2, ...}"
argument-hint: "[optional-arg]"
---

# {Skill Name}

## Purpose

## References

## CRITICAL RULES

## Execution

## Output
```

---

## Section Details

### 1. Frontmatter

YAML block at the top. See `rules/skill.md` for the frontmatter rules.

**Minimal:**
```yaml
---
name: jflow-product-discover
description: Define a new product with the user
allowed-tools: "Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion"
---
```

**With arguments:**
```yaml
---
name: jflow-spec
description: Specify a Jiku requirement with the user
argument-hint: "[jiku-requirement-id]"
allowed-tools: "Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion"
---
```

---

### 2. `# {Skill Name}`

Skill title. Use readable name (not slug).

**Examples:**
- `# Define Product`
- `# Specify Requirement`
- `# Direct Change`

---

### 3. `## Purpose`

Description of what the skill does. Must include:

1. **Description** (1-2 lines): What the skill does
2. **Flow** (diagram): Skill steps in visual format
3. **Result**: Final output of the skill
4. **This command does NOT**: List of things it does NOT do (scope delimiter)

**Format:**

```markdown
## Purpose

{1-2 line description of what the skill does}

**Flow:**
\`\`\`
Step 0: ...
  |
Step 1: ...
  |
Step 2: ...
\`\`\`

**Result:** {What the skill produces}

**This command does NOT:**
- {Thing it does NOT do 1}
- {Thing it does NOT do 2}

These are handled in `/{other-skill}`.
```

---

### 4. `## References`

Which shared specifications this skill reads. Skills read specs; they do not adopt roles.

**Format:**

```markdown
## References

**Read [{Spec Name}](.claude/specs/{spec-file}.md)** and apply it.
```

**Available specs:**
- `Product Definition` -> `.claude/specs/product-definition.md` — layout, files, IDs, loading, checks of the definition
- `Requirement Spec` -> `.claude/specs/requirement.md` — specification format, criteria, status, Jiku summary
- `Engineering` -> `.claude/specs/engineering.md` — repository, Make, Compose, testing, contracts, git, versioning
- `Database` -> `.claude/specs/database.md` — schema format and conventions
- `Jiku` -> `.claude/specs/jiku.md` — what the workflow reads and writes in Jiku
- `Discovery` -> `.claude/specs/discovery.md` — conducting the product definition interview
- `Functional Analysis` -> `.claude/specs/functional-analysis.md` — extracting knowledge from the user

If the skill needs no shared spec, omit the section entirely.

**Available agents** (via the `Agent` tool, by `subagent_type`):
- `jflow-verifier-agent` — clean-context, read-only verification of an implementation against its specification

---

### 5. `## CRITICAL RULES`

Critical rules the agent MUST follow. Numbered list.

**Format:**

```markdown
## CRITICAL RULES

1. **{Rule 1}** - {Brief description}
2. **{Rule 2}** - {Brief description}
   - {Sub-point if needed}
3. **{Rule 3}** - {Brief description}
```

**Common rules to include:**
- See `rules/skill.md` for the mandatory and conditional rules

---

### 6. `## Execution`

Skill execution steps. Each step is a `### Step N: {Name}`.

**Format:**

```markdown
## Execution

### Step 0: {Step name}

{Description of what to do}

**0.1 {Sub-step}**

{Detailed instructions}

**0.2 {Sub-step}**

{Detailed instructions}

---

### Step 1: {Step name}

{Continue with same format}
```

**Conventions:**
- Use `---` between steps for visual separation
- Sub-steps with format `**N.M {Name}**`
- Code blocks with triple backtick for user messages
- Indicate `**WAIT for user confirmation.**` when input required

**For interactive/loop-based skills:**

Instead of numbered steps after initialization, use a `### Loop:` section:

```markdown
### Loop: {Loop description}

From this point, respond to whatever the user needs.

**When the user requests {action}:**

#### A. {Sub-flow name}
{Steps}

#### B. {Sub-flow name}
{Steps}
```

---

### 7. `## Output`

List of files the skill generates or modifies.

**Format:**

```markdown
## Output

Files saved to `{folder}`:

- `{path/to/file1}` - {Brief description}
- `{path/to/file2}` - {Brief description}

Each document contains:
- {Content 1}
- {Content 2}
```

**For skills that don't generate files:**

```markdown
## Output

Text output only. No files created or modified.
```

**For interactive skills:**

```markdown
## Output

- Code changes implemented and tested
- Git commit(s) on current branch (only after user approval)
```

---

## Complete Example

```markdown
---
name: product-example
description: Example skill showing the standard structure
allowed-tools: "Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion"
---

# Example Skill

## Purpose

Brief description of what this skill does.

**Flow:**
\`\`\`
Step 0: Initialize
  |
Step 1: Gather Information
  |
Step 2: Generate Document
  |
Step 3: Summary
\`\`\`

**Result:** Document ready for next phase.

**This command does NOT:**
- Do thing X
- Do thing Y

These are handled in `/other-skill`.

## References

**Read [Functional Analysis](.claude/specs/functional-analysis.md)** and apply it.

## CRITICAL RULES

1. **Language** - talk to the user in their language; what people of the product read in the product language; git, code and agent documents in English (see [Language](.claude/specs/language.md))
2. **Save first, then validate** - Save documents, notify user, wait for confirmation
3. **Deterministic work through `jflow.py`** - The commands this skill uses
4. **Do NOT dump full content in chat** - Save to file, show summary, let user review

## Execution

### Step 0: Initialize

Load context and validate prerequisites.

**0.1 Load Context**

```bash
python3 .claude/scripts/jflow.py load --overview
```

---

### Step 1: Gather Information

Ask the user for the required information (in the user's language).

\`\`\`markdown
## Required information

**What is the project name?**
\`\`\`

**WAIT for user response.**

---

### Step 2: Generate Document

**2.1 Create document**

Generate document following template structure.

**2.2 Notify user** (do NOT show full content)

\`\`\`markdown
Document saved: \`docs/example.md\`

It includes:
- Item 1
- Item 2

**Review the file and tell me whether it is right or what to change.**
\`\`\`

**If user requests changes:**
- Edit the file with requested changes
- Notify user again
- Repeat until approved

---

### Step 3: Summary

Present final summary with next steps.

## Output

Files saved to `docs/`:

- \`docs/example.md\` - Main document

Each document contains:
- Frontmatter with metadata
- Content following template structure
```

---

## Creation Checklist

Before finalizing a skill, verify:

- [ ] SKILL.md is in `.claude/skills/{skill-name}/SKILL.md`
- [ ] Folder name matches `name` in frontmatter
- [ ] Frontmatter has `name`, `description`, `allowed-tools`
- [ ] Frontmatter has `argument-hint` only if skill uses `$ARGUMENTS`
- [ ] Correct section structure (Purpose -> References -> Rules -> Execution -> Output)
- [ ] Purpose includes Flow, Result, and "This command does NOT"
- [ ] References has markdown link to spec (no role adoption)
- [ ] CRITICAL RULES includes the mandatory rules from `rules/skill.md`
- [ ] Deterministic steps call `jflow.py` instead of describing the procedure
- [ ] Execution has numbered steps with sub-steps (or Loop for interactive skills)
- [ ] Post-save notifications follow standard format
- [ ] Output lists all generated files (or describes output for interactive skills)
- [ ] No large `!cat` pre-injections (only lightweight existence checks)
