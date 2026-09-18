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

  let hasErrors = false;

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

main();
