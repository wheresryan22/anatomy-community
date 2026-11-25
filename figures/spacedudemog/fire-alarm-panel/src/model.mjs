// The panel's behaviour as one pure state machine. The build imports the constants and
// inlines SOURCE into the page, so the figure, its readout and its caption share one model.

export const CLEAN_AIR = 0.3; // %/ft obscuration a photoelectric head reads in clean air
export const PHOTO_ALARM = 2.5; // %/ft alarm threshold, inside UL 268's 0.5–4.0 %/ft window
export const HEAT_FIXED_F = 135; // °F fixed-temperature heat detector
export const ROOM_F = 72;
export const POLL_S = 0.7; // one address per 0.7 s, slowed for the eye
export const STROBE_HZ = 1; // synchronized strobes flash once a second
export const BATTERY_AH = 18;
export const RETARD_S = 5; // waterflow retard, set short here (switches allow about 0–90 s)
export const COMM_S = 3; // communicator dials out and gets the receiver's acknowledgement

export const CAPTION =
  "An addressable panel talks to every device on one pair of wires, the signalling line circuit. It sends each address in turn, " +
  "and only that device answers, with a reading: smoke obscuration in %/ft, temperature, or a contact state. When smoke detector 002 reads " +
  `${PHOTO_ALARM} %/ft or more (UL 268 allows 0.5–4.0), or the pull station's switch opens, or water keeps flowing past the riser's paddle switch for its retard time (5 s here; 0–90 s in the field), the panel latches a fire alarm, lights its red LED, ` +
  "and puts 24 V on the notification circuit: the horn sounds the temporal-three pattern (0.5 s on, 0.5 off, three times, then 1.5 s off) and the strobe " +
  "flashes once a second. Acknowledge stops the panel buzzer and steadies the LED; silence stops the horn but leaves the strobe flashing; reset clears the alarm only once nothing is still in alarm. " +
  "The loop leaves and returns to the panel (Class A), so one break still leaves every device reachable from one end. In standby the panel watches the notification circuit through the end-of-line resistor. " +
  `A communicator under the cabinet reports every alarm to a monitoring centre. Two 12 V ${BATTERY_AH} Ah batteries in series carry the system for 24 hours plus 5 minutes of alarm if mains power fails. Polling is slowed for the eye.`;

