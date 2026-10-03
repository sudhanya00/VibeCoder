import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { AppError } from './errors.js';

const exec = promisify(execFile);
let pending = false;
export async function chooseFolder(): Promise<string | null> {
  if (process.platform !== 'win32') throw new AppError(400, 'Paste a folder path below. The native chooser is currently Windows-only.');
  if (pending) throw new AppError(409, 'A folder chooser is already open.');
  pending = true;
  try {
    const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const script = fileURLToPath(new URL('../../scripts/choose-folder.ps1', import.meta.url));
    const result = await exec(executable, ['-NoProfile', '-NonInteractive', '-STA', '-File', script], {
      timeout: 120000, maxBuffer: 8192, windowsHide: true,
    });
    return result.stdout.trim() || null;
  } catch {
    throw new AppError(400, 'The native chooser is unavailable or was blocked. Paste the folder path below instead.');
  } finally { pending = false; }
}
