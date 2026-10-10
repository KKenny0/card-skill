<p align="center"><img src="assets/logo.png" alt="card-skill logo" width="112"></p>

<h1 align="center">card-skill</h1>

<p align="center"><strong>Turn articles, ideas, and arguments into publish-ready visual cards.</strong></p>

<p align="center">
  <a href="README.zh-CN.md">中文文档</a> ·
  <a href="#what-it-is">What it is</a> ·
  <a href="#how-to-install">Install</a> ·
  <a href="#quick-examples">Examples</a> ·
  <a href="#supported-formats">Formats</a> ·
  <a href="#faq">FAQ</a> ·
  <a href="#full-gallery">Gallery</a>
</p>

## What it is

**card-skill** turns articles, notes, arguments, and technical decisions into publish-ready visual cards for coding agents (Claude Code, Codex, OpenCode, Pi, etc.).

Unlike generic AI image generators that produce unpredictable illustrations, card-skill focuses on **information hierarchy, readable typography, and structured reasoning**. Everything renders locally via headless browser and undergoes automatic layout checks before export in a signature tactile paper aesthetic (**Kenny Style**).

### Core uses
- **Editorial covers:** Article headers, blog covers, and mood visuals with metaphors.
- **In-article diagrams & whiteboards:** Compress complex arguments, causal chains, and system trade-offs into structured visual cards.
- **Social card series:** Break down opinions into multi-card carousels or high-density reading cards.

*(It is not a UI builder, chart plotter, website generator, or photo editor.)*

## Good fit / poor fit

| Good fit | Poor fit |
|---|---|
| WeChat covers, blog headers, article atmosphere images | Websites, landing pages, app/component UI |
| Xiaohongshu / social opinion cards and carousels | Figma prototypes, logo / brand identity systems |
| Argument whiteboards, system relations, technical decisions | Chart-library plotting (ECharts and similar) |
| In-article diagrams: formula cards, relations, flows, boundaries | Generic photo editing or file conversion |
| WeChat Reading highlights and monthly reports (when requested) | Silently scanning an entire reading account |
| Consistent batch PNGs with automated crop/overflow quality checks | One-off chat illustrations with no quality gate |

## See it in 30 seconds

One consistent visual grammar adapts to different publishing tasks: an article cover sets the mood, an in-article card explains a relation, and a whiteboard maps a trade-off.

<img src="assets/readme-showcase.png" width="100%" alt="Showcase of social poster, editorial cover, and reasoning whiteboard">

<sub>One visual grammar, three publishing jobs: a claim becomes a social poster, core tension becomes an editorial cover, and a reasoning chain becomes a whiteboard.</sub>

## Supported formats

You don't need to memorize mode names—describe what you want to publish in natural language, and the agent picks the best mode.

| Publishing goal | Mode | Tier | What it produces | Reference |
|---|---|---|---|---|
| WeChat or blog cover | `editorial-image` | Stable | Mood, tension, and metaphor (not a text summary) | [Docs](references/mode-editorial-image.md) |
| In-article explanation | `article-diagram` | Stable | Formula cards, relation maps, process flows, boundaries | [Docs](references/mode-article-diagram.md) |
| Social card series | `poster` | Stable | Multi-card breakdown for social media (Xiaohongshu, X) | [Docs](references/mode-poster.md) |
| Technical decisions & systems | `whiteboard` | Stable | Problems, constraints, decision paths, and trade-offs | [Docs](references/mode-whiteboard.md) |
| Long reading cards | `long` | Stable | Immersive long-form reading with rich typography | [Docs](references/mode-long.md) |
| Single-line claims & quotes | `big` | Stable | High-impact statements and headline cards | [Docs](references/mode-big.md) |
| Dense data & comparison | `infograph` | Studio | High-density information and structural comparisons | [Docs](references/mode-infograph.md) |
| Narrative & conflict | `comic` | Studio | Step-by-step conflict, turn, or before/after stories | [Docs](references/mode-comic.md) |
| Personal reflections | `sketchnote` | Studio | Warm, notebook-style visual notes | [Docs](references/mode-sketchnote.md) |

> **Stable vs. Studio:**
> - **Stable modes** use deterministic built-in templates—fast, consistent, and ideal for batch generation.
> - **Studio modes** support bespoke HTML/CSS layouts for complex narratives and custom visual metaphors.

## How to install

Install the **complete package** (includes render scripts, templates, fonts, and checkers). Do not install only the repository-root `SKILL.md`, as it lacks the runtime.

### Claude Code / Codex (recommended)

```bash
# Claude Code
claude plugin marketplace add KKenny0/card-skill
claude plugin install card-skill@card-skill

# Codex
codex plugin marketplace add KKenny0/card-skill
codex plugin add card-skill@card-skill
```

On first render, the agent runs `node scripts/setup-runtime.mjs` once inside the skill directory to install locked npm dependencies and Playwright Chromium. Subsequent runs reuse this runtime.

### Other agents or one-off use

Install the skill package (replace `-a codex` with your agent ID):

