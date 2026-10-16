import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const light = process.argv.includes("--light");
const doAudit = process.argv.includes("--audit");
const theme = light ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 480;
const AZIMUTH = 54;
const ELEVATION = 30;

const PLINTH = { x: -116, y: -92, w: 232, d: 184, r: 10 };
const PLINTH_H = 10;
const FOOT_H = 4;

const CHASSIS = { x: -94, y: -72, w: 188, d: 144, r: 7 };
const CHASSIS_Z0 = 0;
const CHASSIS_H = 12;
const CHASSIS_TOP = CHASSIS_Z0 + CHASSIS_H;

const PCB = { x: -84, y: -62, w: 168, d: 124, r: 4 };
const PCB_Z0 = CHASSIS_TOP;
const PCB_H = 3;
const PCB_TOP = PCB_Z0 + PCB_H;

const PSU = { x: -80, y: -56, w: 38, d: 44, r: 3 };
const PSU_H = 12;

const SIMM_BANK = { x: 38, y: -52, w: 38, d: 50, r: 2.5 };
const SIMM_BASE_H = 3.5;

const IO_BAR = { x: -58, y: 36, w: 116, d: 20, r: 2.5 };
const IO_BAR_H = 7;

const SOCKET = { x: -28, y: -26, w: 56, d: 52, r: 3 };
const SOCKET_Z0 = PCB_TOP;
const SOCKET_H = 3.5;
const SOCKET_TOP = SOCKET_Z0 + SOCKET_H;

const CPU_PKG = { x: -23, y: -21, w: 46, d: 42, r: 2.4 };
const CPU_Z0 = SOCKET_TOP;
const CPU_H = 3.2;
const CPU_TOP = CPU_Z0 + CPU_H;

const CPU_LID = { x: -19, y: -17, w: 38, d: 34, r: 2 };
const CPU_LID_H = 2.6;

const DIE = { x: -16, y: -14, w: 32, d: 28, r: 1.4 };
const DIE_Z0 = CPU_TOP;
const DIE_H = 1.5;
const DIE_TOP = DIE_Z0 + DIE_H;

const CTRL_BLK = { x: -14, y: -12, w: 11, d: 10, r: 0.8 };
const REGS_BLK = { x: -14, y: 0.5, w: 11, d: 11.5, r: 0.8 };
const FLAGS_BLK = { x: 3, y: -12, w: 11, d: 8.5, r: 0.8 };
const DIE_BLK_H = 1.7;

const ALU_SUB = { x: -1.5, y: -1.5, w: 15.5, d: 13.5, r: 0.8 };
const ALU_Z0 = DIE_TOP;
const ALU_H = 1.4;
const ALU_TOP = ALU_Z0 + ALU_H;

const ALU_SHIELD = { x: -0.8, y: -0.8, w: 14.1, d: 12.1, r: 0.6 };
const ALU_SHIELD_H = 1.1;

const P0 = k.fitProjection(
  [
    ...k.boxCorners(PLINTH, -PLINTH_H - FOOT_H, 0),
    ...k.boxCorners(CHASSIS, 0, PCB_TOP + PSU_H + 14),
  ],
  WIDTH,
  HEIGHT,
  { pad: 34, azimuth: AZIMUTH, elevation: ELEVATION },
);

const P1 = k.fitProjection(
  [
    ...k.boxCorners(SOCKET, SOCKET_Z0, DIE_TOP + DIE_BLK_H + 3),
  ],
  WIDTH,
  HEIGHT,
  { pad: 38, azimuth: AZIMUTH, elevation: ELEVATION },
);

const P2 = k.fitProjection(
  [
    ...k.boxCorners(ALU_SUB, ALU_Z0 - 0.3, ALU_TOP + 2.4),
  ],
  WIDTH,
  HEIGHT,
  { pad: 40, azimuth: AZIMUTH, elevation: ELEVATION },
);

const round = (v, d = 4) => Number(v.toFixed(d));

function viewBoxFor(PL) {
  const s = PL.scale / P0.scale;
  const tx = P0.origin[0] - PL.origin[0] / s;
  const ty = P0.origin[1] - PL.origin[1] / s;
  return {
    s: round(s, 6),
    tx: round(tx, 4),
    ty: round(ty, 4),
    vw: round(WIDTH / s, 4),
    vh: round(HEIGHT / s, 4),
    invS: round(1 / s, 6),
  };
}

const V0 = { s: 1, tx: 0, ty: 0, vw: WIDTH, vh: HEIGHT, invS: 1 };
const V1 = viewBoxFor(P1);
const V2 = viewBoxFor(P2);

