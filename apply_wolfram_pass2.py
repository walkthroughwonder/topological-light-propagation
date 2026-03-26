#!/usr/bin/env python3
"""
Wolfram Brand Pass 2: Fix remaining old-theme colors in inline styles and JS-generated HTML.
Keep Three.js 3D canvas colors as-is (they render on dark background).
Only update UI text colors and gauge/bar fills that appear in light panels.
"""

import re

INPUT = '/home/user/workspace/hypergraph-viz/index.html'

with open(INPUT, 'r') as f:
    content = f.read()

original = content

# ═══════════════════════════════════════════════════════════════
# 1. Fix inline HTML styles (static HTML, not in JS template literals)
# ═══════════════════════════════════════════════════════════════

# Fix "completion rules" purple → Wolfram orange
content = content.replace(
    'style="color:rgba(112,0,255,0.85)">completion rules',
    'style="color:#E86C00">completion rules'
)

# Fix "not coarse-graining" highlight — find it in the observer panel HTML
content = content.replace(
    'style="color:rgba(0,240,255,0.85)">not coarse-graining',
    'style="color:#E86C00">not coarse-graining'
)

# Fix "pure quantum state" 
content = content.replace(
    'style="color:rgba(0,240,255,0.85)">pure quantum state',
    'style="color:#E86C00">pure quantum state'
)

# Fix the causal invariance gauge fill inline style
content = content.replace(
    'style="width:50%;background:rgba(0,240,255,0.5)"',
    'style="width:50%;background:#E86C00"'
)

# ═══════════════════════════════════════════════════════════════
# 2. Fix CSS rules that still reference old palette
# ═══════════════════════════════════════════════════════════════

# Fix tool-toggle active color references
content = content.replace(
    'border: 1px solid rgba(0,240,255,0.20);',
    'border: 1px solid #D9D9D4;'
)
content = content.replace(
    'background: rgba(0,240,255,0.14);',
    'background: rgba(232,108,0,0.08);'
)
content = content.replace(
    'border-color: rgba(0,240,255,0.40);',
    'border-color: #E86C00;'
)

# Fix scene tag colors
content = content.replace(
    "background: rgba(0,240,255,0.12); color: #E86C00;",
    "background: rgba(232,108,0,0.08); color: #E86C00;"
)

# Fix the gradient that used old palette
content = content.replace(
    'background: linear-gradient(to right, #7000FF, #00F0FF, #CCFF00);',
    'background: linear-gradient(to right, #4A90D9, #E86C00, #DC2626);'
)

# Fix remaining CSS color references for UI elements (not in Three.js)
# The .oa-bar-fill and observer analysis colors
content = content.replace(
    'color: #00F0FF;',
    'color: #E86C00;'
)

# Fix .ci-gauge-fill background in CSS
content = content.replace(
    'background: rgba(0,240,255,0.25);',
    'background: rgba(232,108,0,0.15);'
)

# Fix border-color that references cyan
content = content.replace(
    'border-color: rgba(0,240,255,0.25);',
    'border-color: rgba(232,108,0,0.25);'
)

# ═══════════════════════════════════════════════════════════════
# 3. Fix JS-generated UI HTML (template literals) — colors shown in light panels
# ═══════════════════════════════════════════════════════════════

# Fix observer analysis tooltip colors — ancestors (lime → warm amber)
content = content.replace(
    'style=\\"color:rgba(204,255,0,0.8)\\"',
    'style=\\"color:#D97706\\"'
)
content = content.replace(
    "style=\"color:rgba(204,255,0,0.8)\"",
    "style=\"color:#D97706\""
)

# Fix observer analysis tooltip colors — descendants (cyan → orange)
content = content.replace(
    'style=\\"color:rgba(0,240,255,0.8)\\"',
    'style=\\"color:#E86C00\\"'
)
content = content.replace(
    "style=\"color:rgba(0,240,255,0.8)\"",
    "style=\"color:#E86C00\""
)

# Fix future cone bar fills in observer analysis (both multiway and spacetime)
content = content.replace(
    "background:rgba(0,240,255,0.4);position:absolute;right:0;top:0",
    "background:rgba(232,108,0,0.3);position:absolute;right:0;top:0"
)

# Fix future cone square indicators
content = content.replace(
    'style="color:rgba(0,240,255,0.5)">■',
    'style="color:#E86C00">■'
)
content = content.replace(
    "style=\\\"color:rgba(0,240,255,0.5)\\\">\\\\u25A0",
    "style=\\\"color:#E86C00\\\">\\\\u25A0"
)
# Also the variant with actual unicode
content = content.replace(
    'style="color:rgba(0,240,255,0.5)">\\u25A0',
    'style="color:#E86C00">\\u25A0'
)

