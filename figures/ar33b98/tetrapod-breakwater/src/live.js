const D = __DATA__;
const root = document.querySelector(".bw");
const stage = root.querySelector(".bw-stage");
const readout = root.querySelector("[data-readout]");
const canvas = stage.querySelector(".bw-gl");
const said = stage.querySelector(".bw-said");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const pale = !!root.closest('[data-theme="light"]');
const TAU = Math.PI * 2;
const SLOW = 0.42;
const clampTo = (value, low, high) => Math.min(high, Math.max(low, value));
const plates = [...stage.querySelectorAll('[data-part="plate"]')];
const rods = [...stage.querySelectorAll('[data-part="rod"]')];
const pointRod = stage.querySelector('[data-part="point-rod"]');
const knobs = ["knob-height", "knob-angle", "knob-level"].map((name) => stage.querySelector(`[data-part="${name}"]`));
const needles = ["needle-open", "needle-lee"].map((name) => stage.querySelector(`[data-part="${name}"]`));
const fallbackWater = stage.querySelector('[data-part="fallback-water"]');
const fallbackCrests = stage.querySelector('[data-part="fallback-crests"]');
const inputs = Object.fromEntries([...root.querySelectorAll("[data-control]")].map((input) => [input.dataset.control, input]));
const outputs = Object.fromEntries([...root.querySelectorAll("[data-out]")].map((output) => [output.dataset.out, output]));

