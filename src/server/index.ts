import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { PrivateDraftStore, privateStateDirectory } from './private-drafts.js';

const runtime = createApp({ uiRoot: fileURLToPath(new URL('../ui/', import.meta.url)), draftStore: new PrivateDraftStore(privateStateDirectory()) });
const port = Number(process.env.VIBECODER_PORT ?? 0);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid VIBECODER_PORT');
await runtime.app.listen({ host: '127.0.0.1', port });
const address = runtime.app.server.address();
if (!address || typeof address === 'string') throw new Error('No listening address');
runtime.setOrigin(`http://127.0.0.1:${address.port}`);
const url = runtime.pairingUrl();
console.log(`VibeCoder is running at http://127.0.0.1:${address.port}`);
console.log('Project files stay read-only. Drafts use private local storage when available; endpoint keys stay in memory.');
if (process.argv.includes('--no-open')) {
  // Intentional local pairing instruction, not an HTTP or persistent log.
  console.log(`Open this one-use link within two minutes: ${url}`);
} else if (process.platform === 'win32') {
  const browser = spawn('explorer.exe', [url], { windowsHide: true, detached: true, stdio: 'ignore' });
  browser.on('error', () => console.log(`Browser launch failed. Open the one-use pairing link: ${url}`));
  browser.unref();
} else console.log(`Open this one-use link within two minutes: ${url}`);
const stop = async () => { await runtime.app.close(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
