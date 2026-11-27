#!/bin/bash
# Measures /jflow-product-discover: N runs in parallel, each scored by the judge when it ends.
#
# Usage: contributing/sim/measure.sh [N=2] [--budget USD] [--skill-model opus] [--sim-model sonnet]
#
# Measures the skill as it is in the repo's .claude/: commit first, so every run is tied to a clean
# commit (run.json records workflow_commit and workflow_dirty).
# At the end it prints the comparison table of the new runs. See contributing/testing.md.
set -euo pipefail

SIM_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SIM_DIR/../.." && pwd)"
N="${1:-2}"; [[ "$N" =~ ^[0-9]+$ ]] && shift || N=2
EXTRA=("$@")

cd "$REPO"
[ -d "$SIM_DIR/node_modules" ] || (cd "$SIM_DIR" && npm ci --silent)
if [ -n "$(git status --porcelain -- .claude)" ]; then
  echo "  ! .claude/ has uncommitted changes: the runs are marked workflow_dirty" >&2
fi

LOGS="$(mktemp -d)"
for i in $(seq 1 "$N"); do
  (
    node "$SIM_DIR/discovery.mjs" "${EXTRA[@]}" > "$LOGS/run-$i.log" 2>&1 || true
    # discovery.mjs ends with "→ <run folder>"
    run="$(sed -n 's/^→ \(.*discovery__[0-9-]*\)$/\1/p' "$LOGS/run-$i.log" | tail -1)"
    if [ -n "$run" ]; then
      node "$SIM_DIR/judge.mjs" "$run" > "$LOGS/judge-$i.log" 2>&1 || true
      echo "$run" > "$LOGS/run-$i.dir"
    fi
  ) &
  sleep 5   # distinct folder names: they carry the time down to the second
done
wait

runs=()
for i in $(seq 1 "$N"); do
  if [ -f "$LOGS/run-$i.dir" ]; then
    runs+=("$(basename "$(cat "$LOGS/run-$i.dir")")")
    tail -3 "$LOGS/run-$i.log" | head -1
  else
    echo "  x run $i did not finish: see $LOGS/run-$i.log" >&2
  fi
done
[ ${#runs[@]} -gt 0 ] && python3 "$SIM_DIR/compare.py" "${runs[@]}"
echo "logs: $LOGS"
