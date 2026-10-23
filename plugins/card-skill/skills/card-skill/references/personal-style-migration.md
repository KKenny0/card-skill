# Personal style consolidation

This is an intentional contract change after 0.17.0. Existing PNGs and reviews remain historical artifacts; new rendering uses only the confirmed style for each mode. No legacy runtime switch or new service is added.

| Input | Migration |
|---|---|
| Long existing body | Long-page notes automatically; retain all text types. Quotes remain separate unless explicitly assigned a contiguous same-source quote_group; use layer_card.role for note, attribution or final footer |
| Poster omitted variant | Field notes automatically; all body types remain supported |
| Poster reading-notes | Replace variant with field-notes; retain every reading_unit quote/thought, per-card title and source |
| Whiteboard classic | Remove classic or set reasoning-notes; retain steps and select explicit layout where required; convert old inline emphasis to plain text |
| Sketchnote omitted variant | Wandering-notes shared CSS always loads; inspect existing composition for spacing changes |
| Article legacy family / formula summary | Replan using an explicit supported personal_layout and structure; preserve evidence, conditions and labels. Unsupported topology is a planning limitation, never an automatic conversion |
| Cover motif / free composition | Supply topic-specific Paper Wilderness cover_art, use cover_series=paper-wilderness and wechat-cover; renderer loads shared layout |

Only verified wechat-cover is currently supported for covers. No image tool and no suitable illustration is a blocker. In-article/metaphor Studio compositions remain supported. Colors remain tokens; they do not select layouts. Branding remains opt-in.

Poster supports paragraph, heading, highlight, items, reading_unit, media, process, data_row and divider in fixed 3:4. Preserve quotes verbatim, keep thought attribution, retain evidence image identity, units and sequence. Split semantic groups instead of shrinking or dropping content.

Validate source fidelity, real PNGs at 360px (covers 320px), all six relations, whiteboard navigation, sketchnote rhythm, and retirement errors. Run package-skill, npm test, npm run smoke, gallery:update/check and git diff --check. Release and installation require their own requested follow-through; rollback uses 0.17.0 and the original contracts, without modifying existing output files.