# Fix the coherence chart bar colors
content = content.replace(
    "color: 'rgba(0,240,255,0.5)'",
    "color: 'rgba(232,108,0,0.5)'"
)

# Fix "CHILD:" label color in hover analysis
content = content.replace(
    'color:rgba(0,240,255,0.4)">CHILD:',
    'color:#E86C00">CHILD:'
)

# ═══════════════════════════════════════════════════════════════
# 4. Fix canvas 2D context colors (intensity chart, branchial mini-viz)
#    These render on dark backgrounds — keep contrast but use orange palette
# ═══════════════════════════════════════════════════════════════

# Intensity chart / branchial bars — these appear in dark canvas areas
# ctx.strokeStyle and ctx.fillStyle for chart bars
# These are in 2D canvas contexts that render on dark backgrounds, so we 
# use the orange accent at appropriate opacity

# Chart bar strokes and fills (these are in the intensity/branchial canvases)
content = content.replace(
    "ctx.strokeStyle = 'rgba(0,240,255,0.5)';",
    "ctx.strokeStyle = 'rgba(232,108,0,0.6)';"
)
content = content.replace(
    "ctx.fillStyle = 'rgba(0,240,255,0.5)';",
    "ctx.fillStyle = 'rgba(232,108,0,0.5)';"
)
content = content.replace(
    "ctx.fillStyle = 'rgba(0,240,255,0.4)';",
    "ctx.fillStyle = 'rgba(232,108,0,0.4)';"
)
content = content.replace(
    "ctx.fillStyle = 'rgba(0,240,255,0.12)';",
    "ctx.fillStyle = 'rgba(232,108,0,0.12)';"
)
content = content.replace(
    "ctx.strokeStyle = 'rgba(0,240,255,0.8)';",
    "ctx.strokeStyle = 'rgba(232,108,0,0.8)';"
)
content = content.replace(
    "ctx.fillStyle = 'rgba(0,240,255,0.8)';",
    "ctx.fillStyle = 'rgba(232,108,0,0.8)';"
)
content = content.replace(
    "ctx.strokeStyle = 'rgba(0,240,255,0.6)';",
    "ctx.strokeStyle = 'rgba(232,108,0,0.7)';"
)
content = content.replace(
    "ctx.fillStyle = 'rgba(0,240,255,0.6)';",
    "ctx.fillStyle = 'rgba(232,108,0,0.6)';"
)

# ═══════════════════════════════════════════════════════════════
# 5. Fix JS gauge fill update (dynamic)
# ═══════════════════════════════════════════════════════════════

# The JS code that updates the gauge fill dynamically
content = content.replace(
    "gaugeFill.style.background = `rgba(0,240,255,",
    "gaugeFill.style.background = `rgba(232,108,0,"
)

# Also fix any direct hex assignments
content = content.replace(
    "gaugeFill.style.background = '#00F0FF'",
    "gaugeFill.style.background = '#E86C00'"
)

# ═══════════════════════════════════════════════════════════════
# 6. Fix observer analysis panel styling references  
# ═══════════════════════════════════════════════════════════════

# Fix the "not coarse-graining" and "pure quantum state" spans in observer HTML
# These are generated dynamically in updateObserverPanel
# Find and replace in the template literal that builds observer text

# Fix: The observer text that says "not coarse-graining" with old colors
content = content.replace(
    '<span style="color:rgba(0,240,255,0.8)">not coarse-graining</span>',
    '<span style="color:#E86C00">not coarse-graining</span>'
)
content = content.replace(
    '<span style="color:rgba(0,240,255,0.8)">pure quantum state</span>',
    '<span style="color:#E86C00">pure quantum state</span>'
)

# Also handle the JS-escaped versions
content = content.replace(
    "color:rgba(0,240,255,0.85)\">not coarse-graining",
    'color:#E86C00">not coarse-graining'
)
content = content.replace(
    "color:rgba(0,240,255,0.85)\">pure quantum state",
    'color:#E86C00">pure quantum state'
)

# ═══════════════════════════════════════════════════════════════
# 7. Fix remaining lime (#CCFF00) references in UI text
# ═══════════════════════════════════════════════════════════════

# Past cone indicators (lime squares)
content = content.replace(
    'style="color:rgba(204,255,0,0.5)">■',
    'style="color:#D97706">■'
)

