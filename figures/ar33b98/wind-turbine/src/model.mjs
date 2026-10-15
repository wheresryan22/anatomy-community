// Wind turbine model: one pure module shared by the build and the page.
// A 2.0 MW, 80 m, three-blade, pitch-regulated, variable-speed turbine with a
// three-stage gearbox and a doubly fed induction generator (DFIG).

export const SPEC = {
  ratedKW: 2000,
  D: 80,
  R: 40,
  hub: 70,
  rho: 1.225,
  cutIn: 3.5,
  cutOut: 25,
  restart: 20,
  rpmMin: 9,
  rpmRated: 16.8,
  gear: 100,
  eta: 0.94,
  lossKW: 12,
  pitchRate: 7,
  feather: 88,
  idlePitch: 60,
  yawShown: 8,
  yawReal: 0.5,
  yawStart: 4,
  yawStop: 0.4,
  brakeRpm: 1.2,
  tripRatio: 1.12,
};

export const AREA = Math.PI * SPEC.R * SPEC.R;
const RPM = (2 * Math.PI) / 60;
const DEG = Math.PI / 180;

// Power coefficient: a Heier-type Cp(λ, β) fit for a pitch-regulated rotor, β in
// degrees, with the published coefficients (c1…c6 = 0.5176, 116, 0.4, 5, 21,
// 0.0068). The fit's 0.035/(β³ + 1) correction is held at its β = 0 value, which
// leaves Cp(λ, 0) unchanged (peak 0.48 at λ 8.1) and removes a kink in the first
// few degrees of pitch, so the pitch needed to hold rated power rises smoothly.
// At low λ a fine-pitch blade is stalled and Cp first rises as it pitches.
export function cpOf(lambda, beta) {
  if (lambda <= 0.05) return 0;
  const b = Math.max(beta, -5);
  const inv = 1 / (lambda + 0.08 * b) - 0.035;
  return 0.5176 * (116 * inv - 0.4 * b - 5) * Math.exp(-21 * inv) + 0.0068 * lambda;
}

function bestTipSpeed() {
  let best = { lambda: 0, cp: 0 };
  for (let l = 2; l <= 14; l += 0.001) {
    const cp = cpOf(l, 0);
    if (cp > best.cp) best = { lambda: l, cp };
  }
  return best;
}
export const OPT = bestTipSpeed();

export const lambdaOf = (v, rpm) => (v > 0.01 ? (rpm * RPM * SPEC.R) / v : 0);
export const windKW = (v) => (0.5 * SPEC.rho * AREA * v * v * v) / 1000;
export const aeroKW = (v, rpm, pitch) => windKW(v) * cpOf(lambdaOf(v, rpm), pitch);
export const elecKW = (aero) => Math.max(0, Math.min(SPEC.ratedKW, SPEC.eta * aero - SPEC.lossKW));

// The converter's speed schedule: track the best tip-speed ratio between the
// generator's minimum and rated speeds.
export const scheduleRpm = (v) => Math.max(SPEC.rpmMin, Math.min(SPEC.rpmRated, (OPT.lambda * v) / (SPEC.R * RPM)));

// Pitch that holds rated power at rated speed. At low tip-speed ratio the blade
// is stalled at fine pitch and Cp first rises with pitch, so start from the
// peak and solve on the feather side, where power falls as pitch rises (the
// side a pitch-to-feather controller works on).
export function ratedPitch(v, rpm = SPEC.rpmRated) {
  const want = (SPEC.ratedKW + SPEC.lossKW) / SPEC.eta;
  const lambda = lambdaOf(v, rpm);
  let peak = 0;
  for (let b = 0.25; b <= 30; b += 0.25) if (cpOf(lambda, b) > cpOf(lambda, peak)) peak = b;
  if (aeroKW(v, rpm, peak) <= want) return peak;
  let lo = peak;
  let hi = 60;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (aeroKW(v, SPEC.rpmRated, mid) > want) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Steady operating point under automatic control: what the turbine settles to.
export function steadyOf(v) {
  if (v < SPEC.cutIn) return { phase: "wait", rpm: 0, pitch: SPEC.idlePitch, kW: 0 };
  if (v >= SPEC.cutOut) return { phase: "storm", rpm: 0, pitch: SPEC.feather, kW: 0 };
  const rpm = scheduleRpm(v);
  const pitch = ratedPitch(v, rpm);
  const kW = elecKW(aeroKW(v, rpm, pitch));
  return { phase: kW >= SPEC.ratedKW - 0.5 ? "rated" : "run", rpm, pitch, kW };
}

// Wind speed at which output first reaches rated power.
function ratedWind() {
  let lo = SPEC.cutIn;
  let hi = SPEC.cutOut;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (elecKW(aeroKW(mid, scheduleRpm(mid), 0)) >= SPEC.ratedKW - 1e-6) hi = mid;
    else lo = mid;
  }
  return hi;
}
export const RATED_V = ratedWind();

