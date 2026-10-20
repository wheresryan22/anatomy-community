// CT-specific teaching geometry. cm; patient axis X, transverse Y/Z, Z up.
// Only bore/FOV/SID/SDD/rows are sourced scanner quantities (model.mjs).
// Housing, jaws and faceted bowtie dimensions are explicit schematic choices,
// NOT vendor CAD or a clinical cone-beam/dose simulation.
import {SCANNER,derived} from './model.mjs';
export const HARDWARE={sourceX:14,tubeCentreRadius:60,anodeBack:14,anodeFront:16,
  jawNear:9,jawFar:12,jawOuterX:4,jawHalfY:8,yokeOuterY:9,
  filterDistance:14,filterHalfY:9,filterHalfX:.9,filterCentreThickness:.3,filterEdgeThickness:1.7,
  modules:13,phantomStart:60,phantomLength:40};
export function beamGeometry(s=SCANNER){
 const d=derived(s),h=HARDWARE,source=[h.sourceX,0,s.isoHeight+s.sourceToIso],iso=[h.sourceX,0,s.isoHeight],step=2*d.fanHalf/h.modules;
 const axialSlope=d.beamAtIso/(2*s.sourceToIso);
 const arc=(phi,r)=>[r*Math.sin(phi),s.sourceToIso-r*Math.cos(phi)];
 const band=(m,r0,r1)=>{const a=-d.fanHalf+m*step,b=a+step,c=Math.cos(step/2);return [arc(a,r0/c),arc(b,r0/c),arc(b,r1/c),arc(a,r1/c)];};
 const detectorPoint=(phi,axial=0)=>{const m=Math.min(h.modules-1,Math.max(0,Math.floor((phi+d.fanHalf)/step))),mid=-d.fanHalf+(m+.5)*step,r=s.sourceToDetector/Math.cos(phi-mid);return [h.sourceX+axial,r*Math.sin(phi),source[2]-r*Math.cos(phi)];};
 // Rectangular divergent axial jaws: 40mm CENTRAL-ray collimation. At fan
 // edges their transmitted footprint is narrower than the physical row array.
 const illuminatedHalf=phi=>{const p=detectorPoint(phi);return Math.min(d.beamAtDetector/2,axialSlope*(source[2]-p[2]));};
 const rays=Array.from({length:9},(_,i)=>{const phi=-d.fanHalf+2*d.fanHalf*i/8;return {phi,source:source.slice(),end:detectorPoint(phi)};});
 for(const sign of [-1,1])rays.push({phi:0,source:source.slice(),end:detectorPoint(0,sign*illuminatedHalf(0))});
 const filterThickness=y=>h.filterCentreThickness+(h.filterEdgeThickness-h.filterCentreThickness)*(y/h.filterHalfY)**2;
 const filters=Array.from({length:5},(_,i)=>{const a=-h.filterHalfY+2*h.filterHalfY*i/5,b=-h.filterHalfY+2*h.filterHalfY*(i+1)/5,z=s.sourceToIso-h.filterDistance;return {name:i===2?'bowtie.filter':`bowtie.filter.${i}`,polygon:[[a,z],[b,z],[b,z-filterThickness(b)],[a,z-filterThickness(a)]],x0:h.sourceX-h.filterHalfX,x1:h.sourceX+h.filterHalfX};});
 return {source,iso,step,axialSlope,band,detectorPoint,illuminatedHalf,rays,filters,
  detectorX0:h.sourceX-d.beamAtDetector/2,detectorX1:h.sourceX+d.beamAtDetector/2,
  axialTable:h.phantomStart+h.phantomLength/2-h.sourceX,
  helicalStart:h.phantomStart-h.sourceX,helicalEnd:h.phantomStart+h.phantomLength-h.sourceX};
}
// Analytic rigid placement, independent of the rendering kit. Positive rotor
// angle follows its right-handed X hinge; orbit is the world-Z display turn.
export function placeBeamPoint(p,{rotor=0,orbit=0,extract=0,pivotX=80}={}){
 const a=rotor*Math.PI/180,b=orbit*Math.PI/180,y=p[1]*Math.cos(a)-(p[2]-SCANNER.isoHeight)*Math.sin(a),z=p[1]*Math.sin(a)+(p[2]-SCANNER.isoHeight)*Math.cos(a)+SCANNER.isoHeight,x=p[0]+extract;
 return [pivotX+(x-pivotX)*Math.cos(b)-y*Math.sin(b),(x-pivotX)*Math.sin(b)+y*Math.cos(b),z];
}
