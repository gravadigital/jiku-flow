# Adopt an existing product

`/jflow-product-brownfield [id]` brings a product that already has code into jiku flow and leaves it
ready to specify and build new work. `[id]` is the Jiku requirement of the adoption; without it, the
skill creates one.

It asks at the start (the branch, and the Jiku project if the repository is not linked yet) and once
after surveying the code. Then it works on its own, and only comes back with what blocks the product
from being ready: a value you have not provided yet, a test that contradicts other evidence, or
something it cannot resolve. It ends only with the product ready: nothing of the minimum is left
pending.

## Before you start

- Install jiku flow in the repository ([Install and set up](install.md)) and commit it.
- Be on `dev`, up to date with the remote and with a clean working tree. If there is no `dev`, the
  skill creates it from the current branch.
- Have the Jiku project id at hand.

## What it does

1. **Links and branches.** Links the repository to the Jiku project (asking for the project id, the
   instance and the product language), creates or reads the adoption requirement, moves it to
   Desarrollo and creates the branch `feat/{id}-adoption`.
2. **Surveys the code**, one subagent per service: stack, modules, entities, schema, operations,
   processes, integrations, authentication, rules, tests, configuration, observability.
3. **Takes a baseline.** Runs the commands the repository already has (install, build, lint, tests) and
   records what passes and what fails, before touching anything.
4. **Asks you, in one round:**
   - the values that only you have and the product needs to start (an identity provider, a third-party
     API). It names them in `.env.example`; you fill them in `.env`. Secrets are never pasted in the
     chat;
   - how to test end to end, only where it cannot be solved alone. By default the identity provider
     and external systems are replaced by fake ones in the tests. If the product only accepts its real
     provider, it asks for test identities (one per role) in `.env`, with the steps to create them;
   - behaviors that may be on purpose or a mistake: «on purpose» becomes a recorded decision, «a
     mistake» a bug, «I don't know» an open question in the report. Security risks are asked apart, and
     both «a mistake» and «I don't know» go to Jiku as an incidencia.
5. **Brings the repository to the jiku flow minimum** without changing what the product does:
   services in `services/` (moved with `git mv`, history kept), a `Makefile`, Docker Compose that brings
   everything up with `make up` (schema created by the migrations from an empty database),
   `.env.example`, tests against the Compose database with JUnit reports, CI running `make`, and
   **everything needed to test end to end**: test identities, replacements for external systems, and
   one test per entry of the product (every screen and every interface a service exposes) passing
   against `make up`. Everything that worked in the baseline must still work. The one change in
   behavior allowed: an existing test that fails is fixed in the code — the test states what the
   product must do.
6. **Writes the definition of what exists today**, as it is: blocks, domain, contracts, schema,
   flows, and how each entry is tested (`_jflow/prd/architecture/testing.md`). It records as a decision
   only what has evidence of being on purpose, or what you confirmed. It never invents requirements
   the code does not implement.
7. **Writes the guides:** `README.md` (or completes the existing one), the operations guide, the
   `AGENTS.md` files and the **adoption report** (`docs/adoption.md`; `docs/operacion.md` and
   `docs/adopcion.md` when the product language is Spanish).
8. **Verifies.** The verifier checks the definition against the code in both directions, that the
   minimum holds by running the commands, and that nothing regressed. Claude fixes and verifies again
   until it approves.
9. **Closes.** Pushes the branch, leaves the MR text, and writes to Jiku only one **incidencia per
   security bug** and a comment on the adoption requirement.

If it asks for something you do not have yet (a credential, say), you can stop the adoption: what is
done stays committed, and `/jflow-product-brownfield {id}` resumes from where it stopped once you have
it.

## The adoption report

The adoption report lists everything else that was seen, for you to decide on:

- the baseline and the corrections made;
- bugs that are not security bugs, with a suggested severity;
- behaviors left to confirm;
- jiku flow defaults the product does not follow (error format, observability, identifiers…), with the
  effort to adopt them;
- other suggested improvements.

None of it is in Jiku. What you want to act on, create as a requirement and take through `/jflow-spec`,
or `/jflow-fix` if it is small. The report is a record of that day; it is not kept up to date.

## After the adoption

Review and merge the adoption MR. From then on, every change enters as in a new product:
`/jflow-spec` + `/jflow-build` ([Specify and build a requirement](requirement.md)), or `/jflow-fix`
([Fix a bug or make a small change](direct-change.md)).

Existing tests keep their names and carry no criterion IDs, so coverage starts low and grows as new
work adds tagged tests.