export const MARKS = [
  { key: "cutin", label: "Cut-in", v: SPEC.cutIn },
  { key: "rated", label: "Rated", v: Math.round(RATED_V * 10) / 10 },
  { key: "cutout", label: "Cut-out", v: SPEC.cutOut - 0.01 },
].map((mark) => ({ ...mark, ...steadyOf(mark.v) }));

export function curve(step = 0.1, top = 30) {
  const out = [];
  for (let v = 0; v <= top + 1e-9; v += step) out.push([Math.round(v * 100) / 100, steadyOf(v).kW]);
  return out;
}

// Axial induction factor from the power actually taken: Cp = 4a(1 − a)², a ≤ 1/3.
export function inductionOf(cp) {
  const c = Math.max(0, Math.min(16 / 27, cp));
  let lo = 0;
  let hi = 1 / 3;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (4 * mid * (1 - mid) * (1 - mid) < c) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

export function initial(input) {
  const s = steadyOf(input.v);
  const base = {
    v: input.v,
    dir: input.dir,
    yaw: input.dir,
    yawing: 0,
    rpm: s.phase === "wait" ? idleRpm(input.v) : s.rpm,
    pitch: input.pitch ?? s.pitch,
    brake: s.phase === "storm" ? 1 : 0,
    phase: s.phase === "rated" ? "run" : s.phase,
    tripped: false,
    rotor: 0,
    kW: s.kW,
    aero: 0,
    a: 0,
    cp: 0,
    excess: 0,
  };
  const settled = step(base, input, 1e-6, true);
  return { ...settled, rotor: 0 };
}

const idleRpm = (v) => Math.min(1.6, (1.6 * v) / SPEC.cutIn);
const approach = (x, target, dt, tau) => target + (x - target) * Math.exp(-dt / tau);
const rateTo = (x, target, dt, rate, tau) => {
  const want = approach(x, target, dt, tau) - x;
  return x + Math.max(-rate * dt, Math.min(rate * dt, want));
};

// One time step. input = { v, dir, pitch: number (manual) | null (auto) }.
// Rotor speed, pitch and yaw move at real rates, except yaw, which is shown
// SPEC.yawShown / SPEC.yawReal times faster than a real yaw drive turns.
export function step(s, input, dt, calm = false) {
  const n = { ...s };
  n.v = calm ? input.v : approach(s.v, input.v, dt, 0.5);
  n.dir = input.dir;
  const err = wrap180(n.dir - s.yaw);
  if (Math.abs(err) > SPEC.yawStart) n.yawing = 1;
  if (Math.abs(err) < SPEC.yawStop) n.yawing = 0;
  if (calm) n.yaw = n.dir;
  else if (n.yawing) {
    const rate = SPEC.yawShown * Math.min(1, Math.abs(err) / 3);
    n.yaw = s.yaw + Math.sign(err) * Math.min(Math.abs(err), rate * dt);
  }
  const yawErr = wrap180(n.dir - n.yaw);
  const vn = n.v * Math.max(0, Math.cos(yawErr * DEG));
  const manual = typeof input.pitch === "number";

  let phase = s.phase;
  if (phase === "storm" && n.v < SPEC.restart) phase = n.v >= SPEC.cutIn ? "run" : "wait";
  if (phase !== "storm" && n.v >= SPEC.cutOut) phase = "storm";
  if (phase === "trip" && (!manual || input.pitch !== s.tripPitch)) phase = "run";
  if (phase === "run" && vn < SPEC.cutIn) phase = "wait";
  if (phase === "wait" && vn >= SPEC.cutIn && n.v < SPEC.cutOut) phase = "run";
  n.phase = phase;
  n.tripped = phase === "trip";

  const stopping = phase === "storm" || phase === "trip";
  let pitchTarget;
  let rpmTarget;
  if (stopping) {
    pitchTarget = SPEC.feather;
    rpmTarget = 0;
  } else if (phase === "wait") {
    pitchTarget = manual ? input.pitch : SPEC.idlePitch;
    rpmTarget = idleRpm(vn);
  } else {
    rpmTarget = scheduleRpm(vn);
    pitchTarget = manual ? input.pitch : ratedPitch(vn, rpmTarget);
  }
  n.pitch = calm ? pitchTarget : rateTo(s.pitch, pitchTarget, dt, stopping ? 2 * SPEC.pitchRate : SPEC.pitchRate, 0.35);

  const aero = Math.max(0, aeroKW(vn, s.rpm, n.pitch));
  const want = (SPEC.ratedKW + SPEC.lossKW) / SPEC.eta;
  n.excess = phase === "run" && manual ? Math.max(0, aero - want) : 0;
  if (n.excess > 0.02 * want) rpmTarget = SPEC.rpmRated * (1 + 0.3 * Math.min(1, n.excess / want));

  const brakeOn = stopping && s.rpm < SPEC.brakeRpm + 0.4;
  n.brake = calm ? (stopping ? 1 : 0) : approach(s.brake, brakeOn ? 1 : 0, dt, 0.18);
  if (calm) n.rpm = rpmTarget;
  else if (n.brake > 0.5) n.rpm = Math.max(0, s.rpm - 4 * dt);
  else n.rpm = approach(s.rpm, rpmTarget, dt, stopping ? 3.2 : 2.4);
  if (n.rpm < 1e-3) n.rpm = 0;
  if (phase === "run" && manual && n.rpm > SPEC.tripRatio * SPEC.rpmRated) {
    n.phase = "trip";
    n.tripped = true;
    n.tripPitch = input.pitch;
  }

  n.rotor = calm ? s.rotor : (s.rotor + n.rpm * 6 * dt) % 360;
  // A shutdown is soft: the generator stays on line while the blades feather and
  // output falls away, and drops off before the rotor slows to a crawl.
  const live = n.phase === "run" || ((n.phase === "storm" || n.phase === "trip") && n.rpm > 0.6 * SPEC.rpmMin && n.brake < 0.1);
  n.aero = live ? Math.max(0, aeroKW(vn, n.rpm, n.pitch)) : 0;
  n.kW = live ? elecKW(n.aero) : 0;
  n.cp = vn > 0.5 ? Math.max(0, cpOf(lambdaOf(vn, n.rpm), n.pitch)) : 0;
  n.a = inductionOf(n.cp) * (n.rpm > 0.05 ? Math.min(1, n.rpm / 3) : 0);
  n.lambda = lambdaOf(vn, n.rpm);
  n.vn = vn;
  n.yawErr = yawErr;
  n.genRpm = n.rpm * SPEC.gear;
  n.torque = n.rpm > 0.1 ? (n.kW / SPEC.eta / (n.rpm * RPM)) : 0;
  return n;
}

export function phaseWord(s) {
  if (s.phase === "trip") return "overspeed trip";
  if (s.phase === "storm") return s.brake > 0.5 ? "storm · parked" : "storm · feathering";
  if (s.phase === "wait") return s.v >= SPEC.cutIn ? "yawing to face the wind" : "waiting for wind";
  if (s.excess > 0) return "over the generator's limit";
  if (s.kW >= SPEC.ratedKW - 1) return "rated";
  return "making power";
}

export const fmtKW = (kW) => (kW >= 1000 ? `${(kW / 1000).toFixed(2)} MW` : `${Math.round(kW)} kW`);

export function readoutOf(s) {
  return `${s.v.toFixed(1)} m/s · ${phaseWord(s)} · ${fmtKW(s.kW)}`;
}
