const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadTsModule(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const result = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  });
  const m = { exports: {} };
  const fn = new Function('exports', 'module', 'require', result.outputText);
  fn(m.exports, m, require);
  return m.exports;
}

function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function extractPlaceholders(text) {
  if (typeof text !== 'string') return [];
  const matches = text.match(/\{{1,2}([a-zA-Z0-9_-]+)\}{1,2}/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/[\{\}]/g, '')).sort();
}

/**
 * Recursively lists every .ts/.tsx file under src/.
 */
function listSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Tests intentionally reference keys that do not exist.
      if (entry.name === '__tests__') continue;
      results.push(...listSourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Finds statically referenced translation keys: t("a.b"), translate('a.b').
 * Dynamic keys (template literals, concatenation, variables) are intentionally
 * not resolved — this catches the BLK-07 class of bug where a literal key is
 * used in code but never defined in the dictionaries.
 */
function scanReferencedKeys(targetDir) {
  const references = new Map(); // key -> first "relative/file:line"
  const srcDir = targetDir || path.resolve(__dirname, '../src');

  const pattern = /\b(?:t|translate)\s*\(\s*(["'])([^"'\\]+)\1/g;

  for (const file of listSourceFiles(srcDir)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(lines[i])) !== null) {
        const key = match[2];
        if (!key || key.includes(' ') || key.includes('://') || key.startsWith('data:')) continue;
        if (!references.has(key)) {
          references.set(key, `${path.relative(path.resolve(__dirname, '..'), file)}:${i + 1}`);
        }
      }
    }
  }

  return references;
}

function main() {
  const enPath = path.resolve(__dirname, '../src/i18n/locales/en.ts');
  const frPath = path.resolve(__dirname, '../src/i18n/locales/fr.ts');

  console.log('[i18n:check] Loading English and French locale definitions...');
  const enModule = loadTsModule(enPath);
  const frModule = loadTsModule(frPath);

  const enDict = enModule.en;
  const frDict = frModule.fr;

  if (!enDict || !frDict) {
    console.error('Failed to load en or fr translation dictionaries.');
    process.exit(1);
  }

  const enFlat = flattenKeys(enDict);
  const frFlat = flattenKeys(frDict);

  const enKeys = new Set(Object.keys(enFlat));
  const frKeys = new Set(Object.keys(frFlat));

  const missingInFr = [];
  const missingInEn = [];
  const emptyValues = [];
  const placeholderMismatches = [];

  for (const key of enKeys) {
    if (!frKeys.has(key)) {
      missingInFr.push(key);
    } else {
      // Check for empty values
      if (typeof enFlat[key] !== 'string' || enFlat[key].trim() === '') {
        emptyValues.push(`en: ${key}`);
      }
      if (typeof frFlat[key] !== 'string' || frFlat[key].trim() === '') {
        emptyValues.push(`fr: ${key}`);
      }

      // Check placeholder parity
      const enPlaceholders = extractPlaceholders(enFlat[key]);
      const frPlaceholders = extractPlaceholders(frFlat[key]);

      const enSet = new Set(enPlaceholders);
      const frSet = new Set(frPlaceholders);

      const missingInFrParams = [...enSet].filter(p => !frSet.has(p));
      const extraInFrParams = [...frSet].filter(p => !enSet.has(p));

      if (missingInFrParams.length > 0 || extraInFrParams.length > 0) {
        placeholderMismatches.push({
          key,
          enPlaceholders,
          frPlaceholders,
          missingInFrParams,
          extraInFrParams
        });
      }
    }
  }

  for (const key of frKeys) {
    if (!enKeys.has(key)) {
      missingInEn.push(key);
    }
  }

  // Every key literally referenced in code must exist in the dictionary.
  const referencedKeys = scanReferencedKeys();
  const undefinedKeys = [...referencedKeys.entries()].filter(([key]) => !enKeys.has(key));

  let hasErrors = false;

  if (undefinedKeys.length > 0) {
    hasErrors = true;
    console.error(`\n❌ Referenced but undefined keys (${undefinedKeys.length}):`);
    undefinedKeys.forEach(([key, location]) => console.error(`  - ${key}  (${location})`));
  }

  if (missingInFr.length > 0) {
    hasErrors = true;
    console.error(`\n❌ Missing in FR (${missingInFr.length} keys):`);
    missingInFr.forEach(k => console.error(`  - ${k}`));
  }

  if (missingInEn.length > 0) {
    hasErrors = true;
    console.error(`\n❌ Missing in EN (${missingInEn.length} keys):`);
    missingInEn.forEach(k => console.error(`  - ${k}`));
  }

  if (emptyValues.length > 0) {
    hasErrors = true;
    console.error(`\n❌ Empty translations (${emptyValues.length} occurrences):`);
    emptyValues.forEach(e => console.error(`  - ${e}`));
  }

  if (placeholderMismatches.length > 0) {
    hasErrors = true;
    console.error(`\n❌ Placeholder parameter mismatches (${placeholderMismatches.length} occurrences):`);
    placeholderMismatches.forEach(m => {
      console.error(`  - ${m.key}: EN has [${m.enPlaceholders.join(', ')}], FR has [${m.frPlaceholders.join(', ')}]`);
    });
  }

  if (hasErrors) {
    console.error('\n[i18n:check] Check failed with errors.');
    process.exit(1);
  }

  console.log(`\n✅ [i18n:check] All ${enKeys.size} translation keys matched with 100% parity between EN and FR!`);
  console.log(`✅ [i18n:check] No empty values and all parameter placeholders match.`);
  process.exit(0);
}

// Exported for the checker's own unit tests.
module.exports = { flattenKeys, extractPlaceholders, scanReferencedKeys };

if (require.main === module) {
  main();
}
