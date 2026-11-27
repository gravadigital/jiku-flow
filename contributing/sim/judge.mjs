// Quality judge of a discovery run (see contributing/testing.md).
//
// Usage: node contributing/sim/judge.mjs <run-folder> [--model opus] [--budget 10]
//
// Compares the documents the run produced against the reference discovery
// (contributing/fixtures/turnero/reference/), the brief and the list of gaps (huecos.md), and reads
// log.jsonl to know what the user was asked. Writes judge.json in the run folder.
import { query } from "@anthropic-ai/claude-agent-sdk";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIM_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(SIM_DIR, "../..");
const FIXTURE = path.join(REPO, "contributing/fixtures/turnero");
const argv = process.argv.slice(2);
const RUN = argv[0] && path.resolve(argv[0]);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
if (!RUN || !fs.existsSync(path.join(RUN, "workspace/_jflow/discovery"))) {
  console.error("usage: node contributing/sim/judge.mjs <run-folder>  (a discovery__* folder with workspace/_jflow/discovery)");
  process.exit(2);
}

// Everything the judge reads, together in one folder, so its tools never leave it. The file names are
// the ones the (Spanish) prompt below names.
const IN = path.join(RUN, "judge-input");
fs.rmSync(IN, { recursive: true, force: true });
fs.mkdirSync(IN, { recursive: true });
const sh = (c) => execSync(c, { stdio: "pipe", encoding: "utf-8" });
sh(`cp -a "${RUN}/workspace/_jflow/discovery" "${IN}/resultado"`);
sh(`cp -a "${FIXTURE}/reference/discovery" "${IN}/referencia"`);
sh(`cp "${FIXTURE}/reference/huecos.md" "${IN}/"`);
sh(`cp "${FIXTURE}/brief.md" "${IN}/definicion-producto.md"`);
// The discovery rules: what a rule mandates is not a failure.
sh(`mkdir -p "${IN}/reglas" && cp "${REPO}/.claude/specs/discovery.md" "${REPO}"/.claude/templates/discovery-*-tmpl.yaml "${IN}/reglas/"`);
// Fixed list of the reference's definitions: the coverage denominator does not depend on the judge.
const ITEMS = JSON.parse(sh(`python3 "${SIM_DIR}/items.py" "${FIXTURE}/reference/discovery"`));
fs.writeFileSync(path.join(IN, "items.json"), JSON.stringify(ITEMS, null, 1));
// Only the questions and answers of the log: they prove what the user was asked. The event types are
// given to the judge in Spanish, as its prompt expects (older runs logged them in Spanish already).
const TIPO = { question: "pregunta", answer: "respuesta", agent: "agente", user: "usuario" };
const qa = fs.readFileSync(path.join(RUN, "log.jsonl"), "utf-8").trim().split("\n").map(JSON.parse)
  .map((e) => ({ ...e, type: TIPO[e.type] ?? e.type }))
  .filter((e) => ["pregunta", "respuesta", "agente", "usuario"].includes(e.type))
  .map((e) => ({ tipo: e.type, texto: e.question ?? e.answer ?? e.text }));
fs.writeFileSync(path.join(IN, "preguntas.json"), JSON.stringify(qa, null, 1));

