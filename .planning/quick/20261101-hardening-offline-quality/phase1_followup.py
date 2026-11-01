from pathlib import Path

path = Path("src/app/player/__tests__/playerRouteOffline.test.tsx")
text = path.read_text()
old = "const mockPlayerScreen = jest.fn(() => null);"
new = "const mockPlayerScreen = jest.fn((_props: any) => null);"
if text.count(old) != 1:
    raise RuntimeError(f"Expected one PlayerScreen mock declaration, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
print("Phase 1 typing follow-up applied")
