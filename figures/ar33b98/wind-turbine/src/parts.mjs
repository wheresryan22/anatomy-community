// Fig 2's components: what each one does, and a live line read from the same
// model state the figures run on. Shared by the build (labels, parts row) and
// the page (the card beside a selected part).

const rpmText = (n) => Math.round(n).toLocaleString("en-US");
const kWText = (kW) => (kW >= 1000 ? `${(kW / 1000).toFixed(2)} MW` : `${Math.round(kW)} kW`);
const torqueMNm = (s, M) => (s.rpm > 0.1 && s.kW > 0 ? s.kW / M.SPEC.eta / ((s.rpm * 2 * Math.PI) / 60) / 1000 : 0);
const thrustKN = (s, M) => (0.5 * M.SPEC.rho * Math.PI * M.SPEC.R * M.SPEC.R * (s.vn ?? s.v) ** 2 * 4 * s.a * (1 - s.a)) / 1000;
const bar = (s) => Math.round(160 * s.brake);
const SYNC = 1500;

export const PARTS = {
  hub: {
    name: "Hub and nose cone",
    does: "The cast hub joins the three blades to the main shaft and takes all of their thrust and torque. The nose cone in front keeps rain and ice off it.",
    live: (s, M) => `${s.rpm.toFixed(1)} rpm · blade tips at ${Math.round((s.rpm * 2 * Math.PI * M.SPEC.R) / 60)} m/s`,
  },
  pitch: {
    name: "Pitch bearings and blade roots",
    does: "Each blade root is bolted to a large slewing bearing, and a pitch drive turns the blade about its own axis. Fine pitch (0°) takes the most energy; turning toward feather spills it, which holds power at 2 MW in strong wind and stops the rotor in a storm. The scale on each bearing reads the angle.",
    live: (s, M, ctx) => `pitch ${s.pitch.toFixed(1)}° · ${ctx.manual ? "set by hand" : "set by the controller"}`,
  },
  rotorlock: {
    name: "Rotor lock",
    does: "A slotted disc behind the hub and a locking pin on the bedplate. Technicians drive the pin in to fix the rotor before anyone enters the hub; it is never used to stop a turning rotor.",
    live: () => "pin out · rotor free to turn",
  },
  mainshaft: {
    name: "Main shaft",
    does: "A forged steel shaft, bolted to the hub at its flange, that carries the rotor's slow, heavy torque back to the gearbox.",
    live: (s, M) => `${s.rpm.toFixed(1)} rpm · ${torqueMNm(s, M).toFixed(2)} MN·m`,
  },
  mainbearing: {
    name: "Main bearing",
    does: "A spherical roller bearing in a cast housing. It carries the rotor's weight and the wind's push into the bedplate, so the gearbox has only torque to deal with.",
    live: (s, M) => `rotor thrust ≈ ${Math.round(thrustKN(s, M))} kN`,
  },
  gearbox: {
    name: "Gearbox",
    does: "One planetary stage and two parallel stages multiply the rotor's speed by 100, trading torque for speed so a small, fast generator can do the work. Torque arms on rubber bushings hold it against its own reaction.",
    live: (s, M) => `1 : ${M.SPEC.gear} · ${s.rpm.toFixed(1)} → ${rpmText(s.rpm * M.SPEC.gear)} rpm`,
  },
  hss: {
    name: "High-speed shaft",
    does: "The gearbox output. It carries the same power as the main shaft at a hundredth of the torque, turning a hundred times faster.",
    live: (s, M) => `${rpmText(s.rpm * M.SPEC.gear)} rpm · ${((torqueMNm(s, M) * 1000) / M.SPEC.gear).toFixed(1)} kN·m`,
  },
  brake: {
    name: "Disc brake",
    does: "A hydraulic caliper on the high-speed shaft, where 1/100 of the rotor's torque is enough to hold it. Feathering the blades does the real braking; the disc brake parks the rotor once it has slowed below 1.2 rpm, and holds it through a storm.",
    live: (s) => `${s.brake > 0.5 ? "clamped" : "released"} · ${bar(s)} bar`,
  },
  coupling: {
    name: "Flexible coupling",
    does: "Joins the gearbox to the generator while allowing a little misalignment between them, and insulates the generator electrically from the gearbox.",
    live: (s, M) => `${rpmText(s.rpm * M.SPEC.gear)} rpm`,
  },
  generator: {
    name: "Generator",
    does: "A doubly fed induction generator. Its stator feeds the grid directly while a converter feeds its rotor through slip rings, so it makes grid-frequency power across a range of speeds around 1,500 rpm.",
    live: (s, M) => {
      const n = s.rpm * M.SPEC.gear;
      if (n < 1) return "stopped";
      const slip = ((n - SYNC) / SYNC) * 100;
      return `${kWText(s.kW)} · ${rpmText(n)} rpm · ${Math.abs(slip).toFixed(0)}% ${slip >= 0 ? "above" : "below"} synchronous`;
    },
  },
  cables: {
    name: "Power cables",
    does: "Carry the generator's output to the converter cabinet, and from there down the tower to the transformer kiosk at its foot.",
    live: (s) => `carrying ${kWText(s.kW)}`,
  },
  cabinets: {
    name: "Controller and converter",
    does: "The controller reads the wind sensors and rotor speed and sets pitch, yaw and generator torque many times a second. The converter handles the power through the generator's rotor so the output stays at grid frequency.",
    live: (s, M) => {
      const n = s.rpm * M.SPEC.gear;
      const rotorKW = n > 1 ? (Math.abs(n - SYNC) / SYNC) * s.kW : 0;
      return `${M.phaseWord(s)} · rotor circuit ${Math.round(rotorKW)} kW`;
    },
  },
  hydraulics: {
    name: "Hydraulic unit",
    does: "A pump, accumulator and valves that supply the brake caliper through the hose; the gauge shows the brake line pressure.",
    live: (s) => `${bar(s)} bar at the caliper`,
  },
  yaw: {
    name: "Yaw system",
    does: "Four electric motors drive pinions round the toothed ring fixed to the top of the tower, turning the whole nacelle to face the wind the vane reports. They start when the misalignment passes a few degrees and stop when it is gone.",
    live: (s) => `heading ${String(Math.round(((s.yaw % 360) + 360) % 360)).padStart(3, "0")}° · ${Math.abs(s.yawErr).toFixed(1)}° off the wind · ${s.yawing ? "turning" : "holding"}`,
  },
  frame: {
    name: "Bedplate and rear frame",
    does: "The cast bedplate sits on the yaw bearing and carries the main bearing, gearbox and yaw drives; the welded rear frame reaches back from it to carry the generator and cabinets.",
    live: () => "carries the rotor, drivetrain and generator",
  },
  cooler: {
    name: "Cooler and beacon",
    does: "A radiator on the roof that sheds the heat lost in the gearbox, generator and converter. The beacon on top is the aviation warning light.",
    live: (s) => `shedding ≈ ${Math.round(Math.max(0, s.aero - s.kW))} kW of losses`,
  },
  sensors: {
    name: "Wind sensors",
    does: "The cup anemometer measures the wind's speed and the vane its direction relative to the nacelle. The controller uses them to decide when to start, stop and yaw.",
    live: (s) => `${s.v.toFixed(1)} m/s · ${Math.abs(s.yawErr).toFixed(1)}° off the nose`,
  },
  crane: {
    name: "Service crane",
    does: "A trolley hoist on a beam along the nacelle wall, for lifting parts and tools during maintenance.",
    live: () => "parked",
  },
  canopy: {
    name: "Nacelle cover",
    does: "The glass-fibre housing that keeps the weather off the machinery. Here its near wall, front and most of its roof are cut away.",
    live: () => "cut open for this view",
  },
  tower: {
    name: "Tower",
    does: "A conical steel tube, 70 m to the hub, built in bolted sections. The yaw bearing on its top flange lets the nacelle turn.",
    live: () => "top section · yaw bearing on its flange",
  },
};

