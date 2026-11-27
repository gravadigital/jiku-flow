# Glossary

| Term | Meaning |
|---|---|
| **Acceptance criterion** | A row of a specification that must end proven by a test: a definition ID (requirement, failure condition, invariant, guarantee, NFR) or a local criterion (`812-AC-01`), with its `Change` (`add`, `modify`, `remove`) and its text |
| **Adoption** | Bringing a product that already has code into jiku flow, with `/jflow-product-brownfield`: the definition surveyed from the code, the repository brought to the minimum, an adoption report |
| **Adoption minimum** | What a repository needs for the skills and the verifier to work (M1–M9 of Engineering): the layout, Make, JUnit reports, `.env.example`, Compose, a green `make check`, CI through `make`, the guides and contracts, and one end-to-end test per entry |
| **Adoption report** | `docs/adopcion.md` / `docs/adoption.md`: what the adoption saw and did not fix — suspected bugs, behaviors to confirm, defaults not followed, improvements. A record of that day, not kept up to date |
| **Base product** | The first requirement of a new product («0 · Base product»): the skeleton of every service, the test harness, CI, observability, the guides and the product-level definition, with no functional block. Built by `/jflow-product-scaffold` |
| **Block** | A group of requirements by what the product does for whoever uses it (`CAN — Cancellation`), with a prefix that names its IDs. Exists in the definition only once built |
| **Correction on the way** | Something already built that is wrong by the definition, fixed during `/jflow-build` or `/jflow-fix` because it is in what the work already changes, small, with no new behavior or decision, no other service and no stored data. Listed in the MR and checked by the verifier |
| **Decided difference** | In a visual reference, the only things that may look different from the design, each backed by a decision or a rule |
| **Decided in the implementation** | A small thing the specification did not fix and `/jflow-build` decided (a text, an order, an internal value). Listed, and, when it adds a definition row, appended to the specification in Jiku under this label |
| **Decision** | Something chosen on purpose against an alternative, with what was rejected and the reason (`DEC-07` product, `DEC-T05` technical). A request that contradicts it must revert it (`reverts`) |
| **Definition** | `_jflow/`: what the product is, its rules, what is built and why. Describes only what is built; changes only when a requirement is built, in its branch |
| **Dependency** | A requirement that must be merged in `dev` before another is built («Depends on»). `/jflow-build` stops without asking while one is not merged |
| **Direct change** | A bug fix or a small change that touches nothing documented, done with `/jflow-fix` as a task of an existing requirement |
| **Discovery** | The analysis with which the user defines a new product (`_jflow/discovery/`): functional, domain, technical, database schemas. Frozen once the plan exists |
| **Draft / ready** | The last line of a requirement's description: «Specification: draft» (generated from the discovery, not reviewed against what is built) or «Specification: ready ({date})». `/jflow-build` does not start on a draft. Also: the local draft of a specification that `/jflow-spec` edits before writing to Jiku |
| **End-to-end test** | A test against `make up` that enters as the actor does — the browser or the app, an HTTP client with a real token, a broker client authenticated as the actor — never by calling the service's own code. One per entry point |
| **Engineering defaults** | How every product is built, tested, observed and versioned without the user defining it (`.claude/specs/engineering.md`). Deviating from one is a technical decision |
| **Entry point** | A surface, or an interface a service exposes (HTTP, NATS, CLI). Each has its row in `testing.md` and its end-to-end test |
| **Evidence** | The table criterion → test → result, computed by `jflow.py evidence` from the JUnit reports. Goes to the MR, and in business terms to the Jiku comment |
| **Failure condition** | What happens when a requirement cannot be fulfilled, as `condition → result` (`CAN-E1`) |
| **Fake issuer** | A token issuer in the `test` profile of Compose that signs tokens with the claims of the real identity provider, so end-to-end tests get identities with nobody in the loop |
| **Guarantee** | How a rule that must always hold is enforced (`GAR-01`): a database constraint, a lock, a transaction. Tested under its real condition (parallel requests, a failure mid-way) |
| **Initial plan** | The parts a new product is split into to build it, each a Jiku requirement created as a draft from the discovery and numbered in build order (`1 · …`). No part cites what a later part brings |
| **Invariant** | A rule about the data that always holds (`INV-01`) |
| **Jiku** | The project and requirements tool jiku flow works with: it holds every requirement, its state and its specification. Accessed through its CLI ([jiku-go](https://github.com/gravadigital/jiku-go)) |
| **Large gap** | Something the specification does not fix that a user or integrator would observe and that the implementation may not decide: a business rule, security, stored data, time, concurrency, a contradiction. `/jflow-build` asks it, writes the answer to the specification, then builds it |
| **Local criterion** | A criterion of one requirement that is not product definition (`812-AC-01`): a technical criterion, a data migration, an NFR proven by this requirement |
| **Module** | A part of a service's code that owns its entities and tables (`api.scheduling`). Every entity has exactly one owner module |
| **NFR** | A non-functional requirement (`NFR-04`), with how it is verified: `test`, `alert` or `review` |
| **Origin** | The column on every definition row: `initial`, or the requirement that added or last changed it (`#812`) |
| **Out of scope (definition)** | `prd/out-of-scope.md`: what the product deliberately does not do. Bringing an item in needs a decision |
| **Out of scope (seen)** | What an agent sees while working that is not the requirement's: it goes to Jiku as an incidencia or a comment, never into the branch |
| **Parameter** | The value of a business rule, cited by its name in bold and configured by an environment variable |
| **Product language** | `language` in `_jflow/project.yaml`: the language of everything people of the product read. Spanish when unset |
| **Reopening** | Working again on a requirement already merged because its specification changed: `/jflow-spec` moves it back to Desarrollo and `/jflow-build` builds only the difference on a `-2`, `-3`… branch |
| **Requirement** | The unit of work, in Jiku: a feature, improvement, issue or other. Its numeric id names everything done for it: branch, commits, `Origin`, local criteria |
| **Specification** | What a requirement changes in the product and how we know it is done: scope, proposal (with the key technical detail) and acceptance criteria, in three fields of the Jiku requirement |
| **Surface** | Where an actor uses the product (a web panel, a mobile app), with its platform: `web`, `mobile-app`, `desktop-app` |
| **Verifier** | `jflow-verifier-agent`: the subagent that, in a clean context and without having written the code, decides whether the work is done. APPROVED or REJECTED |
| **Visual reference** | The design a requirement's screens must look like: a package in the repository, one row per screen, and the closed list of decided differences |
| **Working folder** | `{system temp}/jflow/{repo}-{hash}`, printed by `jflow.py workdir`: drafts, Jiku copies, evidence, MR text. Outside the repository, lost on reboot |
| **`_jflow/`** | The workflow's memory in the product repository, written for agents: the project link, the discovery and the definition |
