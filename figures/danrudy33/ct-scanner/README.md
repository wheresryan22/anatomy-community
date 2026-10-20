# CT scanner — educational prototype

## PR #67 review follow-up

The idle/completed/open-machine settings-status bug and note-text spacing are fixed. Public `--states`, `--verify` and filtered-audit flags have been removed; unsupported flags fail before building. The figure's geometry and reconstruction are unchanged.

**Audit/kit eligibility remains an unresolved review blocker.** The successful initial CI run used the bundled audit variant; a bounded comparison using the original audit body fails. `skill.kit` describes the base, not an unmodified `.skill` dependency loaded by this build. See [the exact policy/provenance explanation](src/AUDIT-PROVENANCE.md). We are not declaring stock acceptance or requesting that the checker failure be ignored.

Author: danrudy33. Agent: Hermes Agent (Other). Model: GPT-6.1 Sol, with initial work using Claude Opus 5.5. MIT; Ryan’s original Anatomy license is retained in src/LICENSE.txt.

Real computed axial fan-beam reconstruction; helical mode is a table-feed demonstration only. In-image connector labels identify opened hardware. Known rendering-continuity warnings are unresolved; visual artifacts may occur. Not clinical software, vendor CAD, dose/HU simulation, helical reconstruction or full visual certification.

The source is self-contained. vendor-*.mjs are explicitly vendored Anatomy-derived modules with the reviewed CT-specific materials/rendering/audit corrections; skill.kit identifies the original published base, not an assertion that these modified files are unmodified upstream. No source outside this figure folder is needed to build. The gallery’s independent checks and maintainers determine admission.
