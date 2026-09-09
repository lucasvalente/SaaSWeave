import { readFile } from "node:fs/promises";
console.log(await readFile(".hermes/state/project-state.json", "utf8"));
