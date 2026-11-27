// Runs /jflow-product-discover on the Turnero brief, with a simulated user who answers it. Used by
// measure.sh; see contributing/testing.md.
//
// Usage: node contributing/sim/discovery.mjs [--budget 40] [--skill-model opus] [--sim-model sonnet]
//
// - Builds a fresh workspace: a git repository with the brief (contributing/fixtures/turnero/brief.md)
//   in docs/, the repo's .claude/ as it is (the skill of the repo is measured, not a copy) and a
//   _jflow/project.yaml that links a fake Jiku project with writes off. The jiku CLI on PATH is
//   contributing/sim/fakejiku: the run never reaches a real Jiku. The run ends when every discovery
//   document is closed, before the plan.
// - Runs the skill in a new session without persistence.
// - The simulated user answers only from the brief and contributing/fixtures/turnero/reference/huecos.md.
//   What neither covers it answers with the recommended option and records as "unplanned".
// - Leaves in contributing/sim/runs/discovery__{date}/: workspace/, log.jsonl and run.json.
import { query } from "@anthropic-ai/claude-agent-sdk";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIM_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(SIM_DIR, "../..");
const FIXTURE = path.join(REPO, "contributing/fixtures/turnero");

// ---------- arguments ----------
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const BUDGET = Number(arg("budget", "40"));
const SKILL_MODEL = arg("skill-model", "opus");
const SIM_MODEL = arg("sim-model", "sonnet");
const MAX_USER_TURNS = Number(arg("max-user-turns", "120"));

const F = "functional-analysis.md", D = "domain-analysis.md", T = "technical-analysis.md";
const S = "db-schema-*.md"; // one per service that owns a database
const SKILLS = [["jflow-product-discover", [F, D, T, S]]];

// ---------- run folder and workspace ----------
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const RUN = path.join(SIM_DIR, "runs", `discovery__${stamp}`);
const WS = path.join(RUN, "workspace");
fs.mkdirSync(RUN, { recursive: true });
const sh = (cmd) => execSync(cmd, { stdio: "pipe", encoding: "utf-8" });
// The brief goes where the skill looks for one with no arguments: docs/*.md at the repo root.
fs.mkdirSync(path.join(WS, "docs"), { recursive: true });
fs.copyFileSync(path.join(FIXTURE, "brief.md"), path.join(WS, "docs/definicion-producto.md"));
fs.mkdirSync(path.join(WS, ".claude"), { recursive: true });
// .claude/ without what is local to this checkout (installed version, manifest, pending migrations, caches).
sh(`cd "${REPO}/.claude" && tar --exclude=.jflow-version --exclude=.jflow-manifest --exclude=agent-migrations-pending.md --exclude=settings.local.json --exclude=__pycache__ --exclude='*.pyc' -cf - . | (cd "${WS}/.claude" && tar -xf -)`);
// main with the brief and the framework, then dev (what `jflow.py branches` leaves); the project link
// uncommitted, as init-project leaves it. With the link in place the skill does not ask for a Jiku project.
sh(`cd "${WS}" && git init -q -b main && git config user.email sim@example.invalid && git config user.name "jiku flow sim" && git add -A && git commit -q -m "chore: brief" && git checkout -q -b dev`);
fs.mkdirSync(path.join(WS, "_jflow"), { recursive: true });
fs.writeFileSync(path.join(WS, "_jflow/project.yaml"),
  "language: es\njiku:\n  project_id: 900\n  instance: dev\n  writes: false\ngit:\n  platform: gitlab\n  integration_branch: dev\n  production_branch: main\n");
const FAKE_DATA = path.join(RUN, "fake-jiku.json");
fs.writeFileSync(FAKE_DATA, JSON.stringify({ subject: "u1", people: [], requirements: [] }));
const ENV = { ...process.env, PATH: `${path.join(SIM_DIR, "fakejiku")}${path.delimiter}${process.env.PATH}`, FAKE_JIKU_DATA: FAKE_DATA };
const COMMIT = sh(`git -C "${REPO}" rev-parse HEAD`).trim();
const DIRTY = sh(`git -C "${REPO}" status --porcelain -- .claude`).trim() !== "";

// ---------- log ----------
const LOG = fs.createWriteStream(path.join(RUN, "log.jsonl"));
const t0 = Date.now();
function log(type, data) {
  LOG.write(JSON.stringify({ t: ((Date.now() - t0) / 1000).toFixed(1), type, ...data }) + "\n");
  const brief = data.text ?? data.question ?? data.answer ?? "";
  console.log(`[${((Date.now() - t0) / 60000).toFixed(1)}m] ${type}${brief ? ": " + String(brief).slice(0, 140).replace(/\n/g, " ") : ""}`);
}

// ---------- message queue of a session ----------
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
    push(text) {
      queue.push({ type: "user", message: { role: "user", content: text }, parent_tool_use_id: null });
      wake?.(); wake = null;
    },
    close() { closed = true; wake?.(); wake = null; },
  };
}

