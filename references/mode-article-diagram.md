# Mode: article-diagram

This mode creates in-article explanatory visuals. Use it when the image must clarify a relationship, sequence, boundary, permission model, trust model, or compact system structure.

It is not an editorial cover and not a summary card. A good article diagram lets the reader understand one relationship before reading the surrounding paragraph again.

## Core Belief

正文解释图的工作不是装饰文章，而是降低理解成本。

It should answer one of these questions:

- What relates to what?
- What happens first, next, and last?
- Where is the boundary?
- Which part is inside, outside, guarded, or restricted?

If the image only sets mood, use `editorial-image`. If it compresses a whole article into many points, use `poster`, `whiteboard`, or a Creative tier mode instead.

## Families

Pick the family before writing labels. Do not improvise a fourth family in the JSON.

| Family | Use when | Hard limit |
|---|---|---|
| `concept-map` | 2-5 concepts and their relationships | 5 nodes, 6 links |
| `process-flow` | Sequence, loop, review path, handoff, pipeline | 6 steps |
| `boundary-model` | Inside/outside, trust, permission, sandbox, safety boundary | 4 zones, 6 nodes |

## Routing

Use `article-diagram` for:

- `正文解释图`
- `关系图`
- `流程图`
- `边界图`
- `权限边界`
- `安全边界`
- `trust boundary`
- `process diagram`
- `concept map`

Keep `editorial-image` for:

- `公众号头图`
- `博客封面`
- `文章封面`
- mood illustration
- visual metaphor
- quiet section image that does not need to explain structure

Ambiguous `正文配图` requests should be routed by intent:

- If the user wants mood, rhythm, metaphor, or a visual pause -> `editorial-image`.
- If the user wants concepts, steps, boxes, arrows, nested areas, permissions, or labels -> `article-diagram`.

## Whole Article Workflow

When the input is a full article, do not compress the whole article into one diagram. First find the sections that deserve explanation, then render one independent diagram for each qualifying section.

### Step 1: Identify section groups

Scan the article for headings and semantic turns:

- `h2` / `h3` headings
- standalone short heading-like lines
- numbered sections
- clear topic shifts even when headings are missing
- opening introduction and closing conclusion as their own groups

Each section group = one section title or inferred topic + its following paragraphs, lists, quotes, examples, or local explanation, until the next peer or higher-level section begins.

### Step 2: Decide which sections are worth drawing

A section is worth an `article-diagram` only when a diagram would lower understanding cost. Draw it when the section contains at least one of these:

- a relationship between 2-5 concepts
- a sequence, loop, review path, handoff, pipeline, or lifecycle
- an inside/outside boundary, trust boundary, permission boundary, or safety boundary
- a cause-and-effect chain
- a system structure with roles, layers, or controlled resources
- a contrast where the distinction is spatial, procedural, or structural

Skip the section when it is mainly:

- setup, background, anecdote, or mood
- a thesis statement with no internal structure
- a conclusion that only restates the article
- a list of claims without visible relationships
- a passage better served by `editorial-image`, `poster`, or `whiteboard`

Do not create one diagram per heading mechanically. A section must earn a diagram by having structure.

### Step 3: Produce one diagram per qualifying section

For every qualifying section:

1. Keep the section boundary intact. Do not mix content from different sections in one diagram.
2. Extract the smallest useful structure from that section.
3. Pick exactly one family: `concept-map`, `process-flow`, or `boundary-model`.
4. Generate one complete `article-diagram` JSON object for that section.
5. Preserve article order in the output sequence.

If one section contains multiple possible structures, choose the one that best helps the reader understand that section in context. Only create multiple diagrams for the same section when the user explicitly asks for a fuller set.

### Step 4: Batch output rules

When multiple sections qualify:

- render all qualifying sections, not only the strongest one
- use filenames that preserve article order and section identity, such as `01-{section-slug}.png`
- keep each diagram readable as a standalone in-article image
- report how many diagrams were produced and which section each one belongs to

If no section qualifies, do not force a weak diagram. Tell the user the article has no section that clearly benefits from a structural explanation image, then recommend the closest better mode.

## Field Contract

Base shape:

```json
{
  "mode": "article-diagram",
  "family": "concept-map | process-flow | boundary-model",
  "title": "Short relationship title",
  "nodes": [{ "id": "stable-id", "label": "Visible label", "note": "Optional short note" }],
  "links": [{ "from": "node-id", "to": "node-id", "label": "Optional relation" }],
  "zones": [{ "id": "zone-id", "label": "Visible zone" }],
  "caption": "Optional one-sentence interpretation",
  "design": "stripe"
}
```