```bash
npx skills add KKenny0/card-skill/plugins/card-skill/skills/card-skill -a codex -g -y
cd ~/.agents/skills/card-skill
npm install
npx playwright install chromium
```

Run once without permanent install:

```bash
npx skills use KKenny0/card-skill/plugins/card-skill/skills/card-skill --skill card-skill
```

**Requirements:** Node.js 22+, npm, and Playwright Chromium. Fonts are bundled; rendering runs offline.

<details>
<summary>Optional: preview directions in Codex desktop</summary>

In Codex desktop sessions supporting interactive cards, you can request direction options before rendering:

```text
Give me 3 WeChat cover directions first. Show each direction's visual metaphor, aspect ratio, why it fits, and risks on cards. Render the PNG only after I pick one.
```

</details>

## Quick examples

No slash commands required. Prompts work in plain English or Chinese:

**WeChat / editorial cover**
```text
Turn the article below into a WeChat cover image. Do not restate it as a summary. Extract the core tension, render it with a quiet paper feel, and check crop, line breaks, and readability before delivery:

[paste article or URL]
```

**In-article diagram / formula card**
```text
Turn the compressible sections of this article into in-article explanation diagrams. Keep only the core relational formula and one judgment per card. Skip pure setup and mood sections.
```

**Social card series**
```text
Split the argument below into a social card series. Card 1 is the main judgment; each later card covers one supporting point. Keep the tone restrained—no marketing voice.
```

**Technical whiteboard**
```text
Draw this technical decision as a whiteboard card: state the problem, constraints, option paths, and final trade-off so someone who missed the discussion can follow it.
```

**WeChat Reading highlights / monthly report**
```text
Turn my personal highlights and thoughts from *A Thousand Brains* into a card set. Keep source quotes unedited. Place my thoughts under the matching highlight; label the source.

Turn this month's WeChat Reading stats into a monthly reading report. Use only real duration, day counts, finished books, and preferences. Omit missing modules. Do not invent insights.
```

## Key features

- **Tactile aesthetic (Kenny Style):** Warm paper texture ("Quiet Paper"), disciplined typography, balanced spacing, and subtle geometry.
- **Automated quality checks:** Built-in verification catches text overflow, awkward line breaks, broken images, and poor contrast before exporting.
- **100% local & private:** Rendering and checks run entirely on your machine via Playwright Chromium. Your text and images are never uploaded.
- **Retina-ready export:** Outputs crisp @2x PNGs (e.g., ~2160px wide for standard canvases) ready for publishing.
- **Mood tones without layout drift:** Switch color mood (`reflective`, `sharp`, `warm`, `technical`) without breaking typography or spacing.
- **Content-adaptive layout:** Adapts card counts (1–4 cards) based on actual content density rather than forcing arbitrary filler.
- **Zero watermarks:** Names, logos, and sources appear only when explicitly provided; otherwise layouts stay clean and unbranded.

## Adaptive open-source showcase

card-skill automatically adapts card counts and structure to the material. For example, a product launch generates a 4-card evidence sequence, while a CLI tool generates a 3-step task flow:

<table>
<tr>
<td width="25%"><img src="assets/open-source-tool/tool-launch-1.png" width="100%" alt="Relay Atlas launch judgment card"></td>
<td width="25%"><img src="assets/open-source-tool/tool-launch-2.png" width="100%" alt="Relay Atlas evidence card"></td>
<td width="25%"><img src="assets/open-source-tool/tool-launch-3.png" width="100%" alt="Relay Atlas capability process card"></td>
<td width="25%"><img src="assets/open-source-tool/tool-launch-4.png" width="100%" alt="Relay Atlas case card"></td>
</tr>
</table>
<table>
<tr>
<td width="33%"><img src="assets/open-source-tool/tool-cli-1.png" width="100%" alt="Threadpack CLI input card"></td>
<td width="33%"><img src="assets/open-source-tool/tool-cli-2.png" width="100%" alt="Threadpack exact command card"></td>
<td width="33%"><img src="assets/open-source-tool/tool-cli-3.png" width="100%" alt="Threadpack inspectable output card"></td>
</tr>
</table>

<sub>All project data above is fictional and repository-owned. See the <a href="https://github.com/KKenny0/card-skill/tree/main/showcases/open-source-tool">reproducible showcase</a>.</sub>

## How it works

Unlike tools that rely on a single generative prompt, card-skill runs a deterministic pipeline from text to PNG:

1. **Parse content:** Analyzes raw text, notes, URLs, or data to extract core claims and relationships.
2. **Pick layout:** Selects the best visual mode (e.g., whiteboard for decisions, editorial cover for articles).
3. **Render locally:** Generates semantic markup and renders high-res PNGs via Playwright Chromium.
4. **Quality gate:** Inspects the output for overflow, bad wrapping, and readability issues.
5. **Deliver:** Saves the verified PNG directly to your `~/Downloads/` folder.

<details>
<summary>Advanced: CLI commands, updates, and optimization</summary>

### Standalone CLI

You can run the structured CLI directly:

