import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";

// deterministic bean pile inside the hopper (seeded LCG, no Math.random)
function beans(L, P) {
  let seed = 20261030;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const rAt = (s) => (s < 72 ? 7 + (s - 64) * 0.75 : s < 82 ? 13 + (s - 72) * 0.7 : s < 96 ? 20 + (s - 82) * 0.21 : 23);
  const out = [];
  const z0 = 118;
  for (let i = 0; i < 420; i++) {
    const s = 64.5 + rnd() * 36;
    const rr = (rAt(s) - 2.2) * Math.sqrt(rnd());
    const a = rnd() * Math.PI * 2;
    const c = [L.grinder.x + Math.cos(a) * rr, L.grinder.y + Math.sin(a) * rr, z0 + s];
    const [x, y] = k.iso(c, P);
    out.push({ s, d: k.depthOf(c, P), x: +x.toFixed(2), y: +y.toFixed(2), rot: Math.round(rnd() * 180) });
  }
  out.sort((a, b) => a.d - b.d);
  return out.map(({ s, x, y, rot }) => [+s.toFixed(1), x, y, rot]);
}

export function page({ THEME, svg, P, L, ROUTES, kitScript, readFileSync, join, HERE }) {
  const DATA = { P, L, beans: beans(L, P) };
  const latheSource = readFileSync(new URL("../../../../.skill/kit/lathe.mjs", import.meta.url), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
  const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, solidOf, ribsOf, spokesOf, circleOf, arcOf, dot3, add3, mul3, unit3 };})();\n`;
  const live = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
  const css = readFileSync(join(HERE, "machine.css"), "utf8");
  const body = `<style>${css}</style>` + k.plateHtml({
    fig: "Fig 1",
    title: "Bean-to-cup coffee machine",
    hint: "Space · M · S · 1 2 5",
    readout: "Ready · 0.0 bar · 92 °C",
    keys: [
      { mark: "lit", label: "Moving parts: burrs, pump, brew piston" },
      { mark: "raised", label: "Water path: tank → pump → flow meter → thermoblock → brew unit" },
      { mark: "flat", label: "Grounds path: hopper → burrs → chute → chamber → waste bin" },
    ],
    caption: "A bean-to-cup machine with its front and right panels off. Conical burrs grind a 9 g dose (≈7 s at 1.3 g/s) that falls down the chute into the brew chamber; the piston tamps it into a 10 mm puck. The vibration pump draws water from the tank through the flow meter into a 1300 W thermoblock and forces it through the puck at 3 bar for pre-infusion, then 9 bar, at 92 °C: about 40 ml in 25 s. Optional: an auger doses 5 g of sugar, and steam from the thermoblock draws milk from the jug and froths 60 ml into the cup. Then the trap opens, the piston pushes the spent puck into the waste bin and returns.",
    body: `<div class="iso-stage bc-stage" tabindex="0" role="group" aria-label="Bean-to-cup coffee machine. Space brews a cup, M toggles milk, S toggles sugar, 1, 2 and 5 set the speed.">${svg}</div>
<div class="bc-controls" role="toolbar" aria-label="Machine controls">
<button type="button" data-act="brew" class="bc-main">Brew</button>
<button type="button" data-act="milk" aria-pressed="false">Milk</button>
<button type="button" data-act="sugar" aria-pressed="false">Sugar</button>
<span class="bc-sep"></span>
<button type="button" data-speed="1" aria-pressed="true">1×</button><button type="button" data-speed="2" aria-pressed="false">2×</button><button type="button" data-speed="5" aria-pressed="false">5×</button>
</div>`,
  });
  return k.pageHtml({ title: "Bean-to-cup coffee machine", theme: THEME, body, script: kitScript() + latheScript + live, width: 720 });
}