Rules:

- `nodes[].id` is an internal anchor; it should not be visible.
- `nodes[].label` is visible. Keep it short.
- `nodes[].note` is optional and must be shorter than the label in visual weight.
- `links[]` must point to existing node ids.
- `links[].label` is optional annotation, not required structure. Use it only when the relation word changes the reader's understanding.
- `zones[]` is only for `boundary-model`.
- `boundary-model` nodes require `zone`.
- `aspect` defaults to `body-3-2`; use `body-4-3` only when vertical space improves clarity.

Language contract:

- Visible text follows the source article and the user's request by default.
- For a Chinese article, write `title`, `subtitle`, `nodes[].label`, `nodes[].note`, `links[].label`, `zones[].label`, `zones[].description`, and `caption` in Chinese unless the user explicitly asks for English, bilingual output, or translation.
- For an English article, keep visible text in English unless the user asks otherwise.
- Internal ids may be English slugs, but visible labels should not be translated away from the source language.
- Preserve proper nouns, product names, API names, and technical terms in the language or spelling used by the source.
- The English examples below and in the schema are schema illustrations, not a language default.

## Family Selection

### concept-map

Use when the article explains how a few ideas reinforce, constrain, or transform each other.

Good inputs:

- Three-part model
- Concept dependency
- Tension between forces
- Hub-and-spoke explanation

Avoid:

- More than five concepts
- Long relationship labels
- Repeating the same relationship label on several links; move the shared relation into the title or caption instead
- A complete article outline disguised as a map

### process-flow

Use when order matters.

Good inputs:

- Review -> decide -> act -> verify
- Draft -> critique -> revise -> publish
- Request -> plan -> tool call -> result

Avoid:

- Branching decision trees
- Parallel swimlanes
- Long step descriptions

### boundary-model

Use when the article depends on a separation between spaces, trust levels, permissions, or control layers.

Good inputs:

- Agent harness safety
- Sandbox vs filesystem
- User request vs tool execution
- Public API vs private state

Avoid:

- Decorative nested boxes with no real boundary
- More than four zones
- Labels that repeat the article title instead of naming zones

## Visual Rules

- Use fixed slots. Do not free-position labels by taste.
- One visible label per node.
- Relationship labels are optional. If several links share the same label, hide the repeated labels and state the shared relation in the title or caption.
- Visible relationship labels must stay outside node boxes and away from the stage boundary; if they cannot fit cleanly, remove the label before shrinking the text.
- Text must not overlap connectors, boxes, zones, or other text.
- Connectors should sit behind nodes and stop visually at node boundaries.
- Zone labels should name the area, not the output format.
- The title should describe the relationship, not say `article diagram`, `process flow`, or `boundary model`.
- Keep text readable at thumbnail size.
- Prefer fewer nodes over smaller text.
- Do not add page chrome, toolbar headers, fake UI panels, or decorative frames.
- Preserve Quiet Paper: warm paper, restrained ink, hairline borders, low-saturation accent, little shadow.

## Anti-Patterns

- **Mode label leakage**: visible text like `ARTICLE DIAGRAM`, `正文解释图`, `concept map`, or `process flow`.
- **Whole-article compression**: one diagram tries to summarize every section of a long article.
- **Mechanical section coverage**: every heading gets a diagram even when the section has no structural relationship to explain.
- **Section mixing**: one diagram combines concepts from separate sections just because they all seem important.
- **Box soup**: many boxes with no visible hierarchy.
- **Arrow soup**: arrows everywhere, no first reading path.
- **Summary card in disguise**: bullets distributed into boxes.
- **Fake precision**: detailed labels that imply structure the article did not establish.
- **Tiny taxonomy**: six small terms packed so tightly that none can be read first.

## Acceptance Check

Before delivery:

- Can the main relationship be understood in 3 seconds?
- Is the family correct for the job?
- Are there 2-6 visible units, not a full article outline?
- For full-article input, were all worth-drawing sections rendered, and weak sections skipped?
- Does each diagram serve exactly one section?
- Does every label name article content rather than the image format?
- Does visible text stay in the source or requested language?
- Do zones, nodes, and connectors avoid accidental overlap?
- Does the image still read at thumbnail size?
- Does it stay inside Quiet Paper rather than looking like a dashboard or slide?

If any answer is no, simplify the structure before rendering.
