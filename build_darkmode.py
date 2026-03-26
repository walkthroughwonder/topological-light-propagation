#!/usr/bin/env python3
"""
Build Wolfram Dark Mode — adds a complete dark theme overlay triggered by
[data-theme="dark"] on <html>. Also adds a theme toggle button and JS logic
with localStorage persistence.

Dark mode palette (Wolfram-inspired):
  Background: #111111
  Surface:    #1A1A1A  
  Elevated:   #222222
  Border:     #333333
  Text:       #E8E8E8
  Muted text: #999999
  Accent:     #E86C00 (unchanged)
  Accent hover: #FF8C2A
  Canvas bg:  #0D0D0F (3D viewport stays dark in both modes)
  Mini canvas: #111111
"""

INPUT = '/home/user/workspace/hypergraph-viz/index.html'

with open(INPUT, 'r') as f:
    content = f.read()

# ═══════════════════════════════════════════════════════════════
# 1. DARK MODE CSS — insert before </style>
# ═══════════════════════════════════════════════════════════════

dark_css = """
  /* ═══════════════════════════════════════════════════════════
     WOLFRAM DARK MODE
     Activated by <html data-theme="dark">
     ═══════════════════════════════════════════════════════════ */

  /* ─── BASE ─── */
  [data-theme="dark"] html, [data-theme="dark"] body,
  html[data-theme="dark"], html[data-theme="dark"] body {
    background: #111111;
    color: #E8E8E8;
  }

  /* ─── PANELS ─── */
  [data-theme="dark"] .panel {
    background: #161616 !important;
    border-color: #2A2A2A !important;
    scrollbar-color: #333333 transparent;
  }
  [data-theme="dark"] .panel:last-child {
    background: #161616 !important;
    border-color: #2A2A2A !important;
  }

  /* ─── CENTER CANVAS (stays dark in both modes) ─── */
  [data-theme="dark"] #center {
    background: #0a0a0c;
  }

  /* ─── SECTION TITLES ─── */
  [data-theme="dark"] .section-title {
    color: #777777;
    border-bottom-color: #2A2A2A;
  }

  /* ─── TYPOGRAPHY ─── */
  [data-theme="dark"] .subsection h3 {
    color: #E8E8E8;
  }
  [data-theme="dark"] .subsection p,
  [data-theme="dark"] .subsection .desc,
  [data-theme="dark"] .desc {
    color: #999999;
  }
  [data-theme="dark"] .panel h3, [data-theme="dark"] .panel h4 {
    color: #E8E8E8;
  }
  [data-theme="dark"] .panel p, [data-theme="dark"] .panel span,
  [data-theme="dark"] .panel label {
    color: #BBBBBB;
  }

  /* ─── COLLAPSIBLE HEADERS ─── */
  [data-theme="dark"] .collapsible-header:hover {
    color: #E8E8E8;
  }
  [data-theme="dark"] .collapsible-header .chevron {
    color: #666666;
  }

  /* ─── RULE EDITOR ─── */
  [data-theme="dark"] .rule-row input {
    background: #1E1E1E !important;
    border-color: #333333 !important;
    color: #E8E8E8 !important;
  }
  [data-theme="dark"] .rule-arrow {
    color: #666666 !important;
  }
  [data-theme="dark"] .rule-del {
    color: #555555 !important;
  }
  [data-theme="dark"] .rule-del:hover {
    color: #FF6B6B !important;
  }
  [data-theme="dark"] .rule-add {
    background: #1E1E1E !important;
    border-color: #333333 !important;
    color: #999999 !important;
  }
  [data-theme="dark"] .rule-add:hover {
    border-color: #E86C00 !important;
    color: #E86C00 !important;
  }

  /* ─── INIT INPUT ─── */
  [data-theme="dark"] .init-input {
    background: #1E1E1E !important;
    border-color: #333333 !important;
    color: #E8E8E8 !important;
  }

  /* ─── PRESET BUTTONS ─── */
  [data-theme="dark"] .preset-btn {
    background: #1E1E1E;
    border-color: #333333;
    color: #BBBBBB;
  }
  [data-theme="dark"] .preset-btn:hover {
    background: #252525;
    border-color: #555555;
    color: #E8E8E8;
  }
  [data-theme="dark"] .preset-btn.active {
    background: rgba(232,108,0,0.12);
    border-color: #E86C00;
    color: #E86C00;
  }

  /* ─── VIEW SWITCHER ─── */
  [data-theme="dark"] #view-switcher {
    background: rgba(22,22,22,0.95) !important;
    border-color: #333333 !important;
    backdrop-filter: blur(12px);
  }
  [data-theme="dark"] .view-tab {
    color: #777777;
  }
  [data-theme="dark"] .view-tab:hover {
    color: #CCCCCC;
    border-bottom-color: #555555;
  }
  [data-theme="dark"] .view-tab.active {
    color: #E86C00;
    border-bottom-color: #E86C00;
  }

  /* ─── SCENES BUTTON ─── */
  [data-theme="dark"] #scenes-btn {
    background: #1E1E1E !important;
    border-color: #333333 !important;
    color: #BBBBBB !important;
  }
  [data-theme="dark"] #scenes-btn:hover {
    border-color: #E86C00 !important;
    color: #E86C00 !important;
    background: #222222 !important;
  }
  [data-theme="dark"] #scenes-btn.open {
    background: #E86C00 !important;
    color: #FFFFFF !important;
    border-color: #E86C00 !important;
  }

  /* ─── SCENES PANEL ─── */
  [data-theme="dark"] #scenes-panel {
    background: rgba(22,22,22,0.97) !important;
    border-color: #333333 !important;
    box-shadow: 0 12px 40px rgba(0,0,0,0.5) !important;
  }
  [data-theme="dark"] #scenes-panel::-webkit-scrollbar-thumb {
    background: #444444;
  }
  [data-theme="dark"] .scene-card {
    color: #CCCCCC !important;
  }
  [data-theme="dark"] .scene-card:hover {
    background: #222222 !important;
    border-color: #444444 !important;
  }
  [data-theme="dark"] .scene-card.active {
    background: rgba(232,108,0,0.08) !important;
    border-color: rgba(232,108,0,0.3) !important;
  }
  [data-theme="dark"] .scene-card .scene-name {
    color: #E8E8E8 !important;
  }
  [data-theme="dark"] .scene-card .scene-desc {
    color: #999999 !important;
  }
  [data-theme="dark"] .scene-tag {
    background: rgba(232,108,0,0.15) !important;
  }
  [data-theme="dark"] .scene-group-title {
    color: #666666 !important;
  }

  /* ─── ACTION BUTTON ─── */
  [data-theme="dark"] button.action-btn {
    background: #1E1E1E;
    border-color: #333333;
    color: #CCCCCC;
  }
  [data-theme="dark"] button.action-btn:hover {
    background: rgba(232,108,0,0.12);
    border-color: rgba(232,108,0,0.3);
    color: #E86C00;
  }

  /* ─── RANGE INPUTS ─── */
  [data-theme="dark"] input[type="range"] {
    background: #333333 !important;
  }
  [data-theme="dark"] input[type="range"]::-webkit-slider-thumb {
    background: #444444 !important;
    border-color: #666666 !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4) !important;
  }
  [data-theme="dark"] input[type="range"]:hover::-webkit-slider-thumb {
    background: #E86C00 !important;
    border-color: rgba(232,108,0,0.4) !important;
  }

  /* ─── SELECT DROPDOWN ─── */
  [data-theme="dark"] select {
    background: #1E1E1E !important;
    border-color: #333333 !important;
    color: #E8E8E8 !important;
  }

  /* ─── OBSERVER PANEL ─── */
  [data-theme="dark"] #quantum-observer-panel {
    background: #1A1A1A !important;
    border-color: #2A2A2A !important;
  }
  [data-theme="dark"] #quantum-observer-panel p,
  [data-theme="dark"] #quantum-observer-panel span {
    color: #BBBBBB;
  }
  [data-theme="dark"] #quantum-observer-panel em {
    color: #BBBBBB;
  }

  /* ─── COARSE-GRAINING ─── */
  [data-theme="dark"] .cg-labels {
    color: #666666;
  }
  [data-theme="dark"] .cg-val {
    color: rgba(232,108,0,0.8);
  }
  [data-theme="dark"] .ci-gauge-bar {
    background: #2A2A2A !important;
  }
  [data-theme="dark"] .cg-edge-legend {
    color: #666666;
  }
  [data-theme="dark"] .cg-narrative {
    color: #BBBBBB !important;
    background: rgba(232,108,0,0.06) !important;
    border-left-color: rgba(232,108,0,0.4) !important;
  }
  [data-theme="dark"] .cg-narrative strong {
    color: #E86C00 !important;
  }
  [data-theme="dark"] .cg-narrative em {
    color: #E86C00 !important;
  }
  [data-theme="dark"] .cg-completion-rules {
    background: #1A1A1A !important;
    border-color: #2A2A2A !important;
    color: #999999 !important;
    scrollbar-color: #333333 transparent;
  }
  [data-theme="dark"] .cg-stats .cg-stat-label {
    color: #777777;
  }
  [data-theme="dark"] .cg-stats .cg-stat-value {
    color: #E86C00;
  }

  /* ─── COMPLETION LOG ─── */
  [data-theme="dark"] #completion-log {
    background: #1A1A1A !important;
    border-color: #2A2A2A !important;
    color: #888888 !important;
  }

  /* ─── OBSERVER ANALYSIS ─── */
  [data-theme="dark"] .observer-analysis {
    color: #BBBBBB;
  }
  [data-theme="dark"] .observer-clear {
    background: #222222 !important;
    border-color: #333333 !important;
    color: #999999 !important;
  }
  [data-theme="dark"] .observer-clear:hover {
    background: #333333 !important;
    color: #CCCCCC !important;
  }
  [data-theme="dark"] .oa-bar-label {
    color: #999999 !important;
  }

  /* ─── TOOL SECTIONS ─── */
  [data-theme="dark"] .tool-title {
    color: #E8E8E8 !important;
  }
  [data-theme="dark"] .tool-desc {
    color: #999999 !important;
  }
  [data-theme="dark"] .tool-result {
    background: #1A1A1A !important;
    border-color: #2A2A2A !important;
    color: #BBBBBB !important;
  }
  [data-theme="dark"] .tool-toggle {
    background: #2A2A2A !important;
    border-color: #333333 !important;
  }
  [data-theme="dark"] .geodesic-mode .tool-desc {
    color: #B87333 !important;
  }

  /* ─── FRAME CHIPS ─── */
  [data-theme="dark"] .tool-btn {
    background: #1E1E1E !important;
    border-color: #333333 !important;
    color: #999999 !important;
  }
  [data-theme="dark"] .tool-btn:hover {
    border-color: #E86C00 !important;
    color: #E86C00 !important;
  }
  [data-theme="dark"] .tool-btn.active {
    background: #E86C00 !important;
    color: #FFFFFF !important;
    border-color: #E86C00 !important;
  }

  /* ─── STAT ROWS ─── */
  [data-theme="dark"] .stat-row {
    color: #999999 !important;
    border-bottom-color: #2A2A2A !important;
  }
  [data-theme="dark"] .stat-row .stat-value {
    color: #E8E8E8 !important;
  }

  /* ─── CANVAS ELEMENTS (already dark, ensure consistency) ─── */
  [data-theme="dark"] #intensity-canvas {
    background: #111111 !important;
    border-color: #2A2A2A !important;
  }
  [data-theme="dark"] #branchial-canvas {
    background: #111111 !important;
    border-color: #2A2A2A !important;
  }
  [data-theme="dark"] #ricci-canvas, [data-theme="dark"] #geodev-canvas {
    background: #111111 !important;
    border-color: #2A2A2A !important;
  }
  [data-theme="dark"] #tunneling-canvas {
    background: #111111 !important;
    border-color: #2A2A2A !important;
  }
  [data-theme="dark"] #dim-canvas {
    background: #111111 !important;
    border-color: #2A2A2A !important;
  }
  [data-theme="dark"] #speed-canvas {
    background: #111111 !important;
    border-color: #2A2A2A !important;
  }
  [data-theme="dark"] #persistence-canvas {
    background: #111111 !important;
    border-color: #2A2A2A !important;
  }
  [data-theme="dark"] #zeno-canvas {
    background: #111111 !important;
    border-color: #2A2A2A !important;
  }
  [data-theme="dark"] #asymmetry-canvas {
    background: #111111 !important;
    border-color: #2A2A2A !important;
  }
  [data-theme="dark"] #holographic-canvas {
    background: #111111 !important;
    border-color: #2A2A2A !important;
  }

  /* ─── BRANCHIAL GRAPH CONTAINER ─── */
  [data-theme="dark"] #branchial-graph-container,
  [data-theme="dark"] .branchial-mini {
    background: #111111 !important;
    border-color: #2A2A2A !important;
  }

  /* ─── SPACETIME CONTROLS ─── */
  [data-theme="dark"] #spacetime-controls {
    background: rgba(22,22,22,0.97) !important;
    border-color: #333333 !important;
  }
  [data-theme="dark"] #spacetime-controls input,
  [data-theme="dark"] #spacetime-controls select {
    background: #1E1E1E !important;
    border-color: #333333 !important;
    color: #E8E8E8 !important;
  }
  [data-theme="dark"] #spacetime-controls label,
  [data-theme="dark"] #spacetime-controls .ctrl-label {
    color: #999999 !important;
  }

  /* ─── ST DIMENSION READOUT ─── */
  [data-theme="dark"] .st-dim-readout {
    background: #1A1A1A !important;
    border-color: #2A2A2A !important;
  }
  [data-theme="dark"] .st-dim-label {
    color: #777777 !important;
  }

  /* ─── ST EVOLVE BUTTON ─── */
  [data-theme="dark"] #btn-st-evolve {
    background: #E86C00 !important;
    color: #FFFFFF !important;
  }
  [data-theme="dark"] #btn-st-evolve:hover {
    background: #FF8C2A !important;
  }

  /* ─── ST INFO ELEMENTS ─── */
  [data-theme="dark"] #st-cone-info, [data-theme="dark"] #st-entangle-info {
    background: #1A1A1A !important;
    border-color: #2A2A2A !important;
    color: #BBBBBB !important;
  }

  /* ─── KBD HINTS ─── */
  [data-theme="dark"] kbd, [data-theme="dark"] .kbd-hint {
    background: #222222 !important;
    border-color: #444444 !important;
    color: #999999 !important;
  }

  /* ─── STATUS BAR & FOOTER ─── */
  [data-theme="dark"] #status-bar {
    color: rgba(255,255,255,0.45) !important;
  }
  [data-theme="dark"] footer a {
    color: rgba(255,255,255,0.30) !important;
  }
  [data-theme="dark"] footer a:hover {
    color: #E86C00 !important;
  }

  /* ─── SCROLLBARS ─── */
  [data-theme="dark"] .panel::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.12) !important;
  }
  [data-theme="dark"] .panel::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.20) !important;
  }

  /* ─── INLINE STYLE OVERRIDES ─── */
  [data-theme="dark"] .panel [style*="color:rgba(255,255,255"],
  [data-theme="dark"] .panel [style*="color: rgba(255,255,255"] {
    /* Already light text — fine on dark background */
  }
  [data-theme="dark"] .panel [style*="color:#999999"],
  [data-theme="dark"] .panel [style*="color: #999999"] {
    color: #888888 !important;
  }
  [data-theme="dark"] .panel [style*="color:#555555"],
  [data-theme="dark"] .panel [style*="color: #555555"] {
    color: #AAAAAA !important;
  }
  [data-theme="dark"] .panel [style*="color:#777777"],
  [data-theme="dark"] .panel [style*="color: #777777"] {
    color: #999999 !important;
  }

  /* ─── SAFETY WARNING ─── */
  [data-theme="dark"] .safety-warning {
    background: rgba(232,108,0,0.08) !important;
    border-color: rgba(232,108,0,0.2) !important;
    color: #BBBBBB !important;
  }

  /* ─── TANGLE ITEMS ─── */
  [data-theme="dark"] .tangle-item {
    background: rgba(232,108,0,0.08) !important;
    border-color: rgba(232,108,0,0.2) !important;
  }
  [data-theme="dark"] .tangle-item:hover {
    background: rgba(232,108,0,0.15) !important;
  }
  [data-theme="dark"] .tangle-item .tangle-info {
    color: #999999 !important;
  }

  /* ─── THEME TOGGLE BUTTON ─── */
  .theme-toggle {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(calc(-50% - 270px));
    z-index: 50;
    background: rgba(255,255,255,0.9);
    border: 1px solid #D9D9D4;
    border-radius: 20px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    transition: all 180ms ease;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    pointer-events: auto;
  }
  .theme-toggle:hover {
    border-color: #E86C00;
    box-shadow: 0 2px 8px rgba(232,108,0,0.15);
  }
  [data-theme="dark"] .theme-toggle {
    background: rgba(30,30,30,0.9);
    border-color: #444444;
  }
  [data-theme="dark"] .theme-toggle:hover {
    border-color: #E86C00;
    box-shadow: 0 2px 8px rgba(232,108,0,0.25);
  }

  /* ─── INTENSITY CHART LEGEND TEXT (on light canvas bg) ─── */
  [data-theme="dark"] .intensity-legend,
  [data-theme="dark"] .chart-legend {
    color: #999999 !important;
  }

  /* ─── FOLIATION LABEL ─── */
  [data-theme="dark"] .foliation-label {
    color: #777777 !important;
  }

  /* ─── RICCI CLASSES ─── */
  [data-theme="dark"] .ricci-flat {
    color: #777777 !important;
  }

  /* ─── TOKEN CHARS (diff view) ─── */
  [data-theme="dark"] .token-char.unchanged {
    color: #888888 !important;
  }
  [data-theme="dark"] .token-char.changed {
    color: #E86C00 !important;
  }
"""

