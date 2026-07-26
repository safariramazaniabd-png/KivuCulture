#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"

if python3 -c "import socket; socket.socket(socket.AF_INET6, socket.SOCK_STREAM)" 2>/dev/null; then
  HOST="${HOST:-::}"
else
  HOST="${HOST:-0.0.0.0}"
fi

exec python3 -m http.server "$PORT" --bind "$HOST"
