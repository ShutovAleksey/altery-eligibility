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
function ScreenWelcome({ next, auth, updateAuth }) {
  const t = useT();
  // Render the TOS checkbox label with two inline links — replace <a>…</a> + <b>…</b> in the translated string.
  const tos = t("ob.welcome.tos");
  const tosParts = tos.split(/<a>|<\/a>|<b>|<\/b>/);
  // tosParts: [pre, link1, mid, link2, post]
  const emailLooksValid = /\S+@\S+\.\S+/.test(auth.email);
  const canContinue = auth.firstName.trim() && auth.lastName.trim() && emailLooksValid && auth.tosAccepted;
  return (
    <div className="ob-content fade-in">
      <Title display illu={<Ico.rocket />} title={t("ob.welcome.title")} lead={t("ob.welcome.lead")} />
      <div className="ob-fields">
        <div className="ob-fields row">
          <Input label={t("ob.welcome.firstName")} placeholder="Anna"
            value={auth.firstName} onChange={(e) => updateAuth({ firstName: e.target.value })} />
          <Input label={t("ob.welcome.lastName")} placeholder="Petrenko"
            value={auth.lastName} onChange={(e) => updateAuth({ lastName: e.target.value })} />
        </div>
        <Input label={t("ob.welcome.email")} type="email" placeholder="anna@yourcompany.com"
          value={auth.email} onChange={(e) => updateAuth({ email: e.target.value })} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Checkbox checked={auth.tosAccepted} onChange={(checked) => updateAuth({ tosAccepted: checked })} label={
          <>{tosParts[0]}<a href="#">{tosParts[1]}</a>{tosParts[2]}<a href="#">{tosParts[3]}</a>{tosParts[4]}</>
        } />
        <Checkbox checked={auth.marketingAccepted} onChange={(checked) => updateAuth({ marketingAccepted: checked })} label={t("ob.welcome.marketing")} />
      </div>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!canContinue}>{t("ob.common.continue")}</Button>
      </div>
    </div>);
}

// ── Step 2: Password ──────────────────
// Password is intentionally NOT persisted to localStorage — it's collected
// here only to be sent to the auth backend on submit. Local state lives and
// dies with the screen; refreshing this page wipes both fields.
function ScreenPassword({ next, back }) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const rules = [
    { ok: password.length >= 10,        label: t("ob.password.r1") },
    { ok: /[A-Z]/.test(password),       label: t("ob.password.r2") },
    { ok: /\d/.test(password),          label: t("ob.password.r3") },
    { ok: /[^A-Za-z0-9]/.test(password), label: t("ob.password.r4") },
  ];
  const strongEnough = rules.every((r) => r.ok);
  const mismatch = confirm.length > 0 && password !== confirm;
  const canContinue = strongEnough && password === confirm;

  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title title={t("ob.password.title")} lead={t("ob.password.lead")} />
      <div className="ob-fields">
        <Input label={t("ob.password.label")} type="password"
          placeholder={t("ob.password.placeholder")}
          value={password} onChange={(e) => setPassword(e.target.value)}
          hint={!password || strongEnough ? t("ob.password.hint") : undefined}
          error={password && !strongEnough ? t("ob.password.weak") : undefined} />
        <Input label={t("ob.password.confirm")} type="password"
          placeholder={t("ob.password.repeat")}
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? t("ob.password.mismatch") : undefined} />
      </div>
      <PasswordChecklist rules={rules} />
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!canContinue}>{t("ob.common.continue")}</Button>
      </div>
    </div>);
}

function PasswordChecklist({ rules }) {
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
// The verification code is one-time material — never persisted. It exists
// only in this screen's local state; reloading the page wipes it.
const RESEND_COOLDOWN_S = 60;
function ScreenVerify({ next, back, email }) {
  const t = useT();
  const [code, setCode] = useState("");
  // Mounting this screen implies a code was just sent (either by the previous
  // step or by a prior resend). Start the cooldown at the full window so the
  // user doesn't spam-click during the first minute.
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_S);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const canContinue = code.length === 6;
  const canResend = secondsLeft <= 0;
  const formatMMSS = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title illu={<Ico.shield />} title={t("ob.verify.title")} lead={<>{t("ob.verify.leadPre")}<strong>{email || "your email"}</strong>{t("ob.verify.leadPost")}</>} />
      <div>
        <CodeInput length={6} value={code} onChange={setCode} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--c-muted)" }}>
        <span>{t("ob.verify.didnt")}</span>
        <Button
          variant="link" size="sm"
          style={{ color: canResend ? "var(--c-accent)" : "var(--c-muted)" }}
          disabled={!canResend}
          onClick={() => { /* TODO Phase 3: call /api/auth/resend-verification */ setSecondsLeft(RESEND_COOLDOWN_S); }}
        >
          {canResend ? t("ob.verify.resend") : t("ob.verify.resendIn", { time: formatMMSS(secondsLeft) })}
        </Button>
      </div>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!canContinue}>{t("ob.common.continue")}</Button>
      </div>
    </div>);
}

