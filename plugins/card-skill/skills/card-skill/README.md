<p align="center"><img src="assets/logo.png" alt="card-skill" width="112"></p>

# card-skill

<p align="center"><strong>把文章、观点和论证，做成可以直接发布的图片。</strong><br>
<sub>Turn articles, ideas, and arguments into publish-ready visual cards.</sub></p>

给 Claude Code、Codex、OpenCode、Pi 等 coding agents 使用的内容制图 skill。输入文章、笔记、观点或 URL，它会理解内容结构，自动选择合适的版式与 Quiet Paper 气质，输出经过检查的 PNG。

## 看看它能做什么

<img src="assets/gallery/editorial-wechat-cover.png" width="100%" alt="公众号头图示例 — editorial image">

<table>
<tr>
<td width="50%" valign="top">
<img src="assets/gallery/poster.png" width="100%" alt="小红书与社媒卡片示例 — poster"><br>
<strong>小红书 / 社媒卡片</strong> · 把一个主题拆成可连续发布的卡片
</td>
<td width="50%" valign="top">
<img src="assets/gallery/whiteboard.png" width="100%" alt="白板推演示例 — whiteboard"><br>
<strong>白板推演</strong> · 把论点、因果与决策链画清楚
</td>
</tr>
<tr>
<td colspan="2" valign="top">
<img src="assets/gallery/article-diagram-boundary.png" width="100%" alt="正文解释图示例 — article diagram"><br>
<strong>正文解释图</strong> · 整篇文章会先筛出值得画的章节，再分别画清关系、流程和边界
</td>
</tr>
</table>

## 60 秒安装

card-skill 需要完整安装包，因为渲染脚本、模板、字体和检查器都在 `scripts/`、`assets/`、`schemas/`、`references/` 里。不要裸装 `KKenny0/card-skill`；当前 `skills add` 会把仓库根目录的 `SKILL.md` 当成单文件 skill，agent 会看不到渲染脚本和模板。

安装到 Codex：

```bash
codex plugin marketplace add KKenny0/card-skill
codex plugin add card-skill@card-skill
```

普通 agent 安装完整 skill 包：

```bash
npx skills add KKenny0/card-skill/plugins/card-skill/skills/card-skill -a codex -g -y
cd ~/.agents/skills/card-skill
npm install
npx playwright install chromium
```

Claude Code、OpenCode 或 Pi 用户把 `-a codex` 改为对应 agent ID，例如 `-a claude-code`、`-a opencode` 或 `-a pi`。

如果只想临时用一次，不做长期安装，可以用：

```bash
npx skills use KKenny0/card-skill/plugins/card-skill/skills/card-skill --skill card-skill
```

然后把一段内容或文章链接交给 agent，并直接说：

```text
把下面这篇文章做成一张公众号头图。不要复述摘要，提炼文章的核心张力，用安静的纸张质感呈现，完成后检查裁切、换行和可读性：

[在这里粘贴文章或 URL]
```

完成一次性环境设置后，agent 会自动选择 `editorial-image` 模式和适合的视觉方向，渲染、检查并返回一张 PNG（默认写入 `~/Downloads/`）；默认不会先让你挑风格，也不会自动加入作者名或头像。

不需要 slash command；中文、英文自然语言都可以触发。

## 从你要发布的东西开始

### 公众号 / 博客配图

适合文章头图、博客 hero 和正文里的氛围插图。它不会把文章再总结成 bullet points，而是提炼情绪、核心张力和视觉隐喻。

```text
给这篇关于 AI 如何改变个人知识管理的文章做一张公众号头图。画面要表达“记忆从仓库变成流动的工作台”，少字、克制，不要通用科技感。
```

### 正文解释图

适合放在文章中间解释关系、流程、边界和权限。它不追求封面感，而是让读者先看懂结构。输入整篇文章时，会先筛出值得画的章节，并为这些章节分别出图；可见文字默认跟随原文语言，中文文章不会自动改成英文标签。

```text
把这段关于 agent harness 安全边界的内容做成正文解释图：区分用户请求、受控执行、工具调用和受限资源。
```

### 小红书 / 社媒卡片

适合观点、方法论、章节拆解与系列内容。根据内容密度，可做单张大字报、信息图或多卡 poster。

```text
把这段“独立开发者如何判断一个功能值不值得做”的笔记做成 4 张社媒卡片。第一张提出冲突，中间两张讲判断标准，最后一张给行动清单；保留原意，不要写成营销文案。
```

### 白板推演

