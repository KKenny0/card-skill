<p align="center"><img src="assets/logo.png" alt="card-skill" width="120"></p>

# card-skill

Content in, PNG out. Mold decides the shape.

A Claude Code skill that renders text into designed images — infographics, posters, comics, sketchnotes, whiteboards, big-text posters, and long-form reading cards — through one quiet paper system with 18 brand inflections and 8 content-tone palettes.

## Usage

**Claude Code**

```bash
npx skills add KKenny0/card-skill -a claude-code -g -y
```

**Generic agents** (Codex, OpenCode, Pi, and other tools that read from `~/.agents/`)

```bash
npx skills add KKenny0/card-skill -a '*' -g -y
```

The skill auto-triggers from natural requests, no slash command needed. Optimized for Chinese and English.

Example prompts:

- English: `make this into an infographic` / `render this as a poster` / `turn this article into a visual card` / `make a whiteboard for this argument`
- 中文: `把这段内容做成信息图` / `做成海报` / `渲染成卡片` / `做个白板推演`

## What it does

Give it an article, a quote, a tweet thread, or a URL. Card analyzes the content's structure, density, and emotional tone, then renders it as a high-resolution PNG (4K width, DPR 2) that looks like printed matter — not a web screenshot.

## Seven modes

| Mode | Template | Best for |
|------|----------|----------|
| `infograph` | Structured data, comparisons, layered ideas | Dense analytical content |
| `big` | Single statement, maximal contrast | Headlines, manifestos, one-liners |
| `long` | Article-length reading | Essays, blog posts, long-form text |
| `poster` | Multi-card series | Chapter-by-chapter, topic-per-card grids |
| `comic` | Narrative with conflict | Stories, debates, before/after arcs |
| `sketchnote` | Warm narrative | Personal reflections, lessons learned |
| `whiteboard` | Logical reasoning | Arguments, system diagrams, decision chains |

## Design systems

card-skill uses one shared quiet-paper backbone: warm paper, restrained ink, small-radius surfaces, hairline dividers, and very little shadow. The 18 brand systems are now inflections inside that backbone, not separate visual worlds. Each brand keeps a recognizable mood while obeying the same layout discipline.

**Dark Minimal** — linear, vercel
**Dark Cinematic** — spotify
**Light Minimal** — apple, expo, notion
**Light Editorial** — claude, cursor, intercom, replicate, posthog, clay
**Technical Data** — stripe, ibm, opencode.ai, sentry, raycast, together.ai
**ljg-card tones** — 沉思, 锐利, 温暖, 技术, 科研, 创意, 商业, 默认

Each system contributes a muted accent, surface temperature, and rhythm hint. Typography, spacing discipline, card treatment, and paper material remain mode-locked, so output feels like one mature system rather than a theme picker.

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `--design` | Skip candidate preview, go straight to a named design system | (enters preview flow) |
| `--dpr` | Device pixel ratio | 2 |
| `--author` | Byline text | Kenny Wu |
| `--photo` | Byline avatar URL or path | assets/avatar.png |

## Pipeline

1. **Ingest** — URL (via WebFetch), pasted text, or file path
2. **Analyze** — Extract title, subtitle, density, structure, emotional tone
3. **Match** — Start from the quiet-paper default, then pick 3-5 restrained brand inflections based on mood × theme × density
4. **Confirm** — Present candidates in terminal; user picks one or asks for a new batch
5. **Render** — Fill the mode's HTML template with mapped design tokens + content
6. **Output check** — Catch missing placeholders, overflow, crop risk, broken images, and unreadable body text
7. **Capture** — Screenshot via Playwright at 4K width
8. **Post-capture check** — Verify the generated PNG and rerun after safe fixes when needed

Output lands in `~/Downloads/`.

## Project structure

```
card-skill/
├── SKILL.md                    # Skill definition and execution flow
├── scripts/
│   └── check-output.mjs        # Lightweight preflight/post-capture checker
├── assets/
│   ├── {mode}_template.html    # HTML templates (7 modes)
│   ├── capture.js              # Playwright screenshot script
│   ├── fonts/                  # Xiangcui typeface family
│   ├── avatar.png              # Default byline avatar
│   └── logo.png                # Colophon logo
├── references/
│   ├── taste.md                # Anti-AI aesthetic rules, paper/print baseline
│   ├── design-index.md         # Quiet-paper brand inflections + CSS variables
│   ├── designs/{name}.md       # Per-brand compact design files
│   └── mode-{name}.md          # Per-mode content theory and layout rules
└── evals/                      # Assertion-based evaluation harness
```

## Dependencies

- [Playwright](https://playwright.dev/) — headless Chromium for PNG capture (`npx playwright install chromium`)
- **Fonts** — place in `assets/fonts/`:
  - [XiangcuiDengcusong](https://github.com/Miiiller/Xiangcui-Dengcusong) (required) — CJK serif typeface used by all 7 modes
  - [XiangcuiDazijiti](https://github.com/Miiiller/Xiangcui-Dazijiti) (optional) — CJK typewriter face used by infograph mode
  - Playwright falls back to system fonts when these are missing.

## Credits

Built on three projects:

- **[awesome-design-md](https://github.com/VoltAgent/awesome-design-md)** by VoltAgent — curated DESIGN.md files from popular brand design systems, used as the visual reference library for color palettes, shadow philosophy, border radius, and whitespace rhythm.
- **[ljg-card](https://github.com/lijigang/ljg-skills/tree/master/skills/ljg-card)** by lijigang — the content-to-PNG visual card skill that inspired the card metaphor, content preprocessing pipeline, and early taste guidelines.
- **[Kami](https://github.com/tw93/kami)** by tw93 — the document design system that informed the quiet-paper constraint language: warm surfaces, ink restraint, and stable page rhythm.

## Gallery

Same text, seven modes — from the philosophical essay *Tools and Forgetting*.

<details>
<summary>Click to expand</summary>

<table>
<tr>
<td width="50%">
<img src="assets/gallery/infograph.png" width="400" alt="infograph — structured data, layered ideas"><br>
<b>infograph</b> · structured data, comparisons, layered ideas
</td>
<td width="50%">
<img src="assets/gallery/big.png" width="400" alt="big — single statement, maximal contrast"><br>
<b>big</b> · single statement, maximal contrast
</td>
</tr>
<tr>
<td>
<img src="assets/gallery/long.png" width="400" alt="long — article-length reading"><br>
<b>long</b> · article-length reading
</td>
<td>
<img src="assets/gallery/poster.png" width="400" alt="poster — multi-card series"><br>
<b>poster</b> · multi-card series
</td>
</tr>
<tr>
<td>
<img src="assets/gallery/sketchnote.png" width="400" alt="sketchnote — warm narrative"><br>
<b>sketchnote</b> · warm narrative
</td>
<td>
<img src="assets/gallery/whiteboard.png" width="400" alt="whiteboard — logical reasoning"><br>
<b>whiteboard</b> · logical reasoning
</td>
</tr>
<tr>
<td>
<img src="assets/gallery/comic.png" width="400" alt="comic — narrative with conflict"><br>
<b>comic</b> · narrative with conflict
</td>
<td></td>
</tr>
</table>

</details>

## License

Private skill. Not distributed.
