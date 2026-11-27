#!/usr/bin/env python3
"""The fast tests of jiku flow: the scripts and the installer, on throwaway copies, with no Jiku and no
model. Standard library only.

    python3 contributing/tests/run.py            # everything (~30 s)
    python3 contributing/tests/run.py scripts    # only the tests whose name contains "scripts"

Each test builds a temporary repository from a fixture of contributing/fixtures/, runs jflow.py (or
install.sh) there, and checks the result. Jiku is never called: JFLOW_JIKU_DRY_RUN=1 and the commands that
would read it run with --offline or are not run. See contributing/testing.md.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "contributing" / "fixtures"
CLAUDE = ROOT / ".claude"
sys.path.insert(0, str(CLAUDE / "scripts"))
sys.dont_write_bytecode = True

TESTS = []


def test(fn):
    TESTS.append(fn)
    return fn


class Fail(Exception):
    pass


def check(cond, msg):
    if not cond:
        raise Fail(msg)


def sh(cmd, cwd, env=None, ok=(0,)):
    e = dict(os.environ, JFLOW_JIKU_DRY_RUN="1", GIT_CONFIG_GLOBAL="/dev/null", **(env or {}))
    r = subprocess.run(cmd, cwd=cwd, shell=isinstance(cmd, str), capture_output=True, text=True, env=e)
    if ok is not None and r.returncode not in ok:
        raise Fail(f"`{cmd}` exited {r.returncode}\n{r.stdout[-2000:]}\n{r.stderr[-2000:]}")
    return r


def git_repo(path):
    path.mkdir(parents=True, exist_ok=True)
    sh("git init -q && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m init", path)
    return path


def product(tmp, fixture, language=None):
    """A product repository with jiku flow (copied, not installed) and the fixture's closed discovery."""
    ws = git_repo(tmp / fixture)
    shutil.copytree(CLAUDE, ws / ".claude", ignore=shutil.ignore_patterns("__pycache__"))
    shutil.copytree(FIXTURES / fixture / "discovery", ws / "_jflow" / "discovery")
    if language:
        (ws / "_jflow" / "project.yaml").write_text(
            f"language: {language}\njiku:\n  project_id: 1\n  instance: dev\n", encoding="utf-8")
    return ws


def jflow(ws, *args, ok=(0,)):
    env = {"TMPDIR": str(ws.parent / f"tmp-{ws.name}")}
    Path(env["TMPDIR"]).mkdir(exist_ok=True)
    return sh([sys.executable, ".claude/scripts/jflow.py", *args], ws, env, ok)


def codes(text):
    """The observation codes in a check's output: {"S8", "P1", …}."""
    return set(re.findall(r"\[([A-Z]\d+)\]", text)) | ({"P1"} if " P1 " in text else set())


def plan_drafts(ws):
    d = Path(ws.parent / f"tmp-{ws.name}")
    return sorted(d.rglob("plan/part-*.md"))


# ---------- scripts ----------

@test
def scripts_discovery_check_turnero():
    with tempfile.TemporaryDirectory() as t:
        ws = product(Path(t), "turnero")
        r = jflow(ws, "discovery-check", ok=(0, 1))
        check(codes(r.stdout) <= {"C6"}, f"unexpected observations:\n{r.stdout}")


@test
def scripts_base_definition_turnero():
    """def-base writes an English-structured definition that def-check accepts (only pending placeholders)."""
    with tempfile.TemporaryDirectory() as t:
        ws = product(Path(t), "turnero")
        jflow(ws, "init-project", "--project-id", "1", "--instance", "dev", "--dry-run-jiku")
        jflow(ws, "def-base")
        r = jflow(ws, "def-check", ok=(0, 1))
        check(codes(r.stdout) <= {"D2", "H2"}, f"unexpected observations:\n{r.stdout}")
        prd = ws / "_jflow" / "prd"
        check("## Product" in (prd / "decisions.md").read_text(), "decisions.md has no English «## Product»")
        check("| Origin |" in (prd / "parameters.md").read_text(), "parameters.md has no «Origin» column")
        check((ws / "docs" / "operacion.md").exists(), "init-project did not copy the Spanish operations guide")
        check(jflow(ws, "next-id", "DEC", "--offline").stdout.strip() == "DEC-09", "next-id DEC is not DEC-09")