适合论证、系统关系、技术选型和决策链。重点是把推理关系画清楚，而不是装饰。

```text
把这段关于“为什么小团队应该先做单体应用”的论证画成白板推演：问题 → 约束 → 两条备选路径 → 决策。标出最脆弱的假设，不要补造数据。
```

## 9 种内容模具

card-skill 把 9 个 mode 分两层，承诺不同：

- **Stable**：走结构化 CLI renderer，schema 校验 + 双重 check-output。输入对了，输出就确定。失败时 schema 直接报错，不会乱出图。
- **Creative**：保留开放布局给真正需要创意的 mode，每次产物有差异，更依赖人工审美兜底。

| Mode | Tier | 最适合 |
|---|---|---|
| `editorial-image` | Stable（封面）/ Creative（正文） | 公众号头图与博客封面走 Stable CLI scaffold；正文氛围插图与概念隐喻需 AI 写 `content_html`，归 Creative |
| `article-diagram` | Stable | 正文解释图、关系图、流程图与边界模型 |
| `poster` | Stable | 小红书、社媒系列卡片、章节拆分 |
| `whiteboard` | Stable | 论证、因果链、系统关系与技术决策 |
| `long` | Stable | 文章型长卡片与沉浸阅读 |
| `big` | Stable | 一句话观点、标题与宣言 |
| `infograph` | Creative | 数据、比较、层级与高密度信息 |
| `comic` | Creative | 有冲突、转折或前后变化的叙事 |
| `sketchnote` | Creative | 个人反思、经验与温暖叙事 |

需要确定性输出（出版场景、批量生产、品牌一致性）优先选 Stable；需要画面创意（概念隐喻、叙事张力、个性化表达）选 Creative。

## Quiet Paper

所有模式共享同一套安静的纸面骨架：温暖纸色、克制墨色、细分隔线、小圆角、极少阴影。18 种品牌气质与 8 种内容色调只改变表面温度、强调色和节奏，不把作品变成品牌皮肤拼盘。

`editorial-image` 和 `article-diagram` 都会被约束在这套视觉体系里：字体、纸面色、边框、强调色和阴影都要保持克制，避免一张图突然变成粗边框、亮色块或重阴影的流程图。

默认会根据内容的结构、密度与情绪自动选择 mode、design 和画面方向。`editorial-image` 会先判断 `reflective`、`sharp`、`warm` 或 `technical` 气质，再落到真实可渲染的 Quiet Paper design；`article-diagram` 会先筛选值得画的章节，再为每个章节锁定概念图、流程图或边界图。只有你明确要求“给我几个方向”“先选风格”时，它才暂停等待选择；也可以直接指定 `Apple`、`Stripe`、`Linear`、`Claude`、`IBM`、`Notion` 等气质。

## 环境与首次运行

安装 skill 需要 Node.js 22+ 与 npm。PNG 截图依赖 Playwright 和 Chromium；仓库声明了 Playwright 依赖，但不会声称你的环境已经自动完成浏览器安装。

如果首次渲染提示缺少依赖，请进入本 skill 的安装目录后运行：

```bash
npm install
npx playwright install chromium
```

字体随 skill 一起分发。`assets/fonts/` 包含 4 个 OFL 1.1 开源字体（XiangcuiDengcusong、香萃打字机体 W15/W40、NanxiChuxiasong），共 ~57MB。安装时 `npx skills add` 自动拉取，无需额外下载。字体 license 见 `assets/fonts/LICENSE-fonts.md` 与 `assets/fonts/OFL-1.1.txt`。预检脚本会在每次出图时验证字体是否真加载，避免静默 fallback 到系统中文字体。

默认 `--dpr 2`。以常见的 1080 CSS 像素画布为例，导出的 PNG 宽度为 2160px；不同模式和比例会有不同高度，不应理解为固定的 4K 宽图。

### 更新提醒与隐私

每次 agent 开始使用 card-skill 时，会先运行一个非阻塞更新检查：一天最多一次，只读取 GitHub 上公开的 `VERSION` 文件；不会上传你的文章、prompt、路径或图片。检查失败会静默跳过，不影响出图。有新版时只提醒你运行：

```bash
npx skills update card-skill -g -y
```

如需完全关闭，设置环境变量 `CARD_SKILL_DISABLE_UPDATE_CHECK=1`。

### PNG 体积优化（可选）

默认 PNG 无损 4K，长文卡可能 10-17MB，Slack / 公众号会再压缩可能损失细节。如需更小体积，单独跑一次：

