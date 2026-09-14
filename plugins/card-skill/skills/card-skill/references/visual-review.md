# Visual Review v1

Visual Review is the subjective gate after a candidate has passed `check-output`. The host Agent must inspect the actual PNG. Renderers do not call a model, hold provider credentials, or assign aesthetic scores.

For ordinary requests, an image-capable host Agent performs this review and authorizes local file publication. This does not require a separate user approval. Wait for the user only when they requested a preview/review checkpoint. If the host cannot inspect images, report that limitation rather than inventing a passing review. Maintainer judgment in release evaluations remains a separate evidence level.

Each review binds to the Visual Job/output identity, artifact index, render-contract SHA-256, and PNG SHA-256. Visual Job v2 and v3 candidates also copy `visual_job_sha256`, `artifact_plan_sha256`, and `artifact_contract_sha256` from the receipt so the sealed job and the specific rendered card survive publication; v3 additionally gives those hashes evidence responsibility semantics. Scores are integers from 0 to 5:

- `message_clarity`
- `visual_hierarchy`
- `cognitive_load` (5 means easy to process)
- `style_consistency`
- `metaphor_quality`, required when `metaphor_required` is `true`; otherwise `null`

`overall_score` is the applicable arithmetic mean multiplied by two, rounded to one decimal. A review passes only at 8.0 or above with no blocker. Attempt 0 may return `revise`; attempt 1 must return `pass` or `fail`.

Issues use a safe type slug, `blocker` / `major` / `minor` severity, and a concrete suggestion. Mechanical defects remain the responsibility of `check-output`; the review focuses on meaning, focal hierarchy, load, visual weight, metaphor specificity, and Quiet Paper consistency.

Review one receipt artifact at a time. Copy `metaphor_required` from the renderer receipt; this prevents a planned metaphor from being silently excluded from the score. When one render contract emits multiple PNGs, `artifact_index` identifies the attached card; sibling cards are reviewed separately and must not be treated as missing from the current PNG.

## Meaning before scoring

Compare the source, requested editing intent, render contract, and actual PNG. Read the selected mode reference to establish which fields are visible before reporting missing content. For example, default article-diagram renders formula and sentence, not title or structure; an absent non-rendered title is not itself a defect. Necessary source meaning must still be present in the visible fields. Conditions stored only in hidden or non-rendered input do not count as delivered content.

Review titles and other newly added visible copy too: promoting a rejected initial belief, counterexample, or conditional claim into an unconditional headline is a meaning-loss blocker, even when the body remains intact.

Use an existing blocker issue for unauthorized prose edits in formatting-only tasks; lost meaning-changing conditions, negation, exceptions, or uncertainty; unsupported causal/quantitative relationships; or necessary explanation absent from the PNG. Suggested issue slugs: unauthorized-edit, meaning-loss, unsupported-relation, missing-explanation. These blockers cannot be offset by style or other scores.

Check the reading start and sequence at the intended reading size, and whether peers retain equal semantic weight. Ask what information or guidance would be lost by removing each line, frame, fill, or image. Redundancy is ordinarily a revision suggestion; block only when it obscures content or misleads grouping or reading order. Useful emphasis is allowed. Mechanical defects stay with check-output. Existing score fields, threshold, hash binding, and revision limits are unchanged.

Workflow:

```text
render-job --candidate -> inspect PNG -> review
  pass   -> host records hash-reviewed-candidate digest outside candidate -> publish-reviewed-job --expected-candidate-sha256
  revise -> edit only visual_plan + render_contract -> rerender/review once
  fail   -> do not publish a success artifact
```
