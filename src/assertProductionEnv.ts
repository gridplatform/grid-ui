import { existsSync } from "fs";
import path from "path";

function isCi(): boolean {
  return (
    process.env.CI === "true" ||
    process.env.CI === "1" ||
    process.env.GITHUB_ACTIONS === "true"
  );
}

/**
 * Production gate for Vite build / preview (`npm run build` / `npm run prod`).
 * Local: requires `.env` with VITE_GRID_API_URL.
 * CI: `.env` may be created from `.env.example` (gitignored `.env` is not in the repo).
 */
export function assertUiProductionEnv(
  rootDir: string,
  sole: Record<string, string>,
  opts: { usedExampleFallback?: boolean } = {}
): void {
  const envPath = path.resolve(rootDir, ".env");
  const problems: string[] = [];

  const hasEnvFile = existsSync(envPath);
  if (!hasEnvFile && !opts.usedExampleFallback && !isCi()) {
    problems.push(
      `.env is required for production (copy from .env.example → ${envPath})`
    );
  }

  const apiUrl = (
    sole.VITE_GRID_API_URL ||
    process.env.VITE_GRID_API_URL ||
    ""
  ).trim();
  if (!apiUrl) {
    problems.push(
      "VITE_GRID_API_URL is required (set in .env, e.g. /api/v1 or https://grid.example.com/api/v1)"
    );
  }

  if (problems.length === 0) return;

  throw new Error(
    `[grid-ui] production build refused — fix .env:\n` +
      problems.map((p) => `  - ${p}`).join("\n") +
      `\n\nWhat I need:\n` +
      `  VITE_GRID_API_URL=/api/v1\n` +
      `\n` +
      `  cp .env.example .env\n` +
      `\nLocal work: use npm run dev + .env.development (not npm run build / prod).\n` +
      `CI: workflows copy .env.example → .env before build.`
  );
}
