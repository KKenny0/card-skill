# Sketchnote · 漫游札记

把来源中一次有依据的认识变化，编辑成可以连续阅读的图文札记。自然语言 sketchnote 请求默认采用漫游札记，使用 `variant: "wandering-notes"`，读取 [风格与构图规则](sketchnote-wandering-notes.md)。

## 合同与运行

仍是 Studio 模式，必须提供 `title`、`composition_required: true`、非空 `content_html` 和 `custom_css`。`variant` 选择共享样式，不自动生成故事、图像或正文。省略 `variant` 的已有自定义构图保持原行为。

基础模板为 `assets/sketchnote_template.html`；显式变体由 renderer 加载 `assets/sketchnote-wandering-notes.css`，然后加载本次 `custom_css`。样式只使用颜色 token，tone/design 不得改变几何或叙事。

使用 Visual Job v3 → render-job → check-output → 实际 PNG 检查 → Visual Review → reviewed publisher。不要手工截图绕过生产链。

## 内容先行

- 开篇有具体问题或处境，后续有来源支持的视角变化；无需固定站数。
- 不强制“失败—顿悟—命名”。来源没有失败经历，不补写；不把一般观点伪装成亲历或历史事件。
- 可先命名主题，也可在理解形成后命名；由阅读任务决定，不禁止标题出现概念名。
- 引文、条件、否定与未知按 SKILL.md 保留。编辑性提问与意象不能冒充原文、疗效或实现机制。
- 阅读节奏与意象的变化由内容决定，不套同一四站或六站结构；不强制四种字族、印章、便签或巨字转场。

## 模式边界

漫游札记表达读者如何逐渐改变看法。只需快速看清关系，用 article-diagram；需要检查复杂条件、分支与回跳，用 whiteboard；需要逐段保留长文，用 long；社媒固定3:4分页，用 poster。不要把复杂关系藏进隐喻，也不要把所有技术内容排成说明图。

显式要求其他杂志式构图时仍可用未指定 variant 的 Studio 合同，遵守当前 Kenny Style 和来源边界；旧文档的固定失败、六站、四字族要求不再适用。
