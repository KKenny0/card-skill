# 纸上荒野 / Paper Wilderness

这是所有 cover 请求唯一支持的系列，不是新的 mode、tone 或 design；不自动添加作者身份。

## 何时使用

- 所有封面请求使用纸上荒野，无需指定系列名。
- 其他封面风格已退休；解释支持范围，不生成替代风格。
- 启用不授权自动填入 `brand_name`、`logo` 或署名。系列身份由画面建立。
- 首版只覆盖 `use: cover`、`aspect: wechat-cover`。其他画幅先说明此规范未验证；不能把宽图裁成方图，不能给 square 填入不受支持的 `cover_art`。

## 从内容到意象

先读取正文，写出一句当前主要证据支持的关系或处境，再选择一个主题意象。保留改变意思的条件与限制。只有标题时，明确交付为标题层面的设计探索，不能补写正文观点。

固定纸质地形切片、浅俯视角度、前景纸层、前左侧单个红色路标；内部主体、动作和关系随文章改变。不要强制小人走山路，不把所有技术关系都变成桥，也不要以景色替代内容。

参考图说明的是表达方式，不是可套用到任意文章的事实：

- `uncertainty.png`：岔路隐入雾中，表现选择与未知，不标注一条必然正确的道路。
- `cooperation.png`：两个内部不可见的独立系统，通过共同交接点协作；不是协议实现或网络拓扑图。
- `rest.png`：湖面与空舟表现休息、当下和存在感；不是历史现场还原。

## 资源与生成

资源位于技能根目录的 `assets/cover-series/paper-wilderness/`。先定位当前技能根目录，再解析成宿主可访问的绝对路径；禁止引用维护者机器的 Downloads、临时目录或本次会话路径。

1. 查看 `master.png` 和最相关的一张参考图。`master.png` 是中性载体，不可作为新文章的成品插画直接交付。
2. 用户提供并指定插画时优先采用，不重新生成；若与本系列冲突，说明差异，不擅自替换。
3. 检查宿主实际可调用的生图能力。每篇以 `master.png` 为主要参考，最多附一张系列样例指导笔触；不连续编辑上一期成品。若宿主限制了参考图传递，遵守其文件访问方式，不伪造附件。
4. 只生成插画，标题、副标题仍交给 renderer。请求透明背景，取得本地静态 PNG 后实际查看。
5. 把插画写入现有 `cover_art: { path, alt }`；`alt` 描述本篇意象。插画不是主证据，不能放入 `media_snapshots` 或冒充来源证据。

生成提示由下面的固定部分，加上本篇有来源依据的「主题场景」与「避免误读」两段组成。规划文字不得出现在图片中。

> Preserve the reference's paper terrain carrier, shallow elevated perspective, front paper strata and single red marker at front left. Change only the interior scene to express the supplied article relationship. Use clean warm ivory paper, restrained graphite contours and red only on the marker. Keep a readable dominant subject at thumbnail size. No typography, logo, invented facts or documentary reconstruction. Remove decorative scratches, tangled fibers and dense grain. Outside the island must be genuinely transparent: no gray/brown haze, halo, backdrop or drop shadow. Keep the top 8% and four 2% corner squares empty and transparent. Keep any meaningful fog inside the island. Do not copy the example's topic into a different article.

没有生图能力、生成失败或无法取得本地文件时，若已有用户指定且适合的插画，可继续使用；否则明确说明无法兑现本系列并停止该封面的生产。普通 editorial-image 的 motif/Studio 退路不能被称为等价的纸上荒野成品。旧封面路径已退休。不要求用户安装工具或提供密钥。

## 排版与契约

继续使用 Visual Job v3 / `editorial-image` / Stable；`selection_source` 仍为 `taxonomy`。写入 `cover_series: "paper-wilderness"`，省略也选择同一系列。将系列意图记录在 `visual_plan.layout_strategy` 与 `avoid_patterns`，系列布局由 renderer 自动加载。

renderer 加载 `assets/cover-series/paper-wilderness/layout.css`。它保留大标题、左右分栏与较大的主题插画：标题 56px，插画区高 330px，栏间距 28px，1080×460 CSS 像素画布。不通过 `@import` 引入文件。

按正文写标题和必要副标题；允许手动换行。长标题应在同一结构内调整换行或字号，不能强制三张同样行数，不能缩到不可读。默认 reflective；显式颜色选择沿用颜色层边界，不自动重染栅格插画，也不以换 tone 修改版式。

`cover_art` 与 `cover_motif`、`content_html`、`composition_required:true` 仍互斥。不得绕过 schema、renderer、截图、check-output 或 reviewed publisher。系列规范不修改资源体积、哈希和安全约束。

## 交付前检查

- 先查看真实插画，再查看浅色底上的完整封面和 320px 宽缩略图。不能只看工具的透明底预览。
- 对照母版：纸层、视角和红色路标保持可识别的一致性；允许生成细节的小幅变化，不承诺像素一致。
- 对照正文：主题关系可见，没有为了固定场景而改变原意；技术意象不承担完整架构解释。
- 检查透明区：顶部 8% 与四角 2% 方形区域应为 alpha ≤ 2（0–255）。明显超出说明背景污染；不要仅凭扩展名或生成参数判断透明。
- 检查整圈边缘与纸面：没有灰褐色雾层、浓重投影、杂线和过密纹理。空白区像素检查不能证明整个边缘干净，仍须看最终合成效果。
- 缩小后至少能区分主体轮廓与红色路标；大标题保持清晰。识别读者偏好和长期品牌关联需要真实使用，不能靠审核分数宣称已验证。

发现缺陷时使用既有一次修订预算，修改意象或清理背景后完整重跑。不得自动增加清理循环，或因更换了插画就跳过重新审核。