```bash
pngquant --quality=80-95 --force --output card.png card.png   # 11MB → 1-2MB，肉眼几乎无差
```

`pngquant` 是跨平台 CLI（macOS `brew install pngquant` / Ubuntu `apt install pngquant` / Windows 见 pngquant.org），skill 本身不依赖它。

## 它怎样工作

1. 读取 URL、粘贴文本或本地文件。
2. 分析结构、密度、情绪与发布用途。
3. 自动匹配 mode、Quiet Paper design 与画面方向；文章封面会先落到真实 design，正文解释图会先筛章节再锁定图型。
4. 使用结构化 renderer 或创意布局流程生成画面。
5. 在截图前后检查占位符、溢出、裁切、坏图、正文可读性、标题换行、框内文字、字体栈与视觉体系漂移。
6. 通过 Playwright 截图，输出 PNG；默认署名和头像均为空。

结构化 CLI 也可以单独使用：

```bash
node scripts/card.js --input /path/to/input.json --output ~/Downloads/card.png
```

支持的 CLI modes：`big`、`long`、`whiteboard`、`poster`、`editorial-image`、`article-diagram`。

`editorial-image` 的高质量最终图优先使用 `content_html` + `custom_css` 做具体主视觉；默认 scaffold 只是比例安全的兜底，适合快速验证，不应作为复杂正文配图的终点。

`article-diagram` 是正文解释图的稳定路径。输入整篇文章时，它会跳过不适合画的铺垫、情绪和结论章节，只为有关系、流程、边界或系统结构的章节出图；第一版支持 `concept-map`、`process-flow`、`boundary-model` 三类固定图型。

可选署名与来源字段使用 `brand_name`、`logo`、`source`；默认全部为空，不会自动加入作者名、头像或维护者品牌。

## 更多样张

<details>
<summary>展开完整 gallery</summary>

<table>
<tr>
<td width="50%"><img src="assets/gallery/infograph.png" width="100%" alt="infograph 示例"><br><strong>infograph</strong></td>
<td width="50%"><img src="assets/gallery/big.png" width="100%" alt="big 示例"><br><strong>big</strong></td>
</tr>
<tr>
<td><img src="assets/gallery/long.png" width="100%" alt="long 示例"><br><strong>long</strong></td>
<td><img src="assets/gallery/sketchnote.png" width="100%" alt="sketchnote 示例"><br><strong>sketchnote</strong></td>
</tr>
<tr>
<td><img src="assets/gallery/comic.png" width="100%" alt="comic 示例"><br><strong>comic</strong></td>
<td><img src="assets/gallery/editorial-blog-hero.png" width="100%" alt="博客头图示例"><br><strong>editorial-image</strong> · blog hero</td>
</tr>
<tr>
<td><img src="assets/gallery/article-diagram-boundary.png" width="100%" alt="正文解释图示例"><br><strong>article-diagram</strong> · boundary model</td>
<td><img src="assets/gallery/infograph.png" width="100%" alt="结构化信息图示例"><br><strong>Quiet Paper</strong> · structured information</td>
</tr>
</table>

</details>

## Showcase：让作品替工具说话

如果 card-skill 帮你做出了值得发布的图，欢迎在 GitHub Issues 分享：

- 最终图片或公开发布链接
- 使用的原始 prompt（敏感内容可删减）
- mode 与你使用的 agent
- 哪一步顺利、哪一步仍需要手工调整

真实案例会帮助我们判断下一步该优化哪种发布任务；经作者同意后，优秀案例也可能进入 gallery，并保留来源署名。

## Support

如果 card-skill 帮你做出了真实发布的图，最有帮助的是在 Issues 里分享案例。你也可以通过这里支持后续维护：

<https://kkenny0.github.io/support/>

支持会帮助我继续维护字体、浏览器渲染、图片压缩、模具质量和跨 agent 兼容性。

## Credits

card-skill 受到以下项目与实践启发：

- [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) by VoltAgent — 品牌设计参考库。
- [ljg-card](https://github.com/lijigang/ljg-skills/tree/master/skills/ljg-card) by lijigang — 内容制图与早期品味规则。
- [Kami](https://github.com/tw93/kami) by tw93 — Quiet Paper 的纸面、墨色与节奏约束。
- [The New Yorker cover practice](https://www.newyorker.com/culture/video-dept/the-art-of-the-new-yorker-cover) 与 [GOV.UK image guidance](https://guidance.publishing.service.gov.uk/formatting-content/images/) — editorial image 的用途与克制原则。

## License

[MIT](LICENSE) © 2026 Kenny Wu
