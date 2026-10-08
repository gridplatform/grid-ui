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

/**
 * One env file per mode (same rule as grid-core):
 * - development → `.env.development` only
 * - production  → `.env` only
 */
function loadSoleEnv(mode: string): Record<string, string> {
  const file =
    mode === "production"
      ? path.resolve(__dirname, ".env")
      : path.resolve(__dirname, ".env.development");
  if (!existsSync(file)) return {};
  return parseEnvFile(readFileSync(file, "utf8"));
}

export default defineConfig(({ mode }) => {
  const sole = loadSoleEnv(mode);
  if (mode === "production") {
    assertUiProductionEnv(__dirname, sole);
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
