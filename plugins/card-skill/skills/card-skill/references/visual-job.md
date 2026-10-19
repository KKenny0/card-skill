# Visual Job v1/v2/v3

Conceptual cover illustrations use `editorial-image.cover_art` in v3 only. The calling Agent generates art when its host provides image generation, otherwise uses the existing motif / Studio workflow; user-selected artwork takes precedence. The resulting local image is a renderer resource, not factual evidence. Keep article evidence in `source_units`; do not label generated art as current primary evidence. Receipts carry a separate `cover_art_snapshot` (SHA-256, bytes, dimensions, MIME type), while `media_snapshots` retains its poster evidence meaning. Checked HTML embeds the private snapshot, and reviewed publication verifies it without reopening the original path. Distinct cover art is bounded per job to 32 MiB / 40 million pixels.

Visual Job is card-skill's audit contract between source understanding and rendering. It wraps existing mode render contracts; it does not replace them or alter direct `scripts/card.js --input/--stdin` use.

Versions 1 and 2 remain accepted for compatibility. New natural-language tasks use version 3. V3 separates a renderer invocation (`outputs[]`) from every PNG it produces (`outputs[].artifacts[]`). This matters for poster series and split diagrams: evidence, transformation, Visual Plan, filename, and editorial role now belong to the individual artifact instead of being ambiguously attached to the whole renderer call.

## V3 shape

```json
{
  "schema_version": 3,
  "job_id": "tool-cli-route",
  "publish_target": "social-series",
  "source": { "kind": "normalized-adapter", "language": "en" },
  "source_units": [
    {
      "id": "input",
      "excerpt": "Repository files are the input.",
      "evidence": { "kind": "claim", "strength": "primary", "freshness": "current" }
    },
    {
      "id": "command",
      "excerpt": "npx example-tool@latest",
      "evidence": { "kind": "command", "strength": "primary", "freshness": "current" }
    },
    {
      "id": "output",
      "excerpt": "One inspectable artifact is produced.",
      "evidence": { "kind": "output", "strength": "primary", "freshness": "current" }
    }
  ],
  "decision": {
    "mode": "poster",
    "tier": "stable",
    "tone": "technical",
    "selection_source": "taxonomy",
    "reason": "Three independent evidence units form one CLI task-flow series."
  },
  "outputs": [{
    "id": "cli-series",
    "artifacts": [
      {
        "artifact_index": 1,
        "id": "input-card",
        "basename": "tool-1.png",
        "role": "problem",
        "source_unit_ids": ["input"],
        "transformation": "compress",
        "visual_plan": {
          "core_message": "Start with repository files.",
          "content_type": "mechanism",
          "argument_structure": "sequence",
          "visual_metaphor": null,
          "layout_strategy": "input-led documentary card",
          "visual_hierarchy": ["input proof", "scope"],
          "avoid_patterns": ["generic hero", "invented metric"]
        }
      },
      {
        "artifact_index": 2,
        "id": "command-card",
        "basename": "tool-2.png",
        "role": "command",
        "source_unit_ids": ["command"],
        "transformation": "preserve",
        "visual_plan": {
          "core_message": "Run the documented command.",
          "content_type": "mechanism",
          "argument_structure": "sequence",
          "visual_metaphor": null,
          "layout_strategy": "command-led documentary card",
          "visual_hierarchy": ["exact command", "control"],
          "avoid_patterns": ["rewritten command", "terminal decoration"]
        }
      },
      {
        "artifact_index": 3,
        "id": "output-card",
        "basename": "tool-3.png",
        "role": "output",
        "source_unit_ids": ["output"],
        "transformation": "compress",
        "visual_plan": {
          "core_message": "Inspect the generated artifact.",
          "content_type": "mechanism",
          "argument_structure": "sequence",
          "visual_metaphor": null,
          "layout_strategy": "output-led documentary card",
          "visual_hierarchy": ["output proof", "use"],
          "avoid_patterns": ["stale screenshot", "testimonial"]
        }
      }
    ],
    "render_contract": {
      "mode": "poster",
      "tone": "technical",
      "title": "From repository to artifact",
      "cards": [
        { "body": [{ "type": "heading", "text": "Known input" }] },
        { "body": [
          { "type": "heading", "text": "Exact command" },
          { "type": "paragraph", "text": "npx example-tool@latest" }
        ] },
        { "body": [{ "type": "heading", "text": "Inspectable output" }] }
      ]
    }
  }]
}
```

