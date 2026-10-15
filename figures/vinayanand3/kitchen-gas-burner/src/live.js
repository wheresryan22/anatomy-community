const D = __DATA__;
const root = document.querySelector(".gb");
const stage = root.querySelector(".gb-stage");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const LIGHT = (stage.closest("[data-theme]")?.getAttribute("data-theme") ?? "light") !== "dark" ? 1 : 0;
const $ = (sel, el = root) => el.querySelector(sel);
const views = { section: $('.gb-view[data-view="section"]'), ortho: $('.gb-view[data-view="ortho"]') };

// ---------- state ----------
const sim = initial();
const knob = { x: 0, v: 0 }; // knob angle, eased (deg)
const push = { x: 0, v: 0 }; // knob pushed in (mm)
let target = 0, shutter = 1, shutterShown = 1, view = "section";
let clock = 0, last = 0, frame = 0, visible = false, touring = !still.matches, tourClock = 0, holdUntil = 0;
const STAGES = { OFF: 0, LITE: D.detents.LITE, HI: D.detents.HI, MED: D.detents.MED, LO: D.detents.LO };

// ---------- dynamic pieces ----------
const dyn = (v, name) => views[v].querySelector(`[data-dyn="${name}"]`);
let drawn = { knob: null, push: null, plug: null, sleeve: null };
function drawSection(theta, pushed, f, sh) {
  const P = D.sec.P;
  const kq = Math.round(theta * 2) / 2, pq = Math.round(pushed * 10) / 10;
  if (drawn.knob !== kq || drawn.push !== pq) { dyn("section", "knob").innerHTML = knobSvg({ iso, pathOf, solidSvg, fadedSvg }, G, P, kq, pq); drawn.knob = kq; drawn.push = pq; }
  const fq = Math.round(f * 50) / 50;
  if (drawn.plug !== fq) { dyn("section", "plug").innerHTML = plugSvg({ iso, pathOf }, P, fq); drawn.plug = fq; }
  const sq = Math.round(sh * 200) / 200;
  if (drawn.sleeve !== sq) { dyn("section", "sleeve").innerHTML = sleeveSvg({ iso, pathOf }, P, sq); drawn.sleeve = sq; }
}
const KIT = { iso, pathOf, solidSvg, fadedSvg, lineSvg, dotsSvg };
let drawnO = { knob: null, push: null, sleeve: null };
function drawOrtho(theta, pushed, sh) {
  const P = D.ort.P;
  const kq = Math.round(theta * 2) / 2, pq = Math.round(pushed * 10) / 10;
  if (drawnO.knob !== kq || drawnO.push !== pq) { dyn("ortho", "knob-o").innerHTML = knobO(KIT, G, P, kq, pq); drawnO.knob = kq; drawnO.push = pq; }
  const sq = Math.round(sh * 200) / 200;
  if (drawnO.sleeve !== sq) { dyn("ortho", "sleeve-o").innerHTML = sleeveO(KIT, G, P, sq); drawnO.sleeve = sq; }
}

// ---------- tour: push, turn to LITE, catch, HI, MED, LO, back up, off ----------
const TOUR = [[0, 0], [1.2, 0], [2.2, 90], [4.6, 90], [5.4, 115], [8.4, 115], [9.6, 190], [12.0, 190], [13.4, 270], [16.6, 270], [17.8, 115], [19.6, 115], [20.8, 0], [23.0, 0]];
function tourAt(t) {
  const T = TOUR[TOUR.length - 1][0];
  t %= T;
  for (let i = 1; i < TOUR.length; i++) if (t <= TOUR[i][0]) { const [t0, a0] = TOUR[i - 1], [t1, a1] = TOUR[i]; const u = (t - t0) / (t1 - t0); return a0 + (a1 - a0) * (u * u * (3 - 2 * u)); }
  return 0;
}