# ═══════════════════════════════════════════════════════════════
# 2. THEME TOGGLE BUTTON HTML — add after <body><div id="app">
# ═══════════════════════════════════════════════════════════════

toggle_html = """
  <!-- Theme toggle button -->
  <button class="theme-toggle" id="theme-toggle" title="Toggle dark/light mode" aria-label="Toggle dark/light mode">
    <span id="theme-icon">☀️</span>
  </button>
"""

# ═══════════════════════════════════════════════════════════════
# 3. THEME TOGGLE JS — add before </body>
# ═══════════════════════════════════════════════════════════════

toggle_js = """
<script>
// ─── Theme Toggle ───
(function() {
  const html = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-icon');

  // Detect system preference or saved preference
  function getPreferredTheme() {
    const saved = localStorage.getItem('wolfram-theme');
    if (saved) return saved;
    // Default to dark mode
    return 'dark';
  }

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('wolfram-theme', theme);

    // Notify canvas renderers to update text colors
    window._currentTheme = theme;
    // Trigger redraw of intensity and branchial canvases
    if (typeof drawIntensityPlot === 'function' && typeof window._currentSystem === 'function') {
      try { drawIntensityPlot(window._currentSystem(), typeof getCurrentAnalytical === 'function' ? getCurrentAnalytical() : null); } catch(e) {}
    }
    if (typeof drawBranchialPlot === 'function' && typeof window._currentSystem === 'function') {
      try { drawBranchialPlot(window._currentSystem(), null); } catch(e) {}
    }
  }

  // Apply on load (before paint if possible)
  applyTheme(getPreferredTheme());

  // Toggle on click
  btn.addEventListener('click', () => {
    const current = html.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
})();
</script>
"""

