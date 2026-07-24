import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type VercelConfig = {
  buildCommand?: string;
  outputDirectory?: string;
  rewrites?: Array<{ source: string; destination: string }>;
};

describe("vercel deployment configuration", () => {
  it("publishes only the Vite client output with an SPA fallback", () => {
    const configPath = path.resolve(import.meta.dirname, "..", "vercel.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as VercelConfig;

    expect(config.buildCommand).toBe("pnpm exec vite build");
    expect(config.outputDirectory).toBe("dist/public");
    expect(config.rewrites).toContainEqual({
      source: "/(.*)",
      destination: "/index.html",
    });
  });
});
