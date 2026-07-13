#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
STATE_FILE="$SCRIPTS_DIR/.dev-servers.json"
LOGS_DIR="$SCRIPTS_DIR/logs"

SERVER_DIR="$PROJECT_ROOT/server"
CLIENT_DIR="$PROJECT_ROOT/client"
ADMIN_DIR="$PROJECT_ROOT/admin"

is_port_in_use() {
  lsof -ti "tcp:$1" -sTCP:LISTEN >/dev/null 2>&1
}

is_process_alive() {
  kill -0 "$1" 2>/dev/null
}

show_log_tail() {
  local log_file=$1
  if [[ -f $log_file ]]; then
    echo "  Last lines of $log_file:"
    tail -5 "$log_file" | sed 's/^/    /'
  fi
}

fail_if_processes_died() {
  local -a pids=("$@")
  local died=0

  for pid in "${pids[@]}"; do
    if ! is_process_alive "$pid"; then
      died=1
    fi
  done

  if (( died )); then
    echo "One or more dev servers exited immediately." >&2
    echo "Check the logs:" >&2
    show_log_tail "$LOGS_DIR/server.log" >&2
    show_log_tail "$LOGS_DIR/client.log" >&2
    show_log_tail "$LOGS_DIR/admin.log" >&2
    echo "" >&2
    echo "If you just cloned the repo, run: npm install in server/, client/, and admin/." >&2
    rm -f "$STATE_FILE"
    exit 1
  fi
}

wait_for_url() {
  local url=$1
  local elapsed=0
  local max_wait=200

  while (( elapsed < max_wait )); do
    if curl -sf -o /dev/null --max-time 1 "$url" 2>/dev/null; then
      return 0
    fi
    sleep 0.15
    ((elapsed++)) || true
  done

  return 1
}

start_dev_server() {
  local name=$1
  local dir=$2
  local port=$3
  local log_file="$LOGS_DIR/${name}.log"

  (
    cd "$dir"
    exec npm run dev
  ) >>"$log_file" 2>&1 &

  local pid=$!
  echo "{\"name\":\"$name\",\"pid\":$pid,\"port\":$port,\"log\":\"$log_file\"}"
}

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js and restart your terminal." >&2
  exit 1
fi

for dir in "$SERVER_DIR" "$CLIENT_DIR" "$ADMIN_DIR"; do
  if [[ ! -d $dir ]]; then
    echo "Directory not found: $dir" >&2
    exit 1
  fi
  if [[ ! -d $dir/node_modules ]]; then
    echo "Dependencies not installed in $dir" >&2
    echo "Run: (cd $dir && npm install)" >&2
    exit 1
  fi
done

mkdir -p "$LOGS_DIR"

if is_port_in_use 4000 || is_port_in_use 3000 || is_port_in_use 3001; then
  echo "Dev servers appear to be running already."
  echo "  API:    http://localhost:4000"
  echo "  Client: http://localhost:3000"
  echo "  Admin:  http://localhost:3001"
  echo "Run ./stop-servers.sh first if you want to restart them."
  exit 0
fi

echo "Starting backend on http://localhost:4000..."
server_json="$(start_dev_server server "$SERVER_DIR" 4000)"

echo "Starting frontend on http://localhost:3000..."
client_json="$(start_dev_server client "$CLIENT_DIR" 3000)"

echo "Starting admin on http://localhost:3001..."
admin_json="$(start_dev_server admin "$ADMIN_DIR" 3001)"

node -e "
const fs = require('fs');
const state = {
  startedAt: new Date().toISOString(),
  processes: [${server_json}, ${client_json}, ${admin_json}],
};
fs.writeFileSync('${STATE_FILE}', JSON.stringify(state, null, 2));
"

server_pid="$(node -e "console.log(JSON.parse('${server_json}').pid)")"
client_pid="$(node -e "console.log(JSON.parse('${client_json}').pid)")"
admin_pid="$(node -e "console.log(JSON.parse('${admin_json}').pid)")"

sleep 1
fail_if_processes_died "$server_pid" "$client_pid" "$admin_pid"

echo "Waiting for dev servers..."
if ! wait_for_url "http://localhost:4000/api/health"; then
  echo "Timed out waiting for API on http://localhost:4000" >&2
  show_log_tail "$LOGS_DIR/server.log" >&2
fi
if ! wait_for_url "http://localhost:3000"; then
  echo "Timed out waiting for client on http://localhost:3000" >&2
  show_log_tail "$LOGS_DIR/client.log" >&2
fi
if ! wait_for_url "http://localhost:3001"; then
  echo "Timed out waiting for admin on http://localhost:3001" >&2
  show_log_tail "$LOGS_DIR/admin.log" >&2
fi

echo "Opening client and admin in Chrome..."
node "$SCRIPTS_DIR/open-client-url.cjs"

echo ""
echo "PE Falcon Safaris dev servers started."
echo "  API:    http://localhost:4000"
echo "  Client: http://localhost:3000"
echo "  Admin:  http://localhost:3001"
echo ""
echo "Logs:"
echo "  $LOGS_DIR/server.log"
echo "  $LOGS_DIR/client.log"
echo "  $LOGS_DIR/admin.log"
echo ""
echo "Stop with: ./stop-servers.sh"
