#!/usr/bin/env bash
set -euo pipefail

# DomoLens Cross-Platform Bundle Packager
# Builds and verifies release bundles for macOS (.dmg, .app), Windows (.exe), and Linux (.AppImage, .deb).

TARGET_OS="${1:-host}"

echo "Starting DomoLens Release Packager for target: ${TARGET_OS}"

# 1. Clean frontend builds
echo "Building web assets..."
npm run build -w @domolens/app

# 2. Package based on target
if [[ "${TARGET_OS}" == "macos" || ( "${TARGET_OS}" == "host" && "$(uname -s)" == "Darwin" ) ]]; then
  echo "Packaging macOS bundle (.dmg, .app)..."
  npm run tauri -w @domolens/app -- build --bundles app,dmg
  echo "macOS bundle successfully generated in apps/app/src-tauri/target/release/bundle/dmg/"
  
  DMG_FILE=$(find apps/app/src-tauri/target/release/bundle/dmg -name "*.dmg" | head -n 1)
  if [[ -n "${DMG_FILE}" && -f "${DMG_FILE}" ]]; then
    echo "Verifying macOS code signature for ${DMG_FILE}..."
    MOUNT_DIR=$(mktemp -d)
    hdiutil attach "${DMG_FILE}" -nobrowse -mountpoint "${MOUNT_DIR}"
    codesign -vvv --deep "${MOUNT_DIR}/DomoLens.app"
    hdiutil detach "${MOUNT_DIR}"
    echo "Verification successful: code signature is valid and satisfies requirements."

    # Mirror verified DMG to public directories
    cp "${DMG_FILE}" apps/landing/public/DomoLens-Universal.dmg
    cp "${DMG_FILE}" apps/app/public/DomoLens-Universal.dmg
    echo "Mirrored verified DMG to public asset directories."
  fi
elif [[ "${TARGET_OS}" == "linux" ]]; then
  echo "Packaging Linux bundle (.AppImage, .deb)..."
  npm run tauri -w @domolens/app -- build --bundles appimage,deb
elif [[ "${TARGET_OS}" == "windows" ]]; then
  echo "Packaging Windows bundle (.exe NSIS)..."
  npm run tauri -w @domolens/app -- build --bundles nsis
else
  echo "Packaging host release bundle..."
  npm run tauri -w @domolens/app -- build
fi

echo "Release packaging completed successfully."
