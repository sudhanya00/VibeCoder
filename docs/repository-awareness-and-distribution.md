# Repository awareness, reconciliation and distribution

Design follow-up: 2026-09-23. Addresses the user's questions about context efficiency, between-session changes, a hosted edition and beginner-friendly Git. These are recommendations and roadmap refinements, not permission to deploy, upload repositories or execute remote Git operations.

## Context strategy

Do not send the whole repository to a model. Separate local observations, accepted project knowledge, optional model interpretation and external coding-agent investigation.

1. Opening a folder grants only the existing bounded context-file and Git metadata access. A future filename/manifest inventory must disclose its scope; it is not a source-content grant. Never crawl the whole drive or silently read ignored/private files.
2. The coding agent investigates implementation details under the user's scoped prompt. Return relevant paths, findings, questions and evidence. Its report is not an app observation or automatically accepted `codebase.md` content.
3. A reviewed context packet combines the selected task/criteria, relevant accepted decisions, selected code snippets or diffs, and evidence. Show exact bytes/messages, destination, coverage, exclusions and estimated token budget before sending. No hidden follow-up retrieval or model-chosen file access.
4. Prefer on-demand bounded reads and ordinary local search before embeddings or a full parser/index. Reuse local derived summaries only while their source digests and generation version match; label summaries as derived and retain source references. Local reuse does not imply free provider prompt caching.
5. Use task-specific budgets, for example an initial design target of 8k input/2k output tokens per synthesis, configurable for the approved model. These are targets, not current enforcement or measured costs. Oversized selections require narrowing/review rather than silent truncation. Exclude dependency trees, generated output and binaries by default; inspect lockfiles only when pertinent. Secret screening is a backstop, not a guarantee or a replacement for explicit selection.

The current application does not read arbitrary source files or send project content to inference. It reads five foundational Markdown files, observes bounded Git metadata, and supports a synthetic connection test only. There is no LLM codebase analysis, vector index or automatic knowledge generation yet.

## Task and phase observations

Target: record a task-start checkpoint and accepted handoff checkpoints containing task/criteria digest, repository identity, branch, commit, staged/unstaged metadata and hashes/diff identities for explicitly selected paths. Working-tree content matters: two different edits can have exactly the same Git status. A path status or commit alone is not a complete checkpoint.

Compare committed changes since the baseline, staged changes and unstaged changes separately. Untracked selected files need bounded content hashes because ordinary tracked diffs do not include them. Explicitly show ignored files, submodules, oversized/unreadable files and other excluded coverage. No-Git projects can compare selected file presence and hashes, but cannot infer commit history, reliable renames or authorship. Never infer task ownership merely from time, branch name or the person who clicked Prepare.

Recheck on resume, outcome capture and export/apply. Later, a debounced watcher can mark observations stale; it cannot replace a fresh read at a consequential action. Do not call the model on every edit. Recompute only affected local summaries; semantic analysis is a separately reviewed request. Incomplete or mid-change observations stay unknown/retryable, not certified snapshots.

A phase is a roll-up of task IDs and their accepted evidence/checkpoints. Show remaining dependencies and relevant changes, not a second mutable source of task status. A Git commit graph depicts actual commit ancestry; task associations are explicit user-reviewed links. Neither graph proves work was verified or captures actions performed and reverted between observations.

Initial tests should measure selected bytes, omitted bytes, changed-file count, scan time, latency and actual provider usage where available. Compare repeat-handoff cost against full-context resends. Set performance claims from measurements rather than repository size guesses.

## Handling unexpected work

Differences are evidence that the world changed, not proof the user went off track. The UI should show “Changes since the checkpoint” with old/new branch, commit, affected paths, knowledge changes and missing coverage. A model may suggest which changes matter, with reasons and source references; it cannot decide scope or discard work.

The user can: associate a change with the current task, revise the task/plan with rationale, create another task for unrelated work, or request investigation when intent is unclear. Preserve all files. Never automatically reset, stash, revert, delete or move external changes. Prior verification remains a historical report and may no longer apply to the current revision.

Example: a smoke-test task returns with an authentication refactor. It may be a necessary prerequisite or unrelated work. Show the evidence, ask the one consequential question about intent, then record the chosen scope/dependency adjustment. Do not repeatedly re-onboard the user or assume the old plan is always correct.

Branch switches, rewritten/missing baseline commits, incomplete diffs and ambiguous attribution require explicit reconciliation. A stale generated proposal must be regenerated or merged against current evidence and reviewed again. Accepted historical milestones are retained, not silently rewritten.

## Implemented increment: handoff freshness

The new `src/server/freshness.ts` captures private in-memory observations when a handoff is prepared and compares them before UI copy/download. It re-reads foundational document bytes and Git branch/HEAD/path status. It also detects a changed saved task draft. Receipts are bound to the selected workspace, capped at 50, and cleared on switch/lock/shutdown. Client-supplied baselines cannot mint observations.

