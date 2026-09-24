import { test, expect } from "vitest";
import { loadConfig } from "../src/config.ts";

const required = {
  ADMIN_PASSWORD: "admin-secret",
  SESSION_SECRET: "0123456789abcdef",
};

test("COOKIE_SECURE defaults to false for local use", () => {
  expect(loadConfig(required).cookieSecure).toBe(false);
  expect(loadConfig({ ...required, COOKIE_SECURE: "" }).cookieSecure).toBe(false);
  expect(loadConfig({ ...required, COOKIE_SECURE: "false" }).cookieSecure).toBe(false);
  expect(loadConfig({ ...required, COOKIE_SECURE: "0" }).cookieSecure).toBe(false);
});

test("COOKIE_SECURE can be enabled for production", () => {
  expect(loadConfig({ ...required, COOKIE_SECURE: "true" }).cookieSecure).toBe(true);
  expect(loadConfig({ ...required, COOKIE_SECURE: "1" }).cookieSecure).toBe(true);
  expect(loadConfig({ ...required, COOKIE_SECURE: "yes" }).cookieSecure).toBe(true);
});

test("TRUST_PROXY defaults to false and can be enabled", () => {
  expect(loadConfig(required).trustProxy).toBe(false);
  expect(loadConfig({ ...required, TRUST_PROXY: "true" }).trustProxy).toBe(true);
  expect(() => loadConfig({ ...required, TRUST_PROXY: "maybe" })).toThrow(/TRUST_PROXY/);
});

test("COOKIE_SECURE rejects unknown values", () => {
  expect(() => loadConfig({ ...required, COOKIE_SECURE: "secure" })).toThrow(
    /COOKIE_SECURE/,
  );
});
