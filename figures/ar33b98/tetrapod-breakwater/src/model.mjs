export const GRAV = 981;
export const SCALE = 50;
export const PERIOD = 0.7;
export const OMEGA = (2 * Math.PI) / PERIOD;
export const BREAK = 0.78;
export const DATUM = 30;
export const RANGE = { height: [2, 9], angle: [-30, 30], level: [27, 34] };
export const PADDLE_X = -100;
export const END_X = 186;
export const STATIONS = 160;
export const BW = { sea: 15, lee: 35, crest: 36, slope: 1.5, head: 24, glass: 100 };
export const BEACH = { toe: -20, ramp: 0.15, knee: 110, slope: 1 / 4 };
export const GAUGES = { x: 100, open: -46, lee: 60 };

export function bedOf(x) {
  if (x <= BEACH.toe) return 0;
  if (x <= BEACH.knee) return (x - BEACH.toe) * BEACH.ramp;
  return (BEACH.knee - BEACH.toe) * BEACH.ramp + (x - BEACH.knee) * BEACH.slope;
}

export function shoreOf(level) {
  const knee = (BEACH.knee - BEACH.toe) * BEACH.ramp;
  if (level <= knee) return BEACH.toe + level / BEACH.ramp;
  return BEACH.knee + (level - knee) / BEACH.slope;
}

export function moundOf(x) {
  const { sea, lee, crest, slope } = BW;
  if (x < sea) return crest - (sea - x) / slope;
  if (x > lee) return crest - (x - lee) / slope;
  return crest;
}

export const headOf = (level) => BW.head - BW.slope * (BW.crest - level);

export function wavenumberOf(h) {
  const k0 = (OMEGA * OMEGA) / GRAV;
  let k = k0 / Math.sqrt(Math.tanh(k0 * Math.max(h, 0.05)));
  for (let step = 0; step < 6; step++) {
    const t = Math.tanh(k * h);
    const f = GRAV * k * t - OMEGA * OMEGA;
    const df = GRAV * t + GRAV * k * h * (1 - t * t);
    k -= f / df;
  }
  return k;
}

export function groupOf(k, h) {
  const c = OMEGA / k;
  return 0.5 * c * (1 + (2 * k * h) / Math.sinh(2 * k * h));
}

export const deepLength = () => (GRAV * PERIOD * PERIOD) / (2 * Math.PI);

export function stationX(index) {
  return PADDLE_X + ((END_X - PADDLE_X) * index) / (STATIONS - 1);
}

export function tableOf(level, angle) {
  const h0 = level;
  const k0 = wavenumberOf(h0);
  const theta0 = (angle * Math.PI) / 180;
  const ky = k0 * Math.sin(theta0);
  const cg0 = groupOf(k0, h0);
  const phase = new Float64Array(STATIONS);
  const shoal = new Float64Array(STATIONS);
  const wave = new Float64Array(STATIONS);
  let lastKx = k0 * Math.cos(theta0);
  let lastS = 1;
  for (let index = 0; index < STATIONS; index++) {
    const x = stationX(index);
    const h = level - bedOf(x);
    let kx = lastKx;
    let s = lastS;
    let k = Math.hypot(lastKx, ky);
    if (h > 0.4) {
      k = wavenumberOf(h);
      kx = Math.sqrt(Math.max(k * k - ky * ky, 1e-6));
      const cosT = kx / k;
      s = Math.sqrt(cg0 / groupOf(k, h)) * Math.sqrt(Math.cos(theta0) / cosT);
    }
    if (index) phase[index] = phase[index - 1] + 0.5 * (kx + lastKx) * (x - stationX(index - 1));
    shoal[index] = s;
    wave[index] = k;
    lastKx = kx;
    lastS = s;
  }
  return { phase, shoal, wave, ky, k0 };
}

export function sampleOf(list, x) {
  const u = Math.min(STATIONS - 1, Math.max(0, ((x - PADDLE_X) / (END_X - PADDLE_X)) * (STATIONS - 1)));
  const i = Math.floor(u);
  const j = Math.min(STATIONS - 1, i + 1);
  return list[i] + (list[j] - list[i]) * (u - i);
}

export function transmissionOf(rc, hi, angle) {
  const b = BW.lee - BW.sea;
  const xi = 1 / BW.slope / Math.sqrt(hi / deepLength());
  const kt = -0.4 * (rc / hi) + 0.64 * Math.pow(b / hi, -0.31) * (1 - Math.exp(-0.5 * xi));
  return Math.min(0.8, Math.max(0.075, kt)) * Math.pow(Math.cos((angle * Math.PI) / 180), 2 / 3);
}

