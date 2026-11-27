// Runs an interactive jiku flow skill in a workspace, with a simulated user who answers from a script
// (persona). For /jflow-spec, /jflow-product-discover, /jflow-product-scaffold, /jflow-fix,
// /jflow-release, /jflow-product-brownfield… See contributing/testing.md.
//
// Usage:
//   node contributing/sim/session.mjs --ws DIR --prompt "/jflow-spec 9003" --persona FILE \
//        --done "python3 $PWD/contributing/sim/done.py ready 9003"  [--out DIR] [--model opus] [--sim-model sonnet]
//        [--budget 30] [--jiku-project ID] [--fake-jiku DATA.json]
//
// - Bounded permissions: files only inside the workspace; Bash only with the programs in ALLOWED.
// - The simulator answers AskUserQuestion only from the persona; what the persona does not cover is
//   answered with the recommended option and recorded as unplanned.
// - --done is a shell command, run in the workspace, that exits 0 when the skill finished its work
//   (for example, the specification is ready in Jiku). It is evaluated at the end of every agent turn.
// - --jiku-project replaces {{JIKU_PROJECT}} in the persona (the id of the Jiku project of this run).
// - --fake-jiku puts contributing/sim/fakejiku first on PATH with a copy of DATA.json: Jiku reads come
//   from the file and writes are recorded in OUT/fake-jiku.json.writes.jsonl, never sent.
// - Leaves in --out (default contributing/sim/runs/session-{date}): log.jsonl and run.json.
import { query } from "@anthropic-ai/claude-agent-sdk";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIM_DIR = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const WS = path.resolve(arg("ws") ?? ".");
const PROMPT = arg("prompt");
if (!arg("ws") || !PROMPT || !arg("persona")) {
  console.error("usage: node contributing/sim/session.mjs --ws DIR --prompt \"/skill args\" --persona FILE --done \"CMD\" [options]");
  process.exit(2);
}
let PERSONA = fs.readFileSync(arg("persona"), "utf-8");
const JIKU_PROJECT = arg("jiku-project");
if (PERSONA.includes("{{JIKU_PROJECT}}")) {
  if (!JIKU_PROJECT) { console.error("the persona needs --jiku-project ID (the Jiku project of this run)"); process.exit(2); }
  PERSONA = PERSONA.replaceAll("{{JIKU_PROJECT}}", JIKU_PROJECT);
}
const DONE = arg("done", "false");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const OUT = path.resolve(arg("out", path.join(SIM_DIR, "runs", `session-${stamp}`)));
const MODEL = arg("model", "opus");
const SIM_MODEL = arg("sim-model", "sonnet");
const BUDGET = Number(arg("budget", "30"));
const MAX_USER_TURNS = Number(arg("max-user-turns", "40"));
// A notice while the agent waits for background work (an emulator download, a long test run): a person
// would just wait, so the simulator waits too and these turns have their own, larger cap
const NOTICE_WAIT_S = Number(arg("notice-wait", "120"));
const MAX_NOTICE_TURNS = Number(arg("max-notice-turns", "150"));
let noticeTurns = 0;
fs.mkdirSync(OUT, { recursive: true });

// The environment of the skill session and of --done: with --fake-jiku, the fake CLI comes first on PATH.
const ENV = { ...process.env };
if (arg("fake-jiku")) {
  const data = path.join(OUT, "fake-jiku.json");
  fs.copyFileSync(arg("fake-jiku"), data);
  ENV.PATH = `${path.join(SIM_DIR, "fakejiku")}${path.delimiter}${ENV.PATH}`;
  ENV.FAKE_JIKU_DATA = data;
}

const ALLOWED = new Set(["python3", "git", "make", "docker", "npm", "npx", "node", "pnpm", "ls", "cat",
  "head", "tail", "grep", "find", "mkdir", "cp", "mv", "rm", "sed", "wc", "echo", "curl", "sleep", "jq",
  "test", "touch", "chmod", "sort", "diff", "printf", "cd", "pwd", "true", "awk", "xargs", "tr", "go",
  // /jflow-product-scaffold runs here too (it asks first): the toolchains it builds and checks with
  "flutter", "dart", "gofmt", "golangci-lint", "gotestsum", "govulncheck", "openssl", "which", "cut",
  "base64", "tar", "tee", "uniq", "basename", "dirname", "date"]);

