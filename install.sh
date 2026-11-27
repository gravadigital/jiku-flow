#!/usr/bin/env bash
# Install jiku flow into the current repository.
#
#   curl -fsSL https://raw.githubusercontent.com/gravadigital/jiku-flow/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/gravadigital/jiku-flow/main/install.sh | bash -s -- --version v1.0.0
#
# It adds jiku flow to .claude/ without touching what is already there: your own skills, agents and
# settings stay; settings.json and CLAUDE.md are merged. To update an installed copy, use
# /jflow-framework-update inside Claude Code.

set -euo pipefail

REPO_URL="${JFLOW_REPO_URL:-https://github.com/gravadigital/jiku-flow.git}"
REF=""

while [ $# -gt 0 ]; do
    case "$1" in
        --version) REF="${2:?--version needs a value, e.g. v1.0.0}"; shift 2 ;;
        --repo) REPO_URL="${2:?--repo needs a URL}"; shift 2 ;;
        -h|--help) sed -n '2,10p' "$0" 2>/dev/null || true; exit 0 ;;
        *) echo "Unknown option: $1" >&2; exit 2 ;;
    esac
done

say() { printf '%s\n' "$*"; }
fail() { printf 'jiku flow: %s\n' "$*" >&2; exit 1; }

# Download one version into a new folder: a tag (vX.Y.Z), a branch, or the default branch. A fetch, not a
# clone: `clone --branch` of an annotated tag prints a warning ("... is not a commit").
download() {
    local url=$1 ref=$2 dir=$3
    git init -q "$dir" || return 1
    if [ -n "$ref" ]; then
        git -C "$dir" fetch -q --depth 1 "$url" "refs/tags/$ref" 2>/dev/null \
            || git -C "$dir" fetch -q --depth 1 "$url" "$ref" || return 1
    else
        git -C "$dir" fetch -q --depth 1 "$url" HEAD || return 1
    fi
    git -C "$dir" -c advice.detachedHead=false checkout -q FETCH_HEAD
}

# ---------- checks ----------
command -v git >/dev/null 2>&1 || fail "git is required"
command -v python3 >/dev/null 2>&1 || fail "python3 is required (3.9 or later)"
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' || fail "python3 3.9 or later is required"
top=$(git rev-parse --show-toplevel 2>/dev/null) || fail "run it inside a git repository (git init first)"
[ "$(cd "$top" && pwd -P)" = "$(pwd -P)" ] || fail "run it at the root of the repository: $top"
if [ -f .claude/scripts/jflow.py ]; then
    fail "jiku flow is already installed here (.claude/VERSION: $(cat .claude/VERSION 2>/dev/null || echo '?')). To update it, run /jflow-framework-update in Claude Code"
fi

# ---------- download ----------
tmp=$(mktemp -d "${TMPDIR:-/tmp}/jflow-install.XXXXXX")
trap 'rm -rf "$tmp"' EXIT
if [ -z "$REF" ]; then
    REF=$(git ls-remote --tags --refs "$REPO_URL" 'v*' 2>/dev/null | sed 's#.*refs/tags/##' \
          | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -1 || true)
fi
say "Downloading jiku flow ${REF:-(default branch)}..."
download "$REPO_URL" "$REF" "$tmp/jiku-flow" || fail "could not download $REPO_URL${REF:+ ($REF)}"

# ---------- install ----------
python3 "$tmp/jiku-flow/.claude/scripts/jflow.py" --root . install
version=$(tr -d '[:space:]' < .claude/VERSION)
printf '%s\n' "$version" > .claude/.jflow-version
chmod +x .claude/hooks/jflow-*.sh 2>/dev/null || true

# ---------- next steps ----------
say ""
say "jiku flow $version installed in .claude/"
if ! command -v jiku >/dev/null 2>&1; then
    say ""
    say "The Jiku CLI is not installed: jiku flow needs it to read and write requirements."
    say "  https://github.com/gravadigital/jiku-go — then: jiku config init && jiku login"
fi
say ""
say "Next, in Claude Code:"
say "  /jflow-product-discover     define a new product"
say "  /jflow-product-brownfield   bring an existing product into jiku flow"
say ""
say "Review the changes (git status) and commit them."
