import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, symlink, link, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createApp } from '../src/server/app.js';
import { hash, openWorkspace, readContext, validateFolder, validateRootInput } from '../src/server/workspace.js';
import { endpointUrl, isAllowedAddress } from '../src/server/provider.js';
import { inspectGit, parseStatus } from '../src/server/git.js';
import { prepareHandoff } from '../src/server/handoff.js';
import { compareHandoff, observeHandoff } from '../src/server/freshness.js';
import type { TaskDraft } from '../src/shared/contracts.js';

const origin = 'http://127.0.0.1:43210';
const baseHeaders = { host: '127.0.0.1:43210', origin, 'content-type': 'application/json' };
const draft: TaskDraft = {
  id: 'T-123456abcdef', kind: 'investigation', objective: 'Investigate the failing test',
  scope: 'Read the authentication setup; do not implement', acceptance: 'Identify the unresolved prerequisite',
  unknowns: 'Staging credentials unavailable', outcome: 'Agent reports a config change',
  verification: 'Agent says all tests passed', notPerformed: '', nextAction: 'Inspect the reported test command and request the missing log',
};

async function fixture(t: TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vibecoder-test-'));
  t.after(async () => { await rm(root, { recursive: true, force: true }); });
  return root;
}
async function paired(t: { after: (fn: () => Promise<unknown>) => void }, options: Parameters<typeof createApp>[0] = {}) {
  const runtime = createApp(options);
  runtime.setOrigin(origin);
  t.after(() => runtime.app.close());
  const bootstrap = new URL(runtime.pairingUrl()).hash.slice(6);
  const response = await runtime.app.inject({ method: 'POST', url: '/api/pair', headers: baseHeaders, payload: { token: bootstrap } });
  assert.equal(response.statusCode, 200);
  const headers = { ...baseHeaders, authorization: `Bearer ${response.json().token}` };
  const post = (url: string, payload: unknown) => runtime.app.inject({ method: 'POST', url, headers, payload });
  return { ...runtime, headers, post, bootstrap };
}

test('content APIs reject unpaired, foreign-origin and foreign-host requests', async t => {
  const runtime = await paired(t);
  assert.equal((await runtime.app.inject({ url: '/api/state', headers: baseHeaders })).statusCode, 401);
  assert.equal((await runtime.app.inject({ url: '/api/state', headers: { ...runtime.headers, origin: 'https://attacker.example' } })).statusCode, 403);
  assert.equal((await runtime.app.inject({ url: '/api/state', headers: { ...runtime.headers, host: 'attacker.example' } })).statusCode, 403);
  assert.equal((await runtime.app.inject({ method: 'OPTIONS', url: '/api/state', headers: runtime.headers })).statusCode, 403);
  assert.equal((await runtime.app.inject({ url: '/api/state', headers: runtime.headers })).statusCode, 200);
});

test('pairing is single use and rejects expired bootstrap links', async t => {
  let now = 0;
  const runtime = await paired(t, { now: () => now });
  assert.equal((await runtime.post('/api/pair', { token: runtime.bootstrap })).statusCode, 401);
  const replacement = new URL(runtime.pairingUrl()).hash.slice(6);
  now = 120001;
  assert.equal((await runtime.post('/api/pair', { token: replacement })).statusCode, 401);
});

test('only exact application assets are public; encoded and prefixed API paths require authentication', async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'assets'));
  await writeFile(path.join(root, 'index.html'), '<html>Application shell</html>');
  await writeFile(path.join(root, 'favicon.svg'), '<svg/>');
  await writeFile(path.join(root, 'assets', 'index-123.js'), '/* bundled UI */');
  await writeFile(path.join(root, 'assets', 'secret.txt'), 'not a public asset');
  const runtime = await paired(t, { uiRoot: root });
  for (const url of ['/', '/favicon.svg', '/assets/index-123.js']) {
    const response = await runtime.app.inject({ url, headers: baseHeaders });
    assert.equal(response.statusCode, 200, url);
    assert.match(response.headers['content-security-policy'] as string, /frame-ancestors 'none'/);
  }
  for (const url of ['/assets/secret.txt', '/api/state', '/%61pi/state', '/assets/../api/state', '/api/state.js', '/?api=state']) {
    assert.equal((await runtime.app.inject({ url, headers: baseHeaders })).statusCode, 401, url);
  }
});

