export function assertReleaseVersion(tag: string, packageVersion: string, manifestVersion: string): string {
  const match = /^v(\d+\.\d+\.\d+)$/.exec(tag);
  if (!match) throw new Error(`Release tag ${tag} must use strict vX.Y.Z syntax`);
  const version = match[1]!;
  if (version !== packageVersion) throw new Error(`Tag ${tag} does not match package version ${packageVersion}`);
  if (version !== manifestVersion) throw new Error(`Tag ${tag} does not match extension manifest version ${manifestVersion}`);
  return version;
}

export function releaseBaseName(version: string): string {
  return `zcode-scheduler-v${version}`;
}