# ═══════════════════════════════════════════════════════════════
# APPLY CHANGES
# ═══════════════════════════════════════════════════════════════

# 1. Insert dark CSS before </style>
content = content.replace('\n</style>\n</head>', dark_css + '\n</style>\n</head>')

# 2. Insert toggle button after <div id="app">
content = content.replace('<div id="app">\n', '<div id="app">\n' + toggle_html)

# 3. Insert toggle JS before </body>
content = content.replace('</body>', toggle_js + '\n</body>')

# ═══════════════════════════════════════════════════════════════
# 4. Fix canvas text colors to be theme-aware
# ═══════════════════════════════════════════════════════════════

# The intensity chart draws axis labels. In light mode they're dark, in dark mode they need to be light.
# Replace the hardcoded axis label colors with a theme check.

# Intensity chart axis labels
content = content.replace(
    "ctx.fillStyle = 'rgba(0,0,0,0.25)';\n  ctx.font = '9px Inter';\n  ctx.textAlign = 'center';\n  ctx.fillText('Screen Position',",
    "ctx.fillStyle = (window._currentTheme === 'dark') ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)';\n  ctx.font = '9px Inter';\n  ctx.textAlign = 'center';\n  ctx.fillText('Screen Position',"
)

# Intensity chart Y-axis label (also uses same color)
content = content.replace(
    "ctx.fillText('Intensity (|ψ|²)', 0, 0);\n  ctx.restore();\n\n  // Legend\n  ctx.font = '8px Inter';\n  ctx.textAlign = 'right';\n  if (analyticalFn && !filterNodeIds) {\n    ctx.fillStyle = 'rgba(0,0,0,0.2)';",
    "ctx.fillText('Intensity (|ψ|²)', 0, 0);\n  ctx.restore();\n\n  // Legend\n  ctx.font = '8px Inter';\n  ctx.textAlign = 'right';\n  if (analyticalFn && !filterNodeIds) {\n    ctx.fillStyle = (window._currentTheme === 'dark') ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';"
)

