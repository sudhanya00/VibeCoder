# Installation, resources and inference estimates

Planning estimates as of 2026-09-22, implementation note updated 2026-09-23. Resource/cost figures remain targets, not measured runtime benchmarks or a provider quote. The first slice has installed, locked dependencies and a passing build. No billable inference request has been made.

## Proposed first distribution

Publish source, a lockfile, setup/troubleshooting instructions and a short synthetic walkthrough on GitHub after the user chooses a license and authorizes publication. The running application has no GitHub dependency. Users clone target projects with their own tools and authentication, whether the remote is GitHub, GitLab or self-hosted.

Target environment: Windows 11 x64, local NTFS workspace, current Edge/Chrome. Actual first-slice testing used the development Windows machine, Node 22.21.0, npm 10.9.4 and the Codex Chromium browser. Edge/Chrome distributions, a clean machine and Node 24 are not yet separately qualified. Git is optional for code-free work. The earlier Node 24 recommendation remains a deployment candidate; exact tested dependency versions are in [codebase](../codebase.md).

Implemented source-install commands (clean-machine qualification remains):

```text
Clone or extract a reviewed release of the application.
npm ci
npm run build
npm start
```

Run installation in the application's directory, separate from the user's target project. The release should provide a launcher command or shortcut after the source path is proven; no self-update daemon. Start opens the paired loopback browser UI, and stopping the process closes the local service. If automatic browser launch fails, display the local pairing instruction without logging persistent secrets. Upgrade through a reviewed release and rerun locked installation/build; schema changes require a reviewed migration.

After launch, select the workspace, configure endpoint/model/session key, and inspect local Git from the UI. An optional workspace CLI flag may remain for experienced users, but is not required. A native folder chooser must be qualified against corporate restrictions; a path-entry field in the UI provides the baseline alternative. No Git-host login or remote token is needed for local repository inspection.

No Docker, JDK, Python, database server, GPU, cloud account for this product, target testing framework, or Windows Credential Manager access is required to run the core app. A user's external coding-agent workflow has its own tools and costs. Installing dependencies needs registry access or an approved company mirror, may run audited package installation scripts, and may be restricted by corporate policy. Session-only API-key entry is the default supported path and needs no native credential binding. OS-backed persistence may be added as an opt-in convenience where policy permits; its absence is not a packaging or release blocker. If later included, qualify prebuilt Windows artifacts so ordinary users need no C++ compiler.

Session keys are re-entered after restart, explicit lock/clear, or project switching. Current preview: non-secret profiles and drafts survive navigation/refresh in the running process but are lost on restart. Durable non-secret settings are planned. The app does not persist the key, but cannot guarantee secure erasure from OS paging or crash dumps. If company policy prohibits manual key entry, an approved alternate source is needed; a blocked vault is not justification to bypass policy.

Inference additionally needs an approved reachable HTTPS endpoint, model/deployment ID, key, and company-required network/CA setup. Do not assume a personal API account. Current offline preview supports draft forms and prompt rendering. Shared editing, full packets and AI generation are planned. The only outbound capability now is a reviewed synthetic connection probe; proxy/dialect compatibility is unqualified.

Estimate 15–30 minutes for first setup on an already approved developer machine, excluding network downloads, access requests and corporate approval. This estimate must be timed during the pilot. Endpoint/proxy diagnostics should use synthetic content and reveal actionable categories without raw secrets or prompts.

## Resource budget

| Item | Initial estimate/target | Assumption and validation |
| --- | --- | --- |
| Machine | 4 logical CPU cores, 8 GB RAM minimum trial; 16 GB preferred when an IDE/agent is also open. | Remote inference; no model weights locally. Validate on representative practitioner and training machines. |
| Service memory | 150–400 MB steady-state target. | One workspace and bounded text; no recursive indexing or embedding process. |
| Browser memory | 250–700 MB incremental target. | Forms, diffs and a few screenshot previews. Browser baseline varies. |
| Combined runtime | Aim below 1.2 GB incremental RAM in normal use. | Planning estimate, measure working set and peak during E-01/E-03. |
| Install/build disk | Reserve 2 GB for source, dependencies and built assets; 5 GB for development with browser-test binaries. | Credential packaging and dependency selection can change this. |
| Private project state | Tens of MB of text for a long-running project; attachments dominate. Start with 250 MB soft warning per workspace. | No full-repository copies; bounded sessions and 30-day raw retention. Recovery records are included and never silently expired while unresolved. |
| Read limits | 1 MB per selected text file, 5 MB for the selected text set, 10 MB per PNG/JPEG, 20 attachments per packet. | Proposed safe defaults; show rejection/truncation and allow smaller excerpts. Image dimensions also capped. |
| Context limit | Default 16,000 estimated input tokens per call, output maximum 2,000; model capability may lower these. | Character-based estimates are approximate; include system instructions and response schema. |
| Local responsiveness | Warm navigation/draft save under 300 ms; bounded initial context scan under 2 seconds in the test fixture. | Targets on local SSD, not full-repository performance promises. |

