import { execFile } from 'node:child_process';
import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { GitSnapshot } from '../shared/contracts.js';

const exec = promisify(execFile);
const executable = process.platform === 'win32'
  ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'cmd', 'git.exe')
  : '/usr/bin/git';
// Git for Windows understands /dev/null; GIT_CONFIG_GLOBAL=NUL is rejected.
const nullFile = '/dev/null';

export function parseStatus(output: string): GitSnapshot['changes'] {
  const records = output.split('\0');
  const changes: GitSnapshot['changes'] = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!record || record.length < 4) continue;
    const status = record.slice(0, 2);
    changes.push({ status, path: record.slice(3).replace(/[\x00-\x1f\x7f]/g, '�') });
    if (/[RC]/.test(status)) i++; // Porcelain -z includes the old path next.
  }
  return changes;
}

export async function inspectGit(root: string): Promise<GitSnapshot> {
  const snapshot: GitSnapshot = { state: 'none', branch: null, commit: null, changes: [], observedAt: new Date().toISOString() };
  try {
    const stat = await lstat(path.join(root, '.git'));
    if (!stat.isDirectory() || stat.isSymbolicLink()) return { ...snapshot, state: 'unavailable', note: 'Linked worktrees and redirected Git metadata need a separate grant; inspection is deferred in this preview.' };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return snapshot;
    return { ...snapshot, state: 'unavailable', note: 'Git metadata cannot be read.' };
  }
  const run = async (args: string[]) => (await exec(executable, [
    '--no-pager', '--no-optional-locks', '-c', 'core.fsmonitor=false',
    '-c', `core.hooksPath=${nullFile}`, '-c', 'core.untrackedCache=false',
    '-c', 'core.quotePath=false', ...args,
  ], {
    cwd: root, timeout: 5000, maxBuffer: 256 * 1024, windowsHide: true,
    env: {
      SystemRoot: process.env.SystemRoot, PATH: path.dirname(executable),
      GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: nullFile,
      GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat',
      GIT_CEILING_DIRECTORIES: path.dirname(root), LC_ALL: 'C',
    },
  })).stdout.trimEnd();
  try {
    const reportedRoot = await realpath(await run(['rev-parse', '--show-toplevel']));
    if (reportedRoot !== root) return { ...snapshot, state: 'unavailable', note: 'The repository root differs from the selected folder.' };
    let branch: string | null = null;
    let commit: string | null = null;
    try { branch = await run(['symbolic-ref', '--quiet', '--short', 'HEAD']); } catch { /* Detached HEAD. */ }
    try { commit = await run(['rev-parse', '--verify', 'HEAD']); } catch { /* No commit yet. */ }
    const changes = parseStatus(await run(['status', '--porcelain=v1', '-z', '--untracked-files=normal', '--ignore-submodules=all']));
    return { ...snapshot, state: 'present', branch, commit, changes };
  } catch {
    return { ...snapshot, state: 'unavailable', note: 'Safe Git inspection failed or exceeded its limit. The folder remains available without Git.' };
  }
}
