// i18n-react.jsx — React hook + LangSwitcher pill component
/* global React */

const { useState: i18nUseState, useEffect: i18nUseEffect, useRef: i18nUseRef, useSyncExternalStore: i18nUseSync } = React;

// Hook — re-renders any component using t() when the language changes.
function useT() {
  const subscribe = (cb) => window.__I18N.onChange(cb);
  const getSnap = () => window.__I18N.getLang();
  // useSyncExternalStore is the canonical approach; falls back to forceUpdate
  // on older React versions (we're on 18.3, so safe).
  i18nUseSync(subscribe, getSnap, getSnap);
  return window.__I18N.t;
}

// LangSwitcher — pill with current flag + code, opens dropdown with full list.
// Two visual variants:
//   onDark={true}  → semi-transparent white-on-navy (Onboarding header)
//   onDark={false} → white card with border (Eligibility header — light area)
function LangSwitcher({ onDark = true, anchorRight = true }) {
  useT(); // re-render on language change so flag/code update
  const [open, setOpen] = i18nUseState(false);
  const ref = i18nUseRef(null);
  const cur = window.__I18N.LANGS.find((l) => l.code === window.__I18N.getLang())
           || window.__I18N.LANGS[0];

  i18nUseEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const trigger = (
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
        <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  return (
    <div className={"lang-switcher" + (anchorRight ? " is-right" : " is-left")} ref={ref}>
      {trigger}
      {open && (
        <ul className="lang-menu" role="listbox">
          {window.__I18N.LANGS.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
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

Object.assign(window, { useT, LangSwitcher });
