// Diagram annotations only: no mesh, painter order, acquisition or reconstruction changes.
// Names are bound to actual packed part geometry, never guessed screen positions.
export const CT_COMPONENTS=[
 {name:'Front cover',part:'front-shell.0',side:'left'},
 {name:'Stator',part:'stator.4',side:'left'},
 {name:'Rotor',part:'rotor.4',side:'left'},
 {name:'Tube housing',part:'tube.sleeve.1',side:'left'},
 {name:'Cathode cup',part:'tube.cathode-cup',side:'left',deep:true},
 {name:'Filament',part:'tube.filament',side:'left',deep:true},
 {name:'Anode',part:'tube.anode',side:'left',deep:true},
 {name:'Tube axle',part:'tube.axle',side:'left',deep:true},
 {name:'Motor windings',part:'tube.stator.1',side:'left',deep:true},
 {name:'Collimator jaws',part:'collimator.jaw.1',side:'left'},
 {name:'Bowtie filter',part:'bowtie.filter',side:'left'},
 {name:'Slip ring',part:'slip-track.4',side:'right'},
 {name:'Brush pickup',part:'slip.brush',side:'right'},
 {name:'HV generator',part:'generator.tank',side:'right'},
 {name:'DAS electronics',part:'das.box',side:'right'},
 {name:'Detector array',part:'detector.sensor.5',side:'right'},
 {name:'Scatter grid',part:'module.grid',side:'right',deep:true},
 {name:'Scintillator',part:'module.scintillator',side:'right',deep:true},
 {name:'Photodiodes',part:'module.photodiode',side:'right',deep:true},
 {name:'Module DAS',part:'module.das',side:'right',deep:true},
 {name:'Table cradle',part:'table.cradle',side:'right'},
 {name:'Phantom (test)',part:'phantom.body',side:'right'}
];
export function componentAnchor(scene,name){
 const run=scene.runs.find(r=>r.name===name);if(!run)throw new Error('Unknown CT label part: '+name);
 const group=run.group>=0?scene.groups[run.group]:null;
 const point=[0,1,2].map(i=>{const values=Array.from({length:run.cloud.length/3},(_,j)=>run.cloud[j*3+i]);return (Math.min(...values)+Math.max(...values))/2+(group?.origin[i]??0);});
 return {group:group?.name??null,point,index:run.index};
}
export const componentAvailable=(item,apart)=>apart>=.215&&(!item.deep||apart>=.9);
export function mountComponentLabels(stage,controller){
 const NS='http://www.w3.org/2000/svg',make=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
 const live=stage.querySelector('svg[data-live]'),vb=live.getAttribute('viewBox').split(/[ ,]+/).map(Number),[x0,y0,W,H]=vb,scene=controller.scene();
 const svg=make('svg',{class:'ct-component-labels',viewBox:vb.join(' '),role:'img','aria-label':'Opened CT component names with connector lines. Callouts mark component positions; orbit to uncover hidden surfaces. DAS means data-acquisition system; HV means high voltage.',hidden:''});
 const rows=CT_COMPONENTS.map(item=>{const anchor=componentAnchor(scene,item.part),g=make('g',{class:'ct-part-callout','data-component':item.name,'data-part-index':anchor.index}),line=make('polyline'),dot=make('circle',{r:2}),box=make('rect',{rx:3}),text=make('text',{'dominant-baseline':'middle'});text.textContent=item.name;g.append(line,dot,box,text);svg.append(g);return {item,anchor,g,line,dot,box,text};});stage.append(svg);
 let lastApart=0;
 function draw(apart=lastApart){
  lastApart=apart;svg.toggleAttribute('hidden',apart<.215);if(svg.hasAttribute('hidden'))return;
  svg.setAttribute('aria-label','Opened CT components: '+CT_COMPONENTS.filter(c=>componentAvailable(c,apart)).map(c=>c.name).join(', ')+'. Callouts mark component positions; orbit to uncover hidden surfaces. HV means high voltage; DAS means data-acquisition system.');
  const font=Math.max(12,Math.min(24,11*W/stage.clientWidth)),width=205,height=font*1.6;
  for(const side of ['left','right']){
   // Keep leaders in vertical target order instead of crossing an arbitrary legend order.
   const active=rows.filter(r=>r.item.side===side&&componentAvailable(r.item,apart)).map(r=>({...r,p:controller.anchor(r.anchor.group,r.anchor.point).screen})).sort((a,b)=>a.p[1]-b.p[1]);
   for(const row of rows.filter(r=>r.item.side===side))row.g.toggleAttribute('hidden',!componentAvailable(row.item,apart));
   active.forEach((r,i)=>{const y=y0+32+(i+.5)*(H-64)/active.length,x=side==='left'?x0+8:x0+W-8-width,edge=side==='left'?x+width:x;
    const p=r.p;
    r.line.setAttribute('points',`${p[0]},${p[1]} ${edge+(side==='left'?14:-14)},${y} ${edge},${y}`);r.dot.setAttribute('cx',p[0]);r.dot.setAttribute('cy',p[1]);
    r.box.setAttribute('x',x);r.box.setAttribute('y',y-height/2);r.box.setAttribute('width',width);r.box.setAttribute('height',height);r.text.setAttribute('x',side==='left'?x+width-9:x+9);r.text.setAttribute('y',y);r.text.setAttribute('text-anchor',side==='left'?'end':'start');r.text.setAttribute('font-size',font);
   });
  }
 }
 const observer=new ResizeObserver(()=>draw());observer.observe(stage);
 return {draw};
}
