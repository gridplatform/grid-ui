import { existsSync } from "fs";
import path from "path";

/**
 * Production gate for Vite build / preview (`npm run build` / `npm run prod`).
 * Hard requirements — no escape flags. Use `npm run dev` locally.
 */
export function assertUiProductionEnv(
  rootDir: string,
  sole: Record<string, string>
): void {
  const envPath = path.resolve(rootDir, ".env");
  const problems: string[] = [];

  if (!existsSync(envPath)) {
    problems.push(`.env is required for production (copy from .env.example → ${envPath})`);
  }

  const apiUrl = (sole.VITE_GRID_API_URL || "").trim();
  if (!apiUrl) {
    problems.push(
      "VITE_GRID_API_URL is required in .env (e.g. /api/v1 or https://grid.example.com/api/v1)"
    );
  }

  if (problems.length === 0) return;

  throw new Error(
    `[grid-ui] production build refused — fix .env:\n` +
      problems.map((p) => `  - ${p}`).join("\n") +
      `\n\nRequired:\n` +
      `  VITE_GRID_API_URL=/api/v1\n` +
      `\nLocal work: use npm run dev + .env.development (not npm run build / prod).`
  );
}
