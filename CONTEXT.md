# Domain glossary

Working vocabulary for card-skill. Architecture and pipeline ownership live
in `docs/current-architecture.md`; this file names the concepts that code
and review discussions should use consistently. Add a term here when a new
module or concept earns a name.

- **Visual Job** — the structured render request (`schema_version` 1–3): source
  units with evidence, one decision, and outputs with artifact plans and render
  contracts. Validated by `scripts/lib/visual-job.js`.
- **Render contract** — the mode-level input a renderer consumes
  (`outputs[].render_contract` after tone materialization). Owned by
  `scripts/lib/schema.js` validation plus the mode renderer.
- **Effective contract** — the contract actually rendered, recorded in the
  receipt when it differs from the planned one (for example after a salvage
  attempt changed the aspect). Publication validates the difference stays
  inside the article-diagram adaptation boundary.
- **Candidate** — the reviewed-before-published output set of a Visual Job
  render (`render-job --candidate`): PNGs, receipts, checked HTML, a sealed
  Visual Job snapshot, and a closed-set manifest.
- **Receipt** — per-PNG provenance record binding job, artifact plan,
  contract hashes, checker report, and capture metadata.
- **Visual Review** — the host Agent's hash-bound inspection of every real
  candidate PNG; the approval digest gates `publish-reviewed-job`.
- **Checked HTML** — the exact HTML that produced a candidate PNG, preserved
  during candidate rendering and re-verified under sealed capture at
  publication.
- **Salvage ladder** — a renderer-owned ordered sequence of retry attempts
  (`renderAttempts`) that trade visual density for fit when a layout fails
  output checks. Callers iterate the ladder; they never assemble it.
- **Salvage attempt** — one entry of the ladder: a cloned contract with at
  most an aspect change plus private salvage options
  (`__articleDiagramSalvage`). The retry decision uses the renderer's
  `isSalvageableError`, not error-text matching.
