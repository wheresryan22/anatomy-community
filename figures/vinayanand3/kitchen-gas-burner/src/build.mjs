// How a Kitchen Gas Burner Works. `node build.mjs` writes gas-burner.html (light) and gas-burner-dark.html.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import { glCamera } from "../../../../.skill/kit/gl.mjs";
import { kitScript, glScript } from "../../../../.skill/scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { buildSection, knobSvg, sleeveSvg, plugSvg } from "./section.mjs";
import { buildOrtho } from "./ortho.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 960, H = 470;

// ---------- section view ----------
const SEC = buildSection(W, H);
const secBack = k.figureSvg({
  width: W, height: H, className: "gb-back",
  label: "Section through a gas range burner on a test base: the knob and its stem, the spark switch, the brass plug valve hung from the manifold, the orifice hood firing into the air shutter and the venturi mixing tube, and the burner head with its ports, cap and spark electrode under a cooktop and drip bowl.",
  body: `${SEC.defs}<g class="far">${SEC.back}</g><g class="cavities">${SEC.cavitySvg}</g><g class="fallback" data-fallback="sec">${SEC.fallback}</g>`,
});
const secFront = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg gb-front" viewBox="0 0 ${W} ${H}" aria-hidden="true">${SEC.defs.replace(/id="h-/g, 'id="f-h-').replace(/<defs>[\s\S]*<\/defs>/, "")}<g class="cuts">${SEC.cutsSvg}<g data-dyn="plug">${plugSvg(k, SEC.P, 1)}</g>${SEC.edgesSvg}<g data-dyn="sleeve">${sleeveSvg(k, SEC.P, 1)}</g></g><g data-dyn="knob">${SEC.knob}</g><g class="labels">${SEC.labels}</g></svg>`;

// ---------- ortho view ----------
const ORT = buildOrtho(W, H);

const view = (name, back, front, extra = "") => `<div class="gb-view" data-view="${name}">${back}<canvas class="gb-gl" aria-hidden="true"></canvas>${front}${extra}</div>`;
const stage = `<div class="gb-stage" tabindex="0" role="slider" aria-label="Gas burner. Use the stage tabs or the left and right arrow keys to turn the knob; drag to pan, wheel to zoom." aria-valuemin="0" aria-valuemax="${M.KNOB_MAX}" aria-valuenow="0" aria-valuetext="Off">
  ${view("section", secBack, secFront)}
  ${view("ortho", ORT.back, ORT.front)}
  <div class="gb-inset" aria-hidden="true"><div class="gb-inset-k">Heat output</div><div class="gb-inset-v"><span data-inset>0.00</span><small>kW</small><i class="gb-bar"><b data-bar></b></i></div></div>
  <div class="gb-toggle" role="group" aria-label="View"><button type="button" data-set-view="section" aria-pressed="true">Section</button><button type="button" data-set-view="ortho" aria-pressed="false">Ortho</button></div>
  <div class="gb-live" aria-live="polite" data-live></div>
</div>`;

// ---------- the knob control: drag it, or tap a setting round it ----------
const deg2xy = (d, r) => [-r * Math.sin((d * Math.PI) / 180), -r * Math.cos((d * Math.PI) / 180)];
const f2 = (v) => +v.toFixed(2);
function dialSvg() {
  // flame-size band round the scale: its width follows the valve's flow at each knob angle
  const band = [];
  for (let d = 36; d <= M.KNOB_MAX; d += 3) band.push(deg2xy(d, 58 + 7 * M.flowFraction(d)));
  for (let d = M.KNOB_MAX; d >= 36; d -= 3) band.push(deg2xy(d, 57));
  let ticks = "";
  for (let d = 0; d <= M.KNOB_MAX; d += 15) { const [x0, y0] = deg2xy(d, 50); const [x1, y1] = deg2xy(d, d % 45 === 0 ? 55 : 53); ticks += `M${f2(x0)} ${f2(y0)}L${f2(x1)} ${f2(y1)}`; }
  const sparkArc = (() => { const pts = []; for (let d = M.SWITCH[0]; d <= M.SWITCH[1]; d += 2) pts.push(deg2xy(d, 47)); return "M" + pts.map(([x, y]) => `${f2(x)} ${f2(y)}`).join("L"); })();
  const labels = [["OFF", 0], ["LITE", M.DETENTS.LITE], ["HI", M.DETENTS.HI], ["MED", M.DETENTS.MED], ["LO", M.DETENTS.LO]].map(([t, d]) => {
    const [x, y] = deg2xy(d, 76);
    const anchor = Math.abs(x) < 8 ? "middle" : x < 0 ? "end" : "start";
    return `<g class="dl-stop" data-stage="${t}" role="button" tabindex="-1" aria-label="Turn to ${t}"><circle cx="${f2(x)}" cy="${f2(y)}" r="13" class="dl-hit"/><text x="${f2(x + (anchor === "end" ? 9 : anchor === "start" ? -9 : 0))}" y="${f2(y + 4)}" text-anchor="${anchor}">${t}</text></g>`;
  }).join("");
  let knurl = "";
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; knurl += `M${f2(40 * Math.cos(a))} ${f2(40 * Math.sin(a))}L${f2(43 * Math.cos(a))} ${f2(43 * Math.sin(a))}`; }
  return `<svg class="dl-svg" viewBox="-104 -96 208 192" aria-hidden="true">
  <path class="dl-band" d="M${band.map(([x, y]) => `${f2(x)} ${f2(y)}`).join("L")}Z"/>
  <path class="dl-tick" d="${ticks}"/><path class="dl-spark" d="${sparkArc}"/>
  ${labels}
  <g class="dl-knob" data-knob><circle r="44" class="dl-skirt"/><path class="dl-knurl" d="${knurl}"/><circle r="38" class="dl-face"/><rect x="-7" y="-36" width="14" height="72" rx="6" class="dl-grip"/><circle cx="0" cy="-27" r="2.6" class="dl-point"/></g>
