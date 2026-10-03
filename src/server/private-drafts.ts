import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readdir, link, unlink, chmod } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { z } from 'zod';
import { draftSchema, type TaskDraft } from '../shared/contracts.js';
import { AppError } from './errors.js';
import { hash, validateFolder } from './workspace.js';

const MAX_BYTES = 4 * 1024 * 1024;
const documentSchema = z.object({
  version: z.literal(1), workspace: z.string().regex(/^[a-f0-9]{64}$/),
  revision: z.number().int().positive(), savedAt: z.string().datetime(),
  drafts: z.array(draftSchema).max(50).refine(items => new Set(items.map(item => item.id)).size === items.length),
}).strict();
export type SavedDrafts = { drafts: TaskDraft[]; revision: number; savedAt: string | null; note?: string };
const isInside = (parent: string, child: string) => { const relative = path.relative(parent, child); return !relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)); };
const identity = (workspace: string) => hash(process.platform === 'win32' ? workspace.toLowerCase() : workspace);
const revisionName = (revision: number) => `revision-${String(revision).padStart(10, '0')}.json`;

export function privateStateDirectory() {
  // A fixed per-user location, never a repository-supplied setting.
  return path.join(os.homedir(), process.platform === 'win32' ? 'AppData/Local/VibeCoder/drafts-v1' : '.local/state/vibecoder/drafts-v1');
}

export class PrivateDraftStore {
  private initialization?: Promise<void>;
  constructor(readonly root: string, private readonly fault?: (stage: 'flushed' | 'published') => Promise<void>) {}

  private async initialize() {
    if (!this.initialization) this.initialization = (async () => {
      // Validate ancestors before creating anything, refusing linked parent paths.
      let ancestor = path.resolve(this.root);
      while (true) {
        try { await lstat(ancestor); break; } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || path.dirname(ancestor) === ancestor) throw error;
          ancestor = path.dirname(ancestor);
        }
      }
      await validateFolder(ancestor);
      for (let directory = ancestor; ; directory = path.dirname(directory)) {
        try { await lstat(path.join(directory, '.git')); throw new AppError(400, 'Private storage must not be inside a Git repository.'); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        if (path.dirname(directory) === directory) break;
      }
      await mkdir(this.root, { recursive: true, mode: 0o700 });
      await validateFolder(this.root);
      if (process.platform === 'win32') {
        await promisify(execFile)(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'),
          ['-NoProfile', '-NonInteractive', '-File', fileURLToPath(new URL('../../scripts/protect-private-state.ps1', import.meta.url)), '-StatePath', this.root],
          { windowsHide: true, timeout: 15000, maxBuffer: 8192,
            env: { ...process.env, PSModulePath: path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/Modules') } });
      } else await chmod(this.root, 0o700);
    })();
    await this.initialization;
  }

  private async directory(workspace: string) {
    const root = path.resolve(this.root);
    if (isInside(workspace, root) || isInside(root, workspace)) throw new AppError(400, 'Private storage and project folders must be separate.');
    await this.initialize();
    await validateFolder(root);
    const directory = path.join(root, identity(workspace));
    await mkdir(directory, { mode: 0o700 }).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; });
    if (await validateFolder(directory) !== directory) throw new AppError(409, 'Private storage identity changed.');
    return directory;
  }