// ---------- readout ----------
const readout = $("[data-readout]");
const inset = $("[data-inset]"), bar = $("[data-bar]");
const dial = $(".gb-dial"), dialKnob = $("[data-knob]");
const nowEl = $("[data-now]");
const steps = [...root.querySelectorAll("[data-step]")];
let lastSay = "", lastNow = "", lastStep = -2;
const pct = (v) => Math.round(v * 100);
function stepOf(theta, st) {
  if (theta < 12 && !sim.lit) return theta > 1 || push.x > 0.5 ? 0 : -1;
  if (sim.lit) return switchClosed(theta) || theta < 106 ? 4 : 5;
  if (st.f <= 0) return 0;
  if (switchClosed(theta)) return sim.fill < 1 ? 3 : 4;
  return theta < D.detents.LITE ? 1 : 2;
}
function nowOf(theta, st) {
  const kw = (st.power / 1000).toFixed(2);
  if (!sim.lit && st.f <= 0) return theta > 1 || push.x > 0.5 ? "Pushed in and turning. The valve is still shut; gas starts at about a third of the way to LITE." : "Off. The valve is shut, so no gas reaches the burner.";
  if (!sim.lit && !switchClosed(theta)) return theta < D.detents.LITE ? `The valve is opening (${pct(st.f)} % of full flow). Gas is moving, but nothing lights it until the spark at LITE.` : "Gas is flowing but not lit: the knob went past LITE before the gas reached the burner. Turn back to LITE so the spark can light it.";
  if (!sim.lit) return sim.fill < 1 ? `LITE. The spark is clicking while the gas and air make their way down the tube (${pct(Math.min(1, sim.fill))} % of the way).` : "The mixture has reached the ports. The next spark will light it.";
  if (sim.spread < Math.PI - 0.01) return "Lit at the electrode. The flame is jumping from port to port round the ring.";
  if (switchClosed(theta)) return `Burning at full flow, ${kw} kW. Turn the knob on to HI and the clicking stops.`;
  const name = phaseOf(theta, sim);
  const where = name === "turning" ? "" : `${name}. `;
  return `${where}The valve is ${pct(st.f)} % open: ${kw} kW, about ${Math.round(st.btu).toLocaleString("en-US")} Btu/h, with blue inner cones ${(fx.cone.x).toFixed(1)} mm tall.`;
}
function say(st) {
  const phase = phaseOf(knob.x, sim);
  const text = `${phase} · valve ${pct(st.f)} % · ${(st.power / 1000).toFixed(2)} kW · ${Math.round(st.btu).toLocaleString("en-US")} Btu/h`;
  if (text !== lastSay) { readout.textContent = text; lastSay = text; }
  inset.textContent = (st.power / 1000).toFixed(2);
  bar.style.width = `${Math.min(100, (st.power / 2592) * 100).toFixed(1)}%`;
  const now = nowOf(knob.x, st);
  if (now !== lastNow) { nowEl.textContent = now; lastNow = now; }
  const si = stepOf(knob.x, st);
  if (si !== lastStep) { steps.forEach((li, i) => { li.toggleAttribute("data-on", i === si); li.toggleAttribute("data-done", i < si); }); lastStep = si; }
  dialKnob.setAttribute("transform", `rotate(${(-knob.x).toFixed(2)}) scale(${(1 - push.x * 0.012).toFixed(3)})`);
  dial.toggleAttribute("data-pushed", push.x > 1.5);
  dial.toggleAttribute("data-spark", switchClosed(knob.x));
}

// ---------- the loop ----------
let lastSt = null;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  clock += dt;
  if (touring && now > holdUntil) { tourClock += dt; target = tourAt(tourClock); }
  // the knob must be pushed in to leave OFF; it springs back out at OFF
  const wantPush = target > 2 || knob.x > 6 ? 3 : 0;
  settle(push, wantPush, dt, 0.08, calm);
  const canTurn = push.x > 2.4 || knob.x > 8;
  settle(knob, canTurn || target < knob.x ? target : knob.x, dt, 0.22, calm);
  shutterShown += (shutter - shutterShown) * (calm ? 1 : 1 - Math.exp(-dt / 0.15));
  const st = step(sim, knob.x, shutterShown, dt);
  lastSt = st;
  root.style.setProperty("--gb-flow", Math.min(1, sim.flow).toFixed(3));
  if (view === "section") drawSection(knob.x, push.x, st.f, shutterShown); else drawOrtho(knob.x, push.x, shutterShown);
  say(st);
  render(st, dt, calm);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
let render = () => {};
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

