// Live behaviour for Fig 1. `HERO` (paths, lid frames, hit areas) is written
// in front of this file by the build. Everything shown comes from MODEL below,
// which follows the relay: a held session answers tool calls with 503
// "reconnecting" (Retry-After 2) for up to 24 h; an ended one is gone, and a
// reconnect after Stop is a new link.

const HOLD_HOURS = 24
const MODEL = {
  links: [{ plugged: true, n: 1 }, { plugged: true, n: 1 }],   // n: which link this is (a new one after Stop)
  awake: true,                                                    // the laptop's lid
  heldSince: null,
  answered: 0,
  // What the relay does with a call on `link`.
  answer(link) {
    if (!this.links[link].plugged) return "ended"
    if (link === 0 && !this.awake) return "retry"
    return "ok"
  },
}

const stage = document.querySelector("[data-hero]")
const svg = stage.querySelector("svg")
const $ = (part) => svg.querySelector(`[data-part="${part}"]`)
const readout = stage.closest(".iso-plate").querySelector("[data-readout]")
const status = document.querySelector("[data-hero-status]")
const still = matchMedia("(prefers-reduced-motion: reduce)")
const SVG_NS = "http://www.w3.org/2000/svg"

const lid = $("lid"), screen = $("screen"), beads = $("beads"), counter = $("counter")
const plugs = [$("plug-0"), $("plug-1")], lamps = [$("lamp-0"), $("lamp-1")]
const dialHand = $("dial-hand"), dialArc = $("dial-arc"), ext = $("ext"), pill = $("pill")
const ledsOf = (caller) => svg.querySelectorAll(`[data-caller="${caller}"]`)

// ── paths ───────────────────────────────────────────────────────────
const route = (name) => {
  const { xy, hidden } = HERO.paths[name]
  const pts = []
  for (let i = 0; i < xy.length; i += 2) pts.push([xy[i], xy[i + 1]])
  const len = [0]
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return { pts, len, total: len[len.length - 1], hidden }
}
const ROUTES = { link0: route("link0"), link1: route("link1"), caller0: route("caller0"), caller1: route("caller1"), caller2: route("caller2") }
const pointAt = (r, s) => {
  s = Math.max(0, Math.min(r.total, s))
  let lo = 0, hi = r.len.length - 1
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (r.len[mid] < s) lo = mid; else hi = mid }
  const t = (s - r.len[lo]) / (r.len[hi] - r.len[lo] || 1)
  const a = r.pts[lo], b = r.pts[hi]
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, i: t < 0.5 ? lo : hi }
}

// ── state shown in the drawing ───────────────────────────────────────
let lidAt = 1, lidWant = 1                 // 0 shut … 1 open
const plugAt = [0, 0], plugWant = [0, 0]   // 0 in … 1 pulled
let lidFrame = -1
function drawLid() {
  const i = Math.round(lidAt * (HERO.lids.length - 1))
  if (i !== lidFrame) {
    lidFrame = i
    lid.innerHTML = HERO.lids[i].svg
    screen.setAttribute("transform", HERO.lids[i].screen)
  }
  screen.style.opacity = String(Math.max(0, Math.min(1, (lidAt - 0.55) / 0.3)))
}
function drawPlug(i) {
  const dy = -plugAt[i] * HERO.pull
  plugs[i].setAttribute("transform", dy ? `translate(0 ${dy.toFixed(2)})` : "")
  plugs[i].querySelectorAll("[data-hold]").forEach((n) => (dy ? n.setAttribute("transform", `translate(0 ${(-dy).toFixed(2)})`) : n.removeAttribute("transform")))
}
function drawLamps(now) {
  const held = MODEL.heldSince !== null
  lamps.forEach((lamp, i) => {
    const live = MODEL.links[i].plugged && plugAt[i] < 0.5
    const on = live && (i !== 0 || !held || Math.floor(now / 600) % 2 === 0)
    lamp.toggleAttribute("data-on", on)
  })
  ext.toggleAttribute("data-on", MODEL.links[0].plugged)
  pill.style.display = MODEL.links[0].plugged ? "" : "none"
}
function drawDial(now) {
  const held = MODEL.heldSince !== null
  const share = held ? Math.min(1, (now - MODEL.heldSince) / (HOLD_HOURS * 3600e3)) : 0
  const a = share * Math.PI * 2, r = 12.6
  dialHand.setAttribute("d", `M${(-Math.sin(a) * 3).toFixed(2)} ${(Math.cos(a) * 3).toFixed(2)}L${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`)
  // the window still open: from the hand round to 24 h
  if (held) {
    const a1 = Math.PI * 2 - 1e-3, R = 10
    const p = (t) => `${(Math.sin(t) * R).toFixed(2)} ${(-Math.cos(t) * R).toFixed(2)}`
    dialArc.setAttribute("d", `M${p(a)}A${R} ${R} 0 ${a1 - a > Math.PI ? 1 : 0} 1 ${p(a1)}`)
  } else dialArc.setAttribute("d", "")
}