`artifact_index` starts at 1 within each output and follows that renderer's order; it is not a job-wide sequence. A three-card poster contract has one output with artifact indices 1, 2, 3; separate single-artifact outputs each use index 1. Group artifacts only when one render contract actually emits them (for example, a poster series). Different aspects need separate outputs even when they use the same mode. The artifact count must equal the contract's deterministic artifact count: poster cards, split article diagrams, or one for other contracts. Every V3 artifact must reference at least one source unit whose evidence is both `primary` and `current`. `stale`, `unknown`, or `unusable` evidence may remain in the inventory for an auditable rejection, but cannot carry an artifact.

Evidence kinds are `claim`, `quote`, `command`, `interface`, `output`, `benchmark`, `architecture`, `case`, and `hero`. `strength` is `primary`, `supporting`, or `unusable`; `freshness` is `current`, `stale`, or `unknown`. A reason is mandatory for unusable or non-current evidence.

Each artifact must claim an independent current primary unit, except the explicitly linked WeChat cover adaptation described below. Runtime identity prefers a media SHA-256 digest and also deduplicates normalized textual evidence by evidence kind plus NFC-normalized excerpt with invisible format characters removed. Renaming an ID, splitting one screenshot into multiple source units, or attaching different arbitrary digests to identical text does not create new evidence.

`command` and `quote` units require a non-empty `excerpt`, `transformation: "preserve"`, and an exact match in text that the specific artifact deterministically renders. Non-visible IDs, relation metadata, hidden HTML, series text shown on another card, and suppressed diagram labels do not count. Exact evidence is limited to `long` and `poster`; Studio CSS, diagram layout, Big accent markup, and Whiteboard inline markup may interpret, hide, normalize, or truncate source characters.

`schemas/visual-job.json` documents the public shape. `scripts/lib/visual-job.js` is the runtime authority, and `scripts/lib/mode-selector.js` owns taxonomy. `decision.mode` is the single output mode or `mixed`; it must equal the aggregate of actual contracts. For a mixed big + article-diagram job, both `outputs[0].artifacts[0].artifact_index` and `outputs[1].artifacts[0].artifact_index` are 1. Stable and Studio outputs cannot be mixed in one job.

Use `tone` for `reflective`, `sharp`, `warm`, or `technical`; these select internal Kenny Style color palettes and are not design names. An exact `design` remains an explicit compatibility palette from `references/design-index.md`. Tone and design may change colors only, never typography, geometry, spacing, layout, wrapping, metaphor, or content structure.

For source-aware tasks, first read `references/source-material.md`. For open-source tools, also read `references/source-open-source-tool.md`. Visible copy must describe source meaning, never artifact labels such as `BLOG HERO`, mode names, or planning taxonomy unless those words occur in the source.

Visual Job v2 and v3 render only as candidates:

```bash
node scripts/render-job.mjs --input visual-job.json --output-dir <candidate-dir> --candidate --json
```

After the image-capable host Agent inspects every actual PNG and writes matching `*.review.json` files, publish the sealed Visual Job v2/v3 candidate with the commands below. Ordinary local delivery needs no additional user approval; preserve any checkpoint explicitly requested by the user.

```bash
approved_sha=$(node scripts/hash-reviewed-candidate.mjs --candidate-dir <candidate-dir>)
node scripts/publish-reviewed-job.mjs --candidate-dir <candidate-dir> --output-dir <final-dir> --expected-candidate-sha256 "$approved_sha" --json
```

Candidate rendering creates a closed-set `candidate-manifest.json` plus one preserved `*.checked.html` per PNG. The digest is recorded after visual review and kept outside the candidate directory, so internally consistent replacement after approval is rejected. The publisher also rejects missing or extra candidate files, mixed identities, failed reviews, scores below 8.0, blockers, mismatched identities or hashes, duplicate targets, and unreviewed artifacts. It snapshots the bounded candidate file set into a private directory, reruns `check-output`, and performs a trusted recapture of the preserved HTML under a response-header CSP that blocks scripts, frames, objects, connections, and unsealed resources before markup is parsed; the recaptured PNG must byte-match the reviewed candidate. Capture dimensions, DPR, full-page height, PNG bytes, and decoded pixels are bounded. Only PNG, receipt, and review are published.

Legacy Visual Job v1 candidates remain publishable only with the additional `--allow-legacy-v1` flag. Treat that flag as an explicit approval of the legacy provenance; never add it to a v2/v3 workflow or use it to rescue a candidate whose sealed Visual Job snapshot disappeared.

A Visual Job may contain at most 20 rendered artifacts in aggregate, including poster pages and split diagram views. Unique poster media across every output also shares one 32 MiB job-wide budget; reusing the same canonical file does not spend the budget twice. Reviewed publication has a ten-minute job deadline. These bounds keep embedded checked HTML inside the closed candidate budget and prevent a large legacy batch from amplifying browser launches while leaving ordinary v1/v2 jobs and the adaptive 1–4 artifact route intact.