test('mutations require exact Origin and JSON content type', async t => {
  const runtime = await paired(t);
  const headers: Record<string, string> = { ...runtime.headers };
  delete headers.origin;
  assert.equal((await runtime.app.inject({ method: 'POST', url: '/api/provider/clear', headers, payload: {} })).statusCode, 403);
  assert.equal((await runtime.app.inject({ method: 'POST', url: '/api/provider/clear', headers: { ...runtime.headers, 'content-type': 'text/plain' }, payload: '{}' })).statusCode, 403);
});

test('key is never serialized; folder switch clears it but retains non-secret profile', async t => {
  const root = await fixture(t);
  const runtime = await paired(t);
  const key = 'synthetic-secret-not-for-a-provider';
  const profile = { endpoint: 'https://approved.example/v1', model: 'deployment', keyStyle: 'bearer', key };
  const saved = await runtime.post('/api/provider', profile);
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().hasKey, true);
  const before = await runtime.app.inject({ url: '/api/state', headers: runtime.headers });
  assert.ok(!before.body.includes(key));
  const opened = await runtime.post('/api/workspace/open', { path: root });
  assert.equal(opened.json().provider.hasKey, false);
  assert.equal(opened.json().provider.profile.model, 'deployment');
  assert.equal(opened.json().workspace.access, 'read-only');
});

test('synthetic test requires explicit confirmation; reported success uses injected provider only', async t => {
  let calls = 0;
  const runtime = await paired(t, { probe: async (profile, key) => { calls++; assert.equal(profile.model, 'deployment'); assert.equal(key, 'fake-key'); } });
  await runtime.post('/api/provider', { endpoint: 'https://approved.example/v1', model: 'deployment', keyStyle: 'api-key', key: 'fake-key' });
  assert.equal((await runtime.post('/api/provider/test', {})).statusCode, 400);
  assert.equal(calls, 0);
  const result = await runtime.post('/api/provider/test', { confirmed: true });
  assert.equal(result.statusCode, 200);
  assert.ok(result.json().testedAt);
  assert.equal(calls, 1);
  const cleared = await runtime.post('/api/provider/clear', {});
  assert.equal(cleared.json().hasKey, false);
  assert.equal(cleared.json().testedAt, null);
});

test('clearing a key cancels an outstanding connection test and cannot resurrect success', async t => {
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const runtime = await paired(t, { probe: async (_profile, _key, signal) => new Promise<void>(resolve => {
    entered(); signal.addEventListener('abort', () => resolve(), { once: true });
  }) });
  await runtime.post('/api/provider', { endpoint: 'https://approved.example/v1', model: 'deployment', keyStyle: 'bearer', key: 'fake-key' });
  const pending = runtime.post('/api/provider/test', { confirmed: true });
  await started;
  assert.equal((await runtime.post('/api/provider/test', { confirmed: true })).statusCode, 409);
  await runtime.post('/api/provider/clear', {});
  assert.equal((await pending).statusCode, 409);
  const state = (await runtime.app.inject({ url: '/api/state', headers: runtime.headers })).json();
  assert.equal(state.provider.hasKey, false);
  assert.equal(state.provider.testedAt, null);
});

test('profile errors never echo a supplied key', async t => {
  const runtime = await paired(t);
  const response = await runtime.post('/api/provider', { endpoint: 'http://127.0.0.1', model: 'x', keyStyle: 'bearer', key: 'DO-NOT-ECHO-ME' });
  assert.equal(response.statusCode, 400);
  assert.ok(!response.body.includes('DO-NOT-ECHO-ME'));
});