// ── calls ───────────────────────────────────────────────────────────
// A call: out along the caller's cord, a beat in the switchboard, then out
// along the link's cord and back (ok), or straight back (retry / ended).
const SPEED = 190                          // px per second on screen
const calls = []
let nextCall = 0, seq = 0, auto = true
const PATTERN = [[0, 0], [2, 0], [1, 1], [0, 0], [1, 0], [2, 1], [0, 0], [1, 0]]   // [caller, link]
function startCall(now, pick, done) {
  const [caller, link] = pick ?? PATTERN[seq++ % PATTERN.length]
  if (pick) seq++
  const el = document.createElementNS(SVG_NS, "circle")
  el.setAttribute("r", "2.6")
  el.setAttribute("class", "as-bead")
  beads.append(el)
  calls.push({ caller, link, el, phase: "in", s: 0, wait: 0, verdict: null, done: false, resolve: done })
  ledsOf(caller).forEach((n) => n.setAttribute("data-on", ""))
  setTimeout(() => ledsOf(caller).forEach((n) => n.removeAttribute("data-on")), 320)
}
function stepCall(c, dt, now) {
  const cr = ROUTES[`caller${c.caller}`], lr = ROUTES[`link${c.link}`]
  const ds = SPEED * dt
  let at = null, hide = false
  const mask = lidAt > 0.5 ? 0 : 1
  if (c.phase === "in") {
    c.s += ds; at = pointAt(cr, c.s)
    if (c.s >= cr.total) { c.phase = "switch"; c.wait = 0.22; c.verdict = MODEL.answer(c.link) }
  } else if (c.phase === "switch") {
    c.wait -= dt; hide = true
    if (c.wait <= 0) {
      if (c.verdict === "ok") { c.phase = "out"; c.s = 0 }
      else { c.phase = "back"; c.s = cr.total; c.el.setAttribute("class", "as-bead as-bead-turned") }
    }
  } else if (c.phase === "out") {
    c.s += ds; at = pointAt(lr, c.s); hide = lr.hidden[mask][at.i] === "1"
    if (c.s >= lr.total) { c.phase = "there"; c.wait = 0.3; land(c) }
  } else if (c.phase === "there") {
    c.wait -= dt; hide = true
    if (c.wait <= 0) { c.phase = "return"; c.s = lr.total }
  } else if (c.phase === "return") {
    c.s -= ds; at = pointAt(lr, c.s); hide = lr.hidden[mask][at.i] === "1"
    if (c.s <= 0) { c.phase = "switch2"; c.wait = 0.12 }
  } else if (c.phase === "switch2") {
    c.wait -= dt; hide = true
    if (c.wait <= 0) { c.phase = "back"; c.s = cr.total }
  } else if (c.phase === "back") {
    c.s -= ds; at = pointAt(cr, c.s)
    if (c.s <= 0) {
      if (c.verdict === "ok") { MODEL.answered++; counter.textContent = String(MODEL.answered).padStart(4, "0") }
      c.done = true
      c.resolve?.(c.verdict)
    }
  }
  if (at) { c.el.setAttribute("cx", at.x.toFixed(1)); c.el.setAttribute("cy", at.y.toFixed(1)) }
  c.el.style.opacity = hide || !at ? "0" : "1"
}
function land(c) {
  // the tab or the app does the work: a row or a card lights for a moment
  const el = c.link === 0 ? $(`row-${seq % 4}`) : $(`card-${seq % 3}-0`)
  if (!el) return
  el.setAttribute("data-on", "")
  setTimeout(() => el.removeAttribute("data-on"), 420)
}

// ── the readout ─────────────────────────────────────────────────────
let said = ""
function say(now) {
  const L0 = MODEL.links[0]
  let text
  if (!L0.plugged) text = "plug pulled · that link is dead · its calls are turned away"
  else if (!MODEL.awake) {
    const s = Math.floor((now - MODEL.heldSince) / 1000)
    text = `laptop asleep · line held ${s} s of ${HOLD_HOURS} h · calls told to retry`
  } else text = `${L0.n > 1 ? "a new link · " : ""}both links live · ${MODEL.answered} ${MODEL.answered === 1 ? "call" : "calls"} answered`
  if (text !== said) { said = text; readout.textContent = text }
}
let lastStatus = ""
function announce(text) {
  if (status && text !== lastStatus) { lastStatus = text; status.textContent = text }
}

// ── actions ─────────────────────────────────────────────────────────
function setPlug(i, pulled) {
  plugWant[i] = pulled ? 1 : 0
  const L = MODEL.links[i]
  if (pulled && L.plugged) { L.plugged = false; announce(`Stop: the ${i ? "app's" : "laptop's"} link is dead.`) }
  if (!pulled && !L.plugged) { L.plugged = true; L.n++; announce(`Plugged back in: a new link for the ${i ? "app" : "laptop"}.`) }
}
function setLid(open, now) {
  lidWant = open ? 1 : 0
  if (!open && MODEL.awake) { MODEL.awake = false; MODEL.heldSince = now; announce("The laptop sleeps: the switchboard holds its line.") }
  if (open && !MODEL.awake) { MODEL.awake = true; MODEL.heldSince = null; announce("The laptop wakes: the same link carries on.") }
}

