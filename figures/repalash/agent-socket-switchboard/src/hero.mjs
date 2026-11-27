// Fig 1, the hero: a small patch switchboard on a bench plate.
//
// The object is the explanation. Three caller units on the left are AI agents
// (a rack for an agent in the cloud, a terminal for one on your laptop, a tape
// reader for a script); their cords run into the switchboard, which is the
// relay. A patch cord plugged into a socket on the switchboard's shelf is the
// link: it runs to the laptop (a browser tab). A second cord in the next socket
// runs to an app on a stand. A call is a bead that runs from a caller into the
// switchboard, up the link's cord to the laptop or the app, and back.
//
// What the reader can do, and what it means (the rules live in model.mjs):
// - pull the plug: Stop. The lamp goes dark and calls are turned away at the
//   switchboard; plugging back in is a new link, so the count starts again.
// - close the lid: the laptop sleeps. The switchboard holds the line (its
//   lamp blinks, the hold dial runs against 24 h) and calls are told to retry.
//   Open it and the same link carries on.
//
// Built once in Node with the anatomy kit (relay/landing/kit, MIT): static SVG
// plus precomputed paths for the live script. Nothing is built in the browser.

import * as k from "../../../../.skill/kit/iso-kit.mjs"
import * as G from "../../../../.skill/kit/lathe.mjs"
import { tubePieces, tubeSvg } from "../../../../.skill/kit/tube.mjs"

export const WIDTH = 760
export const HEIGHT = 412
export const AZIMUTH = 31

// ── world plan (units ≈ px; x toward the viewer, y to the left, z up) ──
const PLATE = { x: -82, y: -262, w: 160, d: 482, r: 10 }
const PLATE_H = 10
const FOOT_H = 5

// switchboard (the relay)
const SB = { x: -62, y: -56, w: 96, d: 112, r: 5 }          // lower cabinet
const SB_TOP = 40
const SHELF = { x: -64, y: -59, w: 110, d: 118, r: 6 }
const SHELF_H = 5
const DECK = SB_TOP + SHELF_H                                   // top of the shelf
const RISER = { x: -62, y: -56, w: 20, d: 112, r: 4 }
const RISER_TOP = 104
const RISER_FACE = RISER.x + RISER.w
const JACKS = { x: -32, y: -46, w: 40, d: 92, r: 3 }           // socket plate on the shelf
const JACK_H = 3
const JACK_TOP = DECK + JACK_H
const SOCKET_X = -14
const SOCKETS = [-34, -17, 0, 17, 34]
export const PLUGS = [{ x: SOCKET_X, y: -34 }, { x: SOCKET_X, y: -17 }]   // 0 → laptop, 1 → app
const PLUG_TOP = JACK_TOP + 21
export const PULL = 14                                          // how far Stop lifts a plug
const LAMPS = [{ y: -6, z: 92 }, { y: 7, z: 92 }]               // one per link, clear of the cords in front
const DIAL = { y: 24, z: 76, r: 15 }
const FRONT = SB.x + SB.w
const KEYS_X = SHELF.x + SHELF.w - 9                            // lever keys along the shelf's front lip

// callers (AI agents)
export const CALLERS = [
  { x: -30, y: 96, kind: "tape" },
  { x: -30, y: 146, kind: "terminal" },
  { x: -30, y: 196, kind: "rack" },
]
const LANES = [6, 13, 20]                                       // x of each caller cord's run along the plate

// laptop (a browser tab)
const LAP = { x: -30, y: -200, w: 64, d: 90, r: 4 }
const LAP_H = 4.5
const HINGE_X = LAP.x + 4
const LID_W = 86
const LID_L = 58
const LID_T = 2.2
export const LID_OPEN = 106
export const LID_STEPS = 24

// app on a stand
const APP = { x: -74, y: -252, w: 28, d: 52 }
const PANEL = { x: APP.x + 3, y: APP.y - 6, w: 5, d: APP.d + 12, r: 1.6 }
const PANEL_Z = 30
const PANEL_H = 40

