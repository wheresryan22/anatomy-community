// Materials this figure adds to the stock kit (ramps in the kit order: paper, face, top, shade-0..3, lit-top, lit-shade,
// hi, mid, lo, faint, dot, lit, then tube body/shine/shade/edge). Registered by scene.mjs; CSS emitted by build.mjs.
export const MATERIALS = {"milk":{"light":["#eee4d5", "#f4eadb", "#f8efe0", "#d7ccbd", "#e0d5c6", "#e8decf", "#f0e6d7", "#f8efe0", "#eae0d0", "#7c695a", "#ab9c8d", "#cabdae", "#ded3c4", "#867565", "#4a3424", "#eae0d0", "#f8efe0", "#cfc3b3", "#7c695a"],"dark":["#bdaf9b", "#c6b8a3", "#d5c7b2", "#8d7e6d", "#9f907e", "#b0a28f", "#c0b29e", "#ded0ba", "#b9aa97", "#564739", "#766758", "#938473", "#a99b88", "#4d3d30", "#e6d8c2", "#b9aa97", "#daccb7", "#8d7e6d", "#564739"]},
"glass":{"light":["#e3eff2","#eef7f9","#f7fcfd","#b9d2d8","#c8dde2","#d6e7eb","#e3eff2","#ffffff","#e0eef1","#1f4954","#5f8e99","#97bcc5","#c3dbe0","#2a5b66","#000000","#d3e6ea","#ffffff","#9fbfc7","#1f4954"],
  "dark":["#0a1519","#0e1c21","#1a3640","#08161b","#0c1f25","#112a32","#17363f","#2b5a66","#1b4652","#9ad7e3","#4f8b97","#2a5560","#173a43","#c8f0f8","#ffffff","#0e2026","#2b5a66","#071216","#9ad7e3"]},
"signal":{"light":["#e45a52","#ec7067","#f48a80","#b8352f","#c9423b","#d84d46","#e45a52","#ff9d94","#ec7067","#5e0f0c","#9e2a25","#c4524b","#e08a83","#5e0f0c","#000000","#d84d46","#ff9d94","#a3302a","#5e0f0c"],
  "dark":["#3a0a0c","#4a0d10","#7a1a1c","#2e0709","#3c0a0c","#4d0e11","#5e1316","#a3282b","#7a1a1d","#ff9a96","#c2484a","#7a2224","#4d1214","#ffd0cc","#ffffff","#4a0d10","#a3282b","#240405","#ff9a96"]},
"porcelain":{"light":["#f4f3f1","#fbfaf8","#ffffff","#d9d7d3","#e4e2de","#eeece9","#f6f5f3","#ffffff","#efeeeb","#5d5a56","#a19d98","#c9c6c1","#e2e0dc","#6d6a66","#000000","#efeeeb","#ffffff","#cfccc7","#5d5a56"],
  "dark":["#cfccc8","#dad7d3","#ecebe8","#8e8b87","#a7a4a0","#bebbb7","#d3d0cc","#f6f5f3","#c9c6c2","#3b3936","#6e6b67","#97938f","#b5b2ae","#2a2826","#ffffff","#c9c6c2","#f2f1ef","#8e8b87","#3b3936"]},
"graphite":{"light":["#393c41","#42474c","#4e535a","#282a2e","#303337","#393c41","#42474c","#595f67","#3e4248","#0d0e0f","#191b1d","#212326","#282b2f","#8d939c","#000000","#33363b","#595f67","#1f2023","#0d0e0f"],
  "dark":["#1c1d20","#202225","#272a2d","#141517","#18191b","#1c1d20","#202225","#303337","#1f2124","#989da5","#53585f","#36393e","#272a2d","#a5aab1","#e4e5e7","#1d1f22","#36393e","#101113","#989da5"]},
"pcbdark":{"light":["#2c6c4e","#337d5a","#3b9269","#204d38","#265c43","#2c6c4e","#337d5a","#43a578","#307555","#0c1e16","#153425","#1b4230","#204f39","#90d2b3","#030705","#286247","#43a578","#193d2c","#0c1e16"],
  "dark":["#123022","#153828","#1a4430","#0d2319","#10291d","#123022","#153828","#1f533b","#143626","#8cd4b2","#369066","#235d42","#1a4430","#a1dbc0","#ffffff","#133324","#235d42","#0b1c14","#8cd4b2"]},
"rgb":{"light":["#e0b6ee","#e6c5f1","#ecd3f5","#c16edd","#cb84e2","#d49ae7","#ddafec","#f0dcf7","#e3bdf0","#531866","#a630cd","#c475df","#d8a4ea","#651d7d","#000000","#d8a4ea","#eed8f6","#bf69dc","#531866"],
  "dark":["#b34ed5","#bc62da","#daa8eb","#80259f","#972cbb","#ac3bd1","#b859d8","#e6c5f1","#c87fe1","#431453","#72218d","#9d2ec2","#ac3bd1","#ffffff","#ffffff","#b34ed5","#daa8eb","#6b1f84","#431453"]},
"ptfe":{"light":["#eef0f2","#f6f7f8","#fcfcfd","#cfd4d9","#dbdfe3","#e7e9ec","#f1f2f4","#fcfcfd","#e8ebed","#4e5963","#8f9ba7","#bcc3ca","#d9dde1","#5c6875","#000000","#e8ebed","#fcfcfd","#c2c9cf","#4e5963"],
  "dark":["#c6ccd1","#d2d6db","#e8eaec","#7f8b96","#9aa3ad","#b4bbc1","#cbd0d4","#f3f4f6","#c0c5cb","#33393e","#606b75","#88939e","#aab2b9","#24282c","#ffffff","#c0c5cb","#eff1f2","#7f8b96","#33393e"]}};
const KEYS = ["paper", "face", "top", "shade-0", "shade-1", "shade-2", "shade-3", "lit-top", "lit-shade", "hi", "mid", "lo", "faint", "dot", "lit"];
const TUBE = ["body", "shine", "shade", "edge"];
const block = (v) => KEYS.map((k, i) => `--anatomy-${k}:${v[i]}`).concat(TUBE.map((k, i) => `--mat-${k}:${v[KEYS.length + i]}`)).join(";");
export function materialCss() {
  const rules = [];
  for (const [name, { light, dark }] of Object.entries(MATERIALS)) {
    rules.push(`[data-mat="${name}"]{${block(dark)}}`);
    rules.push(`.iso[data-theme="light"] [data-mat="${name}"]{${block(light)}}`);
    rules.push(`.iso[data-theme="dark"] [data-mat="${name}"]{${block(dark)}}`);
  }
  return rules.join("\n");
}
