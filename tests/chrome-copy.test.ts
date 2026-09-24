import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

test("chrome source keeps russian copy inside messages.ts", () => {
  const hits = files("web/src")
    .filter((file) => !file.endsWith(`${path.sep}messages.ts`))
    .filter((file) => /[А-Яа-яЁё]/.test(fs.readFileSync(file, "utf8")));
  expect(hits).toEqual([]);
});
