#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VENV_PYTHON="${REPO_ROOT}/.venv/bin/python"
REQUIREMENTS_FILE="${REPO_ROOT}/custom-mcp-server/requirements.txt"
SERVER_FILE="${REPO_ROOT}/custom-mcp-server/server.py"
REQUIREMENTS_STAMP="${REPO_ROOT}/.venv/.custommcp-requirements.sha256"

requirements_hash() {
  shasum -a 256 "${REQUIREMENTS_FILE}" | awk '{print $1}'
}

if [[ ! -x "${VENV_PYTHON}" ]]; then
  echo "Creating virtual environment at ${REPO_ROOT}/.venv"
  python3 -m venv "${REPO_ROOT}/.venv"
fi

CURRENT_REQUIREMENTS_HASH="$(requirements_hash)"
INSTALLED_REQUIREMENTS_HASH=""

if [[ -f "${REQUIREMENTS_STAMP}" ]]; then
  INSTALLED_REQUIREMENTS_HASH="$(<"${REQUIREMENTS_STAMP}")"
fi

if [[ "${CURRENT_REQUIREMENTS_HASH}" != "${INSTALLED_REQUIREMENTS_HASH}" ]]; then
  echo "Synchronizing customMcp dependencies"
  "${VENV_PYTHON}" -m pip install -r "${REQUIREMENTS_FILE}"
  printf '%s\n' "${CURRENT_REQUIREMENTS_HASH}" > "${REQUIREMENTS_STAMP}"
fi

echo "Validating customMcp source"
"${VENV_PYTHON}" -m py_compile "${SERVER_FILE}"

echo "Starting customMcp"
exec "${VENV_PYTHON}" "${SERVER_FILE}"
