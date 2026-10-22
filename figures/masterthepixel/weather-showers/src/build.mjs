import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { figureSvg, pageHtml, plateHtml } from "../../../../.skill/kit/iso-kit.mjs";
import { icon } from "./icon.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const FPS = 30;
const REST = Math.floor(icon.loop * 0.3);
const DEFAULT = icon.defaultIntensity ?? 0.5;

const WX_CSS = `
.wx{--wx-sun:#fbbf24;--wx-sun-deep:#f59e0b;--wx-sky:#60a5fa;--wx-rain:#5aa9ff;--wx-ice:#bfe4ff;--wx-bolt:#fde047;--wx-hot:#fb7185;--wx-cold:#7dd3fc;--wx-moon:#e2e8f0;--wx-glow-alpha:.55;--wx-uv-1:#4ade80;--wx-uv-2:#facc15;--wx-uv-3:#fb923c;--wx-uv-4:#f43f5e;--wx-uv-5:#a78bfa}
.wx[data-wx$="light"]{--wx-sun:#f59e0b;--wx-sun-deep:#d97706;--wx-sky:#2563eb;--wx-rain:#2563eb;--wx-ice:#7cc4ee;--wx-bolt:#eab308;--wx-hot:#e11d48;--wx-cold:#0284c7;--wx-moon:#94a3b8;--wx-glow-alpha:.4;--wx-uv-1:#30a46c;--wx-uv-2:#eab308;--wx-uv-3:#ea580c;--wx-uv-4:#e11d48;--wx-uv-5:#7c3aed}
.wx-stage{outline:none}
.wx-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
`;

const frameOf = (clock) => ((Math.floor(clock * FPS) % icon.loop) + icon.loop) % icon.loop;
const readoutOf = (intensity) => `${icon.label.toLowerCase()} · strength ${Math.round(intensity * 100)}%`;

// The icon module is inlined into the page: its `export` is stripped and it is wrapped so its
// names cannot collide with the live code below.
const source = readFileSync(join(HERE, "icon.mjs"), "utf8");
const inlined = `const WX_ICON = (() => {\n${source.replace(/^export \{[^}]*\};?\s*$/m, "")}\nreturn icon;\n})();`;

const live = `
${inlined}
const FPS = ${FPS}, LOOP = WX_ICON.loop, REST = ${REST};
const stage = document.querySelector(".wx-stage");
const body = stage.querySelector("[data-body]");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let intensity = ${DEFAULT}, clock = REST / FPS, last = 0, frame = 0, drawn = -1, visible = false;
const frameOf = (t) => ((Math.floor(t * FPS) % LOOP) + LOOP) % LOOP;
function draw(at) {
  body.innerHTML = WX_ICON.render({ frame: at, loop: LOOP, fps: FPS, intensity });
  const text = WX_ICON.label.toLowerCase() + " · strength " + Math.round(intensity * 100) + "%";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(intensity * 100)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 15) : 0;
  last = now;
  clock += dt;
  const at = frameOf(clock);
  if (at !== drawn) { drawn = at; draw(at); }
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
still.addEventListener("change", () => {
  drawn = -1;
  if (still.matches) { if (frame) cancelAnimationFrame(frame); frame = 0; draw(REST); } else run();
});
const steer = (next) => { intensity = clamp(next, 0, 1); drawn = -1; if (still.matches) draw(REST); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = stage.getBoundingClientRect();
  steer((event.clientX - box.left) / box.width);
});
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 0.25 : 0.1;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(intensity + step);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(intensity - step);
  else if (event.key === "Home") steer(0);
  else if (event.key === "End") steer(1);
  else return;
  event.preventDefault();
});
draw(still.matches ? REST : frameOf(clock));
run();
`;

const svg = figureSvg({
  width: icon.width,
  height: icon.height,
  label: `${icon.label}: ${icon.object}. Move the pointer across it, or use the arrow keys, to change how strong the condition is.`,
  className: "",
  body: `<g data-body>${icon.render({ frame: REST, loop: icon.loop, fps: FPS, intensity: DEFAULT })}</g>`,
});

const body = plateHtml({
  fig: "Fig 1",
  title: icon.label,
  hint: "Move across to change strength",
  readout: readoutOf(DEFAULT),
  keys: [{ mark: "lit", label: icon.object }],
  caption: `${icon.object}. The weather condition "${icon.label}" drawn as a working instrument: it loops every ${(icon.loop / FPS).toFixed(0)} seconds, and sliding across the figure turns the strength of the condition up and down.`,
  body: `<style>${WX_CSS}</style><div class="iso-stage wx-stage wx" tabindex="0" role="slider" aria-label="${icon.label}: arrow keys change strength" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(DEFAULT * 100)}" data-wx="gallery-${theme}">${svg}</div>`,
});

const out = `${icon.id}${theme === "light" ? "-light" : ""}.html`;
writeFileSync(join(HERE, out), pageHtml({ title: icon.label, theme, body, script: live }));
console.log("wrote", out);