  private async inventory(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });
    if (entries.length > 64) throw new AppError(507, 'Private draft storage needs maintenance. Export drafts and inspect its directory before more saves.');
    const revisions: number[] = [];
    const pending: string[] = [];
    let bytes = 0;
    for (const entry of entries) {
      const match = /^revision-(\d{10})\.json$/.exec(entry.name);
      if (!match && !/^pending-[a-f0-9-]{36}\.json$/.test(entry.name)) throw new AppError(409, 'Unexpected private storage files. Existing data was preserved.');
      const stat = await lstat(path.join(directory, entry.name));
      if (!stat.isFile() || stat.isSymbolicLink()) throw new AppError(409, 'Linked or non-regular private storage files are not supported.');
      bytes += stat.size;
      if (match) revisions.push(Number(match[1])); else pending.push(entry.name);
    }
    return { revisions: revisions.sort((a, b) => b - a), pending, bytes };
  }

  async load(workspace: string): Promise<SavedDrafts> {
    const directory = await this.directory(workspace);
    const files = await this.inventory(directory);
    const revision = files.revisions[0];
    const note = files.pending.length ? 'An interrupted save left temporary data. The last published revision is retained; temporary files are not restored as drafts.' : undefined;
    if (!revision) return { drafts: [], revision: 0, savedAt: null, note };
    const target = path.join(directory, revisionName(revision));
    const stat = await lstat(target);
    // A crash between hard-link publication and unlink can leave our own temporary alias.
    if (stat.nlink === 2) {
      let recovered = false;
      for (const name of files.pending) {
        const candidate = path.join(directory, name);
        const pending = await lstat(candidate).catch(error => { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; });
        if (pending && pending.ino === stat.ino && pending.dev === stat.dev) { await unlink(candidate).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }); recovered = true; break; }
      }
      if (!recovered && (await lstat(target)).nlink !== 1) throw new AppError(409, 'Unexpected hard link in private storage. Data was preserved.');
    } else if (stat.nlink !== 1) throw new AppError(409, 'Unexpected private file link count.');
    const handle = await open(target, 'r');
    try {
      const actual = await handle.stat();
      if (actual.ino !== stat.ino || actual.dev !== stat.dev || actual.nlink !== 1 || actual.size > MAX_BYTES) throw new Error('Invalid private file');
      const buffer = Buffer.alloc(MAX_BYTES + 1);
      let length = 0;
      while (length < buffer.length) { const read = await handle.read(buffer, length, buffer.length - length, null); if (!read.bytesRead) break; length += read.bytesRead; }
      if (length > MAX_BYTES) throw new Error('Oversized private file');
      const value = documentSchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length))));
      if (value.revision !== revision || value.workspace !== identity(workspace)) throw new Error('Private identity mismatch');
      return { drafts: value.drafts, revision, savedAt: value.savedAt, note };
    } catch { throw new AppError(409, 'The latest saved drafts are unreadable or unsupported. Existing files were preserved; no older revision was silently restored.'); }
    finally { await handle.close(); }
  }

  async save(workspace: string, drafts: TaskDraft[], expectedRevision: number): Promise<SavedDrafts> {
    const directory = await this.directory(workspace);
    const previous = await this.load(workspace);
    if (previous.revision !== expectedRevision) throw new AppError(409, 'Drafts changed in another app instance. Copy your unsaved text, then reopen this folder to reconcile.');
    const revision = expectedRevision + 1;
    if (revision > 9999999999) throw new AppError(507, 'Private revision limit reached.');
    const value = documentSchema.parse({ version: 1, workspace: identity(workspace), revision, savedAt: new Date().toISOString(), drafts });
    const bytes = JSON.stringify(value);
    if (Buffer.byteLength(bytes) > MAX_BYTES || (await this.inventory(directory)).bytes > 20 * 1024 * 1024) throw new AppError(507, 'Private draft storage limit reached. Existing saves were preserved.');
    const pending = path.join(directory, `pending-${randomUUID()}.json`);
    const handle = await open(pending, 'wx', 0o600);
    try { await handle.writeFile(bytes, 'utf8'); await handle.sync(); } finally { await handle.close(); }
    await this.fault?.('flushed');
    // Hard-link creation is exclusive: another writer publishing this revision wins.
    // The published name always references a fully written, flushed file. No rename-overwrite.
    try { await link(pending, path.join(directory, revisionName(revision))); }
    catch (error) {
      await unlink(pending).catch(() => {});
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new AppError(409, 'Another app instance saved first. Copy your unsaved text, then reopen the folder.');
      throw new AppError(503, 'Private storage could not publish this save. The previous revision was preserved.');
    }
    await this.fault?.('published');
    await unlink(pending).catch(() => {});
    // Retain current and previous complete revisions. Failed cleanup never negates a save.
    const cleanup = await this.inventory(directory).catch(() => null);
    for (const old of cleanup?.revisions ?? []) {
      if (old < revision - 1) await unlink(path.join(directory, revisionName(old))).catch(() => {});
    }
    return { drafts: value.drafts, revision, savedAt: value.savedAt, ...(!cleanup ? { note: 'Draft saved, but old-revision cleanup could not be checked.' } : {}) };
  }
}
