# Astra instruction cleanup — 0.10.2

Based on [OpenAI's skill and prompt guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra), this change reduces entry-point context and resolves conflicting workflow instructions. Runtime validation, the review threshold, and local publication checks are preserved. Model validation also exposed a reading-notes renderer defect: ordinary poster inline sizing overrode its 64px book-title style. The renderer now respects that cap, with a regression check.

## Two rounds

| Round | Implementation | Acceptance |
|---|---|---|
| 1 — Production instructions | Shorten the description; make SKILL.md a conditional router; use one Visual Job v3 chain for Stable and Studio; scope artifact counts by source; require candidate selection only when requested; assign PNG review to the image-capable host Agent. | Preserve content, source/privacy boundaries, full composition requirements, one revision, and reviewed local delivery. |
| 2 — Evaluation | Remove reference lists and layout coaching from fresh-context prompts; add catalog/routing probes, interruption reports, and local self-checks; synchronize documentation and the generated package. | Compare old/new routing with the same probes, run deterministic checks and smoke, inspect representative PNGs, then run bounded model production cases. |

Each round leaves a usable skill. No dependencies, renderer modes, credentials, or services were added. The new command is `npm run eval:discovery`; its scope and limitations are in [the evaluation protocol](../references/eval-protocol.md).

## Observed results

- SKILL.md: 560 → 94 lines. The description value shrank from 1,112 to 176 characters.
- `npm test` and `npm run smoke` passed. The discovery self-test and a simulated missing-CLI interruption check passed.
- Packaging and a separate byte comparison verified all 141 packaged files against root sources. `git diff --check` passed.
- Re-rendered article-formula and editorial-wechat-cover fixtures were visually inspected and byte-identical to their existing gallery PNGs.
- Baseline discovery: 6/6 passed. Changed discovery subsequently completed 6/6 with zero errors or skipped cases after the earlier usage-limit interruption.
- The interruption exposed loss of in-memory probe results. The runner now saves completed cases plus the error and reports errors/skipped cases separately.
- Production validation exposed ambiguous evidence classification, artifact indexing, and source coverage. Ordinary claims and personal experiences are distinguished from explicit quotations; indices restart within each output (also documented at the public schema field); usable current evidence is tied to a visible artifact. Exact-quote checks, source coverage checks, and revision identity checks remain enforced.

- Long-mode guidance now matches its structured renderer: a short faithful title, complete body text, and no unsupported graphical metaphor. Formula reviews use the mode's actual visible fields.
- The too-text-heavy revision fixture now seeds five verbatim paragraphs, a mechanically checked bounded redundancy defect. Earlier unbounded seeds could overflow before visual revision; this fixture change limits comparisons with older runs.

The shorter entry point is measured; improved accuracy, total token cost, or speed is not established. The probes also do not prove end-to-end production behavior or performance among a large competing skill catalog.

## Release verification

On 2026-09-14, the final complete CardBench run passed all 29 cases with all output checkers passing. The committed [report](../evals/cardbench-results.json) has `scope.kind: full`, `complete: true`, and `prompt_profile: skill-routed-v1`; its measured visual score is 9.0/10. This includes 25 planning cases and four forced-revision cases. Earlier interrupted or failed runs were development feedback, not passing release evidence.

L2 Agent Critic is complete. The report leaves maintainer judgment and real-user reuse evidence false, and unmeasured content/agent/overall scores null. Representative PNGs were additionally inspected in the maintenance session, including split diagrams, long text, comic, qualified formula, and the reading-notes title fix. No claim of higher model accuracy or faster execution is made.

Reverting the changed sources and regenerating the mirror rolls back this change without a data migration.
