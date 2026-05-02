// Vuexy-inspired dark palette.
// - Background: deep indigo-slate (#28243d)
// - Cards: slightly lighter slate (#312d4b) with subtle purple tint
// - Primary: vibrant purple (#8c57ff) - the brand color
// - Accent (legacy "accent" name): same purple, kept for code compat
export const C = {
  // Surfaces
  bg: '#28243d',           // app background — deep indigo-slate
  surface: '#312d4b',      // primary card surface
  raised: '#3b3559',       // raised card / hover state
  card: '#3b3559',         // alias of raised (legacy code uses C.card)
  border: 'rgba(255,255,255,0.08)',
  borderHi: '#8c57ff',

  // Text
  text: '#e7e3fc',         // primary text on dark
  muted: '#a59ec9',        // secondary text
  dim: '#6e6b7b',          // disabled / hint

  // Brand purple (replaces former teal "accent")
  accent: '#8c57ff',
  accentDim: 'rgba(140,87,255,0.16)',
  accentBorder: 'rgba(140,87,255,0.5)',

  // Status colors (Vuexy style)
  crit: '#ff4c51',         // danger red
  critDim: 'rgba(255,76,81,0.16)',
  warn: '#ffb400',         // warning amber
  warnDim: 'rgba(255,180,0,0.16)',
  info: '#16b1ff',         // info blue
  infoDim: 'rgba(22,177,255,0.16)',
  ok: '#56ca00',           // success green
  okDim: 'rgba(86,202,0,0.16)',

  // Secondary accents (used by agent network, badges)
  purple: '#a08cff',       // secondary purple
  purpleDim: 'rgba(160,140,255,0.16)',
  orange: '#ff9f43',
  orangeDim: 'rgba(255,159,67,0.16)',
  pink: '#ff5b9b',
  pinkDim: 'rgba(255,91,155,0.16)',
} as const;
