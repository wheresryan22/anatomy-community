const D = __DATA__;
const stage = document.querySelector(".rt-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const tankNeedle = svg.querySelector('[data-part="tank"]');
const thrustNeedle = svg.querySelector('[data-part="thrust"]');
const fog = svg.querySelector(".rt-fog");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const LIGHT = (stage.closest("[data-theme]")?.getAttribute("data-theme") ?? "dark") === "light" ? 1 : 0;
const DEG = Math.PI / 180;

// ---- the model: one blowdown from full, indexed by time on the valve ----
const ROWS = D.rows; // [t, kg, bar, kN, K]
const STEP = ROWS[1][0] - ROWS[0][0];
const END = ROWS[ROWS.length - 1][0];
function rowAt(t) {
  const x = Math.max(0, Math.min(END, t)) / STEP;
  const i = Math.min(ROWS.length - 2, Math.floor(x));
  const f = x - i;
  return ROWS[i].map((v, n) => v + (ROWS[i + 1][n] - v) * f);
}

// ---- needles on the two dials, rebuilt per frame ----
function needleD(dial, value) {
  const angle = (-135 + (270 * Math.max(0, Math.min(value, dial.max))) / dial.max) * DEG;
  const tip = dial.r - 3.2;
  return lineOnTop([dial.x - Math.sin(angle) * 2.6, dial.y + Math.cos(angle) * 2.6], [dial.x + Math.sin(angle) * tip, dial.y - Math.cos(angle) * tip], dial.top + 0.2, D.P);
}

// ---- the plume: cold air, fogging as it expands and chills ----
const FRAGMENT = `
uniform float uFlow;
uniform float uAge;
uniform float uLight;
uniform float uFade;
const float NY=${D.nozY.toFixed(2)};
const float NZ=${D.nozZ.toFixed(2)};
const float RE=${D.exitR.toFixed(2)};
const float BENCH=${D.benchEnd.toFixed(2)};
const float HALF=${D.benchHalf.toFixed(2)};
const vec4 NX=vec4(${D.nozzles.map((x) => x.toFixed(2)).join(",")});
float jet(vec3 p,float x0,float d,float w){vec2 q=vec2(p.x-x0,p.z-NZ+d*.03);return exp(-dot(q,q)/(w*w))*(RE*RE)/(w*w);}
float density(vec3 p,float len){
  float d=p.y-NY;
  float drift=uAge*120.;
  float born=smoothstep(drift-1.,drift+3.,d);
  float far=1.-smoothstep(len*.5,len,d);
  if(born*far<.001)return 0.;
  float wj=.6*RE+.11*d;
  float jets=jet(p,NX.x,d,wj)+jet(p,NX.y,d,wj)+jet(p,NX.z,d,wj)+jet(p,NX.w,d,wj);
  float wc=9.+.2*d;
  vec2 qc=vec2(p.x/1.35,p.z-NZ+d*.05);
  float cloud=exp(-dot(qc,qc)/(wc*wc))*3.2*(RE*RE*4.)/(wc*wc*1.35);
  float merge=smoothstep(8.,46.,d);
  vec3 q=p*.075-vec3(0.,uTime*6.,0.);
  float churn=.5+.95*fbm3(q+vec3(0.,0.,fbm3(q*1.7)*.8));
  churn=mix(1.,churn,smoothstep(4.,30.,d));
  float floorFade=smoothstep(0.,6.,p.z);
  return mix(jets*.75,cloud,merge)*churn*born*far*floorFade;
}
vec4 inkFor(vec3 seen,float cover){vec3 absorbed=1.-seen;float a=max(max(absorbed.r,max(absorbed.g,absorbed.b)),cover);return vec4(vec3(a)-absorbed,a);}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 V=towardViewer();
  vec3 p0=rayOf(vb);
  // bound: the slab y in [NY, NY+len]; march the ray across it
  float len=45.+95.*uFlow;
  float ta=(NY-2.-p0.y)/V.y;
  float tb=(NY+len-p0.y)/V.y;
  float t0=min(ta,tb),t1=max(ta,tb);
  // clip to z in [0, 90]
  float tz0=(0.-p0.z)/V.z,tz1=(90.-p0.z)/V.z;
  t0=max(t0,min(tz0,tz1));t1=min(t1,max(tz0,tz1));
  if(t1<=t0||uFade<.001){gl_FragColor=vec4(0.);return;}
  float dt=(t1-t0)/26.;
  float acc=0.,lit=0.;
  float j=hash12(gl_FragCoord.xy+fract(uTime*.61)*91.);
  for(int i=0;i<26;i++){
    vec3 p=p0+(t0+(float(i)+j)*dt)*V;
    float rho=density(p,len);
    acc+=rho*dt;
    lit+=rho*dt*(.7+.3*smoothstep(NZ-12.,NZ+18.,p.z));
  }
  float edge=smoothstep(4.,40.,vb.x)*smoothstep(4.,40.,uView.y-vb.y)*smoothstep(4.,40.,vb.y);
  float dens=acc*.09*uFade*edge;
  float a=1.-exp(-dens);
  float top=acc>0.?lit/acc:1.;
  vec4 dark=vec4(vec3(.80,.87,.98)*top*a,a*.9);
  float cover=1.-exp(-dens*2.6);
  vec3 seen=mix(vec3(1.),mix(vec3(.5,.56,.64),vec3(.74,.79,.86),top),cover);
  vec4 light=inkFor(seen,0.);
  vec4 col=mix(dark,light,uLight);
  float n=(hash12(gl_FragCoord.xy+fract(uTime*.37)*57.)-.5)/255.;
  col=max(col+n*smoothstep(0.,1.5/255.,col.a),0.);
  col.rgb=min(col.rgb,vec3(col.a));
  gl_FragColor=col;
}`;
const layer = glLayer({ canvas: stage.querySelector(".rt-plume"), fragment: FRAGMENT, view: [D.W, D.H], camera: D.camera, uniforms: ["uFlow", "uAge", "uFade"], fixed: { uLight: LIGHT } });
if (layer) stage.setAttribute("data-gl", "");

// ---- state ----
let tOpen = 0; // seconds of blowdown so far
let holding = false;
let touring = !still.matches;
let tourClock = 0;
let idleTimer = 0;
let refilling = false;
const valve = { x: 0, v: 0 };
const needle = { thrust: { x: 0, v: 0 }, tank: { x: ROWS[0][2], v: 0 } };
const plume = { x: 0, v: 0 };
let closedFor = 9;
let clock = 0, last = 0, frame = 0, visible = false;
const TOUR = [1.6, 3.2, 1.4]; // fire, refill, rest

const LANG = D.lang;
let lang = D.init;
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key]);
function readoutText(row, open) {
  const [t, kg, bar, kN, K] = row;
  const values = { t: t.toFixed(1), kg: kg.toFixed(0), bar: bar.toFixed(0), kN: kN.toFixed(1), C: (K - 273.15).toFixed(0) };
  const text = LANG[lang].text;
  return fill(open ? text.fire : refilling ? text.refill : text.idle, values);
}
function applyLang(next) {
  lang = next;
  const T = LANG[lang];
  const figure = stage.closest(".iso-figure");
  figure.setAttribute("lang", lang);
  figure.querySelector('[data-corner="title"]').textContent = T.title;
  figure.querySelector('[data-corner="hint"]').textContent = T.hint;
  figure.querySelectorAll(".iso-key").forEach((key, index) => (key.lastChild.textContent = T.keys[index]));
  figure.querySelector(".iso-caption").textContent = T.caption;
  stage.setAttribute("aria-label", T.stage);
  svg.setAttribute("aria-label", T.label);
  figure.querySelector(".rt-lang").setAttribute("aria-label", T.group);
  figure.querySelectorAll("[data-lang]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.lang === lang)));
  readout.textContent = readoutText(rowAt(tOpen), false);
}
stage.closest(".iso-figure").querySelectorAll("[data-lang]").forEach((button) => button.addEventListener("click", () => applyLang(button.dataset.lang)));

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  if (touring) {
    tourClock = (tourClock + dt) % (TOUR[0] + TOUR[1] + TOUR[2]);
    holding = tourClock < TOUR[0];
    refilling = tourClock >= TOUR[0] && tourClock < TOUR[0] + TOUR[1];
  }
  const open = holding && tOpen < END - 0.05;
  if (open) tOpen += dt;
  else if (refilling) tOpen = Math.max(0, tOpen - dt * Math.max(1, tOpen / 1.2));
  if (refilling && tOpen === 0) refilling = touring ? refilling : false;
  closedFor = open ? 0 : closedFor + dt;
  settle(valve, open ? 1 : 0, dt, 0.03, calm);
  const row = rowAt(tOpen);
  const thrust = row[3] * Math.max(0, Math.min(1, valve.x));
  settle(needle.thrust, thrust, dt, 0.06, calm);
  settle(needle.tank, row[2], dt, 0.08, calm);
  settle(plume, thrust / D.thrust0, dt, open ? 0.08 : 0.25, calm);
  tankNeedle.setAttribute("d", needleD(D.dials.tank, needle.tank.x));
  thrustNeedle.setAttribute("d", needleD(D.dials.thrust, needle.thrust.x));
  if (open) stage.setAttribute("data-firing", "");
  else stage.removeAttribute("data-firing");
  stage.setAttribute("aria-pressed", String(open));
  const text = readoutText(row, open);
  if (readout.textContent !== text) readout.textContent = text;
  const fade = Math.max(plume.x > 0.002 ? 1 : 0, Math.exp(-closedFor / 0.45)) * (open || closedFor < 3 ? 1 : 0);
  const shown = Math.max(plume.x, 0);
  if (fog) fog.style.opacity = String(Math.min(0.55, shown * 0.6 + Math.exp(-closedFor / 0.35) * 0.2 * (closedFor < 2 ? 1 : 0)));
  if (layer) {
    if (fade > 0.002 && (shown > 0.002 || closedFor < 2.5)) layer.draw({ uFlow: Math.max(shown, 0.15), uAge: open ? 0 : Math.min(closedFor, 3), uFade: open ? 1 : Math.exp(-closedFor / 0.55) }, calm ? 0.8 : clock);
    else layer.clear();
  }
  const busy = touring || open || refilling || Math.abs(valve.v) > 1e-4 || Math.abs(needle.thrust.v) > 1e-4 || Math.abs(needle.tank.v) > 1e-4 || closedFor < 3;
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
const hold = () => {
  touring = false;
  refilling = false;
  holding = true;
  clearTimeout(idleTimer);
  run();
};
const release = () => {
  holding = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    touring = !still.matches;
    tourClock = TOUR[0];
    run();
  }, 6000);
  run();
};
const refill = () => {
  touring = false;
  holding = false;
  refilling = true;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    touring = !still.matches;
    tourClock = TOUR[0] + TOUR[1];
    run();
  }, 8000);
  run();
};
stage.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  stage.focus({ preventScroll: true });
  stage.setPointerCapture?.(event.pointerId);
  hold();
});
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (!event.repeat) hold();
  }
  if (event.key === "r" || event.key === "R") refill();
});
stage.addEventListener("keyup", (event) => {
  if (event.key === " " || event.key === "Enter") release();
});
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
new ResizeObserver(() => run()).observe(stage);
