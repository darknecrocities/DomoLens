#!/usr/bin/env bash
# ==============================================================================
# DomoLens macOS Automated Installer
# 
# Downloads and installs the latest release of DomoLens on macOS, automatically
# clearing Gatekeeper quarantine attributes so the application launches cleanly
# without "unverified developer" or malware security warnings.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/darknecrocities/DomoLens/main/scripts/install.sh | bash
# ==============================================================================

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

log_info() {
  echo -e "${CYAN}==>${RESET} ${BOLD}$1${RESET}"
}

log_success() {
  echo -e "${GREEN}✓${RESET} ${BOLD}$1${RESET}"
}

log_warn() {
  echo -e "${YELLOW}!${RESET} $1"
}

log_error() {
  echo -e "${RED}✗ Error:${RESET} $1" >&2
}

# 1. Verify macOS environment
if [[ "$(uname -s)" != "Darwin" ]]; then
  log_error "This automated installer is designed exclusively for macOS."
  echo "For Windows, Linux, or manual downloads, visit:"
  echo "https://github.com/darknecrocities/DomoLens/releases/latest"
  exit 1
fi

ARCH="$(uname -m)"
log_info "Detected macOS architecture: ${ARCH}"

# 2. Setup temporary workspace
TMP_DIR="$(mktemp -d -t domolens-install-XXXXXX)"
TMP_DMG="${TMP_DIR}/DomoLens.dmg"
MOUNT_DIR="${TMP_DIR}/mount"

cleanup() {
  if [[ -d "${MOUNT_DIR}" ]]; then
    hdiutil detach "${MOUNT_DIR}" -force >/dev/null 2>&1 || true
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT INT TERM

# 3. Resolve latest release download URL
REPO="darknecrocities/DomoLens"
FALLBACK_URL="https://github.com/${REPO}/releases/latest/download/DomoLens-Universal.dmg"

log_info "Fetching latest DomoLens release details from GitHub..."
DOWNLOAD_URL=""
if command -v curl >/dev/null 2>&1; then
  API_RESPONSE=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null || true)
  if [[ -n "${API_RESPONSE}" ]]; then
    DOWNLOAD_URL=$(echo "${API_RESPONSE}" | grep -o 'https://[^"]*DomoLens-Universal\.dmg' | head -n 1 || true)
    if [[ -z "${DOWNLOAD_URL}" ]]; then
      DOWNLOAD_URL=$(echo "${API_RESPONSE}" | grep -o 'https://[^"]*DomoLens-macOS\.dmg' | head -n 1 || true)
    fi
  fi
fi

if [[ -z "${DOWNLOAD_URL}" ]]; then
  DOWNLOAD_URL="${FALLBACK_URL}"
fi

# 4. Download DMG directly via curl (bypasses browser quarantine)
log_info "Downloading DomoLens (${DOWNLOAD_URL})..."
curl -fL --progress-bar "${DOWNLOAD_URL}" -o "${TMP_DMG}"

if [[ ! -s "${TMP_DMG}" ]]; then
  log_error "Downloaded package is empty or failed to download."
  exit 1
fi

# 5. Mount DMG image
mkdir -p "${MOUNT_DIR}"
log_info "Mounting disk image..."
hdiutil attach "${TMP_DMG}" -nobrowse -readonly -mountpoint "${MOUNT_DIR}" >/dev/null

if [[ ! -d "${MOUNT_DIR}/DomoLens.app" ]]; then
  log_error "DomoLens.app was not found in the mounted DMG."
  exit 1
fi

# 6. Determine target installation path
TARGET_DIR="/Applications"
if [[ ! -w "${TARGET_DIR}" ]]; then
  log_warn "Standard /Applications folder is not writable without sudo. Installing to ~/Applications instead."
  TARGET_DIR="${HOME}/Applications"
  mkdir -p "${TARGET_DIR}"
fi

TARGET_APP="${TARGET_DIR}/DomoLens.app"

# 7. Install application bundle
log_info "Installing DomoLens to ${TARGET_DIR}..."
if [[ -d "${TARGET_APP}" ]]; then
  log_warn "Removing existing installation at ${TARGET_APP}..."
  rm -rf "${TARGET_APP}"
fi

ditto "${MOUNT_DIR}/DomoLens.app" "${TARGET_APP}"

# 8. Unmount DMG
hdiutil detach "${MOUNT_DIR}" -force >/dev/null 2>&1 || true

# 9. Clear Gatekeeper quarantine attributes & re-sign
log_info "Clearing macOS Gatekeeper quarantine attributes..."
xattr -cr "${TARGET_APP}" 2>/dev/null || true
xattr -d com.apple.quarantine "${TARGET_APP}" 2>/dev/null || true

if command -v codesign >/dev/null 2>&1; then
  log_info "Verifying local code signature..."
  codesign --force --deep -s - "${TARGET_APP}" 2>/dev/null || true
fi

log_success "DomoLens installed successfully at ${TARGET_APP}!"

# 10. Launch or guide user
echo ""
echo -e "${GREEN}====================================================${RESET}"
echo -e "${BOLD} DomoLens is ready to use!${RESET}"
echo -e " Location: ${CYAN}${TARGET_APP}${RESET}"
echo -e "${GREEN}====================================================${RESET}"
echo ""

if [[ "${1:-}" != "--no-open" && -t 0 ]]; then
  read -r -p "Would you like to launch DomoLens now? [Y/n] " RESP
  RESP="${RESP:-y}"
  if [[ "${RESP}" =~ ^[Yy] ]]; then
    open "${TARGET_APP}"
  fi
else
  open "${TARGET_APP}" || true
fi
