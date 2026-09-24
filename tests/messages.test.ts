import { expect, test } from "vitest";
import { en, ru, translateError, type MessageKey } from "../web/src/messages.ts";

test("russian covers every english key", () => {
  const missing = (Object.keys(en) as MessageKey[]).filter((key) => ru[key] !== "" && !ru[key]);
  expect(missing).toEqual([]);
});

test("known API errors map to message keys", () => {
  const t = (key: MessageKey) => en[key];
  expect(translateError("invalid credentials", t)).toBe(en.errInvalidCredentials);
  expect(translateError("sync failed", t)).toBe(en.errSyncFailed);
  expect(translateError("slug taken", t)).toBe("slug taken");
});
