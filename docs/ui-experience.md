# UI direction and setup experience

Status: UI target, with a first application slice implemented on 2026-09-23. The React UI now opens real folders read-only, displays local context/Git observations, saves session drafts, generates handoffs and configures memory-only endpoint keys. It uses neutral/sage themes, locally bundled icons, responsive navigation and reduced-motion styles. The earlier conversation concept remains illustrative. Reviewed shared writes, durable history and model proposals are not implemented; see [codebase](../codebase.md).

## Reference and interpretation

Reference: [Hume EVI Next.js starter](https://github.com/humeai/hume-evi-next-js-starter). Inspected its public landing screen and source on 2026-09-22. The entry screen has extensive whitespace, a compact central action, and a theme toggle. The [package manifest](https://raw.githubusercontent.com/HumeAI/hume-evi-next-js-starter/main/package.json) includes Geist, Radix, Lucide and Motion; its [controls component](https://raw.githubusercontent.com/HumeAI/hume-evi-next-js-starter/main/components/Controls.tsx) uses motion primitives. A live voice call was not started, so in-call animation quality has not been measured.

Our interpretation: polished typography, restrained surfaces, focused actions, responsive feedback and purposeful motion. Apply that discipline to a richer engineering workspace. This reference does not change the product into a voice app or mandate Hume, Next.js, Vercel, or the reference's dependency versions. Keep the proposed React/Vite/local-service architecture. Evaluate accessible component primitives and a small motion library during implementation; bundle assets locally and avoid remote fonts/scripts in the shipped app.

## UI owns setup

Once the local app is launched, ordinary configuration happens in the UI. Users should not have to edit configuration files, set environment variables, or pass a workspace flag to perform normal setup. Source installation and the initial launcher remain separate from in-app configuration.

| UI surface | Actions and feedback | Boundary |
| --- | --- | --- |
| Open project | Choose an existing local folder or create workspace documents in a selected empty folder; display resolved path, permissions and context-document collisions. Recent folders remain private. | Grant only the explicitly selected root; never upload the repository. |
| Inference settings | Enter endpoint, model/deployment, supported key-header style and masked API key; Test connection, Use for this session, Clear key. Display connection errors and session-only lifetime. | Testing uses an explicit synthetic request; no key is saved to repository/config files. |
| Repository | Detect Git in the opened folder, show branch/HEAD, changed files, last observation and Refresh. Open another repository through the same folder flow. | Local association and observation; no GitHub/GitLab sign-in, remote access token, cloning, fetch, push, branch checkout or hosting API. |

Use “Open repository” and “Repository status” rather than an ambiguous “Connect Git account.” Code-free projects show “No Git repository” without blocking work. A repository with no remote works identically. Remote hosting authentication remains with the user's existing tools, as specified in the original brief.

Prefer a Choose folder button that invokes a narrowly scoped Windows folder dialog through the authenticated local service. Qualify the implementation in VC-002; do not assume a browser upload picker yields a usable backend path. Always provide a paste/type-path field in the same UI for environments that block the native helper. This is a complete UI path, not a terminal workaround. The folder dialog selects a path; actual read/write grants still require backend validation. No background disk indexing, arbitrary shell commands, or attempt to enable blocked system features.

Opening a project and configuring inference are independent. Users can open/review local work without a key and add a provider when first needed. Returning users land on the current task, with a small actionable connection state instead of a repeated onboarding wizard.

## Workspace composition

- **Left navigation:** project switcher, current task list, project knowledge and handoffs. Compact, collapsible, with no decorative activity statistics.
- **Top bar:** project/task location, local repository state and inference state. Settings remain reachable without leaving a draft.
- **Main surface:** one selected task with objective, scope, acceptance criteria, outcomes and the next action. Clarification can feel conversational, but accepted task data stays structured and editable.
- **Context inspector:** relevant documents, selected outbound context and criterion-linked evidence. Open when useful and collapse for focus. Never hide the source of a consequential claim solely in a tooltip.
- **Review surface:** readable proposed document changes, before/after context, provenance, conflicts and explicit Apply/Reject. “Saved draft,” “Applied to files,” “Copied,” and “Reported as tested” have distinct labels.
- **Setup/settings:** in-place view for folder, local Git and inference configuration. Preserve unsaved work when entering/leaving it.

The representative path is Open project → select or clarify task → prepare prompt → capture result → review updates → prepare handoff. Experienced users may enter any valid stage directly. A large chat transcript is not the only way to navigate or inspect project state.

## Visual and interaction principles

Use neutral light/dark surfaces following system appearance, subtle dividers, strong text hierarchy, a restrained accent for selection, compact icons with labels, and generous space around the active task. Keep ordinary engineering information readable at useful density. Avoid oversized hero sections inside an active workspace, glass effects over evidence, ornamental dashboards, constant pulsing, or decoration that competes with diffs.

Use brief transitions, approximately 120–180 ms for hover/selection and 180–240 ms for changing panels; these are starting design targets, not measured performance. Motion should explain where content went and preserve spatial continuity. Respect reduced motion, retain keyboard focus and avoid layout jumps when responses arrive. Use skeletons only for actual pending data, preserve drafts during errors, and expose cancellation for generation. Never animate a task into verified/complete state before its actual guarded decision succeeds.

Keep keyboard access, visible focus, accessible labels, theme contrast and readable status text from the first implementation. At smaller widths collapse the inspector into an accessible secondary view and preserve the primary action; long paths and diffs wrap or scroll locally without breaking the application layout. Informational color is always paired with text.

## Acceptance criteria

1. After launch, configure endpoint/key, open a folder, and inspect local Git using only the UI. All three can be revisited without losing the current draft.
2. Demonstrate empty-folder, existing-repository, no-Git, Git-unavailable, read-only, blocked-native-picker, missing-key and provider-error states. Every state has a precise recovery action; no unearned “connected” status.
3. Complete both representative journeys plus the experienced-practitioner resume scenario with direct access to evidence, task state and handoffs. Reuse established context without repetitive questions.
4. Check light/dark themes, keyboard-only use, reduced motion, common Windows display scaling, and narrow layouts. No clipped primary actions or accidental disclosure through hidden fields.
5. Measure local interactions on a representative laptop: target immediate press/selection feedback within 100 ms and warm local view changes within 300 ms. Measure inference separately; perceived responsiveness must not imply a provider response is complete.
6. Review the visual concept before UI implementation and carry its hierarchy into the first working slice. UI quality is part of each phase, not a final cosmetic task.

## Current position and next design checkpoint

Product purpose, scope, architecture, data boundaries, evidence semantics and the implementation plan are documented. Windows-first and API-key-first are confirmed. This UI requirement and reference now guide the experience; exact styling and the folder-dialog mechanism still need validation. There is no running application, installed dependency tree or implemented Git/provider connection.

Next: review the workspace/setup/review concept, then use a later implementation request to begin the bounded Windows feasibility checks and the first local UI slice. Keep provider access and runtime observations explicitly unverified until tested.
