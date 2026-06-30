---
name: card-skill
description: "Render text content into a polished, shareable PNG visual. Use this skill whenever the user asks to turn words, notes, articles, quotes, arguments, or stories into an 信息图/infographic, 海报/poster, 卡片/card, 大字报, whiteboard, visual summary, comic, sketchnote, social card grid, 公众号头图, 博客封面, 正文配图, or non-summary editorial image for an essay. Trigger on phrases like 做成图, 渲染成图, 做张卡片, 卡片组, 做成漫画, 视觉笔记, 给文章配图, article cover, blog hero, and editorial image. Supports 8 modes: infographic, big-text poster, long-form reading card, whiteboard reasoning, multi-card poster, comic, sketchnote, and editorial-image. If the user mentions a restrained brand feel such as Apple, Stripe, Linear, Vercel, IBM, Notion, Claude, or similar, apply it as a visual style, not as a full brand redesign. Do not use for websites, UI components, Figma prototypes, logos/VI systems, chart-library plotting, photo editing, or plain file conversion."
user_invocable: true
version: "0.2.10"
---

# card-skill

**Install integrity check.** Before using this skill, confirm this directory contains `scripts/card.js`, `scripts/check-output.mjs`, `assets/`, `schemas/`, and `references/`. If any of them are missing, stop and tell the user this installation is incomplete: bare `npx skills add KKenny0/card-skill ...` installs only `SKILL.md` for this repository shape. Ask them to reinstall the self-contained skill package instead:

Codex plugin:
```bash
codex plugin marketplace add KKenny0/card-skill
codex plugin add card-skill@card-skill
```

Generic agent:
```bash
npx skills add KKenny0/card-skill/plugins/card-skill/skills/card-skill -a codex -g -y
cd ~/.agents/skills/card-skill
npm install
npx playwright install chromium
```

For one-off use without installing, run `npx skills use KKenny0/card-skill/plugins/card-skill/skills/card-skill --skill card-skill`.

**Update check (non-blocking).** Before starting, run `node scripts/check-update.mjs` once; if it prints a line, relay it to the user, then continue. It runs at most once a day, only reads this skill's public `VERSION` file, sends no content, and fails silently. Set `CARD_SKILL_DISABLE_UPDATE_CHECK=1` to skip this check.

将内容铸成可见的形态。内容进去，PNG 出来。模具决定形状。

另有长文作者配图入口：给公众号/博客文章做头图、封面图或正文插图。这个入口不把文章再摘要一遍，而是提炼文章的视觉立场、情绪和隐喻。

## 默认原则

默认直接产出可用 PNG，不要先让用户做选择题。除非用户明确要求“给我几个方向 / 换一批 / 先选风格”，否则自动选择最合适的 mode、design 和画面方向，并在验证通过后交付。

优先从用户的发布任务理解需求，再映射到内部 mode；不要要求用户先学习 mode 名称：

| 用户任务 | 默认入口 |
|----------|----------|
| 公众号头图 / 封面 | `editorial-image` + `wechat-cover` |
| 公众号正文配图 | `editorial-image` + `body-3-2` |
| 小红书 / 社媒卡片 | 单一观点优先 `big`，多观点或系列优先 `poster`，结构化知识优先 `infograph` |
| 推理过程 / 关系梳理 / 白板 | `whiteboard` |

