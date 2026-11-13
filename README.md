# VibeCoder

A local workspace for directing coding agents with clear tasks, evidence and useful handoffs. Built for experienced practitioners and people learning the workflow.

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)

**Stack:** a React + Vite UI served by a local Fastify service on `127.0.0.1`,
with Zod-validated requests, a paired single-use browser session, and no
hosted backend or telemetry.

**Early working preview.** Open a folder, inspect foundational project documents, draft a scoped task, record reported outcomes, and prepare a next-session prompt. Your existing coding agent performs investigation and implementation.

**Checkpoint, 2026-10-03:** private draft persistence is present but still being qualified. A known Windows path-identity error can cause temporary-storage fallback. Export important drafts before stopping; see [current status](progress.md) and [persistence handoff](handoffs/VC-002.md). The workflow below describes the earlier verified in-memory baseline.

## Run on Windows

Use an approved Node/npm installation. Tested with Node 22.21.0 and npm 10.9.4. Git for Windows is optional; local observations currently expect its standard `C:\Program Files\Git\cmd\git.exe` location.

From this application directory:

```powershell
npm ci
npm run build
npm start
```

The launcher opens a paired browser session on `127.0.0.1` at an assigned port. Keep the terminal running. Stop with Ctrl+C. If automatic browser opening is unavailable, run `node dist/server/index.js --no-open` and open the displayed single-use link within two minutes. That link grants this local session; do not share it or save terminal output containing it. A locked/expired session requires restarting the launcher.

If the `npm` command wrapper is blocked on your machine, invoke npm through Node directly:

```powershell
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' ci
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run build
node dist/server/index.js
```

No Docker, database, GPU, native credential binding or product account is required. Corporate installation, certificate and endpoint policies still apply. A clean-machine installation and packaged installer are not yet qualified.

## Try the workflow

1. Choose **Open a project**. Paste an absolute local folder path, or use **Browse** where the Windows chooser is permitted. Empty folders work. The folder must already exist.
2. Open **Project knowledge** to inspect the five foundational documents as plain text. Existing files stay untouched.
3. Create a task with objective, bounded scope, acceptance criteria, unknowns and a precise next action. **Save draft** saves to this running service only.
4. Use **Capture the result** for reported actions, verification and omitted checks. The app does not run project tests or certify pasted claims.
5. Select **Prepare handoff**, review it, then **Copy next-session prompt** or **Export Markdown**. Pass it to your coding agent and review the result.
6. **Connections** shows local Git observations and endpoint settings. Clone using your existing Git tools; no GitHub/GitLab account connection is needed.

The task ID is a draft identifier; it is not inserted into `plan.md`. Export before stopping: this preview has no durable history or document-write feature.

Before handoff copy/download, the app now rechecks foundational document hashes, Git branch/HEAD/path status and saved draft identity. Detected changes require review and a new handoff. Unavailable observations require acknowledging an unverified export. Source-file contents/diffs are not compared, so “no changes detected within checked coverage” is not proof the repository is unchanged. Existing running processes serve their previous bundle; export session drafts before restarting after a build.

## Inference and privacy

The manual workflow requires no inference connection. Settings accept an approved HTTPS Chat Completions base URL, model/deployment identifier, and an API key using Bearer or `api-key` authentication. The adapter appends `/chat/completions` and uses `max_tokens`; endpoints requiring other routes, parameters, SSO, a proxy adapter or different protocols are not qualified.

**Test connection** previews the destination and exact synthetic prompt before an explicitly confirmed, potentially billable request. It sends no project content. A passing test establishes only this narrow response contract. AI-assisted clarification and project-context generation are not implemented yet. No real inference call was made during development.

Keys stay in service memory and are cleared on project switch, Clear key, lock and shutdown. Profiles are also memory-only in this preview. No Windows credential storage is required. The browser holds an expiring local session capability in tab-scoped session storage to survive refresh; it does not store the endpoint key. Theme preference is stored locally. Memory and OS paging are not guaranteed secure-erased.

There is no telemetry or hosted backend. Context reads are bounded and restricted to `project.md`, `codebase.md`, `plan.md`, `progress.md` and `AGENTS.md`. Content is rendered as text. No source indexing, external chat observation, automatic project tests, commits, pushes or uploads occur. The app runs only its own fixed read-only Git commands.

## Current limitations

- Drafts disappear when the service stops; unsaved form changes can be lost on refresh. Saved drafts survive same-tab refresh while the service runs.
- Shared Markdown editing, reviewed diffs/apply, safe-write recovery and durable private state are next milestones.
- Structured task lifecycle, full debugging packets, attachments and model-generated proposals are not implemented.
- Local NTFS folders only. UNC/device paths and links are refused. Linked Git worktrees and nonstandard Git installs are not supported yet.
- Native folder-dialog behavior under corporate restrictions remains untested; UI path entry is the verified fallback. The app never bypasses PowerShell execution policy.
- One paired browser user/process. Concurrent editing and cross-process private state are not qualified.

## Development and verification

`npm run build` checks UI/server TypeScript and builds the app. `npm test` checks synthetic fixtures; no company credentials or real inference calls. `npm run dev` rebuilds and starts the service; restart after source changes.

Read [codebase](codebase.md), [plan](plan.md), [progress](progress.md), and [implementation handoff](handoffs/VC-004.md) for actual status. [Design contracts](docs/architecture.md) include future behavior. No license has been selected; this is a development checkpoint, not a public release.