function makeHelpers(P, R) {
  const at = (pt) => k.iso(pt, P);
  const byDepth = (pts, z = 0) =>
    [...pts].sort((a, b) => k.depthOf([a[0], a[1], a[2] ?? z], P) - k.depthOf([b[0], b[1], b[2] ?? z], P));
  const wrapSvg = (baseSvg, opts = {}) => {
    const attrs = [];
    if (opts.part) attrs.push(`data-part="${opts.part}"`);
    if (opts.fade) attrs.push(`data-fade="${opts.fade}"`);
    if (opts.cls) attrs.push(`class="${opts.cls}"`);
    return attrs.length ? `<g ${attrs.join(" ")}>${baseSvg}</g>` : baseSvg;
  };
  const put = (name, ref, svg, shapes, layer = "main") => {
    R.put({
      name: R.nameFor(name),
      at: ref,
      layer,
      svg,
      shapes: shapes.map((s) => R.solid(Object.assign(s, { name: s.name ?? name }))),
    });
    return svg;
  };
  const slab = (name, box, z0, h, tone = "mid", opts = {}) => {
    const steps = opts.steps ?? 8;
    const baseSvg =
      k.solidSvg(k.slabOf(box, z0, h, P, steps, opts.bevel ?? 0), { tone, crease: opts.crease, inner: opts.inner ?? "" }) +
      (opts.extra ?? "");
    const svg = wrapSvg(baseSvg, opts);
    return put(name, [box.x + box.w / 2, box.y + box.d / 2, z0 + h / 2], svg, [A.slab(box, z0, h, { name }, steps)], opts.layer ?? "main");
  };
  const cyl = (name, x, y, r, z0, h, tone = "mid", opts = {}) => {
    const baseSvg =
      k.solidSvg(k.cylinder(x, y, r, z0, h, P, opts.steps ?? 24, opts.bevel ?? 0), { tone, crease: opts.crease }) +
      (opts.extra ?? "");
    const svg = wrapSvg(baseSvg, opts);
    return put(name, [x, y, z0 + h / 2], svg, [A.cylinder(x, y, r, z0, h, { name })], opts.layer ?? "main");
  };
  const lamp = (name, x, y, rCol, hCol, rDome, hDome, z0, part, cls = "ca-led", fade = "") => {
    const colSvg = k.solidSvg(k.cylinder(x, y, rCol, z0, hCol, P, 20), { tone: "mid" });
    const domeSvg = k.solidSvg(k.cylinder(x, y, rDome, z0 + hCol, hDome, P, 20, Math.min(rDome, hDome) * 0.4), {
      tone: "hi",
      crease: "none",
    });
    const svg = wrapSvg(`${colSvg}${domeSvg}`, { part, cls, fade });
    return put(
      name,
      [x, y, z0 + (hCol + hDome) / 2],
      svg,
      [
        A.cylinder(x, y, rCol, z0, hCol, { name: `${name}.col` }),
        A.cylinder(x, y, rDome, z0 + hCol, hDome, { name: `${name}.dome` }),
      ],
      "main",
    );
  };
  const line = (d, tone = "lo", opts = {}) => k.lineSvg(d, { tone, ...opts });
  const dots = (pts, size = 0.55) => k.dotsSvg(pts.map(at), { size });
  const settledLayer = (layer = "main") =>
    R.items
      .filter((item) => item.layer === layer)
      .sort((a, b) => a.key - b.key)
      .map((item) => item.svg)
      .join("");
  return { at, byDepth, slab, cyl, lamp, line, dots, settledLayer };
}

