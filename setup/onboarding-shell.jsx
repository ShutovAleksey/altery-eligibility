// Onboarding shell — header (progress) only.
// Header matches Figma: dark navy bar with swoosh background, logo,
// 4 step pills with state icons (completed/in-progress/not-started), close X.

const SECTIONS = [
{ id: "account", labelKey: "ob.section.account", steps: ["welcome", "password", "verify", "phone"] },
{ id: "nature", labelKey: "ob.section.nature", steps: ["country", "business-info", "activity"] },
{ id: "documents", labelKey: "ob.section.documents", steps: ["documents"] },
{ id: "ubo", labelKey: "ob.section.ubo", steps: ["ubo-list", "ubo-form"] }];


const STEP_INDEX = (() => {
  const flat = [];
  SECTIONS.forEach((s) => s.steps.forEach((step) => flat.push({ section: s.id, step })));
  flat.push({ section: "review", step: "review" });
  flat.push({ section: "review", step: "payment" });
  flat.push({ section: "review", step: "submit" });
  flat.push({ section: "review", step: "applications-list" });
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
  "applications-list": "ob.step.applications-list"
};
// Back-compat alias for any legacy reference
const STEP_LABELS = new Proxy({}, { get: (_, k) => (window.__I18N ? window.__I18N.t(STEP_LABEL_KEYS[k] || k) : k) });

function getCurrentSection(step) {
  return SECTIONS.find((s) => s.steps.includes(step));
}

function sectionState(section, currentStep) {
  // review / payment / submit / applications-list → all 4 sections completed
  const reviewSteps = ["review", "payment", "submit", "applications-list"];
  if (reviewSteps.includes(currentStep)) return "completed";

  const currentSection = getCurrentSection(currentStep);
  if (!currentSection) return "todo";
  const ci = SECTIONS.findIndex((s) => s.id === currentSection.id);
  const si = SECTIONS.findIndex((s) => s.id === section.id);
  if (si < ci) return "completed";
  if (si === ci) return "current";
  return "todo";
}

// Decorative swoosh shape (one of four in figma header).
// Path borrowed from Vector.jsx in figma; sized to fit the bar height.
function Swoosh({ left, top, scale = 1, rotate = 0, opacity = 1 }) {
  return (
    <svg
      width={127 * scale} height={288 * scale} viewBox="0 0 127.130 288.013"
      style={{
        position: "absolute",
        left, top,
        transform: `rotate(${rotate}deg)`,
        opacity,
        pointerEvents: "none"
      }}>
      
      <path
        d="M 67.018 1.755 C 89.273 2.619 116.376 -4.371 124.472 55.615 C 133.482 122.377 118.28 191.863 98.496 234.987 C 77.351 281.074 49.433 309.905 27.516 266.945 C 3.694 220.248 -6.775 127.419 4.614 50.961 C 14.048 -12.375 43.184 0.829 67.018 1.755 Z"
        fillRule="evenodd"
        fill="#000756" />
      
    </svg>);

}

function ObHeader({ step, onClose, onSave, onResume, savedAt }) {
  const t = useT();
  const currentSection = getCurrentSection(step);
  // Approximate time-remaining per section (minutes). Used as an at-a-glance
  // "how much more do I have to do" cue — the most asked question in B2B
  // onboarding analytics, and the cheapest one to answer.
  const SECTION_TIME = { account: 2, nature: 4, plan: 2, documents: 5, ubo: 6 };
  const totalMinsLeft = SECTIONS.reduce((sum, s) => {
    const state = sectionState(s, step);
    if (state === "completed") return sum;
    if (state === "current") return sum + Math.ceil(SECTION_TIME[s.id] / 2);
    return sum + SECTION_TIME[s.id];
  }, 0);

  // Visual progress for the mobile progress bar
  const flatIdx = STEP_INDEX.findIndex((s) => s.step === step);
  const progress = flatIdx < 0 ? 0 : Math.round(((flatIdx + 1) / STEP_INDEX.length) * 100);

  return (
    <React.Fragment>
      <header className="ob-header">
        {/* Decorative swooshes */}
        <div className="ob-header__bg" aria-hidden="true">
          <Swoosh left={420} top={-90} scale={0.6} rotate={75} opacity={0.7} />
          <Swoosh left={620} top={-110} scale={0.55} rotate={92} opacity={0.55} />
          <Swoosh left={780} top={-100} scale={0.5} rotate={70} opacity={0.5} />
          <Swoosh left={920} top={-90} scale={0.45} rotate={88} opacity={0.4} />
        </div>

        <img className="ob-header__logo" src="assets/altery-logo-white.svg" alt="Altery Business" style={{ width: "80px" }} />

        <nav className="ob-header__steps" aria-label="Onboarding progress">
          {SECTIONS.map((s, i) => {
            const state = sectionState(s, step);
            return (
              <StepPill
                key={s.id}
                state={state}
                num={i + 1}
                label={t(s.labelKey)}
                timeLeft={state === "current" ? t("ob.section.minLeft", { n: SECTION_TIME[s.id] }) : null}
              />
            );
          })}
        </nav>

        <div className="ob-header__actions">
          {onSave && currentSection && (
            <button className="ob-header__save" onClick={onSave} type="button" title={`About ${totalMinsLeft} min left · saved automatically`}>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6L13 4.5v8A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M5.5 2v3h5V2M5.5 9.5h5M5.5 11.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="ob-header__save-label">{t("ob.common.save")}</span>
            </button>
          )}
          <LangSwitcher onDark={true} anchorRight={true} />
        </div>
      </header>

      {/* Mobile-only sticky progress bar */}
      {currentSection && (
        <div className="ob-mobile-progress" aria-hidden="true">
          <div className="ob-mobile-progress__fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </React.Fragment>
  );
}

function StepPill({ state, num, label, timeLeft }) {
  const Dot = () => {
    if (state === "completed") {
      return (
        <span className="ob-step__dot is-completed" aria-hidden="true">
          <svg viewBox="0 0 12 12" width="12" height="12" fill="none">
            <path d="M2.5 6.2 5 8.5l4.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>);
    }
    if (state === "current") {
      return (
        <span className="ob-step__dot is-current" aria-hidden="true">
          <span className="ob-step__num">{num}</span>
        </span>);
    }
    return (
      <span className="ob-step__dot is-todo" aria-hidden="true">
        <span className="ob-step__num">{num}</span>
      </span>);
  };

  return (
    <span className={"ob-step is-" + state}>
      <Dot />
      <span className="ob-step__label">{label}</span>
      {timeLeft && <span className="ob-step__time">{timeLeft}</span>}
    </span>);
}

Object.assign(window, { ObHeader, SECTIONS, STEP_INDEX, STEP_LABELS, STEP_LABEL_KEYS, getCurrentSection, sectionState });