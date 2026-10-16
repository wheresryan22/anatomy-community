const DATA=__DATA__;
const stage=document.querySelector('.ct-stage'), readout=document.querySelector('[data-readout]');
const scanButton=document.querySelector('#scan'), explodeButton=document.querySelector('#explode'), coverButton=document.querySelector('#cover-toggle');
const explanation=document.querySelector('#explanation'), expert=document.querySelector('#expert'), status=document.querySelector('#status');
const rotationInput=document.querySelector('#rotation'), pitchInput=document.querySelector('#pitch'), modeInput=document.querySelector('#mode');
const still=matchMedia('(prefers-reduced-motion: reduce)');
const beam=beamGeometry();
const truthCanvas=document.querySelector('#truth'), sinoCanvas=document.querySelector('#sino'), reconCanvas=document.querySelector('#recon');
let orbit=0, orbitTarget=0, angle=0, tablePosition=0, apart=0, apartTarget=0, openingRequested=0;
let phase='ready', acquiring=false, armed=false, fan=null, recon=null, startAngle=0, frame=0, last=0, visible=false;
let msAverage=0, drawnFrames=0, lastPhase='', reconError=null;
let samples=[];
let scanMode='axial';
const wantedApart=()=>openingRequested||apartTarget;
const terminalApart=x=>x===1?'apart':x>0?'revealed':'ready';
const acquiredBlank=createAcquisition();
function pixels(canvas,values,w,h,white){
  const ctx=canvas.getContext('2d'), image=ctx.createImageData(w,h);
  for(let i=0;i<w*h;i++) {const g=Math.round(255*clamp01(values[i]/white)); image.data[i*4]=g;image.data[i*4+1]=g;image.data[i*4+2]=g;image.data[i*4+3]=255;}
  ctx.putImageData(image,0,0);
}
function paintMonitors(){
  pixels(truthCanvas,acquiredBlank.truth,96,96,1.8);
  if(fan) pixels(sinoCanvas,fan.data,fan.detectors,fan.views,35);
  if(recon) pixels(reconCanvas,recon.image,recon.pixels,recon.pixels,1.8);
  if(!fan)sinoCanvas.getContext('2d').clearRect(0,0,sinoCanvas.width,sinoCanvas.height);
  if(!recon)reconCanvas.getContext('2d').clearRect(0,0,reconCanvas.width,reconCanvas.height);
}
const labelOf={ready:'Ready',positioning:'Positioning the phantom and parking the gantry',acquiring:'Acquiring fan-beam projections',reconstructing:'Rebinning fan rays and accumulating filtered back-projection',complete:'2D axial reconstruction complete',helical:'Helical table-feed demonstration — no helical reconstruction',helicalComplete:'400 mm table-feed demonstration complete — no projections or reconstruction computed',helicalStatic:'Helical feed parked under reduced motion — no travel, projections or reconstruction computed',parking:'Parking the rotor before opening',opening:'Opening the machine',apart:'Apart — tube insert and one detector module opened',revealed:'Front cover removed',closing:'Closing the machine',paused:'Paused — scan interrupted'};
function describe(){
  const rot=rotation(Number(rotationInput.value));
  const hel=helical({T:rot.T,pitch:Number(pitchInput.value),length:40});
  readout.textContent=apart>.001?(apart>.999?'apart':phase==='revealed'?'systems revealed':'teardown'):acquiring?`${rot.T.toFixed(2)} s/rot`:phase==='complete'?'2D slice complete':phase==='reconstructing'?'back-projecting':phase==='paused'?'paused':phase==='helicalComplete'?'feed complete':phase==='helicalStatic'?'static feed demo':phase==='positioning'?'positioning':'ready';
  expert.textContent=`Nominal: ${SCANNER.rows} × ${SCANNER.rowWidthMm} mm = ${derived().beamAtIso*10} mm central-ray collimation · ${rot.T.toFixed(2)} s/rot · ${Math.round(rot.rpm)} rpm · ${rot.g.toFixed(1)} g at focal-spot radius · pitch ${Number(pitchInput.value).toFixed(1)} · helical table ${(hel.tableSpeed*10).toFixed(0)} mm/s · 400 mm in ${hel.time.toFixed(2)} s (no overrange)`;
  const announcement=labelOf[phase]||phase;
  if(phase!==lastPhase){status.textContent=announcement;lastPhase=phase;}
  scanButton.dataset.busy=String(acquiring||armed||phase==='reconstructing');
  explodeButton.setAttribute('aria-pressed',String(wantedApart()>.22));
  explodeButton.dataset.busy=String(wantedApart()>.22);
  coverButton.setAttribute('aria-pressed',String(wantedApart()>=.22));
  explanation.textContent=modeInput.value==='helical'?'The table advances one pitch × beam width per gantry rotation. This is a motion demonstration; the axial reconstruction inset does not pretend to reconstruct helical data.':phase==='apart'?'The orange sleeve slides off its simplified tube insert. The central detector module opens into grid, scintillator, photodiode and data-acquisition electronics.':phase==='reconstructing'||phase==='complete'?'The measured fan rays are interpolated onto parallel-ray coordinates, ramp-filtered with a Ram-Lak kernel and back-projected. The slice is calculated here, not loaded from an image.':'The source and detector rotate together. In axial mode the table parks; one full rotation computes 360 views of this same phantom.';
  if(apart>=.215)explanation.textContent+=' Callouts mark component positions; orbit to uncover parts hidden by other assemblies. HV means high voltage; DAS means data-acquisition system.';
}
const controller=TURN.mount(stage,DATA.turn,{onHold:()=>{if(armed||acquiring||phase==='reconstructing'){stop();draw();}},onFrame:()=>{}});
const componentLabels=mountComponentLabels(stage,controller);
// Superimposed teaching guides, not visible radiation or an occlusion simulation.
// Their 3D endpoints are the SAME focal spot and faceted active detector model.
const rayLayer=document.createElementNS('http://www.w3.org/2000/svg','g');
rayLayer.setAttribute('class','ct-ray-guides');rayLayer.setAttribute('aria-hidden','true');
stage.querySelector('svg[data-live]').append(rayLayer);
function drawRays(){
  const active=(acquiring||Math.abs(apart-.22)<.001)&&apart<=.22&&openingRequested===0;
  rayLayer.style.display=active?'':'none';if(!active)return;
  const lines=beam.rays.map(r=>{const a=controller.anchor('rotor',r.source),b=controller.anchor('rotor',r.end);return `<path d="M${a.screen[0]} ${a.screen[1]}L${b.screen[0]} ${b.screen[1]}"/>`;}).join('');
  const a=controller.anchor('rotor',beam.source);rayLayer.innerHTML=lines+`<circle cx="${a.screen[0]}" cy="${a.screen[1]}" r="2"/>`;
}
function draw(){
  const start=performance.now();
  controller.set(sceneValues({orbit,rotor:((angle%360)+360)%360,table:tablePosition,apart}));
  drawRays();
  componentLabels.draw(apart);
  const ms=performance.now()-start;msAverage=msAverage?.9*msAverage+.1*ms:ms;drawnFrames++;
  if(acquiring){samples.push(ms);if(samples.length>600)samples.shift();}
  window.__ct={orbit,rotor:angle,table:tablePosition,apart,apartTarget,openingRequested,armed,acquiring,reduced:still.matches,scanMode,phase,fanViews:fan?.acquired||0,backprojections:recon?.acquired||0,reconError,rayGuides:rayLayer.style.display!=='none',ms:msAverage,frames:drawnFrames,samples:samples.slice()};
  describe();
}
function stop(){armed=false;acquiring=false;openingRequested=0;apartTarget=apart;phase='paused';describe();}
function begin(){
  scanMode=modeInput.value;fan=scanMode==='axial'?createFan({radius:SCANNER.sourceToIso,halfFan:derived().fanHalf}):null; recon=null; reconError=null; if(still.matches)angle=Math.round(angle/360)*360;startAngle=angle; armed=false;acquiring=true; phase=scanMode==='helical'?'helical':'acquiring';
  if(still.matches){
    if(scanMode==='axial'){while(fan.step()){};recon=createAcquisition({projector:fan.parallel});while(recon.step()){};finishReconstruction();}
    else phase='helicalStatic';
    acquiring=false; paintMonitors(); draw();
  }
}
function finishReconstruction(){
  reconError=Math.sqrt(recon.image.reduce((s,v,i)=>s+(v-recon.truth[i])**2,0)/recon.truth.reduce((s,v)=>s+v*v,0));phase='complete';
}
function requestScan(){
  if(acquiring||armed||phase==='reconstructing'){stop();draw();return;}
  apartTarget=0; openingRequested=0; armed=true;phase='positioning';
  if(still.matches){apart=0;tablePosition=modeInput.value==='axial'?beam.axialTable:beam.helicalStart;begin();} else run();
}
function requestApart(target){
  stop(); armed=false; openingRequested=target;
  if(target>0&&apart===0&&Math.abs(angle%360)>.01){phase='parking';}
  else{apartTarget=target;phase=target===apart?terminalApart(apart):target>apart?'opening':'closing';openingRequested=0;}
  if(still.matches){angle=Math.round(angle/360)*360;apart=apartTarget=target;tablePosition=0;openingRequested=0;phase=target===1?'apart':target>0?'revealed':'ready';draw();}else{draw();run();}
}
function tick(now){
  const dt=last?Math.max(0,(now-last)/1000):1/60;last=now;
  let moving=false;
  const ease=(x,t,tau=.15)=>{const y=x+(t-x)*(1-Math.exp(-dt/tau));return Math.abs(y-t)<.001?t:y;};
  const oldOrbit=orbit;orbit=still.matches?orbitTarget:ease(orbit,orbitTarget,.12);moving ||= oldOrbit!==orbit;
  if(openingRequested){
    const park=Math.ceil((angle-.001)/360)*360;angle=ease(angle,park,.2);
    if(angle===park){apartTarget=openingRequested;openingRequested=0;phase='opening';}
    moving=true;
  }
  if(apart!==apartTarget){
    // Constant speed along one reversible staged path; eased stage boundaries in sceneValues.
    const delta=Math.sign(apartTarget-apart)*dt/2.5;
    apart=Math.abs(apartTarget-apart)<=Math.abs(delta)?apartTarget:apart+delta;
    tablePosition=ease(tablePosition,0,.12);moving=true;
    if(apart===apartTarget) phase=apart===1?'apart':apart>=.22?'revealed':armed?'positioning':'ready';
  }
  if(armed&&apart===0){
    const parkAt=modeInput.value==='axial'?beam.axialTable:beam.helicalStart;
    tablePosition=ease(tablePosition,parkAt,.2);moving=true;
    const parkAngle=Math.ceil((angle-.001)/360)*360;angle=ease(angle,parkAngle,.2);
    if(tablePosition===parkAt&&angle===parkAngle)begin();
  }
  if(acquiring&&!still.matches){
    const T=Number(rotationInput.value), speed=360/(T*SLOW);
    angle+=speed*dt;moving=true;
    if(scanMode==='axial'){
      const view=Math.min(fan.views,Math.floor((angle-startAngle)/360*fan.views));
      while(fan.acquired<view)fan.step();
      if(fan.acquired===fan.views){angle=startAngle+360;acquiring=false;phase='reconstructing';recon=createAcquisition({projector:fan.parallel});}
    }else{
      tablePosition+=helical({T,pitch:Number(pitchInput.value),length:40}).tableSpeed/SLOW*dt;
      if(tablePosition>=beam.helicalEnd){tablePosition=beam.helicalEnd;acquiring=false;phase='helicalComplete';}
    }
    paintMonitors();
  }
  if(phase==='reconstructing'&&recon){
    for(let i=0;i<3;i++)if(!recon.step()){finishReconstruction();break;}
    paintMonitors();moving=true;
  }
  if(moving)draw();
  frame=visible&&!document.hidden&&(moving||armed||acquiring||phase==='reconstructing')?requestAnimationFrame(tick):0;
}
function run(){if(!frame&&visible&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}else run();});
new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)run();else if(frame){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'120px 0px'}).observe(stage);
let drag=null;
stage.addEventListener('pointerdown',e=>{drag={x:e.clientX,base:orbitTarget,id:e.pointerId,captured:false};});
stage.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x;if(!drag.captured&&Math.abs(dx)>3){drag.captured=true;stage.setPointerCapture(e.pointerId);stage.setAttribute('data-drag','');}if(drag.captured){orbitTarget=drag.base-dx*.5;if(still.matches){orbit=orbitTarget;draw();}else run();}});
const release=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;stage.removeAttribute('data-drag');try{stage.releasePointerCapture(e.pointerId);}catch{}};
stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
stage.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();requestScan();}else if(e.key.toLowerCase()==='e'){e.preventDefault();requestApart(wantedApart()>.22?0:1);}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();orbitTarget+=(e.key==='ArrowLeft'?1:-1)*(e.shiftKey?45:15);if(still.matches){orbit=orbitTarget;draw();}else run();}else if(e.key==='Home'){e.preventDefault();orbitTarget=0;run();}});
scanButton.addEventListener('click',requestScan);
explodeButton.addEventListener('click',()=>requestApart(wantedApart()>.22?0:1));
coverButton.addEventListener('click',()=>requestApart(wantedApart()>=.22?0:.22));
document.querySelector('#theme').addEventListener('click',()=>{const next=document.body.dataset.theme==='dark'?'light':'dark';document.body.dataset.theme=next;document.querySelector('#theme').dataset.busy=String(next==='light');});
for(const input of [rotationInput,pitchInput,modeInput])input.addEventListener('change',()=>{stop();describe();draw();});
still.addEventListener('change',()=>{const target=wantedApart(),wasBusy=armed||acquiring||phase==='reconstructing';stop();if(frame)cancelAnimationFrame(frame);frame=0;last=0;if(still.matches){orbit=orbitTarget;openingRequested=0;apart=apartTarget=target;if(target>0){angle=Math.round(angle/360)*360;tablePosition=0;phase=terminalApart(target);}else phase=wasBusy?'paused':terminalApart(target);}draw();});
paintMonitors();draw();
