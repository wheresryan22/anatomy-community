// The gas burner, as one lumped model. Pure functions and one small state stepper; no imports, so the
// build can inline it into the page with `export ` stripped. Units: SI unless a name says otherwise.
//
// What is exact and what is approximate:
// - Orifice flow (Bernoulli with a discharge coefficient) and the valve and orifice in series: textbook.
// - Primary air entrainment: Prigg's momentum relation for an atmospheric injector, (1 + r)(1 + r·s) = Λ·At/Ao,
//   with one lumped loss factor Λ fitted so a wide-open shutter gives about 54 % primary aeration, which is
//   typical of a domestic burner. The shutter adds a loss that grows as its opening closes. Approximate.
// - Inner-cone height from the cone-angle relation h = (w/2)·sqrt((u/S)² − 1) with a fitted burning velocity
//   S(aeration) for the rich primary mixture. Approximate, good for trends.
// - Outer flame length and yellow tipping: fitted trends, for the picture only.

export const GAS = {
  name: "natural gas",
  rho: 0.72, // kg/m³ at 15 °C
  sg: 0.6, // relative to air
  hhv: 37.3e6, // J/m³ (about 1,000 Btu/ft³)
  stoich: 9.6, // m³ air per m³ gas for complete combustion
};

export const BURNER = {
  supply: 996, // Pa, regulated manifold pressure (4.0 in. w.c.)
  orificeD: 1.45e-3, // m (about a #53 drill)
  cd: 0.8, // orifice discharge coefficient
  throatD: 16e-3, // m, venturi throat
  ports: 28, // slots round the head
  portW: 1.6e-3, // m, slot width (sets the inner cone)
  portH: 4.0e-3, // m, slot height
  lambda: 0.21, // lumped injector loss factor (fitted)
  shutterLoss: 0.15, // how fast the shutter throttles air as it closes (fitted)
  volume: 110e-6, // m³ of mixing tube and head between the orifice and the ports
  crossfire: 0.45, // m/s, how fast flame runs from port to port round the ring
  ringR: 0.034, // m, port ring radius
  sparkHz: 2, // spark module repetition rate while the switch is closed
};

const INWC = 249.09; // Pa per inch of water column
export const toInWC = (pa) => pa / INWC;

// ---------- the knob: OFF at 0°, turned counter-clockwise ----------
export const DETENTS = { OFF: 0, LITE: 90, HI: 115, MED: 190, LO: 270 };
export const KNOB_MAX = 275;
export const SWITCH = [72, 106]; // spark switch closed while the knob is in this band (around LITE)
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// fraction of full burner flow the valve passes, as a function of knob angle (degrees)
export function flowFraction(theta) {
  if (theta <= 35) return 0;
  if (theta < 90) return smoothstep(35, 90, theta);
  if (theta <= DETENTS.HI) return 1;
  // a contoured plug: roughly linear in heat from HI down to the simmer stop at LO
  const t = Math.min(1, (theta - DETENTS.HI) / (DETENTS.LO - DETENTS.HI));
  return 1 - 0.85 * t;
}
export const switchClosed = (theta) => theta >= SWITCH[0] && theta <= SWITCH[1];
export const pushNeeded = (theta) => theta < 12; // the knob must be pushed in to leave OFF

