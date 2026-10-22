# Editorial images

## Cover: Paper Wilderness only

Read [Paper Wilderness](cover-paper-wilderness.md). All cover requests use this series, including omitted use. Contract: mode=editorial-image, use=cover, cover_series=paper-wilderness, aspect=wechat-cover, title and cover_art. Omitted series/aspect select the same values. The renderer loads the series layout; no motif or custom-HTML cover route remains. Other cover ratios require a separately verified series adaptation and currently fail explicitly.

The calling Agent selects an actually callable image tool, inspects the illustration and supplies a local file. Existing suitable user-selected artwork takes precedence. With no usable artwork or generation capability, stop; do not substitute another style. Never configure a provider inside a renderer or ask for an API key as an implicit dependency.

cover_art has exactly path and alt. Path must be safe absolute local PNG/JPEG/WebP, static, at most32MiB,8192px per side and40million pixels. alt is non-empty text, at most500characters. The renderer embeds the whole image using contain, without cropping, recoloring or shadow. It cannot validate the subject's artistic meaning: actual inspection against the series master and source is required.

Do not combine cover_art with cover_motif, content_html or composition_required:true. Series CSS follows bounded custom_css adjustments; custom CSS must not replace the series layout. Headline, subtitle, kicker, source and explicitly supplied branding remain text. Artwork is conceptual, not documentary evidence. Receipt cover_art_snapshot remains separate from Poster media_snapshots; resource hashes, budgets, safety checks and reviewed publication stay mandatory.

## Body metaphor and in-article imagery

use=metaphor or use=in-article requires composition_required:true and non-empty content_html plus custom_css. Body relationships that need precise labels and arrows belong in article-diagram. These body Studio compositions retain their existing aspect options and safety restrictions; they do not use cover_series or cover_art.

Default body aspects: in-article=body-3-2, metaphor=blog-hero. Explicit supported aspects remain documented in schemas/editorial-image.json. Tone/design change colors only. No implied author or watermark. Escape source text, avoid remote or embedded executable resources, and respect the normal Visual Job pipeline.

## Verification

Validate the contract, render with scripts/render-job.mjs, inspect the actual PNG and320px cover preview, review and publish with the hash-bound publisher. Check title wrapping, alpha margins, clean paper, topic-specific imagery and retained source qualifications. A successful file write is not visual acceptance.
