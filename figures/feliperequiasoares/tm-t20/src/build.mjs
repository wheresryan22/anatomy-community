// Impressora térmica TM-T20 preta (140 × 199 × 146 mm, papel de 80 mm): a tampa abre na dobradiça,
// mostra o rolo, fecha, imprime um cupom linha por linha e a guilhotina corta.
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";
import { makePrism } from "./prism.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 680;
const HEIGHT = 560;

// ---------- medidas reais (mm): 140 L × 199 P × 146 A ----------
const X0 = -70;
const X1 = 70;
const Y0 = -100;
const Y1 = 99;
const BODY_TOP = 90;
const TOP = 146;
const HINGE = { y: -41.5, z: TOP };
const PANEL = { y0: 86.5, z1: 134 };
const ROLL = { x0: -40, x1: 40, y: 22, z: 84, r: 38 };
const PAPER_W = 80;
const SLOT = { y: 87.4, z: PANEL.z1 };
const RECEIPT_LEN = 74;
const OPEN_MAX = 96;

// perfil (y, z) da tampa, com a quina da frente arredondada
const COVER_RING = (() => {
  const pts = [[HINGE.y, BODY_TOP + 0.5], [PANEL.y0 - 0.5, BODY_TOP + 0.5], [PANEL.y0 - 0.5, TOP - 16]];
  for (let i = 1; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push([PANEL.y0 - 0.5 - 16 + 16 * Math.cos(a), TOP - 16 + 16 * Math.sin(a)]);
  }
  pts.push([HINGE.y, TOP]);
  return pts;
})();
const COVER_X = [X0 + 1, X1 - 1];

const rotPoint = (p, deg) => {
  const t = (deg * Math.PI) / 180;
  const dy = p[1] - HINGE.y;
  const dz = p[2] - HINGE.z;
  return [p[0], HINGE.y + dy * Math.cos(t) - dz * Math.sin(t), HINGE.z + dy * Math.sin(t) + dz * Math.cos(t)];
};
const coverCorners = [];
for (const [y, z] of COVER_RING) for (const x of COVER_X) coverCorners.push(rotPoint([x, y, z], OPEN_MAX));