function fresnelOf(s) {
  const f = (1 + 0.926 * s) / (2 + 1.792 * s + 3.104 * s * s);
  const g = 1 / (2 + 4.142 * s + 3.492 * s * s + 6.67 * s * s * s);
  return Math.hypot(f, g) / Math.SQRT2;
}

export function shelterOf(x, y, state) {
  const { head, dir, kt, table } = state;
  const qx = x - BW.sea - 10;
  const qy = y - head;
  const along = dir[0] * qx + dir[1] * qy;
  const side = dir[0] * qy - dir[1] * qx;
  const k = sampleOf(table.wave, x);
  const lambda = (2 * Math.PI) / k;
  const sigma = side * Math.sqrt(2 / (lambda * Math.max(along, lambda * 0.25)));
  const kd = sigma >= 0 ? fresnelOf(sigma) : 1 - fresnelOf(-sigma);
  const through = smoothJs(-lambda * 0.5, lambda * 0.5, side);
  const behind = smoothJs(-14, 34, qx);
  const total = Math.sqrt(kd * kd + kt * kt * through);
  return 1 + (Math.min(1, total) - 1) * behind;
}

export function smoothJs(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function stateOf(height, angle, level) {
  const table = tableOf(level, angle);
  const theta = (angle * Math.PI) / 180;
  const head = headOf(level);
  const hiAt = Math.min(height * sampleOf(table.shoal, BW.sea - 24), BREAK * (level - bedOf(BW.sea - 24)));
  const rc = BW.crest - level;
  const kt = transmissionOf(rc, hiAt, angle);
  const state = { height, angle, level, table, head, dir: [Math.cos(theta), Math.sin(theta)], kt, rc, hi: hiAt };
  state.heightAt = (x, y) => {
    const h = level - bedOf(x);
    if (h <= 0) return 0;
    return Math.min(height * sampleOf(table.shoal, x) * shelterOf(x, y, state), BREAK * h);
  };
  state.open = state.heightAt(GAUGES.x, GAUGES.open);
  state.lee = state.heightAt(GAUGES.x, GAUGES.lee);
  const k = table.k0;
  const kh = k * level;
  state.stroke = height / ((2 * (Math.cosh(2 * kh) - 1)) / (Math.sinh(2 * kh) + 2 * kh));
  state.shore = shoreOf(level);
  state.runOpen = runupOf(state.open);
  state.runLee = runupOf(state.lee);
  state.lambda = (2 * Math.PI) / k;
  return state;
}

export function runupOf(h) {
  if (h <= 0.01) return 0;
  const xi = BEACH.slope / Math.sqrt(h / deepLength());
  return Math.min(1.2 * xi, 2.2) * h;
}

export function bendOf(x, y, state) {
  const qx = x - BW.sea - 10;
  const qy = y - state.head;
  const along = state.dir[0] * qx + state.dir[1] * qy;
  const side = state.dir[0] * qy - state.dir[1] * qx;
  const k = sampleOf(state.table.wave, x);
  const lambda = (2 * Math.PI) / k;
  return k * (Math.hypot(qx, qy) - along) * smoothJs(0, lambda * 0.5, side) * smoothJs(-14, 34, qx);
}

export function etaOf(state, x, y, t) {
  const phi = sampleOf(state.table.phase, x) + state.table.ky * y - OMEGA * t + bendOf(x, y, state);
  return 0.5 * state.heightAt(x, y) * Math.cos(phi);
}

export const metres = (cm) => (cm * SCALE) / 100;

export function readoutOf(s) {
  const surge = metres(s.level - DATUM);
  const sign = surge >= 0 ? "+" : "−";
  const cut = Math.round((1 - s.lee / Math.max(s.open, 1e-6)) * 100);
  return `H ${metres(s.height).toFixed(1)} m · ${s.angle >= 0 ? "+" : "−"}${Math.abs(s.angle).toFixed(0)}° · SWL ${sign}${Math.abs(surge).toFixed(1)} m · open ${metres(s.open).toFixed(1)} m · lee ${metres(s.lee).toFixed(1)} m (−${cut}%)`;
}

export function wordsOf(s) {
  const surge = metres(s.level - DATUM);
  return `Waves ${metres(s.height).toFixed(1)} metres high arriving at ${s.angle.toFixed(0)} degrees, water level ${surge.toFixed(1)} metres from datum. Open shore ${metres(s.open).toFixed(1)} metres, sheltered shore ${metres(s.lee).toFixed(1)} metres. Run-up ${metres(s.runOpen).toFixed(1)} metres open, ${metres(s.runLee).toFixed(1)} metres sheltered.`;
}
