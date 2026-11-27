#!/usr/bin/env python3
"""Extracts the fixed list of definitions of the reference discovery, for the judge.

Every table row, every bullet of the lists that define something, every "Baja" (removal) and
"Relaciones" of an entity, every key flow and every DBML column, enum value and table note is an item
with a stable id (F-001, D-001, T-001, S-001). The judge only decides which ones are missing in the
result, so the coverage denominator is always the same.

The section names below are the Spanish structure of the discovery: the reference is in Spanish.

Usage: items.py <discovery-folder> > items.json
"""

import json
import re
import sys
from pathlib import Path

DOCS = [("F", "functional-analysis.md"), ("D", "domain-analysis.md"), ("T", "technical-analysis.md"),
        ("S", "db-schema-*.md")]
SKIP_TABLES = {("Funcionalidades", "Bloque")}  # the block index is structure, not a definition
BULLET_SECTIONS = {"Fuera de alcance", "Funcionalidades"}


def items_of(path):
    out, section, sub, header, fence, block = [], None, None, None, False, None
    for line in path.read_text(encoding="utf-8").split("---\n", 2)[-1].splitlines():
        if line.startswith("```"):
            fence = not fence
            if line.strip() == "```dbml":
                block = None
            continue
        if fence:
            # DBML: every enum value, every column and the note of every table is an item
            s = line.split("//")[0].strip()
            m = re.match(r"(Enum|Table)\s+(\w+)", s)
            if m:
                block = f"{m.group(1)} {m.group(2)}"
            elif s.startswith("Note:") and block:
                out.append(f"{block}: {s}")
            elif s and block and not s.startswith(("}", "indexes", "(")) and re.match(r"\w+", s):
                out.append(f"{block}: {s}")
            continue
        if line.startswith("## "):
            section, sub, header = line[3:].strip(), None, None
            continue
        if line.startswith("### "):
            sub, header = line[4:].strip(), None
            if section == "Flujos clave":
                out.append(f"Flujo clave: {sub}")
            continue
        if line.startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if header is None:
                header = cells
                continue
            if set(line.replace("|", "").strip()) <= {"-"}:
                continue
            if (section, header[0]) in SKIP_TABLES:
                continue
            where = f"{section} / {sub}" if sub else section
            out.append(f"{where}: " + " | ".join(f"{h}: {c}" for h, c in zip(header, cells)))
            continue
        header = None if not line.strip() else header
        if line.startswith("**Baja:**") or line.startswith("**Relaciones:**"):
            out.append(f"{section} / {sub}: {line}")
        elif line.startswith("- ") and section in BULLET_SECTIONS:
            out.append(f"{section}{' / ' + sub if sub else ''}: {line[2:]}")
    return out


def main():
    root = Path(sys.argv[1])
    result = {}
    for prefix, name in DOCS:
        items = [t for p in sorted(root.glob(name)) for t in items_of(p)]
        for i, text in enumerate(items, 1):
            result[f"{prefix}-{i:03d}"] = text
    json.dump(result, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
