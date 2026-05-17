/* global React, Button, Input, Checkbox, Alert, Tag, Select, SelectableListItem,
   DatePicker, PhoneInput, Flag, Icon, Field, Title, TopRow, Ico, WhyWeAsk, useT */
// Onboarding screens — Account creation + Nature of business
// All form controls now come from the shared design system (components.jsx).

// ── Step 0: Prep checklist — what you'll need, how long it takes ──────────────────
function ScreenPrep({ next }) {
  const t = useT();
  const PREP_SECTIONS = [
    { num: 1, title: t("ob.prep.s1.title"), time: t("ob.prep.s1.t"), items: [t("ob.prep.s1.i1"), t("ob.prep.s1.i2")] },
    { num: 2, title: t("ob.prep.s2.title"), time: t("ob.prep.s2.t"), items: [t("ob.prep.s2.i1"), t("ob.prep.s2.i2"), t("ob.prep.s2.i3")] },
    { num: 3, title: t("ob.prep.s3.title"), time: t("ob.prep.s3.t"), items: [t("ob.prep.s3.i1"), t("ob.prep.s3.i2")] },
    { num: 4, title: t("ob.prep.s4.title"), time: t("ob.prep.s4.t"), items: [t("ob.prep.s4.i1"), t("ob.prep.s4.i2"), t("ob.prep.s4.i3"), t("ob.prep.s4.i4")] },
    { num: 5, title: t("ob.prep.s5.title"), time: t("ob.prep.s5.t"), items: [t("ob.prep.s5.i1"), t("ob.prep.s5.i2"), t("ob.prep.s5.i3")] },
  ];
  return (
    <div className="ob-content fade-in">
      <Title display illu={<Ico.rocket />} title={t("ob.prep.title")} lead={t("ob.prep.lead")} />
      <div className="ob-prep__sections">
        {PREP_SECTIONS.map((s) =>
        <div key={s.num} className="ob-prep__section">
            <div className="ob-prep__num">{s.num}</div>
            <div className="ob-prep__body">
              <div className="ob-prep__head">
                <div className="ob-prep__title">{s.title}</div>
                <div className="ob-prep__time">≈ {s.time}</div>
              </div>
              <div className="ob-prep__items">
                {s.items.map((it, i) => <span key={i} className="ob-prep__item">{it}</span>)}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="ob-prep__total">
        <span>{t("ob.prep.totalNote")}</span>
        <strong style={{ width: "90px" }}>{t("ob.prep.total")}</strong>
      </div>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight">{t("ob.prep.begin")}</Button>
      </div>
    </div>);
}

// ── Step 1: Welcome / name + email ──────────────────
function ScreenWelcome({ next, state }) {
  const t = useT();
  const err = state === "error";
  const filled = state === "filled" || state === "default";
  // Render the TOS checkbox label with two inline links — replace <a>…</a> + <b>…</b> in the translated string.
  const tos = t("ob.welcome.tos");
  const tosParts = tos.split(/<a>|<\/a>|<b>|<\/b>/);
  // tosParts: [pre, link1, mid, link2, post]
  return (
    <div className="ob-content fade-in">
      <Title display illu={<Ico.rocket />} title={t("ob.welcome.title")} lead={t("ob.welcome.lead")} />
      <div className="ob-fields">
        <div className="ob-fields row">
          <Input label={t("ob.welcome.firstName")} placeholder="Anna"
            value={filled ? "Anna" : ""} onChange={() => {}}
            error={err && t("ob.common.required")} />
          <Input label={t("ob.welcome.lastName")} placeholder="Petrenko"
            value={filled ? "Petrenko" : ""} onChange={() => {}}
            error={err && t("ob.common.required")} />
        </div>
        <Input label={t("ob.welcome.email")} type="email" placeholder="anna@yourcompany.com"
          value={filled ? "anna@orbit.io" : ""} onChange={() => {}} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Checkbox checked={filled} onChange={() => {}} label={
          <>{tosParts[0]}<a href="#">{tosParts[1]}</a>{tosParts[2]}<a href="#">{tosParts[3]}</a>{tosParts[4]}</>
        } />
        <Checkbox checked={false} onChange={() => {}} label={t("ob.welcome.marketing")} />
      </div>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight">{t("ob.common.continue")}</Button>
      </div>
    </div>);
}

// ── Step 2: Password ──────────────────
function ScreenPassword({ next, back, state }) {
  const t = useT();
  const filled = state !== "empty";
  const err = state === "error";
  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title title={t("ob.password.title")} lead={t("ob.password.lead")} />
      <div className="ob-fields">
        <Input label={t("ob.password.label")} type="password"
          placeholder={t("ob.password.placeholder")}
          value={filled ? "••••••••••" : ""} onChange={() => {}}
          hint={!err && t("ob.password.hint")}
          error={err && t("ob.password.weak")} />
        <Input label={t("ob.password.confirm")} type="password"
          placeholder={t("ob.password.repeat")}
          value={filled ? "••••••••••" : ""} onChange={() => {}}
          error={err && t("ob.password.mismatch")} />
      </div>
      <PasswordChecklist filled={filled} />
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!filled || err}>{t("ob.common.continue")}</Button>
      </div>
    </div>);
}