UI states: changes need review; observations unavailable; or no changes detected within checked coverage. Detected changes stop export until a new handoff is prepared. Unknown coverage requires explicit acknowledgement to export an unverified draft. Both exports retain coverage limitations. Nothing is reverted, uploaded, written to project files or marked complete.

Limits: this is preview-to-export validation, not durable task-start/phase tracking. No source content/diff hashes, continuous monitoring, authorship or semantic drift analysis exist yet. Unchanged path status cannot detect a second edit to an already-dirty source file. The UI says this explicitly. Checks are point-in-time observations, not filesystem locks; the next agent must still reconcile current repository evidence. Preparing a new handoff acknowledges a new baseline, not proof that scope questions were answered.

## Distribution recommendation

Solo developers are a core audience for the same local product. Hosted versus local is a deployment choice, not an experience-level or team-size distinction. The existing app already is a browser web app; its service runs on the user's machine.

| Option | Benefit | Cost / boundary | Recommendation |
| --- | --- | --- | --- |
| Local UI + local service | Local code, existing Git/SSH setup, offline manual flow, direct access to approved internal endpoints | Installation and updates | First complete product; improve launch/install UX before adding services |
| Hosted planner without local companion | Try scope/plan/handoff workflows without installation | Cannot offer equivalent system Git/local-worktree access; browser folder access and endpoint CORS vary | Possible optional trial/companion later; clearly disclose reduced capability and any storage |
| Hosted UI + local companion | Hosted UI distribution with local code/Git operations | Still requires installation; hosted-origin trust, pairing, updates and endpoint policy add complexity | Defer until a measured need; never relax the current service's same-origin rules to obtain this casually |
| Hosted full workspace | Work without a local runtime, cross-device access | Remote clone/storage/execution, authentication, isolation, secrets and service operations; source leaves the machine | Separate explicit opt-in product decision, not a deployment toggle for the current MVP |

Browser file selection exists but has permissions/compatibility limits and does not expose the user's installed Git/SSH process. See [browser directory access](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker). A hosted page also cannot assume arbitrary provider endpoints permit browser-origin requests. A backend relay would create a new data/credential boundary requiring an explicit design decision. An internal endpoint reachable only over a user's VPN may not be reachable by a hosted backend.

Keep logical filesystem/Git/inference boundaries, but do not create speculative cloud services or multi-tenant infrastructure now. No hosting provider, account, billing, sync or cloud credential store is approved by these questions.

## Git assistance recommendation

A local service can run Git against a local clone and connect directly to GitHub, GitLab or self-hosted remotes. Our application does not need hosting. Core commands use Git's protocols, not hosting APIs. See official [fetch](https://git-scm.com/docs/git-fetch), [pull](https://git-scm.com/docs/git-pull), [push](https://git-scm.com/docs/git-push), and [history/graph](https://git-scm.com/docs/git-log) documentation. Fetch updates local remote-tracking data; pull integrates incoming work; push updates the selected remote. These are different user-visible consequences.

Position this as a task-aware Git assistant, useful to beginners and experienced developers:

1. Read-only changed-file/diff viewer, branch/history graph, task links and plain-language explanations. Mark remote-tracking information as last-known until refreshed.
2. Optional model explanations or commit-message suggestions from explicitly selected diffs. Deterministic operation plans and state checks; the model never emits shell commands to execute.
3. Later, explicit user-triggered fetch, stage selected files, reviewed commit, fast-forward-only pull and reviewed normal push. Show repository, branch, remote destination, selected changes/commits and expected effect before acting. Revalidate immediately before execution and stop on changed state.

For an initial action-capable release, stop on divergence, merge conflicts, conflicting untracked files or dirty-tree integration risk. No automatic stashing, force-push, destructive reset/clean, silent rebasing or automatic conflict resolution. Commit review must make existing staged content visible and avoid accidentally including unrelated work. Preserve signing and repository policy: commit hooks/credential helpers can run programs, so mutation support needs a distinct, qualified execution/authentication policy instead of reusing the current read-only adapter or bypassing hooks.

Use the user's existing approved Git authentication where supported. Do not confuse inference keys with Git credentials or require a company-blocked OS vault. Hosting APIs are needed only for optional provider-specific features such as issue/PR/MR operations, not basic Git transport/history. Supporting remote URLs, hooks, SSH/helpers and credentials safely is real scope, even when the UI has only five buttons.

## Implementation order

Keep the current read-only MVP boundary while adding the small freshness increment. Next finish safe persistence/recovery, then durable task checkpoints and selected diff/source coverage under VC-009. Add the read-only activity graph only once its actual data is available. Offer a later Git-assistance milestone with its own authorization/security tests; hosting remains exploratory. See `plan.md` for acceptance criteria and status.
