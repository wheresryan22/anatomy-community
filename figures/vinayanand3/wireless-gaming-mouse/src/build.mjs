// Builds the interactive anatomy page: object/figure.html (dark) and object/figure-light.html (light).
// Same model, feature channels and overlays as the film.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import { turnScript } from "../../../../.skill/scripts/inline-kit.mjs";
import { scene, PAGE_HELPERS } from "./scene.mjs";
import { FILM, FIGURE, FLOW_CSS } from "./film.mjs";
import { describe, ASSEMBLIES } from "./inventory.mjs";
import { materialCss } from "./materials.mjs";
import { patchTurn } from "./runtime.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const W = 760;
const H = 600;
const S = scene({ W, H, radius: FILM.radius * 1.12, pad: 4 });
const counts = { parts: S.out.report.parts, assemblies: S.obj.explode.length };
const fill = (text) => text.replace(/\{(\w+)\}/g, (_, key) => counts[key] ?? `{${key}}`);

// inventory: one row per named part (tube chunks fold into their route)
const names = [...new Set(S.T.parts.map((p) => p.name.replace(/:\d+$/, "")))];
const inv = names.map((n) => describe(n));
const assemblyOf = Object.fromEntries(S.T.parts.map((p) => [p.name, describe(p.name.replace(/:\d+$/, "")).assembly]));
const missing = inv.filter((r) => r.assembly === "?");
if (missing.length) console.warn("unassigned parts:", missing.map((r) => r.name).join(", "));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const grouped = Object.entries(ASSEMBLIES).map(([key, label]) => ({ key, label, rows: inv.filter((r) => r.assembly === key) }));
const table = grouped
  .map(
    (g) =>
      `<tbody data-a="${g.key}"><tr class="grp"><th colspan="3"><span class="chip-k">${g.key}</span>${esc(g.label)}<span class="n">${g.rows.length} parts</span></th></tr>` +
      g.rows.map((r) => `<tr data-part="${esc(r.name)}" tabindex="0"><td class="pn">${esc(r.label)}<code>${esc(r.name)}</code></td><td>${esc(r.material)}</td><td>${esc(r.purpose)}</td></tr>`).join("") +
      `</tbody>`,
  )
  .join("");

const halo = `<ellipse cx="${W / 2}" cy="${H * 0.72}" rx="${W * 0.17}" ry="${H * 0.022}" class="iso-halo" style="filter:blur(8px)"/>`;
const stage = `<div class="iso-stage iso-turn ar-stage" id="stage" tabindex="0" role="application" aria-label="${esc(FIGURE.title)}: drag to turn, scroll or pinch to zoom, click a part to identify it. Arrow keys turn, plus and minus zoom, A toggles exploded view.">${k.figureSvg({ width: W, height: H, label: fill(FIGURE.label), body: halo })}${S.out.layerSvg("live", { width: W, height: H })}<svg class="ov" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg></div>`;

const chips = Object.entries(ASSEMBLIES)
  .map(([key, label]) => `<button type="button" class="chip" data-a="${key}" id="chip-${key}" aria-pressed="false"><span class="chip-k">${key}</span>${esc(label)}</button>`)
  .join("");

const fonts = "";

