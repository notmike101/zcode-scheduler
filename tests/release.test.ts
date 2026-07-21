import {describe, expect, test} from "bun:test";
import {readFileSync} from "node:fs";
import path from "node:path";
import {assertReleaseVersion, releaseBaseName, resolveReleaseTag} from "../scripts/release-helpers.ts";
import {schedulerRenderer} from "../src/renderer.tsx";

describe("release metadata", () => {
  test("accepts a matching semantic version tag", () => {
    expect(assertReleaseVersion("v0.1.5", "0.1.5", "0.1.5")).toBe("0.1.5");
    expect(releaseBaseName("0.1.5")).toBe("zcode-scheduler-v0.1.5");
  });

  test("ignores pull-request merge refs when inferring a release tag", () => {
    expect(resolveReleaseTag(undefined, undefined, "1/merge", "0.1.5")).toBe("v0.1.5");
    expect(resolveReleaseTag(undefined, "branch", "main", "0.1.5")).toBe("v0.1.5");
    expect(resolveReleaseTag(undefined, "tag", "v0.1.5", "0.1.5")).toBe("v0.1.5");
    expect(resolveReleaseTag("v0.1.6", "tag", "v0.1.5", "0.1.5")).toBe("v0.1.6");
  });

  test("rejects malformed or inconsistent versions", () => {
    expect(() => assertReleaseVersion("release-0.1.5", "0.1.5", "0.1.5")).toThrow("strict vX.Y.Z");
    expect(() => assertReleaseVersion("v0.1.6", "0.1.5", "0.1.5")).toThrow("package version");
    expect(() => assertReleaseVersion("v0.1.5", "0.1.5", "0.1.4")).toThrow("manifest version");
  });

  test("uses explicit capabilities and only the vNext renderer lifecycle", () => {
    const manifest = JSON.parse(readFileSync(path.join(import.meta.dir, "..", ".zdp", "plugin.json"), "utf8"));
    expect(manifest.engines.host).toBe(">=0.3.4 <1");
    expect(manifest.capabilities).toEqual([
      "zcode.workspaces.read",
      "zcode.tasks.run",
      "ui.pages",
      "ui.overlays",
    ]);
    expect(schedulerRenderer.mountPage).toBeFunction();
    expect(schedulerRenderer.mount).toBeUndefined();
  });
});
