# Current milestone

Checkpoint update, 2026-10-03: the user authorized creating a Git repository and pushing the current work before fixing private draft persistence. This is an early development checkpoint, not a release. The older verified milestone below remains historical evidence.

Private draft persistence is now implemented in source (`src/server/private-drafts.ts`, its Windows ACL helper, API/UI integration and `tests/private-drafts.test.ts`), but qualification is incomplete. A live open of the default storage location failed with `Private storage identity changed.` The likely cause is Windows path casing versus canonical filesystem spelling. The UI safely falls back to temporary drafts; export important drafts before stopping. Keys and endpoint profiles remain memory-only.

Verification for that increment: a build passed and eight focused persistence tests passed earlier; the expanded 36-test run did not pass (Windows helper timeouts), and the later retry's complete result is unavailable. No clean expanded-suite or browser restart pass is claimed. Precise next action: reproduce the path-identity failure, add a regression test, fix canonical storage paths, then rerun the suite and check restart recovery. See [VC-002 handoff](handoffs/VC-002.md).

## Earlier verified milestone (2026-09-23)

As of 2026-09-23: the first application slice is implemented and running locally. Development was explicitly authorized after the planning phase. [VC-004 handoff](handoffs/VC-004.md) records evidence and omissions; [plan.md](plan.md) remains authoritative for task status.

Implemented: React light/dark workspace, in-UI folder opening, read-only foundational context, local Git observations, memory-only task drafts and endpoint keys, outcome/omission fields, deterministic handoff and next-session prompt, and an explicitly reviewed synthetic connection test. No account, OS credential binding or hosting API is required. The app has no shared-file mutation route.

Observed: build passes; 26 automated tests pass on Windows; the earlier dependency audit reported zero known vulnerabilities. The first-slice browser walkthrough confirmed folder opening, draft save, handoff rendering, saved-draft restoration after refresh, light/dark layouts and synthetic-key setup/review/cancel/clear. No real inference request was sent.

Latest increment: handoff export rechecks context-file hashes, Git metadata and saved draft identity, showing changed/unknown/limited-match states. No source/diff contents or semantic task alignment are checked yet. The new browser controls await manual verification; the user's existing running preview was preserved to avoid losing session-only work. See [VC-009 handoff](handoffs/VC-009.md).

The user's questions about codebase understanding, unexpected changes, hosting and Git assistance are addressed in [repository awareness and distribution](docs/repository-awareness-and-distribution.md). Recommendation: selected task context, checkpoint-based reconciliation, local-first for solo and company users, and a later optional Git assistant. Local Git actions do not require hosting. These questions do not authorize Git mutations or deployment.

Important limit: drafts and settings disappear when the process stops. Existing Markdown is authoritative; accepted tasks, lifecycle, reviewed Markdown writes, recovery, durable private history and project inference are not implemented. The repository itself still has no Git metadata, commit or branch. Nothing was committed, pushed or published.

Next action: finish VC-002 with a bounded Windows write/recovery spike against temporary synthetic documents before implementing VC-005. Test stale hashes, CRLF preservation, locks, linked paths and interrupted multi-file updates. Keep the application read-only until that boundary is qualified; add durable private drafts outside repositories without persisting keys.

Unknowns: actual approved endpoint/model/dialect/proxy/CA details; native folder dialog under corporate restrictions; clean-machine installation; write-race/recovery qualification; release name/license. Read-only/manual work does not require resolving the inference endpoint now.
