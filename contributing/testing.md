# Testing jiku flow

jiku flow is tested at three levels. They differ in cost by orders of magnitude, so pick the cheapest
one that can see the change.

| Level | What | Cost | Needs |
|---|---|---|---|
| 1. Fast tests | `jflow.py`, `check-discovery.py`, `install.sh` and the update, on fixtures | Free, ~30 s | Python 3 and git |
| 2. Simulated sessions | A skill run end to end by Claude, with a simulated user answering its questions | USD per run, minutes to hours | Node, Anthropic credentials, a Jiku dev instance (or `fakejiku`) |
| 3. Measuring the discovery | `/jflow-product-discover` run several times and scored by a judge against a reference | ~10 USD and ~25 min per run | Same as level 2, no Jiku |

**Which level for which change:**

| Change | Level |
|---|---|
| A script in `.claude/scripts/` (`jflow.py`, `jflowlib/`, `check-discovery.py`), `install.sh`, `framework-update.sh`, a template's structure | 1, and add a test for it in `contributing/tests/run.py` |
| A skill's wording, a spec, an agent, a template's content | 1 (the scripts still read what the skill produces), then 2 on the skill you changed |
| The discovery skill, the discovery spec or its templates | 1, then 3 |
| The Agent SDK version in `contributing/sim/package.json` | `canary.mjs` (below), then a short level 2 run |
| A migration | See [migrations.md](migrations.md): a throwaway copy that skips several versions |

Fixtures live in `contributing/fixtures/{turnero,avisos,inventario,turnos-movil}/`: each has the
client's `brief.md`, a closed discovery (`discovery/*.md`) and the `plan.json` of its initial plan.
Turnero also has `reference/`: the discovery as it should end up (`reference/discovery/`) and
`reference/huecos.md`, the client's answers to everything the brief does not say. Fixtures, personas
and judge prompts are in Spanish, the default product language; the scripts read both languages.

---

## 1. Fast tests

```bash
python3 contributing/tests/run.py            # everything
python3 contributing/tests/run.py scripts    # only the tests whose name contains "scripts"
python3 contributing/tests/run.py install    # only install and update
```

**Run them before every change and before every commit.** Standard library only, no Jiku, no model:
each test builds a throwaway repository in a temporary folder from a fixture, runs the scripts there
with `JFLOW_JIKU_DRY_RUN=1`, and checks the result. What they cover:

- **Scripts on fixtures:** `discovery-check` on Turnero; `init-project` + `def-base` + `def-check` (the
  base definition, its English structure, the Spanish operations guide, `next-id`); `plan-build` and
  `plan-check` on Turnero in **Spanish and English** (same structure translated, same observations) and
  on every other fixture with a `plan.json`; the specification drafts, `amend`, the specification
  status line and the CHANGELOG section round-tripping in both languages.
- **Install and update:** `install.sh` into an empty repository (files, `.jflow-version`, the
  `CLAUDE.md` block, a second install refused); installing next to the user's own `.claude/` (their
  settings, hooks, skills and `CLAUDE.md` kept and merged); `framework-update.sh` from one tagged
  version to the next with local changes (detect, keep, remove, migrate, verify). A local git
  repository stands in for the GitHub remote.

A new script command or a new check comes with its test here. A test that needs a model or Jiku does
not belong here: it is level 2.

---

## 2. Simulated sessions

`contributing/sim/session.mjs` runs one interactive skill in a workspace through the Claude Agent SDK,
as a person would in Claude Code:

- The skill runs in a new session (`settingSources: ["project"]`, so the workspace's `.claude/` is
  what runs), with `--model` (default `opus`) and a budget cap (`--budget`, USD).
- Every `AskUserQuestion` is intercepted and answered by a **simulated user**: a second session
  (`--sim-model`, default `sonnet`, no tools) that knows **only** the persona file. What the persona
  does not cover it answers with the recommended option and records as *unplanned*. When the agent ends
  its turn with a plain message, the simulated user answers that too; progress notices are answered
  "Seguí." after a wait (`--notice-wait`, default 120 s), as a person waiting for a build would.
- Permissions are bounded: writes only inside the workspace, Bash only with the programs in `ALLOWED`
  (extend it if a skill legitimately needs another one: a denied command shows up in `run.json`).
- `--done "CMD"` is a shell command run in the workspace after every agent turn; when it exits 0 the
  run ends. `contributing/sim/done.py` has the usual ones: `plan`, `ready ID`, `branch PATTERN`,
  `tag`, `fake-write`. Without a `--done` that can succeed, the run ends only at a cap.
