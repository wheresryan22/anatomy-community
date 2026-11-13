// Fuel pump and car: a pump fills the car's tank, the car runs and drains it,
// the tank runs empty and the tail lights go out, then it fills again.
//
// Writes two standalone pages next to this file:
//   fuel-pump.html        (dark)
//   fuel-pump-light.html  (light)
//
// Usage: node src/build.mjs
// Deterministic: no clocks, randomness or environment; same bytes every run.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DISPLAY,
  HALO,
  PLATE,
  SCENE,
  TAIL_LIGHTS,
  TANK,
  VIEWBOX,
  exhaustScreen,
  pt,
} from "./geometry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const r = (n) => Math.round(n * 100) / 100;
const STROKE_W = 0.6;

// ---------------------------------------------------------------------------
// Static SVG
// ---------------------------------------------------------------------------

// `asLines` marks texture lines (grooves, seams, ticks, rails) with the kit's
// `iso-line` class so the Anatomy line check verifies every open end lands on
// something. Solid faces are left unclassed.
function paint(shapes, asLines = false) {
  return shapes
    .map((s) => {
      const cls = asLines && s.fill === "none" ? ' class="iso-line"' : "";
      const free = s.free ? ' data-free=""' : ""; // kit convention: empty = both ends free
      const fill = s.fill === "none" ? "none" : `var(--f-${s.fill})`;
      const stroke = s.stroke ? `var(--f-${s.stroke})` : "none";
      const w = r(STROKE_W * (s.w ?? 1));
      return `<path${cls}${free} d="${s.d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
    })
    .join("");
}

function dots(list) {
  return list
    .map(([x, y, rad]) => `<circle cx="${r(x)}" cy="${r(y)}" r="${rad}" fill="var(--f-hi)"/>`)
    .join("");
}

const { base, pump, car, nozzle, hosePath } = SCENE;
const vb = VIEWBOX;

const svg = `<svg class="fig" viewBox="${r(vb.minX)} ${r(vb.minY)} ${r(vb.w)} ${r(vb.h)}" aria-hidden="true">
<defs>
<filter id="halo" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>
</defs>
<path d="${HALO}" fill="var(--halo)" opacity="var(--halo-opacity)" filter="url(#halo)"/>
${paint(base.shapes)}${paint(base.lines, true)}${dots(base.dots)}
${paint(pump.shapes)}${paint(pump.lines, true)}${dots(pump.dots)}
<path id="bar" d="" fill="var(--lit)" opacity="0"/>
${paint(car.back)}${paint(car.shapes)}
<path id="fuel" d="" fill="var(--lit)" opacity="0"/>
<path id="surface" d="" fill="none" stroke="var(--lit-hi)" stroke-width="0.7" opacity="0"/>
${paint(car.lines, true)}${dots(car.dots)}
<g id="lights" opacity="0">${TAIL_LIGHTS.map((d) => `<path d="${d}" fill="var(--lit)" filter="url(#glow)" opacity="0.9"/>`).join("")}${TAIL_LIGHTS.map((d) => `<path d="${d}" fill="var(--lit)"/>`).join("")}</g>
<text transform="matrix(0.866,-0.5,0,1,${r(PLATE.cx)},${r(PLATE.cy)})" text-anchor="middle" dominant-baseline="central" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="3.6" letter-spacing="0.3" fill="var(--f-hi)">PETROL</text>
${paint(car.front)}
${[0, 1, 2].map((i) => `<circle id="puff${i}" cx="${r(exhaustScreen[0])}" cy="${r(exhaustScreen[1])}" r="1" fill="none" stroke="var(--f-mid)" stroke-width="0.6" opacity="0"/>`).join("")}
<path d="${hosePath}" fill="none" stroke="var(--f-hi)" stroke-width="4.6" stroke-linecap="round"/>
<path d="${hosePath}" fill="none" stroke="var(--f-rubber)" stroke-width="3.4" stroke-linecap="round"/>
<path d="${hosePath}" fill="none" stroke="var(--f-deep)" stroke-width="0.8" stroke-linecap="round" opacity="0.7" transform="translate(-0.6,-0.9)"/>
<path id="flow" d="${hosePath}" fill="none" stroke="var(--lit)" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="1.6 4.4" opacity="0"/>
${paint(nozzle)}
</svg>`;

// ---------------------------------------------------------------------------
// Live parts: screen-space constants for the inline loop
// ---------------------------------------------------------------------------

// The tank window and the pump display sit on +y faces, so raising z only
// moves a point straight up on screen and moving along x adds (cos30, sin30).
const C = Math.cos(Math.PI / 6);
const tankBL = pt([TANK.x0 + 0.6, TANK.y, TANK.z0 + 0.6]);
const tankBR = pt([TANK.x1 - 0.6, TANK.y, TANK.z0 + 0.6]);
const barX0 = DISPLAY.x0 + 3;
const barBL = pt([barX0, DISPLAY.y + 0.05, 62]);
const LIVE = {
  tank: { bl: tankBL.map(r), br: tankBR.map(r), h: r(TANK.z1 - TANK.z0 - 1.2) },
  bar: { bl: barBL.map(r), h: 3.5, w: r(DISPLAY.x1 - DISPLAY.x0 - 6), dx: r(C), dy: 0.5 },
  exhaust: exhaustScreen.map(r),
};

// Plain script, no network, no eval, no string timers. Holds a still frame
// under prefers-reduced-motion and pauses while offscreen.
const script = `(() => {
const L = ${JSON.stringify(LIVE)};
const FILL = 2.2, RUN = 4, EMPTY = 1.4, CYCLE = FILL + RUN + EMPTY;
const $ = (id) => document.getElementById(id);
const fuel = $("fuel"), surface = $("surface"), bar = $("bar"), flow = $("flow"), lights = $("lights"), readout = $("readout");
const puffs = [$("puff0"), $("puff1"), $("puff2")];
const f = (n) => Math.round(n * 100) / 100;
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
function stateAt(t) {
  if (t < FILL) { const k = ease(t / FILL); return { level: k, dispensed: k, flow: Math.min(1, t * 3), lights: 0, running: false, phase: "fill" }; }
  if (t < FILL + RUN) { const u = (t - FILL) / RUN; return { level: 1 - u, dispensed: 1, flow: Math.max(0, 1 - (t - FILL) * 3), lights: Math.min(1, (t - FILL) * 4), running: true, phase: "run" }; }
  return { level: 0, dispensed: 0, flow: 0, lights: Math.max(0, 1 - (t - FILL - RUN) * 5), running: false, phase: "empty" };
}
function draw(s, now) {
  const up = L.tank.h * s.level, a = L.tank.bl, b = L.tank.br;
  fuel.setAttribute("d", "M" + a[0] + " " + a[1] + "L" + b[0] + " " + b[1] + "L" + b[0] + " " + f(b[1] - up) + "L" + a[0] + " " + f(a[1] - up) + "Z");
  surface.setAttribute("d", "M" + a[0] + " " + f(a[1] - up) + "L" + b[0] + " " + f(b[1] - up));
  fuel.setAttribute("opacity", s.level > 0.005 ? "1" : "0");
  surface.setAttribute("opacity", s.level > 0.01 ? "1" : "0");
  const w = L.bar.w * s.dispensed, p = L.bar.bl, ex = f(p[0] + w * L.bar.dx), ey = f(p[1] + w * L.bar.dy);
  bar.setAttribute("d", "M" + p[0] + " " + p[1] + "L" + ex + " " + ey + "L" + ex + " " + f(ey - L.bar.h) + "L" + p[0] + " " + f(p[1] - L.bar.h) + "Z");
  bar.setAttribute("opacity", s.dispensed > 0.005 ? "1" : "0");
  flow.setAttribute("opacity", String(s.flow));
  flow.setAttribute("stroke-dashoffset", String(f(-(now / 1000) * 34)));
  lights.setAttribute("opacity", String(f(s.lights)));
  puffs.forEach((c, i) => {
    if (!s.running) { c.setAttribute("opacity", "0"); return; }
    const k = ((now / 1000) * 0.9 + i / 3) % 1;
    c.setAttribute("cx", String(f(L.exhaust[0] + 4 + k * 22)));
    c.setAttribute("cy", String(f(L.exhaust[1] - k * 16)));
    c.setAttribute("r", String(f(1.4 + k * 4.2)));
    c.setAttribute("opacity", String(f((1 - k) * 0.55)));
  });
  const pct = Math.round(s.level * 100) + "%";
  readout.textContent = s.phase === "fill" ? "filling · " + pct : s.phase === "run" ? "running · " + pct : "tank empty";
}
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
let raf = 0, start = performance.now(), last = start, visible = true;
function frame(now) {
  draw(stateAt(((now - start) / 1000) % CYCLE), now);
  last = now;
  raf = visible && !reduce.matches ? requestAnimationFrame(frame) : 0;
}
function restart() {
  cancelAnimationFrame(raf);
  if (reduce.matches) { draw({ ...stateAt(FILL + RUN * 0.3), running: false, flow: 0 }, 0); return; }
  raf = requestAnimationFrame(frame);
}
new IntersectionObserver(([e]) => {
  const was = visible; visible = e.isIntersecting;
  if (visible && !was && !reduce.matches) { start += performance.now() - last; raf = requestAnimationFrame(frame); }
}).observe(document.querySelector(".card"));
reduce.addEventListener("change", restart);
restart();
})();`;

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

const THEMES = {
  dark: {
    ink: "#ededea",
    card: "#141414",
    page: "#0b0b0b",
    muted: "#8c8c88",
    border: "#2a2a28",
    halo: "0.9",
    haloColor: "#000000",
    mix: { top: 22, side: 14, shade: 8, deep: 4, glass: 34, metal: 40, hi: 82, mid: 52, lo: 32, faint: 20 },
    rubber: "#0e0e0e",
    recess: "#101010",
  },
  light: {
    ink: "#1b1b19",
    card: "#fbfaf7",
    page: "#f1efe9",
    muted: "#6f6e69",
    border: "#e2dfd6",
    halo: "0.32",
    haloColor: "#1b1b19",
    mix: { top: 2, side: 8, shade: 15, deep: 24, glass: 32, metal: 11, hi: 72, mid: 46, lo: 28, faint: 15 },
    rubber: "#4a4a46",
    recess: "#e4e2db",
  },
};

function page(theme) {
  const t = THEMES[theme];
  const mixes = Object.entries(t.mix)
    .map(([k, v]) => `  --f-${k}: color-mix(in oklab, var(--f-ink) ${v}%, var(--card));`)
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fuel pump and car</title>
<style>
:root {
  --f-ink: ${t.ink};
  --card: ${t.card};
  --page: ${t.page};
  --muted: ${t.muted};
  --border: ${t.border};
  --lit: #f57214;
  --lit-hi: #ffc08f;
  --halo: ${t.haloColor};
  --halo-opacity: ${t.halo};
${mixes}
  --f-rubber: ${t.rubber};
  --f-recess: ${t.recess};
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--page); color: var(--f-ink); }
body { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
main { width: min(760px, 100%); }
.card { position: relative; background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 36px 16px 40px; }
.corner { position: absolute; font: 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); }
.tl { top: 14px; left: 16px; } .tr { top: 14px; right: 16px; }
.bl { bottom: 14px; left: 16px; } .br { bottom: 14px; right: 16px; color: var(--f-ink); font-variant-numeric: tabular-nums; }
.fig { display: block; width: 100%; max-width: 560px; height: auto; margin: 0 auto; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 20px; margin: 14px 4px 0; color: var(--muted); font-size: 13px; }
.key { display: inline-flex; align-items: center; gap: 8px; }
.sw { width: 10px; height: 10px; border-radius: 2px; border: 1px solid var(--f-mid); }
.sw.lit { background: var(--lit); border-color: var(--lit); }
.sw.solid { background: var(--f-side); }
.caption { margin: 8px 4px 0; color: var(--muted); font-size: 13px; max-width: 62ch; }
</style>
</head>
<body>
<main>
<figure class="card" role="img" aria-label="A fuel pump fills a car's tank, the car runs until the tank is empty, then it fills again." style="margin:0">
<span class="corner tl">Fig 1</span>
<span class="corner tr">Fuel pump and car</span>
<span class="corner bl">loops on its own</span>
<span class="corner br" id="readout">filling · 0%</span>
${svg}
</figure>
<div class="legend"><span class="key"><span class="sw lit"></span>fuel in the tank, hose and pump display</span><span class="key"><span class="sw solid"></span>car, pump and plinth</span></div>
<p class="caption">The pump fills the tank through the hose. The car then runs and burns it down while the exhaust puffs. When the tank is empty the tail lights go out and it fills again. The readout is the tank level shown in the cut-away window.</p>
</main>
<script>${script}</script>
</body>
</html>
`;
}

writeFileSync(join(here, "fuel-pump.html"), page("dark"));
writeFileSync(join(here, "fuel-pump-light.html"), page("light"));
