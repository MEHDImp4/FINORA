from pathlib import Path


def replace_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one occurrence, found {count}: {old[:100]!r}")
    return text.replace(old, new, 1)


player_test_path = Path("src/app/player/__tests__/playerRouteOffline.test.tsx")
player_test = player_test_path.read_text()
player_test = replace_once(
    player_test,
    "const mockPlayerScreen = jest.fn(() => null);",
    "const mockPlayerScreen = jest.fn((_props: any) => null);",
)
player_test_path.write_text(player_test)

offline_test_path = Path("src/features/offline/__tests__/offlineStorage.test.ts")
offline_test = offline_test_path.read_text()
old_rebuild_setup = '''    FileSystem.__setDefaultFileSize(null);\n    const stalePath =\n      "file:///old-sandbox/finora_downloads/server-test/user-test/rebuilt.mp4";\n    const rebuiltPath =\n      "file:///mock-documents/finora_downloads/server-test/user-test/rebuilt.mp4";\n    FileSystem.__setFileSize(rebuiltPath, 123);'''
new_rebuild_setup = '''    const stalePath =\n      "file:///old-sandbox/finora_downloads/server-test/user-test/rebuilt.mp4";\n    const rebuiltPath =\n      "file:///mock-documents/finora_downloads/server-test/user-test/rebuilt.mp4";\n    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (path: string) => ({\n      exists: path === rebuiltPath,\n      isDirectory: false,\n      uri: path,\n      size: path === rebuiltPath ? 123 : undefined\n    }));'''
offline_test = replace_once(offline_test, old_rebuild_setup, new_rebuild_setup)
offline_test_path.write_text(offline_test)

modal_path = Path("src/features/settings/components/ServerConnectModal.tsx")
modal = modal_path.read_text()
modal = replace_once(
    modal,
    'import React, { useState, useEffect } from "react";',
    'import React, { useState, useEffect, useRef } from "react";',
)
modal = replace_once(
    modal,
    '''  const [errorMsg, setErrorMsg] = useState<string | null>(null);\n  const [successMsg, setSuccessMsg] = useState<string | null>(null);''',
    '''  const [errorMsg, setErrorMsg] = useState<string | null>(null);\n  const [successMsg, setSuccessMsg] = useState<string | null>(null);\n  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n\n  const scheduleClose = (callback: () => void, delayMs: number) => {\n    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);\n    closeTimerRef.current = setTimeout(() => {\n      closeTimerRef.current = null;\n      callback();\n    }, delayMs);\n  };\n\n  const scheduleSuccessClear = () => {\n    if (successTimerRef.current) clearTimeout(successTimerRef.current);\n    successTimerRef.current = setTimeout(() => {\n      successTimerRef.current = null;\n      setSuccessMsg(null);\n    }, 2000);\n  };\n\n  useEffect(() => {\n    return () => {\n      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);\n      if (successTimerRef.current) clearTimeout(successTimerRef.current);\n    };\n  }, []);''',
)
modal = replace_once(
    modal,
    '''      setSuccessMsg(t("settings.serverConnectSuccess"));\n      setTimeout(() => {\n        onClose();\n      }, 500);''',
    '''      setSuccessMsg(t("settings.serverConnectSuccess"));\n      scheduleClose(onClose, 500);''',
)
modal = replace_once(
    modal,
    '''    setSuccessMsg(t("settings.serverConnectSwitchSuccess"));\n    setTimeout(() => {\n      onClose();\n      onServerChanged?.(server.url);\n    }, 400);''',
    '''    setSuccessMsg(t("settings.serverConnectSwitchSuccess"));\n    scheduleClose(() => {\n      onClose();\n      onServerChanged?.(server.url);\n    }, 400);''',
)
modal = replace_once(
    modal,
    '''    setSuccessMsg(t("settings.serverConnectSwitchSuccess"));\n    setTimeout(() => {\n      onClose();\n      onServerChanged?.(result!.url);\n    }, 400);''',
    '''    setSuccessMsg(t("settings.serverConnectSwitchSuccess"));\n    scheduleClose(() => {\n      onClose();\n      onServerChanged?.(result!.url);\n    }, 400);''',
)
modal = replace_once(
    modal,
    '''      setSuccessMsg(t("settings.serverConnectRemoveA11y"));\n      setTimeout(() => setSuccessMsg(null), 2000);''',
    '''      setSuccessMsg(t("settings.serverConnectRemoveA11y"));\n      scheduleSuccessClear();''',
)
modal_path.write_text(modal)

print("Phase 1 follow-ups applied")
