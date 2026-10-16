// Real, deterministic 2-D Radon transform and Ram-Lak filtered back-projection.
// Educational axial inset, NOT clinical helical/cone-beam reconstruction. No HU/dose/noise claims.
// Phantom ellipse coordinates: cm in the transverse world (y,z) plane relative to isocentre.
export const PHANTOM = [
  { a: 14.5, b: 14.5, y: 0, z: 0, phi: 0, density: 1 },
  { a: 4, b: 6, y: -5, z: 2, phi: 0.25, density: -0.65 },
  { a: 3, b: 3, y: 5, z: 4, phi: 0, density: 0.75 },
  { a: 2, b: 2, y: 2, z: -6, phi: 0, density: 0.4 },
];
export function samplePhantom(y, z, ellipses = PHANTOM) {
  let value = 0;
  for (const e of ellipses) {
    const c = Math.cos(e.phi), s = Math.sin(e.phi);
    const u = c * (y - e.y) + s * (z - e.z);
    const v = -s * (y - e.y) + c * (z - e.z);
    if ((u / e.a) ** 2 + (v / e.b) ** 2 <= 1) value += e.density;
  }
  return value;
}
// Exact chord integral for uniform ellipses, not a fixture or image lookup.
export function projection(theta, position, ellipses = PHANTOM) {
  let p = 0;
  for (const e of ellipses) {
    const beta = theta - e.phi;
    const radius = Math.hypot(e.a * Math.cos(beta), e.b * Math.sin(beta));
    const t = position - e.y * Math.cos(theta) - e.z * Math.sin(theta);
    if (Math.abs(t) < radius) p += 2 * e.density * e.a * e.b / radius * Math.sqrt(1 - (t / radius) ** 2);
  }
  return p;
}
// Fan geometry: source at R[cos(beta),sin(beta)], ray at beta+pi+gamma.
// Its line normal is alpha=beta+pi/2+gamma, signed distance s=-R sin(gamma).
export function fanProjection(beta, gamma, radius = 54, ellipses = PHANTOM) {
  return projection(beta + Math.PI / 2 + gamma, -radius * Math.sin(gamma), ellipses);
}
export function createFan({ views = 360, detectors = 181, radius = 54, halfFan = Math.asin(25 / 54), ellipses = PHANTOM } = {}) {
  const data = new Float64Array(views * detectors);
  const origin = Math.PI / 2; // source at +world-z at rest; rotor+x increases beta
  let acquired = 0;
  function step() {
    if (acquired === views) return false;
    const beta = origin + acquired * 2 * Math.PI / views;
    for (let j = 0; j < detectors; j++) data[acquired * detectors + j] = fanProjection(beta, -halfFan + 2 * halfFan * j / (detectors - 1), radius, ellipses);
    acquired++;
    return true;
  }
  // Bilinear interpolation in periodic beta and bounded gamma. Rebin only when all views exist.
  function parallel(theta, s) {
    if (acquired !== views) throw new Error('rebin requires a completed fan acquisition');
    const gamma = Math.asin(-s / radius);
    if (Math.abs(gamma) > halfFan) return 0;
    let beta = theta - Math.PI / 2 - gamma - origin;
    beta = ((beta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const q = beta * views / (2 * Math.PI), r = (gamma + halfFan) / (2 * halfFan) * (detectors - 1);
    const i = Math.floor(q), j = Math.min(detectors - 2, Math.floor(r));
    const u = q - i, v = r - j;
    const sample = (row) => (1 - v) * data[(row % views) * detectors + j] + v * data[(row % views) * detectors + j + 1];
    return (1 - u) * sample(i) + u * sample(i + 1);
  }
  return { views, detectors, data, step, parallel, get acquired() { return acquired; } };
}
export function createAcquisition({ angles = 180, detectors = 161, span = 34, pixels = 96, ellipses = PHANTOM, projector = (theta, s) => projection(theta, s, ellipses) } = {}) {
  const spacing = span / (detectors - 1);
  const positions = Float64Array.from({ length: detectors }, (_, j) => -span / 2 + j * spacing);
  const sinogram = new Float64Array(angles * detectors);
  const filtered = new Float64Array(sinogram.length);
  const truth = new Float64Array(pixels * pixels);
  const image = new Float64Array(truth.length);
  const unfiltered = new Float64Array(truth.length);
  const kernel = Float64Array.from({ length: detectors }, (_, k) => k === 0 ? 1 / (4 * spacing ** 2) : k % 2 ? -1 / (Math.PI ** 2 * k ** 2 * spacing ** 2) : 0);
  let acquired = 0;
  for (let row = 0; row < pixels; row++) for (let col = 0; col < pixels; col++) {
    truth[row * pixels + col] = samplePhantom(-span / 2 + (col + 0.5) * span / pixels, span / 2 - (row + 0.5) * span / pixels, ellipses);
  }
  function step() {
    if (acquired >= angles) return false;
    const theta = acquired * Math.PI / angles;
    const offset = acquired * detectors;
    for (let j = 0; j < detectors; j++) sinogram[offset + j] = projector(theta, positions[j]);
    // Linear zero-padded convolution with discrete Ram-Lak ramp. No circular wrap.
    for (let j = 0; j < detectors; j++) {
      let sum = 0;
      for (let k = 0; k < detectors; k++) sum += sinogram[offset + k] * kernel[Math.abs(j - k)];
      filtered[offset + j] = spacing * sum;
    }
    const c = Math.cos(theta), s = Math.sin(theta), weight = Math.PI / angles;
    for (let row = 0; row < pixels; row++) for (let col = 0; col < pixels; col++) {
      const y = -span / 2 + (col + 0.5) * span / pixels;
      const z = span / 2 - (row + 0.5) * span / pixels;
      const q = (y * c + z * s + span / 2) / spacing;
      const j = Math.floor(q), f = q - j;
      if (j < 0 || j + 1 >= detectors) continue;
      const index = row * pixels + col;
      image[index] += weight * ((1 - f) * filtered[offset + j] + f * filtered[offset + j + 1]);
      unfiltered[index] += weight * ((1 - f) * sinogram[offset + j] + f * sinogram[offset + j + 1]);
    }
    acquired++;
    return true;
  }
  return { angles, detectors, span, pixels, spacing, positions, sinogram, filtered, truth, image, unfiltered, step, get acquired() { return acquired; } };
}
