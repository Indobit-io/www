// Node's ESM loader will not guess extensions, but the source uses Next-style
// extensionless relative imports ("./db") and the "@/" alias. This hook teaches
// the test runner both, so tests can import the real modules unmodified.

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const target = pathToFileURL(path.join(ROOT, specifier.slice(2))).href;
    return resolve(target.endsWith(".ts") ? target : `${target}.ts`, context, next);
  }
  if (specifier.startsWith(".") && !path.extname(specifier)) {
    try {
      return await next(`${specifier}.ts`, context);
    } catch {
      // Fall through to the default resolution below.
    }
  }
  return next(specifier, context);
}