const WATER_GLSL = `
uniform sampler2D uTab;
uniform vec4 uIn;uniform vec4 uBedP;uniform vec4 uMnd;uniform float uHeadC;uniform float uGlass;uniform vec2 uSpan;
uniform vec4 uOcc[7];uniform float uPale;uniform float uOmega;uniform float uGamma;uniform float uL0;
uniform float uClock;uniform float uH0;uniform float uLevel;uniform float uKy;uniform float uKt;uniform vec2 uHead;uniform vec2 uDir;uniform float uStroke;uniform float uLight;uniform float uShore;
const float N=${STATIONS}.;
float gEta;vec2 gGrad;float gBreak;float gHl;float gPhi;float gK;float gHu;
float bedOf(float x){
  float knee=(uBedP.z-uBedP.x)*uBedP.y;
  float ramp=max(x-uBedP.x,0.)*uBedP.y;
  return x<=uBedP.z?ramp:knee+(x-uBedP.z)*uBedP.w;
}
vec2 unpack(vec4 t){t=floor(t*255.+.5);return vec2(t.x*256.+t.y,t.z*256.+t.w)/65535.;}
vec2 tabAt(float x){
  float u=clamp((x-uSpan.x)/(uSpan.y-uSpan.x),0.,1.)*(N-1.);
  float n=floor(u);
  vec2 a=unpack(texture2D(uTab,vec2((n+.5)/N,.5)));
  vec2 b=unpack(texture2D(uTab,vec2((min(n+1.,N-1.)+.5)/N,.5)));
  vec2 v=mix(a,b,u-n);
  return vec2(v.x*120.,v.y*4.);
}
float fresnelOf(float s){float f=(1.+.926*s)/(2.+1.792*s+3.104*s*s);float g=1./(2.+4.142*s+3.492*s*s+6.67*s*s*s);return length(vec2(f,g))*.7071;}
float shelterOf(vec2 p,float lambda){
  vec2 q=p-uHead;
  float along=dot(uDir,q);
  float side=uDir.x*q.y-uDir.y*q.x;
  float sg=side*sqrt(2./(lambda*max(along,lambda*.25)));
  float kd=sg>=0.?fresnelOf(sg):1.-fresnelOf(-sg);
  float through=smoothstep(-lambda*.5,lambda*.5,side);
  float behind=smoothstep(-14.,34.,q.x);
  return mix(1.,min(1.,sqrt(kd*kd+uKt*uKt*through)),behind);
}
void field(vec2 p){
  float h=uLevel-bedOf(p.x);
  vec2 t=tabAt(p.x);
  float kx=(tabAt(p.x+1.5).x-tabAt(p.x-1.5).x)/3.;
  float k=length(vec2(kx,uKy));
  gK=k;
  float lambda=6.2832/max(k,1e-3);
  float K=shelterOf(p,lambda);
  gHu=uH0*t.y*K;
  float hb=uGamma*max(h,0.);
  gHl=min(gHu,hb);
  gBreak=smoothstep(.62,1.,gHu/max(hb,.05));
  vec2 q=p-uHead;
  float side=uDir.x*q.y-uDir.y*q.x;
  float bend=k*(length(q)-dot(uDir,q))*smoothstep(0.,lambda*.5,side)*smoothstep(-14.,34.,q.x);
  float phi=t.x+uKy*p.y-uOmega*uClock+bend;
  gPhi=phi;
  float a=.5*gHl;
  float beta=.22*min(1.,k*a*3.)+.08*gBreak;
  float gam=.26*gBreak;
  float c=cos(phi);float s=sin(phi);float c2=cos(2.*phi);float s2=sin(2.*phi);
  gEta=a*(c+beta*c2-gam*s2);
  float d=a*(-s-2.*beta*s2-2.*gam*c2);
  gGrad=d*vec2(kx,uKy);
}
float sdMound(vec3 p,float grow){
  float c=uMnd.z;float sl=uMnd.w;float nrm=sqrt(1.+sl*sl);
  float d=p.z-c;
  d=max(d,(uMnd.x-sl*(c-p.z)-p.x)/nrm);
  d=max(d,(p.x-uMnd.y-sl*(c-p.z))/nrm);
  d=max(d,(uHeadC-sl*(c-p.z)-p.y)/nrm);
  d=max(d,p.y-uGlass+.3);
  return d-grow;
}
uniform sampler2D uTet;uniform float uTetN;uniform vec4 uLeg;
vec4 tetAt(float i){return texture2D(uTet,vec2((i+.5)/(uTetN*5.),.5));}
vec2 convexHit(vec3 o,vec3 v,float grow){
  float c=uMnd.z;float sl=uMnd.w;float nrm=sqrt(1.+sl*sl);
  float tE=0.;float tX=1e4;
  vec4 pl[5];
  pl[0]=vec4(0.,0.,1.,c+grow);
  pl[1]=vec4(-1./nrm,0.,sl/nrm,(sl*c-uMnd.x)/nrm+grow);
  pl[2]=vec4(1./nrm,0.,sl/nrm,(uMnd.y+sl*c)/nrm+grow);
  pl[3]=vec4(0.,-1./nrm,sl/nrm,(sl*c-uHeadC)/nrm+grow);
  pl[4]=vec4(0.,1.,0.,uGlass-.3);
  for(int i=0;i<5;i++){
    float nv=dot(pl[i].xyz,v);
    float room=pl[i].w-dot(pl[i].xyz,o);
    if(abs(nv)<1e-5){if(room<0.)tX=-1.;}
    else if(nv>0.)tX=min(tX,room/nv);
    else tE=max(tE,room/nv);
  }
  return vec2(tE,tX);
}
float capsuleHide(vec3 o,vec3 v,vec3 a,vec3 b,float r,float soft){
  vec3 ba=b-a;vec3 oa=o-a;
  float baba=dot(ba,ba);float bav=dot(ba,v);float baoa=dot(ba,oa);float voa=dot(v,oa);
  float den=baba-bav*bav;
  float t=den>1e-6?(bav*baoa-baba*voa)/den:0.;
  float u=clamp((baoa+bav*t)/baba,0.,1.);
  vec3 q=a+ba*u;
  t=dot(q-o,v);
  float dist=length(o+v*t-q);
  float reach=t+sqrt(max(r*r-dist*dist,0.));
  return (1.-smoothstep(r-soft,r+soft,dist))*smoothstep(-soft,soft,reach);
}
float hiddenBy(vec3 s,float soft){
  vec3 v=towardViewer();
  float hide=0.;
  vec2 core=convexHit(s,v,0.);
  hide=smoothstep(0.,soft*2.,core.y-core.x);
  vec2 env=convexHit(s,v,uLeg.y+3.);
  if(env.y>env.x&&hide<.999){
    for(int i=0;i<72;i++){
      if(float(i)>=uTetN)break;
      float base=float(i)*5.;
      vec3 c=tetAt(base).xyz;
      vec3 w=c-s;
      vec3 cl=w-v*dot(w,v);
      if(dot(cl,cl)>(uLeg.y+uLeg.z+1.)*(uLeg.y+uLeg.z+1.))continue;
      hide=max(hide,(1.-smoothstep(uLeg.w-soft,uLeg.w+soft,length(cl)))*smoothstep(-soft,soft,dot(w,v)+uLeg.w));
      for(int j=1;j<5;j++){
        vec3 d=tetAt(base+float(j)).xyz;
        hide=max(hide,capsuleHide(s,v,c+d*uLeg.x,c+d*uLeg.y,uLeg.z,soft));
      }
    }
  }
  vec2 vxy=v.xy;float vv=dot(vxy,vxy);
  for(int i=0;i<7;i++){
    vec4 o=uOcc[i];
    vec2 q=o.xy-s.xy;
    float t=dot(q,vxy)/vv;
    float dist=length(q-vxy*t);
    float z=s.z+v.z*t;
    hide=max(hide,(1.-smoothstep(o.z-soft,o.z+soft,dist))*smoothstep(-.5,.5,t)*(1.-smoothstep(o.w-.5,o.w+.5,z)));
  }
  return hide;
}
vec4 over(vec4 top,vec4 under){return top+under*(1.-top.a);}
float lw0(){return .8*pixelOf()/mix(1.,uCam.z,.5);}
float foamAt(vec2 p,float phiWrap,float brk,float drift){
  float behind=phiWrap<.35?exp((phiWrap-.35)*1.1):0.;
  behind*=1.-smoothstep(.35,.7,phiWrap);
  float n=fbm2(p*.16+vec2(-drift,0.)+vec2(0.,uClock*.07));
  float m=fbm2(p*.5+vec2(uClock*.11,-drift*1.7));
  float crest=smoothstep(.32,.62,behind*(.55+.7*n));
  float lace=smoothstep(.56,.74,n*.7+m*.45)*.55;
  return brk*max(crest,lace*smoothstep(.2,.9,behind+.25));
}
vec3 waterTint(float depth){
  vec3 shallow=uPale>.5?vec3(.80,.85,.875):vec3(.20,.25,.28);
  vec3 deep=uPale>.5?vec3(.50,.585,.64):vec3(.085,.115,.14);
  return mix(shallow,deep,1.-exp(-depth/14.));
}
vec3 dither(vec3 c,float a){
  float n=(hash12(gl_FragCoord.xy+fract(uClock*.61)*91.)+hash12(gl_FragCoord.yx*1.37+fract(uClock*.37)*57.)-1.)/255.;
  return max(c+n*smoothstep(0.,1.5/255.,a),0.);
}
float paddleAt(float y){return uSpan.x-.5*uStroke*sin(uKy*y-uOmega*uClock);}
float runAt(float y){
  vec2 p=vec2(100.,y);
  field(p);
  float hg=max(gHl,.01);
  float xi=uBedP.w/sqrt(hg/uL0);
  return min(1.2*xi,2.2)*hg/uBedP.w;
}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  float px=pixelOf();
  float soft=.7*px/uCam.z;
  vec3 v=towardViewer();
  vec3 L=lightDir();
  vec4 ink=vec4(0.);
  vec3 g=onWallY(vb,uGlass);
  float alongGlass=window(g.x,uSpan.x,uIn.z,.7*px/uCam.x);
  bool band=false;
  if(alongGlass>.001&&g.z<uLevel+10.){
    field(vec2(g.x,uGlass));
    float surf=uLevel+gEta;
    float floorZ=max(bedOf(g.x),uMnd.z-max(max(uMnd.x-g.x,g.x-uMnd.y),0.)/uMnd.w);
    float sz=.7*px/uCam.w;
    float inside=window(g.z,floorZ,surf,sz)*alongGlass*smoothstep(uSpan.x-1.,uSpan.x+1.,g.x-(paddleAt(uGlass)-uSpan.x));
    if(inside>.001){
      band=g.z<surf-sz;
      float under=surf-g.z;
      vec3 tint=waterTint(24.+under*1.5);
      float a=(uPale>.5?.5:.62)+.3*(1.-exp(-under/18.));
      vec4 body=vec4(tint*a,a);
      float lineW=max(.45,1.1*sz);
      float meniscus=exp(-pow((under-.35)/lineW,2.));
      float bubbles=gBreak*smoothstep(.55,.8,fbm2(vec2(g.x*.35-uClock*.6,g.z*.5)))*exp(-under/(2.+gHl*.6));
      vec3 white=uPale>.5?vec3(1.):vec3(.82,.86,.88);
      body=over(vec4(white,1.)*clamp(meniscus*.55+bubbles*.8,0.,1.),body);
      ink=body*inside;
    }
  }
  if(!band){
    vec3 s=onFloor(vb,uLevel);
    float inX=smoothstep(-soft,soft,s.x-paddleAt(s.y))*smoothstep(-soft,soft,uIn.z-s.x);
    float inY=smoothstep(-soft,soft,s.y-uIn.y)*smoothstep(-soft,soft,uGlass-s.y);
    float inside=inX*inY;
    if(inside>.001){
      field(s.xy);
      float eta=gEta;vec2 grad=gGrad;float brk=gBreak;float hl=gHl;float phi=gPhi;
      float bed=bedOf(s.x);
      float depth=uLevel+eta-bed;
      float run=runAt(s.y);
      field(s.xy);
      float phiShore=tabAt(uShore).x+uKy*s.y-uOmega*uClock;
      float rush=pow(max(0.,.5+.5*cos(phiShore-.7)),1.6);
      float front=uShore+run*rush;
      float sheet=smoothstep(-soft*2.,soft*2.,front-s.x);
      float wetTo=uShore+run;
      float wetSand=(1.-smoothstep(wetTo-6.,wetTo+3.,s.x))*smoothstep(uShore-2.,uShore+2.,s.x)*(1.-sheet);
      float wet=max(smoothstep(-.3,.3,depth),sheet);
      vec3 sp=vec3(s.xy,uLevel+eta);
      float inMound=0.;
      float hide=hiddenBy(sp,.8*px);
      float vis=inside*(1.-hide)*(1.-inMound);
      if(vis>.001){
        vec2 rp=s.xy*vec2(.55,.8)+vec2(-uClock*1.1,uClock*.23);
        float e0=noise2(rp);
        vec2 chop=vec2(noise2(rp+vec2(.35,0.))-e0,noise2(rp+vec2(0.,.35))-e0)/.35;
        chop+=.5*vec2(noise2(rp*2.3+vec2(.2,0.)+7.)-noise2(rp*2.3+7.),noise2(rp*2.3+vec2(0.,.2)+7.)-noise2(rp*2.3+7.))/.2;
        vec3 n=normalize(vec3(-grad-chop*.035*(.35+.65*clamp(hl/4.,0.,1.)),1.));
        float cosI=max(dot(n,v),0.);
        float fres=.02+.98*pow(1.-cosI,5.);
        vec3 r=reflect(-v,n);
        float lam=dot(n,L)-dot(vec3(0.,0.,1.),L);
        float d=max(depth,0.);
        vec3 tint=waterTint(d);
        tint*=1.+(uPale>.5?1.5:3.)*lam;
        float ampl=smoothstep(.3,2.5,hl);
        float cr=clamp(eta/max(.5*hl,.3),-1.,1.)*ampl;
        float crest=pow(max(cos(phi-.12),0.),28.)*ampl*(1.-.6*brk);
        tint*=1.+(uPale>.5?.1:.42)*cr+(uPale>.5?.12:.5)*crest;
        float a=(uPale>.5?.86:.9)*(1.-exp(-d/(uPale>.5?7.:6.)));
        a=max(a,.06*sheet);
        a=mix(a,.12,smoothstep(.3,-.6,depth)*sheet);
        vec4 body=vec4(tint*a,a)*wet;
        float sky=uPale>.5?smoothstep(-.1,.9,r.z):mix(.08,.5,smoothstep(-.1,.9,r.z));
        float spec=pow(max(dot(r,L),0.),90.)*(uPale>.5?.8:1.6);
        float refl=clamp(fres*sky*(uPale>.5?.5:1.)+spec,0.,1.)*wet;
        vec3 white=uPale>.5?vec3(1.):vec3(.86,.89,.9);
        vec4 shine=vec4(white*refl,refl*(uPale>.5?1.:.55));
        float wrap=mod(phi+3.1416,6.2832)-3.1416;
        float drift=uClock*.9;
        float foam=foamAt(s.xy,wrap,brk*smoothstep(.0,.6,hl),drift);
        float dm=sdMound(vec3(s.xy,uLevel),0.);
        float inc=uH0*tabAt(s.x).y;
        float pulse=pow(.5+.5*cos(phi-.5),3.);
        float exposed=1.-.85*smoothstep(-14.,34.,s.x-uHead.x)*smoothstep(-4.,8.,s.y-uHead.y);
        float wash=exp(-max(dm-3.6,0.)/(.9+inc*.22))*clamp(inc/6.,0.,1.2)*(.2+1.*pulse)*exposed;
        float churn=fbm2(s.xy*1.3+vec2(uClock*.9,-uClock*.4))*.65+fbm2(s.xy*3.1-vec2(uClock*.6,0.))*.35;
        wash*=smoothstep(.38,.62,churn+.25*pulse-.1);
        float edge=exp(-pow((front-s.x)/(.8+run*.04),2.))*smoothstep(.2,1.5,run)*smoothstep(uShore-6.,uShore,s.x);
        edge*=smoothstep(.5,.78,fbm2(s.xy*vec2(.8,.45)+vec2(0.,uClock*.3)))*.7;
        float froth=clamp(foam+wash+edge*.7,0.,1.);
        float rim=exp(-pow((front+.9-s.x)/(.35+lw0()),2.))*smoothstep(.2,1.2,run)*smoothstep(uShore-6.,uShore,s.x)*uPale;
        vec4 foamInk=vec4(white,1.)*froth*(uPale>.5?.92:.8)*wet;
        float lw=.8*px/mix(1.,uCam.z,.5);
        float toCrest=abs(wrap)/max(gK,1e-3);
        float strength=smoothstep(.15,3.2,hl)*(1.-.7*brk)*smoothstep(-.4,.4,depth);
        float line=(1.-smoothstep(lw*.35,lw*1.25,toCrest))*strength;
        float la=line*(uPale>.5?.62:.7);
        vec4 lineInk=vec4((uPale>.5?vec3(.2,.24,.27):vec3(.66,.74,.78))*la,la);
        ink=over(vec4(vec3(.36,.38,.38)*.55,.55)*rim,over(foamInk,over(lineInk,over(shine,body))))*vis;
      }
      float dryVis=inside*(1.-hide)*wetSand;
      vec4 damp=uPale>.5?vec4(vec3(.5,.47,.4)*.3,.3):vec4(vec3(0.),.32);
      ink=over(ink,damp*dryVis);
    }
  }
  ink.rgb=min(ink.rgb,vec3(ink.a));
  ink*=uLight;
  ink.rgb=dither(ink.rgb,ink.a);
  gl_FragColor=ink;
}`;

