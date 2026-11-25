# Change Ledger

Append-only. One entry per changed file per turn, written automatically by the
change-ledger hook when the turn ends. **Never edit or delete entries** — this is the
record of what was done to this folder, by whom, when, and why. Rewriting it destroys
the only proof that exists.

---

## 2026-11-25T08:34:34.144Z — model.mjs (created; net change for the turn)

- **File:** `C:\Users\ELKor\anatomy\examples\fire-alarm-panel\model.mjs`
- **Tools used on it this turn:** Write, Bash
- **Session:** `af5ba536-c6bb-4573-9116-e5c4b7f934ea`
- **Instruction that led to this turn:** (no prompt captured)

```diff
--- a/model.mjs
+++ b/model.mjs
@@ -0,0 +1,165 @@
+// The panel's behaviour as one pure state machine. The build imports the constants and
+// inlines SOURCE into the page, so the figure, its readout and its caption share one model.
+
+export const CLEAN_AIR = 0.3; // %/ft obscuration a photoelectric head reads in clean air
+export const PHOTO_ALARM = 2.5; // %/ft alarm threshold, inside UL 268's 0.5–4.0 %/ft window
+export const HEAT_FIXED_F = 135; // °F fixed-temperature heat detector
+export const ROOM_F = 72;
+export const POLL_S = 0.7; // one address per 0.7 s, slowed for the eye
+export const STROBE_HZ = 1; // synchronized strobes flash once a second
+export const BATTERY_AH = 18;
+export const RETARD_S = 5; // waterflow retard, set short here (switches allow about 0–90 s)
+export const COMM_S = 3; // communicator dials out and gets the receiver's acknowledgement
+
+export const CAPTION =
+  "An addressable panel talks to every device on one pair of wires, the signalling line circuit. It sends each address in turn, " +
+  "and only that device answers, with a reading: smoke obscuration in %/ft, temperature, or a contact state. When smoke detector 002 reads " +
+  `${PHOTO_ALARM} %/ft or more (UL 268 allows 0.5–4.0), or the pull station's switch opens, or water keeps flowing past the riser's paddle switch for its retard time (5 s here; 0–90 s in the field), the panel latches a fire alarm, lights its red LED, ` +
+  "and puts 24 V on the notification circuit: the horn sounds the temporal-three pattern (0.5 s on, 0.5 off, three times, then 1.5 s off) and the strobe " +
+  "flashes once a second. Acknowledge stops the panel buzzer and steadies the LED; silence stops the horn but leaves the strobe flashing; reset clears the alarm only once nothing is still in alarm. " +
+  "The loop leaves and returns to the panel (Class A), so one break still leaves every device reachable from one end. In standby the panel watches the notification circuit through the end-of-line resistor. " +
+  `A communicator under the cabinet reports every alarm to a monitoring centre. Two 12 V ${BATTERY_AH} Ah batteries in series carry the system for 24 hours plus 5 minutes of alarm if mains power fails. Polling is slowed for the eye.`;
+
+// Everything below is also emitted into the page as source.
+export function createPanel() {
+  const DEVICES = [
+    { addr: "001", id: "d1", type: "PHOTO" },
+    { addr: "002", id: "d2", type: "PHOTO" },
+    { addr: "003", id: "d3", type: "HEAT" },
+    { addr: "004", id: "pull", type: "PULL" },
+    { addr: "005", id: "flow", type: "FLOW" },
+  ];
+  const state = {
+    obscuration: CLEAN_AIR,
+    smokeOn: false,
+    pulled: false,
+    flowOn: false,
+    flowClock: 0,
+    alarm: null,
+    acked: false,
+    silenced: false,
+    drill: false,
+    resetting: 0,
+    poll: 0,
+    pollClock: 0,
+    pollFlash: 0,
+    blink: {},
+    last: null,
+    nacClock: 0,
+    commClock: 0,
+  };
+  const reading = (dev) => {
+    if (dev.type === "PHOTO") return dev.id === "d2" ? state.obscuration : CLEAN_AIR;
+    if (dev.type === "HEAT") return ROOM_F;
+    if (dev.type === "FLOW") return state.flowOn ? 1 : 0;
+    return state.pulled ? 1 : 0;
+  };
+  const inAlarm = (dev) => {
+    const value = reading(dev);
+    if (dev.type === "PHOTO") return value >= PHOTO_ALARM;
+    if (dev.type === "HEAT") return value >= HEAT_FIXED_F;
+    if (dev.type === "FLOW") return state.flowClock >= RETARD_S;
+    return value === 1;
+  };
+  const describe = (dev, value) => {
+    if (dev.type === "PHOTO") return `${dev.addr} PHOTO ${value.toFixed(1)}%/FT`;
+    if (dev.type === "HEAT") return `${dev.addr} HEAT ${value}F`;
+    if (dev.type === "FLOW") return `${dev.addr} FLOW ${value ? "ACTIVE" : "NORMAL"}`;
+    return `${dev.addr} PULL ${value ? "PULLED" : "NORMAL"}`;
+  };
+  function pollNext() {
+    const dev = DEVICES[state.poll];
+    const value = reading(dev);
+    state.last = { dev, value };
+    state.blink[dev.id] = 0.18;
+    state.pollFlash = 0.22;
+    if (!state.resetting && !state.alarm && inAlarm(dev)) {
+      state.alarm = dev;
+      state.acked = false;
+      state.silenced = false;
+      state.nacClock = 0;
+      state.commClock = 0;
+    }
+    state.poll = (state.poll + 1) % DEVICES.length;
+  }
+  function step(dt) {
+    const target = state.smokeOn ? 3.2 : CLEAN_AIR;
+    const tau = state.smokeOn ? 2.4 : 3;
+    state.obscuration += (target - state.obscuration) * (1 - Math.exp(-dt / tau));
+    state.flowClock = state.flowOn ? state.flowClock + dt : 0;
+    state.pollClock += dt;
+    while (state.pollClock >= POLL_S) {
+      state.pollClock -= POLL_S;
+      pollNext();
+    }
+    state.pollFlash = Math.max(0, state.pollFlash - dt);
+    for (const id in state.blink) state.blink[id] = Math.max(0, state.blink[id] - dt);
+    if (state.resetting) state.resetting = Math.max(0, state.resetting - dt);
+    state.nacClock += dt;
+    state.commClock += dt;
+  }
+  function settle() {
+    state.obscuration = state.smokeOn ? 3.2 : CLEAN_AIR;
+    for (let i = 0; i < DEVICES.length; i++) pollNext();
+    state.resetting = 0;
+  }
+  const temporal3 = (t) => {
+    const c = t % 4; // 0.5 on, 0.5 off, ×3, then 1.5 off
+    return c < 3 && c % 1 < 0.5;
+  };
+  function view(t) {
+    const nac = (!!state.alarm || state.drill) && !state.resetting;
+    const nt = state.nacClock;
+    const strobe = nac && nt % (1 / STROBE_HZ) < 0.12;
+    const horn = nac && !state.silenced && temporal3(nt);
+    const leds = { ac: "green", fire: null, supv: null, trbl: null, sil: state.silenced ? "amber" : null };
+    if (state.alarm) leds.fire = state.acked || Math.floor(t * 2) % 2 === 0 ? "red" : null;
+    const sent = !!state.alarm && state.commClock >= COMM_S;
+    leds.comm = state.alarm ? (sent ? "green" : Math.floor(t * 4) % 2 ? "amber" : null) : null;
+    for (const dev of DEVICES) {
+      if (state.alarm && state.alarm.id === dev.id) leds[dev.id] = "red";
+      else leds[dev.id] = state.blink[dev.id] > 0 ? "green" : null;
+    }
+    let lcd, readout;
+    const last = state.last;
+    if (state.resetting) {
+      lcd = ["SYSTEM RESET", "IN PROGRESS"];
+      readout = "Resetting";
+    } else if (state.alarm) {
+      const a = state.alarm;
+      const what = a.type === "PHOTO" ? `PHOTO ${reading(a).toFixed(1)}%/FT` : a.type === "HEAT" ? "HEAT" : a.type === "FLOW" ? "WATERFLOW" : "PULL STATION";
+      lcd = [`FIRE ALARM ${a.addr}${state.silenced ? " SIL" : state.acked ? " ACK" : ""}`, what];
+      const dev = a.type === "PHOTO" ? `${a.addr} smoke ${reading(a).toFixed(1)} %/ft` : a.type === "FLOW" ? `${a.addr} waterflow` : `${a.addr} pull station`;
+      readout = `Fire alarm · ${dev} · ${state.silenced ? "silenced" : sent ? "reported" : "reporting…"}`;
+    } else if (state.drill) {
+      lcd = ["DRILL ACTIVE", "NAC 1 ON"];
+      readout = "Drill · horn and strobe on";
+    } else {
+      lcd = ["SYSTEM NORMAL", last ? describe(last.dev, last.value) : "POLLING"];
+      const word = { PHOTO: () => last.value.toFixed(1) + " %/ft", HEAT: () => last.value + " °F", PULL: () => (last.value ? "pulled" : "not pulled"), FLOW: () => (last.value ? "water flowing" : "no flow") };
+      readout = last ? `Normal · ${last.dev.addr} · ${word[last.dev.type]()}` : "Normal";
+    }
+    return { leds, lcd, readout, poll: state.pollFlash > 0, nac, horn, strobe };
+  }
+  return {
+    state,
+    step,
+    view,
+    settle,
+    smoke(on) { state.smokeOn = on; },
+    pull() { state.pulled = true; },
+    flow(on) { state.flowOn = on; },
+    ack() { if (state.alarm) state.acked = true; },
+    silence() { if (state.alarm || state.drill) { state.silenced = true; state.acked = true; } },
+    drill() { state.drill = !state.drill; state.silenced = false; state.nacClock = 0; },
+    reset() {
+      state.alarm = null; state.acked = false; state.silenced = false; state.drill = false;
+      state.pulled = false; state.resetting = 2.5;
+    },
+  };
+}
+
+export const SOURCE = [
+  `const CLEAN_AIR = ${CLEAN_AIR}, PHOTO_ALARM = ${PHOTO_ALARM}, HEAT_FIXED_F = ${HEAT_FIXED_F}, ROOM_F = ${ROOM_F}, POLL_S = ${POLL_S}, STROBE_HZ = ${STROBE_HZ}, COMM_S = ${COMM_S}, RETARD_S = ${RETARD_S};`,
+  createPanel.toString(),
+].join("\n");

```

