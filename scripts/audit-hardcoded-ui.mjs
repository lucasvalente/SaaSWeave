import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "__tests__") files.push(...(await collect(path)));
    else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) files.push(path);
  }
  return files;
}
const files = await collect("apps/web/src");
const patterns = />\s*[A-Z][^<{\n]{2,}</g;
let findings = 0;
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(patterns)) {
    console.log(`${file}: ${match[0].trim()}`);
    findings++;
  }
}
console.log(`Hardcoded UI candidates: ${findings}`);
