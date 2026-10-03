import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check,
  ChevronDown, ChevronRight, Circle, Clipboard, FileText, FolderOpen,
  GitBranch, KeyRound, Layers2, LoaderCircle, LockKeyhole, Menu, Moon,
  PanelRightClose, PanelRightOpen, Plug, Plus, RefreshCw, Settings2,
  ShieldCheck, Sparkles, Sun, Terminal, X,
} from 'lucide-react';
import type { AppState, DocumentResult, DraftSave, HandoffFreshness, HandoffPreview, Profile, ProviderState, TaskDraft, Workspace } from '../shared/contracts';
import { api, forgetSession, pair } from './api';

type View = 'task' | 'knowledge' | 'handoff' | 'settings';
const blankTask = (): TaskDraft => ({
  id: 'T-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), value => value.toString(16).padStart(2, '0')).join(''),
  kind: 'investigation', objective: '', scope: '', acceptance: '', unknowns: '', outcome: '', verification: '', notPerformed: '', nextAction: '',
});
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
function initialTheme() {
  try {
    const saved = localStorage.getItem('vibecoder-theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* A blocked preference store must not block the workspace. */ }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function Brand() { return <span className="brand"><span className="brand-mark"><Layers2 size={19} /></span>vibecoder<span className="brand-dot">.</span></span>; }
function Empty({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="empty"><span className="empty-icon">{icon}</span><h2>{title}</h2><div className="muted">{children}</div>{action}</section>;
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => { if (dialog.open) dialog.close(); }; }, []);
  return <dialog ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}><div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>{children}</dialog>;
}

export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const draftRevision = useRef(0);
  const [bootError, setBootError] = useState('');
  const [view, setView] = useState<View>('task');
  const [task, setTask] = useState<TaskDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pane, setPane] = useState<'scope' | 'outcome'>('scope');
  const [openDialog, setOpenDialog] = useState(false);
  const [folder, setFolder] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [document, setDocument] = useState<DocumentResult | null>(null);
  const [handoff, setHandoff] = useState<HandoffPreview | null>(null);
  const [freshness, setFreshness] = useState<HandoffFreshness | null>(null);
  const [limitedExport, setLimitedExport] = useState<'copy' | 'download' | null>(null);
  const [showInspector, setShowInspector] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [theme, setTheme] = useState(initialTheme);
  const [help, setHelp] = useState(false);
  useEffect(() => { pair().then(() => api<AppState>('/state')).then(next => { draftRevision.current = next.storage.revision; setState(next); setTask(next.drafts[0] ?? null); }).catch(error => setBootError(message(error))); }, []);
  useEffect(() => {
    window.document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('vibecoder-theme', theme); } catch { /* Use an in-memory preference when storage is blocked. */ }
  }, [theme]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const workspace = state?.workspace;
  async function run(label: string, operation: () => Promise<void>) {
    setError(''); setBusy(label);
    try { await operation(); } catch (error) { setError(message(error)); } finally { setBusy(''); }
  }
  function navigate(next: View) { setView(next); setMobileNav(false); }
  function edit(field: keyof TaskDraft, value: string) {
    if (!task) return;
    setTask({ ...task, [field]: value }); setDirty(true); setHandoff(null);
  }
  async function saveDraft() {
    if (!workspace || !task || !dirty) return;
    const saved = await api<DraftSave>('/draft', { workspaceId: workspace.id, draft: task, revision: draftRevision.current });
    draftRevision.current = saved.storage.revision;
    setState(current => current ? { ...current, storage: saved.storage, drafts: [...current.drafts.filter(item => item.id !== saved.draft.id), saved.draft] } : current);
    setDirty(false);
  }
  async function selectTask(next: TaskDraft) {
    if (next.id === task?.id) { navigate('task'); return; }
    if (dirty) await saveDraft();
    setTask(next); setDirty(false); setHandoff(null); setPane('scope'); navigate('task');
  }
  async function newTask() {
    if (dirty) await saveDraft();
    const created = blankTask();
    const saved = await api<DraftSave>('/draft', { workspaceId: workspace!.id, draft: created, revision: draftRevision.current });
    draftRevision.current = saved.storage.revision;
    setState(current => current ? { ...current, storage: saved.storage, drafts: [...current.drafts, saved.draft] } : current);
    setTask(saved.draft); setDirty(false); setHandoff(null); setPane('scope'); navigate('task');
  }
  async function openProject(event: FormEvent) {
    event.preventDefault();
    await run('Opening folder', async () => {
      if (dirty) await saveDraft();
      const next = await api<AppState>('/workspace/open', { path: folder });
      draftRevision.current = next.storage.revision;
      setState(next); setTask(next.drafts[0] ?? null); setDirty(false); setHandoff(null); setDocument(null);
      setOpenDialog(false); navigate('task'); setToast(next.drafts.length ? 'Saved drafts restored. Review current project state before resuming.' : 'Folder opened for read-only inspection. Project files unchanged.');
    });
  }
  async function prepare() {
    if (!workspace || !task) return;
    await run('Preparing handoff', async () => {
      await saveDraft();
      const result = await api<HandoffPreview>('/handoff', { workspaceId: workspace.id, draft: task });
      setFreshness(null); setLimitedExport(null);
      setHandoff(result); navigate('handoff');
    });
  }
  async function exportHandoff(kind: 'copy' | 'download', acceptUnknown = false) {
    if (!handoff || !workspace) return;
    await run('Checking handoff', async () => {
      const result = await api<HandoffFreshness>('/handoff/check', { workspaceId: workspace.id, receiptId: handoff.receiptId });
      setFreshness(result);
      if (result.state === 'changed') {
        setLimitedExport(null);
        throw new Error('The handoff needs reconciliation. Review the changes below, edit the task if needed, then prepare a new handoff.');
      }
      if (result.state === 'unknown' && !acceptUnknown) { setLimitedExport(kind); return; }
      setLimitedExport(null);
      if (kind === 'copy') {
        await navigator.clipboard.writeText(handoff.prompt);
        setToast('Draft prompt copied. Repository reconciliation is still required in the next session.');
      } else download();
    });
  }
  function download() {
    if (!handoff || !task) return;
    const blob = new Blob([handoff.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = window.document.createElement('a');
    link.href = url; link.download = `${task.id}-draft-handoff.md`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Draft export requested. Nothing was applied to project files.');
  }
  async function readFile(path: string) {
    await run('Reading context', async () => {
      const doc = await api<DocumentResult>('/document', { workspaceId: workspace!.id, path });
      setDocument(doc); navigate('knowledge');
    });
  }

  if (!state) return <div className="boot"><Brand />{bootError ? <><LockKeyhole size={28} /><h1>Pair your local workspace.</h1><p>{bootError}</p><p className="muted">Run the local launcher again for a fresh, short-lived link.</p></> : <><LoaderCircle className="spin" /><p>Opening your workspace…</p></>}</div>;

  const title = { task: 'Current work', knowledge: 'Project knowledge', handoff: 'Session handoff', settings: 'Connections' }[view];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand"><Brand /><span className="build-label">EARLY PREVIEW</span></div>
      <button className="project-switch" onClick={() => { setFolder(workspace?.path ?? ''); setOpenDialog(true); setError(''); }}><span className="project-symbol"><FolderOpen size={18} /></span><span><strong>{workspace?.name ?? 'Your workspace'}</strong><small>{workspace ? 'Local project' : 'Choose a project folder'}</small></span><ChevronDown size={14} /></button>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">
        {([{ id: 'task', label: 'Current work', icon: <Circle size={17} /> }, { id: 'knowledge', label: 'Project knowledge', icon: <BookOpen size={17} /> }, { id: 'handoff', label: 'Session handoff', icon: <ArrowUpRight size={18} /> }] as const).map(item => <button key={item.id} className={`nav-item ${view === item.id ? 'selected' : ''}`} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}>{item.icon}{item.label}</button>)}
      </nav>
      <div className="task-nav-head"><span className="nav-label">PRIVATE DRAFTS</span><button className="icon-button" disabled={!workspace || !!busy} onClick={() => void run('Creating draft', newTask)} aria-label="New task"><Plus size={16} /></button></div>
      <div className="task-list">{state.drafts.length ? state.drafts.map(item => <button className={`task-item ${task?.id === item.id ? 'active' : ''}`} key={item.id} onClick={() => void run('Opening draft', () => selectTask(item))} disabled={!!busy}><span className="task-dot" /><span>{(task?.id === item.id ? task.objective : item.objective) || 'Untitled task'}</span></button>) : <p className="sidebar-hint">Small tasks.<br />Clear next steps.</p>}</div>
      <div className="sidebar-bottom"><button className={`nav-item ${view === 'settings' ? 'selected' : ''}`} onClick={() => navigate('settings')}><Plug size={17} />Connections<span className={`tiny-dot ${state.provider.testedAt ? 'ready' : ''}`} /></button><button className="nav-item" onClick={() => setHelp(true)}><ShieldCheck size={17} />Local by design</button><div className="sidebar-footer"><span>Built for deliberate work.</span><button className="icon-button" aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button></div></div>
    </aside>
    <div className="workspace-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}><Menu size={20} /></button><span>{workspace?.name ?? 'Getting started'}</span><ChevronRight size={13} /><strong>{title}</strong></div><div className="topbar-actions">{workspace?.git.state === 'present' && <span className="branch-pill"><GitBranch size={13} />{workspace.git.branch ?? 'Detached HEAD'}</span>}<span className="local-indicator"><span />Local session</span><button className="icon-button" aria-label="Connection settings" onClick={() => navigate('settings')}><Settings2 size={17} /></button></div></header>
      {workspace && state.storage.note && <div className="error-banner" role="status">{state.storage.note}</div>}
      {error && <div className="error-banner" role="alert"><span>{error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
      {view === 'task' && (!workspace ? <section className="welcome page-enter"><div className="welcome-eyebrow"><span className="small-orbit" />A CLEARER WAY TO WORK WITH AI</div><h1>Good work starts<br />with a clear next step<span>.</span></h1><p>Your project context, scoped tasks, and session handoffs.<br className="desktop-break" /> One calm workspace. On your machine.</p><button className="primary large" onClick={() => setOpenDialog(true)}><FolderOpen size={18} />Open a project<ArrowRight size={17} /></button><span className="welcome-footnote">Start with an empty folder or an existing repository.</span><div className="journey"><div><span>01</span><strong>Make it clear</strong><small>Frame the task. Record the unknowns.</small></div><div><span>02</span><strong>Keep it scoped</strong><small>Prepare one deliberate agent session.</small></div><div><span>03</span><strong>Carry it forward</strong><small>Keep the evidence. Prepare the handoff.</small></div></div><div className="welcome-boundary"><ShieldCheck size={15} />No account. No project upload. Your agent, your endpoint.</div></section> : !task ? <div className="page"><div className="page-heading"><span className="eyebrow">WORKSPACE OPEN</span><h1>{workspace.name}</h1><p className="muted">Your folder is ready for a focused session.</p></div><Empty icon={<Circle size={26} />} title="What are we working on?" action={<button className="primary" onClick={() => void run('Creating draft', newTask)} disabled={!!busy}><Plus size={17} />Create a scoped task</button>}><p>Start with an objective, define success,<br />and give your coding agent a useful next action.</p></Empty><div className="quiet-note"><FileText size={17} /><span>Existing Markdown stays authoritative. Private drafts are kept separately and do not change your project files.</span></div></div> : <section className="task-page page-enter">
        <div className="task-heading"><div><div className="eyebrow">{task.id} <span>/</span> {task.kind.toUpperCase()}</div><h1>{task.objective || 'Give this task a clear objective.'}</h1><p className="muted">One bounded task. One useful outcome.</p></div><span className="status-badge"><span />Draft</span></div>
        <div className="task-toolbar"><div className="segmented" aria-label="Task sections"><button aria-pressed={pane === 'scope'} onClick={() => setPane('scope')}>Define the work</button><button aria-pressed={pane === 'outcome'} onClick={() => setPane('outcome')}>Capture the result</button></div><button className="icon-button" aria-label={showInspector ? 'Hide context inspector' : 'Show context inspector'} onClick={() => setShowInspector(!showInspector)}>{showInspector ? <PanelRightClose size={19} /> : <PanelRightOpen size={19} />}</button></div>
        <div className={`task-content ${showInspector ? '' : 'focused'}`}><div className="task-editor">
          <fieldset className="task-fields" disabled={!!busy}>
          {pane === 'scope' ? <div className="fields page-enter"><label>Objective<input autoComplete="off" maxLength={500} value={task.objective} onChange={e => edit('objective', e.target.value)} placeholder="e.g. Investigate the checkout authentication failure" /></label><label>Type of work<select value={task.kind} onChange={e => edit('kind', e.target.value)}><option value="investigation">Investigation — learn before changing</option><option value="implementation">Implementation — make a scoped change</option><option value="debugging">Debugging — collect evidence and narrow the cause</option></select></label><label>Scope & exclusions<span className="field-hint">What belongs in this session? What should wait?</span><textarea rows={3} maxLength={4000} value={task.scope} onChange={e => edit('scope', e.target.value)} placeholder="Include…&#10;Leave out…" /></label><label>Acceptance criteria<span className="field-hint">Use observable outcomes, not “make it work.”</span><textarea rows={3} maxLength={4000} value={task.acceptance} onChange={e => edit('acceptance', e.target.value)} placeholder="We will know this is done when…" /></label><label>Unknowns & blockers<textarea rows={2} maxLength={4000} value={task.unknowns} onChange={e => edit('unknowns', e.target.value)} placeholder="Keep unanswered questions visible. Use “None known” if appropriate." /></label></div> : <div className="fields page-enter"><div className="evidence-notice"><ShieldCheck size={18} /><span>These are user or agent reports. VibeCoder does not run your project's tests.</span></div><label>Completed actions<textarea rows={4} maxLength={8000} value={task.outcome} onChange={e => edit('outcome', e.target.value)} placeholder="What changed? Which files? What remains?" /></label><label>Verification reported<span className="field-hint">Include command, outcome, environment, revision and who ran it.</span><textarea rows={4} maxLength={6000} value={task.verification} onChange={e => edit('verification', e.target.value)} placeholder="Command: …&#10;Result: …&#10;Performed by: …" /></label><label>Checks not performed<textarea rows={3} maxLength={4000} value={task.notPerformed} onChange={e => edit('notPerformed', e.target.value)} placeholder="What has not been checked, and why?" /></label></div>}
          <div className="next-action"><label><span className="eyebrow">THE PRECISE NEXT ACTION</span><textarea rows={2} maxLength={2000} value={task.nextAction} onChange={e => edit('nextAction', e.target.value)} placeholder="Give the next session one concrete place to start…" /></label></div>
          </fieldset>
          <div className="editor-footer"><span className="save-state">{dirty ? 'Unsaved changes' : state.storage.mode === 'disk' ? 'Saved privately on this machine' : 'Temporary session draft'}<small>{state.storage.mode === 'disk' ? 'Reopen this folder to restore saved drafts.' : 'Export before stopping the app.'}</small></span><div className="button-row"><button className="secondary" disabled={!!busy || !dirty} onClick={() => void run('Saving draft', async () => { await saveDraft(); setToast(state.storage.mode === 'disk' ? 'Draft saved privately. Project files unchanged.' : 'Temporary draft saved in memory. Export before stopping.'); })}>{busy === 'Saving draft' ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Save draft</button><button className="primary" disabled={!!busy || !task.objective.trim() || !task.nextAction.trim()} onClick={() => void prepare()}>Prepare handoff<ArrowRight size={16} /></button></div></div>
        </div>{showInspector && <aside className="context-inspector"><span className="eyebrow">PROJECT CONTEXT</span><p className="inspector-description">Read the source.<br />Keep the next step grounded.</p>{workspace.documents.map(file => <button className="context-link" key={file.path} disabled={!file.available || !!busy} onClick={() => void readFile(file.path)}><FileText size={15} /><span>{file.path}<small>{file.available ? 'Available locally' : file.note}</small></span>{file.available && <ArrowUpRight size={13} />}</button>)}<div className="inspector-note"><LockKeyhole size={16} /><strong>Read-only preview</strong><p>Shared documents are never overwritten. Handoffs are reviewed and exported manually in this first slice.</p></div></aside>}</div>
      </section>)}
      {view === 'knowledge' && <section className="page page-enter"><div className="page-heading"><span className="eyebrow">SHARED KNOWLEDGE</span><h1>Context you can trust.</h1><p className="muted">Read actual project files. Keep proposals separate from what exists.</p></div>{!workspace ? <Empty icon={<BookOpen size={28} />} title="Open a project to read its context." action={<button className="primary" onClick={() => setOpenDialog(true)}>Open project<ArrowRight size={16} /></button>}><p>No folder has been granted access.</p></Empty> : <><div className="document-tabs">{workspace.documents.map(file => <button key={file.path} className={document?.path === file.path ? 'active' : ''} disabled={!file.available || !!busy} onClick={() => void readFile(file.path)}><FileText size={14} />{file.path}</button>)}</div>{document ? <div className="document-panel"><div className="document-header"><span>{document.path}</span><span className="micro muted">READ-ONLY · SHA-256 {document.hash.slice(0, 10)}</span></div><pre className="document-content">{document.content}</pre></div> : <Empty icon={<FileText size={25} />} title={workspace.documents.some(file => file.available) ? 'Choose a context file.' : 'A fresh place to begin.'}><p>{workspace.documents.some(file => file.available) ? 'Files open as plain text. Embedded instructions cannot control this app.' : 'No foundational Markdown files were found. You can still prepare a task and export a handoff.'}</p></Empty>}</>}</section>}
      {view === 'handoff' && <section className="page page-enter">
        <div className="page-heading"><span className="eyebrow">SESSION CONTINUITY</span><h1>Leave a clear next step.</h1><p className="muted">Carry the scope, the evidence, and the unfinished work forward.</p></div>
        {!handoff ? <Empty icon={<ArrowUpRight size={28} />} title="Prepare the next conversation." action={<button className="primary" onClick={() => navigate('task')}>Go to current work<ArrowRight size={16} /></button>}><p>Add an objective and a precise next action to a task,<br />then prepare its draft handoff.</p></Empty> : <>
          <div className="handoff-warning"><span className="status-badge">Draft export</span><span>Not applied to shared project documents. Reports are not app-run verification.</span></div>
          {freshness && <div className="quiet-note" role="status"><ShieldCheck size={18} /><div>
            <strong>{freshness.state === 'changed' ? 'Changes need review' : freshness.state === 'unknown' ? 'Some observations are unavailable' : 'No changes detected within checked coverage'}</strong>
            {freshness.changes.length > 0 && <ul>{freshness.changes.map(item => <li key={item}>{item}</li>)}</ul>}
            {freshness.unknowns.length > 0 && <ul>{freshness.unknowns.map(item => <li key={item}>{item}</li>)}</ul>}
            <p className="field-hint">{freshness.coverage}</p>
          </div></div>}
          <div className="document-panel"><div className="document-header"><span>{task?.id} / next-session prompt</span><span className="micro muted">REVIEW BEFORE COPYING</span></div><pre className="document-content handoff-content">{handoff.prompt}</pre></div>
          <div className="handoff-actions"><button className="secondary" onClick={() => navigate('task')}><ArrowLeft size={16} />Edit task</button><div className="button-row">
            <button className="secondary" onClick={() => void prepare()} disabled={!!busy}>Prepare new handoff</button>
            <button className="secondary" onClick={() => void exportHandoff('download')} disabled={!!busy}><ArrowDownToLine size={16} />Export Markdown</button>
            <button className="primary" onClick={() => void exportHandoff('copy')} disabled={!!busy}><Clipboard size={16} />Copy next-session prompt</button>
          </div></div>
          <p className="micro muted">Observation captured {new Date(handoff.generatedAt).toLocaleTimeString()}. Document hashes and Git metadata are rechecked before export. Source-file contents and project tests are not checked.</p>
        </>}
        {limitedExport && freshness && <Modal title="Export with incomplete observations?" onClose={() => setLimitedExport(null)}>
          <p className="muted">Some checks are unavailable. Exporting this draft does not establish that the repository is unchanged or the task is on track.</p>
          <ul>{freshness.unknowns.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="field-hint">{freshness.coverage}</p>
          <div className="modal-actions"><button className="secondary" onClick={() => setLimitedExport(null)}>Cancel</button><button className="primary" disabled={!!busy} onClick={() => void exportHandoff(limitedExport, true)}>Export unverified draft</button></div>
        </Modal>}
      </section>}
      {view === 'settings' && <section className="page settings-page page-enter"><div className="page-heading"><span className="eyebrow">YOUR TOOLS, YOUR TERMS</span><h1>Make yourself at home.</h1><p className="muted">A local folder, your existing Git workflow, an approved endpoint.</p></div><div className="settings-section"><div className="settings-section-title"><FolderOpen size={19} /><h2>Project folder</h2><span className="status-badge">{workspace ? 'Read-only access' : 'Not selected'}</span></div><div className="setting-content"><p className="path-display">{workspace?.path ?? 'No folder selected'}</p><p className="field-hint">Only foundational context files and local Git metadata are inspected. Opening a different folder clears the session key.</p><button className="secondary" onClick={() => { setFolder(workspace?.path ?? ''); setOpenDialog(true); }}>Choose a project<ArrowUpRight size={15} /></button></div></div><div className="settings-section"><div className="settings-section-title"><FileText size={19} /><h2>Private drafts</h2><span className="status-badge">{state.storage.mode === 'disk' ? 'Saved on this machine' : 'Temporary session'}</span></div><div className="setting-content"><p>{state.storage.mode === 'disk' ? 'Saved drafts survive restart. Open the same project folder to restore them; review current repository state before resuming.' : 'Saved drafts are temporary in this session. Export before stopping the app.'}</p>{state.storage.location && <p className="path-display">{state.storage.location}</p>}<p className="field-hint">Draft storage never contains the endpoint key. It does not update shared Markdown or preserve verification status.</p></div></div><Repository workspace={workspace ?? null} busy={!!busy} refresh={() => void run('Refreshing repository', async () => { const refreshed = await api<Workspace>('/workspace/refresh', { workspaceId: workspace!.id }); setState(current => current ? { ...current, workspace: refreshed } : current); setHandoff(null); setDocument(null); setToast('Local repository observation refreshed. Handoff preview invalidated.'); })} /><Provider state={state.provider} notify={setToast} setError={setError} update={provider => setState(current => current ? { ...current, provider } : current)} /><div className="quiet-note"><Terminal size={17} /><span>No remote Git login is needed. Clone with your existing tools, then open the local folder here.</span></div></section>}
      <footer className="workspace-footer"><span><span className="footer-dot" /> {busy || 'Private session · No project telemetry'}</span><span>v0.1 / Foundation preview</span></footer>
    </div>
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}
    {openDialog && <Modal title="Open a local project" onClose={() => { if (!busy) setOpenDialog(false); }}><form onSubmit={event => void openProject(event)}><p className="muted">Choose an existing repository or an empty folder. Your files stay on this machine.</p><label>Folder path<div className="path-input"><input autoFocus value={folder} onChange={e => setFolder(e.target.value)} placeholder="C:\work\my-project" required autoComplete="off" /><button type="button" className="secondary" disabled={!!busy} onClick={() => void run('Choosing folder', async () => { const result = await api<{ path: string | null }>('/workspace/pick', {}); if (result.path) setFolder(result.path); })}><FolderOpen size={17} />Browse</button></div></label><p className="field-hint">If your company blocks the folder chooser, paste the path here.</p><div className="permission-note"><ShieldCheck size={18} /><span>Read-only access to project.md, codebase.md, plan.md, progress.md, AGENTS.md and local Git metadata. No file writes or uploads.</span></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button className="secondary" type="button" onClick={() => setOpenDialog(false)} disabled={!!busy}>Cancel</button><button className="primary" disabled={!folder.trim() || !!busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}Open project</button></div></form></Modal>}
    {help && <Modal title="Local by design" onClose={() => setHelp(false)}><div className="privacy-list"><p><ShieldCheck />Project files are read locally. This preview never modifies them or runs project commands.</p><p><KeyRound />API keys stay in service memory. Clear the key, switch projects or stop the app to drop it.</p><p><Plug />Only an explicit connection test sends a fixed synthetic message to your endpoint. Project inference is not implemented yet.</p><p><FileText />{state.storage.mode === 'disk' ? 'Saved drafts persist privately on this machine. Reopen the same folder to restore them. Shared Markdown remains authoritative.' : 'Private storage is unavailable or no folder is selected. Session drafts are temporary; export before stopping.'}</p></div><div className="modal-actions"><button className="secondary" onClick={() => setHelp(false)}>Keep working</button><button className="primary" onClick={() => void run('Locking session', async () => { await api('/lock', {}); forgetSession(); setHelp(false); setState(null); setBootError('The local session is locked. Restart the launcher to pair again.'); })}><LockKeyhole size={16} />Lock session</button></div></Modal>}
  </div>;
}

function Repository({ workspace, refresh, busy }: { workspace: Workspace | null; refresh: () => void; busy: boolean }) {
  const git = workspace?.git;
  return <div className="settings-section"><div className="settings-section-title"><GitBranch size={19} /><h2>Local repository</h2><span className="status-badge">{git?.state === 'present' ? 'Observed locally' : git?.state === 'unavailable' ? 'Unavailable' : 'No repository'}</span></div><div className="setting-content">{git?.state === 'present' ? <><div className="repo-details"><span><small>BRANCH</small>{git.branch ?? 'Detached HEAD'}</span><span><small>HEAD</small><code>{git.commit?.slice(0, 10) ?? 'No commits yet'}</code></span><span><small>CHANGED PATHS</small>{git.changes.length}</span></div>{git.changes.length > 0 && <details className="changed-files"><summary>Inspect changed paths</summary>{git.changes.map((file, index) => <div key={index}><code>{file.status}</code><span>{file.path}</span></div>)}</details>}<p className="field-hint">Status observed {new Date(git.observedAt).toLocaleTimeString()}. No test execution or diff verification.</p></> : <p className="muted">{git?.note ?? (workspace ? 'This folder has no Git repository. You can still plan tasks and prepare handoffs.' : 'Open a local folder to inspect its repository.')}</p>}<button className="secondary" onClick={refresh} disabled={!workspace || busy}><RefreshCw size={15} />Refresh observation</button></div></div>;
}

function Provider({ state, update, notify, setError }: { state: ProviderState; update: (state: ProviderState) => void; notify: (text: string) => void; setError: (text: string) => void }) {
  const [profile, setProfile] = useState<Profile>(state.profile ?? { endpoint: '', model: '', keyStyle: 'bearer' });
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const cancelled = useRef(false);
  const [preview, setPreview] = useState<{ text: string; maxTokens: number; profile: Profile } | null>(null);
  const unchanged = JSON.stringify(profile) === JSON.stringify(state.profile) && !key;
  async function operation(fn: () => Promise<void>) { cancelled.current = false; setBusy(true); setError(''); try { await fn(); } catch (error) { if (!cancelled.current) setError(message(error)); } finally { setBusy(false); } }
  async function closePreview() {
    if (!busy) { setPreview(null); return; }
    cancelled.current = true;
    try { update(await api('/provider/clear', {})); setKey(''); setPreview(null); notify('Connection test cancelled and session key cleared.'); }
    catch (error) { setError(message(error)); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await operation(async () => { const next = await api<ProviderState>('/provider', { ...profile, key }); setKey(''); update(next); notify('Key supplied for this session. The endpoint has not been tested yet.'); });
  }
  return <div className="settings-section"><div className="settings-section-title"><Sparkles size={19} /><h2>Inference endpoint</h2><span className="status-badge">{state.testedAt ? 'Connection tested' : state.hasKey ? 'Key supplied · untested' : 'Not configured'}</span></div><form className="setting-content" onSubmit={event => void save(event)}><p className="muted">Use your company-approved Chat Completions endpoint. Keys are never saved to files.</p><div className="settings-fields"><label className="full-width">HTTPS base URL<input type="url" value={profile.endpoint} placeholder="https://your-approved-endpoint/v1" onChange={e => setProfile({ ...profile, endpoint: e.target.value })} required maxLength={2048} autoComplete="off" /></label><label>Model / deployment<input value={profile.model} placeholder="Your approved identifier" onChange={e => setProfile({ ...profile, model: e.target.value })} required maxLength={200} autoComplete="off" /></label><label>Key header<select value={profile.keyStyle} onChange={e => setProfile({ ...profile, keyStyle: e.target.value as Profile['keyStyle'] })}><option value="bearer">Authorization: Bearer</option><option value="api-key">api-key</option></select></label><label className="full-width">API key<span className="input-with-icon"><KeyRound size={16} /><input type="password" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} placeholder={state.hasKey ? 'Supply a key again to change these settings' : 'Held in memory for this session only'} maxLength={8192} required /></span></label></div><div className="button-row"><button className="primary" disabled={!key || busy}><KeyRound size={15} />Use for this session</button><button className="secondary" type="button" disabled={!state.hasKey || busy || !unchanged} onClick={() => void operation(async () => { setPreview(await api('/provider/probe')); })}><Plug size={15} />Test connection</button>{state.hasKey && <button className="text-button" type="button" onClick={() => void operation(async () => { update(await api('/provider/clear', {})); setKey(''); notify('Session key cleared.'); })}>Clear key</button>}</div><p className="field-hint">Settings and keys are session-only in this preview. No Windows credential storage is required.</p></form>{preview && <Modal title="Review connection test" onClose={() => void closePreview()}><p className="muted">This sends a small, potentially billable request to your configured endpoint. No project content is included.</p><dl className="probe-details"><dt>Destination</dt><dd>{preview.profile.endpoint.replace(/\/+$/, '')}/chat/completions</dd><dt>Model / deployment</dt><dd>{preview.profile.model}</dd><dt>Output limit</dt><dd>{preview.maxTokens} tokens</dd></dl><pre className="probe-text">{preview.text}</pre><div className="modal-actions"><button className="secondary" onClick={() => void closePreview()}>{busy ? 'Cancel test' : 'Cancel'}</button><button className="primary" disabled={busy} onClick={() => void operation(async () => { const result = await api<ProviderState>('/provider/test', { confirmed: true }); update(result); setPreview(null); notify('Synthetic connection test passed. Project inference is not enabled in this slice.'); })}>{busy ? <LoaderCircle className="spin" size={16} /> : <ArrowUpRight size={16} />}Send test request</button></div></Modal>}</div>;
}
