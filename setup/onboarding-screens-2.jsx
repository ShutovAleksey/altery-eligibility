/* global React, Button, IconButton, Input, Checkbox, Alert, Avatar, Tag, Select,
   FileUploadRow, PersonRow, SelectableListItem, Timeline, TimelineStep,
   ApplicationCard, ReviewSection, ReviewRow, DatePicker, Flag, Icon, Field, Title, TopRow, Ico, WhyWeAsk, useT */
// Onboarding screens — Documents, UBOs, Review, Status

// ── Step 8: Company documents ──────────────────
function ScreenDocuments({ next, back, state }) {
  const t = useT();
  const DOC_LIST = [
    { id: "incorp", title: t("ob.doc.incorp"), required: true, hint: t("ob.doc.incorp.h") },
    { id: "memo",   title: t("ob.doc.memo"), required: true, hint: t("ob.doc.memo.h") },
    { id: "shareholders", title: t("ob.doc.shareholders"), required: true, hint: t("ob.doc.shareholders.h") },
    { id: "directors", title: t("ob.doc.directors"), required: true, hint: t("ob.doc.directors.h") },
    { id: "address", title: t("ob.doc.address"), required: true, hint: t("ob.doc.address.h") },
    { id: "good-standing", title: t("ob.doc.good"), required: false, hint: t("ob.doc.good.h") },
  ];
  const allUploaded = state === "complete";
  const someUploaded = state === "partial" || allUploaded;
  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title title={t("ob.doc.title")} lead={t("ob.doc.lead")} />
      <Alert tone="info">{t("ob.doc.alert")}</Alert>
      <div style={{display:"flex", flexDirection:"column", gap:10}}>
        {DOC_LIST.map((d, i) => {
          const uploaded = allUploaded || (someUploaded && i < 3);
          const errored = state === "error" && i === 1;
          const fileState = uploaded ? "uploaded" : errored ? "error" : "idle";
          // Filename uses doc id so it's stable across languages.
          return (
            <FileUploadRow
              key={d.id}
              title={d.title}
              optional={!d.required}
              hint={d.hint}
              state={fileState}
              filename={uploaded ? `${d.id}-2024.pdf` : null}
              fileSize="1.4 MB"
              errorMessage={t("ob.doc.fileError")}
            />
          );
        })}
      </div>
      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={!allUploaded}>{t("ob.common.continue")}</Button>
      </div>
    </div>
  );
}

// ── UBO list ──────────────────
// Role/seen are i18n keys + interp vars so they translate at render time.
// Compose the human-readable role label for the list card from a saved UBO
// record. "Director" stands alone; "both" and "ubo" append the stake when
// known. Falls back to the bare role label when stake is missing.
function formatUboRoleLabel(t, ubo) {
  if (ubo.role === "director") return t("ob.uboForm.role.dir");
  const base = ubo.role === "both" ? t("ob.uboForm.role.both") : t("ob.uboForm.role.ubo");
  const pct = Number(ubo.stakePercent);
  return Number.isFinite(pct) && pct > 0 ? `${base} (${pct}%)` : base;
}