A 28,000-input/7,000-output-token workflow transfers roughly hundreds of kilobytes of text plus protocol overhead. That is a rough size estimate, not a tokenization rule. Raw screenshots are local/manual attachments in MVP and excluded from inference estimates. No persistent CPU-heavy background work is needed. Enforce output, file and attachment limits before allocation/parse; warn before private storage fills and preserve existing documents on disk-full errors.

## Per-workflow inference estimate

Unit: clarify one task, decompose it, prepare the external-agent prompt, reconcile one returned outcome and prepare the next task. The external coding agent's own model calls and execution time are excluded. The table counts all input tokens repeatedly sent across calls, including selected context and instructions; it does not assume caching.

| Stage | Calls | Aggregate input tokens | Aggregate output tokens |
| --- | --- | --- | --- |
| Targeted clarification | 2 | 6,000 | 1,200 |
| Task decomposition | 1 | 6,000 | 1,800 |
| Agent handoff draft | 1 | 4,000 | 1,200 |
| Outcome/knowledge reconciliation | 1 | 8,000 | 1,800 |
| Next task proposal | 1 | 4,000 | 1,000 |
| Normal workflow total | 6 | 28,000 | 7,000 |
| Optional debugging addition | 2 | 10,000 | 2,000 |

Copy next-session prompt, accept/save a diff, and prepare a handoff from already accepted fields cost zero inference tokens. The above handoff-draft call is optional prose assistance, not a requirement to export.

Formula in USD: `(input_tokens × input_price_per_million + billed_output_tokens × output_price_per_million) / 1,000,000`. Use billed output, including any provider-billed reasoning tokens where applicable; visible prose alone can undercount. Add provider gateway fees and taxes separately.

For one **pricing illustration**, the official [GPT-4.1 mini model page](https://developers.openai.com/api/docs/models/gpt-4.1-mini) lists standard text input at $0.40 and output at $1.60 per million tokens, checked 2026-09-22. This is a transparent unit-cost example, not a recommendation that the company use this model or that its gateway charges the same rates.

| Case | Calculation at those illustrative rates | Estimated USD |
| --- | --- | --- |
| Normal workflow | 28,000 × 0.40 / 1M + 7,000 × 1.60 / 1M | $0.0224 |
| Additional debugging | 10,000 × 0.40 / 1M + 2,000 × 1.60 / 1M | $0.0072 |
| Normal plus debugging | 38,000 input + 9,000 output | $0.0296 |
| Twice normal usage through user retries/longer context | 56,000 input + 14,000 output | $0.0448 |
| 100 normal task workflows | 2.8M input + 0.7M output | $2.24 |

Sensitivity: at hypothetical rates of $2/$8 per million input/output, the same normal workflow costs $0.112; at hypothetical $5/$20 it costs $0.28. These are sensitivity assumptions, not advertised rates for another model. Real cost depends on approved deployment, prompt size, number of questions, retries, reasoning, regional/contract pricing and gateway charges. No exchange-rate conversion is assumed.

Budget design: preview estimated token counts and cost when profile rates are configured; show “price unknown” otherwise. Record actual usage when the response supplies it, and label estimates separately. A context meter includes all instructions and selected conversation turns, not just attached files. Default to a user-editable per-workflow token ceiling and optional currency ceiling; use conservative reservation for estimates. Do not claim a strict dollar cap where tokenization, billing or usage data is unavailable. Missing usage is unknown, not zero. Manual retry may create another charge after a timeout. No silent retries or background summarization.

Latency assumption for planning: roughly 5–40 seconds per bounded call, yielding about 30 seconds–4 minutes of inference wait across six sequential calls, excluding user thinking and external-agent work. This is not a provider SLA. Record p50/p95 in the approved-endpoint pilot; use cancellable progress and keep drafts durable.

## Provider/authentication scope and verified facts

The user confirmed API-key-first. The MVP still requires a configurable URL and opaque model/deployment ID; do not equate an Azure deployment label with a public model name. Microsoft documents the deployment-name behavior in its [Azure OpenAI starter guide](https://learn.microsoft.com/en-us/azure/developer/ai/get-started-azure-openai-starter-kit).

Keyless authentication remains deferred. Microsoft's [Azure OpenAI v1 lifecycle documentation](https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle) describes key and token-based client support; that makes a future credential-provider interface sensible, but does not establish this company's tenant permissions or gateway compatibility. Do not add Azure dependencies to the API-key MVP without a concrete endpoint need.

Provider data retention, model access and corporate approval are unresolved for the actual endpoint. The product sends selected context to that endpoint and must not claim end-to-end local-only processing or no provider retention. All cited facts should be rechecked before release; the actual company contract is the cost/privacy authority.

## Delivery effort

The [implementation plan](../plan.md) budgets 32–45 focused engineering days before contingency. Allow about 20% for integration failures and UX revision: approximately 38–54 days, or 8–11 full-time working weeks for one developer assisted by coding agents. This excludes waiting for company approvals and assumes familiarity with TypeScript and browser development. A part-time schedule scales accordingly. The range is a planning estimate, not a delivery commitment.

The first releasable journey should arrive before visual polish and broad templates. Protect time for write recovery, boundary tests and realistic handoffs. Re-estimate after the first Windows/provider spike and after the deterministic end-to-end flow; these are the largest uncertainty reductions.