export function buildHero() {
  const pts = [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [RISER.x, -20, RISER_TOP], [-60, -110, 118], [APP.x, APP.y, PANEL_Z + PANEL_H]]
  const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 12, azimuth: AZIMUTH })
  const V = G.viewOf(P)
  const at = (p) => k.iso(p, P)
  const S = (paths, style) => k.solidSvg(paths, style)
  const L = (d, style) => k.lineSvg(d, style)
  const D = (points, style) => k.dotsSvg(points, style)
  const depth = (p) => k.depthOf(p, P)
  const byDepth = (points) => [...points].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]))
  const fmt = (n) => +n.toFixed(2)
  const box = (plan, z, h, style = {}, steps = 4, bevel = 0.5) => S(k.slabOf(plan, z, h, P, steps, bevel), style)
  const halo = (plan, z = 0, h = 3, blur = 5) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}" style="filter:blur(${blur}px)"/>`
  // A transform that maps flat 2D (x right, y down) onto a plane through `o`
  // spanned by world vectors `right` and `down` (one unit each).
  const planeMatrix = (o, right, down) => {
    const O = at(o)
    const R = at([o[0] + right[0], o[1] + right[1], o[2] + right[2]])
    const Dn = at([o[0] + down[0], o[1] + down[1], o[2] + down[2]])
    return `matrix(${fmt(R[0] - O[0])} ${fmt(R[1] - O[1])} ${fmt(Dn[0] - O[0])} ${fmt(Dn[1] - O[1])} ${fmt(O[0])} ${fmt(O[1])})`
  }
  // faces: +x (toward the viewer: right on screen is −y) and +y (right is +x)
  const onFront = (x, inner) => `<g transform="${planeMatrix([x, 0, 0], [0, -1, 0], [0, 0, -1])}">${inner}</g>`
  const onSide = (y, inner) => `<g transform="${planeMatrix([0, y, 0], [1, 0, 0], [0, 0, -1])}">${inner}</g>`
  // flat rounded rectangle in face units
  const rr = (x0, y0, x1, y1, r, steps = 5) => k.pathOf(k.roundedPlan({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, steps), true)
  const line = (tone, d, extra = "") => `<path class="iso-line" data-tone="${tone}" d="${d}"${extra}/>`
  const screws = (pts, size = 0.45) => D(pts.map(at), { size })

  const items = []
  const put = (centre, svg, bias = 0) => items.push({ key: depth(centre) + bias, svg })
  // a part made of one of the figure's materials (figures/style.mjs)
  const mat = (name, svg) => `<g class="as-m-${name}">${svg}</g>`

  // ── plate ────────────────────────────────────────────────────────────
  const plate = (() => {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`]
    for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
      out.push(S(k.cylinder(x, y, 7.5, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }))
      out.push(S(k.cylinder(x, y, 5.8, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }))
    }
    out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }))
    out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }))
    const corners = k.corners(PLATE, 10)
    out.push(L(corners.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }))
    out.push(D(corners.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))
    // ruler strip along the front edge
    const strip = { x: PLATE.x + PLATE.w - 15, y: -170, w: 7, d: 300, r: 1 }
    out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }))
    const t = k.topTicks(strip.y + 4, strip.y + strip.d - 4, 4, 5, strip.x + 0.8, 0.6, [2, 3.6], P, "y")
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }))
    out.push(D([at([strip.x + 3.5, strip.y + 2, 0.6]), at([strip.x + 3.5, strip.y + strip.d - 2, 0.6])], { size: 0.45 }))
    // label plate, front right
    const label = { x: PLATE.x + PLATE.w - 24, y: -250, w: 13, d: 52, r: 1.2 }
    out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }))
    out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }))
    out.push(L([36, 28, 20].map((w, i) => k.lineOnTop([label.x + 3.6 + i * 2.9, label.y + label.d - 5], [label.x + 3.6 + i * 2.9, label.y + label.d - 5 - w], 0.8, P)).join(""), { tone: "lo", free: true }))
    out.push(D([at([label.x + label.w / 2, label.y + 3, 0.8]), at([label.x + label.w / 2, label.y + label.d - 2.4, 0.8])], { size: 0.45 }))
    // cable clips on the plate, holding the caller cords where they lie
    return out.join("")
  })()

  // ── switchboard ──────────────────────────────────────────────────────
  {
    const out = [halo(k.insetPlan(SB, -3), 0, 6, 6)]
    for (const [x, y] of byDepth(k.corners(SB, 9))) out.push(S(k.cylinder(x, y, 4.2, 0, 3, P, 20), { tone: "lo" }))
    out.push(S(k.slabOf(SB, 3, SB_TOP - 3, P, 5, 0.6), {
      tone: "mid",
      inner: L(k.sideSeam(SB, 9, P, 5), { tone: "faint" }),
    }))
    // front panel: inset outline, counter window, vents, screws
    const fy0 = SB.y + 6, fy1 = SB.y + SB.d - 6
    const panel = rr(-fy1, -(SB_TOP - 4), -fy0, -12, 2)
    const vents = []
    for (let i = 0; i < 9; i++) { const y = 36 - i * 4.2; vents.push(rr(-y - 1, -32, -y + 1, -18, 1, 3)) }
    out.push(onFront(FRONT,
      line("lo", panel)
      + `<path class="as-window" d="${rr(-8, -30, 30, -18, 2)}"/>` + line("mid", rr(-8, -30, 30, -18, 2))
      + `<text class="as-digits" data-part="counter" x="27" y="-20.6" text-anchor="end" font-size="9">0000</text>`
      + line("lo", vents.join(""))
      + `<circle class="as-face" cx="${-fy1 + 4}" cy="-12" r="0"/>`))
    out.push(screws([[FRONT, fy0 + 3, SB_TOP - 6], [FRONT, fy1 - 3, SB_TOP - 6], [FRONT, fy0 + 3, 15], [FRONT, fy1 - 3, 15]]))
    // the +y side: a jack panel where the callers' cords come in
    out.push(onSide(SB.y + SB.d, line("lo", rr(SB.x + 10, -(SB_TOP - 6), SB.x + SB.w - 10, -10, 2))))
    // shelf
    out.push(S(k.slabOf(SHELF, SB_TOP, SHELF_H, P, 6, 1.2), { tone: "mid" }))
    out.push(L(k.planOutline(k.insetPlan(SHELF, 3.5), DECK, P), { tone: "faint" }))
    put([SB.x + SB.w / 2, 0, 0], out.join(""), -80)
  }
  {
    // riser: hold dial, two lamps in hoods, handles
    const out = []
    out.push(S(k.slabOf(RISER, DECK, RISER_TOP - DECK - 3, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(RISER, DECK + 8, P, 4), { tone: "faint" }) }))
    out.push(S(k.slabOf(k.insetPlan(RISER, -1.2), RISER_TOP - 3, 3, P, 4, 0.6), { tone: "mid" }))
    out.push(L(k.planOutline(k.insetPlan(RISER, 3), RISER_TOP, P), { tone: "faint" }))
    out.push(screws([[RISER.x + 4.5, RISER.y + 5], [RISER.x + 4.5, RISER.y + RISER.d - 5], [RISER.x + RISER.w - 4.5, RISER.y + 5], [RISER.x + RISER.w - 4.5, RISER.y + RISER.d - 5]].map(([x, y]) => [x, y, RISER_TOP])))
    // hold dial: 24 h, one tick an hour
    const ticks = []
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const r0 = DIAL.r - (i % 6 === 0 ? 4.2 : 2.4)
      ticks.push(`M${fmt(Math.sin(a) * r0)} ${fmt(-Math.cos(a) * r0)}L${fmt(Math.sin(a) * (DIAL.r - 1.2))} ${fmt(-Math.cos(a) * (DIAL.r - 1.2))}`)
    }
    const dialFace = `<g transform="translate(${-DIAL.y} ${-DIAL.z})">`
      + `<circle class="as-face" r="${DIAL.r + 2.6}"/>` + `<circle class="iso-line" data-tone="mid" r="${DIAL.r + 2.6}"/>`
      + `<circle class="iso-line" data-tone="lo" r="${DIAL.r}"/>`
      + line("lo", ticks.filter((_, i) => i % 6).join("")) + line("mid", ticks.filter((_, i) => i % 6 === 0).join(""))
      + `<path class="as-hold-arc" data-part="dial-arc" d=""/>`
      + `<path class="iso-line" data-tone="hi" data-part="dial-hand" d="M0 3L0 ${-(DIAL.r - 3.2)}" style="stroke-width:1.1"/>`
      + `<circle class="as-face" r="1.9"/><circle class="iso-line" data-tone="mid" r="1.9"/>`
      + `</g>`
    out.push(onFront(RISER_FACE, dialFace))
    // lamps: a hood (a short tube along +x) with a lens
    LAMPS.forEach((lamp, i) => {
      const F = G.frameAlong([RISER_FACE, lamp.y, lamp.z], [1, 0, 0])
      out.push(mat("brass", S(G.disc(0, 1.2, 6.2, F, P), { tone: "mid" }) + S(G.disc(1.2, 4.2, 4.8, F, P), { tone: "mid" })))
      out.push(`<path class="as-lamp" data-part="lamp-${i}" d="${G.circleOf(F, 4.2, 3.4, P)}"/>`)
      out.push(L(G.circleOf(F, 4.2, 3.4, P), { tone: "lo" }))
    })
    // a small engraved rule under each lamp, standing for its label
    out.push(onFront(RISER_FACE, LAMPS.map((lamp) => line("faint", `M${-lamp.y - 4} ${-(lamp.z - 9)}H${-lamp.y + 4}`, ` data-free="both"`)).join("")))
    put([RISER.x + 10, 0, 0], out.join(""), -60)
  }
  {
    // socket plate with five sockets, a designation strip, lever keys on the lip
    const out = []
    out.push(S(k.slabOf(JACKS, DECK, JACK_H, P, 3, 0.6), { tone: "mid" }))
    out.push(L(k.planOutline(k.insetPlan(JACKS, 2), JACK_TOP, P, 3), { tone: "faint" }))
    for (const y of SOCKETS) {
      out.push(mat("brass", L(k.ring(SOCKET_X, y, 4.8, JACK_TOP, P, 28), { tone: "mid" })))
      out.push(`<path class="as-hole" d="${k.pathOf(k.circleRing(SOCKET_X, y, 2.7, 24).map(([x, yy]) => at([x, yy, JACK_TOP])), true)}"/>`)
    }
    // designation strip: a raised card holder in front of the sockets
    const strip = { x: SOCKET_X + 8, y: JACKS.y + 3, w: 6, d: JACKS.d - 6, r: 1 }
    out.push(S(k.slabOf(strip, JACK_TOP, 1, P, 3), { tone: "lo", crease: "none" }))
    out.push(L(SOCKETS.slice(0, -1).map((y, i) => k.lineOnTop([strip.x, (y + SOCKETS[i + 1]) / 2], [strip.x + strip.w, (y + SOCKETS[i + 1]) / 2], JACK_TOP + 1, P)).join(""), { tone: "faint" }))
    out.push(L(SOCKETS.map((y) => k.lineOnTop([strip.x + 3, y + 4.5], [strip.x + 3, y - 4.5], JACK_TOP + 1, P)).join(""), { tone: "lo", free: true }))
    out.push(screws([[JACKS.x + 3.5, JACKS.y + 3.5], [JACKS.x + 3.5, JACKS.y + JACKS.d - 3.5], [JACKS.x + JACKS.w - 3.5, JACKS.y + 3.5], [JACKS.x + JACKS.w - 3.5, JACKS.y + JACKS.d - 3.5]].map(([x, y]) => [x, y, JACK_TOP])))
    put([JACKS.x + JACKS.w / 2, 0, 0], out.join(""), -40)
  }
  {
    // five lever keys on the shelf lip, one per socket
    for (const y of byDepth(SOCKETS.map((y) => [KEYS_X, y])).map((p) => p[1])) {
      const out = []
      out.push(box({ x: KEYS_X - 3, y: y - 3.5, w: 6, d: 7, r: 1 }, DECK, 2.2, { tone: "mid" }, 3, 0.3))
      out.push(mat("steel", S(k.cylinder(KEYS_X, y, 0.9, DECK + 2.2, 5.4, P, 12), { tone: "mid", crease: "none" })))
      out.push(mat("rubber", S(k.cylinder(KEYS_X, y, 1.7, DECK + 7.6, 2.2, P, 16), { tone: "hi" })))
      put([KEYS_X, y, 0], out.join(""), -20)
    }
  }

  // ── plugs (the links) ───────────────────────────────────────────────
  const plug = (p, lit, i) => {
    const out = []
    const z0 = JACK_TOP
    // the tip slides out of the socket: one rod, clipped at the socket face
    const tip = G.rodOut(G.frameAlong([p.x, p.y, z0], [0, 0, 1]), 0, 1.2, 1.5, P, { stroke: PULL })
    out.push(`<clipPath id="as-tip-${i}"><path data-hold d="${tip.clip}"/></clipPath><g clip-path="url(#as-tip-${i})">${mat("brass", S(tip.paths, { tone: "hi" }))}</g>`)
    out.push(mat("brass", S(k.cylinder(p.x, p.y, 2.3, z0 + 1, 2.2, P, 20), { tone: "hi" })))                  // sleeve
    out.push(mat("brass", S(k.cylinder(p.x, p.y, 3.8, z0 + 3.2, 1.8, P, 24), { tone: "mid" })))                // collar
    out.push(mat("rubber", S(k.cylinder(p.x, p.y, 3.3, z0 + 5, 10, P, 24), { tone: "hi", crease: "lo" })        // body
      + L(k.knurl(p.x, p.y, 3.3, z0 + 7, z0 + 13, 22, P, 0.3), { tone: "mid" })
      + S(k.cylinder(p.x, p.y, 2.4, z0 + 15, 4.6, P, 20), { tone: "mid" })                                     // boot
      + L(k.sideArc(p.x, p.y, 2.4, z0 + 17.4, P, 12), { tone: "faint" })))
    return out.join("")
  }

  // ── cords ────────────────────────────────────────────────────────────
  const cordR = 1.45
  const routes = {}
  const cord = (name, control, bend, { tone = "mid", material } = {}) => {
    const route = G.fillet(control, bend, 9, { P, tube: cordR })
    routes[name] = route
    const pieces = tubePieces(route, cordR, P, { maxLength: 14 })
    for (const piece of pieces) items.push({ key: G.dot3(piece.mid, V), svg: mat(material, tubeSvg(piece, { tone })) })
  }
  const PORT_LAP = [LAP.x + 30, LAP.y + LAP.d, 2.25]
  const PORT_APP = [APP.x + 16, APP.y + APP.d, 7]
  cord("link0", [[PLUGS[0].x, PLUGS[0].y, PLUG_TOP - 1], [PLUGS[0].x, PLUGS[0].y, 100], [PLUGS[0].x + 12, -78, 100], [PORT_LAP[0], -86, 34], [PORT_LAP[0], -90, 1.5], [PORT_LAP[0], PORT_LAP[1] + 12, 1.5], [PORT_LAP[0], PORT_LAP[1] + 2.2, PORT_LAP[2]]], 14, { material: "cord" })
  cord("link1", [[PLUGS[1].x, PLUGS[1].y, PLUG_TOP - 1], [PLUGS[1].x, PLUGS[1].y, 116], [-50, PLUGS[1].y, 122], [-56, -120, 122], [PORT_APP[0], -176, 54], [PORT_APP[0], PORT_APP[1] + 16, PORT_APP[2]], [PORT_APP[0], PORT_APP[1] + 2.2, PORT_APP[2]]], 18, { material: "cord" })
  const SIDE_JACKS = LANES.map((x) => [x, SB.y + SB.d, 16])
  const callerPort = (c) => [c.x + 21.6, c.y - 9, 3.2]
  CALLERS.forEach((c, i) => {
    const [jx, jy, jz] = SIDE_JACKS[i]
    const [px, py, pz] = callerPort(c)
    cord(`caller${i}`, [[px, py, pz], [jx - 4, py, 1.5], [jx, py - 4, 1.5], [jx, jy + 14, 1.5], [jx, jy + 9, jz], [jx, jy + 2.2, jz]], 5, { tone: "mid", material: "rubber" })
  })
  // connector shells where cords land on a face
  {
    const shells = []
    const shellAlong = (material, p, axis, body = 2.9, flange = 4.2) => {
      const F = G.frameAlong(p, axis)
      shells.push({ key: depth(p) + 0.5, svg: mat(material, S(G.disc(0, 2.4, body, F, P), { tone: "mid" }) + S(G.disc(-0.6, 0, flange, F, P), { tone: "mid" })) })
    }
    SIDE_JACKS.forEach((p) => shellAlong("brass", p, [0, 1, 0]))
    shellAlong("steel", PORT_LAP, [0, 1, 0], 1.9, 2.2)
    shellAlong("steel", PORT_APP, [0, 1, 0])
    CALLERS.forEach((c) => shellAlong("steel", callerPort(c), [1, 0, 0], 2.2, 3))
    items.push(...shells)
  }

  // ── callers ──────────────────────────────────────────────────────────
  CALLERS.forEach((c, ci) => {
    const plan = { x: c.x - 20, y: c.y - 17, w: 40, d: 34, r: 3 }
    const out = [halo(plan, 0, 4, 5)]
    out.push(S(k.slabOf(k.insetPlan(plan, -1.6), 0, 6, P, 4, 0.4), { tone: "lo", inner: L(k.sideSeam(k.insetPlan(plan, -1.6), 2, P, 4), { tone: "faint" }) }))
    if (c.kind === "rack") {
      // a server: stacked units with vents and status lamps
      const H = 50
      out.push(`<g class="as-m-gunmetal">`)
      out.push(S(k.slabOf(plan, 6, H, P, 4, 0.8), { tone: "mid", inner: [14, 26, 38].map((z) => L(k.sideSeam(plan, z, P, 4), { tone: "faint" })).join("") }))
      out.push(L(k.planOutline(k.insetPlan(plan, 3), 6 + H, P), { tone: "faint" }))
      const fx = plan.x + plan.w
      const units = [[8, 17], [19, 29], [31, 41], [43, 54]]
      out.push(onFront(fx, units.map(([z0, z1], u) => {
        const slots = []
        for (let s = 0; s < 6; s++) { const y = c.y + 12 - s * 3.2; slots.push(rr(-y - 0.8, -(z1 - 2), -y + 0.8, -(z0 + 2), 0.8, 3)) }
        return line("lo", slots.join("")) + `<circle class="as-led" data-caller="${ci}" cx="${-(c.y - 10)}" cy="${-(z0 + z1) / 2}" r="1.1"/>` + line("lo", `M${-(c.y - 6)} ${-(z0 + z1) / 2 - 2}V${-(z0 + z1) / 2 + 2}`, ` data-free="both"`)
      }).join("")))
      out.push(screws(units.flatMap(([z0, z1]) => [[fx, plan.y + 2.4, (z0 + z1) / 2], [fx, plan.y + plan.d - 2.4, (z0 + z1) / 2]]), 0.4))
      out.push(`</g>`)
    } else if (c.kind === "terminal") {
      // a small terminal: a screen in a case, a keyboard in front
      const body = { x: plan.x, y: plan.y, w: 26, d: plan.d, r: 3 }
      out.push(`<g class="as-m-beige">`)
      out.push(S(k.slabOf(body, 6, 34, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(body, 10, P, 4), { tone: "faint" }) }))
      out.push(L(k.planOutline(k.insetPlan(body, 3), 40, P), { tone: "faint" }))
      const fx = body.x + body.w
      out.push(onFront(fx, `<path class="as-crt" d="${rr(-(c.y + 12), -36, -(c.y - 12), -18, 3)}"/>` + line("mid", rr(-(c.y + 12), -36, -(c.y - 12), -18, 3))
        + `<path class="as-phosphor" d="${[0, 1, 2].map((i) => `M${-(c.y + 8)} ${-(32 - i * 4)}H${-(c.y + 8) + [14, 10, 16][i]}`).join("")}"/>`
        + `<rect class="as-led as-cursor" data-caller="${ci}" x="${-(c.y + 8) + 1}" y="-23.4" width="2.4" height="3.2"/>`))
      const kb = { x: fx + 2, y: plan.y + 3, w: 10, d: plan.d - 6, r: 1.5 }
      out.push(box(kb, 6, 2.4, { tone: "mid" }, 3, 0.3))
      out.push(D(k.dotGrid(kb.x + 2, kb.y + 2.5, 3, 9, 3.2, 5, P).map((p) => p), { size: 0.5, tone: "mid" }))
      out.push(`</g>`)
    } else {
      // a tape reader: two reels and a read head on a deck
      const deck = { x: plan.x, y: plan.y, w: plan.w, d: plan.d, r: 3 }
      out.push(S(k.slabOf(deck, 6, 16, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(deck, 8, P, 4), { tone: "faint" }) }))
      out.push(L(k.planOutline(k.insetPlan(deck, 3), 22, P), { tone: "faint" }))
      const reels = [[c.x - 5, c.y + 8], [c.x - 5, c.y - 8]]
      for (const [x, y] of byDepth(reels)) {
        out.push(mat("steel", S(k.cylinder(x, y, 7.4, 22, 1.2, P, 40), { tone: "mid" })))
        out.push(mat("copper", S(k.cylinder(x, y, 5.2, 23.2, 3.4, P, 36), { tone: "hi" }) + L(k.ring(x, y, 3.2, 26.6, P, 24), { tone: "lo" })))
        out.push(mat("steel", S(k.cylinder(x, y, 7.4, 26.6, 1.2, P, 40), { tone: "mid" }) + L(k.ring(x, y, 1.4, 27.8, P, 12), { tone: "mid" })))
      }
      out.push(box({ x: c.x + 6, y: c.y - 3.5, w: 6, d: 7, r: 1 }, 22, 6, { tone: "mid" }, 3, 0.4))
      out.push(L(k.lineOnTop([c.x + 2, c.y + 8], [c.x + 6, c.y + 3.5], 24.4, P) + k.lineOnTop([c.x + 6, c.y - 3.5], [c.x + 2, c.y - 8], 24.4, P), { tone: "lo" }))
      out.push(onFront(plan.x + plan.w, line("lo", rr(-(c.y + 13), -19, -(c.y - 13), -10, 1.5)) + `<circle class="as-led" data-caller="${ci}" cx="${-(c.y - 9)}" cy="-14.5" r="1.1"/>`))
    }
    put([c.x, c.y, 0], out.join(""))
  })

  // ── laptop: base, keys, hinges, lid (precomputed for every opening angle) ──
  const lidFrame = (deg) => {
    const f = (deg * Math.PI) / 180
    const d = [Math.cos(f), 0, Math.sin(f)]
    const n = [Math.sin(f), 0, -Math.cos(f)]
    const o = [HINGE_X, LAP.y + LAP.d / 2, LAP_H + 0.4]
    const F = G.frameOf(o, n, d, [0, 1, 0])
    const poly = k.roundedPlan({ x: 0, y: -LID_W / 2, w: LID_L, d: LID_W, r: 3 }, 4)
    const paths = G.prismOf(F, poly, -LID_T, 0, P)
    const top = [o[0] + d[0] * LID_L, o[1] + LID_W / 2, o[2] + d[2] * LID_L]
    return { svg: S(paths, { tone: "mid" }), screen: planeMatrix(top, [0, -1, 0], [-d[0], 0, -d[2]]) }
  }
  const lids = Array.from({ length: LID_STEPS + 1 }, (_, i) => lidFrame((LID_OPEN * i) / LID_STEPS))
  {
    const out = [halo(LAP, 0, 3, 5)]
    out.push(S(k.slabOf(LAP, 0, LAP_H, P, 5, 0.6), { tone: "mid", inner: L(k.sideSeam(LAP, 1.6, P, 5), { tone: "faint" }) }))
    const well = { x: LAP.x + 9, y: LAP.y + 7, w: 30, d: LAP.d - 14, r: 2 }
    out.push(L(k.planOutline(well, LAP_H, P), { tone: "lo" }))
    const pad = { x: LAP.x + 45, y: LAP.y + LAP.d / 2 - 14, w: 13, d: 28, r: 2 }
    out.push(L(k.planOutline(pad, LAP_H, P), { tone: "lo" }))
    // keys: 4 rows of 12 low caps in the well
    const kw = (well.d - 4) / 12
    const keys = []
    for (let row = 0; row < 4; row++) for (let col = 0; col < 12; col++) keys.push([well.x + 4.3 + row * 7, well.y + 2 + col * kw + kw / 2])
    for (const [cx, cy] of byDepth(keys)) out.push(box({ x: cx - 2.7, y: cy - kw / 2 + 0.4, w: 5.4, d: kw - 0.8, r: 0.6 }, LAP_H, 0.9, { tone: "mid", crease: "none" }, 2, 0))
    for (const y of [LAP.y + 12, LAP.y + LAP.d - 12]) out.push(S(G.disc(-7, 7, 2.2, G.frameAlong([HINGE_X, y, LAP_H + 0.4], [0, 1, 0]), P), { tone: "mid" }))
    const open = lids[LID_STEPS]
    out.push(`<g data-part="lid">${open.svg}</g><g data-part="screen" transform="${open.screen}">${laptopScreen()}</g>`)
    put([LAP.x + LAP.w / 2, LAP.y + LAP.d / 2, 0], mat("steel", out.join("")), -20)
  }

  // ── app on a stand ───────────────────────────────────────────────────
  {
    const out = []
    const base = { x: APP.x, y: APP.y, w: APP.w, d: APP.d, r: 4 }
    out.push(halo(base, 0, 3, 5))
    out.push(box(base, 0, 3.4, { tone: "lo" }, 4, 0.5))
    out.push(L(k.planOutline(k.insetPlan(base, 3), 3.4, P), { tone: "faint" }))
    const neck = { x: APP.x + 6, y: APP.y + APP.d / 2 - 5, w: 6, d: 10, r: 1.5 }
    out.push(box(neck, 3.4, PANEL_Z - 3.4, { tone: "mid" }, 3, 0.4))
    out.push(L(k.sideSeam(neck, 12, P, 3), { tone: "faint" }))
    out.push(box(PANEL, PANEL_Z, PANEL_H, { tone: "mid" }, 3, 0.6))
    const fx = PANEL.x + PANEL.w
    out.push(onFront(fx, appScreen(PANEL.y + 3, PANEL.y + PANEL.d - 3, PANEL_Z + 3, PANEL_Z + PANEL_H - 3)))
    put([APP.x + 10, APP.y + APP.d / 2, 0], mat("steel", out.join("")))
  }

  // plugs go after their cords' first chunks
  put([PLUGS[0].x, PLUGS[0].y, 0], `<g data-part="plug-0">${plug(PLUGS[0], true, 0)}</g>`, 30)
  put([PLUGS[1].x, PLUGS[1].y, 0], `<g data-part="plug-1">${plug(PLUGS[1], false, 1)}</g>`, 30)

  items.sort((a, b) => a.key - b.key)
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: "A small switchboard on a bench plate. On the left, three caller units stand for AI agents: a server rack, a terminal and a tape reader. Their cords run into the switchboard, which is the relay. A patch cord plugged into a socket on the switchboard's shelf runs to a laptop, and a second cord in the next socket runs to an app on a stand: each cord is one link.",
    body: [plate, ...items.map((it) => it.svg), `<g data-part="beads"></g>`],
  })
  // Bead paths: each route resampled every 2 units and projected, with a
  // mask of the points the laptop lid hides (for the lid open and shut).
  const lidHull = (deg) => {
    const f = (deg * Math.PI) / 180
    const d = [Math.cos(f), 0, Math.sin(f)]
    const o = [HINGE_X, LAP.y + LAP.d / 2, LAP_H + 0.4]
    const corners = []
    for (const u of [0, LID_L]) for (const v of [-LID_W / 2, LID_W / 2]) corners.push([o[0] + d[0] * u, o[1] + v, o[2] + d[2] * u])
    return { poly: G.hullOf(corners.map(at)), depth: Math.min(...corners.map(depth)) }
  }
  const inside = ([x, y], poly) => {
    let hit = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }
  const covers = [lidHull(LID_OPEN), lidHull(0)]
  const sample = (route) => {
    const pts = G.resample(route, 2)
    return {
      xy: pts.flatMap((p) => at(p).map((v) => +v.toFixed(1))),
      hidden: covers.map((c) => pts.map((p) => (depth(p) < c.depth && inside(at(p), c.poly) ? 1 : 0)).join("")),
    }
  }
  const hull = (points) => k.pathOf(G.hullOf(points.map(at)), true)
  const cylHull = (x, y, r, z0, z1) => hull([...k.circleRing(x, y, r, 16).map(([a, b]) => [a, b, z0]), ...k.circleRing(x, y, r, 16).map(([a, b]) => [a, b, z1])])
  return {
    svg,
    paths: Object.fromEntries(Object.entries(routes).map(([name, route]) => [name, sample(route)])),
    lids: lids.map((l) => ({ svg: l.svg, screen: l.screen })),
    pull: fmt(at([0, 0, 0])[1] - at([0, 0, PULL])[1]),          // screen px a pulled plug rises
    hits: {
      plug0: cylHull(PLUGS[0].x, PLUGS[0].y, 7, JACK_TOP - 2, PLUG_TOP + PULL),
      plug1: cylHull(PLUGS[1].x, PLUGS[1].y, 7, JACK_TOP - 2, PLUG_TOP + PULL),
      laptop: hull([...k.boxCorners(LAP, 0, LAP_H), [HINGE_X - 15, LAP.y, 62], [HINGE_X - 15, LAP.y + LAP.d, 62]]),
    },
  }

  function laptopScreen() {
    // a tiny browser, in screen-plane units: LID_W wide, LID_L tall
    const W = LID_W, H = LID_L, m = 3.4
    const x0 = m, x1 = W - m, y0 = m, y1 = H - m
    const parts = []
    parts.push(`<path class="as-glass" d="${rr(x0, y0, x1, y1, 1.6)}"/>`)
    // tab strip and address bar
    parts.push(`<path class="as-chrome" d="${rr(x0, y0, x1, y0 + 8.4, 1.6)}"/>`)
    parts.push(line("faint", `M${x0} ${y0 + 8.4}H${x1}`))
    parts.push(`<path class="as-tab" d="${rr(x0 + 8, y0 + 2, x0 + 30, y0 + 8.4, 1.2)}"/>`)
    parts.push(`<circle class="as-dot" cx="${x0 + 2.6}" cy="${y0 + 4.2}" r=".9"/><circle class="as-dot" cx="${x0 + 5.2}" cy="${y0 + 4.2}" r=".9"/>`)
    parts.push(`<path class="as-field" d="${rr(x0 + 3, y0 + 10, x1 - 12, y0 + 14.6, 2.3)}"/>`)
    parts.push(`<path class="as-ext" data-part="ext" d="${rr(x1 - 9, y0 + 10, x1 - 4.4, y0 + 14.6, 1)}"/>`)
    // page: a sidebar and a table of rows
    parts.push(line("faint", `M${x0 + 20} ${y0 + 16.6}V${y1}`))
    for (let i = 0; i < 5; i++) parts.push(line("lo", `M${x0 + 4} ${y0 + 21 + i * 4.4}H${x0 + 4 + [12, 9, 13, 10, 8][i]}`, ` data-free="both"`))
    parts.push(line("mid", `M${x0 + 24} ${y0 + 21}H${x0 + 44}`, ` data-free="both"`))
    for (let i = 0; i < 4; i++) {
      const y = y0 + 27 + i * 5
      parts.push(line("faint", `M${x0 + 24} ${y + 2.6}H${x1 - 3}`))
      parts.push(line("lo", `M${x0 + 24} ${y}H${x0 + 34}M${x0 + 40} ${y}H${x0 + 52}`, ` data-free="both"`))
      parts.push(`<path class="as-row-hit" data-part="row-${i}" d="${rr(x0 + 22.6, y - 2.2, x1 - 2.4, y + 2.2, 1)}"/>`)
    }
    // the bar the extension puts on the connected tab
    parts.push(`<g data-part="pill"><path class="as-pill" d="${rr(x0 + 3, y1 - 7.4, x0 + 40, y1 - 2.4, 2.5)}"/><circle class="as-pill-dot" cx="${x0 + 6}" cy="${y1 - 4.9}" r="1"/>`
      + `<path class="as-pill-text" d="M${x0 + 8.6} ${y1 - 4.9}H${x0 + 30}"/><path class="as-pill-btn" d="${rr(x0 + 32, y1 - 6.6, x0 + 39, y1 - 3.2, 1.7)}"/></g>`)
    // camera dot in the bezel
    parts.push(`<circle class="as-dot" cx="${W / 2}" cy="${m / 2}" r=".6"/>`)
    return `<g data-part="screen-on">${parts.join("")}</g>`
  }

  function appScreen(ya, yb, za, zb) {
    // an app: three columns of cards, in the front plane (x right = −y, y down = −z)
    const x0 = -yb, x1 = -ya, y0 = -zb, y1 = -za
    const parts = [`<path class="as-glass" d="${rr(x0, y0, x1, y1, 1.4)}"/>`, line("lo", rr(x0, y0, x1, y1, 1.4))]
    parts.push(line("faint", `M${x0} ${y0 + 5}H${x1}`))
    parts.push(line("lo", `M${x0 + 3} ${y0 + 2.6}H${x0 + 14}`, ` data-free="both"`))
    const cols = 3, cw = (x1 - x0 - 4) / cols
    for (let c = 0; c < cols; c++) {
      const cx = x0 + 2 + c * cw
      parts.push(line("lo", `M${cx + 1.4} ${y0 + 8.4}H${cx + cw - 6}`, ` data-free="both"`))
      for (let r = 0; r < [3, 2, 2][c]; r++) parts.push(`<path class="as-card" data-part="card-${c}-${r}" d="${rr(cx + 1, y0 + 11 + r * 7.4, cx + cw - 1, y0 + 17 + r * 7.4, 1)}"/>`)
    }
    return parts.join("")
  }
}
