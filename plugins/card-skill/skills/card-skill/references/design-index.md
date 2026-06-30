# Design System Index

18 curated brand inflections + 8 ljg-card 内容色调，全部收敛到同一套 Quiet Paper 审美骨架。
筛选标准：暖纸 / 深卡纸、低饱和墨色、极细 hairline、小圆角、禁霓虹、禁纯白、禁纯黑、禁 AI 紫蓝。

品牌系统不再是 18 套互不相干的外观主题。它们共享同一套版面纪律，只在 accent、surface 温度、密度倾向和语义气质上轻微区分。

## How to match
- 沉思 / `reflective` → `claude` / `notion` / `apple` / `ljg_chensi`
- 锐利 / `sharp` → `linear` / `raycast` / `stripe` / `ljg_ruili`
- 温暖 / `warm` → `claude` / `clay` / `intercom` / `posthog` / `ljg_wennuan`
- 技术 / `technical` → `stripe` / `ibm` / `opencode` / `sentry` / `together_ai` / `ljg_jishu`

Use these as real renderer names, not loose group labels. `editorial-warm`, `technical-data`, `quiet-minimal`, and similar descriptive buckets are not valid `design` values.

Compact design files at: `references/designs/{name}.md`（ljg-* 色调无需文件，直接用本表 CSS 变量）

Token interpretation:
- `Canvas` is always paper or dark paper, never pure white or pure black.
- `Accent` is a muted ink mark, not a decorative fill.
- `Surface` is a quiet grouping surface; use sparingly.
- `Ink` is warm black or warm white, never neutral screen black/white.

---

## Dark Minimal
dark paper, single muted accent, technical precision

### linear.app
Surface: dark | Accent: #7b84b8 | Canvas: #151413 | Ink: #e8e2da
Tags: minimal, technical, dark-premium | 适合: 生产力工具, 系统设计, 精密工程

### vercel
Surface: dark | Accent: #d8d2c8 | Canvas: #141413 | Ink: #e8e2da
Tags: minimal, technical, high-contrast | 适合: 前端工程, 开发者工具, 极简主义

---

## Dark Cinematic
dark paper, cinematic atmosphere, subdued accent

### spotify
Surface: dark | Accent: #4f7a5f | Canvas: #171613 | Ink: #e8e2da
Tags: dark, cinematic, music | 适合: 音乐媒体, 内容平台, 暗面编辑

---

## Light Minimal
warm paper, restrained, clean

### apple
Surface: light | Accent: #356b96 | Canvas: #f6f4ee | Ink: #1f1d19
Tags: minimal, photography-first, premium | 适合: 消费电子, 产品展示, 高端品牌

### expo
Surface: light | Accent: #30302e | Canvas: #f7f5ef | Ink: #1f1d19
Tags: minimal, technical, infrastructure | 适合: 开发者平台, 基础设施, 工具

### notion
Surface: light | Accent: #6f6095 | Canvas: #f6f3ec | Ink: #211e19
Tags: minimal, workspace, illustration | 适合: 协作工具, 工作区, 知识管理

---

## Light Editorial
warm canvas, serif, editorial warmth

### claude
Surface: light | Accent: #9b6048 | Canvas: #f5f0e8 | Ink: #2c2418
Tags: editorial, warm, serif | 适合: AI 产品, 编辑内容, 人文思考

### cursor
Surface: light | Accent: #a55332 | Canvas: #f6f3ec | Ink: #26251e
Tags: editorial, warm, developer | 适合: AI 工具, 开发者产品, 编辑风格

### intercom
Surface: light | Accent: #3a332d | Canvas: #f5f1ec | Ink: #201c17
Tags: editorial, warm, cream | 适合: 客服平台, 通讯工具, 温暖品牌

### replicate
Surface: light | Accent: #a04735 | Canvas: #f7f4ed | Ink: #24201b
Tags: editorial, warm, developer | 适合: AI/ML 平台, 开发者工具, 研究展示

