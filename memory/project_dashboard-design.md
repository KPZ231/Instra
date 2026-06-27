---
name: dashboard-design
description: Dashboard UI layout and design vision  adapted from user reference image to DESIGN.md Executive Precision dark theme
metadata:
  type: project
---

Dashboard visual direction  adapted to DESIGN.md "Executive Precision" dark theme. DO NOT implement until user asks.

## Overall Structure

**3-column layout:**
- Left: narrow sidebar (~240px)
- Center: main content bento grid (flex-1)
- Right: optional activity panel or collapsed

**Background:** pitch-black `#000000`
**Sidebar bg:** `#0d0f0b` (surface-container-lowest)
**Cards:** `#1f201c` (surface-container) + 1px `rgba(255,255,255,0.1)` border; hover → 40%

## Top Header Bar
- Logo left + breadcrumb in JetBrains Mono caption, bone `#E8E3D9`
- Right: notifications icon + user avatar (bone-tinted)
- Height: ~64px; 1px bottom border `rgba(255,255,255,0.05)`

## Left Sidebar
- Nav items: icon + uppercase JetBrains Mono label, bone colored
- Active state: white text + 2px left accent border (white)
- Plugin slot: `sidebar` widget area (dashed border placeholder when empty)

## Bento Grid  Main Content
Cards use 8px base spacing, 8px border-radius (Soft-lg).

### Row 1  Stats (4 cards, equal width)
Each card shows:
- Metric name: JetBrains Mono caption-mono, `#c4c7c8` (on-surface-variant)
- Large number: Hanken Grotesk headline-lg (48px/600), white `#FFFFFF`
- Delta/trend: JetBrains Mono label-mono, success-green `#00FF41` for positive, bone for negative (minimalist)

Metrics: Posts Published · Total Reach · Avg. Engagement · Followers Growth

### Row 2  Chart + Activity Feed
**Chart card (2/3 width):**
- Area/line chart, dark bg, axes in JetBrains Mono caption-mono bone
- Title: Hanken Grotesk body-lg white
- Time range selector: chips (JetBrains Mono, bone border, 2px radius, uppercase)

**Activity Feed (1/3 width):**
- Title: "Recent Activity" in Hanken Grotesk body-lg
- Rows: icon + text + timestamp (JetBrains Mono caption), separated by 1px `rgba(255,255,255,0.05)`
- Plugin slot: `dashboard:sidebar` widget area

### Row 3  Quick Actions + Plugin Slots
- Quick Actions card: ghost buttons (bone border, bone text, no fill)
- Plugin slot placeholders: dashed 1px bone border, centered label "Plugin Slot"

## Typography Rules
- All large numbers/KPIs: Hanken Grotesk 600
- All labels, timestamps, percentages, codes: JetBrains Mono
- Body copy: Hanken Grotesk 400, `#c4c7c8`

**Why:** User provided a reference screenshot of desired dashboard layout and asked to memorize it adapted to DESIGN.md style  implementation deferred.
**How to apply:** When user asks to build the dashboard, use this as the spec; cross-reference with DESIGN.md for exact color tokens.