// Everything below is also emitted into the page as source.
export function createPanel() {
  const DEVICES = [
    { addr: "001", id: "d1", type: "PHOTO" },
    { addr: "002", id: "d2", type: "PHOTO" },
    { addr: "003", id: "d3", type: "HEAT" },
    { addr: "004", id: "pull", type: "PULL" },
    { addr: "005", id: "flow", type: "FLOW" },
  ];
  const state = {
    obscuration: CLEAN_AIR,
    smokeOn: false,
    pulled: false,
    flowOn: false,
    flowClock: 0,
    alarm: null,
    acked: false,
    silenced: false,
    drill: false,
    resetting: 0,
    poll: 0,
    pollClock: 0,
    pollFlash: 0,
    blink: {},
    last: null,
    nacClock: 0,
    commClock: 0,
  };
  const reading = (dev) => {
    if (dev.type === "PHOTO") return dev.id === "d2" ? state.obscuration : CLEAN_AIR;
    if (dev.type === "HEAT") return ROOM_F;
    if (dev.type === "FLOW") return state.flowOn ? 1 : 0;
    return state.pulled ? 1 : 0;
  };
  const inAlarm = (dev) => {
    const value = reading(dev);
    if (dev.type === "PHOTO") return value >= PHOTO_ALARM;
    if (dev.type === "HEAT") return value >= HEAT_FIXED_F;
    if (dev.type === "FLOW") return state.flowClock >= RETARD_S;
    return value === 1;
  };
  const describe = (dev, value) => {
    if (dev.type === "PHOTO") return `${dev.addr} PHOTO ${value.toFixed(1)}%/FT`;
    if (dev.type === "HEAT") return `${dev.addr} HEAT ${value}F`;
    if (dev.type === "FLOW") return `${dev.addr} FLOW ${value ? "ACTIVE" : "NORMAL"}`;
    return `${dev.addr} PULL ${value ? "PULLED" : "NORMAL"}`;
  };
  function pollNext() {
    const dev = DEVICES[state.poll];
    const value = reading(dev);
    state.last = { dev, value };
    state.blink[dev.id] = 0.18;
    state.pollFlash = 0.22;
    if (!state.resetting && !state.alarm && inAlarm(dev)) {
      state.alarm = dev;
      state.acked = false;
      state.silenced = false;
      state.nacClock = 0;
      state.commClock = 0;
    }
    state.poll = (state.poll + 1) % DEVICES.length;
  }
  function step(dt) {
    const target = state.smokeOn ? 3.2 : CLEAN_AIR;
    const tau = state.smokeOn ? 2.4 : 3;
    state.obscuration += (target - state.obscuration) * (1 - Math.exp(-dt / tau));
    state.flowClock = state.flowOn ? state.flowClock + dt : 0;
    state.pollClock += dt;
    while (state.pollClock >= POLL_S) {
      state.pollClock -= POLL_S;
      pollNext();
    }
    state.pollFlash = Math.max(0, state.pollFlash - dt);
    for (const id in state.blink) state.blink[id] = Math.max(0, state.blink[id] - dt);
    if (state.resetting) state.resetting = Math.max(0, state.resetting - dt);
    state.nacClock += dt;
    state.commClock += dt;
  }
  function settle() {
    state.obscuration = state.smokeOn ? 3.2 : CLEAN_AIR;
    for (let i = 0; i < DEVICES.length; i++) pollNext();
    state.resetting = 0;
  }
  const temporal3 = (t) => {
    const c = t % 4; // 0.5 on, 0.5 off, ×3, then 1.5 off
    return c < 3 && c % 1 < 0.5;
  };
  function view(t) {
    const nac = (!!state.alarm || state.drill) && !state.resetting;
    const nt = state.nacClock;
    const strobe = nac && nt % (1 / STROBE_HZ) < 0.12;
    const horn = nac && !state.silenced && temporal3(nt);
    const leds = { ac: "green", fire: null, supv: null, trbl: null, sil: state.silenced ? "amber" : null };
    if (state.alarm) leds.fire = state.acked || Math.floor(t * 2) % 2 === 0 ? "red" : null;
    const sent = !!state.alarm && state.commClock >= COMM_S;
    leds.comm = state.alarm ? (sent ? "green" : Math.floor(t * 4) % 2 ? "amber" : null) : null;
    for (const dev of DEVICES) {
      if (state.alarm && state.alarm.id === dev.id) leds[dev.id] = "red";
      else leds[dev.id] = state.blink[dev.id] > 0 ? "green" : null;
    }
    let lcd, readout;
    const last = state.last;
    if (state.resetting) {
      lcd = ["SYSTEM RESET", "IN PROGRESS"];
      readout = "Resetting";
    } else if (state.alarm) {
      const a = state.alarm;
      const what = a.type === "PHOTO" ? `PHOTO ${reading(a).toFixed(1)}%/FT` : a.type === "HEAT" ? "HEAT" : a.type === "FLOW" ? "WATERFLOW" : "PULL STATION";
      lcd = [`FIRE ALARM ${a.addr}${state.silenced ? " SIL" : state.acked ? " ACK" : ""}`, what];
      const dev = a.type === "PHOTO" ? `${a.addr} smoke ${reading(a).toFixed(1)} %/ft` : a.type === "FLOW" ? `${a.addr} waterflow` : `${a.addr} pull station`;
      readout = `Fire alarm · ${dev} · ${state.silenced ? "silenced" : sent ? "reported" : "reporting…"}`;
    } else if (state.drill) {
      lcd = ["DRILL ACTIVE", "NAC 1 ON"];
      readout = "Drill · horn and strobe on";
    } else {
      lcd = ["SYSTEM NORMAL", last ? describe(last.dev, last.value) : "POLLING"];
      const word = { PHOTO: () => last.value.toFixed(1) + " %/ft", HEAT: () => last.value + " °F", PULL: () => (last.value ? "pulled" : "not pulled"), FLOW: () => (last.value ? "water flowing" : "no flow") };
      readout = last ? `Normal · ${last.dev.addr} · ${word[last.dev.type]()}` : "Normal";
    }
    return { leds, lcd, readout, poll: state.pollFlash > 0, nac, horn, strobe };
  }
  return {
    state,
    step,
    view,
    settle,
    smoke(on) { state.smokeOn = on; },
    pull() { state.pulled = true; },
    flow(on) { state.flowOn = on; },
    ack() { if (state.alarm) state.acked = true; },
    silence() { if (state.alarm || state.drill) { state.silenced = true; state.acked = true; } },
    drill() { state.drill = !state.drill; state.silenced = false; state.nacClock = 0; },
    reset() {
      state.alarm = null; state.acked = false; state.silenced = false; state.drill = false;
      state.pulled = false; state.resetting = 2.5;
    },
  };
}

export const SOURCE = [
  `const CLEAN_AIR = ${CLEAN_AIR}, PHOTO_ALARM = ${PHOTO_ALARM}, HEAT_FIXED_F = ${HEAT_FIXED_F}, ROOM_F = ${ROOM_F}, POLL_S = ${POLL_S}, STROBE_HZ = ${STROBE_HZ}, COMM_S = ${COMM_S}, RETARD_S = ${RETARD_S};`,
  createPanel.toString(),
].join("\n");
