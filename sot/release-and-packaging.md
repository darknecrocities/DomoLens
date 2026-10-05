# Release and Packaging Specification

## 1. Multi-Platform Packaging Matrix

DomoLens binaries are packaged using Tauri 2 CLI (`@tauri-apps/cli`). The build system targets major desktop and mobile operating systems:

| Platform | Target Architecture | Output Artifacts | Bundle Tool |
| --- | --- | --- | --- |
| macOS | Apple Silicon (aarch64) & Intel (x86_64) | `.dmg`, `.app` | Tauri Bundler / Cargo |
| Windows | x86_64 (64-bit) | `.msi`, `.exe` (NSIS) | WiX / NSIS / Cargo |
| Linux | x86_64 (glibc >= 2.31) | `.deb`, `.AppImage` | Tauri Bundler / Cargo |
| Web | Modern Browsers (ES2022) | Static HTML, JS, CSS | Vite 8 + React 19 |

## 2. Version Synchronization Protocol

Version numbers across the monorepo must remain strictly synchronized to prevent runtime schema mismatches:

1. Root Manifest: `package.json` (`version: "0.1.0"`)
2. App Manifest: `apps/app/package.json` (`version: "0.1.0"`)
3. Tauri Manifest: `apps/app/src-tauri/tauri.conf.json` (`version: "0.1.0"`)
4. Cargo Manifest: `apps/app/src-tauri/Cargo.toml` (`version = "0.1.0"`)
5. Engine Manifest: `engine/pyproject.toml` (`version = "0.1.0"`)
6. Core Package: `packages/core/package.json` (`version: "0.1.0"`)
7. Theme Package: `packages/theme/package.json` (`version: "0.1.0"`)

## 3. Git Tagging Protocol

Releases must follow Semantic Versioning (SemVer 2.0.0):

- Format: `v<MAJOR>.<MINOR>.<PATCH>` (e.g., `v0.1.0`).
- Annotated Tags: Tags must be created as annotated git tags with a descriptive release summary:
  ```bash
  git tag -a v0.1.0 -m "Release v0.1.0: Foundation, auto-zoom engine, and studio editor"
  git push origin v0.1.0
  ```

## 4. Release Build Command

To trigger a production build of native desktop artifacts locally:

```bash
# Production packaging command
npm run package
```

The compiled bundles are generated in:
- macOS: `apps/app/src-tauri/target/release/bundle/dmg/` and `bundle/macos/`
- Windows: `apps/app/src-tauri/target/release/bundle/msi/` and `bundle/nsis/`
- Linux: `apps/app/src-tauri/target/release/bundle/deb/` and `bundle/appimage/`

## 5. Continuous Integration and Automated Releases

GitHub Actions workflows defined in `.github/workflows/` automate release verification:
- `ci.yml`: Runs linting, typechecking, Vitest suites, Python pytest suites, and `cargo check` on every pull request and push to `main`.
- `release.yml`: Triggers on git tags matching `v*`, compiling release bundles for macOS, Windows, and Linux, computing SHA-256 checksums, and attaching binaries directly to the GitHub Release.
