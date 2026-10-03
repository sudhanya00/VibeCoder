# VibeCoder — product direction

Planning baseline: 2026-09-22; implementation began after explicit user authorization. Working name: VibeCoder. As of 2026-09-23, a first working slice exists; the full MVP described below remains the target. See `codebase.md` for actual behavior and limitations.

## Purpose and users

Help technical professionals direct their existing AI coding agents through a complete project workflow: understand a task, scope a small unit of work, prepare the agent, capture its outcome and evidence, review knowledge updates, and resume correctly in a fresh session.

The product serves technical professionals working with AI coding agents, including seasoned AI engineers, developers, DevOps engineers, and testing engineers. Experienced practitioners need precise task control, reliable project knowledge, evidence review, and efficient session continuity. People learning these practices benefit from contextual guidance. Company training is one use case and a source of observed problems, not the definition of the audience.

The product is also an engineering showcase: useful outcomes, reliable state, understandable trade-offs, and a finished journey take precedence over a large feature catalogue. Use one workflow with optional explanations and direct access to task, evidence and handoff actions. Experienced users should not have to complete introductory lessons or repeatedly answer questions already resolved in project context. Review, permissions and evidence requirements apply equally to everyone.

A project is a local workspace containing objectives, decisions, tasks, and handoffs. Code and Git are optional at creation. The application coordinates work; the user's coding agent investigates and implements it.

## Confirmed requirements and decisions

| ID | Requirement or decision | Origin |
| --- | --- | --- |
| R-01 | A local web app, distributed with source and installation instructions on GitHub; no product backend required. | Product brief |
| R-02 | Project content, session history, and local processing stay on the machine. Only explicitly selected context goes to the configured inference endpoint. | Product brief |
| R-03 | Credentials and private local state stay outside repositories and logs; prefer OS credential storage. No project-content telemetry. | Product brief |
| R-04 | Manual copy/paste exchanges with existing coding agents form the MVP execution boundary. | Product brief |
| R-05 | Editable, shareable Markdown with explicit responsibilities and reviewable changes; no silent overwrites or competing authoritative state. | Product brief |
| R-06 | Evidence provenance, unknowns, blockers, checks not performed, and precise next actions are first-class records. | Product brief |
| R-07 | Any local Git repository must work irrespective of GitHub, GitLab, or self-hosted remotes. No hosting API dependency, automatic commits, pushes, or publishing. | Product brief and follow-up |
| R-08 | One orchestrated workflow; the model proposes, deterministic application code validates permissions, transitions, and writes. | Product brief and follow-up |
| D-01 | Windows first; macOS and Linux follow later. | User clarification, 2026-09-22 |
| D-02 | API-key authentication first; add other authentication methods when required. | User clarification, 2026-09-22 |
| D-03 | Original planning-only boundary; superseded for local development by D-08. No automatic Git initialization or publication. | Original request |
| D-04 | Corporate policy may block OS credential storage. The core workflow must not require Windows Credential Manager or permission to enable it. | User correction, 2026-09-22 |
| D-05 | Seasoned AI engineers are part of the core audience; usefulness is not limited to learners or company training. | User correction, 2026-09-22 |
| D-06 | Key/endpoint setup, folder selection and local Git association/status belong in the UI. | User clarification, 2026-09-22 |
| D-07 | A modern, smooth interface is a core quality requirement; use the supplied Hume starter as a visual/interaction reference. | User clarification, 2026-09-22 |
| D-08 | Begin development. Deliver a working foundation while retaining review, credential and Git boundaries. | User: “Go ahead start the development.” |

## Smallest coherent MVP

One Windows user, one active folder per application process, one selected task at a time, one configured inference profile per session. Multiple contributors collaborate by committing shared documents using their existing Git tools. The folder can contain many tasks; selecting one keeps the working context bounded.

Include create/open, a guided clarification worksheet, a bounded task plan, investigation/implementation prompts, manual outcome capture, debugging packets, evidence review, proposed Markdown diffs, Prepare handoff, and Copy next-session prompt. Every stage remains usable through forms and deterministic templates when the endpoint is unavailable; AI improves clarification and synthesis.

Start with two built-in question sets expressed as ordinary application data: test-automation setup and a change to an existing Java service. They specialize the same workflow. They do not prescribe a test framework, Java version, build system, or deployment environment without project evidence or user agreement. A generic task worksheet accommodates ideas and DevOps assignments without claiming specialized coverage.

Screenshots can be attached privately and described by the user. MVP inference is text-only; screenshots are not silently analyzed or sent to a model. A debugging packet can include explicitly selected local screenshot attachments for manual transfer to the coding agent.

## Primary flows

1. **Create or open.** Select an explicit local folder in the UI; inspect filenames and designated context files within that grant. Show empty/existing/no-Git/read-only state and local repository status. Preview creation or adoption of shared documents without overwriting collisions. Endpoint/model/key configuration is a separate UI settings flow; normal setup requires no manual configuration-file editing or workspace CLI argument.
2. **Understand.** Paste the assignment, story, or bug. Collect a short objective, expected outcome, constraints, relevant context, and unknowns. Ask at most three consequential questions at once. A user can mark an answer unknown; blockers determine what work can proceed.
3. **Scope.** Propose phases and small tasks with IDs, prerequisites, acceptance criteria, exclusions, and stop conditions. Review and save the plan. A task should have one demonstrable outcome, generally one agent session; split investigation from implementation when uncertainty matters.
4. **Prepare work.** Choose investigation or implementation, review selected outbound context if using AI, then edit/copy a prompt. Include relevant instruction-file paths explicitly. Copying a prompt records an export, not proof that work started.
5. **Capture outcome.** Paste findings and a diff summary; record completed actions, verification commands and results, omissions, environment, blockers, and evidence provenance. Local Git observations may support repository facts. They do not establish that tests passed.
6. **Review knowledge.** Review proposed updates to project facts, actual codebase structure, task state, and task handoff. Resolve changed-file conflicts. Apply selected consistent changes; a saved draft is not an accepted project decision.
7. **Resume or share.** Prepare handoff, then copy the next-session prompt. A teammate clones through their existing tools, opens the folder, uses their own credentials, checks branch/commit/working tree, and resumes the selected task. Missing private attachments are shown as unavailable.
8. **Debug.** From any active task, assemble expected/actual behavior, reproduction, evidence, environment, recent changes, attempted fixes, and a separate hypothesis. Propose one discriminating investigation; retain the blocked task and its history.

