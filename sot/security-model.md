# Security Model and Threat Specification

## 1. Security Architecture Principles

DomoLens is built around a local-first security architecture. Because screen recordings frequently contain sensitive proprietary source code, internal documents, and personal user data, DomoLens enforces absolute privacy by keeping all media processing strictly on the user's physical machine.

```text
+-------------------------------------------------------------------------+
|                              TRUST BOUNDARY                             |
|                                                                         |
|  [Tauri Webview Sandbox]                                                |
|   Strict CSP: default-src 'self'; connect-src 'self' http://127.0.0.1:*  |
|            |                                                            |
|            v (Restricted Tauri Commands)                                |
|  [Rust Core Process]                                                    |
|   Controlled FS Access via Native Dialog Plugins                        |
|            |                                                            |
|            v (Local Loopback IPC on 127.0.0.1 Only)                     |
|  [Python Engine Sidecar]                                                |
|   Strict Loopback Check (Rejects 0.0.0.0)                               |
|   CORS Locked to tauri://localhost                                      |
|   Swagger / OpenAPI Docs Disabled in Production                         |
|   Safe Path Resolution via Path.resolve()                               |
|                                                                         |
|  NO EXTERNAL TELEMETRY. NO MEDIA CLOUD UPLOADS. NO SURVEILLANCE.        |
+-------------------------------------------------------------------------+
```

## 2. Threat Boundaries and Mitigations

### 2.1 Threat: External Network Interception
- Risk: An attacker on the local network attempts to communicate with the Python media processing engine.
- Mitigation:
  - The Python engine binds strictly to `127.0.0.1`.
  - The CLI entrypoint explicitly aborts if configured with `0.0.0.0` or external IP addresses.
  - CORS headers reject any origin that does not match `tauri://localhost`, `https://tauri.localhost`, or `http://127.0.0.1:1420`.

### 2.2 Threat: Malicious Path Traversal
- Risk: An adversary crafts paths (e.g., `../../etc/passwd` or symbolic links) to read sensitive system files through `/media/probe`.
- Mitigation:
  - Input paths are resolved using `pathlib.Path.resolve()`.
  - Paths are checked with `target_path.is_file()` and validated for existence before any metadata is inspected.
  - Non-existent files immediately return HTTP 404 without leaking directory contents.

### 2.3 Threat: Cross-Site Scripting (XSS) and Script Injection
- Risk: An imported file or webview manipulation injects malicious JavaScript.
- Mitigation:
  - Tauri enforces a strict Content Security Policy (CSP):
    ```text
    default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: https: data: blob:; media-src 'self' asset: blob:; connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*;
    ```
  - Remote scripts and external script evaluations are blocked by the browser engine.

### 2.4 Threat: Compromise of AI API Keys
- Risk: Generative AI keys (Gemini or OpenAI) stored in the application are intercepted or leaked.
- Mitigation:
  - API keys are stored in client-side secure local storage on the user's device.
  - Keys are never uploaded to any DomoLens server or telemetry endpoint.
  - Requests using the keys communicate directly and exclusively with official provider APIs via secure HTTPS.

## 3. Cryptographic and Integrity Controls

- Software Updates: Desktop release binaries will be signed with developer code-signing certificates (Apple Developer ID for macOS, Authenticode for Windows).
- Checksums: SHA-256 hashes are published for all release artifacts on GitHub Releases.
- Package Integrity: npm dependencies use `package-lock.json` and Python dependencies are pinned with `uv.lock`.
