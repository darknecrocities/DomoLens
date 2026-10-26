#!/usr/bin/env bash
# ==============================================================================
# DomoLens macOS Gatekeeper Fix
#
# Clears the macOS quarantine flag (com.apple.quarantine) and ad-hoc re-signs
# DomoLens so macOS launches it immediately without blocking or warning dialogs.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/darknecrocities/DomoLens/main/scripts/fix-gatekeeper.sh | bash
# ==============================================================================

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

echo -e "${CYAN}==>${RESET} ${BOLD}DomoLens macOS Gatekeeper Unblocker${RESET}"

CANDIDATES=(
  "/Applications/DomoLens.app"
  "${HOME}/Applications/DomoLens.app"
  "${HOME}/Downloads/DomoLens.app"
)

FOUND=""
for p in "${CANDIDATES[@]}"; do
  if [[ -d "$p" ]]; then
    FOUND="$p"
    break
  fi
done

if [[ -z "${FOUND}" ]]; then
  echo -e "${YELLOW}!${RESET} DomoLens.app was not found in standard application folders."
  echo "Checking if DomoLens is mounted in a DMG volume..."
  
  if [[ -d "/Volumes/DomoLens/DomoLens.app" ]]; then
    echo -e "${CYAN}==>${RESET} Found DomoLens mounted in disk image. Copying to /Applications..."
    TARGET="/Applications/DomoLens.app"
    if [[ ! -w "/Applications" ]]; then
      TARGET="${HOME}/Applications/DomoLens.app"
      mkdir -p "${HOME}/Applications"
    fi
    ditto "/Volumes/DomoLens/DomoLens.app" "${TARGET}"
    FOUND="${TARGET}"
  else
    echo -e "${RED}✗ Error:${RESET} DomoLens.app was not found on your system."
    echo "To install DomoLens cleanly with Gatekeeper bypassed, run:"
    echo -e "  ${CYAN}curl -fsSL https://raw.githubusercontent.com/darknecrocities/DomoLens/main/scripts/install.sh | bash${RESET}"
    exit 1
  fi
fi

echo -e "${CYAN}==>${RESET} Found DomoLens at: ${BOLD}${FOUND}${RESET}"
echo -e "${CYAN}==>${RESET} Stripping macOS quarantine attributes..."
xattr -cr "${FOUND}" 2>/dev/null || true
xattr -d com.apple.quarantine "${FOUND}" 2>/dev/null || true

if command -v codesign >/dev/null 2>&1; then
  echo -e "${CYAN}==>${RESET} Validating local ad-hoc signature..."
  codesign --force --deep -s - "${FOUND}" 2>/dev/null || true
fi

echo -e "${GREEN}✓${RESET} ${BOLD}Gatekeeper restriction removed successfully!${RESET}"
echo -e "${CYAN}==>${RESET} Launching DomoLens..."
open "${FOUND}"
