import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { existsSync, readFileSync } from "fs";
import { assertUiProductionEnv } from "./src/assertProductionEnv";

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8")) as {
  version?: string;
};

function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function isCi(): boolean {
  return (
    process.env.CI === "true" ||
    process.env.CI === "1" ||
    process.env.GITHUB_ACTIONS === "true"
  );
}

/**
 * One env file per mode (same rule as grid-core):
 * - development → `.env.development` only
 * - production  → `.env` only
 *
 * CI: `.env` is gitignored — fall back to committed `.env.example` (same values).
 */
function loadSoleEnv(mode: string): {
  sole: Record<string, string>;
  usedExampleFallback: boolean;
} {
  if (mode !== "production") {
    const devFile = path.resolve(__dirname, ".env.development");
    if (!existsSync(devFile)) return { sole: {}, usedExampleFallback: false };
    return {
      sole: parseEnvFile(readFileSync(devFile, "utf8")),
      usedExampleFallback: false,
    };
  }

  const envFile = path.resolve(__dirname, ".env");
  if (existsSync(envFile)) {
    return {
      sole: parseEnvFile(readFileSync(envFile, "utf8")),
      usedExampleFallback: false,
    };
  }

  const example = path.resolve(__dirname, ".env.example");
  if (isCi() && existsSync(example)) {
    console.warn(
      "[grid-ui] CI: .env missing — using .env.example (VITE_GRID_API_URL=/api/v1)"
    );
    return {
      sole: parseEnvFile(readFileSync(example, "utf8")),
      usedExampleFallback: true,
    };
  }

  // Allow explicit env injection (Docker ARG / workflow env) without a file.
  if (process.env.VITE_GRID_API_URL?.trim()) {
    return {
      sole: { VITE_GRID_API_URL: process.env.VITE_GRID_API_URL.trim() },
      usedExampleFallback: false,
    };
  }

  return { sole: {}, usedExampleFallback: false };
}

export default defineConfig(({ mode }) => {
  const { sole, usedExampleFallback } = loadSoleEnv(mode);
  if (mode === "production") {
    assertUiProductionEnv(__dirname, sole, { usedExampleFallback });
  }

  const defineEnv = Object.fromEntries(
    Object.entries(sole)
      .filter(([key]) => key.startsWith("VITE_"))
      .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
  );

  return {
    // Prevent Vite from merging multiple .env* files.
    envDir: path.resolve(__dirname, ".vite-empty-env"),
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    define: {
      __GRID_UI_VERSION__: JSON.stringify(pkg.version || "0.0.0"),
      ...defineEnv,
    },
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
