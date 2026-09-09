import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/paraglide/runtime.js", import.meta.url);
let source = await readFile(file, "utf8");
source = source.replace(
  'export const cookieName = "PARAGLIDE_LOCALE";',
  'export const cookieName = "saasweave_locale";'
);
source = source.replace(
  'export const localStorageKey = "PARAGLIDE_LOCALE";',
  'export const localStorageKey = "saasweave.locale";'
);
await writeFile(file, source);

// The application imports the generated catalog through the stable `m` namespace.
// Paraglide's generated barrel exports message functions directly, so preserve this
// compatibility export after every regeneration.
const messagesFile = new URL("../src/paraglide/messages.js", import.meta.url);
let messagesSource = await readFile(messagesFile, "utf8");
if (!messagesSource.includes("export * as m from './messages/_index.js'")) {
  messagesSource += "\nexport * as m from './messages/_index.js'\n";
  await writeFile(messagesFile, messagesSource);
}