## Representative walkthroughs

**Empty-folder test assignment.** Clarify the approved target environment and authorization, highest-value journey, UI/API scope, team stack preference, authentication prerequisites, safe test data and cleanup, and eventual local/CI execution. Record unavailable credentials or an unknown URL explicitly. Plan: prerequisite investigation, scaffolding only, one smoke test, then expansion. An offline scaffold can proceed if its acceptance criteria do not require the blocked environment. Copy a bounded scaffolding prompt to the agent. On return, distinguish a reported install/test command from a local file observation, update `codebase.md` only for files now observed or clearly reported, and prepare one representative smoke test. Git initialization and sharing remain user actions.

**Existing Java story.** Open the user's clone, paste the story, identify behavior and acceptance criteria, and select relevant documents/files. Ask about compatibility, API error behavior, data migration, and test boundaries only when the story or repository leaves them unresolved. Ask the coding agent to investigate the actual build tool, conventions, and call sites first. Capture its report, reconcile with local observations, then scope one implementation task. Do not invent Maven, Spring, or an integration-test environment. A branch change invalidates pending repository-specific proposals.

## Explicitly deferred

Hosted accounts, billing, synchronization, marketing site, Jira APIs, PR/MR APIs, remote Git authentication, direct agent control, code edits, project command/test execution, autonomous loops, full security auditing, arbitrary-code sandboxes, live collaboration, plugin/skills marketplace, broad providers and stacks, embeddings/vector search, screenshot inference, packaged desktop shell, and local-model installation.

## Recommendations awaiting review

| ID | Recommendation | Reason and revisit trigger |
| --- | --- | --- |
| A-01 | TypeScript, React/Vite, one Node.js/Fastify local service; tested on installed Node 22.21.0. Node 24 remains a candidate deployment target. | One language and one process; revisit if Windows packaging requires disproportionate native bridging. |
| A-02 | Markdown is authoritative for shared state; private JSON records outside the workspace. | Normal Git review and editing without DB synchronization; revisit only if measured scale demands a private database. |
| A-03 | One text Chat Completions adapter with configurable HTTPS URL, model/deployment ID, and supported key header. | Narrow testable protocol; an exact company endpoint is not yet identified. |
| A-04 | Windows 11 x64, local NTFS folders, current Edge/Chrome as initial tested platform. | Bounds filesystem and installer testing. Other Windows variants remain unqualified until tested. |
| A-05 | Source checkout plus npm install/build/start instructions for the first release; no Docker or installer requirement. | Fits technical professionals and keeps distribution small. Locked-down corporate machines may require a later signed package. |
| A-06 | Session-only API keys are the default supported path; OS-backed persistence is an optional enhancement where policy permits. | Removes the native-vault dependency from the MVP. Re-entering a key after restart is the convenience trade-off; no plaintext persistence fallback. |

## Consequential open decisions

| ID | Unknown | Current assumption / effect | Resolve by |
| --- | --- | --- | --- |
| U-01 | Exact approved endpoint, Chat Completions dialect, key header, model, certificate/proxy requirements and retention policy. | Configurable OpenAI-compatible text adapter; compatibility and company approval remain unconfirmed. Never infer approval from a URL. | Provider spike, before inference integration |
| U-02 | Whether corporate machines allow Node/npm installation and the proposed session-only key-entry flow. | Qualify the approved installation/authentication path; do not assume OS credential access or bypass a storage restriction. | Windows/provider feasibility spikes |
| U-03 | Safe Windows file replacement implementation. | Qualify filesystem behavior before promising conflict safety. An optional OS credential binding can be evaluated separately later and does not block the core release. | Windows feasibility spike |
| U-04 | Which stacks and workflows to use for learner and experienced-practitioner evaluations. | Include the test assignment and Java story plus an experienced AI engineer's multi-session task; the core app needs no target framework installed. | Evaluation fixture preparation |
| U-05 | Open-source license and final public name. | VibeCoder is a working name; no license grant is invented. | Before publication |

The API-key and Windows choices are settled for the MVP. Entra/SSO and cross-platform support are future extensions, not unanswered launch requirements. Remaining engineering choices above do not prevent reviewing this design.

## Planning documents

- [Architecture and trust boundaries](docs/architecture.md)
- [Repository awareness, off-plan reconciliation, hosting and Git assistance](docs/repository-awareness-and-distribution.md)
- [UI direction, reference and setup experience](docs/ui-experience.md)
- [Data model, state lifecycle, Markdown, and handoff contract](docs/state-and-handoffs.md)
- [Evaluation scenarios and release gates](docs/evaluation.md)
- [Installation, resources, cost estimates, and sources](docs/operations-and-costs.md)
- [Phased work with acceptance criteria](plan.md)
- [Actual repository inventory](codebase.md)
- [Current handoff summary](progress.md)