// ── the tour ────────────────────────────────────────────────────────
const TOUR = 30
let touring = true, clock = 0, idle = 0
function tour(now) {
  const t = clock % TOUR
  setLid(!(t > 8 && t < 14.5), now)
  setPlug(0, t > 19 && t < 25)
}

// ── loop ────────────────────────────────────────────────────────────
let frame = 0, last = 0, visible = false
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60
  last = now
  if (touring) { clock += dt; tour(now) } else if ((idle += dt) > 9) { touring = !still.matches; clock = 0 }
  const ease = (x, want, sec) => (still.matches ? want : x + (want - x) * (1 - Math.exp(-dt / sec)))
  lidAt = ease(lidAt, lidWant, 0.16); if (Math.abs(lidAt - lidWant) < 0.002) lidAt = lidWant
  for (const i of [0, 1]) { plugAt[i] = ease(plugAt[i], plugWant[i], 0.09); if (Math.abs(plugAt[i] - plugWant[i]) < 0.002) plugAt[i] = plugWant[i]; drawPlug(i) }
  drawLid()
  if (!still.matches) {
    if (auto && now >= nextCall) { startCall(now); nextCall = now + 1150 }
    for (const c of calls) stepCall(c, dt, now)
    for (let i = calls.length - 1; i >= 0; i--) if (calls[i].done) { calls[i].el.remove(); calls.splice(i, 1) }
  }
  drawLamps(now); drawDial(now); say(now)
  frame = visible || calls.length ? requestAnimationFrame(tick) : 0
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick) } }
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run() }, { rootMargin: "80px 0px" }).observe(stage)

function hand() { touring = false; idle = 0; run() }
const hit = (name, d, label, act) => {
  const p = document.createElementNS(SVG_NS, "path")
  p.setAttribute("d", d); p.setAttribute("class", "as-hit"); p.setAttribute("aria-hidden", "true")
  p.addEventListener("click", () => { hand(); act(performance.now()) })
  svg.append(p)
}
hit("plug0", HERO.hits.plug0, "plug", () => setPlug(0, MODEL.links[0].plugged))
hit("plug1", HERO.hits.plug1, "plug", () => setPlug(1, MODEL.links[1].plugged))
hit("laptop", HERO.hits.laptop, "laptop", (now) => setLid(!MODEL.awake, now))
stage.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase()
  if (key === "p") { hand(); setPlug(0, MODEL.links[0].plugged) }
  else if (key === "a") { hand(); setPlug(1, MODEL.links[1].plugged) }
  else if (key === "l") { hand(); setLid(!MODEL.awake, performance.now()) }
  else return
  e.preventDefault()
})
if (still.matches) touring = false
drawLid(); drawLamps(performance.now()); drawDial(performance.now()); say(performance.now())

// ── API for the page's live demo (an agent drives the figure) ──────────
const CALLER_OF = { script: 0, terminal: 1, cloud: 2 }
const LINK_OF = { laptop: 0, app: 1 }
const quick = (verdict) => Promise.resolve(verdict)
window.heroFigure = {
  // Stop the tour and the automatic calls; from now on only the agent acts.
  // The tour's calls still in flight are dropped and the figure goes back to
  // rest (both plugs in, lid open, count at zero), so it shows only what the
  // agent does.
  takeOver() {
    touring = false; auto = false; idle = -Infinity
    for (const c of calls.splice(0)) c.el.remove()
    const now = performance.now()
    setPlug(0, false); setPlug(1, false); setLid(true, now)
    MODEL.answered = 0; counter.textContent = "0000"
    run()
  },
  release() { auto = true; idle = 0; run() },
  state: () => ({
    laptop_link: MODEL.links[0].plugged ? "plugged in" : "pulled",
    app_link: MODEL.links[1].plugged ? "plugged in" : "pulled",
    laptop: MODEL.awake ? "awake" : "asleep (the switchboard holds its line)",
    calls_answered: MODEL.answered,
  }),
  setPlug(link, pulled) { setPlug(LINK_OF[link], pulled); run() },
  setLid(open) { setLid(open, performance.now()); run() },
  // Send a call and resolve with what the relay did: "ok", "retry" or "ended".
  send(from, to) {
    const pick = [CALLER_OF[from], LINK_OF[to]]
    if (still.matches || !visible) {
      const verdict = MODEL.answer(pick[1])
      if (verdict === "ok") { MODEL.answered++; counter.textContent = String(MODEL.answered).padStart(4, "0") }
      return quick(verdict)
    }
    return new Promise((resolve) => { startCall(performance.now(), pick, resolve); run() })
  },
}
