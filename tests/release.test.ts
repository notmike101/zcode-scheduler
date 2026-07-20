import {describe, expect, test} from "bun:test";
import {assertReleaseVersion, releaseBaseName, resolveReleaseTag} from "../scripts/release-helpers.ts";

describe("release metadata", () => {
  test("accepts a matching semantic version tag", () => {
    expect(assertReleaseVersion("v0.1.3", "0.1.3", "0.1.3")).toBe("0.1.3");
    expect(releaseBaseName("0.1.3")).toBe("zcode-scheduler-v0.1.3");
  });

  test("ignores pull-request merge refs when inferring a release tag", () => {
    expect(resolveReleaseTag(undefined, undefined, "1/merge", "0.1.3")).toBe("v0.1.3");
    expect(resolveReleaseTag(undefined, "branch", "main", "0.1.3")).toBe("v0.1.3");
    expect(resolveReleaseTag(undefined, "tag", "v0.1.3", "0.1.3")).toBe("v0.1.3");
    expect(resolveReleaseTag("v0.1.4", "tag", "v0.1.3", "0.1.3")).toBe("v0.1.4");
  });

  test("rejects malformed or inconsistent versions", () => {
    expect(() => assertReleaseVersion("release-0.1.3", "0.1.3", "0.1.3")).toThrow("strict vX.Y.Z");
    expect(() => assertReleaseVersion("v0.1.4", "0.1.3", "0.1.3")).toThrow("package version");
    expect(() => assertReleaseVersion("v0.1.3", "0.1.3", "0.1.2")).toThrow("manifest version");
  });
});