function ScreenUboList({ next, back, ubos, onAddPerson, onEditPerson }) {
  const t = useT();
  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <Title title={t("ob.ubo.title")} lead={t("ob.ubo.lead")} />

      {ubos.length > 0 ? (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {ubos.map((p) => (
            <div key={p.id} className="ob-person-card is-pending">
              <PersonRow
                name={`${p.firstName} ${p.lastName}`.trim() || t("ob.uboForm.firstNamePh")}
                role={formatUboRoleLabel(t, p)}
                status={t("ob.ubo.pending")}
                statusTone="neutral"
                onEdit={() => onEditPerson(p.id)}
                style={{ border: 0, borderRadius: 0, background: "transparent" }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: "20px 16px",
          border: "1px dashed var(--c-border)", borderRadius: 12,
          background: "var(--c-surface)",
          color: "var(--c-muted)", fontSize: 14, textAlign: "center",
        }}>
          {t("ob.ubo.lead")}
        </div>
      )}

      <button
        onClick={onAddPerson}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          height: 56, padding: "0 16px",
          background: "var(--c-surface)",
          border: "1px dashed var(--c-border)", borderRadius: 12,
          color: "var(--c-accent)", fontSize: 14, fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <Icon name="plus" size={16}/> {t("ob.ubo.add")}
      </button>

      <WhyWeAsk>{t("ob.ubo.why")}</WhyWeAsk>

      <div className="ob-actions between">
        <Button variant="outline" size="lg" onClick={back} iconLeft="arrowLeft">{t("ob.common.back")}</Button>
        <Button variant="primary" size="lg" onClick={next} iconRight="arrowRight" disabled={ubos.length === 0}>{t("ob.common.continue")}</Button>
      </div>
    </div>
  );
}

// ── UBO form ──────────────────
// The form edits `formState.uboDraft`. On Save it commits the draft into
// `formState.ubos` (appending a new record, or replacing in place when the
// draft has an `editingId`) and navigates back to the list.
function ScreenUboForm({ onSave, onCancel, draft, updateUboDraft }) {
  const t = useT();
  const roles = [
    { id: "director", label: t("ob.uboForm.role.dir") },
    { id: "both", label: t("ob.uboForm.role.both") },
    { id: "ubo", label: t("ob.uboForm.role.ubo") },
  ];

  // dateOfBirth: stored as local-time "YYYY-MM-DD" — same convention as
  // business.dateOfIncorporation, same reason (avoid UTC-midnight bug).
  const dobValue = (() => {
    if (!draft.dateOfBirth) return null;
    const [y, m, d] = draft.dateOfBirth.split("-").map(Number);
    return new Date(y, m - 1, d);
  })();
  const onDobChange = (d) => {
    if (!d) return updateUboDraft({ dateOfBirth: null });
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    updateUboDraft({ dateOfBirth: iso });
  };

  const emailLooksValid = /\S+@\S+\.\S+/.test(draft.email);
  const stakeNum = Number(draft.stakePercent);
  const stakeOk = draft.role === "director"
    ? true
    : Number.isFinite(stakeNum) && stakeNum > 0 && stakeNum <= 100;
  const canSave =
    draft.firstName.trim() &&
    draft.lastName.trim() &&
    emailLooksValid &&
    draft.dateOfBirth &&
    draft.country &&
    draft.role &&
    stakeOk;

  return (
    <div className="ob-content fade-in">
      <TopRow onBack={onCancel} />
      <Title title={t("ob.uboForm.title")} lead={t("ob.uboForm.lead")} />

      <Field label={t("ob.uboForm.role")}>
        <div style={{display:"flex", gap:10}}>
          {roles.map((r) => (
            <SelectableListItem
              key={r.id}
              selected={draft.role === r.id}
              onClick={() => updateUboDraft({ role: r.id })}
              title={r.label}
              style={{ flex: 1, height: 48 }}
            />
          ))}
        </div>
      </Field>

      <div className="ob-fields">
        <div className="ob-fields row">
          <Input label={t("ob.uboForm.firstName")} placeholder={t("ob.uboForm.firstNamePh")}
                 value={draft.firstName} onChange={(e) => updateUboDraft({ firstName: e.target.value })}/>
          <Input label={t("ob.uboForm.lastName")} placeholder={t("ob.uboForm.lastNamePh")}
                 value={draft.lastName} onChange={(e) => updateUboDraft({ lastName: e.target.value })}/>
        </div>
        <Input label={t("ob.uboForm.email")} placeholder={t("ob.uboForm.emailPh")}
               value={draft.email} onChange={(e) => updateUboDraft({ email: e.target.value })}/>
        <div className="ob-fields row">
          <DatePicker label={t("ob.uboForm.dob")}
                 value={dobValue} onChange={onDobChange}
                 maxDate={new Date()}/>
          <Select label={t("ob.uboForm.country")}
                 value={draft.country} onChange={(v) => updateUboDraft({ country: v })}
                 placeholder={t("ob.uboForm.countryPh")}
                 options={[
                   {value:"GB", flag:"GB", label:"United Kingdom"},
                   {value:"IT", flag:"IT", label:"Italy"},
                   {value:"DE", flag:"DE", label:"Germany"},
                   {value:"FR", flag:"FR", label:"France"},
                   {value:"NL", flag:"NL", label:"Netherlands"},
                   {value:"ES", flag:"ES", label:"Spain"},
                   {value:"IE", flag:"IE", label:"Ireland"},
                   {value:"PL", flag:"PL", label:"Poland"},
                 ]}/>
        </div>
        {draft.role !== "director" && (
          <Input label={t("ob.uboForm.stake")} hint={t("ob.uboForm.stakeHint")}
                 value={draft.stakePercent}
                 onChange={(e) => updateUboDraft({ stakePercent: e.target.value.replace(/[^0-9.]/g, "") })}
                 placeholder="0" suffix="%"/>
        )}
      </div>

      <Alert tone="info">{t("ob.uboForm.alert")}</Alert>

      <div className="ob-actions between">
        <Button variant="outline" size="lg" onClick={onCancel}>{t("ob.common.cancel")}</Button>
        <Button variant="primary" size="lg" onClick={onSave} iconRight="send" disabled={!canSave}>{t("ob.uboForm.send")}</Button>
      </div>
    </div>
  );
}

// ────────────────── Review (Finalisation) screen ──────────────────

// Compact "open document" link — pdf chip + filename + external arrow.
function DocLink({ name }) {
  const ext = (name.split(".").pop() || "file").toUpperCase();
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        color: "var(--c-accent)", textDecoration: "none",
        fontSize: 14, fontWeight: 500,
      }}
      title={`Open ${name}`}
    >
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, borderRadius: 6,
        background: "var(--c-accent-soft)", color: "var(--c-accent)",
        fontSize: 9, fontWeight: 700, letterSpacing: ".02em",
        flex: "0 0 26px",
      }}>
        {ext.slice(0, 3)}
      </span>
      <span style={{ textDecoration: "underline", textDecorationColor: "rgba(0,111,255,.32)", textUnderlineOffset: 3 }}>
        {name}
      </span>
      <Icon name="external" size={13} color="var(--c-accent)" style={{ flex: "0 0 13px" }}/>
    </a>
  );
}

