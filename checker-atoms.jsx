/* global React, useT */
// checker-atoms.jsx — small JSX atoms used only by the checker.
//
// These mirror three of the atoms in setup/onboarding-atoms.jsx
// (Title, Field, WhyWeAsk) but the checker doesn't need the rest of that
// file (Ico, TopRow, Celebrate), so we keep a slim per-surface copy
// instead of dragging the whole onboarding atoms bundle into the checker.
//
// `useT` is provided by the inline text/babel block in /index.html, which
// exports it to window. We reference it unqualified — resolved at render
// time via the global scope chain.

function Title({ illu, eyebrow, title, lead, display }) {
  return (
    <div>
      {illu && (
        <div style={{
          width: display ? 120 : 80, height: display ? 120 : 80,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16, color: "var(--c-primary)",
        }}>{illu}</div>
      )}
      <div>
        {eyebrow && <div className="t-overline" style={{ marginBottom: 8, color: "var(--c-accent)" }}>{eyebrow}</div>}
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

function WhyWeAsk({ children, label }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  if (!label) label = t("ob.common.whyWeAsk") || "Why we ask";
  return (
    <div className="ob-wwa">
      <button type="button" className="ob-wwa__btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M6 5.2v2.8M6 3.6v.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        {label}
        <svg viewBox="0 0 12 12" width="10" height="10" fill="none"
             style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="ob-wwa__body">{children}</div>}
    </div>
  );
}

Object.assign(window, { Title, Field, WhyWeAsk });
