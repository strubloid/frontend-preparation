#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

PORT=9999

mobile_proxy_pid=""

cleanup() {
  if [[ -n "${mobile_proxy_pid}" ]] && kill -0 "${mobile_proxy_pid}" 2>/dev/null; then
    echo
    echo "Stopping mobile proxy..."
    kill "${mobile_proxy_pid}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

is_wsl() {
  command -v powershell.exe >/dev/null 2>&1 && command -v wslpath >/dev/null 2>&1
}

windows_port_is_listening() {
  powershell.exe -NoProfile -Command "if (netstat -ano | Select-String ':${PORT}' | Select-String 'LISTENING') { exit 0 } else { exit 1 }" >/dev/null 2>&1
}

windows_portproxy_exists() {
  powershell.exe -NoProfile -Command "if (netsh interface portproxy show v4tov4 | Select-String '0.0.0.0\\s+${PORT}\\s+') { exit 0 } else { exit 1 }" >/dev/null 2>&1
}

start_wsl_mobile_proxy() {
  local proxy_script="./proxy/question-trainer-proxy.js"

  if ss -ltn | grep -q ":${PORT} "; then
    echo "Mobile proxy port ${PORT} is already in use inside WSL. Skipping mobile proxy."
    return 0
  fi

  MOBILE_PROXY_PORT="${PORT}" node "${proxy_script}" &
  mobile_proxy_pid="$!"
  echo "Mobile proxy started in WSL on port ${PORT}."
}

start_windows_mobile_proxy() {
  local proxy_script="./proxy/question-trainer-proxy.js"
  local proxy_script_windows
  proxy_script_windows="$(wslpath -w "${proxy_script}")"

  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "\$env:MOBILE_PROXY_PORT='${PORT}'; node \"${proxy_script_windows}\"" &
  mobile_proxy_pid="$!"
  echo "Mobile proxy started in Windows on port ${PORT}."
}

start_mobile_proxy() {
  if is_wsl; then
    if windows_port_is_listening; then
      if windows_portproxy_exists; then
        echo "Windows port ${PORT} is already reserved by a portproxy rule. Starting the proxy inside WSL instead."
        start_wsl_mobile_proxy
      else
        echo "Windows port ${PORT} is already in use. Skipping mobile proxy."
      fi
      return 0
    fi

    start_windows_mobile_proxy
    return 0
  fi

  start_wsl_mobile_proxy
}

read -r -p "Start mobile proxy for phone access on port ${PORT}? [y/N] " start_proxy_answer

case "${start_proxy_answer}" in
  Y|y|Yes|yes)
    start_mobile_proxy
    ;;
  *)
    echo "Skipping mobile proxy."
    ;;
esac

echo "Starting Angular dev server on 0.0.0.0:4200..."
npx ng serve --host 0.0.0.0
