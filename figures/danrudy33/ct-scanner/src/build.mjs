// CT Build, milestone 2: colourful interactive anatomy plus real fan-beam acquisition/FBP.
// Standalone and offline. 1 unit=cm. WORLD x=horizontal patient axis; WORLD z=up.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as k from './vendor-iso-kit.mjs';
import * as G from './vendor-lathe.mjs';
import * as A from './vendor-audit.mjs';
import {turning} from './vendor-turn-build.mjs';
import * as TA from './vendor-turn-audit.mjs';
import {turnScript} from './vendor-inline-kit.mjs';
import {SCANNER,derived,SLOW} from './model.mjs';
import {sceneValues} from './motion.mjs';
import {PHANTOM} from './reconstruction.mjs';
import {HARDWARE,beamGeometry} from './beam-geometry.mjs';
const HERE=dirname(fileURLToPath(import.meta.url));
const argv=process.argv.slice(2), light=argv.includes('--light'), verify=argv.includes('--verify');
const W=800,H=590, PX=80, Z=SCANNER.isoHeight, C=[0,0,Z], N=16, da=2*Math.PI/N;
const D=derived(), F={o:C,a:[1,0,0],u:[0,1,0],v:[0,0,1]};
const B=beamGeometry();
const RIM=230, pts=[];
// Bounds include every staged exploded position and every orbit, not just the rest pose.
for(let j=0;j<48;j++) for(const z of [-12,220]) pts.push([PX+RIM*Math.cos(j*2*Math.PI/48),RIM*Math.sin(j*2*Math.PI/48),z]);
export const P=k.fitProjection(pts,W,H,{pad:18,azimuth:40,elevation:26});
export const R=A.recorder(P);
const base=k.cylinder(PX,0,182,-12,12,P,96);
R.put({name:'display.plinth',layer:'back',at:[PX,0,-12],svg:k.solidSvg(base,{tone:'lo'}),shapes:[R.solid(A.cylinder(PX,0,182,-12,12,{ground:true,name:'display.plinth'}))]});
export const T=turning(P,{recorder:R});
const orbit=T.group('orbit',{turn:{pivot:[PX,0]}});
const slide=(name,parent,direction,travel)=>T.group(name,{parent,slide:{direction,travel}});
const cover=slide('cover',orbit,[0,1,0],115), coverOther=slide('coverOther',orbit,[0,-1,0],115), extract=slide('extract',orbit,[1,0,0],65);
const rotor=T.group('rotor',{parent:extract,hinge:{point:C,axis:[1,0,0],range:[0,360]}});
const tube=slide('tube',rotor,[0,0,1],45), sleeve=slide('sleeve',tube,[1,0,0],24);
const detector=slide('detector',rotor,[0,0,-1],25), module=slide('module',detector,[1,0,0],20);
const grid=slide('grid',module,[0,0,1],12), scintillator=slide('scintillator',module,[0,0,1],8), diode=slide('diode',module,[0,0,1],4);
const generator=slide('generator',rotor,[0,1,0],32), das=slide('das',rotor,[0,-1,0],30), slip=slide('slip',rotor,[1,0,0],30);
const withdraw=slide('withdraw',orbit,[1,0,0],40), table=slide('table',withdraw,[-1,0,0],120);
// Withdraw the stationary brush past the opened cover, then radially clear
// the track BEFORE extracting the rotor. Otherwise the track crosses its pickup.
const brushOut=slide('brushOut',orbit,[1,0,0],30), brushClear=slide('brushClear',brushOut,[0,1,0],15);
const layer=T.layer('scanner'); T.stack(['back','scanner']);
const prism=(name,group,poly,x0,x1,material='steel',extra={})=>T.prism({name,group,layer,F,polygon:poly,s0:x0,s1:x1,material,...extra});
const ring=(r0,r1,a,b)=>[[r0*Math.cos(a),r0*Math.sin(a)],[r1*Math.cos(a),r1*Math.sin(a)],[r1*Math.cos(b),r1*Math.sin(b)],[r0*Math.cos(b),r0*Math.sin(b)]];
const slab=(name,group,x,y,w,d,z,h,material='gunmetal',r=0)=>T.prism({name,group,layer,plan:{x,y,w,d,r},z,h,material,bevel:r?.6:0});
const round=(name,group,o,s0,s1,r,material='steel',details={})=>T.round({name,group,layer,F:{o,a:[1,0,0],u:[0,1,0],v:[0,0,1]},s0,s1,r,material,details});
T.round({name:'display.platter',group:orbit,layer,F:G.frameOf([PX,0,0],[0,0,1],[1,0,0],[0,1,0]),s0:0,s1:4,r:178,tone:'lo',details:{bolts:[{s:4,r:172,count:32,size:.4,tone:'lo'}]}});
for(let j=0;j<N;j++) {
  const a=-Math.PI/2-da/2+j*da,b=a+da;
  // Circumscribed bore: the inward faces have minimum radial clearance exactly 35cm.
  prism(`stator.${j}`,orbit,ring(36,94,a,b),-24,-2,'steel');
  prism(`side-shell.${j}`,orbit,ring(88,94,a,b),-2,30,'ct-shell');
  const ca=-Math.PI/2+j*da, cb=ca+da;
  prism(`front-shell.${j}`,Math.cos((ca+cb)/2)>=0?cover:coverOther,ring(35/Math.cos(da/2),94,ca,cb),30,36,'ct-shell');
  prism(`rotor.${j}`,rotor,ring(38,86,a,b),-1.8,4,'steel');
  prism(`slip-track.${j}`,slip,ring(81,86,a,b),4,7,'copper');
}
const low=Z-94*Math.cos(da/2), half=94*Math.sin(da/2)-1;
slab('stator.foot',orbit,-32,-56,38,112,4,6,'gunmetal',2);
slab('stator.pedestal',orbit,-24,-half,22,2*half,10,low-10);
// Tube housing sleeve, convex annular sectors. Internal components become visible when sleeve slides.
const TF={o:[4,0,Z+60],a:[1,0,0],u:[0,1,0],v:[0,0,1]};
// Inner polygon faces, not its vertices, must clear the round 9cm mount.
// A real rear flange supports the sleeve's axial end at x=6. It does not
// intersect the hollow sleeve volume; the insert stays inside a 9cm clear bore.
for(let j=0;j<12;j++){
  const window=j===8||j===9,poly=ring(9/Math.cos(Math.PI/12),11,j*Math.PI/6,(j+1)*Math.PI/6);
  T.prism({name:`tube.sleeve.${j}`,group:sleeve,layer,F:TF,polygon:poly,s0:2,s1:window?HARDWARE.sourceX-.6-4:20,material:'ct-tube'});
  if(window)T.prism({name:`tube.window.front.${j}`,group:sleeve,layer,F:TF,polygon:poly,s0:HARDWARE.sourceX+.6-4,s1:20,material:'ct-tube'});
}
round('tube.mount',tube,[0,0,Z+60],4,6,11,'gunmetal');
round('tube.anode',tube,[0,0,Z+60],HARDWARE.anodeBack,HARDWARE.anodeFront,6,'copper',{bolts:[{s:HARDWARE.anodeFront,r:4,count:6,size:.3}],dots:[{at:[HARDWARE.sourceX,0,-6],normal:[-1,0,0],size:.45,tone:'hi'}]});
round('tube.axle',tube,[0,0,Z+60],6,HARDWARE.anodeBack,1.5,'steel');
for(let j=0;j<8;j++) T.prism({name:`tube.stator.${j}`,group:tube,layer,F:TF,polygon:ring(1.5/Math.cos(Math.PI/8),3,j*Math.PI/4,(j+1)*Math.PI/4),s0:2,s1:6,material:'copper'});
// Filament and focusing cup are intentionally enlarged; exact tube topology is pedagogical, not vendor CAD.
slab('tube.cathode-cup',tube,6,-1.6,4,3.2,Z+53,3,'gunmetal');
round('tube.filament',tube,[0,0,Z+54],10,13,.6,'brass');
// Two opposing axial jaws and two yoke sides form a REAL open aperture.
// The jaw taper projects to40mm at isocentre on the central ray. All these
// mechanical dimensions are schematic, not claimed vendor measurements.
const JF={o:B.source,a:[0,1,0],u:[1,0,0],v:[0,0,-1]},h=HARDWARE;
for(const sign of [-1,1]){
  T.prism({name:`collimator.jaw.${sign}`,group:rotor,layer,F:JF,polygon:[[sign*B.axialSlope*h.jawNear,h.jawNear],[sign*h.jawOuterX,h.jawNear],[sign*h.jawOuterX,h.jawFar],[sign*B.axialSlope*h.jawFar,h.jawFar]],s0:-h.jawHalfY,s1:h.jawHalfY,material:'steel'});
  T.prism({name:`collimator.yoke.${sign}`,group:rotor,layer,F:JF,polygon:[[-4,h.jawNear],[4,h.jawNear],[4,h.jawFar],[-4,h.jawFar]],s0:sign>0?8:-9,s1:sign>0?9:-8,material:'steel'});
  prism(`collimator.mount.${sign}`,rotor,[[sign*8,42],[sign*9,42],[sign*9,45],[sign*8,45]],4,10,'gunmetal');
  prism(`bowtie.holder.${sign}`,rotor,[[sign*8,40],[sign*9,40],[sign*9,42],[sign*8,42]],10,14.9,'gunmetal');
}
for(const f of B.filters)prism(f.name,rotor,f.polygon,f.x0,f.x1,'brass');
// Detector physical axial width is magnified from 64×0.625mm at isocentre (≈7.04cm).
const dx0=B.detectorX0,dx1=B.detectorX1;
const mods=HARDWARE.modules, step=B.step;
for(let m=0;m<mods;m++) {
  const a=-D.fanHalf+m*step,b=a+step;
  const band=(r0,r1)=>B.band(m,r0,r1);
  // Spacer reaches rotor face; radial support rail sits behind sensor stack.
  prism(`detector.mount.${m}`,detector,band(101,105),4,dx0,'gunmetal');
  prism(`detector.rail.${m}`,detector,band(101,105),dx0,dx1,'gunmetal');
  if(m===6) {
    prism('module.grid',grid,band(94,95),dx0,dx1,'steel');
    prism('module.scintillator',scintillator,band(95,96),dx0,dx1,'ct-detector');
    prism('module.photodiode',diode,band(96,97),dx0,dx1,'ct-table');
    prism('module.das',module,band(97,101),dx0,dx1,'gunmetal');
  } else prism(`detector.sensor.${m}`,detector,band(95,101),dx0,dx1,'ct-detector');
}
prism('generator.mount',generator,[[48,-14],[78,-14],[78,14],[48,14]],4,7,'gunmetal');
prism('generator.tank',generator,[[48,-14],[78,-14],[78,14],[48,14]],7,26,'steel',{bevel:.7});
prism('das.box',das,[[-74,-12],[-50,-12],[-50,12],[-74,12]],4,20,'gunmetal',{bevel:.7});
// Stationary brush / pickup visibly adjacent to rotor track (no cable spans a moving joint).
prism('slip.brush',brushClear,[[84,-1],[86.2,-1],[86.2,1],[84,1]],7,12,'brass');
slab('table.base',orbit,110,-18,80,36,4,Z-23,'ct-table',3);
slab('table.cradle',table,40,-22,200,44,Z-19,4,'gunmetal',2);
const phantom=round('phantom.body',table,[60,0,Z],0,40,15,'ct-phantom',{seams:[10,20,30]});
// The cap shows exactly the geometric phantom used by the line-integral model (not patient anatomy).
const cap=PHANTOM.map((e,i)=>`<ellipse cx="${e.y}" cy="${e.z}" rx="${e.a}" ry="${e.b}" transform="rotate(${e.phi*180/Math.PI} ${e.y} ${e.z})" fill="${['#a0a0a0','#383838','#eeeeee','#c9c9c9'][i]}"/>`).join('');
T.plane({part:phantom,o:[100,0,Z],u:[0,1,0],v:[0,0,1],normal:[1,0,0],svg:cap});
export const poses=()=>{
  const p=[];
  // Rotor-major states avoid aliasing the engine's uniformly-indexed framed-plane sample.
  for(let a=0;a<360;a+=6) for(let o=0;o<360;o+=15) p.push(sceneValues({orbit:o,rotor:a,table:[0,40,80,120][(a/6+o/15)%4]}));
  for(let e=0;e<=1.00001;e+=.025) for(let o=0;o<360;o+=30) p.push(sceneValues({orbit:o,apart:Math.min(1,e),table:0}));
  return p;
};
export const follow=v=>({...v}); // figure sends already-resolved group values
// Fit group planes against every sampled vertex. Dropping alternating vertices can
// falsely separate a detector layer from the DAS while cutting their real full hulls.
const out=T.build({statics:R.items,poses,verify,fullClouds:true});
A.settle(R,P);
if(argv.includes('--audit')) {
  A.auditOrExit(R,P);
  TA.orbitOrExit(T,R,P,{sweep:{at:o=>sceneValues({orbit:o,table:66}),from:0,to:360,frame:.3}, clips:[{name:'rotor',at:t=>sceneValues({orbit:40,rotor:t*90,table:66}),from:0,to:4,frame:1/60},{name:'explode',at:t=>sceneValues({orbit:20,apart:t/3,table:0}),from:0,to:3,frame:1/60}],quick:argv.includes('--quick'),only:argv.find(a=>a.startsWith('--only='))?.slice(7).split(',')??null});
}
const background=k.figureSvg({width:W,height:H,label:'A CT scanner on a museum display stand. White covers reveal an orange X-ray tube, teal detector, copper slip ring, and a blue patient table with a geometric phantom.',body:R.items.filter(i=>i.layer==='back').map(i=>i.svg)});
const stage=`<div class="iso-stage iso-turn ct-stage" tabindex="0" role="group" aria-label="CT scanner. Drag sideways or use arrows to orbit, E opens the machine, Space starts or stops a scan.">${background}${out.layerSvg('scanner',{width:W,height:H})}</div>`;
const controls=`<div class="ct-controls"><button id="scan" class="ct-swap" data-busy="false"><span data-when="idle">Scan phantom</span><span data-when="busy">Stop</span></button><button id="explode" class="ct-swap" aria-pressed="false" data-busy="false"><span data-when="idle">Explode</span><span data-when="busy">Assemble</span></button><button id="cover-toggle" aria-pressed="false">Reveal systems</button><button id="theme" class="ct-swap" data-busy="${light}"><span data-when="idle">Light theme</span><span data-when="busy">Dark theme</span></button><label>Rotation <select id="rotation"><option value=".25">0.25 s</option><option value=".33" selected>0.33 s</option><option value=".5">0.50 s</option></select></label><label>Pitch <input id="pitch" type="range" min=".5" max="1.5" step=".1" value="1"></label><label>Mode <select id="mode"><option value="axial">Axial reconstruction</option><option value="helical">Helical table feed</option></select></label></div><p id="explanation">Drag to inspect the scanner. Reveal systems removes the front cover; Explode opens its assemblies.</p><p id="expert"></p><p id="status" class="ct-status" aria-live="polite"></p>`;
const monitors=`<section id="ct-reconstruction" class="ct-monitors" tabindex="-1" aria-label="Computed acquisition and reconstruction"><figure><canvas id="truth" width="96" height="96" aria-label="Geometric phantom reference"></canvas><figcaption>Known phantom</figcaption></figure><figure><canvas id="sino" width="181" height="360" aria-label="Computed fan-beam sinogram"></canvas><figcaption>Fan-beam sinogram</figcaption></figure><figure><canvas id="recon" width="96" height="96" aria-label="Computed filtered back-projection"></canvas><figcaption>Rebinned → Ram-Lak FBP</figcaption></figure></section><p class="ct-note">Teaching model: ideal monochromatic, noise-free 2D fan rays rebinned to parallel rays, then filtered back-projected. World X is the patient axis; one geometry unit is1cm. Amber guides are superimposed source-to-active-detector rays, not visible radiation or an occlusion simulation. Jaws project to40mm on the central ray; their rectangular taper narrows the illuminated footprint toward fan edges. The faceted13-module array approximates the ideal circular detector used by the numerical projector. Jaw, tube-window and centre-thin/edge-thick bowtie sizes are schematic, not vendor CAD or a calibrated spectrum. Not clinical helical/cone-beam reconstruction; greyscale is relative attenuation, not HU. Hardware uses enlarged, simplified internals; 13 visible detector modules stand for a much finer array with 64 axial rows. Motion is ${SLOW}× slower than real. No dose estimate.</p><div class="ct-key"><span>🟠 Tube / cathode / anode</span><span>🟢 Detector: grid → scintillator → photodiode → DAS</span><span>🟤 Slip ring: power + contactless data</span><span>🔵 Patient table</span><span class="ct-phantom-key"><i aria-hidden="true"></i>Imaging phantom — test object, not part of the scanner.</span></div>`;
const css=out.css+'\n'+readFileSync(join(HERE,'ct.css'),'utf8');
const body=k.plateHtml({fig:'Fig CT·1',title:'Computed tomography',hint:'Drag to orbit · E explodes',readout:'ready',caption:'An X-ray tube and detector rotate around the patient. A computer turns the measured projections into a cross-sectional image.',body:`<style>${css}</style>${stage}`})+controls+'<p class="ct-recon-jump"><a id="view-reconstruction" href="#ct-reconstruction">View axial reconstruction ↓</a></p>'+monitors+'<p class="ct-warning">Educational prototype — visual artifacts may occur while rotating or opening the scanner. Automated rendering-continuity warnings remain unresolved. Axial reconstruction is computed; helical mode demonstrates table motion only. Not for clinical use.</p>';
const strip=f=>readFileSync(join(HERE,f),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const DATA={turn:out.data};
const liveCode=strip('model.mjs')+'\n'+strip('beam-geometry.mjs')+'\n'+strip('motion.mjs')+'\n'+strip('reconstruction.mjs')+'\n'+strip('component-labels.mjs')+'\n'+readFileSync(join(HERE,'live.js'),'utf8').replace('__DATA__',JSON.stringify(DATA));
const notice=readFileSync(join(HERE,'LICENSE.txt'),'utf8');
const page=('<!--\n'+notice+'\n-->\n')+k.pageHtml({title:'CT Build — computed tomography',theme:light?'light':'dark',width:900,body,script:turnScript()+(verify?`window.__isoVerify=${JSON.stringify(out.verify)};\n`:'')+liveCode});
const name=`ct-scanner${verify?'-verify':''}${light?'-light':''}.html`;
// Auditing is read-only with respect to delivered previews, even on failure.
if(!argv.includes('--audit')) {
  writeFileSync(join(HERE,name),page);
  console.log(`wrote ${name} · ${out.report.parts} parts · ${Math.round(page.length/1024)} KB · data ${Math.round(JSON.stringify(out.data).length/1024)} KB · ${out.report.seconds.toFixed(2)}s`);
} else console.log('audit run: preview files not overwritten');
if(argv.includes('--states')) {
  const states=[];
  for(let a=7;a<360;a+=30) for(let o=5;o<360;o+=30) states.push(sceneValues({orbit:o,rotor:a,table:(o*7)%121}));
  for(let e=0;e<=1.0001;e+=.05) for(let o=5;o<360;o+=30) states.push(sceneValues({orbit:o,apart:Math.min(1,e),table:0}));
  writeFileSync(join(HERE,'states.json'),JSON.stringify(states)); console.log('check states',states.length);
}
export {out};