function PasswordChecklist({ filled }) {
  const t = useT();
  const rules = [
  { ok: filled, label: t("ob.password.r1") },
  { ok: filled, label: t("ob.password.r2") },
  { ok: filled, label: t("ob.password.r3") },
  { ok: false, label: t("ob.password.r4") }];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rules.map((r, i) =>
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: r.ok ? "var(--c-success)" : "var(--c-muted)" }}>
          <span style={{
          width: 16, height: 16, borderRadius: 999,
          background: r.ok ? "var(--c-success-soft)" : "var(--c-bg)",
          color: r.ok ? "var(--c-success)" : "var(--c-muted-2)",
          display: "inline-flex", alignItems: "center", justifyContent: "center"
        }}>
            <Icon name="check" size={10} stroke={2.4} />
          </span>
          {r.label}
        </div>
      )}
    </div>);

}

// ── Step 3: Email verification ──────────────────
function ScreenVerify({ next, back, state }) {
  const t = useT();
  const err = state === "error";
  const value = state === "filled" || state === "error" ? "123456" : "";
  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title illu={<Ico.shield />} title={t("ob.verify.title")} lead={<>{t("ob.verify.leadPre")}<strong>anna@orbit.io</strong>{t("ob.verify.leadPost")}</>} />
      <div>
        <CodeInput length={6} value={value} onChange={() => {}} error={err} />
        {err &&
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--c-danger)" }}>
            {t("ob.verify.error")}
          </div>
        }
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--c-muted)" }}>
        <span>{t("ob.verify.didnt")}</span>
        <Button variant="link" size="sm" style={{ color: "var(--c-accent)" }}>{t("ob.verify.resend")}</Button>
      </div>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={err}>{t("ob.common.continue")}</Button>
      </div>
    </div>);
}

// ── Step 4: Phone number ──────────────────
function ScreenPhone({ next, back, state }) {
  const t = useT();
  const filled = state !== "empty";
  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title title={t("ob.phone.title")} lead={t("ob.phone.lead")} />
      <div className="ob-fields">
        <PhoneInput label={t("ob.phone.label")} defaultCountry="GB"
          value={filled ? "+44 20 7946 0123" : ""} onChange={() => {}} />
      </div>
      <WhyWeAsk>{t("ob.phone.why")}</WhyWeAsk>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!filled}>{t("ob.phone.send")}</Button>
      </div>
    </div>);
}

// ──────────────── Nature of business ────────────────

// Country names stay English (proper nouns / ISO recognition).
// Meta tags ARE translated via metaKey.
const COUNTRIES = [
{ code: "GB", name: "United Kingdom", metaKey: "ob.common.fcaLicensed" },
{ code: "AE", name: "United Arab Emirates", metaKey: "ob.common.difc" },
{ code: "DE", name: "Germany", metaKey: "ob.common.eu" },
{ code: "NL", name: "Netherlands", metaKey: "ob.common.eu" },
{ code: "FR", name: "France", metaKey: "ob.common.eu" },
{ code: "ES", name: "Spain", metaKey: "ob.common.eu" },
{ code: "IT", name: "Italy", metaKey: "ob.common.eu" },
{ code: "IE", name: "Ireland", metaKey: "ob.common.eu" },
{ code: "PL", name: "Poland", metaKey: "ob.common.eu" },
{ code: "PT", name: "Portugal", metaKey: "ob.common.eu" },
{ code: "SG", name: "Singapore", metaKey: "ob.common.mas" },
{ code: "CH", name: "Switzerland", metaKey: "ob.common.finma" }];


