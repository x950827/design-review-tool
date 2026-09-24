import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

export type ProjectGit = {
  id: number;
  git_url: string;
  branch: string;
  ssh_key_path: string | null;
};

export type Variant = {
  key: string;
  label: string;
  git_path: string;
};

export type HistoryEntry = {
  sha: string;
  subject: string;
  committedAt: string;
};

function repoId(gitUrl: string): string {
  return createHash("sha256").update(gitUrl).digest("hex").slice(0, 16);
}

export function assertGitRemote(value: string): void {
  if (!value || /[\0\r\n]/.test(value) || value.startsWith("-") || value.includes("://-")) {
    throw new Error("invalid git url");
  }
  const allowed =
    value.startsWith("https://") ||
    value.startsWith("ssh://") ||
    value.startsWith("git@") ||
    value.startsWith("/");
  if (!allowed) throw new Error("invalid git url");
}

export function assertGitRevision(value: string): void {
  if (!value || value.startsWith("-") || /[\0\r\n\s]/.test(value)) {
    throw new Error("invalid branch");
  }
}

function gitEnv(sshKeyPath?: string | null): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (sshKeyPath) {
    env.GIT_SSH_COMMAND = `ssh -i ${JSON.stringify(sshKeyPath)} -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes`;
  }
  return env;
}

function runGit(args: string[], cwd: string, sshKeyPath?: string | null): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd,
      env: gitEnv(sshKeyPath),
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (c) => stdout.push(c));
    child.stderr.on("data", (c) => stderr.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString("utf8"));
        return;
      }
      reject(new Error(Buffer.concat(stderr).toString("utf8") || `git ${args[0]} failed`));
    });
  });
}

export function cloneDir(dataDir: string, gitUrl: string): string {
  return path.join(dataDir, "repos", repoId(gitUrl));
}

export function checkoutDir(dataDir: string, projectId: number, sha: string): string {
  return path.join(dataDir, "checkouts", String(projectId), sha);
}

export async function syncProject(dataDir: string, project: ProjectGit): Promise<void> {
  assertGitRemote(project.git_url);
  assertGitRevision(project.branch);
  const dest = cloneDir(dataDir, project.git_url);
  if (!fs.existsSync(path.join(dest, "HEAD"))) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await runGit(
      ["clone", "--bare", "--", project.git_url, dest],
      path.dirname(dest),
      project.ssh_key_path,
    );
    return;
  }
  await runGit(["fetch", "--prune", "origin"], dest, project.ssh_key_path);
}

function parseLog(out: string): HistoryEntry[] {
  return out
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, subject, committedAt] = line.split("\t");
      return { sha, subject, committedAt };
    });
}

export async function history(
  dataDir: string,
  project: ProjectGit,
  variants: Variant[],
): Promise<HistoryEntry[]> {
  assertGitRemote(project.git_url);
  assertGitRevision(project.branch);
  const dest = cloneDir(dataDir, project.git_url);
  const paths = [...new Set(variants.map((v) => v.git_path).filter(Boolean))];
  for (const gitPath of paths) {
    if (!gitPath || gitPath.startsWith("-") || /[\0\r\n]/.test(gitPath)) {
      throw new Error("invalid path");
    }
  }
  const formatArgs = ["log", "--format=%H%x09%s%x09%cI"];
  try {
    return parseLog(
      await runGit([...formatArgs, project.branch, "--", ...paths], dest, project.ssh_key_path),
    );
  } catch {
    return parseLog(await runGit([...formatArgs, "--", ...paths], dest, project.ssh_key_path));
  }
}

export async function checkoutSha(
  dataDir: string,
  project: ProjectGit,
  sha: string,
): Promise<string> {
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
    throw new Error("invalid sha");
  }
  const dest = checkoutDir(dataDir, project.id, sha);
  if (fs.existsSync(path.join(dest, ".ok"))) return dest;
  const gitDir = cloneDir(dataDir, project.git_url);
  fs.mkdirSync(dest, { recursive: true });
  await extractArchive(gitDir, sha, dest, project.ssh_key_path);
  fs.writeFileSync(path.join(dest, ".ok"), sha);
  return dest;
}

function extractArchive(
  gitDir: string,
  sha: string,
  dest: string,
  sshKeyPath?: string | null,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const git = spawn("git", ["--git-dir", gitDir, "archive", sha], {
      env: gitEnv(sshKeyPath),
    });
    const tar = spawn("tar", ["-x", "-C", dest]);
    git.stdout.pipe(tar.stdin!);
    const err: Buffer[] = [];
    git.stderr.on("data", (c) => err.push(c));
    tar.stderr.on("data", (c) => err.push(c));
    let gitCode: number | null = null;
    let tarCode: number | null = null;
    const finish = () => {
      if (gitCode === null || tarCode === null) return;
      if (gitCode === 0 && tarCode === 0) {
        resolve();
        return;
      }
      reject(new Error(Buffer.concat(err).toString("utf8") || "git archive failed"));
    };
    git.on("error", reject);
    tar.on("error", reject);
    git.on("close", (code) => {
      gitCode = code ?? 1;
      finish();
    });
    tar.on("close", (code) => {
      tarCode = code ?? 1;
      finish();
    });
  });
}

export function loadProjectGit(db: Database.Database, projectId: number): ProjectGit {
  const row = db
    .prepare("SELECT id, git_url, branch, ssh_key_path FROM projects WHERE id = ?")
    .get(projectId) as ProjectGit | undefined;
  if (!row) throw new Error("project not found");
  return row;
}

export function loadVariants(db: Database.Database, projectId: number): Variant[] {
  return db
    .prepare("SELECT key, label, git_path FROM variants WHERE project_id = ? ORDER BY id")
    .all(projectId) as Variant[];
}
