// Enigma I: rotors I, II, III, reflector B, rings at A. Pure; the page inlines it.
export const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const ROTORS = [
  { name: "I", wiring: "EKMFLGDQVZNTOWYHXUSPAIBRCJ", notch: "Q" },
  { name: "II", wiring: "AJDKSIRUXBLHWTMCQGZNPYFVOE", notch: "E" },
  { name: "III", wiring: "BDFHJLCPRTXVZNYEIWGAKMUSQO", notch: "V" },
];
export const REFLECTOR = "YRUHQSLDPXNGOKMIEBFZCWVJAT";
export const PLUGS = ["AQ", "DE", "GT", "JU", "KL"];

const idx = (c) => c.charCodeAt(0) - 65;
const mod = (n) => ((n % 26) + 26) % 26;

export function plugMap(pairs = PLUGS) {
  const m = [...ABC];
  for (const [a, b] of pairs) { m[idx(a)] = b; m[idx(b)] = a; }
  return m;
}

// Positions [left, middle, right] as 0..25. Returns the positions after one key press.
export function step(pos) {
  const [l, m, r] = pos;
  const atNotch = (slot, p) => ABC[p] === ROTORS[slot].notch;
  const turnM = atNotch(2, r) || atNotch(1, m); // double step: middle moves itself at its notch
  const turnL = atNotch(1, m);
  return [turnL ? mod(l + 1) : l, turnM ? mod(m + 1) : m, mod(r + 1)];
}

function through(slot, pos, c, back) {
  const w = ROTORS[slot].wiring;
  const shifted = mod(c + pos);
  const out = back ? w.indexOf(ABC[shifted]) : idx(w[shifted]);
  return mod(out - pos);
}

// The full path for a key at the given (already stepped) positions.
export function trace(letter, pos, pairs = PLUGS) {
  const plug = plugMap(pairs);
  const stages = [];
  let c = idx(plug[idx(letter)]);
  stages.push({ part: "plug", letter: ABC[c] });
  for (const slot of [2, 1, 0]) { c = through(slot, pos[slot], c, false); stages.push({ part: `r${slot}`, letter: ABC[c] }); }
  c = idx(REFLECTOR[c]);
  stages.push({ part: "ukw", letter: ABC[c] });
  for (const slot of [0, 1, 2]) { c = through(slot, pos[slot], c, true); stages.push({ part: `r${slot}`, letter: ABC[c] }); }
  const out = plug[c];
  stages.push({ part: "plug", letter: out });
  return { out, stages };
}

export function press(letter, pos, pairs = PLUGS) {
  const next = step(pos);
  return { pos: next, ...trace(letter, next, pairs) };
}
