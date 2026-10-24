// Roadster loop rig model: C-shaped loop ramp, fan-adhesion climb, fast upside-down exit,
// then ONE continuous forward parabola — the barrel roll and attitude trim happen while the
// car is still flying that arc (never hovering), the main columns only soften the last part
// of the descent, and the car keeps forward momentum all the way to a rolling touchdown.
// Units: feet and seconds; g = 32.2 ft/s^2. One timeline, one truth.
//
// Geometry: the loop bulges LEFT (track x -32.2..0). The car enters from the right driving
// -x, climbs the left wall fast (52 ft/s), leaves the lip upside down travelling +x, and from
// there it is one ballistic-style arc: nose stays +x, altitude falls continuously, x keeps
// growing, so the whole manoeuvre reads as forward parabolic flight, not a vertical drop.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth01 = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export const RIG = {
  R: 32.2,             // loop radius (track centreline): lip at 2R = 64.4 ft
  trackHalf: 8,        // half track width
  chordOut: 4.5,       // lower truss chord sits this far outside the track radius
  startX: 42,          // car rest position on the runway (drives toward -x)
  entryX0: 1.5,        // run phase ends just short of the loop foot
  vExit: 52,           // speed over the wall top / at the lip, ft/s
  carLen: 14.6, carW: 6.8, wheelR: 1.85,
};
export const LIP = { x: 0, z: 2 * RIG.R };                  // top exit edge (64.4 ft)

// track point and tangent at loop angle phi (rad). phi 0 = foot, pi = lip (upside down).
export const trackPoint = (phi) => [-RIG.R * Math.sin(phi), RIG.R * (1 - Math.cos(phi))];
export const trackTangent = (phi) => [-Math.cos(phi), Math.sin(phi)];
export const phiOfAlt = (alt) => Math.acos(clamp(1 - alt / RIG.R, -1, 1));

// ---- timeline (figure seconds) ------------------------------------------------
export const TL = {
  ready: [0, 0.8],
  run: [0.8, 2.0],
  climb: [2.0, 4.2],
  coast: [4.2, 4.72],   // fast ballistic exit, rising to the apex — NO jets yet
  roll: [4.72, 5.35],   // barrel roll, still on the descending arc
  trim: [5.35, 5.95],   // attitude trim, still falling forward along the arc
  descend: [5.95, 7.0], // main columns soften the descent; forward speed is kept
  land: [7.0, 7.6],     // rolling touchdown, suspension soak, thrusters cut
  taxi: [7.6, 10.4],    // brakes off the remaining forward speed, rolls out of the fog
  reset: [10.4, 11.4],
};
export const T_TOTAL = 11.4;

export const PHASE = { READY: 0, RUN: 1, CLIMB: 2, COAST: 3, ROLL: 4, TRIM: 5, DESCEND: 6, LAND: 7, TAXI: 8, RESET: 9 };
export const PHASE_EN = ["Standby", "Roll-in", "Fan climb", "Coast", "Barrel roll", "Attitude trim", "Powered descent", "Touchdown", "Taxi", "Reset"];

// ---- telemetry curves -----------------------------------------------------------
// Altitude is one continuous arc: up to the 67.5 ft apex, then a smooth fall to the runway.
const ALT_KEYS = [[0, 0], [2.0, 0], [2.2, 0.4], [2.45, 7.4], [2.75, 26.0], [3.05, 44.3], [3.45, 57.9],
  [4.2, 64.4], [4.6, 67.5], [4.9, 62.0], [5.2, 54.0], [5.5, 44.5], [5.8, 34.0],
  [6.1, 22.0], [6.4, 11.0], [6.7, 3.6], [7.0, 0], [11.4, 0]];
const G_KEYS = [[0, 1.0], [1.9, 1.1], [2.3, 1.4], [2.75, 1.4], [3.05, 0.9], [3.45, 0.9], [3.85, 0.8],
  [4.2, 1.1], [4.5, 0.4], [4.9, 0.4], [5.3, 0.5], [5.7, 0.6], [6.1, 1.0], [6.5, 1.4],
  [6.9, 1.4], [7.0, 1.2], [7.3, 1.0], [7.6, 0.9], [11.4, 0.9]];
const sample = (keys, t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
  return keys[keys.length - 1][1];
};
export const altAt = (t) => sample(ALT_KEYS, t);
export const gAt = (t) => sample(G_KEYS, t);

// Forward motion after the lip: the car keeps its exit speed and bleeds it off gently, so it
// is still travelling +x fast at touchdown (a rolling, forward landing — never a vertical one).
const V0 = RIG.vExit, TAU = 3.0;
export function driftX(t) {
  const tau = t - TL.coast[0];
  if (tau <= 0) return 0;
  return V0 * TAU * (1 - Math.exp(-tau / TAU));
}
function driftV(t) { const tau = t - TL.coast[0]; return tau <= 0 ? V0 : V0 * Math.exp(-tau / TAU); }
export const LAND_X = driftX(TL.land[0]);                     // rolling touchdown point (~95 ft)
export const APEX = { x: driftX(4.6), z: 67.5 };              // ballistic apex (~19 ft past the lip)

