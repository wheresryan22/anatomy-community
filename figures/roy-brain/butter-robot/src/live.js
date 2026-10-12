const DATA = __DATA__;
const GLD = DATA.gl;
const stage = document.querySelector(".br-stage");
const plate = stage.closest(".iso-plate");
const figure = stage.closest(".iso-figure");
const readout = plate.querySelector("[data-readout]");
const liveRegion = stage.querySelector("[data-say]");
const halo = stage.querySelector("[data-halo]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const passBtn = figure.querySelector('[data-act="pass"]');
const apartBtn = figure.querySelector('[data-act="apart"]');
const partBtns = [...figure.querySelectorAll(".br-part")];
const LIGHT = (stage.closest("[data-theme]")?.getAttribute("data-theme") ?? "dark") !== "dark" ? 1 : 0;

let fetchT = 0;       // where the pass-butter clip is, 0 … FETCH
let fetchDir = 0;     // +1 passing, -1 taking it back
let apartE = 0;       // 0 assembled … 1 apart
let apartDir = 0;
let view = 0;         // the table's turn, degrees
let viewTarget = 0;
let spin = null;      // the tour's slow orbit
let rec = null;       // pulling itself together before it takes the butter back
let queued = null;
let touring = !still.matches;
let tourStep = 0;
let tourWait = 1.2;
let idle = 0;
let selected = null;
let frame = 0;
let last = 0;
let clock = 0;
let visible = false;
let lastPhase = "";
let drawn = "";
let setMs = 0;
let half = false;
let odd = false;

const controller = TURN.mount(stage, DATA.turn, { onHold: () => { touring = false; clearTimeout(idle); } });

// ---- the camera, for the halo under the turning table ----
const CAM = GLD.camera;
const isoPt = ([x, y, z]) => [CAM.origin[0] + (x * CAM.cam[0] - y * CAM.cam[1]) * CAM.k, CAM.origin[1] + ((x * CAM.cam[1] + y * CAM.cam[0]) * CAM.cam[2] - z * CAM.cam[3]) * CAM.k];
const turned = ([x, y], deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), dx = x - GLD.view[0], dy = y - GLD.view[1]; return [GLD.view[0] + dx * c - dy * s, GLD.view[1] + dx * s + dy * c]; };
function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
let haloAt = null;
function drawHalo() {
  if (haloAt === view) return;
  haloAt = view;
  const pts = [];
  for (const q of GLD.ring) { const [x, y] = turned(q, view); pts.push(isoPt([x, y, -GLD.tableH]), isoPt([x, y, 0])); }
  halo.setAttribute("d", "M" + hull(pts).map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L") + "Z");
}

// ---- tread grousers: lines on each belt's top run that slide as the belt turns ----
const treads = DATA.treads.map((t) => ({ ...t, lines: [...stage.querySelectorAll(`[data-tread="${t.side}"] [data-g]`)] }));
const fade = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let treadsAt = null;
function drawTreads(t) {
  if (treadsAt === t) return;
  treadsAt = t;
  const run = treadAt(t);
  for (const tr of treads) {
    const span = tr.count * tr.pitch;
    const shift = ((run[tr.side] % span) + span) % span;
    tr.lines.forEach((el, i) => {
      const u = (i * tr.pitch + shift) % span;
      const alpha = fade(0, 3.5, u) * (1 - fade(tr.length - 3.5, tr.length, u));
      el.setAttribute("d", `M${u.toFixed(2)} 0L${u.toFixed(2)} 22`);
      el.setAttribute("opacity", alpha.toFixed(2));
    });
  }
}

// ---- power: a pulse climbs the mast conduit, faster while it works; it stops when the battery is unplugged ----
const pulses = [...stage.querySelectorAll("[data-pulse]")];
function drawPulses(phase, power) {
  pulses.forEach((el, i) => {
    const x = (((phase - i * 0.1) % 1) + 1) % 1;
    const b = Math.exp(-x * 7) + Math.exp(-(1 - x) * 40) * 0.6;
    el.style.opacity = ((0.12 + 0.88 * b) * power).toFixed(3);
  });
}

// ---- highlight: the selected part, or whoever is talking, or whatever is working right now ----
const byPart = new Map(DATA.parts.map((p) => [p.id, p]));
const nodes = [...stage.querySelectorAll(".iso-live [data-name]")];
let litNow = null;
function light(id) {
  if (id === litNow) return;
  litNow = id;
  const part = id ? byPart.get(id) : null;
  for (const el of nodes) {
    const on = part && part.prefix.some((p) => el.dataset.name.startsWith(p));
    if (on) el.setAttribute("data-lit", "");
    else el.removeAttribute("data-lit");
  }
  partBtns.forEach((b) => b.toggleAttribute("data-on", b.dataset.part === id));
}
const WORKING = { backing: "drive", turning: "drive", driving: "drive", carrying: "drive", reaching: "arms", gripping: "arms", lifting: "arms", placing: "arms", releasing: "arms" };

// ---- what is said: a caption over the stage, word by word where it hits hard ----
const caption = stage.querySelector("[data-line]");
const captionWho = caption.querySelector("[data-who]");
const captionText = caption.querySelector("[data-text]");
let saying = null;
let wordEls = [];
function speak(line) {
  const key = line ? line.text : null;
  if (key !== saying) {
    saying = key;
    if (line) {
      captionWho.textContent = line.who;
      caption.dataset.who = line.who.toLowerCase();
      if (line.words) { captionText.innerHTML = line.words.map(([w]) => `<span class="br-word">${w}</span>`).join(" "); wordEls = [...captionText.querySelectorAll(".br-word")]; }
      else { captionText.textContent = line.text; wordEls = []; }
      announce(`${line.who}: ${line.text}`);
    }
  }
  caption.style.opacity = line ? line.alpha.toFixed(3) : "0";
  if (line && line.words) line.words.forEach(([, a], i) => { if (wordEls[i]) { wordEls[i].style.opacity = a.toFixed(3); wordEls[i].style.transform = `translateY(${((1 - a) * 6).toFixed(2)}px) scale(${(1 + (1 - a) * 0.25).toFixed(3)})`; } });
}

// ---- readout ----
const D = 1 / 30;
const round = (x) => Math.round(x);
function sayOf(st, dir) {
  if (selected) return byPart.get(selected).say;
  if (apartE > 0 || apartDir) {
    if (apartDir > 0 && apartE < 1) return "taking it apart";
    if (apartDir < 0 && apartE > 0) return "closing up";
    return `apart · ${APART.length} assemblies · battery unplugged`;
  }
  const back = dir < 0;
  const next = stateAt(Math.min(FETCH, fetchT + D));
  const prev = stateAt(Math.max(0, fetchT - D));
  const speed = (a, b) => Math.abs(a - b) / (2 * D);
  switch (st.phase) {
    case "home": return back ? "home · butter back on the dish" : "home · butter on the dish";
    case "asked": return back ? "home again" : "asked to pass the butter";
    case "backing": return `backing off to turn · ${round(st.yaw > 90 ? TRAVEL - st.drive : st.drive)} of ${BACKUP} mm`;
    case "turning": return `turning in place · tracks ±${round((speed(next.yaw, prev.yaw) * Math.PI / 180) * TRACK_Y)} mm/s`;
    case "driving": return back ? `returning · ${round(TRAVEL - st.drive)} mm to go` : `driving · ${round(TRAVEL - st.drive)} mm to the butter`;
    case "reaching": return `leaning ${round(st.lean)}° · eye on the butter`;
    case "gripping": return st.grip < 0.02 ? (back ? "opening the claws" : "closing the claws") : back ? `letting go · ${(st.grip * GRIP_N).toFixed(1)} N` : `gripping · ${(st.grip * GRIP_N).toFixed(1)} N`;
    case "lifting": return back ? `setting ${BUTTER.g} g down` : `lifting ${BUTTER.g} g · level`;
    case "carrying": return back ? `carrying it back · ${round(st.drive)} mm to go` : `carrying ${BUTTER.g} g · ${round(st.drive)} mm to go`;
    case "placing": return st.grip > 0.02 && st.grip < 0.98 ? `${back ? "gripping" : "letting go"} · ${(st.grip * GRIP_N).toFixed(1)} N` : back ? "reaching for the butter" : "setting it on the pancakes";
    case "releasing": case "retracting": return back ? "reaching for the butter" : "butter passed";
    case "purpose": return back ? "taking it back" : "asking its purpose";
    case "answer": return back ? "taking it back" : "told: you pass butter";
    case "recovering": return "pulling itself together";
    case "realising": return back ? "taking it back" : fetchT > 27.8 ? "purpose: pass butter · power low" : "purpose: pass butter";
    default: return st.phase;
  }
}
const announce = (text) => { if (liveRegion.textContent !== text) liveRegion.textContent = text; };

// ---- light: the eye's pool on the table (under everything) and steam off the pancakes (over everything) ----
const INK = `
uniform float uLight;
vec4 inkFor(vec3 seen,float cover){vec3 absorbed=1.-seen;float a=max(max(absorbed.r,max(absorbed.g,absorbed.b)),cover);return vec4(vec3(a)-absorbed,a);}
vec4 finish(vec4 ink,vec2 frag){ink.rgb=min(ink.rgb,vec3(ink.a));float n=(hash12(frag+fract(uTime*.61)*91.)+hash12(frag.yx*1.37+fract(uTime*.37)*57.)-1.)/255.;return clamp(ink+vec4(n)*smoothstep(0.,1.5/255.,ink.a),0.,1.);}
`;
const f1 = (x) => Number(x).toFixed(3);
const v3 = (a) => `vec3(${a.map(f1).join(",")})`;
const POOL = `${glslPose("View", "uView")}${INK}
uniform vec3 uEye;
uniform vec3 uDir;
uniform float uBeam;
const vec4 TABLE=vec4(${GLD.table.slice(0, 4).map(f1).join(",")});
const float TR=${f1(GLD.table[4])};
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 p=onFloor(vb,0.);
  vec3 q=toView(p);
  vec2 c=TABLE.xy+TABLE.zw*.5;
  vec2 d=abs(q.xy-c)-(TABLE.zw*.5-TR);
  float sd=length(max(d,0.))+min(max(d.x,d.y),0.)-TR;
  float onTable=1.-smoothstep(-7.,-1.5,sd);
  vec3 l=p-uEye;
  float dist=length(l);
  l/=dist;
  float cone=smoothstep(.79,.95,dot(l,uDir));
  float lambert=clamp(-l.z,0.,1.);
  float e=uBeam*cone*lambert*onTable*26000./(dist*dist+9000.);
  e=1.-exp(-1.5*e);
  vec3 tint=vec3(.50,.84,.98);
  vec4 light=inkFor(mix(vec3(1.),tint,.62*e),0.)*.92;
  vec4 dark=vec4(vec3(.32,.78,1.)*e*.55,e*.55);
  gl_FragColor=finish(mix(dark,light,uLight),gl_FragCoord.xy);
}`;
const STEAM = `${glslPose("Head", "uHead")}${glslPose("Mast", "uMast")}${glslPose("Butter", "uBut")}${INK}
uniform vec3 uSrc;
uniform float uSteam;
const vec3 HMIN=${v3(GLD.head.min)};const vec3 HMAX=${v3(GLD.head.max)};
const vec3 MMIN=${v3(GLD.mast.min)};const vec3 MMAX=${v3(GLD.mast.max)};
const vec3 BMIN=${v3(GLD.butter.min)};const vec3 BMAX=${v3(GLD.butter.max)};
const float RB=${f1(GLD.steam.r + 26)};
// the end of a box nearest the viewer along the pixel's ray (largest t), or -1e5 when the ray misses it
float nearEnd(vec3 o,vec3 d,vec3 mn,vec3 mx){
  vec3 inv=1./d;vec3 a=(mn-o)*inv;vec3 b=(mx-o)*inv;vec3 lo=min(a,b);vec3 hi=max(a,b);
  float t0=max(max(lo.x,lo.y),lo.z);float t1=min(min(hi.x,hi.y),hi.z);
  return t1>=t0?t1:-1e5;
}
// three thin wisps that curl as they rise and break up as they thin
float wisp(vec3 s,float k,float ph){
  float h=s.z;
  vec2 c=vec2(k*17.+9.*sin(h*.055+uTime*.8+ph)+4.*sin(h*.13-uTime*1.3+ph*2.),6.*sin(h*.045+uTime*.6+ph*1.7)+k*4.);
  float w=3.2+.12*h;
  vec2 d=s.xy-c;
  float g=exp(-dot(d,d)/(w*w));
  float life=smoothstep(7.,20.,h)*(1.-smoothstep(46.+18.*k*k,100.,h));
  float brk=smoothstep(.28,.66,noise3(vec3(s.xy*.07,h*.055-uTime*.85+ph)));
  return g*life*brk;
}
float steamAt(vec3 s){return wisp(s,-1.,0.)+wisp(s,0.,2.1)+wisp(s,1.,4.3);}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 V=towardViewer();
  vec3 p0=rayOf(vb);
  vec3 o=p0-uSrc;
  float A=dot(V.xy,V.xy),B=2.*dot(o.xy,V.xy),C=dot(o.xy,o.xy)-RB*RB;
  float disc=B*B-4.*A*C;
  if(uSteam<.002||disc<=0.){gl_FragColor=vec4(0.);return;}
  float sq=sqrt(disc);
  float ta=(-B-sq)/(2.*A),tb=(-B+sq)/(2.*A);
  float tz0=(0.-o.z)/V.z,tz1=(110.-o.z)/V.z;
  ta=max(ta,min(tz0,tz1));tb=min(tb,max(tz0,tz1));
  if(tb<=ta){gl_FragColor=vec4(0.);return;}
  float th=nearEnd(toHead(p0),dirToHead(V),HMIN,HMAX);
  float tm=nearEnd(toMast(p0),dirToMast(V),MMIN,MMAX);
  float tbu=nearEnd(toButter(p0),dirToButter(V),BMIN,BMAX);
  float dt=(tb-ta)/14.;
  float jit=hash12(gl_FragCoord.xy+fract(uTime)*17.);
  float depth=0.,crown=0.;
  for(int i=0;i<14;i++){
    float t=ta+(float(i)+jit)*dt;
    vec3 s=o+t*V;
    float vis=smoothstep(-.8,.8,t-th)*smoothstep(-.8,.8,t-tm)*smoothstep(-.8,.8,t-tbu);
    float k=steamAt(s)*vis;
    depth+=k*dt;
    crown+=k*dt*smoothstep(15.,60.,s.z);
  }
  float a=(1.-exp(-depth*.11))*uSteam;
  float up=depth>0.?crown/depth:0.;
  vec3 col=mix(vec3(.70,.745,.80),vec3(.95,.96,.975),up);
  vec4 light=vec4(col*a*.92,a*.92);
  vec4 dark=vec4(vec3(.78,.81,.86)*a*.55,a*.55);
  gl_FragColor=finish(mix(dark,light,uLight),gl_FragCoord.xy);
}`;
const view2 = [GLD.W, GLD.H];
const canvasOf = (name) => stage.querySelector(`[data-canvas="${name}"]`);
const poseNames = (p) => ["X", "Y", "Z", "T"].map((c) => `${p}${c}`);
const poolLayer = glLayer({ canvas: canvasOf("pool"), fragment: POOL, view: view2, camera: GLD.camera, uniforms: ["uEye", "uDir", "uBeam", ...poseNames("uView")], fixed: { uLight: LIGHT } });
const steamLayer = poolLayer ? glLayer({ canvas: canvasOf("steam"), fragment: STEAM, view: view2, camera: GLD.camera, uniforms: ["uSrc", "uSteam", ...poseNames("uHead"), ...poseNames("uMast"), ...poseNames("uBut")], fixed: { uLight: LIGHT } }) : null;
if (poolLayer && steamLayer) stage.setAttribute("data-gl", "");
const steamLevel = { x: 0, v: 0 };
const beamLevel = { x: 0, v: 0 };
function drawLight(lights, dt, calm) {
  const unplugged = apartE > 0.02;
  settle(beamLevel, unplugged ? 0 : lights.beam, dt, 0.18, calm);
  settle(steamLevel, 1, dt, 0.9, calm);
  if (!poolLayer || !steamLayer) return;
  const time = calm ? 0.8 : clock;
  if (beamLevel.x > 0.002) {
    const eye = controller.anchor(GLD.eye.group, GLD.eye.at, GLD.eye.dir);
    poolLayer.draw({ uEye: eye.world, uDir: eye.direction, uBeam: beamLevel.x, ...TURN.poseUniforms(controller, "view", "uView") }, time);
  } else poolLayer.clear();
  const src = controller.anchor("view", GLD.steam.at).world;
  steamLayer.draw({ uSrc: src, uSteam: steamLevel.x, ...TURN.poseUniforms(controller, "tilt", "uHead"), ...TURN.poseUniforms(controller, "lean", "uMast"), ...TURN.poseUniforms(controller, "butter", "uBut") }, time);
}

// ---- actions ----
const atEnd = () => !rec && (fetchT <= 0 || fetchT >= FETCH);
function pass() {
  if (apartE > 0 || apartDir > 0) { apartDir = -1; queued = "pass"; return; }
  if (rec) { rec.dir = -rec.dir; return; }
  if (fetchDir) { fetchDir = -fetchDir; return; }
  if (fetchT >= FETCH) { rec = { u: 0, dir: 1 }; return; }
  fetchDir = 1;
}
function apart() {
  if (apartE > 0 && apartDir >= 0) { apartDir = -1; return; }
  if (apartDir < 0) { apartDir = 1; return; }
  if (!atEnd() || fetchDir) { queued = "apart"; return; }
  apartDir = 1;
}
function labels() {
  const p = rec ? "Taking it back…" : fetchT >= FETCH && !fetchDir ? "Take it back" : fetchDir > 0 ? "Passing…" : fetchDir < 0 ? "Taking it back…" : "Pass the butter";
  const a = apartE > 0 && apartDir >= 0 ? "Put together" : "Take apart";
  if (passBtn.textContent !== p) passBtn.textContent = p;
  if (apartBtn.textContent !== a) apartBtn.textContent = a;
}

// ---- tour: pass, take it back, take apart and turn the table once, close up ----
const TOUR = [["pass", 1.8], ["pass", 1.0], ["apart", 0.6], ["spin", 0.8], ["apart", 1.4]];
function hold() {
  touring = false;
  spin = null;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tourWait = 0.6; run(); }, 3600);
}
const busy = () => Boolean(fetchDir || apartDir || queued || spin || rec || Math.abs(viewTarget - view) > 0.02);

