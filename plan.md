# Implementation plan

Planning baseline: 2026-09-22; development authorized subsequently. Status updated 2026-09-23. This file is authoritative for task status. The first working slice delivers read-only foundations and partial manual workflow features; it is not the full MVP. Dependencies remain milestone gates: safe writes have not been bypassed by enabling unqualified mutation routes.

The human-readable plan is not yet stored in the product's proposed structured Markdown format. Do not mistake a design proposal for running infrastructure. Phase estimates include the listed tasks jointly and should not be summed again per task.

## Milestones and effort

| Phase | Outcome | Tasks | Focused days |
| --- | --- | --- | --- |
| 0 | Qualify risky Windows and provider assumptions; freeze a small contract. | VC-002–VC-003 | 2–3 |
| 1 | Secure local shell and safe, editable shared knowledge. | VC-004–VC-005 | 5–7 |
| 2 | Complete deterministic plan → external work → resume journey. | VC-006–VC-007 | 6–8 |
| 3 | Evidence/debugging and read-only Git reconcile correctly. | VC-008–VC-009 | 6–8 |
| 4 | Add one constrained inference adapter and guided proposals. | VC-010–VC-011 | 5–7 |
| 5 | Prove representative journeys for experienced practitioners and learners. | VC-012–VC-013 | 5–7 |
| 6 | Reproducible installation and a reviewable release candidate. | VC-014 | 3–5 |
| Total | Before roughly 20% contingency; excludes approval waiting. | | 32–45 |

Build the manual deterministic journey before depending on AI generation. Prototype the provider compatibility risk early, then integrate it after the state and review boundaries are established. Critical safety failures block dependent work; a deadline is not a reason to remove evidence labels or conflict detection.

UI quality and setup requirements are defined in [UI experience](docs/ui-experience.md). Review the illustrative workspace/setup/review concept before implementing the shell. Carry the visual hierarchy, keyboard access and responsive feedback into each working slice; polish is not postponed to the last phase.

## VC-001 — Establish the planning baseline

Status: **complete — planning documents produced and reviewed locally**. No application implementation or runtime verification is claimed.

Dependencies: none.

Acceptance criteria:

- Inspect existing files/instructions without overwriting prior work; record actual repository/Git state.
- Capture product scope and consequential user choices; distinguish requirements, proposals and unknowns.
- Document the MVP, architecture, state/Markdown/handoff contracts, security, deterministic/LLM separation, realistic evaluation and cited cost assumptions.
- Provide phased tasks and a next-session handoff; do not install, scaffold, initialize Git or provision services.

Verification: local file inventory, document-link/example checks and cross-document consistency review recorded in [handoff](handoffs/VC-001.md). User architectural acceptance remains pending; this status denotes delivery of the requested planning work.

## VC-002 — Qualify Windows filesystem and session-only credential behavior

Status: **in progress — read-only boundary and session-key checks pass; private draft persistence implemented with an unresolved Windows path-identity failure; safe shared writes/recovery and native chooser qualification remain**. Updated 2026-10-03; see [qualification handoff](handoffs/VC-002.md). Dependencies: VC-001; implementation is now authorized.

Scope: a disposable engineering spike, not the full application. Confirm the proposed supported Windows/browser/filesystem environment and whether company machines permit the distribution path.

Acceptance criteria:

- Demonstrate session-only key entry/use/clearing with OS credential access denied or absent; no native-vault dependency and no secret in arguments, persisted state or logs. Lock/restart/project switch requires re-entry without losing non-secret settings.
- Demonstrate safe document replacement/recovery with editor locks, external edits, junction/hard-link rejection, disk failure and process interruption. Document residual external-writer race limitations.
- Qualify a narrow Windows folder-dialog bridge initiated from the UI; when blocked, demonstrate type/paste-path selection entirely in the UI. Do not depend on browser uploads, unrestricted shell execution or a workspace CLI flag.
- Confirm user-level Node/npm setup without a compiler/admin or OS-vault requirement for normal use, or revise the installation proposal before continuing. Qualify company policy for the proposed key-entry flow; do not attempt to enable blocked credential storage.
- Record dependency selection and support boundaries with reasons; resolve U-02/U-03 or name a blocker.