function ScreenReview({ next, back, setStep, state }) {
  const t = useT();
  const errs = state === "with-errors";

  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <div>
        <h1 style={{margin:"0 0 8px", fontSize:28, lineHeight:"36px", fontWeight:700, letterSpacing:"-0.02em", color:"var(--c-ink)"}}>{t("ob.rv.title")}</h1>
        <p style={{margin:0, fontSize:14, lineHeight:"20px", color:"var(--c-muted)"}}>{t("ob.rv.lead")}</p>
      </div>

      {/* Account info */}
      <div className="ob-section-group">
        <div className="ob-section-group__title">{t("ob.rv.group.account")}</div>
        <ReviewSection title={t("ob.rv.contact")} onEdit={() => setStep("welcome")}>
          <div className="ob-rv">
            <ReviewRow k={t("ob.rv.legalName")} v="Stepan Mitaki" />
            <ReviewRow k={t("ob.rv.email")} v="smitaki@altery.com" />
            <ReviewRow k={t("ob.rv.phone")} v="+49 937 7465 64 94" />
          </div>
        </ReviewSection>
      </div>

      {/* Nature of business */}
      <div className="ob-section-group">
        <div className="ob-section-group__title">{t("ob.rv.group.nature")}</div>

        <ReviewSection
          title={t("ob.rv.youInfo")}
          onEdit={() => setStep("welcome")}
          error={errs}
          errorIssues={errs ? [
            { label: t("ob.rv.position") },
            { label: t("ob.rv.poa") },
          ] : []}
        >
          <div className="ob-rv">
            <ReviewRow k={t("ob.rv.position")} v={t("ob.rv.notDirector")} />
            <ReviewRow k={t("ob.rv.poa")} v={<DocLink name="power_of_attorney_StepanM12.pdf" />} />
          </div>
        </ReviewSection>

        <ReviewSection title={t("ob.rv.aboutBusiness")} onEdit={() => setStep("country")}>
          <div className="ob-rv">
            <ReviewRow k={t("ob.rv.country")} v={<><Flag code="GB" size={20}/> United Kingdom</>}/>
            <ReviewRow k={t("ob.rv.businessName")} v="Alteryx UK Ltd"/>
            <ReviewRow k={t("ob.rv.regNumber")} v="08806138"/>
          </div>
        </ReviewSection>

        <ReviewSection title={t("ob.rv.activities")} onEdit={() => setStep("activity")}>
          <div className="ob-rv">
            <ReviewRow k={t("ob.rv.industry")} v="Information Technology"/>
            <ReviewRow k={t("ob.rv.subcat")} v="Web & Mobile Application Development"/>
            <ReviewRow k={t("ob.rv.web")} v="www.examplesite.com"/>
          </div>
        </ReviewSection>

        <ReviewSection title={t("ob.rv.regAddress")} onEdit={() => setStep("business-info")}>
          <div className="ob-rv">
            <ReviewRow k={t("ob.rv.countryK")} v={<><Flag code="GB" size={20}/> United Kingdom</>}/>
            <ReviewRow k={t("ob.rv.city")} v="London"/>
            <ReviewRow k={t("ob.rv.region")} v="Greater London"/>
            <ReviewRow k={t("ob.rv.postcode")} v="EC2A 4NE"/>
            <ReviewRow k={t("ob.rv.address")} v="36 Featherstone Street, London EC2A 4NE"/>
            <ReviewRow k={t("ob.rv.tradingDiff")} v={t("ob.rv.no")}/>
          </div>
        </ReviewSection>
      </div>

      {/* Company documents */}
      <div className="ob-section-group">
        <div className="ob-section-group__title">{t("ob.rv.group.docs")}</div>
        {errs ? (
          <div style={{
            background: "var(--c-warning-soft)",
            borderRadius: 16, padding: "16px 20px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-ink)" }}>{t("ob.rv.docsMissingTitle")}</div>
            <div style={{ fontSize: 13, color: "var(--c-muted)", lineHeight: "18px" }}>{t("ob.rv.docsMissingBody")}</div>
            <div>
              <Button variant="primary" onClick={() => setStep("documents")}>{t("ob.rv.uploadDocs")}</Button>
            </div>
          </div>
        ) : (
          <ReviewSection title={t("ob.rv.docsTitle")} onEdit={() => setStep("documents")}>
            <div className="ob-rv">
              {[
                [t("ob.doc.incorp"), "incorporation_2024.pdf"],
                [t("ob.doc.memo"), "memorandum_2024.pdf"],
                [t("ob.doc.shareholders"), "shareholders_2024.pdf"],
                [t("ob.doc.directors"), "directors_2024.pdf"],
                [t("ob.doc.address"), "address_2024.pdf"],
              ].map(([k, v]) => (
                <ReviewRow key={k} k={k} v={<DocLink name={v} />}/>
              ))}
            </div>
          </ReviewSection>
        )}
      </div>

      {/* UBO & directors */}
      <div className="ob-section-group">
        <div className="ob-section-group__title">{t("ob.rv.group.ubo")}</div>

        <ReviewSection title={t("ob.rv.youInfo")} onEdit={() => setStep("ubo-form")}>
          <div className="ob-rv">
            <ReviewRow k={t("ob.rv.position")} v={t("ob.rv.isDirector")}/>
            <ReviewRow k={t("ob.rv.roleInCompany")} v={t("ob.rv.dirBoard")}/>
            <ReviewRow k={t("ob.rv.firstName")} v="Stepan"/>
            <ReviewRow k={t("ob.rv.lastName")} v="Mitaki"/>
            <ReviewRow k={t("ob.rv.email")} v="smitaki@altery.com"/>
            <ReviewRow k={t("ob.rv.dob")} v="09.06.1987"/>
            <ReviewRow k={t("ob.rv.share")} v="24%"/>
          </div>
        </ReviewSection>

        <ReviewSection
          title={t("ob.rv.shareholder1")}
          onEdit={() => setStep("ubo-list")}
          error={errs}
          errorIssues={errs ? [{ label: t("ob.rv.shareholderDetails") }] : []}
        >
          <div className="ob-rv">
            <ReviewRow k={t("ob.rv.shareholderType")} v="Company"/>
            <ReviewRow k={t("ob.rv.country")} v={<><Flag code="GB" size={20}/> United Kingdom</>}/>
            <ReviewRow k={t("ob.rv.businessName")} v="Alteryx UK Ltd"/>
            <ReviewRow k={t("ob.rv.regNumber")} v="08806138"/>
            <ReviewRow k={t("ob.rv.share")} v="18%"/>
          </div>
        </ReviewSection>

        <ReviewSection
          title={t("ob.rv.shareholder2")}
          onEdit={() => setStep("ubo-list")}
          error={errs}
          errorIssues={errs ? [{ label: t("ob.rv.shareholderDetails") }] : []}
        >
          <div className="ob-rv">
            <ReviewRow k={t("ob.rv.roleInCompany")} v={t("ob.rv.dirBoard")}/>
            <ReviewRow k={t("ob.rv.firstName")} v="Stepan"/>
            <ReviewRow k={t("ob.rv.lastName")} v="Mitaki"/>
            <ReviewRow k={t("ob.rv.email")} v="smitaki@altery.com"/>
            <ReviewRow k={t("ob.rv.dob")} v="09.06.1987"/>
            <ReviewRow k={t("ob.rv.share")} v="24%"/>
          </div>
        </ReviewSection>
      </div>

      {/* Consent + submit */}
      <div className="ob-consent">
        <Checkbox checked={true} onChange={() => {}} label={t("ob.rv.consent")}/>
        <a href="#" className="ob-consent__fees-link">{t("ob.rv.viewFees")}</a>
      </div>

      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={next} iconRight="arrowRight" disabled={errs}>
          {t("ob.rv.submit")}
        </Button>
      </div>
    </div>
  );
}