const PAGE_CSS = `
/* Layout: a drafting-table plate — the model on a large stage, an instrument column beside it, the inventory below. */
:root{
  --paper:#f1ece2; --sheet:#f8f5ee; --ink:#1d1c1a; --ink-2:#55524c; --rule:rgba(40,34,26,.16); --accent:#0f8fab; --accent-ink:#ffffff; --warn:#c2412f;
  --f-display:"Avenir Next Condensed","DIN Condensed","Roboto Condensed","Arial Narrow",sans-serif; --f-body:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; --f-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  color-scheme:light;
}
body[data-theme="dark"]{--paper:#141518; --sheet:#1b1d21; --ink:#e7e4dc; --ink-2:#a19d94; --rule:rgba(230,224,210,.14); --accent:#3cc5e0; --accent-ink:#0b1114; --warn:#ff7a66; color-scheme:dark}
html,body{background:var(--paper);color:var(--ink)}
body{margin:0;font:15px/1.55 var(--f-body);-webkit-font-smoothing:antialiased}
.wrap{max-width:1240px;margin:0 auto;padding-block:28px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:22px}
header.top{display:grid;grid-template-columns:1fr auto;gap:8px 24px;align-items:end;border-bottom:1px solid var(--rule);padding-bottom:14px}
.eyebrow{font:500 11px/1 var(--f-mono);letter-spacing:.16em;text-transform:uppercase;color:var(--ink-2)}
h1{margin:6px 0 0;font:700 clamp(30px,5vw,52px)/.95 var(--f-display);letter-spacing:.02em;text-transform:uppercase;text-wrap:balance}
.spec{font:400 12px/1.6 var(--f-mono);color:var(--ink-2);text-align:right;font-variant-numeric:tabular-nums}
.spec b{color:var(--ink);font-weight:500}
.grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:start}
@media (max-width:940px){.grid{grid-template-columns:minmax(0,1fr)}header.top{grid-template-columns:1fr}.spec{text-align:left}}
.stagebox{position:relative;background:var(--sheet);border:1px solid var(--rule);min-width:0;overflow:hidden}
.stagebox .iso{background:transparent}
.ar-stage{position:relative;width:100%;aspect-ratio:${W}/${H};cursor:grab;outline:none;touch-action:none;max-width:100%}
.ar-stage:active{cursor:grabbing}
.ar-stage:focus-visible{box-shadow:inset 0 0 0 2px var(--accent)}
.ar-stage svg{position:absolute;inset:0;width:100%;height:100%}
.stage-hud{position:absolute;left:12px;right:12px;bottom:10px;display:flex;justify-content:space-between;gap:12px;font:400 11px/1.3 var(--f-mono);color:var(--ink-2);pointer-events:none;letter-spacing:.04em}
.stage-hud span{font-variant-numeric:tabular-nums}
.zoom{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:6px}
.zoom button{width:34px;height:34px;font:500 18px/1 var(--f-mono)}
.panel{display:grid;gap:14px;min-width:0}
.card{background:var(--sheet);border:1px solid var(--rule);padding:14px 16px;display:grid;gap:10px}
.card h2{margin:0;font:600 15px/1 var(--f-display);letter-spacing:.14em;text-transform:uppercase}
.row{display:flex;flex-wrap:wrap;gap:8px}
button{font:500 13px/1 var(--f-body);color:var(--ink);background:transparent;border:1px solid var(--rule);padding:9px 12px;border-radius:3px;cursor:pointer}
button:hover{border-color:var(--ink-2)}
button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.slider{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;font:400 12px var(--f-mono);color:var(--ink-2)}
input[type=range]{width:100%;accent-color:var(--accent)}
.chips{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.chip{display:flex;gap:8px;align-items:center;text-align:left;font-size:12.5px;padding:8px 9px;line-height:1.2}
.chip-k{display:inline-grid;place-items:center;min-width:20px;height:20px;font:600 12px/1 var(--f-mono);border:1px solid currentColor;border-radius:2px;margin-right:8px}
.chip .chip-k{margin-right:0}
.sel{min-height:132px}
.sel .name{font:600 22px/1.05 var(--f-display);letter-spacing:.04em;text-transform:uppercase;text-wrap:balance}
.sel dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px}
.sel dt{font:500 11px/1.6 var(--f-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.sel dd{margin:0}
.sel .empty{color:var(--ink-2);font-size:13.5px}
.note{font-size:12.5px;color:var(--ink-2);margin:0}
.legend-ov{display:grid;gap:6px;font-size:12.5px;color:var(--ink-2)}
.legend-ov i{display:inline-block;width:22px;height:0;border-top:2px dashed;vertical-align:middle;margin-right:8px}
section.inv{display:grid;gap:12px;min-width:0}
section.inv h2{margin:0;font:700 26px/1 var(--f-display);letter-spacing:.06em;text-transform:uppercase}
.tablewrap{overflow-x:auto;border:1px solid var(--rule);background:var(--sheet)}
table{border-collapse:collapse;width:100%;min-width:760px;font-size:13px}
th,td{padding:8px 12px;text-align:left;vertical-align:top;border-top:1px solid var(--rule)}
thead th{font:500 11px/1.4 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2);border-top:0}
tr.grp th{font:600 14px/1 var(--f-display);letter-spacing:.12em;text-transform:uppercase;padding:12px;background:color-mix(in srgb,var(--sheet) 70%,var(--paper))}
tr.grp .n{float:right;font:400 11px var(--f-mono);letter-spacing:.08em;color:var(--ink-2)}
td.pn{font-weight:500;min-width:200px}
td.pn code{display:block;font:400 11px var(--f-mono);color:var(--ink-2);margin-top:2px}
tr[data-part]{cursor:pointer}
tr[data-part]:hover td,tr[data-part].on td{background:color-mix(in srgb,var(--accent) 12%,transparent)}
tr[data-part]:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
footer{font-size:12.5px;color:var(--ink-2);border-top:1px solid var(--rule);padding-top:14px;display:grid;gap:6px}
.ar-stage g[data-name]{transition:opacity .18s}
.ar-stage.dimmed g[data-name]:not(.hl){opacity:.16}
.ar-stage g[data-name].sel-on{filter:drop-shadow(0 0 3px var(--accent))}
body[data-theme="dark"] .ov .ov-label{fill:#e2ded5;stroke:#1b1d21}
body[data-theme="dark"] .ov .ov-lead{stroke:rgba(230,224,210,.5)}
body[data-theme="dark"] .ov .ov-dot{fill:#e2ded5}
@media (prefers-reduced-motion:reduce){.ar-stage g[data-name]{transition:none}}
@media (max-width:600px){#hud-l{display:none}}
`;