Verification: synthetic credential, temporary NTFS fixture tree, fault injection and before/after byte hashes; no real company secrets or project content. Stop if write safety cannot be qualified; retain preview/export-only scope until resolved.

## VC-003 — Qualify the first approved endpoint and freeze contracts

Status: **blocked on real endpoint details for qualification; synthetic mock contract exists**. Dependencies: VC-001 and the user's available endpoint details; independent local work can proceed.

Acceptance criteria:

- Record protocol, key scheme, route, model/deployment, output parameter, CA/proxy requirements and capability results privately.
- Test only explicitly approved synthetic content; verify role handling, usable structured result, limits, errors, cancellation and usage reporting.
- Confirm the price/retention information supplied by the company or leave it explicitly unknown. No compatibility claim without a real check.
- Freeze version-1 domain and response schemas and explain any architecture changes in reviewable documents.

Verification: captured synthetic request/response shapes with secrets removed, mock failures, actual endpoint connection receipt. Without endpoint access, mock contract work may proceed but integration/release remains unqualified.

## VC-004 — Create the secure local application shell

Status: **implemented in read-only preview; partial verification, not fully accepted**. Dependencies: read/session portion of VC-002; shared-write qualification remains outstanding. See [implementation handoff](handoffs/VC-004.md).

Acceptance criteria:

- One process serves built UI and API on loopback only; launcher opens a paired session and exits cleanly.
- Create/open explicit folder grant, path resolution and read-only fallback work for an empty folder.
- Implement the reviewed workspace shell with in-UI project selection and settings entry points, light/dark themes, keyboard access and reduced-motion support. Draft state survives navigation into settings.
- All content routes require session authorization; exact Host and mutation-Origin rules apply; pairing token is single-use and absent from HTTP/persistent logs. Explicit no-open/launch-failure mode may display the temporary pairing instruction in the local terminal.
- Display privacy boundary and endpoint-independent offline mode; private state lies outside the workspace.

Verification: integration/browser tests for legitimate pairing, foreign-origin/Host requests, replay, missing token, process restart, path traversal and denied folder. Confirm no LAN listener and no production dependence on the Vite development server.

## VC-005 — Implement Markdown authority and reviewed writes

Status: draft. Dependencies: VC-004.

Acceptance criteria:

- Create/adopt context documents through exact diff review, preserving existing instruction files and unrelated prose.
- Parse constrained marked blocks and derive state; invalid/unknown schema and Git conflict markers remain visible and read-only.
- Use source hashes, lock, journal and conditional recovery; stale proposals and branch-context changes cannot apply silently.
- Edit in the app or externally, reopen, and obtain consistent state without a private cache overriding Markdown.

Verification: round-trip fixtures including CRLF, duplicate IDs/keys, external edits, partial batch failures and recovery. Restart mid-batch at every write stage; recover or diagnose without losing current bytes. This is a milestone gate before adding AI.

## VC-006 — Implement bounded tasks and manual agent exchange

Status: **in progress — draft forms/manual templates only; lifecycle and accepted Markdown state remain**. Dependencies for completion: VC-005.

Acceptance criteria:

- Guided forms create objectives, unknowns, constraints, dependencies and measurable criteria for a code-free project.
- Existing tasks expose direct editing, evidence and handoff actions for experienced users; introductory guidance is optional and accepted context is reused without repetitive questions.
- Validate task state transitions and readiness; copying a prompt does not imply work occurred.
- Produce editable investigation and implementation prompts with task scope, relevant context paths, return format and stop conditions.
- Capture raw external output privately and accepted summaries through the review flow; no chat observation or command execution.

Verification: no-Git assignment walkthrough, dependency cycle/cancellation tests, bounded prompt fixtures and illegal transition rejection. A user can complete the flow without an inference connection.

## VC-007 — Implement handoffs and fresh-session resume

Status: **in progress — deterministic draft handoff/next-session export works; durable reconstruction remains**. Dependencies for completion: VC-006.

Acceptance criteria:

- Prepare handoff enforces the contract, distinguishing absent Git and unknown revision from a clean repository.
- Copy next-session prompt explicitly names context files, reconciliation steps, evidence expectations and one next action.
- Multiple task handoffs stay separate; shared progress is a concise milestone snapshot only.
- Restart or open a copy of the shared documents without local history and reconstruct the selected task. Missing private attachments remain explicit.

