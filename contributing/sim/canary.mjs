// Minimal check: can the simulator drive an interactive skill through the Agent SDK? Run it after
// upgrading the SDK. It uses Haiku and a 0.5 USD cap.
// Usage: cp -r contributing/sim/canary-ws /tmp/canary && node contributing/sim/canary.mjs /tmp/canary
// (the skill writes canary-out.md in the workspace: use a copy)
import { query } from "@anthropic-ai/claude-agent-sdk";

const cwd = process.argv[2];
if (!cwd) { console.error("usage: node contributing/sim/canary.mjs <workspace>"); process.exit(2); }

// Queue of user messages: the driver pushes, the SDK consumes.
const queue = [];
let wake = null, closed = false;
function push(text) {
  queue.push({ type: "user", message: { role: "user", content: text }, parent_tool_use_id: null });
  wake?.(); wake = null;
}
function close() { closed = true; wake?.(); wake = null; }
async function* inbox() {
  while (true) {
    if (queue.length) { yield queue.shift(); continue; }
    if (closed) return;
    await new Promise((r) => (wake = r));
  }
}

const log = (...a) => console.log(new Date().toISOString(), ...a);
let askCalls = 0, lastText = "", turns = 0;

const q = query({
  prompt: inbox(),
  options: {
    cwd,
    settingSources: ["project"],
    permissionMode: "default",
    model: "claude-haiku-4-5-20251001",
    maxBudgetUsd: 0.5,
    canUseTool: async (toolName, input) => {
      log("canUseTool:", toolName);
      if (toolName === "AskUserQuestion") {
        askCalls++;
        const answers = {};
        for (const qq of input.questions) answers[qq.question] = qq.options[0].label;
        log("  questions:", JSON.stringify(input.questions.map((x) => x.question)), "→", JSON.stringify(answers));
        return { behavior: "allow", updatedInput: { ...input, answers } };
      }
      return { behavior: "allow", updatedInput: input };
    },
  },
});

const t0 = Date.now();
push("/canary");
for await (const m of q) {
  if (m.type === "system" && m.subtype === "init") {
    log("init: skills =", JSON.stringify(m.skills ?? m.slash_commands ?? null));
  } else if (m.type === "assistant") {
    for (const b of m.message.content) if (b.type === "text") { lastText = b.text; log("assistant:", JSON.stringify(b.text)); }
  } else if (m.type === "result") {
    turns++;
    const mu = Object.values(m.modelUsage ?? {})[0] ?? {};
    log(`result #${turns}: subtype=${m.subtype} num_turns=${m.num_turns} duration_ms=${m.duration_ms}`,
        `cost=${m.total_cost_usd} in=${mu.inputTokens} out=${mu.outputTokens} cacheR=${mu.cacheReadInputTokens} cacheW=${mu.cacheCreationInputTokens}`);
    if (/LISTO/.test(lastText) || turns >= 4) { close(); continue; }
    const reply = "confirmado"; // the canary skill expects this word
    log("simulated user:", reply);
    push(reply);
  }
}
log(`end: AskUserQuestion intercepted=${askCalls}, turns=${turns}, wall=${Date.now() - t0} ms`);
