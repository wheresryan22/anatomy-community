const D = __DATA__;
const P = D.P;
const stage = document.querySelector(".tls-stage");
const part = (name) => stage.querySelector(`[data-part="${name}"]`);
const slotOf = (name) => stage.querySelector(`[data-slot="${name}"]`);
const readout = document.querySelector("[data-readout]");
const status = stage.querySelector("[data-status]");
const list = document.querySelector("[data-steps]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const LIGHT = document.body.dataset.theme === "light" ? 1 : 0;
const ease = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const tr = (by) => translateAlong(P, by);

// ---------- the model: a TLS-inspection session as timed moves of the bench ----------
const INIT = {
  carA: D.DOCK.aFw, carB: D.DOCK.bSv, lidA: 1, lidB: 1, shX: D.MAG.cx, cupZ: D.TRAVEL_Z, scanX: D.SCAN_PARK, scan: 0,
  pulseA: 0, pulseB: 0, ledInt: 0, ledCert: 0, ledScanG: 0, ledScanR: 0, lampG: 0, lampR: 0, sockFW: 0, sockCL: 0,
  sealF: 0, forgedA: 1, payA: 0, dropZ: D.BIN.top,
  forged: "mag", payload: "boxA", screen: "idle", fw: "en espera", sv: "en espera",
};
const UP = D.TRAVEL_Z;
const MID = 40;
const boxA = D.DOCK.aFw - 11;
const boxB = D.DOCK.bFw + 11;
const cradleA = D.DOCK.aFw + 10;
const onBox = D.BODY_TOP + D.PAY_H;
const pick = (x, z, grab) => [{ d: 0.6, to: { shX: x } }, { d: 0.55, to: { cupZ: z } }, { d: 0.15, at: grab }, { d: 0.5, to: { cupZ: UP } }];

function stepsFor(trust, mal) {
  const steps = [
    { title: "ClientHello", text: "El navegador pide banco.hn por HTTPS. El firewall intercepta el saludo TLS: el cliente cree que habla con el servidor, pero su túnel termina en el firewall.",
      segs: [{ d: 0.3, at: { fw: "intercepta…" } }, { d: 1.7, to: { pulseA: 1 } }, { d: 0.5, to: { ledInt: 1 } }] },
    { title: "Segunda conexión", text: "El firewall abre su propia conexión TLS con el servidor real, como si fuera un cliente más.",
      segs: [{ d: 0.2, at: { fw: "→ servidor" } }, { d: 1.7, to: { pulseB: 1 } }, { d: 0.3, at: { sv: "ClientHello" } }] },
    { title: "Certificado real", text: "El servidor presenta su certificado: banco.hn, firmado por DigiCert (sello ●). Viaja por el túnel 2 hasta el firewall.",
      segs: [{ d: 0.3, at: { sv: "envía cert ●" } }, { d: 2.8, to: { carB: D.DOCK.bFw } }, { d: 0.2, at: { fw: "recibe cert ●" } }] },
    { title: "El firewall lo valida", text: "Compara el sello con su almacén de CAs públicas: el sello ● encaja. Si no encajara (certificado falso o caducado), el firewall bloquearía el sitio.",
      segs: [{ d: 0.7, to: { sockFW: 1 } }, { d: 0.5, to: { ledCert: 1 }, at: { fw: "cert ● válido" } }, { d: 0.6 }] },
    { title: "Certificado nuevo", text: "El firewall fabrica un certificado para banco.hn y lo firma con la clave privada de su propia CA: el sello ■. Es la pieza que hace posible la inspección.",
      segs: [{ d: 0.1, at: { fw: "firma con CA ■" } }, ...pick(D.MAG.cx, D.MAG.top + D.CARD_H, { forged: "held" }), { d: 0.6, to: { shX: D.DIE.cx } }, { d: 0.5, to: { cupZ: D.DIE.top + D.CARD_H } }, { d: 0.8, to: { sealF: 1 } }, { d: 0.45, to: { cupZ: MID } }, { d: 0.75, to: { shX: cradleA } }, { d: 0.55, to: { cupZ: D.CRADLE_TOP + D.CARD_H } }, { d: 0.15, at: { forged: "carA" } }, { d: 0.5, to: { cupZ: UP } }] },
    { title: "Se lo da al cliente", text: "Entrega ese certificado al cliente por el túnel 1, haciéndose pasar por banco.hn.",
      segs: [{ d: 0.2, at: { fw: "→ cliente" } }, { d: 2.9, to: { carA: D.DOCK.aCl, sockFW: 0 } }] },
  ];
  if (!trust) {
    steps.push({ title: "El cliente lo rechaza", text: "El sello ■ no encaja: la CA del firewall no está instalada en este equipo. El navegador muestra un error y no envía nada. Por eso la CA del firewall se distribuye por GPO o MDM.",
      bad: true, segs: [{ d: 0.7, to: { sockCL: 1 } }, { d: 0.5, to: { lampR: 1 }, at: { screen: "err", fw: "cliente rechaza" } }, { d: 1.8 }] });
  } else {
    steps.push(
      { title: "El cliente confía", text: "El navegador busca un zócalo para el sello ■ en su almacén: la CA del firewall está instalada (por GPO) y encaja. Candado ✓, aunque el certificado no es el del servidor.",
        segs: [{ d: 0.7, to: { sockCL: 1 } }, { d: 0.5, to: { lampG: 1 }, at: { screen: "ok" } }, { d: 1 }] },
      { title: "Cifrado con K1", text: "El navegador escribe la petición y la cierra con K1, la clave de sesión que negoció… con el firewall.",
        segs: [{ d: 0.7, to: { payA: 1 }, at: { screen: "sent" } }, { d: 0.9, to: { lidA: 0 } }, { d: 0.2 }] },
      { title: "Túnel 1", text: "La caja cerrada viaja por el túnel 1. Nadie en la red puede leerla.",
        segs: [{ d: 3, to: { carA: D.DOCK.aFw } }] },
      { title: "Descifrado", text: "El firewall tiene K1, así que abre la caja y saca el contenido en claro.",
        segs: [{ d: 0.1, at: { fw: "descifra K1" } }, { d: 0.9, to: { lidA: 1 } }, ...pick(boxA, onBox, { payload: "held" }), { d: 0.8, to: { shX: 8 } }, { d: 0.6, to: { cupZ: D.TRAY_TOP + D.PAY_H } }, { d: 0.15, at: { payload: "tray" } }, { d: 0.5, to: { cupZ: UP } }] },
      { title: "Inspección", text: "Con el contenido en claro actúan los motores de seguridad: antivirus, IPS, DLP, filtrado de URL y control de aplicaciones.",
        segs: [{ d: 0.1, at: { fw: "inspecciona…" } }, { d: 0.35, to: { scan: 1 } }, { d: 1.3, to: { scanX: -2 } }, { d: 1.3, to: { scanX: D.SCAN_PARK } }, { d: 0.35, to: { scan: 0 } }, mal ? { d: 0.5, to: { ledScanR: 1 }, at: { fw: "¡MALWARE!" } } : { d: 0.5, to: { ledScanG: 1 }, at: { fw: "limpio ✓" } }] },
    );
    if (mal) {
      steps.push({ title: "Bloqueado", text: "Se detectó malware: el contenido va a cuarentena y nunca llega al servidor. El cliente recibe una página de bloqueo del firewall.",
        bad: true, segs: [...pick(8, D.TRAY_TOP + D.PAY_H, { payload: "held" }), { d: 0.8, to: { shX: D.BIN.cx } }, { d: 0.5, to: { cupZ: D.BIN.top + 2.5 } }, { d: 0.15, at: { payload: "bin", dropZ: D.BIN.top + 1.5 } }, { d: 0.45, to: { dropZ: D.BIN.floor } }, { d: 0.5, to: { cupZ: UP }, at: { screen: "blocked", fw: "bloqueado" } }, { d: 0.6 }] });
    } else {
      steps.push(
        { title: "Cifrado con K2", text: "Limpio: el firewall lo vuelve a cerrar, ahora con K2, la clave del túnel 2 que negoció con el servidor.",
          segs: [{ d: 0.1, at: { fw: "cifra K2" } }, ...pick(8, D.TRAY_TOP + D.PAY_H, { payload: "held" }), { d: 0.9, to: { shX: boxB } }, { d: 0.6, to: { cupZ: onBox } }, { d: 0.15, at: { payload: "boxB" } }, { d: 0.5, to: { cupZ: UP } }, { d: 0.9, to: { lidB: 0 } }] },
        { title: "Entrega", text: "Llega al servidor, que lo descifra con K2. Para el servidor, el cliente es el firewall. La respuesta hace el mismo camino de vuelta.",
          segs: [{ d: 3, to: { carB: D.DOCK.bSv } }, { d: 0.9, to: { lidB: 1 }, at: { sv: "descifra K2" } }, { d: 0.7, to: { payA: 0 }, at: { sv: "GET /saldo", screen: "done" } }, { d: 0.6 }] },
      );
    }
  }
  steps.push({ title: "Fin de la sesión", text: "Se cierran los dos túneles y el ciclo vuelve a empezar.",
    segs: [
      { d: 0.8, to: { forgedA: 0, payA: 0, sockFW: 0, sockCL: 0, ledCert: 0, ledScanG: 0, ledScanR: 0, lampG: 0, lampR: 0, ledInt: 0 } },
      { d: 2.6, to: { carA: INIT.carA, carB: INIT.carB, lidA: 1, lidB: 1, shX: INIT.shX, cupZ: UP }, at: { fw: "en espera", sv: "en espera" } },
      { d: 0.05, at: { forged: "mag", payload: "boxA", sealF: 0, pulseA: 0, pulseB: 0, dropZ: INIT.dropZ, screen: "idle" } },
      { d: 0.6, to: { forgedA: 1 } },
    ] });
  steps.forEach((step) => (step.d = step.segs.reduce((sum, seg) => sum + seg.d, 0)));
  return steps;
}

function stateAt(steps, index, t) {
  const s = { ...INIT };
  for (let i = 0; i <= index; i++) {
    let clock = 0;
    for (const seg of steps[i].segs) {
      if (i === index && t <= clock) return s;
      const f = i === index ? Math.min(1, (t - clock) / seg.d) : 1;
      if (seg.at) Object.assign(s, seg.at);
      if (seg.to) {
        const e = ease(f);
        for (const key in seg.to) s[key] += (seg.to[key] - s[key]) * e;
      }
      if (f < 1) return s;
      clock += seg.d;
    }
  }
  return s;
}

// world positions of the things that change hands
function derive(s) {
  const forged = { mag: [D.MAG.cx, 0, D.MAG.top], die: [D.DIE.cx, 0, D.DIE.top], held: [s.shX, 0, s.cupZ - D.CARD_H], carA: [s.carA + 10, 0, D.CRADLE_TOP] }[s.forged];
  const pay = { boxA: [s.carA - 11, 0, D.BODY_TOP], tray: [8, 0, D.TRAY_TOP], held: [s.shX, 0, s.cupZ - D.PAY_H], boxB: [s.carB + 11, 0, D.BODY_TOP], bin: [D.BIN.cx, 0, s.dropZ] }[s.payload];
  return {
    ...s,
    fx: forged[0], fz: forged[2], px: pay[0], pz: pay[2],
    fSlot: s.forged === "carA" ? "fA" : "T",
    pSlot: s.payload === "boxA" ? "pA" : s.payload === "boxB" ? "pB" : "T",
  };
}
const NUMERIC = Object.keys(INIT).filter((key) => typeof INIT[key] === "number").concat(["fx", "fz", "px", "pz"]);

// ---------- view ----------
const els = {
  carA: part("carA"), carB: part("carB"), lidA: part("lidA"), lidB: part("lidB"), shuttle: part("shuttle"), cup: part("cup"), rod: part("rod"),
  scanner: part("scanner"), scanwin: part("scanwin"), forged: part("forged"), seal: part("forged").querySelector('[data-part="seal"]'), payload: part("payload"),
  pulseA: part("pulseA"), pulseB: part("pulseB"), shutter: part("shutter"), fwlcd: part("fwlcd"), svlcd: part("svlcd"),
  ledInt: part("ledInt"), ledCert: part("ledCert"), ledScanG: part("ledScanG"), ledScanR: part("ledScanR"), lampG: part("lampG"), lampR: part("lampR"),
  sockFW: part("sockFW-circle"), sockCL: part("sockCL-square"), pages: [...stage.querySelectorAll(".tls-page")],
};
const cache = new Map();
const setAttr = (el, name, value) => { const key = el; const memo = cache.get(key) || {}; if (memo[name] !== value) { el.setAttribute(name, value); memo[name] = value; cache.set(key, memo); } };
const setOpacity = (el, value) => setAttr(el, "style", `opacity:${Math.max(0, Math.min(1, value)).toFixed(3)}`);
const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
const place = (el, slot) => { const host = slotOf(slot); if (el.parentNode !== host) host.appendChild(el); };

let shut = { x: 0, v: 0 };
function draw(v) {
  setAttr(els.carA, "transform", tr([v.carA, 0, 0]));
  setAttr(els.carB, "transform", tr([v.carB, 0, 0]));
  setAttr(els.lidA, "transform", tr([v.carA - D.LID_TRAVEL * v.lidA, 0, 0]));
  setAttr(els.lidB, "transform", tr([v.carB + D.LID_TRAVEL * v.lidB, 0, 0]));
  setAttr(els.shuttle, "transform", tr([v.shX, 0, 0]));
  setAttr(els.cup, "transform", tr([v.shX, 0, v.cupZ]));
  const rodFrom = v.cupZ + 4.2;
  const rodKey = `${v.shX.toFixed(2)}|${rodFrom.toFixed(2)}`;
  if (els.rod.dataset.key !== rodKey) {
    els.rod.dataset.key = rodKey;
    els.rod.innerHTML = solidSvg(cylinder(v.shX, 0, 1.3, rodFrom, D.ROD_TOP - rodFrom, P, 16), { tone: "mid", crease: "none" });
  }
  setAttr(els.scanner, "transform", tr([v.scanX - D.SCAN_PARK, 0, 0]));
  setOpacity(els.scanwin, v.scan);
  place(els.forged, v.fSlot);
  setAttr(els.forged, "transform", tr([v.fx, 0, v.fz]));
  setAttr(els.forged, "opacity", v.forgedA.toFixed(3));
  setOpacity(els.seal, v.sealF);
  place(els.payload, v.pSlot);
  setAttr(els.payload, "transform", tr([v.px, 0, v.pz]));
  setOpacity(els.payload, v.payA);
  for (const [el, p, len] of [[els.pulseA, v.pulseA, D.pulse[0]], [els.pulseB, v.pulseB, D.pulse[1]]]) {
    setAttr(el, "style", `stroke-dasharray:10 ${Math.round(len + 40)};stroke-dashoffset:${(10 - p * (len + 10)).toFixed(1)}`);
  }
  for (const name of ["ledInt", "ledCert", "ledScanG", "ledScanR", "lampG", "lampR", "sockFW", "sockCL"]) setOpacity(els[name], v[name]);
  if (v.lampR > 0.01) setAttr(els.sockCL, "data-bad", ""); else if (els.sockCL.hasAttribute("data-bad")) { els.sockCL.removeAttribute("data-bad"); cache.delete(els.sockCL); }
  setAttr(els.shutter, "transform", tr([14 * (1 - shut.x), 0, 0]));
  for (const page of els.pages) page.toggleAttribute("data-on", page.dataset.page === v.screen);
  setText(els.fwlcd, v.fw);
  setText(els.svlcd, v.sv);
}

// ---------- light (WebGL): scan line on the tray, LED light on the panel, the trust lamp on the store ----------
const FRAGMENT = `
uniform float uLight;
uniform float uScan;
uniform float uScanX;
uniform vec4 uLed;
uniform vec2 uLamp;
uniform vec4 uTray;
uniform vec4 uFace;
uniform vec3 uLedX;
uniform vec4 uStore;
uniform vec3 uLampP;
vec4 over(vec4 top,vec4 under){return top+under*(1.-top.a);}
vec4 inkFor(vec3 seen,float cover){vec3 ab=1.-seen;float a=max(max(ab.r,max(ab.g,ab.b)),cover);return vec4(vec3(a)-ab,a);}
float inside(vec2 p,vec4 b,float soft){return window(p.x,b.x,b.z,soft)*window(p.y,b.y,b.w,soft);}
vec4 tintInk(vec3 hue,float amount,float cap){return inkFor(mix(vec3(1.),hue,clamp(amount,0.,1.)*cap),0.);}
vec4 glowInk(vec3 body,vec3 core,float e){
  vec3 seen=mix(vec3(1.),body,smoothstep(0.,.55,e));
  seen=mix(seen,core,smoothstep(.7,1.,e));
  return inkFor(seen,.92*smoothstep(.7,1.,e));
}
const vec3 TEAL=vec3(.04,.6,.6);
const vec3 TEAL_CORE=vec3(.82,1.,.97);
const vec3 AMBER=vec3(.96,.62,.16);
const vec3 GREEN=vec3(.19,.72,.45);
const vec3 RED=vec3(.92,.27,.27);
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  float px=pixelOf();
  vec4 ink=vec4(0.);
  vec3 glow=vec3(0.);
  if(uScan>.001){
    vec3 p=onFloor(vb,${D.TRAY_TOP.toFixed(1)});
    float tray=inside(p.xy,uTray,.5+.7*px/uCam.z);
    float d=p.x-uScanX;
    float core=exp(-d*d/(.55*.55))*window(p.y,uTray.y+1.,uTray.w-1.,1.);
    float wash=exp(-d*d/(4.5*4.5));
    float e=1.-exp(-2.4*core);
    ink=over(glowInk(TEAL,TEAL_CORE,e)*tray*uScan,tintInk(TEAL,wash,.45)*tray*uScan);
    glow+=(TEAL_CORE*core*1.2+TEAL*wash*.5)*tray*uScan;
  }
  vec3 w=onWallY(vb,uFace.x);
  float face=window(w.x,uFace.y,uFace.z,1.5)*window(w.z,uFace.w,${(D.APPL_TOP - 1.5).toFixed(1)},1.5);
  for(int i=0;i<3;i++){
    float x=i==0?uLedX.x:i==1?uLedX.y:uLedX.z;
    float r=length(vec2(w.x-x,w.z-${D.LEDS[0][1].toFixed(1)}));
    float pool=exp(-r*r/(4.2*4.2))*face;
    if(i==0){ink=over(tintInk(AMBER,pool,.55)*uLed.x,ink);glow+=AMBER*pool*uLed.x*.6;}
    if(i==1){ink=over(tintInk(GREEN,pool,.55)*uLed.y,ink);glow+=GREEN*pool*uLed.y*.6;}
    if(i==2){ink=over(tintInk(GREEN,pool,.55)*uLed.z,ink);ink=over(tintInk(RED,pool,.55)*uLed.w,ink);glow+=(GREEN*uLed.z+RED*uLed.w)*pool*.6;}
  }
  vec3 s=onFloor(vb,uLampP.z);
  float store=inside(s.xy,uStore,.8);
  float rl=length(s.xy-uLampP.xy);
  float lamp=exp(-rl*rl/(8.*8.))*store;
  ink=over(tintInk(GREEN,lamp,.5)*uLamp.x,ink);
  ink=over(tintInk(RED,lamp,.5)*uLamp.y,ink);
  glow+=(GREEN*uLamp.x+RED*uLamp.y)*lamp*.5;
  vec4 dark=vec4(tonemap(glow,1.1),0.);
  dark.a=max(dark.r,max(dark.g,dark.b));
  vec4 col=mix(dark,ink,uLight);
  col.rgb=min(col.rgb,vec3(col.a));
  float n=(hash12(gl_FragCoord.xy+fract(uTime*.61)*91.)+hash12(gl_FragCoord.yx*1.37+fract(uTime*.37)*57.)-1.)/255.;
  col=max(col+n*smoothstep(0.,1.5/255.,col.a),0.);
  gl_FragColor=col;
}`;
const layer = glLayer({
  canvas: stage.querySelector(".tls-gl"),
  fragment: FRAGMENT,
  view: [D.W, D.H],
  camera: D.camera,
  uniforms: ["uScan", "uScanX", "uLed", "uLamp"],
  fixed: {
    uLight: LIGHT,
    uTray: [D.TRAY.x + 1, D.TRAY.y + 1, D.TRAY.x + D.TRAY.w - 1, D.TRAY.y + D.TRAY.d - 1],
    uFace: [D.FACE_Y, -54, 54, 6],
    uLedX: D.LEDS.map(([x]) => x),
    uStore: [D.STORE.x + 1.5, D.STORE.y + 1.5, D.STORE.x + D.STORE.w - 1.5, D.STORE.y + D.STORE.d - 1.5],
    uLampP: [D.LAMP[0], D.LAMP[1], D.STORE_H],
  },
});
if (layer) stage.setAttribute("data-gl", "");
let glKey = "";
function drawGl(v, time) {
  if (!layer) return;
  const values = { uScan: v.scan, uScanX: v.scanX, uLed: [v.ledInt, v.ledCert, v.ledScanG, v.ledScanR], uLamp: [v.lampG, v.lampR] };
  const any = v.scan + v.ledInt + v.ledCert + v.ledScanG + v.ledScanR + v.lampG + v.lampR > 1e-3;
  const key = JSON.stringify(values);
  if (!any) { if (glKey !== "off") { layer.clear(); glKey = "off"; } return; }
  if (key === glKey && !v.scan) return;
  glKey = key;
  layer.draw(values, still.matches ? 0.8 : time);
}

// ---------- player ----------
let trust = true;
let mal = false;
let steps = stepsFor(trust, mal);
let index = 0;
let t = 0;
let auto = !still.matches;
let blend = null;
let clock = 0;
let frame = 0;
let last = 0;
let visible = false;
let idle = 0;
let shown = null;

function renderList() {
  list.innerHTML = steps.map((step, i) => `<li data-i="${i}"><b>${step.title}</b><span>${step.text}</span></li>`).join("");
}
function mark() {
  [...list.children].forEach((li, i) => { li.toggleAttribute("data-on", i === index); li.toggleAttribute("data-done", i < index); });
  const step = steps[index];
  const text = `Paso ${index + 1}/${steps.length} · ${step.title}`;
  if (readout.textContent !== text) readout.textContent = text;
  status.textContent = `${step.title}. ${step.text}`;
  const count = document.querySelector("[data-count]");
  if (count) count.textContent = `${index + 1} / ${steps.length}`;
  const on = list.children[index];
  if (on && list.scrollHeight > list.clientHeight) {
    const top = on.offsetTop - list.clientHeight * 0.3;
    list.scrollTo({ top: Math.max(0, top), behavior: still.matches ? "auto" : "smooth" });
  }
}
renderList();
mark();

function go(next, keepTime = false) {
  blend = { from: shown, age: 0, dur: 0.5 };
  index = (next + steps.length) % steps.length;
  if (!keepTime) t = 0;
  mark();
  run();
}
function pause(ms = 25000) {
  auto = false;
  clearTimeout(idle);
  if (!still.matches) idle = setTimeout(() => { auto = true; syncPlay(); run(); }, ms);
  syncPlay();
}
const playButton = document.querySelector('[data-act="play"]');
function syncPlay() { playButton.textContent = auto ? "❚❚ Pausa" : "▶ Reproducir"; playButton.setAttribute("aria-label", auto ? "Pausar" : "Reproducir"); }
syncPlay();

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const step = steps[index];
  if (t < step.d) t = Math.min(step.d, t + dt);
  else if (auto) { index = (index + 1) % steps.length; t = 0; mark(); }
  const target = derive(stateAt(steps, index, t));
  let view = target;
  if (blend && blend.from) {
    blend.age += dt;
    const f = blend.dur ? ease(Math.min(1, blend.age / blend.dur)) : 1;
    view = { ...target };
    for (const key of NUMERIC) view[key] = blend.from[key] + (target[key] - blend.from[key]) * f;
    if (f >= 1) blend = null;
  } else blend = null;
  const shutMoving = settle(shut, trust ? 0 : 1, dt, 0.25);
  shown = view;
  draw(view);
  drawGl(view, clock);
  const busy = auto || t < step.d || blend || shutMoving || view.scan > 0;
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

function toggle(kind, value) {
  const before = steps;
  if (kind === "trust") trust = value; else mal = value;
  steps = stepsFor(trust, mal);
  stage.toggleAttribute("data-mal", mal);
  document.querySelector(`[data-act="${kind}"]`).checked = value;
  const decide = before.findIndex((step) => step.title.startsWith("El cliente"));
  const inspect = before.findIndex((step) => step.title === "Inspección");
  let next = index;
  if (kind === "trust" && index >= decide) next = decide;
  if (kind === "mal" && inspect >= 0 && index > inspect) next = inspect;
  renderList();
  go(Math.min(next, steps.length - 1));
}

stage.addEventListener("click", () => { pause(); go(index + 1); });
stage.addEventListener("keydown", (event) => {
  const key = event.key;
  if (key === "ArrowRight" || key === "Enter") { pause(); go(index + 1); }
  else if (key === "ArrowLeft") { pause(); go(index - 1); }
  else if (key === "Home") { pause(); go(0); }
  else if (key === " ") { auto = !auto; clearTimeout(idle); syncPlay(); run(); }
  else if (key === "t" || key === "T") toggle("trust", !trust);
  else if (key === "m" || key === "M") toggle("mal", !mal);
  else return;
  event.preventDefault();
});
document.querySelector('[data-act="prev"]').addEventListener("click", () => { pause(); go(index - 1); });
document.querySelector('[data-act="next"]').addEventListener("click", () => { pause(); go(index + 1); });
playButton.addEventListener("click", () => { auto = !auto; clearTimeout(idle); syncPlay(); run(); });
document.querySelector('[data-act="trust"]').addEventListener("change", (event) => toggle("trust", event.target.checked));
document.querySelector('[data-act="mal"]').addEventListener("change", (event) => toggle("mal", event.target.checked));
list.addEventListener("click", (event) => { const li = event.target.closest("li"); if (!li) return; pause(); go(Number(li.dataset.i)); });
addEventListener("resize", () => { glKey = ""; if (shown) drawGl(shown, clock); });
const scroller = stage.parentElement;
if (scroller.scrollWidth > scroller.clientWidth) scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) * 0.45;
shown = derive(stateAt(steps, 0, 0));
draw(shown);
window.__tls = { go: (i) => go(i), state: () => ({ index, t, auto }) };