# ═══════════════════════════════════════════════════════════════
# 8. Additional CSS overrides to add to the WOLFRAM BRAND OVERRIDE block
# ═══════════════════════════════════════════════════════════════

additional_css = """
  /* ── Wolfram Pass 2 overrides ── */
  
  /* Observer panel highlights */
  #quantum-observer-panel strong[style*="color"] {
    color: #E86C00 !important;
  }
  
  /* Causal invariance gauge */
  .ci-gauge-fill {
    background: #E86C00 !important;
  }
  
  /* Observer analysis text highlights */
  .oa-narrative strong[style*="color"] {
    color: #E86C00 !important;
  }
  
  /* Observer analysis future bars */
  .oa-bar-fill {
    background: rgba(232,108,0,0.3) !important;
  }
  
  /* Past cone bar */
  .oa-bar-fill[style*="rgba(204,255,0"] {
    background: rgba(217,119,6,0.3) !important;
  }
  
  /* Fix any remaining cyan accents in text */
  [style*="color:rgba(0,240,255"] {
    color: #E86C00 !important;
  }
  [style*="color: rgba(0,240,255"] {
    color: #E86C00 !important;
  }
  [style*="color:#00F0FF"] {
    color: #E86C00 !important;
  }
  [style*="color: #00F0FF"] {
    color: #E86C00 !important;
  }
  
  /* Fix any remaining purple accents */
  [style*="color:rgba(112,0,255"] {
    color: #E86C00 !important;
  }
  [style*="color: rgba(112,0,255"] {
    color: #E86C00 !important;
  }
  [style*="color:#7000FF"] {
    color: #E86C00 !important;
  }
  
  /* Fix any remaining lime accents in text */
  [style*="color:rgba(204,255,0"] {
    color: #D97706 !important;
  }
  [style*="color: rgba(204,255,0"] {
    color: #D97706 !important;
  }
  [style*="color:#CCFF00"] {
    color: #D97706 !important;
  }
  
  /* Observer analysis bars - past cone */
  .oa-bar-bg {
    background: #E6E6E0 !important;
  }
  
  /* Remove any old hover glow effects */
  .tool-toggle:hover {
    box-shadow: none !important;
    text-shadow: none !important;
  }
  
  /* Intensity chart legend */
  .intensity-legend, .chart-legend {
    color: #555555 !important;
  }
  
  /* Make sure rule editor delete buttons are subtle */
  .rule-del {
    color: #999999 !important;
  }
  .rule-del:hover {
    color: #DC2626 !important;
  }
"""

# Insert the additional CSS before the closing WOLFRAM BRAND OVERRIDE comment
# Find the end of the override block (just before </style>)
content = content.replace(
    '\n</style>\n</head>',
    additional_css + '\n</style>\n</head>'
)

# ═══════════════════════════════════════════════════════════════
# 9. Fix the observer panel's dynamic text generation in JS
# ═══════════════════════════════════════════════════════════════

# Find the updateObserverPanel function and fix its color references
# The "not coarse-graining" and "pure quantum state" text colors
content = content.replace(
    "color:rgba(0,240,255,0.9)'>not coarse-graining</span>",
    "color:#E86C00'>not coarse-graining</span>"
)
content = content.replace(
    "color:rgba(0,240,255,0.9)'>pure quantum state</span>",
    "color:#E86C00'>pure quantum state</span>"
)

# Any remaining inline rgba(0,240,255,...) in observer text generation  
# Use regex to catch all patterns in the observer panel JS
# But be careful: don't touch THREE.Color or material references

# Write output
with open(INPUT, 'w') as f:
    f.write(content)

# Report changes
lines_changed = sum(1 for a, b in zip(original.split('\n'), content.split('\n')) if a != b)
print(f"Modified {lines_changed} lines")
print(f"File size: {len(content)} chars")

# Verify no old cyan colors remain in UI-facing code (excluding Three.js)
import re
remaining_cyan_ui = []
for i, line in enumerate(content.split('\n'), 1):
    if 'rgba(0,240,255' in line or '#00F0FF' in line:
        # Skip Three.js lines
        if 'THREE' in line or 'Color(' in line or 'material' in line.lower() or 'hover' in line.lower() or '_hover' in line:
            continue
        remaining_cyan_ui.append(f"  Line {i}: {line.strip()[:100]}")

if remaining_cyan_ui:
    print(f"\nRemaining cyan references ({len(remaining_cyan_ui)}):")
    for r in remaining_cyan_ui[:15]:
        print(r)
else:
    print("\nNo remaining cyan references in UI code!")
