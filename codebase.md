# Codebase knowledge

Inspected and exercised on Windows on 2026-09-23. Workspace: `C:\venv\repos\VibeCoder`. The initial folder was empty. Git has not been initialized; branch, HEAD and Git diffs are unavailable for this application checkout.

## Implemented first slice

One Node/Fastify process serves a built React UI and authenticated API on `127.0.0.1` at an OS-assigned port. An expiring single-use launcher link pairs one browser session. The light/dark shell provides folder opening, fixed context-file inspection, scoped task drafts, outcome/report fields, deterministic handoff preview/export, and endpoint/key settings. No account or hosting-provider API is involved.

Folder access is read-only. Only `project.md`, `codebase.md`, `plan.md`, `progress.md` and `AGENTS.md` can be read as text; bounded Git observations use a fixed executable without shell interpolation. The UI shows no-Git/unavailable states. Linked Git worktrees are explicitly unsupported pending separate metadata grants.

As of 2026-10-03, private draft persistence is implemented but not fully qualified: `src/server/private-drafts.ts` and `scripts/protect-private-state.ps1` save bounded revisions outside project folders, with API/UI integration and `tests/private-drafts.test.ts`. The real default path currently fails a Windows path-identity check and falls back visibly to service memory; export drafts before stopping until fixed. Profiles and keys remain memory-only. Shared Markdown remains authoritative; drafts are unaccepted suggestions, not a second task database. The app cannot apply document edits, parse the planned Markdown schema, or mark tasks complete. See `handoffs/VC-002.md` for current evidence rather than treating the earlier checks below as persistence qualification.

The inference adapter supports only a synthetic Chat Completions connection test using an HTTPS base URL plus `/chat/completions`, model identifier, Bearer or `api-key` header, and `max_tokens: 16`. It requires explicit review before sending. No project inference, provider tools, automatic retries, real endpoint qualification or billable request was performed during this implementation.

## Existing structure

| Path | Responsibility |
| --- | --- |
| `src/ui/App.tsx` | Workspace, task, context, handoff and connections screens |
| `src/ui/api.ts` | Authenticated loopback client and tab session pairing |
| `src/ui/styles.css`, `tokens.css` | Responsive layout, themes, focus and reduced-motion styling |
| `src/shared/contracts.ts` | Application-owned Zod schemas and shared types |
| `src/server/app.ts` | Authorization, API, memory state, exact static asset serving |
| `src/server/workspace.ts` | Bounded read-only grants, canonical paths, link/file checks |
| `src/server/git.ts` | Bounded local Git branch/HEAD/status observations |
| `src/server/handoff.ts` | Deterministic Markdown and next-session prompts |
| `src/server/freshness.ts` | Context hashes and Git metadata comparison before handoff export; explicit incomplete coverage |
| `src/server/provider.ts` | HTTPS/DNS restrictions and bounded synthetic request |
| `src/server/folder-picker.ts`, `scripts/choose-folder.ps1` | Fixed Windows folder-dialog bridge; UI path-entry fallback |
| `src/server/index.ts` | Loopback startup, pairing launcher and shutdown |
| `scripts/build.mjs`, `develop.mjs` | Type checking, compilation, UI bundle and launch |
| `tests/security.test.ts` | 26 tests covering HTTP, credentials, filesystem, Git, handoffs and freshness limits |
| `package.json`, `package-lock.json` | One package, pinned direct dependencies, locked installation |
| `docs/` | Target architecture, UI, state/handoff, evaluation and operational design |

## Commands and observed environment

Tested: Windows, Node 22.21.0, npm 10.9.4, TypeScript 5.9.3, React 19.3.0, Vite 7.3.6, Fastify 5.12.5. Manifest accepts Node `^22.12.0 || >=24.0.0`; other accepted runtimes are not thereby qualified. Git observations expect `C:\Program Files\Git\cmd\git.exe` on Windows. No runtime library is installed into target projects.

```text
npm ci
npm run build
npm start
npm test
```

`npm run dev` builds then starts the same service; no hot reload or Vite dev server. `node dist/server/index.js --no-open` prints a one-use pairing instruction instead of launching a browser. Stop with Ctrl+C. See [README](README.md) for setup and the local npm-wrapper workaround.

Verification: full build and 26 automated checks pass. The earlier dependency audit reported zero known vulnerabilities; no dependencies changed in the freshness increment. The first-slice browser walkthrough exercised folder opening, scoped task save, handoff rendering and refresh recovery. The newer freshness UI has not yet been manually exercised. See [foundation handoff](handoffs/VC-004.md) and [freshness handoff](handoffs/VC-009.md) for evidence and omissions. These checks do not establish a security audit or full MVP completion.

Handoff copy/download now rechecks server-held receipt hashes, Git metadata and the saved draft. Detected changes require review/new preparation; unavailable observations require explicit acknowledgement to export an unverified draft. Matching status is labeled limited coverage, never proof of unchanged source or on-track work. This compares preparation with export, not durable task-start/phase checkpoints.

## Still proposed

Safe reviewed multi-file writes and recovery, Markdown schema/parser, durable private history, task lifecycle and dependency validation, evidence attachments/debug packets, source diffs and linked-worktree grants, selected-context AI proposals, real endpoint qualification and full journey evaluations remain planned. No standalone domain packages, database or agent framework are needed yet.