test('lock and session expiry reject further data access and clear keys', async t => {
  let now = 0;
  const runtime = await paired(t, { now: () => now });
  await runtime.post('/api/provider', { endpoint: 'https://approved.example/v1', model: 'x', keyStyle: 'bearer', key: 'fake-key' });
  now = 8 * 60 * 60 * 1000 + 1;
  assert.equal((await runtime.app.inject({ url: '/api/state', headers: runtime.headers })).statusCode, 401);
  const other = await paired(t);
  await other.post('/api/lock', {});
  assert.equal((await other.app.inject({ url: '/api/state', headers: other.headers })).statusCode, 401);
});

test('folder inspection and context reads preserve original bytes', async t => {
  const root = await fixture(t);
  const original = '# Project\r\n\r\n<script>untrusted()</script>\r\n';
  await writeFile(path.join(root, 'project.md'), original);
  const workspace = await openWorkspace(root);
  assert.equal(workspace.git.state, 'none');
  assert.equal(workspace.documents.find(file => file.path === 'project.md')?.available, true);
  const doc = await readContext(workspace.path, 'project.md');
  assert.equal(doc.content, original);
  assert.equal(doc.hash, hash(original));
  assert.equal(await readFile(path.join(root, 'project.md'), 'utf8'), original);
  await assert.rejects(readContext(workspace.path, '../secret.txt'));
  await assert.rejects(readContext(workspace.path, '.env'));
});

test('root selection rejects traversal and relative paths', () => {
  assert.throws(() => validateRootInput('relative-folder'));
  assert.throws(() => validateRootInput(path.join(os.tmpdir(), 'ok') + path.sep + '..' + path.sep + 'secret'));
  if (process.platform === 'win32') for (const candidate of ['C:relative', '\\\\server\\share', '\\\\?\\C:\\work', 'C:\\work:secret', 'C:\\work\\NUL']) assert.throws(() => validateRootInput(candidate));
});

test('linked directories and hard-linked context files are not granted', async t => {
  const root = await fixture(t);
  const real = path.join(root, 'real'); await mkdir(real);
  const junction = path.join(root, 'linked'); await symlink(real, junction, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(validateFolder(junction));
  await writeFile(path.join(real, 'original.md'), 'sensitive');
  await link(path.join(real, 'original.md'), path.join(real, 'project.md'));
  await assert.rejects(readContext(await validateFolder(real), 'project.md'));
});

test('oversized and binary context files fail closed', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'project.md'), Buffer.alloc(1024 * 1024 + 1, 65));
  await assert.rejects(readContext(await validateFolder(root), 'project.md'));
  await writeFile(path.join(root, 'project.md'), Buffer.from([0, 1, 2]));
  await assert.rejects(readContext(await validateFolder(root), 'project.md'));
});

test('drafts remain scoped to their folder and stale workspace requests are rejected', async t => {
  const root = await fixture(t); const second = path.join(root, 'second'); await mkdir(second);
  const runtime = await paired(t);
  const firstState = (await runtime.post('/api/workspace/open', { path: root })).json();
  const id = firstState.workspace.id;
  assert.equal((await runtime.post('/api/draft', { workspaceId: id, draft })).statusCode, 200);
  const other = (await runtime.post('/api/workspace/open', { path: second })).json();
  assert.deepEqual(other.drafts, []);
  assert.equal((await runtime.post('/api/draft', { workspaceId: id, draft })).statusCode, 409);
  const returned = (await runtime.post('/api/workspace/open', { path: root })).json();
  assert.equal(returned.drafts[0].objective, draft.objective);
  const evil = { ...draft, state: 'complete', appVerified: true };
  assert.equal((await runtime.post('/api/draft', { workspaceId: returned.workspace.id, draft: evil })).statusCode, 400);
});

