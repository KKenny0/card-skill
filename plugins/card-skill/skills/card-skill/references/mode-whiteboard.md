# Whiteboard：推演札记

自然语言白板请求默认明确写入 `variant: "reasoning-notes"`。先读[推演、单图与拆图规则](whiteboard-reasoning-notes.md)，再按[Visual Job](visual-job.md)生成、审核与交付。省略 variant 同样使用推演札记；显式 classic 拒绝并提示迁移。

这是结构化模式，不接受 content_html/custom_css，不手写HTML绕过渲染器。合同见 schemas/whiteboard.json，运行时校验由 scripts/lib/schema.js 与 whiteboard-notes.js 负责。

## 内容块

- chain：nodes 的字段为 text，可用 highlight / muted。札记 layout 为 stack、opposition 或 turn。opposition 正好三个节点，分别是左侧、关系词、右侧；不自动补因果箭头。
- layers：items 的字段为 name、desc。札记 layout 为 columns 或 boundary。columns 为1–3栏；boundary 正好两栏，先内部、后共享过程。
- annotation：text。札记 layout 为 note 或 exception。例外块只在确有优先规则时使用。
- insight：text，当前图的有范围判断。札记里的所有文本都是纯文本，可用换行；不要嵌入HTML或Markdown标记。
- 每块可声明 depth 0–2，表示局部嵌套。父条件必须写在可见文字中，不能只靠缩进表达。

保留四类步骤；insight 使用纯文本，旧HTML强调必须迁成可见原文，不能隐藏或执行。不要根据节点数量或题目文字猜布局。

## 渲染纪律

1080px宽，自适应高度；正文44px、旁注42px、标题60px。360px图宽下正文约14.7px。保持干净纸面、受控宋体、低面积强调与细线。tone/design只改色，不改关系或字体。不要为了减少高度缩字。必须经过 schema、renderer、截图、check-output、实际PNG查看、review及本地交付。
