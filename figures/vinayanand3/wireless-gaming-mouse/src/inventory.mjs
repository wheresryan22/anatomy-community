// Component inventory: maps every part name to its assembly, material and purpose.
// Used by the anatomy page (selection card, legend) and by scripts/inventory.mjs (the document).
export const ASSEMBLIES = {
  A: "Exterior & ergonomics",
  B: "Click mechanisms",
  C: "Scroll wheel",
  D: "Optical tracking sensor",
  E: "Main PCB & electronics",
  F: "Wireless communication",
  G: "Battery & power",
  H: "Base & tracking interface",
};

const R = (re, a, label, material, purpose) => ({ re, a, label, material, purpose });
export const RULES = [
  R(/^shell\.palm$/, "A", "Palm shell", "Thin-wall glass-filled PC/ABS, matte", "Rear ergonomic hump: carries the palm, the screw bosses' load and the button hinge line; underside ribbed in a hex lattice for stiffness at ~1 mm wall."),
  R(/^button\.(L|R)\.(outer|rear|mid|front)$/, "A", "Main button panel ($1, $2)", "Glass-filled PC/ABS, matte", "Sculpted panel of the $1 main button; panels of one button move as a single part about its rear flexure line."),
  R(/^button\.(L|R)\.post$/, "B", "Button actuator post ($1)", "PC (moulded with the button)", "Transfers button travel to the optical switch plunger: 0.1 mm pre-travel, then 0.6 mm stroke."),
  R(/^shell\.bridge\.(front|rear)$/, "A", "Centre channel bridge ($1)", "PC/ABS, matte", "Fixed shell strip between the buttons, framing the wheel slot."),
  R(/^dpi\.cap$/, "A", "DPI / profile button cap", "PC/ABS, recessed 0.6 mm", "Cycles CPI or profiles; sits in the centre channel behind the wheel."),
  R(/^dpi\.stem$/, "A", "DPI button stem", "POM", "Long stem from the cap to the DPI tact switch on the main board."),
  R(/^wall\.(L|R|C)\d+$/, "A", "Flank wall segment", "PC/ABS, micro-textured", "Side grip contour of the lower shell; segments meet on shared joint planes."),
  R(/^rgb\./, "A", "RGB light guide", "Diffused PMMA light pipe", "Rear perimeter light guide fed by side-firing RGB LEDs (LEDs not modelled)."),
  R(/^side\.(fwd|back)$/, "A", "Side button cap ($1)", "PC/ABS, ribbed grip", "Programmable thumb button on the left flank."),
  R(/^side\.board$/, "A", "Side-button board", "FR-4", "Small board carrying the two side tact switches, parallel to the flank."),
  R(/^side\.switch\./, "A", "Side tact switch", "Steel dome / LCP housing", "Registers a side button press."),
  R(/^side\.flex$/, "E", "Side flex interconnect", "Polyimide flex, copper", "Connects the side-button board to the main board."),
  R(/^base\.(front|rear|left|right)$/, "H", "Bottom housing ($1)", "Glass-filled PC", "Lower structural housing; the four pieces frame the sensor aperture."),
  R(/^base\.rib\./, "H", "Base stiffening rib", "Glass-filled PC", "Stiffens the base and supports the board between standoffs."),
  R(/^base\.snap\./, "A", "Snap hook", "Glass-filled PC", "Locates the flank walls at the nose."),
  R(/^base\.boss\./, "A", "Shell screw boss", "Glass-filled PC", "Post from the base to the palm's underside; receives a shell screw."),
  R(/^base\.standoff\./, "E", "PCB standoff", "Glass-filled PC", "Holds the main board 1 mm above the base."),
  R(/^foot\./, "H", "PTFE glide foot", "Virgin PTFE, 0.8 mm, adhesive-backed", "Low-friction skate; sets glide feel and the sensor's height above the surface."),
  R(/^screw\./, "H", "Shell screw", "Steel M1.6, zinc-plated", "Clamps the base to the top shell through the bosses."),
  R(/^lens$/, "D", "Optical lens", "Optical-grade PC", "Light pipe guides LED light to the surface; imaging lens focuses the lit texture onto the sensor."),
  R(/^lens\.dome$/, "D", "Imaging lens element", "Optical-grade PC", "Imaging surface of the lens, centred on the sensor array."),
  R(/^pcb$/, "E", "Main PCB", "FR-4, 4-layer, 1.6 mm", "Carries the SoC, sensor, power stage, switches, USB-C and antenna feed."),
  R(/^soc$/, "F", "Wireless SoC / MCU", "QFN 6 × 6 mm", "Reads the sensor and switches, runs firmware and the 2.4 GHz radio."),
  R(/^crystal$/, "E", "Crystal oscillator", "32 MHz, 2.0 × 1.6 mm metal can", "Reference clock for the radio and MCU."),
  R(/^flash$/, "E", "NOR flash memory", "SON-8", "Stores firmware and on-board profiles."),
  R(/^pmic$/, "G", "Power-management IC", "QFN 4 × 4 mm", "Li-Po charger with power-path control and fuel gauging."),
  R(/^ldo\.(a|b)$/, "G", "Voltage regulator ($1)", "LDO, 2 × 2 mm", "Low-noise rail for the sensor or the SoC."),
  R(/^passive\.rf\./, "F", "RF matching component", "0603 L/C", "Matching network between the SoC's RF port and the antenna."),
  R(/^passive\./, "E", "Passive component", "0603 MLCC / resistor", "Decoupling and bias."),
  R(/^usbc$/, "G", "USB-C receptacle", "Stainless steel shell, mid-mount", "Charging and wired data port at the nose."),
  R(/^batt\.conn$/, "G", "Battery connector", "LCP, 2-pin 1.0 mm pitch", "Plugs the battery leads into the board."),
  R(/^batt\.rail\./, "G", "Battery rail", "PC", "Carrier rails that hold the battery above the board."),
  R(/^mid\.switch$/, "C", "Middle-click switch", "Tact switch, LCP", "Pressed by the wheel module on a middle click."),
  R(/^mid\.switch\.stem$/, "C", "Middle-click actuator", "POM", "Transfers wheel press to the middle switch."),
  R(/^dpi\.switch$/, "E", "DPI tact switch", "Tact switch", "Under the DPI stem."),
  R(/^pcb\.screw\./, "E", "PCB screw", "Steel M1.4", "Fixes the board to its standoffs."),
  R(/^sensor$/, "D", "Optical sensor IC", "Image sensor + DSP in a clear-window package", "Captures surface images thousands of times a second and estimates displacement (Δx, Δy)."),
  R(/^sensor\.led$/, "D", "Illumination LED", "IR / red LED", "Lights the surface at a grazing angle through the lens light pipe."),
  R(/^antenna\./, "F", "2.4 GHz antenna", "Stamped copper alloy, inverted-F", "Radiator at the tail, kept clear of the battery and away from the hand's palm contact."),
  R(/^switch\.(L|R)\.base$/, "B", "Optical switch housing ($1)", "LCP", "Mounts the switch on the board; pins solder to the PCB."),
  R(/^switch\.(L|R)\.wall\./, "B", "Switch guide wall ($1)", "LCP", "Guides the plunger and acts as the mechanical stop."),
  R(/^switch\.(L|R)\.emitter$/, "B", "IR emitter ($1)", "IR LED in LCP block", "Sends a light beam across the plunger channel."),
  R(/^switch\.(L|R)\.detector$/, "B", "IR detector ($1)", "Phototransistor in LCP block", "Sees the beam; a click is registered when the plunger interrupts it (no contact bounce)."),
  R(/^switch\.(L|R)\.plunger$/, "B", "Switch plunger ($1)", "POM", "Moves 0.6 mm and drops a vane into the IR beam."),
  R(/^switch\.(L|R)\.spring$/, "B", "Return spring ($1)", "Stainless spring steel", "Returns the plunger and sets the click force and tactile feel."),
  R(/^wheel\.tire$/, "C", "Scroll wheel", "Rubber over a PC core, knurled", "Textured wheel; 24 detents per turn assumed."),
  R(/^wheel\.hub\./, "C", "Wheel hub", "Zinc alloy", "Adds rotational inertia and centres the tire on the axle."),
  R(/^wheel\.axle\./, "C", "Wheel axle", "Stainless steel", "Turns in the brackets; drives the encoder."),
  R(/^wheel\.bracket\./, "C", "Wheel bracket", "PC", "Supports the axle above the board; pivots for middle click."),
  R(/^wheel\.encoder$/, "C", "Incremental rotary encoder", "Mechanical encoder, 24 pulses per turn", "Converts wheel rotation into quadrature pulses for the SoC."),
  R(/^battery$/, "G", "Li-Po battery", "3.7 V, 300 mAh pouch cell", "Rechargeable energy store; placed low and central for balance."),
  R(/^battery\.pcm$/, "G", "Battery protection board", "FR-4 with protection IC + MOSFETs", "Over-charge, over-discharge and short-circuit protection."),
  R(/^battery\.lead/, "G", "Battery leads", "Silicone-insulated copper", "Battery to board."),
  R(/^dongle\.body$/, "F", "USB receiver body", "PC/ABS", "Separate 2.4 GHz receiver (shown beside the mouse)."),
  R(/^dongle\.plug$/, "F", "USB receiver plug", "Steel USB-A shell", "Plugs into the PC; holds the receiver's radio."),
];

export function describe(name) {
  for (const r of RULES) {
    const m = r.re.exec(name);
    if (!m) continue;
    const fill = (t) => t.replace(/\$(\d)/g, (_, i) => ({ L: "left", R: "right", C: "nose" })[m[i]] ?? m[i]);
    return { name, assembly: r.a, group: ASSEMBLIES[r.a], label: fill(r.label), material: fill(r.material), purpose: fill(r.purpose) };
  }
  return { name, assembly: "?", group: "Unassigned", label: name, material: "", purpose: "" };
}