- It leaves in `--out` (default `contributing/sim/runs/session-{date}/`, git-ignored) `log.jsonl` (every
  question, answer and agent message) and `run.json` (cost of the skill and of the simulator, minutes,
  turns, questions, unplanned answers, denied tools, whether `--done` succeeded).

### Prerequisites

1. Node 18 or later, and once: `cd contributing/sim && npm ci`.
2. Anthropic credentials for the Agent SDK (`ANTHROPIC_API_KEY`, or a logged-in Claude Code).
3. For skills that write to Jiku: a **Jiku dev instance** configured in `~/.config/jiku/config.dev.yaml`
   and logged in (`jiku --config ~/.config/jiku/config.dev.yaml login`; `... doctor` must answer), and
   **a new Jiku project per run and product**, created by hand. Never a production instance: the
   default `jiku` configuration of a machine usually points to production, and `jflow.py` only uses the
   instance named in the workspace's `_jflow/project.yaml`.
4. For read-only flows, `--fake-jiku DATA.json` instead: `contributing/sim/fakejiku/jiku` goes first on
   `PATH`, answers the reads from the file and records every write in `{out}/fake-jiku.json.writes.jsonl`
   without sending it. Writes are not applied, so a skill that reads back what it wrote will not see it.

Personas with `{{JIKU_PROJECT}}` (the `persona-discover.md` and `persona-brownfield.md` files) need
`--jiku-project ID`: the id of the project you created for this run.

### Workspaces

Workspaces go in `contributing/sim/runs/` (git-ignored). The framework is copied from the committed
`.claude/` (`git archive`), so **commit the change you want to try first**.

A new product from a brief, with a bare repository as its remote (the `done.py` checks look at what
was pushed):

```bash
JF=$PWD                                   # the jiku flow checkout
P=avisos                                  # avisos | inventario | turnos-movil
W=$JF/contributing/sim/runs/ws-$P
git init -q --bare $W.git && mkdir -p $W/docs && cd $W && git init -q && git remote add origin $W.git
git -C "$JF" archive HEAD .claude | tar -x
cp "$JF/contributing/fixtures/$P/brief.md" docs/brief.md
cd "$JF"
```

A built product from a closed discovery (every part of its plan already built), linked to the fake Jiku (project 900 is the one in
`scenarios/turnero/fake-jiku.json`):

```bash
JF=$PWD; W=$JF/contributing/sim/runs/ws-turnero
mkdir -p $W && cd $W && git init -q -b main
git -C "$JF" archive HEAD .claude | tar -x
mkdir _jflow && cp -r "$JF/contributing/fixtures/turnero/discovery" _jflow/discovery
python3 .claude/scripts/jflow.py init-project --project-id 900 --instance dev
python3 "$JF/contributing/sim/built_definition.py" .   # the whole product, as if every part were built
git add -A && git commit -qm "chore: built definition" && git checkout -qb dev
cd "$JF"
```

### Scenarios

Personas live in `contributing/sim/scenarios/`: the generic ones at the top level, the product-specific
ones in a folder per fixture. They follow the life of a product: discover, scaffold, specify and build
its parts, fix, release, and the contradicting change.

```bash
S=contributing/sim/scenarios; D="python3 $JF/contributing/sim/done.py"

# Specify a requirement against the fake Jiku (no real Jiku, no writes): Turnero #9003
node contributing/sim/session.mjs --ws $W --prompt "/jflow-spec 9003" \
  --persona $S/turnero/persona-9003.md --fake-jiku $S/turnero/fake-jiku.json \
  --done "$D fake-write" --budget 15

# Discover a product from its brief (real Jiku dev, new project 123): discovery, plan, requirements
node contributing/sim/session.mjs --ws $W --prompt "/jflow-product-discover docs/brief.md" \
  --persona $S/$P/persona-discover.md --jiku-project 123 --done "$D plan" --budget 60

# Scaffold the base requirement (its id is in the plan's created.json: `jflow.py workdir`)
node contributing/sim/session.mjs --ws $W --prompt "/jflow-product-scaffold $BASE" \
  --persona $S/persona-scaffold.md --done "$D branch 'feat/$BASE-*'" --budget 80

# Specify a part of the plan: the generic persona plus what the product's persona knows
cat $S/persona-specify-part.md $S/$P/persona-discover.md > contributing/sim/runs/persona-part-$P.md
node contributing/sim/session.mjs --ws $W --prompt "/jflow-spec $ID" --jiku-project 123 \
  --persona contributing/sim/runs/persona-part-$P.md --done "$D ready $ID" --budget 20

# Fix, release
node contributing/sim/session.mjs --ws $W --prompt "/jflow-fix $ID <what is wrong>" \
  --persona $S/persona-fix.md --done "$D branch 'fix/$ID-*'" --budget 15
node contributing/sim/session.mjs --ws $W --prompt "/jflow-release" \
  --persona $S/persona-release.md --done "$D tag" --budget 25
```

