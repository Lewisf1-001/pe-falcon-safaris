#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
STATE_FILE="$SCRIPTS_DIR/.dev-servers.json"

stop_process_tree() {
  local pid=$1

  if [[ -z $pid ]]; then
    return 1
  fi

  pkill -TERM -P "$pid" 2>/dev/null || true
  kill -TERM "$pid" 2>/dev/null || true
  sleep 0.2
  pkill -KILL -P "$pid" 2>/dev/null || true
  kill -KILL "$pid" 2>/dev/null || true
}

stop_port_listener() {
  local port=$1
  local pids
  local stopped=0

  pids="$(lsof -ti "tcp:$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z $pids ]]; then
    echo 0
    return
  fi

  while IFS= read -r pid; do
    [[ -z $pid ]] && continue
    kill -TERM "$pid" 2>/dev/null || true
    ((stopped++)) || true
  done <<<"$pids"

  sleep 0.2

  pids="$(lsof -ti "tcp:$port" -sTCP:LISTEN 2>/dev/null || true)"
  while IFS= read -r pid; do
    [[ -z $pid ]] && continue
    kill -KILL "$pid" 2>/dev/null || true
  done <<<"$pids"

  echo "$stopped"
}

echo "Stopping PE Falcon Safaris dev servers..."

if [[ -f $STATE_FILE ]]; then
  while IFS= read -r pid; do
    [[ -z $pid ]] && continue
    echo "Stopping process tree for PID $pid..."
    stop_process_tree "$pid"
  done < <(node -e "
const fs = require('fs');
const state = JSON.parse(fs.readFileSync('${STATE_FILE}', 'utf8'));
for (const entry of state.processes || []) {
  if (entry.pid) console.log(entry.pid);
}
")

  rm -f "$STATE_FILE"
fi

server_stopped="$(stop_port_listener 4000)"
client_stopped="$(stop_port_listener 3000)"
admin_stopped="$(stop_port_listener 3001)"

total=$((server_stopped + client_stopped + admin_stopped))

echo ""
if (( total > 0 )); then
  echo "Dev servers stopped."
else
  echo "No running dev servers found on ports 3000, 3001, or 4000."
fi