// ── Step 5: Country of incorporation ──────────────────
function ScreenCountry({ next, back, state }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(state === "empty" ? null : "GB");
  const filtered = COUNTRIES.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title eyebrow={t("ob.country.eyebrow")} title={t("ob.country.title")} lead={t("ob.country.lead")} />
      <Input label={t("ob.country.label")}
        value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={t("ob.country.search")} icon="search" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((c) =>
        <SelectableListItem
          key={c.code}
          selected={selected === c.code}
          onClick={() => setSelected(c.code)}
          leading={<Flag code={c.code} size={28} />}
          title={c.name}
          meta={t(c.metaKey)} />
        )}
      </div>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!selected}>{t("ob.common.continue")}</Button>
      </div>
    </div>);
}

// ── Step 6: Business information ──────────────────
function ScreenBusinessInfo({ next, back, state }) {
  const t = useT();
  const filled = state !== "empty";
  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title eyebrow={t("ob.country.eyebrow")} title={t("ob.bi.title")} lead={t("ob.bi.lead")} />
      <div className="ob-fields">
        <Input label={t("ob.bi.companyName")} placeholder={t("ob.bi.companyNamePh")}
          value={filled ? "Orbit Labs Ltd" : ""} onChange={() => {}} />
        <Input label={t("ob.bi.tradingName")} placeholder={t("ob.bi.tradingNamePh")}
          value={filled ? "Orbit" : ""} onChange={() => {}} />
        <div className="ob-fields row">
          <Input label={t("ob.bi.companyNumber")} placeholder={t("ob.bi.companyNumberPh")}
            value={filled ? "HE 412 309" : ""} onChange={() => {}} />
          <DatePicker label={t("ob.bi.dateInc")}
            value={filled ? new Date(2021, 2, 12) : null} onChange={() => {}}
            maxDate={new Date()} />
        </div>
        <Input label={t("ob.bi.address")} placeholder={t("ob.bi.addressPh")}
          value={filled ? "Stasinou 8, Office 401, Nicosia" : ""} onChange={() => {}} />
        <Select label={t("ob.bi.industry")}
          value={filled ? "tech" : ""} onChange={() => {}}
          placeholder={t("ob.bi.industryPh")}
          options={[
            { value: "tech", label: t("ob.bi.ind.tech") },
            { value: "fin", label: t("ob.bi.ind.fin") },
            { value: "ret", label: t("ob.bi.ind.ret") },
            { value: "prof", label: t("ob.bi.ind.prof") },
            { value: "mfg", label: t("ob.bi.ind.mfg") },
            { value: "med", label: t("ob.bi.ind.med") }]
          } />
        <Input label={t("ob.bi.website")} placeholder={t("ob.bi.websitePh")}
          value={filled ? "orbit.io" : ""} onChange={() => {}} />
      </div>
      <Alert tone="warning" title={t("ob.bi.alertTitle")}>
        {t("ob.bi.alertBody")}
      </Alert>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!filled}>{t("ob.common.continue")}</Button>
      </div>
    </div>);
}

