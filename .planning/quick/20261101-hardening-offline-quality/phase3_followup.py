from pathlib import Path


def replace_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one occurrence, found {count}: {old[:100]!r}")
    return text.replace(old, new, 1)

path = Path("scripts/audit-production.js")
text = path.read_text()
needle = "const ALLOWLIST = new Map([\n"
addition = '''const ALLOWLIST = new Map([\n  [\n    'GHSA-MRHX-C7XC-M3W5',\n    {\n      expires: '2026-11-15',\n      reason:\n        'Zod <4.6.6 is pulled by the Expo SDK 57 CLI line. Expo CLI currently declares Zod 3.x and there is no compatible patched 3.x release; forcing Zod 4 into the CLI is not a safe consumer-side remediation.',\n    },\n  ],\n  [\n    'GHSA-QR28-FPJM-WQ7F',\n    {\n      expires: '2026-11-08',\n      reason:\n        'decode-uri-component is reached transitively through Expo Router/query-string. A patched 0.5.1 exists, but the SDK 57 dependency chain has not yet moved to a compatible range; keep this exception short-lived while upstream catches up.',\n    },\n  ],\n'''
text = replace_once(text, needle, addition)
path.write_text(text)

doc = Path(".planning/quick/20261101-hardening-offline-quality/NATIVE_COMPATIBILITY.md")
content = doc.read_text()
content += '''\n## Temporary production-audit exceptions\n\nThe audit gate remains fail-closed. Two newly published advisories are temporarily allowlisted with explicit expiries rather than disabling the audit:\n\n- `GHSA-MRHX-C7XC-M3W5` through **2026-11-15**: Expo SDK 57 CLI currently resolves Zod 3.x, while the advisory is fixed only in Zod 4.6.6+; a consumer override would be a major-version ABI/API gamble in build tooling.\n- `GHSA-QR28-FPJM-WQ7F` through **2026-11-08**: `decode-uri-component` has a patched 0.5.1, but the affected copy is transitive through Expo Router/query-string. The shorter expiry forces revalidation quickly instead of normalizing the exception.\n\nThese entries are intentionally time-bounded; expiry makes CI fail until the dependency graph is re-evaluated.\n'''
doc.write_text(content)
print("Phase 3 audit follow-up applied")
