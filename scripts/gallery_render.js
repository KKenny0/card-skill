#!/usr/bin/env node
/**
 * Gallery renderer for card-skill
 * Renders all design-system × mode combinations, then generates a static gallery page.
 *
 * Usage:
 *   node scripts/gallery_render.js [--dry-run] [--mode big] [--design apple]
 *
 * Options:
 *   --dry-run       Generate HTML only, skip screenshot capture
 *   --mode MODE     Render only one mode (e.g. --mode big)
 *   --design NAME   Render only one design system (e.g. --design apple)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const MODE_FILTER = getArg('--mode');
const DESIGN_FILTER = getArg('--design');

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const CAPTURE = path.join(ASSETS, 'capture4k.js');
const OUTPUT_DIR = path.join(ROOT, 'gallery', 'output');
const LOGO_PATH = path.join(ASSETS, 'logo.png');
const FONT_DIR = path.join(ASSETS, 'fonts');

// ═══════════════════════════════════════════════════════════
// Design Systems Catalog
// ═══════════════════════════════════════════════════════════

const { DESIGNS: TOKEN_DESIGNS } = require('./lib/designs');

const DESIGN_META = {
  linear: ['Dark Minimal', '精密暗色'],
  vercel: ['Dark Minimal', '极简部署'],
  spotify: ['Dark Cinematic', '暗色媒体'],
  apple: ['Light Minimal', '产品留白'],
  expo: ['Light Minimal', '开发者文档'],
  notion: ['Light Minimal', '工作区'],
  claude: ['Light Editorial', '暖色人文'],
  cursor: ['Light Editorial', '编辑暖调'],
  intercom: ['Light Editorial', '通讯温暖'],
  replicate: ['Light Editorial', '研究展示'],
  posthog: ['Light Editorial', '分析工具'],
  clay: ['Light Editorial', '有机数据'],
  stripe: ['Technical Data', '精密金融'],
  ibm: ['Technical Data', '企业工程'],
  opencode: ['Technical Data', '等宽终端'],
  sentry: ['Technical Data', '错误监控'],
  raycast: ['Technical Data', '效率工具'],
  together_ai: ['Technical Data', 'AI 推理'],
  ljg_chensi: ['ljg-card', '沉思'],
  ljg_ruili: ['ljg-card', '锐利'],
  ljg_wennuan: ['ljg-card', '温暖'],
  ljg_jishu: ['ljg-card', '技术'],
  ljg_keyan: ['ljg-card', '科研'],
  ljg_chuangyi: ['ljg-card', '创意'],
  ljg_shangye: ['ljg-card', '商业'],
  ljg_moren: ['ljg-card', '默认'],
};

const DESIGNS = Object.fromEntries(Object.entries(TOKEN_DESIGNS).map(([name, design]) => {
  const [category, note] = DESIGN_META[name] || ['Quiet Paper', name];
  const isEditorial = category === 'Light Editorial' || name.startsWith('ljg_');
  const isMono = name === 'opencode';
  return [name, {
    ...design,
    category,
    note,
    font: isMono ? 'JetBrains Mono, monospace' : 'DM Sans',
    fontTitle: isMono ? 'JetBrains Mono, monospace' : (isEditorial ? 'DM Serif Display' : 'DM Sans'),
    titleWeight: isEditorial ? 400 : 600,
  }];
}));

// ═══════════════════════════════════════════════════════════
// Mode compatibility
// ═══════════════════════════════════════════════════════════

const MODES = ['infograph', 'big', 'long', 'whiteboard', 'poster', 'comic', 'sketchnote'];

// Templates that only work well with light surfaces
const LIGHT_ONLY = new Set(['infograph', 'poster', 'sketchnote']);

function isCompatible(mode, designName) {
  const d = DESIGNS[designName];
  if (!d) return false;
  // Comic uses a fixed quiet monochrome palette, all designs compatible
  if (mode === 'comic') return true;
  // Light-only modes skip dark designs
  if (LIGHT_ONLY.has(mode) && d.surface === 'dark') return false;
  return true;
}

// ═══════════════════════════════════════════════════════════
// Sample Content for Each Mode
// ═══════════════════════════════════════════════════════════

const CONTENT = {
  // ── Infograph ──
  infograph: {
    custom_css: '',
    source_line: '<span class="info-source">2026 · card gallery sample</span>',
    content_html: `
  <div style="padding: 72px 64px 0;">

    <div style="font: 500 13px/1 'JetBrains Mono', monospace; letter-spacing: 0.5px; text-transform: uppercase; color: var(--pink); margin-bottom: 32px;">系统设计 · System Design</div>

    <div style="font: 400 64px/1.15 'XiangcuiDengcusong', serif; color: var(--ink); margin-bottom: 20px; letter-spacing: 0;">AI Agent<br>架构的三层模型</div>

    <div style="font: 400 36px/1.45 'DM Sans', sans-serif; color: var(--ink-light); max-width: 820px; margin-bottom: 56px;">从 LLM 到自主决策，中间隔着的不是一行代码</div>

    <div style="display: flex; gap: 20px; margin-bottom: 48px;">
      <div style="flex:1; background: var(--green); border-radius: 8px; padding: 28px 24px;">
        <div style="font: 600 24px/1 'JetBrains Mono', monospace; color: var(--ink-light); margin-bottom: 12px; letter-spacing: 1px;">LAYER 01</div>
        <div style="font: 400 36px/1.3 'XiangcuiDengcusong', serif; color: var(--ink); margin-bottom: 8px;">基础层</div>
        <div style="font: 400 36px/1.35 'DM Sans', sans-serif; color: var(--ink-light);">LLM + Context<br>200k token</div>
      </div>
      <div style="flex:1; background: var(--green); border-radius: 8px; padding: 28px 24px;">
        <div style="font: 600 24px/1 'JetBrains Mono', monospace; color: var(--ink-light); margin-bottom: 12px; letter-spacing: 1px;">LAYER 02</div>
        <div style="font: 400 36px/1.3 'XiangcuiDengcusong', serif; color: var(--ink); margin-bottom: 8px;">会话层</div>
        <div style="font: 400 36px/1.35 'DM Sans', sans-serif; color: var(--ink-light);">Rolling Summary<br>持久记忆</div>
      </div>
      <div style="flex:1; background: var(--green); border-radius: 8px; padding: 28px 24px;">
        <div style="font: 600 24px/1 'JetBrains Mono', monospace; color: var(--ink-light); margin-bottom: 12px; letter-spacing: 1px;">LAYER 03</div>
        <div style="font: 400 36px/1.3 'XiangcuiDengcusong', serif; color: var(--ink); margin-bottom: 8px;">行动层</div>
        <div style="font: 400 36px/1.35 'DM Sans', sans-serif; color: var(--ink-light);">Tool Use<br>Planning</div>
      </div>
    </div>

    <div style="border-top: 1px solid rgba(45,41,38,0.08); border-bottom: 1px solid rgba(45,41,38,0.08); padding: 32px 0; margin-bottom: 40px;">
      <div style="font: 400 38px/1.6 'XiangcuiDengcusong', serif; color: var(--ink); text-align: center;">三层之间，成本是钢筋，约束是水泥</div>
    </div>

    <div style="display: flex; gap: 40px; padding: 0 0 40px;">
      <div style="flex:1;">
        <div style="font: 600 56px/1 'JetBrains Mono', monospace; color: var(--pink); margin-bottom: 8px;">47.2%</div>
        <div style="font: 400 36px/1.25 'DM Sans', sans-serif; color: var(--ink-light);">LLM 调用成本占比</div>
      </div>
      <div style="flex:1;">
        <div style="font: 600 56px/1 'JetBrains Mono', monospace; color: var(--pink); margin-bottom: 8px;">3.8x</div>
        <div style="font: 400 36px/1.25 'DM Sans', sans-serif; color: var(--ink-light);">记忆带来的效率提升</div>
      </div>
      <div style="flex:1;">
        <div style="font: 600 56px/1 'JetBrains Mono', monospace; color: var(--pink); margin-bottom: 8px;">12ms</div>
        <div style="font: 400 36px/1.25 'DM Sans', sans-serif; color: var(--ink-light);">工具调用延迟阈值</div>
      </div>
    </div>

  </div>`,
  },

  // ── Big ──
  big: {
    phrase_html: '好的设计<br>不靠添加<br>靠<span class="accent">删除</span>',
    font_size: '220px',
    ghost_char: '删',
    attribution: '—— 设计箴言',
  },

  // ── Long ──
  long: {
    kicker: 'DESIGN PHILOSOPHY',
    title: '为什么好的设计<br>看起来像<span class="accent-word">没设计</span>',
    subtitle: '真正的设计不是叠加，而是删除。当所有多余的东西被拿走，剩下的就是答案。',
    body_html: `
    <p class="dropcap">好的设计有一个奇怪的特征：它看起来好像没有经过设计。这不是说它简陋或随意，而是说每一处都恰到好处，没有任何一个元素让你觉得多余。这种「无感」恰恰是最难达到的状态。</p>

    <div class="section-break">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>

    <p>初学者倾向于添加。加一个阴影，加一个渐变，加一个动效。每一层添加都让画面更丰富，但也让整体更嘈杂。真正的高手在做<span class="accent-word">减法</span>。他们会问：这个元素如果不放，画面会崩塌吗？如果不会，就删掉。</p>

    <div class="highlight accent-highlight">约束是设计的催化剂。<br>没有边界，就没有形状。</div>

    <p>Apple 的设计之所以看起来干净，不是因为他们想到了要放什么，而是因为他们决定了不放什么。每一次「不放」都是一个判断，每一个判断背后都是对用户需求的深刻理解。好的设计不是技巧的堆叠，是取舍的累积。</p>

    <div class="layer-card">
      <div class="layer-label">PRINCIPLE</div>
      <div class="layer-text">如果用户注意到了你的设计本身，那说明设计还不够好。真正的设计应该<span class="accent-word">隐形</span>，让内容自己说话。</div>
    </div>
    `,
  },

  // ── Whiteboard ──
  whiteboard: {
    subtitle: '推理链 · Reasoning Chain',
    title_html: '为什么选择 <span class="keyword">Rust</span>',
    steps_html: `
  <div class="section">
    <div class="section-label">PROBLEM</div>
    <div class="chain">
      <div class="chain-node">C++ <span class="muted">→</span> <span class="highlight">内存泄漏</span> <span class="muted">→</span> 生产事故</div>
    </div>
    <div class="annotation">2024 年 Cloudflare 报告：<em>63%</em> 的安全漏洞源于内存安全问题</div>
  </div>

  <div class="section">
    <div class="section-label">EVALUATE</div>
    <div class="layers">
      <div class="layer">
        <div class="layer-icon">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <ellipse cx="18" cy="18" rx="15" ry="9" stroke="var(--ink-muted)" stroke-width="1.8" fill="none"/>
            <circle cx="18" cy="18" r="4" stroke="var(--ink)" stroke-width="1.8" fill="none"/>
            <circle cx="18" cy="18" r="1.5" fill="var(--ink)"/>
          </svg>
        </div>
        <div class="layer-body">
          <div class="layer-name">性能</div>
          <div class="layer-desc">与 C++ 同级，零成本抽象，编译期优化</div>
        </div>
      </div>
      <div class="layer">
        <div class="layer-icon">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M10 26 Q6 18, 12 12 Q15 6, 22 8 Q30 6, 30 14 Q34 20, 28 26" stroke="var(--ink-muted)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="layer-body">
          <div class="layer-name">安全</div>
          <div class="layer-desc">所有权系统消除数据竞争，无需 GC</div>
        </div>
      </div>
      <div class="layer">
        <div class="layer-icon">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M12 24 L12 16 Q12 14, 14 14 Q16 14, 16 16 L16 22" stroke="var(--ink)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <path d="M16 22 L16 12 Q16 10, 18 10 Q20 10, 20 12 L20 22" stroke="var(--ink)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <path d="M20 22 L20 14 Q20 12, 22 12 Q24 12, 24 14 L24 22" stroke="var(--ink)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="layer-body">
          <div class="layer-name">生态</div>
          <div class="layer-desc">Cargo 包管理 + 丰富的 crates.io 生态</div>
        </div>
      </div>
    </div>
  </div>

  <div class="insight-box">
    <div class="insight-icon">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M24 4 C16 4, 10 10, 10 18 C10 23, 13 27, 17 29 L17 34 C17 35, 18 36, 19 36 L29 36 C30 36, 31 35, 31 34 L31 29 C35 27, 38 23, 38 18 C38 10, 32 4, 24 4Z" stroke="var(--accent)" stroke-width="2" fill="none"/>
        <line x1="19" y1="40" x2="29" y2="40" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
        <path d="M24 14 L24 22" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M20 18 L28 18" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="insight-text">Rust 不是最快的语言，<br>但它是唯一让你<span class="accent-word">不需要权衡</span>速度与安全的语言。</div>
  </div>
  `,
  },

  // ── Poster (title card only) ──
  poster: {
    title: '设计系统的<br>隐形规则',
    subtitle: '从颜色到留白，18 个品牌气质与 8 种内容色调背后的共同逻辑',
    topic_tag: 'Design Systems × 2026',
    body_html: `
      <h2>01 · 色彩的 90/8/2 法则</h2>
      <p>所有优秀的设计系统都遵循同一个色彩比例：90% 中性色、8% 结构色、2% 强调色。这不是巧合，而是视觉舒适度的数学基础。</p>
      <div class="divider"></div>
      <h2>02 · 留白是结构，不是装饰</h2>
      <p>初学者把留白当作「空」，高手把留白当作「墙」。它分隔内容、引导视线、建立层级。</p>
    `,
  },

  // ── Comic (title card + 1 panel) ──
  comic: {
    title: '那些年我踩过的<br>设计坑',
    subtitle: '一个前端工程师的漫画自白',
    series_tag: 'DESIGN CONFESSIONS',
    panel_html: `
      <div class="panel-large">
        <div class="narration-box">入职第一天 · Day One</div>
        <h2>「这个需求很简单」</h2>
        <p>PM 说这句话的时候，我的 CSS 还没加载完。</p>
        <div class="speech-bubble">能加个动效吗？</div>
      </div>
    `,
  },

  // ── Sketchnote ──
  sketchnote: {
    title: '从失败中学到的',
    subtitle: '三件关于设计的事',
    custom_css: '',
    source_line: '<span class="info-source">个人笔记 · 2026</span>',
    content_html: `
  <div class="magazine-head">
    <div class="top-bar">
      <div class="left">
        <span class="badge">SKETCHNOTE</span>
        <span>01</span>
      </div>
      <span>2026</span>
    </div>
    <h1>从失败中<br>学到的</h1>
    <div class="deck">三件关于设计的事——来自一个写了十年 CSS 的人</div>
  </div>

  <div class="note-card feature">
    <div>
      <div class="kicker"><span class="num">01</span><span class="rule"></span>PROBLEM</div>
      <div class="head-serif">做得越多，<br>错的越多</div>
      <div class="body-serif">
        <p>2019 年，我给一个 landing page 加了 17 种动效。用户测试结果：转化率下降 23%。每个动效单独看都很酷，但叠加在一起就是噪音。</p>
      </div>
    </div>
    <div>
      <div class="lead">我学会了：动效不是装饰，是导航。一个动效只做一个任务——告诉用户「看这里」。</div>
    </div>
  </div>

  <hr class="divider">

  <div class="note-card hero">
    <div class="kicker"><span class="num">02</span><span class="rule"></span>INSIGHT</div>
    <div class="head-serif">约束是最好的<br>设计工具</div>
    <div class="layout">
      <div>
        <div class="body-serif">
          <p>后来我给自己定了一个规则：任何页面最多用 3 种字体、2 种字号、1 个强调色。</p>
        </div>
      </div>
      <div class="visual">
        <div class="pull-quote">限制不是枷锁，是跑道。</div>
      </div>
    </div>
  </div>

  <hr class="divider">

  <div class="note-card closing">
    <div class="approach">最终的领悟</div>
    <div class="mega-name">LESS</div>
    <div class="en-name">但每一个都恰到好处</div>
  </div>
  `,
  },
};

// ═══════════════════════════════════════════════════════════
// Template Filling
// ═══════════════════════════════════════════════════════════

function fillTemplate(mode, designName) {
  const d = DESIGNS[designName];
  const c = CONTENT[mode];
  let html = fs.readFileSync(path.join(ASSETS, `${mode}_template.html`), 'utf-8');
  html = html.replaceAll('{{FONT_BASE}}', FONT_DIR.replace(/\\/g, '/'));
  const logoPath = `file://${LOGO_PATH}`;
  const displayName = designName.replace('ljg_', 'ljg-');

  // ── Mode-specific CSS variable replacement ──
  switch (mode) {
    case 'infograph': {
      // Map: canvas→--bg, accent→--pink, surface1→--green, ink→--ink, inkMuted→--ink-light
      html = replaceCSSVar(html, '--bg', d.canvas);
      html = replaceCSSVar(html, '--pink', d.accent);
      html = replaceCSSVar(html, '--green', d.surface1);
      html = replaceCSSVar(html, '--ink', d.ink);
      html = replaceCSSVar(html, '--ink-light', d.inkMuted);
      html = html.replaceAll('{{CONTENT_HTML}}', c.content_html);
      html = html.replaceAll('{{CUSTOM_CSS}}', c.custom_css);
      html = html.replaceAll('{{LOGO}}', logoPath);
      html = html.replaceAll('{{SOURCE_LINE}}', c.source_line);
      break;
    }
    case 'big': {
      html = replaceCSSVar(html, '--bg', d.canvas);
      html = replaceCSSVar(html, '--accent', d.accent);
      html = replaceCSSVar(html, '--ink', d.ink);
      html = replaceCSSVar(html, '--ink-muted', d.inkMuted);
      html = replaceCSSVar(html, '--surface-1', d.surface1);
      html = replaceCSSVar(html, '--hairline', d.hairline);
      html = html.replaceAll('{{PHRASE_HTML}}', c.phrase_html);
      html = html.replaceAll('{{FONT_SIZE}}', c.font_size);
      html = html.replaceAll('{{GHOST_CHAR}}', c.ghost_char);
      html = html.replaceAll('{{ATTRIBUTION}}', c.attribution);
      html = html.replaceAll('{{LOGO}}', logoPath);
      html = html.replaceAll('{{BRAND_NAME}}', displayName);
      break;
    }
    case 'long': {
      const isDark = d.surface === 'dark';
      html = replaceCSSVar(html, '--bg', d.canvas);
      html = replaceCSSVar(html, '--surface-1', d.surface1);
      html = replaceCSSVar(html, '--surface-2', d.surface2);
      html = replaceCSSVar(html, '--accent', d.accent);
      html = replaceCSSVar(html, '--ink', d.ink);
      html = replaceCSSVar(html, '--ink-muted', d.inkMuted);
      html = replaceCSSVar(html, '--hairline', d.hairline);
      // Apply dark theme class
      if (isDark) {
        html = html.replace('class="light"', 'class="dark"');
      }
      html = html.replaceAll('{{KICKER}}', c.kicker);
      html = html.replaceAll('{{TITLE}}', c.title);
      html = html.replaceAll('{{SUBTITLE}}', c.subtitle);
      html = html.replaceAll('{{BODY_HTML}}', c.body_html);
      html = html.replaceAll('{{LOGO}}', logoPath);
      html = html.replaceAll('{{BRAND_NAME}}', displayName);
      break;
    }
    case 'whiteboard': {
      html = replaceCSSVar(html, '--bg', d.canvas);
      html = replaceCSSVar(html, '--surface-1', d.surface1);
      html = replaceCSSVar(html, '--surface-2', d.surface2);
      html = replaceCSSVar(html, '--accent', d.accent);
      html = replaceCSSVar(html, '--ink', d.ink);
      html = replaceCSSVar(html, '--ink-muted', d.inkMuted);
      html = replaceCSSVar(html, '--hairline', d.hairline);
      html = html.replaceAll('{{SUBTITLE}}', c.subtitle);
      html = html.replaceAll('{{TITLE_HTML}}', c.title_html);
      html = html.replaceAll('{{STEPS_HTML}}', c.steps_html);
      html = html.replaceAll('{{LOGO}}', logoPath);
      html = html.replaceAll('{{BRAND_NAME}}', displayName);
      break;
    }
    case 'poster': {
      html = html.replaceAll('{{BG_COLOR}}', d.canvas);
      html = html.replaceAll('{{ACCENT_COLOR}}', d.accent);
      // Also set ink/hairline for poster body text
      html = replaceCSSVar(html, '--ink', d.ink);
      html = replaceCSSVar(html, '--ink-muted', d.inkMuted);
      html = replaceCSSVar(html, '--hairline', d.hairline);
      html = replaceCSSVar(html, '--surface-1', d.surface1);
      html = replaceCSSVar(html, '--surface-2', d.surface2);
      // Title card: no header, title block + body + colophon
      html = html.replaceAll('{{HEADER_BLOCK}}', '');
      html = html.replaceAll('{{TITLE_BLOCK}}', `
    <div class="title-area">
      <h1>${c.title}</h1>
      <p class="subtitle">${c.subtitle}</p>
      <span class="topic-tag">${c.topic_tag}</span>
    </div>
      `);
      html = html.replaceAll('{{BODY_HTML}}', c.body_html);
      html = html.replaceAll('{{PAGE_INFO}}', '');
      html = html.replaceAll('{{COLOPHON_BLOCK}}', `
    <div class="colophon">
      <div class="brand-mark">
        <div class="stripe-bar"></div>
        <span>${displayName}</span>
      </div>
      <img class="logo-mark" src="${logoPath}" alt="logo">
    </div>
      `);
      html = html.replaceAll('{{LOGO}}', logoPath);
      html = html.replaceAll('{{BRAND_NAME}}', displayName);
      break;
    }
    case 'comic': {
      // Comic is quiet monochrome — minimal design system influence
      html = html.replaceAll('{{HEADER_BLOCK}}', '');
      html = html.replaceAll('{{TITLE_BLOCK}}', `
    <div class="title-area">
      <h1>${c.title}</h1>
      <p class="subtitle">${c.subtitle}</p>
      <span class="series-tag">${c.series_tag}</span>
    </div>
      `);
      html = html.replaceAll('{{PANELS_HTML}}', c.panel_html);
      html = html.replaceAll('{{PAGE_INFO}}', '');
      html = html.replaceAll('{{COLOPHON_BLOCK}}', `
    <div class="colophon">
      <div class="brand-mark">
        <div class="stripe-bar"></div>
        <span>${displayName}</span>
      </div>
      <span class="endmark">■</span>
    </div>
      `);
      html = html.replaceAll('{{LOGO}}', logoPath);
      html = html.replaceAll('{{BRAND_NAME}}', displayName);
      break;
    }
    case 'sketchnote': {
      html = replaceCSSVar(html, '--bg', d.canvas);
      html = replaceCSSVar(html, '--surface-1', d.surface1);
      html = replaceCSSVar(html, '--surface-2', d.surface2);
      html = replaceCSSVar(html, '--accent-1', d.accent);
      // Edge mode acceptance: keep sketchnote in the same quiet-paper
      // accent family instead of generating a decorative triad.
      html = replaceCSSVar(html, '--accent-2', mixHex(d.accent, d.inkMuted, 0.48));
      const accent3 = mixHex(d.accent, d.surface1, 0.36);
      html = replaceCSSVar(html, '--accent-3', accent3);
      html = replaceCSSVar(html, '--accent-3-soft', softAccent(accent3));
      html = replaceCSSVar(html, '--ink', d.ink);
      html = replaceCSSVar(html, '--ink-muted', d.inkMuted);
      html = replaceCSSVar(html, '--ink-strong', d.ink);
      html = replaceCSSVar(html, '--hairline', d.hairline);
      html = html.replaceAll('{{TITLE}}', c.title);
      html = html.replaceAll('{{SUBTITLE}}', c.subtitle);
      html = html.replaceAll('{{CONTENT_HTML}}', c.content_html);
      html = html.replaceAll('{{CUSTOM_CSS}}', c.custom_css);
      html = html.replaceAll('{{LOGO}}', logoPath);
      html = html.replaceAll('{{BRAND_NAME}}', displayName);
      html = html.replaceAll('{{SOURCE_LINE}}', c.source_line);
      break;
    }
  }
  return html;
}

function replaceCSSVar(html, varName, value) {
  // Replace in :root { --var: ... } blocks
  const regex = new RegExp(`(--${varName.replace('--', '')}):\\s*[^;]+;`, 'g');
  return html.replace(regex, `$1: ${value};`);
}

function mixHex(hexA, hexB, amount = 0.5) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const mix = (x, y) => Math.round(x * (1 - amount) + y * amount);
  return rgbToHex(mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b));
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// Simple hue shift for generating accent-2/accent-3 from a single accent color
function shiftHue(hex, degrees) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Convert to HSL, shift hue, convert back
  const [h, s, l] = rgbToHsl(r, g, b);
  const h2 = (h + degrees / 360) % 1;
  const [r2, g2, b2] = hslToRgb(h2, s, l);
  return `#${r2.toString(16).padStart(2,'0')}${g2.toString(16).padStart(2,'0')}${b2.toString(16).padStart(2,'0')}`;
}

// Generate a softer (lighter, less saturated) version of a color for accent-3-soft
function softAccent(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [r2, g2, b2] = hslToRgb(h, s * 0.6, Math.min(l + 0.15, 0.75));
  return `#${r2.toString(16).padStart(2,'0')}${g2.toString(16).padStart(2,'0')}${b2.toString(16).padStart(2,'0')}`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ═══════════════════════════════════════════════════════════
// Gallery Page Generator
// ═══════════════════════════════════════════════════════════

function generateGalleryPage(results) {
  // results: { mode: [ { design, status, path } ] }
  const modeLabels = {
    infograph: 'Infograph',
    big: 'Big',
    long: 'Long',
    whiteboard: 'Whiteboard',
    poster: 'Poster',
    comic: 'Comic',
    sketchnote: 'Sketchnote',
  };

  const tabs = MODES.map(m => `<button class="tab${m === MODES[0] ? ' active' : ''}" data-mode="${m}">${modeLabels[m]}</button>`).join('\n');

  const sections = MODES.map(m => {
    const items = (results[m] || []).filter(r => r.status !== 'skipped').map(r => {
      const d = DESIGNS[r.design];
      const relPath = r.status === 'ok' ? `output/${m}/${r.design}.png` : '';
      const errorMarker = r.status === 'fail' ? '<div class="error-badge">FAIL</div>' : '';
      return `
        <div class="card">
          <div class="card-img">
            ${relPath ? `<img src="${relPath}" alt="${r.design} ${m}" loading="lazy">` : '<div class="placeholder">No image</div>'}
            ${errorMarker}
          </div>
          <div class="card-info">
            <div class="card-name">${r.design.replace('ljg_', 'ljg-')}</div>
            <div class="card-category">${d ? d.category : ''}</div>
            <div class="color-dots">
              <span class="dot" style="background:${d ? d.canvas : '#ccc'}"></span>
              <span class="dot" style="background:${d ? d.accent : '#ccc'}"></span>
              <span class="dot" style="background:${d ? d.ink : '#ccc'}"></span>
            </div>
          </div>
        </div>`;
    }).join('\n');
    const note = m === 'comic'
      ? '<p class="section-note">Comic mode uses a fixed quiet monochrome palette. Brand color is intentionally suppressed, only 1 example rendered.</p>'
      : '';
    return `<div class="section${m === MODES[0] ? ' active' : ''}" id="section-${m}">
      <div class="section-header">
        <h2>${modeLabels[m]}</h2>
        <span class="count">${(results[m] || []).filter(r => r.status === 'ok').length} renders</span>
      </div>
      ${note}
      <div class="grid">${items}</div>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>card gallery</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', -apple-system, 'Helvetica Neue', sans-serif; background: #f5f0e8; color: #2c2418; }
  .header { background: rgba(245,240,232,0.96); border-bottom: 1px solid #d8cdbc; padding: 24px 32px; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(8px); }
  .header h1 { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
  .tabs { display: flex; gap: 6px; overflow-x: auto; }
  .tab { padding: 8px 18px; border: 1px solid #d8cdbc; border-radius: 6px; background: #fbfaf6; color: #6b6050; cursor: pointer; font-size: 14px; font-weight: 500; white-space: nowrap; }
  .tab:hover { background: #f8f4eb; }
  .tab.active { background: #2c2418; color: #f5f0e8; border-color: #2c2418; }
  .main { padding: 24px 32px; }
  .section { display: none; }
  .section.active { display: block; }
  .section-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; }
  .section-header h2 { font-size: 28px; font-weight: 700; }
  .count { font-size: 14px; color: #8a8176; }
  .section-note { font-size: 13px; color: #6b6050; margin-bottom: 16px; padding: 8px 12px; background: #fbfaf6; border: 1px solid #d8cdbc; border-radius: 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
  .card { background: #fbfaf6; border-radius: 8px; overflow: hidden; border: 1px solid #d8cdbc; }
  .card-img { position: relative; background: #f8f4eb; }
  .card-img img { width: 100%; height: auto; display: block; }
  .placeholder { height: 200px; display: flex; align-items: center; justify-content: center; color: #aaa; }
  .error-badge { position: absolute; top: 8px; right: 8px; background: #e53e3e; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
  .card-info { padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
  .card-name { font-size: 14px; font-weight: 600; flex: 1; }
  .card-category { font-size: 12px; color: #8a8176; }
  .color-dots { display: flex; gap: 4px; }
  .dot { width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(44,36,24,0.16); }
  /* Lightbox */
  .lightbox { display: none; position: fixed; inset: 0; background: rgba(31,29,25,0.88); z-index: 1000; align-items: center; justify-content: center; cursor: zoom-out; }
  .lightbox.open { display: flex; }
  .lightbox img { max-width: 95vw; max-height: 95vh; object-fit: contain; }
