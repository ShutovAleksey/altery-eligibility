/* global React, Icon, Flag */
// components.jsx — Altery design system primitives
// All visual values reference design tokens from tokens.css.
// Components include focus-visible rings, ARIA roles/states, and keyboard nav.

// ════════════════════════════════════════════════════════════════════════════
// Button
// ════════════════════════════════════════════════════════════════════════════
const btnBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--s-2)",
  border: "1px solid transparent",
  borderRadius: "var(--r-md)",
  fontWeight: "var(--fw-medium)",
  fontFamily: "inherit",
  letterSpacing: "var(--tr-body)",
  cursor: "pointer",
  transition: "background var(--motion-base) var(--easing-out), color var(--motion-base) var(--easing-out), border-color var(--motion-base) var(--easing-out), box-shadow var(--motion-base) var(--easing-out)",
  whiteSpace: "nowrap",
  userSelect: "none"
};
const btnSizes = {
  // iconSize is explicit per size. Previously the icons used `sz.fontSize + 2`,
  // which broke when fontSize was a CSS-var string ("var(--fs-h4)" + 2 →
  // "var(--fs-h4)2"). Chrome/Firefox fall back to flex auto-sizing for invalid
  // SVG width/height; iOS Safari follows SVG-2 spec strictly and reverts the
  // icon to 300×150, which explodes the button layout.
  sm: { padding: "6px 12px",  fontSize: 13,                lineHeight: "18px",            borderRadius: "var(--r-sm)", height: 32, iconSize: 14 },
  md: { padding: "8px 16px",  fontSize: "var(--fs-body)",  lineHeight: "var(--lh-body)",  borderRadius: "var(--r-md)", height: 36, iconSize: 16 },
  lg: { padding: "10px 20px", fontSize: 15,                lineHeight: "22px",            borderRadius: "var(--r-md)", height: 44, iconSize: 17 },
  xl: { padding: "12px 24px", fontSize: "var(--fs-h4)",    lineHeight: "var(--lh-h4)",    borderRadius: 14,             height: 52, iconSize: 20 }
};
const btnVariants = {
  primary: { bg: "var(--c-primary)", fg: "var(--c-on-primary)", bgH: "var(--c-primary-hover)", bgA: "var(--c-primary-active)" },
  accent: { bg: "var(--c-accent)", fg: "var(--c-on-accent)", bgH: "var(--c-accent-hover)", bgA: "var(--c-accent-hover)" },
  secondary: { bg: "var(--c-accent-soft)", fg: "var(--c-primary)", bgH: "var(--c-accent-soft-hover)", bgA: "var(--c-accent-soft-hover)" },
  outline: { bg: "var(--c-surface)", fg: "var(--c-ink)", bd: "var(--c-border)", bgH: "var(--c-bg)", bgA: "var(--c-bg-2)" },
  ghost: { bg: "transparent", fg: "var(--c-ink)", bgH: "var(--c-hover-alpha)", bgA: "var(--c-active-alpha)" },
  danger: { bg: "var(--c-danger)", fg: "var(--c-on-danger)", bgH: "var(--c-danger-hover)", bgA: "var(--c-danger-hover)" },
  dangerSoft: { bg: "var(--c-danger-soft)", fg: "var(--c-danger)", bgH: "var(--c-danger-soft)", bgA: "var(--c-danger-soft)" },
  link: { bg: "transparent", fg: "var(--c-accent)", bgH: "transparent", bgA: "transparent" }
};