// Numbered along the power path, then the systems around it.
export const ORDER = ["hub", "pitch", "rotorlock", "mainshaft", "mainbearing", "gearbox", "hss", "brake", "coupling", "generator", "cables", "cabinets", "hydraulics", "yaw", "frame", "cooler", "sensors", "crane", "canopy", "tower"];

// Which component a recorded item of the nacelle build belongs to, by its name.
const PREFIX = [
  ["stand.tower", "tower"],
  ["tower.", "tower"],
  ["yaw.", "yaw"],
  ["canopy.", "canopy"],
  ["roof.cooler", "cooler"],
  ["roof.light", "cooler"],
  ["roof.", "sensors"],
  ["bedplate", "frame"],
  ["frame.", "frame"],
  ["bearing.", "mainbearing"],
  ["mainshaft", "mainshaft"],
  ["mainflange", "mainshaft"],
  ["rotorlock", "rotorlock"],
  ["gearbox.", "gearbox"],
  ["hss", "hss"],
  ["brake.", "brake"],
  ["coupling", "coupling"],
  ["gen", "generator"],
  ["hyd.", "hydraulics"],
  ["hose", "hydraulics"],
  ["cabinet", "cabinets"],
  ["cable", "cables"],
  ["crane.", "crane"],
  ["chain", "crane"],
];
export function compOf(name) {
  for (const [prefix, key] of PREFIX) if (name.startsWith(prefix)) return key;
  throw new Error(`parts: no component for ${name}`);
}
