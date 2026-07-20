import {mkdir, rm} from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const dist = path.join(root, "dist");

await rm(dist, {recursive: true, force: true});
await mkdir(dist, {recursive: true});

await build({
  entrypoints: [path.join(root, "src", "main.ts")],
  outdir: dist,
  target: "node",
  format: "cjs",
  naming: "[name].cjs",
});

await build({
  entrypoints: [path.join(root, "src", "renderer.tsx")],
  outdir: dist,
  target: "browser",
  format: "iife",
  naming: "[name].js",
  loader: {".css": "text"},
});

console.log(`Built Scheduler to ${dist}`);

async function build(options: Bun.BuildConfig): Promise<void> {
  const result = await Bun.build({
    sourcemap: "external",
    minify: false,
    ...options,
  });
  if (!result.success) throw new AggregateError(result.logs, "Bun build failed");
}