// ---------- simulated user ----------
const BRIEF = fs.readFileSync(path.join(FIXTURE, "brief.md"), "utf-8");
const HUECOS = fs.readFileSync(path.join(FIXTURE, "reference/huecos.md"), "utf-8");
// The simulated client's prompt stays in Spanish: it is paired with the Spanish fixtures and the measured baselines.
const SIM_SYSTEM = `Sos el cliente que encargó el producto "Turnero". Un agente te está haciendo el discovery: te
hace preguntas y te pide confirmar secciones de documentos. Respondé como el cliente.

Tu conocimiento es SOLO esto:
1. La definición de producto (abajo). Lo que dice, lo decís.
2. La lista de huecos (abajo): respuestas a lo que la definición no dice. Si te preguntan algo
   cubierto por un hueco, respondé exactamente esa respuesta. Si te dan opciones y NINGUNA dice
   exactamente lo mismo que el hueco (o que la definición), NO elijas la más parecida: respondé con
   texto libre, con lo que dice el hueco. Ejemplo: el hueco dice "8 horas sin actividad" y las
   opciones son "8 h desde el ingreso" o "12 h desde el ingreso" → respondé con texto libre
   "8 horas sin actividad".
3. Nada más. Si la pregunta no está cubierta ni por la definición ni por un hueco, elegí la opción
   que el agente recomienda (la marcada como recomendada, o la primera) y marcá la fuente como
   "no previsto". Nunca inventes datos nuevos por tu cuenta.

Cómo responder:
- Pedidos de confirmar una sección ("¿Cerramos la sección…?"): leé los supuestos que lista la
  pregunta. Si alguno contradice la definición o un hueco EN EL FONDO (no por redacción o detalle
  de forma), elegí "Quiero cambios" (o la opción equivalente) y en "respuesta" escribí qué cambiar,
  con fuente el ID del hueco. Si no, elegí cerrarla. Fuente "confirmación".
- Avisos que no preguntan nada: respondé "Seguí." Fuente "aviso".
- Respondé SIEMPRE y SOLO con JSON válido, sin texto alrededor ni bloques de código.

=== DEFINICIÓN DE PRODUCTO ===
${BRIEF}

=== HUECOS ===
${HUECOS}`;

function startSim() {
  const box = inbox();
  const q = query({
    prompt: box.gen,
    options: {
      model: SIM_MODEL, tools: [], settingSources: [], persistSession: false,
      systemPrompt: SIM_SYSTEM, cwd: RUN,
    },
  });
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
    const json = last.replace(/^```(json)?\s*|\s*```$/g, "").trim();
    try { return JSON.parse(json); } catch { return { error: last }; }
  }
  return { ask, cost: () => cost, close: () => box.close() };
}

// ---------- state of the documents ----------
const docStatus = (doc) => {
  if (doc.includes("*")) {
    const dir = path.join(WS, "_jflow/discovery");
    const re = new RegExp("^" + doc.replace(".", "\\.").replace("*", ".+") + "$");
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => re.test(f)) : [];
    if (!files.length) return "missing";
    const states = files.map((f) => docStatus(f));
    return states.every((x) => x === "closed") ? "closed" : states.join(",");
  }
  const p = path.join(WS, "_jflow/discovery", doc);
  if (!fs.existsSync(p)) return "missing";
  const m = fs.readFileSync(p, "utf-8").match(/^status:\s*(.+)$/m);
  return m ? m[1].trim() : "no status";
};

// ---------- one skill session ----------
const metrics = { sessions: [], simUnplanned: [], askCalls: 0, textQuestions: 0 };
let spent = 0;

