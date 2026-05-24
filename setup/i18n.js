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

  // Priority chain:
  //   1. ?lang=xx URL param  — marketing links can force a locale (saved
  //      back to storage so it sticks across navigation).
  //   2. localStorage         — user's previous explicit pick wins next.
  //   3. navigator.languages  — walk the browser's full preference list,
  //      not just the first entry, so a user whose primary is unsupported
  //      still gets the best of their secondary preferences.
  //   4. "en"                 — ultimate fallback for anyone outside our
  //      10-language coverage.
  function detectInitial() {
    try {
      const param = new URLSearchParams(window.location.search).get("lang");
      if (param) {
        const code = param.slice(0, 2).toLowerCase();
        if (DICT[code]) {
          try { localStorage.setItem(STORAGE_KEY, code); } catch (e) {}
          return code;
        }
      }
    } catch (e) {}
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && DICT[stored]) return stored;
    } catch (e) { /* SSR / privacy mode */ }
    const prefs = (navigator.languages && navigator.languages.length)
                ? navigator.languages
                : [navigator.language || "en"];
    for (let i = 0; i < prefs.length; i++) {
      const code = (prefs[i] || "").slice(0, 2).toLowerCase();
      if (DICT[code]) return code;
    }
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