function buildLevel0() {
  const R = A.recorder(P0, { ground: (s) => s.name.startsWith("foot.") });
  const { byDepth, slab, cyl, lamp, line, dots, settledLayer } = makeHelpers(P0, R);

  byDepth(k.corners(PLINTH, 20), -PLINTH_H - FOOT_H).forEach(([fx, fy], idx) => {
    cyl(`foot.${idx}.pad`, fx, fy, 7.5, -PLINTH_H - FOOT_H, 1.5, "lo");
    cyl(`foot.${idx}.stem`, fx, fy, 5.8, -PLINTH_H - FOOT_H + 1.5, FOOT_H - 1.5, "mid");
  });

  const pScrews = k.corners(PLINTH, 11);
  const plinthExtra =
    line(k.planOutline(k.insetPlan(PLINTH, 5), 0, P0), "lo") +
    line(pScrews.map(([sx, sy]) => k.ring(sx, sy, 2.2, 0, P0, 16)).join(""), "lo") +
    dots(pScrews.map(([sx, sy]) => [sx, sy, 0]), 0.5);
  slab("plinth.body", PLINTH, -PLINTH_H, PLINTH_H, "lo", { bevel: 1.4, extra: plinthExtra });

  const badge = { x: -92, y: 75, w: 44, d: 11, r: 1.5 };
  const badgeExtra = line(
    [30, 20].map((w, i) => k.lineOnTop([badge.x + 5, badge.y + 3.5 + i * 4], [badge.x + 5 + w, badge.y + 3.5 + i * 4], 1.2, P0)).join(""),
    "lo",
    { free: true },
  );
  slab("plinth.badge", badge, 0, 1.2, "mid", { crease: "none", extra: badgeExtra, fade: "l0" });

  slab("chassis.base", CHASSIS, CHASSIS_Z0, CHASSIS_H, "mid", {
    bevel: 1.2,
    extra: line(k.planOutline(k.insetPlan(CHASSIS, 4), CHASSIS_TOP, P0), "lo"),
  });

  const busLines = [];
  for (let i = -2; i <= 2; i++) {
    const off = i * 3.8;
    busLines.push(k.lineOnTop([PSU.x + PSU.w - 2, -16 + off], [SOCKET.x + 2, -16 + off], PCB_TOP, P0));
    busLines.push(k.lineOnTop([SOCKET.x + SOCKET.w - 2, -16 + off], [SIMM_BANK.x + 2, -16 + off], PCB_TOP, P0));
    busLines.push(k.lineOnTop([off * 2, SOCKET.y + SOCKET.d - 2], [off * 2, IO_BAR.y + 2], PCB_TOP, P0));
  }
  const pcbExtra =
    line(k.planOutline(k.insetPlan(PCB, 3), PCB_TOP, P0), "faint") +
    `<g data-part="l0-lines">${line(busLines.join(""), "lo", { free: true })}</g>`;
  slab("pcb.board", PCB, PCB_Z0, PCB_H, "lo", { bevel: 0.5, extra: pcbExtra });

  const finLines = [];
  for (let fy = PSU.y + 6; fy <= PSU.y + PSU.d - 6; fy += 6) {
    finLines.push(k.lineOnTop([PSU.x + 4, fy], [PSU.x + PSU.w - 4, fy], PCB_TOP + PSU_H, P0));
  }
  slab("psu.box", PSU, PCB_TOP, PSU_H, "mid", {
    bevel: 0.8,
    fade: "l0",
    extra: `<g data-part="l0-lines">${line(finLines.join(""), "lo", { free: true })}</g>`,
  });
  cyl("psu.cap0", PSU.x + 12, PSU.y + 13, 4.6, PCB_TOP + PSU_H, 4, "hi", { fade: "l0" });
  cyl("psu.cap1", PSU.x + 26, PSU.y + 13, 4.6, PCB_TOP + PSU_H, 4, "hi", { fade: "l0" });

  slab("simm.base", SIMM_BANK, PCB_TOP, SIMM_BASE_H, "lo", { fade: "l0" });
  for (let i = 0; i < 4; i++) {
    const sy = SIMM_BANK.y + 4.5 + i * 11;
    const stick = { x: SIMM_BANK.x + 3, y: sy, w: SIMM_BANK.w - 6, d: 4.5, r: 0.8 };
    slab(`simm.stick${i}`, stick, PCB_TOP + SIMM_BASE_H, 11.5, "mid", { fade: "l0" });
  }

  slab("socket.frame", SOCKET, SOCKET_Z0, SOCKET_H, "lo", {
    bevel: 0.4,
    extra: `<g data-part="l0-lines">${line(k.planOutline(k.insetPlan(SOCKET, 2), SOCKET_TOP, P0), "lo")}</g>`,
  });
  slab("cpu.pkg", CPU_PKG, CPU_Z0, CPU_H, "mid", { bevel: 0.4 });

  slab("io.bar", IO_BAR, PCB_TOP, IO_BAR_H, "lo", { bevel: 0.6, fade: "l0" });
  const ledZ = PCB_TOP + IO_BAR_H;
  for (let b = 0; b < 4; b++) {
    const lxA = IO_BAR.x + 10 + b * 6.2;
    const lxB = IO_BAR.x + 42 + b * 6.2;
    const lxS = IO_BAR.x + 74 + b * 6.2;
    const ly = IO_BAR.y + 10;
    lamp(`io.ledA${b}`, lxA, ly, 2.2, 1.3, 1.7, 1.1, ledZ, `l0-a-${b}`, "ca-led", "l0");
    lamp(`io.ledB${b}`, lxB, ly, 2.2, 1.3, 1.7, 1.1, ledZ, `l0-b-${b}`, "ca-led", "l0");
    lamp(`io.ledS${b}`, lxS, ly, 2.2, 1.3, 1.7, 1.1, ledZ, `l0-s-${b}`, "ca-led", "l0");
  }
  lamp("io.ledC", IO_BAR.x + 106, IO_BAR.y + 10, 2.4, 1.3, 1.9, 1.3, ledZ, "l0-cout", "ca-led", "l0");

  slab("cpu.lid0", CPU_LID, CPU_TOP, CPU_LID_H, "hi", {
    bevel: 0.3,
    layer: "cover1",
    extra: line(k.planOutline(k.insetPlan(CPU_LID, 2.5), CPU_TOP + CPU_LID_H, P0), "lo"),
  });

  A.settle(R, P0, { open: ["cover1"] });
  if (doAudit) A.auditOrExit(R, P0, { open: ["cover1"] });

  const halo = `<path class="iso-halo" d="${k.haloOf(PLINTH, -PLINTH_H - FOOT_H, PCB_TOP + PSU_H + 5, P0)}"/>`;
  return {
    body: halo + settledLayer("main"),
    cover1: `<g data-part="cover1-l0" data-hold>${settledLayer("cover1")}</g>`,
  };
}

