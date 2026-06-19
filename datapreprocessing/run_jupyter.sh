#!/bin/bash
# Launch Jupyter with DYLD_LIBRARY_PATH fix for expat on macOS/brew
# Usage: ./run_jupyter.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export DYLD_LIBRARY_PATH="/opt/homebrew/opt/expat/lib:$DYLD_LIBRARY_PATH"
exec "$SCRIPT_DIR/.venv/bin/jupyter" "$@"
