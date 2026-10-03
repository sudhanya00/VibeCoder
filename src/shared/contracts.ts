import { z } from 'zod';

export const CONTEXT_FILES = ['project.md', 'codebase.md', 'plan.md', 'progress.md', 'AGENTS.md'] as const;
export const profileSchema = z.object({
  endpoint: z.string().trim().min(1).max(2048),
  model: z.string().trim().min(1).max(200),
  keyStyle: z.enum(['bearer', 'api-key']),
}).strict();
export type Profile = z.infer<typeof profileSchema>;
export type ProviderState = { profile: Profile | null; hasKey: boolean; testedAt: string | null; testing: boolean };
export type ContextFile = { path: string; bytes: number; hash: string | null; available: boolean; note?: string };
export type GitSnapshot = {
  state: 'present' | 'none' | 'unavailable'; branch: string | null; commit: string | null;
  changes: { status: string; path: string }[]; observedAt: string; note?: string;
};
export type Workspace = { id: string; name: string; path: string; documents: ContextFile[]; git: GitSnapshot; access: 'read-only' };
export const draftSchema = z.object({
  id: z.string().regex(/^T-[a-f0-9]{12}$/),
  objective: z.string().trim().max(500),
  kind: z.enum(['investigation', 'implementation', 'debugging']),
  scope: z.string().max(4000),
  acceptance: z.string().max(4000),
  unknowns: z.string().max(4000),
  outcome: z.string().max(8000),
  verification: z.string().max(6000),
  notPerformed: z.string().max(4000),
  nextAction: z.string().max(2000),
}).strict();
export type TaskDraft = z.infer<typeof draftSchema>;
export type DraftStorage = { mode: 'disk' | 'session'; revision: number; savedAt: string | null; note?: string; location?: string };
export type DraftSave = { draft: TaskDraft; storage: DraftStorage };
export type AppState = { workspace: Workspace | null; provider: ProviderState; drafts: TaskDraft[]; storage: DraftStorage };
export type DocumentResult = { path: string; content: string; hash: string };
export type HandoffPreview = { markdown: string; prompt: string; snapshot: GitSnapshot; generatedAt: string; receiptId?: string };
export type HandoffFreshness = {
  state: 'changed' | 'unknown' | 'no-observed-change';
  changes: string[]; unknowns: string[]; checkedAt: string; coverage: string;
};