const FIXED = {
  uIn: D.inside,
  uBedP: [BEACH.toe, BEACH.ramp, BEACH.knee, BEACH.slope],
  uMnd: [BW.sea, BW.lee, BW.crest, BW.slope],
  uHeadC: BW.head,
  uGlass: BW.glass,
  uSpan: [PADDLE_X, END_X],
  uOcc: D.occluders,
  uPale: pale ? 1 : 0,
  uOmega: OMEGA,
  uGamma: BREAK,
  uL0: deepLength(),
};
const TET_N = D.tetra.length / 20;
FIXED.uTetN = TET_N;
FIXED.uLeg = D.leg;
const NAMES = ["uClock", "uH0", "uLevel", "uKy", "uKt", "uHead", "uDir", "uStroke", "uLight", "uShore"];
const layer = glLayer({ canvas, fragment: WATER_GLSL, extensions: [], view: [D.W, D.H], camera: D.camera, uniforms: NAMES, fixed: FIXED });
const bytes = new Uint8Array(STATIONS * 4);
let texture = null;
if (layer) {
  const gl = layer.gl;
  texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, STATIONS, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.getExtension("OES_texture_float");
  const tet = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, tet);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TET_N * 5, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array(D.tetra));
  gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "uTet"), 1);
  gl.activeTexture(gl.TEXTURE0);
  stage.setAttribute("data-gl", "");
}

