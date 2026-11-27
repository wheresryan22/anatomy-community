// Page-specific tokens for the figures, on top of the kit's ISO_CSS.
//
// Colour comes from materials, the way the anatomy figures use it: most parts
// are paper, and the few that would really be made of something are. The
// ramps below are the kit's light-theme 3D materials (kit/turn.mjs in the
// anatomy skill, MIT) in its order of keys, plus four of our own: the red
// cloth of a patch cord, the beige plastic of an old terminal, and paper.
// The one accent is the cord's red: a lit lamp, a call in flight, the bar the
// extension puts on a connected tab.
const KEYS = ["paper", "face", "top", "shade-0", "shade-1", "shade-2", "shade-3", "lit-top", "lit-shade", "hi", "mid", "lo", "faint", "dot", "lit"]
const TUBE = ["body", "shine", "shade", "edge"]
const RAMPS = {
  brass: ["#bd9646", "#d2ad5b", "#e6c87e", "#8a6a2c", "#a47f38", "#bd9646", "#d2ad5b", "#f0d796", "#c8a252", "#3f2e0e", "#765a24", "#9a7a3c", "#b08c46", "#3a2a0c", "#1f1606", "#b8913f", "#efd795", "#7d5f26", "#3f2e0e"],
  rubber: ["#2a2b2e", "#34363a", "#46484d", "#1b1c1e", "#222326", "#2a2b2e", "#34363a", "#55575c", "#2f3134", "#070708", "#111214", "#18191b", "#1f2023", "#6a6c70", "#000000", "#27282b", "#5b5d62", "#121314", "#050506"],
  gunmetal: ["#444a51", "#50575e", "#5f666e", "#2f3439", "#393f45", "#444a51", "#50575e", "#6d757d", "#4b5258", "#0f1113", "#1d2125", "#272b30", "#30353a", "#b0b5ba", "#000000", "#3d4349", "#6e757c", "#24282c", "#0f1113"],
  steel: ["#b8bdc1", "#cdd1d4", "#e5e8ea", "#8f959b", "#a4aaaf", "#b8bdc1", "#cdd1d4", "#f1f3f4", "#c6cacd", "#2b2f33", "#6b7177", "#959ba1", "#aeb3b8", "#33373b", "#000000", "#b3b8bd", "#eef0f2", "#7d8389", "#2b2f33"],
  copper: ["#b3633e", "#c9784f", "#df9670", "#7c4128", "#9a5132", "#b3633e", "#c9784f", "#eaa985", "#be6d46", "#3a1a0c", "#6e3820", "#925037", "#a65d3f", "#3a1a0c", "#1c0b04", "#ad5f3b", "#f0b896", "#6e3720", "#3a1a0c"],
  cord: ["#a8352a", "#bd3f31", "#d0533f", "#6f1f17", "#8a281e", "#a8352a", "#bd3f31", "#de6d58", "#b33a2d", "#360d08", "#651b13", "#87271d", "#9c2f24", "#360d08", "#1a0503", "#b23a2c", "#e78a76", "#6c1e16", "#360d08"],
  beige: ["#f3eee3", "#f6f2e9", "#fbf8f2", "#d4cbb8", "#ddd5c4", "#e6dfd0", "#eee8dc", "#fbf8f2", "#ece6da", "#37322a", "#8d8472", "#b5ac98", "#d3cbba", "#4a4438", "#000000", "#e6dfd0", "#fbf8f2", "#c9bfab", "#37322a"],
}
const MATERIALS = Object.entries(RAMPS).map(([name, v]) => `.as-m-${name}{${KEYS.map((k, i) => `--anatomy-${k}:${v[i]}`).concat(TUBE.map((k, i) => `--mat-${k}:${v[KEYS.length + i]}`)).join(";")}}`)
  .concat(["body", "shine", "shade"].map((k) => `[class^="as-m-"] .tb-${k}{fill:var(--mat-${k})}`), [`[class^="as-m-"] .tb-edge{stroke:var(--mat-edge)}`])
  .join("\n")

export const FIGURE_CSS = MATERIALS + `
.iso{--as-accent:#b8372b;--as-accent-soft:#f3d9d3;--anatomy-mono:var(--sans,Inter,ui-sans-serif,system-ui,sans-serif)}
.as-face{fill:var(--anatomy-face);stroke:none}
.as-hole{fill:var(--anatomy-shade-0);stroke:var(--anatomy-mid);stroke-width:var(--anatomy-weight)}
.as-window{fill:var(--anatomy-shade-1);stroke:none}
.as-glass{fill:#f3f4f6;stroke:none}
.as-digits{fill:var(--anatomy-hi);font-family:var(--anatomy-mono);font-weight:500;font-variant-numeric:tabular-nums;letter-spacing:.06em}
.as-lamp{fill:var(--anatomy-shade-1);stroke:none;transition:fill .4s var(--anatomy-ease)}
.as-lamp[data-on]{fill:var(--as-accent)}
.as-accent-line{stroke:var(--as-accent)}
.as-bead{fill:var(--as-accent);stroke:var(--anatomy-paper);stroke-width:.8}
.as-chrome{fill:#e9eaed;stroke:none}
.as-tab{fill:#f7f7f8;stroke:none}
.as-field{fill:#ffffff;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
.as-ext{fill:var(--anatomy-shade-1);stroke:var(--anatomy-mid);stroke-width:var(--anatomy-weight)}
.as-ext[data-on]{fill:var(--as-accent);stroke:none}
.as-dot{fill:var(--anatomy-lo)}
.as-led{fill:var(--anatomy-lo);transition:fill .2s}
.as-led[data-on]{fill:var(--as-accent)}
.as-row-hit{fill:transparent;stroke:none;transition:fill .3s}
.as-row-hit[data-on]{fill:var(--as-accent-soft)}
.as-card{fill:#fff;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);transition:fill .3s,stroke .3s}
.as-card[data-on]{fill:var(--as-accent-soft);stroke:var(--as-accent)}
.as-pill{fill:#16161a;stroke:var(--as-accent);stroke-width:.5}
.as-pill-dot{fill:var(--as-accent)}
.as-pill-text{stroke:#f2f2f5;stroke-width:.7;stroke-linecap:round;opacity:.75}
.as-pill-btn{fill:var(--as-accent)}
.as-hold-arc{fill:none;stroke:var(--as-accent);stroke-width:2.2;stroke-linecap:butt;opacity:.55}
.as-bead-turned{fill:var(--anatomy-paper);stroke:var(--as-accent);stroke-width:1.2}
.as-crt{fill:#1e2621;stroke:none}
.as-phosphor{fill:none;stroke:#7fd69a;stroke-width:.9;stroke-linecap:round;opacity:.9}
.as-cursor{fill:#3f5a47}
.as-cursor[data-on]{fill:#b9f5c9}
.as-hit{fill:transparent;stroke:none;cursor:pointer;pointer-events:all}
[data-hero]:focus-visible{outline:2px solid var(--as-accent);outline-offset:6px}
`
