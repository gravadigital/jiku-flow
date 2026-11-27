# Explanation

How jiku flow is meant to work, and why.

jiku flow is a methodology for building products with Claude Code, connected to Jiku. The user
defines; the model implements, tests and proves it. It rests on three ideas:

1. **The product has a living definition, with rules**, and every request is weighed against it.
2. **The input and the output are controlled; the middle is free.** The user fixes what is built and
   how we know it is done; the model decides how to build it.
3. **Done means verified.** A test per criterion, evidence computed by a script, and a verdict from
   an agent that did not write the code.

| Page | Contents |
|---|---|
| [The method](method.md) | The pieces and where they live; how a new product, an existing product, a feature, a bug and a version move through the skills; who does what; where each skill asks |
| [Design decisions](design.md) | Why: the specification in Jiku as the unit of work, the definition that describes only what is built, scripts for what is deterministic, IDs and traceability to tests, the clean-context verifier, end-to-end tests that enter as the actor, the user deciding and the agent challenging, what the implementation may decide, the initial plan in parts, the minimum for adopting a product, what is seen out of scope, languages |

For how to do something, see the [guides](../guides/README.md); for the precise behavior of each
skill, command and document, the [reference](../reference/README.md).
