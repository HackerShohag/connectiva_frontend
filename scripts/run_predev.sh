#!/bin/sh
set -eu
PYTHON_BIN="${PREDEV_PY:-python3}"
if [ -n "${PREDEV_PY:-}" ] && [ ! -x "$PYTHON_BIN" ]; then
  echo "Warning: PREDEV_PY points to a missing Python: $PYTHON_BIN"
  echo "Falling back to python3 for Ramgati preprocessing."
  PYTHON_BIN="python3"
fi
"$PYTHON_BIN" scripts/process_ramgati_data.py