/**
 * @typedef {'primary'|'accent'|'secondary'|'outline'|'ghost'|'danger'|'dangerSoft'|'link'} ButtonVariant
 * @typedef {'sm'|'md'|'lg'|'xl'} ButtonSize
 *
 * @typedef ButtonProps
 * @property {React.ReactNode} [children]                  - Label. Sentence case, 1–3 words, action verb.
 * @property {ButtonSize}      [size='md']                 - Height 32/36/44/52 px.
 * @property {ButtonVariant}   [variant='primary']         - Visual hierarchy (see AlteryPay DS Do/Don't).
 * @property {string}          [iconLeft]                  - Icon name (rendered before the label).
 * @property {string}          [iconRight]                 - Icon name (rendered after the label).
 * @property {boolean}         [loading]                   - Replaces label with spinner; non-interactive.
 * @property {boolean}         [disabled]                  - Non-interactive, lower contrast.
 * @property {boolean}         [full]                      - Stretches to 100% width of container.
 * @property {React.CSSProperties} [style]                 - Inline-style override (merged last).
 * @property {(e: React.MouseEvent) => void} [onClick]
 * @property {'button'|'submit'|'reset'} [type='button']
 * @property {string}          [ariaLabel]                 - Accessible name; required when there's no text label.
 *
 * Primary surface for actions. One primary CTA per screen — see
 * library-v2-buttons.jsx in the DS handoff:
 *   - primary  = THE action of the screen (forward progress)
 *   - outline  = secondary parallel action
 *   - ghost    = cancel / back (visually demoted, never competing)
 *   - danger   = irreversible (delete)
 *   - link     = inline text action
 *
 * @param {ButtonProps} props
 * @returns {React.ReactElement}
 */
const Button = (props) => {
  // Read every prop by direct lookup — no destructure, no rest, no spread
  // onto the DOM <button>. A previous version used an object destructure
  // that mixed an identifier rename with a string-keyed rename
  // (`"aria-label": ariaLabelProp`) plus `...rest`; on @babel/standalone
  // 7.29.0 (the in-browser Babel) that pattern silently leaked props such
  // as `iconRight` into rest and then onto the inner <button>, which
  // produced both the React "unknown prop on DOM" warning AND, when an
  // unknown attribute happened to override an inline style, the buttons
  // rendering with browser-default chrome. This shape is exact: known
  // props only, nothing else reaches the DOM.
  const children = props.children;
  const size = props.size || "md";
  const variant = props.variant || "primary";
  const iconLeft = props.iconLeft;
  const iconRight = props.iconRight;
  const loading = props.loading;
  const disabled = props.disabled;
  const full = props.full;
  const style = props.style;
  const onClick = props.onClick;
  const type = props.type || "button";
  const ariaLabelProp = props["aria-label"] || props.ariaLabel;
  // When href is provided, render as <a> instead of <button>. Used for
  // mailto:/tel:/external links where native anchor behaviour is more
  // robust than window.location.href reassignment (which silently no-ops
  // in some browsers when no protocol handler is registered).
  const href = props.href;
  const target = props.target;

  const [h, setH] = React.useState(false);
  const [a, setA] = React.useState(false);
  const v = btnVariants[variant] || btnVariants.primary;
  const sz = btnSizes[size] || btnSizes.md;
  const isDisabled = disabled || loading;
  const s = {
    ...btnBase,
    ...sz,
    width: full ? "100%" : undefined,
    background: isDisabled ? "var(--c-disabled-bg)" : a && v.bgA ? v.bgA : h ? v.bgH : v.bg,
    color: isDisabled ? "var(--c-disabled-fg)" : v.fg,
    borderColor: isDisabled ? "var(--c-disabled-border)" : v.bd || "transparent",
    pointerEvents: isDisabled ? "none" : "auto",
    ...(variant === "link" && { padding: 0, height: "auto", textDecoration: h ? "underline" : "none" }),
    ...style
  };
  const labelFromChildren = typeof children === "string" ? children : undefined;
  const ariaLabelComputed = ariaLabelProp || (!labelFromChildren && (iconLeft || iconRight) ? iconLeft || iconRight : undefined);
  const inner = (
    <>
      {loading ? <Spinner size={sz.iconSize} /> : iconLeft && <Icon name={iconLeft} size={sz.iconSize} aria-hidden="true" />}
      {children && <span>{children}</span>}
      {iconRight && !loading && <Icon name={iconRight} size={sz.iconSize} aria-hidden="true" />}
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        style={{ ...s, textDecoration: "none", display: "inline-flex" }}
        aria-label={ariaLabelComputed}
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => {setH(false);setA(false);}}
        onMouseDown={() => setA(true)}
        onMouseUp={() => setA(false)}
        onClick={onClick}>
        {inner}
      </a>
    );
  }
  return (
    <button
      type={type}
      style={s}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      aria-label={ariaLabelComputed}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => {setH(false);setA(false);}}
      onMouseDown={() => setA(true)}
      onMouseUp={() => setA(false)}
      onClick={onClick}>
      {inner}
    </button>);

};