@test
def scripts_plan_turnero_es_and_en():
    """The plan drafts: Spanish structure by default, English with language: en; the same observations."""
    found = {}
    with tempfile.TemporaryDirectory() as t:
        for lang in ("es", "en"):
            ws = product(Path(t) / lang, "turnero", language=lang)
            jflow(ws, "plan-build", "--plan", str(FIXTURES / "turnero" / "plan.json"))
            drafts = plan_drafts(ws)
            check(len(drafts) == 4, f"{lang}: expected 4 drafts, found {len(drafts)}")
            text = drafts[1].read_text(encoding="utf-8")
            head, crit = ("# Alcance", "| Cambio | ID | Criterio |") if lang == "es" else \
                         ("# Scope", "| Change | ID | Criterion |")
            check(head in text and crit in text, f"{lang}: the draft structure is not in {lang}")
            r = jflow(ws, "plan-check", ok=(0, 1))
            found[lang] = sorted(re.findall(r"^part (\d+): \[?([A-Z]\d+)", r.stdout, re.M))
    check(found["es"] == found["en"], f"plan-check differs between es and en:\n{found}")
    check({c for _, c in found["es"]} <= {"S8", "S10", "P1"}, f"unexpected codes: {found['es']}")


@test
def scripts_plan_other_fixtures():
    """Every fixture with a plan builds and checks without crashing."""
    with tempfile.TemporaryDirectory() as t:
        for fx in sorted(p.name for p in FIXTURES.iterdir() if (p / "plan.json").exists()):
            ws = product(Path(t), fx)
            jflow(ws, "discovery-check", ok=(0, 1))
            jflow(ws, "plan-build", "--plan", str(FIXTURES / fx / "plan.json"))
            jflow(ws, "plan-check", ok=(0, 1))
            check(plan_drafts(ws), f"{fx}: no drafts")


@test
def scripts_language_roundtrip():
    """Specification drafts, amend, the status line and the CHANGELOG in both languages."""
    from jflowlib import jiku as J
    from jflowlib import spec as S
    from jflowlib import workflow as W
    from jflowlib.repo import Repo
    for lang in ("es", "en"):
        sp = S.Spec(5, S.empty(lang))
        back = S.parse_draft(S.render_draft(sp, lang), 5)
        check(back.fields == sp.fields, f"{lang}: a draft does not read back")
        a = S.amend(sp, [{"Change": "add", "ID": "CAN-09", "Criterion": "x"}], lang)
        rows = a.criteria()[0]
        check(a.decided() == ["CAN-09"] and rows[-1]["ID"] == "CAN-09", f"{lang}: amend")
        line = J.spec_line(J.SPEC_READY, lang)
        check(J.spec_status({"description": "x\n\n" + line}) == J.SPEC_READY, f"{lang}: spec line")
    with tempfile.TemporaryDirectory() as t:
        repo = git_repo(Path(t) / "r")
        (repo / "_jflow").mkdir()
        for lang, added in (("es", "### Agregado"), ("en", "### Added")):
            (repo / "_jflow" / "project.yaml").write_text(f"language: {lang}\n")
            (repo / "CHANGELOG.md").write_text("# Changelog\n\n## [Sin publicar]\n\n")
            sec = W.changelog(Repo(repo), "1.0.0", [{"id": 8, "title": "x", "type": "funcionalidad"}], write=False)
            check(added in sec, f"{lang}: CHANGELOG heading")


# ---------- install and update ----------

def remote(tmp, version, change=None):
    """A git repository standing for github.com/gravadigital/jiku-flow, at a tagged version."""
    r = tmp / "remote"
    if not r.exists():
        git_repo(r)
        shutil.copytree(CLAUDE, r / ".claude", ignore=shutil.ignore_patterns("__pycache__"))
        shutil.copy(ROOT / "install.sh", r / "install.sh")
    if change:
        change(r)
    (r / ".claude" / "VERSION").write_text(version + "\n")
    sh(f"git add -A && git -c user.email=t@t -c user.name=t commit -q -m v{version} && git tag v{version}", r)
    return r


def install(repo, rem, *args):
    return sh(["bash", str(rem / "install.sh"), "--repo", str(rem), *args], repo)


@test
def install_into_empty_repo():
    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        rem = remote(t, "1.0.0")
        p = git_repo(t / "p")
        install(p, rem)
        c = p / ".claude"
        check((c / "scripts" / "jflow.py").exists() and (c / ".jflow-manifest").exists(), "not installed")
        check((c / ".jflow-version").read_text().strip() == "1.0.0", ".jflow-version")
        check("jiku flow: begin" in (c / "CLAUDE.md").read_text(), "CLAUDE.md block")
        r = install(p, rem) if False else sh(["bash", str(rem / "install.sh"), "--repo", str(rem)], p, ok=None)
        check(r.returncode != 0 and "already installed" in r.stderr, "a second install is not refused")