// ── Step 4: Phone number ──────────────────
function ScreenPhone({ next, back, phone, updateAuth }) {
  const t = useT();
  // PhoneInput is uncontrolled (it parses `value` once on mount and manages
  // its own internal state thereafter). We seed it from formState.auth.phone
  // and write back the E.164 string on every change.
  const hasPhone = (phone || "").replace(/\D/g, "").length >= 7;
  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title title={t("ob.phone.title")} lead={t("ob.phone.lead")} />
      <div className="ob-fields">
        <PhoneInput label={t("ob.phone.label")} defaultCountry="GB"
          value={phone || ""}
          onChange={(v) => updateAuth({ phone: v.e164 || "" })} />
      </div>
      <WhyWeAsk>{t("ob.phone.why")}</WhyWeAsk>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!hasPhone}>{t("ob.phone.send")}</Button>
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
function ScreenCountry({ next, back, country, onSelectCountry }) {
  const t = useT();
  // q (search query) stays local — it's UI ephemeral, not form data.
  const [q, setQ] = useState("");
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
          selected={country === c.code}
          onClick={() => onSelectCountry(c.code)}
          leading={<Flag code={c.code} size={28} />}
          title={c.name}
          meta={t(c.metaKey)} />
        )}
      </div>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!country}>{t("ob.common.continue")}</Button>
      </div>
    </div>);
}

// ── Step 6: Business information ──────────────────
function ScreenBusinessInfo({ next, back, business, updateBusiness }) {
  const t = useT();
  // dateOfIncorporation is stored as a local-time "YYYY-MM-DD" string for
  // clean JSON serialisation. We deliberately avoid Date.toISOString() and
  // `new Date(iso)` because both interpret the string as UTC midnight, which
  // shifts the displayed date by ±1 day for non-UTC users. Manual Y-M-D
  // packing/unpacking keeps the date stable in the user's local calendar.
  const dateValue = (() => {
    if (!business.dateOfIncorporation) return null;
    const [y, m, d] = business.dateOfIncorporation.split("-").map(Number);
    return new Date(y, m - 1, d);
  })();
  const onDateChange = (d) => {
    if (!d) return updateBusiness({ dateOfIncorporation: null });
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    updateBusiness({ dateOfIncorporation: iso });
  };
  // Required for Continue: companyName, companyNumber, dateOfIncorporation,
  // address, industry. Trading name and website are optional.
  const canContinue =
    business.companyName.trim() &&
    business.companyNumber.trim() &&
    business.dateOfIncorporation &&
    business.address.trim() &&
    business.industry;
  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title eyebrow={t("ob.country.eyebrow")} title={t("ob.bi.title")} lead={t("ob.bi.lead")} />
      <div className="ob-fields">
        <Input label={t("ob.bi.companyName")} placeholder={t("ob.bi.companyNamePh")}
          value={business.companyName} onChange={(e) => updateBusiness({ companyName: e.target.value })} />
        <Input label={t("ob.bi.tradingName")} placeholder={t("ob.bi.tradingNamePh")}
          value={business.tradingName} onChange={(e) => updateBusiness({ tradingName: e.target.value })} />
        <div className="ob-fields row">
          <Input label={t("ob.bi.companyNumber")} placeholder={t("ob.bi.companyNumberPh")}
            value={business.companyNumber} onChange={(e) => updateBusiness({ companyNumber: e.target.value })} />
          <DatePicker label={t("ob.bi.dateInc")}
            value={dateValue} onChange={onDateChange}
            maxDate={new Date()} />
        </div>
        <Input label={t("ob.bi.address")} placeholder={t("ob.bi.addressPh")}
          value={business.address} onChange={(e) => updateBusiness({ address: e.target.value })} />
        <Select label={t("ob.bi.industry")}
          value={business.industry} onChange={(v) => updateBusiness({ industry: v })}
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
          value={business.website} onChange={(e) => updateBusiness({ website: e.target.value })} />
      </div>
      <Alert tone="warning" title={t("ob.bi.alertTitle")}>
        {t("ob.bi.alertBody")}
      </Alert>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!canContinue}>{t("ob.common.continue")}</Button>
      </div>
    </div>);
}

// ── Step 7: Expected activity ──────────────────
function ScreenActivity({ next, back, state, inboundChannels, outboundChannels, onChangeInbound, onChangeOutbound }) {
  const t = useT();
  const filled = state !== "empty";
  // Channels arrive as plain arrays (JSON-serialisable for localStorage); use
  // Set internally for O(1) membership checks, then emit back as array.
  const inboundSet = new Set(inboundChannels || []);
  const outboundSet = new Set(outboundChannels || []);
  const toggle = (set, key) => {
    const n = new Set(set);
    n.has(key) ? n.delete(key) : n.add(key);
    return [...n];
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
                  checked={inboundSet.has(c.id)}
                  onChange={() => onChangeInbound(toggle(inboundSet, c.id))}
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
                  checked={outboundSet.has(c.id)}
                  onChange={() => onChangeOutbound(toggle(outboundSet, c.id))}
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