const Spinner = ({ size = 16, color = "currentColor", ariaLabel = "Loading" }) =>
<svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={ariaLabel}
style={{ animation: "spin .8s linear infinite" }}>
    <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2.5" strokeOpacity=".2" />
    <path d="M12 3a9 9 0 019 9" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>;


// ════════════════════════════════════════════════════════════════════════════
// IconButton — REQUIRES title/aria-label for screen readers
// ════════════════════════════════════════════════════════════════════════════
const IconButton = ({ icon, size = "md", variant = "ghost", onClick, style, title, "aria-label": ariaLabel, disabled }) => {
  const [h, setH] = React.useState(false);
  const v = btnVariants[variant];
  const dims = { sm: 28, md: 36, lg: 44 }[size];
  const s = {
    width: dims, height: dims,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    borderRadius: "var(--r-sm)",
    cursor: disabled ? "not-allowed" : "pointer",
    border: `1px solid ${disabled ? "var(--c-disabled-border)" : v.bd || "transparent"}`,
    background: disabled ? "var(--c-disabled-bg)" : h ? v.bgH : v.bg,
    color: disabled ? "var(--c-disabled-fg)" : v.fg,
    transition: "background var(--motion-base) var(--easing-out), color var(--motion-base) var(--easing-out)",
    flex: "0 0 auto",
    ...style
  };
  const label = ariaLabel || title;
  return (
    <button
      type="button"
      style={s}
      disabled={disabled}
      onMouseEnter={() => !disabled && setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={onClick}
      title={title}
      aria-label={label}>

      <Icon name={icon} size={size === "sm" ? 16 : 18} aria-hidden="true" />
    </button>);

};

// ════════════════════════════════════════════════════════════════════════════
// Input
// ════════════════════════════════════════════════════════════════════════════
let __inputIdCounter = 0;
const useId = (prefix = "id") => {
  const ref = React.useRef(null);
  if (ref.current == null) {
    __inputIdCounter += 1;
    ref.current = `${prefix}-${__inputIdCounter}`;
  }
  return ref.current;
};

const Input = ({
  label, hint, error, icon, iconRight, prefix, suffix, value, onChange,
  type = "text", placeholder, required, disabled, size = "md", style,
  onFocus, onBlur, onKeyDown, id: idProp, "aria-label": ariaLabel,
  autoFocus, autoComplete, inputMode, name, maxLength, pattern
}) => {
  const [focused, setFocused] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const heights = { sm: 36, md: 44, lg: 52 };
  const h = heights[size];
  const autoId = useId("input");
  const id = idProp || autoId;
  const hintId = hint || error ? `${id}-desc` : undefined;
  const borderColor = disabled ? "var(--c-disabled-border)" :
  error ? "var(--c-danger)" :
  focused ? "var(--c-accent)" :
  hover ? "var(--c-muted-2)" :
  "var(--c-border)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-1)", ...style }}>
      {label &&
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: "var(--fw-medium)", color: "var(--c-ink-2)" }}>
          {label} {required && <span style={{ color: "var(--c-danger)" }} aria-hidden="true">*</span>}
        </label>
      }
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex", alignItems: "center", gap: "var(--s-2)",
          height: h, padding: "0 14px",
          borderRadius: "var(--r-md)",
          border: `1px solid ${borderColor}`,
          background: disabled ? "var(--c-disabled-bg)" : "var(--c-surface)",
          boxShadow: focused ? error ? "var(--sh-focus-danger)" : "var(--sh-focus)" : "none",
          transition: "border-color var(--motion-fast), box-shadow var(--motion-fast)"
        }}>
        
        {icon && <Icon name={icon} size={18} color="var(--c-muted)" aria-hidden="true" />}
        {prefix && <span style={{ color: "var(--c-muted)", fontSize: "var(--fs-body)" }}>{prefix}</span>}
        <input
          id={id}
          type={type}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          name={name}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          pattern={pattern}
          aria-invalid={!!error || undefined}
          aria-describedby={hintId}
          aria-label={!label ? ariaLabel : undefined}
          onFocus={(e) => {setFocused(true);onFocus?.(e);}}
          onBlur={(e) => {setFocused(false);onBlur?.(e);}}
          onKeyDown={onKeyDown}
          className="input-bare"
          style={{
            flex: 1, minWidth: 0, background: "transparent",
            color: "var(--c-ink)"
          }} />

        {suffix && <span style={{ color: "var(--c-muted)", fontSize: "var(--fs-body)" }}>{suffix}</span>}
        {iconRight && <Icon name={iconRight} size={18} color="var(--c-muted)" aria-hidden="true" />}
      </div>
      {(hint || error) &&
      <div id={hintId}
      role={error ? "alert" : undefined}
      style={{ fontSize: "var(--fs-small)", lineHeight: "var(--lh-small)", color: error ? "var(--c-danger)" : "var(--c-muted)", display: "flex", gap: 4, alignItems: "center" }}>
          {error && <Icon name="alert" size={14} aria-hidden="true" />}
          {error || hint}
        </div>
      }
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// Textarea — multi-line text input. Same fence/focus model as Input.
// Wrapper draws the border + ring; inner <textarea> is bare via .input-bare.
// Pass rows for default size; resize="vertical|none" controls handle visibility.
// ════════════════════════════════════════════════════════════════════════════
const Textarea = ({
  label, hint, error, value, onChange, placeholder, required, disabled, readOnly,
  rows = 4, resize = "vertical", maxLength, showCount, style,
  onFocus, onBlur, id: idProp, "aria-label": ariaLabel
}) => {
  const [focused, setFocused] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const autoId = useId("textarea");
  const id = idProp || autoId;
  const hintId = hint || error ? `${id}-desc` : undefined;
  const borderColor = disabled ? "var(--c-disabled-border)" :
  error ? "var(--c-danger)" :
  focused ? "var(--c-accent)" :
  hover ? "var(--c-muted-2)" :
  "var(--c-border)";
  const len = (value ?? "").length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-1)", ...style }}>
      {label &&
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: "var(--fw-medium)", color: "var(--c-ink-2)" }}>
          {label} {required && <span style={{ color: "var(--c-danger)" }} aria-hidden="true">*</span>}
        </label>
      }
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          padding: "10px 14px",
          borderRadius: "var(--r-md)",
          border: `1px solid ${borderColor}`,
          background: disabled ? "var(--c-disabled-bg)" : "var(--c-surface)",
          boxShadow: focused ? error ? "var(--sh-focus-danger)" : "var(--sh-focus)" : "none",
          transition: "border-color var(--motion-fast), box-shadow var(--motion-fast)"
        }}>
        
        <textarea
          id={id}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={!!error || undefined}
          aria-describedby={hintId}
          aria-label={!label ? ariaLabel : undefined}
          onFocus={(e) => {setFocused(true);onFocus?.(e);}}
          onBlur={(e) => {setFocused(false);onBlur?.(e);}}
          className="input-bare"
          style={{
            display: "block", width: "100%", background: "transparent",
            color: "var(--c-ink)", resize, padding: 0,
            fontFamily: "inherit", fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)"
          }} />

      </div>
      {(hint || error || showCount && maxLength) &&
      <div id={hintId}
      role={error ? "alert" : undefined}
      style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "var(--fs-small)", lineHeight: "var(--lh-small)", color: error ? "var(--c-danger)" : "var(--c-muted)" }}>
          <span style={{ display: "flex", gap: 4, alignItems: "center", flex: 1, minWidth: 0 }}>
            {error && <Icon name="alert" size={14} aria-hidden="true" />}
            {error || hint || ""}
          </span>
          {showCount && maxLength &&
        <span className="tabular" style={{ color: len >= maxLength ? "var(--c-danger)" : "var(--c-muted-2)", flexShrink: 0 }}>
              {len}/{maxLength}
            </span>
        }
        </div>
      }
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// Tag / Badge
// ════════════════════════════════════════════════════════════════════════════
const Tag = ({ children, tone = "neutral", icon, dot, size = "md", style, onRemove }) => {
  const tones = {
    neutral: { bg: "var(--c-bg-2)", fg: "var(--c-ink-2)", dot: "var(--c-muted)" },
    blue: { bg: "var(--c-accent-soft)", fg: "var(--c-primary)", dot: "var(--c-accent)" },
    green: { bg: "var(--c-success-soft)", fg: "var(--c-success)", dot: "var(--c-success)" },
    red: { bg: "var(--c-danger-soft)", fg: "var(--c-danger)", dot: "var(--c-danger)" },
    orange: { bg: "var(--c-warning-soft)", fg: "var(--c-warning)", dot: "var(--c-warning)" },
    purple: { bg: "var(--c-purple-soft)", fg: "var(--c-purple)", dot: "var(--c-purple)" },
    grey: { bg: "var(--c-bg-2)", fg: "var(--c-muted)", dot: "var(--c-muted)" }
  };
  const t = tones[tone] || tones.neutral;
  const pad = size === "sm" ? "2px 8px" : "4px 10px";
  const fs = size === "sm" ? 11 : "var(--fs-small)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: pad, borderRadius: "var(--r-pill)", background: t.bg, color: t.fg,
      fontSize: fs, fontWeight: "var(--fw-semibold)", lineHeight: 1.3, letterSpacing: 0,
      ...style
    }}>
      {dot && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "var(--r-pill)", background: t.dot }} />}
      {icon && <Icon name={icon} size={12} aria-hidden="true" />}
      {children}
      {onRemove &&
      <button type="button" onClick={onRemove} aria-label="Remove"
      style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit", padding: 0, display: "flex" }}>
          <Icon name="close" size={12} aria-hidden="true" />
        </button>
      }
    </span>);

};