function buildLevel1() {
  const R = A.recorder(P1, { ground: (s) => s.name === "l1.socket" });
  const { slab, lamp, line, dots, settledLayer } = makeHelpers(P1, R);

  slab("l1.socket", SOCKET, SOCKET_Z0, SOCKET_H, "lo", { bevel: 0.5 });

  const padPins = [];
  for (let i = -3; i <= 3; i++) {
    padPins.push([i * 5, CPU_PKG.y + 2, CPU_TOP]);
    padPins.push([i * 5, CPU_PKG.y + CPU_PKG.d - 2, CPU_TOP]);
    padPins.push([CPU_PKG.x + 2, i * 4.5, CPU_TOP]);
    padPins.push([CPU_PKG.x + CPU_PKG.w - 2, i * 4.5, CPU_TOP]);
  }
  const bondLines = [];
  for (let i = -2; i <= 2; i++) {
    bondLines.push(k.lineOnTop([i * 4.5, DIE.y + 0.5], [i * 4.5, CPU_PKG.y + 2], CPU_TOP, P1));
    bondLines.push(k.lineOnTop([i * 4.5, DIE.y + DIE.d - 0.5], [i * 4.5, CPU_PKG.y + CPU_PKG.d - 2], CPU_TOP, P1));
    bondLines.push(k.lineOnTop([DIE.x + 0.5, i * 4], [CPU_PKG.x + 2, i * 4], CPU_TOP, P1));
    bondLines.push(k.lineOnTop([DIE.x + DIE.w - 0.5, i * 4], [CPU_PKG.x + CPU_PKG.w - 2, i * 4], CPU_TOP, P1));
  }
  const pkgExtra =
    `<g data-part="l1-lines">` +
    line(k.planOutline(k.insetPlan(CPU_PKG, 2), CPU_TOP, P1), "lo") +
    dots(padPins, 0.55) +
    line(bondLines.join(""), "lo", { free: true }) +
    `</g>`;
  slab("l1.pkg", CPU_PKG, CPU_Z0, CPU_H, "mid", { bevel: 0.45, extra: pkgExtra });

  const dieBus = [];
  for (let b = 0; b < 4; b++) {
    const by = 2.0 + b * 2.2;
    dieBus.push(k.lineOnTop([REGS_BLK.x + REGS_BLK.w - 0.8, by], [ALU_SUB.x + 0.8, by], DIE_TOP, P1));
  }
  dieBus.push(k.lineOnTop([CTRL_BLK.x + CTRL_BLK.w - 0.8, -6.5], [FLAGS_BLK.x + 0.8, -6.5], DIE_TOP, P1));
  dieBus.push(k.lineOnTop([ALU_SUB.x + ALU_SUB.w / 2, ALU_SUB.y + 0.8], [ALU_SUB.x + ALU_SUB.w / 2, FLAGS_BLK.y + FLAGS_BLK.d - 0.8], DIE_TOP, P1));

  const dieExtra =
    line(k.planOutline(k.insetPlan(DIE, 0.8), DIE_TOP, P1), "faint") +
    `<g data-part="l1-lines">${line(dieBus.join(""), "lo", { free: true })}</g>`;
  slab("l1.die", DIE, DIE_Z0, DIE_H, "lo", { bevel: 0.25, extra: dieExtra });

  const romLines = [];
  for (let ry = CTRL_BLK.y + 2; ry <= CTRL_BLK.y + CTRL_BLK.d - 2; ry += 2) {
    romLines.push(k.lineOnTop([CTRL_BLK.x + 1.5, ry], [CTRL_BLK.x + CTRL_BLK.w - 1.5, ry], DIE_TOP + DIE_BLK_H, P1));
  }
  slab("l1.ctrl", CTRL_BLK, DIE_TOP, DIE_BLK_H, "mid", {
    bevel: 0.2,
    fade: "l1",
    extra: `<g data-part="l1-lines">${line(romLines.join(""), "lo", { free: true })}</g>`,
  });

  slab("l1.flags", FLAGS_BLK, DIE_TOP, DIE_BLK_H, "mid", { bevel: 0.2, fade: "l1" });
  const fZ = DIE_TOP + DIE_BLK_H;
  lamp("l1.flagC", FLAGS_BLK.x + 3.5, FLAGS_BLK.y + 4.2, 1.15, 0.65, 0.9, 0.6, fZ, "l1-flag-c", "ca-led", "l1");
  lamp("l1.flagZ", FLAGS_BLK.x + 7.5, FLAGS_BLK.y + 4.2, 1.15, 0.65, 0.9, 0.6, fZ, "l1-flag-z", "ca-led", "l1");

  slab("l1.regs", REGS_BLK, DIE_TOP, DIE_BLK_H, "mid", { bevel: 0.2, fade: "l1" });
  const rZ = DIE_TOP + DIE_BLK_H;
  for (let b = 0; b < 4; b++) {
    const rx = REGS_BLK.x + 2 + b * 2.3;
    lamp(`l1.regA${b}`, rx, REGS_BLK.y + 3.4, 0.82, 0.5, 0.65, 0.45, rZ, `l1-a-${b}`, "ca-led", "l1");
    lamp(`l1.regB${b}`, rx, REGS_BLK.y + 8.0, 0.82, 0.5, 0.65, 0.45, rZ, `l1-b-${b}`, "ca-led", "l1");
  }

  slab("l1.aluSub", ALU_SUB, ALU_Z0, ALU_H, "mid", {
    bevel: 0.2,
    extra: `<g data-part="l1-lines">${line(k.planOutline(k.insetPlan(ALU_SUB, 0.6), ALU_TOP, P1), "lo")}</g>`,
  });

  slab("l1.aluShield", ALU_SHIELD, ALU_TOP, ALU_SHIELD_H, "hi", {
    bevel: 0.15,
    layer: "shield",
    extra: line(k.planOutline(k.insetPlan(ALU_SHIELD, 1.2), ALU_TOP + ALU_SHIELD_H, P1), "lo"),
  });

  A.settle(R, P1, { open: ["shield"] });
  if (doAudit) A.auditOrExit(R, P1, { open: ["shield"] });
  return {
    body: settledLayer("main"),
    shield: `<g data-part="cover2" data-hold>${settledLayer("shield")}</g>`,
  };
}

