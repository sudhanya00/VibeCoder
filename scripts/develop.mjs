// Serve the production security boundary during early development, rather than
// exposing workspace APIs through an unauthenticated development proxy.
import './build.mjs';
await import('../dist/server/index.js');
