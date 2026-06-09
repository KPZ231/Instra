---
name: Executive Precision
colors:
  surface: '#121410'
  surface-dim: '#121410'
  surface-bright: '#383a35'
  surface-container-lowest: '#0d0f0b'
  surface-container-low: '#1b1c18'
  surface-container: '#1f201c'
  surface-container-high: '#292a26'
  surface-container-highest: '#343531'
  on-surface: '#e3e3dc'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e3e3dc'
  inverse-on-surface: '#30312c'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#cbc6bc'
  on-secondary: '#32302a'
  secondary-container: '#49473f'
  on-secondary-container: '#b9b5ab'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e7e2d8'
  secondary-fixed-dim: '#cbc6bc'
  on-secondary-fixed: '#1d1c16'
  on-secondary-fixed-variant: '#49473f'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#121410'
  on-background: '#e3e3dc'
  surface-variant: '#343531'
  pitch-black: '#000000'
  surface-charcoal: '#121212'
  accent-bone: '#E8E3D9'
  success-green: '#00FF41'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 72px
    fontWeight: '600'
    lineHeight: 80px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

This design system embodies a **High-Contrast / Modern** aesthetic tailored for the elite fintech sector. The brand personality is authoritative yet innovative, aiming to evoke a sense of absolute security and technical sophistication. It is designed for founders, investors, and financial operators who demand clarity and speed.

The visual direction utilizes a "Dark Mode by Default" strategy, leveraging deep obsidian surfaces contrasted against sharp, high-legibility accents. The style draws from **Minimalism** and **Technical Brutalism**, using generous whitespace, precise mono-spaced data points, and a restricted color palette to signal a premium, institutional-grade product. Every element is intentional, removing decorative fluff in favor of functional elegance.

## Colors

The palette is rooted in a pure black (`#000000`) and near-black (`#040503`) foundation to create infinite depth. Primary interactions and high-level information are rendered in pure white (`#FFFFFF`) for maximum contrast. 

A secondary "Bone" color (`#E8E3D9`) is utilized for secondary text and borders to soften the interface where pure white would be too jarring. For status indicators, particularly in financial charts or success states, a high-vibrancy "Matrix Green" is used sparingly to maintain the technical, data-driven atmosphere. All colors must adhere to AA contrast ratios against the dark background.

## Typography

Typography is used as a structural element. The primary typeface, **Hanken Grotesk**, provides a sharp, modern sans-serif look for headlines and primary UI elements. It is chosen for its precise geometry and professional neutrality.

For data-heavy areas—transaction hashes, balances, timestamps, and secondary labels—**JetBrains Mono** is employed. This monospaced font reinforces the "fintech" and "developer-friendly" nature of the product, ensuring that numerical data aligns perfectly for easy scanning. Headlines use tight letter spacing for a more aggressive, premium feel, while mono-spaced labels use increased letter spacing for clarity at small sizes.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop to maintain a controlled, editorial feel. A 12-column grid is used with generous 24px gutters. For mobile, the system transitions to a 4-column fluid grid with 20px side margins.

Spacing follows a strict 8px base unit. Component internal padding should be generous (16px or 24px) to ensure the UI feels "breathable" despite the high-contrast color scheme. Section vertical spacing should be aggressive (80px to 120px) to distinguish different content blocks without the need for heavy dividers.

## Elevation & Depth

In this dark-centric system, depth is conveyed through **Tonal Layers** rather than shadows. 
- **Level 0 (Background):** Pure `#000000`.
- **Level 1 (Cards/Surfaces):** `#040503` or a subtle 1px border of `#FFFFFF` with 10% opacity.
- **Level 2 (Popovers/Modals):** A slightly lighter charcoal (`#121212`) with a subtle 1px bone-colored border.

Shadows, when used, are "Ambient Shadows"—extremely soft, blurred, and low-opacity black glows that serve to lift an element just enough to define its edges against the background. We avoid heavy drop shadows in favor of hair-line borders (0.5pt to 1pt).

## Shapes

The shape language is "Soft" yet disciplined. While the overall vibe is sharp and professional, a small border radius (4px to 8px) is applied to buttons and cards to prevent the UI from feeling hostile. 

- **Primary Buttons:** 4px radius (Soft) for a focused, "tool-like" appearance.
- **Form Inputs:** 4px radius.
- **Large Container Cards:** 8px (Soft-lg) to subtly frame content.
- **Icons:** Sharp corners or very minimal rounding to match the monospaced font aesthetic.

## Components

### Buttons
- **Primary:** Solid white background with pure black text. No shadow. 4px border radius.
- **Secondary:** Transparent background with a 1px bone (`#E8E3D9`) border and bone text.
- **Ghost:** No background or border. Text only, underlining on hover.

### Input Fields
- Dark background (`#040503`) with a 1px border of 20% white. On focus, the border becomes 100% white. Labels use **JetBrains Mono** caption style.

### Cards
- Cards use a subtle 1px border of `#FFFFFF` at 10% opacity. For hover states, the border opacity increases to 40%. No fill color is needed if the background is Level 0.

### Lists & Data Tables
- Use **JetBrains Mono** for all numerical values. Rows are separated by thin 1px lines at 5% opacity. High-vibrancy green is used for positive percentage changes; no color (white) for negative to maintain a minimalist aesthetic unless critical.

### Chips/Tags
- Small, uppercase **JetBrains Mono** text. Rectangular with 2px radius. Bone-colored border with no background fill.