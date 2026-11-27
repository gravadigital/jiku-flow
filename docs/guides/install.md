# Install and set up

This guide installs jiku flow in a repository, connects your machine to Jiku and explains the few
settings the product keeps. It takes a few minutes; you do it once per machine (the Jiku CLI) and once
per repository (jiku flow).

## 1. Prerequisites

- [Claude Code](https://claude.com/claude-code)
- git
- python3 3.9 or later
- A Jiku account with access to the product's project
- For the products themselves: Docker (Compose) and Make. jiku flow builds and tests every product
  through `make up`, `make check` and the like.

## 2. Install the Jiku CLI and log in

jiku flow reads and writes Jiku through its CLI, `jiku`, from
[github.com/gravadigital/jiku-go](https://github.com/gravadigital/jiku-go). Install it as its README
says (with Go, `go install github.com/gravadigital/jiku-go/cmd/jiku@latest`, or a package from its
releases), then:

```bash
jiku config init
```

Each Jiku instance has its own configuration file, `~/.config/jiku/config.{instance}.yaml` — for
example `config.prod.yaml` and `config.dev.yaml`. jiku flow always passes the file of the product's
instance explicitly (`--config`), never the CLI's default, so it can never write to the wrong
instance. Log in and check each instance you use:

```bash
jiku --config ~/.config/jiku/config.prod.yaml login
jiku --config ~/.config/jiku/config.prod.yaml doctor
```

The CLI runs with **your** token: everything Claude writes to Jiku is written in your name, marked as
done by an agent. If the token expires and is not renewed, log in again.

## 3. Install jiku flow in the repository

At the root of the product's git repository (`git init` first if it is a new, empty folder):

```bash
curl -fsSL https://raw.githubusercontent.com/gravadigital/jiku-flow/main/install.sh | bash
```

Without options it installs the latest release. To pin one:

```bash
curl -fsSL https://raw.githubusercontent.com/gravadigital/jiku-flow/main/install.sh | bash -s -- --version v1.0.0
```

What it does:

- Checks git and python3, and that you are at the root of a git repository.
- Adds jiku flow's skills, subagent, specs, templates, scripts and hooks to `.claude/`.
- Leaves your own `.claude/` content alone: your skills, agents and settings stay. `settings.json` is
  merged (jiku flow adds its hooks), and `.claude/CLAUDE.md` gets a block delimited by
  `<!-- jiku flow: begin … -->` / `<!-- jiku flow: end -->`.
- Records in `.claude/.jflow-manifest` which files belong to jiku flow, and the installed version in
  `.claude/.jflow-version`.

It refuses to run where jiku flow is already installed: use `/jflow-framework-update` instead.
Review the changes (`git status`) and commit them.

## 4. Link the repository to its Jiku project

A person creates the project in Jiku: it is a management decision (client, team, hours). The first
skill you run — `/jflow-product-discover` for a new product, `/jflow-product-brownfield` for an
existing one — asks for the project id, the instance and the product language, and writes
`_jflow/project.yaml`:

```yaml
language: es              # the product language; Spanish when unset
jiku:
  project_id: 59          # the Jiku project of this repository
  instance: prod          # selects ~/.config/jiku/config.prod.yaml
  writes: true            # false = dry-run: show what would be sent, send nothing
git:
  platform: gitlab        # gitlab | github
  integration_branch: dev
  production_branch: main
```

The file is committed with the product. In Jiku, set the repository URL in the project's properties
(`repositorio`).

## 5. Choose the product language

Claude talks to you in the language you write in, whatever the product's. The product language
(`language`) decides what the product's people read: the specification and comments in Jiku, the
discovery, `README.md`, `docs/` and `CHANGELOG.md`. Use any language code (`es`, `en`, `pt`…).

Always in English, whatever the product language: commits, MR/PR text, branch names, test names, code,
comments, identifiers, and the files for agents (`AGENTS.md`, `CLAUDE.md`).

Changing `language` later affects only what is written from then on. Details, including which file
names change with the language (for example `docs/operacion.md` or `docs/operations.md`):
[Language](../reference/language.md).

## 6. Keep jiku flow up to date

Inside Claude Code, in the repository:

```text
/jflow-framework-update            # the latest release
/jflow-framework-update v1.2.0     # a given version
```

See [Status, releases and updates](status-and-update.md#update-jiku-flow).

## Next

- [A new product](new-product.md)
- [An existing product](existing-product.md)
- [How jiku flow uses Jiku](jiku.md)
