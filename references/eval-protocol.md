# CardBench and fresh-context evaluation protocol

## Local maintenance

For behavior, schema, renderer, or skill-instruction changes, run `npm run package-skill`, `npm test`, `npm run smoke`, and `git diff --check`. Inspect the generated mirror diff; never edit the mirror independently. The local suite uses disposable fixtures, including real browser captures; run it without a per-command approval round. When VERSION changes, rebuild the version-bound gallery with npm run gallery:update, run npm run gallery:check, then package the generated assets. Do not fix version drift by changing only the manifest version. `npm run check-output` only prints CLI help and is not a test gate.

Review representative actual PNGs when changing visual behavior or instructions. Palette changes require reflective/sharp/warm/technical plus one explicit design; article-diagram changes require all six personal relationship layouts, dense-label boundary fixtures, and rejection checks for retired formula-only and legacy-family contracts. Use `scripts/gallery-jobs.mjs` for gallery verification; mode-specific regression fixtures remain in `scripts/validate.mjs`.

When the maintainer explicitly limits a release to Long verification, use `node scripts/validate-long-notes.mjs`, `eval:fresh -- --case long` with a separate scoped report, and `gallery:update -- --mode long` / `gallery:check -- --mode long`. The scoped gallery rebuilds Long and the composite showcase, retains the other PNGs after checking their recorded hashes, and records the retained version and verification scope. It does not claim that the retained modes were rerendered for the new version. The maintainer's explicit scope takes precedence over the full-release defaults below.

For an explicitly infograph-only release, run `node scripts/validate-infograph-notes.mjs`, the comparison-infograph/data-infograph/timeline-infograph fresh cases with separate scoped reports, and `gallery:update -- --mode infograph` / `gallery:check -- --mode infograph`. Retain other gallery images with their recorded hashes; do not claim other modes were freshly verified.

`npm test` proves L0 only: fixture definitions, Visual Job validation, and output checks work. It does not call a model.

## Discovery versus production planning

`npm run eval:discovery -- --report <report.json>` runs nine serial, read-only catalog/routing probes: cover, verbatim quote, tool cards, requested preview, repository analysis without images, a React UI card, explicit Paper Wilderness selection, conversation-carried series selection, and a source-only series mention. It presents only the skill's name/description before the model decides whether to load SKILL.md; selected workflows follow the skill's own reference routing. `--skill-root <installed-directory>` permits an unchanged baseline install, `--case <id>` selects one probe, and `--list-cases` lists them without model calls. Use the same runner, requests, and host model for baseline and changed packages.

Reports retain declared selection/checkpoint/reference decisions, observed shell commands, usage when returned by Codex, and elapsed time. Selection and checkpoints determine pass/fail; general expected-reference coverage is diagnostic, since a routing-only probe may find enough information in SKILL.md. Cover probes require the Paper Wilderness reference, including ordinary covers and source-only series mentions, because the series is now the sole cover style. This does not authorize treating names in the source as author branding. The probes enforce declared reference decisions; these assertions do not prove a file was actually read. Audit the commands before claiming a file was actually read. This is a single-skill routing probe, not a full catalog competition test or evidence of PNG quality. Self-reported decisions cannot prove every execution behavior; use real production planning/rendering cases below for those claims. Do not compare one noisy timing sample as a performance benchmark.

The production planning runner uses `prompt_profile: skill-routed-v1`: it still specifies the evaluation's JSON output, source boundary, job identity, and publish target, but leaves supporting-document selection and mode-specific guidance to SKILL.md. It no longer preloads the open-source adapter for every v3 case or adds CSS/layout advice outside the installed skill. Older reports without this profile describe the previous coached prompt and are not directly comparable.

Discovery stops on a CLI/runtime error and writes completed results plus the error to the requested report. `summary.errors` and `summary.skipped` distinguish unavailable execution from failed decisions; do not present a partial run as complete. Resume only the affected cases after the external issue is resolved.

Before a minor release, run `npm run eval:fresh -- --report evals/fresh-context-results.json`. The runner copies the generated package mirror into a temporary install root, runs `npm ci` there, verifies Playwright resolves inside that isolated root, and prepares the declared runtime. It then starts one ephemeral, read-only Codex process per case from that install, with no prior conversation or user configuration. On Windows, the runner explicitly selects the elevated Windows sandbox backend while keeping sandbox mode read-only; ignoring user configuration must not disable the backend required for file reads. It validates each produced Visual Job with `evals/check-job-assertions.mjs`, renders it through the installed `scripts/render-job.mjs`, and requires real passing receipts.

