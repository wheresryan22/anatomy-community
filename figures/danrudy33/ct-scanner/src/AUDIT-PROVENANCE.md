# Kit provenance and audit-policy difference — PR #67

The `skill.kit` / `skill.commit` metadata identifies the published Anatomy base at `dbf697a527bbf7d358668e1557cb1e35ff725d46`. **The current figure imports local source copies, not `.skill`. That field is provenance of the base, not proof that the build loads an unmodified shared kit.** Maintainer confirmation of whether this packaging is allowed is still required; the source is not claiming that this question is resolved.

After normalizing only the `./vendor-` module prefix back to `./`, these modules are byte-identical to that published base: `vendor-iso-kit.mjs`, `vendor-lathe.mjs`, `vendor-tube.mjs`, `vendor-audit.mjs`.

`vendor-turn-build.mjs` validates proposed cached separating planes against all supplied poses/vertices before using them. `vendor-turn.mjs` carries the disclosed CT renderer corrections. These are renderer/builder variants, not an unmodified upstream kit.

## CT colour/material registrations and the generator reference

The runtime also contains five additional material registrations, each with light/dark colour and shading ramps: `ct-shell` (white covers), `ct-tube` (orange tube), `ct-detector` (teal detector), `ct-table` (blue table) and `ct-phantom` (purple test object). These are display materials, not calibrated tissue/radiation properties. They are another concrete difference from the original runtime, separate from the renderer corrections and audit-policy changes.

The `CT-MATERIALS-BEGIN` comment names `scripts/ct-materials.mjs`, a development helper used to generate those embedded definitions. That helper was not included in the gallery PR. **It is not a missing dependency of the submitted build:** the definitions are already present in the committed `vendor-turn.mjs`, and the normal build reads that file without running the generator or modifying any kit source. The comment records how the block was produced, not a command required to rebuild the submitted pages.

Charlie correctly notes that the stock builder rejects a material name absent from `TURN.materials`. Therefore moving this figure to the original shared `.skill` is not just changing imports: these registrations must also be supported through an upstream-approved extension or replaced with supported kit materials. This compatibility requirement remains part of the maintainer decision below; documenting it does not establish approval or resolve the audit blocker.

## The reviewer is right about the audit-policy difference

`vendor-turn-audit.mjs` differs in two substantive places:

1. It computes radius perpendicular to the actual hinge axis rather than always using an XY radius.
2. An over-budget newly visible face becomes a **mandatory** candidate for the existing weighted-halving test instead of failing immediately. The birth budget itself and the halving test are unchanged, but **this changes acceptance policy**. Passing this variant is not passing the stock policy.

This was intended to distinguish finite-step face growth from a discontinuous jump. Local authorization and local fault controls do not constitute upstream approval. The earlier successful gallery CI run executed the bundled variant and therefore does not settle this review blocker.

## Bounded comparison actually run

Using the exact published original `turn-audit.mjs` body with only its import paths relocated to the same CT dependencies, `--audit --quick --only=continuity` exited **1**, reporting **10,816 continuity flags**. This comparison used an isolated copy of the original PR-head builder (`fdc4b6ff801e439c1e3c000c37aad8ed0a68ea1a`), before removing its public diagnostic flags; it is not a command supported by the cleaned public builder. The preceding static audit passed. Other turn-audit categories were explicitly skipped in this targeted comparison; this is not a full stock-kit certification. The current upstream audit at `1482e8469b0a9e0d8cc18ea2740a01423d29ae80` still retains the original birth predicate.

This establishes that **the CT does not currently pass that stock audit policy**. It does not establish that every flag is a visible defect, nor that every flag is harmless. It is also distinct from the separately preserved browser pixel-continuity failures.

No threshold was changed, checker failure hidden, geometry shrunk or acceptance flag disabled to address this review. The public source retains the current variant pending the maintainer's direction rather than pretending it is already stock-compliant.

## Decision still needed

Before gallery acceptance, please confirm whether a reviewed renderer/material/audit variant is eligible at all, or whether the corrections and material support must first be accepted into Anatomy and the figure moved to the shared kit. We are not treating documentation or a green variant-CI run as resolution of that decision. The geometry, real axial reconstruction and disclosed helical-motion-only scope are unchanged.
