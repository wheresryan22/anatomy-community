export const FILM = {
  fig: "Fig 1",
  title: "Inside a wireless gaming mouse",
  radius: 100,
  label:
    "A matte-black wireless gaming mouse tumbles in, is seen close on its sculpted shell, side buttons and underside, its left button clicks an optical switch, its sensor lights the surface, the shell lifts to show the board, radio and battery, then it comes apart into its assemblies and goes back together for a final orbit.",
  bounds: [
    [-33, 78],
    [-63, 63],
    [0, 41],
  ],
};

export const FIGURE = {
  title: "Inside a wireless gaming mouse",
  start: { yaw: -38, pitch: 26 },
  label:
    "A conceptual 125 × 65 × 40 mm wireless gaming mouse built from {parts} solid parts: a sculpted top shell of palm, two main buttons and a centre channel with the DPI button, flank walls with a rear RGB light guide and two side buttons, a bottom housing with PTFE feet, two optical click switches, a scroll-wheel module with its encoder, a main board with the wireless SoC, power management, USB-C and optical sensor, a lens in the base aperture, a stamped 2.4 GHz antenna, a lithium-polymer battery and a separate USB receiver. Apart, it opens into {assemblies} assemblies.",
  keys: [
    { mark: "raised", label: "Exterior: shell, buttons, walls, base, feet" },
    { mark: "lit", label: "Electronics: board, SoC, sensor, radio, power" },
    { mark: "edge", label: "Mechanisms: switches, wheel, encoder" },
  ],
  caption:
    "{parts} convex parts, re-projected and re-shaded every frame and painted in an order solved from separating planes. The top shell is an intersection of fitted spheres: each panel is one sphere cut by its neighbours' radical planes, so the panels are curved and meet along exact character lines. Dimensions and internals are a plausible concept, not a production teardown.",
};

// Feature channels (film and page). Click/beam etc. are 0…1; wheel in degrees.
export const FEATURE_DEFAULTS = { click: 0, clickR: 0, wheel: 0, sideOpen: 0, lensDrop: 0, reveal: 0, rays: 0, beam: 0, sig: 0, pow: 0, chg: 0, link: 0, labels: 0, rgb: 0.35 };

export const FEATURE_KEYS = [
  { key: "c", channel: "click", name: "left click", unit: "", values: [0, 1], ease: 0.12, verb: "clicks the left button" },
  { key: "w", channel: "wheel", name: "wheel", unit: "°", step: 90, ease: 0.25, verb: "turns the scroll wheel" },
  { key: "o", channel: "rays", name: "optical", unit: "", values: [0, 1], ease: 0.2, verb: "shows optical tracking" },
  { key: "r", channel: "link", name: "wireless", unit: "", values: [0, 1], ease: 0.2, verb: "shows the wireless link" },
  { key: "p", channel: "pow", name: "power", unit: "", values: [0, 1], ease: 0.2, verb: "shows power flow" },
];

const CLICK_DEG = ((0.1 + 0.6) / (37 - (-4 + 0.15))) * (180 / Math.PI);
const clickPress = (v) => Math.max(0, v * 0.7 - 0.1);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const SIDE_WALLS = ["wall.L02", "wall.L03", "wall.L04", "wall.L05", "wall.L06"];

export function featureValues(s, values) {
  const out = { ...values };
  out["click.L"] = -CLICK_DEG * clamp01(s.click);
  out["switch.L.press"] = clickPress(clamp01(s.click));
  out["click.R"] = -CLICK_DEG * clamp01(s.clickR);
  out["switch.R.press"] = clickPress(clamp01(s.clickR));
  out["wheel.spin"] = s.wheel;
  if (s.reveal) out.top = Math.max(out.top ?? 0, 280 * s.reveal);
  if (s.sideOpen) {
    for (const w of SIDE_WALLS) out[w] = Math.max(out[w] ?? 0, 44 * s.sideOpen);
    out["side.buttons"] = Math.max(out["side.buttons"] ?? 0, 56 * s.sideOpen);
  }
  if (s.lensDrop) out.lens = Math.max(out.lens ?? 0, 9 * s.lensDrop);
  return out;
}

export function featureTravel(a, b) {
  return Math.max(
    Math.abs(b.click - a.click) * 1.8,
    Math.abs(b.clickR - a.clickR) * 1.8,
    (Math.abs(b.wheel - a.wheel) * Math.PI * 12.5) / 180,
    Math.abs(b.sideOpen - a.sideOpen) * 56,
    Math.abs(b.lensDrop - a.lensDrop) * 9,
    Math.abs(b.reveal - a.reveal) * 280,
  );
}

