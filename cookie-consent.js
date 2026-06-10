// cookie-consent.js — first-party cookie consent for the checker (/) and
// the onboarding flow (/setup).
//
// WHY THIS EXISTS: Microsoft Clarity (session recording + heatmaps) is a
// non-essential analytics cookie. Under UK PECR / EU ePrivacy it must NOT
// load until the user has given prior opt-in consent. Previously the
// Clarity snippet ran inline on first paint on both surfaces — this module
// replaces that: Clarity now loads ONLY after the user clicks "Allow all".
// Essential cookies (the app's own state, Stripe on the payment step) are
// always on and need no consent.
//
// Self-contained on purpose: it must run before Clarity and on two surfaces
// that use different i18n bundles, so it carries its own 10-language strings
// and injects its own DS-token styles instead of depending on per-surface
// i18n/CSS load order. Plain ES5-ish so it runs with no build step.
(function () {
  "use strict";

  var COOKIE_NAME   = "altery_cookie_consent";   // value: "all" | "essential"
  var COOKIE_MAXAGE = 60 * 60 * 24 * 182;         // ~6 months, then re-ask
  var CLARITY_ID    = "ww9jtvpbv1";
  var POLICY_URL    = "https://altery.com/legal/cookies-policy/";

  // ── 10-language copy ──────────────────────────────────────────────
  // Body copy is deliberately accurate to what Altery actually runs:
  // essential cookies + Microsoft Clarity analytics. We do NOT claim
  // ad/social-media sharing (we don't do it) — a false disclosure would
  // itself be a compliance problem.
  var S = {
    en: { title: "We use cookies", body: "Essential cookies keep this site running. With your consent we also use Microsoft Clarity to understand usage and improve the experience — nothing is shared with advertisers.", policy: "Cookie Policy", reject: "Reject non-essential", allow: "Allow all", manage: "Cookie settings" },
    de: { title: "Wir verwenden Cookies", body: "Essenzielle Cookies halten diese Seite am Laufen. Mit deiner Einwilligung nutzen wir außerdem Microsoft Clarity, um die Nutzung zu verstehen und die Experience zu verbessern — nichts wird an Werbetreibende weitergegeben.", policy: "Cookie-Richtlinie", reject: "Nicht notwendige ablehnen", allow: "Alle zulassen", manage: "Cookie-Einstellungen" },
    ru: { title: "Мы используем cookies", body: "Необходимые cookies обеспечивают работу сайта. С вашего согласия мы также используем Microsoft Clarity, чтобы понимать использование и улучшать сервис — ничего не передаётся рекламодателям.", policy: "Политика cookies", reject: "Отклонить необязательные", allow: "Принять все", manage: "Настройки cookies" },
    nl: { title: "We gebruiken cookies", body: "Essentiële cookies houden deze site draaiende. Met je toestemming gebruiken we ook Microsoft Clarity om het gebruik te begrijpen en de ervaring te verbeteren — er wordt niets gedeeld met adverteerders.", policy: "Cookiebeleid", reject: "Niet-essentiële weigeren", allow: "Alles toestaan", manage: "Cookie-instellingen" },
    tr: { title: "Çerez kullanıyoruz", body: "Zorunlu çerezler bu siteyi çalıştırır. İzninizle, kullanımı anlamak ve deneyimi iyileştirmek için Microsoft Clarity de kullanırız — reklamverenlerle hiçbir şey paylaşılmaz.", policy: "Çerez Politikası", reject: "Zorunlu olmayanları reddet", allow: "Tümüne izin ver", manage: "Çerez ayarları" },
    it: { title: "Usiamo i cookie", body: "I cookie essenziali fanno funzionare il sito. Con il tuo consenso usiamo anche Microsoft Clarity per capire l'utilizzo e migliorare l'esperienza — nulla viene condiviso con gli inserzionisti.", policy: "Informativa sui cookie", reject: "Rifiuta non essenziali", allow: "Accetta tutti", manage: "Impostazioni cookie" },
    es: { title: "Usamos cookies", body: "Las cookies esenciales hacen funcionar el sitio. Con tu consentimiento también usamos Microsoft Clarity para entender el uso y mejorar la experiencia — no se comparte nada con anunciantes.", policy: "Política de cookies", reject: "Rechazar no esenciales", allow: "Permitir todas", manage: "Configuración de cookies" },
    pl: { title: "Używamy plików cookie", body: "Niezbędne pliki cookie zapewniają działanie strony. Za Twoją zgodą używamy też Microsoft Clarity, aby rozumieć użycie i ulepszać działanie — nic nie jest udostępniane reklamodawcom.", policy: "Polityka cookie", reject: "Odrzuć opcjonalne", allow: "Zezwól na wszystkie", manage: "Ustawienia cookie" },
    pt: { title: "Usamos cookies", body: "Os cookies essenciais mantêm o site a funcionar. Com o seu consentimento, usamos também o Microsoft Clarity para perceber a utilização e melhorar a experiência — nada é partilhado com anunciantes.", policy: "Política de cookies", reject: "Rejeitar não essenciais", allow: "Permitir todos", manage: "Definições de cookies" },
    fr: { title: "Nous utilisons des cookies", body: "Les cookies essentiels font fonctionner ce site. Avec votre consentement, nous utilisons aussi Microsoft Clarity pour comprendre l'usage et améliorer l'expérience — rien n'est partagé avec des annonceurs.", policy: "Politique cookies", reject: "Refuser les non essentiels", allow: "Tout accepter", manage: "Paramètres cookies" }
  };

  function t() {
    var lang = "en";
    try { if (window.__I18N && window.__I18N.getLang) lang = window.__I18N.getLang(); }
    catch (e) { /* i18n not ready — fall back to navigator */ }
    if (!S[lang]) lang = (navigator.language || "en").slice(0, 2).toLowerCase();
    return S[lang] || S.en;
  }

  // ── consent storage (first-party cookie) ──────────────────────────
  function getConsent() {
    var m = document.cookie.match(/(?:^|;\s*)altery_cookie_consent=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setConsent(v) {
    document.cookie = COOKIE_NAME + "=" + v + ";path=/;max-age=" + COOKIE_MAXAGE +
      ";SameSite=Lax" + (location.protocol === "https:" ? ";Secure" : "");
  }

  // ── Microsoft Clarity loader — fires ONLY after analytics consent ──
  function loadClarity() {
    if (window.clarity) return;            // idempotent
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);
  }

  // ── styles (DS tokens; injected once) ──────────────────────────────
  function injectStyles() {
    if (document.getElementById("altery-cc-styles")) return;
    var css =
      ".altery-cc{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;justify-content:center;padding:16px;pointer-events:none;font-family:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;}" +
      ".altery-cc__card{pointer-events:auto;max-width:920px;width:100%;background:#fff;border:1px solid #D7DAE0;border-radius:16px;box-shadow:0 10px 40px rgba(0,6,57,.16);padding:18px 20px;display:flex;gap:18px;align-items:center;flex-wrap:wrap;}" +
      ".altery-cc__text{flex:1 1 420px;min-width:260px;}" +
      ".altery-cc__title{font-size:15px;font-weight:600;color:#11141A;margin:0 0 4px;}" +
      ".altery-cc__body{font-size:13px;line-height:19px;color:#69707C;margin:0;}" +
      ".altery-cc__body a{color:#006FFF;text-decoration:underline;}" +
      ".altery-cc__actions{display:flex;gap:10px;flex:0 0 auto;flex-wrap:wrap;}" +
      ".altery-cc__btn{font:inherit;font-size:14px;font-weight:500;line-height:1;padding:12px 18px;border-radius:12px;cursor:pointer;border:1px solid transparent;transition:filter .15s,background .15s;}" +
      ".altery-cc__btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(0,111,255,.30);}" +
      ".altery-cc__btn--ghost{background:#fff;border-color:#D7DAE0;color:#11141A;}" +
      ".altery-cc__btn--ghost:hover{background:#F0EBE3;}" +
      ".altery-cc__btn--primary{background:#002780;color:#fff;}" +
      ".altery-cc__btn--primary:hover{filter:brightness(1.12);}" +
      ".altery-cc__pill{position:fixed;left:16px;bottom:16px;z-index:2147482000;pointer-events:auto;background:#fff;border:1px solid #D7DAE0;border-radius:999px;box-shadow:0 4px 16px rgba(0,6,57,.10);padding:8px 14px;font:inherit;font-size:12px;font-weight:500;color:#69707C;cursor:pointer;font-family:'Inter',ui-sans-serif,system-ui,sans-serif;}" +
      ".altery-cc__pill:hover{color:#11141A;border-color:#69707C;}" +
      ".altery-cc__pill:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(0,111,255,.30);}" +
      "@media (max-width:560px){.altery-cc__actions{width:100%;}.altery-cc__btn{flex:1 1 auto;}}";
    var el = document.createElement("style");
    el.id = "altery-cc-styles";
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ── banner + reopen pill ───────────────────────────────────────────
  var bannerEl = null;

  function removeBanner() {
    if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
    bannerEl = null;
  }

  function showPill() {
    if (document.getElementById("altery-cc-pill")) return;
    var s = t();
    var pill = document.createElement("button");
    pill.id = "altery-cc-pill";
    pill.type = "button";
    pill.className = "altery-cc__pill";
    pill.textContent = s.manage;
    pill.setAttribute("aria-label", s.manage);
    pill.addEventListener("click", function () {
      if (pill.parentNode) pill.parentNode.removeChild(pill);
      showBanner();
    });
    document.body.appendChild(pill);
  }

  function decide(value) {           // "all" | "essential"
    setConsent(value);
    removeBanner();
    if (value === "all") loadClarity();
    showPill();                       // let the user change their mind later
  }

  function showBanner() {
    injectStyles();
    var s = t();
    removeBanner();

    var wrap = document.createElement("div");
    wrap.className = "altery-cc";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", s.title);
    wrap.setAttribute("aria-live", "polite");

    var card = document.createElement("div");
    card.className = "altery-cc__card";

    var text = document.createElement("div");
    text.className = "altery-cc__text";
    var h = document.createElement("div");
    h.className = "altery-cc__title";
    h.textContent = s.title;
    var p = document.createElement("p");
    p.className = "altery-cc__body";
    p.textContent = s.body + " ";
    var a = document.createElement("a");
    a.href = POLICY_URL;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = s.policy;
    p.appendChild(a);
    text.appendChild(h);
    text.appendChild(p);

    var actions = document.createElement("div");
    actions.className = "altery-cc__actions";
    var reject = document.createElement("button");
    reject.type = "button";
    reject.className = "altery-cc__btn altery-cc__btn--ghost";
    reject.textContent = s.reject;
    reject.addEventListener("click", function () { decide("essential"); });
    var allow = document.createElement("button");
    allow.type = "button";
    allow.className = "altery-cc__btn altery-cc__btn--primary";
    allow.textContent = s.allow;
    allow.addEventListener("click", function () { decide("all"); });
    // Reject is listed first and styled with equal visual weight to Allow,
    // so rejecting is no harder than accepting (PECR/ePrivacy requirement).
    actions.appendChild(reject);
    actions.appendChild(allow);

    card.appendChild(text);
    card.appendChild(actions);
    wrap.appendChild(card);

    var mount = function () { document.body.appendChild(wrap); bannerEl = wrap; };
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount);
  }

  // ── boot ────────────────────────────────────────────────────────────
  var prior = getConsent();
  if (prior === "all") { loadClarity(); showPill(); }
  else if (prior === "essential") { showPill(); }
  else {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showBanner);
    else showBanner();
  }
})();