---

## 2026-11-25T08:34:34.144Z — build.mjs (created; net change for the turn)

- **File:** `C:\Users\ELKor\anatomy\examples\fire-alarm-panel\build.mjs`
- **Tools used on it this turn:** Write, Bash, Edit
- **Session:** `af5ba536-c6bb-4573-9116-e5c4b7f934ea`
- **Instruction that led to this turn:** (no prompt captured)

```diff
--- a/build.mjs
+++ b/build.mjs
@@ -0,0 +1,576 @@
+import { writeFileSync } from "node:fs";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import * as k from "../../kit/iso-kit.mjs";
+import * as G from "../../kit/lathe.mjs";
+import { kitScript } from "../../scripts/inline-kit.mjs";
+import * as M from "./model.mjs";
+
+const HERE = dirname(fileURLToPath(import.meta.url));
+const theme = process.argv.includes("--light") ? "light" : "dark";
+
+const WIDTH = 680;
+const HEIGHT = 470;
+
+// ---------- world layout (units ≈ px, wall face at y = 0, z up) ----------
+const BASE = { x: -148, y: -16, w: 276, d: 38, r: 6 };
+const BASE_H = 9;
+const FOOT_H = 5;
+const BOARD = { x: -138, y: -6, w: 256, d: 6, r: 1 };
+const BOARD_TOP = 178;
+const WIRE_Y = 9; // field wiring stands 9 off the wall on clips
+
+const CAB = { x0: -126, x1: -44, d: 16, z0: 34, z1: 158, t: 2 };
+const LANES = { slcB: 90.8, nac: 92.9, slcA: 95 }; // wiring channel under the main board
+
+const DEV = {
+  d1: { x: -15, z: 146 },
+  d2: { x: 40, z: 146 },
+  d3: { x: 95, z: 146 },
+  pull: { x: 95, z0: 82, z1: 114 },
+  horn: { x0: -9, x1: 13, z0: 86, z1: 114 },
+  eol: { x0: 32, x1: 46, z0: 90, z1: 102 },
+};
+const RETURN_Z = 70;
+
+const P = k.fitProjection(
+  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), ...k.boxCorners(BOARD, 0, BOARD_TOP)],
+  WIDTH,
+  HEIGHT,
+  { pad: 22, azimuth: 64 },
+);
+
+const at = (point) => k.iso(point, P);
+const S = (paths, style) => k.solidSvg(paths, style);
+const L = (d, style) => k.lineSvg(d, style);
+const D = (points, style) => k.dotsSvg(points, style);
+const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
+const plane = (y) => k.sideMatrix([0, y], 0, P, "left"); // local (x, -z) on the face at y
+const box = (x0, x1, y0, y1, z0, z1, r = 0.8) => k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, 3, Math.min(0.6, r));
+const faceCircle = (cx, y, cz, r, steps = 40) =>
+  k.pathOf(Array.from({ length: steps }, (_, i) => at([cx + r * Math.cos((i / steps) * Math.PI * 2), y, cz + r * Math.sin((i / steps) * Math.PI * 2)])), true);
+const faceRect = (x0, x1, z0, z1, y, r = 0.8) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 4).map(([u, z]) => at([u, y, z])), true);
+const sideRect = (y0, y1, z0, z1, x, r = 0.8) => k.pathOf(k.roundedPlan({ x: y0, y: z0, w: y1 - y0, d: z1 - z0, r }, 4).map(([v, z]) => at([x, v, z])), true);
+const sideCircle = (x, cy, cz, r, steps = 32) =>
+  k.pathOf(Array.from({ length: steps }, (_, i) => at([x, cy + r * Math.cos((i / steps) * Math.PI * 2), cz + r * Math.sin((i / steps) * Math.PI * 2)])), true);
+const wire3 = (points, style = {}) => k.wireSvg(at(points[0]), at(points[points.length - 1]), { via: points.slice(1, -1).map(at), size: 1, ...style });
+const alongY = (x, y, z) => G.frameOf([x, y, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
+const alongX = (x, y, z) => G.frameOf([x, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
+
+// ---------- base and backboard ----------
+function base() {
+  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
+  for (const [x, y] of byDepth(k.corners(BASE, 16))) {
+    out.push(S(k.cylinder(x, y, 6.4, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
+    out.push(S(k.cylinder(x, y, 5, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
+  }
+  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4), { tone: "mid" }));
+  out.push(L(k.planOutline(k.insetPlan(BASE, 4), 0, P), { tone: "lo" }));
+  const screws = k.corners(BASE, 8);
+  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }));
+  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
+  // label plate on the plinth
+  const label = { x: 2, y: 8, w: 46, d: 10, r: 1.2 };
+  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
+  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }));
+  out.push(L([34, 26, 18].map((w, i) => k.lineOnTop([label.x + 4, label.y + 3 + i * 2.2], [label.x + 4 + w, label.y + 3 + i * 2.2], 0.8, P)).join(""), { tone: "lo", free: true }));
+  out.push(D([at([label.x + label.w - 3, label.y + 2.6, 0.8]), at([label.x + label.w - 3, label.y + label.d - 2.6, 0.8])], { size: 0.4 }));
+  // backboard: fire-rated plywood on two cleats
+  for (const x of [-118, 98]) out.push(S(box(x - 8, x + 8, -14, -6, 0, 10, 1), { tone: "mid" }));
+  out.push(S(k.slabOf(BOARD, 0, BOARD_TOP, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(BOARD, 10, P, 3), { tone: "faint" }) }));
+  const boardScrews = [[-132, 6], [-132, 172], [112, 6], [112, 172], [0, 172], [0, 6]];
+  out.push(L(boardScrews.map(([x, z]) => faceCircle(x, 0, z, 1.8, 18)).join(""), { tone: "lo" }));
+  out.push(D(boardScrews.map(([x, z]) => at([x, 0, z])), { size: 0.45 }));
+  return out.join("");
+}
+
+// ---------- the panel cabinet ----------
+const { x0: CX0, x1: CX1, d: CD, z0: CZ0, z1: CZ1, t: CT } = CAB;
+
+function communicator() {
+  const out = [];
+  out.push(S(box(-66, -24, 0, 9, 8, 28, 1.2), { tone: "mid", inner: L(k.sideSeam({ x: -66, y: 0, w: 42, d: 9, r: 1.2 }, 24, P, 3), { tone: "faint" }) }));
+  out.push(L(faceRect(-62, -44, 11, 20, 9, 0.8), { tone: "faint" }));
+  out.push(L([12, 9, 11].map((w, i) => k.segment([-60, 9, 18 - i * 2.4], [-60 + w, 9, 18 - i * 2.4], P)).join(""), { tone: "lo", free: true }));
+  out.push(D([at([-63, 9, 25.5]), at([-27, 9, 25.5]), at([-63, 9, 10.5]), at([-27, 9, 10.5])], { size: 0.4, tone: "lo" }));
+  out.push(`<path class="fa-led" data-led="comm" d="${faceCircle(-34, 9, 15, 1.15, 20)}"/>`);
+  // conduit nipple up into the cabinet floor, and a stub antenna
+  out.push(S(k.cylinder(-54, 5, 2.4, 28, CZ0 - 28, P, 20), { tone: "mid" }));
+  out.push(S(k.cylinder(-30, 5, 2, 28, 2, P, 18), { tone: "lo" }));
+  out.push(S(k.cylinder(-30, 5, 1.1, 30, 20, P, 16), { tone: "mid", inner: L(k.sideArc(-30, 5, 1.1, 40, P, 10), { tone: "faint" }) }));
+  out.push(S(k.cylinder(-30, 5, 1.5, 50, 2, P, 16), { tone: "mid" }));
+  return out.join("");
+}
+
+function cabinetBack() {
+  const out = [communicator()];
+  out.push(S(box(CX0, CX1, 0, 1.5, CZ0, CZ1, 0.4), { tone: "lo" }));
+  out.push(S(box(CX0, CX1, 0, CD, CZ0, CZ0 + CT, 0.6), { tone: "mid" }));
+  out.push(S(box(CX0, CX0 + CT, 0, CD, CZ0 + CT, CZ1 - CT, 0.4), { tone: "mid" }));
+  const screws = [[CX0 + 6, CZ1 - 8], [CX1 - 6, CZ1 - 8], [CX0 + 6, CZ0 + 26], [CX1 - 6, CZ0 + 26]];
+  out.push(L(screws.map(([x, z]) => faceCircle(x, 1.5, z, 1.6, 16)).join(""), { tone: "faint" }));
+  out.push(D(screws.map(([x, z]) => at([x, 1.5, z])), { size: 0.45, tone: "lo" }));
+  return out.join("");
+}
+
+function batteries() {
+  const out = [];
+  [-122, -89].forEach((x, index) => {
+    const z0 = CZ0 + CT;
+    out.push(S(box(x, x + 30, 1.5, 15.5, z0, z0 + 18, 1), { tone: "mid", inner: L(k.sideSeam({ x, y: 1.5, w: 30, d: 14, r: 1 }, z0 + 15, P, 3), { tone: "faint" }) }));
+    out.push(S(box(x + 0.6, x + 29.4, 2.1, 14.9, z0 + 18, z0 + 19.4, 0.8), { tone: "lo" }));
+    // label on the front face: three printed rule lines
+    out.push(L(faceRect(x + 4, x + 22, z0 + 4, z0 + 11, 15.5, 0.6), { tone: "faint" }));
+    out.push(L([14, 10, 12].map((w, i) => k.segment([x + 6, 15.5, z0 + 9 - i * 2], [x + 6 + w, 15.5, z0 + 9 - i * 2], P)).join(""), { tone: "lo", free: true }));
+    for (const tx of [x + 6, x + 24]) {
+      out.push(S(k.cylinder(tx, 10, 1.6, z0 + 19.4, 1.2, P, 16), { tone: "lo" }));
+      out.push(S(k.cylinder(tx, 10, 1.1, z0 + 20.6, 1.4, P, 16), { tone: "hi" }));
+    }
+    out.push(`<!-- battery ${index + 1}: 12 V ${M.BATTERY_AH} Ah -->`);
+  });
+  const top = CZ0 + CT + 22;
+  out.push(wire3([[-98, 10, top], [-98, 10, top + 3], [-83, 10, top + 3], [-83, 10, top]], { tone: "mid" }));
+  return out.join("");
+}
+
+function powerSupply() {
+  const out = [];
+  // transformer: laminated core with its coil
+  out.push(S(box(-122, -102, 1.5, 11, 66, 84, 0.4), { tone: "mid", inner: L([69, 72, 75, 78, 81].map((z) => k.sideSeam({ x: -122, y: 1.5, w: 20, d: 9.5, r: 0.4 }, z, P, 3)).join(""), { tone: "faint" }) }));
+  out.push(S(box(-118, -106, 1.5, 13, 69, 81, 1.6), { tone: "hi" }));
+  out.push(D([at([-120, 11, 84]), at([-104, 11, 84])], { size: 0.45 }));
+  // power-supply board
+  out.push(S(box(-98, -54, 1.5, 2.9, 64, 90, 0.4), { tone: "lo" }));
+  out.push(D([[-95, 87], [-57, 87], [-95, 67], [-57, 67]].map(([x, z]) => at([x, 2.9, z])), { size: 0.5, tone: "mid" }));
+  out.push(S(box(-94, -82, 2.9, 8, 66, 70.5, 0.5), { tone: "mid" }));
+  out.push(D([-91, -88, -85].map((x) => at([x, 5.5, 70.5])), { size: 0.5, tone: "hi" }));
+  out.push(S(box(-80, -72, 2.9, 5.6, 66.4, 69.6, 1.2), { tone: "hi" }));
+  for (const [cx, cz] of [[-88, 80], [-80, 80]]) {
+    const F = alongY(cx, 2.9, cz);
+    out.push(S(G.solidOf([[0, 3], [6.4, 3], [7, 2.4]], F, P), { tone: "hi", inner: L(G.arcOf(F, 5.6, 3, P), { tone: "faint" }) }));
+  }
+  // heat sink with fins running edge to edge
+  out.push(S(box(-72, -58, 2.9, 8.9, 74, 88, 0.3), { tone: "mid", inner: L([-69, -66, -63, -60].map((x) => k.segment([x, 8.9, 74], [x, 8.9, 88], P)).join(""), { tone: "lo" }) }));
+  return out.join("");
+}
+
+const KEYS = [
+  { act: "ack", x: -116, label: "Acknowledge" },
+  { act: "silence", x: -104, label: "Alarm silence" },
+  { act: "reset", x: -92, label: "System reset" },
+  { act: "drill", x: -80, label: "Drill" },
+];
+const LEDS = [
+  { id: "ac", z: 141 },
+  { id: "fire", z: 137 },
+  { id: "supv", z: 133 },
+  { id: "trbl", z: 129 },
+  { id: "sil", z: 125 },
+];
+const LCD = { x0: -114, x1: -72, z0: 129, z1: 141, y: 5.3 };
+const LED_X = -66;
+const TBS = [
+  { id: "slcB", x0: -116, x1: -104 },
+  { id: "nac", x0: -100, x1: -88 },
+  { id: "slcA", x0: -84, x1: -72 },
+  { id: "aux", x0: -68, x1: -56 },
+];
+
+function mainBoard() {
+  const out = [];
+  out.push(S(box(-120, -52, 1.5, 3.1, 96, 146, 0.4), { tone: "lo" }));
+  out.push(D([[-117, 143], [-55, 143], [-117, 99], [-55, 99]].map(([x, z]) => at([x, 3.1, z])), { size: 0.55, tone: "mid" }));
+  // display: bezel, recessed window, two lines of text
+  out.push(S(box(-116, -70, 3.1, 5.3, 127, 143, 0.6), { tone: "mid" }));
+  out.push(`<path class="fa-lcd" data-part="lcd" d="${faceRect(LCD.x0, LCD.x1, LCD.z0, LCD.z1, LCD.y, 0.6)}"/>`);
+  out.push(L(faceRect(LCD.x0, LCD.x1, LCD.z0, LCD.z1, LCD.y, 0.6), { tone: "lo" }));
+  out.push(
+    `<g transform="${plane(LCD.y)}"><clipPath id="fa-lcd-clip"><rect x="${LCD.x0}" y="${-LCD.z1}" width="${LCD.x1 - LCD.x0}" height="${LCD.z1 - LCD.z0}"/></clipPath>` +
+      `<g clip-path="url(#fa-lcd-clip)"><text class="fa-lcd-text" data-part="lcd1" x="${LCD.x0 + 1.4}" y="${-136.2}" font-size="3.3">SYSTEM NORMAL</text>` +
+      `<text class="fa-lcd-text" data-part="lcd2" x="${LCD.x0 + 1.4}" y="${-131.1}" font-size="3.3">POLL 001 PHOTO 0.3</text></g></g>`,
+  );
+  // indicator LEDs in a column beside the display
+  for (const led of LEDS) {
+    const F = alongY(LED_X, 3.1, led.z);
+    out.push(S(G.disc(0, 1, 1.7, F, P), { tone: "mid" }));
+    out.push(`<path class="fa-led" data-led="${led.id}" d="${faceCircle(LED_X, 4.1, led.z, 1.15, 20)}"/>`);
+  }
+  // keys: acknowledge, silence, reset, drill
+  for (const key of KEYS) {
+    out.push(`<g class="fa-key" data-act="${key.act}" role="button" aria-label="${key.label}">${S(box(key.x, key.x + 10, 3.1, 4.9, 114, 121, 1), { tone: "hi" })}</g>`);
+  }
+  // processor and memory
+  out.push(S(box(-61, -53, 3.1, 4.3, 126, 134, 0.3), { tone: "mid", inner: L(faceCircle(-59.6, 4.3, 132.6, 0.6, 10), { tone: "lo" }) }));
+  out.push(S(box(-61, -53, 3.1, 4.1, 113, 121, 0.3), { tone: "mid" }));
+  out.push(D(Array.from({ length: 6 }, (_, i) => at([-60 + i * 1.4, 3.1, 125.6])), { size: 0.3, tone: "lo" }));
+  // field terminal blocks along the bottom edge
+  for (const tb of TBS) {
+    out.push(S(box(tb.x0, tb.x1, 3.1, 9, 98, 103.5, 0.5), { tone: "mid" }));
+    const screws = [tb.x0 + 2.2, tb.x0 + 6, tb.x0 + 9.8];
+    out.push(L(screws.map((x) => k.ring(x, 6, 1.1, 103.5, P, 12)).join(""), { tone: "lo" }));
+    out.push(D(screws.map((x) => at([x, 6, 103.5])), { size: 0.4, tone: "hi" }));
+  }
+  return out.join("");
+}
+
+// wires inside the cabinet: from each terminal block down into the channel and out to the right wall
+function innerWires() {
+  const out = [];
+  const lane = { slcB: LANES.slcB, nac: LANES.nac, slcA: LANES.slcA };
+  for (const tb of TBS.slice(0, 3)) {
+    const x = tb.x0 + 6;
+    const z = lane[tb.id];
+    out.push(`<g data-wire="${tb.id === "nac" ? "nac" : "slc"}">${wire3([[x, 9, 98], [x, 9, z], [CX1 - CT, 9, z]], { ends: "from", tone: "hi" })}</g>`);
+  }
+  // battery leads up to the power board
+  out.push(wire3([[-116, 10, CZ0 + CT + 22], [-116, 10, 62], [-96, 10, 62], [-96, 7, 66]], { tone: "lo" }));
+  out.push(wire3([[-65, 10, CZ0 + CT + 22], [-65, 10, 62], [-60, 10, 62], [-60, 9, 66]], { tone: "lo" }));
+  return out.join("");
+}
+
+function cabinetFront() {
+  const out = [];
+  out.push(S(box(CX1 - CT, CX1, 0, CD, CZ0 + CT, CZ1 - CT, 0.4), { tone: "mid" }));
+  // knockouts on the right wall where the field wiring leaves
+  const holes = [LANES.slcB, LANES.nac, LANES.slcA];
+  out.push(L(holes.map((z) => sideCircle(CX1, WIRE_Y, z, 1.9, 24)).join(""), { tone: "lo" }));
+  out.push(L([60, 124].map((z) => sideCircle(CX1, 8, z, 2.6, 28)).join(""), { tone: "faint" }));
+  out.push(S(box(CX0, CX1, 0, CD, CZ1 - CT, CZ1, 0.6), { tone: "mid" }));
+  out.push(L([-98, -70].map((x) => k.ring(x, 8, 2.6, CZ1, P, 24)).join(""), { tone: "faint" }));
+  // door hinge knuckles on the left front edge (door off for service)
+  for (const z of [56, 128]) out.push(S(k.cylinder(CX0 - 0.6, CD + 0.4, 1.1, z, 12, P, 14), { tone: "mid" }));
+  // conduit to the dedicated AC branch-circuit box
+  out.push(S(k.cylinder(-114, 8, 2.6, CZ1, 4, P, 24), { tone: "mid" }));
+  out.push(S(k.cylinder(-114, 8, 2.1, CZ1 + 4, 160 - CZ1 - 4, P, 24), { tone: "mid", crease: "none" }));
+  out.push(S(box(-123, -105, 0, 10, 160, 174, 0.8), { tone: "mid" }));
+  out.push(L(faceRect(-121.5, -106.5, 161.5, 172.5, 10, 0.6), { tone: "faint" }));
+  out.push(D([at([-120, 10, 170]), at([-108, 10, 163.5])], { size: 0.45 }));
+  return out.join("");
+}
+
+// ---------- field devices ----------
+function backbox(x, z, r = 11) {
+  const F = alongY(x, 0, z);
+  return S(G.disc(0, 5, r, F, P), { tone: "lo" });
+}
+
+const HEAD = (s, r) => {
+  // a low dome: band of vents, then an elliptical cap
+  const pts = [[0, r + 1.6], [1.6, r + 1.6], [1.6, r], [5, r]];
+  for (let i = 1; i <= 10; i++) {
+    const t = i / 10;
+    pts.push([5 + s * Math.sin((t * Math.PI) / 2), r * Math.cos((t * Math.PI) / 2), 1]);
+  }
+  return pts;
+};
+
+function detector(id, { x, z }, heat = false) {
+  const out = [backbox(x, z)];
+  const F = alongY(x, 5, z);
+  const r = heat ? 7.8 : 8.6;
+  out.push(S(G.disc(0, 1.6, r + 1.8, F, P), { tone: "mid" }));
+  const head = HEAD(heat ? 2.6 : 3.6, r).map(([s, rr, sm]) => (sm ? [s + 1.6, rr, 1] : [s + 1.6, rr]));
+  const vents = G.ribsOf(F, 3.6, 6.2, r, 30, P, { fade: [0.1, 0.55], seams: true });
+  out.push(S(G.solidOf(head, F, P), { tone: "hi", inner: k.fadedSvg(vents, { tone: "lo" }) }));
+  if (heat) {
+    const nub = alongY(x, 5 + 6.6 + 2.2, z);
+    out.push(S(G.disc(0, 1.8, 2.2, nub, P), { tone: "mid" }));
+  }
+  const ledAt = G.pointOf(F, heat ? 7.4 : 8.2, heat ? 4.4 : 5.4, -Math.PI / 4);
+  out.push(`<circle class="fa-led" data-led="${id}" cx="${at(ledAt)[0].toFixed(1)}" cy="${at(ledAt)[1].toFixed(1)}" r="1.05"/>`);
+  return `<g class="fa-device" data-act="${id}" role="button" aria-label="${heat ? "Heat detector 003" : `Smoke detector ${id === "d1" ? "001" : "002"}`}">${out.join("")}</g>`;
+}
+
+function pullStation() {
+  const { x, z0, z1 } = DEV.pull;
+  const out = [];
+  out.push(S(box(x - 9, x + 9, 0, 4, z0, z1, 1), { tone: "lo" }));
+  out.push(S(box(x - 8, x + 8, 4, 9, z0 + 1, z1 - 1, 1.6), { tone: "hi" }));
+  out.push(L(faceRect(x - 6, x + 6, z0 + 4, z1 - 8, 9, 1), { tone: "faint" }));
+  out.push(D([at([x - 6, 9, z1 - 4]), at([x + 6, 9, z1 - 4])], { size: 0.4, tone: "lo" }));
+  out.push(L(faceCircle(x, 9, z0 + 6, 1.4, 16), { tone: "lo" }));
+  const handle = S(box(x - 5, x + 5, 9, 12, 100, 104, 1), { tone: "hi" });
+  out.push(`<g data-part="handle">${handle}</g>`);
+  return `<g class="fa-device" data-act="pull" role="button" aria-label="Pull station 004">${out.join("")}</g>`;
+}
+
+function hornStrobe() {
+  const { x0, x1, z0, z1 } = DEV.horn;
+  const out = [];
+  out.push(S(box(x0, x1, 0, 4, z0, z1, 1), { tone: "lo" }));
+  out.push(S(box(x0 + 1, x1 - 1, 4, 10, z0 + 1, z1 - 1, 2), { tone: "hi" }));
+  // horn grille: closed slots
+  const slots = [0, 1, 2, 3].map((i) => faceRect(x0 + 4, x1 - 4, z0 + 4 + i * 2.6, z0 + 5.2 + i * 2.6, 10, 0.6)).join("");
+  out.push(`<path class="iso-line fa-horn" data-tone="lo" data-part="horn" d="${slots}"/>`);
+  out.push(k.faceTextSvg(`${plane(10)} translate(${(x0 + x1) / 2} ${-(z0 + 16.4)})`, "FIRE", { size: 3.2, tone: "lo", anchor: "middle" }));
+  // strobe lens on top
+  out.push(`<g data-part="strobe">${S(box(x0 + 4, x1 - 4, 10, 13, z1 - 9, z1 - 3, 1.4), { tone: "hi" })}</g>`);
+  out.push(`<path class="fa-flash" data-part="flash" d="${faceRect(x0 - 6, x1 + 6, z1 - 18, z1 + 6, 13.1, 10)}"/>`);
+  return out.join("");
+}
+
+function eol() {
+  const { x0, x1, z0, z1 } = DEV.eol;
+  const out = [];
+  out.push(S(box(x0, x1, 0, 8, z0, z1, 1), { tone: "mid" }));
+  const zc = (z0 + z1) / 2;
+  out.push(D([at([x0 + 3, 8, zc]), at([x1 - 3, 8, zc])], { size: 0.6, tone: "hi" }));
+  out.push(L(k.segment([x0 + 3, 8, zc], [x0 + 4.5, 9, zc], P) + k.segment([x1 - 4.5, 9, zc], [x1 - 3, 8, zc], P), { tone: "mid" }));
+  const F = alongX(x0 + 4.5, 9, zc);
+  const len = x1 - x0 - 9;
+  const bands = [1.2, 2.2, 3.2].map((s) => G.arcOf(F, s, 1.2, P)).join("");
+  out.push(S(G.solidOf([[0, 0.9], [0.6, 1.2], [len - 0.6, 1.2], [len, 0.9]], F, P), { tone: "hi", inner: L(bands, { tone: "lo" }) }));
+  return out.join("");
+}
+
+// monitor module 005 on the loop, supervising the waterflow switch on the riser below it
+function monitorModule() {
+  const { x0, x1, z0, z1 } = MOD;
+  const out = [];
+  out.push(S(box(x0, x1, 0, 4, z0, z1, 0.8), { tone: "lo" }));
+  out.push(S(box(x0 + 1, x1 - 1, 4, 8, z0 + 1, z1 - 1, 1.2), { tone: "hi" }));
+  out.push(L(faceRect(x0 + 3, x1 - 3, z0 + 3, z1 - 7, 8, 0.6), { tone: "faint" }));
+  out.push(D([at([x0 + 2.6, 8, z1 - 2.6]), at([x1 - 2.6, 8, z0 + 2.6])], { size: 0.4, tone: "lo" }));
+  out.push(`<path class="fa-led" data-led="flow" d="${faceCircle((x0 + x1) / 2, 8, z1 - 4, 1.1, 18)}"/>`);
+  return `<g class="fa-device" data-act="flow" role="button" aria-label="Monitor module 005, waterflow">${out.join("")}</g>`;
+}
+
+function riser() {
+  const { x, y, r, top } = RISER;
+  const out = [];
+  // wall strap behind the pipe
+  out.push(S(box(x - 1.2, x + 1.2, 0, y - r + 0.2, 138.6, 141.4, 0.3), { tone: "mid" }));
+  out.push(S(k.cylinder(x, y, r + 3, 0, 1.6, P, 32), { tone: "lo" }));
+  out.push(D(Array.from({ length: 4 }, (_, i) => at([x + (r + 1.8) * Math.cos(Math.PI / 4 + (i * Math.PI) / 2), y + (r + 1.8) * Math.sin(Math.PI / 4 + (i * Math.PI) / 2), 1.6])), { size: 0.4, tone: "mid" }));
+  const pipe = (z0, z1) => S(k.cylinder(x, y, r, z0, z1 - z0, P, 36), { tone: "hi", crease: "none", className: "fa-pipe" });
+  const coupling = (z) => S(k.cylinder(x, y, r + 0.9, z, 2.6, P, 36), { tone: "mid" });
+  const joints = [18, 64, 120];
+  let z = 1.6;
+  for (const j of joints) { out.push(pipe(z, j), coupling(j)); z = j + 2.6; }
+  out.push(pipe(z, 138));
+  out.push(S(k.cylinder(x, y, r + 0.9, 138, 4, P, 36), { tone: "mid" }));
+  out.push(S(k.cylinder(x, y, r, 142, top - 142, P, 36), { tone: "hi", crease: "none", className: "fa-pipe" }));
+  out.push(S(k.cylinder(x, y, r + 0.4, top, 2.4, P, 36, 0.4), { tone: "mid" }));
+  // paddle-type waterflow switch saddled on the front of the pipe
+  const sy = y + r - 0.6;
+  out.push(S(box(x - 5, x + 5, sy, sy + 6, 33, 44, 1), { tone: "mid" }));
+  out.push(L(faceRect(x - 3.6, x + 3.6, 34.6, 42.4, sy + 6, 0.6), { tone: "faint" }));
+  out.push(D([at([x - 3.6, sy + 6, 42.4]), at([x + 3.6, sy + 6, 34.6])], { size: 0.4, tone: "lo" }));
+  return `<g class="fa-device" data-act="flow" role="button" aria-label="Waterflow switch on the sprinkler riser">${out.join("")}</g>`;
+}
+
+// clips that hold the field wiring off the wall
+const CLIPS = [
+  [-38, 130], [-27, 166], [12, 146], [68, 146], [95, 128], [84, RETURN_Z], [10, RETURN_Z], [-40, 80], [-26, LANES.nac], [24, 96],
+];
+function clips() {
+  const order = byDepth(CLIPS.map(([x, z]) => [x, 0, z]));
+  return order.map(([x, , z]) => S(box(x - 0.9, x + 0.9, 0, WIRE_Y - 0.6, z - 1.2, z + 1.2, 0.3), { tone: "mid" })).join("");
+}
+
+// ---------- field wiring ----------
+const W = WIRE_Y;
+const SLC_OUT = [[CX1, W, LANES.slcA], [-38, W, LANES.slcA], [-38, W, 166], [DEV.d1.x, W, 166], [DEV.d1.x, 8, DEV.d1.z + 10.4]];
+const SLC_12 = [[DEV.d1.x + 10.4, 8, DEV.d1.z], [DEV.d2.x - 10.4, 8, DEV.d2.z]];
+const SLC_23 = [[DEV.d2.x + 10.4, 8, DEV.d3.z], [DEV.d3.x - 9.6, 8, DEV.d3.z]];
+const SLC_34 = [[DEV.d3.x, 8, DEV.d3.z - 9.6], [DEV.pull.x, W, DEV.pull.z1]];
+const MOD = { x0: 42, x1: 56, z0: 62, z1: 78 };
+const RISER = { x: 70, y: 14, r: 4.5, top: 174 };
+const SLC_45 = [[DEV.pull.x, W, DEV.pull.z0], [DEV.pull.x, W, RETURN_Z], [MOD.x1 - 1, 8, RETURN_Z]];
+const SLC_BACK = [[MOD.x0 + 1, 8, RETURN_Z], [-40, W, RETURN_Z], [-40, W, LANES.slcB], [CX1, W, LANES.slcB]];
+const FLOW_W = [[(MOD.x0 + MOD.x1) / 2, 8, MOD.z0 + 0.5], [(MOD.x0 + MOD.x1) / 2, W, 47], [RISER.x - 4, RISER.y + RISER.r + 2.4, 44]];
+const NAC_1 = [[CX1, W, LANES.nac], [DEV.horn.x0 + 1, 10, LANES.nac]];
+const NAC_2 = [[DEV.horn.x1 - 1, 10, 96], [DEV.eol.x0 + 3, 8, 96]];
+
+function fieldWires() {
+  const slc = [SLC_OUT, SLC_12, SLC_23, SLC_34, SLC_45, SLC_BACK].map((route) => wire3(route, { tone: "hi" })).join("");
+  const nac = [NAC_1, NAC_2].map((route) => wire3(route, { tone: "hi" })).join("");
+  return `<g data-wire="slc" class="fa-slc">${slc}</g><g data-wire="nac" class="fa-nac">${nac}</g>`;
+}
+
+// smoke from a tester can, drawn as soft puffs in front of detector 002
+function smoke() {
+  const puffs = Array.from({ length: 7 }, (_, i) => `<circle class="fa-puff" data-puff="${i}" cx="0" cy="0" r="${3 + (i % 3)}"/>`).join("");
+  return `<g data-part="smoke" transform="${plane(16)}" style="opacity:0">${puffs}</g>`;
+}
+
+const svg = k.figureSvg({
... [180 more diff lines truncated in this view; the file itself is the full record]
```

