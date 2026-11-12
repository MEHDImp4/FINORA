#!/usr/bin/env node
// Regression smoke test: security patches must not break the Expo CLI or routing.
const assert = require('node:assert/strict');

const queryString = require('query-string');
assert.equal(queryString.stringify({ source: 'Jellyfin', id: 42 }), 'id=42&source=Jellyfin');
const parsed = queryString.parse('source=Jellyfin&id=42');
assert.equal(parsed.source, 'Jellyfin');
assert.equal(parsed.id, '42');

const forge = require('node-forge');
assert.equal(typeof forge.pki.rsa.generateKeyPair, 'function');

const { z } = require('zod');
assert.equal(z.object({ name: z.string() }).safeParse({ name: 'FINORA' }).success, true);

console.log('Security dependency interoperability smoke test passed.');
