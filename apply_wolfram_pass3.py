#!/usr/bin/env python3
"""
Wolfram Brand Pass 3: Fix remaining lime (#CCFF00 / rgba(204,255,0,...)) references.
Use warm amber (#D97706) for UI text, and amber tones for canvas elements.
Also fix remaining purple references and scene tag backgrounds.
"""

INPUT = '/home/user/workspace/hypergraph-viz/index.html'

with open(INPUT, 'r') as f:
    content = f.read()

# ═══════════════════════════════════════════════════════════════
# 1. CSS scene tags — fix lime background
# ═══════════════════════════════════════════════════════════════
content = content.replace(
    ".scene-tag.st { background: rgba(204,255,0,0.12); color: #E86C00; }",
    ".scene-tag.st { background: rgba(232,108,0,0.08); color: #E86C00; }"
)

# ═══════════════════════════════════════════════════════════════
# 2. CSS spacetime-specific elements (lime tints → warm tints)
# ═══════════════════════════════════════════════════════════════
content = content.replace(
    "background: rgba(204,255,0,0.02);",
    "background: rgba(232,108,0,0.02);"
)
content = content.replace(
    "border: 1px solid rgba(204,255,0,0.08);",
    "border: 1px solid rgba(232,108,0,0.06);"
)
content = content.replace(
    "background: rgba(204,255,0,0.04);",
    "background: rgba(232,108,0,0.04);"
)
content = content.replace(
    "border: 1px solid rgba(204,255,0,0.12);",
    "border: 1px solid rgba(232,108,0,0.10);"
)
content = content.replace(
    "background: rgba(204,255,0,0.08);",
    "background: rgba(232,108,0,0.08);"
)
content = content.replace(
    "border-color: rgba(204,255,0,0.20);",
    "border-color: rgba(232,108,0,0.20);"
)
content = content.replace(
    "color: rgba(204,255,0,0.85);",
    "color: #E86C00;"
)
content = content.replace(
    "border-color: rgba(204,255,0,0.30);",
    "border-color: rgba(232,108,0,0.30);"
)
content = content.replace(
    "color: rgba(204,255,0,0.95);",
    "color: #E86C00;"
)

# ═══════════════════════════════════════════════════════════════
# 3. Canvas context lime colors → amber (for dark canvas backgrounds)
# ═══════════════════════════════════════════════════════════════
content = content.replace(
    "ctx.fillStyle = 'rgba(204,255,0,0.5)';",
    "ctx.fillStyle = 'rgba(232,168,56,0.6)';"
)
content = content.replace(
    "ctx.strokeStyle = highlighted ? 'rgba(204,255,0,0.3)' : 'rgba(80,200,160,0.06)';",
    "ctx.strokeStyle = highlighted ? 'rgba(232,168,56,0.3)' : 'rgba(160,160,140,0.06)';"
)
content = content.replace(
    "ctx.fillStyle = 'rgba(204,255,0,0.95)';",
    "ctx.fillStyle = 'rgba(232,168,56,0.95)';"
)
content = content.replace(
    "ctx.fillStyle = `rgba(204,255,0,${0.4 + wNorm * 0.4})`;",
    "ctx.fillStyle = `rgba(232,168,56,${0.4 + wNorm * 0.4})`;"
)
content = content.replace(
    "ctx.strokeStyle = 'rgba(204,255,0,0.8)';",
    "ctx.strokeStyle = 'rgba(232,168,56,0.8)';"
)
content = content.replace(
    "ctx.fillStyle = 'rgba(204,255,0,0.08)';",
    "ctx.fillStyle = 'rgba(232,168,56,0.08)';"
)

# ═══════════════════════════════════════════════════════════════
# 4. JS-generated HTML lime references (observer analysis bars)
# ═══════════════════════════════════════════════════════════════
content = content.replace(
    "background:rgba(204,255,0,0.5);position:absolute;left:0;top:0",
    "background:rgba(217,119,6,0.3);position:absolute;left:0;top:0"
)
content = content.replace(
    "color: 'rgba(204,255,0,0.6)'",
    "color: 'rgba(217,119,6,0.5)'"
)
content = content.replace(
    'style="color:rgba(204,255,0,0.5)">\\u25A0',
    'style="color:#D97706">\\u25A0'
)

# ═══════════════════════════════════════════════════════════════
# 5. Fix Ricci curvature colors (these show in dark canvas)
# ═══════════════════════════════════════════════════════════════
# ricci-flat was white on dark — keep that fine for dark canvas context
# But the CSS class might show in the UI panel too
content = content.replace(
    ".ricci-flat { color: rgba(255,255,255,0.4); }",
    ".ricci-flat { color: #999999; }"
)

# ═══════════════════════════════════════════════════════════════
# 6. Fix any remaining #7000FF in CSS (not already handled by attribute selectors)
# ═══════════════════════════════════════════════════════════════
# Check for direct purple hex usage
content = content.replace(
    "color: #7000FF;",
    "color: #E86C00;"
)
content = content.replace(
    "background: #7000FF;",
    "background: #E86C00;"
)

# ═══════════════════════════════════════════════════════════════
# 7. Fix observer panel dynamic JS that builds HTML with old colors
# ═══════════════════════════════════════════════════════════════

# The gauge fill JS update function
content = content.replace(
    "gaugeFill.style.background = 'rgba(0,240,255,",
    "gaugeFill.style.background = 'rgba(232,108,0,"
)

# Fix any remaining cyan in JS UI strings
content = content.replace(
    "'color:rgba(0,240,255,",
    "'color:rgba(232,108,0,"
)

with open(INPUT, 'w') as f:
    f.write(content)

# Verify
remaining = []
for i, line in enumerate(content.split('\n'), 1):
    skip_keywords = ['THREE', 'Color(', 'material', '_hover', '_lime', 'limeColor', 
                     '0xCCFF00', '0x00F0FF', '0x7000FF', 'style*=', 'ancestorColor',
                     'cyanColor', 'causalFutureColor']
    has_old = 'rgba(204,255,0' in line or 'rgba(112,0,255' in line or '#CCFF00' in line or '#7000FF' in line
    if has_old and not any(k in line for k in skip_keywords):
        remaining.append(f"  Line {i}: {line.strip()[:120]}")

print(f"Remaining old-palette references: {len(remaining)}")
for r in remaining[:20]:
    print(r)