// The engine paints each frame in an order seeded by the last one, so a long jump (reduced motion, a tool)
// walks through the poses in between in one go and the order arrives settled, never stale.
let placed = null;
function poseNow(st, t, e, v, r) { return valuesOf(r !== null ? recoverAt(r) : st, e > 0 ? explodeAt(e) : null, v, t); }
function settleOrder(st) {
  const now = { t: fetchT, e: apartE, v: view, r: rec ? rec.u : null };
  if (placed) {
    const steps = Math.min(90, Math.ceil(Math.max(Math.abs(now.v - placed.v) / 6, Math.abs(now.t - placed.t) / 0.2, Math.abs(now.e - placed.e) / 0.15, now.r !== null && placed.r !== null ? Math.abs(now.r - placed.r) / 0.15 : 0)));
    for (let i = 1; i < steps; i++) {
      const f = i / steps, mid = (a, b) => a + (b - a) * f;
      const t = mid(placed.t, now.t), r = now.r !== null && placed.r !== null ? mid(placed.r, now.r) : now.r;
      controller.set(poseNow(stateAt(t), t, mid(placed.e, now.e), mid(placed.v, now.v), r));
    }
  }
  controller.set(poseNow(st, now.t, now.e, now.v, now.r));
  placed = now;
}

// ---- loop ----
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  if (touring && !busy()) {
    tourWait -= dt;
    if (tourWait <= 0) {
      const [what, wait] = TOUR[tourStep % TOUR.length];
      tourStep++;
      tourWait = wait;
      if (what === "pass") pass();
      else if (what === "apart") apart();
      else spin = { from: view, t: 0, seconds: 8 };
    }
  }
  if (fetchDir) {
    fetchT = calm ? (fetchDir > 0 ? FETCH : 0) : Math.min(FETCH, Math.max(0, fetchT + fetchDir * dt));
    if (fetchT <= 0 || fetchT >= FETCH) fetchDir = 0;
  }
  if (rec) {
    rec.u = calm ? (rec.dir > 0 ? 1 : 0) : Math.min(1, Math.max(0, rec.u + (rec.dir * dt) / RECOVER_S));
    if (rec.u >= 1) { rec = null; fetchT = RECOVER_TO; fetchDir = -1; if (placed) { placed.t = RECOVER_TO; placed.r = null; } }
    else if (rec.u <= 0) rec = null;
  }
  if (apartDir) {
    apartE = calm ? (apartDir > 0 ? 1 : 0) : Math.min(1, Math.max(0, apartE + (apartDir * dt) / APART_S));
    if (apartE <= 0 || apartE >= 1) apartDir = 0;
  }
  if (spin) {
    spin.t = Math.min(1, spin.t + dt / spin.seconds);
    viewTarget = view = spin.from + 360 * ease(spin.t);
    if (spin.t >= 1) { spin = null; const wrapped = ((view % 360) + 360) % 360; if (placed) placed.v += wrapped - view; view = viewTarget = wrapped; }
  } else view = calm ? viewTarget : view + (viewTarget - view) * (1 - Math.exp(-dt / 0.14));
  if (Math.abs(viewTarget - view) < 0.02) view = viewTarget;
  if (queued && !fetchDir && !apartDir) {
    const q = queued;
    queued = null;
    if (q === "pass") pass(); else apart();
  }
  const st = rec ? recoverAt(rec.u) : stateAt(fetchT);
  const key = `${fetchT}|${apartE}|${view}|${rec ? rec.u : -1}`;
  // half rate on slow devices: above 14 ms a render, the live layers redraw every other frame (time stays true)
  odd = !odd;
  half = setMs > 14 ? true : setMs < 9 ? false : half;
  if (key !== drawn && !(half && odd && !calm)) {
    drawn = key;
    const t0 = performance.now();
    settleOrder(st);
    setMs = setMs * 0.85 + (performance.now() - t0) * 0.15;
    drawTreads(fetchT);
    drawHalo();
  }
  const lights = apartE > 0 ? { beam: 0, glow: 0.55, led: 0.35 } : rec ? { beam: 0, glow: 0.04 + 0.51 * ease(rec.u), led: 0.35 * ease(rec.u) } : lightsAt(fetchT);
  const power = 1 - ease(apartE * 4);
  stage.style.setProperty("--br-eye", (lights.glow * power + 0.04 * (1 - power)).toFixed(3));
  stage.style.setProperty("--br-led", (lights.led * power).toFixed(3));
  drawPulses(pulseAt(fetchT) + clock * 0.18, power);
  drawLight(lights, dt, calm);
  const text = sayOf(st, fetchDir);
  if (readout.textContent !== text) readout.textContent = text;
  const line = rec || apartE > 0 || fetchDir < 0 || (!fetchDir && fetchT <= 0) ? null : lineAt(fetchT);
  speak(line);
  if (st.phase !== lastPhase && !apartDir && !line) { lastPhase = st.phase; announce(text); }
  light(selected ?? (apartE > 0 ? null : line && line.alpha > 0.5 ? line.lit : fetchDir ? WORKING[st.phase] ?? null : null));
  labels();
  const moving = busy() || (touring && !calm) || (!calm && Boolean(steamLayer));
  frame = visible && moving ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

