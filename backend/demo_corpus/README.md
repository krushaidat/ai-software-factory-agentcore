# Demo Corpus

Real automotive C++ source code used as input for the multi-agent analysis pipeline.

## Sources

- **`autoware/`** — 11 hand-picked files from [Autoware Universe](https://github.com/autowarefoundation/autoware_universe) (Apache-2.0). Covers control, sensing, perception, planning, vehicle, and system modules. See `autoware/MANIFEST.json` for the full list and `autoware/THIRD_PARTY_NOTICES.md` for license attribution.

## How agents use this corpus

When a user picks a file in the workspace, the **Supervisor Agent** (in `backend/agents/supervisor/`) loads its content and dispatches to the specialist agents:

- **QualityAgent** scans for MISRA C/C++ and AUTOSAR coding standard violations.
- **SafetyAgent** assesses ISO 26262 ASIL relevance and constructs an evidence chain.
- **SecurityAgent** runs ISO 21434 TARA threat modeling and CVE matching (via AgentCore Browser to NVD).
- **TestAgent** plans test selection and HIL/VEW/SIL environment allocation.
- **DeploymentAgent** makes the promotion gate decision.
- **IntegrationAgent** assesses SBOM, cross-SWC compatibility, and ASPICE compliance.

## Refreshing the corpus

The `MANIFEST.json` records the `fetched_at` timestamp and the upstream branch.
To refresh, re-run the fetch script (paths may change as Autoware reorganizes packages).

## Adding more files

To add additional files to the corpus:

1. Pick files between **2 KB and 60 KB** that are self-contained (don't require building a project).
2. Save with a flat, descriptive filename in `autoware/` (or a new sibling subdirectory if from a different upstream).
3. Add an entry to `MANIFEST.json` with `filename`, `module`, `description`, `loc`, `size_bytes`, `asil_relevance`, `complexity_hint`, `good_for_demo`.
4. Verify the file is valid C/C++ (not a 404 HTML page).
5. Update `THIRD_PARTY_NOTICES.md` if a new upstream is added.
