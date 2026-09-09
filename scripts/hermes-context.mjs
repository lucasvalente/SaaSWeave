import { readFile } from "node:fs/promises";
console.log(await readFile(".hermes/project-context.md", "utf8"));