@test
def install_keeps_the_users_claude():
    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        rem = remote(t, "1.0.0")
        p = git_repo(t / "p")
        c = p / ".claude"
        (c / "skills" / "mine").mkdir(parents=True)
        (c / "skills" / "mine" / "SKILL.md").write_text("mine\n")
        (c / "settings.json").write_text(json.dumps({
            "permissions": {"allow": ["Bash(npm:*)"]}, "model": "opus",
            "hooks": {"Stop": [{"matcher": "", "hooks": [{"type": "command", "command": "echo hi"}]}]}}))
        (c / "CLAUDE.md").write_text("# Mine\n\nBe nice.\n")
        install(p, rem)
        s = json.loads((c / "settings.json").read_text())
        check(s.get("model") == "opus" and "Bash(npm:*)" in s["permissions"]["allow"], "user settings lost")
        check(any(h["command"] == "echo hi" for e in s["hooks"]["Stop"] for h in e["hooks"]), "user hook lost")
        check(any("jflow-pre-compact" in h["command"] for e in s["hooks"]["PreCompact"] for h in e["hooks"]),
              "jiku flow hook missing")
        check((c / "skills" / "mine" / "SKILL.md").read_text() == "mine\n", "user skill touched")
        md = (c / "CLAUDE.md").read_text()
        check(md.startswith("# Mine") and "jiku flow: begin" in md, "CLAUDE.md not merged")


@test
def update_respects_local_changes():
    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        rem = remote(t, "1.0.0")
        p = git_repo(t / "p")
        install(p, rem)
        c = p / ".claude"
        with open(c / "specs" / "jiku.md", "a") as f:
            f.write("local\n")
        with open(c / "skills" / "jflow-spec" / "SKILL.md", "a") as f:
            f.write("local\n")

        def v11(r):
            with open(r / ".claude" / "skills" / "jflow-status" / "SKILL.md", "a") as f:
                f.write("new in 1.1\n")
            (r / ".claude" / "specs" / "functional-analysis.md").unlink()
            s = json.loads((r / ".claude" / "settings.json").read_text())
            s["permissions"]["allow"] = [a for a in s["permissions"]["allow"] if a != "WebSearch"] + ["Bash(docker:*)"]
            (r / ".claude" / "settings.json").write_text(json.dumps(s, indent=2))
        remote(t, "1.1.0", v11)
        env = {"JFLOW_REPO_URL": str(rem), "TMPDIR": str(t / "tmp")}
        (t / "tmp").mkdir()
        u = ".claude/scripts/framework-update.sh"
        sh(f"bash {u} fetch-remote", p, env)
        d = sh(f"bash {u} detect-changes", p, env).stdout
        check("MODIFIED: 2" in d and "REMOVE: 1" in d, f"detect-changes:\n{d}")
        sh(f"bash {u} update --keep specs/jiku.md", p, env)
        sh(f"bash {u} migrate", p, env)
        sh(f"bash {u} verify", p, env)
        check((c / ".jflow-version").read_text().strip() == "1.1.0", ".jflow-version not moved")
        check("new in 1.1" in (c / "skills" / "jflow-status" / "SKILL.md").read_text(), "not updated")
        check(not (c / "specs" / "functional-analysis.md").exists(), "dropped file not removed")
        check((c / "specs" / "jiku.md.new").exists() and "local" in (c / "specs" / "jiku.md").read_text(),
              "--keep not honoured")
        check((c / "skills" / "jflow-spec" / "SKILL.md.bkp").exists(), "replaced file has no .bkp")
        allow = json.loads((c / "settings.json").read_text())["permissions"]["allow"]
        check("Bash(docker:*)" in allow and "WebSearch" not in allow, f"settings not merged: {allow}")


# ---------- runner ----------

def main(argv):
    only = argv[0] if argv else ""
    chosen = [t for t in TESTS if only in t.__name__]
    failed = 0
    for t in chosen:
        try:
            t()
            print(f"ok    {t.__name__}")
        except Fail as e:
            failed += 1
            print(f"FAIL  {t.__name__}: {e}")
        except Exception:
            failed += 1
            print(f"ERROR {t.__name__}\n{traceback.format_exc()}")
    print(f"\n{len(chosen) - failed}/{len(chosen)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
