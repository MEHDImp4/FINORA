#!/usr/bin/env node

/**
 * Production dependency audit gate.
 *
 * Fails closed on every HIGH/CRITICAL advisory except explicitly allowlisted,
 * time-bounded upstream advisories that currently have no non-breaking fix.
 *
 * Temporary exception:
 * - GHSA-86w9-cpqp-85rv (node-forge)
 *   Transitive through Expo CLI/build tooling. Revalidate or remove by expiry.
 */

const { spawnSync } = require('node:child_process');

const ALLOWLIST = new Map([
  [
    'GHSA-86W9-CPQP-85RV',
    {
      expires: '2026-11-15',
      reason:
        'node-forge is pulled transitively by Expo CLI/build tooling; no patched npm release is currently available without breaking the Expo SDK 57 release line.',
    },
  ],
]);

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCommand, ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
});

if (result.error) {
  console.error('Production audit could not start:', result.error.message);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout || '{}');
} catch (error) {
  console.error('Production audit returned invalid JSON.');
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

if (report.error) {
  console.error('Production audit failed:', report.error.summary || report.error.message || report.error);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};
const severe = new Set(['high', 'critical']);

function advisoryId(advisory) {
  const haystack = [advisory.url, advisory.title, advisory.name]
    .filter(Boolean)
    .join(' ');
  const match = haystack.match(/GHSA-[0-9a-z-]+/i);
  return match ? match[0].toUpperCase() : null;
}

function collectLeafAdvisories(name, seen = new Set()) {
  if (seen.has(name)) return [];
  const vulnerability = vulnerabilities[name];
  if (!vulnerability) {
    return [{ severity: 'high', title: `Unresolved dependency advisory: ${name}` }];
  }

  const nextSeen = new Set(seen);
  nextSeen.add(name);
  const leaves = [];

  for (const via of vulnerability.via || []) {
    if (typeof via === 'string') {
      leaves.push(...collectLeafAdvisories(via, nextSeen));
    } else if (via && typeof via === 'object') {
      leaves.push(via);
    }
  }

  return leaves;
}

function isActiveException(id) {
  const exception = id ? ALLOWLIST.get(id) : null;
  if (!exception) return false;

  const expiry = new Date(`${exception.expires}T23:59:59Z`);
  return Number.isFinite(expiry.getTime()) && new Date() <= expiry;
}

const blocking = [];
const allowed = [];

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (!severe.has(vulnerability.severity)) continue;

  const severeLeaves = collectLeafAdvisories(name).filter((entry) =>
    severe.has(entry.severity)
  );

  const ids = [...new Set(severeLeaves.map(advisoryId).filter(Boolean))];
  const unknownSevereLeaf = severeLeaves.some((entry) => !advisoryId(entry));
  const fullyAllowlisted =
    severeLeaves.length > 0 &&
    !unknownSevereLeaf &&
    ids.length > 0 &&
    ids.every(isActiveException);

  if (fullyAllowlisted) {
    allowed.push({ name, severity: vulnerability.severity, ids });
  } else {
    blocking.push({
      name,
      severity: vulnerability.severity,
      ids,
      titles: severeLeaves.map((entry) => entry.title).filter(Boolean),
    });
  }
}

const metadata = report.metadata?.vulnerabilities || {};
console.log(
  `npm audit summary: ${metadata.info || 0} info, ${metadata.low || 0} low, ${metadata.moderate || 0} moderate, ${metadata.high || 0} high, ${metadata.critical || 0} critical.`
);

if (allowed.length > 0) {
  console.warn('\nTemporary, scoped security exception(s):');
  for (const item of allowed) {
    console.warn(
      `- ${item.name} (${item.severity}) -> ${item.ids.join(', ')}`
    );
  }

  for (const id of [...new Set(allowed.flatMap((item) => item.ids))]) {
    const exception = ALLOWLIST.get(id);
    console.warn(
      `  ${id}: allowed through ${exception.expires}. ${exception.reason}`
    );
  }
}

if (blocking.length > 0) {
  console.error('\nBlocking HIGH/CRITICAL production vulnerabilities:');
  for (const item of blocking) {
    const details = item.ids.length
      ? item.ids.join(', ')
      : item.titles.join(' | ') || 'unknown advisory';
    console.error(`- ${item.name} (${item.severity}): ${details}`);
  }
  process.exit(1);
}

console.log('\nProduction dependency audit gate passed.');