### posthog
Surface: light | Accent: #9a6d28 | Canvas: #f2f0e7 | Ink: #23251d
Tags: warm, playful, editorial | 适合: 产品分析, 开发者工具, 活泼品牌

### clay
Surface: light | Accent: #5a4f40 | Canvas: #f8f3e7 | Ink: #211d18
Tags: organic, data-rich, warm | 适合: GTM 平台, 数据工具, 温暖品牌

---

## Technical Data
monospace, data-dense, engineering, still quiet paper

### stripe
Surface: light | Accent: #314d73 | Canvas: #f6f4ee | Ink: #172434
Tags: technical, financial-data, editorial-density | 适合: 支付平台, 金融基础设施, 数据展示

### ibm
Surface: light | Accent: #315f8f | Canvas: #f5f3ed | Ink: #1f1d19
Tags: technical, enterprise, structured | 适合: 企业服务, 基础设施, 工程平台

### opencode.ai
Surface: light | Accent: #34302c | Canvas: #f7f4ee | Ink: #24201c
Tags: monospace, terminal, developer | 适合: 终端工具, 代码产品, 极客风格

### sentry
Surface: dark | Accent: #5d526d | Canvas: #151413 | Ink: #e8e2da
Tags: technical, developer, monitoring | 适合: 监控平台, 开发者工具, 错误追踪

### raycast
Surface: dark | Accent: #a15a52 | Canvas: #161514 | Ink: #e8e2da
Tags: technical, developer, dark | 适合: 生产力工具, 开发者平台, 效率工具

### together.ai
Surface: dark | Accent: #3f638f | Canvas: #151413 | Ink: #e8e2da
Tags: technical, AI, dark | 适合: AI 基础设施, 开源模型, 研究平台

---

## ljg-card 内容色调
来自 ljg-card 信息图模式的 8 种内容色调，按情绪精准匹配中文内容。它们也被收敛到 Quiet Paper：保留情绪名称和内容匹配逻辑，降低色彩强度。不依赖品牌 DESIGN.md，直接由 CSS 变量驱动。字体由 mode 固定决定，不受品牌系统影响（见 `references/taste.md` 第 2 节）。

### ljg-沉思
Surface: light | Accent: #7a5b43 | Canvas: #f5f2ed | Ink: #2d2926
Tags: editorial, serif, warm-neutral | 适合: 哲学, 认知, 本质, 意义, 存在

### ljg-锐利
Surface: light | Accent: #9b4a3e | Canvas: #f0eeea | Ink: #2d2926
Tags: high-contrast, critique, sharp | 适合: 批判, 解构, 争议, 对立, 辩论

### ljg-温暖
Surface: light | Accent: #9d6d4d | Canvas: #f7f4ef | Ink: #2d2926
Tags: warm, organic, human | 适合: 人文, 情感, 生活, 故事, 成长

### ljg-技术
Surface: light | Accent: #4f7b68 | Canvas: #f1f3ef | Ink: #2d2926
Tags: technical, structured, clean | 适合: 架构, 系统, 算法, 代码, 工程

### ljg-科研
Surface: light | Accent: #9a7148 | Canvas: #f3f4ee | Ink: #2d2926
Tags: research, data, academic | 适合: 论文, 实验, 数据, 研究, 发现

### ljg-创意
Surface: light | Accent: #8f5144 | Canvas: #f6f3ef | Ink: #2d2926
Tags: creative, artistic, editorial | 适合: 艺术, 设计, 创作, 美学, 灵感

### ljg-商业
Surface: light | Accent: #4e6b58 | Canvas: #f4f3ee | Ink: #2d2926
Tags: business, financial, structured | 适合: 商业, 金融, 市场, 投资, 战略

### ljg-默认
Surface: light | Accent: #8b5b68 | Canvas: #f3f1ec | Ink: #2d2926
Tags: neutral, fallback, balanced | 适合: 无法归类的通用内容
