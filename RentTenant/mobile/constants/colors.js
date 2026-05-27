/**
 * @file constants/colors.js
 * @description Centralized color palette for the mobile app.
 * Mirrors the dark theme used in the web dashboard for brand consistency.
 * Import these everywhere instead of hardcoding color strings.
 */

const Colors = {
  // ── Backgrounds ─────────────────────────────────────────────────────────
  bg:         '#0f172a',   // Page background (darkest)
  surface:    '#1e293b',   // Card / panel background
  surfaceAlt: '#243447',   // Slightly lighter card (for nested elements)
  elevated:   '#2d3f55',   // Modal, popover backgrounds

  // ── Borders ──────────────────────────────────────────────────────────────
  border:     '#334155',   // Default borders
  borderLight:'#475569',   // Hover / focused borders

  // ── Text ─────────────────────────────────────────────────────────────────
  text:       '#f1f5f9',   // Primary text (white-ish)
  textMuted:  '#94a3b8',   // Secondary / placeholder text
  textFaint:  '#64748b',   // Disabled / very secondary text

  // ── Brand ────────────────────────────────────────────────────────────────
  primary:    '#4361ee',   // Blue — primary actions
  primaryDark:'#3451d1',   // Blue pressed state

  // ── Semantic ─────────────────────────────────────────────────────────────
  success:    '#22c55e',   // Green — paid, occupied
  warning:    '#f59e0b',   // Yellow — pending, due soon
  danger:     '#ef4444',   // Red — overdue, expiring
  info:       '#3b82f6',   // Blue — info, increment

  // ── Status Badge Backgrounds ─────────────────────────────────────────────
  successBg:  '#15803d22',
  warningBg:  '#b4530022',
  dangerBg:   '#dc262622',
  infoBg:     '#1d4ed822',

  // ── Tab Bar ──────────────────────────────────────────────────────────────
  tabBar:     '#1e293b',
  tabActive:  '#4361ee',
  tabInactive:'#64748b',
};

export default Colors;
