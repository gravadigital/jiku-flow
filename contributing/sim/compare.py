#!/usr/bin/env python3
"""Comparison table of discovery runs (see contributing/testing.md).

Usage:
    python3 contributing/sim/compare.py <run> [<run> ...]
    python3 contributing/sim/compare.py before=discovery__20261010-153424 after=discovery__20261012-094510 ...

Each argument is a folder of contributing/sim/runs/ (name or path), optionally labelled `label=run`.
Reads run.json, log.jsonl and judge.json (if present: run the judge first).

Columns:
  valid        the run closed every document within budget (an invalid run is not compared)
  cost         USD of the skill (without simulator or judge)
  min          wall-clock minutes
  questions    questions the user answered (each AskUserQuestion call carries up to 4)
  confirm      of them, section confirmations
  content      the rest: what the user had to decide
  assumptions  assumptions listed in the confirmations (and the maximum in one section)
  unplanned    questions neither the brief nor huecos.md covered (candidates to add to huecos.md)
  coverage     % of the reference's fixed list, functional / domain / technical / schema (judge)
  contra/inv/form  contradictions, inventions and form violations (judge)
  check        observations of check-discovery --final ("ok" if none)
"""

import json
import re
import sys
from pathlib import Path

RUNS = Path(__file__).resolve().parent / "runs"
CONFIRM_RE = re.compile(r"(?i)^¿?\s*cerramos|cerrar (la|el) (secci|bloque)")


def load(arg):
    label, _, name = arg.rpartition("=")
    path = Path(name) if Path(name).exists() else RUNS / name
    run = json.loads((path / "run.json").read_text())
    events = [json.loads(l) for l in (path / "log.jsonl").read_text().splitlines() if l.strip()]
    judge = json.loads((path / "judge.json").read_text()) if (path / "judge.json").exists() else {}
    # "pregunta": the event type of runs logged before the simulator was translated
    questions = [q for e in events if e["type"] in ("question", "pregunta") for q in e.get("detail", [])]
    # A section confirmation is recognized by its options ("Cerrar la sección" / "Quiero cambios"),
    # not by the wording of the question, which varies between runs. Spanish: the Turnero discovery.
    def is_confirm(q):
        labels = [o["opcion"] if isinstance(o, dict) else str(o) for o in q.get("opciones", [])]
        return CONFIRM_RE.search(q["pregunta"]) or any(l.lower().startswith("cerrar") for l in labels)
    confirms = [q for q in questions if is_confirm(q)]
    assumptions = [len(re.findall(r"(?:^|\s)\(?\d+[.)]\s", q["pregunta"])) for q in confirms]
    p = judge.get("puntaje") or {}
    check = run.get("check", "").strip().splitlines()
    return {
        "run": label or path.name,
        "valid": "yes" if run.get("valid") else "NO",
        "cost": f"{run.get('cost_usd', 0):.2f}",
        "min": f"{run.get('wall_min', 0):.1f}",
        "questions": len(questions),
        "confirm": len(confirms),
        "content": len(questions) - len(confirms),
        "assumptions": f"{sum(assumptions)} ({max(assumptions) if assumptions else 0})",
        "unplanned": len(run.get("unplanned", [])),
        "coverage": "/".join(str(p.get(k, "—")) for k in
                              ("cobertura_funcional_pct", "cobertura_dominio_pct", "cobertura_tecnico_pct",
                               "cobertura_esquema_pct") if k in p or k != "cobertura_esquema_pct"),
        "contra": p.get("contradicciones", "—"),
        "inv": p.get("invenciones", "—"),
        "form": p.get("violaciones_de_forma", "—"),
        "check": "ok" if check and check[-1] in ("No observations", "Sin observaciones") else (check[-1] if check else "—"),
    }


def main(args):
    if not args:
        print(__doc__)
        return 2
    rows = [load(a) for a in args]
    cols = list(rows[0])
    width = {c: max(len(c), *(len(str(r[c])) for r in rows)) for c in cols}
    print("| " + " | ".join(c.ljust(width[c]) for c in cols) + " |")
    print("|" + "|".join("-" * (width[c] + 2) for c in cols) + "|")
    for r in rows:
        print("| " + " | ".join(str(r[c]).ljust(width[c]) for c in cols) + " |")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
