// Onboarding shell — left-side navigation panel mirroring the checker's
// .ec-sidebar. Same visual language as the eligibility checker: dark
// navy panel, 5 numbered sections with done/current/todo states,
// language switcher pinned to the bottom, decorative coin stack at the
// bottom-right bleeding past the panel edge.
//
// Mobile collapses the sidebar to a 56-px-tall horizontal pill at the
// top of the page (logo + label + lang switcher), with the per-section
// steps hidden — the per-screen Title/eyebrow inside the content already
// communicates "where you are" on small screens.

const SECTIONS = [
  { id: "account",   labelKey: "ob.section.account",   steps: ["welcome", "password", "verify", "phone"] },
  { id: "nature",    labelKey: "ob.section.nature",    steps: ["country", "business-info", "activity"] },
  { id: "documents", labelKey: "ob.section.documents", steps: ["documents"] },
  { id: "ubo",       labelKey: "ob.section.ubo",       steps: ["ubo-list", "ubo-form"] },
  { id: "review",    labelKey: "ob.section.review",    steps: ["review", "payment", "submit", "applications-list"] },
];

const STEP_INDEX = (() => {
  const flat = [];
  SECTIONS.forEach((s) => s.steps.forEach((step) => flat.push({ section: s.id, step })));
  return flat;
})();

const STEP_LABEL_KEYS = {
  welcome: "ob.step.welcome",
  password: "ob.step.password",
  verify: "ob.step.verify",
  phone: "ob.step.phone",
  country: "ob.step.country",
  "business-info": "ob.step.business-info",
  activity: "ob.step.activity",
  plan: "ob.section.plan",
  "plan-details": "ob.step.plan-details",
  documents: "ob.step.documents",
  "ubo-list": "ob.step.ubo-list",
  "ubo-form": "ob.step.ubo-form",
  review: "ob.step.review",
  payment: "ob.step.payment",
  submit: "ob.step.submit",
  "applications-list": "ob.step.applications-list",
};
const STEP_LABELS = new Proxy({}, { get: (_, k) => (window.__I18N ? window.__I18N.t(STEP_LABEL_KEYS[k] || k) : k) });

function getCurrentSection(step) {
  return SECTIONS.find((s) => s.steps.includes(step));
}

function sectionState(section, currentStep) {
  const currentSection = getCurrentSection(currentStep);
  if (!currentSection) return "todo";
  const ci = SECTIONS.findIndex((s) => s.id === currentSection.id);
  const si = SECTIONS.findIndex((s) => s.id === section.id);
  if (si < ci) return "done";
  if (si === ci) return "current";
  return "todo";
}

function ObSidebar({ step, onSave }) {
  const t = useT();
  const currentSection = getCurrentSection(step);
  return (
    <aside className="ob-sidebar" aria-label="Onboarding navigation">
      <div className="ob-sidebar__top">
        <div className="ob-sidebar__logo">
          <img src="assets/altery-logo-white.svg" alt="Altery Business" />
        </div>
        <div className="ob-sidebar__label">{t("ob.sidebar.eyebrow")}</div>
      </div>

      <ol className="ob-sidebar__steps">
        {SECTIONS.map((sec, i) => {
          const n = i + 1;
          const state = sectionState(sec, step);
          const statusKey = state === "current" ? "ob.sidebar.status.current"
                          : state === "done"    ? "ob.sidebar.status.done"
                          : null;
          return (
            <li key={sec.id}
                className={`ob-sidebar__step is-${state}`}
                aria-current={state === "current" ? "step" : undefined}>
              <span className="ob-sidebar__step__num" aria-hidden="true">
                {state === "done" ? (
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                    <path d="M3.5 8.5 6.5 11.5 12.5 5.5" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : n}
              </span>
              <span className="ob-sidebar__step__body">
                <span className="ob-sidebar__step__label">{t(sec.labelKey)}</span>
                {statusKey && <span className="ob-sidebar__step__status">{t(statusKey)}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Save sits right under the section list — same visual rhythm as
          the eyebrow → list gap above. On mobile (horizontal pill) the
          list is hidden, so margin-left:auto keeps Save grouped with the
          lang switcher on the right of the pill. Lang switcher stays in
          its own bottom slot so it pins to the bottom of the panel. */}
      {onSave && currentSection && (
        <button className="ob-sidebar__save" onClick={onSave} type="button"
                title={t("ob.common.save")}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6L13 4.5v8A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-9Z"
                  stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M5.5 2v3h5V2M5.5 9.5h5M5.5 11.5h3"
                  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{t("ob.common.save")}</span>
        </button>
      )}

      <div className="ob-sidebar__bottom">
        <div className="ob-sidebar__lang">
          <LangSwitcher onDark={true} anchorRight={false} dropUp={true} />
        </div>
      </div>

      {/* Currency-stack decorative SVG/PNG. Sits at the bottom-right
          with negative offsets so it bleeds past the rounded corner;
          .ob-sidebar { overflow: hidden } crops it cleanly. Same asset
          as the checker — same brand cue, instant continuity for the
          checker → onboarding hop. */}
      <img className="ob-sidebar__deco" src="assets/sidebar-currencies.png"
           alt="" aria-hidden="true" />
    </aside>
  );
}

// Back-compat alias — older call-sites use ObHeader, the rename is
// gradual. ObSidebar is the canonical name going forward.
const ObHeader = ObSidebar;

Object.assign(window, { ObSidebar, ObHeader, SECTIONS, STEP_INDEX, STEP_LABELS, STEP_LABEL_KEYS, getCurrentSection, sectionState });