# Analytical comparison dashed line
content = content.replace(
    "ctx.strokeStyle = 'rgba(0,0,0,0.12)';\n    ctx.setLineDash([3, 3]);",
    "ctx.strokeStyle = (window._currentTheme === 'dark') ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';\n    ctx.setLineDash([3, 3]);"
)

# Multiway weights legend
content = content.replace(
    "ctx.fillStyle = 'rgba(232,108,0,0.5)';\n    ctx.fillText('██ Multiway weights',",
    "ctx.fillStyle = 'rgba(232,108,0,0.6)';\n    ctx.fillText('██ Multiway weights',"
)

# Tunneling chart diagonal line
content = content.replace(
    "ctx.strokeStyle = 'rgba(0,0,0,0.1)';\n  ctx.lineWidth = 1;\n  ctx.setLineDash([4, 4]);\n  ctx.beginPath();\n  ctx.moveTo(pad, pad + plotH);\n  ctx.lineTo(pad + plotW, pad);",
    "ctx.strokeStyle = (window._currentTheme === 'dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';\n  ctx.lineWidth = 1;\n  ctx.setLineDash([4, 4]);\n  ctx.beginPath();\n  ctx.moveTo(pad, pad + plotH);\n  ctx.lineTo(pad + plotW, pad);"
)

# Intensity canvas background should match theme
# Already dark in dark mode via CSS, and light in light mode via CSS

with open(INPUT, 'w') as f:
    f.write(content)

print(f"Dark mode applied. File: {len(content)} chars, {content.count(chr(10))} lines")
print("Changes:")
print("  - Dark mode CSS block added (~400 rules)")
print("  - Theme toggle button added")
print("  - Theme toggle JS with localStorage")
print("  - Canvas text colors are now theme-aware")
