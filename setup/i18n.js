// i18n.js — language metadata + switcher component + hook
// Loaded as plain JS (not Babel). React must already be on window.
// Dictionaries live in i18n-dict-*.js (separate files, one per scope).

(function () {
  const LANGS = [
    { code: "en", name: "English",    nativeName: "English",    flag: "GB" },
    { code: "de", name: "German",     nativeName: "Deutsch",    flag: "DE" },
    { code: "ru", name: "Russian",    nativeName: "Русский",    flag: "RU" },
    { code: "nl", name: "Dutch",      nativeName: "Nederlands", flag: "NL" },
    { code: "tr", name: "Turkish",    nativeName: "Türkçe",     flag: "TR" },
    { code: "it", name: "Italian",    nativeName: "Italiano",   flag: "IT" },
    { code: "es", name: "Spanish",    nativeName: "Español",    flag: "ES" },
    { code: "pl", name: "Polish",     nativeName: "Polski",     flag: "PL" },
    { code: "pt", name: "Portuguese", nativeName: "Português",  flag: "PT" },
    { code: "fr", name: "French",     nativeName: "Français",   flag: "FR" },
  ];

  const STORAGE_KEY = "altery.lang";

  // Master dictionary — populated by i18n-dict-*.js files. Each language
  // is merged in via `Object.assign(window.__I18N.DICT.en, {...})`.
  const DICT = {};
  LANGS.forEach((l) => { DICT[l.code] = {}; });

  function detectInitial() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && DICT[stored]) return stored;
    } catch (e) { /* SSR / privacy mode */ }
    const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    if (DICT[nav]) return nav;
    return "en";
  }

  let currentLang = detectInitial();
  const listeners = new Set();

  function getLang() { return currentLang; }
  function setLang(code) {
    if (!DICT[code]) return;
    currentLang = code;
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) {}
    listeners.forEach((fn) => fn(code));
  }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  // Translate. Falls back to English, then to the key itself.
  // Supports {var} interpolation: t("greet", { name: "Anna" }).
  function t(key, vars) {
    let str = (DICT[currentLang] && DICT[currentLang][key])
           || (DICT.en && DICT.en[key])
           || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        str = str.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
      });
    }
    return str;
  }

  window.__I18N = { LANGS, DICT, getLang, setLang, onChange, t, STORAGE_KEY };
  window.t = t; // global shortcut
})();

// ─────────── React bindings ───────────
// Loaded as Babel JSX file alongside this one (i18n-react.jsx).
