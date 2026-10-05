# Contributing to DomoLens

Thank you for your interest in contributing to DomoLens. This guide outlines the development workflow, coding standards, and submission process for contributions.

## Code of Conduct

We are committed to providing a welcoming, inclusive, and professional environment for everyone. Contributors are expected to treat all community members with respect, constructive feedback, and professional courtesy. Harassment or exclusionary behavior of any kind will not be tolerated.

## Repository Architecture

DomoLens is organized as a monorepo containing the following components:

- `packages/core`: Core domain logic, camera path planning, auto-zoom clustering, time formatting, and shared TypeScript models.
- `packages/theme`: Design system foundation, Tailwind CSS v4 design tokens, and color/animation constants.
- `apps/app`: React 19 desktop and web application shell, interactive timeline editor, audio mixer, and UI components.
- `apps/landing`: Static landing page showcasing features, interactive comparison slider, and platform compatibility.
- `apps/app/src-tauri`: Tauri 2 desktop shell written in Rust, providing native system integrations and persistence.
- `engine`: Python 3.13 FastAPI sidecar microservice managing media probing, background video rendering, and optional AI features.

## Prerequisites

Ensure the following tools are installed on your machine before setting up the repository:

- Node.js: Version 20.0.0 or higher.
- npm: Version 10.0.0 or higher.
- Rust: Modern stable toolchain (installed via `rustup`).
- Python: Version 3.13 or higher.
- uv: Python package and project manager.
- FFmpeg: Version 6 or higher (required for video transcoding and media operations).

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/darknecrocities/DomoLens.git
   cd DomoLens
   ```

2. Install Node.js workspace dependencies:
   ```bash
   npm install
   ```

3. Install Python engine dependencies:
   ```bash
   uv sync --project engine
   ```

4. Verify your local installation by running all test suites:
   ```bash
   npm run check:all
   ```

## Development Commands

- Start desktop app in development mode:
  ```bash
  npm run app
  ```

- Start frontend UI in browser mode:
  ```bash
  npm run dev
  ```

- Start landing page in development mode:
  ```bash
  npm run landing
  ```

- Start Python sidecar service:
  ```bash
  npm run engine
  ```

- Run unit test suites:
  ```bash
  npm run test
  ```

- Run Python sidecar tests:
  ```bash
  npm run engine:test
  ```

- Run TypeScript type checking:
  ```bash
  npm run typecheck
  ```

- Check Rust compilation:
  ```bash
  cargo check --manifest-path apps/app/src-tauri/Cargo.toml
  ```

- Build production desktop bundle:
  ```bash
  npm run package
  ```

## Branch Strategy

- `main`: Production-ready branch. All releases and tags originate from `main`.
- Feature branches: Create descriptive feature branches from `main` using the following naming conventions:
  - `feat/feature-name` for new features or capabilities.
  - `fix/issue-description` for bug fixes.
  - `docs/documentation-update` for documentation changes.
  - `refactor/component-name` for code restructuring.
  - `perf/optimization-target` for performance enhancements.

## Commit Message Conventions

We follow the Conventional Commits specification. Commit messages should be structured as follows:

```text
type(scope): short description in imperative mood

Optional longer description explaining motivation and contrast with previous behavior.

Fixes #123
```

Allowed types:
- `feat`: A new user-facing feature.
- `fix`: A bug fix.
- `docs`: Documentation-only changes.
- `style`: Changes that do not affect the meaning of the code (formatting, missing semicolons, etc.).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `build`: Changes that affect the build system or external dependencies.
- `ci`: Changes to CI configuration files and scripts.
- `chore`: Maintenance tasks not modifying src or test files.

## Coding Standards

### TypeScript and React
- Use React 19 functional components with strict TypeScript type annotations.
- Manage global state through modular Zustand stores located in `apps/app/src/store`.
- Follow unidirectional data flow. Avoid side effects during render cycles.
- Rely on Tailwind CSS v4 utility classes and design tokens defined in `@domolens/theme`.
- Maintain accessibility: Provide keyboard shortcuts, appropriate ARIA roles, focus management, and support `prefers-reduced-motion`.

### Plain-Language Copy Principle
- All user-facing strings must use simple, accessible, plain-language copy.
- Avoid technical jargon (e.g., refer to actions as "Open a video" rather than "Ingest media file", and "New recording" rather than "Initialize capture session").
- Store user strings in `apps/app/src/copy/en.ts`.

### Rust (Tauri Shell)
- Follow standard Rust formatting (`cargo fmt`) and linting (`cargo clippy`).
- Handle errors explicitly using `Result<T, E>`. Return descriptive string errors across the Tauri IPC boundary.
- Keep filesystem operations scoped to user-approved paths and standard application directories.

### Python (Engine Sidecar)
- Type annotations are required on all function signatures and Pydantic models.
- Sidecar processes must remain bound strictly to `127.0.0.1`. Do not expose ports on external network interfaces.
- Validate incoming filesystem paths using `pathlib.Path.resolve()`.

## Pull Request Process

1. Ensure all tests, typechecks, and linters pass locally:
   ```bash
   npm run check:all
   cargo check --manifest-path apps/app/src-tauri/Cargo.toml
   ```
2. Rebase your branch against the latest `main` branch:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
3. Push your branch to GitHub and open a Pull Request targeting `main`.
4. Provide a clear title and description explaining what was changed and why.
5. Reference any related issues in the PR description (e.g., `Closes #42`).
6. PRs require a passing CI check and review approval before merge.
