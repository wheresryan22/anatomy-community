// Turning model for a 250 × 550 mm bench engine lathe cutting C45 steel with a coated
// carbide insert (CNMG 120408: 0.8 mm nose radius, 93° approach angle).
// Real units: mm, rpm, min, kW. One world unit of the drawing is 2 mm.

export const UNIT = 2;
export const STOCK = 40;
export const TARGET = 30.5;
export const SPEEDS = [90, 140, 224, 355, 560, 900, 1400, 2240];
export const DEPTHS = [1, 1.5, 2, 2.5];
export const ROUGH_FEED = 0.2;
export const FINISH = { ap: 0.25, f: 0.08 };
export const NOSE = 0.8;
export const KAPPA = 93;
export const LEAD = 6;
export const DIAL_TEETH = 16;
export const CROSS_PITCH = 2.5;
export const CROSS_DIVS = 125;
export const RACK_PER_TURN = 30;
export const CUT_LENGTH = 244;
export const MOTOR_KW = 2.2;
export const DRIVE_EFF = 0.85;
// Kienzle's specific cutting force for C45: kc = kc1.1 · h^-mc, kc1.1 in N/mm² at h = 1 mm.
export const KC11 = 2220;
export const MC = 0.14;

export function cutting(D, n, ap, f) {
  const vc = (Math.PI * D * n) / 1000;
  const h = f * Math.sin((KAPPA * Math.PI) / 180);
  const kc = KC11 * h ** -MC;
  const Q = vc * ap * f;
  const kw = (Q * kc) / 60000;
  const load = kw / (MOTOR_KW * DRIVE_EFF);
  const minutes = CUT_LENGTH / (f * n);
  const leadRpm = (f * n) / LEAD;
  return { vc, h, kc, Q, kw, load, minutes, leadRpm };
}

// Theoretical roughness left by a round nose: peak-to-valley f²/8r, arithmetic mean about f²/32r.
export const roughness = (f) => ((f * f) / (32 * NOSE)) * 1000;

// Roughing passes at ap down to the finishing allowance, then one finishing pass to TARGET.
export function planPasses(D0, ap) {
  const out = [];
  const stop = TARGET + 2 * FINISH.ap;
  let D = D0;
  while (D > stop + 1e-9) {
    const next = Math.max(stop, D - 2 * ap);
    out.push({ from: D, to: next, ap: (D - next) / 2, f: ROUGH_FEED, kind: "roughing" });
    D = next;
  }
  if (D > TARGET + 1e-9) out.push({ from: D, to: TARGET, ap: (D - TARGET) / 2, f: FINISH.f, kind: "finishing" });
  return out;
}

export const clock = (minutes) => {
  const s = Math.max(0, Math.round(minutes * 60));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
