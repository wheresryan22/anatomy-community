// Cold-gas blowdown of the Roadster's two COPVs through four rear nozzles.
// Tesla's figures (reveal, 15 Oct 2026): two COPVs, 600 L, about 250 kg of air, >80 kN.
// Everything else is ideal-gas physics: isentropic tank blowdown, choked throats,
// full expansion to ambient. The throat area is sized so the start thrust is 80 kN.

export const GAMMA = 1.4;
export const R_AIR = 287;
export const VOLUME = 0.6; // m³, both tanks
export const MASS0 = 250; // kg of air
export const T0 = 293; // K, tank at room temperature
export const P_AMB = 101325;
export const THRUST0 = 80000; // N, Tesla's "more than 80 kN"
export const NOZZLES = 4;
export const TIRE_G = 1.0; // a good street tyre's grip, in g

const CHOKE = Math.sqrt(GAMMA / R_AIR) * (2 / (GAMMA + 1)) ** ((GAMMA + 1) / (2 * (GAMMA - 1)));
const EXPO = (GAMMA - 1) / GAMMA;

export const pressureOf = (mass, temp) => (mass / VOLUME) * R_AIR * temp;
export const exhaustOf = (p, temp) => Math.sqrt(((2 * GAMMA) / (GAMMA - 1)) * R_AIR * temp * Math.max(0, 1 - (P_AMB / p) ** EXPO));
const flowPerArea = (p, temp) => (CHOKE * p) / Math.sqrt(temp);

const P0 = pressureOf(MASS0, T0);
export const THROAT = THRUST0 / (flowPerArea(P0, T0) * exhaustOf(P0, T0)); // m², all four nozzles

export function stateOf(mass) {
  const temp = T0 * (mass / MASS0) ** (GAMMA - 1);
  const p = pressureOf(mass, temp);
  const flow = p > 1.9 * P_AMB ? flowPerArea(p, temp) * THROAT : 0;
  const ve = exhaustOf(p, temp);
  return { mass, temp, p, flow, ve, thrust: flow * ve };
}

// One run from full to empty, sampled every 10 ms, for the page and the caption.
export function blowdown(dt = 0.001, every = 10) {
  const rows = [];
  let mass = MASS0;
  let impulse = 0;
  for (let step = 0; ; step++) {
    const s = stateOf(mass);
    if (step % every === 0) rows.push([+(step * dt).toFixed(3), +s.mass.toFixed(3), +(s.p / 1e5).toFixed(2), +(s.thrust / 1000).toFixed(3), +s.temp.toFixed(1)]);
    if (s.flow <= 0) break;
    mass -= s.flow * dt;
    impulse += s.thrust * dt;
  }
  return { rows, impulse };
}

export const SUMMARY = (() => {
  const s0 = stateOf(MASS0);
  const { rows, impulse } = blowdown();
  const half = rows.find((row) => row[3] < THRUST0 / 2000);
  const last = rows[rows.length - 1];
  return {
    bar0: s0.p / 1e5,
    ve0: s0.ve,
    flow0: s0.flow,
    throatEachCm2: (THROAT / NOZZLES) * 1e4,
    throatEachMm: 2 * Math.sqrt(THROAT / NOZZLES / Math.PI) * 1000,
    halfAt: half[0],
    endAt: last[0],
    endMass: last[1],
    endTemp: last[4],
    impulse,
    tireKn: (2000 * 9.81 * TIRE_G) / 1000,
  };
})();
