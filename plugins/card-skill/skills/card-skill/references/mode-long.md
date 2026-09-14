# 长阅读卡（long）

使用 `schemas/long.json` 的结构化字段，通过 Visual Job v3 的候选、检查、审核与发布链交付。`assets/long_template.html` 由 renderer 填充，不另写 HTML 或手动截图。

## 标题与正文

- `mode: "long"`、非空 `title` 和非空 `body` 必填。宽度 1080 CSS 像素，高度随内容增长。
- `title` 是简短的阅读入口，不是正文容器。来源有标题时沿用；没有标题时，写一个忠于全文的简短中性标题。不要把整段原文复制成标题，也不要用被后文否定的句子代表全文。
- 仅排版请求使用 `preserve`，完整正文放入 `body`，保留语气、例子、顺序、条件与否定。标题不能代替正文，也不能新增事实。用户明确禁止添加标题时，应说明当前 long 契约需要标题的限制。
- 原文段落使用 `paragraph`，按原顺序排列。长文通过自动高度容纳，不删字或缩小文字；超出运行边界时遵守用户约束另行规划分页。
- 真正的引文使用 `blockquote` 或完整段落逐字承载；不要为了保留原文把整段文字提升为标题。证据类别仍按 source-material 判断。

## 正文元素

| type | 字段与用途 |
|---|---|
| `paragraph` | `text`；可选 `dropcap`，首个普通段落可用，非必需 |
| `heading` | 短 `text`；`level` 为 2 或 3 |
| `highlight` | 独立核心短句的 `text`；可选 `accent` |
| `blockquote` | 引用原文 `text` |
| `layer_card` | 并列条目的 `text` 与可选短 `label` |
| `section_break` | 无正文，仅章节分隔 |

字段文本按 renderer 的转义规则显示，不向 `body.text` 塞 HTML。不要添加 schema 未支持的列表、prompt 或容器类型。

## 视觉与交付

long 只渲染上述文字元素，不绘制箭头、分支、路径或图形隐喻。`visual_plan.visual_metaphor` 使用 `null`，布局计划描述文字层级与分组；不能承诺这个 renderer 不支持的图形。

使用共享 Kenny Style 的 `tone` 或用户指定 `design`，不要另外按关键词自造颜色。`kicker`、`subtitle`、`source` 与品牌字段只在有实际内容需要且来源允许时填写。

保持标题简短、正文可读、分组关系清楚。看图时同时检查完整段落、标题是否忠于最终判断、换行和底部内容；交付使用 renderer 的完整页面 PNG。
