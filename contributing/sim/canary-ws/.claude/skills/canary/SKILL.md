---
name: canary
description: Canary skill to verify that an SDK host can answer AskUserQuestion and plain-text turns
allowed-tools: "AskUserQuestion, Write, Edit, Read"
---

# Canary

Follow these steps exactly, one at a time.

1. Use the AskUserQuestion tool to ask ONE question: "¿Qué color preferís?" with header "Color" and
   three options: "Rojo", "Verde", "Azul". Wait for the answer.
2. Write a file `canary-out.md` containing a single line: `Color elegido: <answer>`.
3. End your turn with exactly this message: "Guardé canary-out.md. Revisalo y confirmá."
4. When the user replies, if the reply says "confirmado", append a line `CONFIRMADO` to
   `canary-out.md` and end your turn with exactly: "LISTO". Otherwise ask again what to change.