function buildLevel2() {
  const R = A.recorder(P2, { ground: (s) => s.name === "l2.aluSub" });
  const { slab, lamp, line, settledLayer } = makeHelpers(P2, R);

  const carryTraces = [];
  for (let b = 0; b < 3; b++) {
    const sy0 = ALU_SUB.y + 1.0 + b * 2.9;
    const sy1 = ALU_SUB.y + 1.0 + (b + 1) * 2.9;
    const cx = ALU_SUB.x + 0.9 + 7.0 + 1.2;
    carryTraces.push(k.lineOnTop([cx, sy0 + 2.15], [cx, sy1 + 0.2], ALU_TOP, P2));
  }
  slab("l2.aluSub", ALU_SUB, ALU_Z0, ALU_H, "lo", {
    bevel: 0.18,
    extra:
      line(k.planOutline(k.insetPlan(ALU_SUB, 0.5), ALU_TOP, P2), "lo") +
      line(carryTraces.join(""), "lo", { free: true }),
  });

  const sliceH = 0.8;
  const gateH = 0.62;
  const sliceZ = ALU_TOP;
  const gateZ = ALU_TOP + sliceH;

  for (let b = 0; b < 4; b++) {
    const sy = ALU_SUB.y + 1.0 + b * 2.9;
    const sliceBox = { x: ALU_SUB.x + 0.9, y: sy, w: ALU_SUB.w - 1.8, d: 2.35, r: 0.25 };

    const xor1 = { x: sliceBox.x + 0.6, y: sy + 0.28, w: 2.4, d: 0.82, r: 0.14 };
    const and1 = { x: sliceBox.x + 0.6, y: sy + 1.25, w: 2.4, d: 0.82, r: 0.14 };
    const xor2 = { x: sliceBox.x + 3.8, y: sy + 0.28, w: 2.4, d: 0.82, r: 0.14 };
    const and2 = { x: sliceBox.x + 3.8, y: sy + 1.25, w: 2.4, d: 0.82, r: 0.14 };
    const orGate = { x: sliceBox.x + 7.0, y: sy + 0.65, w: 2.4, d: 1.05, r: 0.14 };
    const sumPad = { x: sliceBox.x + 10.2, y: sy + 0.45, w: 2.8, d: 1.45, r: 0.18 };

    const wires = [
      k.lineOnTop([xor1.x + xor1.w - 0.3, xor1.y + 0.41], [xor2.x + 0.3, xor2.y + 0.41], gateZ, P2),
      k.lineOnTop([and1.x + and1.w - 0.3, and1.y + 0.41], [and2.x + 0.3, and2.y + 0.41], gateZ, P2),
      k.lineOnTop([xor2.x + xor2.w - 0.3, xor2.y + 0.41], [orGate.x + 0.3, orGate.y + 0.35], gateZ, P2),
      k.lineOnTop([and2.x + and2.w - 0.3, and2.y + 0.41], [orGate.x + 0.3, orGate.y + 0.7], gateZ, P2),
      k.lineOnTop([orGate.x + orGate.w - 0.3, orGate.y + 0.52], [sumPad.x + 0.3, sumPad.y + 0.72], gateZ, P2),
    ];
    slab(`l2.fa${b}.base`, sliceBox, sliceZ, sliceH, "mid", {
      bevel: 0.08,
      extra: line(wires.join(""), "lo", { free: true }),
    });

    slab(`l2.fa${b}.xor1`, xor1, gateZ, gateH, "hi", { crease: "none", part: `l2-p-${b}`, cls: "ca-gate" });
    slab(`l2.fa${b}.and1`, and1, gateZ, gateH, "mid", { crease: "none", part: `l2-g-${b}`, cls: "ca-gate" });
    slab(`l2.fa${b}.xor2`, xor2, gateZ, gateH, "hi", { crease: "none", part: `l2-sumgate-${b}`, cls: "ca-gate" });
    slab(`l2.fa${b}.and2`, and2, gateZ, gateH, "mid", { crease: "none", part: `l2-and2-${b}`, cls: "ca-gate" });
    slab(`l2.fa${b}.or`, orGate, gateZ, gateH, "hi", { crease: "none", part: `l2-orgate-${b}`, cls: "ca-gate" });
    slab(`l2.fa${b}.sumPad`, sumPad, gateZ, gateH * 0.8, "mid", { crease: "none" });

    lamp(`l2.fa${b}.sLamp`, sumPad.x + 1.4, sumPad.y + 0.72, 0.46, 0.28, 0.36, 0.26, gateZ + gateH * 0.8, `l2-s-${b}`);
    lamp(`l2.fa${b}.cLamp`, orGate.x + 1.2, orGate.y + 0.52, 0.4, 0.24, 0.3, 0.22, gateZ + gateH, `l2-c-${b}`);
  }

  A.settle(R, P2);
  if (doAudit) A.auditOrExit(R, P2);
  return { body: settledLayer("main") };
}

