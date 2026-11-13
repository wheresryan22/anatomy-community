/**
 * Static geometry for the fuel pump and car figure. Pure functions: every
 * part that never moves is built once as SVG path strings and painted back
 * to front by build.mjs. Only the tank level, pump display, fuel flow, tail
 * lights and exhaust change per frame (see the inline script in build.mjs).
 *
 * World units: x and y on the floor, z up. Isometric camera at azimuth 45°
 * and elevation 30°, so the visible sides are the +x face (screen right) and
 * the +y face (screen left). Solid parts in paper tones, one lit accent (the
 * fuel, orange), lines that end on a face, no leader lines or labels.
 */
const C = Math.cos(Math.PI / 6);
const S = 0.5;
/** Project a world point to screen space. */
export function pt([x, y, z]) {
    return [(x - y) * C, (x + y) * S - z];
}
const r2 = (n) => Math.round(n * 100) / 100;
function pathOf(points, close = true) {
    return (points
        .map(([x, y], i) => `${i === 0 ? "M" : "L"}${r2(x)} ${r2(y)}`)
        .join("") + (close ? "Z" : ""));
}
/** Closed polygon through world points. */
export function poly(points) {
    return pathOf(points.map(pt));
}
/** Open polyline through world points. */
export function line(points) {
    return pathOf(points.map(pt), false);
}
/** A solid box: its +y face, +x face and top, in paint order. */
export function box(b, tones = {}, stroke = "mid") {
    const { x, y, z, w, d, h } = b;
    const X = x + w;
    const Y = y + d;
    const Z = z + h;
    return [
        {
            d: poly([
                [x, Y, z],
                [X, Y, z],
                [X, Y, Z],
                [x, Y, Z],
            ]),
            fill: tones.side ?? "side",
            stroke,
        },
        {
            d: poly([
                [X, y, z],
                [X, Y, z],
                [X, Y, Z],
                [X, y, Z],
            ]),
            fill: tones.shade ?? "shade",
            stroke,
        },
        {
            d: poly([
                [x, y, Z],
                [X, y, Z],
                [X, Y, Z],
                [x, Y, Z],
            ]),
            fill: tones.top ?? "top",
            stroke,
        },
    ];
}
/** Inset outline on a box top: the bevel / groove line. */
export function topInset(b, inset) {
    const Z = b.z + b.h;
    return poly([
        [b.x + inset, b.y + inset, Z],
        [b.x + b.w - inset, b.y + inset, Z],
        [b.x + b.w - inset, b.y + b.d - inset, Z],
        [b.x + inset, b.y + b.d - inset, Z],
    ]);
}
/** Points of a circle in the plane normal to `axis`. */
function ring(center, axis, r, n = 40) {
    const [cx, cy, cz] = center;
    const out = [];
    for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        const a = Math.cos(t) * r;
        const b = Math.sin(t) * r;
        if (axis === "x")
            out.push([cx, cy + a, cz + b]);
        else if (axis === "y")
            out.push([cx + a, cy, cz + b]);
        else
            out.push([cx + a, cy + b, cz]);
    }
    return out;
}
/** Flat disc (ellipse on screen) lying in the plane normal to `axis`. */
export function disc(center, axis, r) {
    return poly(ring(center, axis, r));
}
function hull(points) {
    const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const q of p) {
        while (lower.length >= 2 &&
            cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0)
            lower.pop();
        lower.push(q);
    }
    const upper = [];
    for (let i = p.length - 1; i >= 0; i--) {
        const q = p[i];
        while (upper.length >= 2 &&
            cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0)
            upper.pop();
        upper.push(q);
    }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
/**
 * A solid cylinder from `start` along +axis for `length`: the side silhouette
 * then the visible end cap (the +axis end faces the camera).
 */