const BASE = { x: -150, y: -150, w: 300, d: 300, r: 14 };
const P = k.fitProjection(
  [...k.boxCorners(BASE, -14, 0), ...coverCorners, [0, SLOT.y, SLOT.z + RECEIPT_LEN + 8], [X1, Y1, TOP]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 40 },
);
const at = (p) => k.iso(p, P);
const prism = makePrism(k.iso, k.pathOf, P);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const f1 = (v) => Math.round(v * 1000) / 1000;
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const planeMatrix = (o, U, V) => {
  const A0 = at(o);
  const A = at([o[0] + U[0], o[1] + U[1], o[2] + U[2]]);
  const B = at([o[0] + V[0], o[1] + V[1], o[2] + V[2]]);
  return `matrix(${f1(A[0] - A0[0])} ${f1(A[1] - A0[1])} ${f1(A0[0] - B[0])} ${f1(A0[1] - B[1])} ${f1(A0[0])} ${f1(A0[1])})`;
};
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];
const rr = (x, y, w, h, r, steps = 5) => k.pathOf(k.roundedPlan({ x, y, w, d: h, r }, steps), true);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const txt = (x, y, s, size, cls = "", anchor = "start") => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" class="${cls}">${esc(s)}</text>`;
// sólido com a ordem do kit, mais faces especiais (a parte de baixo da tampa)
const solid = (p, cls = "blk", tone = "hi") =>
  `<g class="iso-solid ${cls}"><path class="iso-fill" d="${p.fill}"/>${p.shades.map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" d="${d}"/>` : "")).join("")}${p.top ? `<path class="iso-top" d="${p.top}"/>` : ""}${p.extra ?? ""}${p.crease ? `<path class="iso-line iso-crease" data-tone="faint" d="${p.crease}"/>` : ""}<path class="iso-line iso-edge" data-tone="${tone}" d="${p.outline}"/></g>`;
const kitSolid = (paths, cls = "blk") => k.solidSvg(paths, { tone: "hi", crease: "faint", className: cls });
const circle = (r, n = 36) => Array.from({ length: n }, (_, i) => [r * Math.cos((i / n) * Math.PI * 2), r * Math.sin((i / n) * Math.PI * 2)]);

// =====================================================================
// BASE (uma mesa de balcão)
// =====================================================================
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -14, 10, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 22))) {
    out.push(k.solidSvg(k.cylinder(x, y, 7, -14, 1.6, P, 28), { tone: "lo" }));
    out.push(k.solidSvg(k.cylinder(x, y, 5.4, -12.4, 2.4, P, 28), { tone: "mid" }));
  }
  out.push(k.solidSvg(k.slabOf(BASE, -10, 10, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(BASE, -6, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -60, y: BASE.y + BASE.d - 14, w: 160, d: 6.5, r: 1 };
  out.push(k.solidSvg(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const label = { x: BASE.x + 12, y: BASE.y + BASE.d - 22, w: 50, d: 12, r: 1.2 };
  out.push(k.solidSvg(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L([34, 24, 28].map((w, i) => k.lineOnTop([label.x + 4, label.y + 3.2 + i * 2.8], [label.x + 4 + w, label.y + 3.2 + i * 2.8], 0.8, P)).join(""), { tone: "lo", free: true }));
  return out.join("");
}

// =====================================================================
// CORPO FIXO
// =====================================================================
const BODY = { x: X0, y: Y0, w: X1 - X0, d: Y1 - Y0, r: 12 };
function body() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BODY, 0, 6, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BODY, 14))) out.push(k.solidSvg(k.cylinder(x, y, 6, 0, 2, P, 22), { tone: "hi", className: "rub" }));
  out.push(kitSolid(k.slabOf(BODY, 2, BODY_TOP - 2, P, 6, 1.2)));
  out.push(L(k.sideSeam(BODY, 14, P, 6), { tone: "faint", className: "blk-seam" }));
  // poço do rolo e cabeça térmica (vistos com a tampa aberta)
  out.push(`<path class="tm-well" d="${k.onTop(k.roundedPlan({ x: -46, y: -36, w: 92, d: 104, r: 10 }, 6), BODY_TOP, P, true)}"/>`);
  out.push(L(k.planOutline({ x: -46, y: -36, w: 92, d: 104, r: 10 }, BODY_TOP, P, 6), { tone: "faint", className: "blk-seam" }));
  // traseira fixa do topo
  const rear = (() => {
    const pts = [[Y0, BODY_TOP], [HINGE.y - 0.5, BODY_TOP], [HINGE.y - 0.5, TOP]];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI / 2 + (i / 8) * (Math.PI / 2);
      pts.push([Y0 + 12 + 12 * Math.cos(a), TOP - 12 + 12 * Math.sin(a)]);
    }
    return pts;
  })();
  out.push(solid(prism(rear, [X0 + 1, 0, 0], Y, Z, [X1 - X0 - 2, 0, 0])));
  // lateral direita: aletas e chave liga/desliga
  const sideM = planeMatrix([X1 + 0.02, Y1 - 10, BODY_TOP], [0, -1, 0], Z);
  out.push(`<g transform="${sideM}"><path class="iso-line blk-seam" data-tone="faint" d="${Array.from({ length: 10 }, (_, i) => rr(40 + i * 5, 50, 1.8, 24, 0.9)).join("")}"/></g>`);
  out.push(solid(prism(k.roundedPlan({ x: 0, y: 0, w: 14, d: 16, r: 2 }, 3), [X1, Y1 - 30, 18], Y, Z, [1.6, 0, 0])));
  const rocker = (z, out) => solid(prism(k.roundedPlan({ x: 0, y: 0, w: 10, d: 6, r: 1 }, 2), [X1 + 1.6, Y1 - 28, z], Y, Z, [out, 0, 0]));
  out.push(`<g data-part="switch-on">${rocker(26, 2.4)}${rocker(20, 1)}</g>`);
  out.push(`<g data-part="switch-off" style="display:none">${rocker(26, 1)}${rocker(20, 2.4)}</g>`);
  out.push(`<g transform="${sideM}">${txt(25, 60, "I", 4.2, "tm-io", "middle").replace("<text", '<text data-part="io-on" data-on')}${txt(25, 70, "O", 4.2, "tm-io", "middle").replace("<text", '<text data-part="io-off"')}</g>`);
  return out.join("");
}

// frente: painel com a fenda de saída, guilhotina, botões, LEDs e marca
function frontPanel() {
  const ring = [[PANEL.y0, BODY_TOP], [Y1, BODY_TOP], [Y1, PANEL.z1 - 10]];
  for (let i = 1; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    ring.push([Y1 - 10 + 10 * Math.cos(a), PANEL.z1 - 10 + 10 * Math.sin(a)]);
  }
  ring.push([PANEL.y0, PANEL.z1]);
  const out = [solid(prism(ring, [X0 + 1, 0, 0], Y, Z, [X1 - X0 - 2, 0, 0]))];
  // fenda de saída e lâmina da guilhotina
  out.push(`<path class="tm-slot" d="${k.onTop(k.roundedPlan({ x: -44, y: PANEL.y0 - 0.4, w: 88, d: 2.4, r: 1.2 }, 3), PANEL.z1, P, true)}"/>`);
  out.push(`<path class="tm-blade" data-part="blade" d="${k.pathOf([at([-42, PANEL.y0 + 2.2, PANEL.z1]), at([42, PANEL.y0 + 2.2, PANEL.z1])])}"/>`);
  // botão de abrir a tampa (no topo do painel, à direita)
  out.push(`<g data-part="open-btn">${k.solidSvg(k.cylinder(52, 92.6, 4.6, PANEL.z1 - 1.4, 2.6, P, 24, 0.4), { tone: "hi", className: "blk gloss" })}${L(k.ring(52, 92.6, 2.2, PANEL.z1 + 1.2, P, 16), { tone: "faint", className: "blk-seam" })}</g>`);
  // face da frente: LEDs, FEED, modelo e marca
  const FM = planeMatrix([X0, Y1 + 0.02, PANEL.z1 - 10], X, Z);
  out.push(
    `<g transform="${FM}">` +
      `<circle class="tm-led" data-part="led-power" data-color="green" cx="96" cy="8" r="1.6"/>` +
      `<circle class="tm-led" data-part="led-error" data-color="orange" cx="106" cy="8" r="1.6"/>` +
      `<circle class="tm-led" data-part="led-paper" data-color="orange" cx="116" cy="8" r="1.6"/>` +
      txt(96, 14.4, "POWER", 2.2, "tm-tiny", "middle") +
      txt(106, 14.4, "ERROR", 2.2, "tm-tiny", "middle") +
      txt(116, 14.4, "PAPER", 2.2, "tm-tiny", "middle") +
      `<g data-part="feed"><path class="tm-feed" d="${rr(122, 4.4, 14, 8, 3)}"/><path class="iso-line blk-seam" data-tone="hi" d="${rr(122, 4.4, 14, 8, 3)}"/>${txt(129, 10, "FEED", 2.6, "tm-tiny-on", "middle")}</g>` +
      `</g>`,
  );
  const LM = planeMatrix([X0, Y1 + 0.02, BODY_TOP], X, Z);
  out.push(`<g transform="${LM}">${txt(70, 40, "TM-T20", 13, "tm-logo", "middle")}</g>`);
  return out.join("");
}

// rolo de 80 mm, cabeça térmica e a ponta do papel
function inside() {
  // o rolo só aparece acima das bordas de cima do corpo (o resto está dentro do poço)
  const a = at([X0, Y1, BODY_TOP]);
  const b = at([X1, Y1, BODY_TOP]);
  const c = at([X1, Y0, BODY_TOP]);
  const clip = `<clipPath id="tm-above"><path d="${k.pathOf([[a[0] - 400, a[1] - 1200], [a[0] - 400, a[1] + (a[1] - b[1]) * (400 / (b[0] - a[0]))], a, b, c, [c[0] + 400, c[1] - (b[1] - c[1]) * (400 / (c[0] - b[0]))], [c[0] + 400, c[1] - 1200]], true)}"/></clipPath>`;
  const out = [clip, `<g clip-path="url(#tm-above)">`];
  const tailTop = (x) => [x, ROLL.y + ROLL.r * 0.8, ROLL.z + ROLL.r * 0.55];
  const tailEnd = (x) => [x, PANEL.y0 - 2, BODY_TOP + 6];
  out.push(`<g data-part="paper-tail" style="opacity:0"><path class="tm-paper" data-part="tail-fill" d="${k.pathOf([at(tailTop(ROLL.x0)), at(tailTop(ROLL.x1)), at(tailEnd(ROLL.x1)), at(tailEnd(ROLL.x0))], true)}"/><path class="iso-line" data-tone="lo" data-part="tail-line" d="${k.pathOf([at(tailTop(ROLL.x0)), at(tailEnd(ROLL.x0)), at(tailEnd(ROLL.x1)), at(tailTop(ROLL.x1))])}"/></g>`);
  out.push(`<g data-part="roll">${solid(prism(circle(ROLL.r, 48), [ROLL.x0, ROLL.y, ROLL.z], Y, Z, [ROLL.x1 - ROLL.x0, 0, 0]), "tm-roll", "hi")}</g>`);
  const capM = planeMatrix([ROLL.x1 + 0.02, ROLL.y, ROLL.z], [0, -1, 0], Z);
  out.push(`<g transform="${capM}">${[14, 22, 30].map((r) => `<circle class="tm-roll-ring" data-ring="${r}" r="${r}"/>`).join("")}<circle class="tm-core" r="9"/><circle class="iso-line" data-tone="hi" r="9" fill="none"/></g>`);
  out.push(`<path class="iso-line" data-tone="hi" data-part="roll-marks" d=""/>`);
  out.push(`</g>`);
  out.push(kitSolid(k.slabOf({ x: -44, y: PANEL.y0 - 10, w: 88, d: 8, r: 1 }, BODY_TOP, 5, P, 2, 0.4)));
  return out.join("");
}

// o cupom que sai da fenda
function receipt() {
  const W = PAPER_W;
  const Lr = RECEIPT_LEN;
  const zig = Array.from({ length: 33 }, (_, i) => `L${f1(W - (i / 32) * W)} ${i % 2 ? Lr - 1.4 : Lr}`).join("");
  const row = (y, a, b, size = 4.2, cls = "tm-r-text") => txt(6, y, a, size, cls) + (b ? txt(W - 6, y, b, size, cls, "end") : "");
  const content = [
    `<path class="tm-paper" d="M0 0H${W}${zig}Z"/>`,
    `<path class="tm-paper-edge" d="M0 0H${W}${zig}Z"/>`,
    txt(W / 2, 11, "PEDIDO #0428", 6.4, "tm-r-text tm-r-bold", "middle"),
    txt(W / 2, 18, "Mesa 07 · 19:42", 4, "tm-r-text", "middle"),
    `<path class="tm-r-rule" d="M6 22.6H${W - 6}"/>`,
    txt(6, 30, "1x Burger da casa  34,90", 4.2, "tm-r-text tm-pre"),
    txt(6, 37, "Taxa de entrega     3,49", 4.2, "tm-r-text tm-pre"),
    `<path class="tm-r-rule" d="M6 41.6H${W - 6}"/>`,
    txt(6, 50, "TOTAL      R$ 38,39", 5.2, "tm-r-text tm-r-bold tm-pre"),
    txt(W / 2, 59, "obrigado!", 3.8, "tm-r-text", "middle"),
  ].join("");
  const M = planeMatrix([-W / 2, SLOT.y + 0.02, SLOT.z], X, Z);
  return `<clipPath id="tm-receipt-clip"><path transform="${M}" d="M-4 -140H${W + 4}V0H-4Z"/></clipPath><g clip-path="url(#tm-receipt-clip)"><g transform="${M}"><g data-part="blank" style="opacity:0"><path class="tm-paper" d="M0 0H${W}V120H0Z"/><path class="tm-paper-edge" d="M0 120V0H${W}V120"/></g><g data-part="receipt" transform="translate(0 0)">${content}</g></g></g>`;
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Uma impressora térmica TM-T20 preta, de 140 por 199 por 146 milímetros, sobre uma base. O botão do painel abre a tampa, que gira na dobradiça e mostra o rolo de papel de 80 mm e a cabeça térmica; a tampa fecha, o cupom sai linha por linha pela fenda da frente e a guilhotina automática corta.",
  body: [base(), body(), `<g data-part="cover-back"></g>`, inside(), `<g data-part="cover-front"></g>`, frontPanel(), receipt(), `<path class="tm-hit" data-part="hit" d="${prism(k.roundedPlan({ x: X0, y: 0, w: X1 - X0, d: TOP, r: 0 }, 1), [0, Y0, 0], X, Z, [0, Y1 - Y0, 0]).outline}"/>`,
    `<path class="tm-hit tm-spot" data-part="hit-feed" d="${k.pathOf([at([49, Y1 + 0.5, 108]), at([69, Y1 + 0.5, 108]), at([69, Y1 + 0.5, 123]), at([49, Y1 + 0.5, 123])], true)}"/>`,
    `<path class="tm-hit tm-spot" data-part="hit-switch" d="${k.pathOf([at([X1 + 2.5, Y1 - 36, 12]), at([X1 + 2.5, Y1 - 8, 12]), at([X1 + 2.5, Y1 - 8, 40]), at([X1 + 2.5, Y1 - 36, 40])], true)}"/>`],
});

const css = readFileSync(join(HERE, "figure.css"), "utf8");
const DATA = {
  P,
  COVER_RING,
  COVER_X,
  HINGE,
  OPEN_MAX,
  ROLL,
  PANEL,
  BODY_TOP,
  TOP,
  STEPS: [0, 2.2, 4.4, 6.0, 9.6, 11.6],
  NAMES: ["Abrir tampa", "Rolo de 80 mm", "Fechar", "Imprimir", "Cortar"],
  STATUS: ["abrindo", "tampa aberta", "fechando", "imprimindo", "cupom cortado"],
  FEED: [0, 13, 20, 25, 32, 39, 44, 53, 62, RECEIPT_LEN],
  RECEIPT_LEN,
  PAPER_TOTAL: 300,
  FEED_MAX: 60,
};
const prismSrc = readFileSync(join(HERE, "prism.js"), "utf8").replace("export function", "function");
const live = `const DATA = ${JSON.stringify(DATA)};\n${prismSrc}\n` + readFileSync(join(HERE, "live.js"), "utf8");
const steps = DATA.NAMES.map((n, i) => `<li data-step="${i}"><b>${i + 1}</b><span>${n}</span></li>`).join("");
const THEMES = [["light", "Claro"], ["dark", "Escuro"], ["blueprint", "Blueprint"]];
const switcher = `<div class="tm-themes" role="radiogroup" aria-label="Tema da figura">${THEMES.map(([id, label]) => `<button type="button" role="radio" data-set="${id}" aria-checked="${id === "light"}"><i aria-hidden="true"></i>${label}</button>`).join("")}</div>`;
const themeScript = `
const themeButtons = [...document.querySelectorAll(".tm-themes [data-set]")];
let fadeTimer = 0;
function setTheme(id, animate) {
  if (animate) {
    document.body.classList.add("tm-fade");
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => document.body.classList.remove("tm-fade"), 600);
  }
  document.body.dataset.theme = id;
  document.documentElement.style.colorScheme = id === "light" ? "light" : "dark";
  themeButtons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.set === id)));
  try { localStorage.setItem("tm-t20-tema", id); } catch {}
}
themeButtons.forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.set, true)));
document.querySelector(".tm-themes").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  e.preventDefault();
  e.stopPropagation();
  const i = themeButtons.findIndex((b) => b.getAttribute("aria-checked") === "true");
  const next = themeButtons[(i + (e.key === "ArrowRight" ? 1 : themeButtons.length - 1)) % themeButtons.length];
  setTheme(next.dataset.set, true);
  next.focus();
});
try { const saved = localStorage.getItem("tm-t20-tema"); if (saved && themeButtons.some((b) => b.dataset.set === saved)) setTheme(saved, false); } catch {}
`;
const page = k.plateHtml({
  fig: "Fig. 6",
  title: "TM-T20",
  hint: "toque na impressora · segure FEED · chave na lateral",
  readout: "etapa –/5 · tampa fechada · rolo 100% · pronta",
  keys: [
    { mark: "lit", label: "O cupom, o rolo e os LEDs" },
    { mark: "raised", label: "Corpo e tampa pretos; a tampa gira na dobradiça" },
    { mark: "edge", label: "Guilhotina automática na fenda da frente" },
  ],
  caption: "A impressora térmica TM-T20 em escala real (140 × 199 × 146 mm, cerca de 1,7 kg): o botão do painel solta a tampa, que gira na dobradiça traseira e mostra o rolo de papel térmico de 80 mm sobre a cabeça térmica. Com a tampa aberta o LED ERROR pisca; ao fechar, o rolete encosta na cabeça, o cupom avança linha por linha pela fenda da frente e a guilhotina automática corta. Segure FEED (ou a tecla F) para avançar papel em branco; ao soltar, a guilhotina corta. Cada cupom gasta o rolo, e quando ele acaba o LED PAPER acende e a impressão para até a tampa abrir para um rolo novo. A chave na lateral (ou a tecla L) liga e desliga. As setas ← → percorrem as cinco etapas.",
  body: `${switcher}<div class="tm-stage" tabindex="0" role="group" aria-label="Impressora térmica TM-T20. Toque para abrir a tampa e imprimir; segure F para avançar papel; L liga e desliga; use as setas para percorrer as etapas.">${svg}<button class="tm-replay" type="button" data-part="replay">↻ de novo</button><span class="tm-sr" role="status" aria-live="polite" data-status></span></div><ol class="tm-steps" aria-hidden="true">${steps}</ol>`,
});
writeFileSync(join(HERE, "tm-t20.html"), k.pageHtml({ title: "TM-T20 · impressora térmica", theme: "light", body: `<style>${css}</style>` + page, script: kitScript() + live + themeScript, width: 760 }).replace('<html lang="en">', '<html lang="pt-BR">'));
console.log("wrote tm-t20.html");
