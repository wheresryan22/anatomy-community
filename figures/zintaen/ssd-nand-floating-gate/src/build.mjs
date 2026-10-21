import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { TURN } from "../../../../.skill/kit/turn.mjs";
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

const PCB = { x: -90, y: -48, w: 180, d: 78, r: 3.5 };
const PCB_Z0 = CHASSIS_TOP;
const PCB_H = 3;
const PCB_TOP = PCB_Z0 + PCB_H;

const M2_CONN = { x: -89, y: -34, w: 15, d: 50, r: 1.6 };
const M2_CONN_H = 4.2;

const CTRL_SOC = { x: -66, y: -42, w: 24, d: 30, r: 2.2 };
const CTRL_H = 8.5;
const CTRL_SINK = { x: -64, y: -39, w: 20, d: 24, r: 1.6 };
const CTRL_SINK_H = 4.0;

const DRAM_CHIP = { x: -66, y: -6, w: 24, d: 28, r: 2.0 };
const DRAM_H = 5.2;

const NAND2_BASE = { x: 35, y: -36, w: 34, d: 54, r: 2.5 };
const NAND2_BASE_H = 3.5;
const NAND2_PKG = { x: 38, y: -32, w: 28, d: 46, r: 2.0 };
const NAND2_PKG_H = 6.2;

const IO_BAR = { x: -58, y: 36, w: 116, d: 20, r: 2.5 };
const IO_BAR_H = 10;

const BGA_SUB = { x: -26, y: -26, w: 56, d: 52, r: 3 };
const BGA_Z0 = PCB_TOP;
const BGA_H = 3.5;
const BGA_TOP = BGA_Z0 + BGA_H;

const NAND_PKG = { x: -21, y: -21, w: 46, d: 42, r: 2.4 };
const PKG_Z0 = BGA_TOP;
const PKG_H = 3.2;
const PKG_TOP = PKG_Z0 + PKG_H;

const NAND_LID = { x: -17, y: -17, w: 38, d: 34, r: 2 };
const NAND_LID_H = 2.6;

const DIE = { x: -14, y: -14, w: 32, d: 28, r: 1.4 };
const DIE_Z0 = PKG_TOP;
const DIE_H = 1.5;
const DIE_TOP = DIE_Z0 + DIE_H;

const PUMP_BLK = { x: -12, y: -12, w: 11, d: 10, r: 0.8 };
const PGBUF_BLK = { x: -12, y: 0.5, w: 11, d: 11.5, r: 0.8 };
const STATUS_BLK = { x: 5, y: -12, w: 11, d: 8.5, r: 0.8 };
const DIE_BLK_H = 1.7;

const CELL_ARRAY = { x: 0.5, y: -1.5, w: 15.5, d: 13.5, r: 0.8 };
const ARRAY_Z0 = DIE_TOP;
const ARRAY_H = 1.4;
const ARRAY_TOP = ARRAY_Z0 + ARRAY_H;

const ARRAY_SHIELD = { x: 1.2, y: -0.8, w: 14.1, d: 12.1, r: 0.6 };
const ARRAY_SHIELD_H = 1.1;

const P0 = k.fitProjection(
  [
    ...k.boxCorners(PLINTH, -PLINTH_H - FOOT_H, 0),
    ...k.boxCorners(CHASSIS, 0, PCB_TOP + CTRL_H + CTRL_SINK_H + 14),
  ],
  WIDTH,
  HEIGHT,
  { pad: 34, azimuth: AZIMUTH, elevation: ELEVATION },
);

const P1 = k.fitProjection(
  [
    ...k.boxCorners(BGA_SUB, BGA_Z0, DIE_TOP + DIE_BLK_H + 3),
  ],
  WIDTH,
  HEIGHT,
  { pad: 38, azimuth: AZIMUTH, elevation: ELEVATION },
);

