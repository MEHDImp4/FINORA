#!/usr/bin/env node
/**
 * Compatibility patch for query-string@7.1.3 (CommonJS) and patched
 * decode-uri-component@0.5.1 (ESM).
 *
 * query-string@7 expects a callable CJS export. Node 22's require(ESM)
 * exposes the decoder via .default. The function itself comes from the
 * upstream patched package; this script changes only the interop wrapper.
 * Fail closed if the upstream file changes, so an SDK update is reviewed.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const modulePath = require.resolve('query-string');
const normalized = modulePath.split(path.sep).join('/');
if (!normalized.includes('/node_modules/query-string/')) {
  throw new Error('Refusing to patch unexpected query-string location: ' + modulePath);
}
const before = fs.readFileSync(modulePath, 'utf8');
const target = "const decodeComponent = require('decode-uri-component');";
const replacement = `const _decodeComponentImport = require('decode-uri-component');
const decodeComponent = typeof _decodeComponentImport === 'function'
  ? _decodeComponentImport
  : _decodeComponentImport.default;
if (typeof decodeComponent !== 'function') {
  throw new TypeError('Expected patched decode-uri-component to export a function.');
}`;
if (before.includes(replacement)) {
  console.log('query-string decoder interop is already patched.');
  process.exit(0);
}
if (!before.includes(target)) {
  throw new Error('query-string source changed; inspect upstream before updating this patch.');
}
fs.writeFileSync(modulePath, before.replace(target, replacement), 'utf8');
console.log('Patched query-string CommonJS/ESM decoder interop.');
