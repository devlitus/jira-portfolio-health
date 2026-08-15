---
name: Executive Oversight
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fd'
  surface-container: '#ededf8'
  surface-container-high: '#e7e7f2'
  surface-container-highest: '#e1e2ec'
  on-surface: '#191b23'
  on-surface-variant: '#434654'
  inverse-surface: '#2e3038'
  inverse-on-surface: '#f0f0fb'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#535f73'
  on-secondary: '#ffffff'
  secondary-container: '#d4e0f8'
  on-secondary-container: '#576377'
  tertiary: '#7b2600'
  on-tertiary: '#ffffff'
  tertiary-container: '#a33500'
  on-tertiary-container: '#ffc6b2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#d7e3fb'
  secondary-fixed-dim: '#bbc7de'
  on-secondary-fixed: '#101c2d'
  on-secondary-fixed-variant: '#3b475b'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59b'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#812800'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ec'
  status-healthy: '#36B37E'
  status-at-risk: '#FFAB00'
  status-critical: '#FF5630'
  surface-slate: '#F4F5F7'
  text-heading: '#172B4D'
  text-body: '#42526E'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.06em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  data-mono:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin: 32px
  stack-sm: 4px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is engineered for **Executive and Decisive** leadership. It prioritizes high-stakes decision-making by distilling complex Jira data into immediate, actionable insights. The brand personality is authoritative, transparent, and focused.

The chosen style is **Corporate / Modern**, heavily influenced by the Atlassian Design System but elevated for an executive audience. It utilizes a **"Data-First"** philosophy, where whitespace is used strategically to reduce cognitive load and focus attention on the "10-second rule"—the ability to assess portfolio health at a glance. The aesthetic is clean and professional, using subtle refinements to differentiate from standard operational tools, signaling a "command center" environment.

Key principles:
- **Explainability:** Visual indicators are always paired with logical justifications.
- **Deterministic UI:** Every color and status is derived from strict numeric thresholds.
- **Actionability:** The interface prioritizes the "Top Attention" queue to drive behavior.

## Colors
The palette is governed by a **Semantic Traffic Light** system. These colors are not merely decorative; they are functional tokens linked to fixed numeric thresholds.

- **Primary:** The classic Atlassian Blue (`#0052CC`) is used for primary actions and navigation to maintain platform consistency.
- **Semantic Status:** 
    - **Green (Healthy):** Used for scores 80–100 and positive trends.
    - **Amber (At-Risk):** Used for scores 60–79 and cautionary growth.
    - **Red (Critical):** Used for scores 0–59 and high-risk indicators (>25% scope growth).
- **Neutral:** A range of Slates and Grays are used for the UI chrome, typography, and secondary elements to ensure the semantic colors remain the primary focal points.

## Typography
The system uses **Inter** for all UI elements to ensure maximum legibility and a modern, neutral tone. For technical data, math formulas, and health factor weights, **JetBrains Mono** is introduced to provide a distinct visual "texture" for raw data.

- **Display Hero:** Specifically for the 0-100 overall health score.
- **Headline SM:** Used for section titles like "PORTFOLIO HEALTH" to create clear structural boundaries.
- **Data Mono:** Ensures that numeric values and formulas are easily scannable and distinguished from descriptive text.
- **Mobile Adaption:** For mobile views, `display-hero` scales down to 32px, and `headline-lg` scales to 20px to maintain readability without excessive scrolling.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for desktop to maintain a "dashboard" feel that doesn't feel overly stretched on large enterprise monitors. 

- **Grid Model:** 12-column grid with a maximum content width of 1280px.
- **Rhythm:** An 8px base unit governs all dimensions.
- **Information Hierarchy:**
    1. **Executive Summary:** Top-row aggregate stats (Overall Health, Project Counts).
    2. **Attention Queue:** A prioritized list (Severity > Score > Deterioration) on the left or top.
    3. **Data Grid:** A comprehensive "Health by Project" table with high-density rows.
- **Breakpoints:**
    - **Desktop (1024px+):** Full 12-column dashboard.
    - **Tablet (768px - 1023px):** Sidebars collapse into drawers; 2-column stats stack.
    - **Mobile (<767px):** Single column vertical flow; primary score sticky at top.

## Elevation & Depth
To align with the "low-configuration" and "data-driven" aesthetic, this design system uses **Tonal Layers** and **Low-contrast outlines** rather than heavy shadows.

- **Surface Tiers:** Backgrounds use `#F4F5F7`, while primary content cards and containers use `#FFFFFF`. This subtle shift creates depth without visual noise.
- **Borders:** Containers use a 1px solid border in `#DFE1E6`. 
- **Active State:** Elements under focus or selection use a subtle `#0052CC` (2px) border or a light blue tinted background.
- **Dividers:** Use soft horizontal rules to separate dimensions within project details, maintaining a "flat but structured" feel.

## Shapes
The shape language is **Soft (0.25rem)**. This provides a professional, "standard-issue" feel that integrates seamlessly with the Jira environment. 

- **Small (4px):** Used for buttons, input fields, and status chips.
- **Large (8px):** Used for primary dashboard cards and the "Overall Health" hero container.
- **Circular:** Used exclusively for trend indicators (↑, ↓) and status pips to make them easily distinguishable from rectangular data containers.

## Components
Consistent component styling ensures the system feels like a high-end extension of Jira.

- **Status Chips:** High-contrast background with white text for "Critical", "At-Risk", and "Healthy" labels. Use the semantic colors defined in the palette.
- **Trend Indicators:** Small circular or semi-rounded badges containing arrow icons. Green for `↑`, Orange/Amber for `→` (when stagnant is negative), and Red for `↓`.
- **Health Progress Bars:** Low-profile linear bars using semantic color fills to represent the 0-100 score visually.
- **Actionable Cards:** Cards in the "Top Attention" queue should feature a left-accent border (4px) in the color of their current status (e.g., a Red border for Critical projects).
- **Data Tables:** High-density, zebra-striped rows with `jetbrainsMono` for numeric columns. Headers should be `headline-sm` (uppercase).
- **Buttons:** Follow Atlassian's primary/secondary/ghost button styles, using the 4px roundedness.
- **Explainer Tooltips:** Since the system is "Explainable by Default," tooltips are essential. Use dark slate backgrounds with white `body-sm` text to explain specific health factor deductions.