/* global React, Flag */
// checker-flag-lang.jsx — checker-specific i18n React UI.
//
// Three exports go to window:
//
//   useT          — React hook that subscribes to window.__I18N and returns t()
//   Flag          — round-flag <img> from window.__FLAGS, falls back to a
//                   deterministic 2-letter badge disc for unknown country codes
//   LangSwitcher  — the pill + dropdown menu in the page header
//
// Loaded as <script type="text/babel" src="/checker-flag-lang.jsx"> early
// in the load order (right after /icons.jsx) so all subsequent files —
// /checker-atoms.jsx, /checker-screens.jsx, /checker-modals.jsx — can
// resolve `useT` / `Flag` from window at render time.
//
// This file owns the React-hook destructure at top level. All subsequent
// classic scripts (/checker-screens.jsx, /checker-modals.jsx) reference
// useState/useEffect/etc. unqualified and resolve them at render time via
// the per-realm Global Lexical Declarations slot. Keeping the destructure
// here (loaded early) means the inline text/babel block in /index.html
// shrinks to just ReactDOM.createRoot.

const { useState, useEffect, useRef, useMemo, useLayoutEffect, useSyncExternalStore } = React;

// ──────────────────── i18n React binding ────────────────────
function useT() {
  useSyncExternalStore(
    (cb) => window.__I18N.onChange(cb),
    () => window.__I18N.getLang(),
    () => window.__I18N.getLang()
  );
  return window.__I18N.t;
}

// ──────────────────── Flag ────────────────────
// Renders the inline base64 data URI for the country code from
// window.__FLAGS (bootstrapped by /inline-flags.js). Falls back to a
// deterministic 2-letter coloured badge disc for unknown codes.
// Currency codes resolved via CURRENCY_TO_COUNTRY.

const FLAG_FILES = new Set([
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX",
  "AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ",
  "BR","BS","BT","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL",
  "CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO",
  "DZ","EC","EE","EG","EH","ER","ES","ET","EU","FI","FJ","FK","FM","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS",
  "GT","GU","GW","GY","HK","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO",
  "IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP",
  "KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR",
  "MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL",
  "NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN",
  "PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD",
  "SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX",
  "SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT",
  "TV","TW","TZ","UA","UG","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU",
  "WF","WS","YE","YT","ZA","ZM","ZW",
]);
const CURRENCY_TO_COUNTRY = {
  GBP: "GB", USD: "US", EUR: "EU", AUD: "AU", CAD: "CA", CHF: "CH",
  CNY: "CN", DKK: "DK", HKD: "HK", IDR: "ID", INR: "IN", JPY: "JP",
  KRW: "KR", MXN: "MX", MYR: "MY", NOK: "NO", NZD: "NZ", PHP: "PH",
  PLN: "PL", RUB: "RU", SAR: "SA", SEK: "SE", SGD: "SG", THB: "TH",
  TRY: "TR", UAH: "UA", VND: "VN", ZAR: "ZA", AED: "AE",
};

const Flag = ({ code, size = 20, style }) => {
  if (!code) return null;
  const upper = String(code).toUpperCase();
  const country = CURRENCY_TO_COUNTRY[upper] || upper;

  const dataUri = window.__FLAGS && window.__FLAGS[country];
  if (dataUri) {
    return (
      <img
        src={dataUri}
        width={size} height={size} alt="" aria-hidden="true"
        style={{
          flex: "0 0 auto", width: size, height: size,
          borderRadius: "50%", display: "inline-block",
          verticalAlign: "middle", objectFit: "cover", ...style,
        }}
      />
    );
  }

  // Unknown code → deterministic 2-letter badge disc
  const seed = (country.charCodeAt(0) * 31 + (country.charCodeAt(1) || 0)) % 360;
  const bg = `hsl(${seed} 32% 88%)`;
  const fg = `hsl(${seed} 38% 28%)`;
  return (
    <span aria-hidden="true" style={{
      flex: "0 0 auto", display: "inline-flex",
      alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: "50%",
      background: bg, color: fg,
      fontSize: Math.max(8, Math.round(size * 0.42)),
      fontWeight: 700, letterSpacing: "0.02em",
      fontFamily: "var(--ff)", lineHeight: 1, userSelect: "none",
      ...style,
    }}>
      {country.slice(0, 2)}
    </span>
  );
};

// ──────────────────── LangSwitcher ────────────────────
function LangSwitcher({ onDark = true, anchorRight = true }) {
  useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cur = window.__I18N.LANGS.find((l) => l.code === window.__I18N.getLang())
           || window.__I18N.LANGS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={"lang-switcher" + (anchorRight ? " is-right" : " is-left")} ref={ref}>
      <button
        type="button"
        className={"lang-pill" + (onDark ? " is-dark" : " is-light")}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="lang-pill__flag"><Flag code={cur.flag} size={18} /></span>
        <span className="lang-pill__code">{cur.code.toUpperCase()}</span>
        <svg className="lang-pill__caret" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
          <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="lang-menu" role="listbox">
          {window.__I18N.LANGS.map((l) => (
            <li key={l.code}>
              <button
                type="button" role="option"
                aria-selected={l.code === cur.code}
                className={"lang-menu__item" + (l.code === cur.code ? " is-current" : "")}
                onClick={() => { window.__I18N.setLang(l.code); setOpen(false); }}
              >
                <span className="lang-menu__flag"><Flag code={l.flag} size={18} /></span>
                <span className="lang-menu__name">{l.nativeName}</span>
                <span className="lang-menu__code">{l.code.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

Object.assign(window, { useT, Flag, LangSwitcher });
