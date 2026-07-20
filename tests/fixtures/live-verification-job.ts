import {readFile} from "node:fs/promises";
import path from "node:path";
import {writeJsonAtomic} from "../../src/atomic.ts";
import {jobSchema} from "../../src/schemas.ts";

const operation = process.argv[2];
const dataDir = process.argv[3];
if ((operation !== "add" && operation !== "remove") || !dataDir) {
  throw new Error("Usage: bun tests/fixtures/live-verification-job.ts <add|remove> <scheduler-data-dir>");
}

const verificationJobId = "877e1325-ecda-4ef8-98c3-78d126be19b9";
const jobsFile = path.resolve(dataDir, "jobs.json");
const parsed = JSON.parse(await readFile(jobsFile, "utf8")) as {jobs?: unknown[]};
const jobs = (parsed.jobs ?? []).filter((value) => !(value && typeof value === "object" && "id" in value && value.id === verificationJobId));

if (operation === "add") {
  const scheduled = new Date(Date.now() + 2 * 60_000);
  scheduled.setUTCSeconds(0, 0);
  const timestamp = new Date().toISOString();
  jobs.push(jobSchema.parse({
    schemaVersion: 1,
    id: verificationJobId,
    name: "Live running sidebar verification",
    enabled: true,
    cron: `${scheduled.getUTCMinutes()} ${scheduled.getUTCHours()} ${scheduled.getUTCDate()} ${scheduled.getUTCMonth() + 1} *`,
    timezone: "UTC",
    workspacePath: "D:\\zcode-patcher",
    prompt: "Run the non-modifying PowerShell command Start-Sleep -Seconds 25, then read README.md and return a concise three-bullet summary. Do not modify files.",
    mode: "plan",
    overlapPolicy: "skip",
    maxParallel: 1,
    missedPolicy: "skip",
    graceMs: 300_000,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  console.log(JSON.stringify({operation, scheduledAt: scheduled.toISOString(), jobId: verificationJobId}));
} else {
  console.log(JSON.stringify({operation, jobId: verificationJobId}));
}

await writeJsonAtomic(jobsFile, {schemaVersion: 1, jobs});