For v3, the candidate set also seals a temporary Visual Job snapshot. Publication derives the complete expected artifact set from that snapshot and requires matching job/artifact-plan hashes in every receipt and review. The snapshot is verification input only and is not published, so source excerpts do not become delivery artifacts.

## WeChat cover pair

Use this exception only for an explicitly requested wide/square adaptation of one cover, never to pad a content series. Set `cover_adaptation_of` on the later output to the original output ID. This field belongs to the output, not the renderer contract or artifact. It is included in the sealed job identity; each PNG retains its own plan, contract hash, receipt, check, and visual review.

Runtime requires Visual Job v3 and `publish_target: "wechat-cover"`; two `editorial-image` covers (use omitted or `cover`), one explicit `wechat-cover` aspect and one `square`; exactly one `role: "cover"` artifact per output; identical source ID sets, transformation, and visual-plan core message, content type, argument structure, and metaphor. The contract title, subtitle, kicker, source, brand, logo, design, and tone must also match, including omitted fields. Layout, hierarchy, HTML, and CSS may differ. Only one adaptation may reference an original, and chains, self references, forward references, and unrelated modes are rejected. Both outputs still need current primary evidence and the same tier. Ordinary evidence deduplication remains unchanged.

The host must also compare the visible copy: equal metadata cannot prove that custom HTML/CSS displays it faithfully. Do not rename evidence IDs, invent extra claims, or split the pair into separate jobs to evade these constraints. `cover_art` remains unsupported for square; use the existing complete Studio composition for both versions when needed.

The following complete example uses fictional measurements explicitly labeled in the visible images. It tests mixed Chinese/Latin copy, a percentage, visible qualifications, a long source title, and absent attribution. It is not a claim about a real product.