test('handoff preserves provenance, omissions, no-Git and the precise next action', async t => {
  const root = await fixture(t); const workspace = await openWorkspace(root);
  const handoff = prepareHandoff(draft, workspace, workspace.git);
  assert.match(handoff.markdown, /reported, not run by this app/);
  assert.match(handoff.markdown, /Agent says all tests passed/);
  assert.match(handoff.markdown, /Not recorded — clarify before proceeding/);
  assert.match(handoff.markdown, /Git: none/);
  assert.match(handoff.prompt, /Investigate and report; do not implement/);
  assert.match(handoff.prompt, /repository evidence takes precedence/);
  assert.ok(handoff.prompt.includes(draft.nextAction));
  assert.ok(!handoff.prompt.includes(root));
});

test('handoff generation refuses missing objective or next action', async t => {
  const runtime = await paired(t); const root = await fixture(t);
  const state = (await runtime.post('/api/workspace/open', { path: root })).json();
  assert.equal((await runtime.post('/api/handoff', { workspaceId: state.workspace.id, draft: { ...draft, nextAction: '' } })).statusCode, 400);
});

test('handoff freshness detects external context edits, creation and removal without overwriting files', async t => {
  const runtime = await paired(t); const root = await fixture(t);
  await writeFile(path.join(root, 'project.md'), '# Project\r\nOriginal\r\n');
  const state = (await runtime.post('/api/workspace/open', { path: root })).json();
  const payload = { workspaceId: state.workspace.id, draft };
  await runtime.post('/api/draft', payload);
  const handoff = (await runtime.post('/api/handoff', payload)).json();
  const check = () => runtime.post('/api/handoff/check', { workspaceId: state.workspace.id, receiptId: handoff.receiptId });
  assert.equal((await check()).json().state, 'no-observed-change');
  await writeFile(path.join(root, 'project.md'), '# Project\r\nExternal update\r\n');
  await writeFile(path.join(root, 'plan.md'), '# New plan');
  const changed = (await check()).json();
  assert.equal(changed.state, 'changed');
  assert.ok(changed.changes.some((item: string) => item.startsWith('project.md:')));
  assert.ok(changed.changes.some((item: string) => item.startsWith('plan.md:')));
  assert.equal(await readFile(path.join(root, 'project.md'), 'utf8'), '# Project\r\nExternal update\r\n');
  await rm(path.join(root, 'project.md'));
  assert.equal((await check()).json().state, 'changed');
});

test('freshness reports unavailable context as unknown rather than verified', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'project.md'), Buffer.from([0, 1, 2]));
  const observation = await observeHandoff(root);
  const result = compareHandoff(observation, observation);
  assert.equal(result.state, 'unknown');
  assert.match(result.unknowns.join(' '), /project.md/);
  assert.match(result.coverage, /do not prove/);
});

test('branch, HEAD and changed-path drift are observations, not scope or test verdicts', async t => {
  const root = await fixture(t);
  const before = await observeHandoff(root);
  before.git = { ...before.git, state: 'present', branch: 'task-one', commit: 'a'.repeat(40), changes: [{ status: ' M', path: 'service.java' }] };
  const after = { ...before, git: { ...before.git, branch: 'task-two', commit: 'b'.repeat(40), changes: [] } };
  const result = compareHandoff(before, after);
  assert.equal(result.state, 'changed');
  assert.equal(result.changes.length, 3);
  assert.match(result.coverage, /Source contents/);
  assert.equal(compareHandoff(before, before).state, 'no-observed-change');
});

test('unobserved source edits cannot be presented as complete freshness coverage', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'source.java'), 'before');
  const before = await observeHandoff(root);
  await writeFile(path.join(root, 'source.java'), 'after');
  const result = compareHandoff(before, await observeHandoff(root));
  assert.equal(result.state, 'no-observed-change');
  assert.match(result.coverage, /Source contents, diffs, ignored files/);
});