const R = D.range;
const value = { height: { x: D.start.height, v: 0 }, angle: { x: D.start.angle, v: 0 }, level: { x: D.start.level, v: 0 } };
const target = { ...D.start };
let model = stateOf(value.height.x, value.angle.x, value.level.x);
let clock = 0;
let light = 0;
let lightClock = 0;
let touring = !still.matches;
let tourClock = 0;
let tourFrom = { ...D.start };
let idleTimer = 0;
let sayTimer = 0;
let visible = false;
let frame = 0;
let last = 0;
let dirty = true;

function put(index, v, low, high) {
  const code = Math.round(clampTo((v - low) / (high - low), 0, 1) * 65535);
  bytes[index] = code >> 8;
  bytes[index + 1] = code & 255;
}

function upload() {
  if (!layer) return;
  for (let i = 0; i < STATIONS; i++) {
    put(i * 4, model.table.phase[i], 0, 120);
    put(i * 4 + 2, model.table.shoal[i], 0, 4);
  }
  const gl = layer.gl;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, STATIONS, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
}

const angleOfKnob = (v, [low, high]) => ((-135 + (270 * (v - low)) / (high - low)) * Math.PI) / 180;

function drawKnob(path, [cx, cy], a) {
  path.setAttribute("d", lineOnTop([cx + Math.sin(a) * 1.4, cy - Math.cos(a) * 1.4], [cx + Math.sin(a) * 5.2, cy - Math.cos(a) * 5.2], D.boxTop + 6.2, D.P));
}