const P2 = k.fitProjection(
  [
    ...k.boxCorners(CELL_ARRAY, ARRAY_Z0 - 0.3, ARRAY_TOP + 2.4),
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
    if (opts.action) attrs.push(`data-action="${opts.action}"`);
    if (opts.fade) attrs.push(`data-fade="${opts.fade}"`);
    if (opts.mat) attrs.push(`data-mat="${opts.mat}"`);
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
  const lamp = (name, x, y, rCol, hCol, rDome, hDome, z0, part, cls = "fg-led", fade = "") => {
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
  slab("plinth.badge", badge, 0, 1.2, "hi", { crease: "none", extra: badgeExtra, fade: "l0", mat: "brass" });

  slab("chassis.base", CHASSIS, CHASSIS_Z0, CHASSIS_H, "mid", {
    bevel: 1.2,
    extra: line(k.planOutline(k.insetPlan(CHASSIS, 4), CHASSIS_TOP, P0), "lo"),
  });

  const busLines = [];
  for (let i = -2; i <= 2; i++) {
    const off = i * 3.4;
    busLines.push(k.lineOnTop([CTRL_SOC.x + CTRL_SOC.w - 2, -26 + off], [BGA_SUB.x + 2, -14 + off], PCB_TOP, P0));
    busLines.push(k.lineOnTop([BGA_SUB.x + BGA_SUB.w - 2, -12 + off], [NAND2_BASE.x + 2, -12 + off], PCB_TOP, P0));
  }
  const pcbExtra =
    line(k.planOutline(k.insetPlan(PCB, 2.8), PCB_TOP, P0), "faint") +
    `<g data-part="l0-lines">${line(busLines.join(""), "lo", { free: true })}</g>`;
  slab("pcb.board", PCB, PCB_Z0, PCB_H, "lo", { bevel: 0.5, extra: pcbExtra });

  const m2Fingers = [];
  for (let fy = M2_CONN.y + 5; fy <= M2_CONN.y + M2_CONN.d - 5; fy += 5.5) {
    m2Fingers.push(k.lineOnTop([M2_CONN.x + 2.5, fy], [M2_CONN.x + M2_CONN.w - 2.5, fy], PCB_TOP + M2_CONN_H, P0));
  }
  slab("m2.connector", M2_CONN, PCB_TOP, M2_CONN_H, "hi", {
    bevel: 0.4,
    fade: "l0",
    mat: "brass",
    extra: `<g data-part="l0-lines">${line(m2Fingers.join(""), "lo", { free: true })}</g>`,
  });

  const sinkFins = [];
  for (let fy = CTRL_SINK.y + 4; fy <= CTRL_SINK.y + CTRL_SINK.d - 4; fy += 5) {
    sinkFins.push(k.lineOnTop([CTRL_SINK.x + 2.5, fy], [CTRL_SINK.x + CTRL_SINK.w - 2.5, fy], PCB_TOP + CTRL_H + CTRL_SINK_H, P0));
  }
  slab("ctrl.soc", CTRL_SOC, PCB_TOP, CTRL_H, "mid", { bevel: 0.6, fade: "l0", mat: "steel", action: "cycle-mode" });
  slab("ctrl.sink", CTRL_SINK, PCB_TOP + CTRL_H, CTRL_SINK_H, "hi", {
    bevel: 0.4,
    fade: "l0",
    mat: "steel",
    action: "cycle-mode",
    extra: `<g data-part="l0-lines">${line(sinkFins.join(""), "lo", { free: true })}</g>`,
  });

  slab("dram.cache", DRAM_CHIP, PCB_TOP, DRAM_H, "mid", {
    bevel: 0.5,
    fade: "l0",
    mat: "gunmetal",
    action: "step-charge",
    extra: `<g data-part="l0-lines">${line(k.planOutline(k.insetPlan(DRAM_CHIP, 2.5), PCB_TOP + DRAM_H, P0), "lo")}</g>`,
  });

  slab("nand2.base", NAND2_BASE, PCB_TOP, NAND2_BASE_H, "lo", { fade: "l0" });
  slab("nand2.pkg", NAND2_PKG, PCB_TOP + NAND2_BASE_H, NAND2_PKG_H, "mid", {
    bevel: 0.5,
    fade: "l0",
    mat: "gunmetal",
    extra: `<g data-part="l0-lines">${line(k.planOutline(k.insetPlan(NAND2_PKG, 2.5), PCB_TOP + NAND2_BASE_H + NAND2_PKG_H, P0), "lo")}</g>`,
  });
  cyl("m2.standoff", 80, -9, 7.2, PCB_TOP, 5.2, "mid", { bevel: 0.4, fade: "l0", mat: "steel" });
  cyl("m2.screw", 80, -9, 4.6, PCB_TOP + 5.2, 2.4, "hi", {
    bevel: 0.3,
    fade: "l0",
    mat: "brass",
    extra: `<g data-part="l0-lines">${line(k.ring(80, -9, 2.4, PCB_TOP + 7.6, P0, 18), "lo")}</g>`,
  });

  slab("bga.frame", BGA_SUB, BGA_Z0, BGA_H, "lo", {
    bevel: 0.4,
    extra: `<g data-part="l0-lines">${line(k.planOutline(k.insetPlan(BGA_SUB, 2), BGA_TOP, P0), "lo")}</g>`,
  });
  slab("nand.pkg", NAND_PKG, PKG_Z0, PKG_H, "mid", { bevel: 0.4, mat: "gunmetal" });

  slab("io.bar", IO_BAR, CHASSIS_TOP, IO_BAR_H, "lo", { bevel: 0.6, fade: "l0", action: "step-charge" });
  const ledZ = CHASSIS_TOP + IO_BAR_H;
  for (let b = 0; b < 4; b++) {
    const bit = 3 - b;
    const lxQ = IO_BAR.x + 10 + b * 6.2;
    const lxW = IO_BAR.x + 42 + b * 6.2;
    const lxD = IO_BAR.x + 74 + b * 6.2;
    const ly = IO_BAR.y + 10;
    lamp(`io.ledQ${bit}`, lxQ, ly, 2.2, 1.3, 1.7, 1.1, ledZ, `l0-q-${bit}`, "fg-led", "l0");
    lamp(`io.ledW${bit}`, lxW, ly, 2.2, 1.3, 1.7, 1.1, ledZ, `l0-wl-${bit}`, "fg-led", "l0");
    lamp(`io.ledD${bit}`, lxD, ly, 2.2, 1.3, 1.7, 1.1, ledZ, `l0-bl-${bit}`, "fg-led", "l0");
  }
  lamp("io.ledHV", IO_BAR.x + 106, IO_BAR.y + 10, 2.4, 1.3, 1.9, 1.3, ledZ, "l0-hv", "fg-led", "l0");

  slab("nand.lid0", NAND_LID, PKG_TOP, NAND_LID_H, "hi", {
    bevel: 0.3,
    layer: "cover1",
    mat: "gunmetal",
    extra: line(k.planOutline(k.insetPlan(NAND_LID, 2.5), PKG_TOP + NAND_LID_H, P0), "lo"),
  });

  A.settle(R, P0, { open: ["cover1"] });
  if (doAudit) A.auditOrExit(R, P0, { open: ["cover1"] });

  const halo = `<path class="iso-halo" d="${k.haloOf(PLINTH, -PLINTH_H - FOOT_H, PCB_TOP + CTRL_H + CTRL_SINK_H + 5, P0)}"/>`;
  return {
    body: halo + settledLayer("main"),
    cover1: `<g data-part="cover1-l0" data-hold>${settledLayer("cover1")}</g>`,
  };
}

function buildLevel1() {
  const R = A.recorder(P1, { ground: (s) => s.name === "l1.bga" });
  const { slab, cyl, lamp, line, dots, settledLayer } = makeHelpers(P1, R);

  slab("l1.bga", BGA_SUB, BGA_Z0, BGA_H, "lo", { bevel: 0.5 });

  const padPins = [];
  for (let i = -3; i <= 3; i++) {
    padPins.push([2 + i * 5, NAND_PKG.y + 2, PKG_TOP]);
    padPins.push([2 + i * 5, NAND_PKG.y + NAND_PKG.d - 2, PKG_TOP]);
    padPins.push([NAND_PKG.x + 2, i * 4.5, PKG_TOP]);
    padPins.push([NAND_PKG.x + NAND_PKG.w - 2, i * 4.5, PKG_TOP]);
  }
  const bondLines = [];
  for (let i = -2; i <= 2; i++) {
    bondLines.push(k.lineOnTop([2 + i * 4.5, DIE.y + 0.5], [2 + i * 4.5, NAND_PKG.y + 2], PKG_TOP, P1));
    bondLines.push(k.lineOnTop([2 + i * 4.5, DIE.y + DIE.d - 0.5], [2 + i * 4.5, NAND_PKG.y + NAND_PKG.d - 2], PKG_TOP, P1));
    bondLines.push(k.lineOnTop([DIE.x + 0.5, i * 4], [NAND_PKG.x + 2, i * 4], PKG_TOP, P1));
    bondLines.push(k.lineOnTop([DIE.x + DIE.w - 0.5, i * 4], [NAND_PKG.x + NAND_PKG.w - 2, i * 4], PKG_TOP, P1));
  }
  const pkgExtra =
    `<g data-part="l1-lines">` +
    line(k.planOutline(k.insetPlan(NAND_PKG, 2), PKG_TOP, P1), "lo") +
    dots(padPins, 0.55) +
    line(bondLines.join(""), "lo", { free: true }) +
    `</g>`;
  slab("l1.pkg", NAND_PKG, PKG_Z0, PKG_H, "mid", { bevel: 0.45, extra: pkgExtra });

  const dieBus = [];
  for (let b = 0; b < 4; b++) {
    const by = 2.0 + b * 2.2;
    dieBus.push(k.lineOnTop([PGBUF_BLK.x + PGBUF_BLK.w - 0.8, by], [CELL_ARRAY.x + 0.8, by], DIE_TOP, P1));
  }
  dieBus.push(k.lineOnTop([PUMP_BLK.x + PUMP_BLK.w - 0.8, -6.5], [STATUS_BLK.x + 0.8, -6.5], DIE_TOP, P1));
  dieBus.push(
    k.lineOnTop(
      [CELL_ARRAY.x + CELL_ARRAY.w / 2, CELL_ARRAY.y + 0.8],
      [CELL_ARRAY.x + CELL_ARRAY.w / 2, STATUS_BLK.y + STATUS_BLK.d - 0.8],
      DIE_TOP,
      P1,
    ),
  );

  const dieExtra =
    line(k.planOutline(k.insetPlan(DIE, 0.8), DIE_TOP, P1), "faint") +
    `<g data-part="l1-lines">${line(dieBus.join(""), "lo", { free: true })}</g>`;
  slab("l1.die", DIE, DIE_Z0, DIE_H, "lo", { bevel: 0.25, extra: dieExtra });

  slab("l1.pump", PUMP_BLK, DIE_TOP, DIE_BLK_H, "mid", { bevel: 0.2, fade: "l1", mat: "steel", action: "cycle-mode" });
  cyl("l1.cap0", PUMP_BLK.x + 3.4, PUMP_BLK.y + 5.0, 1.7, DIE_TOP + DIE_BLK_H, 1.1, "hi", { bevel: 0.15, fade: "l1", mat: "brass", action: "cycle-mode" });
  cyl("l1.cap1", PUMP_BLK.x + 7.6, PUMP_BLK.y + 5.0, 1.7, DIE_TOP + DIE_BLK_H, 1.1, "hi", { bevel: 0.15, fade: "l1", mat: "brass", action: "cycle-mode" });

  slab("l1.status", STATUS_BLK, DIE_TOP, DIE_BLK_H, "mid", { bevel: 0.2, fade: "l1", action: "cycle-mode" });
  const fZ = DIE_TOP + DIE_BLK_H;
  lamp("l1.flagHV", STATUS_BLK.x + 3.5, STATUS_BLK.y + 4.2, 1.15, 0.65, 0.9, 0.6, fZ, "l1-flag-hv", "fg-led", "l1");
  lamp("l1.flagVfy", STATUS_BLK.x + 7.5, STATUS_BLK.y + 4.2, 1.15, 0.65, 0.9, 0.6, fZ, "l1-flag-vfy", "fg-led", "l1");

  slab("l1.pgbuf", PGBUF_BLK, DIE_TOP, DIE_BLK_H, "mid", { bevel: 0.2, fade: "l1", action: "step-charge" });
  const rZ = DIE_TOP + DIE_BLK_H;
  for (let b = 0; b < 4; b++) {
    const bit = 3 - b;
    const rx = PGBUF_BLK.x + 2 + b * 2.3;
    lamp(`l1.bufQ${bit}`, rx, PGBUF_BLK.y + 3.4, 0.82, 0.5, 0.65, 0.45, rZ, `l1-q-${bit}`, "fg-led", "l1");
    lamp(`l1.bufD${bit}`, rx, PGBUF_BLK.y + 8.0, 0.82, 0.5, 0.65, 0.45, rZ, `l1-bl-${bit}`, "fg-led", "l1");
  }

  slab("l1.cellArray", CELL_ARRAY, ARRAY_Z0, ARRAY_H, "mid", {
    bevel: 0.2,
    extra: `<g data-part="l1-lines">${line(k.planOutline(k.insetPlan(CELL_ARRAY, 0.6), ARRAY_TOP, P1), "lo")}</g>`,
  });

  const shieldLines = [];
  for (let sx = ARRAY_SHIELD.x + 2.2; sx <= ARRAY_SHIELD.x + ARRAY_SHIELD.w - 2.2; sx += 2.4) {
    shieldLines.push(k.lineOnTop([sx, ARRAY_SHIELD.y + 1.5], [sx, ARRAY_SHIELD.y + ARRAY_SHIELD.d - 1.5], ARRAY_TOP + ARRAY_SHIELD_H, P1));
  }
  slab("l1.arrayShield", ARRAY_SHIELD, ARRAY_TOP, ARRAY_SHIELD_H, "hi", {
    bevel: 0.15,
    layer: "shield",
    mat: "brass",
    extra:
      line(k.planOutline(k.insetPlan(ARRAY_SHIELD, 1.0), ARRAY_TOP + ARRAY_SHIELD_H, P1), "lo") +
      line(shieldLines.join(""), "faint", { free: true }),
  });

  A.settle(R, P1, { open: ["shield"] });
  if (doAudit) A.auditOrExit(R, P1, { open: ["shield"] });
  return {
    body: settledLayer("main"),
    shield: `<g data-part="cover2" data-hold>${settledLayer("shield")}</g>`,
  };
}

function buildLevel2() {
  const R = A.recorder(P2, { ground: (s) => s.name === "l2.pwell" });
  const { slab, lamp, line, settledLayer } = makeHelpers(P2, R);

  const stringTraces = [];
  const xSrc = CELL_ARRAY.x + 0.9 + 3.55;
  const xDrn = CELL_ARRAY.x + 0.9 + 7.35 + 1.08;
  for (let b = 0; b < 3; b++) {
    const sy0 = CELL_ARRAY.y + 1.0 + b * 2.9;
    const sy1 = CELL_ARRAY.y + 1.0 + (b + 1) * 2.9;
    const yMid = sy0 + 2.62;
    stringTraces.push(
      k.lineOnTop([xDrn, sy0 + 2.15], [xDrn, yMid], ARRAY_TOP, P2),
      k.lineOnTop([xDrn, yMid], [xSrc, yMid], ARRAY_TOP, P2),
      k.lineOnTop([xSrc, yMid], [xSrc, sy1 + 0.2], ARRAY_TOP, P2),
    );
  }
  slab("l2.pwell", CELL_ARRAY, ARRAY_Z0, ARRAY_H, "lo", {
    bevel: 0.18,
    extra:
      line(k.planOutline(k.insetPlan(CELL_ARRAY, 0.5), ARRAY_TOP, P2), "lo") +
      line(stringTraces.join(""), "lo", { free: true }),
  });

  const sliceH = 0.52;
  const sliceZ = ARRAY_TOP;
  const gateZ = ARRAY_TOP + sliceH;
  const hCh = 0.24;
  const hTun = 0.22;
  const hFg = 0.30;
  const hOno = 0.20;
  const hCg = 0.28;

  for (let b = 0; b < 4; b++) {
    const sy = CELL_ARRAY.y + 1.0 + b * 2.9;
    const sliceBox = { x: CELL_ARRAY.x + 0.9, y: sy, w: CELL_ARRAY.w - 1.8, d: 2.35, r: 0.25 };

    const chanPath = { x: sliceBox.x + 0.45, y: sy + 0.24, w: 6.20, d: 1.86, r: 0.20 };
    const tunOx = { x: sliceBox.x + 0.85, y: sy + 0.34, w: 5.40, d: 1.66, r: 0.18 };
    const fltGate = { x: sliceBox.x + 1.25, y: sy + 0.44, w: 4.60, d: 1.46, r: 0.16 };
    const onoDiel = { x: sliceBox.x + 1.60, y: sy + 0.52, w: 3.90, d: 1.30, r: 0.14 };
    const ctrlGate = { x: sliceBox.x + 1.90, y: sy + 0.60, w: 3.30, d: 1.14, r: 0.14 };
    const senseNode = { x: sliceBox.x + 7.35, y: sy + 0.45, w: 2.15, d: 1.45, r: 0.16 };
    const latchPad = { x: sliceBox.x + 10.35, y: sy + 0.45, w: 2.75, d: 1.45, r: 0.18 };

    const wires = [
      k.lineOnTop([chanPath.x + chanPath.w - 0.15, sy + 1.18], [senseNode.x + 0.15, sy + 1.18], gateZ, P2),
      k.lineOnTop([senseNode.x + senseNode.w - 0.15, sy + 1.18], [latchPad.x + 0.15, sy + 1.18], gateZ, P2),
    ];
    if (b < 3) {
      wires.push(k.lineOnTop([senseNode.x + 1.08, sy + 1.75], [senseNode.x + 1.08, sy + 2.22], gateZ, P2));
    }
    slab(`l2.cell${b}.base`, sliceBox, sliceZ, sliceH, "mid", {
      bevel: 0.08,
      extra: line(wires.join(""), "lo", { free: true }),
    });

    const zTun = gateZ + hCh;
    const zFg = zTun + hTun;
    const zOno = zFg + hFg;
    const zCg = zOno + hOno;

    slab(`l2.cell${b}.chanPath`, chanPath, gateZ, hCh, "mid", { crease: "none", part: `l2-ch-${b}`, cls: "fg-gate", action: "cycle-mode" });
    slab(`l2.cell${b}.tunOx`, tunOx, zTun, hTun, "hi", { crease: "none", part: `l2-tun-${b}`, cls: "fg-gate", action: "cycle-mode" });
    slab(`l2.cell${b}.fltGate`, fltGate, zFg, hFg, "mid", { crease: "none", part: `l2-fg-${b}`, cls: "fg-gate", mat: "brass", action: "step-charge" });
    slab(`l2.cell${b}.ono`, onoDiel, zOno, hOno, "lo", { crease: "none", action: "cycle-mode" });
    slab(`l2.cell${b}.ctrlGate`, ctrlGate, zCg, hCg, "hi", { crease: "none", part: `l2-cg-${b}`, cls: "fg-gate", action: "cycle-mode" });
    slab(`l2.cell${b}.senseNode`, senseNode, gateZ, 0.46, "hi", { crease: "none", part: `l2-sn-${b}`, cls: "fg-gate" });
    slab(`l2.cell${b}.latchPad`, latchPad, gateZ, 0.38, "mid", { crease: "none", action: "step-charge" });

    lamp(`l2.cell${b}.qLamp`, latchPad.x + 1.38, latchPad.y + 0.72, 0.46, 0.28, 0.36, 0.26, gateZ + 0.38, `l2-q-${b}`);
    lamp(`l2.cell${b}.blLamp`, senseNode.x + 1.08, senseNode.y + 0.72, 0.4, 0.24, 0.3, 0.22, gateZ + 0.46, `l2-bl-${b}`);
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
  label: "Three-level recursive zoom from an M.2 NVMe solid-state drive PCB into its 3D NAND flash package and down to a 4-cell floating-gate MOSFET string.",
  body: [compositeBody],
});

const EXTRA_CSS = `<style>
  ${TURN.materialCss()}
  .iso-stage { cursor: pointer; touch-action: pan-y; user-select: none; }
  .iso-stage:focus { outline: none; }
  .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }
  .fg-led .iso-top, .fg-led .iso-shade, .fg-gate .iso-top { transition: fill 120ms ease; }
  .fg-led[data-bit="1"] .iso-top { fill: var(--fg-on-top); }
  .fg-led[data-bit="1"] .iso-shade { fill: var(--fg-on-side); }
  .fg-gate[data-bit="1"] .iso-top { fill: var(--fg-gate-on); }
  .iso[data-theme="dark"] {
    --fg-on-top: #7ee2a8;
    --fg-on-side: #3ba368;
    --fg-gate-on: #50667a;
  }
  .iso[data-theme="light"] {
    --fg-on-top: #1f9d55;
    --fg-on-side: #15733e;
    --fg-gate-on: #b8d4e8;
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

  let chargePattern = 10;
  let opMode = 0;
  let selWl = 1;
  let zoom = 0;
  let targetZoom = 0;
  let raf = 0;
  let lastNow = 0;

  function nandStringModel(chargeMask, modeBits, selectedWl) {
    const mode = modeBits % 3;
    const slices = [];
    let readWord = 0;
    const hvActive = mode !== 0 ? 1 : 0;
    for (let i = 0; i < 4; i++) {
      const qTrapped = (chargeMask >> i) & 1;
      const wlHigh = mode === 0 ? (i !== selectedWl ? 1 : 0) : mode === 1 ? (i === selectedWl ? 1 : qTrapped) : 0;
      const fnTunnel = mode === 1 ? (i === selectedWl ? 1 : qTrapped) : mode === 2 ? 1 : 0;
      const channelOn = qTrapped === 0 ? 1 : 0;
      const bitOut = channelOn;
      slices.push({
        qTrapped,
        wlHigh,
        fnTunnel,
        channelOn,
        bitOut,
      });
      readWord |= (bitOut << i);
    }
    return { chargeMask, mode, selectedWl, hvActive, readWord, slices };
  }

  function flashDieModel(str) {
    const modeNames = ["READ 0V/4.5V", "PGM +18V", "ERS P-well +20V"];
    const flagVfy =
      str.mode === 1
        ? (str.chargeMask >> str.selectedWl) & 1
        : str.mode === 2
          ? str.chargeMask === 0
            ? 1
            : 0
          : 0;
    return {
      str,
      modeName: modeNames[str.mode],
      flagHV: str.hvActive,
      flagVfy,
    };
  }

  function ssdBoardModel(die, z) {
    const level = z < 0.5 ? 0 : z < 1.5 ? 1 : 2;
    const names = ["L0 SSD", "L1 NAND die", "L2 FG string"];
    return {
      die,
      zoom: z,
      level,
      levelName: names[level],
    };
  }

  function advancePattern() {
    chargePattern = ((chargePattern + 1) & 15) || 1;
    selWl = (selWl + 1) & 3;
    opMode = 0;
  }

  function advanceMode() {
    opMode = (opMode + 1) % 3;
    if (opMode === 1) {
      chargePattern |= 1 << selWl;
    } else if (opMode === 2) {
      chargePattern = 0;
    }
  }

  const smooth = (t) => t * t * (3 - 2 * t);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function setBit(sel, bit) {
    const el = stage.querySelector(sel);
    if (el) el.setAttribute("data-bit", String(bit ? 1 : 0));
  }

  function render() {
    const str = nandStringModel(chargePattern, opMode, selWl);
    const die = flashDieModel(str);
    const ssd = ssdBoardModel(die, zoom);

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
      const s = str.slices[i];
      setBit('[data-part="l0-q-' + i + '"]', s.qTrapped);
      setBit('[data-part="l0-wl-' + i + '"]', s.wlHigh);
      setBit('[data-part="l0-bl-' + i + '"]', s.bitOut);
      setBit('[data-part="l1-q-' + i + '"]', s.qTrapped);
      setBit('[data-part="l1-bl-' + i + '"]', s.bitOut);
      setBit('[data-part="l2-tun-' + i + '"]', s.fnTunnel);
      setBit('[data-part="l2-fg-' + i + '"]', s.qTrapped);
      setBit('[data-part="l2-cg-' + i + '"]', s.wlHigh);
      setBit('[data-part="l2-ch-' + i + '"]', s.channelOn);
      setBit('[data-part="l2-sn-' + i + '"]', s.bitOut);
      setBit('[data-part="l2-q-' + i + '"]', s.qTrapped);
      setBit('[data-part="l2-bl-' + i + '"]', s.bitOut);
    }
    setBit('[data-part="l0-hv"]', die.flagHV);
    setBit('[data-part="l1-flag-hv"]', die.flagHV);
    setBit('[data-part="l1-flag-vfy"]', die.flagVfy);

    if (readout) {
      const bin4 = (v) => v.toString(2).padStart(4, "0");
      const qBits = str.slices.map((s) => s.qTrapped).reverse().join("");
      readout.textContent = ssd.levelName + " · " + die.modeName + " · Q " + qBits + " → D " + bin4(str.readWord);
    }
  }

  function stepAnim(now) {
    const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 1 / 60;
    lastNow = now;
    const diff = targetZoom - zoom;
    if (Math.abs(diff) < 0.002) {
      zoom = targetZoom;
      lastNow = 0;
      render();
      raf = 0;
      return;
    }
    zoom += diff * (1 - Math.exp(-12 * dt));
    render();
    raf = requestAnimationFrame(stepAnim);
  }

  function setTargetZoom(next, instant = false) {
    targetZoom = clamp(next, 0, 2);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (instant || reduced) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lastNow = 0;
      zoom = targetZoom;
      render();
    } else if (!raf) {
      lastNow = 0;
      raf = requestAnimationFrame(stepAnim);
    }
  }

  stage.addEventListener("click", (e) => {
    stage.focus({ preventScroll: true });
    const actEl = e.target && e.target.closest ? e.target.closest("[data-action]") : null;
    if (e.shiftKey || (actEl && actEl.getAttribute("data-action") === "step-charge")) {
      advancePattern();
      render();
      return;
    }
    if (actEl && actEl.getAttribute("data-action") === "cycle-mode") {
      advanceMode();
      render();
      return;
    }
    const next = targetZoom < 0.5 ? 1 : targetZoom < 1.5 ? 2 : 0;
    setTargetZoom(next);
  });

  stage.addEventListener("wheel", (e) => {
    if (!e.ctrlKey && !e.metaKey && zoom <= 0.01 && targetZoom <= 0.01) return;
    e.preventDefault();
    setTargetZoom(targetZoom + (e.deltaY < 0 ? 0.35 : -0.35));
  }, { passive: false });

  stage.addEventListener("keydown", (e) => {
    if (e.key === "1") setTargetZoom(0);
    else if (e.key === "2") setTargetZoom(1);
    else if (e.key === "3") setTargetZoom(2);
    else if (e.key === "ArrowUp" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      advancePattern();
      render();
    } else if (e.key === "ArrowDown" || e.key === "b" || e.key === "B") {
      e.preventDefault();
      advanceMode();
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
    setState(q, m) { chargePattern = q & 15; opMode = m % 3; render(); },
    state() { return { zoom, chargePattern, opMode }; },
  };

  render();
})();
`;

const bodyHtml =
  EXTRA_CSS +
  k.plateHtml({
    fig: "Fig 1",
    title: "From NVMe SSD to floating-gate cell",
    hint: "click or 1–3 zoom · A pattern · B mode",
    readout: "L0 SSD · READ 0V/4.5V · Q 1010 → D 0101",
    keys: [
      { mark: "raised", label: "Three orthographic zoom levels (M.2 2280 NVMe SSD stick, 3D NAND die, 4-cell FG-MOSFET string)" },
      { mark: "lit", label: "Shared Fowler–Nordheim tunneling (PGM +18 V / ERS P-well +20 V) and selected-WL read sense model" },
      { mark: "edge", label: "Epoxy package cap and bitline metal shield lift away as the view zooms from board to cells" },
    ],
    caption:
      "A three-level recursive cutaway in a single isometric world. Level 0 shows an M.2 2280 NVMe solid-state drive stick with its left-edge gold PCIe connector fingers, finned controller SoC, LPDDR4 DRAM cache, right-edge mounting standoff screw, dual BGA 3D NAND packages, and front host readout bar. Zooming to Level 1 lifts the epoxy package cap to reveal the silicon flash die: Dickson high-voltage charge pump, program/erase verify status flags, page buffer latches, and the NAND cell array under its copper bitline shield. Zooming to Level 2 lifts the shield to expose four series-connected floating-gate MOSFET cells stacked vertically in z (silicon inversion channel → SiO₂ tunnel oxide → brass polysilicon floating gate → inter-poly ONO dielectric → wordline control gate WL0–WL3) alongside their bitline sense latches. During read, unselected wordlines receive Vpass = 4.5 V while the selected wordline is biased near 0 V so trapped floating-gate charge Q inverts the sensed bitline output D = ¬Q.",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Three-level recursive zoom from M.2 NVMe SSD to 3D NAND die to 4-cell floating-gate MOSFET string.">${svgMarkup}</div>`,
  });

const outFile = join(HERE, light ? "ssd-nand-floating-gate-light.html" : "ssd-nand-floating-gate.html");
writeFileSync(outFile, k.pageHtml({ title: "From NVMe SSD to floating-gate cell", theme, body: bodyHtml, script: `${kitScript()}\n${LIVE_SCRIPT}`, width: 690 }));
console.log(`wrote ${outFile}`);