const body = `<div class="wrap">
<header class="top">
  <div><div class="eyebrow">Fig 1 · Engineering anatomy · conceptual design</div><h1>${esc(FIGURE.title)}</h1></div>
  <div class="spec"><b>125 × 65 × 40 mm</b> · ~65 g target<br>${counts.parts} convex parts · ${counts.assemblies} explode assemblies<br>2.4 GHz · USB-C · optical sensor</div>
</header>
<div class="grid">
  <div class="stagebox iso" data-theme="${theme}">
    <style>${S.out.css}
${materialCss()}
.iso-face-text[data-tone="lit"]{fill:var(--anatomy-lit)}
.iso-face-text[data-tone="mid"]{fill:var(--anatomy-mid)}
${FLOW_CSS}</style>
    ${stage}
    <div class="zoom"><button type="button" id="zin" aria-label="Zoom in">+</button><button type="button" id="zout" aria-label="Zoom out">−</button></div>
    <div class="stage-hud"><span id="hud-l">Drag to turn · scroll to zoom · click a part</span><span id="hud-r" data-readout></span></div>
  </div>
  <aside class="panel">
    <div class="card">
      <h2>Assembly</h2>
      <div class="slider"><span>Assembled</span><input type="range" id="apart" min="0" max="100" value="0" aria-label="Explode the assembly"><span id="apart-v">0%</span></div>
      <div class="row"><button type="button" id="b-assembled" aria-pressed="true">Assembled</button><button type="button" id="b-exploded" aria-pressed="false">Exploded</button><button type="button" id="b-labels" aria-pressed="false" title="On narrow screens the labels show the assembly letters A–H">Leader labels</button><button type="button" id="b-reset">Reset view</button></div>
    </div>
    <div class="card">
      <h2>Mechanisms</h2>
      <div class="row">
        <button type="button" id="b-click">Click left button</button>
        <button type="button" id="b-wheel">Spin wheel</button>
        <button type="button" id="b-flank" aria-pressed="false">Open left flank</button>
        <button type="button" id="b-lift" aria-pressed="false">Lift top shell</button>
      </div>
      <h2>Signal &amp; power</h2>
      <div class="row">
        <button type="button" id="b-optic" aria-pressed="false">Optical tracking</button>
        <button type="button" id="b-link" aria-pressed="false">Wireless link</button>
        <button type="button" id="b-power" aria-pressed="false">Power flow</button>
        <button type="button" id="b-charge" aria-pressed="false">USB-C charging</button>
      </div>
      <div class="legend-ov"><span><i style="color:#13b6d6"></i>Signal / light (conceptual overlay)</span><span><i style="color:#f2b234"></i>Battery power rails</span><span><i style="color:#7ee06a"></i>Charging path</span></div>
    </div>
    <div class="card sel" id="sel" aria-live="polite"><h2>Component</h2><p class="empty">Click any part of the mouse, or a row in the inventory below, to see what it is, what it is made of and what it does.</p></div>
    <div class="card">
      <h2>Highlight assemblies</h2>
      <div class="chips">${chips}</div>
    </div>
  </aside>
</div>
<section class="inv" id="inventory">
  <h2>Component inventory</h2>
  <p class="note">${inv.length} named components (${counts.parts} solid parts once multi-panel parts are counted). Materials and sizes are engineering assumptions for a plausible concept, not a production bill of materials.</p>
  <div class="tablewrap"><table><thead><tr><th>Component</th><th>Material</th><th>Purpose</th></tr></thead>${table}</table></div>
</section>
<footer><span>${esc(fill(FIGURE.caption))}</span><span>Dashed coloured lines are conceptual signal, light and power overlays drawn over the model; they are not modelled parts. Wireless is shown schematically.</span></footer>
</div>`;

const film = readFileSync(join(HERE, "film.mjs"), "utf8").replace(/^export /gm, "");
const overlayJs = readFileSync(join(HERE, "overlay.js"), "utf8");
const INFO = Object.fromEntries(inv.map((r) => [r.name, r]));
const DATA = { turn: S.out.data, explode: S.obj.explode, basis: S.basis, dirs: S.obj.dirs, origin: S.obj.root.origin, parts: counts.parts, assemblyOf, info: INFO, groups: ASSEMBLIES };
const LIVE = readFileSync(join(HERE, "live.js"), "utf8")
  .replace("__DATA__", JSON.stringify(DATA))
  .replace("__HELPERS__;", PAGE_HELPERS)
  .replace("__FILM__;", film)
  .replace("__OVERLAY__;", overlayJs);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${esc(FIGURE.title)}</title><meta name="description" content="Interactive engineering anatomy of a conceptual wireless gaming mouse: rotate, explode, click parts, see the optical, wireless and power paths.">${fonts}<style>${k.ISO_CSS}${PAGE_CSS}</style></head><body class="iso" data-theme="${theme}">${body}<script type="module">${(patchTurn(turnScript()) + LIVE).replace(/<\/(script)/gi, "<\\/$1")}</script></body></html>`;
const name = `figure${theme === "light" ? "-light" : ""}.html`;
writeFileSync(join(HERE, name), html);
console.log(`wrote ${name} · ${(html.length / 1024).toFixed(0)} KB · ${counts.parts} parts · ${counts.assemblies} assemblies · ${inv.length} components · build ${S.seconds.toFixed(1)} s`);