const LOG = fs.createWriteStream(path.join(OUT, "log.jsonl"));
const t0 = Date.now();
function log(type, data) {
  LOG.write(JSON.stringify({ t: ((Date.now() - t0) / 1000).toFixed(1), type, ...data }) + "\n");
  const brief = data.text ?? data.question ?? data.answer ?? "";
  console.log(`[${((Date.now() - t0) / 60000).toFixed(1)}m] ${type}${brief ? ": " + String(brief).slice(0, 160).replace(/\n/g, " ") : ""}`);
}

function inbox() {
  const queue = [];
  let wake = null, closed = false;
  async function* gen() {
    while (true) {
      if (queue.length) { yield queue.shift(); continue; }
      if (closed) return;
      await new Promise((r) => (wake = r));
    }
  }
  return {
    gen: gen(),
    push(text) { queue.push({ type: "user", message: { role: "user", content: text }, parent_tool_use_id: null }); wake?.(); wake = null; },
    close() { closed = true; wake?.(); wake = null; },
  };
}

// The simulated user's prompt stays in Spanish: it is paired with the Spanish personas and fixtures.
const SIM_SYSTEM = `Sos el usuario de un equipo de desarrollo que trabaja con un agente. El agente te hace
preguntas y te pide confirmar partes de documentos. Respondé como ese usuario.

Tu conocimiento es SOLO el guion de abajo. Lo que dice, lo decís. Si te dan opciones y ninguna dice lo
mismo que el guion, respondé con texto libre con lo que dice el guion. Si la pregunta no está cubierta,
elegí la opción recomendada (la marcada o la primera) y marcá la fuente "no previsto". Nunca inventes.
Pedidos de confirmación: si lo propuesto contradice el guion en el fondo, pedí cambios diciendo qué;
si no, confirmá. Avisos que no preguntan nada (avance, espera de algo que corre en segundo plano): "Seguí.", con fuente "aviso".
Respondé SIEMPRE y SOLO con JSON válido, sin texto alrededor ni bloques de código.

=== GUION ===
${PERSONA}`;

function startSim() {
  const box = inbox();
  const q = query({ prompt: box.gen, options: { model: SIM_MODEL, tools: [], settingSources: [], persistSession: false, systemPrompt: SIM_SYSTEM, cwd: OUT } });
  const it = q[Symbol.asyncIterator]();
  let cost = 0;
  async function ask(text) {
    box.push(text);
    let last = "";
    while (true) {
      const { value: m, done } = await it.next();
      if (done) throw new Error("the simulator ended its session");
      if (m.type === "assistant") for (const b of m.message.content) if (b.type === "text") last = b.text;
      if (m.type === "result") { cost = m.total_cost_usd; break; }
    }
    try { return JSON.parse(last.replace(/^```(json)?\s*|\s*```$/g, "").trim()); } catch { return { error: last }; }
  }
  return { ask, cost: () => cost, close: () => box.close() };
}

const inside = (p) => path.resolve(WS, p).startsWith(WS + path.sep) || path.resolve(WS, p) === WS;
function bashAllowed(cmd) {
  const parts = cmd.split(/&&|\|\||;|\|/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    const tok = p.replace(/^(\w+=\S+\s+)+/, "").split(/\s+/)[0];
    if (!ALLOWED.has(path.basename(tok))) return `program not allowed in the simulator: ${tok}`;
  }
  return null;
}