const L0 = buildLevel0();
const L1 = buildLevel1();
const L2 = buildLevel2();

const lift1 = k.translateAlong(P0, [0, 0, 18]);
const lift2 = k.translateAlong(P1, [0, 0, 5.5]);
const s12 = P2.scale / P1.scale;
const tx12 = round(P1.origin[0] - P2.origin[0] / s12, 4);
const ty12 = round(P1.origin[1] - P2.origin[1] / s12, 4);
const invS12 = round(1 / s12, 6);

const compositeBody = [
  `<g data-part="level0-root">`,
  L0.body,
  `<g data-part="level1-group" transform="translate(${V1.tx} ${V1.ty}) scale(${V1.invS})" style="opacity:0;display:none">`,
  L1.body,
  `<g data-part="level2-group" transform="translate(${tx12} ${ty12}) scale(${invS12})" style="opacity:0;display:none">`,
  L2.body,
  `</g>`,
  L1.shield,
  `</g>`,
  L0.cover1,
  `</g>`,
].join("");

const svgMarkup = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Three-level recursive zoom from a desktop computer into its ceramic CPU package and down to the 4-bit ripple-carry ALU gate array.",
  body: [compositeBody],
});

const EXTRA_CSS = `<style>
  .iso-stage { cursor: pointer; touch-action: none; user-select: none; }
  .ca-led .iso-top, .ca-led .iso-shade, .ca-gate .iso-top { transition: fill 120ms ease; }
  .ca-led[data-bit="1"] .iso-top { fill: var(--ca-on-top); }
  .ca-led[data-bit="1"] .iso-shade { fill: var(--ca-on-side); }
  .ca-gate[data-bit="1"] .iso-top { fill: var(--ca-gate-on); }
  .iso[data-theme="dark"] {
    --ca-on-top: #7ee2a8;
    --ca-on-side: #3ba368;
    --ca-gate-on: #50667a;
  }
  .iso[data-theme="light"] {
    --ca-on-top: #1f9d55;
    --ca-on-side: #15733e;
    --ca-gate-on: #b8d4e8;
  }
</style>`;

