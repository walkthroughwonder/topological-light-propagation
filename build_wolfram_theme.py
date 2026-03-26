#!/usr/bin/env python3
"""
Wolfram Brand Redesign: Transform the dark-theme hypergraph viz into
a light, editorial Wolfram-inspired UI with orange accents.

Strategy:
- Light panels (white/cream backgrounds) with dark text
- Dark 3D canvas viewport preserved
- Orange (#E86C00) replaces cyan (#00F0FF) as accent
- Inter font stack preserved, JetBrains Mono for code
- Wolfram-style editorial layout: crisp borders, generous spacing
- Tabs become minimal text-led navigation
- Scenes dropdown becomes light overlay
"""

import re

def apply_wolfram_theme(html):
    """Apply Wolfram brand system to the visualization."""
    
    # ═══════════════════════════════════════════════════
    # PHASE 1: CSS COLOR SYSTEM OVERHAUL
    # ═══════════════════════════════════════════════════
    
    # --- BODY & BACKGROUND ---
    # Body background: dark → light
    html = html.replace("background: #0e0e10;", "background: #FFFFFF;")
    html = html.replace("color: #e8e8f0;", "color: #111111;")
    
    # Panel backgrounds → white/surface
    html = html.replace(
        "border-right: 1px solid rgba(255,255,255,0.06);",
        "background: #FFFFFF; border-right: 1px solid #D9D9D4;"
    )
    html = html.replace(
        ".panel:last-child { border-right: none; border-left: 1px solid rgba(255,255,255,0.06); }",
        ".panel:last-child { border-right: none; border-left: 1px solid #D9D9D4; background: #FFFFFF; }"
    )
    
    # Center canvas: keep dark for 3D viewport
    # (already #0a0a0c — keep it)
    
    # --- SECTION TITLES (uppercase headers) ---
    html = html.replace(
        "color: rgba(255,255,255,0.50);\n    margin-bottom: 14px;\n    padding-bottom: 8px;\n    border-bottom: 1px solid rgba(255,255,255,0.06);",
        "color: #555555;\n    margin-bottom: 14px;\n    padding-bottom: 8px;\n    border-bottom: 1px solid #D9D9D4;"
    )
    
    # --- SUBSECTION HEADINGS ---
    html = html.replace(
        "color: rgba(255,255,255,0.85);\n    margin-bottom: 6px;",
        "color: #111111;\n    margin-bottom: 6px;"
    )
    
    # --- BODY TEXT / DESCRIPTIONS ---
    # Primary text: white-on-dark → dark-on-light
    html = html.replace(
        "color: rgba(255,255,255,0.50);\n    line-height: 1.6;",
        "color: #555555;\n    line-height: 1.6;"
    )
    
    # --- COLLAPSIBLE HEADERS ---
    html = html.replace(
        "color: rgba(255,255,255,0.7);",
        "color: #111111;"
    )
    html = html.replace(
        "color: rgba(255,255,255,0.25);\n    transition: transform",
        "color: #999999;\n    transition: transform"
    )
    html = html.replace(
        ".collapsible-header:hover .chevron { color: rgba(255,255,255,0.5); }",
        ".collapsible-header:hover .chevron { color: #555555; }"
    )
    
    # --- MONO CODE STYLING ---
    html = html.replace(
        "color: rgba(255,255,255,0.55);\n    background: rgba(255,255,255,0.04);",
        "color: #555555;\n    background: #F6F6F4;"
    )
    
    # --- RULE DISPLAY ---
    html = html.replace(
        "color: rgba(120,200,255,0.8);\n    background: rgba(120,200,255,0.06);",
        "color: #E86C00;\n    background: rgba(232,108,0,0.06);"
    )
    html = html.replace(
        "border: 1px solid rgba(120,200,255,0.1);",
        "border: 1px solid rgba(232,108,0,0.15);"
    )
    
    # --- RULE EDITOR INPUTS ---
    html = html.replace(
        "background: rgba(255,255,255,0.05);\n    border: 1px solid rgba(255,255,255,0.10);\n    border-radius: 4px;\n    color: rgba(255,255,255,0.85);",
        "background: #F6F6F4;\n    border: 1px solid #D9D9D4;\n    border-radius: 4px;\n    color: #111111;"
    )
    # Rule input focus: cyan → orange
    html = html.replace(
        "border-color: rgba(0,240,255,0.4);\n    background: rgba(0,240,255,0.06);\n    color: rgba(0,240,255,0.95);",
        "border-color: rgba(232,108,0,0.5);\n    background: rgba(232,108,0,0.04);\n    color: #E86C00;"
    )
    
    # --- RULE ARROW ---
    html = html.replace(
        "color: rgba(255,255,255,0.35);\n    flex-shrink: 0;\n  }",
        "color: #999999;\n    flex-shrink: 0;\n  }"
    )
    
    # --- RULE ADD BUTTON ---
    html = html.replace(
        "color: rgba(255,255,255,0.4);\n    background: transparent;\n    border: 1px dashed rgba(255,255,255,0.12);",
        "color: #999999;\n    background: transparent;\n    border: 1px dashed #D9D9D4;"
    )
    html = html.replace(
        "border-color: rgba(0,240,255,0.30);\n    color: rgba(0,240,255,0.8);\n  }",
        "border-color: #E86C00;\n    color: #E86C00;\n  }"
    )
    
    # --- INIT INPUT ---
    html = html.replace(
        "background: rgba(255,255,255,0.05);\n    border: 1px solid rgba(255,255,255,0.10);\n    border-radius: 5px;\n    color: rgba(255,255,255,0.85);",
        "background: #F6F6F4;\n    border: 1px solid #D9D9D4;\n    border-radius: 5px;\n    color: #111111;"
    )
    html = html.replace(
        "border-color: rgba(0,240,255,0.4);\n    background: rgba(0,240,255,0.05);\n    color: rgba(0,240,255,0.95);",
        "border-color: rgba(232,108,0,0.5);\n    background: rgba(232,108,0,0.03);\n    color: #E86C00;"
    )
    
    # --- PRESET CHIPS ---
    html = html.replace(
        "color: rgba(255,255,255,0.55);\n    background: rgba(255,255,255,0.04);\n    border: 1px solid rgba(255,255,255,0.08);",
        "color: #555555;\n    background: #F6F6F4;\n    border: 1px solid #D9D9D4;"
    )
    html = html.replace(
        "background: rgba(255,255,255,0.08);\n    border-color: rgba(255,255,255,0.16);\n    color: rgba(255,255,255,0.85);",
        "background: #EEEEEA;\n    border-color: #BBBBBB;\n    color: #111111;"
    )
    # Active preset: cyan → orange
    html = html.replace(
        "background: rgba(0,240,255,0.10);\n    border-color: rgba(0,240,255,0.30);\n    color: rgba(0,240,255,0.9);",
        "background: rgba(232,108,0,0.08);\n    border-color: rgba(232,108,0,0.4);\n    color: #E86C00;"
    )
    
    # --- PRESET CATEGORY HEADERS ---
    html = html.replace(
        "color: rgba(255,255,255,0.3);\n    margin-top: 10px;\n    margin-bottom: 5px;",
        "color: #999999;\n    margin-top: 10px;\n    margin-bottom: 5px;"
    )
    
    # --- CONTROL LABELS ---
    html = html.replace(
        "color: rgba(255,255,255,0.55);\n    letter-spacing: 0.02em;\n    margin-bottom: 5px;",
        "color: #555555;\n    letter-spacing: 0.02em;\n    margin-bottom: 5px;"
    )
    
    # --- CTRL VALUES ---
    html = html.replace(
        "color: rgba(255,255,255,0.75);\n    font-weight: 500;\n    min-width: 40px;",
        "color: #111111;\n    font-weight: 500;\n    min-width: 40px;"
    )
    
    # ═══════════════════════════════════════════════════
    # PHASE 2: SLIDERS (range inputs)
    # ═══════════════════════════════════════════════════
    
    # Slider track: dark → light
    html = html.replace(
        "background: rgba(255,255,255,0.08);",
        "background: #E6E6E0;"
    )
    # Slider thumb: cyan → orange
    html = html.replace(
        "background: rgba(0,240,255,0.60);",
        "background: #E86C00;"
    )
    html = html.replace(
        "background: rgba(0,240,255,0.80);",
        "background: #D05E00;"
    )
    
    # ═══════════════════════════════════════════════════
    # PHASE 3: VIEW TABS (navigation)
    # ═══════════════════════════════════════════════════
    
    # Tab container background
    html = html.replace(
        "background: rgba(0,0,0,0.25);",
        "background: #FFFFFF;"
    )
    
    # Tab styling: dark → Wolfram minimal
    # Default tab text
    html = re.sub(
        r'\.view-tab\s*\{[^}]*\}',
        """.view-tab {
    padding: 8px 16px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #999999;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 180ms ease;
    white-space: nowrap;
    font-family: 'Inter', system-ui, sans-serif;
  }""",
        html
    )
    
    # Tab hover
    html = re.sub(
        r'\.view-tab:hover\s*\{[^}]*\}',
        """.view-tab:hover {
    color: #111111;
    border-bottom-color: #D9D9D4;
  }""",
        html
    )
    
    # Tab active
    html = re.sub(
        r'\.view-tab\.active\s*\{[^}]*\}',
        """.view-tab.active {
    color: #E86C00;
    background: transparent;
    border-bottom-color: #E86C00;
  }""",
        html
    )
    
    # Active spacetime tab special color → orange (was teal border)
    html = re.sub(
        r'\.view-tab\.active\[data-view="spacetime"\]\s*\{[^}]*\}',
        """.view-tab.active[data-view="spacetime"] {
    color: #E86C00;
    border-bottom-color: #E86C00;
  }""",
        html
    )
    
    # Tab container (the flex wrapper)
    html = re.sub(
        r'\.view-tabs\s*\{[^}]*\}',
        """.view-tabs {
    display: flex;
    gap: 0;
    padding: 0;
    background: #FFFFFF;
    border: 1px solid #D9D9D4;
    border-radius: 0;
    box-shadow: none;
  }""",
        html
    )
    
    # ═══════════════════════════════════════════════════
    # PHASE 4: SCENES DROPDOWN
    # ═══════════════════════════════════════════════════
    
    # Scenes button
    html = html.replace(
        "background: rgba(255,255,255,0.06);",
        "background: #F6F6F4;"
    )
    html = html.replace(
        "border: 1px solid rgba(255,255,255,0.10);",
        "border: 1px solid #D9D9D4;"
    )
    
    # Scene panel overlay
    html = re.sub(
        r'(#scenes-panel\s*\{[^}]*?)background:\s*rgba\(14,\s*14,\s*16,\s*0\.92\)',
        r'\1background: rgba(255, 255, 255, 0.97)',
        html
    )
    
    # Scene cards
    html = html.replace(
        "background: rgba(255,255,255,0.03);",
        "background: #FFFFFF;"
    )
    html = html.replace(
        "border: 1px solid rgba(255,255,255,0.06);",
        "border: 1px solid #E6E6E0;"
    )
    
    # Scene card hover
    html = html.replace(
        "background: rgba(255,255,255,0.07);",
        "background: #F6F6F4;"
    )
    html = html.replace(
        "border-color: rgba(255,255,255,0.15);",
        "border-color: #D9D9D4;"
    )
    
    # Scene badges
    html = html.replace(
        "background: rgba(0,240,255,0.15);",
        "background: rgba(232,108,0,0.1);"
    )
    html = html.replace(
        "color: rgba(0,240,255,0.9);",
        "color: #E86C00;"
    )
    
    # ═══════════════════════════════════════════════════
    # PHASE 5: RIGHT PANEL — OBSERVER, PHYSICS, STATS
    # ═══════════════════════════════════════════════════
    
    # Observer panel explanatory text
    # These are within the quantum-observer-panel and right panel sections
    
    # Completion rules link color: cyan → orange
    html = html.replace(
        "color: rgba(0,240,255,0.85);",
        "color: #E86C00;"
    )
    
    # Highlighted terms in observer text
    html = html.replace(
        "color: rgba(120,200,255,0.9);",
        "color: #E86C00;"
    )
    
    # Italicized terms
    html = html.replace(
        "color: rgba(204,255,0,0.7);",
        "color: #E86C00;"
    )
    
    # Tool section styling
    html = html.replace(
        "background: rgba(255,255,255,0.02);",
        "background: #FAFAFA;"
    )
    
    # Tool toggle button
    html = html.replace(
        "background: rgba(255,255,255,0.06);\n    border: 1px solid rgba(255,255,255,0.10);\n    border-radius: 10px;",
        "background: #E6E6E0;\n    border: 1px solid #D9D9D4;\n    border-radius: 10px;"
    )
    
    # Tool descriptions
    html = html.replace(
        "color: rgba(255,255,255,0.40);",
        "color: #555555;"
    )
    
    # Tool results
    html = html.replace(
        "color: rgba(255,255,255,0.45);",
        "color: #555555;"
    )
    html = html.replace(
        "background: rgba(0,0,0,0.2);",
        "background: #F6F6F4;"
    )
    
    # Statistics labels
    html = html.replace(
        "color: rgba(255,255,255,0.50);",
        "color: #555555;"
    )
    
    # Statistics values
    html = html.replace(
        "color: rgba(255,255,255,0.9);",
        "color: #111111;"
    )
    
    # ═══════════════════════════════════════════════════
    # PHASE 6: BULK COLOR REMAPPING (remaining instances)
    # ═══════════════════════════════════════════════════
    
    # Cyan accent → Orange accent (in CSS section only)
    # Be careful not to touch Three.js color values in JS!
    
    # Remaining white alpha text colors in CSS → dark alpha
    # These need to be done carefully to not affect JS
    css_section_end = html.find('</style>')
    css_part = html[:css_section_end]
    js_part = html[css_section_end:]
    
    # In CSS: remaining rgba(255,255,255,...) patterns
    css_part = css_part.replace("rgba(255,255,255,0.85)", "#111111")
    css_part = css_part.replace("rgba(255,255,255,0.75)", "#333333")
    css_part = css_part.replace("rgba(255,255,255,0.70)", "#333333")
    css_part = css_part.replace("rgba(255,255,255,0.65)", "#444444")
    css_part = css_part.replace("rgba(255,255,255,0.60)", "#555555")
    css_part = css_part.replace("rgba(255,255,255,0.55)", "#555555")
    css_part = css_part.replace("rgba(255,255,255,0.50)", "#555555")
    css_part = css_part.replace("rgba(255,255,255,0.45)", "#666666")
    css_part = css_part.replace("rgba(255,255,255,0.40)", "#666666")
    css_part = css_part.replace("rgba(255,255,255,0.35)", "#777777")
    css_part = css_part.replace("rgba(255,255,255,0.3)", "#999999")
    css_part = css_part.replace("rgba(255,255,255,0.25)", "#AAAAAA")
    css_part = css_part.replace("rgba(255,255,255,0.20)", "#BBBBBB")
    css_part = css_part.replace("rgba(255,255,255,0.2)", "#BBBBBB")
    css_part = css_part.replace("rgba(255,255,255,0.16)", "#CCCCCC")
    css_part = css_part.replace("rgba(255,255,255,0.15)", "#CCCCCC")
    css_part = css_part.replace("rgba(255,255,255,0.12)", "#D9D9D4")
    css_part = css_part.replace("rgba(255,255,255,0.10)", "#D9D9D4")
    css_part = css_part.replace("rgba(255,255,255,0.1)", "#D9D9D4")
    css_part = css_part.replace("rgba(255,255,255,0.08)", "#E6E6E0")
    css_part = css_part.replace("rgba(255,255,255,0.06)", "#EEEEEA")
    css_part = css_part.replace("rgba(255,255,255,0.05)", "#F0F0EC")
    css_part = css_part.replace("rgba(255,255,255,0.04)", "#F4F4F0")
    css_part = css_part.replace("rgba(255,255,255,0.03)", "#F6F6F4")
    css_part = css_part.replace("rgba(255,255,255,0.02)", "#FAFAFA")
    
    # Cyan accent → Orange accent in CSS
    css_part = css_part.replace("rgba(0,240,255,0.95)", "#E86C00")
    css_part = css_part.replace("rgba(0,240,255,0.9)", "#E86C00")
    css_part = css_part.replace("rgba(0,240,255,0.85)", "#E86C00")
    css_part = css_part.replace("rgba(0,240,255,0.8)", "#E86C00")
    css_part = css_part.replace("rgba(0,240,255,0.7)", "rgba(232,108,0,0.7)")
    css_part = css_part.replace("rgba(0,240,255,0.60)", "#E86C00")
    css_part = css_part.replace("rgba(0,240,255,0.5)", "rgba(232,108,0,0.5)")
    css_part = css_part.replace("rgba(0,240,255,0.4)", "rgba(232,108,0,0.4)")
    css_part = css_part.replace("rgba(0,240,255,0.30)", "rgba(232,108,0,0.3)")
    css_part = css_part.replace("rgba(0,240,255,0.3)", "rgba(232,108,0,0.3)")
    css_part = css_part.replace("rgba(0,240,255,0.2)", "rgba(232,108,0,0.2)")
    css_part = css_part.replace("rgba(0,240,255,0.15)", "rgba(232,108,0,0.12)")
    css_part = css_part.replace("rgba(0,240,255,0.10)", "rgba(232,108,0,0.08)")
    css_part = css_part.replace("rgba(0,240,255,0.08)", "rgba(232,108,0,0.06)")
    css_part = css_part.replace("rgba(0,240,255,0.06)", "rgba(232,108,0,0.05)")
    css_part = css_part.replace("rgba(0,240,255,0.05)", "rgba(232,108,0,0.04)")
    css_part = css_part.replace("rgba(0,240,255,0.04)", "rgba(232,108,0,0.03)")
    
    # Lime accent → Orange accent in CSS
    css_part = css_part.replace("rgba(204,255,0,0.8)", "#E86C00")
    css_part = css_part.replace("rgba(204,255,0,0.7)", "rgba(232,108,0,0.7)")
    css_part = css_part.replace("rgba(204,255,0,0.6)", "rgba(232,108,0,0.6)")
    css_part = css_part.replace("rgba(204,255,0,0.5)", "rgba(232,108,0,0.5)")
    css_part = css_part.replace("rgba(204,255,0,0.15)", "rgba(232,108,0,0.12)")
    css_part = css_part.replace("rgba(204,255,0,0.10)", "rgba(232,108,0,0.08)")
    css_part = css_part.replace("rgba(204,255,0,0.06)", "rgba(232,108,0,0.05)")
    css_part = css_part.replace("rgba(204, 255, 0, 0.15)", "rgba(232,108,0,0.12)")
    
    # Purple accent in CSS → muted orange/warm
    css_part = css_part.replace("rgba(112,0,255,0.8)", "rgba(232,108,0,0.7)")
    css_part = css_part.replace("rgba(112, 0, 255, 0.9)", "rgba(232,108,0,0.8)")
    css_part = css_part.replace("rgba(112, 0, 255, 0.04)", "rgba(232,108,0,0.04)")
    
    # Green/success → warm green that works on light
    css_part = css_part.replace("rgba(80,220,140,0.8)", "#2E8B57")
    css_part = css_part.replace("rgba(80,220,140,0.7)", "#2E8B57")
    css_part = css_part.replace("rgba(80,220,140,0.3)", "rgba(46,139,87,0.3)")
    
    # Dark backgrounds used in panels/overlays → light
    css_part = css_part.replace("background: rgba(0,0,0,0.3);", "background: rgba(0,0,0,0.04);")
    css_part = css_part.replace("background: rgba(14, 14, 16, 0.75);", "background: rgba(255,255,255,0.95);")
    css_part = css_part.replace("background: #111114;", "background: #FFFFFF;")
    css_part = css_part.replace("background: rgba(0,0,0,0.4);", "background: rgba(0,0,0,0.04);")
    css_part = css_part.replace("background: rgba(0,0,0,0.5);", "background: rgba(0,0,0,0.06);")
    css_part = css_part.replace("background: rgba(0,0,0,0.6);", "background: rgba(0,0,0,0.08);")
    css_part = css_part.replace("background: rgba(0,0,0,0.7);", "background: rgba(0,0,0,0.1);")
    
    # Scrollbar colors
    css_part = css_part.replace(
        "scrollbar-color: rgba(255,255,255,0.1) transparent;",
        "scrollbar-color: rgba(0,0,0,0.15) transparent;"
    )
    
    # Warning/safety text
    css_part = css_part.replace("color: rgba(255,180,80,0.6);", "color: #D08000;")
    css_part = css_part.replace("background: rgba(255,180,80,0.05);", "background: rgba(232,108,0,0.04);")
    css_part = css_part.replace("border-left: 2px solid rgba(255,180,80,0.2);", "border-left: 2px solid rgba(232,108,0,0.3);")
    
    # Error/remove button
    css_part = css_part.replace("background: rgba(255,80,80,0.1);", "background: rgba(220,38,38,0.06);")
    css_part = css_part.replace("color: rgba(255,80,80,0.5);", "color: rgba(220,38,38,0.5);")
    css_part = css_part.replace("background: rgba(255,80,80,0.2);", "background: rgba(220,38,38,0.1);")
    css_part = css_part.replace("color: rgba(255,80,80,0.8);", "color: rgba(220,38,38,0.8);")
    
    # Remaining hex colors
    css_part = css_part.replace("#e8e8f0", "#111111")
    css_part = css_part.replace("#0e0e10", "#FFFFFF")
    
    html = css_part + js_part
    
    # ═══════════════════════════════════════════════════
    # PHASE 7: SCENES PANEL OVERHAUL
    # ═══════════════════════════════════════════════════
    
    # Scene group headers
    html = html.replace(
        "color: rgba(255,255,255,0.30);",
        "color: #999999;"
    )
    
    # Scene card text
    html = html.replace(
        "color: rgba(255,255,255,0.60);",
        "color: #555555;"
    )
    
    # ═══════════════════════════════════════════════════
    # PHASE 8: SPACETIME CONTROLS
    # ═══════════════════════════════════════════════════
    
    # Spacetime controls panel background
    html = html.replace(
        "background: rgba(0,0,0,0.25);\n    backdrop-filter:",
        "background: rgba(255,255,255,0.95);\n    backdrop-filter:"
    )
    
    # ST preset chips
    html = html.replace(
        "background: rgba(255,255,255,0.04);\n    border: 1px solid rgba(255,255,255,0.08);",
        "background: #F6F6F4;\n    border: 1px solid #D9D9D4;"
    )
    
    # ═══════════════════════════════════════════════════
    # PHASE 9: INLINE STYLE OVERRIDES IN HTML BODY
    # ═══════════════════════════════════════════════════
    
    # Quantum observer panel background
    html = html.replace(
        'background: #111114',
        'background: #FFFFFF'
    )
    
    # Coarse-graining label text
    html = html.replace(
        'color: rgba(255,255,255,0.5)',
        'color: #555555'
    )
    
    # Status bar text
    html = html.replace(
        "color: rgba(255,255,255,0.35)",
        "color: #777777"
    )
    
    # ═══════════════════════════════════════════════════
    # PHASE 10: INJECT WOLFRAM THEME OVERRIDE CSS
    # ═══════════════════════════════════════════════════
    
    # Add a comprehensive override block right before </style> to catch
    # any remaining dark-theme patterns and apply Wolfram polish
    wolfram_override_css = """
    
  /* ═══ WOLFRAM BRAND OVERRIDE ═══ */
  
  /* Panels: clean white with subtle borders */
  .panel {
    background: #FFFFFF !important;
    color: #111111;
  }
  
  /* Section titles */
  .section-title {
    color: #555555;
    border-bottom-color: #E6E6E0;
  }
  
  /* All text in panels */
  .panel h3, .panel h4 {
    color: #111111;
  }
  .panel p, .panel span, .panel label, .panel .desc {
    color: #555555;
  }
  
  /* Accent links and highlights */
  a, .highlight, .accent-text {
    color: #E86C00;
  }
  
  /* View tabs container - minimal editorial bar */
  .view-tabs-container {
    background: #FFFFFF;
    border-bottom: 1px solid #D9D9D4;
    box-shadow: none;
  }
  
  /* Scenes button */
  .scenes-btn, #scenes-btn {
    background: #FFFFFF;
    border: 1px solid #D9D9D4;
    color: #111111;
  }
  .scenes-btn:hover, #scenes-btn:hover {
    border-color: #E86C00;
    color: #E86C00;
  }
  .scenes-btn.open, #scenes-btn.open {
    background: #E86C00;
    color: #FFFFFF;
    border-color: #E86C00;
  }
  
  /* Scenes panel */
  #scenes-panel {
    background: rgba(255,255,255,0.97) !important;
    backdrop-filter: blur(12px);
    border: 1px solid #D9D9D4;
  }
  #scenes-panel .scene-card {
    background: #FFFFFF;
    border: 1px solid #E6E6E0;
    color: #111111;
    border-radius: 8px;
  }
  #scenes-panel .scene-card:hover {
    border-color: #E86C00;
    background: #FAFAFA;
  }
  #scenes-panel .scene-card.active {
    border-color: #E86C00;
    background: rgba(232,108,0,0.04);
  }
  #scenes-panel .scene-card h4 {
    color: #111111;
  }
  #scenes-panel .scene-card p {
    color: #555555;
  }
  #scenes-panel .scene-badge {
    background: rgba(232,108,0,0.1);
    color: #E86C00;
  }
  #scenes-panel .scene-group-title {
    color: #999999;
  }
  
  /* Tool toggles — pill switches */
  .tool-toggle {
    background: #E6E6E0;
    border: 1px solid #D9D9D4;
    color: #999999;
  }
  .tool-toggle[style*="color: rgba(0,240,255"] {
    color: #E86C00 !important;
  }
  
  /* Tool section backgrounds */
  .tool-section {
    background: transparent;
    border: none;
  }
  
  /* Tool titles */
  .tool-title {
    color: #111111;
  }
  
  /* Tool descriptions */
  .tool-desc {
    color: #555555;
  }
  
  /* Tool results */
  .tool-result {
    background: #F6F6F4;
    border: 1px solid #E6E6E0;
    border-radius: 6px;
    color: #333333;
  }
  
  /* Statistics section */
  .stat-row {
    color: #555555;
    border-bottom-color: #E6E6E0;
  }
  .stat-row span:last-child {
    color: #111111;
    font-weight: 600;
  }
  
  /* Frame chips */
  .tool-btn {
    background: #F6F6F4;
    border: 1px solid #D9D9D4;
    color: #555555;
  }
  .tool-btn:hover {
    border-color: #E86C00;
    color: #E86C00;
  }
  .tool-btn.active {
    background: #E86C00;
    color: #FFFFFF;
    border-color: #E86C00;
  }
  
  /* Coarse-graining section */
  #quantum-observer-panel {
    background: #FFFFFF !important;
    border: 1px solid #E6E6E0;
    border-radius: 8px;
    margin-bottom: 16px;
  }
  
  /* Causal invariance bar */
  .causal-bar-bg {
    background: #E6E6E0 !important;
  }
  .causal-bar-fg {
    background: #E86C00 !important;
  }
  
  /* Big idea text at bottom of left panel */
  #left-panel .big-idea, .big-idea-text {
    color: #555555;
    border-top: 1px solid #E6E6E0;
    padding-top: 16px;
  }
  
  /* Spacetime controls overlay */
  #spacetime-controls {
    background: rgba(255,255,255,0.97) !important;
    backdrop-filter: blur(12px);
    border: 1px solid #D9D9D4;
  }
  #spacetime-controls input, #spacetime-controls select {
    background: #F6F6F4;
    border: 1px solid #D9D9D4;
    color: #111111;
  }
  #spacetime-controls label, #spacetime-controls .ctrl-label {
    color: #555555;
  }
  
  /* ST dimension readout */
  .st-dim-readout {
    background: #F6F6F4 !important;
    border: 1px solid #E6E6E0;
    border-radius: 8px;
  }
  .st-dim-value {
    color: #E86C00 !important;
  }
  .st-dim-label {
    color: #555555 !important;
  }
  
  /* ST evolve button */
  #btn-st-evolve {
    background: #E86C00 !important;
    color: #FFFFFF !important;
    border: none;
    border-radius: 6px;
    font-weight: 600;
  }
  #btn-st-evolve:hover {
    background: #D05E00 !important;
  }
  
  /* ST info elements */
  #st-cone-info, #st-entangle-info {
    background: #F6F6F4;
    border: 1px solid #E6E6E0;
    border-radius: 6px;
    color: #333333;
  }
  
  /* Dimension heatmap legend */
  .st-gradient-bar {
    background: linear-gradient(to right, #4A90D9, #E86C00, #DC2626) !important;
  }
  .st-gradient-labels span {
    color: #555555 !important;
  }
  
  /* Intensity chart */
  .intensity-chart canvas {
    filter: none;
  }
  
  /* Status bar at bottom of center */
  #status {
    color: #777777;
    background: rgba(255,255,255,0.85);
  }
  
  /* Keyboard shortcut hints */
  kbd, .kbd-hint {
    background: #F6F6F4;
    border: 1px solid #D9D9D4;
    color: #555555;
    border-radius: 4px;
  }
  
  /* Branchial graph mini-viz background */
  #branchial-graph-container, .branchial-mini {
    background: #1A1A1A;
    border-radius: 8px;
    border: 1px solid #E6E6E0;
  }
  
  /* Footer attribution */
  footer a, .attribution a {
    color: #E86C00;
  }
  
  /* Custom scrollbars for light theme */
  .panel::-webkit-scrollbar {
    width: 6px;
  }
  .panel::-webkit-scrollbar-track {
    background: transparent;
  }
  .panel::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.12);
    border-radius: 3px;
  }
  .panel::-webkit-scrollbar-thumb:hover {
    background: rgba(0,0,0,0.2);
  }
"""
    
    html = html.replace('</style>', wolfram_override_css + '\n</style>')
    
    # ═══════════════════════════════════════════════════
    # PHASE 11: INLINE JS COLOR PATCHES
    # (Only the UI-facing ones — not Three.js scene colors)
    # ═══════════════════════════════════════════════════
    
    # Toggle activation colors in JS event handlers
    # These set toggle.style.color when features are activated
    # Light cone: lime → orange
    html = html.replace(
        "stLightConeToggle.style.color = _stLightConeActive ? 'rgba(204,255,0,0.8)' : '';",
        "stLightConeToggle.style.color = _stLightConeActive ? '#E86C00' : '';"
    )
    # Dim heatmap: cyan → orange
    html = html.replace(
        "stDimHeatToggle.style.color = _stDimHeatActive ? 'rgba(0,240,255,0.8)' : '';",
        "stDimHeatToggle.style.color = _stDimHeatActive ? '#E86C00' : '';"
    )
    # Entanglement: purple → orange
    html = html.replace(
        "stEntangleToggle.style.color = _stEntangleActive ? 'rgba(112,0,255,0.8)' : '';",
        "stEntangleToggle.style.color = _stEntangleActive ? '#E86C00' : '';"
    )
    # Scene feature activation toggles
    html = html.replace(
        "lcToggle.style.color = 'rgba(204,255,0,0.8)';",
        "lcToggle.style.color = '#E86C00';"
    )
    html = html.replace(
        "dhToggle.style.color = 'rgba(204,255,0,0.8)';",
        "dhToggle.style.color = '#E86C00';"
    )
    html = html.replace(
        "etToggle.style.color = 'rgba(204,255,0,0.8)';",
        "etToggle.style.color = '#E86C00';"
    )
    
    # Ricci toggle
    html = html.replace(
        "ricciToggle.style.color = _ricciActive ? 'rgba(80,220,140,0.8)' : '';",
        "ricciToggle.style.color = _ricciActive ? '#E86C00' : '';"
    )
    
    # Heatmap toggle (multiway physics)
    html = html.replace(
        "heatmapToggle.style.color = _heatmapActive ? 'rgba(0,240,255,0.8)' : '';",
        "heatmapToggle.style.color = _heatmapActive ? '#E86C00' : '';"
    )
    
    # Geodesic toggle
    html = html.replace(
        "geodesicToggle.style.color = _geodesicActive ? 'rgba(0,240,255,0.8)' : '';",
        "geodesicToggle.style.color = _geodesicActive ? '#E86C00' : '';"
    )
    
    # Branchial 3D toggle
    html = html.replace(
        "_branchial3dActive ? 'rgba(0,240,255,0.8)' : ''",
        "_branchial3dActive ? '#E86C00' : ''"
    )
    
    # Fubini-Study toggle
    html = html.replace(
        "_fubiniStudyActive ? 'rgba(0,240,255,0.8)' : ''",
        "_fubiniStudyActive ? '#E86C00' : ''"
    )
    
    # Branchial geodesic toggle
    html = html.replace(
        "_geodesicActive ? 'rgba(204,255,0,0.8)' : ''",
        "_geodesicActive ? '#E86C00' : ''"
    )
    
    # Embedded observer toggle
    html = html.replace(
        "_embeddedObserverActive ? 'rgba(112,0,255,0.8)' : ''",
        "_embeddedObserverActive ? '#E86C00' : ''"
    )
    
    # Energy toggle
    html = html.replace(
        "_energyActive ? 'rgba(255,180,80,0.8)' : ''",
        "_energyActive ? '#E86C00' : ''"
    )
    
    # Zeno toggle
    html = html.replace(
        "_zenoActive ? 'rgba(204,255,0,0.8)' : ''",
        "_zenoActive ? '#E86C00' : ''"
    )
    
    # Observer highlight color in JS
    # Keep these as-is since they're for the 3D scene
    # (the cyan/purple/lime on the dark 3D canvas is intentional)
    
    return html


if __name__ == '__main__':
    with open('index.html', 'r') as f:
        html = f.read()
    
    html = apply_wolfram_theme(html)
    
    with open('index.html', 'w') as f:
        f.write(html)
    
    print("Wolfram brand theme applied successfully!")
    print(f"File size: {len(html):,} characters")