function drawNeedle(path, [cx, cy], eta) {
  const a = (clampTo(eta / 5, -1, 1) * 55 * Math.PI) / 180;
  path.setAttribute("d", lineOnTop([cx - Math.sin(a) * 2, cy + Math.cos(a) * 2], [cx + Math.sin(a) * 9.6, cy - Math.cos(a) * 9.6], D.boxTop + 3.2, D.P));
}

function drawSvg(t) {
  for (let i = 0; i < plates.length; i++) {
    const y = D.inside[1] + D.segW * (i + 0.5);
    const shift = -0.5 * model.stroke * Math.sin(model.table.ky * y - OMEGA * t);
    const move = translateAlong(D.P, [shift, 0, 0]);
    plates[i].setAttribute("transform", move);
    rods[i].setAttribute("transform", move);
    const [dx, dy] = move.match(/-?[\d.]+/g).map(Number);
    holdStill(rods[i], [dx, dy]);
  }
  pointRod.setAttribute("transform", translateAlong(D.P, [0, 0, value.level.x - D.start.level]));
  drawKnob(knobs[0], D.knobs[0], angleOfKnob(value.height.x, R.height));
  drawKnob(knobs[1], D.knobs[1], angleOfKnob(value.angle.x, R.angle));
  drawKnob(knobs[2], D.knobs[2], angleOfKnob(value.level.x, R.level));
  drawNeedle(needles[0], D.meters[0], etaOf(model, GAUGES.x, GAUGES.open, t));
  drawNeedle(needles[1], D.meters[1], etaOf(model, GAUGES.x, GAUGES.lee, t));
  if (!layer) drawFallback(t);
}

