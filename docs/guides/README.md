# Guides

Step-by-step guides for using jiku flow on a product. For exact formats and commands see the
[Reference](../reference/README.md); for the reasons behind the method, the
[Explanation](../explanation/README.md).

| You want to... | Guide |
|---|---|
| Install jiku flow, the Jiku CLI, and link a repository | [Install and set up](install.md) |
| Know what Claude reads and writes in Jiku, and the states it expects | [How jiku flow uses Jiku](jiku.md) |
| Start a product from scratch | [Start a new product](new-product.md) |
| Bring a product that already has code into jiku flow | [Adopt an existing product](existing-product.md) |
| Take a feature or improvement from Jiku to code, or change one | [Specify and build a requirement](requirement.md) |
| Fix a bug or make a small change | [Fix a bug or make a small change](direct-change.md) |
| See where everything is, release a version, or update jiku flow | [Status, releases and updates](status-and-update.md) |

## The flows at a glance

| Situation | Skills |
|---|---|
| New product | `/jflow-product-discover` → `/jflow-product-scaffold {base-id}` → then each part as a requirement |
| Existing product | `/jflow-product-brownfield [id]` → then each change as a requirement |
| A feature or improvement (or a part of the plan) | `/jflow-spec {id}` → approve in Jiku → `/jflow-build {id}` → review and merge the MR |
| Change something already specified or built | `/jflow-spec {id} {what changes}` → `/jflow-build {id}` |
| A bug or a small change | `/jflow-fix {id} {what}` → review and merge the MR |
| Ship what is in `dev` | `/jflow-release` |
| Where are we? | `/jflow-status` |
