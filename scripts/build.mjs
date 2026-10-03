import { execFileSync } from 'node:child_process';
const run = (file, args) => execFileSync(process.execPath, [file, ...args], { stdio: 'inherit' });
run('node_modules/typescript/bin/tsc', ['--noEmit']);
run('node_modules/typescript/bin/tsc', ['-p', 'tsconfig.server.json']);
run('node_modules/vite/bin/vite.js', ['build']);
