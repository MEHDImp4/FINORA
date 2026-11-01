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

modal_test_path = Path("src/features/settings/components/__tests__/ServerConnectModal.test.tsx")
modal_test = modal_test_path.read_text()
modal_test = replace_once(
    modal_test,
    '''  const mockSaveServer = jest.fn().mockResolvedValue(undefined);\n  const mockRemoveServer = jest.fn().mockResolvedValue(undefined);\n\n  beforeEach(() => {''',
    '''  const mockSaveServer = jest.fn().mockResolvedValue(undefined);\n  const mockRemoveServer = jest.fn().mockResolvedValue(undefined);\n  let component: any;\n\n  beforeEach(() => {''',
)
modal_test = modal_test.replace("    let component: any;\n", "")
modal_test = replace_once(
    modal_test,
    '''  });\n\n  it("renders saved servers list and active server badge", async () => {''',
    '''  });\n\n  afterEach(() => {\n    if (component) {\n      act(() => component.unmount());\n      component = undefined;\n    }\n    jest.useRealTimers();\n  });\n\n  it("renders saved servers list and active server badge", async () => {''',
)
modal_test = replace_once(
    modal_test,
    '''  it("removes server when trash button is clicked", async () => {\n    await act(async () => {''',
    '''  it("removes server when trash button is clicked", async () => {\n    jest.useFakeTimers();\n\n    await act(async () => {''',
)
modal_test = replace_once(
    modal_test,
    '''    expect(mockRemoveServer).toHaveBeenCalled();\n  });''',
    '''    expect(mockRemoveServer).toHaveBeenCalled();\n\n    act(() => {\n      jest.advanceTimersByTime(2000);\n    });\n  });''',
)
modal_test_path.write_text(modal_test)

subtitle_test_path = Path("src/features/player/__tests__/FinoraSubtitleOverlay.test.tsx")
subtitle_test = subtitle_test_path.read_text()
subtitle_test = replace_once(
    subtitle_test,
    '''describe("FinoraSubtitleOverlay", () => {\n  beforeEach(() => {''',
    '''describe("FinoraSubtitleOverlay", () => {\n  let root: any;\n\n  beforeEach(() => {''',
)
subtitle_test = subtitle_test.replace("    let root: any;\n", "")
subtitle_test = replace_once(
    subtitle_test,
    '''  });\n\n  const sampleCues = [''',
    '''  });\n\n  afterEach(() => {\n    if (root) {\n      act(() => root.unmount());\n      root = undefined;\n    }\n  });\n\n  const sampleCues = [''',
)
subtitle_test_path.write_text(subtitle_test)

print("Phase 1 follow-ups applied")