const LIVE_SCRIPT = `
(() => {
  const stage = document.querySelector(".iso-stage");
  const svg = stage.querySelector("svg.iso-svg");
  const readout = document.querySelector("[data-readout]");
  const cover1L0 = stage.querySelector('[data-part="cover1-l0"]');
  const cover2 = stage.querySelector('[data-part="cover2"]');
  const g1 = stage.querySelector('[data-part="level1-group"]');
  const g2 = stage.querySelector('[data-part="level2-group"]');
  const l0Lines = [...stage.querySelectorAll('[data-part="l0-lines"]')];
  const l1Lines = [...stage.querySelectorAll('[data-part="l1-lines"]')];
  const l0Fade = [...stage.querySelectorAll('[data-fade="l0"]')];
  const l1Fade = [...stage.querySelectorAll('[data-fade="l1"]')];

  const V = [
    ${JSON.stringify(V0)},
    ${JSON.stringify(V1)},
    ${JSON.stringify(V2)},
  ];
  const LIFT1 = ${JSON.stringify(lift1)};
  const LIFT2 = ${JSON.stringify(lift2)};

  function aluModel(a, b) {
    const slices = [];
    let c = 0;
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      const ai = (a >> i) & 1;
      const bi = (b >> i) & 1;
      const p = ai ^ bi;
      const g = ai & bi;
      const and2 = p & c;
      const s = p ^ c;
      const cOut = g | and2;
      slices.push({ ai, bi, p, g, cIn: c, and2, s, cOut });
      sum |= (s << i);
      c = cOut;
    }
    return { a, b, sum, cOut: c, slices };
  }

  function cpuModel(alu) {
    return {
      alu,
      regA: alu.a,
      regB: alu.b,
      regOut: alu.sum,
      flagC: alu.cOut,
      flagZ: alu.sum === 0 ? 1 : 0,
    };
  }

  function computerModel(cpu, zoom) {
    const level = zoom < 0.5 ? 0 : zoom < 1.5 ? 1 : 2;
    const names = ["L0 computer", "L1 CPU die", "L2 4-bit ALU"];
    return {
      cpu,
      zoom,
      level,
      levelName: names[level],
    };
  }

  let opA = 11;
  let opB = 6;
  let zoom = 0;
  let targetZoom = 0;
  let raf = 0;

  const smooth = (t) => t * t * (3 - 2 * t);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function setBit(sel, bit) {
    const el = stage.querySelector(sel);
    if (el) el.setAttribute("data-bit", String(bit ? 1 : 0));
  }

  function render() {
    const alu = aluModel(opA, opB);
    const cpu = cpuModel(alu);
    const comp = computerModel(cpu, zoom);

    const seg = zoom <= 1 ? 0 : 1;
    const u = smooth(clamp(zoom - seg, 0, 1));
    const A = V[seg];
    const B = V[seg + 1];
    const tx = A.tx + (B.tx - A.tx) * u;
    const ty = A.ty + (B.ty - A.ty) * u;
    const vw = A.vw + (B.vw - A.vw) * u;
    const vh = A.vh + (B.vh - A.vh) * u;
    svg.setAttribute("viewBox", tx.toFixed(3) + " " + ty.toFixed(3) + " " + vw.toFixed(3) + " " + vh.toFixed(3));

    const t01 = smooth(clamp(zoom, 0, 1));
    const t12 = smooth(clamp(zoom - 1, 0, 1));

    const op0 = String(clamp(1 - t01 * 1.4, 0, 1));
    const disp0 = t01 > 0.78 ? "none" : "";
    if (cover1L0) {
      cover1L0.setAttribute("transform", "translate(" + (LIFT1[0] * t01).toFixed(2) + " " + (LIFT1[1] * t01).toFixed(2) + ")");
      cover1L0.style.opacity = op0;
      cover1L0.style.display = disp0;
    }
    for (const el of l0Fade) {
      el.style.opacity = op0;
      el.style.display = disp0;
    }
    for (const el of l0Lines) el.style.display = t01 > 0.85 ? "none" : "";
    if (g1) {
      g1.style.display = t01 > 0.02 ? "" : "none";
      g1.style.opacity = String(clamp(t01 * 1.15, 0, 1));
    }
    const op1 = String(clamp(1 - t12 * 1.4, 0, 1));
    const disp1 = t12 > 0.78 ? "none" : "";
    if (cover2) {
      cover2.setAttribute("transform", "translate(" + (LIFT2[0] * t12).toFixed(2) + " " + (LIFT2[1] * t12).toFixed(2) + ")");
      cover2.style.opacity = op1;
      cover2.style.display = disp1;
    }
    for (const el of l1Fade) {
      el.style.opacity = op1;
      el.style.display = disp1;
    }
    for (const el of l1Lines) el.style.display = t12 > 0.85 ? "none" : "";
    if (g2) {
      g2.style.display = t12 > 0.02 ? "" : "none";
      g2.style.opacity = String(clamp(t12 * 1.15, 0, 1));
    }

    for (let i = 0; i < 4; i++) {
      const s = alu.slices[i];
      setBit('[data-part="l0-a-' + i + '"]', s.ai);
      setBit('[data-part="l0-b-' + i + '"]', s.bi);
      setBit('[data-part="l0-s-' + i + '"]', s.s);
      setBit('[data-part="l1-a-' + i + '"]', s.ai);
      setBit('[data-part="l1-b-' + i + '"]', s.bi);
      setBit('[data-part="l2-p-' + i + '"]', s.p);
      setBit('[data-part="l2-g-' + i + '"]', s.g);
      setBit('[data-part="l2-sumgate-' + i + '"]', s.s);
      setBit('[data-part="l2-and2-' + i + '"]', s.and2);
      setBit('[data-part="l2-orgate-' + i + '"]', s.cOut);
      setBit('[data-part="l2-s-' + i + '"]', s.s);
      setBit('[data-part="l2-c-' + i + '"]', s.cOut);
    }
    setBit('[data-part="l0-cout"]', cpu.flagC);
    setBit('[data-part="l1-flag-c"]', cpu.flagC);
    setBit('[data-part="l1-flag-z"]', cpu.flagZ);

    if (readout) {
      const bin4 = (v) => v.toString(2).padStart(4, "0");
      readout.textContent = comp.levelName + " · " + bin4(opA) + " + " + bin4(opB) + " = " + bin4(alu.sum) + " (C=" + cpu.flagC + ")";
    }
  }

  function stepAnim() {
    const diff = targetZoom - zoom;
    if (Math.abs(diff) < 0.002) {
      zoom = targetZoom;
      render();
      raf = 0;
      return;
    }
    zoom += diff * 0.18;
    render();
    raf = requestAnimationFrame(stepAnim);
  }

  function setTargetZoom(next, instant = false) {
    targetZoom = clamp(next, 0, 2);
    if (instant) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      zoom = targetZoom;
      render();
    } else if (!raf) {
      raf = requestAnimationFrame(stepAnim);
    }
  }

  stage.addEventListener("click", (e) => {
    if (e.shiftKey) {
      opA = (opA + 1) & 15;
      render();
      return;
    }
    const next = targetZoom < 0.5 ? 1 : targetZoom < 1.5 ? 2 : 0;
    setTargetZoom(next);
  });

  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    setTargetZoom(targetZoom + (e.deltaY < 0 ? 0.35 : -0.35));
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.key === "1") setTargetZoom(0);
    else if (e.key === "2") setTargetZoom(1);
    else if (e.key === "3") setTargetZoom(2);
    else if (e.key === "ArrowUp" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      opA = (opA + 1) & 15;
      render();
    } else if (e.key === "ArrowDown" || e.key === "b" || e.key === "B") {
      e.preventDefault();
      opB = (opB + 1) & 15;
      render();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setTargetZoom(Math.min(2, Math.round(targetZoom) + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setTargetZoom(Math.max(0, Math.round(targetZoom) - 1));
    }
  });

  window.__depthFigure = {
    setZoom(z) { setTargetZoom(z, true); },
    setOperands(a, b) { opA = a & 15; opB = b & 15; render(); },
    state() { return { zoom, opA, opB }; },
  };

  render();
})();
`;

