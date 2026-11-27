# Start a new product

From an idea (or a brief) to a running base product with its plan in Jiku:

```text
/jflow-product-discover  →  /jflow-product-scaffold {base-id}  →  for each part: /jflow-spec → approve → /jflow-build
```

## 1. Prepare

1. Create the product's project in Jiku.
2. Create the repository and install jiku flow ([Install and set up](install.md)):

   ```bash
   mkdir my-product && cd my-product && git init
   curl -fsSL https://raw.githubusercontent.com/gravadigital/jiku-flow/main/install.sh | bash
   ```

3. If you have a brief (a client document, notes), keep its path at hand: you can pass it as an
   argument, `/jflow-product-discover path/to/brief.md`.

## 2. Define the product and its plan — `/jflow-product-discover`

This is the one step where you take part in depth. You can stop at any point and run the skill again
later: it resumes from the first section not yet closed.

1. **Link.** It asks for the Jiku project id, the instance and the product language, writes
   `_jflow/project.yaml` and checks it can read the project. It makes sure `main` and `dev` exist (with
   a first commit in an empty repository) and works on `dev`.
2. **Discovery.** It interviews you, section by section, and writes `_jflow/discovery/`:

   | Document | What you define |
   |---|---|
   | `functional-analysis.md` | Actors, surfaces, functional blocks with their requirements and failure conditions, parameters, integrations, non-functional requirements, out of scope, decisions with their reason |
   | `domain-analysis.md` | Glossary, entities, states, invariants — proposed from the functional analysis |
   | `technical-analysis.md` | Services and their language, modules, persistence, communication, authentication, guarantees, key flows, technical decisions (including the CI platform) — mostly inferred |
   | `db-schema-{service}.md` | The database schema of each service that owns one, derived from the above; you review it whole |

   Each section is saved, checked and confirmed before moving on. Engineering defaults (how jiku flow
   always builds, tests and observes) are never asked. It does not choose frameworks, design screens or
   write code.
3. **The plan.** It proposes the parts: which functional blocks go together (one requirement, one MR
   each) and in which order. Every part must be buildable and testable on its own, so a rule that cites
   something from a later part moves to that part; when an earlier part needs a reduced version of it,
   you decide. You can join or split parts, move a block, reorder or rename, and confirm.
4. **Requirements in Jiku.** It shows what it will create — each requirement with «create» or
   «already exists» — and, on your approval, creates them in Planificación: the **base product**
   («0 · Base product», «0 · Producto base» in Spanish) and one requirement per part (`1 · …`,
   `2 · …`), each with a draft scope, proposal and acceptance criteria taken from the discovery.
   Their descriptions end with «Specification: draft».
5. **Close.** It commits the discovery on `dev` and pushes `main` and `dev` if there is a remote.

From here on the discovery is frozen history: changes to the product go through Jiku requirements.

## 3. Specify and build the base — `/jflow-product-scaffold {base-id}`

It expects to be on `dev` with only the discovery and jiku flow; otherwise it warns and asks.

1. **Technical specification, with you.** The base requirement's draft comes from the discovery and a
   template, which cannot know everything. It asks what is missing, grouped and with a recommendation:
   - how each entry (every surface and every interface a service exposes: an API, a message bus, a
     CLI) is tested end to end, with which identity each role enters (by default a fake identity
     provider in the test profile) and how each external system is replaced;
   - what is built for each surface (web, mobile app, desktop app);
   - how each non-functional requirement is verified: a test, an alert in the operations guide, or the
     verifier's review;
   - whether the tools that needs exist where it runs (Docker, an Android emulator, a macOS runner);
   - CI secrets, and what all services share (email sender, broker, observability backend).

   You review the whole draft once; it is written to Jiku and marked «Specification: ready».
   **From here on it asks nothing.**
2. Creates the branch `feat/{id}-base-product` from `dev` and moves the requirement to Desarrollo.
3. Writes the product-level definition in `_jflow/`: what the product is, actors, surfaces, services,
   product decisions and NFRs, and how each entry is tested (`_jflow/prd/architecture/testing.md`).
4. Researches the official documentation and chooses each service's stack.
5. Builds the skeleton: every service with health checks, configuration, OpenTelemetry, logs, errors
   and graceful shutdown; Docker Compose; Make; unit and integration tests; what end-to-end testing
   needs and one end-to-end test per entry against `make up`; CI; `AGENTS.md`, `README.md`, the
   operations guide and `CHANGELOG.md`.
6. Proves it against the base requirement's criteria (`make check`, coverage, evidence) and runs the
   verifier until it approves.
7. Pushes the branch, leaves the MR text and comments in Jiku.

You review the MR, try it with `make up`, and merge it into `dev`. No functional block is built here:
each one comes with its part of the plan.

If it is interrupted, run it again: on `feat/{id}-base-product` it resumes from the first step whose
result is missing.

## 4. Build each part

Every part of the plan is a draft. Build them **in the order of their number**, each one through:

1. `/jflow-spec {id}` — reviews the part against what is built by now (which may have changed since
   the discovery) and asks only what the implementation needs. If nothing is missing, it says so and you
   confirm. The specification becomes «ready».
2. Approve it in Jiku (En cola).
3. `/jflow-build {id}` — refuses a draft, and a part whose dependencies are not merged in `dev`.
4. Review and merge the MR.

`/jflow-status` shows which one is next. The full cycle is in
[Specify and build a requirement](requirement.md). When `dev` has something worth shipping,
[release it](status-and-update.md#release-a-version).
