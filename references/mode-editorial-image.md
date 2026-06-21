# Mode: editorial-image

This mode creates article images for long-form authors: WeChat cover images, blog hero images, and quiet in-article illustrations.

It is not a summary-card mode. If the image explains the article point by point, it has failed. A good editorial image gives the article a visual stance: a mood, metaphor, tension, or scene that helps the reader decide how to enter the piece.

## Core Belief

An editorial image is the first visual sentence of an article.

It should answer one of these questions:

- What tension does this article care about?
- What mood should the reader enter with?
- What object, scene, or gesture can carry the article's idea without restating it?
- What image would still feel attached to this essay after the title is removed?

## Difference From Content Cards

| Dimension | Content card | Editorial image |
|-----------|--------------|-----------------|
| Job | Compress and explain | Set stance and invitation |
| Information | Direct, structured, skimmable | Indirect, metaphorical, atmospheric |
| Text amount | Medium to high | Low by default |
| Success | The idea is clear | The article feels worth entering |
| Failure | Too shallow or incomplete | Too literal, generic, or detached |

## Supported Outputs

### 1. WeChat / Blog Cover

Use when the user asks for:

- `公众号头图`
- `博客封面`
- `文章封面图`
- `cover image for this essay`
- `blog hero image`

Default shape: horizontal cover, low text, generous crop-safe margin.

Goal: the image can sit above the article and survive sharing previews.

### 2. In-Article Illustration

Use when the user asks for:

- `正文配图`
- `给这一节配图`
- `section illustration`
- `in-article image`

Default shape: calmer and less title-driven than a cover.

Goal: create a visual pause or transition without competing with the prose.

### 3. Concept Metaphor

Use when the article is a reflective, analytical, technical, or opinion essay.

Goal: translate the article's hidden tension into one visual metaphor. Prefer one strong object/scene over a collage of all concepts.

Examples:

- Tooling and memory -> a workbench with one labeled drawer missing.
- Agent architecture -> stacked tracing paper, each sheet showing a different layer.
- Writing under automation -> a hand editing a page while a second shadow-hand waits.

## Aspect Ratios

Aspect ratio is part of the editorial decision, not an export detail. Pick the ratio before composing the image because it decides where the title can sit, how much negative space is needed, and whether the visual idea can survive cropping.

| Use | `aspect` | Ratio | Default viewport | When to use |
|-----|----------|-------|------------------|-------------|
| WeChat cover | `wechat-cover` | `2.35:1` | `1080x460` | Default for `公众号头图` and share-first article covers |
| Blog hero | `blog-hero` | `16:9` | `1080x608` | Default for blog headers and general article hero images |
| Body illustration | `body-3-2` | `3:2` | `1080x720` | Default for in-article illustrations with a little narrative space |
| Compact body image | `body-4-3` | `4:3` | `1080x810` | Use when the image needs more vertical breathing room |
| Cinematic concept | `cinematic` | `21:9` | `1080x463` | Use for atmosphere, landscape metaphors, or very wide visual tension |
| Square share | `square` | `1:1` | `1080x1080` | Optional share image, not the default for WeChat/blog longform |

Default selection:

- If the user says `公众号头图`, `公众号封面`, or `WeChat cover`, use `wechat-cover`.
- If the user says `博客封面`, `blog cover`, or `blog hero`, use `blog-hero`.
- If the user says `正文配图`, `段落配图`, `in-article`, or `section illustration`, use `body-3-2`.
- If the user does not specify a destination, use `blog-hero` for covers and `body-3-2` for in-article images.

Composition rules:

- Put important subjects inside the central 80% width and 76% height.
- Avoid placing small text or faces near the edges.
- For `wechat-cover`, reserve at least 18% empty space on one side for title overlay or platform crop.
- For in-article images, prefer a quieter center of gravity; the image should help the prose breathe, not behave like a banner ad.
- For `body-3-2` and `body-4-3`, avoid cover-like left/right split layouts unless the middle space carries a clear relationship.
- If a concept needs vertical hierarchy, do not force it into `wechat-cover`; use `body-4-3` or `blog-hero`.

## In-Article Density

In-article illustrations should be quiet, but they should not look unfinished.

The default goal is enough visual presence: the main subject should occupy roughly 55-75% of the usable canvas. Lower density is acceptable only when the negative space has a clear job, such as isolating a fragile object, creating directional tension, or leaving room for an editorial crop.

For `body-3-2` and `body-4-3`:

- Prefer centered, stacked, radial, or close-proximity compositions when the subject otherwise feels undersized.
- Keep the main subject large enough to hold the image at thumbnail size.
- Use negative space to frame or pace the subject. The middle of the image may be empty if the surrounding visual weight still feels intentional.
- If there are two groups, they may sit apart, but each group must have enough scale and the whole image must still feel balanced.
- Do not shrink the actual subject in order to preserve a decorative amount of paper.
- Keep readable text and primary visual objects in separate zones by default. They may align, echo, or nearly touch, but should not cross or sit on top of each other unless the brief explicitly asks for collage or overprint.

