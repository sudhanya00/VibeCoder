import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { CONTEXT_FILES, type GitSnapshot, type HandoffFreshness } from '../shared/contracts.js';
import { inspectGit } from './git.js';
import { readContext, validateFolder } from './workspace.js';

type FileObservation = { state: 'read'; hash: string } | { state: 'missing' | 'unavailable' };
export type HandoffObservation = {
  git: GitSnapshot;
  documents: Record<string, FileObservation>;
  observedAt: string;
};

// Only already-granted foundational context is read. No code scan or model call.
export async function observeHandoff(root: string): Promise<HandoffObservation> {
  if (await validateFolder(root) !== root) throw new Error('Workspace identity changed');
  const documents: Record<string, FileObservation> = {};
  for (const name of CONTEXT_FILES) {
    try {
      await lstat(path.join(root, name));
      documents[name] = { state: 'read', hash: (await readContext(root, name)).hash };
    } catch (error) {
      documents[name] = { state: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unavailable' };
    }
  }
  const git = await inspectGit(root);
  if (await validateFolder(root) !== root) throw new Error('Workspace identity changed');
  return { git, documents, observedAt: new Date().toISOString() };
}

export function compareHandoff(before: HandoffObservation, after: HandoffObservation): HandoffFreshness {
  const changes: string[] = [];
  const unknowns: string[] = [];
  for (const name of CONTEXT_FILES) {
    const previous = before.documents[name];
    const current = after.documents[name];
    if (!previous || !current || previous.state === 'unavailable' || current.state === 'unavailable') {
      unknowns.push(`${name}: could not establish comparable contents.`);
    } else if (previous.state !== current.state || (previous.state === 'read' && current.state === 'read' && previous.hash !== current.hash)) {
      changes.push(`${name}: content or presence changed.`);
    }
  }
  if (before.git.state === 'unavailable' || after.git.state === 'unavailable') unknowns.push('Git observation is unavailable.');
  else {
    if (before.git.state !== after.git.state) changes.push('Git repository availability changed.');
    if (before.git.branch !== after.git.branch) changes.push('Git branch changed.');
    if (before.git.commit !== after.git.commit) changes.push('Git HEAD changed.');
    const status = (snapshot: GitSnapshot) => JSON.stringify(snapshot.changes.map(item => [item.path, item.status]).sort((a, b) => a[0].localeCompare(b[0])));
    if (status(before.git) !== status(after.git)) changes.push('Git changed-path status changed.');
  }
  return {
    state: changes.length ? 'changed' : unknowns.length ? 'unknown' : 'no-observed-change',
    changes, unknowns, checkedAt: after.observedAt,
    coverage: 'Foundational document bytes and Git branch/HEAD/path status only. Source contents, diffs, ignored files, submodules and project tests were not checked. Matching observations do not prove the repository is unchanged or the task is on track.',
  };
}
