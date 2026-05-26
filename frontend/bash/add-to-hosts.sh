#!/usr/bin/env bash
set -euo pipefail

HOSTNAME_TO_ADD="${HOSTNAME_TO_ADD:-questions.home}"
HOST_IP="${HOST_IP:-127.0.0.1}"
HOSTS_ENTRY="${HOST_IP} ${HOSTNAME_TO_ADD}"
LINUX_HOSTS_FILE="${LINUX_HOSTS_FILE:-/etc/hosts}"
WINDOWS_HOSTS_FILE="${WINDOWS_HOSTS_FILE:-}"

is_wsl() {
  command -v powershell.exe >/dev/null 2>&1 && [[ -f /proc/version ]] && grep -qiE 'microsoft|wsl' /proc/version
}

is_windows_bash() {
  [[ "${OSTYPE:-}" == msys* || "${OSTYPE:-}" == cygwin* || "${OSTYPE:-}" == win32* ]]
}

resolve_windows_hosts_file() {
  if [[ -n "${WINDOWS_HOSTS_FILE}" ]]; then
    printf '%s\n' "${WINDOWS_HOSTS_FILE}"
    return 0
  fi

  local candidate
  for candidate in \
    "/mnt/c/Windows/System32/drivers/etc/hosts" \
    "/c/Windows/System32/drivers/etc/hosts" \
    "C:/Windows/System32/drivers/etc/hosts"; do
    if [[ -f "${candidate}" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done

  printf '%s\n' "/mnt/c/Windows/System32/drivers/etc/hosts"
}

hosts_entry_exists() {
  local hosts_file="$1"

  [[ -f "${hosts_file}" ]] && awk -v host="${HOSTNAME_TO_ADD}" '
    /^[[:space:]]*#/ { next }
    {
      for (field = 2; field <= NF; field++) {
        if ($field == host) {
          found = 1
        }
      }
    }
    END { exit found ? 0 : 1 }
  ' "${hosts_file}"
}

append_line() {
  local hosts_file="$1"

  if [[ -w "${hosts_file}" ]]; then
    printf '\n%s\n' "${HOSTS_ENTRY}" >> "${hosts_file}"
    return 0
  fi

  printf '\n%s\n' "${HOSTS_ENTRY}" | sudo tee -a "${hosts_file}" >/dev/null
}

powershell_base64() {
  iconv -f UTF-8 -t UTF-16LE | base64 -w 0
}

append_windows_hosts_entry_as_admin() {
  local inner_script
  local inner_encoded
  local outer_script
  local outer_encoded

  inner_script="\$ErrorActionPreference = 'Stop'
\$hostsPath = Join-Path \$env:SystemRoot 'System32\\drivers\\etc\\hosts'
\$hostName = '${HOSTNAME_TO_ADD}'
\$hostIp = '${HOST_IP}'
\$entry = \"\$hostIp \$hostName\"
\$exists = Get-Content -Path \$hostsPath | Where-Object {
  \$_ -notmatch '^\\s*#' -and ((\$_ -split '\\s+') -contains \$hostName)
}
if (-not \$exists) {
  Add-Content -Path \$hostsPath -Value \$entry
  Write-Host \"Windows: added '\$entry' to \$hostsPath.\"
} else {
  Write-Host \"Windows: \$hostName already exists in \$hostsPath. Skipping.\"
}
ipconfig /flushdns | Out-Null
Write-Host 'Windows DNS cache flushed.'"

  inner_encoded="$(printf '%s' "${inner_script}" | powershell_base64)"
  outer_script="\$process = Start-Process -FilePath powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', '${inner_encoded}'); exit \$process.ExitCode"
  outer_encoded="$(printf '%s' "${outer_script}" | powershell_base64)"

  powershell.exe -NoProfile -EncodedCommand "${outer_encoded}"
}

append_hosts_entry() {
  local hosts_file="$1"
  local label="$2"

  if [[ ! -f "${hosts_file}" ]]; then
    echo "${label} hosts file not found at ${hosts_file}. Skipping."
    return 0
  fi

  if hosts_entry_exists "${hosts_file}"; then
    echo "${label}: ${HOSTNAME_TO_ADD} already exists in ${hosts_file}. Skipping."
    return 0
  fi

  if append_line "${hosts_file}"; then
    echo "${label}: added '${HOSTS_ENTRY}' to ${hosts_file}."
    return 0
  fi

  echo "${label}: could not write to ${hosts_file}. Re-run this script with administrator/root permissions."
  return 1
}

append_windows_hosts_entry() {
  local windows_hosts_file
  windows_hosts_file="$(resolve_windows_hosts_file)"

  if [[ -f "${windows_hosts_file}" ]] && hosts_entry_exists "${windows_hosts_file}"; then
    echo "Windows: ${HOSTNAME_TO_ADD} already exists in ${windows_hosts_file}. Skipping."
    return 0
  fi

  if is_wsl; then
    echo "Windows: ${HOSTNAME_TO_ADD} is missing. Requesting Windows administrator permission..."
    append_windows_hosts_entry_as_admin
    return 0
  fi

  if [[ -f "${windows_hosts_file}" ]]; then
    append_hosts_entry "${windows_hosts_file}" "Windows"
    return 0
  fi

  if is_windows_bash; then
    echo "Windows hosts file was not found at ${windows_hosts_file}."
    echo "If Windows is installed somewhere other than C:, set WINDOWS_HOSTS_FILE before running this script."
  else
    echo "Linux environment detected and Windows hosts file is not mounted. Skipping Windows hosts update."
  fi
}

main() {
  echo "Ensuring hosts entry exists: ${HOSTS_ENTRY}"

  append_hosts_entry "${LINUX_HOSTS_FILE}" "Linux/WSL"
  append_windows_hosts_entry

  if is_wsl && command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "ipconfig /flushdns | Out-Null" >/dev/null 2>&1 || true
    echo "Windows DNS cache flush attempted."
  fi

  echo "Done."
}

main "$@"