// ════════════════════════════════════════════════════════════════════════════
// Avatar
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// Toggle / Checkbox / Radio
// ════════════════════════════════════════════════════════════════════════════
const Checkbox = ({ checked, onChange, label, disabled, indeterminate, error, style, tone, "aria-label": ariaLabel }) => {
  const filled = checked || indeterminate;
  // tone="primary" renders the checked fill in brand navy; default is accent blue.
  const fillColor = tone === "primary" ? "var(--c-primary)" : "var(--c-accent)";
  const borderColor = disabled ? "var(--c-disabled-border)" :
  error ? "var(--c-danger)" :
  filled ? fillColor :
  "var(--c-border-strong)";
  const bgColor = disabled ? "var(--c-disabled-bg)" :
  filled ? fillColor :
  "var(--c-surface)";
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", ...style }}>
        <span style={{
          position: "relative",
          width: 18, height: 18, borderRadius: 5,
          border: `1.5px solid ${borderColor}`,
          background: bgColor,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          flex: "0 0 auto", transition: "all var(--motion-fast)",
          opacity: disabled ? 0.7 : 1
        }}>
          {indeterminate ?
          <span aria-hidden="true" style={{ width: 10, height: 2, background: "var(--p-neutral-0)", borderRadius: 1 }} /> :

          checked && <Icon name="check" size={12} color="var(--p-neutral-0)" stroke={3} aria-hidden="true" />
          }
          <input
            type="checkbox"
            checked={!!checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            aria-invalid={!!error || undefined}
            aria-label={!label ? ariaLabel : undefined}
            style={{ position: "absolute", inset: 0, opacity: 0, margin: 0, cursor: "inherit" }} />
          
        </span>
        {label && <span style={{ fontSize: "var(--fs-body)", color: disabled ? "var(--c-muted)" : "var(--c-ink-2)" }}>{label}</span>}
      </label>
      {error && <span role="alert" style={{ fontSize: "var(--fs-small)", color: "var(--c-danger)", marginLeft: 28 }}>{error}</span>}
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// Tabs
// ════════════════════════════════════════════════════════════════════════════
const useActiveRect = (containerRef, activeId, deps = []) => {
  const [rect, setRect] = React.useState(null);
  React.useLayoutEffect(() => {
    const wrap = containerRef.current;
    if (!wrap) return;
    const el = wrap.querySelector(`[data-tab-id="${CSS.escape(String(activeId))}"]`);
    if (!el) {setRect(null);return;}
    const measure = () => {
      const wr = wrap.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setRect({ left: er.left - wr.left, top: er.top - wr.top, width: er.width, height: er.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line
  }, [activeId, ...deps]);
  return rect;
};

// ════════════════════════════════════════════════════════════════════════════
// Segmented control
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// Card
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// Alert
// ════════════════════════════════════════════════════════════════════════════
const Alert = ({ title, children, tone = "info", icon, onClose, action, style, role: roleProp }) => {
  const tones = {
    info: { bg: "var(--c-accent-soft)", fg: "var(--c-primary)", ic: "info", bd: "transparent" },
    success: { bg: "var(--c-success-soft)", fg: "var(--c-success)", ic: "check_circle", bd: "transparent" },
    warning: { bg: "var(--c-warning-soft)", fg: "var(--c-warning)", ic: "alert", bd: "transparent" },
    danger: { bg: "var(--c-danger-soft)", fg: "var(--c-danger)", ic: "x_circle", bd: "transparent" }
  };
  const t = tones[tone];
  const role = roleProp || (tone === "danger" || tone === "warning" ? "alert" : "status");
  return (
    <div role={role} style={{
      display: "flex", gap: "var(--s-3)", padding: 14, borderRadius: "var(--r-md)",
      background: t.bg, border: `1px solid ${t.bd}`,
      color: t.fg, ...style
    }}>
      <Icon name={icon || t.ic} size={20} style={{ marginTop: 1, flex: "0 0 auto" }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: "var(--fw-semibold)", fontSize: "var(--fs-body)", marginBottom: children ? 2 : 0 }}>{title}</div>}
        {children && <div style={{ fontSize: 13, lineHeight: "18px", opacity: .9 }}>{children}</div>}
        {action && <div style={{ marginTop: 10 }}>{action}</div>}
      </div>
      {onClose &&
      <button type="button" onClick={onClose} aria-label="Close"
      style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 2, display: "flex", alignSelf: "start" }}>
          <Icon name="close" size={16} aria-hidden="true" />
        </button>
      }
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// Modal — dialog with focus trap, ESC, restore-focus
// ════════════════════════════════════════════════════════════════════════════
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Modal = ({ open, onClose, title, children, footer, width = 480, style, "aria-label": ariaLabel }) => {
  const dialogRef = React.useRef(null);
  const lastActiveRef = React.useRef(null);
  const titleId = useId("dlg-title");
  React.useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // initial focus
    setTimeout(() => {
      const node = dialogRef.current;
      if (!node) return;
      const focusable = node.querySelectorAll(FOCUSABLE);
      (focusable[0] || node).focus();
    }, 0);
    const onKey = (e) => {
      if (e.key === "Escape") {e.preventDefault();onClose?.();return;}
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
        if (focusable.length === 0) return;
        const first = focusable[0],last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {e.preventDefault();last.focus();} else
        if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();}
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      lastActiveRef.current?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fade-in" onClick={onClose}
    style={{
      position: "fixed", inset: 0, background: "var(--c-overlay)",
      backdropFilter: "blur(4px)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }}>
      <div
        ref={dialogRef}
        className="scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--c-surface)", borderRadius: "var(--r-xl)", width: "100%", maxWidth: width,
          boxShadow: "var(--sh-3)", overflow: "hidden", display: "flex", flexDirection: "column",
          maxHeight: "90vh", color: "var(--c-ink)",
          ...style
        }}>
        {title &&
        <div style={{ display: "flex", alignItems: "center", padding: "18px 20px 12px", justifyContent: "space-between" }}>
            <div id={titleId} className="t-h3" style={{ margin: 0 }}>{title}</div>
            <IconButton icon="close" onClick={onClose} size="sm" title="Close dialog" />
          </div>
        }
        <div style={{ padding: "0 20px 20px", overflow: "auto", flex: 1, overscrollBehavior: "contain" }}>{children}</div>
        {footer &&
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--c-border-soft)", display: "flex", gap: "var(--s-2)", justifyContent: "flex-end" }}>
            {footer}
          </div>
        }
      </div>
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// Progress
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// Select — listbox with arrow-key nav
// ════════════════════════════════════════════════════════════════════════════
const Select = ({ label, value, onChange, options, placeholder, error, disabled, defaultOpen, size = "md", style, "aria-label": ariaLabel }) => {
  const [open, setOpen] = React.useState(!!defaultOpen);
  const [hover, setHover] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const heights = { sm: 36, md: 44, lg: 52 };
  const h = heights[size];
  const ref = React.useRef(null);
  const btnRef = React.useRef(null);
  const listRef = React.useRef(null);
  const id = useId("sel");
  const listId = `${id}-list`;
  const labelId = label ? `${id}-label` : undefined;
  const [panelTop, setPanelTop] = React.useState(0);

  React.useLayoutEffect(() => {
    if (open && btnRef.current && ref.current) {
      const btn = btnRef.current.getBoundingClientRect();
      const wrap = ref.current.getBoundingClientRect();
      setPanelTop(btn.bottom - wrap.top + 4);
    }
  }, [open]);

  React.useEffect(() => {
    const handler = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Body scroll lock while the dropdown is open. `overscroll-behavior:
  // contain` on the ul alone isn't enough on macOS: trackpad inertia
  // past the end of the list still propagates through ancestor scroll
  // contexts up to the document, body rubber-bands, the wrapper moves
  // a few px and the absolute-positioned panel visually detaches from
  // its trigger — leaving a strip where you can see content behind it.
  // Same approach Modal uses (via backdrop). Compensates for scrollbar
  // width so layout doesn't jump when overflow flips to hidden.
  React.useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  // Keep activeIdx scrolled into view
  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  const selected = options.find((o) => o.value === value);

  const onKey = (e) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
        const idx = Math.max(0, options.findIndex((o) => o.value === value));
        setActiveIdx(idx);
      }
      return;
    }
    if (e.key === "Escape") {e.preventDefault();setOpen(false);btnRef.current?.focus();} else
    if (e.key === "ArrowDown") {e.preventDefault();setActiveIdx((i) => Math.min(options.length - 1, i + 1));} else
    if (e.key === "ArrowUp") {e.preventDefault();setActiveIdx((i) => Math.max(0, i - 1));} else
    if (e.key === "Home") {e.preventDefault();setActiveIdx(0);} else
    if (e.key === "End") {e.preventDefault();setActiveIdx(options.length - 1);} else
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const o = options[activeIdx];
      if (o) {onChange(o.value);setOpen(false);btnRef.current?.focus();}
    }
  };

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "var(--s-1)", position: "relative", ...style }}>
      {label && <label id={labelId} htmlFor={id} style={{ fontSize: 13, fontWeight: "var(--fw-medium)", color: "var(--c-ink-2)" }}>{label}</label>}
      <button
        type="button"
        id={id}
        ref={btnRef}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-labelledby={labelId}
        aria-label={!label ? ariaLabel : undefined}
        aria-invalid={!!error || undefined}
        onMouseEnter={() => !disabled && setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKey}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: h, padding: "0 14px", borderRadius: "var(--r-md)",
          border: `1px solid ${disabled ? "var(--c-disabled-border)" : error ? "var(--c-danger)" : open ? "var(--c-accent)" : hover ? "var(--c-muted-2)" : "var(--c-border)"}`,
          background: disabled ? "var(--c-disabled-bg)" : "var(--c-surface)",
          cursor: disabled ? "not-allowed" : "pointer", width: "100%",
          color: disabled ? "var(--c-disabled-fg)" : "var(--c-ink)",
          boxShadow: open ? "var(--sh-focus)" : "none",
          transition: "all var(--motion-fast)", textAlign: "left"
        }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--s-2)", color: disabled ? "var(--c-disabled-fg)" : selected ? "var(--c-ink)" : "var(--c-muted)", fontSize: "var(--fs-body)", minWidth: 0 }}>
          {selected?.flag && <Flag code={selected.flag} size={20} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected?.label || placeholder || "Select…"}</span>
        </span>
        <Icon name="chevronDown" size={16} color="var(--c-muted)"
        style={{ transition: "transform var(--motion-base)", transform: open ? "rotate(180deg)" : "none" }} aria-hidden="true" />
      </button>
      {open &&
      <div
        className="scale-in"
        style={{
          // Outer panel — paints the background / border / shadow and
          // does NOT scroll. The inner <ul> is the only scrollable
          // element, so the macOS trackpad rubber-band can never reveal
          // anything behind the panel (the bg is on the parent, the ul
          // shifts inside but the parent stays put).
          position: "absolute", top: panelTop, left: 0, right: 0, zIndex: 40,
          background: "var(--c-surface)",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--c-border-soft)",
          boxShadow: "var(--sh-3)",
          padding: 4,
          // Crop the scrollbar to the rounded corners — without this
          // overflow:hidden the inner ul's scrollbar pokes outside the
          // rounded panel edge.
          overflow: "hidden",
        }}>
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          style={{
            maxHeight: 292, // 300 minus the outer 4px×2 padding
            overflowY: "auto",
            overscrollBehavior: "contain",
            margin: 0, padding: 0, listStyle: "none",
          }}>
          {options.map((o, i) => {
          const on = value === o.value;
          const active = i === activeIdx;
          return (
            <li key={o.value} data-idx={i} role="option" aria-selected={on}
            onMouseEnter={() => setActiveIdx(i)}
            onClick={() => {onChange(o.value);setOpen(false);btnRef.current?.focus();}}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px",
              background: on ? "var(--c-accent-soft)" : active ? "var(--c-surface-hover)" : "transparent",
              color: "var(--c-ink)", fontSize: "var(--fs-body)", borderRadius: "var(--r-sm)", cursor: "pointer"
            }}>
                {o.flag && <Flag code={o.flag} size={20} />}
                {o.icon && <Icon name={o.icon} size={16} color="var(--c-muted)" aria-hidden="true" />}
                <span style={{ flex: 1 }}>{o.label}</span>
                {on && <Icon name="check" size={14} color="var(--c-accent)" aria-hidden="true" />}
              </li>);

        })}
        </ul>
      </div>
      }
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// Tooltip
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// Breadcrumb
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// Stepper — works on light surface, sunken bg, or dark/primary background.
// Pass tone="onLight" (default) or tone="onDark" to flip the palette.
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// FileUploadRow
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// PersonRow
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// SelectableListItem
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// Timeline
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// ApplicationCard
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// ReviewSection
// ════════════════════════════════════════════════════════════════════════════
Object.assign(window, {
  Button, IconButton, Spinner, Input, Tag, Textarea, Checkbox, Alert, Modal, Select,
});