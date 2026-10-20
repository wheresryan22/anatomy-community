// CT scanner — the one pure model. Every number the figure shows comes from here.
// Units: centimetres for geometry, seconds for time. World frame: x = patient (table) axis,
// horizontal; y = across the gantry, horizontal; z = up. The gantry rotor turns about the
// patient axis (world x), never about world z. In radiology convention the patient axis is
// called "z"; in this figure's world it is x, and z stays "up".
//
// Sources (see the public README truth sheet):
//  - bore 70 cm, scan FOV 50 cm: NHS/WHO CT procurement specs
//  - source→isocentre 54 cm, source→detector 95 cm: PMC7017544 (system-architecture study)
//  - rotation 0.25–0.5 s, 0.33 s typical 64-slice: PMC10644676, PMC2780825
//  - 64 × 0.625 mm = 40 mm collimated beam at isocentre: standard 64-slice configuration
//  - pitch = table feed per rotation / collimated beam width: PMC8356941
//  - g-load = ω²r (computed); literature "nearly 40 g" at 0.25–0.27 s: PMC3958932

export const G0 = 9.80665; // m/s²

export const SCANNER = {
  boreRadius: 35, // cm (70 cm aperture)
  sfovRadius: 25, // cm (50 cm scan field of view)
  sourceToIso: 54, // cm
  sourceToDetector: 95, // cm
  rows: 64,
  rowWidthMm: 0.625, // detector row width projected to the isocentre
  isoHeight: 105, // cm above the floor — figure choice, typical of floor-mounted gantries (not a spec)
};

export const derived = (s = SCANNER) => {
  const fanHalf = Math.asin(s.sfovRadius / s.sourceToIso); // rad, the fan just covers the SFOV
  const isoToDetector = s.sourceToDetector - s.sourceToIso; // 41 cm
  const magnification = s.sourceToDetector / s.sourceToIso; // ≈ 1.76
  const beamAtIso = (s.rows * s.rowWidthMm) / 10; // cm, 4.0
  const beamAtDetector = beamAtIso * magnification; // cm, ≈ 7.0
  return {
    fanAngleDeg: (2 * fanHalf * 180) / Math.PI, // ≈ 55.2°
    fanHalf,
    isoToDetector,
    magnification,
    beamAtIso,
    beamAtDetector,
    detectorArcLength: s.sourceToDetector * 2 * fanHalf, // cm, ≈ 91.5
  };
};

// Rotation time → rpm and the centripetal load at radius r (cm).
export const rotation = (T, r = SCANNER.sourceToIso) => {
  const omega = (2 * Math.PI) / T; // rad/s
  return { T, rpm: 60 / T, omega, g: (omega * omega * (r / 100)) / G0 };
};

// Helical acquisition: table speed and time to cover a length L (cm).
export const helical = ({ T, pitch, beamAtIso = derived().beamAtIso, length }) => {
  const feedPerRotation = pitch * beamAtIso; // cm per rotation
  const tableSpeed = feedPerRotation / T; // cm/s
  return { feedPerRotation, tableSpeed, time: length / tableSpeed, rotations: length / feedPerRotation };
};

// Display slow-down: the page plays the rotor and table at 1/SLOW of real speed so the eye can follow.
// Both are slowed by the same factor, so the helix it traces (feed per rotation) stays true.
export const SLOW = 8;