export function cylinder(start, axis, r, length, tones = {}, stroke = "mid") {
    const end = [
        start[0] + (axis === "x" ? length : 0),
        start[1] + (axis === "y" ? length : 0),
        start[2] + (axis === "z" ? length : 0),
    ];
    const a = ring(start, axis, r).map(pt);
    const b = ring(end, axis, r).map(pt);
    return {
        body: {
            d: pathOf(hull([...a, ...b])),
            fill: tones.body ?? "shade",
            stroke,
        },
        cap: { d: pathOf(b), fill: tones.cap ?? "side", stroke },
        capCenter: end,
    };
}
/** Sample a cubic Bézier in world space. */
export function bezier(p0, p1, p2, p3, n = 32) {
    const out = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        const k0 = u * u * u;
        const k1 = 3 * u * u * t;
        const k2 = 3 * u * t * t;
        const k3 = t * t * t;
        out.push([
            k0 * p0[0] + k1 * p1[0] + k2 * p2[0] + k3 * p3[0],
            k0 * p0[1] + k1 * p1[1] + k2 * p2[1] + k3 * p3[1],
            k0 * p0[2] + k1 * p1[2] + k2 * p2[2] + k3 * p3[2],
        ]);
    }
    return out;
}
// ---------------------------------------------------------------------------
// The scene
// ---------------------------------------------------------------------------
/** Plinth everything stands on. */
const BASE = { x: -14, y: -22, z: -12, w: 278, d: 156, h: 12 };
/** Car body (lower shell). Front points to -x, the rear faces the camera. */
const BODY = { x: 18, y: 40, z: 9, w: 142, d: 60, h: 24 };
const BODY_TOP = BODY.z + BODY.h; // 33
const REAR_X = BODY.x + BODY.w; // 160
const SIDE_Y = BODY.y + BODY.d; // 100
/** Fuel tank cut-away window on the car's near side, clear of the wheel arches. */
export const TANK = { x0: 60, x1: 98, z0: 12.5, z1: 25, y: SIDE_Y + 0.05 };
/** Fuel cap on the near side, just behind the tank window. */
export const FUEL_CAP = [152, SIDE_Y + 0.05, 25];
/** Pump on its island, behind and to the right of the car. */
const ISLAND = { x: 176, y: -10, z: 0, w: 70, d: 58, h: 5 };
const PUMP = { x: 190, y: 2, z: 5, w: 42, d: 34, h: 78 };
const CANOPY = { x: 186, y: -2, z: 83, w: 50, d: 42, h: 8 };
const PUMP_FACE_Y = PUMP.y + PUMP.d; // 36
/** Pump display window on the +y face. */
export const DISPLAY = {
    x0: 196,
    x1: 226,
    z0: 58,
    z1: 74,
    y: PUMP_FACE_Y + 0.05,
};
/** Hose from the pump to the nozzle in the fuel cap. */
const HOSE_START = [204, PUMP_FACE_Y + 1, 36];
const HOSE_END = [158.5, SIDE_Y + 5.5, 27.5];
export const HOSE = bezier(HOSE_START, [198, 78, -4], [182, 128, 4], HOSE_END, 48);
/** Exhaust tip on the rear face. */
export const EXHAUST_TIP = [REAR_X + 7, 52, 10.5];
/** Tail lights on the rear face (the lit accent when the car runs). */
export const TAIL_LIGHTS = [
    { y0: 43, y1: 55, z0: 25.5, z1: 30.5 },
    { y0: 85, y1: 97, z0: 25.5, z1: 30.5 },
].map((l) => poly([
    [REAR_X + 0.05, l.y0, l.z0],
    [REAR_X + 0.05, l.y1, l.z0],
    [REAR_X + 0.05, l.y1, l.z1],
    [REAR_X + 0.05, l.y0, l.z1],
]));
/** Tank window polygon for a fill level 0..1 (the orange liquid). */
export function tankFill(level) {
    const top = TANK.z0 + 0.6 + (TANK.z1 - TANK.z0 - 1.2) * Math.max(0, Math.min(1, level));
    return poly([
        [TANK.x0 + 0.6, TANK.y, TANK.z0 + 0.6],
        [TANK.x1 - 0.6, TANK.y, TANK.z0 + 0.6],
        [TANK.x1 - 0.6, TANK.y, top],
        [TANK.x0 + 0.6, TANK.y, top],
    ]);
}
/** Liquid surface line for a fill level 0..1. */
export function tankSurface(level) {
    const top = TANK.z0 + 0.6 + (TANK.z1 - TANK.z0 - 1.2) * Math.max(0, Math.min(1, level));
    return line([
        [TANK.x0 + 0.6, TANK.y, top],
        [TANK.x1 - 0.6, TANK.y, top],
    ]);
}
/** Pump display bar for a dispensed fraction 0..1. */
export function displayBar(frac) {
    const x0 = DISPLAY.x0 + 3;
    const x1 = x0 + (DISPLAY.x1 - DISPLAY.x0 - 6) * Math.max(0, Math.min(1, frac));
    return poly([
        [x0, DISPLAY.y + 0.05, 62],
        [x1, DISPLAY.y + 0.05, 62],
        [x1, DISPLAY.y + 0.05, 65.5],
        [x0, DISPLAY.y + 0.05, 65.5],
    ]);
}
/** Screen position of a world point, for the exhaust puffs. */
export const exhaustScreen = pt(EXHAUST_TIP);
function buildBase() {
    const shapes = [];
    const lines = [];
    const dots = [];
    // Feet under the four corners.
    for (const [fx, fy] of [
        [BASE.x + 6, BASE.y + 6],
        [BASE.x + BASE.w - 20, BASE.y + 6],
        [BASE.x + 6, BASE.y + BASE.d - 20],
        [BASE.x + BASE.w - 20, BASE.y + BASE.d - 20],
    ]) {
        shapes.push(...box({ x: fx, y: fy, z: BASE.z - 4, w: 14, d: 14, h: 4 }, { side: "deep", shade: "deep" }, "lo"));
    }
    shapes.push(...box(BASE, {}, "mid"));
    // Bevel and groove on the plinth top.
    lines.push({ d: topInset(BASE, 1.2), fill: "none", stroke: "faint" });
    lines.push({ d: topInset(BASE, 5), fill: "none", stroke: "lo" });
    // Ruler strip along the near (+y) edge of the top.
    const ry = BASE.y + BASE.d - 5;
    for (let i = 0, x = BASE.x + 12; x <= BASE.x + BASE.w - 12; i++, x += 4.5) {
        const major = i % 5 === 0;
        lines.push({
            d: line([
                [x, ry, 0],
                [x, ry - (major ? 4.2 : 2.2), 0],
            ]),
            fill: "none",
            stroke: i === 0 ? "hi" : major ? "mid" : "lo",
        });
    }
    // Corner screws: dot plus ring.
    for (const [sx, sy] of [
        [BASE.x + 9, BASE.y + 9],
        [BASE.x + BASE.w - 9, BASE.y + 9],
        [BASE.x + 9, BASE.y + BASE.d - 13],
        [BASE.x + BASE.w - 9, BASE.y + BASE.d - 13],
    ]) {
        lines.push({
            d: disc([sx, sy, 0], "z", 2.2),
            fill: "recess",
            stroke: "lo",
        });
        const [px, py] = pt([sx, sy, 0]);
        dots.push([px, py, 0.55]);
    }
    // Label plate on the plinth's near face, with three rule lines.
    const ly = BASE.y + BASE.d + 0.05;
    const lx0 = 4;
    const lx1 = 58;
    shapes.push({
        d: poly([
            [lx0, ly, -10],
            [lx1, ly, -10],
            [lx1, ly, -2],
            [lx0, ly, -2],
        ]),
        fill: "top",
        stroke: "mid",
    });
    for (const z of [-4, -6, -8]) {
        lines.push({
            d: line([
                [lx0 + 4, ly, z],
                [lx1 - (z === -8 ? 22 : 4), ly, z],
            ]),
            fill: "none",
            stroke: "lo",
            free: true, // rule lines standing for printed text
        });
    }
    for (const lx of [lx0 + 1.6, lx1 - 1.6]) {
        const [px, py] = pt([lx, ly, -6]);
        dots.push([px, py, 0.45]);
    }
    // Seam where the plinth's two visible faces meet is drawn by the box edges;
    // a second seam a third of the way up reads as a laminated slab.
    lines.push({
        d: line([
            [BASE.x, BASE.y + BASE.d, -8],
            [BASE.x + BASE.w, BASE.y + BASE.d, -8],
            [BASE.x + BASE.w, BASE.y, -8],
        ]),
        fill: "none",
        stroke: "faint",
    });
    return { shapes, lines, dots };
}
function buildPump() {
    const shapes = [];
    const lines = [];
    const dots = [];
    shapes.push(...box(ISLAND, {}, "mid"));
    lines.push({ d: topInset(ISLAND, 3), fill: "none", stroke: "faint" });
    // Plinth for the pump body.
    shapes.push(...box({
        x: PUMP.x - 3,
        y: PUMP.y - 3,
        z: ISLAND.h,
        w: PUMP.w + 6,
        d: PUMP.d + 6,
        h: 4,
    }, {}, "mid"));
    shapes.push(...box({ ...PUMP, z: ISLAND.h + 4, h: PUMP.h - 4 }, {}, "mid"));
    // Panel seam lines on the +y face and the +x face.
    const fy = PUMP_FACE_Y + 0.05;
    const fx = PUMP.x + PUMP.w + 0.05;
    lines.push({
        d: line([
            [PUMP.x, fy, 50],
            [PUMP.x + PUMP.w, fy, 50],
        ]),
        fill: "none",
        stroke: "lo",
    });
    lines.push({
        d: line([
            [fx, PUMP.y, 50],
            [fx, PUMP.y + PUMP.d, 50],
        ]),
        fill: "none",
        stroke: "lo",
    });
    // Ventilation slots low on the +x face.
    for (let z = 16; z <= 30; z += 3.5) {
        lines.push({
            d: line([
                [fx, PUMP.y + 5, z],
                [fx, PUMP.y + PUMP.d - 5, z],
            ]),
            fill: "none",
            stroke: "faint",
        });
    }
    // Access door on the +x face with hinge dots.
    lines.push({
        d: poly([
            [fx, PUMP.y + 5, 12],
            [fx, PUMP.y + PUMP.d - 5, 12],
            [fx, PUMP.y + PUMP.d - 5, 46],
            [fx, PUMP.y + 5, 46],
        ]),
        fill: "none",
        stroke: "lo",
    });
    for (const z of [16, 42]) {
        const [px, py] = pt([fx, PUMP.y + 6.8, z]);
        dots.push([px, py, 0.5]);
    }
    // Display window (recessed) and its bezel.
    shapes.push({
        d: poly([
            [DISPLAY.x0 - 1.5, fy, DISPLAY.z0 - 1.5],
            [DISPLAY.x1 + 1.5, fy, DISPLAY.z0 - 1.5],
            [DISPLAY.x1 + 1.5, fy, DISPLAY.z1 + 1.5],
            [DISPLAY.x0 - 1.5, fy, DISPLAY.z1 + 1.5],
        ]),
        fill: "top",
        stroke: "mid",
    });
    shapes.push({
        d: poly([
            [DISPLAY.x0, DISPLAY.y + 0.02, DISPLAY.z0],
            [DISPLAY.x1, DISPLAY.y + 0.02, DISPLAY.z0],
            [DISPLAY.x1, DISPLAY.y + 0.02, DISPLAY.z1],
            [DISPLAY.x0, DISPLAY.y + 0.02, DISPLAY.z1],
        ]),
        fill: "recess",
        stroke: "hi",
    });
    // Bar track behind the live bar.
    lines.push({
        d: poly([
            [DISPLAY.x0 + 3, DISPLAY.y + 0.04, 62],
            [DISPLAY.x1 - 3, DISPLAY.y + 0.04, 62],
            [DISPLAY.x1 - 3, DISPLAY.y + 0.04, 65.5],
            [DISPLAY.x0 + 3, DISPLAY.y + 0.04, 65.5],
        ]),
        fill: "none",
        stroke: "faint",
    });
    // Small digit cells under the bar.
    for (let i = 0; i < 6; i++) {
        const x0 = DISPLAY.x0 + 3 + i * 4.2;
        lines.push({
            d: poly([
                [x0, DISPLAY.y + 0.04, 67.5],
                [x0 + 3, DISPLAY.y + 0.04, 67.5],
                [x0 + 3, DISPLAY.y + 0.04, 71.5],
                [x0, DISPLAY.y + 0.04, 71.5],
            ]),
            fill: "none",
            stroke: "lo",
        });
    }
    // Keypad: 3 x 3 buttons under the display.
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const x0 = 206 + c * 4.6;
            const z0 = 52 - r * 4;
            shapes.push({
                d: poly([
                    [x0, fy, z0],
                    [x0 + 3.2, fy, z0],
                    [x0 + 3.2, fy, z0 + 2.6],
                    [x0, fy, z0 + 2.6],
                ]),
                fill: "top",
                stroke: "lo",
                w: 0.8,
            });
        }
    }
    // Hose collar where the hose leaves the pump.
    const collar = cylinder([HOSE_START[0], PUMP_FACE_Y, HOSE_START[2]], "y", 3.4, 2.4, {}, "mid");
    shapes.push(collar.body, collar.cap);
    // Empty holster (the nozzle is in the car).
    shapes.push(...box({ x: 218, y: PUMP_FACE_Y, z: 26, w: 8, d: 3.5, h: 14 }, {}, "mid"));
    lines.push({
        d: poly([
            [219.6, PUMP_FACE_Y + 3.55, 29],
            [224.4, PUMP_FACE_Y + 3.55, 29],
            [224.4, PUMP_FACE_Y + 3.55, 37],
            [219.6, PUMP_FACE_Y + 3.55, 37],
        ]),
        fill: "recess",
        stroke: "lo",
    });
    // Canopy cap with a lip and a top groove.
    shapes.push(...box(CANOPY, {}, "mid"));
    lines.push({ d: topInset(CANOPY, 3), fill: "none", stroke: "lo" });
    lines.push({
        d: line([
            [CANOPY.x, CANOPY.y + CANOPY.d + 0.05, CANOPY.z + 2.5],
            [CANOPY.x + CANOPY.w, CANOPY.y + CANOPY.d + 0.05, CANOPY.z + 2.5],
        ]),
        fill: "none",
        stroke: "faint",
    });
    lines.push({
        d: line([
            [CANOPY.x + CANOPY.w + 0.05, CANOPY.y, CANOPY.z + 2.5],
            [CANOPY.x + CANOPY.w + 0.05, CANOPY.y + CANOPY.d, CANOPY.z + 2.5],
        ]),
        fill: "none",
        stroke: "faint",
    });
    // Canopy screws.
    for (const [sx, sy] of [
        [CANOPY.x + 5, CANOPY.y + 5],
        [CANOPY.x + CANOPY.w - 5, CANOPY.y + 5],
        [CANOPY.x + 5, CANOPY.y + CANOPY.d - 5],
        [CANOPY.x + CANOPY.w - 5, CANOPY.y + CANOPY.d - 5],
    ]) {
        const [px, py] = pt([sx, sy, CANOPY.z + CANOPY.h]);
        dots.push([px, py, 0.5]);
    }
    return { shapes, lines, dots };
}
function wheel(cx, yFace, near) {
    const r = 11;
    const t = 7;
    const y0 = near ? yFace - t + 3 : yFace - 3;
    const tire = cylinder([cx, y0, r], "y", r, t, { body: "rubber", cap: "rubber" }, "hi");
    const c = tire.capCenter;
    const out = [tire.body, tire.cap];
    out.push({ d: disc(c, "y", r * 0.62), fill: "metal", stroke: "mid" });
    out.push({
        d: disc([c[0], c[1] + 0.05, c[2]], "y", r * 0.22),
        fill: "top",
        stroke: "mid",
    });
    // Five spokes from hub to rim.
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        out.push({
            d: line([
                [
                    c[0] + Math.cos(a) * r * 0.24,
                    c[1] + 0.06,
                    c[2] + Math.sin(a) * r * 0.24,
                ],
                [
                    c[0] + Math.cos(a) * r * 0.6,
                    c[1] + 0.06,
                    c[2] + Math.sin(a) * r * 0.6,
                ],
            ]),
            fill: "none",
            stroke: "mid",
        });
    }
    return out;
}
function buildCar() {
    const back = [];
    const shapes = [];
    const front = [];
    const lines = [];
    const dots = [];
    // Soft contact shadow under the car.
    back.push({
        d: poly([
            [BODY.x - 2, BODY.y - 2, 0.05],
            [REAR_X + 4, BODY.y - 2, 0.05],
            [REAR_X + 4, SIDE_Y + 6, 0.05],
            [BODY.x - 2, SIDE_Y + 6, 0.05],
        ]),
        fill: "recess",
    });
    // Far-side wheels first.
    back.push(...wheel(46, BODY.y, false), ...wheel(134, BODY.y, false));
    // Lower body.
    shapes.push(...box(BODY, {}, "hi"));
    // Wheel arches on the near side (recess behind the near wheels).
    for (const cx of [46, 134]) {
        const pts = [];
        for (let i = 0; i <= 20; i++) {
            const a = Math.PI * (i / 20);
            pts.push([
                cx + Math.cos(a) * 14,
                SIDE_Y + 0.05,
                Math.max(BODY.z, 11 + Math.sin(a) * 14),
            ]);
        }
        shapes.push({ d: poly(pts), fill: "deep", stroke: "mid" });
    }
    // Cabin: a prism with a sloped windscreen (hidden, -x) and a sloped rear
    // window (visible, +x).
    const cy0 = BODY.y + 5;
    const cy1 = SIDE_Y - 5;
    const zb = BODY_TOP;
    const zt = BODY_TOP + 22;
    const xbF = 46;
    const xtF = 62;
    const xtR = 118;
    const xbR = 134;
    // Near side (+y) trapezoid.
    shapes.push({
        d: poly([
            [xbF, cy1, zb],
            [xbR, cy1, zb],
            [xtR, cy1, zt],
            [xtF, cy1, zt],
        ]),
        fill: "side",
        stroke: "hi",
    });
    // Rear slope (+x).
    shapes.push({
        d: poly([
            [xbR, cy0, zb],
            [xbR, cy1, zb],
            [xtR, cy1, zt],
            [xtR, cy0, zt],
        ]),
        fill: "shade",
        stroke: "hi",
    });
    // Roof.
    shapes.push({
        d: poly([
            [xtF, cy0, zt],
            [xtR, cy0, zt],
            [xtR, cy1, zt],
            [xtF, cy1, zt],
        ]),
        fill: "top",
        stroke: "hi",
    });
    // Roof rails.
    for (const ry of [cy0 + 5, cy1 - 5]) {
        lines.push({
            d: line([
                [xtF + 6, ry, zt + 0.05],
                [xtR - 6, ry, zt + 0.05],
            ]),
            fill: "none",
            stroke: "mid",
        });
        for (const rx of [xtF + 6, xtR - 6]) {
            const [px, py] = pt([rx, ry, zt]);
            dots.push([px, py, 0.55]);
        }
    }
    // Side windows (two panes split by the B-pillar).
    const wz0 = zb + 3;
    const wz1 = zt - 3;
    const lerpX = (xb, xt, z) => xb + ((xt - xb) * (z - zb)) / (zt - zb);
    const sy = cy1 + 0.05;
    const pillar = 90;
    shapes.push({
        d: poly([
            [lerpX(xbF, xtF, wz0) + 3, sy, wz0],
            [pillar - 2, sy, wz0],
            [pillar - 2, sy, wz1],
            [lerpX(xbF, xtF, wz1) + 3, sy, wz1],
        ]),
        fill: "glass",
        stroke: "mid",
    });
    shapes.push({
        d: poly([
            [pillar + 2, sy, wz0],
            [lerpX(xbR, xtR, wz0) - 3, sy, wz0],
            [lerpX(xbR, xtR, wz1) - 3, sy, wz1],
            [pillar + 2, sy, wz1],
        ]),
        fill: "glass",
        stroke: "mid",
    });
    // Glass glints.
    lines.push({
        d: line([
            [lerpX(xbF, xtF, wz0) + 8, sy + 0.02, wz0 + 2],
            [lerpX(xbF, xtF, wz1) + 10, sy + 0.02, wz1 - 3],
        ]),
        fill: "none",
        stroke: "faint",
        w: 1.4,
        free: true, // glare highlight on the glass
    });
    // Rear window on the slope.
    const inset = 4;
    const rwz0 = zb + 3;
    const rwz1 = zt - 3;
    shapes.push({
        d: poly([
            [lerpX(xbR, xtR, rwz0) + 0.05, cy0 + inset, rwz0],
            [lerpX(xbR, xtR, rwz0) + 0.05, cy1 - inset, rwz0],
            [lerpX(xbR, xtR, rwz1) + 0.05, cy1 - inset, rwz1],
            [lerpX(xbR, xtR, rwz1) + 0.05, cy0 + inset, rwz1],
        ]),
        fill: "glass",
        stroke: "mid",
    });
    // Rear wiper.
    lines.push({
        d: line([
            [lerpX(xbR, xtR, rwz0 + 1) + 0.1, 70, rwz0 + 1],
            [lerpX(xbR, xtR, rwz0 + 7) + 0.1, 58, rwz0 + 7],
        ]),
        fill: "none",
        stroke: "hi",
    });
    {
        const [px, py] = pt([lerpX(xbR, xtR, rwz0 + 1) + 0.1, 70, rwz0 + 1]);
        dots.push([px, py, 0.6]);
        const [tx, ty] = pt([lerpX(xbR, xtR, rwz0 + 7) + 0.1, 58, rwz0 + 7]);
        dots.push([tx, ty, 0.45]);
    }
    // Shoulder line along the near side and around the rear.
    lines.push({
        d: line([
            [BODY.x, SIDE_Y + 0.05, 27],
            [REAR_X, SIDE_Y + 0.05, 27],
            [REAR_X + 0.05, SIDE_Y, 27],
            [REAR_X + 0.05, BODY.y, 27],
        ]),
        fill: "none",
        stroke: "lo",
    });
    // Door seams and handle on the near side.
    for (const x of [52, 100]) {
        lines.push({
            d: line([
                [x, SIDE_Y + 0.05, BODY.z + 3],
                [x, SIDE_Y + 0.05, BODY_TOP],
            ]),
            fill: "none",
            stroke: "mid",
        });
    }
    shapes.push({
        d: poly([
            [88, SIDE_Y + 0.05, 28.5],
            [96, SIDE_Y + 0.05, 28.5],
            [96, SIDE_Y + 0.05, 30.3],
            [88, SIDE_Y + 0.05, 30.3],
        ]),
        fill: "metal",
        stroke: "mid",
        w: 0.8,
    });
    // Side mirror on the near side, on the body top by the windscreen.
    shapes.push(...box({ x: 52, y: SIDE_Y - 1, z: BODY_TOP, w: 5, d: 5, h: 5 }, {}, "mid"));
    // Rocker sill.
    shapes.push(...box({ x: 60, y: SIDE_Y - 0.5, z: BODY.z, w: 60, d: 1.6, h: 2.6 }, { side: "deep" }, "mid"));
    // Tank cut-away window: recess, then ticks along its right edge. The live
    // fuel polygon is painted by FuelFigure between `shapes` and `lines`.
    shapes.push({
        d: poly([
            [TANK.x0 - 1.4, TANK.y, TANK.z0 - 1.4],
            [TANK.x1 + 1.4, TANK.y, TANK.z0 - 1.4],
            [TANK.x1 + 1.4, TANK.y, TANK.z1 + 1.4],
            [TANK.x0 - 1.4, TANK.y, TANK.z1 + 1.4],
        ]),
        fill: "top",
        stroke: "mid",
    });
    shapes.push({
        d: poly([
            [TANK.x0, TANK.y + 0.01, TANK.z0],
            [TANK.x1, TANK.y + 0.01, TANK.z0],
            [TANK.x1, TANK.y + 0.01, TANK.z1],
            [TANK.x0, TANK.y + 0.01, TANK.z1],
        ]),
        fill: "recess",
        stroke: "hi",
    });
    for (let i = 0; i <= 4; i++) {
        const z = TANK.z0 + 0.6 + ((TANK.z1 - TANK.z0 - 1.2) * i) / 4;
        lines.push({
            d: line([
                [TANK.x1 - 0.6, TANK.y + 0.03, z],
                [TANK.x1 - (i % 2 === 0 ? 4.5 : 2.5), TANK.y + 0.03, z],
            ]),
            fill: "none",
            stroke: i === 0 ? "hi" : "mid",
        });
    }
    for (const [x, z] of [
        [TANK.x0 - 0.2, TANK.z0 - 0.2],
        [TANK.x0 - 0.2, TANK.z1 + 0.2],
        [TANK.x1 + 0.2, TANK.z0 - 0.2],
        [TANK.x1 + 0.2, TANK.z1 + 0.2],
    ]) {
        const [px, py] = pt([x, TANK.y + 0.03, z]);
        dots.push([px, py, 0.45]);
    }
    // Fuel cap flap (open) and the filler ring.
    shapes.push({ d: disc(FUEL_CAP, "y", 3.6), fill: "deep", stroke: "hi" });
    shapes.push({
        d: disc([FUEL_CAP[0], FUEL_CAP[1] + 0.02, FUEL_CAP[2]], "y", 2.2),
        fill: "recess",
        stroke: "mid",
    });
    // Rear face details: bumper, plate, tail light bezels, exhaust.
    const rx = REAR_X + 0.05;
    shapes.push(...box({
        x: REAR_X - 2,
        y: BODY.y - 1.5,
        z: BODY.z - 0.5,
        w: 5,
        d: BODY.d + 3,
        h: 6,
    }, {}, "hi"));
    lines.push({
        d: line([
            [REAR_X + 3.05, BODY.y + 2, 11.5],
            [REAR_X + 3.05, SIDE_Y - 2, 11.5],
        ]),
        fill: "none",
        stroke: "lo",
    });
    // Number plate with its one engraved label (drawn as text in FuelFigure).
    shapes.push({
        d: poly([
            [rx, 60, 16],
            [rx, 80, 16],
            [rx, 80, 23],
            [rx, 60, 23],
        ]),
        fill: "top",
        stroke: "hi",
    });
    for (const y of [61.5, 78.5]) {
        const [px, py] = pt([rx, y, 19.5]);
        dots.push([px, py, 0.45]);
    }
    // Trunk seam.
    lines.push({
        d: poly([
            [rx, 44, 15],
            [rx, 96, 15],
            [rx, 96, 31.5],
            [rx, 44, 31.5],
        ]),
        fill: "none",
        stroke: "lo",
    });
    // Tail light bezels (the light itself is live).
    for (const [y0, y1] of [
        [42.2, 55.8],
        [84.2, 97.8],
    ]) {
        shapes.push({
            d: poly([
                [rx, y0, 24.7],
                [rx, y1, 24.7],
                [rx, y1, 31.3],
                [rx, y0, 31.3],
            ]),
            fill: "deep",
            stroke: "hi",
        });
    }
    // Exhaust pipe.
    const ex = cylinder([REAR_X, 52, 10.5], "x", 2.2, 7, { body: "metal", cap: "metal" }, "hi");
    front.push(ex.body, ex.cap, {
        d: disc([EXHAUST_TIP[0] + 0.05, 52, 10.5], "x", 1.2),
        fill: "rubber",
        stroke: "mid",
    });
    // Near-side wheels last.
    front.push(...wheel(46, SIDE_Y, true), ...wheel(134, SIDE_Y, true));
    // Antenna on the roof, ending in a terminal dot.
    lines.push({
        d: line([
            [xtR - 8, cy0 + 8, zt],
            [xtR - 4, cy0 + 8, zt + 12],
        ]),
        fill: "none",
        stroke: "hi",
    });
    {
        const [px, py] = pt([xtR - 4, cy0 + 8, zt + 12]);
        dots.push([px, py, 0.8]);
        const [mx, my] = pt([xtR - 8, cy0 + 8, zt]);
        dots.push([mx, my, 0.7]);
    }
    return { back, shapes, front, lines, dots };
}
/** Nozzle seated in the fuel cap, drawn after the hose. */
function buildNozzle() {
    const [x, y, z] = HOSE_END;
    const out = [];
    out.push(...box({ x: x - 7, y: y - 5.6, z: z - 3, w: 8, d: 5, h: 5 }, {}, "hi"));
    // Spout into the cap.
    out.push(...box({ x: FUEL_CAP[0] - 1, y: SIDE_Y, z: FUEL_CAP[2] - 1, w: 3, d: 1.6, h: 2 }, { side: "metal", shade: "metal", top: "metal" }, "mid"));
    // Trigger guard.
    out.push({
        d: line([
            [x - 5, y - 0.4, z - 3],
            [x - 4, y - 0.4, z - 7],
            [x + 0.5, y - 0.4, z - 7],
            [x + 0.5, y - 0.4, z - 3],
        ]),
        fill: "none",
        stroke: "hi",
    });
    return out;
}
const base = buildBase();
const pump = buildPump();
const car = buildCar();
const nozzle = buildNozzle();
export const SCENE = {
    base,
    pump,
    car,
    nozzle,
    hosePath: line(HOSE),
};
/** viewBox bounds from the plinth and pump canopy, padded. */
export const VIEWBOX = (() => {
    const pts = [
        [BASE.x, BASE.y, BASE.z - 4],
        [BASE.x + BASE.w, BASE.y, BASE.z - 4],
        [BASE.x, BASE.y + BASE.d, BASE.z - 4],
        [BASE.x + BASE.w, BASE.y + BASE.d, BASE.z - 4],
        [BASE.x, BASE.y, 0],
        [CANOPY.x, CANOPY.y, CANOPY.z + CANOPY.h],
        [CANOPY.x + CANOPY.w, CANOPY.y, CANOPY.z + CANOPY.h],
    ];
    const s = pts.map(pt);
    const xs = s.map((p) => p[0]);
    const ys = s.map((p) => p[1]);
    const pad = 8;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const maxX = Math.max(...xs) + pad;
    const maxY = Math.max(...ys) + pad + 4; // halo
    return { minX, minY, w: maxX - minX, h: maxY - minY };
})();
/** Soft halo under the plinth: the footprint diamond, blurred. */
export const HALO = poly([
    [BASE.x + 4, BASE.y + 4, BASE.z - 6],
    [BASE.x + BASE.w - 4, BASE.y + 4, BASE.z - 6],
    [BASE.x + BASE.w - 4, BASE.y + BASE.d - 4, BASE.z - 6],
    [BASE.x + 4, BASE.y + BASE.d - 4, BASE.z - 6],
]);
/** Number plate centre and the shear that maps text onto the rear face. */
export const PLATE = (() => {
    const [cx, cy] = pt([160.05, 70, 19.5]);
    return { cx, cy };
})();