async function runSkill(skill, produces, sim) {
  const box = inbox();
  const s = { skill, produces, turns: 0, duration_ms: 0, userTurns: 0, cost_usd: 0, modelUsage: {}, result: null };
  metrics.sessions.push(s);
  const q = query({
    prompt: box.gen,
    options: {
      cwd: WS, settingSources: ["project"], permissionMode: "default", persistSession: false,
      model: SKILL_MODEL, maxBudgetUsd: Math.max(BUDGET - spent, 0.5), env: ENV,
      canUseTool: async (toolName, input) => {
        if (toolName !== "AskUserQuestion") return { behavior: "allow", updatedInput: input };
        metrics.askCalls++;
        const qs = input.questions.map((x) => ({
          pregunta: x.question, multiple: !!x.multiSelect,
          opciones: x.options.map((o) => ({ opcion: o.label, descripcion: o.description ?? "" })),
        }));
        log("question", { question: qs.map((x) => x.pregunta).join(" | "), detail: qs });
        // Prompt to the simulated client, in Spanish like its system prompt.
        const r = await sim.ask(`El agente te pregunta con opciones. Para cada pregunta, "respuesta" es el valor EXACTO del campo "opcion" elegido, sin la descripción (o texto libre si ninguna opción sirve).
Formato: {"respuestas":[{"pregunta":"...","respuesta":"...","fuente":"brief|H-NN|no previsto|confirmación"}]}

${JSON.stringify(qs, null, 2)}`);
        const answers = {};
        for (const x of input.questions) {
          const found = (r.respuestas ?? []).find((y) => y.pregunta === x.question) ?? (r.respuestas ?? [])[0];
          let a = found?.respuesta ?? x.options[0].label;
          const labels = x.options.map((o) => o.label);
          const norm = (v) => labels.find((l) => v === l || String(v).startsWith(l + " —") || String(v).startsWith(l + " -")) ?? v;
          a = Array.isArray(a) ? a.map(norm) : norm(a);
          if (x.multiSelect && !Array.isArray(a)) a = [a];
          answers[x.question] = a;
          if (found?.fuente === "no previsto") metrics.simUnplanned.push({ question: x.question, answer: a });
        }
        log("answer", { answer: JSON.stringify(answers), detail: r });
        return { behavior: "allow", updatedInput: { ...input, answers } };
      },
    },
  });

  box.push(`/${skill}`);
  log("start", { text: `/${skill} (${SKILL_MODEL})` });
  let lastText = "";
  for await (const m of q) {
    if (m.type === "assistant") {
      for (const b of m.message.content) if (b.type === "text") lastText = b.text;
    } else if (m.type === "result") {
      s.turns += m.num_turns ?? 0;
      s.duration_ms += m.duration_ms ?? 0;
      s.cost_usd = m.total_cost_usd;
      s.modelUsage = m.modelUsage;
      s.result = m.subtype;
      if (m.subtype !== "success") { log("error", { text: m.subtype }); box.close(); continue; }
      const states = produces.map(docStatus);
      if (states.every((x) => x === "closed")) { log("end", { text: `documents closed: ${produces.join(", ")}` }); box.close(); continue; }
      if (++s.userTurns > MAX_USER_TURNS) { log("error", { text: "user-turn cap reached" }); s.result = "max_user_turns"; box.close(); continue; }
      log("agent", { text: lastText });
      // Prompt to the simulated client, in Spanish like its system prompt.
      const r = await sim.ask(`El agente terminó su turno con este mensaje. Respondé como el cliente.
Formato: {"respuesta":"...","fuente":"brief|H-NN|no previsto|confirmación|aviso","pregunta_por_texto":true|false}
("pregunta_por_texto" es true si el mensaje te hace una pregunta en vez de usar opciones.)

${lastText}`);
      if (r.pregunta_por_texto) metrics.textQuestions++;
      if (r.fuente === "no previsto") metrics.simUnplanned.push({ question: lastText.slice(0, 300), answer: r.respuesta });
      log("user", { answer: r.respuesta ?? "Seguí.", detail: r });
      box.push(r.respuesta ?? "Seguí.");
    }
  }
  spent += s.cost_usd;
  return s.result === "success" && produces.every((x) => docStatus(x) === "closed");
}

// ---------- run ----------
const sim = startSim();
let ok = true;
for (const [skill, produces] of SKILLS) {
  ok = await runSkill(skill, produces, sim);
  if (!ok) break;
}
sim.close();

let check = "";
try { check = sh(`python3 "${REPO}/.claude/scripts/check-discovery.py" --final "${WS}/_jflow/discovery"`); }
catch (e) { check = (e.stdout ?? "") + (e.stderr ?? ""); }

const tokens = {};
for (const s of metrics.sessions)
  for (const [model, u] of Object.entries(s.modelUsage ?? {})) {
    const t = (tokens[model] ??= { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
    t.input += u.inputTokens; t.output += u.outputTokens;
    t.cacheRead += u.cacheReadInputTokens; t.cacheWrite += u.cacheCreationInputTokens;
  }
const run = {
  workflow_commit: COMMIT, workflow_dirty: DIRTY,
  skill_model: SKILL_MODEL, sim_model: SIM_MODEL, budget_usd: BUDGET,
  valid: ok && spent <= BUDGET,
  cost_usd: Number(spent.toFixed(4)),
  sim_cost_usd: Number(sim.cost().toFixed(4)),
  wall_min: Number(((Date.now() - t0) / 60000).toFixed(1)),
  api_min: Number((metrics.sessions.reduce((a, s) => a + s.duration_ms, 0) / 60000).toFixed(1)),
  turns: metrics.sessions.reduce((a, s) => a + s.turns, 0),
  user_turns: metrics.sessions.reduce((a, s) => a + s.userTurns, 0),
  ask_calls: metrics.askCalls,
  text_questions: metrics.textQuestions,
  unplanned: metrics.simUnplanned,
  tokens,
  sessions: metrics.sessions.map(({ modelUsage, ...s }) => s),
  docs: Object.fromEntries([F, D, T, S].map((d) => [d, docStatus(d)])),
  check: check.trim(),
};
fs.writeFileSync(path.join(RUN, "run.json"), JSON.stringify(run, null, 2));
LOG.end();
console.log(`\n${run.valid ? "VALID" : "INVALID"} — ${run.cost_usd} USD (simulator ${run.sim_cost_usd}), ${run.wall_min} min, ${run.user_turns} user turns, ${run.ask_calls} questions with options, ${run.unplanned.length} unplanned`);
console.log(`check: ${run.check.split("\n").pop()}`);
console.log(`→ ${RUN}`);