const bodyHtml =
  EXTRA_CSS +
  k.plateHtml({
    fig: "Fig 1",
    title: "From computer to ALU",
    hint: "click or 1–3 to zoom · A / B to step 4-bit inputs",
    readout: "L0 computer · 1011 + 0110 = 0001 (C=1)",
    keys: [
      { mark: "raised", label: "Three orthographic zoom levels (computer, CPU die, 4-bit ALU) in one world" },
      { mark: "lit", label: "Shared ripple-carry adder model driving LEDs and flags upward across all levels" },
      { mark: "edge", label: "Removable covers lift along +z as the viewBox interpolates from P0 to P1 to P2" },
    ],
    caption:
      "A three-level recursive cutaway in a single isometric world. Level 0 shows a desktop logic board with its power supply, memory SIMMs, front binary display bar, and ceramic PGA CPU package capped by a Kovar heatspreader lid. Zooming to Level 1 lifts the Kovar lid to reveal the silicon die floorplan: microcode control ROM, 4-bit operand registers A and B, status flags (C, Z), and the ALU macro under its passivation shield. Zooming to Level 2 lifts the shield to expose the four full-adder bit slices (XOR, AND, OR gates and ripple-carry bridges). The bottom-level full-adder model computes A + B and feeds its sum and carry bits upward to the CPU registers and front-panel LEDs so all three levels agree at every instant.",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Three-level recursive zoom from desktop computer to CPU die to 4-bit ripple-carry ALU.">${svgMarkup}</div>`,
  });

const outFile = join(HERE, light ? "computer-cpu-alu-light.html" : "computer-cpu-alu.html");
writeFileSync(outFile, k.pageHtml({ title: "From computer to ALU", theme, body: bodyHtml, script: `${kitScript()}\n${LIVE_SCRIPT}`, width: 690 }));
console.log(`wrote ${outFile}`);
