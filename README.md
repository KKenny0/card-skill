<p align="center"><img src="assets/logo.png" alt="card-skill" width="120"></p>

# card-skill

Content in, PNG out. Mold decides the shape.

A Claude Code skill that renders text into designed images — infographics, posters, comics, sketchnotes, whiteboards, big-text posters, and long-form reading cards — through 30+ brand design systems and 8 content-tone palettes.

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

18 brand design systems curated from real DESIGN.md files, plus 8 ljg-card content-tone palettes tuned for Chinese text:

**Dark Minimal** — linear, vercel
**Dark Cinematic** — spotify
**Light Minimal** — apple, expo, notion
**Light Editorial** — claude, cursor, intercom, replicate, posthog, clay
**Technical Data** — stripe, ibm, opencode.ai, sentry, raycast, together.ai
**ljg-card tones** — 沉思, 锐利, 温暖, 技术, 科研, 创意, 商业, 默认

Each system contributes color palette, shadow philosophy, border-radius style, and whitespace rhythm. Typography is mode-locked — brand systems don't override fonts.

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
3. **Match** — Pick 3-5 candidate design systems based on mood × theme × density
4. **Confirm** — Present candidates in terminal; user picks one or asks for a new batch
5. **Render** — Fill the mode's HTML template with mapped design tokens + content
6. **Self-check** — Verify element ratios, font sizes, accent limits, no AI tells
7. **Capture** — Screenshot via Playwright at 4K width

Output lands in `~/Downloads/`.

## Project structure

```
card-skill/
├── SKILL.md                    # Skill definition and execution flow
├── assets/
│   ├── {mode}_template.html    # HTML templates (7 modes)
│   ├── capture.js              # Playwright screenshot script
│   ├── fonts/                  # Xiangcui typeface family
│   ├── avatar.png              # Default byline avatar
│   └── logo.png                # Colophon logo
├── references/
│   ├── taste.md                # Anti-AI aesthetic rules, paper/print baseline
│   ├── design-index.md         # All design systems + CSS variables
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

Built on two projects:

- **[awesome-design-md](https://github.com/VoltAgent/awesome-design-md)** by VoltAgent — curated DESIGN.md files from popular brand design systems, used as the visual reference library for color palettes, shadow philosophy, border radius, and whitespace rhythm.
- **[ljg-card](https://github.com/lijigang/ljg-skills/tree/master/skills/ljg-card)** by lijigang — the content-to-PNG visual card skill that inspired the card metaphor, typography rules, content preprocessing pipeline, and taste guidelines.

## License

Private skill. Not distributed.