```json
{
  "schema_version": 3,
  "job_id": "wechat-cover-pair-example",
  "publish_target": "wechat-cover",
  "source": {
    "kind": "pasted-text",
    "language": "mixed",
    "label": "Fictional cover-pair fixture: a long original headline about Agent context reuse and Token efficiency"
  },
  "source_units": [
    {
      "id": "context-reuse",
      "excerpt": "虚构样例：Agent 复用上下文。在示例测量中，质量不变，Token 成本降低 7%。",
      "evidence": {
        "kind": "claim",
        "strength": "primary",
        "freshness": "current"
      }
    }
  ],
  "decision": {
    "mode": "editorial-image",
    "tier": "studio",
    "tone": "technical",
    "selection_source": "taxonomy",
    "reason": "An explicitly requested wide and square adaptation of one fictional claim."
  },
  "outputs": [
    {
      "id": "wide",
      "artifacts": [
        {
          "artifact_index": 1,
          "id": "cover-wide",
          "basename": "cover-pair.wide.png",
          "role": "cover",
          "source_unit_ids": [
            "context-reuse"
          ],
          "transformation": "compress",
          "visual_plan": {
            "core_message": "示例测量中，质量不变，Token 成本降低 7%。",
            "content_type": "idea",
            "argument_structure": "single-claim",
            "visual_metaphor": "把反复携带的上下文收进可复用的抽屉。",
            "layout_strategy": "Horizontal title beside reusable-context drawer",
            "visual_hierarchy": [
              "title",
              "qualification",
              "context drawer"
            ],
            "avoid_patterns": [
              "cropping the wide PNG",
              "unqualified savings claim",
              "invented attribution"
            ]
          }
        }
      ],
      "render_contract": {
        "mode": "editorial-image",
        "use": "cover",
        "aspect": "wechat-cover",
        "editorial_tone": "technical",
        "title": "Agent 减负 7%",
        "subtitle": "示例测量中，质量不变，Token 成本降低 7%。",
        "kicker": "样例 · 非真实测量",
        "visual_metaphor": "把反复携带的上下文收进可复用的抽屉。",
        "composition_required": true,
        "content_html": "<section class=\"pair\"><div class=\"copy\"><p class=\"eyebrow\">样例 · 非真实测量</p><h1>Agent 减负 7%</h1><p class=\"deck\">示例测量中，质量不变，<span>Token 成本降低 7%。</span></p></div><div class=\"cabinet\" aria-hidden=\"true\"><div class=\"folder\"><div class=\"tab\"></div><i></i><i></i><i></i></div><div class=\"drawer\"><span></span></div></div></section>",
        "custom_css": ".pair { flex: 1; min-height: 0; padding: 56px 72px; display: grid; grid-template-columns: 1.4fr 1fr; align-items: center; gap: 48px; } .copy { min-width: 0; } .eyebrow { font: 400 24px/1.4 var(--zh-serif); color: var(--ink-light); margin-bottom: 24px; } .pair h1 { font: 400 62px/1.15 var(--zh-serif); margin: 0 0 24px; } .deck { font: 400 36px/1.6 var(--zh-serif); color: var(--ink-light); } .cabinet { position: relative; height: 270px; width: 280px; justify-self: center; } .folder { position: absolute; left: 24px; top: 30px; width: 232px; height: 180px; padding: 42px 26px; border: 1px solid var(--hairline); border-radius: var(--radius); background: var(--surface-1); } .tab { position: absolute; left: 16px; top: 0; width: 64px; height: 16px; background: var(--accent); } .folder i { display: block; height: 1px; margin-bottom: 20px; background: var(--hairline); } .drawer { position: absolute; left: 0; bottom: 0; width: 280px; height: 110px; border: 1px solid var(--hairline); border-radius: var(--radius); background: var(--surface-2); display: grid; place-items: center; } .drawer span { width: 60px; height: 16px; border: 1px solid var(--ink-light); border-radius: var(--radius); } .deck span { white-space: nowrap; }"
      }
    },
    {
      "id": "square",
      "cover_adaptation_of": "wide",
      "artifacts": [
        {
          "artifact_index": 1,
          "id": "cover-square",
          "basename": "cover-pair.square.png",
          "role": "cover",
          "source_unit_ids": [
            "context-reuse"
          ],
          "transformation": "compress",
          "visual_plan": {
            "core_message": "示例测量中，质量不变，Token 成本降低 7%。",
            "content_type": "idea",
            "argument_structure": "single-claim",
            "visual_metaphor": "把反复携带的上下文收进可复用的抽屉。",
            "layout_strategy": "Compact vertical stack: centered text and context drawer share one axis; content-sized rows keep the visible gap near 70px.",
            "visual_hierarchy": [
              "title",
              "qualification",
              "context drawer"
            ],
            "avoid_patterns": [
              "cropping the wide PNG",
              "unqualified savings claim",
              "invented attribution"
            ]
          }
        }
      ],
      "render_contract": {
        "mode": "editorial-image",
        "use": "cover",
        "aspect": "square",
        "editorial_tone": "technical",
        "title": "Agent 减负 7%",
        "subtitle": "示例测量中，质量不变，Token 成本降低 7%。",
        "kicker": "样例 · 非真实测量",
        "visual_metaphor": "把反复携带的上下文收进可复用的抽屉。",
        "composition_required": true,
        "content_html": "<section class=\"pair\"><div class=\"copy\"><p class=\"eyebrow\">样例 · 非真实测量</p><h1>Agent 减负 7%</h1><p class=\"deck\">示例测量中，质量不变，<span>Token 成本降低 7%。</span></p></div><div class=\"cabinet\" aria-hidden=\"true\"><div class=\"folder\"><div class=\"tab\"></div><i></i><i></i><i></i></div><div class=\"drawer\"><span></span></div></div></section>",
        "custom_css": ".pair { flex: 1; min-height: 0; padding: 56px 72px; display: grid; grid-template-columns: 1.4fr 1fr; align-items: center; gap: 48px; } .copy { min-width: 0; } .eyebrow { font: 400 24px/1.4 var(--zh-serif); color: var(--ink-light); margin-bottom: 24px; } .pair h1 { font: 400 62px/1.15 var(--zh-serif); margin: 0 0 24px; } .deck { font: 400 36px/1.6 var(--zh-serif); color: var(--ink-light); } .cabinet { position: relative; height: 270px; width: 280px; justify-self: center; } .folder { position: absolute; left: 24px; top: 30px; width: 232px; height: 180px; padding: 42px 26px; border: 1px solid var(--hairline); border-radius: var(--radius); background: var(--surface-1); } .tab { position: absolute; left: 16px; top: 0; width: 64px; height: 16px; background: var(--accent); } .folder i { display: block; height: 1px; margin-bottom: 20px; background: var(--hairline); } .drawer { position: absolute; left: 0; bottom: 0; width: 280px; height: 110px; border: 1px solid var(--hairline); border-radius: var(--radius); background: var(--surface-2); display: grid; place-items: center; } .drawer span { width: 60px; height: 16px; border: 1px solid var(--ink-light); border-radius: var(--radius); } .pair { padding: 100px 108px; grid-template-columns: 1fr; grid-template-rows: auto auto; align-content: center; gap: 40px; } .copy { width: 100%; max-width: 720px; justify-self: center; text-align: center; } .pair h1 { font-size: 88px; } .deck { max-width: 720px; font-size: 36px; } .cabinet { width: 440px; height: 370px; } .folder { left: 32px; width: 376px; height: 270px; padding: 64px 40px; } .folder i { margin-bottom: 32px; } .drawer { width: 440px; height: 150px; } .deck span { white-space: nowrap; }"
      }
    }
  ]
}
```
