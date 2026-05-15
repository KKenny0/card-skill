---
name: wjy-mockup
description: "Convert text content into a designed PNG image. Renders articles, quotes, notes, or any text as an infographic, poster, visual card, mockup, or styled graphic — using 30+ brand design systems (Apple, Stripe, Linear, Vercel, IBM, Notion, etc.) and 7 visual modes: infographic, big-text poster, long-form reading, whiteboard reasoning, multi-card grid, comic, sketchnote. Use this skill whenever the user wants to turn text into a shareable visual: making an 信息图/infographic/海报/卡片/设计稿 from content, applying a specific brand visual style to text (e.g. '用 Stripe 风格', 'Apple aesthetic'), creating social media graphics or Instagram card grids from articles, rendering a visual summary, making a comic or sketchnote from a story. Triggers on: 做成图, 渲染成图, 做成海报, 做张卡片, 卡片组, 信息图, 设计稿, 做成漫画, 视觉笔记, 大字报, whiteboard, visual summary, brand style, mockup. Do NOT use for: writing HTML/CSS/React code, building websites or UI components, creating Figma prototypes, designing logos or VI identity systems, plotting data with charting libraries (matplotlib/echarts), photo editing, or file format conversion."
user_invocable: true
version: "0.1.0"
---

# wjy-mockup

