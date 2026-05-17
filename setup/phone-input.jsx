/* global React, Icon, Flag */
// PhoneInput — Altery component library.
// • Country combobox: searchable by name, ISO code, or dial digits ("44", "+44", "uni").
// • Power-user: typing "+" anywhere clears the number and jumps focus to the dropdown's search.
// • Live formatting based on selected country pattern.
// • Mobile (≤640px) opens a bottom-sheet with sticky search.

(function () {
  const { useState, useRef, useEffect, useMemo, useCallback } = React;

  // Country list — code, name, dial, format (X = digit slot).
  // Comprehensive coverage of jurisdictions Altery serves + neighbours.
  const COUNTRIES = [
    { code: "GB", name: "United Kingdom", dial: "44", fmt: "XX XXXX XXXX" },
    { code: "US", name: "United States", dial: "1", fmt: "(XXX) XXX-XXXX" },
    { code: "CA", name: "Canada", dial: "1", fmt: "(XXX) XXX-XXXX" },
    { code: "AE", name: "United Arab Emirates", dial: "971", fmt: "XX XXX XXXX" },
    { code: "DE", name: "Germany", dial: "49", fmt: "XXX XXXXXXXX" },
    { code: "FR", name: "France", dial: "33", fmt: "X XX XX XX XX" },
    { code: "ES", name: "Spain", dial: "34", fmt: "XXX XXX XXX" },
    { code: "IT", name: "Italy", dial: "39", fmt: "XXX XXX XXXX" },
    { code: "NL", name: "Netherlands", dial: "31", fmt: "X XXXXXXXX" },
    { code: "IE", name: "Ireland", dial: "353", fmt: "XX XXX XXXX" },
    { code: "PL", name: "Poland", dial: "48", fmt: "XXX XXX XXX" },
    { code: "PT", name: "Portugal", dial: "351", fmt: "XXX XXX XXX" },
    { code: "DK", name: "Denmark", dial: "45", fmt: "XX XX XX XX" },
    { code: "NO", name: "Norway", dial: "47", fmt: "XXX XX XXX" },
    { code: "SE", name: "Sweden", dial: "46", fmt: "XX XXX XX XX" },
    { code: "CH", name: "Switzerland", dial: "41", fmt: "XX XXX XX XX" },
    { code: "AT", name: "Austria", dial: "43", fmt: "XXX XXXXXXX" },
    { code: "BE", name: "Belgium", dial: "32", fmt: "XXX XX XX XX" },
    { code: "FI", name: "Finland", dial: "358", fmt: "XX XXX XXXX" },
    { code: "GR", name: "Greece", dial: "30", fmt: "XXX XXX XXXX" },
    { code: "TR", name: "Türkiye", dial: "90", fmt: "XXX XXX XX XX" },
    { code: "AU", name: "Australia", dial: "61", fmt: "X XXXX XXXX" },
    { code: "NZ", name: "New Zealand", dial: "64", fmt: "XX XXX XXXX" },
    { code: "SG", name: "Singapore", dial: "65", fmt: "XXXX XXXX" },
    { code: "HK", name: "Hong Kong", dial: "852", fmt: "XXXX XXXX" },
    { code: "JP", name: "Japan", dial: "81", fmt: "XX XXXX XXXX" },
    { code: "CN", name: "China", dial: "86", fmt: "XXX XXXX XXXX" },
    { code: "IN", name: "India", dial: "91", fmt: "XXXXX XXXXX" },
    { code: "ID", name: "Indonesia", dial: "62", fmt: "XXX XXX XXXX" },
    { code: "BR", name: "Brazil", dial: "55", fmt: "XX XXXXX XXXX" },
    { code: "MX", name: "Mexico", dial: "52", fmt: "XXX XXX XXXX" },
    { code: "AR", name: "Argentina", dial: "54", fmt: "XX XXXX XXXX" },
    { code: "CL", name: "Chile", dial: "56", fmt: "X XXXX XXXX" },
    { code: "CO", name: "Colombia", dial: "57", fmt: "XXX XXX XXXX" },
    { code: "ZA", name: "South Africa", dial: "27", fmt: "XX XXX XXXX" },
    { code: "RU", name: "Russia", dial: "7", fmt: "XXX XXX XX XX" },
    { code: "KR", name: "South Korea", dial: "82", fmt: "XX XXXX XXXX" },
    { code: "TH", name: "Thailand", dial: "66", fmt: "X XXXX XXXX" },
    { code: "VN", name: "Vietnam", dial: "84", fmt: "XXX XXX XXXX" },
  ];

  const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));

  // Format digits according to a pattern.
  function formatDigits(digits, fmt) {
    if (!fmt) return digits;
    let out = "", di = 0;
    for (const ch of fmt) {
      if (ch === "X") {
        if (di >= digits.length) break;
        out += digits[di++];
      } else if (digits.length > di) {
        out += ch;
      }
    }
    if (di < digits.length) out += digits.slice(di);
    return out;
  }

  // ── PhoneInput ───────────────────────────────────────────
  const PhoneInput = ({
    label, value = "", onChange, error, hint, disabled,
    defaultCountry = "GB", size = "md", style,
  }) => {
    // value is the full E.164-ish string "+44 20 7946 0123" or local digits — we store country + national digits.
    const initial = useMemo(() => parseValue(value, defaultCountry), [defaultCountry]);
    const [country, setCountry] = useState(initial.country);
    const [digits, setDigits] = useState(initial.digits);
    const [open, setOpen] = useState(false);
    const [hover, setHover] = useState(false);
    const [focused, setFocused] = useState(false);
    const wrapRef = useRef(null);
    const inputRef = useRef(null);
    const [pickerSearch, setPickerSearch] = useState("");
    const isMobile = useIsMobile();

    const c = COUNTRY_BY_CODE[country] || COUNTRIES[0];
    const formatted = formatDigits(digits, c.fmt);
    const heights = { sm: 36, md: 44, lg: 52 };
    const h = heights[size];

    // Notify parent
    useEffect(() => {
      onChange?.({ country, dial: c.dial, digits, formatted, e164: digits ? `+${c.dial}${digits}` : "" });
    }, [country, digits]);

    // Close on outside click
    useEffect(() => {
      if (!open || isMobile) return;
      const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open, isMobile]);

    const handleNumberChange = (e) => {
      const raw = e.target.value;
      // Power-user: user types "+" to retarget country code
      if (raw.startsWith("+") || raw.includes("+")) {
        const after = raw.replace(/[^\d+]/g, "");
        const m = after.match(/\+(\d{1,4})/);
        if (m) {
          // Try to match a country by dial code prefix (longest match wins)
          const dial = m[1];
          const match = matchByDial(dial);
          if (match) {
            setCountry(match.code);
            // Strip the +<dial> from the input, keep the rest as digits
            const tail = after.slice(("+"+dial).length).replace(/\D/g, "");
            setDigits(tail);
            return;
          }
        }
        // No match yet — open the picker so user sees what they're searching
        setOpen(true);
        setPickerSearch(after);
        return;
      }
      const onlyDigits = raw.replace(/\D/g, "");
      setDigits(onlyDigits);
    };

    const borderColor = error ? "var(--c-danger)"
      : focused || open ? "var(--c-accent)"
      : hover ? "var(--c-muted-2)" : "var(--c-border)";

    return (
      <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", ...style }}>
        {label && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--c-ink-2)" }}>{label}</label>}
        <div
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          style={{
            display: "flex", alignItems: "stretch", gap: 0,
            height: h, borderRadius: 12,
            border: `1px solid ${borderColor}`,
            background: disabled ? "var(--c-bg)" : "var(--c-surface)",
            boxShadow: focused || open ? "var(--sh-focus)" : "none",
            transition: "border-color .12s, box-shadow .12s",
            overflow: "hidden",
          }}>
          {/* Country trigger */}
          <button
            type="button"
            onClick={() => !disabled && setOpen(o => !o)}
            disabled={disabled}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0 10px 0 14px", border: 0, background: "transparent",
              borderRight: "1px solid var(--c-border-soft)",
              cursor: disabled ? "not-allowed" : "pointer",
              color: "var(--c-ink)",
              fontSize: 14, fontWeight: 500,
              minWidth: 0, flex: "0 0 auto",
            }}
            aria-label={`Country: ${c.name}`}
          >
            <Flag code={c.code} size={20} />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>+{c.dial}</span>
            <Icon name="chevronDown" size={14} color="var(--c-muted)"
              style={{ transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }} />
          </button>
          {/* Number input */}
          <input
            ref={inputRef}
            type="tel"
            inputMode="tel"
            value={formatted}
            onChange={handleNumberChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={c.fmt.replace(/X/g, "5")}
            disabled={disabled}
            className="input-bare"
            style={{
              flex: 1, minWidth: 0, background: "transparent",
              padding: "0 14px", color: "var(--c-ink)", fontSize: 14,
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </div>
        {(hint || error) && (
          <div style={{ fontSize: 12, lineHeight: "16px", color: error ? "var(--c-danger)" : "var(--c-muted)", display: "flex", gap: 4, alignItems: "center" }}>
            {error && <Icon name="alert" size={14} />}
            {error || hint || <span style={{ color: "var(--c-muted-2)" }}>Tip: type <kbd style={kbd}>+</kbd> to change country code</span>}
          </div>
        )}

        {/* Web popover */}
        {open && !isMobile && (
          <CountryPicker
            country={country} onPick={(code) => { setCountry(code); setOpen(false); setPickerSearch(""); inputRef.current?.focus(); }}
            search={pickerSearch} setSearch={setPickerSearch}
            position="popover"
          />
        )}

        {/* Mobile drawer */}
        {open && isMobile && (
          <CountryPicker
            country={country}
            onPick={(code) => { setCountry(code); setOpen(false); setPickerSearch(""); inputRef.current?.focus(); }}
            search={pickerSearch} setSearch={setPickerSearch}
            position="sheet"
            onClose={() => { setOpen(false); setPickerSearch(""); }}
          />
        )}
      </div>
    );
  };

  // ── Country picker — popover or bottom sheet ─────────────
  function CountryPicker({ country, onPick, search, setSearch, position, onClose }) {
    const searchRef = useRef(null);
    useEffect(() => { searchRef.current?.focus(); }, []);

    const q = search.trim().toLowerCase().replace(/^\+/, "");
    const filtered = !q ? COUNTRIES : COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q)
      || c.code.toLowerCase().includes(q)
      || c.dial.startsWith(q)
    );
    // Sort: dial-match first, then name
    const sorted = filtered.slice().sort((a, b) => {
      const ad = a.dial.startsWith(q) ? 0 : 1;
      const bd = b.dial.startsWith(q) ? 0 : 1;
      if (ad !== bd) return ad - bd;
      return a.name.localeCompare(b.name);
    });

    const list = (
      <>
        <div style={{ padding: 8, borderBottom: "1px solid var(--c-border-soft)" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 12px",
            border: "1px solid var(--c-border)", borderRadius: 10, background: "var(--c-surface)",
          }}>
            <Icon name="search" size={16} color="var(--c-muted)" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code"
              className="input-bare"
              style={{ flex: 1, background: "transparent", fontSize: 14, color: "var(--c-ink)" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && sorted[0]) { onPick(sorted[0].code); }
                if (e.key === "Escape") onClose?.();
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--c-muted)", display: "flex", padding: 2 }}>
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        </div>
        <div style={{ maxHeight: position === "sheet" ? "60vh" : 300, overflow: "auto", padding: 4 }}>
          {sorted.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
              No countries match "{search}"
            </div>
          )}
          {sorted.map(c => {
            const sel = c.code === country;
            return (
              <button
                key={c.code}
                onClick={() => onPick(c.code)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "10px 12px", border: 0, background: sel ? "var(--c-accent-soft)" : "transparent",
                  borderRadius: 8, cursor: "pointer", textAlign: "left",
                  color: "var(--c-ink)", fontSize: 14,
                }}
                onMouseOver={(e) => { if (!sel) e.currentTarget.style.background = "var(--c-bg)"; }}
                onMouseOut={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}
              >
                <Flag code={c.code} size={22}/>
                <span style={{ flex: 1, fontWeight: 500 }}>{c.name}</span>
                <span style={{ color: "var(--c-muted)", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>+{c.dial}</span>
                {sel && <Icon name="check" size={14} color="var(--c-accent)" />}
              </button>
            );
          })}
        </div>
      </>
    );

    if (position === "popover") {
      return (
        <div className="scale-in" style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
          width: 340, background: "var(--c-surface)", borderRadius: 14,
          border: "1px solid var(--c-border-soft)", boxShadow: "var(--sh-3)",
          overflow: "hidden",
        }}>
          {list}
        </div>
      );
    }

    // Bottom sheet
    useEffect(() => {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
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
            <button onClick={onClose} style={{ border: "1px solid var(--c-border)", background: "var(--c-surface)", borderRadius: 10, padding: "6px 10px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Choose country</div>
            <div style={{ width: 64 }} />
          </div>
          {list}
        </div>
      </div>,
      document.body
    );
  }

  // ── helpers ──────────────────────────────────────────────
  function matchByDial(dial) {
    // Longest dial code wins (e.g. 1 vs 1- ambiguous; we just take the first listed for shared dial)
    const candidates = COUNTRIES.filter(c => c.dial === dial);
    if (candidates.length) return candidates[0];
    // partial — find any whose dial code starts with this
    return null;
  }
  function parseValue(value, defaultCountry) {
    if (!value) return { country: defaultCountry, digits: "" };
    const v = String(value).replace(/[^\d+]/g, "");
    if (v.startsWith("+")) {
      const m = v.match(/^\+(\d{1,4})/);
      if (m) {
        const dial = m[1];
        const c = matchByDial(dial);
        if (c) return { country: c.code, digits: v.slice(("+"+dial).length) };
      }
    }
    return { country: defaultCountry, digits: v.replace(/\D/g, "") };
  }
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
  const kbd = {
    display: "inline-block", padding: "0 5px", border: "1px solid var(--c-border)",
    borderBottomWidth: 2, borderRadius: 4, fontSize: 11, fontFamily: "var(--ff-mono)",
    background: "var(--c-surface-2)", color: "var(--c-ink-2)",
  };

  Object.assign(window, { PhoneInput, PHONE_COUNTRIES: COUNTRIES });
})();