If the image feels sparse or underdrawn at thumbnail size, increase the subject scale or visual weight before rendering.

## Analysis

Before proposing visuals, extract:

```
Title:
Article type: [essay / technical essay / opinion / case study / personal reflection / review]
Use: [cover / in-article / metaphor]
Core tension: [A vs B, or problem vs desire]
Reader promise: [why someone should read]
Emotional temperature: [cool / warm / sharp / quiet / uneasy / playful / solemn]
Visual taboo: [symbols, styles, people, or cultural references to avoid]
Required text: [none / title only / short phrase / title + byline]
Aspect: [wechat-cover / blog-hero / body-3-2 / body-4-3 / cinematic / square]
Crop context: [WeChat cover / blog hero / body image / generic horizontal]
Design system: [auto / claude / stripe / linear / apple / ibm / ...]
```

For long articles, do not summarize every section. Find the recurring pressure underneath the sections.

## Design System Use

Editorial image supports the same `design` field as other CLI-rendered modes.

Use design systems as taste inflections, not as concept generators:

- `design` controls canvas color, ink color, accent color, paper surface, border tone, and radius.
- `design` does not decide the visual metaphor, composition, object choice, or article stance.
- If the user specifies a design system or brand feeling, honor it as a mood layer.
- If the user does not specify one, choose automatically from the article's emotional temperature and topic.

Good defaults:

- Technical essays: `stripe`, `ibm`, `apple`, `claude`, or `ljg_jishu`
- Reflective essays: `claude`, `notion`, `apple`, `ljg_chensi`, or `ljg_wennuan`
- Sharp opinion pieces: `linear`, `raycast`, `ljg_ruili`, or `stripe`
- Quiet in-article illustrations: `claude`, `notion`, `apple`, or `ljg_chensi`

The chosen design should be mentioned in the rendering brief, but it should not become visible text in the artwork.

## Direction Proposal

Always propose 2-3 visual directions before rendering unless the user explicitly asks for a single direct result.

Each direction must include:

```
Name:
Purpose:
Aspect:
Visual metaphor:
Composition:
Text plan:
Why it fits:
Failure risk:
```

Direction types should be meaningfully different:

- **Metaphor object**: one object carries the idea.
- **Scene atmosphere**: a small scene puts the reader in the right mood.
- **Editorial cover**: title and image form a magazine-like opening.

Do not propose three colorways of the same image. That is styling, not direction.

## Open Composition Layer

The structured fields are guardrails, not the final visual language.

Use fields like `use`, `aspect`, `title`, `visual_metaphor`, and `art_direction` to preserve intent, ratio, crop context, and safety constraints. Do not force every editorial image into the default renderer's visible layout.

For final rendering, the AI flow may use:

- `content_html` for the chosen visual structure
- `custom_css` for the actual composition, spacing, symbolic objects, and atmosphere
- `visual_metaphor` and `art_direction` as hidden guidance, not necessarily visible text

The default CLI renderer is only an aspect-safe Quiet Paper scaffold. It is useful for validation and simple covers, but high-quality editorial images should use a custom composition derived from the selected direction.

## Rendering Rules

- Text should usually take less than 20% of the image.
- Visible text must belong to the artwork. It may be the article title, a section title, a real term, a short excerpt, a byline, or a label attached to a visual object.
- Do not print generation notes, usage notes, or internal rationale into the artwork. Avoid sentences like `给这一节使用`, `用作正文配图`, `安静、低干扰`, `像文章中间的一次停顿`, or `visual pause`.
- For in-article images, do not let readable text collide with cards, objects, diagrams, or illustration layers. Text-object overlap is a hard failure unless the requested style is explicitly collage/overprint and readability remains clean.
- Headline line breaks are a hard quality standard, not a cosmetic preference. Fix bad wrapping before delivery.
- Prefer manual `<br>` breaks for cover titles and short hero phrases when automatic wrapping creates an awkward rhythm.
- Never leave a single CJK character, a two-character orphan, or a very short final line as the last headline line.
- Do not split attached technical names or phrases such as `AI Agent`, `Hermes Agent`, `run_agent.py`, `context compression`, or a product name across lines unless the split is visually intentional.
- Do not remove spaces inside technical or product terms. `AI Agent` must not become `AIAgent`, `Hermes Agent` must not become `HermesAgent`, and multi-word terms must keep their word boundaries unless the source itself uses a closed-up spelling.
- Prefer one primary visual idea. Avoid icon soup.
- The image may be ambiguous, but not unrelated.
- Do not print mode or destination labels into the artwork. Avoid labels such as `IN-ARTICLE IMAGE`, `EDITORIAL IMAGE`, `BLOG HERO`, `WECHAT COVER`, or `COVER IMAGE` unless they are part of the article's actual title or source material.
- Preserve Quiet Paper: warm paper or deep card stock, restrained ink, small radius, little shadow, low-saturation accent.
- Avoid stock-photo language: no smiling generic office people, floating dashboards, neon AI brains, glowing networks, or decorative abstract blobs.
- If the article mentions real people, institutions, places, or events, do not invent factual visuals that imply unverified details.
- For in-article illustrations, reduce contrast and text weight compared with cover images.
- Leave crop-safe space around important visual elements.
- Do not add a default colophon or footnote. Editorial images should feel like article artwork, not branded cards.

