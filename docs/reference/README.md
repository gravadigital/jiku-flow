# Reference

Precise descriptions of what jiku flow is made of. For how to do something, see the
[guides](../guides/README.md); for why it works this way, the [explanation](../explanation/README.md).

| Page | Contents |
|---|---|
| [Skills and subagent](skills.md) | Every skill: arguments, what it asks, reads and writes, its steps; the verifier and its checks; what is seen out of scope |
| [`jflow.py` commands](scripts.md) | Every command of the script, with its options, grouped; the other scripts; the working folder |
| [Product documents](documents.md) | The product repository, `project.yaml`, the definition and its IDs, the specification in Jiku, the discovery, the documents for people and for agents, jiku flow's own files |
| [Language](language.md) | Which language each thing is written in, and the vocabulary of the structure |
| [Glossary](glossary.md) | The terms jiku flow uses |

The agent's own instructions are the specs in [`.claude/specs/`](../../.claude/specs/) (English):
[Product Definition](../../.claude/specs/product-definition.md),
[Requirement Spec](../../.claude/specs/requirement.md),
[Jiku](../../.claude/specs/jiku.md),
[Engineering](../../.claude/specs/engineering.md),
[Database](../../.claude/specs/database.md),
[Discovery](../../.claude/specs/discovery.md),
[Functional Analysis](../../.claude/specs/functional-analysis.md),
[Language](../../.claude/specs/language.md).
When this reference and a spec disagree, the spec is what the agent does.
