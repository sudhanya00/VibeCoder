import Fastify from 'fastify';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { z, ZodError } from 'zod';
import { draftSchema, profileSchema, type DraftStorage, type Profile, type TaskDraft, type Workspace } from '../shared/contracts.js';
import { AppError } from './errors.js';
import { hash, openWorkspace, readContext } from './workspace.js';
import { chooseFolder } from './folder-picker.js';
import { endpointUrl, probeEndpoint, PROBE_TEXT, type Probe } from './provider.js';
import { prepareHandoff } from './handoff.js';
import { compareHandoff, observeHandoff, type HandoffObservation } from './freshness.js';
import type { PrivateDraftStore } from './private-drafts.js';

const secureEquals = (a: string, b: string) => Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const rootRequest = z.object({ path: z.string().min(1).max(4096) }).strict();
const workspaceRequest = z.object({ workspaceId: z.string().uuid() }).strict();
const providerRequest = profileSchema.extend({ key: z.string().min(1).max(8192).refine(value => !/[\r\n]/.test(value), 'Invalid key format') }).strict();

export function createApp(options: { uiRoot?: string; probe?: Probe; picker?: typeof chooseFolder; now?: () => number; draftStore?: PrivateDraftStore } = {}) {
  const app = Fastify({ logger: false, bodyLimit: 65536, requestTimeout: 30000, connectionTimeout: 15000 });
  const publicRoutes = new Set<string>();
  const now = options.now ?? Date.now;
  let expectedOrigin = '';
  let bootstrap = randomBytes(32).toString('hex');
  let bootstrapUntil = now() + 120000;
  let session = '';
  let sessionUntil = 0;
  let workspace: Workspace | null = null;
  let profile: Profile | null = null;
  let key: string | null = null;
  let testedAt: string | null = null;
  let probe: AbortController | null = null;
  let changingWorkspace = false;
  let savingDraft = false;
  let storage: DraftStorage = { mode: 'session', revision: 0, savedAt: null };
  const sessionStorageStates = new Map<string, DraftStorage>();
  const drafts = new Map<string, Map<string, TaskDraft>>();
  const receipts = new Map<string, { workspaceId: string; taskId: string; draftHash: string; observation: HandoffObservation }>();
  const clearKey = () => { probe?.abort(); probe = null; key = null; testedAt = null; };
  const providerState = () => ({ profile, hasKey: !!key, testedAt, testing: !!probe });
  const requireWorkspace = (id: string) => {
    if (!workspace || workspace.id !== id) throw new AppError(409, 'The workspace changed. Refresh and try again.');
    return workspace;
  };
  const taskStore = () => {
    if (!workspace) throw new AppError(400, 'Open a project folder first.');
    if (!drafts.has(workspace.path)) drafts.set(workspace.path, new Map());
    return drafts.get(workspace.path)!;
  };

  app.addHook('onRequest', async (req, reply) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff')
      .header('Referrer-Policy', 'no-referrer').header('X-Frame-Options', 'DENY')
      .header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
    if (!expectedOrigin || req.headers.host !== new URL(expectedOrigin).host) throw new AppError(403, 'Unrecognized local host. Use the launcher address.');
    if (req.headers.origin && req.headers.origin !== expectedOrigin) throw new AppError(403, 'Cross-origin requests are not permitted.');
    if (req.headers['sec-fetch-site'] === 'cross-site' || req.method === 'OPTIONS') throw new AppError(403, 'Cross-origin requests are not permitted.');
    // Authenticate everything except exact, application-owned static routes.
    // Never base authorization on a prefix that a router might decode differently.
    if (publicRoutes.has(req.url) && ['GET', 'HEAD'].includes(req.method)) return;
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (req.headers.origin !== expectedOrigin || req.headers['content-type']?.split(';')[0] !== 'application/json') throw new AppError(403, 'A same-origin JSON request is required.');
    }
    if (req.url === '/api/pair' && req.method === 'POST') return;
    if (!session || now() > sessionUntil) { clearKey(); throw new AppError(401, 'Your local session has expired. Reopen the app from its launcher.'); }
    if (!secureEquals(req.headers.authorization ?? '', `Bearer ${session}`)) throw new AppError(401, 'Pair this browser using the launcher link.');
  });
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof AppError) return reply.code(error.status).send({ error: error.message });
    if (error instanceof ZodError) return reply.code(400).send({ error: 'Some fields are missing or invalid. Check the form and try again.' });
    const status = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : undefined;
    const code = typeof status === 'number' && status >= 400 && status < 500 ? status : 500;
    return reply.code(code).send({ error: code === 500 ? 'The operation could not be completed. Your source files were not changed.' : 'Invalid request.' });
  });
  app.post('/api/pair', async req => {
    const body = z.object({ token: z.string().max(128) }).strict().parse(req.body);
    if (!bootstrap || now() > bootstrapUntil || !secureEquals(body.token, bootstrap)) throw new AppError(401, 'This pairing link is expired or already used. Restart the launcher for a new link.');
    bootstrap = '';
    session = randomBytes(32).toString('hex');
    sessionUntil = now() + 8 * 60 * 60 * 1000;
    return { token: session };
  });
  app.get('/api/state', async () => ({ workspace, provider: providerState(), drafts: workspace ? [...taskStore().values()] : [], storage }));
  app.post('/api/workspace/pick', async () => ({ path: await (options.picker ?? chooseFolder)() }));
  app.post('/api/workspace/open', async req => {
    const body = rootRequest.parse(req.body);
    if (changingWorkspace || savingDraft || probe) throw new AppError(409, 'Wait for the current operation or clear the key to cancel the connection test.');
    changingWorkspace = true;
    try {
      const opened = await openWorkspace(body.path);
      let nextStorage = sessionStorageStates.get(opened.path) ?? { mode: 'session' as const, revision: 0, savedAt: null };
      if (options.draftStore) {
        try {
          const saved = await options.draftStore.load(opened.path);
          drafts.set(opened.path, new Map(saved.drafts.map(draft => [draft.id, draft])));
          nextStorage = { mode: 'disk', revision: saved.revision, savedAt: saved.savedAt, location: options.draftStore.root, note: saved.note };
        } catch {
          nextStorage = { ...nextStorage, mode: 'session', note: 'Private storage could not be safely opened. Existing saved files were preserved. Drafts in this session are temporary; export before stopping.' };
        }
      }
      clearKey();
      receipts.clear();
      workspace = opened;
      storage = nextStorage;
      return { workspace, provider: providerState(), drafts: [...taskStore().values()], storage };
    } finally { changingWorkspace = false; }
  });
  app.post('/api/workspace/refresh', async req => {
    const current = requireWorkspace(workspaceRequest.parse(req.body).workspaceId);
    const refreshed = await openWorkspace(current.path);
    requireWorkspace(current.id);
    workspace = { ...refreshed, id: current.id };
    return workspace;
  });
  app.post('/api/document', async req => {
    const body = workspaceRequest.extend({ path: z.string().max(100) }).strict().parse(req.body);
    const current = requireWorkspace(body.workspaceId);
    const result = await readContext(current.path, body.path);
    requireWorkspace(current.id);
    return result;
  });
  app.post('/api/draft', async req => {
    const body = workspaceRequest.extend({ draft: draftSchema, revision: z.number().int().nonnegative().optional() }).strict().parse(req.body);
    const current = requireWorkspace(body.workspaceId);
    if (changingWorkspace || savingDraft) throw new AppError(409, 'Another save or folder change is in progress. Try again after it finishes.');
    if ((storage.mode === 'disk' && body.revision === undefined) || (body.revision !== undefined && body.revision !== storage.revision)) throw new AppError(409, 'This draft view is stale. Copy your unsaved text, then reopen the folder to reconcile.');
    const tasks = taskStore();
    if (!tasks.has(body.draft.id) && tasks.size >= 50) throw new AppError(400, 'This preview supports up to 50 session drafts per workspace.');
    savingDraft = true;
    try {
      const next = new Map(tasks); next.set(body.draft.id, body.draft);
      if (storage.mode === 'disk' && options.draftStore) {
        const saved = await options.draftStore.save(current.path, [...next.values()], storage.revision);
        storage = { ...storage, revision: saved.revision, savedAt: saved.savedAt, note: saved.note };
      } else storage = { ...storage, revision: storage.revision + 1, savedAt: new Date().toISOString() };
      drafts.set(current.path, next);
      sessionStorageStates.set(current.path, storage);
      return { draft: body.draft, storage };
    } finally { savingDraft = false; }
  });
  app.post('/api/handoff', async req => {
    const body = workspaceRequest.extend({ draft: draftSchema }).strict().parse(req.body);
    const current = requireWorkspace(body.workspaceId);
    if (!body.draft.objective || !body.draft.nextAction) throw new AppError(400, 'Add a task objective and a precise next action before preparing a handoff.');
    const observation = await observeHandoff(current.path);
    requireWorkspace(current.id);
    const receiptId = randomUUID();
    receipts.set(receiptId, { workspaceId: current.id, taskId: body.draft.id, draftHash: hash(JSON.stringify(body.draft)), observation });
    if (receipts.size > 50) receipts.delete(receipts.keys().next().value!);
    const availableDocuments = current.documents.map(doc => ({ ...doc, available: observation.documents[doc.path]?.state === 'read' }));
    const preview = prepareHandoff(body.draft, { ...current, documents: availableDocuments }, observation.git);
    const coverage = compareHandoff(observation, observation);
    const note = `\n## Observation limits\n${coverage.coverage}\n${coverage.unknowns.map(item => `- ${item}`).join('\n')}\n`;
    return { ...preview, markdown: preview.markdown + note, prompt: preview.prompt + note, receiptId };
  });
  app.post('/api/handoff/check', async req => {
    const body = workspaceRequest.extend({ receiptId: z.string().uuid() }).strict().parse(req.body);
    const current = requireWorkspace(body.workspaceId);
    const receipt = receipts.get(body.receiptId);
    if (!receipt || receipt.workspaceId !== current.id) throw new AppError(409, 'This handoff observation is unavailable. Prepare a new handoff.');
    const observation = await observeHandoff(current.path);
    requireWorkspace(current.id);
    const result = compareHandoff(receipt.observation, observation);
    const latestDraft = taskStore().get(receipt.taskId);
    if (latestDraft && hash(JSON.stringify(latestDraft)) !== receipt.draftHash) {
      result.changes.push('The saved task draft changed.');
      result.state = 'changed';
    }
    return result;
  });
  app.post('/api/provider', async req => {
    const body = providerRequest.parse(req.body);
    endpointUrl(body.endpoint);
    clearKey();
    profile = { endpoint: body.endpoint, model: body.model, keyStyle: body.keyStyle };
    key = body.key;
    return providerState();
  });
  app.post('/api/provider/clear', async () => { clearKey(); return providerState(); });
  app.get('/api/provider/probe', async () => ({ text: PROBE_TEXT, maxTokens: 16, profile }));
  app.post('/api/provider/test', async req => {
    z.object({ confirmed: z.literal(true) }).strict().parse(req.body);
    if (!profile || !key) throw new AppError(400, 'Add the approved endpoint, model and session key first.');
    if (probe || changingWorkspace) throw new AppError(409, 'Another operation is already running.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    probe = controller;
    try {
      await (options.probe ?? probeEndpoint)(profile, key, controller.signal);
      if (controller.signal.aborted || probe !== controller) throw new AppError(409, 'Connection test cancelled or settings changed.');
      testedAt = new Date().toISOString();
      return { ...providerState(), testing: false };
    } finally { clearTimeout(timer); if (probe === controller) probe = null; }
  });
  app.post('/api/lock', async () => { clearKey(); receipts.clear(); session = ''; return { locked: true }; });
  app.addHook('onClose', async () => { clearKey(); drafts.clear(); receipts.clear(); });
  if (options.uiRoot) {
    const uiRoot = path.resolve(options.uiRoot);
    app.register(async server => {
      const serve = async (route: string, file: string, type: string) => {
        const bytes = await readFile(path.join(uiRoot, file));
        publicRoutes.add(route);
        server.get(route, async (_req, reply) => reply.type(type).send(bytes));
      };
      await serve('/', 'index.html', 'text/html; charset=utf-8');
      await serve('/favicon.svg', 'favicon.svg', 'image/svg+xml');
      // The current bundle contains only hashed JS and CSS. No directory listing,
      // dynamic paths, source maps, arbitrary files, or project-file serving.
      for (const entry of await readdir(path.join(uiRoot, 'assets'), { withFileTypes: true })) {
        if (entry.isFile() && /^[A-Za-z0-9_-]+\.(js|css)$/.test(entry.name)) {
          await serve(`/assets/${entry.name}`, `assets/${entry.name}`, entry.name.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8');
        }
      }
    });
  }
  return {
    app,
    setOrigin(origin: string) { expectedOrigin = origin; },
    pairingUrl() { if (!bootstrap) { bootstrap = randomBytes(32).toString('hex'); bootstrapUntil = now() + 120000; } return `${expectedOrigin}/#pair=${bootstrap}`; },
  };
}