// ---------- the steady state for one knob angle and shutter opening ----------
const area = (d) => (Math.PI * d * d) / 4;
export function steady(theta, shutter = 1, B = BURNER, g = GAS) {
  const Ao = area(B.orificeD);
  const At = area(B.throatD);
  const f = flowFraction(theta);
  // valve and orifice in series: the same flow through both, so (Ae/Ao)² of the supply reaches the orifice
  const Ae = f * Ao;
  const valveArea = f >= 1 ? Infinity : f <= 0 ? 0 : 1 / Math.sqrt(1 / (Ae * Ae) - 1 / (Ao * Ao));
  const pOrifice = B.supply * f * f;
  const jet = Math.sqrt((2 * pOrifice) / g.rho); // m/s at the orifice
  const qGas = B.cd * Ao * jet; // m³/s
  // primary air: Prigg, with the shutter adding a loss as it closes
  const s = Math.max(0.02, Math.min(1, shutter));
  const lam = (B.lambda * (1 + B.shutterLoss)) / (1 + B.shutterLoss / (s * s));
  const ratio = lam * (At / Ao); // (1 + r)(1 + r·sg) = ratio
  const r = ratio > 1 ? (-(1 + g.sg) + Math.sqrt((1 + g.sg) ** 2 - 4 * g.sg * (1 - ratio))) / (2 * g.sg) : 0;
  const aeration = r / g.stoich; // primary aeration, share of stoichiometric air
  const qMix = qGas * (1 + r);
  const portArea = B.ports * B.portW * B.portH;
  const u = qMix / portArea; // mean port velocity (cold), m/s
  const S = 0.04 + 0.4 * Math.pow(Math.min(1, aeration), 1.5); // burning velocity of the primary mixture, m/s
  const ratioUS = S > 0 ? u / S : 0;
  const cone = ratioUS > 1 ? (B.portW / 2) * Math.sqrt(ratioUS * ratioUS - 1) : 0; // inner cone height, m
  const perPort = qGas / B.ports;
  const outer = cone + 8.7e6 * perPort * (1 - Math.min(1, aeration)) * 1e-3 + (f > 0 ? 0.002 : 0); // m
  const yellow = smoothstep(0.42, 0.22, aeration) * (f > 0 ? 1 : 0);
  const power = qGas * g.hhv; // W (higher heating value)
  const transport = qMix > 0 ? B.volume / qMix : Infinity; // s from orifice to ports
  return {
    theta, f, shutter: s, valveArea, pOrifice, inwc: toInWC(pOrifice), jet, qGas, r, aeration, qMix, u, S,
    cone, outer, yellow, power, btu: power * 3.412, transport,
    flashback: f > 0 && ratioUS > 0 && ratioUS < 1.05, lift: ratioUS > 18,
  };
}

// ---------- the dynamic state: gas reaching the ports, the spark, the flame running round ----------
export function initial() {
  return { fill: 0, lit: false, spread: 0, sparkClock: 0, sparkAt: -9, sparks: 0, litAt: -9, outAt: -9, clock: 0, flow: 0 };
}

// advance by dt seconds with the knob at theta and the shutter at `shutter`. Returns the steady values too.
export function step(state, theta, shutter, dt, B = BURNER) {
  const st = steady(theta, shutter, B);
  state.clock += dt;
  // mixture flow follows the valve with the transport lag of the tube (plug flow approximated as first order)
  state.flow += (st.f - state.flow) * (1 - Math.exp(-dt / 0.08));
  // `fill` is how far fresh mixture has reached toward the ports (0 at the orifice, 1 at the ports)
  if (st.f > 0.01) state.fill = Math.min(1.2, state.fill + dt / Math.max(0.08, st.transport));
  else state.fill = Math.max(0, state.fill - dt / 0.6);
  // the spark module fires while the switch is closed
  let fired = false;
  if (switchClosed(theta)) {
    state.sparkClock += dt;
    if (state.sparkClock >= 1 / B.sparkHz) {
      state.sparkClock -= 1 / B.sparkHz;
      state.sparkAt = state.clock;
      state.sparks++;
      fired = true;
    }
  } else state.sparkClock = 1 / B.sparkHz - 0.06; // first spark comes quickly once the switch closes
  // ignition: a spark with flammable mixture at the electrode port
  if (!state.lit && fired && state.fill >= 1 && st.f > 0.05) {
    state.lit = true;
    state.litAt = state.clock;
    state.spread = 0;
  }
  if (state.lit) {
    state.spread = Math.min(Math.PI, state.spread + (dt * B.crossfire) / B.ringR);
    // the flame goes out when the mixture stops reaching the ports
    if (state.flow < 0.03 && st.f === 0) {
      state.lit = false;
      state.outAt = state.clock;
    }
  } else state.spread = Math.max(0, state.spread - dt * 6);
  return { ...st, fired, lit: state.lit, spread: state.spread, fill: state.fill, flow: state.flow };
}

// a phase word for the readout, from the same instant as the numbers beside it
export function phaseOf(theta, state) {
  if (theta < 12 && !state.lit) return "OFF";
  if (switchClosed(theta) && !state.lit) return state.fill < 1 ? "LITE · gas on" : "LITE · sparking";
  if (switchClosed(theta)) return state.spread < Math.PI - 0.01 ? "LITE · catching" : "LITE · lit";
  if (!state.lit) return flowFraction(theta) > 0 ? "gas on · unlit" : "OFF";
  const d = Object.entries(DETENTS).reduce((best, [name, at]) => (Math.abs(at - theta) < Math.abs(best[1] - theta) ? [name, at] : best), ["OFF", 0]);
  return Math.abs(d[1] - theta) < 8 ? d[0] : "turning";
}
