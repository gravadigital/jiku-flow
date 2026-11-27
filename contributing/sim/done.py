#!/usr/bin/env python3
"""Ready-made `--done` checks for session.mjs. Run from the workspace (session.mjs does): each exits 0
when the skill finished its work, 1 otherwise.

    python3 <repo>/contributing/sim/done.py plan            /jflow-product-discover: the discovery is
                                                            committed and the base and every part of
                                                            the plan were created in Jiku
    python3 <repo>/contributing/sim/done.py ready ID        /jflow-spec, /jflow-product-scaffold: no
                                                            local draft left and the specification of
                                                            ID is ready in Jiku
    python3 <repo>/contributing/sim/done.py branch PATTERN  a branch matching PATTERN (git glob, e.g.
                                                            'fix/42-*') is pushed to origin
    python3 <repo>/contributing/sim/done.py tag             /jflow-release: a v* tag is pushed to origin
    python3 <repo>/contributing/sim/done.py fake-write      with fakejiku: something was written to Jiku

Reads Jiku through the workspace's own jflowlib, so it uses the instance in _jflow/project.yaml.
"""
import json
import os
import subprocess
import sys
from pathlib import Path


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout.strip()


def jflowlib():
    sys.path.insert(0, str(Path(".claude/scripts").resolve()))
    from jflowlib import jiku
    from jflowlib.repo import Repo
    return jiku, Repo()


def plan():
    _, repo = jflowlib()
    d = repo.tmp / "plan"
    try:
        parts = json.loads((d / "plan.json").read_text())["parts"]
        created = json.loads((d / "created.json").read_text())
    except (OSError, ValueError, KeyError):
        return False
    committed = git("log", "--oneline", "--", "_jflow/discovery")
    return len(created) == len(parts) + 1 and all(int(v) > 0 for v in created.values()) and bool(committed)


def ready(id_):
    jiku, repo = jflowlib()
    if (repo.tmp / f"spec-{int(id_)}.md").exists():
        return False
    return jiku.spec_status(jiku.Jiku(repo).get_requirement(id_)) == jiku.SPEC_READY


def branch(pattern):
    git("fetch", "-q", "origin")
    return bool(git("branch", "-r", "--list", f"origin/{pattern}"))


def tag():
    return bool(git("ls-remote", "--tags", "origin", "v*"))


def fake_write():
    p = Path(os.environ.get("FAKE_JIKU_DATA", "") + ".writes.jsonl")
    return p.is_file() and p.stat().st_size > 0


CHECKS = {"plan": plan, "ready": ready, "branch": branch, "tag": tag, "fake-write": fake_write}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in CHECKS:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    try:
        ok = CHECKS[sys.argv[1]](*sys.argv[2:])
    except SystemExit:
        ok = False  # jflowlib's die(): Jiku unreachable or the requirement missing
    sys.exit(0 if ok else 1)
