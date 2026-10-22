// ------------------------------------------------------------------ streamlines (WebGL, with an SVG fallback)
(() => {
  const LIGHT = document.body.dataset.theme === "light" ? 1 : 0;
  const cam = D.camera;
  const canvases = [stage1.querySelector(".wt-gl-back"), stage1.querySelector(".wt-gl-front")];
  const fallbacks = [stage1.querySelector(".wt-fallback-back [data-lines]"), stage1.querySelector(".wt-fallback-front [data-lines]")];
  const R = RIG.GEO.blade.R;

  const VS = `precision highp float;
attribute vec3 aP;attribute vec3 aT;attribute float aS;attribute float aTau;attribute float aF;
uniform vec2 uView;uniform vec2 uOrigin;uniform float uK;uniform vec4 uCam;uniform float uHalf;
varying vec3 vP;varying float vS;varying float vTau;varying float vF;
vec2 proj(vec3 p){return uOrigin+uK*vec2(p.x*uCam.x-p.y*uCam.y,(p.x*uCam.y+p.y*uCam.x)*uCam.z-p.z*uCam.w);}
void main(){
  vec2 s=proj(aP);
  vec2 d=proj(aP+aT)-s;
  d=d/max(length(d),1e-5);
  vec2 q=s+vec2(-d.y,d.x)*aS*uHalf;
  vP=aP;vS=aS;vTau=aTau;vF=aF;
  gl_Position=vec4(q.x/uView.x*2.-1.,1.-q.y/uView.y*2.,0.,1.);
}`;

  const FS = `
uniform float uSide;uniform float uPeriod;uniform vec3 uInk;uniform float uBase;uniform float uPulse;uniform float uAmt;
uniform vec2 uYaw;uniform vec3 uHub;uniform vec3 uNose;uniform vec4 uTower;uniform vec3 uBoxA;uniform vec3 uBoxB;
uniform vec3 uBd[3];uniform vec3 uBc[3];uniform vec3 uBn[3];
varying vec3 vP;varying float vS;varying float vTau;varying float vF;
float chordAt(float r){
  if(r<=8.2)return 1.9+1.3*smoothstep(3.,8.2,r);
  float o=clamp((r-8.2)/31.,0.,1.);
  return 3.2-2.25*pow(o,.85);
}
float nearest(vec3 p,vec3 V){
  float best=-1e9;
  // tower cone about z
  float kk=(uTower.w-uTower.z)/(uTower.y-uTower.x);
  float c0=uTower.z-kk*uTower.x;
  float A=V.x*V.x+V.y*V.y-kk*kk*V.z*V.z;
  float cz=c0+kk*p.z;
  float B=2.*(p.x*V.x+p.y*V.y-cz*kk*V.z);
  float C=p.x*p.x+p.y*p.y-cz*cz;
  float disc=B*B-4.*A*C;
  if(disc>=0.){
    float sq=sqrt(disc);
    for(int i=0;i<2;i++){
      float t=(-B+(i==0?-sq:sq))/(2.*A);
      vec3 q=p+V*t;
      if(q.z>=uTower.x&&q.z<=uTower.y)best=max(best,dot(q,V));
    }
  }
  // nacelle box in the nacelle frame
  vec3 lp=vec3(p.x*uYaw.x+p.y*uYaw.y,-p.x*uYaw.y+p.y*uYaw.x,p.z);
  vec3 lv=vec3(V.x*uYaw.x+V.y*uYaw.y,-V.x*uYaw.y+V.y*uYaw.x,V.z);
  vec3 ta=(uBoxA-lp)/lv;vec3 tb=(uBoxB-lp)/lv;
  vec3 tmin=min(ta,tb);vec3 tmax=max(ta,tb);
  float tn=max(max(tmin.x,tmin.y),tmin.z);float tf=min(min(tmax.x,tmax.y),tmax.z);
  if(tn<=tf)best=max(best,dot(p+V*tf,V));
  // hub and nose balls
  vec3 oc=p-uHub;float b=dot(oc,V);float dd=b*b-(dot(oc,oc)-1.6*1.6);
  if(dd>=0.)best=max(best,dot(p+V*(-b+sqrt(dd)),V));
  oc=p-uNose;b=dot(oc,V);dd=b*b-(dot(oc,oc)-1.05*1.05);
  if(dd>=0.)best=max(best,dot(p+V*(-b+sqrt(dd)),V));
  // blades as chord planes
  for(int i=0;i<3;i++){
    float den=dot(uBn[i],V);
    if(abs(den)<1e-6)continue;
    float t=dot(uBn[i],uHub-p)/den;
    vec3 q=p+V*t;vec3 rel=q-uHub;
    float r=dot(rel,uBd[i]);
    if(r<1.6||r>${R.toFixed(1)})continue;
    float c=dot(rel,uBc[i]);float ch=chordAt(r);
    if(c>.3*ch||c<-.7*ch)continue;
    best=max(best,dot(q,V));
  }
  return best;
}
void main(){
  vec3 V=towardViewer();
  vec2 vb=viewOf(gl_FragCoord.xy);
  float near=nearest(rayOf(vb),V);
  float front=step(near+.25,dot(vP,V));
  float keep=mix(1.-front,front,uSide);
  float g=fract((vTau-uTime)/uPeriod);
  float comet=pow(g,7.)*(1.-smoothstep(.975,1.,g));
  float thin=1.-smoothstep(.2,.55,abs(vS));
  float wide=1.-smoothstep(.45,1.,abs(vS));
  vec2 c=gl_FragCoord.xy/uCanvas;
  float edge=smoothstep(0.,.07,min(c.x,1.-c.x))*smoothstep(0.,.07,min(c.y,1.-c.y));
  float a=(uBase*thin+uPulse*comet*wide)*vF*uAmt*keep*edge;
  a=min(a,.92);
  gl_FragColor=vec4(uInk*a,a);
}`;

  function makeLayer(canvas) {
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: false });
    if (!gl) return null;
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VS);
    const fs = compile(gl.FRAGMENT_SHADER, GLSL_ISO + FS);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return null;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    const loc = (n) => gl.getUniformLocation(prog, n);
    const attr = Object.fromEntries(["aP", "aT", "aS", "aTau", "aF"].map((n) => [n, gl.getAttribLocation(prog, n)]));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return { gl, prog, buf, loc, attr, count: 0, runs: [] };
  }

  const layers = canvases.map((c) => (c ? makeLayer(c) : null));
  const glOn = layers.every(Boolean);
  if (glOn) stage1.setAttribute("data-gl", "");

  const STRIDE = 9;
  let geomKey = "";
  let runs = [];
  let data = null;
  let fallbackKey = "";

  function rebuild(s, hub) {
    const lines = FLOW.streamlines({ v: s.vn, dir: s.dir, a: s.a, lambda: s.lambda || 0, rpm: s.rpm }, hub, R, G.viewOf(D.P));
    const total = lines.reduce((n, l) => n + l.pts.length * 2, 0);
    data = new Float32Array(total * STRIDE);
    runs = [];
    let o = 0;
    for (const line of lines) {
      const start = o / STRIDE;
      const n = line.pts.length;
      const weight = line.weight;
      for (let i = 0; i < n; i++) {
        const p = line.pts[i];
        const a = line.pts[Math.max(0, i - 1)];
        const b = line.pts[Math.min(n - 1, i + 1)];
        const t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const f = FLOW.fadeAt(i, n) * weight;
        for (const side of [-1, 1]) {
          data.set([p[0], p[1], p[2], t[0], t[1], t[2], side, line.tau[i], f], o);
          o += STRIDE;
        }
      }
      runs.push([start, n * 2]);
    }
    for (const L of layers) {
      if (!L) continue;
      const { gl } = L;
      gl.bindBuffer(gl.ARRAY_BUFFER, L.buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    }
    return lines;
  }

  function fit(canvas, gl) {
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(box.width * ratio));
    const h = Math.max(1, Math.round(box.height * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    return [canvas.width, canvas.height];
  }

  let amt = { x: 0, v: 0 };
  let lastLines = null;
  window.__flowDraw = (s, dt, time) => {
    const calm = still.matches;
    const X = FLOW.proxiesOf(RIG.GEO, RIG.sectionAt, s.yaw, s.rotor, s.pitch);
    const hubW = X.hub;
    const key = [s.a.toFixed(3), s.dir.toFixed(1), s.yaw.toFixed(2), (Math.round(s.vn * 20) / 20).toFixed(2), s.rpm.toFixed(1)].join("|");
    if (key !== geomKey) {
      lastLines = rebuild(s, hubW);
      geomKey = key;
    }
    settle(amt, Math.min(1, Math.max(0, (s.vn - 0.4) / 1.6)), dt, 0.6, calm);
    const t = calm ? 0.6 : time;
    if (glOn) {
      for (let side = 0; side < 2; side++) {
        const L = layers[side];
        const { gl, loc, attr } = L;
        const [cw, ch] = fit(canvases[side], gl);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (amt.x < 0.002) continue;
        gl.useProgram(L.prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, L.buf);
        const B = STRIDE * 4;
        gl.enableVertexAttribArray(attr.aP);
        gl.vertexAttribPointer(attr.aP, 3, gl.FLOAT, false, B, 0);
        gl.enableVertexAttribArray(attr.aT);
        gl.vertexAttribPointer(attr.aT, 3, gl.FLOAT, false, B, 12);
        gl.enableVertexAttribArray(attr.aS);
        gl.vertexAttribPointer(attr.aS, 1, gl.FLOAT, false, B, 24);
        gl.enableVertexAttribArray(attr.aTau);
        gl.vertexAttribPointer(attr.aTau, 1, gl.FLOAT, false, B, 28);
        gl.enableVertexAttribArray(attr.aF);
        gl.vertexAttribPointer(attr.aF, 1, gl.FLOAT, false, B, 32);
        gl.uniform2f(loc("uCanvas"), cw, ch);
        gl.uniform2f(loc("uView"), D.W1, D.H1);
        gl.uniform2f(loc("uOrigin"), cam.origin[0], cam.origin[1]);
        gl.uniform1f(loc("uK"), cam.k);
        gl.uniform4f(loc("uCam"), cam.cam[0], cam.cam[1], cam.cam[2], cam.cam[3]);
        gl.uniform1f(loc("uTime"), t);
        gl.uniform1f(loc("uHalf"), 1.35);
        gl.uniform1f(loc("uSide"), side);
        gl.uniform1f(loc("uPeriod"), 1.3);
        gl.uniform3fv(loc("uInk"), LIGHT ? [0.16, 0.22, 0.28] : [0.82, 0.87, 0.92]);
        gl.uniform1f(loc("uBase"), LIGHT ? 0.3 : 0.32);
        gl.uniform1f(loc("uPulse"), LIGHT ? 0.72 : 0.7);
        gl.uniform1f(loc("uAmt"), amt.x);
        gl.uniform2f(loc("uYaw"), X.cg, X.sg);
        gl.uniform3fv(loc("uHub"), X.hub);
        gl.uniform3fv(loc("uNose"), X.nose);
        gl.uniform4fv(loc("uTower"), X.tower);
        gl.uniform3fv(loc("uBoxA"), [X.box[0], X.box[2], X.box[4]]);
        gl.uniform3fv(loc("uBoxB"), [X.box[1], X.box[3], X.box[5]]);
        gl.uniform3fv(loc("uBd"), X.blades.flatMap((b) => b.d));
        gl.uniform3fv(loc("uBc"), X.blades.flatMap((b) => b.c));
        gl.uniform3fv(loc("uBn"), X.blades.flatMap((b) => b.n));
        for (const [start, count] of runs) gl.drawArrays(gl.TRIANGLE_STRIP, start, count);
      }
    } else if (key !== fallbackKey && lastLines) {
      // SVG fallback: the same lines, each point sent behind or in front of the
      // turbine by the same proxies, drawn as dashed flow lines.
      fallbackKey = key;
      const V = G.viewOf(D.P);
      const bodies = [[], []];
      for (const line of lastLines) {
        let run = [];
        let side = -1;
        line.pts.forEach((p, i) => {
          const f = FLOW.fadeAt(i, line.pts.length);
          const front = FLOW.nearestDepth(p, V, X, RIG.sectionAt, R) < G.dot3(p, V) - 0.25 ? 1 : 0;
          if (f < 0.25 || front !== side) {
            if (run.length > 1) bodies[side].push(k.pathOf(run));
            run = f < 0.25 ? [] : [k.iso(p, D.P)];
            side = f < 0.25 ? -1 : front;
            return;
          }
          run.push(k.iso(p, D.P));
        });
        if (run.length > 1 && side >= 0) bodies[side].push(k.pathOf(run));
      }
      fallbacks.forEach((el, i) => (el.innerHTML = `<path class="iso-line" data-free="" d="${bodies[i].join("")}"/>`));
    }
  };
})();