Verification: two-person paper walkthrough plus browser tests for accepted/draft/stale handoff export and app restart. Review generated prompts for no assumption of automatic instruction-file discovery.

## VC-008 — Add outcomes, evidence and debugging packets

Status: **in progress — report/omission fields only; criterion evidence, packets and attachments remain**. Dependencies for completion: VC-007.

Acceptance criteria:

- Separate implemented reports, reported tests, user review, app observations and task acceptance; external text cannot mint app verification.
- Each criterion has evidence or a recorded omitted/waived check; completion requires an explicit reviewed decision.
- Debug packet includes expected/actual, reproduction, environment, changes, logs/screenshots, attempted fixes, hypotheses and next investigation.
- Attachments are private, bounded and previewed; raw screenshots are not sent to inference. Export identifies manual attachments and privacy omissions.

Verification: E-02/E-04 plus malformed artifacts, secret-bearing logs, unavailable attachments and stale evidence. Human inspection must find every intended uncertainty in the exported packet.

## VC-009 — Add safe local Git observations

Status: **in progress — branch/HEAD/status and no-Git states implemented; diffs, freshness lifecycle and worktrees remain**. Dependencies for completion: VC-008 and qualified Git safety behavior from VC-002.

Increment delivered: preview-to-export rechecks of context hashes, Git branch/HEAD/path status and saved draft identity, with changed/unknown/limited-match UI states. Build and 26 automated checks pass. This is not durable task-start checkpointing or source-content monitoring. See [repository awareness strategy](docs/repository-awareness-and-distribution.md) and [VC-009 handoff](handoffs/VC-009.md).

Acceptance criteria:

- Observe branch/HEAD/status and selected diffs with provenance and bounded output; handle no Git, unborn/detached HEAD and worktrees.
- Branch or selected-file changes invalidate affected proposals/handoff freshness; metadata alone never certifies tests.
- External metadata grants are explicit for linked worktrees; dangerous helper execution is disabled.
- Remote URL/hosting provider is irrelevant to workflow; no fetch/clone/checkout/commit/push/PR/MR capability.
- Repository status is visible and refreshable from the UI with branch/HEAD/changes and unavailable/no-Git states; do not ask for a hosting-service account or token.
- Retain task-start and accepted-handoff checkpoints with explicit coverage; compare selected source/diff identities as well as Git status. Identical dirty-path status must not imply unchanged bytes.
- Reconcile unexpected changes by explicit association, scope revision, another task or investigation; preserve external work and historical evidence. Phase views derive from task checkpoints rather than a second task database.

Verification: local fixture repositories with remote variants, dirty/untracked changes, malicious helpers and a linked worktree. Assert no helper side effects, index mutation or network activity. Full-repository code investigation remains with the external coding agent.

## VC-010 — Implement outbound preview and one API-key provider

Status: **in progress — session keys and reviewed synthetic probe only; project-context preview/send and real qualification remain**. Dependencies for completion: VC-003, VC-005, VC-009.

Acceptance criteria:

- Private endpoint profile and session-only key source work without OS credential access; changing the destination invalidates the active credential association and send approval. Persistent private state contains non-secret settings/source metadata only.
- Endpoint/model/key entry, explicit Test connection, session-only lifetime and Clear key are available in UI settings without manual environment-variable or configuration-file editing.
- Preview freezes exact messages, source hashes, omissions/redactions and budget. Send never reads extra context or follows redirects.
- One bounded request at a time; typed result validation, cancellation, unknown usage, and manual retry behaviors match the design.
- No telemetry, remote history, hidden tools, files API, screenshots or credential content in inference payloads beyond the auth channel.

Verification: mock capture equals approved payload; attack fixtures cannot change destination/read grants. Exercise 401/403/429/5xx/timeouts/invalid JSON and one approved real-endpoint smoke call with synthetic data. Restart never resends automatically.

## VC-011 — Add guided model proposals to the existing workflow

Status: draft. Dependencies: VC-010 and VC-008.

Acceptance criteria:

