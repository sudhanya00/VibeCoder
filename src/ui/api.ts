let sessionToken = '';
const SESSION_SLOT = 'vibecoder-local-session';
function remember(token: string) {
  sessionToken = token;
  // This is an expiring loopback capability, never an inference key or content.
  // Tab storage lets an accidental refresh retain the running local session.
  try { if (token) sessionStorage.setItem(SESSION_SLOT, token); else sessionStorage.removeItem(SESSION_SLOT); } catch { /* Memory-only pairing remains usable. */ }
}
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(route: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'omit', cache: 'no-store',
    headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  if (!response.ok) {
    if (response.status === 401) remember('');
    throw new ApiError(value.error ?? 'The request failed.', response.status);
  }
  return value as T;
}

export async function pair(): Promise<void> {
  const token = new URLSearchParams(location.hash.slice(1)).get('pair');
  history.replaceState(null, '', location.pathname);
  if (!token) {
    try { sessionToken = sessionStorage.getItem(SESSION_SLOT) ?? ''; } catch { /* Pair explicitly when storage is disabled. */ }
    if (sessionToken) return;
    throw new ApiError('Open the one-use link from the VibeCoder launcher to pair this browser.', 401);
  }
  const result = await api<{ token: string }>('/pair', { token });
  remember(result.token);
}

export function forgetSession() { remember(''); }
