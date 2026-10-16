// Shared staged teardown. One scalar path reverses exactly, so reversing mid-flight cannot
// reorder assemblies. Scan is only permitted at assembled=0; rotor parks at 0 before opening.
export const clamp01 = x => Math.max(0,Math.min(1,x));
export const phaseAt = (x,a,b) => { const t=clamp01((x-a)/(b-a)); return t*t*(3-2*t); };
export function sceneValues({orbit=0,rotor=0,table=66,apart=0}={}) {
  const cover=phaseAt(apart,0,.22), brushOut=phaseAt(apart,.22,.28), brushClear=phaseAt(apart,.28,.34), extract=phaseAt(apart,.34,.52), tracks=phaseAt(apart,.52,.6), parts=phaseAt(apart,.6,.78), detail=phaseAt(apart,.78,1);
  return {orbit,rotor,table, cover:115*cover, coverOther:115*cover, brushOut:30*brushOut, brushClear:15*brushClear, extract:65*extract,
    tube:45*parts, detector:25*parts, generator:32*parts, das:30*parts, slip:30*tracks,
    sleeve:24*detail, module:20*detail, grid:12*detail, scintillator:8*detail, diode:4*detail,
    withdraw:40*extract};
}
