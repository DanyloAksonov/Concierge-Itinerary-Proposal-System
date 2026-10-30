import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestProject } from "vitest/node";

/** Migrates one template SQLite DB per test run; tests copy it to get an isolated database. */
export default function setup(project: TestProject) {
  const dir = mkdtempSync(join(tmpdir(), "concierge-tests-"));
  const templatePath = join(dir, "template.db");

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: `file:${templatePath}` },
    stdio: "ignore",
  });
  project.provide("templateDbPath", templatePath);

  return () => rmSync(dir, { recursive: true, force: true });
}

declare module "vitest" {
  export interface ProvidedContext {
    templateDbPath: string;
  }
}