将内容铸成可见的形态。内容进去，PNG 出来。模具决定形状。

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--design` | 指定设计系统（跳过候选预览） | 空（进入预览流程） |
| `--dpr` | 设备像素比 | 2（4K 质量） |
| `--author` | 署名文字 | Kenny Wu |
| `--photo` | 署名头像 URL/路径 | assets/avatar.png |

## 执行流程

### Step 0: 读取基础

以下文件必须在开始前读取：

**必读**：
1. `references/taste.md` — 品味底线（反 AI 美学 + 纸质印刷感）
2. `references/design-index.md` — 30+ 套设计系统索引

**按内容类型选读**（Step 1 分析后确定需要哪些）：
3. `references/mode-infograph.md` — 信息图内容理论（密度/结构/情绪三维分析、90/8/2 色彩规则、布局生成原则）
4. `references/mode-long.md` — 长文内容规则（金句检测、色调感知、段落预处理）
5. `references/mode-big.md` — 大字报排版（字数→字号动态计算、手动断行原则）
6. `references/mode-sketchnote.md` — 叙事结构（反翻译腔六条、问题→失败→顿悟弧线）
7. `references/mode-whiteboard.md` — 白板推理（逻辑链提取、4 种结构路线）
8. `references/mode-poster.md` — 多卡分割（视觉权重计算、贪婪分割算法）
9. `references/mode-comic.md` — 漫画叙事（冲突提取、分镜系统、5 种风格路线）

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

### Step 2: 匹配候选

从 design-index.md 中选择 3-5 个候选设计系统。

**匹配逻辑**：

1. **情绪→视觉风格**：
   - 沉思 → minimal-clean / editorial-warm / dark-premium
   - 锐利 → dark-minimal / high-contrast / vibrant
   - 温暖 → editorial-warm / organic-warm / playful
   - 技术 → technical-data / monospace / dark-minimal
2. **主题关联**：内容领域与品牌领域有交集时加分（如 AI 内容→AI 品牌，金融→fintech）
3. **密度适配**：稀→留白风格（apple, notion, ollama），密→data-dense 风格（stripe, clickhouse, ibm）
4. **视觉多样性**：候选之间应视觉风格明显不同。如果 3 个都是 dark-minimal，换一个 editorial-warm

输出候选列表，每个附一句话匹配理由。

### Step 3: 候选预览（HTML Picker）

为 3-5 个候选生成交互式 HTML 选择页面。

1. 清除旧的选择文件：`rm -f /tmp/wjy_mockup_selection.json`
2. 启动 picker 服务器（后台）：`node scripts/picker_server.js &`
3. 从 design-index.md 提取每个候选的关键 token
4. Read `assets/candidate_picker.html` 模板
5. 注入候选 token 生成 picker：
   - 色板条（canvas / accent / ink 色块 + hex 值）
   - 字体样例（标题/正文/标注三个层级）
   - 用内容的实际标题+副标题渲染一段排版预览
   - 点击选择 → 确认按钮 → 自动 POST 到本地服务器
6. 保存到 `/tmp/wjy_mockup_picker_{name}.html`
7. 通过服务器打开：`open "http://localhost:8421/?html=/tmp/wjy_mockup_picker_{name}.html"`

告知用户：已打开候选预览，在浏览器中点击卡片 → 点确认按钮，我会自动检测并继续渲染。

### Step 4: 自动等待选择

打开 picker 后，运行以下命令等待用户确认：

```bash
echo "⏳ 等待你在浏览器中选择设计系统..." && while [ ! -f /tmp/wjy_mockup_selection.json ]; do sleep 1; done && sleep 0.5 && echo "✅ 检测到选择！" && cat /tmp/wjy_mockup_selection.json
```

读取到选择后，提取 `design` 字段作为选定结果，自动进入 Step 5。

如果用户等不及，也可以直接告诉 Claude 选择结果，或要求换一批候选。完成后关闭服务器：`kill %1 2>/dev/null`

### Step 5: 渲染

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

用户选定后：

1. 读取紧凑设计文件：`references/designs/{name}.md`
   - `ljg-*` 色调无需读取文件，直接使用 design-index.md 中的 CSS 变量
2. Read `references/taste.md`（纸质印刷感底线）
3. Read 对应模板文件
4. 将设计 token 映射为模板 CSS 变量：

| 模板变量 | 设计系统来源 |
|----------|-------------|
| `--bg` | canvas 色（叠加纸质噪点纹理） |
| `--green`（结构色） | hairline / surface-2 色 |
| `--pink`（弹点色） | accent / primary 色 |
| `--ink` | ink 主文字色（降饱和度 10-20% 模拟印刷） |
| `--ink-light` | ink-muted 色 |
| 字体 | 设计文件推荐的 web 可用字体 |

**字号和排版遵循 ljg-card，不遵循品牌设计系统。** 品牌设计系统只提供色彩和视觉氛围参考（色板、阴影哲学、圆角风格、留白节奏）。字号规则严格执行 ljg-card 的移动端优先标准：正文 ≥36px，标注 ≥24px。元素比例按模式分级：big≥10:1, infograph≥6:1, comic≥8:1, sketchnote≥5:1, long/poster/whiteboard≥4:1（详见 `references/taste.md`）。

**纸质印刷感**：所有输出应遵循 `references/taste.md` 第 6 节的纸质美学要求——暖色纸张底色、墨感文字、降饱和度强调色、极细 hairline 边框、像印刷品而非网页截图。

5. 根据内容分析设计画面（密度/结构/锚点），原则同 ljg-card 信息图模式
6. 替换模板中的占位符（每个模板的占位符见模板文件顶部注释）
7. 写入 `/tmp/wjy_mockup_{name}.html`

**poster 模式特殊**：每个卡片独立写入，文件名带序号 `/tmp/wjy_mockup_{name}_{N}.html`。

**署名参数**：`--author` 替换 footer 左侧文字，`--photo` 作为 footer 头像。未指定时，默认署名为 Kenny Wu，默认头像为 `assets/avatar.png` 的绝对路径。

### Step 6: 自检

- [ ] 视觉形式从内容生长出来？换内容这布局还说得出吗？
- [ ] 设计系统的品牌语言在画面中可感知（不只是换了色板，排版节奏也匹配）？
- [ ] 元素比例达到模式最低标准？（big≥10:1, infograph≥6:1, comic≥8:1, sketchnote≥5:1, 其他≥4:1）
- [ ] 弹点色符合品牌类型规则？（标准色 ≤2 处，弱 accent ≤3 处视觉突出点）
- [ ] 正文 ≥36px，标注 ≥24px？
- [ ] 告诉别人"AI 做的"会被一眼看穿？

### Step 7: 截图（4K）

```bash
node assets/capture4k.js /tmp/wjy_mockup_{name}.html ~/Downloads/{name}.png 1080 800 2 fullpage
```

DPR=2，实际渲染 2160px 宽。

### Step 8: 交付

报告文件路径。

## Refinement

- "换个设计系统" → 回到 Step 3
- "调整配色" → 微调 CSS 变量，保持同一设计系统
- "改布局" → 重新设计，同一设计系统
- "标准版" → 用 `assets/capture.js` 替代 capture4k.js

## 快捷模式（--design 指定）

用户通过 `--design` 指定设计系统时，跳过 Step 3-4 直接进入 Step 5。

可用名称见 `references/design-index.md` 的目录名列。
