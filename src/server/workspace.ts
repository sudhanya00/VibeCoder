import { createHash, randomUUID } from 'node:crypto';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { CONTEXT_FILES, type ContextFile, type DocumentResult, type Workspace } from '../shared/contracts.js';
import { AppError } from './errors.js';
import { inspectGit } from './git.js';

const MAX_DOCUMENT_BYTES = 1024 * 1024;
export const hash = (content: string | Buffer) => createHash('sha256').update(content).digest('hex');

export function validateRootInput(input: string): string {
  const candidate = input.trim();
  if (!candidate || !path.isAbsolute(candidate) || /[\x00-\x1f]/.test(candidate)) {
    throw new AppError(400, 'Enter an absolute local folder path.');
  }
  if (process.platform === 'win32') {
    if (!/^[A-Za-z]:[\\/]/.test(candidate) || candidate.slice(2).includes(':') || /[. ](?:[\\/]|$)/.test(candidate)) {
      throw new AppError(400, 'Use a local drive path. Network, device and alternate-stream paths are not supported.');
    }
    if (candidate.slice(3).split(/[\\/]/).some(segment => /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment))) {
      throw new AppError(400, 'Reserved device paths are not supported.');
    }
  }
  if (candidate.split(/[\\/]/).includes('..')) throw new AppError(400, 'Parent traversal is not supported.');
  return path.resolve(candidate);
}

export async function validateFolder(input: string): Promise<string> {
  const candidate = validateRootInput(input);
  let segment = path.parse(candidate).root;
  try {
    for (const part of candidate.slice(segment.length).split(path.sep).filter(Boolean)) {
      segment = path.join(segment, part);
      const stat = await lstat(segment);
      if (stat.isSymbolicLink()) throw new AppError(400, 'Linked folders and junctions are not supported in this preview.');
    }
    const stat = await lstat(candidate);
    if (!stat.isDirectory()) throw new AppError(400, 'Select a folder, not a file.');
    return await realpath(candidate);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, 'This folder cannot be opened. Check its path and your read permissions.');
  }
}

export async function readContext(root: string, relative: string): Promise<DocumentResult> {
  if (!(CONTEXT_FILES as readonly string[]).includes(relative)) throw new AppError(400, 'Only the listed project-context files can be opened.');
  if (await validateFolder(root) !== root) throw new AppError(409, 'The selected folder changed. Open it again.');
  const target = path.join(root, relative);
  try {
    const before = await lstat(target);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) throw new AppError(400, 'Linked or non-regular context files are not supported.');
    if (before.size > MAX_DOCUMENT_BYTES) throw new AppError(413, 'This context file exceeds the 1 MB preview limit.');
    if (await realpath(target) !== target) throw new AppError(400, 'The context path resolves outside its expected location.');
    const handle = await open(target, 'r');
    try {
      const actual = await handle.stat();
      if (actual.ino !== before.ino || actual.dev !== before.dev || actual.nlink !== 1) throw new AppError(409, 'The file changed while opening. Refresh and try again.');
      const buffer = Buffer.alloc(MAX_DOCUMENT_BYTES + 1);
      let total = 0;
      while (total < buffer.length) {
        const result = await handle.read(buffer, total, buffer.length - total, null);
        if (result.bytesRead === 0) break;
        total += result.bytesRead;
      }
      if (total > MAX_DOCUMENT_BYTES) throw new AppError(413, 'This context file exceeds the 1 MB preview limit.');
      const bytes = buffer.subarray(0, total);
      if (bytes.includes(0)) throw new AppError(400, 'This file is not supported UTF-8 text.');
      const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return { path: relative, content, hash: hash(bytes) };
    } finally { await handle.close(); }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(404, 'This context file is missing, unreadable, or not valid UTF-8.');
  }
}

export async function openWorkspace(input: string): Promise<Workspace> {
  const root = await validateFolder(input);
  const documents: ContextFile[] = [];
  for (const name of CONTEXT_FILES) {
    try {
      const stat = await lstat(path.join(root, name));
      const available = stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size <= MAX_DOCUMENT_BYTES;
      documents.push({ path: name, bytes: stat.size, hash: null, available, ...(!available ? { note: 'Linked, non-regular or oversized file' } : {}) });
    } catch { documents.push({ path: name, bytes: 0, hash: null, available: false, note: 'Not found or not readable' }); }
  }
  return { id: randomUUID(), name: path.basename(root) || root, path: root, documents, git: await inspectGit(root), access: 'read-only' };
}