// ---- input: tap passes the butter, drag turns the table ----
const act = (fn) => { hold(); fn(); run(); };
passBtn.addEventListener("click", () => act(pass));
apartBtn.addEventListener("click", () => act(apart));
let drag = null;
stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, view: viewTarget, moved: false, id: e.pointerId }; });
stage.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; hold(); try { stage.setPointerCapture(drag.id); } catch {} stage.setAttribute("data-drag", ""); }
  if (drag.moved) { viewTarget = drag.view - dx * 0.55; run(); }
});
const release = () => { if (drag?.moved) { try { stage.releasePointerCapture(drag.id); } catch {} } stage.removeAttribute("data-drag"); };
stage.addEventListener("pointerup", () => { const was = drag; release(); drag = null; if (was && !was.moved) act(pass); });
stage.addEventListener("pointercancel", () => { release(); drag = null; });
const select = (id) => { selected = id; run(); light(id); readout.textContent = id ? byPart.get(id).say : sayOf(stateAt(fetchT), fetchDir); };
let pinned = null;
partBtns.forEach((b) => {
  b.addEventListener("mouseenter", () => { hold(); select(b.dataset.part); });
  b.addEventListener("mouseleave", () => select(pinned));
  b.addEventListener("focus", () => { hold(); select(b.dataset.part); });
  b.addEventListener("blur", () => select(pinned));
  b.addEventListener("click", () => { hold(); pinned = pinned === b.dataset.part ? null : b.dataset.part; select(pinned); });
});
stage.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); act(pass); }
  else if (e.key === "a" || e.key === "A") { act(apart); }
  else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); hold(); viewTarget += (e.key === "ArrowRight" ? -1 : 1) * (e.shiftKey ? 90 : 20); run(); }
  else if (e.key === "Home") { e.preventDefault(); hold(); viewTarget = Math.round(viewTarget / 360) * 360; run(); }
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const ids = DATA.parts.map((p) => p.id);
    const i = selected ? ids.indexOf(selected) : e.key === "ArrowDown" ? -1 : 0;
    hold();
    pinned = ids[(i + (e.key === "ArrowDown" ? 1 : ids.length - 1)) % ids.length];
    select(pinned);
  } else if (e.key === "Escape") { pinned = null; select(null); }
});
stage.addEventListener("focus", () => announce(sayOf(stateAt(fetchT), fetchDir)));
settleOrder(stateAt(0));
drawTreads(0);
drawHalo();
// For the capture tools: stop the tour and jump to any moment.
window.__butter = {
  hold: () => { touring = false; spin = null; clearTimeout(idle); },
  at: (t, e = 0, v = view) => { touring = false; spin = null; rec = null; clearTimeout(idle); fetchDir = 0; apartDir = 0; queued = null; fetchT = t; apartE = e; view = viewTarget = v; last = 0; drawn = ""; run(); if (!frame) tick(performance.now()); },
  pass: () => act(pass),
  apart: () => act(apart),
  state: () => ({ fetchT, apartE, fetchDir, apartDir, view }),
};