这些只是入口映射，不新增 mode；内容结构明显更适合其他现有 mode 时，自动改走更合适的路线。

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--design` | 指定设计系统（跳过自动匹配） | 空（自动选择） |
| `editorial_tone` | `editorial-image` 自动设计选择：`reflective` / `sharp` / `warm` / `technical` | 空 |
| `--dpr` | 设备像素比 | 2（2× 像素密度） |
| `brand_name` | 可选署名/品牌文字；只在用户明确提供时渲染 | 空 |
| `logo` | 可选署名头像/品牌 logo 路径；只在用户明确提供时渲染 | 空 |
| `source` | 可选来源文字；`long` 与 `editorial-image` 支持 | 空 |

## 执行流程

### Step 0: 渲染路由

card-skill 把 8 个 mode 分两层：

- **Stable tier**（CLI-rendered）：`big`、`long`、`whiteboard`、`poster`、`editorial-image`。走结构化 renderer，schema 校验失败直接报错；输出确定性高，是产品主体。
- **Creative tier**（AI-rendered）：`infograph`、`comic`、`sketchnote`。需要创意布局，无法 schema 化；每次产物有差异，依赖人工审美兜底。

判断当前内容能否走 Stable tier 的 CLI 路径：

判断逻辑：
1. 如果 mode 是 infograph / comic / sketchnote → 直接进入 Creative tier 的 AI 流程（Step 1）
2. 如果 mode 是 editorial-image：
   - 先进入 Step 1.5 生成或确认视觉方向
   - 先把自然语言用途映射成结构化字段：`use` 只表示编辑任务（`cover` / `in-article` / `metaphor`），`aspect` 只表示画布比例（`wechat-cover` / `blog-hero` / `body-3-2` / `body-4-3` / `cinematic` / `square`）
   - 如果已有具体画面结构（`content_html` + `custom_css`）→ CLI 路径，作为高质量最终图的首选
   - 如果只有 `title/use/aspect/visual_metaphor/art_direction` → CLI 可渲染比例安全的 Quiet Paper scaffold，但这只是兜底；正式配图应优先补出自定义构图
   - 如果还没有视觉方向 → 默认自动选择 1 个最强方向并继续渲染；只有用户明确要求候选时，才先产出 2-3 个方向等待选择
3. 如果 mode 是 big / long / whiteboard / poster：
   - 评估内容结构能否 fit 进对应 mode 的 schema（见 `schemas/{mode}.json`）
   - 内容结构清晰（有标题、段落分明、推理链线性）→ CLI 路径
   - 内容过于复杂（嵌套引用、多栏对比、特殊排版需求、不确定能 fit）→ 降级到 AI 路径

**CLI 路径**：
1. 从内容中提取结构化 JSON，符合对应 mode 的 schema
2. 将 JSON 写入操作系统临时目录，不要写进 repo
3. 调用：
```bash
node scripts/card.js --input <system_temp>/card_input_{timestamp}.json --output ~/Downloads/{name}.png
```
4. 无论成功或失败，都删除本次临时 JSON
5. CLI 成功 → 脚本已完成预检、DPR 2 截图和脚本复查；实际查看 PNG 后进入 Step 8 交付
6. CLI 失败 → 报告错误，降级到 AI 全流程（继续 Step 1）

**JSON schema 结构**（每个 mode 的完整定义见 `schemas/` 目录）：

big: `{ mode, phrase, design?, accent_words?, ghost_char?, attribution? }`
long: `{ mode, title, body: [{type, text, ...}], design?, kicker?, subtitle?, theme? }`
whiteboard: `{ mode, title, steps: [{type, ...}], design?, subtitle?, accent_words? }`
poster: `{ mode, title, cards: [{body: [{type, ...}]}], design?, subtitle? }`
editorial-image: `{ mode, title, use?, aspect?, visual_metaphor?, art_direction?, content_html?, custom_css?, design?, editorial_tone? }`

### Step 0.5: 读取基础

按路线读取，不要为了简单 CLI 渲染过度加载参考文件。

**CLI 路径必读**：
1. `schemas/{mode}.json` — 目标 mode 的结构化输入约束
2. `references/design-index.md` — 仅当用户未指定 `--design`、需要自动选择设计系统时读取

**AI / 手工 HTML 路径必读**：
1. `references/taste.md` — 品味底线（反 AI 美学 + 纸质印刷感）
2. `references/design-index.md` — Quiet Paper 下的 18 套品牌气质 + 8 种内容色调索引（26 总计）
3. 对应 mode 文件：
   - `references/mode-infograph.md` — 信息图内容理论（密度/结构/情绪三维分析、90/8/2 色彩规则、布局生成原则）
   - `references/mode-long.md` — 长文内容规则（金句检测、色调感知、段落预处理）
   - `references/mode-big.md` — 大字报排版（字数→字号动态计算、手动断行原则）
   - `references/mode-sketchnote.md` — 叙事结构（反翻译腔六条、问题→失败→顿悟弧线）
   - `references/mode-whiteboard.md` — 白板推理（逻辑链提取、4 种结构路线）
   - `references/mode-poster.md` — 多卡分割（视觉权重计算、贪婪分割算法）
   - `references/mode-comic.md` — 漫画叙事（冲突提取、分镜系统、5 种风格路线）
   - `references/mode-editorial-image.md` — 长文作者配图（视觉立场、概念隐喻、公众号/博客封面、正文插图）

### Step 1: 获取 + 分析内容

**获取**：URL → WebFetch / 粘贴文本 → 直接用 / 文件路径 → Read

**分析**：提取内容的三维特征（详见 `references/mode-infograph.md`）

```
标题：[≤ 15 字]
副标题：[一句话 ≤ 30 字]
来源：[可选]
密度：[稀 ≤50字 / 中 50-200 / 密 200+]
结构：[单点 / 对比 / 层级 / 流程 / 辐射 / 并列]
情绪：[沉思 / 锐利 / 温暖 / 技术]
主题标签：[2-5 个关键词]
```

**内容预处理**（遵循 ljg-card 规范）：
- 金句检测：独立段落 <25 字含核心洞察的，标记为 highlight
- 段落切分：按语义完整性分割，不以固定字数机械切
- 数据清洗：确保数字真实感（`47.2%` 而非 `50%`，`+1 (312) 847-1928` 而非 `1234567`）
- 文案去 AI 腔：禁用"赋能/无缝/释放/下一代/深度赋能"等 AI 典型用词（完整清单见 `references/taste.md` 第 5 节）
- 反翻译腔：禁用"是…的"/"在…的过程中"/"进行+名词"（完整规则见 `references/mode-sketchnote.md` 六条公理）

### Step 1.5: 文章配图入口（editorial-image）

当用户要求 `给文章配图` / `公众号头图` / `博客封面` / `正文配图` / `article cover` / `blog hero` / `editorial image` 时，进入 `editorial-image` 流程。

**核心区别**：文章配图不是摘要卡。不要把文章观点改写成 bullet points；要提炼文章的视觉立场、情绪、核心张力和隐喻。

先读取 `references/mode-editorial-image.md`。默认选择最贴合文章张力的 1 个视觉方向并继续渲染；只有用户明确要求“给几个方向 / 先别出图 / 我来选”，才输出 2-3 个视觉方向并等待选择。

字段映射必须清楚，避免把比例名填进用途字段：

| 自然语言请求 | `use` | 默认 `aspect` |
|--------------|-------|----------------|
| 公众号头图 / 公众号封面 / 文章封面 | `cover` | `wechat-cover` |
| 博客封面 / blog hero | `cover` | `blog-hero` |
| 正文配图 / 段落配图 / section illustration | `in-article` | `body-3-2` |
| 概念隐喻图 / visual metaphor | `metaphor` | `blog-hero` |

结构化字段只负责约束：用途、比例、标题、视觉隐喻、裁切上下文。不要把这些字段当成完整模板。高质量配图应在方向确认后使用 `content_html` + `custom_css` 做开放构图；默认 CLI renderer 只是比例安全的 Quiet Paper scaffold，适合验证和简单封面，不应当作为复杂文章配图的默认终点。

正式配图必须有一个具体主视觉对象或场景，例如桌面、抽屉、纸页、窗口、手势、路径、容器、仪表、地图、阴影关系等。不要只用纸片、线条、抽象框和留白来替代视觉隐喻；如果拿掉标题后画面与文章关系消失，就需要重做 `content_html` + `custom_css`。

`editorial-image` 支持 `design` 和 `editorial_tone` 字段。`design` 是显式设计系统，优先级最高；`editorial_tone` 是自动选择入口，只能是 `reflective` / `sharp` / `warm` / `technical`。设计系统只控制气质层：纸面颜色、墨色、accent、边框和整体温度；不决定视觉隐喻、构图对象或文章立场。用户未指定 `design` 时，必须根据文章情绪给出 `editorial_tone`，让 CLI 落到真实存在的 Quiet Paper design。

需要候选时，方向输出格式：

```
配图方向：
1. 名称 — 视觉隐喻 / 用途 / 为什么适合 / 风险
2. 名称 — 视觉隐喻 / 用途 / 为什么适合 / 风险
3. 名称 — 视觉隐喻 / 用途 / 为什么适合 / 风险
```

可用产物：
- **公众号/博客封面图**：横版，少字，能撑住标题和分享预览
- **正文插图**：安静、低干扰，用作段落之间的视觉换气
- **概念隐喻图**：用一个物、场景或动作承载文章的核心张力

比例规则：
- `公众号头图` / `公众号封面` 默认 `aspect: wechat-cover`（2.35:1，1080x460）
- `博客封面` / `blog hero` 默认 `aspect: blog-hero`（16:9，1080x608）
- `正文配图` / `段落配图` 默认 `aspect: body-3-2`（3:2，1080x720）
- 其他可选：`body-4-3`（4:3）、`cinematic`（21:9）、`square`（1:1）

出图前自检：完整 Acceptance Check 见 `references/mode-editorial-image.md`。其中机器可查项（标题断行、技术词空格、用途标签、brief 泄露）已由 `scripts/check-output.mjs` 自动拦截；下列剩余项需要人工审美判断。

- 如果画面在解释文章讲了什么，而不是让读者感到文章在处理什么问题，失败
- 如果换一篇文章也能用，失败
- 如果文字占比过高、像摘要卡，失败
- 如果是通用 AI 图、库存图、发光科技图，失败
- 如果使用连线、箭头、路径或结构图，线条必须连接元素边界；如果线条穿过卡片、节点、文字内部，失败
- 如果是正文插图，主体视觉必须有足够占比和重量；缩略图看起来主体偏小、画面没画完，失败。中间留白本身不是问题，问题是主体尺度太小或视觉重量撑不住画布
- 正文插图默认不允许可读文字和主要视觉元素交叉、压叠或互相穿插；除非用户明确要 collage/overprint 效果，否则这属于失败
- 扫描每个可见文字（包括 kicker、subtitle、页脚）：有没有任何词在描述"这张图是什么"（封面 / 头图 / 插图 / cover / hero / 配图 / 章节标签），而不是"这张图在说什么"（文章内容、真实术语、视觉对象标签）？有则改写或删掉。`check-output.mjs` 只能拦截已登记的标签，新型措辞、其他语言变体、创意改写都靠这步自检兜底

### Step 2: 匹配设计系统

**Comic mode 跳过此步**：comic mode 使用固定 Quiet Paper 单色调色板，设计系统的色彩 token 不生效。直接进入 Step 4，漫画风格由 `references/mode-comic.md` 的 5 种路线（大友克洋/井上雄彦/三浦建太郎/松本大洋/谷口治郎）决定，在 Step 4 渲染时根据内容气质选择。

**editorial-image 跳过常规候选匹配**：先按 `references/mode-editorial-image.md` 确定视觉方向，再根据气质选择 Quiet Paper token。

默认从 design-index.md 中直接选择 1 个最合适的品牌气质，不等待用户确认。先使用 Quiet Paper 审美骨架，再根据内容选择轻微偏向。

**匹配逻辑**：

1. **情绪→真实 design**：
   - 沉思 / reflective → `claude` / `notion` / `apple` / `ljg_chensi`
   - 锐利 / sharp → `linear` / `raycast` / `stripe` / `ljg_ruili`
   - 温暖 / warm → `claude` / `clay` / `intercom` / `posthog` / `ljg_wennuan`
   - 技术 / technical → `stripe` / `ibm` / `opencode` / `sentry` / `together_ai` / `ljg_jishu`
   - 不要把 `editorial-warm` / `technical-data` / `quiet-minimal` 等分组词写入 `design`；它们不是可渲染 design 名。
2. **主题关联**：内容领域与品牌领域有交集时加分（如 AI 内容→AI 品牌，金融→fintech）
3. **密度适配**：稀→留白风格（apple, notion），密→data-dense 风格（stripe, ibm）
4. **多样性边界**：候选之间应气质不同，但都必须保持 Quiet Paper：暖纸或深卡纸、低饱和 accent、小圆角、少阴影

如果用户明确要求候选、换一批或选择风格，再输出 3-5 个候选列表，每个附一句话匹配理由。

### Step 3: 候选确认（仅按需）

只有用户要求先看候选时，才在终端展示候选列表，每个附一句话匹配理由和色板信息：

```
候选设计系统：
1. linear — 深色卡纸里的精密感，适合技术架构内容 (Canvas: #151413, Accent: #7b84b8)
2. claude — 温暖编辑风，适合人文思考 (Canvas: #f5f0e8, Accent: #9b6048)
3. stripe — 安静数据秩序，适合金融展示 (Canvas: #f6f4ee, Accent: #314d73)
4. notion — 简约纸面留白，适合知识管理 (Canvas: #f6f3ec, Accent: #6f6095)
```

告知用户：选择编号（如"用 2"），或说"换一批"重新推荐。用户确认后进入 Step 4。

普通出图请求不要停在这里；自动选择设计系统后直接进入 Step 4。

### Step 4: 渲染

根据 Step 1 确定的模式，选择对应模板：

| 模式 | 模板文件 |
|------|---------|
| infograph | `assets/infograph_template.html` |
| big | `assets/big_template.html` |
| long | `assets/long_template.html` |
| whiteboard | `assets/whiteboard_template.html` |
| poster | `assets/poster_template.html` |
| comic | `assets/comic_template.html` |
| sketchnote | `assets/sketchnote_template.html` |
| editorial-image | CLI 使用 `scripts/renderers/editorial-image.js` 生成固定比例画布；AI 流程可基于视觉方向扩展定制 HTML |

用户选定后：

1. 读取紧凑设计文件：`references/designs/{name}.md`
   - `ljg-*` 色调无需读取文件，直接使用 design-index.md 中的 CSS 变量
2. Read `references/taste.md`（纸质印刷感底线）
3. Read 对应模板文件
4. 将设计 token 映射为模板 CSS 变量：

| 模板变量 | 设计系统来源 |
|----------|-------------|
| `--bg` | Quiet Paper canvas（暖纸 / 深卡纸，叠加极轻纸感） |
| `--green`（结构色） | hairline / surface-2 色，低对比结构分隔 |
| `--pink`（弹点色） | muted accent，低面积使用 |
| `--ink` | ink 主文字色（降饱和度 10-20% 模拟印刷） |
| `--ink-light` | ink-muted 色 |

字体不在此表——由 mode 固定决定，见 `references/taste.md` 第 2 节。

**字号和排版遵循 Quiet Paper 全局纪律，不遵循单个品牌系统。** 品牌系统只提供低饱和 accent、surface 温度和轻微节奏偏向。字号规则保留移动端优先标准：正文 ≥36px，标注 ≥24px。元素比例按模式分级：big≥10:1, infograph≥6:1, comic≥8:1, sketchnote≥5:1, long/poster/whiteboard≥4:1（详见 `references/taste.md`）。

**Quiet Paper 纸质印刷感**：所有输出应遵循 `references/taste.md` 第 0 节和第 6 节的纸质美学要求——暖色纸张或深色卡纸、墨感文字、降饱和度强调色、极细 hairline 边框、少卡片、少阴影，像完成的纸面而非网页截图。

5. 根据内容分析设计画面（密度/结构/锚点），原则同 ljg-card 信息图模式
6. 替换模板中的占位符（每个模板的占位符见模板文件顶部注释）
7. 写入操作系统临时目录中的 `card_{name}.html`

**Creative tier / 手工 HTML 交付约定**：
- infograph / comic / sketchnote（Creative tier），以及 Stable tier CLI 失败后降级的手工 HTML，统一把 HTML 写到操作系统临时目录（macOS/Linux 使用系统 temp；Windows 使用 `%TEMP%`），不要在 repo 内创建 `tmp/`
- PNG 输出到 `~/Downloads/`，文件名用内容主题或 mode 命名，避免只叫 `output.png`
- 生成 HTML 后必须走 Step 5-7；不能只保存 HTML 或只报告“已完成”
- 最终交付前必须实际查看 PNG，确认不是空白、裁切、文字重叠、主体太小或视觉关系不清
- 交付完成后删除本次生成的临时 HTML/JSON；不要删除其他进程或用户已有的临时文件

**poster 模式特殊**：每个卡片独立写入，文件名带序号 `card_{name}_{N}.html`。

**多卡批次一致性**：当内容需要拆分为多张图（信息图系列、poster 多卡、用户要求「多图」）时，必须遵守以下批次规则：

1. **Token 锁定**：在渲染第一张卡之前，先输出一套共享 CSS 变量表，所有卡片共用。变量表包含：
   - 色彩：`--bg`, `--green`, `--pink`, `--ink`, `--ink-light`（来自 Step 4 的设计 token 映射）
   - 字号梯度：标题字号 / 段落标题字号 / 正文字号 / 标注字号（来自 `taste.md` 第 2 节的 mode 规则）
   - 间距节奏：内容边距、区块间距、colophon 高度
   - 字体栈：由 mode 决定，全批次统一

2. **Token 锁定输出格式**（写在所有卡片的 HTML 之前）：
   ```
   批次 Token：
   --bg: #f5f0e8; --green: #e9e1d4; --pink: #9b6048; --ink: #2c2418; --ink-light: #6b6050
   标题: 140px serif | 段落标题: 48px zh-serif | 正文: 36px zh-serif | 标注: 24px mono
   边距: 60px | 区块间距: 40px | 圆角: 6px
   ```

3. **每张卡的 `{{CUSTOM_CSS}}` 开头必须先复制 Token 锁定表中的 CSS 变量声明**（`:root { ... }`），然后才写该卡独有的布局 CSS。这确保即使单独打开某张卡的 HTML，视觉效果也完整。

4. **禁止跨卡漂移**：不同卡之间，相同语义层级的元素必须使用相同字号。例如，如果卡 1 的正文是 36px，卡 2 的正文也必须是 36px。只有布局结构（grid、flex、positioning）允许因内容不同而变化。

**署名/来源字段**：`brand_name`、`logo`、`source` 都是可选字段，不是命令行 flag。只有用户明确提供时才把署名、头像/logo 或来源写进 footer；未提供时全部留空并隐藏对应元素。不要使用 `author` / `photo` 这类别名，也不要把维护者身份或仓库素材作为用户产物的默认值。尤其要在 Step 5 前清空未使用的 `{{LOGO}}` / `{{AVATAR}}` / `{{PHOTO}}` 占位符。

### Step 5: 出厂检查

本步骤只适用于 AI / 手工 HTML 路径。CLI 路径由 `scripts/card.js` 内部自动执行预检、`capture4k.js` 截图和脚本复查，但仍需人工看图。

生成 HTML 后先运行低风险修复 + 预检：

```bash
node scripts/check-output.mjs --html <html_path> --width 1080 --height 800 --dpr 2 --fullpage --fix --skip-png
```

固定画布模式（big / poster）不要加 `--fullpage`，并使用该模式的截图高度（通常 1440）。

预检会自动修复：
- `{{LOGO}}` / `{{FONT_BASE}}` 等基础路径占位符；`{{AVATAR}}` / `{{PHOTO}}` 只允许在用户明确提供头像时保留，未提供时必须在预检前清空
- 横向溢出保护
- 图片基础缩放保护

预检失败必须先修 HTML/CSS，不能继续截图。

预检通过后，保留人工审美自检：

- [ ] 视觉形式从内容生长出来？换内容这布局还说得出吗？
- [ ] 品牌气质可感知，但没有破坏 Quiet Paper 的统一骨架？
- [ ] 元素比例达到模式最低标准？（big≥10:1, infograph≥6:1, comic≥8:1, sketchnote≥5:1, 其他≥4:1）
- [ ] 弹点色符合品牌类型规则？（标准色 ≤2 处，弱 accent ≤3 处视觉突出点）
- [ ] 正文 ≥36px，标注 ≥24px？
- [ ] 多卡模式：每张卡只覆盖一个章节/话题？不同主题的内容没有被混在同一张卡上？
- [ ] **批次一致性（多卡时）**：所有卡片的色彩变量、字号梯度、间距节奏是否严格匹配 Token 锁定表？相同语义层级（正文、标题、标注）的字号是否完全一致？
- [ ] 卡片、阴影、色块是否足够少？告诉别人"AI 做的"会被一眼看穿？

### Step 6: 截图（4K）

模板 CSS 宽度为 1080px。capture4k.js 的 width 参数是 viewport 宽度（不是输出宽度）。DPR 参数控制输出分辨率。

```bash
node assets/capture4k.js <html_path> <png_path> 1080 800 2 fullpage
```

参数说明：`1080` = viewport 宽度（匹配模板），`800` = 初始高度（fullpage 模式下自动扩展），`2` = DPR（输出 2160px 宽），`fullpage` = 截取完整内容高度。

**多卡批次**：同一批次的所有卡片必须使用完全相同的 capture 命令参数，确保输出宽度和 DPR 一致。

### Step 7: 截图后复查

截图后必须运行：

```bash
node scripts/check-output.mjs --html <html_path> --png <png_path> --width 1080 --height 800 --dpr 2 --fullpage --fix
```

如果脚本应用了安全修复，重新截图，再用不带 `--fix` 的命令复查一次。

复查会拦截：
- PNG 未生成、为空、宽高不符合截图参数
- HTML 仍有未替换占位符
- 页面横向溢出
- 固定画布内容被裁切
- 可见元素跑出截图范围
- 图片加载失败
- 正文字号低于 36px

复查通过后，实际打开或查看 PNG，确认画面完整、清晰、主体有足够重量，文字没有重叠、裁切、孤字或明显坏行。只有脚本复查和看图复查都通过才能交付。

### Step 8: 交付

报告文件路径。

## Refinement

- "换个设计系统" → 回到 Step 3
- "调整配色" → 微调 CSS 变量，保持同一设计系统
- "改布局" → 重新设计，同一设计系统

## 快捷模式（--design 指定）

用户通过 `--design` 指定设计系统时，跳过自动匹配和按需候选，直接进入 Step 4。

可用名称见 `references/design-index.md` 的目录名列。

`editorial-image` 的自动路径使用 `editorial_tone`，不要把抽象分组名写进 `design`。如果用户没有指定 `--design`，根据文章情绪填入 `editorial_tone`，由 CLI 稳定选择真实 design。

## 维护测试

改动技能或模板后，至少运行：

```bash
npm run check-output
npm test
```

CLI 路径 smoke test 可用最小 big-mode 输入跑一次：

```powershell
$output = Join-Path $env:TEMP 'smoke_big.png'
[pscustomobject]@{ mode='big'; phrase='Clarity beats noise'; design='apple' } | ConvertTo-Json -Compress | node scripts/card.js --stdin --output $output
```

生成后实际查看 PNG，确认画面不是只满足文件存在；检查完成后删除该 smoke PNG。

涉及 `editorial-image` 设计选择时，还必须实际渲染并检查一组 PNG：`reflective`、`sharp`、`warm`、`technical`、显式 `design` 各 1 张。确认视觉气质确实不同、仍保持 Quiet Paper、无明显裁切/溢出/坏换行/主体过小。

## 开发者工具（非 AI 流程使用）

| 脚本 | 用途 |
|------|------|
| `scripts/gallery_render.js` | 渲染所有 design×mode 组合，生成静态展示页 |
| `scripts/batch_render_covers.js` | 批量生成亮色封面截图 |
| `scripts/batch_render_covers_dark.js` | 批量生成暗色封面截图 |