// The judge's prompt stays in Spanish: it is paired with the Spanish reference and the measured baselines.
const PROMPT = `Sos el juez de calidad de una corrida de discovery. En este directorio tenés:

- resultado/: los documentos que produjo la corrida: functional-analysis, domain-analysis,
  technical-analysis y el esquema de base (db-schema-{servicio}.md).
- referencia/: los mismos documentos, escritos como deberían quedar.
- definicion-producto.md: el brief del cliente.
- huecos.md: las respuestas del cliente a lo que el brief no dice (H-01 … H-49).
- preguntas.json: todas las preguntas que el agente le hizo al cliente y sus respuestas, en orden.
- items.json: la lista fija de definiciones de la referencia, cada una con un id (F-xxx funcional,
  D-xxx dominio, T-xxx técnico, S-xxx esquema). En el esquema, un nombre en inglés distinto pero
  equivalente al de la referencia NO es un faltante: importa que la tabla, la columna, el tipo, la
  obligatoriedad y la restricción estén.
- reglas/: la spec y los templates del discovery. Lo que una regla manda NO es una falla (por
  ejemplo, "siempre puede haber más de una instancia de cada actor", o "los módulos van en inglés").

Leé todo. Después evaluá el RESULTADO en estas cuatro dimensiones:

1. COBERTURA: para CADA ítem de items.json, ¿la definición está en el resultado? No importan los
   IDs ni la redacción: importa que la definición esté con el mismo contenido. Un ítem está si el
   resultado define lo mismo; si lo define distinto, falta (y si contradice el brief o un hueco,
   además va en fidelidad). Devolvé la lista de ids que faltan.
2. FIDELIDAD: ¿hay definiciones del resultado que CONTRADIGAN el brief o un hueco? Listalas con la
   cita del brief o el ID del hueco.
3. INVENCIÓN: ¿hay definiciones del resultado sobre algo que el brief no dice y que NO surge de
   ninguna respuesta de preguntas.json? Eso es inventar: listalas. Lo que vino de una respuesta del
   cliente (aunque sea "no previsto") NO es invención. Tampoco lo es un supuesto que el agente
   listó en una pregunta de confirmación de sección que el cliente aceptó: el cliente lo aprobó.
4. FORMA: violaciones a las reglas del discovery: contexto o porqué en vez de definiciones;
   confirmaciones de varias secciones o bloques juntos en una sola pregunta (mirá preguntas.json);
   valores repetidos en vez de referenciar parámetros; flujo de pantallas en el funcional; un
   supuesto (listado en una confirmación de sección) que agrega una regla nueva en vez de ser
   redacción, presentación o consecuencia directa de algo ya definido (ver "Impact" en
   reglas/discovery.md); una confirmación con más de 5 supuestos.

No premies la extensión: un resultado más largo que la referencia no es mejor si agrega cosas que
nadie pidió (eso cuenta como invención).

Respondé SOLO con JSON válido, sin texto alrededor:
{
  "faltan": [{"id": "F-012", "motivo": "..."}],
  "fidelidad": [{"definicion": "...", "contradice": "brief: … | H-NN"}],
  "invencion": [{"definicion": "...", "documento": "..."}],
  "forma": [{"regla": "...", "ejemplo": "..."}],
  "resumen": "dos o tres líneas"
}`;

const q = query({
  prompt: PROMPT,
  options: {
    cwd: IN, model: arg("model", "opus"), maxBudgetUsd: Number(arg("budget", "10")),
    tools: ["Read", "Grep", "Glob"], settingSources: [], persistSession: false,
    permissionMode: "default",
    canUseTool: async (t, input) =>
      ["Read", "Grep", "Glob"].includes(t) ? { behavior: "allow", updatedInput: input } : { behavior: "deny", message: "read-only" },
  },
});

let last = "", result = null;
for await (const m of q) {
  if (m.type === "assistant") for (const b of m.message.content) if (b.type === "text") last = b.text;
  if (m.type === "result") result = m;
}
const raw = last.replace(/^[\s\S]*?(\{)/, "$1").replace(/\}[^}]*$/, "}");
let verdict;
try { verdict = JSON.parse(raw); } catch { verdict = { error: "could not parse the judge's JSON", raw: last }; }

const missing = new Set((verdict.faltan ?? []).map((x) => x.id));
const pct = (p) => {
  const ids = Object.keys(ITEMS).filter((k) => k.startsWith(p + "-"));
  return Math.round((100 * ids.filter((k) => !missing.has(k)).length) / ids.length);
};
const out = {
  ...verdict,
  puntaje: verdict.faltan ? {
    cobertura_funcional_pct: pct("F"),
    cobertura_dominio_pct: pct("D"),
    cobertura_tecnico_pct: pct("T"),
    cobertura_esquema_pct: pct("S"),
    contradicciones: verdict.fidelidad?.length ?? null,
    invenciones: verdict.invencion?.length ?? null,
    violaciones_de_forma: verdict.forma?.length ?? null,
  } : null,
  judge_cost_usd: result?.total_cost_usd,
};
fs.writeFileSync(path.join(RUN, "judge.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.puntaje, null, 2));
console.log(out.resumen ?? out.error);
console.log(`judge: ${out.judge_cost_usd} USD → ${path.join(RUN, "judge.json")}`);