// ---- conceptual overlays (drawn in screen space over the model, never part of the geometry) ----
// Points are in the mouse's frame (mm) and ride with the named assembly (explode and feature offsets).
export const OVERLAY = {
  beam: { from: [-12.2, 39.5, 10.2], to: [-12.2, 34.5, 10.2], stop: [-12.2, 38.9, 10.2], owner: "switch.L" },
  rays: {
    led: { p: [0, -6.4, 5.6], owner: "sensor" },
    pipe: { p: [0, -6.4, 1.3], owner: "lens" },
    hit: { p: [0, 2, 0], owner: null },
    dome: { p: [0, 2, 1.0], owner: "lens" },
    eye: { p: [0, 2, 5.6], owner: "sensor" },
    pad: { c: [0, 2, 0], w: 30, h: 26 },
  },
  link: { from: { p: [0, -50, 11], owner: "antenna" }, to: { p: [72, 34, 6.2], owner: "dongle" } },
  labels: [
    { text: "A · Top shell & main buttons", p: [0, -14, 40], owner: "top", side: -1 },
    { text: "C · Scroll wheel + encoder", p: [0, 32, 39], owner: "wheel", side: 1 },
    { text: "B · Optical click switches", p: [-13.5, 37, 12], owner: "switch.L", side: -1 },
    { text: "G · Li-Po battery 300 mAh", p: [-3, -26, 12.5], owner: "battery", side: 1 },
    { text: "E · Main PCB, SoC, PMIC", p: [14, -6, 5.6], owner: "pcb", side: 1 },
    { text: "F · 2.4 GHz antenna", p: [0, -50, 11], owner: "antenna", side: -1 },
    { text: "D · Optical sensor + lens", p: [0, 4, 1.4], owner: "lens", side: -1 },
    { text: "H · Base, PTFE feet, screws", p: [0, 47, 0], owner: "feet", side: 1 },
    { text: "A · Flank walls · RGB guide", p: [-30, -50, 16], owner: "wall.L10", side: -1 },
  ],
};

export const FLOW_CSS = `
.iso-svg path.cu{vector-effect:none}
.iso-svg path.flow{vector-effect:none;fill:none;stroke-width:.55;stroke-linecap:round;stroke-dasharray:1.2 2.2;stroke-dashoffset:calc(var(--flow-t,0) * -14);opacity:0}
.iso-svg path.flow-sig{stroke:#16c3e0;opacity:var(--sig,0)}
.iso-svg path.flow-pow{stroke:#f2b234;stroke-width:.7;opacity:var(--pow,0)}
.iso-svg path.flow-chg{stroke:#7ee06a;stroke-width:.7;opacity:var(--chg,0)}
[data-mat="rgb"]{filter:saturate(calc(.6 + var(--rgb,0) * 1.2)) brightness(calc(.92 + var(--rgb,0) * .22)) drop-shadow(0 0 calc(var(--rgb,0) * 5px) rgba(190,90,255,calc(var(--rgb,0) * .9)))}
.ov{position:absolute;inset:0;pointer-events:none;overflow:visible}
.ov path,.ov circle,.ov line{vector-effect:non-scaling-stroke}
.ov .ov-ray{fill:none;stroke:#13b6d6;stroke-width:2.6;stroke-dasharray:6 5;stroke-linecap:round}
.ov .ov-ray-in{fill:none;stroke:#e5484d;stroke-width:2.6;stroke-dasharray:6 5;stroke-linecap:round}
.ov .ov-pad{fill:rgba(19,182,214,.07);stroke:rgba(19,140,170,.6);stroke-width:1}
.ov .ov-tex{fill:none;stroke:rgba(19,140,170,.35);stroke-width:.7}
.ov .ov-beam{fill:none;stroke:#13b6d6;stroke-width:2.2;stroke-linecap:round}
.ov .ov-beam-cut{fill:none;stroke:#e5484d;stroke-width:2.2;stroke-linecap:round}
.ov .ov-link{fill:none;stroke:#13b6d6;stroke-width:1.5;stroke-dasharray:2 7;stroke-linecap:round}
.ov .ov-arc{fill:none;stroke:#13b6d6;stroke-width:1.3}
.ov .ov-lead{fill:none;stroke:rgba(40,36,30,.62);stroke-width:.9}
.ov .ov-dot{fill:#1b1a18}
.ov .ov-label{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;fill:#1c1a16;letter-spacing:.04em;font-weight:500;paint-order:stroke;stroke:#f3eee4;stroke-width:4px;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.ov .ov-tag{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;fill:#0f8fab;letter-spacing:.14em;font-weight:600}
`;
