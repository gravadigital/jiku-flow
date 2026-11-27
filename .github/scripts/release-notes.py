#!/usr/bin/env python3
"""Print the section of .claude/CHANGELOG.md for a version, to use as the notes of its GitHub release.

    python3 .github/scripts/release-notes.py v1.0.1

Exits 1 when the CHANGELOG has no section for that version.
"""

import re
import sys
from pathlib import Path

version = sys.argv[1].lstrip("v") if len(sys.argv) > 1 else sys.exit(__doc__)
text = (Path(__file__).resolve().parents[2] / ".claude" / "CHANGELOG.md").read_text(encoding="utf-8")
m = re.search(rf"^## \[{re.escape(version)}\][^\n]*\n(.*?)(?=^## \[|^\[[^\]]+\]: |\Z)", text, re.M | re.S)
if not m or not m.group(1).strip():
    sys.exit(f"no section for {version} in .claude/CHANGELOG.md")
print(m.group(1).strip())
print(f"\n**Install:** `curl -fsSL https://raw.githubusercontent.com/gravadigital/jiku-flow/main/install.sh "
      f"| bash -s -- --version v{version}` · **Update:** `/jflow-framework-update v{version}` in Claude Code.")