// taxi: brakes the remaining ~20 ft/s to a stop over ~2.8 s
const taxiX = (t) => { const tau = clamp(t - TL.taxi[0], 0, 2.8); return LAND_X + 20 * tau * (1 - tau / 5.6); };
export const taxiEnd = taxiX(TL.reset[0]);

// ---- the state at any time -----------------------------------------------------
export function stateAt(time) {
  const t = ((time % T_TOTAL) + T_TOTAL) % T_TOTAL;
  const st = {
    t, phase: PHASE.READY, pos: [RIG.startX, 0], pitch: 0, roll: 0, v: 0,
    alt: 0, g: 1, fans: 0, fanSpin: 0, wheelSpin: 0, plume: 0, rollJet: 0, trimJet: 0, trimOsc: 0,
    fog: 0, headlight: 0, tail: 1, carOpacity: 1, phi: 0, susp: 0,
  };
  const alt = altAt(t), g = gAt(t);
  st.alt = alt; st.g = g;
  const runDist = RIG.startX - RIG.entryX0;
  const airSpin = (s) => -(runDist + RIG.R * Math.PI + s) / RIG.wheelR;

  if (t < TL.run[0]) {
    st.phase = PHASE.READY;
  } else if (t < TL.climb[0]) {
    st.phase = PHASE.RUN;
    const f = (t - TL.run[0]) / (TL.run[1] - TL.run[0]);
    st.pos = [lerp(RIG.startX, RIG.entryX0, Math.pow(f, 1.5)), 0];
    st.v = lerp(35, RIG.vExit, f);
    st.fans = smooth01((t - 1.75) / 0.3);
    st.wheelSpin = -(RIG.startX - st.pos[0]) / RIG.wheelR;
  } else if (t < TL.coast[0]) {
    st.phase = PHASE.CLIMB;
    const phi = phiOfAlt(alt);
    st.phi = phi;
    st.pos = trackPoint(phi);
    st.pitch = phi * 180 / Math.PI;
    st.v = RIG.vExit;
    st.fans = 1;
    st.wheelSpin = -(runDist + RIG.R * phi) / RIG.wheelR;
  } else if (t < TL.roll[0]) {
    // COAST: fast ballistic exit, still upside down, NO jets — the arc carries it up to the apex
    st.phase = PHASE.COAST;
    st.pos = [driftX(t), alt];
    st.pitch = 180;
    st.v = driftV(t);
    st.wheelSpin = airSpin(driftX(t));
  } else if (t < TL.trim[0]) {
    // ROLL: cold-gas couple flips it upright WHILE it is still falling forward along the arc
    st.phase = PHASE.ROLL;
    st.pos = [driftX(t), alt];
    st.pitch = 180;
    st.roll = 180 * smooth01((t - 4.78) / 0.55);
    st.rollJet = smooth01((t - TL.roll[0]) / 0.07) * (1 - smooth01((t - 5.3) / 0.1));
    st.v = driftV(t);
    st.wheelSpin = airSpin(driftX(t));
  } else if (t < TL.descend[0]) {
    // TRIM: short correction puffs level the nose — still descending, still moving forward
    st.phase = PHASE.TRIM;
    st.pos = [driftX(t), alt];
    st.roll = 180;
    const tau = t - TL.trim[0];
    st.trimOsc = Math.sin(2 * Math.PI * tau / 0.5) * Math.exp(-tau / 0.4);
    st.pitch = 180 + 4.6 * st.trimOsc;
    st.trimJet = (1 - smooth01((t - 5.85) / 0.12));
    st.headlight = smooth01((t - 5.6) / 0.25);
    st.v = driftV(t);
    st.wheelSpin = airSpin(driftX(t));
  } else if (t < TL.land[0]) {
    // DESCEND: four main columns soften the fall, but forward speed is kept — a shallow arc in
    st.phase = PHASE.DESCEND;
    st.pos = [driftX(t), alt];
    st.pitch = 180; st.roll = 180;
    st.plume = smooth01((t - TL.descend[0]) / 0.3);
    st.trimJet = 0.3 * (1 - smooth01((t - 6.6) / 0.4));
    st.headlight = 1;
    st.fog = smooth01((t - 6.4) / 0.7);
    st.v = driftV(t);
    st.wheelSpin = airSpin(driftX(t));
  } else if (t < TL.taxi[0]) {
    // LAND: rolling touchdown in the fog, suspension soaks it, thrusters cut
    st.phase = PHASE.LAND;
    const tau = t - TL.land[0];
    st.pos = [LAND_X + 20 * tau * (1 - tau / 5.6) * 0.35, alt];   // still creeping forward on the brakes
    st.pitch = 180; st.roll = 180;
    st.plume = Math.max(0, 1 - smooth01((t - 7.15) / 0.15));
    st.fog = 1;
    st.headlight = 1;
    st.susp = 1.1 * Math.sin(26 * tau) * Math.exp(-11 * tau);
    st.v = 20 * (1 - tau / 1.4);
    st.wheelSpin = airSpin(st.pos[0]);
  } else if (t < TL.reset[0]) {
    // TAXI: brakes off the remaining speed and rolls out of the thinning fog (+x)
    st.phase = PHASE.TAXI;
    st.pos = [taxiX(t), 0];
    st.pitch = 180; st.roll = 180;
    const tau = clamp(t - TL.taxi[0], 0, 2.8);
    st.v = Math.max(0, 20 * (1 - tau / 2.8));
    st.fog = Math.max(0, 1 - smooth01((t - 7.9) / 2.4));
    st.headlight = 1;
    st.wheelSpin = airSpin(st.pos[0]);
  } else {
    st.phase = PHASE.RESET;
    const tau = t - TL.reset[0];
    if (tau < 0.5) { st.pos = [taxiEnd, 0]; st.pitch = 180; st.roll = 180; st.carOpacity = 1 - smooth01(tau / 0.35); st.headlight = 1; }
    else { st.pos = [RIG.startX, 0]; st.carOpacity = smooth01((tau - 0.6) / 0.35); }
  }
  st.fanSpin = t * 30 * st.fans;
  return st;
}