```bash
node scripts/card.js --input /path/to/input.json --output ~/Downloads/card.png
```

### File size optimization

Default PNG exports are lossless. For smaller files, compress with `pngquant`:

```bash
pngquant --quality=80-95 --force --output card.png card.png
```

### Updates and privacy

The CLI checks GitHub for releases at most once daily. Updates are never performed mid-render. To disable update checks:

```bash
export CARD_SKILL_DISABLE_UPDATE_CHECK=1
```

To allow checks but disable auto-updates:

```bash
export CARD_SKILL_DISABLE_AUTO_UPDATE=1
```

</details>

## FAQ

### What is card-skill?
It is a local content-to-image skill for coding agents. It turns articles, notes, and technical decisions into quality-checked PNG cards.

### Do I need design skills or HTML knowledge?
No. Describe what you want in plain text; the agent selects the mode, formats the data, and renders the image.

### Which agents are supported?
Claude Code, Codex, OpenCode, Pi, and any environment supporting agent skills. Claude Code and Codex should use the plugin marketplace.

### Does it watermark or add author names?
No. Author name, avatar, and sources are only rendered if explicitly provided in your input.

### How is this different from asking an AI to draw an image?
card-skill uses deterministic HTML/CSS templates, typography rules, Playwright capture, and strict visual checks. The result is a crisp, reproducible, publish-ready card rather than a random AI image.

### Will it upload my articles or data?
No. All rendering and visual checks run locally on your machine. Version checks only query GitHub Releases.

## Full gallery

<details>
<summary>Expand gallery (12 samples)</summary>

<p><sub>Samples explore concepts from *A Thousand Brains* (Jeff Hawkins).</sub></p>

<table>
<tr>
<td width="50%"><img src="assets/gallery/editorial-wechat-cover.png" width="100%" alt="WeChat cover"><br><strong>editorial-image</strong> · Many models, one judgment</td>
<td width="50%"><img src="assets/gallery/article-formula.png" width="100%" alt="Formula card"><br><strong>article-diagram</strong> · Sensation, movement, reference frames</td>
</tr>
<tr>
<td><img src="assets/gallery/big.png" width="100%" alt="One-line card"><br><strong>big</strong> · Explore the world</td>
<td><img src="assets/gallery/poster.png" width="100%" alt="Social cards"><br><strong>poster</strong> · Three threads</td>
</tr>
<tr>
<td><img src="assets/gallery/long.png" width="100%" alt="Long card"><br><strong>long</strong> · Intelligence as modeling</td>
<td><img src="assets/gallery/whiteboard.png" width="100%" alt="Whiteboard"><br><strong>whiteboard</strong> · Knowing a cup</td>
</tr>
<tr>
<td><img src="assets/gallery/article-boundary-legacy.png" width="100%" alt="Boundary model"><br><strong>article-diagram</strong> · Reference frame model</td>
<td><img src="assets/gallery/reading-notes.png" width="100%" alt="Reading notes"><br><strong>poster</strong> · Reading notes</td>
</tr>
<tr>
<td><img src="assets/gallery/infograph.png" width="100%" alt="Infograph"><br><strong>infograph</strong> · Local models to shared judgment</td>
<td><img src="assets/gallery/comic.png" width="100%" alt="Comic"><br><strong>comic</strong> · After touching one edge</td>
</tr>
<tr>
<td><img src="assets/gallery/sketchnote.png" width="100%" alt="Sketchnote"><br><strong>sketchnote</strong> · Sensation, location, prediction</td>
<td><img src="assets/gallery/reading-report.png" width="100%" alt="Reading guide"><br><strong>poster</strong> · Reading guide</td>
</tr>
</table>

</details>

## WeChat Reading integration

card-skill pairs with Tencent's official [WeChatReading Skill](https://github.com/Tencent/WeChatReading) to turn personal highlights from a specific book into a card set, or reading statistics into reports.

It never scans arbitrary books or accounts without instruction. The Tencent skill handles auth; card-skill only formats and renders the data locally.

```bash
npx skills add Tencent/WeChatReading -g
```

## Author & community

**card-skill** is created and maintained by [Kenny Wu (@KKenny0)](https://github.com/KKenny0).

If card-skill helped you publish something, share your results or feedback in [GitHub Issues](https://github.com/KKenny0/card-skill/issues). You can also support maintenance via [Support](https://kkenny0.github.io/support/).

## Credits

card-skill is inspired by:
- [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) by VoltAgent — brand design reference library
- [ljg-card](https://github.com/lijigang/ljg-skills/tree/master/skills/ljg-card) by lijigang — content-to-image practice and taste rules
- [Kami](https://github.com/tw93/kami) by tw93 — Quiet Paper constraints on paper, ink, and rhythm
- [The New Yorker cover practice](https://www.newyorker.com/culture/video-dept/the-art-of-the-new-yorker-cover) & [GOV.UK image guidance](https://guidance.publishing.service.gov.uk/formatting-content/images/) — editorial purpose and restraint

## License

[MIT](LICENSE) © 2026 Kenny Wu
