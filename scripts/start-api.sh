#!/usr/bin/env bash
# Start Flask on port 5001. From repo root: ./scripts/start-api.sh
# Or: npm run api
set -e
cd "$(dirname "$0")/.."
if [[ -x .venv/bin/python ]]; then
  exec .venv/bin/python run.py
fi
if command -v python3 >/dev/null 2>&1; then
  exec python3 run.py
fi
echo "No Python found. Install Python 3, then from this folder run:"
echo "  python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python run.py"
exit 1