test('saved draft edits and unknown receipt IDs invalidate a handoff export check', async t => {
  const runtime = await paired(t); const root = await fixture(t);
  const state = (await runtime.post('/api/workspace/open', { path: root })).json();
  const payload = { workspaceId: state.workspace.id, draft };
  await runtime.post('/api/draft', payload);
  const handoff = (await runtime.post('/api/handoff', payload)).json();
  await runtime.post('/api/draft', { ...payload, draft: { ...draft, objective: 'Changed objective' } });
  const result = (await runtime.post('/api/handoff/check', { workspaceId: state.workspace.id, receiptId: handoff.receiptId })).json();
  assert.equal(result.state, 'changed');
  assert.ok(result.changes.includes('The saved task draft changed.'));
  assert.equal((await runtime.post('/api/handoff/check', { workspaceId: state.workspace.id, receiptId: state.workspace.id })).statusCode, 409);
  const reopened = (await runtime.post('/api/workspace/open', { path: root })).json();
  assert.equal((await runtime.post('/api/handoff/check', { workspaceId: reopened.workspace.id, receiptId: handoff.receiptId })).statusCode, 409);
});

test('provider destinations reject insecure URLs and local/metadata address families', () => {
  for (const url of ['http://company.example', 'https://user:secret@company.example', 'https://company.example/?key=x', 'https://localhost', 'https://127.1', 'https://[::1]', 'https://169.254.169.254']) assert.throws(() => endpointUrl(url));
  for (const address of ['0.0.0.0', '127.0.0.1', '169.254.169.254', '100.100.100.200', '::1', '::ffff:127.0.0.1', 'fe80::1', 'ff02::1', '64:ff9b::7f00:1']) assert.equal(isAllowedAddress(address), false, address);
  for (const address of ['10.2.3.4', '192.168.2.1', '203.0.113.20', '2606:4700::1111', 'fd00::123']) assert.equal(isAllowedAddress(address), true, address);
  assert.equal(endpointUrl('https://approved.example/openai/v1/').pathname, '/openai/v1/chat/completions');
});

test('porcelain status parsing handles spaces, renames and hostile terminal escapes', () => {
  const changes = parseStatus(' M src/with space.ts\0R  new.ts\0old.ts\0?? bad\u001bname.ts\0');
  assert.equal(changes.length, 3);
  assert.equal(changes[0].path, 'src/with space.ts');
  assert.equal(changes[1].path, 'new.ts');
  assert.equal(changes[2].path, 'bad�name.ts');
});

test('Git observations work without a remote and never invoke a configured filesystem monitor', async t => {
  const root = await fixture(t);
  const git = process.platform === 'win32' ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git/cmd/git.exe') : '/usr/bin/git';
  const exec = promisify(execFile);
  await exec(git, ['init', root], { windowsHide: true });
  await writeFile(path.join(root, 'example.txt'), 'sample');
  await exec(git, ['-C', root, 'config', 'core.fsmonitor', 'definitely-missing-helper'], { windowsHide: true });
  const result = await inspectGit(await validateFolder(root));
  assert.equal(result.state, 'present');
  assert.equal(result.commit, null);
  assert.ok(result.branch);
  assert.ok(result.changes.some(change => change.path === 'example.txt'));
});

test('redirected Git metadata is explicitly unavailable instead of silently granting outside access', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, '.git'), 'gitdir: C:/outside/metadata');
  const result = await inspectGit(root);
  assert.equal(result.state, 'unavailable');
  assert.match(result.note!, /separate grant/);
});

test('oversized API bodies are rejected and arbitrary folder-picker arguments are not executed', async t => {
  let calls = 0;
  const runtime = await paired(t, { picker: async () => { calls++; return null; } });
  const response = await runtime.post('/api/draft', { padding: 'x'.repeat(70000) });
  assert.equal(response.statusCode, 413);
  assert.equal((await runtime.post('/api/workspace/pick', {})).json().path, null);
  assert.equal(calls, 1);
});
