import type { PackageInfo } from "./types";

const host = "https://bundlephobia.com";

/**
 *
 * @example
 * createPackageInfoURL({ name: "hono", version: "4.8.7" })
 * // => URL("https://bundlephobia.com/package/hono@4.8.7")
 */
export function createPackageInfoURL(pkg: PackageInfo): URL {
  const url = new URL(
    `/package/${encodeURIComponent(pkg.name)}@${encodeURIComponent(pkg.version)}`,
    host,
  );

  return url;
}
