# Personal article diagrams

Personal relation diagrams are the default for new natural-language article-diagram requests. The Agent selects `personal_layout` from source semantics and writes it explicitly; users need not name the style. Requires `render_plan: "structure"` and `aspect: "body-3-2"` (or omitted aspect). Legacy families and formula-only cards are retired. Replan their source with an explicit supported relation; never guess topology. This is a layout contract, not a tone.

| Value | Relation contract | Boundary |
|---|---|---|
| `exchange` | Two reciprocal actor edges; one actor links to one internal-detail node. All edges labeled. | Exactly 3 nodes/3 edges. Permissions must come from source text. |
| `convergence` | Independent sources point to one target with a shared relation label. | 2–6 nodes; measured slots may reject dense sets. No implied arithmetic or sequence. |
| `tension` | Two sources point to one target; both edge labels remain visible. | Exactly 3 nodes/2 edges. Source text must establish the tension. |
| `cycle` | Connected directed cycle, one incoming/outgoing edge per node. | 3–4 nodes. Split branched feedback into separate reading responsibilities. |
| `timeline` | One connected directed chain. | 2–6 nodes. Try horizontal then vertical for small sets; longer sets use rows. Dates are labels, not parsed coordinates. State when spacing is not proportional to duration. |
| `hierarchy` | Connected tree, one parent per non-root node. | 2–6 nodes, at most four levels; complete labels must fit allocated subtree widths. No multiple inheritance. |

Timeline/hierarchy edges must share one label (or all be unlabeled), displayed once. Duplicate edges, self links, disconnected topology and cycles in trees are invalid. Runtime validation owns graph semantics; JSON Schema documents field shape and conditional constraints.

## Common style and content rules

Use a 1080×720 canvas, 46px heading with a thin accent rule, controlled serif family, 36px node text and qualification, 30px relation labels. Existing tone/design tokens control colors only. Do not inject a brand name.

The heading states the relationship; notes stay beside nodes; necessary conditions and scope stay visible in `sentence`. Escape text. Never truncate, hide relations, shrink type or split English identifiers to fit. Topology drives ordering; input order breaks sibling ties. Topic words and node IDs have no special behavior.

## Measurement and splitting

The renderer uses the injected browser adapter to measure actual heading, qualification, node and edge text. It selects only a fitting layout. Direct renderer callers must also provide measurement; there is no unmeasured fallback. The renderer owns all choreography, without CLI error-message matching.

If no layout fits, report `content_fit` with a split suggestion. This is not permission to remove content. At planning time divide the explanation into independent reading responsibilities, retain essential context and create separate evidence-linked artifacts. Automatic semantic splitting is not implemented.

Six nodes is a contract limit, not a readability guarantee. Label width, note height, depth, return paths and intended reading size matter together. Phone legibility still needs actual visual review; machine passing is not proof of reader comprehension or brand recognition.

## Acceptance

`evals/fixtures/article-diagram-personal.json` contains A2A exchange, uncertainty convergence/tension, PDCA cycle, Web timeline, Python hierarchy, dense timeline and two boundary cases. `scripts/validate-personal-diagram.mjs` runs real browser measurement, output checks, topology rejection and overlong-content checks; the full `scripts/validate.mjs` invokes it.

Use the normal Visual Job v3 → candidate → actual PNG inspection → review → hash-bound publication chain. The default is a planning policy, not an inferred graph-topology switch: convergence and tension can have the same graph, and a chain alone does not prove chronological evolution. If no relation fits, split at planning time or explain the limitation; never silently substitute a formula or discard labels.

Optional subtitle/caption are visibly appended to the qualification, and explicitly supplied source/brand/logo receive a measured footer. If their combined text does not fit, replan instead of silently dropping it.