// ──────────────── Submission status ────────────────
const SHAREHOLDERS = [
  { id: "you",      name: "Stepan Mitaki (You)",  email: "smitaki@altery.com",  status: "you-pending" },
  { id: "francis",  name: "Francis Monte",         email: "fmonte@company.com",  status: "completed" },
  { id: "rick",     name: "Rick Hubert",            email: "rhubert@company.com", status: "completed" },
  { id: "samantha", name: "Samantha Morgan",       email: "smorgan@company.com", status: "waiting" },
  { id: "nikolay",  name: "Nikolay Avetkin",       email: "navetkin@company.com", status: "waiting" },
];

function ShareholderCard({ s }) {
  const t = useT();
  const isCompleted = s.status === "completed";
  const isYou = s.status === "you-pending";
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 8,
      padding: "14px 16px", borderRadius: 12,
      background: isCompleted ? "rgba(10,159,82,.08)" : "#F4F5F7",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-ink)" }}>{s.name}</div>
          <div style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 2 }}>{s.email}</div>
        </div>
        <Tag tone={isCompleted ? "green" : "neutral"} size="sm" icon={isCompleted ? "check" : null}>
          {isCompleted ? t("ob.sub.completed") : t("ob.sub.waiting")}
        </Tag>
      </div>
      {isYou ? (
        <div>
          <Button variant="primary" size="sm" onClick={() => {}} iconRight="arrowRight">{t("ob.sub.startVerify")}</Button>
        </div>
      ) : !isCompleted ? (
        <Button variant="link" size="sm" iconLeft="copy" style={{ alignSelf: "flex-start" }}>
          {t("ob.sub.copyLink")}
        </Button>
      ) : null}
    </div>
  );
}

