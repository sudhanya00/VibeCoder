import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, symlink, link } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PrivateDraftStore } from '../src/server/private-drafts.js';
import { createApp } from '../src/server/app.js';
import type { TaskDraft } from '../src/shared/contracts.js';

const task: TaskDraft = { id: 'T-123456abcdef', kind: 'investigation', objective: 'Find the prerequisite', scope: 'Read only', acceptance: 'Explain the blocker', unknowns: '', outcome: '', verification: '', notPerformed: 'No tests run', nextAction: 'Inspect configuration' };
async function fixture(t: TestContext) {
  const base = await mkdtemp(path.join(os.tmpdir(), 'vibecoder-private-test-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const workspace = path.join(base, 'project'); await mkdir(workspace);
  return { base, workspace, root: path.join(base, 'private'), store: new PrivateDraftStore(path.join(base, 'private')) };
}
async function savedDirectory(root: string) { return path.join(root, (await readdir(root))[0]); }
const origin = 'http://127.0.0.1:43210';
async function appSession(t: TestContext, store: PrivateDraftStore) {
  const runtime = createApp({ draftStore: store }); runtime.setOrigin(origin); t.after(() => runtime.app.close());
  const headers = { host: '127.0.0.1:43210', origin, 'content-type': 'application/json', authorization: '' };
  const token = new URL(runtime.pairingUrl()).hash.slice(6);
  const paired = await runtime.app.inject({ method: 'POST', url: '/api/pair', headers, payload: { token } });
  headers.authorization = `Bearer ${paired.json().token}`;
  return { ...runtime, post: (url: string, payload: unknown) => runtime.app.inject({ method: 'POST', url, headers, payload }) };
}

test('private drafts survive a new store instance and keep only two complete revisions', async t => {
  const { store, root, workspace } = await fixture(t);
  assert.equal((await store.load(workspace)).revision, 0);
  for (let revision = 0; revision < 4; revision++) await store.save(workspace, [{ ...task, objective: `Revision ${revision + 1}` }], revision);
  const restored = await new PrivateDraftStore(root).load(workspace);
  assert.equal(restored.revision, 4);
  assert.equal(restored.drafts[0].objective, 'Revision 4');
  assert.equal((await readdir(await savedDirectory(root))).filter(file => file.startsWith('revision-')).length, 2);
  assert.deepEqual(await readdir(workspace), []);
});

test('interruption before publication restores the previous complete revision, not temporary data', async t => {
  const { store, root, workspace } = await fixture(t);
  await store.save(workspace, [task], 0);
  const interrupted = new PrivateDraftStore(root, async stage => { if (stage === 'flushed') throw new Error('simulated termination'); });
  await assert.rejects(interrupted.save(workspace, [{ ...task, objective: 'Unpublished' }], 1));
  const restored = await new PrivateDraftStore(root).load(workspace);
  assert.equal(restored.revision, 1);
  assert.equal(restored.drafts[0].objective, task.objective);
  assert.match(restored.note!, /interrupted save/);
  await store.save(workspace, [{ ...task, objective: 'Retry' }], 1);
  assert.equal((await store.load(workspace)).revision, 2);
});

test('interruption after publication recovers the complete revision and its known temporary alias', async t => {
  const { store, root, workspace } = await fixture(t);
  await store.save(workspace, [task], 0);
  const interrupted = new PrivateDraftStore(root, async stage => { if (stage === 'published') throw new Error('simulated termination'); });
  await assert.rejects(interrupted.save(workspace, [{ ...task, objective: 'Published' }], 1));
  const restored = await new PrivateDraftStore(root).load(workspace);
  assert.equal(restored.revision, 2);
  assert.equal(restored.drafts[0].objective, 'Published');
  assert.ok(!(await readdir(await savedDirectory(root))).some(file => file.startsWith('pending-')));
});

test('competing app instances cannot silently overwrite the same revision', async t => {
  const { store, root, workspace } = await fixture(t);
  await store.save(workspace, [task], 0);
  const other = new PrivateDraftStore(root); await other.load(workspace);
  const results = await Promise.allSettled([
    store.save(workspace, [{ ...task, objective: 'First writer' }], 1),
    other.save(workspace, [{ ...task, objective: 'Second writer' }], 1),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await store.load(workspace)).revision, 2);
  await assert.rejects(store.save(workspace, [task], 1), /another app instance/);
});

test('corrupt or unknown-version latest saves fail closed without rolling back or overwriting', async t => {
  const { store, root, workspace } = await fixture(t);
  await store.save(workspace, [task], 0); await store.save(workspace, [task], 1);
  const target = path.join(await savedDirectory(root), 'revision-0000000002.json');
  await writeFile(target, '{incomplete');
  await assert.rejects(store.load(workspace), /unreadable or unsupported/);
  await assert.rejects(store.save(workspace, [task], 2));
  assert.equal(await readFile(target, 'utf8'), '{incomplete');
  await writeFile(target, JSON.stringify({ version: 99 }));
  await assert.rejects(store.load(workspace), /unreadable or unsupported/);
});

test('private state rejects project overlap, linked paths and unrelated hard links', async t => {
  const { base, store, root, workspace } = await fixture(t);
  await assert.rejects(new PrivateDraftStore(path.join(workspace, 'private')).load(workspace), /must be separate/);
  const linked = path.join(base, 'linked'); await symlink(workspace, linked, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(new PrivateDraftStore(path.join(linked, 'private')).load(workspace));
  await store.save(workspace, [task], 0);
  await link(path.join(await savedDirectory(root), 'revision-0000000001.json'), path.join(workspace, 'outside.json'));
  await assert.rejects(store.load(workspace), /Unexpected hard link/);
});

test('restart restores API drafts but never endpoint keys, credentials or observation receipts', async t => {
  const { store, workspace, root } = await fixture(t);
  const first = await appSession(t, store);
  const opened = (await first.post('/api/workspace/open', { path: workspace })).json();
  assert.equal(opened.storage.mode, 'disk');
  const saved = await first.post('/api/draft', { workspaceId: opened.workspace.id, draft: task, revision: 0 });
  assert.equal(saved.statusCode, 200); assert.equal(saved.json().storage.revision, 1);
  assert.equal((await first.post('/api/draft', { workspaceId: opened.workspace.id, draft: task, revision: 0 })).statusCode, 409);
  await first.post('/api/provider', { endpoint: 'https://approved.example/v1', model: 'example', keyStyle: 'bearer', key: 'synthetic-private-test-secret' });
  const handoff = (await first.post('/api/handoff', { workspaceId: opened.workspace.id, draft: task })).json();
  await first.app.close();
  const second = await appSession(t, new PrivateDraftStore(root));
  const restored = (await second.post('/api/workspace/open', { path: workspace })).json();
  assert.equal(restored.drafts[0].objective, task.objective);
  assert.equal(restored.provider.hasKey, false); assert.equal(restored.provider.profile, null);
  assert.equal((await second.post('/api/handoff/check', { workspaceId: restored.workspace.id, receiptId: handoff.receiptId })).statusCode, 409);
  const directory = await savedDirectory(root);
  for (const name of await readdir(directory)) assert.ok(!(await readFile(path.join(directory, name), 'utf8')).includes('synthetic-private-test-secret'));
});

test('unavailable private storage visibly falls back to temporary drafts without overwriting data', async t => {
  const { base, workspace } = await fixture(t);
  const blocked = path.join(base, 'blocked'); await writeFile(blocked, 'preserve this');
  const runtime = await appSession(t, new PrivateDraftStore(path.join(blocked, 'store')));
  const opened = (await runtime.post('/api/workspace/open', { path: workspace })).json();
  assert.equal(opened.storage.mode, 'session'); assert.match(opened.storage.note, /temporary/);
  assert.equal((await runtime.post('/api/draft', { workspaceId: opened.workspace.id, draft: task, revision: 0 })).statusCode, 200);
  assert.equal(await readFile(blocked, 'utf8'), 'preserve this');
});

test('abrupt child-process exit before and after publication leaves a recoverable complete save', async t => {
  const { store, root, workspace } = await fixture(t);
  await store.save(workspace, [task], 0);
  const source = `import { PrivateDraftStore } from ${JSON.stringify(new URL('../src/server/private-drafts.ts', import.meta.url).href)};
    const [root, workspace, stage] = process.argv.slice(1);
    const store = new PrivateDraftStore(root, async at => { if (at === stage) process.exit(73); });
    await store.save(workspace, [${JSON.stringify({ ...task, objective: 'Child process save' })}], 1);`;
  for (const stage of ['flushed', 'published']) {
    await assert.rejects(promisify(execFile)(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', source, root, workspace, stage], { windowsHide: true, timeout: 30000 }), error => (error as { code?: number }).code === 73);
    const restored = await new PrivateDraftStore(root).load(workspace);
    assert.equal(restored.revision, stage === 'flushed' ? 1 : 2);
    assert.equal(restored.drafts[0].objective, stage === 'flushed' ? task.objective : 'Child process save');
  }
});

test('draft persistence stays isolated between folders and refuses a private root inside a Git tree', async t => {
  const { store, workspace, base } = await fixture(t);
  const other = path.join(base, 'other'); await mkdir(other);
  await store.save(workspace, [task], 0);
  assert.equal((await store.load(other)).drafts.length, 0);
  await store.save(other, [{ ...task, objective: 'Other project' }], 0);
  assert.equal((await store.load(workspace)).drafts[0].objective, task.objective);
  const repository = path.join(base, 'repository'); await mkdir(path.join(repository, '.git'), { recursive: true });
  await assert.rejects(new PrivateDraftStore(path.join(repository, 'private')).load(workspace), /inside a Git repository/);
});
