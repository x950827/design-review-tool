import { expect, test } from "vitest";
import { resolveLocale } from "../web/src/locale.ts";

test("saved en or ru wins over the browser list", () => {
  expect(resolveLocale("en", ["ru-RU", "en"])).toBe("en");
  expect(resolveLocale("ru", ["en-US"])).toBe("ru");
});

test("a Russian first browser language selects ru", () => {
  expect(resolveLocale(null, ["ru-RU", "en"])).toBe("ru");
  expect(resolveLocale("nope", ["ru"])).toBe("ru");
});

test("any other first browser language selects en", () => {
  expect(resolveLocale(null, ["en-US", "ru"])).toBe("en");
  expect(resolveLocale(null, [])).toBe("en");
});