- Clarification, decomposition, prompt drafting, debugging suggestions and knowledge updates use the same deterministic workflow/review gates.
- Test-automation and Java-story question sets adapt to answered context, retain unknowns, and avoid unsupported stack defaults.
- Repository/model instructions cannot approve writes, promote evidence, choose additional files or invoke commands.
- Failed generation preserves drafts and manual templates; no autonomous repair loop.

Verification: initial 20-case corpus, repeated outputs, schema failures and human rubric in [evaluation](docs/evaluation.md). Prompt changes are versioned and re-evaluated on affected scenarios.

## VC-012 — Verify the whole product and failure recovery

Status: draft. Dependencies: VC-011.

Acceptance criteria:

- E-01 through E-12 pass their deterministic expectations; both primary scenarios reach fresh-session resume, the experienced-practitioner path avoids repeated onboarding, and inference works with OS credential storage unavailable.
- Complete adversarial HTTP/path/Git/Markdown/context tests and crash/partial-write recovery on the qualified Windows environment.
- Test source install from a fresh user context and measure initial resource targets; correct any unsupported claims.
- Produce a local release-evidence report with tested versions, provenance and remaining limitations.

Verification: unit/integration/E2E results, manual cross-contributor handoff and safe-failure demo. Critical safety failures block the pilot/release rather than becoming accepted cosmetic issues.

## VC-013 — Run the practitioner and learner pilot and revise the journey

Status: draft. Dependencies: VC-012 and participant availability.

Acceptance criteria:

- Run 6–9 participants, including at least three experienced AI/coding-agent practitioners and three learners, through matched tasks with their existing workflows as baselines, respecting approved data boundaries.
- Measure scoping quality, evidence completeness, handoff usability, task-cycle cost and time; report failures and facilitator interventions.
- Report outcomes separately by experience level; test that experienced users can reach routine actions directly and are not slowed by mandatory teaching steps or repeated known questions.
- Meet or explicitly renegotiate the documented pilot/model gates based on evidence; fix misleading verification/privacy UI before release.
- Keep the result as one coherent journey without adding unrelated framework/provider coverage.

Verification: anonymized observation sheets, two-reviewer model rubric samples, revised walkthrough and regression checks focused on changed behavior. No company-content telemetry is introduced to collect these results.

## VC-014 — Prepare a reproducible release candidate

Status: draft. Dependencies: VC-013; license/public name resolved before publication.

Acceptance criteria:

- Source/lockfile, installation, start/stop, credential setup/removal, offline use, updates, private-history deletion, backup and recovery instructions are complete.
- Document supported OS/browser/filesystem and exact tested endpoint dialect; show a synthetic empty-folder and Java-story walkthrough.
- Ensure private data, keys, real company content and local journals are absent from release artifacts; explain inference and manual agent boundaries accurately.
- Provide a release checklist and candidate artifacts for user review. Publishing remains a separate explicit action; no automatic commit/push/release.

Verification: clean-machine install → full workflow → restart/resume → uninstall/private-data cleanup exercise; inspect candidate content and dependency/license inventory. Stop with a reviewable release candidate until publication is authorized.

## Scope guard and next action

Proposed after-MVP extension VC-015: task-aware Git assistance (read-only graph/explanations first, separately qualified and explicitly reviewed fetch/stage/commit/fast-forward pull/normal push later). Status: **proposal only, not implementation authorization for Git mutations**. Depends on durable task state and VC-009. Acceptance would require correct graph ancestry, explicit task links, stale-operation rejection, visible staged content/destination, dirty/divergent-state safe stops, and a qualified hooks/signing/SSH/helper policy. No force push, automatic stash/reset/clean/rebase, or provider API dependency. Hosting remains an exploratory deployment decision, not a prerequisite for this extension.

Next: finish the VC-002 Windows write/recovery spike before enabling VC-005 shared writes. Start with temporary synthetic CRLF documents, stale-hash rejection, editor locks, linked paths and interruption at each write stage. Preserve preview/export-only behavior until recovery is qualified. Durable private drafts must remain outside repositories and exclude keys. Endpoint qualification can follow when an approved endpoint is available. Keep each task scoped with its own criteria, context, evidence and stop conditions.
