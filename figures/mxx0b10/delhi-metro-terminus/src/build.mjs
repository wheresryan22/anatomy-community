// Gallery build: the dark page by default, the light page with --light, written next to this file.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pageFor } from "./figure.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const light = process.argv.includes("--light");
writeFileSync(join(HERE, light ? "delhi-metro-light.html" : "delhi-metro.html"), pageFor(light ? "light" : "dark"));
