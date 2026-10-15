# Engine lathe, turning a bar

A 250 × 550 mm bench engine lathe turns a 40 mm bar of C45 steel down to 30.5 mm with a coated carbide insert (CNMG 120408: 0.8 mm nose radius, 93° approach).

## The cycle

1. Three roughing passes at 1.5 mm depth and 0.20 mm/rev: Ø40 → 37 → 34 → 31.
2. One finishing pass at 0.25 mm depth and 0.08 mm/rev: Ø31 → 30.5.
3. Between passes the cross slide backs off, the carriage returns and the collar is turned in (0.02 mm per division).

## The model in `model.mjs`

| Quantity | Formula or value |
|---|---|
| Cutting speed | vc = π·D·n |
| Chip thickness | h = f·sin κ |
| Specific cutting force | kc = kc1.1·h^−mc (Kienzle, C45: kc1.1 = 2220 N/mm², mc = 0.14) |
| Cutting power | Pc = vc·ap·f·kc / 60 000 |
| Available spindle power | 2.2 kW × 0.85 = 1.87 kW |
| Theoretical roughness | Ra = f²/32rε |
| Machine time per pass | L/(f·n) |

- The load meter shows Pc against the available spindle power. The motor carries a short overload, but past 120 % its thermal relay trips: the spindle and the feed stop until a slower speed (or, before the tool has touched the bar, a shallower depth) brings the cut back within 100 %.
- The thread dial (16 teeth on the 6 mm lead screw) stands still only while the half-nut is closed.

## Controls

| Input | Effect |
|---|---|
| ← → | Spindle speed, eight steps from 90 to 2240 rpm |
| ↑ ↓ | Roughing depth of cut. It is dialled in at once if the tool hasn't touched the bar this pass, otherwise from the next pass. |
| Space | Pauses the power feed |

Machine time runs 18× faster than the page, and the chuck turns at 1/33 of its real speed.
