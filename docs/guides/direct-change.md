# Fix a bug or make a small change

`/jflow-fix {id} {what to change}` — the fast path for what does not need a specification.

`{id}` is the Jiku requirement the change belongs to: the incidencia, or the feature it improves. The
change is recorded as a **task** of that requirement, and done on its own branch, tested and verified.

## What counts as small

A change is small when it **adds or modifies nothing documented**: no requirement, failure condition,
invariant, guarantee, decision, parameter, non-functional requirement, entity attribute or state,
table or column, contract operation (path, fields, codes, permissions) or flow. A bug fix makes the code
match the definition, so it is small. A bug the definition does not cover would add a rule, so it is
not.

| Example | Small? |
|---|---|
| A booking can be cancelled after it started, and rule `CAN-E1` says it cannot | Yes: a bug |
| A 500 error where the contract says 404 | Yes: a bug |
| Make the calendar faster | Yes |
| Upgrade a dependency | Yes |
| Allow cancelling up to one hour after the start | No: it changes `CAN-E1` |
| Add a field to the sign-up form | No: it changes the entity and the contract |
| It fails with an email that has spaces, and the definition says nothing about spaces | No: fixing it adds a rule, which must be decided and recorded |

If it is not small, Claude stops and points you to `/jflow-spec` on the same requirement (or a new
requirement in Jiku, which it never creates on its own). When in doubt, it asks.

## What it does

1. **Checks** that you are on `dev`, up to date and clean (as `/jflow-build` does). If the requirement
   is not in Desarrollo, it offers to move it there; if it is Cancelado, it stops.
2. **Reads** the requirement from Jiku and finds what the change touches, in the code and in the
   definition.
3. **Starts:** creates `fix/{id}-{slug}` from `dev` and the task in Jiku, assigned to you.
4. **Implements.** A bug is reproduced first: a test that fails because of it, tagged with the ID of
   the rule it breaks (`[CAN-E1] …`); then the fix. An improvement gets the test that proves it.
5. **Proves and verifies:** `make check`, the end-to-end tests of the entries it touches against
   `make up`, the evidence, and the verifier's approval. It never touches `_jflow/`: if the change
   needs to, it was not small.
6. **Closes:** pushes, leaves the MR text and comments in Jiku. For an incidencia, it suggests the
   resolution type to close it with.

The same mistake somewhere else (other messages, another operation) is not part of the change unless
you asked for it: it goes to Jiku as an incidencia with its origin, and is listed in the MR. See
[What is seen out of scope](jiku.md#what-is-seen-out-of-scope).
