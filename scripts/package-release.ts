import {createHash} from "node:crypto";
import {createReadStream} from "node:fs";
import {copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {assertReleaseVersion, releaseBaseName} from "./release-helpers.ts";

const root = path.resolve(import.meta.dir, "..");
const args = process.argv.slice(2);
const packageJson = await readJson(path.join(root, "package.json")) as {version?: unknown};
const pluginManifest = await readJson(path.join(root, ".zdp", "plugin.json")) as {
  id?: unknown;
  apiVersion?: unknown;
  version?: unknown;
  engines?: {host?: unknown; zcode?: unknown};
};

if (typeof packageJson.version !== "string") throw new Error("package.json has no version");
if (typeof pluginManifest.version !== "string") throw new Error(".zdp/plugin.json has no version");
const tag = valueAfter("--tag") ?? process.env.GITHUB_REF_NAME ?? `v${packageJson.version}`;
const version = assertReleaseVersion(tag, packageJson.version, pluginManifest.version);
assertManifest(pluginManifest);

if (args.includes("--verify-only")) {
  console.log(`Release metadata is consistent for ${tag}.`);
  process.exit(0);
}

if (process.platform !== "win32") throw new Error("Release packaging currently requires Windows");

for (const required of [
  path.join(root, "dist", "main.cjs"),
  path.join(root, "dist", "renderer.js"),
  path.join(root, ".zdp", "update.json"),
]) await requireFile(required);

const outputRoot = path.resolve(valueAfter("--output") ?? path.join(root, "dist", "release"));
const baseName = releaseBaseName(version);
const archive = path.join(outputRoot, `${baseName}.zip`);
const checksum = `${archive}.sha256`;
const feedPath = path.join(outputRoot, "extension-update.json");
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "zcode-scheduler-release-"));
const stage = path.join(temporaryRoot, "scheduler");

await rm(outputRoot, {recursive: true, force: true});
await mkdir(path.join(stage, ".zdp"), {recursive: true});
await mkdir(path.join(stage, "dist"), {recursive: true});
await mkdir(outputRoot, {recursive: true});

try {
  await Promise.all([
    copyRequired(path.join(root, ".zdp", "plugin.json"), path.join(stage, ".zdp", "plugin.json")),
    copyRequired(path.join(root, ".zdp", "update.json"), path.join(stage, ".zdp", "update.json")),
    copyRequired(path.join(root, "dist", "main.cjs"), path.join(stage, "dist", "main.cjs")),
    copyRequired(path.join(root, "dist", "renderer.js"), path.join(stage, "dist", "renderer.js")),
    copyRequired(path.join(root, "README.md"), path.join(stage, "README.md")),
    copyRequired(path.join(root, "LICENSE"), path.join(stage, "LICENSE")),
  ]);

  await compress(stage, archive);
  const digest = await sha256(archive);
  const size = (await stat(archive)).size;
  await writeFile(checksum, `${digest} *${path.basename(archive)}\n`, "utf8");
  await writeFile(feedPath, `${JSON.stringify({
    schemaVersion: 1,
    id: pluginManifest.id,
    apiVersion: pluginManifest.apiVersion,
    version,
    engines: pluginManifest.engines,
    archive: {
      url: `https://github.com/notmike101/zcode-scheduler/releases/download/${tag}/${baseName}.zip`,
      sha256: digest,
      size,
    },
    releaseUrl: `https://github.com/notmike101/zcode-scheduler/releases/tag/${tag}`,
    publishedAt: process.env.RELEASE_PUBLISHED_AT ?? new Date().toISOString(),
  }, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({tag, version, archive, checksum, feed: feedPath, sha256: digest, size}, null, 2));
} finally {
  await rm(temporaryRoot, {recursive: true, force: true});
}

function valueAfter(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function assertManifest(manifest: typeof pluginManifest): asserts manifest is {
  id: string;
  apiVersion: 1;
  version: string;
  engines: {host: string; zcode: string};
} {
  if (manifest.id !== "scheduler") throw new Error("Extension manifest id must be scheduler");
  if (manifest.apiVersion !== 1) throw new Error("Extension manifest apiVersion must be 1");
  if (!manifest.engines || typeof manifest.engines.host !== "string" || typeof manifest.engines.zcode !== "string") {
    throw new Error("Extension manifest engines are missing");
  }
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function copyRequired(source: string, destination: string): Promise<void> {
  await requireFile(source);
  await mkdir(path.dirname(destination), {recursive: true});
  await copyFile(source, destination);
}

async function requireFile(filePath: string): Promise<void> {
  const info = await stat(filePath).catch(() => undefined);
  if (!info?.isFile()) throw new Error(`Required release file is missing: ${filePath}`);
}

async function compress(source: string, destination: string): Promise<void> {
  const command = `Compress-Archive -LiteralPath ${quotePowerShell(source)} -DestinationPath ${quotePowerShell(destination)} -CompressionLevel Optimal -Force`;
  const child = Bun.spawn(["powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await child.exited;
  if (code !== 0) throw new Error(`Compress-Archive exited ${code}`);
}

function quotePowerShell(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function sha256(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}
