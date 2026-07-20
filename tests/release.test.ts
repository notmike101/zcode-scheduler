import {describe, expect, test} from "bun:test";
import {assertReleaseVersion, releaseBaseName} from "../scripts/release-helpers.ts";

describe("release metadata", () => {
  test("accepts a matching semantic version tag", () => {
    expect(assertReleaseVersion("v0.1.3", "0.1.3", "0.1.3")).toBe("0.1.3");
    expect(releaseBaseName("0.1.3")).toBe("zcode-scheduler-v0.1.3");
  });

  test("rejects malformed or inconsistent versions", () => {
    expect(() => assertReleaseVersion("release-0.1.3", "0.1.3", "0.1.3")).toThrow("strict vX.Y.Z");
    expect(() => assertReleaseVersion("v0.1.4", "0.1.3", "0.1.3")).toThrow("package version");
    expect(() => assertReleaseVersion("v0.1.3", "0.1.3", "0.1.2")).toThrow("manifest version");
  });
});
