# Paper Wilderness reference assets

Maintainer-approved original AI-generated conceptual artwork, created with the
host's built-in image generation tool on 2026-10-20 for this repository's sole
Paper Wilderness series. These assets are distributed under the repository's
license. They contain no article screenshots, portraits, third-party podcast
artwork, private account statistics or source-document evidence.

- `master.png`: neutral reference carrier derived from the approved uncertainty
  artwork. Retains paper strata, perspective and red marker; removes paths and fog.
  A generation reference, not a default finished cover.
- `uncertainty.png`: three paths entering fog.
- `cooperation.png`: separate enclosed systems with a shared exchange point.
- `rest.png`: quiet water and an empty boat.
- `layout.css`: the approved wide-cover layout, automatically loaded by the
  existing `custom_css` field, never imported remotely.

Read `references/cover-paper-wilderness.md` from the skill root for activation,
prompt construction, content boundaries and inspection requirements. Each new
episode starts from the neutral master rather than the previous episode.

All four PNGs reserve the top 8% and four 2% corner squares as transparent
inspection regions (alpha at most 2 out of 255). Regression checks sample these
regions and render the three reference scenes through the existing cover pipeline.
This does not certify the entire silhouette or subjective composition quality.