function drawFallback(t) {
  const z = value.level.x;
  const xs = shoreOf(z);
  const [x0, y0, , y1] = D.inside;
  fallbackWater.setAttribute("d", pathOf([[x0 + 10, y0, z], [xs, y0, z], [xs, y1, z], [x0 + 10, y1, z]].map((p) => iso(p, D.P)), true));
  const lines = [];
  for (let x = PADDLE_X + 8; x < xs - 4; x += 2) {
    const phi = sampleOf(model.table.phase, x) - OMEGA * t;
    if (Math.cos(phi) > 0.995 && x < BW.sea - 30) lines.push(pathOf([[x, y0, z], [x, y1, z]].map((p) => iso(p, D.P))));
  }
  fallbackCrests.setAttribute("d", lines.join(""));
}

function drawGl() {
  if (!layer || !canvas.clientWidth) return;
  layer.draw(
    {
      uClock: clock,
      uH0: model.height,
      uLevel: model.level,
      uKy: model.table.ky,
      uKt: model.kt,
      uHead: [BW.sea + 10, model.head],
      uDir: model.dir,
      uStroke: model.stroke,
      uLight: light,
      uShore: model.shore,
    },
    0,
  );
}

function show() {
  outputs.height.textContent = `${metres(value.height.x).toFixed(1)} m`;
  outputs.angle.textContent = `${value.angle.x >= 0 ? "+" : "−"}${Math.abs(value.angle.x).toFixed(0)}°`;
  const surge = metres(value.level.x - DATUM);
  outputs.level.textContent = `${surge >= 0 ? "+" : "−"}${Math.abs(surge).toFixed(1)} m`;
  const text = root.clientWidth < 560 ? `open ${metres(model.open).toFixed(1)} m · lee ${metres(model.lee).toFixed(1)} m (−${Math.round((1 - model.lee / Math.max(model.open, 1e-6)) * 100)}%)` : readoutOf(model);
  if (readout.textContent !== text) readout.textContent = text;
}