---

## 2026-11-25T10:11:52.740Z — build.mjs (changed; net change for the turn)

- **File:** `C:\Users\ELKor\anatomy\examples\fire-alarm-panel\build.mjs`
- **Tools used on it this turn:** Bash
- **Session:** `af5ba536-c6bb-4573-9116-e5c4b7f934ea`
- **Instruction that led to this turn:** [Image #1] Fire? where? i dont see that, i see the screen print out on the panel

```diff
--- a/build.mjs
+++ b/build.mjs
@@ -300,9 +300,9 @@
   out.push(S(box(x0, x1, 0, 4, z0, z1, 1), { tone: "lo" }));
   out.push(S(box(x0 + 1, x1 - 1, 4, 10, z0 + 1, z1 - 1, 2), { tone: "hi" }));
   // horn grille: closed slots
-  const slots = [0, 1, 2, 3].map((i) => faceRect(x0 + 4, x1 - 4, z0 + 4 + i * 2.6, z0 + 5.2 + i * 2.6, 10, 0.6)).join("");
+  const slots = [0, 1, 2, 3].map((i) => faceRect(x0 + 4, x1 - 4, z0 + 3 + i * 2.6, z0 + 4.2 + i * 2.6, 10, 0.6)).join("");
   out.push(`<path class="iso-line fa-horn" data-tone="lo" data-part="horn" d="${slots}"/>`);
-  out.push(k.faceTextSvg(`${plane(10)} translate(${(x0 + x1) / 2} ${-(z0 + 16.4)})`, "FIRE", { size: 3.2, tone: "lo", anchor: "middle" }));
+  out.push(k.faceTextSvg(`${plane(10)} translate(${(x0 + x1) / 2} ${-(z0 + 13.2)})`, "FIRE", { size: 3.2, tone: "hi", anchor: "middle" }));
   // strobe lens on top
   out.push(`<g data-part="strobe">${S(box(x0 + 4, x1 - 4, 10, 13, z1 - 9, z1 - 3, 1.4), { tone: "hi" })}</g>`);
   out.push(`<path class="fa-flash" data-part="flash" d="${faceRect(x0 - 6, x1 + 6, z1 - 18, z1 + 6, 13.1, 10)}"/>`);

```

---

## 2026-11-25T10:28:25.641Z — build.mjs (changed; net change for the turn)

- **File:** `C:\Users\ELKor\anatomy\examples\fire-alarm-panel\build.mjs`
- **Tools used on it this turn:** Write
- **Session:** `af5ba536-c6bb-4573-9116-e5c4b7f934ea`
- **Instruction that led to this turn:** ok do the geometry audit

```diff
--- a/build.mjs
+++ b/build.mjs
@@ -1,576 +1,564 @@
-import { writeFileSync } from "node:fs";
-import { dirname, join } from "node:path";
-import { fileURLToPath } from "node:url";
-import * as k from "../../kit/iso-kit.mjs";
-import * as G from "../../kit/lathe.mjs";
-import { kitScript } from "../../scripts/inline-kit.mjs";
-import * as M from "./model.mjs";
-
-const HERE = dirname(fileURLToPath(import.meta.url));
-const theme = process.argv.includes("--light") ? "light" : "dark";
-
-const WIDTH = 680;
-const HEIGHT = 470;
-
-// ---------- world layout (units ≈ px, wall face at y = 0, z up) ----------
-const BASE = { x: -148, y: -16, w: 276, d: 38, r: 6 };
-const BASE_H = 9;
-const FOOT_H = 5;
-const BOARD = { x: -138, y: -6, w: 256, d: 6, r: 1 };
-const BOARD_TOP = 178;
-const WIRE_Y = 9; // field wiring stands 9 off the wall on clips
-
-const CAB = { x0: -126, x1: -44, d: 16, z0: 34, z1: 158, t: 2 };
-const LANES = { slcB: 90.8, nac: 92.9, slcA: 95 }; // wiring channel under the main board
-
-const DEV = {
-  d1: { x: -15, z: 146 },
-  d2: { x: 40, z: 146 },
-  d3: { x: 95, z: 146 },
-  pull: { x: 95, z0: 82, z1: 114 },
-  horn: { x0: -9, x1: 13, z0: 86, z1: 114 },
-  eol: { x0: 32, x1: 46, z0: 90, z1: 102 },
-};
-const RETURN_Z = 70;
-
-const P = k.fitProjection(
-  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), ...k.boxCorners(BOARD, 0, BOARD_TOP)],
-  WIDTH,
-  HEIGHT,
-  { pad: 22, azimuth: 64 },
-);
-
-const at = (point) => k.iso(point, P);
-const S = (paths, style) => k.solidSvg(paths, style);
-const L = (d, style) => k.lineSvg(d, style);
-const D = (points, style) => k.dotsSvg(points, style);
-const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
-const plane = (y) => k.sideMatrix([0, y], 0, P, "left"); // local (x, -z) on the face at y
-const box = (x0, x1, y0, y1, z0, z1, r = 0.8) => k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, 3, Math.min(0.6, r));
-const faceCircle = (cx, y, cz, r, steps = 40) =>
-  k.pathOf(Array.from({ length: steps }, (_, i) => at([cx + r * Math.cos((i / steps) * Math.PI * 2), y, cz + r * Math.sin((i / steps) * Math.PI * 2)])), true);
-const faceRect = (x0, x1, z0, z1, y, r = 0.8) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 4).map(([u, z]) => at([u, y, z])), true);
-const sideRect = (y0, y1, z0, z1, x, r = 0.8) => k.pathOf(k.roundedPlan({ x: y0, y: z0, w: y1 - y0, d: z1 - z0, r }, 4).map(([v, z]) => at([x, v, z])), true);
-const sideCircle = (x, cy, cz, r, steps = 32) =>
-  k.pathOf(Array.from({ length: steps }, (_, i) => at([x, cy + r * Math.cos((i / steps) * Math.PI * 2), cz + r * Math.sin((i / steps) * Math.PI * 2)])), true);
-const wire3 = (points, style = {}) => k.wireSvg(at(points[0]), at(points[points.length - 1]), { via: points.slice(1, -1).map(at), size: 1, ...style });
-const alongY = (x, y, z) => G.frameOf([x, y, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
-const alongX = (x, y, z) => G.frameOf([x, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
-
-// ---------- base and backboard ----------
-function base() {
-  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
-  for (const [x, y] of byDepth(k.corners(BASE, 16))) {
-    out.push(S(k.cylinder(x, y, 6.4, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
-    out.push(S(k.cylinder(x, y, 5, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
-  }
-  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4), { tone: "mid" }));
-  out.push(L(k.planOutline(k.insetPlan(BASE, 4), 0, P), { tone: "lo" }));
-  const screws = k.corners(BASE, 8);
-  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }));
-  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
-  // label plate on the plinth
-  const label = { x: 2, y: 8, w: 46, d: 10, r: 1.2 };
-  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
-  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }));
-  out.push(L([34, 26, 18].map((w, i) => k.lineOnTop([label.x + 4, label.y + 3 + i * 2.2], [label.x + 4 + w, label.y + 3 + i * 2.2], 0.8, P)).join(""), { tone: "lo", free: true }));
-  out.push(D([at([label.x + label.w - 3, label.y + 2.6, 0.8]), at([label.x + label.w - 3, label.y + label.d - 2.6, 0.8])], { size: 0.4 }));
-  // backboard: fire-rated plywood on two cleats
-  for (const x of [-118, 98]) out.push(S(box(x - 8, x + 8, -14, -6, 0, 10, 1), { tone: "mid" }));
-  out.push(S(k.slabOf(BOARD, 0, BOARD_TOP, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(BOARD, 10, P, 3), { tone: "faint" }) }));
-  const boardScrews = [[-132, 6], [-132, 172], [112, 6], [112, 172], [0, 172], [0, 6]];
-  out.push(L(boardScrews.map(([x, z]) => faceCircle(x, 0, z, 1.8, 18)).join(""), { tone: "lo" }));
-  out.push(D(boardScrews.map(([x, z]) => at([x, 0, z])), { size: 0.45 }));
-  return out.join("");
-}
-
-// ---------- the panel cabinet ----------
-const { x0: CX0, x1: CX1, d: CD, z0: CZ0, z1: CZ1, t: CT } = CAB;
-
-function communicator() {
-  const out = [];
-  out.push(S(box(-66, -24, 0, 9, 8, 28, 1.2), { tone: "mid", inner: L(k.sideSeam({ x: -66, y: 0, w: 42, d: 9, r: 1.2 }, 24, P, 3), { tone: "faint" }) }));
-  out.push(L(faceRect(-62, -44, 11, 20, 9, 0.8), { tone: "faint" }));
-  out.push(L([12, 9, 11].map((w, i) => k.segment([-60, 9, 18 - i * 2.4], [-60 + w, 9, 18 - i * 2.4], P)).join(""), { tone: "lo", free: true }));
-  out.push(D([at([-63, 9, 25.5]), at([-27, 9, 25.5]), at([-63, 9, 10.5]), at([-27, 9, 10.5])], { size: 0.4, tone: "lo" }));
-  out.push(`<path class="fa-led" data-led="comm" d="${faceCircle(-34, 9, 15, 1.15, 20)}"/>`);
-  // conduit nipple up into the cabinet floor, and a stub antenna
-  out.push(S(k.cylinder(-54, 5, 2.4, 28, CZ0 - 28, P, 20), { tone: "mid" }));
-  out.push(S(k.cylinder(-30, 5, 2, 28, 2, P, 18), { tone: "lo" }));
-  out.push(S(k.cylinder(-30, 5, 1.1, 30, 20, P, 16), { tone: "mid", inner: L(k.sideArc(-30, 5, 1.1, 40, P, 10), { tone: "faint" }) }));
-  out.push(S(k.cylinder(-30, 5, 1.5, 50, 2, P, 16), { tone: "mid" }));
-  return out.join("");
-}
-
-function cabinetBack() {
-  const out = [communicator()];
-  out.push(S(box(CX0, CX1, 0, 1.5, CZ0, CZ1, 0.4), { tone: "lo" }));
-  out.push(S(box(CX0, CX1, 0, CD, CZ0, CZ0 + CT, 0.6), { tone: "mid" }));
-  out.push(S(box(CX0, CX0 + CT, 0, CD, CZ0 + CT, CZ1 - CT, 0.4), { tone: "mid" }));
-  const screws = [[CX0 + 6, CZ1 - 8], [CX1 - 6, CZ1 - 8], [CX0 + 6, CZ0 + 26], [CX1 - 6, CZ0 + 26]];
-  out.push(L(screws.map(([x, z]) => faceCircle(x, 1.5, z, 1.6, 16)).join(""), { tone: "faint" }));
-  out.push(D(screws.map(([x, z]) => at([x, 1.5, z])), { size: 0.45, tone: "lo" }));
-  return out.join("");
-}
-
-function batteries() {
-  const out = [];
-  [-122, -89].forEach((x, index) => {
-    const z0 = CZ0 + CT;
-    out.push(S(box(x, x + 30, 1.5, 15.5, z0, z0 + 18, 1), { tone: "mid", inner: L(k.sideSeam({ x, y: 1.5, w: 30, d: 14, r: 1 }, z0 + 15, P, 3), { tone: "faint" }) }));
-    out.push(S(box(x + 0.6, x + 29.4, 2.1, 14.9, z0 + 18, z0 + 19.4, 0.8), { tone: "lo" }));
-    // label on the front face: three printed rule lines
-    out.push(L(faceRect(x + 4, x + 22, z0 + 4, z0 + 11, 15.5, 0.6), { tone: "faint" }));
-    out.push(L([14, 10, 12].map((w, i) => k.segment([x + 6, 15.5, z0 + 9 - i * 2], [x + 6 + w, 15.5, z0 + 9 - i * 2], P)).join(""), { tone: "lo", free: true }));
-    for (const tx of [x + 6, x + 24]) {
-      out.push(S(k.cylinder(tx, 10, 1.6, z0 + 19.4, 1.2, P, 16), { tone: "lo" }));
-      out.push(S(k.cylinder(tx, 10, 1.1, z0 + 20.6, 1.4, P, 16), { tone: "hi" }));
-    }
-    out.push(`<!-- battery ${index + 1}: 12 V ${M.BATTERY_AH} Ah -->`);
-  });
-  const top = CZ0 + CT + 22;
-  out.push(wire3([[-98, 10, top], [-98, 10, top + 3], [-83, 10, top + 3], [-83, 10, top]], { tone: "mid" }));
-  return out.join("");
-}
-
-function powerSupply() {
-  const out = [];
-  // transformer: laminated core with its coil
-  out.push(S(box(-122, -102, 1.5, 11, 66, 84, 0.4), { tone: "mid", inner: L([69, 72, 75, 78, 81].map((z) => k.sideSeam({ x: -122, y: 1.5, w: 20, d: 9.5, r: 0.4 }, z, P, 3)).join(""), { tone: "faint" }) }));
-  out.push(S(box(-118, -106, 1.5, 13, 69, 81, 1.6), { tone: "hi" }));
-  out.push(D([at([-120, 11, 84]), at([-104, 11, 84])], { size: 0.45 }));
-  // power-supply board
-  out.push(S(box(-98, -54, 1.5, 2.9, 64, 90, 0.4), { tone: "lo" }));
-  out.push(D([[-95, 87], [-57, 87], [-95, 67], [-57, 67]].map(([x, z]) => at([x, 2.9, z])), { size: 0.5, tone: "mid" }));
-  out.push(S(box(-94, -82, 2.9, 8, 66, 70.5, 0.5), { tone: "mid" }));
-  out.push(D([-91, -88, -85].map((x) => at([x, 5.5, 70.5])), { size: 0.5, tone: "hi" }));
-  out.push(S(box(-80, -72, 2.9, 5.6, 66.4, 69.6, 1.2), { tone: "hi" }));
-  for (const [cx, cz] of [[-88, 80], [-80, 80]]) {
-    const F = alongY(cx, 2.9, cz);
-    out.push(S(G.solidOf([[0, 3], [6.4, 3], [7, 2.4]], F, P), { tone: "hi", inner: L(G.arcOf(F, 5.6, 3, P), { tone: "faint" }) }));
-  }
-  // heat sink with fins running edge to edge
-  out.push(S(box(-72, -58, 2.9, 8.9, 74, 88, 0.3), { tone: "mid", inner: L([-69, -66, -63, -60].map((x) => k.segment([x, 8.9, 74], [x, 8.9, 88], P)).join(""), { tone: "lo" }) }));
-  return out.join("");
-}
-
-const KEYS = [
-  { act: "ack", x: -116, label: "Acknowledge" },
-  { act: "silence", x: -104, label: "Alarm silence" },
-  { act: "reset", x: -92, label: "System reset" },
-  { act: "drill", x: -80, label: "Drill" },
-];
-const LEDS = [
-  { id: "ac", z: 141 },
-  { id: "fire", z: 137 },
-  { id: "supv", z: 133 },
-  { id: "trbl", z: 129 },
-  { id: "sil", z: 125 },
-];
-const LCD = { x0: -114, x1: -72, z0: 129, z1: 141, y: 5.3 };
-const LED_X = -66;
-const TBS = [
-  { id: "slcB", x0: -116, x1: -104 },
-  { id: "nac", x0: -100, x1: -88 },
-  { id: "slcA", x0: -84, x1: -72 },
-  { id: "aux", x0: -68, x1: -56 },
-];
-
-function mainBoard() {
-  const out = [];
-  out.push(S(box(-120, -52, 1.5, 3.1, 96, 146, 0.4), { tone: "lo" }));
-  out.push(D([[-117, 143], [-55, 143], [-117, 99], [-55, 99]].map(([x, z]) => at([x, 3.1, z])), { size: 0.55, tone: "mid" }));
-  // display: bezel, recessed window, two lines of text
-  out.push(S(box(-116, -70, 3.1, 5.3, 127, 143, 0.6), { tone: "mid" }));
-  out.push(`<path class="fa-lcd" data-part="lcd" d="${faceRect(LCD.x0, LCD.x1, LCD.z0, LCD.z1, LCD.y, 0.6)}"/>`);
-  out.push(L(faceRect(LCD.x0, LCD.x1, LCD.z0, LCD.z1, LCD.y, 0.6), { tone: "lo" }));
-  out.push(
-    `<g transform="${plane(LCD.y)}"><clipPath id="fa-lcd-clip"><rect x="${LCD.x0}" y="${-LCD.z1}" width="${LCD.x1 - LCD.x0}" height="${LCD.z1 - LCD.z0}"/></clipPath>` +
-      `<g clip-path="url(#fa-lcd-clip)"><text class="fa-lcd-text" data-part="lcd1" x="${LCD.x0 + 1.4}" y="${-136.2}" font-size="3.3">SYSTEM NORMAL</text>` +
-      `<text class="fa-lcd-text" data-part="lcd2" x="${LCD.x0 + 1.4}" y="${-131.1}" font-size="3.3">POLL 001 PHOTO 0.3</text></g></g>`,
-  );
-  // indicator LEDs in a column beside the display
-  for (const led of LEDS) {
-    const F = alongY(LED_X, 3.1, led.z);
-    out.push(S(G.disc(0, 1, 1.7, F, P), { tone: "mid" }));
-    out.push(`<path class="fa-led" data-led="${led.id}" d="${faceCircle(LED_X, 4.1, led.z, 1.15, 20)}"/>`);
-  }
-  // keys: acknowledge, silence, reset, drill
-  for (const key of KEYS) {
-    out.push(`<g class="fa-key" data-act="${key.act}" role="button" aria-label="${key.label}">${S(box(key.x, key.x + 10, 3.1, 4.9, 114, 121, 1), { tone: "hi" })}</g>`);
-  }
-  // processor and memory
-  out.push(S(box(-61, -53, 3.1, 4.3, 126, 134, 0.3), { tone: "mid", inner: L(faceCircle(-59.6, 4.3, 132.6, 0.6, 10), { tone: "lo" }) }));
-  out.push(S(box(-61, -53, 3.1, 4.1, 113, 121, 0.3), { tone: "mid" }));
-  out.push(D(Array.from({ length: 6 }, (_, i) => at([-60 + i * 1.4, 3.1, 125.6])), { size: 0.3, tone: "lo" }));
-  // field terminal blocks along the bottom edge
-  for (const tb of TBS) {
-    out.push(S(box(tb.x0, tb.x1, 3.1, 9, 98, 103.5, 0.5), { tone: "mid" }));
-    const screws = [tb.x0 + 2.2, tb.x0 + 6, tb.x0 + 9.8];
-    out.push(L(screws.map((x) => k.ring(x, 6, 1.1, 103.5, P, 12)).join(""), { tone: "lo" }));
-    out.push(D(screws.map((x) => at([x, 6, 103.5])), { size: 0.4, tone: "hi" }));
-  }
-  return out.join("");
-}
-
-// wires inside the cabinet: from each terminal block down into the channel and out to the right wall
-function innerWires() {
-  const out = [];
-  const lane = { slcB: LANES.slcB, nac: LANES.nac, slcA: LANES.slcA };
-  for (const tb of TBS.slice(0, 3)) {
-    const x = tb.x0 + 6;
-    const z = lane[tb.id];
-    out.push(`<g data-wire="${tb.id === "nac" ? "nac" : "slc"}">${wire3([[x, 9, 98], [x, 9, z], [CX1 - CT, 9, z]], { ends: "from", tone: "hi" })}</g>`);
-  }
-  // battery leads up to the power board
-  out.push(wire3([[-116, 10, CZ0 + CT + 22], [-116, 10, 62], [-96, 10, 62], [-96, 7, 66]], { tone: "lo" }));
-  out.push(wire3([[-65, 10, CZ0 + CT + 22], [-65, 10, 62], [-60, 10, 62], [-60, 9, 66]], { tone: "lo" }));
-  return out.join("");
-}
-
-function cabinetFront() {
-  const out = [];
-  out.push(S(box(CX1 - CT, CX1, 0, CD, CZ0 + CT, CZ1 - CT, 0.4), { tone: "mid" }));
-  // knockouts on the right wall where the field wiring leaves
-  const holes = [LANES.slcB, LANES.nac, LANES.slcA];
-  out.push(L(holes.map((z) => sideCircle(CX1, WIRE_Y, z, 1.9, 24)).join(""), { tone: "lo" }));
-  out.push(L([60, 124].map((z) => sideCircle(CX1, 8, z, 2.6, 28)).join(""), { tone: "faint" }));
-  out.push(S(box(CX0, CX1, 0, CD, CZ1 - CT, CZ1, 0.6), { tone: "mid" }));
-  out.push(L([-98, -70].map((x) => k.ring(x, 8, 2.6, CZ1, P, 24)).join(""), { tone: "faint" }));
-  // door hinge knuckles on the left front edge (door off for service)
-  for (const z of [56, 128]) out.push(S(k.cylinder(CX0 - 0.6, CD + 0.4, 1.1, z, 12, P, 14), { tone: "mid" }));
-  // conduit to the dedicated AC branch-circuit box
-  out.push(S(k.cylinder(-114, 8, 2.6, CZ1, 4, P, 24), { tone: "mid" }));
-  out.push(S(k.cylinder(-114, 8, 2.1, CZ1 + 4, 160 - CZ1 - 4, P, 24), { tone: "mid", crease: "none" }));
-  out.push(S(box(-123, -105, 0, 10, 160, 174, 0.8), { tone: "mid" }));
-  out.push(L(faceRect(-121.5, -106.5, 161.5, 172.5, 10, 0.6), { tone: "faint" }));
-  out.push(D([at([-120, 10, 170]), at([-108, 10, 163.5])], { size: 0.45 }));
-  return out.join("");
-}
-
-// ---------- field devices ----------
-function backbox(x, z, r = 11) {
-  const F = alongY(x, 0, z);
-  return S(G.disc(0, 5, r, F, P), { tone: "lo" });
-}
-
-const HEAD = (s, r) => {
-  // a low dome: band of vents, then an elliptical cap
-  const pts = [[0, r + 1.6], [1.6, r + 1.6], [1.6, r], [5, r]];
-  for (let i = 1; i <= 10; i++) {
-    const t = i / 10;
-    pts.push([5 + s * Math.sin((t * Math.PI) / 2), r * Math.cos((t * Math.PI) / 2), 1]);
-  }
-  return pts;
-};
-
-function detector(id, { x, z }, heat = false) {
-  const out = [backbox(x, z)];
-  const F = alongY(x, 5, z);
-  const r = heat ? 7.8 : 8.6;
-  out.push(S(G.disc(0, 1.6, r + 1.8, F, P), { tone: "mid" }));
-  const head = HEAD(heat ? 2.6 : 3.6, r).map(([s, rr, sm]) => (sm ? [s + 1.6, rr, 1] : [s + 1.6, rr]));
-  const vents = G.ribsOf(F, 3.6, 6.2, r, 30, P, { fade: [0.1, 0.55], seams: true });
-  out.push(S(G.solidOf(head, F, P), { tone: "hi", inner: k.fadedSvg(vents, { tone: "lo" }) }));
-  if (heat) {
-    const nub = alongY(x, 5 + 6.6 + 2.2, z);
-    out.push(S(G.disc(0, 1.8, 2.2, nub, P), { tone: "mid" }));
-  }
-  const ledAt = G.pointOf(F, heat ? 7.4 : 8.2, heat ? 4.4 : 5.4, -Math.PI / 4);
-  out.push(`<circle class="fa-led" data-led="${id}" cx="${at(ledAt)[0].toFixed(1)}" cy="${at(ledAt)[1].toFixed(1)}" r="1.05"/>`);
-  return `<g class="fa-device" data-act="${id}" role="button" aria-label="${heat ? "Heat detector 003" : `Smoke detector ${id === "d1" ? "001" : "002"}`}">${out.join("")}</g>`;
-}
-
-function pullStation() {
-  const { x, z0, z1 } = DEV.pull;
-  const out = [];
-  out.push(S(box(x - 9, x + 9, 0, 4, z0, z1, 1), { tone: "lo" }));
-  out.push(S(box(x - 8, x + 8, 4, 9, z0 + 1, z1 - 1, 1.6), { tone: "hi" }));
-  out.push(L(faceRect(x - 6, x + 6, z0 + 4, z1 - 8, 9, 1), { tone: "faint" }));
-  out.push(D([at([x - 6, 9, z1 - 4]), at([x + 6, 9, z1 - 4])], { size: 0.4, tone: "lo" }));
-  out.push(L(faceCircle(x, 9, z0 + 6, 1.4, 16), { tone: "lo" }));
-  const handle = S(box(x - 5, x + 5, 9, 12, 100, 104, 1), { tone: "hi" });
-  out.push(`<g data-part="handle">${handle}</g>`);
-  return `<g class="fa-device" data-act="pull" role="button" aria-label="Pull station 004">${out.join("")}</g>`;
-}
-
-function hornStrobe() {
-  const { x0, x1, z0, z1 } = DEV.horn;
-  const out = [];
-  out.push(S(box(x0, x1, 0, 4, z0, z1, 1), { tone: "lo" }));
-  out.push(S(box(x0 + 1, x1 - 1, 4, 10, z0 + 1, z1 - 1, 2), { tone: "hi" }));
-  // horn grille: closed slots
-  const slots = [0, 1, 2, 3].map((i) => faceRect(x0 + 4, x1 - 4, z0 + 3 + i * 2.6, z0 + 4.2 + i * 2.6, 10, 0.6)).join("");
-  out.push(`<path class="iso-line fa-horn" data-tone="lo" data-part="horn" d="${slots}"/>`);
-  out.push(k.faceTextSvg(`${plane(10)} translate(${(x0 + x1) / 2} ${-(z0 + 13.2)})`, "FIRE", { size: 3.2, tone: "hi", anchor: "middle" }));
-  // strobe lens on top
-  out.push(`<g data-part="strobe">${S(box(x0 + 4, x1 - 4, 10, 13, z1 - 9, z1 - 3, 1.4), { tone: "hi" })}</g>`);
-  out.push(`<path class="fa-flash" data-part="flash" d="${faceRect(x0 - 6, x1 + 6, z1 - 18, z1 + 6, 13.1, 10)}"/>`);
-  return out.join("");
-}
-
-function eol() {
-  const { x0, x1, z0, z1 } = DEV.eol;
-  const out = [];
-  out.push(S(box(x0, x1, 0, 8, z0, z1, 1), { tone: "mid" }));
-  const zc = (z0 + z1) / 2;
-  out.push(D([at([x0 + 3, 8, zc]), at([x1 - 3, 8, zc])], { size: 0.6, tone: "hi" }));
-  out.push(L(k.segment([x0 + 3, 8, zc], [x0 + 4.5, 9, zc], P) + k.segment([x1 - 4.5, 9, zc], [x1 - 3, 8, zc], P), { tone: "mid" }));
-  const F = alongX(x0 + 4.5, 9, zc);
-  const len = x1 - x0 - 9;
-  const bands = [1.2, 2.2, 3.2].map((s) => G.arcOf(F, s, 1.2, P)).join("");
-  out.push(S(G.solidOf([[0, 0.9], [0.6, 1.2], [len - 0.6, 1.2], [len, 0.9]], F, P), { tone: "hi", inner: L(bands, { tone: "lo" }) }));
-  return out.join("");
-}
-
-// monitor module 005 on the loop, supervising the waterflow switch on the riser below it
-function monitorModule() {
-  const { x0, x1, z0, z1 } = MOD;
-  const out = [];
-  out.push(S(box(x0, x1, 0, 4, z0, z1, 0.8), { tone: "lo" }));
-  out.push(S(box(x0 + 1, x1 - 1, 4, 8, z0 + 1, z1 - 1, 1.2), { tone: "hi" }));
-  out.push(L(faceRect(x0 + 3, x1 - 3, z0 + 3, z1 - 7, 8, 0.6), { tone: "faint" }));
-  out.push(D([at([x0 + 2.6, 8, z1 - 2.6]), at([x1 - 2.6, 8, z0 + 2.6])], { size: 0.4, tone: "lo" }));
-  out.push(`<path class="fa-led" data-led="flow" d="${faceCircle((x0 + x1) / 2, 8, z1 - 4, 1.1, 18)}"/>`);
-  return `<g class="fa-device" data-act="flow" role="button" aria-label="Monitor module 005, waterflow">${out.join("")}</g>`;
-}
-
-function riser() {
-  const { x, y, r, top } = RISER;
-  const out = [];
-  // wall strap behind the pipe
-  out.push(S(box(x - 1.2, x + 1.2, 0, y - r + 0.2, 138.6, 141.4, 0.3), { tone: "mid" }));
-  out.push(S(k.cylinder(x, y, r + 3, 0, 1.6, P, 32), { tone: "lo" }));
-  out.push(D(Array.from({ length: 4 }, (_, i) => at([x + (r + 1.8) * Math.cos(Math.PI / 4 + (i * Math.PI) / 2), y + (r + 1.8) * Math.sin(Math.PI / 4 + (i * Math.PI) / 2), 1.6])), { size: 0.4, tone: "mid" }));
-  const pipe = (z0, z1) => S(k.cylinder(x, y, r, z0, z1 - z0, P, 36), { tone: "hi", crease: "none", className: "fa-pipe" });
-  const coupling = (z) => S(k.cylinder(x, y, r + 0.9, z, 2.6, P, 36), { tone: "mid" });
-  const joints = [18, 64, 120];
-  let z = 1.6;
-  for (const j of joints) { out.push(pipe(z, j), coupling(j)); z = j + 2.6; }
-  out.push(pipe(z, 138));
-  out.push(S(k.cylinder(x, y, r + 0.9, 138, 4, P, 36), { tone: "mid" }));
-  out.push(S(k.cylinder(x, y, r, 142, top - 142, P, 36), { tone: "hi", crease: "none", className: "fa-pipe" }));
-  out.push(S(k.cylinder(x, y, r + 0.4, top, 2.4, P, 36, 0.4), { tone: "mid" }));
-  // paddle-type waterflow switch saddled on the front of the pipe
-  const sy = y + r - 0.6;
-  out.push(S(box(x - 5, x + 5, sy, sy + 6, 33, 44, 1), { tone: "mid" }));
-  out.push(L(faceRect(x - 3.6, x + 3.6, 34.6, 42.4, sy + 6, 0.6), { tone: "faint" }));
-  out.push(D([at([x - 3.6, sy + 6, 42.4]), at([x + 3.6, sy + 6, 34.6])], { size: 0.4, tone: "lo" }));
-  return `<g class="fa-device" data-act="flow" role="button" aria-label="Waterflow switch on the sprinkler riser">${out.join("")}</g>`;
-}
-
-// clips that hold the field wiring off the wall
-const CLIPS = [
-  [-38, 130], [-27, 166], [12, 146], [68, 146], [95, 128], [84, RETURN_Z], [10, RETURN_Z], [-40, 80], [-26, LANES.nac], [24, 96],
-];
-function clips() {
-  const order = byDepth(CLIPS.map(([x, z]) => [x, 0, z]));
-  return order.map(([x, , z]) => S(box(x - 0.9, x + 0.9, 0, WIRE_Y - 0.6, z - 1.2, z + 1.2, 0.3), { tone: "mid" })).join("");
-}
-
-// ---------- field wiring ----------
-const W = WIRE_Y;
-const SLC_OUT = [[CX1, W, LANES.slcA], [-38, W, LANES.slcA], [-38, W, 166], [DEV.d1.x, W, 166], [DEV.d1.x, 8, DEV.d1.z + 10.4]];
-const SLC_12 = [[DEV.d1.x + 10.4, 8, DEV.d1.z], [DEV.d2.x - 10.4, 8, DEV.d2.z]];
-const SLC_23 = [[DEV.d2.x + 10.4, 8, DEV.d3.z], [DEV.d3.x - 9.6, 8, DEV.d3.z]];
-const SLC_34 = [[DEV.d3.x, 8, DEV.d3.z - 9.6], [DEV.pull.x, W, DEV.pull.z1]];
-const MOD = { x0: 42, x1: 56, z0: 62, z1: 78 };
-const RISER = { x: 70, y: 14, r: 4.5, top: 174 };
-const SLC_45 = [[DEV.pull.x, W, DEV.pull.z0], [DEV.pull.x, W, RETURN_Z], [MOD.x1 - 1, 8, RETURN_Z]];
-const SLC_BACK = [[MOD.x0 + 1, 8, RETURN_Z], [-40, W, RETURN_Z], [-40, W, LANES.slcB], [CX1, W, LANES.slcB]];
-const FLOW_W = [[(MOD.x0 + MOD.x1) / 2, 8, MOD.z0 + 0.5], [(MOD.x0 + MOD.x1) / 2, W, 47], [RISER.x - 4, RISER.y + RISER.r + 2.4, 44]];
-const NAC_1 = [[CX1, W, LANES.nac], [DEV.horn.x0 + 1, 10, LANES.nac]];
-const NAC_2 = [[DEV.horn.x1 - 1, 10, 96], [DEV.eol.x0 + 3, 8, 96]];
-
-function fieldWires() {
-  const slc = [SLC_OUT, SLC_12, SLC_23, SLC_34, SLC_45, SLC_BACK].map((route) => wire3(route, { tone: "hi" })).join("");
-  const nac = [NAC_1, NAC_2].map((route) => wire3(route, { tone: "hi" })).join("");
-  return `<g data-wire="slc" class="fa-slc">${slc}</g><g data-wire="nac" class="fa-nac">${nac}</g>`;
-}
-
-// smoke from a tester can, drawn as soft puffs in front of detector 002
-function smoke() {
-  const puffs = Array.from({ length: 7 }, (_, i) => `<circle class="fa-puff" data-puff="${i}" cx="0" cy="0" r="${3 + (i % 3)}"/>`).join("");
-  return `<g data-part="smoke" transform="${plane(16)}" style="opacity:0">${puffs}</g>`;
-}
-
-const svg = k.figureSvg({
... [744 more diff lines truncated in this view; the file itself is the full record]
```
