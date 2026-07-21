import {afterEach, describe, expect, test} from "bun:test";
import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import type {ExtensionContext, ExtensionTaskSpec} from "@notmike101/zcode-extension-sdk/main";
import {SchedulerPlugin} from "../src/main.ts";

type LegacySchedulerContext = Omit<ExtensionContext, "zcode"> & {
  zcode: Pick<ExtensionContext["zcode"], "readWorkspaceState"> & {
    tasks: Pick<ExtensionContext["zcode"]["tasks"], "run" | "ensureVisible">;
  };
};

const roots: string[] = [];
const jobId = "6a1d0f7a-8eef-47aa-8638-3f2629ea1d5d";

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("Scheduler native task integration", () => {
  test("creates a normal titled task and preserves its workspace in history", async () => {
    const dataDir = await createDataDir();
    await writeJobs(dataDir);
    const harness = createContext(dataDir);
    const plugin = new SchedulerPlugin(harness.context);
    await plugin.initialize();

    await harness.handlers.get("run-now")!({id: jobId});
    expect(harness.runs).toHaveLength(1);
    expect(harness.runs[0]).toMatchObject({
      workspacePath: "D:\\project",
      prompt: "Review open work",
      title: "⏰ Morning review",
      mode: "plan",
    });

    harness.finish({sessionId: "session-new", status: "succeeded"});
    await eventually(async () => {
      const history = await readFile(path.join(dataDir, "history.jsonl"), "utf8").catch(() => "");
      return history.includes("session-new");
    });
    const history = await readFile(path.join(dataDir, "history.jsonl"), "utf8");
    expect(history).toContain('"workspacePath":"D:\\\\project"');
    await plugin.dispose();
  });

  test("backfills retained legacy sessions into the native sidebar once", async () => {
    const dataDir = await createDataDir();
    await writeJobs(dataDir);
    await writeFile(path.join(dataDir, "history.jsonl"), `${JSON.stringify({
      id: "0388dc64-18aa-4bb6-9876-0903bd72ec10",
      jobId,
      jobName: "Morning review",
      source: "cron",
      scheduledAt: "2026-07-18T14:00:00.000Z",
      finishedAt: "2026-07-18T14:01:00.000Z",
      status: "succeeded",
      sessionId: "session-legacy",
    })}\n`, "utf8");

    const harness = createContext(dataDir);
    const plugin = new SchedulerPlugin(harness.context);
    await plugin.initialize();
    await eventually(() => harness.visible.length === 1);
    expect(harness.visible[0]).toEqual({
      sessionId: "session-legacy",
      workspacePath: "D:\\project",
      title: "⏰ Morning review",
    });
    await eventually(async () => {
      const migrations = await readFile(path.join(dataDir, "migrations.json"), "utf8").catch(() => "");
      return migrations.includes("sidebarTasksV1");
    });
    await plugin.dispose();

    const second = createContext(dataDir);
    const restarted = new SchedulerPlugin(second.context);
    await restarted.initialize();
    await Bun.sleep(25);
    expect(second.visible).toHaveLength(0);
    await restarted.dispose();
  });
});

async function createDataDir(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "zcode-scheduler-test-"));
  roots.push(root);
  const dataDir = path.join(root, "data");
  await mkdir(dataDir, {recursive: true});
  return dataDir;
}

async function writeJobs(dataDir: string): Promise<void> {
  await writeFile(path.join(dataDir, "jobs.json"), `${JSON.stringify({schemaVersion: 1, jobs: [{
    schemaVersion: 1,
    id: jobId,
    name: "Morning review",
    enabled: false,
    cron: "0 9 * * 1-5",
    timezone: "America/Chicago",
    workspacePath: "D:\\project",
    prompt: "Review open work",
    mode: "plan",
    overlapPolicy: "skip",
    maxParallel: 4,
    missedPolicy: "skip",
    graceMs: 60_000,
    createdAt: "2026-07-19T12:00:00.000Z",
    updatedAt: "2026-07-19T12:00:00.000Z",
  }]}, null, 2)}\n`, "utf8");
}

function createContext(dataDir: string) {
  const handlers = new Map<string, (payload: unknown) => unknown | Promise<unknown>>();
  const runs: ExtensionTaskSpec[] = [];
  const visible: Array<{sessionId: string; workspacePath: string; title?: string}> = [];
  let resolveCompletion!: (result: {sessionId: string; status: "succeeded"}) => void;
  const completion = new Promise<{sessionId: string; status: "succeeded"}>((resolve) => { resolveCompletion = resolve; });
  const logger = {
    child: () => logger,
    debug: async () => undefined,
    info: async () => undefined,
    warn: async () => undefined,
    error: async () => undefined,
  };
  const context: LegacySchedulerContext = {
    manifest: {
      apiVersion: 1,
      id: "scheduler",
      name: "Scheduler",
      version: "0.1.5",
      entrypoints: {},
      engines: {host: ">=0.2.0 <1", zcode: ">=3.3.6"},
      pages: [{id: "jobs", title: "Scheduler"}],
    },
    dataDir,
    logger,
    ipc: {
      handle(method, handler) { handlers.set(method, handler); return {dispose: () => handlers.delete(method)}; },
      emit() {},
    },
    lifecycle: {onResume: () => ({dispose() {}})},
    zcode: {
      readWorkspaceState: async () => ({}),
      tasks: {
        async run(spec) {
          runs.push(spec);
          return {sessionId: "session-new", completion, stop: async () => undefined};
        },
        async ensureVisible(spec) { visible.push(spec); },
      },
    },
  };
  return {context: context as unknown as ExtensionContext, handlers, runs, visible, finish: resolveCompletion};
}

async function eventually(predicate: () => boolean | Promise<boolean>): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await predicate()) return;
    await Bun.sleep(10);
  }
  throw new Error("Condition was not reached");
}