</style>
</head>
<body>

<div class="header">
  <h1>card gallery, quiet-paper mode matrix</h1>
  <div class="tabs">${tabs}</div>
</div>

<div class="main">
  ${sections}
</div>

<div class="lightbox" id="lightbox">
  <img id="lightbox-img" src="" alt="">
</div>

<script>
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('section-' + tab.dataset.mode).classList.add('active');
    });
  });
  // Lightbox
  document.querySelectorAll('.card-img img').forEach(img => {
    img.addEventListener('click', () => {
      document.getElementById('lightbox-img').src = img.src;
      document.getElementById('lightbox').classList.add('open');
    });
  });
  document.getElementById('lightbox').addEventListener('click', () => {
    document.getElementById('lightbox').classList.remove('open');
  });
</script>

</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════

const designNames = DESIGN_FILTER ? [DESIGN_FILTER] : Object.keys(DESIGNS);
const modesToRender = MODE_FILTER ? [MODE_FILTER] : MODES;

// Create output directories
for (const mode of modesToRender) {
  fs.mkdirSync(path.join(OUTPUT_DIR, mode), { recursive: true });
}
fs.mkdirSync(path.join(ROOT, 'gallery'), { recursive: true });

const results = {};
let totalOk = 0, totalFail = 0;

for (const mode of modesToRender) {
  results[mode] = [];
  // Comic uses fixed quiet monochrome palette — design systems have no visual effect.
  // Render only 1 example to show the template works, skip the rest.
  const designList = mode === 'comic' ? designNames.slice(0, 1) : designNames;
  for (const designName of designList) {
    if (!isCompatible(mode, designName)) {
      results[mode].push({ design: designName, status: 'skipped', path: '' });
      continue;
    }

    const htmlPath = path.join(OUTPUT_DIR, mode, `${designName}.html`);
    const pngPath = path.join(OUTPUT_DIR, mode, `${designName}.png`);

    try {
      const html = fillTemplate(mode, designName);
      fs.writeFileSync(htmlPath, html);

      if (DRY_RUN) {
        results[mode].push({ design: designName, status: 'ok', path: pngPath });
        totalOk++;
        console.log(`  [DRY] ${mode}/${designName}`);
        continue;
      }

      // Fixed-canvas modes (big, poster, comic) must NOT use fullpage —
      // body min-height:100vh in a 5000px viewport causes massive whitespace.
      // See mode-big.md Step 5: "不用 fullpage——-b 模具是固定画布 1080x1440"
      const isFixedCanvas = mode === 'big' || mode === 'poster' || mode === 'comic';
      const captureArgs = isFixedCanvas ? '1080 1440 2' : '1080 1440 2 fullpage';

      execSync(`node "${CAPTURE}" "${htmlPath}" "${pngPath}" ${captureArgs}`, {
        timeout: 30000,
        stdio: 'pipe',
      });
      results[mode].push({ design: designName, status: 'ok', path: pngPath });
      totalOk++;
      console.log(`  ✓ ${mode}/${designName}`);
    } catch (e) {
      results[mode].push({ design: designName, status: 'fail', path: '' });
      totalFail++;
      console.error(`  ✗ ${mode}/${designName} — ${e.message.split('\n')[0]}`);
    }
  }
}

// Generate gallery page — scan disk for ALL modes (not just rendered ones)
const galleryResults = {};
for (const m of MODES) {
  galleryResults[m] = [];
  // Use rendered results if available
  if (results[m]) {
    galleryResults[m] = results[m];
    continue;
  }
  // Otherwise scan disk for existing PNGs
  for (const designName of Object.keys(DESIGNS)) {
    if (!isCompatible(m, designName)) continue;
    const pngPath = path.join(OUTPUT_DIR, m, `${designName}.png`);
    galleryResults[m].push({
      design: designName,
      status: fs.existsSync(pngPath) ? 'ok' : 'missing',
      path: pngPath,
    });
  }
}
const galleryHtml = generateGalleryPage(galleryResults);
fs.writeFileSync(path.join(ROOT, 'gallery', 'index.html'), galleryHtml);

const totalSkipped = Object.values(results).flat().filter(r => r.status === 'skipped').length;
console.log(`\nDone: ${totalOk} ok, ${totalFail} fail, ${totalSkipped} skipped`);
console.log(`Gallery: ${path.join(ROOT, 'gallery', 'index.html')}`);
if (DRY_RUN) console.log('(dry-run mode — no screenshots captured)');
