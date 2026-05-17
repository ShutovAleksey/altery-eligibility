/* global React, Icon, Avatar, Tag */
// Onboarding flow — layout-only primitives.
// All form/Inputs/Buttons/Checkboxes/Banners come from components.jsx (the DS).
// This file only adds: page-specific decorative icons, the Title block,
// and the back-link top row.

const { useState, useEffect, useRef } = React;

// ──────────────────── Decorative onboarding icons ────────────────────
// Larger pictorial illustrations and a few utility glyphs that aren't
// part of the standard Icon set. Stroke 2.5px for the 64×64 illustrations,
// 1.5px for utility icons. All single-color, follow currentColor.
const Ico = {
  // Utility (16×16)
  arrowRight: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><path d="M3.5 8h9m0 0L8.5 4m4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrowLeft: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><path d="M12.5 8h-9m0 0 4-4m-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  close: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  check: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><path d="m3.5 8 3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  caret: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plus: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  edit: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><path d="M11.5 2.5 13.5 4.5M2.5 13.5 3 11l8-8 2.5 2.5-8 8L2.5 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  doc: (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M5 2.5h6L15.5 7v9.5A1.5 1.5 0 0 1 14 18H5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M11 2.5V7h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,

  // Pictorial illustrations (64×64) — used in Title.illu
  building: (p) => <svg viewBox="0 0 64 64" fill="none" {...p}><rect x="12" y="14" width="40" height="44" rx="4" stroke="currentColor" strokeWidth="2.5"/><path d="M22 24h6m-6 8h6m-6 8h6m6-16h6m-6 8h6m-6 8h6M28 58V46h8v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  shield: (p) => <svg viewBox="0 0 64 64" fill="none" {...p}><path d="M32 6 10 14v18c0 13 9 22 22 26 13-4 22-13 22-26V14L32 6Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="m22 32 7 7 13-13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  reject: (p) => <svg viewBox="0 0 64 64" fill="none" {...p}><circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2.5"/><path d="m22 22 20 20M42 22 22 42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  rocket: (p) => <svg viewBox="0 0 64 64" fill="none" {...p}><path d="M32 6c10 8 14 18 14 28v8l-6 6h-16l-6-6v-8c0-10 4-20 14-28Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><circle cx="32" cy="26" r="4" stroke="currentColor" strokeWidth="2.5"/><path d="M22 44 16 50v8l8-4M42 44l6 6v8l-8-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  hourglass: (p) => <svg viewBox="0 0 64 64" fill="none" {...p}><path d="M16 8h32M16 56h32M20 8c0 12 12 16 12 24S20 44 20 56M44 8c0 12-12 16-12 24S44 44 44 56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

// ──────────────────── Field — label + content + hint/error  ────────────────────
// Used to wrap composite fields where the DS Input doesn't have built-in label
// (e.g. when we want a custom value control).
function Field({ label, hint, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-ink-2)" }}>{label}</span>}
      {children}
      {(hint || error) && (
        <span style={{ fontSize: 12, lineHeight: "16px", color: error ? "var(--c-danger)" : "var(--c-muted)" }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}

// Back link row — fixed-height anchor so titles align across screens.
function TopRow({ onBack }) {
  const t = useT();
  return (
    <div className="ob-toprow">
      {onBack ? (
        <button className="ob-link-back" onClick={onBack}>
          <Ico.arrowLeft style={{width:14,height:14}}/> {t("ob.common.back")}
        </button>
      ) : <span />}
    </div>
  );
}

// Title block (illustration + heading + lead)
function Title({ illu, eyebrow, title, lead, display }) {
  return (
    <div>
      {illu && (
        <div style={{
          width: display ? 120 : 80, height: display ? 120 : 80,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16, color: "var(--c-primary)",
        }}>
          {illu}
        </div>
      )}
      <div>
        {eyebrow && (
          <div className="t-overline" style={{ marginBottom: 8, color: "var(--c-accent)" }}>{eyebrow}</div>
        )}
        <h1 style={{
          margin: "0 0 8px",
          fontSize: display ? 36 : 28,
          lineHeight: display ? "44px" : "36px",
          fontWeight: 700,
          letterSpacing: display ? "-0.025em" : "-0.02em",
          color: "var(--c-ink)",
        }}>{title}</h1>
        {lead && (
          <p style={{
            margin: 0, fontSize: 14, lineHeight: "20px",
            color: "var(--c-muted)", maxWidth: 520,
          }}>{lead}</p>
        )}
      </div>
    </div>
  );
}

// ──────────────────── WhyWeAsk — inline collapsible explainer ────────────────────
// Pairs with any field that exists for compliance, not for the user's benefit.
// Renders a small ghost button "Why we ask" → expands a 2-line explainer in our
// operational tone. Use as `<WhyWeAsk>Your number stays private…</WhyWeAsk>`.
function WhyWeAsk({ children, label }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!label) label = t("ob.common.whyWeAsk") || "Why we ask";
  return (
    <div className="ob-wwa">
      <button type="button" className="ob-wwa__btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M6 5.2v2.8M6 3.6v.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        {label}
        <svg viewBox="0 0 12 12" width="10" height="10" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} aria-hidden="true">
          <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div className="ob-wwa__body">{children}</div>}
    </div>
  );
}

// ──────────────────── Celebration — fires on section completion ────────────────────
// Small green tick + "Section X done" toast that auto-dismisses.
// Used by App when section index increments.
function Celebrate({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="ob-celebrate" role="status" aria-live="polite">
      <span className="ob-celebrate__tick" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
          <path d="m4.5 10.5 3.5 3.5L15.5 6.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      <span>{message}</span>
    </div>
  );
}

Object.assign(window, { Ico, Field, TopRow, Title, WhyWeAsk, Celebrate });