function SubmittedScreen({ setStep }) {
  const t = useT();
  // Build a localised SHAREHOLDERS list with the "(You)" suffix translated.
  const localisedShareholders = SHAREHOLDERS.map((s) =>
    s.status === "you-pending" ? { ...s, name: t("ob.sub.you", { name: "Stepan Mitaki" }) } : s
  );
  const steps = [
    { state: "done", title: t("ob.sub.s1.title"), body: <span>{t("ob.sub.s1.body")}</span> },
    { state: "current", title: t("ob.sub.s2.title"),
      body: (
        <>
          <div>{t("ob.sub.s2.intro")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {localisedShareholders.map((s) => <ShareholderCard key={s.id} s={s}/>)}
          </div>
        </>
      )},
    { state: "todo", title: t("ob.sub.s3.title"),
      body: <>{t("ob.sub.s3.bodyPre")}<strong>smitaki@altery.com</strong>{t("ob.sub.s3.bodyPost")}</> },
    { state: "todo", title: t("ob.sub.s4.title"),
      body: <>{t("ob.sub.s4.body")}</> },
  ];
  return (
    <div className="ob-content fade-in">
      <div>
        <h1 style={{margin:"0 0 8px", fontSize:28, lineHeight:"36px", fontWeight:700, letterSpacing:"-0.02em", color:"var(--c-ink)"}}>{t("ob.sub.title")}</h1>
        <p style={{margin:0, fontSize:14, lineHeight:"20px", color:"var(--c-muted)"}}>
          {t("ob.sub.leadPre")}<strong>Alteryx UK Ltd</strong>{t("ob.sub.leadPost")}
        </p>
      </div>
      <div style={{fontSize: 18, fontWeight: 600, color: "var(--c-ink)", marginTop: 8}}>{t("ob.sub.summary")}</div>
      <Timeline>
        {steps.map((s, i) => (
          <TimelineStep key={i} state={s.state} title={s.title} isLast={i === steps.length - 1}>
            {s.body}
          </TimelineStep>
        ))}
      </Timeline>
    </div>
  );
}

function RejectedScreen({ setStep }) {
  const t = useT();
  return (
    <div className="ob-content fade-in">
      <Title illu={<Ico.reject style={{color:"var(--c-danger)"}}/>} title={t("ob.rej.title")} lead={t("ob.rej.lead")}/>
      <Alert tone="danger" title={t("ob.rej.reasonTitle")}>
        {t("ob.rej.reasonBody")}
      </Alert>
      <div style={{display:"flex", flexDirection:"column", gap:8, padding:"8px 0"}}>
        <span style={{fontSize:14, fontWeight:600}}>{t("ob.rej.what")}</span>
        <ul style={{margin:0, paddingLeft:18, color:"var(--c-muted)", fontSize:14, lineHeight:"22px"}}>
          <li>{t("ob.rej.l1")}</li>
          <li>{t("ob.rej.l2")}</li>
          <li>{t("ob.rej.l3")}</li>
        </ul>
      </div>
      <div className="ob-actions between">
        <Button variant="outline" size="lg">{t("ob.common.contactSupport")}</Button>
        <Button variant="primary" size="lg" onClick={() => setStep("applications-list")}>{t("ob.rej.toApps")}</Button>
      </div>
    </div>
  );
}

function ScreenSubmit({ state, setStep }) {
  if (state === "applications") return <ApplicationsList setStep={setStep}/>;
  if (state === "rejected")     return <RejectedScreen setStep={setStep}/>;
  return <SubmittedScreen setStep={setStep}/>;
}

// ──────────────── Applications list ────────────────
function ApplicationsList({ setStep }) {
  const t = useT();
  const apps = [
    { id: "1", title: "Altery #1",     meta: t("ob.apps.lastActivity"), state: "review" },
    { id: "2", title: "Application 2", meta: t("ob.apps.lastActivity"), state: "draft" },
  ];
  return (
    <div className="ob-content fade-in">
      <Title illu={<Ico.building />} title={t("ob.apps.title")} lead={t("ob.apps.lead")}/>
      <div style={{display:"flex", flexDirection:"column", gap:12}}>
        <ApplicationCard
          state="new"
          icon="plus"
          title={t("ob.apps.new")}
          meta={t("ob.apps.newMeta")}
          action=""
          onClick={() => setStep("welcome")}
        />
        {apps.map((a) => (
          <ApplicationCard key={a.id} state={a.state} title={a.title} meta={a.meta}/>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenDocuments, ScreenUboList, ScreenUboForm, ScreenReview, ScreenSubmit, ApplicationsList,
});
