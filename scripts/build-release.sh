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
  echo "Packaging macOS universal bundle (.dmg, .app)..."
  npm run tauri -w @domolens/app -- build --bundles app,dmg
  echo "macOS bundle successfully generated in apps/app/src-tauri/target/release/bundle/dmg/"
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
