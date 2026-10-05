# Security Policy

This document outlines the security policies, response procedures, and architecture principles for DomoLens.

## Supported Versions

Security updates are applied to the active release stream.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | Yes                |
| < 0.1.0 | No                 |

## Reporting a Vulnerability

If you discover a security vulnerability within DomoLens, please report it responsibly. Do not disclose vulnerabilities in public GitHub issues, pull requests, or discussion boards.

### Reporting Procedure

1. Submit a private advisory via GitHub Security Advisories at https://github.com/darknecrocities/DomoLens/security/advisories/new.
2. Alternatively, email the maintainer directly at parejasarronkian@gmail.com with the subject line "[SECURITY] Vulnerability in DomoLens".
3. Include the following details in your report:
   - Type of vulnerability and affected component (e.g., Tauri Shell, Python Engine, Core Package, Frontend UI).
   - Clear reproduction steps or proof-of-concept code.
   - Potential impact and threat scenario.
   - Proposed mitigation or patch (if available).

### Response Timeline

- Initial acknowledgment: Within 48 hours of receipt.
- Assessment and validation: Within 5 business days.
- Remediation timeline: Critical security patches will be published within 14 days of confirmation.

## Architecture and Security Controls

DomoLens is built around a local-first, privacy-respecting design model:

### 1. Local Network Isolation
- The Python Engine sidecar binds strictly to the loopback address `127.0.0.1`.
- The engine actively rejects wildcard bindings (`0.0.0.0`) or remote host configurations.
- Cross-Origin Resource Sharing (CORS) is restricted exclusively to native Tauri origins (`tauri://localhost`, `https://tauri.localhost`, and `http://127.0.0.1:1420`).
- Interactive documentation endpoints (`/docs`, `/redoc`) are disabled in production builds.

### 2. Desktop Shell Sandboxing
- DomoLens uses Tauri 2 with explicit Content Security Policy (CSP) headers:
  ```text
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: https: data: blob:; media-src 'self' asset: blob:; connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*;
  ```
- File access is guarded through Tauri dialog plugins and scoped filesystem permissions. Native system commands are isolated to predefined Rust handlers (`list_projects`, `import_video`, `rename_project`, `delete_project`).

### 3. Media Ingestion Safety
- Media path probing performs strict filesystem resolution using `Path.resolve()`, validating that targets are existent regular files before reading file metadata.
- Path traversal outside valid file handles is rejected.

### 4. Zero Data Collection and Local Key Storage
- Screen recordings, audio streams, and project metadata are saved directly to the user's local disk. No telemetry, audio, or video is sent to external servers.
- Optional generative AI features (title generation, captions) operate via user-provided API keys stored only on the client machine. Keys are never transmitted to DomoLens infrastructure.
