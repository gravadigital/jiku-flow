# jiku flow

A methodology for building software products with [Claude Code](https://claude.com/claude-code),
connected to **Jiku**, Grava's requirements and project management tool. You define the product and
each requirement; Claude plans, implements and tests it, and a task is done only when an independent
verifier, working in a clean context, confirms with evidence that the result meets the specification.

## Why

- **The specification lives in Jiku.** Each requirement carries its scope, proposal and acceptance
  criteria where the people who asked for it can read them. Nothing about pending work is stored in
  the repository.
- **The repository holds the definition of what is built.** `_jflow/` describes the product as it
  is: its blocks, rules, decisions, contracts and schemas, with stable IDs. Every new request is
  checked against it, and when a request contradicts a rule or a decision, you decide, knowing it.
- **Implementation is verified, not assumed.** Every acceptance criterion gets a test tagged with its
  ID, and the definition is updated in the same branch as the code. A read-only verifier subagent
  approves the evidence before anything is pushed for review.
- **Controlled input and output, free middle.** Claude chooses how to build; everything
  deterministic (IDs, checks, coverage, evidence, MR text) is done by a script.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- git
- python3 3.9 or later (jiku flow's scripts use only the standard library)
- The Jiku CLI ([github.com/gravadigital/jiku-go](https://github.com/gravadigital/jiku-go)) and a Jiku
  account with access to the product's project

## Install

At the root of a git repository (run `git init` first in an empty folder):

```bash
curl -fsSL https://raw.githubusercontent.com/gravadigital/jiku-flow/main/install.sh | bash
```

To install a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/gravadigital/jiku-flow/main/install.sh | bash -s -- --version v1.0.0
```

The installer adds jiku flow to `.claude/` without touching what is already there: your own skills,
agents and settings stay, `settings.json` and `CLAUDE.md` are merged, and `.claude/.jflow-manifest`
records which files belong to jiku flow. Review the changes with `git status` and commit them.

Then install the Jiku CLI and log in (see [Install and set up](docs/guides/install.md)):

```bash
jiku config init
jiku --config ~/.config/jiku/config.prod.yaml login
```

To update later, run `/jflow-framework-update` inside Claude Code.

## Quick start

**A new product.** Create the project in Jiku, then, in Claude Code:

```text
/jflow-product-discover                 # define the product with you; creates the plan in Jiku
/jflow-product-scaffold {base-id}       # specify and build the base product
/jflow-spec {id}                        # for each part of the plan, in order
/jflow-build {id}                       # once the specification is approved in Jiku
/jflow-release
```

**An existing product.** In its repository:

```text
/jflow-product-brownfield               # survey the code, bring the repo to the minimum
/jflow-spec {id}                        # then every change goes through Jiku
/jflow-build {id}
/jflow-release
```

You review and merge the MR/PR each skill leaves ready.

## Skills

| Skill | Mode | What it does |
|---|---|---|
| `/jflow-product-discover` | Interactive, once | Defines a new product with you: the discovery (functional, domain, technical, database schemas) and the initial plan, created in Jiku as the base requirement plus one requirement per part, as drafts |
| `/jflow-product-scaffold {id}` | Questions first, then autonomous, once | Specifies the base requirement and builds the base product: every service's skeleton, tests, CI, observability, the definition, README and operations guide |
| `/jflow-product-brownfield [id]` | Mostly autonomous, once | Adopts an existing product: surveys its code into the definition, brings the repository to the jiku flow minimum (layout, Make, Compose, tests, CI) and writes an adoption report |
| `/jflow-spec {id} [text]` | Interactive | Specifies a Jiku requirement with you, challenging it against the definition and the other open requirements; writes only to Jiku |
| `/jflow-build {id}` | Autonomous | Implements a specified requirement in its own branch; done only when `jflow-verifier-agent` approves |
| `/jflow-fix {id} {what}` | Autonomous | A bug fix or a small change that touches nothing documented, as a task of the requirement |
| `/jflow-status` | Read-only | The product's stage and every open requirement by its next action, crossing Jiku with git |
| `/jflow-release` | One confirmation | Regression, CHANGELOG, merge `dev` into `main`, tag, and a note in Jiku |
| `/jflow-framework-update` | Interactive | Updates jiku flow in the repository, with a backup and migrations |

`jflow-verifier-agent` is a read-only subagent, invoked by `/jflow-product-scaffold`,
`/jflow-product-brownfield`, `/jflow-build` and `/jflow-fix` before they finish.

## How it works

1. A requirement arrives in Jiku; `/jflow-spec` turns it into a specification with identified acceptance criteria, written to Jiku.
2. People approve it in Jiku (state En cola).
3. `/jflow-build` implements it on `feat/{id}-{slug}`: tests first, one per criterion, and the definition in `_jflow/` updated in the same branch.
4. The verifier checks, in a clean context, that every criterion is proven by a passing test and that the definition and contracts are true; Claude fixes until it approves.
5. You review and merge the MR into `dev`; `/jflow-release` ships `dev` to `main` with a tag.

Claude talks to you in your language. What the product's people read (Jiku, the discovery,
`README.md`, `docs/`, `CHANGELOG.md`) is written in the product language, Spanish by default; git,
code and agent files are always in English. See [Language](docs/reference/language.md).

## Documentation

| You want to... | Go to |
|---|---|
| Do something concrete: install, start a product, ship a requirement | [Guides](docs/guides/README.md) |
| Look up skills, scripts, documents and terms | [Reference](docs/reference/README.md) |
| Understand the methodology and its reasons | [Explanation](docs/explanation/README.md) |
| Contribute to jiku flow | [Contributing](contributing/) |
| See what changed | [CHANGELOG](.claude/CHANGELOG.md) |

## License

[Apache License 2.0](LICENSE).
