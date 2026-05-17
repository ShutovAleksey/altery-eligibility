/* global React, Icon, Button */
// DatePicker — Altery component library.
// Web: popover under trigger. Mobile (≤640px): bottom-sheet drawer.
// Single date or range. Type-to-fill DD/MM/YYYY. Min/max. Keyboard nav.

(function () {
  const { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } = React;

  // ── helpers ──────────────────────────────────────────────
  const pad = (n) => String(n).padStart(2, "0");
  const fmtDMY = (d) => d ? `${pad(d.getDate())} / ${pad(d.getMonth() + 1)} / ${d.getFullYear()}` : "";
  const parseDMY = (s) => {
    if (!s) return null;
    const m = s.match(/^\s*(\d{1,2})[\s/.\-]+(\d{1,2})[\s/.\-]+(\d{2,4})\s*$/);
    if (!m) return null;
    let [_, dd, mm, yy] = m;
    let y = parseInt(yy, 10);
    if (y < 100) y += y < 50 ? 2000 : 1900;
    const d = new Date(y, parseInt(mm,10) - 1, parseInt(dd,10));
    if (d.getFullYear() !== y || d.getMonth() !== parseInt(mm,10) - 1 || d.getDate() !== parseInt(dd,10)) return null;
    return d;
  };
  const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const addMonths = (d, n) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; };
  const inRange = (d, min, max) => (!min || d >= startOfDay(min)) && (!max || d <= startOfDay(max));

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  // Mon-first weekday header
  const WEEKDAYS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

  // Build a 6-row × 7-col matrix of dates for a given visible month.
  // Mon-first.
  function monthMatrix(year, month) {
    const first = new Date(year, month, 1);
    // JS getDay: Sun=0..Sat=6 → convert to Mon-first index 0..6
    const lead = (first.getDay() + 6) % 7;
    const start = addDays(first, -lead);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }

  // ── Calendar (the inner panel) ───────────────────────────
  function Calendar({
    value, onSelect, mode = "single", rangeStart, rangeEnd, onRangeChange,
    minDate, maxDate, focusDate, onFocusDate,
  }) {
    const initial = value || rangeStart || new Date();
    const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() });
    const [picker, setPicker] = useState("days"); // days | months | years
    const today = startOfDay(new Date());

    useEffect(() => {
      if (focusDate) setView({ y: focusDate.getFullYear(), m: focusDate.getMonth() });
    }, [focusDate]);

    const matrix = useMemo(() => monthMatrix(view.y, view.m), [view]);

    const isSelected = (d) => {
      if (mode === "single") return sameDay(d, value);
      if (mode === "range") {
        if (rangeStart && rangeEnd) return d >= startOfDay(rangeStart) && d <= startOfDay(rangeEnd);
        return sameDay(d, rangeStart) || sameDay(d, rangeEnd);
      }
      return false;
    };
    const isInRange = (d) => mode === "range" && rangeStart && rangeEnd && d > startOfDay(rangeStart) && d < startOfDay(rangeEnd);
    const isRangeEdge = (d, side) => mode === "range" && (side === "start" ? sameDay(d, rangeStart) : sameDay(d, rangeEnd));
    const isDisabled = (d) => !inRange(d, minDate, maxDate);

    const goPrev = () => {
      if (picker === "days") setView(v => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }));
      else if (picker === "months") setView(v => ({ y: v.y - 1, m: v.m }));
      else setView(v => ({ y: v.y - 12, m: v.m }));
    };
    const goNext = () => {
      if (picker === "days") setView(v => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }));
      else if (picker === "months") setView(v => ({ y: v.y + 1, m: v.m }));
      else setView(v => ({ y: v.y + 12, m: v.m }));
    };

    const handlePick = (d) => {
      if (isDisabled(d)) return;
      if (mode === "single") {
        onSelect?.(d);
      } else {
        // range
        if (!rangeStart || (rangeStart && rangeEnd)) {
          onRangeChange?.({ start: d, end: null });
        } else {
          if (d < rangeStart) onRangeChange?.({ start: d, end: rangeStart });
          else onRangeChange?.({ start: rangeStart, end: d });
        }
      }
    };

    // Keyboard nav within calendar
    useEffect(() => {
      if (!focusDate) return;
      const onKey = (e) => {
        if (!focusDate) return;
        const cur = focusDate;
        let next = null;
        if (e.key === "ArrowLeft") next = addDays(cur, -1);
        else if (e.key === "ArrowRight") next = addDays(cur, 1);
        else if (e.key === "ArrowUp") next = addDays(cur, -7);
        else if (e.key === "ArrowDown") next = addDays(cur, 7);
        else if (e.key === "PageUp") next = addMonths(cur, e.shiftKey ? -12 : -1);
        else if (e.key === "PageDown") next = addMonths(cur, e.shiftKey ? 12 : 1);
        else if (e.key === "Enter") { e.preventDefault(); handlePick(cur); return; }
        if (next) { e.preventDefault(); onFocusDate?.(next); }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [focusDate, mode, rangeStart, rangeEnd, value]);

    // ─ year / month picker grids ─
    const yearStart = view.y - (view.y % 12);
    const yearOptions = Array.from({ length: 12 }, (_, i) => yearStart + i);

    return (
      <div style={{ width: "100%", padding: 12 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px 8px" }}>
          <CalNav icon="chevronLeft" onClick={goPrev} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setPicker(p => p === "months" ? "days" : "months")}
              className="dp-pill"
              style={pillStyle(picker === "months")}>
              {MONTHS[view.m]}
            </button>
            <button
              onClick={() => setPicker(p => p === "years" ? "days" : "years")}
              className="dp-pill"
              style={pillStyle(picker === "years")}>
              {view.y}
            </button>
          </div>
          <CalNav icon="chevronRight" onClick={goNext} />
        </div>

        {picker === "days" && (
          <>
            {/* Weekday labels */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, padding: "4px 0 4px" }}>
              {WEEKDAYS.map(w => (
                <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--c-muted-2)", letterSpacing: 0.4, textTransform: "uppercase" }}>{w}</div>
              ))}
            </div>
            {/* Day grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {matrix.map((d, i) => {
                const otherMonth = d.getMonth() !== view.m;
                const sel = isSelected(d);
                const inRng = isInRange(d);
                const startEdge = isRangeEdge(d, "start");
                const endEdge = isRangeEdge(d, "end");
                const dis = isDisabled(d);
                const isToday = sameDay(d, today);
                const focused = focusDate && sameDay(d, focusDate);
                let bg = "transparent", color = "var(--c-ink)", fontWeight = 500, br = 8;
                if (otherMonth) color = "var(--c-muted-2)";
                if (inRng) { bg = "var(--c-accent-soft)"; color = "var(--c-primary)"; br = 0; }
                if (sel) {
                  if (mode === "range" && (startEdge || endEdge)) {
                    bg = "var(--c-accent)"; color = "var(--c-on-accent)"; fontWeight = 600;
                    br = startEdge && !endEdge ? "8px 0 0 8px" : !startEdge && endEdge ? "0 8px 8px 0" : 8;
                  } else {
                    bg = "var(--c-accent)"; color = "var(--c-on-accent)"; fontWeight = 600;
                  }
                }
                if (dis) { color = "var(--c-muted-2)"; }
                return (
                  <button
                    key={i}
                    disabled={dis}
                    onClick={() => handlePick(d)}
                    onMouseEnter={() => onFocusDate?.(d)}
                    style={{
                      height: 38, border: 0, padding: 0, background: bg, color,
                      borderRadius: br, fontSize: 13, fontWeight, fontVariantNumeric: "tabular-nums",
                      cursor: dis ? "not-allowed" : "pointer", opacity: dis ? .4 : 1,
                      position: "relative", transition: "background .12s",
                      boxShadow: !sel && isToday ? "inset 0 0 0 1px var(--c-accent)" : focused && !sel ? "inset 0 0 0 1px var(--c-border)" : "none",
                    }}
                    onMouseOver={(e) => { if (!sel && !dis && !inRng) e.currentTarget.style.background = "var(--c-bg)"; }}
                    onMouseOut={(e) => { if (!sel && !dis && !inRng) e.currentTarget.style.background = "transparent"; }}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {picker === "months" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "8px 4px" }}>
            {MONTHS_SHORT.map((m, i) => {
              const isCur = i === view.m;
              return (
                <button key={m} onClick={() => { setView(v => ({ ...v, m: i })); setPicker("days"); }}
                  style={tileStyle(isCur)}>
                  {m}
                </button>
              );
            })}
          </div>
        )}

        {picker === "years" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "8px 4px" }}>
            {yearOptions.map((y) => {
              const isCur = y === view.y;
              return (
                <button key={y} onClick={() => { setView(v => ({ ...v, y })); setPicker("days"); }}
                  style={tileStyle(isCur)}>
                  {y}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── tiny visual helpers ──────────────────────────────────
  const CalNav = ({ icon, onClick }) => {
    const [h, setH] = useState(false);
    return (
      <button onClick={onClick}
        onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{
          width: 32, height: 32, borderRadius: 8, border: 0,
          background: h ? "var(--c-bg)" : "transparent", cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--c-ink-2)",
        }}>
        <Icon name={icon} size={16} />
      </button>
    );
  };
  const pillStyle = (active) => ({
    border: 0, background: active ? "var(--c-accent-soft)" : "transparent",
    color: active ? "var(--c-primary)" : "var(--c-ink)",
    padding: "6px 10px", borderRadius: 8, fontWeight: 600, fontSize: 14,
    cursor: "pointer", letterSpacing: "-0.01em",
  });
  const tileStyle = (active) => ({
    height: 44, border: 0, borderRadius: 10,
    background: active ? "var(--c-accent)" : "var(--c-bg)",
    color: active ? "var(--c-on-accent)" : "var(--c-ink)",
    fontWeight: active ? 600 : 500, fontSize: 14, cursor: "pointer",
    transition: "background .12s",
  });

  // ── DatePicker (single) ──────────────────────────────────
  const DatePicker = ({
    label, value, onChange, placeholder = "DD / MM / YYYY",
    minDate, maxDate, error, hint, disabled, size = "md", style,
    presets, // optional [{label, value: Date}]
  }) => {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState(fmtDMY(value));
    const [focus, setFocus] = useState(value || new Date());
    const ref = useRef(null);
    const inputRef = useRef(null);
    const heights = { sm: 36, md: 44, lg: 52 };
    const h = heights[size];
    const isMobile = useIsMobile();

    useEffect(() => { setText(fmtDMY(value)); }, [value]);

    useEffect(() => {
      if (!open || isMobile) return;
      const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onEsc);
      return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
    }, [open, isMobile]);

    const handleType = (e) => {
      const v = e.target.value;
      setText(v);
      const d = parseDMY(v);
      if (d && inRange(d, minDate, maxDate)) {
        onChange?.(d); setFocus(d);
      } else if (v === "") {
        onChange?.(null);
      }
    };

    return (
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", ...style }}>
        {label && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--c-ink-2)" }}>{label}</label>}
        <div
          onClick={() => !disabled && setOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8, height: h, padding: "0 14px",
            borderRadius: 12,
            border: `1px solid ${disabled ? "var(--c-disabled-border)" : error ? "var(--c-danger)" : open ? "var(--c-accent)" : "var(--c-border)"}`,
            background: disabled ? "var(--c-disabled-bg)" : "var(--c-surface)",
            color: disabled ? "var(--c-disabled-fg)" : "var(--c-ink)",
            cursor: disabled ? "not-allowed" : "text",
            boxShadow: open ? "var(--sh-focus)" : "none",
            transition: "border-color .12s, box-shadow .12s",
          }}>
          <input
            ref={inputRef}
            value={text}
            onChange={handleType}
            onFocus={() => !disabled && setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            inputMode="numeric"
            className="input-bare"
            style={{ flex: 1, minWidth: 0, background: "transparent", color: disabled ? "var(--c-disabled-fg)" : "var(--c-ink)", fontVariantNumeric: "tabular-nums" }}
          />
          <Icon name="calendar" size={18} color={disabled ? "var(--c-disabled-fg)" : "var(--c-muted)"} style={{ cursor: disabled ? "not-allowed" : "pointer" }} />
        </div>
        {(hint || error) && (
          <div style={{ fontSize: 12, lineHeight: "16px", color: error ? "var(--c-danger)" : "var(--c-muted)" }}>
            {error || hint}
          </div>
        )}

        {/* Web popover */}
        {open && !isMobile && (
          <div className="scale-in" style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
            width: 320, background: "var(--c-surface)", borderRadius: 14,
            border: "1px solid var(--c-border-soft)", boxShadow: "var(--sh-3)",
            overflow: "hidden",
          }}>
            {presets?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 12, borderBottom: "1px solid var(--c-border-soft)", background: "var(--c-surface-2)" }}>
                {presets.map(p => (
                  <button key={p.label}
                    onClick={() => { onChange?.(p.value); setFocus(p.value); setOpen(false); }}
                    style={presetChip}>{p.label}</button>
                ))}
              </div>
            )}
            <Calendar
              value={value} onSelect={(d) => { onChange?.(d); setOpen(false); }}
              minDate={minDate} maxDate={maxDate}
              focusDate={focus} onFocusDate={setFocus}
            />
          </div>
        )}

        {/* Mobile drawer */}
        {open && isMobile && (
          <MobileSheet
            title={label || "Pick a date"}
            onClose={() => setOpen(false)}
            onConfirm={() => { onChange?.(focus); setOpen(false); }}
            secondaryLabel="Today"
            onSecondary={() => { const t = startOfDay(new Date()); setFocus(t); onChange?.(t); }}
          >
            <Calendar
              value={value} onSelect={(d) => { onChange?.(d); setFocus(d); }}
              minDate={minDate} maxDate={maxDate}
              focusDate={focus} onFocusDate={setFocus}
            />
          </MobileSheet>
        )}
      </div>
    );
  };

  // ── DateRangePicker ──────────────────────────────────────
  const DateRangePicker = ({
    label, value, onChange, minDate, maxDate, error, hint, size = "md", style, presets,
  }) => {
    // value: { start: Date|null, end: Date|null }
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value || { start: null, end: null });
    const [focus, setFocus] = useState(value?.start || new Date());
    const ref = useRef(null);
    const isMobile = useIsMobile();
    const heights = { sm: 36, md: 44, lg: 52 };
    const h = heights[size];

    useEffect(() => { setDraft(value || { start: null, end: null }); }, [value]);

    useEffect(() => {
      if (!open || isMobile) return;
      const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onEsc);
      return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
    }, [open, isMobile]);

    const display = draft.start && draft.end
      ? `${fmtDMY(draft.start)}  →  ${fmtDMY(draft.end)}`
      : draft.start ? `${fmtDMY(draft.start)}  →  …` : "";

    const apply = () => { onChange?.(draft); setOpen(false); };

    return (
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", ...style }}>
        {label && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--c-ink-2)" }}>{label}</label>}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 8, height: h, padding: "0 14px",
            borderRadius: 12, width: "100%",
            border: `1px solid ${error ? "var(--c-danger)" : open ? "var(--c-accent)" : "var(--c-border)"}`,
            background: "var(--c-surface)", cursor: "pointer", textAlign: "left",
            boxShadow: open ? "var(--sh-focus)" : "none",
            transition: "border-color .12s, box-shadow .12s",
          }}>
          <Icon name="calendar" size={18} color="var(--c-muted)" />
          <span style={{ flex: 1, color: display ? "var(--c-ink)" : "var(--c-muted)", fontVariantNumeric: "tabular-nums" }}>
            {display || "Pick a date range"}
          </span>
          <Icon name="chevronDown" size={16} color="var(--c-muted)" style={{ transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }} />
        </button>
        {(hint || error) && <div style={{ fontSize: 12, color: error ? "var(--c-danger)" : "var(--c-muted)" }}>{error || hint}</div>}

        {open && !isMobile && (
          <div className="scale-in" style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
            width: 340, background: "var(--c-surface)", borderRadius: 14,
            border: "1px solid var(--c-border-soft)", boxShadow: "var(--sh-3)",
          }}>
            {presets?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 12, borderBottom: "1px solid var(--c-border-soft)", background: "var(--c-surface-2)" }}>
                {presets.map(p => (
                  <button key={p.label}
                    onClick={() => { setDraft(p.value); setFocus(p.value.start); }}
                    style={presetChip}>{p.label}</button>
                ))}
              </div>
            )}
            <Calendar
              mode="range" rangeStart={draft.start} rangeEnd={draft.end}
              onRangeChange={setDraft}
              minDate={minDate} maxDate={maxDate}
              focusDate={focus} onFocusDate={setFocus}
            />
            <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--c-border-soft)", justifyContent: "space-between" }}>
              <button onClick={() => setDraft({ start: null, end: null })} style={ghostBtn}>Clear</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setOpen(false)} style={ghostBtn}>Cancel</button>
                <button onClick={apply} disabled={!draft.start || !draft.end} style={primaryBtn(!draft.start || !draft.end)}>Apply</button>
              </div>
            </div>
          </div>
        )}

        {open && isMobile && (
          <MobileSheet
            title={label || "Pick a range"}
            onClose={() => setOpen(false)}
            confirmLabel="Apply"
            confirmDisabled={!draft.start || !draft.end}
            onConfirm={apply}
            secondaryLabel="Clear"
            onSecondary={() => setDraft({ start: null, end: null })}
          >
            <Calendar
              mode="range" rangeStart={draft.start} rangeEnd={draft.end}
              onRangeChange={setDraft}
              minDate={minDate} maxDate={maxDate}
              focusDate={focus} onFocusDate={setFocus}
            />
          </MobileSheet>
        )}
      </div>
    );
  };

  // ── Mobile bottom-sheet ──────────────────────────────────
  function MobileSheet({ title, children, onClose, onConfirm, confirmLabel = "Done", confirmDisabled, secondaryLabel, onSecondary }) {
    useEffect(() => {
      const onEsc = (e) => { if (e.key === "Escape") onClose?.(); };
      document.addEventListener("keydown", onEsc);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.removeEventListener("keydown", onEsc); document.body.style.overflow = prev; };
    }, []);
    return ReactDOM.createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div onClick={onClose} className="fade-in" style={{ position: "absolute", inset: 0, background: "var(--c-overlay)" }} />
        <div className="fade-in-up" style={{
          position: "relative", background: "var(--c-surface)", borderTopLeftRadius: 20, borderTopRightRadius: 20,
          boxShadow: "var(--sh-3)", maxHeight: "92vh", display: "flex", flexDirection: "column",
        }}>
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
            <div style={{ width: 36, height: 4, borderRadius: 999, background: "var(--c-border)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 4px" }}>
            <button onClick={onClose} style={{ ...ghostBtn, padding: "6px 10px" }}>Cancel</button>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
            <div style={{ width: 64 }} />
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {children}
          </div>
          <div style={{ display: "flex", gap: 8, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--c-border-soft)" }}>
            {secondaryLabel && (
              <button onClick={onSecondary} style={{ ...ghostBtn, flex: 1, height: 48, fontSize: 15 }}>{secondaryLabel}</button>
            )}
            <button onClick={onConfirm} disabled={confirmDisabled}
              style={{ ...primaryBtn(confirmDisabled), flex: 2, height: 48, fontSize: 15 }}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── style helpers ────────────────────────────────────────
  const presetChip = {
    padding: "6px 10px", borderRadius: 999, border: "1px solid var(--c-border-soft)",
    background: "var(--c-surface)", color: "var(--c-ink-2)", fontSize: 12, fontWeight: 500, cursor: "pointer",
  };
  const ghostBtn = {
    height: 36, padding: "0 14px", borderRadius: 10, border: "1px solid var(--c-border)",
    background: "var(--c-surface)", color: "var(--c-ink)", fontSize: 13, fontWeight: 500, cursor: "pointer",
  };
  const primaryBtn = (dis) => ({
    height: 36, padding: "0 14px", borderRadius: 10, border: 0,
    background: dis ? "var(--c-muted-2)" : "var(--c-primary)",
    color: "var(--c-on-primary)", fontSize: 13, fontWeight: 600, cursor: dis ? "not-allowed" : "pointer",
    opacity: dis ? .6 : 1,
  });

  function useIsMobile() {
    const [m, setM] = useState(typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
    useEffect(() => {
      const mq = window.matchMedia("(max-width: 640px)");
      const handler = (e) => setM(e.matches);
      mq.addEventListener?.("change", handler);
      return () => mq.removeEventListener?.("change", handler);
    }, []);
    return m;
  }

  Object.assign(window, { DatePicker, DateRangePicker });
})();
