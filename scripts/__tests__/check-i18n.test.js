const fs = require("fs");
const os = require("os");
const path = require("path");

const { flattenKeys, scanReferencedKeys, extractPlaceholders } = require("../check-i18n");

describe("i18n checker (BLK-07 guard)", () => {
  it("detects a statically referenced key that is missing from the dictionary", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "finora-i18n-"));
    try {
      fs.mkdirSync(path.join(dir, "feature"));
      fs.writeFileSync(
        path.join(dir, "feature", "Screen.tsx"),
        [
          'import { useTranslation } from "x";',
          "const { t } = useTranslation();",
          'const a = t("common.retry");',
          'const b = translate("library.newMissingKey");'
        ].join("\n")
      );

      const references = scanReferencedKeys(dir);
      expect(references.has("common.retry")).toBe(true);
      expect(references.has("library.newMissingKey")).toBe(true);

      const dictionary = flattenKeys({ common: { retry: "Retry" } });
      const dictionaryKeys = new Set(Object.keys(dictionary));
      const undefinedKeys = [...references.keys()].filter((key) => !dictionaryKeys.has(key));

      expect(undefinedKeys).toEqual(["library.newMissingKey"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores dynamic keys and test fixtures in the real source tree", () => {
    const references = scanReferencedKeys(path.resolve(__dirname, "../../src"));
    expect(references.has("common.retry")).toBe(true);
    // Fixtures used by i18n tests must never be treated as real references.
    expect(references.has("common.nonExistentKey")).toBe(false);
    expect(references.has("some.totally.missing.key")).toBe(false);
  });

  it("keeps placeholder extraction strict enough for parity checks", () => {
    expect(extractPlaceholders("Hello {name}")).toEqual(["name"]);
    expect(extractPlaceholders("No placeholders")).toEqual([]);
  });
});