// ---- derived art data -----------------------------------------------------------
export const GHOST_DEFS = [
  { kind: "track", phi: 40 * Math.PI / 180 },
  { kind: "track", phi: 90 * Math.PI / 180 },
  { kind: "track", phi: 135 * Math.PI / 180 },
  { kind: "track", phi: 176 * Math.PI / 180 },
  { kind: "time", t: 4.5 },    // ballistic coast, no jets
  { kind: "time", t: 5.05 },   // mid-air barrel roll on the descending arc
  { kind: "time", t: 5.65 },   // trim puffs, still falling forward
  { kind: "time", t: 6.5 },    // powered descent, forward speed kept
  { kind: "time", t: 7.3 },    // rolling touchdown
];
export function ghostStates() {
  return GHOST_DEFS.map((def, index) => {
    if (def.kind === "time") return { index, ...stateAt(def.t) };
    const [px, pz] = trackPoint(def.phi);
    return {
      index, phase: PHASE.CLIMB, pos: [px, pz], pitch: def.phi * 180 / Math.PI, roll: 0,
      fans: 1, fanSpin: def.phi * 9, plume: 0, carOpacity: 1, susp: 0, alt: pz, g: 1,
      headlight: 0, rollJet: 0, trimJet: 0, trimOsc: 0, wheelSpin: -((RIG.startX - RIG.entryX0) + RIG.R * def.phi) / RIG.wheelR, v: RIG.vExit,
    };
  });
}

// trajectory template: the true flown forward arc from the lip down to the touchdown
export function templatePoints() {
  const pts = [];
  for (let t = TL.coast[0]; t <= 7.0; t += 0.05) pts.push([driftX(t), altAt(t)]);
  pts.push([LAND_X, 0.6]);
  return pts;
}

export function readoutOf(st) {
  const alt = st.alt.toFixed(1), g = st.g.toFixed(1);
  switch (st.phase) {
    case PHASE.READY: return `Standby · tail bar lit · G ${g} · alt ${alt} ft`;
    case PHASE.RUN: return `Roll-in · v ${st.v.toFixed(0)} ft/s · fans spooling · G ${g}`;
    case PHASE.CLIMB: return `Fan climb · ${(st.phi * 180 / Math.PI).toFixed(0)}° · v ${RIG.vExit} ft/s · G ${g}`;
    case PHASE.COAST: return `Coast · ballistic, no jets · apex ${APEX.z} ft · G ${g}`;
    case PHASE.ROLL: return `Barrel roll · cold-gas couple · roll ${st.roll.toFixed(0)}° · G ${g}`;
    case PHASE.TRIM: { const d = st.pitch - 180; return `Attitude trim · pitch ${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}° · G ${g}`; }
    case PHASE.DESCEND: return `Powered descent · forward ${st.v.toFixed(0)} ft/s · alt ${alt} ft · G ${g}`;
    case PHASE.LAND: return `Touchdown · rolling, no bounce · G ${g} · alt ${alt} ft`;
    case PHASE.TAXI: return `Taxi · out of the fog · v ${st.v.toFixed(1)} ft/s · G ${g}`;
    default: return `Reset · back to the start`;
  }
}
