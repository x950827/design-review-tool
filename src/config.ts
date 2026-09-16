import path from "node:path";

export type Config = {
  host: string;
  port: number;
  adminPassword: string;
  sessionSecret: string;
  dataDir: string;
  sshKeyPath?: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const adminPassword = env.ADMIN_PASSWORD;
  const sessionSecret = env.SESSION_SECRET;
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is required");
  }
  if (!sessionSecret || sessionSecret.length < 16) {
    throw new Error("SESSION_SECRET must be at least 16 characters");
  }
  return {
    host: env.HOST ?? "127.0.0.1",
    port: Number(env.PORT ?? "8787"),
    adminPassword,
    sessionSecret,
    dataDir: path.resolve(env.DATA_DIR ?? "data"),
    sshKeyPath: env.GIT_SSH_KEY,
  };
}