## Diagram And Connector Discipline

Editorial images may use diagrams, maps, or structural metaphors, but they must still feel like composed artwork rather than a broken UI sketch.

Use these rules whenever lines, arrows, wires, rails, or flow paths appear:

- Connect from boundary to boundary: edge of card to edge of node, object to object, or anchor point to anchor point.
- Do not let connector lines run through the interior of labeled boxes, cards, circles, or text blocks.
- If a line must cross an object, treat it as a deliberate overprint layer: lower contrast, no accidental overlap with readable text, and visually subordinate to the main idea.
- Prefer short connector segments, subtle anchor dots, or orthogonal routes over long diagonal lines that slice through the composition.
- Avoid fake precision. If the relationship is metaphorical rather than literal, use spacing, alignment, grouping, or repeated forms before adding lines.

## SVG Text Inside Containers

When an SVG `<text>` element sits inside a `<rect>`, `<circle>`, or `<ellipse>` (the pill / badge / label / button / tag pattern), the shape must be wide enough to contain the text plus padding. The preflight (`scripts/check-output.mjs`) automatically measures rendered text bounding box against the shape and fails with `svg_text_overflow` ERROR if text spills past the shape by more than 2px.

To avoid the failure, budget the rect width before writing the SVG:

| Token type | Width estimate |
|---|---|
| CJK character | `1.0 × font-size` |
| ASCII character (mono) | `0.55 × font-size` |
| ASCII character (proportional) | `0.50 × font-size` |
| `letter-spacing` | add `spacing × (chars − 1)` |
| Dot / icon prefix | `cx + r + 8px` of clearance before text starts |

Formula: `rect.width ≥ (text_start_x − rect.x) + text_width + 16px padding`.

When unsure, prefer the wider rect. The preflight catches underestimates; overestimates are visually harmless.

Example: a pill containing `dot(cx=11, r=3) + text("curl raw.github", font-size=10, letter-spacing=1.2)` needs at least `22 (start) + 14 × (0.55 × 10)px + 13 × 1.2px + 16 (pad) ≈ 130px`. The instinct to write `width="116"` will fail.

## Anti-Patterns

- **Title rebus**: drawing every noun in the title.
- **Summary poster**: turning the essay into bullet points.
- **Generic atmosphere**: beautiful but interchangeable image.
- **Style-first prompt**: strong style, weak idea.
- **Overpacked collage**: too many concepts competing.
- **False specificity**: realistic details that the article did not establish.
- **AI-default symbolism**: glowing circuitry, purple gradients, faceless people, infinite grids.
- **Mode label leakage**: visible labels like `IN-ARTICLE IMAGE`, `BLOG HERO`, or `EDITORIAL IMAGE` that describe the output format instead of the article.
- **Brief leakage**: visible explanatory text that describes how the image should be used instead of becoming part of the image.
- **Broken connector diagram**: lines pass through boxes, labels, or nodes instead of connecting cleanly between their boundaries.
- **Underdrawn body image**: an in-article image where the subject is too small or visually weak for the canvas, making the image feel unfinished.
- **Text-object collision**: readable text crosses into or sits on top of the main illustration, card stack, node, or diagram shape in a way that looks accidental.

## Acceptance Check

Before delivery, ask:

- Would this still feel tied to the article if the title were hidden?
- Does it show the article's tension rather than repeat the article's summary?
- Is there one dominant visual idea?
- Can it survive being cropped for a WeChat/blog preview?
- Does it avoid generic AI or stock-image signals?
- Is the amount of text appropriate for a cover or in-article image?
- Does every visible sentence belong in the artwork, rather than describe how the image should be used?
- Are headline and short text line breaks intentional, with no orphaned last line or awkward split?
- Are technical and product terms preserving their real spacing and casing?
- If there are connectors, do they connect cleanly at element boundaries without crossing text or box interiors?
- Does the image avoid visible mode/destination labels such as `IN-ARTICLE IMAGE` or `BLOG HERO`?
- For in-article images, does the subject have enough visual presence for the canvas, with purposeful negative space?
- For in-article images, are readable text and the main visual object separated cleanly, with no accidental collision?

If the answer to any of these is no, revise the concept before rendering.

## Reference Basis

- The Washington Post Design team: useful for treating illustration as an assigned editorial job with multiple first-round directions.
- The New Yorker cover practice: useful for images that stand as a visual point of view rather than decoration.
- GOV.UK image guidance: useful for deciding when images help readers and when they should not carry essential-only information.
- Design Guidelines for Prompt Engineering Text-to-Image Generative Models: useful for converting a vague text intention into concrete subjects, relationships, and visual constraints.
