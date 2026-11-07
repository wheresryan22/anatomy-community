// The release line's model: what happens to one release, in order, and when.
// Pure data and functions, shared by the build (still frame) and the page (motion).
// Steps follow the deployer: verify → backup → build + scan → staging → switch → live check → record or roll back.

export const SX = [-110, -65, -20, 25]; // the four gantries along the line
export const LOAD = -132; // where a new release lands on the line
export const WAIT = 62; // in front of the transfer bed
export const LIVE = 112; // the live seat on the transfer bed
export const PARK = -44; // the previous release's bay, behind the live seat
export const REST = 34; // plunger pad height at rest
export const BLOCK_TOP = 20; // top of a release block
export const SPEED = 60; // carriage travel, units per second

export const STATIONS = [
  "verifying the tag and the gate run",
  "backing up the live database",
  "building and scanning the images",
  "staging on a restored copy",
];

const ease = (u) => u * u * (3 - 2 * u);

// Version after `v` (string "1.4.0"): a patch bump after a failed release, otherwise a minor bump.
export function nextVersion(v, failed) {
  const [a, b, c] = v.split(".").map(Number);
  return failed ? `${a}.${b}.${c + 1}` : `${a}.${b + 1}.0`;
}

// One cycle: a list of tracks { key, at, dur, from, to } plus phase labels { at, text }.
// Roles: "inc" (the new release), "live" (the release now serving), "park" (the one before it).
export function cycle({ version, liveVersion, ok }) {
  const T = [];
  const S = [];
  let t = 0;
  const tw = (key, at, dur, from, to) => T.push({ key, at, dur, from, to });
  const say = (at, text) => S.push({ at, text });
  tw("inc.a", 0, 0.6, 0, 1);
  tw("inc.x", 0, 0, LOAD, LOAD);
  tw("inc.y", 0, 0, 0, 0);
  tw("inc.tag", 0, 0, 0, 0);
  say(0, `v${version} · released, deployer picks it up`);
  t = 0.9;
  let x = LOAD;
  SX.forEach((sx, i) => {
    const d = Math.abs(sx - x) / SPEED;
    tw("inc.x", t, d, x, sx);
    x = sx;
    t += d + 0.15;
    say(t, `v${version} · ${STATIONS[i]}`);
    tw(`p${i}`, t, 0.45, REST, BLOCK_TOP);
    if (i === 0) tw("inc.tag", t + 0.45, 0.3, 0, 1);
    if (i === 1) {
      tw("drawer", t, 0.45, 0, 6);
      tw("drawer", t + 1.25, 0.45, 6, 0);
    }
    tw(`lamp${i}`, t + 0.45, 0.25, 0, 1);
    tw(`p${i}`, t + 0.8, 0.45, BLOCK_TOP, REST);
    t += 1.25 + (i === 1 ? 0.45 : 0) + 0.15;
  });
  const d1 = (WAIT - x) / SPEED;
  tw("inc.x", t, d1, x, WAIT);
  t += d1 + 0.2;
  say(t, `switching live to v${version}`);
  tw("park.a", t, 0.6, 1, 0);
  tw("live.y", t, 0.9, 0, PARK);
  t += 0.9;
  const d2 = (LIVE - WAIT) / SPEED;
  tw("inc.x", t, d2, WAIT, LIVE);
  t += d2 + 0.15;
  say(t, `v${version} · checking live`);
  tw("p4", t, 0.45, REST, BLOCK_TOP);
  if (ok) tw("lamp4", t + 0.45, 0.25, 0, 1);
  tw("p4", t + 0.8, 0.45, BLOCK_TOP, REST);
  t += 1.4;
  if (ok) {
    say(t, `live: v${version} · recorded`);
  } else {
    say(t, `live check failed · rolling back to v${liveVersion}`);
    tw("inc.x", t, d2, LIVE, WAIT);
    tw("live.y", t + d2, 0.9, PARK, 0);
    tw("inc.a", t + d2 + 0.9, 0.8, 1, 0);
    t += d2 + 1.7;
    say(t, `live: v${liveVersion} · v${version} held, not retried`);
  }
  t += 0.4;
  for (let i = 0; i < 5; i++) tw(`lamp${i}`, t, 0.6, 1, 0);
  t += 0.6;
  return { tracks: T, says: S, length: t + 2.2 };
}

// Value of `key` at time t, given its tracks; `fallback` before the first one starts.
export function valueAt(tracks, key, t, fallback) {
  let value = fallback;
  for (const s of tracks) {
    if (s.key !== key || s.at > t) continue;
    const u = s.dur > 0 ? Math.min(1, (t - s.at) / s.dur) : 1;
    value = s.from + (s.to - s.from) * ease(u);
  }
  return value;
}

export function sayAt(says, t) {
  let text = says[0].text;
  for (const s of says) if (s.at <= t) text = s.text;
  return text;
}