// ── Step 7: Expected activity ──────────────────
function ScreenActivity({ next, back, state }) {
  const t = useT();
  const filled = state !== "empty";
  const [inboundChannels, setInbound] = useState(filled ? new Set(["sepa", "swift"]) : new Set());
  const [outboundChannels, setOutbound] = useState(filled ? new Set(["sepa", "cards"]) : new Set());
  const togSet = (set, key) => {
    const n = new Set(set);n.has(key) ? n.delete(key) : n.add(key);return n;
  };
  const channels = [
  { id: "sepa", label: t("ob.act.ch.sepa") },
  { id: "swift", label: t("ob.act.ch.swift") },
  { id: "fps", label: t("ob.act.ch.fps") },
  { id: "cards", label: t("ob.act.ch.cards") },
  { id: "crypto", label: t("ob.act.ch.crypto"), note: t("ob.act.ch.cryptoNote") }];

  const inflowOpts = [
    { value: "<10k", label: t("ob.act.r.under10k") },
    { value: "10-100k", label: t("ob.act.r.10-100k") },
    { value: "100-250k", label: t("ob.act.r.100-250k") },
    { value: "250k-1m", label: t("ob.act.r.250k-1m") },
    { value: ">1m", label: t("ob.act.r.over1m") }];
  const txInOpts = [
    { value: "<10", label: t("ob.act.tx.under10") },
    { value: "10-20", label: t("ob.act.tx.10-20") },
    { value: "20-50", label: t("ob.act.tx.20-50") },
    { value: "50-100", label: t("ob.act.tx.50-100") },
    { value: ">100", label: t("ob.act.tx.over100") }];
  const outflowOpts = [
    { value: "<10k", label: t("ob.act.r.under10k") },
    { value: "10-80k", label: t("ob.act.r.10-80k") },
    { value: "80-200k", label: t("ob.act.r.80-200k") },
    { value: "200k-1m", label: t("ob.act.r.200k-1m") },
    { value: ">1m", label: t("ob.act.r.over1m") }];
  const txOutOpts = [
    { value: "<10", label: t("ob.act.tx.under10") },
    { value: "10-30", label: t("ob.act.tx.10-30") },
    { value: "30-80", label: t("ob.act.tx.30-80") },
    { value: "80-200", label: t("ob.act.tx.80-200") },
    { value: ">200", label: t("ob.act.tx.over200") }];

  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title title={t("ob.act.title")} lead={t("ob.act.lead")} />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h3 className="t-h3" style={{ margin: "0 0 12px" }}>{t("ob.act.incoming")}</h3>
          <div className="ob-fields">
            <div className="ob-fields row">
              <Select label={t("ob.act.inflow")}
                value={filled ? "100-250k" : ""} onChange={() => {}}
                placeholder={t("ob.act.range")} options={inflowOpts} />
              <Select label={t("ob.act.txIn")}
                value={filled ? "20-50" : ""} onChange={() => {}}
                placeholder={t("ob.act.range")} options={txInOpts} />
            </div>
            <Field label={t("ob.act.channels")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6 }}>
                {channels.map((c) =>
                <Checkbox key={c.id}
                  checked={inboundChannels.has(c.id)}
                  onChange={() => setInbound(togSet(inboundChannels, c.id))}
                  label={<>{c.label}{c.note && <Tag tone="orange" size="sm" style={{ marginLeft: 8 }}>{c.note}</Tag>}</>} />
                )}
              </div>
            </Field>
          </div>
        </div>

        <div>
          <h3 className="t-h3" style={{ margin: "0 0 12px" }}>{t("ob.act.outgoing")}</h3>
          <div className="ob-fields">
            <div className="ob-fields row">
              <Select label={t("ob.act.outflow")}
                value={filled ? "80-200k" : ""} onChange={() => {}}
                placeholder={t("ob.act.range")} options={outflowOpts} />
              <Select label={t("ob.act.txOut")}
                value={filled ? "30-80" : ""} onChange={() => {}}
                placeholder={t("ob.act.range")} options={txOutOpts} />
            </div>
            <Field label={t("ob.act.channels")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6 }}>
                {channels.map((c) =>
                <Checkbox key={c.id}
                  checked={outboundChannels.has(c.id)}
                  onChange={() => setOutbound(togSet(outboundChannels, c.id))}
                  label={<>{c.label}{c.note && <Tag tone="orange" size="sm" style={{ marginLeft: 8 }}>{c.note}</Tag>}</>} />
                )}
              </div>
            </Field>
          </div>
        </div>
      </div>

      <WhyWeAsk>{t("ob.act.why")}</WhyWeAsk>

      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!filled}>{t("ob.common.continue")}</Button>
      </div>
    </div>);
}

Object.assign(window, {
  ScreenPrep, ScreenWelcome, ScreenPassword, ScreenVerify, ScreenPhone,
  ScreenCountry, ScreenBusinessInfo, ScreenActivity,
  COUNTRIES
});