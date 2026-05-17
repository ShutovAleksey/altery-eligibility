/* global React */
// icons.jsx — shared inline-SVG icon set, stroke-based, 20px default.
//
// Single source of truth for both surfaces:
//   - /index.html (checker)         — loaded as <script src="/icons.jsx">
//   - /setup/index.html (onboarding) — loaded as <script src="/icons.jsx">
//
// Rendered by name lookup against the ICONS map; renders null for unknown
// names (silent fail by design — broken icons should not crash the page).
//
// No {...rest} spread: keeps Babel-standalone from emitting per-script
// _excluded helpers at top level, which collide across the multiple
// text/babel script tags on each page. Any extra SVG attribute callers
// want must go through `style`.

const Icon = ({ name, size = 20, color = "currentColor", stroke = 1.6, style }) => {
  const paths = ICONS[name];
  if (!paths) return null;
  // Coerce size to a finite positive number. Without this, a CSS-var string
  // or NaN ends up in <svg width="..."/> as an invalid attribute, and iOS
  // Safari falls back to SVG-2 default (300×150) which blows up surrounding
  // flex layout. Chrome/Firefox handle it via auto flex sizing so the bug is
  // invisible on desktop.
  const px = Number.isFinite(+size) && +size > 0 ? +size : 20;
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round"
         style={{ flex: "0 0 auto", ...style }} aria-hidden="true">
      {paths}
    </svg>
  );
};

const ICONS = {
  home: <><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></>,
  wallet: <><path d="M3 7a2 2 0 012-2h12a2 2 0 012 2v1"/><path d="M3 7v10a2 2 0 002 2h15a1 1 0 001-1v-8a1 1 0 00-1-1H5a2 2 0 01-2-2z"/><circle cx="17" cy="13" r="1.2" fill="currentColor"/></>,
  send: <><path d="M21 3L10 14"/><path d="M21 3l-7 18-4-8-8-4 19-6z"/></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></>,
  exchange: <><path d="M7 4l-4 4 4 4"/><path d="M3 8h14"/><path d="M17 20l4-4-4-4"/><path d="M21 16H7"/></>,
  people: <><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15 20c0-2.2 1.8-4 4-4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5v.2a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1h-.2a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5v-.2a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1h.2a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
  bell: <><path d="M18 16V11a6 6 0 10-12 0v5l-2 3h16l-2-3z"/><path d="M10 21a2 2 0 004 0"/></>,
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  check: <><path d="M4 12l5 5L20 6"/></>,
  close: <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></>,
  chevronDown: <><path d="M6 9l6 6 6-6"/></>,
  chevronRight: <><path d="M9 6l6 6-6 6"/></>,
  chevronLeft: <><path d="M15 6l-6 6 6 6"/></>,
  arrowUp: <><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></>,
  arrowDown: <><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></>,
  arrowRight: <><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></>,
  arrowLeft: <><path d="M19 12H5"/><path d="M11 5l-7 7 7 7"/></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></>,
  download: <><path d="M12 4v12"/><path d="M6 12l6 6 6-6"/><path d="M4 20h16"/></>,
  upload: <><path d="M12 20V8"/><path d="M6 12l6-6 6 6"/><path d="M4 4h16"/></>,
  filter: <><path d="M3 5h18l-7 9v5l-4 2v-7L3 5z"/></>,
  sort: <><path d="M7 4v16"/><path d="M3 8l4-4 4 4"/><path d="M17 20V4"/><path d="M21 16l-4 4-4-4"/></>,
  eye: <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff: <><path d="M17.94 17.94A10 10 0 0112 19C5 19 1 12 1 12a17 17 0 013.66-4.6"/><path d="M9.9 4.24A10.4 10.4 0 0112 5c7 0 11 7 11 7a17.8 17.8 0 01-2.16 3.19"/><path d="M14.12 14.12A3 3 0 019.88 9.88"/><path d="M1 1l22 22"/></>,
  alert: <><path d="M10.3 3.86l-8.1 14A2 2 0 004 21h16a2 2 0 001.7-3.1l-8-14a2 2 0 00-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
  info: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>,
  check_circle: <><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></>,
  x_circle: <><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/></>,
  external: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></>,
  more: <><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></>,
  moreVertical: <><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  refresh: <><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></>,
  menu: <><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></>,
  trash: <><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></>,
  pencil: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/></>,
  star: <><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></>,
  heart: <><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 000-7.6z"/></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M9 13h.01"/><path d="M15 13h.01"/><path d="M9 17h6"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 010 18"/><path d="M12 3a14 14 0 000 18"/></>,
  logo: <><path d="M4 20L12 4l8 16H4z" fill="currentColor" stroke="none"/><path d="M9 20l3-6 3 6" stroke="white" strokeWidth="2"/></>,
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></>,
  zap: <><path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"/></>,
  help: <><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 115.8 1c0 2-3 2-3 4"/><path d="M12 17h.01"/></>,
  logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>,
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>,
  phone: <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.8 12.8 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.8 12.8 0 002.81.7A2 2 0 0122 16.92z"/></>,
  link: <><path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5"/></>,
  fileText: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></>,
  cards: <><rect x="2" y="6" width="14" height="14" rx="2"/><path d="M8 4h12a2 2 0 012 2v12"/></>,
  shield: <><path d="M12 2l8 4v6c0 5-3.5 9.4-8 10-4.5-.6-8-5-8-10V6l8-4z"/></>,
  message: <><path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9 8.5 8.5 0 018.5 8.5z"/></>,
  thumb: <><path d="M14 9V5a3 3 0 00-6 0v4"/><path d="M5 9h14l1 11H4L5 9z"/></>,
  building2: <><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18"/><path d="M2 22h20"/><path d="M10 6h.01"/><path d="M14 6h.01"/><path d="M10 10h.01"/><path d="M14 10h.01"/><path d="M10 14h.01"/><path d="M14 14h.01"/><path d="M10 18h.01"/><path d="M14 18h.01"/></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M20 14v3"/><path d="M14 20h3"/><path d="M20 20v1"/></>,
  flag: <><path d="M4 22V4"/><path d="M4 4h13l-2 5 2 5H4"/></>,
  bookmark: <><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></>,
  archive: <><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/><path d="M10 12h4"/></>,
  filterMenu: <><path d="M3 6h18"/><path d="M7 12h10"/><path d="M11 18h2"/></>,
  power: <><path d="M12 2v10"/><path d="M5.5 6.5a8 8 0 1013 0"/></>,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/></>,
  moon: <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>,
  monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></>,
};

Object.assign(window, { Icon, ICONS });
