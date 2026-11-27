#!/usr/bin/env python3
"""Write the whole product definition of a workspace's closed discovery, as if every part of its plan
were already built (Origin `initial`). For scenarios that specify a change to a built product without
building it first, e.g. Turnero #9003.

    python3 contributing/sim/built_definition.py WORKSPACE

The workspace must have `.claude/` and `_jflow/discovery/` (closed). It writes `_jflow/prd/`,
`_jflow/db-schemas/`, `_jflow/flows/`, the indexes and `prd/architecture/testing.md`. The result is a
test fixture: its `{{fill: …}}` placeholders (block coverage, module responsibilities…) are left as they
are, and `def-check` reports them.
"""

import sys
from pathlib import Path

ws = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else sys.exit(__doc__)
sys.path.insert(0, str(ws / ".claude" / "scripts"))
sys.dont_write_bytecode = True

from jflowlib import definition as D  # noqa: E402
from jflowlib.repo import Repo  # noqa: E402
from jflowlib.transcribe import build_model  # noqa: E402

repo = Repo(ws)
files, _ = build_model(repo)
for rel, content in files.items():
    p = repo.jflow / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
defn = D.Definition(repo)
D.generate_indexes(defn)
content, _ = D.scaffold_testing(D.Definition(repo))
(repo.arch / "testing.md").write_text(content, encoding="utf-8")
print(f"{len(files)} files of the built definition in {repo.rel(repo.jflow)}/")