const metrics = { askCalls: 0, textQuestions: 0, unplanned: [], denied: [] };
const sim = startSim();
const box = inbox();
let result = null, cost = 0, turns = 0, userTurns = 0, durationMs = 0;
const q = query({
  prompt: box.gen,
  options: {
    cwd: WS, settingSources: ["project"], permissionMode: "default", persistSession: false,
    model: MODEL, maxBudgetUsd: BUDGET, env: ENV,
    canUseTool: async (toolName, input) => {
      if (toolName === "AskUserQuestion") {
        metrics.askCalls++;
        const qs = input.questions.map((x) => ({ pregunta: x.question, multiple: !!x.multiSelect, opciones: x.options.map((o) => ({ opcion: o.label, descripcion: o.description ?? "" })) }));
        log("question", { question: qs.map((x) => x.pregunta).join(" | "), detail: qs });
        // Prompt to the simulated user, in Spanish like its system prompt.
        const r = await sim.ask(`El agente te pregunta con opciones. "respuesta" es el valor EXACTO del campo "opcion" elegido (o texto libre).
Formato: {"respuestas":[{"pregunta":"...","respuesta":"...","fuente":"guion|no previsto|confirmación"}]}

${JSON.stringify(qs, null, 2)}`);
        const answers = {};
        for (const x of input.questions) {
          const found = (r.respuestas ?? []).find((y) => y.pregunta === x.question) ?? (r.respuestas ?? [])[0];
          let a = found?.respuesta ?? x.options[0].label;
          if (x.multiSelect && !Array.isArray(a)) a = [a];
          answers[x.question] = a;
          if (found?.fuente === "no previsto") metrics.unplanned.push({ question: x.question, answer: a });
        }
        log("answer", { answer: JSON.stringify(answers) });
        return { behavior: "allow", updatedInput: { ...input, answers } };
      }
      if (["Write", "Edit", "NotebookEdit"].includes(toolName) && !inside(input.file_path ?? "")) {
        metrics.denied.push({ toolName, input });
        return { behavior: "deny", message: "The simulator only allows writing inside the workspace." };
      }
      if (toolName === "Bash") {
        const why = bashAllowed(input.command ?? "");
        if (why) { metrics.denied.push({ toolName, command: input.command }); return { behavior: "deny", message: why }; }
      }
      return { behavior: "allow", updatedInput: input };
    },
  },
});

box.push(PROMPT);
log("start", { text: `${PROMPT} (${MODEL})` });
const done = () => { try { execSync(DONE, { cwd: WS, stdio: "ignore", env: ENV }); return true; } catch { return false; } };
let lastText = "";
for await (const m of q) {
  if (m.type === "assistant") {
    for (const b of m.message.content) if (b.type === "text") lastText = b.text;
  } else if (m.type === "result") {
    turns += m.num_turns ?? 0; durationMs += m.duration_ms ?? 0; cost = m.total_cost_usd; result = m.subtype;
    if (m.subtype !== "success") { log("error", { text: m.subtype }); box.close(); continue; }
    if (done()) { log("end", { text: lastText }); box.close(); continue; }
    log("agent", { text: lastText });
    // Prompt to the simulated user, in Spanish like its system prompt.
    const r = await sim.ask(`El agente terminó su turno con este mensaje. Respondé como el usuario.
Formato: {"respuesta":"...","fuente":"guion|no previsto|confirmación|aviso","pregunta_por_texto":true|false}

${lastText}`);
    if (r.pregunta_por_texto) metrics.textQuestions++;
    if (r.fuente === "no previsto") metrics.unplanned.push({ question: lastText.slice(0, 300), answer: r.respuesta });
    if (r.fuente === "aviso") {
      if (++noticeTurns > MAX_NOTICE_TURNS) { log("error", { text: "notice-turn cap reached" }); result = "max_notice_turns"; box.close(); continue; }
      await new Promise((ok) => setTimeout(ok, NOTICE_WAIT_S * 1000));
    } else if (++userTurns > MAX_USER_TURNS) { log("error", { text: "user-turn cap reached" }); result = "max_user_turns"; box.close(); continue; }
    log("user", { answer: r.respuesta ?? "Seguí." });
    box.push(r.respuesta ?? "Seguí.");
  }
}
sim.close();
const run = { prompt: PROMPT, model: MODEL, result, done: done(), cost_usd: Number(cost.toFixed(4)), sim_cost_usd: Number(sim.cost().toFixed(4)),
  notice_turns: noticeTurns, wall_min: Number(((Date.now() - t0) / 60000).toFixed(1)), api_min: Number((durationMs / 60000).toFixed(1)), turns, user_turns: userTurns,
  ask_calls: metrics.askCalls, text_questions: metrics.textQuestions, unplanned: metrics.unplanned, denied: metrics.denied };
fs.writeFileSync(path.join(OUT, "run.json"), JSON.stringify(run, null, 2));
LOG.end();
console.log(`\n${run.done ? "DONE" : "NOT DONE"} — ${run.cost_usd} USD (simulator ${run.sim_cost_usd}), ${run.wall_min} min, ${run.user_turns} user turns, ${run.ask_calls} questions, ${run.unplanned.length} unplanned, ${run.denied.length} denied`);
console.log(`→ ${OUT}`);