Between steps, do what a person would: merge the pushed branch into `dev` of the workspace (and push
it), and put the requirement in the state the next skill expects (`jflow.py jiku state ID VALUE`).
`/jflow-build` asks nothing, so it needs no simulated user: run it headless in the workspace
(`claude -p "/jflow-build ID" --permission-mode acceptEdits --allowedTools …`).

The other personas:

- `persona-specify-gaps.md` (and `avisos/persona-specify-gaps.md`): `/jflow-build` stopped because the
  specification left behaviour undecided; run `/jflow-spec ID` with the stop report in the prompt.
- `{product}/persona-specify-contradiccion.md`: create in Jiku a requirement that contradicts the
  discovery (`jflow.py jiku new --type mejora --state planificacion --title … --description …`; the
  persona says what it asks for), then `/jflow-spec ID`. The agent must notice the contradiction and
  ask before reverting the earlier decision.
- `avisos/persona-brownfield.md`: `/jflow-product-brownfield` on an existing Avisos repository without
  `_jflow/` (for example one built by an earlier chain of runs, with `_jflow/` removed).

### Cost

The budget caps above are what those skills have needed; a run usually costs less. The simulator adds
a few percent on top. A product's full chain (discover, scaffold, every part, fix, release) costs
hundreds of USD and several hours: run single steps on a prepared workspace whenever you can.

### Judging the result

There is no automatic score at this level. Read, in this order:

1. The last lines of the output and `run.json`: `done` true, the `result`, `denied` (a skill blocked by
   the permissions is a problem of the simulator, not of the skill, unless the command is wrong).
2. `unplanned`: questions the persona did not cover. A few are normal. Many mean the skill asks what it
   should infer, or the persona is incomplete.
3. `log.jsonl`: are the questions the ones a person should answer, one decision at a time, with a
   recommendation? Does the skill repeat questions, or confirm several sections at once?
4. The workspace and Jiku: what the skill wrote, against its spec. For `fakejiku`, the writes file.
5. If the simulated user got something wrong (chose the "closest" option instead of what the persona
   says), the run tells you about the persona, not the skill: fix the persona and repeat.

To compare two versions of a skill, run each at least twice on the same workspace and look at the
same things; one run proves nothing.

---

## 3. Measuring the discovery

The discovery is where the user participates the most, so it is the one skill measured with numbers:
tokens, time and the quality of the result. A simulated client answers from the Turnero brief and
`reference/huecos.md`, and a judge scores the documents against `reference/discovery/`.

```bash
git commit -am "discovery: …"           # every run is tied to the workflow commit it measured
contributing/sim/measure.sh 2            # two runs in parallel, each judged; prints the table
python3 contributing/sim/compare.py before=discovery__YYYYMMDD-HHMMSS after=discovery__YYYYMMDD-HHMMSS
```

`measure.sh` runs `npm ci` if `node_modules` is missing. Defaults: the skill with Opus
(`--skill-model`), the simulator with Sonnet (`--sim-model`), the judge with Opus, a 40 USD cap per run
(`--budget`). No Jiku: the workspace links a fake project with writes off and `fakejiku` on `PATH`, and
the run ends when every discovery document is closed, before the plan.

### The pieces

