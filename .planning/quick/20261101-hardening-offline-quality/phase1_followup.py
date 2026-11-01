from pathlib import Path

player_test_path = Path("src/app/player/__tests__/playerRouteOffline.test.tsx")
player_test = player_test_path.read_text()
old = "const mockPlayerScreen = jest.fn(() => null);"
new = "const mockPlayerScreen = jest.fn((_props: any) => null);"
if player_test.count(old) != 1:
    raise RuntimeError(f"Expected one PlayerScreen mock declaration, found {player_test.count(old)}")
player_test_path.write_text(player_test.replace(old, new, 1))

offline_test_path = Path("src/features/offline/__tests__/offlineStorage.test.ts")
offline_test = offline_test_path.read_text()
old_rebuild_setup = '''    FileSystem.__setDefaultFileSize(null);\n    const stalePath =\n      "file:///old-sandbox/finora_downloads/server-test/user-test/rebuilt.mp4";\n    const rebuiltPath =\n      "file:///mock-documents/finora_downloads/server-test/user-test/rebuilt.mp4";\n    FileSystem.__setFileSize(rebuiltPath, 123);'''
new_rebuild_setup = '''    const stalePath =\n      "file:///old-sandbox/finora_downloads/server-test/user-test/rebuilt.mp4";\n    const rebuiltPath =\n      "file:///mock-documents/finora_downloads/server-test/user-test/rebuilt.mp4";\n    (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (path: string) => ({\n      exists: path === rebuiltPath,\n      isDirectory: false,\n      uri: path,\n      size: path === rebuiltPath ? 123 : undefined\n    }));'''
if offline_test.count(old_rebuild_setup) != 1:
    raise RuntimeError(
        f"Expected one reconstructed-path setup, found {offline_test.count(old_rebuild_setup)}"
    )
offline_test_path.write_text(offline_test.replace(old_rebuild_setup, new_rebuild_setup, 1))

print("Phase 1 follow-ups applied")