// ---------- input ----------
function takeOver(holdSeconds = 6) { touring = false; holdUntil = performance.now() + holdSeconds * 1000; }
root.querySelectorAll(".dl-stop").forEach((t) => t.addEventListener("click", (e) => { e.stopPropagation(); takeOver(); target = STAGES[t.dataset.stage]; describe(); run(); }));
// drag the knob: its angle from the dial's centre, counter-clockwise from the top, snapping to the detents
let turning = null;
function angleAt(e) {
  const r = dial.querySelector("svg").getBoundingClientRect();
  const cx = r.left + (r.width * 104) / 208, cy = r.top + (r.height * 96) / 192;
  let d = (Math.atan2(-(e.clientX - cx), -(e.clientY - cy)) * 180) / Math.PI;
  if (d < 0) d += 360;
  return d;
}
dial.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".dl-stop")) return;
  turning = { id: e.pointerId, last: angleAt(e), at: target };
  dial.setPointerCapture(e.pointerId);
  dial.setAttribute("data-turning", "");
  takeOver(30); run();
});
dial.addEventListener("pointermove", (e) => {
  if (!turning || e.pointerId !== turning.id) return;
  const a = angleAt(e);
  let d = a - turning.last;
  if (d > 180) d -= 360; else if (d < -180) d += 360;
  turning.last = a;
  turning.at = Math.min(D.knobMax, Math.max(0, turning.at + d));
  const snap = Object.values(STAGES).find((v) => Math.abs(v - turning.at) < 5);
  target = snap ?? turning.at;
  takeOver(30); describe(); run();
});
const endTurn = (e) => { if (turning && e.pointerId === turning.id) { turning = null; dial.removeAttribute("data-turning"); takeOver(); } };
dial.addEventListener("pointerup", endTurn);
dial.addEventListener("pointercancel", endTurn);
function onKey(e) {
  const step_ = e.shiftKey ? 45 : 10;
  if (e.key === "ArrowRight") target = Math.min(D.knobMax, target + step_);
  else if (e.key === "ArrowLeft") target = Math.max(0, target - step_);
  else if (e.key === "Home") target = 0;
  else if (e.key === "End") target = D.detents.LO;
  else if (e.key === " " || e.key === "Enter") target = target > 0 ? 0 : D.detents.LITE;
  else return;
  e.preventDefault(); takeOver(); describe(); run();
}
stage.addEventListener("keydown", onKey);
dial.addEventListener("keydown", onKey);
root.querySelectorAll("[data-set-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.setView)));
function setView(v) {
  view = v;
  stage.dataset.view = v;
  root.querySelectorAll("[data-set-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setView === v)));
  run();
}
function describe() {
  const name = Object.entries(STAGES).find(([, a]) => a === target)?.[0] ?? `${Math.round(target)}°`;
  for (const el of [stage, dial]) { el.setAttribute("aria-valuenow", String(Math.round(target))); el.setAttribute("aria-valuetext", `Knob at ${name}`); }
}
stage.addEventListener("pointerenter", () => { if (touring) holdUntil = performance.now() + 2500; });

// ---------- section shader: flow in the tube and head, flames at the ports, the spark ----------
const GL_COMMON = `
uniform float uLight;
vec4 inkFor(vec3 seen,float cover){vec3 ab=1.-seen;float a=max(max(ab.r,max(ab.g,ab.b)),cover);return vec4(vec3(a)-ab,a);}
vec4 over(vec4 top,vec4 under){return top+under*(1.-top.a);}
vec4 finish(vec4 c){c.rgb=min(c.rgb,vec3(c.a));float n=(hash12(gl_FragCoord.xy+fract(uTime*.61)*91.)+hash12(gl_FragCoord.yx*1.37+fract(uTime*.37)*57.)-1.)/255.;return max(c+vec4(n)*smoothstep(0.,1.5/255.,c.a),0.);}
// one kind of light as ink on paper (light) or premultiplied emission (dark)
vec4 lightInk(vec3 hue,float e,float cap){
  e=max(e,0.);
  if(uLight<.5){vec3 c=tonemap(hue*e,1.15);return vec4(c,max(c.r,max(c.g,c.b)));}
  float a=cap*(1.-exp(-1.6*e/cap));
  return vec4(hue*a,a);
}
// a port flame in a plane: base, unit direction, inner cone height, outer length (mm), yellow share, level
vec4 flame2(vec2 p,vec2 base,vec2 dir,float hin,float L,float yel,float lit,float seed){
  if(lit<.002||L<.3)return vec4(0.);
  vec2 q=p-base;
  vec2 nrm=vec2(-dir.y,dir.x);
  float a0=max(dot(q,dir),0.);
  q.y-=.012*a0*a0;
  float a=dot(q,dir);
  float b=dot(q,nrm);
  float flick=(noise2(vec2(a*.35-uTime*7.+seed*13.,seed*3.))-.5)*min(a,L)*.12;
  b+=flick;
  float t=clamp(a/max(L,.01),0.,1.);
  float inA=window(a,0.,max(hin,.01),.35);
  float w=1.9*(1.-clamp(a/max(hin,.01),0.,1.));
  float cone=inA*(exp(-pow((abs(b)-w)/.42,2.))*.95+smoothstep(w,w-.6,abs(b))*.25);
  float W=1.7+2.6*pow(sin(3.1416*min(1.,t*1.1)),.7)+.5*t;
  float mant=window(a,-.3,L,.6)*smoothstep(W,W-1.6,abs(b))*(1.-.7*t);
  float tip=yel*window(a,L*.55,L*1.05,L*.2+.4)*smoothstep(W,W-1.8,abs(b))*.75;
  return vec4(cone*lit,mant*lit,tip*lit,0.);
}`;
const FRAG_SEC = GL_COMMON + `
uniform float uFlow,uFront,uGas,uPhase,uHeadPhase,uWin,uLit,uSpread,uCone,uOuter,uYellow,uSpark,uSeed,uShutterX;
const float ZT=90.,PLATE=-138.5,XEND=${D.sec.tube.xEnd.toFixed(2)},TIP=-138.4,HX=60.;
float ease(float t){t=clamp(t,0.,1.);return .5-.5*cos(3.14159265*t);}
float rIn(float x){if(x<-110.)return 15.;if(x<-92.)return mix(15.,8.,ease((x+110.)/18.));if(x<-82.)return 8.;if(x<-10.)return mix(8.,12.,(x+82.)/72.);return 12.;}
float headIn(float z){float t=clamp((z-106.)/16.,0.,1.);float o=z<106.?18.:(z<122.?18.+16.*sin(1.5708*t):34.);return z<122.?o-2.5:31.;}
float headOut(float z){float t=clamp((z-106.)/16.,0.,1.);return z<106.?18.:(z<122.?18.+16.*sin(1.5708*t):34.);}
float capR(float z){if(z<=143.)return 36.;float t=(z-143.)/3.5;return 36.*sqrt(max(0.,1.-t*t));}
// time of flight along the tube in throat-lengths: velocity goes as 1/area
float tauOf(float x){float s=0.;float h=(x-PLATE)/10.;for(int i=0;i<10;i++){float xm=PLATE+(float(i)+.5)*h;float r=rIn(xm)/8.;s+=r*r*h;}return s;}
float dotAt(float d,float r,float px){return 1.-smoothstep(r-.7*px,r+.7*px,d);}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 w=rayOf(vb);
  float x=w.x,z=w.z,px=pixelOf();
  vec3 airE=vec3(0.),gasE=vec3(0.);
  float LT=XEND-PLATE+52.;
  // ---- the tube: lanes of air dots, and gas dots fanning out of the jet ----
  float R=rIn(x);
  float dz=z-ZT;
  float inTube=step(PLATE,x)*step(x,XEND+2.)*step(abs(dz),R);
  if(inTube>0.&&uFlow>.002){
    float front=uFront*LT;
    float gate=smoothstep(front,front-6.,x-PLATE)*uFlow;
    float tau=tauOf(x);
    float stretch=(R/8.)*(R/8.);
    float b=.725+.17*max(0.,x-TIP);
    float spread=clamp(b/R,0.,1.)*.92;
    for(int j=0;j<11;j++){
      float eta=-.9+float(j)*.18;
      float jit=hash12(vec2(float(j),3.7));
      float ph=tau/9.-uPhase+jit;
      float kk=floor(ph);
      float fr=fract(ph)-.5;
      float dxm=fr*9./stretch;
      float isGas=step(hash12(vec2(float(j)*7.1,kk)),uGas*1.4);
      float lat=(hash12(vec2(kk,float(j)))-.5)*.12;
      float zg=ZT+(eta+lat)*R*spread;
      float za=ZT+(eta+lat)*R*.92;
      float dg=length(vec2(dxm,z-zg));
      float da=length(vec2(dxm,z-za));
      gasE+=vec3(1.,.62,.18)*dotAt(dg,.75,px)*isGas;
      airE+=vec3(.55,.72,1.)*dotAt(da,.62,px)*(1.-isGas)*smoothstep(-122.,-112.,x+abs(eta)*0.);
    }
    // the jet itself: a narrow amber core that widens and fades as it mixes
    float jet=exp(-pow(dz/b,2.))*clamp(2.2/b,0.,1.)*step(TIP,x);
    gasE+=vec3(1.,.6,.15)*jet*.9;
    airE*=gate;gasE*=gate;
  }
  // ---- air coming in through the open part of the shutter window ----
  float ad=abs(dz);
  if(uFlow>.002&&x>-135.&&x<uShutterX&&ad>14.8&&ad<26.){
    float lane=floor((x+135.)/3.2);
    float lx=-135.+(lane+.5)*3.2;
    float ph=(26.-ad)/4.5-uPhase*1.6+hash12(vec2(lane,1.));
    float fr=fract(ph)-.5;
    float d=length(vec2(x-lx,fr*4.5));
    airE+=vec3(.55,.72,1.)*dotAt(d,.6,px)*uFlow*smoothstep(26.,22.,ad)*step(lx,uShutterX-.8);
  }
  // ---- mixture rising through the head to the ports ----
  float hi=headIn(z);
  if(uFlow>.002&&z>ZT+12.&&z<139.&&abs(x-HX)<hi){
    float front=uFront*LT-(XEND-PLATE);
    float gate=smoothstep(front,front-5.,z-(ZT+12.))*uFlow;
    for(int j=0;j<9;j++){
      float xi=-.8+float(j)*.2;
      float lx=HX+xi*hi*.9;
      float area=(hi/16.)*(hi/16.);
      float ph=(z-ZT)/(7.*max(area,.4))-uHeadPhase+hash12(vec2(float(j),9.));
      float fr=fract(ph)-.5;
      float d=length(vec2(x-lx,fr*7.*max(area,.4)));
      float isGas=step(hash12(vec2(float(j)*3.3,floor(ph))),uGas);
      vec3 c=mix(vec3(.55,.72,1.),vec3(1.,.62,.18),isGas);
      airE+=c*dotAt(d,.62,px)*gate;
    }
  }
  // ---- flames: the two ports in the cut plane, and the far ports' tongues past the head ----
  vec3 fl=vec3(0.);
  float spreadDeg=uSpread;
  bool nearHead=uLit>.002&&z>124.&&z<200.&&abs(x-HX)<92.;
  for(int i=0;i<28;i++){
    if(!nearHead)break;
    float ang=float(i)*6.28318/28.;
    float s=sin(ang),c=cos(ang);
    if(s>.02)continue; // the near half is cut away
    float da=abs(mod(ang-${(D.burner ? 3.2114 : 3.2114).toFixed(4)}+3.14159,6.28318)-3.14159);
    float lit=uLit*(1.-smoothstep(spreadDeg-.05,spreadDeg+.12,da));
    if(s<-.02)lit*=smoothstep(.22,.5,abs(c)); // ports facing away are hidden by the cap but for their tips
    vec2 base=vec2(HX+34.*c,136.5);
    // a flame tilted 20° up from radial, projected: a port facing away shows only its rise
    vec2 dp=vec2(c*.94,.34);
    float fore=length(dp);
    vec4 f=flame2(vec2(x,z),base,dp/fore,uCone*fore,uOuter*fore,uYellow,lit,float(i));
    // far flames hide behind the head and its cap
    float hidden=0.;
    if(s<-.02){float hw=z<140.?headOut(z):capR(z);hidden=step(abs(x-HX),hw)*step(z,146.5);}
    fl+=f.xyz*(1.-hidden);
  }
  // ---- the spark: a jagged arc from the electrode tip to the crown ----
  vec3 sp=vec3(0.);
  if(uSpark>.002&&abs(x-24.)<14.&&abs(z-136.5)<14.){
    vec2 a0=vec2(${(D.sec.eTipW ? 0 : 0).toFixed(1)}+22.49,136.5),a3=vec2(26.,136.5);
    vec2 a1=mix(a0,a3,.33)+vec2(0.,(hash12(vec2(uSeed,1.))-.5)*1.4);
    vec2 a2=mix(a0,a3,.67)+vec2(0.,(hash12(vec2(uSeed,2.))-.5)*1.4);
    vec2 p=vec2(x,z);
    float d=1e3;
    vec2 pa,ba;float h;
    pa=p-a0;ba=a1-a0;h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);d=min(d,length(pa-ba*h));
    pa=p-a1;ba=a2-a1;h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);d=min(d,length(pa-ba*h));
    pa=p-a2;ba=a3-a2;h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);d=min(d,length(pa-ba*h));
    float core=exp(-pow(d/max(.22,.9*px),2.));
    float halo=exp(-pow(d/1.6,2.))*.35+exp(-pow(d/4.5,2.))*.12;
    sp=(vec3(.85,.85,1.)*core*1.6+vec3(.55,.45,1.)*halo)*uSpark;
  }
  // ---- compose: dark adds light, light lays one ink per kind ----
  vec3 cone=vec3(.25,.6,1.)*fl.x*1.5,mant=vec3(.32,.36,1.)*fl.y*.55,tip=vec3(1.,.66,.16)*fl.z*1.1;
  vec4 col;
  if(uLight<.5){
    vec3 e=airE*.9+gasE+cone+mant+tip+sp;
    vec3 c=tonemap(e,1.1);
    col=vec4(c,max(c.r,max(c.g,c.b)));
  }else{
    vec4 dots=over(vec4(vec3(.16,.36,.78)*.85,.85)*min(1.,length(airE)),vec4(0.));
    dots=over(vec4(vec3(.86,.46,.06)*.9,.9)*min(1.,length(gasE)*.8),dots);
    float ef=fl.x*1.2+fl.y*.5;
    vec3 seen=mix(vec3(1.),vec3(.1,.38,.98),clamp(fl.y*.55,0.,.6));
    seen=mix(seen,vec3(.05,.42,1.),clamp(fl.x*.9,0.,.95));
    seen=mix(seen,vec3(.86,.93,1.),clamp(fl.x*fl.x*.35,0.,.35));
    seen=mix(seen,vec3(1.,.62,.08),clamp(fl.z*.85,0.,.9));
    vec4 flame=inkFor(seen,0.)*smoothstep(0.,.08,ef+fl.z);
    vec3 sseen=mix(vec3(1.),vec3(.42,.3,1.),clamp(length(sp)*.6,0.,.9));
    sseen=mix(sseen,vec3(.97,.96,1.),clamp(length(sp)*.6-.6,0.,.6));
    vec4 spark=inkFor(sseen,clamp(length(sp),0.,1.)*.5);
    col=over(spark,over(flame,dots));
  }
  gl_FragColor=finish(col);
}`;


const FRAG_ORT = GL_COMMON + `
uniform float uLit,uSpread,uCone,uOuter,uYellow,uSpark,uSeed;
uniform vec3 uTip,uCrown;
const vec2 HC=vec2(60.,0.);
const float PZ=136.5,RC=34.,DELTA=6.2831853/28.,EANG=3.2114;
// nearest-to-viewer hit of a vertical cylinder with a flat top, or -1e9
float hitCyl(vec3 p0,vec3 V,float r,float z0,float z1){
  vec2 o=p0.xy-HC;float a=dot(V.xy,V.xy),b=2.*dot(o,V.xy),c=dot(o,o)-r*r;float disc=b*b-4.*a*c;float best=-1e9;
  if(disc>0.){float t=(-b+sqrt(disc))/(2.*a);float z=p0.z+t*V.z;if(z>z0&&z<z1)best=max(best,t);}
  float tt=(z1-p0.z)/V.z;vec2 q=o+tt*V.xy;if(dot(q,q)<r*r)best=max(best,tt);
  return best;
}
vec3 flameAt(vec3 q){
  vec2 d=q.xy-HC;float rho=length(d);float phi=atan(d.y,d.x);
  float ki=floor(phi/DELTA+.5);float pk=ki*DELTA;
  float da=abs(mod(pk-EANG+3.14159265,6.2831853)-3.14159265);
  float lit=uLit*(1.-smoothstep(uSpread-.05,uSpread+.12,da));
  if(lit<.002)return vec3(0.);
  float tg=rho*(phi-pk);
  float rr=rho-RC,zz=q.z-PZ;
  float a=rr*.94+zz*.342;
  float n=-rr*.342+zz*.94;
  n-=.012*max(a,0.)*max(a,0.);
  float flick=(noise2(vec2(a*.35-uTime*7.+ki*13.,ki*3.))-.5)*clamp(a,0.,uOuter)*.12;
  n+=flick;
  float hin=max(uCone,.01),L=max(uOuter,.3);
  float s=clamp(a/hin,0.,1.);
  float e=length(vec2(n/2.,tg/.95));
  float cone=window(a,0.,hin,.35)*(exp(-pow((e-(1.-s))/.2,2.))+smoothstep(1.-s,1.-s-.25,e)*.2);
  float t=clamp(a/L,0.,1.);
  float sw=pow(sin(3.1416*min(1.,t*1.1)),.7);
  float e2=length(vec2(n/(1.8+2.2*sw+.4*t),tg/(1.+1.7*sw)));
  float mant=window(a,-.3,L,.6)*smoothstep(1.,.55,e2)*(1.-.7*t);
  float tip=uYellow*window(a,L*.55,L*1.05,L*.2+.4)*smoothstep(1.,.5,e2)*.75;
  return vec3(cone,mant,tip)*lit;
}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 V=towardViewer();
  vec3 p0=rayOf(vb);
  vec3 fl=vec3(0.);
  vec2 head=project(vec3(HC,140.));
  if(uLit>.002&&abs(vb.x-head.x)<95.*uK&&abs(vb.y-head.y)<60.*uK){
    // each port's flame, drawn in the plane of the screen from its projected base and direction;
    // a flame point is hidden where the crown or cap is nearer the viewer along this pixel's ray
    float occ=max(hitCyl(p0,V,RC,122.,140.),hitCyl(p0,V,36.,140.,146.5));
    // soft coverage of the head's silhouette, so flames end on its outline instead of stepping
    float pxw=pixelOf();
    vec2 oo=p0.xy-HC;
    float tz=(144.-p0.z)/V.z;float rTop=length(oo+tz*V.xy);
    float covTop=clamp((36.-rTop)*uCam.z/pxw+.5,0.,1.);
    vec2 vh=normalize(V.xy);float dAxis=abs(oo.x*vh.y-oo.y*vh.x);
    float covSide=clamp((RC-dAxis)/pxw+.5,0.,1.)*step(occ,1e8)*step(-1e8,occ);
    float cov=max(covTop,covSide);
    vec2 pm=vec2(vb.x,-vb.y)/uK;
    for(int i=0;i<28;i++){
      float ang=float(i)*DELTA;
      float c=cos(ang),s=sin(ang);
      float da=abs(mod(ang-EANG+3.14159265,6.2831853)-3.14159265);
      float lit=uLit*(1.-smoothstep(uSpread-.05,uSpread+.12,da));
      if(lit<.002)continue;
      vec3 B3=vec3(HC.x+RC*c,RC*s,PZ);
      vec3 d3=vec3(.94*c,.94*s,.342);
      vec2 b2=project(B3),e2=project(B3+d3)-b2;
      vec2 base=vec2(b2.x,-b2.y)/uK,dir=vec2(e2.x,-e2.y)/uK;
      float fore=length(dir);
      dir/=fore;
      float am=max(dot(pm-base,dir),0.)/max(fore,.05);
      vec3 q=B3+d3*min(am,uOuter);
      float behind=dot(q-p0,V)<max(occ,dot(vec3(HC,PZ+4.)-p0,V))?1.:0.;
      float hidden=behind*cov;
      vec4 f=flame2(pm,base,dir,uCone*fore,uOuter*fore,uYellow,lit,float(i));
      fl+=f.xyz*(1.-hidden);
    }
  }
  vec3 sp=vec3(0.);
  if(uSpark>.002){
    vec2 a0=project(uTip),a3=project(uCrown);
    vec2 a1=mix(a0,a3,.33)+vec2(0.,(hash12(vec2(uSeed,1.))-.5)*1.6*uK);
    vec2 a2=mix(a0,a3,.67)+vec2(0.,(hash12(vec2(uSeed,2.))-.5)*1.6*uK);
    float d=1e3;vec2 pa,ba;float h;
    pa=vb-a0;ba=a1-a0;h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);d=min(d,length(pa-ba*h));
    pa=vb-a1;ba=a2-a1;h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);d=min(d,length(pa-ba*h));
    pa=vb-a2;ba=a3-a2;h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);d=min(d,length(pa-ba*h));
    d/=uK;
    float core=exp(-pow(d/max(.22,.9*pixelOf()),2.));
    float halo=exp(-pow(d/1.6,2.))*.35+exp(-pow(d/4.5,2.))*.12;
    sp=(vec3(.85,.85,1.)*core*1.6+vec3(.55,.45,1.)*halo)*uSpark;
  }
  vec4 col;
  vec3 cone=vec3(.25,.6,1.)*fl.x*1.5,mant=vec3(.32,.36,1.)*fl.y*.55,tip=vec3(1.,.66,.16)*fl.z*1.1;
  if(uLight<.5){
    vec3 c=tonemap(cone+mant+tip+sp,1.1);
    col=vec4(c,max(c.r,max(c.g,c.b)));
  }else{
    float ef=fl.x*1.2+fl.y*.5;
    vec3 seen=mix(vec3(1.),vec3(.1,.38,.98),clamp(fl.y*.55,0.,.6));
    seen=mix(seen,vec3(.05,.42,1.),clamp(fl.x*.9,0.,.95));
    seen=mix(seen,vec3(.86,.93,1.),clamp(fl.x*fl.x*.35,0.,.35));
    seen=mix(seen,vec3(1.,.62,.08),clamp(fl.z*.85,0.,.9));
    vec4 flame=inkFor(seen,0.)*smoothstep(0.,.08,ef+fl.z);
    vec3 sseen=mix(vec3(1.),vec3(.42,.3,1.),clamp(length(sp)*.6,0.,.9));
    sseen=mix(sseen,vec3(.97,.96,1.),clamp(length(sp)*.6-.6,0.,.6));
    col=over(inkFor(sseen,clamp(length(sp),0.,1.)*.5),flame);
  }
  gl_FragColor=finish(col);
}`;

// ---------- WebGL layers and the render step ----------
const SEC_U = ["uFlow", "uFront", "uGas", "uPhase", "uHeadPhase", "uWin", "uLit", "uSpread", "uCone", "uOuter", "uYellow", "uSpark", "uSeed", "uShutterX"];
const secLayer = glLayer({ canvas: views.section.querySelector(".gb-gl"), fragment: FRAG_SEC, view: [D.W, D.H], camera: D.sec.camera, uniforms: SEC_U, fixed: { uLight: LIGHT } });
if (secLayer) stage.setAttribute("data-gl", "");
const ortLayer = glLayer({ canvas: views.ortho.querySelector(".gb-gl"), fragment: FRAG_ORT, view: [D.W, D.H], camera: D.ort.camera, uniforms: ["uLit", "uSpread", "uCone", "uOuter", "uYellow", "uSpark", "uSeed"], fixed: { uLight: LIGHT, uTip: D.ort.eTip, uCrown: D.ort.crownAt } });
const fx = { lit: { x: 0, v: 0 }, cone: { x: 0, v: 0 }, outer: { x: 0, v: 0 }, yellow: { x: 0, v: 0 }, phase: 0, headPhase: 0, sparkAt: -9, seed: 0 };
render = (st, dt, calm) => {
  const flow = Math.min(1, sim.flow);
  fx.phase += dt * 2.2 * flow * (calm ? 0 : 1);
  fx.headPhase += dt * 1.6 * flow * (calm ? 0 : 1);
  if (st.fired) { fx.sparkAt = clock; fx.seed = (fx.seed * 7.31 + 3.7) % 97; }
  settle(fx.lit, sim.lit ? 1 : 0, dt, sim.lit ? 0.06 : 0.12, calm);
  settle(fx.cone, st.cone * 1000 * (sim.lit ? 1 : 0.6), dt, 0.18, calm);
  settle(fx.outer, st.outer * 1000, dt, 0.18, calm);
  settle(fx.yellow, st.yellow, dt, 0.3, calm);
  const spark = calm ? 0 : burst(clock - fx.sparkAt, 0.012, 0.075);
  const u = { uFlow: flow, uFront: sim.fill, uGas: 1 / (1 + st.r), uPhase: fx.phase, uHeadPhase: fx.headPhase, uWin: 0, uLit: fx.lit.x, uSpread: sim.spread, uCone: fx.cone.x, uOuter: fx.outer.x, uYellow: fx.yellow.x, uSpark: spark, uSeed: fx.seed, uShutterX: -135 + 13 * shutterShown };
  root.style.setProperty("--gb-lit", fx.lit.x.toFixed(3));
  root.style.setProperty("--gb-spark", Math.min(1, spark * 1.5).toFixed(3));
  if (view === "section" && secLayer) secLayer.draw(u, calm ? 0.8 : clock);
  if (view === "ortho" && ortLayer) ortLayer.draw({ uLit: u.uLit, uSpread: u.uSpread, uCone: u.uCone, uOuter: u.uOuter, uYellow: u.uYellow, uSpark: u.uSpark, uSeed: u.uSeed }, calm ? 0.8 : clock);
};
window.__gb = { sim, knob, push, fx, get target() { return target; }, get touring() { return touring; }, get frame() { return frame; }, get visible() { return visible; }, setTarget: (t) => { takeOver(); target = t; run(); } };

// ---------- pan and zoom: wheel zooms about the pointer, drag pans, double-click resets ----------
const cam = { s: 1, x: 0, y: 0 };
function applyCam() {
  const r = stage.getBoundingClientRect();
  cam.s = Math.min(4, Math.max(1, cam.s));
  cam.x = Math.min(0, Math.max(r.width * (1 - cam.s), cam.x));
  cam.y = Math.min(0, Math.max(r.height * (1 - cam.s), cam.y));
  const t = cam.s === 1 ? "" : `translate(${cam.x.toFixed(1)}px,${cam.y.toFixed(1)}px) scale(${cam.s.toFixed(3)})`;
  Object.values(views).forEach((v) => (v.style.transform = t));
  stage.toggleAttribute("data-zoomed", cam.s > 1);
}
stage.addEventListener("wheel", (e) => {
  if (!e.ctrlKey && !e.metaKey && cam.s === 1 && e.deltaY > 0) return;
  e.preventDefault();
  const r = stage.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  const s0 = cam.s, s1 = Math.min(4, Math.max(1, s0 * Math.exp(-e.deltaY * 0.0015)));
  cam.x = px - ((px - cam.x) * s1) / s0;
  cam.y = py - ((py - cam.y) * s1) / s0;
  cam.s = s1;
  applyCam();
}, { passive: false });
let drag = null;
stage.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button,input") || cam.s === 1) return;
  drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, id: e.pointerId };
  stage.setPointerCapture(e.pointerId);
  stage.setAttribute("data-dragging", "");
});
stage.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  cam.x = drag.cx + e.clientX - drag.x;
  cam.y = drag.cy + e.clientY - drag.y;
  applyCam();
});
const endDrag = (e) => { if (drag && e.pointerId === drag.id) { drag = null; stage.removeAttribute("data-dragging"); } };
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("dblclick", (e) => { if (e.target.closest("button,input")) return; cam.s = 1; cam.x = 0; cam.y = 0; applyCam(); });
stage.addEventListener("focus", () => { $("[data-live]").textContent = lastSay; });