| Piece | What it does |
|---|---|
| `discovery.mjs` | Builds a workspace (a git repository with the brief in `docs/`, the repo's `.claude/` as it is, `main` and `dev`, a fake Jiku link) and runs `/jflow-product-discover` there with the simulated client. Leaves `contributing/sim/runs/discovery__{date}/`: `workspace/`, `log.jsonl`, `run.json` (cost, time, turns, tokens per model, state of every document, `check-discovery --final`, `workflow_commit`, `workflow_dirty`) |
| Simulated client | A separate session with no tools that knows **only** the brief and `huecos.md`. Answers what they say; what neither covers it answers with the recommended option and records as unplanned. In a section confirmation it asks for changes if an assumption contradicts the brief or a gap |
| `judge.mjs` | Scores a run: coverage over a fixed list of the reference's definitions, contradictions with the brief or a gap, inventions (what comes from neither the brief nor any answer), form violations. It gets the discovery spec and templates so it does not flag what a rule mandates. Writes `judge.json` |
| `items.py` | Extracts the fixed list of definitions from the reference (functional, domain, technical, schema), so coverage always has the same denominator |
| `measure.sh` | N runs in parallel, the judge on each, the table |
| `compare.py` | The comparison table of any runs still on disk |
| `canary.mjs` | Minimal check that the SDK can answer an `AskUserQuestion` (Haiku, 0.5 USD): `cp -r contributing/sim/canary-ws /tmp/canary && node contributing/sim/canary.mjs /tmp/canary` |

### The columns

| Column | What it is | How to read it |
|---|---|---|
| `cost`, `min` | USD of the skill (without simulator or judge) and wall-clock minutes | Tokens and time |
| `questions` | Questions the user answered | The load on the user |
| `confirm` | Section confirmations (one per section and per block) | Nearly fixed: depends on the number of sections |
| `content` | The rest: what the user had to decide | **The real load.** Lowering it without losing quality is an improvement |
| `assumptions` | Assumptions listed in confirmations (maximum in one section) | The maximum per section must not exceed 5 |
| `unplanned` | Questions neither the brief nor the gaps covered | New gaps the skill found (see "Maintaining the reference") |
| `coverage` | % of the reference present: functional / domain / technical / schema | Higher is better |
| `contra` | Definitions that contradict the brief or a gap | **The most important metric**: an error that reaches the build |
| `inv` | Definitions that come from neither the brief nor any answer | Invented by the agent |
| `form` | Rule violations: reasons instead of definitions, repeated values, assumptions that add rules, batched confirmations, screen flows | Lower is better |
| `check` | Observations of `check-discovery --final` | Must be `ok` |

A run is **valid** if it closed every document within budget. An invalid run is not compared.

### How to decide

**Measure your own baseline before a change**: the current skill, with the current judge, on your
machine. Then:

1. **At least two runs per version.** Two identical runs of the skill vary a lot (inventions can go
   from a handful to three times that). One run cannot support any claim.
2. **The judge's noise is 1 to 3 points** (judging the same run twice). Cost and time vary about 20%.
3. **Fix the decision rule before measuring.** For example: "the new version wins if it lowers
   contradictions or inventions beyond the noise, without raising cost more than 20%".
4. **Look at the detail, not only the number.** `judge.json` says *what* each contradiction, invention
   or form failure is. A count can go up because the agent started hiding decisions as assumptions;
   the pattern is only visible in the detail.

### Maintaining the reference

The reference is the simulator's memory and the judge's yardstick. If it goes stale, the measurement
is wrong.

- **Unplanned gaps.** When a run finds questions neither the brief nor the gaps cover, their answers
  come from *that* run's recommendation, and another run may recommend something else. If they are
  real gaps, add them to `contributing/fixtures/turnero/reference/huecos.md` (with the client's answer)
  **and** apply them to `reference/discovery/`, so every run gets the same answer and the judge does
  not count them as missing. Then `python3 .claude/scripts/check-discovery.py --final
  contributing/fixtures/turnero/reference/discovery` must report no observations.
- **Never edit the brief.** If it changes, earlier measurements are no longer comparable.
- **If the templates' format changes**, the reference and `items.py` are updated in the same commit.
- **A stricter judge is not a worse skill.** If you change `judge.mjs` (or its prompt), judge the
  baseline runs again with the new judge before comparing.

---

## Known pitfalls

- **`permissionMode: "default"`** in the drivers. With `bypassPermissions` or `acceptEdits` the SDK
  does not call `canUseTool`, and questions go unanswered.
- **`num_turns` and `duration_ms` are per turn**: the drivers add them up. `total_cost_usd` and
  `modelUsage` are cumulative: the last result is read.
- **The simulator can be wrong.** If no option says what the persona or gap says, it must answer in
  free text; if it picks the "closest" option, the judge counts a contradiction of the skill. Before
  blaming the skill, check in `log.jsonl` what the simulator answered.
- **Prompts stay in Spanish.** The simulated user's and the judge's prompts are paired with the Spanish
  fixtures and personas; translating them changes what is measured. Measure a new baseline if you do.
- **Parallel runs in the background:** use `measure.sh`. A `VAR=… && (…) &` in a shell keeps the
  variable inside the subshell and the following jobs start without it.
- **`fakejiku` still needs the instance's config file.** `jflow.py` checks that
  `~/.config/jiku/config.{instance}.yaml` exists before calling `jiku`, even when the fake answers.
- **Writes are not visible with `fakejiku`.** A skill that writes a specification and reads it back
  sees the old one: use it for flows that read, or end the run on `done.py fake-write`.
- **A run without Jiku login burns its budget retrying.** Check `jiku --config
  ~/.config/jiku/config.dev.yaml doctor` before launching runs that use Jiku.
- **Uncommitted changes are not in the workspace** when it is built with `git archive`;
  `discovery.mjs` copies the working tree instead and marks the run `workflow_dirty`.
- **Docker leftovers.** Skills that build and test (scaffold, build, fix, release) start Compose
  stacks in the workspace; `docker compose down -v` there after the run.