</svg>`;
}
const STEPS = [
  ["Push and turn", "The knob only turns when you push it in, so a bump can't switch the gas on."],
  ["Valve opens", "The brass plug turns and lines its hole up with the gas supply. Gas flows to the orifice."],
  ["Spark clicks", "At LITE a cam on the stem closes the spark switch. The electrode sparks twice a second."],
  ["Gas meets air", "The gas jet drags air in behind it, and the two mix in the tube on the way to the burner."],
  ["Flame catches", "Once the mixture reaches the ports, the next spark lights it and the flame runs round the ring."],
  ["Set the heat", "Turning on toward LO narrows the valve: less gas, shorter flames, less heat."],
];
const controls = `<div class="gb-foot"><span class="gb-hint">Drag the knob, or tap a setting · wheel zooms the drawing</span><span class="gb-readout" data-readout>OFF · 0.00 kW</span></div>
<div class="gb-control">
  <div class="gb-dial" tabindex="0" role="slider" aria-label="Stove knob. Drag to turn, or use the arrow keys. Space jumps between OFF and LITE." aria-valuemin="0" aria-valuemax="${M.KNOB_MAX}" aria-valuenow="0" aria-valuetext="Off">${dialSvg()}</div>
  <div class="gb-explain"><p class="gb-now" data-now>Off. The valve is shut, so no gas reaches the burner.</p>
  <ol class="gb-steps">${STEPS.map(([t, d], i) => `<li data-step="${i}"><b>${t}</b><span>${d}</span></li>`).join("")}</ol></div>
</div>`;

const caption = "A natural-gas range burner on a test base, shown cut down its centre line (Section) and whole (Ortho). Push and turn the knob to LITE: the brass plug valve opens and a cam on the stem closes the spark switch. Gas at 4 in. w.c. leaves a 1.45 mm orifice as a jet that drags air in behind it, and the tube mixes them on the way to the burner head. When the mixture reaches the ports the next spark lights it and the flame runs round the ring. Turning on from HI to LO narrows the valve, from about 2.6 kW (8,800 Btu/h) down to a 0.4 kW simmer. Lumped model: orifice flow and valve throttling are textbook; air entrainment and flame size are fitted approximations.";

const body = `<header class="gb-head"><h1>Gas Burner</h1><p>Ignition, gas flow and combustion in a kitchen range burner</p></header>
<figure class="iso-figure gb"><div class="iso-plate">${stage}${controls}</div><figcaption class="iso-legend"><span class="iso-caption">${caption}</span></figcaption></figure>`;

const DATA = {
  W, H,
  sec: { ...SEC.DATA, camera: glCamera(SEC.P) },
  ort: { ...ORT.DATA, camera: glCamera(ORT.P) },
  detents: M.DETENTS, knobMax: M.KNOB_MAX, burner: M.BURNER,
};
const strip = (f) => readFileSync(join(HERE, f), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const latheSource = readFileSync(fileURLToPath(new URL("../../../../.skill/kit/lathe.mjs", import.meta.url)), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, lightOf, scaleOf, frameAlong, frameOf, pointOf, disc, sphereOf, prismOf, circleOf, arcOf, ribsOf, dotsOf, lathe, solidOf, hullOf, toneOf, bandOf, dot3, add3, sub3, mul3, unit3, cross3, len3 };})();\n`;
const dyn = [knobSvg, sleeveSvg, plugSvg, ...ORT.dynamic].map((fn) => fn.toString()).join("\n");
const CSS = readFileSync(join(HERE, "style.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const script = kitScript() + glScript() + latheScript + strip("model.mjs") + dyn + "\n" + LIVE;

for (const theme of ["light", "dark"]) {
  const page = k.pageHtml({ title: "How a Kitchen Gas Burner Works", theme, body: `<style>${CSS}</style>${body}`, script, width: 1040 });
  const name = theme === "light" ? "gas-burner.html" : "gas-burner-dark.html";
  writeFileSync(join(HERE, name), page);
  console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`);
}

