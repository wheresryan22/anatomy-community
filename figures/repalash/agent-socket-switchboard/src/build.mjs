// Agent Socket's Fig 1, the switchboard, as a standalone figure: the relay as a
// small patch switchboard on a bench plate. Writes switchboard-light.html.
import { writeFileSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import * as k from "../../../../.skill/kit/iso-kit.mjs"
import { buildHero } from "./hero.mjs"
import { FIGURE_CSS } from "./style.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const { svg, ...data } = buildHero()
const live = `const HERO = ${JSON.stringify(data)};\n` + readFileSync(join(HERE, "hero.live.js"), "utf8")
const body = k.plateHtml({
  fig: "Fig 1",
  title: "One link, any agent",
  hint: "Click a plug or the laptop",
  readout: "both links live · 0 calls answered",
  keys: [
    { mark: "lit", label: "A link: a patch cord in its socket" },
    { mark: "raised", label: "Callers: an agent in the cloud, a terminal, a script" },
  ],
  caption: "The relay as a switchboard. Every caller on the left reaches your tab or your app through one link, the patch cord. Close the laptop and the switchboard holds the line; open it and the same link carries on. Pull the plug and that link is dead.",
  body: `<div class="iso-stage" data-hero tabindex="0" role="group" aria-label="Fig 1, interactive. Keys: P pulls or replaces the laptop's plug, A the app's, L closes or opens the laptop.">${svg}</div><p class="sr" data-hero-status aria-live="polite"></p>`,
})
writeFileSync(join(HERE, "switchboard-light.html"), k.pageHtml({
  title: "Agent Socket: one link, any agent",
  theme: "light",
  width: 1000,
  body: `<style>${FIGURE_CSS}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}</style>${body}`,
  script: live,
}))