`eval:fresh` runs the 26 planning cases at L1 and does not invoke a visual model. Four evidence-first cases cover adaptive CLI, launch, library/API, and stale-evidence routing with Visual Job v3. `npm run eval:cardbench -- --report evals/cardbench-results.json` runs all 30 cases. It attaches actual checked PNGs to independent ephemeral Critic calls, enforces Visual Review hashes and the 8.0 threshold, and exercises four forced-revision cases. A failed first review may revise only the applicable artifact/output `visual_plan` and `render_contract`, then rerender and review once.

## Host orchestration

Delegate model-running CardBench invocations to the host's low-cost independent execution facility, such as a subagent, background task, or isolated session. Choose the lowest-cost configuration that can perform real rendering and image review. The delegated worker must use PowerShell 7, run cases serially, avoid code changes and caches, wait for completion, validate the requested scope/report fields, and return only progress plus the result or first failure. The main context may inspect finished reports and package the mirror. Do not parallelize case or Critic model calls. If no independent facility is available, an already-authorized bounded evaluation may run in the current context; ask about budget only when scope or cost remains unspecified.

`--list-cases` is a local read-only operation: it does not install dependencies, invoke a model, or require delegation/confirmation. Run it directly when selecting evaluation scope.

During development, give the delegated worker one of these commands instead of repeatedly spending the full 30-case gate:

```powershell
# Inspect the ordered case set without installing dependencies or calling a model.
npm run eval:cardbench -- --list-cases

# Rerun only the failed case.
npm run eval:cardbench -- --case revise-flat-hierarchy `
  --report evals/cardbench-revise-flat-hierarchy.json

# Then verify the failed point and every later case.
npm run eval:cardbench -- --from revise-flat-hierarchy `
  --report evals/cardbench-tail.json

# Run this complete gate once before merge or release.
npm run eval:cardbench -- --report evals/cardbench-results.json
```

`--case` and `--from` are mutually exclusive. Revision cases require `--cardbench`. Reports expose `scope.kind`, selected/total counts, completeness, and ordered case IDs. Single and tail runs are development feedback only and cannot overwrite `evals/cardbench-results.json`; only a complete run is release evidence.

Required source terms must survive into renderer-consumed semantic fields, not merely source excerpts, ignored fields, CSS, HTML comments, HTML attributes, or deterministically hidden HTML subtrees (`hidden`, inline `display:none` / `visibility:hidden`, `template`, `noscript`, `head`, `style`, `script`). Split and series cases bind source groups to distinct outputs/cards and may require those groups to remain mutually exclusive rather than repeating the whole source everywhere. This is still a static L1 text-node approximation, not proof of computed CSS visibility or visual meaning. A maintainer must inspect representative PNGs before marking L2 publication judgment true. L3 requires real user publication or reuse evidence; absence of L2/L3 must remain explicit in the report.

CardBench reports Content, Visual, and Agent metrics on a 0–10 scale. Unmeasured metrics such as abstraction and planning quality stay `null`; a category score is `null` while any of its metrics is unmeasured, and Overall remains `null` until all three categories are complete. Agent Critic scores are labeled `L2-agent-critic`; they never set `l2_maintainer_judgment` or L3 evidence.

## Content-first regression acceptance

The five content-* cases cover formatting fidelity, summary conditions, peer grouping, avoiding unsupported formulas, and a valid formula with visible qualifications. Required terms are static presence checks, not proof of preserved meaning. Compare baseline and changed PNGs with the source and editing intent: inspect full prose/voice, conditions and negation, equal peer weight, absence of invented arithmetic, and readable formula qualifications. Preserve the baseline outside the repository; use the same five case definitions for both versions. Run the existing complete CardBench once for final regression evidence. A renderer that receives correct content but hides it is a failed acceptance, not a successful instruction fix.

## Failure diagnostics

Fresh-context and CardBench write failed-run reports with completed results, the failing case and skipped count. They retain the isolated run directory and per-call JSONL/stderr logs on failure. A blocked response or missing Visual Job envelope is a planning failure, not a candidate eligible for visual revision. Never count a retained partial report as a completed release gate. Successful runs remove their temporary install.

Source-group selectors use distinctive factual terms from the evidence, not wrapper headings such as “主张”, “当前能力” or “公开契约”. Dropping such a heading from a faithful excerpt is valid. Renderer-consumed contract terms, distinct source assignment and exclusion of obsolete evidence remain mandatory.
`--artifacts-dir <new-directory>` retains each passing case's jobs, PNGs, receipts and reviews outside the temporary installation for maintainer inspection. Use a new directory per run. These outputs are evidence only and are never reused as model answers or cached evaluation results.

For an explicitly comic-only release, run `node scripts/validate-comic-notes.mjs` and `gallery:update -- --mode comic` / `gallery:check -- --mode comic`. Inspect the three actual scene PNGs and the updated showcase. Retain other gallery PNGs by recorded hash; do not describe them as freshly verified. The maintainer may omit full-suite and model evaluations.
