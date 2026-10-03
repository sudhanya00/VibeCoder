import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import type { Profile } from '../shared/contracts.js';
import { AppError } from './errors.js';

export function endpointUrl(input: string): URL {
  let url: URL;
  try { url = new URL(input); } catch { throw new AppError(400, 'Enter a valid HTTPS base URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new AppError(400, 'Use an HTTPS base URL without credentials, query parameters or fragments.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || (isIP(host) && !isAllowedAddress(host))) {
    throw new AppError(400, 'Loopback, link-local and metadata destinations are not allowed.');
  }
  url.pathname = url.pathname.replace(/\/+$/, '') + '/chat/completions';
  return url;
}

export function isAllowedAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const parts = address.split('.').map(Number);
    return parts[0] !== 0 && parts[0] !== 127 && parts[0] < 224
      && !(parts[0] === 169 && parts[1] === 254)
      && address !== '100.100.100.200';
  }
  if (isIP(address) === 6) {
    // Only global unicast and private ULA. This excludes loopback, mapped IPv4,
    // translation, link-local and multicast without textual-normalization traps.
    const first = parseInt(address.split(':')[0], 16);
    return (first >= 0x2000 && first <= 0x3fff) || (first >= 0xfc00 && first <= 0xfdff);
  }
  return false;
}

export const PROBE_TEXT = 'Reply with the single word OK. This is a connection test; no project context is included.';
export type Probe = (profile: Profile, key: string, signal: AbortSignal) => Promise<void>;

export const probeEndpoint: Probe = async (profile, key, signal) => {
  const url = endpointUrl(profile.endpoint);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses;
  try { addresses = await lookup(host, { all: true }); } catch { throw new AppError(502, 'The endpoint hostname could not be resolved. Check your network or VPN.'); }
  if (!addresses.length || addresses.some(item => !isAllowedAddress(item.address))) throw new AppError(400, 'The endpoint resolves to a blocked local or metadata address.');
  const address = addresses[0];
  const payload = JSON.stringify({ model: profile.model, messages: [{ role: 'user', content: PROBE_TEXT }], max_tokens: 16, stream: false });
  await new Promise<void>((resolve, reject) => {
    const req = request(url, {
      method: 'POST', signal, rejectUnauthorized: true,
      // Pin the validated address for this request while preserving TLS SNI.
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      },
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload),
        ...(profile.keyStyle === 'bearer' ? { authorization: `Bearer ${key}` } : { 'api-key': key }), },
    }, response => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 65536) req.destroy(new Error('Response limit'));
        else chunks.push(chunk);
      });
      response.on('error', () => reject(new AppError(502, 'The endpoint response was interrupted. No automatic retry was attempted.')));
      response.on('end', () => {
        const status = response.statusCode || 0;
        if (status >= 300 && status < 400) return reject(new AppError(400, 'The endpoint redirected the request. Redirects are not followed with credentials.'));
        if (status === 401 || status === 403) return reject(new AppError(400, 'The endpoint rejected the key or deployment access. Check your approved settings.'));
        if (status === 429) return reject(new AppError(429, 'The endpoint is rate limited. Retry explicitly when your provider permits.'));
        if (status !== 200) return reject(new AppError(502, `The endpoint returned HTTP ${status}. Check its Chat Completions protocol and model. Raw provider errors are not displayed.`));
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!Array.isArray(body.choices) || typeof body.choices[0]?.message?.content !== 'string') throw new Error('Unsupported shape');
          resolve();
        } catch { reject(new AppError(502, 'The endpoint did not return a supported text Chat Completions response.')); }
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error('Timeout')));
    req.on('error', () => reject(new AppError(502, signal.aborted
      ? 'Connection test cancelled.'
      : 'Connection test failed, timed out, or exceeded its response limit. Check network and TLS settings. The provider may have processed it; no retry was made.')));
    req.end(payload);
  });
};
