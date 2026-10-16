// Anatomy file inliner (MIT, Ryan); adapted for this self-contained source bundle.
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const KIT=dirname(fileURLToPath(import.meta.url));
export function turnScript(){return readFileSync(join(KIT,'vendor-turn.mjs'),'utf8').replace(/^export /gm,'');}
