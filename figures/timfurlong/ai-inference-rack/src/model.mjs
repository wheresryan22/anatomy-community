// The truth behind the figure. Hardware numbers are NVIDIA's published GB300 NVL72
// figures where they exist; everything about the model is an estimate for an
// Opus-5.5-class frontier model, since none of it is public.

export const RACK = {
  gpus: 72,
  computeTrays: 18,
  gpusPerTray: 4,
  cpusPerTray: 2,
  switchTrays: 9,
  switchChipsPerTray: 2,
  powerShelves: 8,
  shelfKw: 33,
  hbmGbPerGpu: 288, // HBM3e, 8 stacks of 12-high 36 GB
  hbmStacks: 8,
  hbmTbsPerGpu: 8, // TB/s
  nvlinkTbsPerGpu: 1.8, // TB/s, 18 links x 100 GB/s, both directions
  nvlinkLinksPerGpu: 18,
  c2cGbs: 900, // Grace to GPU, GB/s
  lpddrGbPerCpu: 480,
  coresPerCpu: 72,
  fp4PflopsPerGpu: 15, // dense
  nicGbps: 800, // ConnectX-8 SuperNIC, one per GPU, scale-out
  dpuGbps: 400, // BlueField-3 per tray, front end
  gpuWatts: 1400,
  rackKw: 135, // estimate at full load
  liquidShare: 0.85,
  spineCables: 5000, // approx, copper NVLink spine
};

export const MODEL = {
  totalParams: 5.0e12, // estimate
  activeParams: 2.5e11, // estimate, per token
  bitsPerParam: 4.5, // NVFP4 plus block scales
  layers: 120,
  hidden: 16384,
  experts: 288,
  topK: 8,
  kvBytesPerToken: 120 * 8 * 128 * 2, // layers x kv heads x head dim x (K,V) x 1 byte FP8
  tp: 8, // attention is tensor-parallel in groups of 8
  ep: 72, // experts spread across every GPU
  batch: 256, // sequences decoding together on this replica
  avgContext: 32768,
  collectiveUs: 8, // one NVLink collective, latency-dominated at decode
  collectivesPerLayer: 3, // attention all-reduce, expert dispatch, expert combine
};

const TB = 1e12;
export function derive(R = RACK, M = MODEL) {
  const hbmTb = (R.gpus * R.hbmGbPerGpu) / 1000;
  const lpddrTb = (R.computeTrays * R.cpusPerTray * R.lpddrGbPerCpu) / 1000;
  const weightsTb = (M.totalParams * M.bitsPerParam) / 8 / TB;
  const workspaceTb = 1.0;
  const kvTb = hbmTb - weightsTb - workspaceTb;
  const kvTokens = (kvTb * TB) / M.kvBytesPerToken;
  // Decode is bound by memory reads: every expert gets tokens at this batch, so each
  // GPU reads its whole slice of the weights, plus the KV cache of its sequences.
  const weightReadMs = ((weightsTb * TB) / R.gpus / (R.hbmTbsPerGpu * TB)) * 1000;
  const kvReadTb = (M.batch * M.avgContext * M.kvBytesPerToken) / TB;
  const kvReadMs = ((kvReadTb * TB) / R.gpus / (R.hbmTbsPerGpu * TB)) * 1000;
  const commMs = (M.layers * M.collectivesPerLayer * M.collectiveUs) / 1000;
  const stepMs = weightReadMs + kvReadMs + commMs;
  const tokPerSec = 1000 / stepMs;
  const replicaTokPerSec = tokPerSec * M.batch;
  const allReduceMb = (M.batch * M.hidden * 2) / 1e6; // BF16 activations per layer
  const nvlinkTbs = R.gpus * R.nvlinkTbsPerGpu;
  const scaleOutTbps = (R.gpus * R.nicGbps) / 1000;
  const liquidKw = R.rackKw * R.liquidShare;
  return { hbmTb, lpddrTb, weightsTb, kvTb, kvTokens, weightReadMs, kvReadMs, commMs, stepMs, tokPerSec, replicaTokPerSec, allReduceMb, nvlinkTbs, scaleOutTbps, liquidKw, switchChips: R.switchTrays * R.switchChipsPerTray };
}

// Secondary loop: PG25 (25% propylene glycol) at the CDU's supply temperature.
export const COOLANT = { supplyC: 30, designDeltaK: 10, density: 1020, cp: 3900 };
export function flowLpm(liquidKw, C = COOLANT) {
  return ((liquidKw * 1000) / (C.density * C.cp * C.designDeltaK)) * 1000 * 60;
}
export function returnC(kw, lpm, C = COOLANT) {
  const kgs = (lpm / 60 / 1000) * C.density;
  return C.supplyC + (kw * 1000) / (kgs * C.cp);
}
