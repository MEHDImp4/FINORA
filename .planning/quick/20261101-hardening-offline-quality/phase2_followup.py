from pathlib import Path


def replace_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one occurrence, found {count}: {old[:100]!r}")
    return text.replace(old, new, 1)

path = Path("src/core/jellyfin/__tests__/serverIdentityGate.test.ts")
text = path.read_text()
text = replace_once(
    text,
    'import { AuthRepository } from "../authRepository";',
    'import { AuthRepository, ACTIVE_SESSION_STORAGE_KEY, TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY } from "../authRepository";'
)
text = replace_once(
    text,
    '''  const prefStorage = {\n    getItem: jest.fn().mockResolvedValue({\n      userId: "user-1",\n      userName: "LanUser",\n      serverId,\n      serverUrl,\n      lastActiveAt: 1\n    }),\n    setItem: jest.fn(),\n    removeItem: jest.fn(),\n    clear: jest.fn()\n  };''',
    '''  const prefStorage = {\n    getItem: jest.fn(async (key: string) => {\n      if (key === ACTIVE_SESSION_STORAGE_KEY) {\n        return {\n          userId: "user-1",\n          userName: "LanUser",\n          serverId,\n          serverUrl,\n          lastActiveAt: 1\n        };\n      }\n      if (key === TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY && serverUrl.startsWith("http://")) {\n        return [{ serverId, normalizedUrl: serverUrl, approvedAt: 1 }];\n      }\n      if (key === "finora_saved_servers") return [];\n      return null;\n    }),\n    setItem: jest.fn(),\n    removeItem: jest.fn(),\n    clear: jest.fn()\n  };'''
)
path.write_text(text)
print("Phase 2 identity-gate compatibility tests patched")
