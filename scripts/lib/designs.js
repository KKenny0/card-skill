/**
 * Design token registry for cast CLI.
 * Extracted from references/design-index.md + gallery_render.js DESIGNS catalog.
 *
 * Each design provides CSS-variable-ready tokens:
 *   canvas   → --bg
 *   accent   → --accent
 *   ink      → --ink (renderer applies saturation reduction for print feel)
 *   inkMuted → --ink-muted
 *   surface1 → --surface-1
 *   surface2 → --surface-2
 *   hairline → --hairline
 *   surface  → 'light' | 'dark' (determines theme toggle)
 *   radius   → --radius (border-radius token, e.g. '6px', '12px')
 */

const DESIGNS = {
  // ── Dark Minimal ──
  linear:       { surface:'dark', canvas:'#010102', accent:'#5e6ad2', ink:'#f7f8f8', inkMuted:'#8b8f98', surface1:'#0a0a10', surface2:'#14141c', hairline:'#23252a', radius:'12px' },
  vercel:       { surface:'dark', canvas:'#000000', accent:'#ffffff', ink:'#ededed', inkMuted:'#888888', surface1:'#0a0a0a', surface2:'#171717', hairline:'#222222', radius:'8px' },

  // ── Dark Cinematic ──
  spotify:      { surface:'dark', canvas:'#121212', accent:'#1db954', ink:'#ffffff', inkMuted:'#b3b3b3', surface1:'#1a1a1a', surface2:'#282828', hairline:'#333333', radius:'12px' },

  // ── Light Minimal ──
  apple:        { surface:'light', canvas:'#fbfbfd', accent:'#0071e3', ink:'#1d1d1f', inkMuted:'#86868b', surface1:'#f5f5f7', surface2:'#e8e8ed', hairline:'#d2d2d7', radius:'16px' },
  expo:         { surface:'light', canvas:'#fafafa', accent:'#000000', ink:'#171717', inkMuted:'#555555', surface1:'#f0f0f0', surface2:'#e5e5e5', hairline:'#d0d0d0', radius:'8px' },
  notion:       { surface:'light', canvas:'#fafafa', accent:'#5645d4', ink:'#1a1a1a', inkMuted:'#6b6b6b', surface1:'#f0f0f0', surface2:'#e8e8e8', hairline:'#d8d8d8', radius:'6px' },

  // ── Light Editorial ──
  claude:       { surface:'light', canvas:'#f5f0e8', accent:'#c47050', ink:'#2c2418', inkMuted:'#6b6050', surface1:'#ede7db', surface2:'#e4dcd0', hairline:'#d4c9b8', radius:'8px' },
  cursor:       { surface:'light', canvas:'#f7f7f4', accent:'#e04a00', ink:'#26251e', inkMuted:'#6b6860', surface1:'#efefe8', surface2:'#e6e6dc', hairline:'#d0cfc4', radius:'8px' },
  intercom:     { surface:'light', canvas:'#f5f1ec', accent:'#111111', ink:'#222222', inkMuted:'#6b6055', surface1:'#ede8e0', surface2:'#e3ddd2', hairline:'#d0c8ba', radius:'24px' },
  replicate:    { surface:'light', canvas:'#f9f7f3', accent:'#d42504', ink:'#282020', inkMuted:'#6b5f5f', surface1:'#f0ece5', surface2:'#e6e0d5', hairline:'#d4ccc0', radius:'8px' },
  posthog:      { surface:'light', canvas:'#eeefe9', accent:'#e09500', ink:'#28251d', inkMuted:'#6b6555', surface1:'#e4e5dc', surface2:'#daded0', hairline:'#c8c8b8', radius:'8px' },
  clay:         { surface:'light', canvas:'#fffaf0', accent:'#0a0a0a', ink:'#1a1a1a', inkMuted:'#6b6050', surface1:'#f5efe5', surface2:'#ebe4d5', hairline:'#d8d0c0', radius:'16px' },

  // ── Technical Data (light) ──
  stripe:       { surface:'light', canvas:'#f6f9fc', accent:'#5530e0', ink:'#0d2540', inkMuted:'#4a5568', surface1:'#eef2f7', surface2:'#e3e8ee', hairline:'#d0d5dd', radius:'6px' },
  ibm:          { surface:'light', canvas:'#f5f5f5', accent:'#0f62fe', ink:'#161616', inkMuted:'#555555', surface1:'#ebebeb', surface2:'#e0e0e0', hairline:'#c8c8c8', radius:'0px' },
  opencode:     { surface:'light', canvas:'#fdfcfc', accent:'#201d1d', ink:'#201d1d', inkMuted:'#6b6860', surface1:'#f4f3f0', surface2:'#eae8e4', hairline:'#d0cec8', radius:'6px' },

  // ── Technical Data (dark) ──
  sentry:       { surface:'dark', canvas:'#000000', accent:'#362d59', ink:'#ffffff', inkMuted:'#8a8f98', surface1:'#0a0a0c', surface2:'#141418', hairline:'#222228', radius:'8px' },
  raycast:      { surface:'dark', canvas:'#0a0a0a', accent:'#ff6363', ink:'#ffffff', inkMuted:'#8a8f98', surface1:'#111114', surface2:'#1a1a1e', hairline:'#24242a', radius:'12px' },
  together_ai:  { surface:'dark', canvas:'#000000', accent:'#3b82f6', ink:'#ffffff', inkMuted:'#8a8f98', surface1:'#0a0a0c', surface2:'#141418', hairline:'#222228', radius:'8px' },

  // ── ljg-card tones ──
  ljg_chensi:   { surface:'light', canvas:'#F5F2ED', accent:'#8B5E3C', ink:'#2D2926', inkMuted:'#6b6055', surface1:'#ece8e0', surface2:'#e2ddd2', hairline:'#d0c8b8', radius:'6px' },
  ljg_ruili:    { surface:'light', canvas:'#EDEDF0', accent:'#C82820', ink:'#2D2926', inkMuted:'#555555', surface1:'#e4e4e8', surface2:'#d8d8dc', hairline:'#c8c8cc', radius:'6px' },
  ljg_wennuan:  { surface:'light', canvas:'#F7F4EF', accent:'#B07040', ink:'#2D2926', inkMuted:'#6b6050', surface1:'#eee8df', surface2:'#e3dcd0', hairline:'#d0c8b8', radius:'8px' },
  ljg_jishu:    { surface:'light', canvas:'#F0F3F7', accent:'#1A8360', ink:'#2D2926', inkMuted:'#505860', surface1:'#e5e8ee', surface2:'#d8dce5', hairline:'#c0c5d0', radius:'6px' },
  ljg_keyan:    { surface:'light', canvas:'#F2F6F4', accent:'#C08040', ink:'#2D2926', inkMuted:'#506055', surface1:'#e8ece8', surface2:'#dce2dc', hairline:'#c5cdc5', radius:'6px' },
  ljg_chuangyi: { surface:'light', canvas:'#F6F3F2', accent:'#A03828', ink:'#2D2926', inkMuted:'#6b5850', surface1:'#ede8e5', surface2:'#e2dcd5', hairline:'#d0c8c0', radius:'8px' },
  ljg_shangye:  { surface:'light', canvas:'#F4F3F0', accent:'#2A6048', ink:'#2D2926', inkMuted:'#555550', surface1:'#eae8e2', surface2:'#dddad2', hairline:'#c8c5b8', radius:'4px' },
  ljg_moren:    { surface:'light', canvas:'#F2F2F2', accent:'#D01858', ink:'#2D2926', inkMuted:'#555555', surface1:'#e8e8e8', surface2:'#dddcdc', hairline:'#c8c8c8', radius:'6px' },
};

function getDesign(name) {
  // Accept underscore, hyphen, and dot forms (e.g. "together.ai" → "together_ai")
  const key = name.replace(/[.\-]/g, '_');
  return DESIGNS[key] || null;
}

function listDesigns() {
  return Object.keys(DESIGNS).map(k => {
    const d = DESIGNS[k];
    return { name: k, surface: d.surface, accent: d.accent, canvas: d.canvas };
  });
}

/**
 * Generate CSS variable overrides for a design system.
 * Returns a string like: --bg: #xxx; --accent: #xxx; ...
 */
function cssOverrides(designName) {
  const d = getDesign(designName);
  if (!d) return '';
  return [
    `--bg: ${d.canvas};`,
    `--surface-1: ${d.surface1};`,
    `--surface-2: ${d.surface2};`,
    `--accent: ${d.accent};`,
    `--ink: ${d.ink};`,
    `--ink-muted: ${d.inkMuted};`,
    `--hairline: ${d.hairline};`,
    `--radius: ${d.radius};`,
  ].join('\n    ');
}

module.exports = { DESIGNS, getDesign, listDesigns, cssOverrides };
