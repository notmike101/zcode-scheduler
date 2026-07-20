import {describe, expect, test} from "bun:test";
import {jobSchema, runRecordSchema} from "../src/schemas.ts";

const jobId = "6a1d0f7a-8eef-47aa-8638-3f2629ea1d5d";

describe("Scheduler persistence schemas", () => {
  test("accepts the stable job contract", () => {
    const parsed = jobSchema.parse({
      schemaVersion: 1,
      id: jobId,
      name: "Morning review",
      enabled: true,
      cron: "0 9 * * 1-5",
      timezone: "America/Chicago",
      workspacePath: "D:\\project",
      prompt: "Review open work",
      mode: "plan",
      overlapPolicy: "skip",
      missedPolicy: "skip",
      createdAt: "2026-07-19T12:00:00.000Z",
      updatedAt: "2026-07-19T12:00:00.000Z",
    });
    expect(parsed.maxParallel).toBe(4);
    expect(parsed.graceMs).toBe(60_000);
  });

  test("keeps legacy run records readable while persisting workspace paths for new runs", () => {
    const base = {
      id: "0388dc64-18aa-4bb6-9876-0903bd72ec10",
      jobId,
      jobName: "Morning review",
      source: "cron" as const,
      scheduledAt: "2026-07-19T12:00:00.000Z",
      status: "succeeded" as const,
      sessionId: "session-1",
    };
    expect(runRecordSchema.parse(base).workspacePath).toBeUndefined();
    expect(runRecordSchema.parse({...base, workspacePath: "D:\\project"}).workspacePath).toBe("D:\\project");
  });
});
