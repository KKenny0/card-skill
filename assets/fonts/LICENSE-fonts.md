# Font Licenses

All bundled fonts in this directory are released under the
**SIL Open Font License 1.1** (see `OFL-1.1.txt`). OFL permits free
commercial use, redistribution, and modification with attribution.

The skill code itself is MIT-licensed (see top-level `LICENSE`); fonts
keep their independent OFL terms.

## Bundled Fonts

| File | Family | Author | Source |
|---|---|---|---|
| `XiangcuiDengcusong.ttf` | 香萃等粗宋 | Miiiller (香萃) | https://github.com/Miiiller/Xiangcui-Dengcusong |
| `香萃打字机体 W15.ttf` | 香萃打字机体 W15 | Miiiller (香萃) | https://github.com/Miiiller/Xiangcui-Dazijiti |
| `香萃打字机体 W40.ttf` | 香萃打字机体 W40 | Miiiller (香萃) | https://github.com/Miiiller/Xiangcui-Dazijiti |
| `NanxiChuxiasong.ttf` | 南溪初夏宋 | 松陵南西 | https://github.com/zeoseven/zeo-font (mirror) |

Each font is a derivative of Source Han Serif (思源宋体 / Noto Serif CJK),
which is also OFL-licensed by Adobe + Google.

## Reserved Font Names

The names "香萃等粗宋", "香萃打字机体", and "南溪初夏宋" are reserved by
their original authors. Modified versions of these fonts must NOT use these
reserved names; use a distinct name and continue to release under OFL 1.1.

## Why These Fonts Are Bundled

Card-skill rendering output depends on consistent Chinese serif metrics.
Relying on system fonts produces silent fallbacks (PingFang SC on macOS,
SimSun on Windows, Noto CJK on Linux) that change character heights and
break visual consistency. Bundling guarantees that any user installing
this skill via `npx skills add` gets the intended typography out of the
box.

If you redistribute this skill, you must keep the `OFL-1.1.txt` file
alongside the font files.