function tourAt(time) {
  const blend = smooth(0, 1, time / 3);
  const aim = {
    height: 5.8 + 2.2 * Math.sin((time * TAU) / 23 + 0.4),
    angle: -12 + 20 * Math.sin((time * TAU) / 31),
    level: 30.4 + 2.6 * Math.sin((time * TAU) / 41 - 0.9),
  };
  return Object.fromEntries(Object.keys(aim).map((key) => [key, tourFrom[key] + (aim[key] - tourFrom[key]) * blend]));
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring && !calm) {
    tourClock += dt;
    const aim = tourAt(tourClock);
    for (const key of Object.keys(aim)) {
      target[key] = aim[key];
      inputs[key].value = aim[key].toFixed(key === "angle" ? 0 : 1);
    }
  }
  let changed = dirty;
  for (const key of Object.keys(value)) {
    const before = value[key].x;
    settle(value[key], target[key], dt, 0.45, calm);
    if (value[key].x !== before) changed = true;
  }
  if (changed) {
    model = stateOf(value.height.x, value.angle.x, value.level.x);
    upload();
    show();
  }
  if (!calm) clock += dt * SLOW;
  lightClock += dt;
  light = calm ? 1 : smooth(0, 1, (lightClock - 0.1) / 0.8);
  drawSvg(clock);
  drawGl();
  dirty = false;
  const rest = calm && !changed && light === 1;
  frame = visible && !rest ? requestAnimationFrame(tick) : 0;
}

function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}

function hold() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (still.matches) return;
    touring = true;
    tourClock = 0;
    tourFrom = { height: value.height.x, angle: value.angle.x, level: value.level.x };
    run();
  }, 12000);
}

function announce() {
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => {
    const words = wordsOf(stateOf(target.height, target.angle, target.level));
    if (said.textContent !== words) said.textContent = words;
  }, 700);
}

for (const [key, input] of Object.entries(inputs)) {
  input.addEventListener("input", () => {
    target[key] = clampTo(Number(input.value), R[key][0], R[key][1]);
    dirty = true;
    hold();
    announce();
    run();
  });
}

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

still.addEventListener("change", () => {
  touring = !still.matches;
  dirty = true;
  run();
});
window.addEventListener("resize", () => {
  dirty = true;
  run();
});
if (matchMedia("(hover: none)").matches) {
  const hint = root.querySelector('[data-corner="hint"]');
  if (hint) hint.textContent = "Drag the sliders below";
}
upload();
show();
drawSvg(0);
