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
  return (
    <button
      type={type}
      style={s}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      aria-label={ariaLabelProp || (!labelFromChildren && (iconLeft || iconRight) ? iconLeft || iconRight : undefined)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => {setH(false);setA(false);}}
      onMouseDown={() => setA(true)}
      onMouseUp={() => setA(false)}
      onClick={onClick}>

      {loading ? <Spinner size={sz.iconSize} /> : iconLeft && <Icon name={iconLeft} size={sz.iconSize} aria-hidden="true" />}
      {children && <span>{children}</span>}
      {iconRight && !loading && <Icon name={iconRight} size={sz.iconSize} aria-hidden="true" />}
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
const IconButton = ({ icon, size = "md", variant = "ghost", onClick, style, title, "aria-label": ariaLabel, disabled, ...rest }) => {
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
      aria-label={label}
      {...rest}>
      
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
  onFocus, onBlur, id: idProp, "aria-label": ariaLabel, ...rest
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
          aria-invalid={!!error || undefined}
          aria-describedby={hintId}
          aria-label={!label ? ariaLabel : undefined}
          onFocus={(e) => {setFocused(true);onFocus?.(e);}}
          onBlur={(e) => {setFocused(false);onBlur?.(e);}}
          className="input-bare"
          style={{
            flex: 1, minWidth: 0, background: "transparent",
            color: "var(--c-ink)"
          }}
          {...rest} />
        
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
  onFocus, onBlur, id: idProp, "aria-label": ariaLabel, ...rest
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
          }}
          {...rest} />
        
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
    purple: { bg: "var(--c-purple-soft)", fg: "var(--c-purple)", dot: "var(--c-purple)" }
  };
  const t = tones[tone];
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

const Badge = ({ count, dot, children, tone = "red", style, "aria-label": ariaLabel }) => {
  const tones = {
    red: "var(--c-danger)",
    blue: "var(--c-accent)",
    green: "var(--c-success)",
    orange: "var(--c-warning)"
  };
  return (
    <span style={{ position: "relative", display: "inline-flex", ...style }}>
      {children}
      {(count > 0 || dot) &&
      <span
        aria-label={ariaLabel || (dot ? "Notification" : `${count} notifications`)}
        style={{
          position: "absolute", top: -4, right: -4,
          minWidth: dot ? 8 : 18, height: dot ? 8 : 18, padding: dot ? 0 : "0 5px",
          borderRadius: "var(--r-pill)", background: tones[tone], color: "var(--p-neutral-0)",
          fontSize: 11, fontWeight: "var(--fw-bold)", lineHeight: "18px", textAlign: "center",
          border: "2px solid var(--c-surface)", boxSizing: "content-box"
        }}>{dot ? "" : count}</span>
      }
    </span>);

};

// ════════════════════════════════════════════════════════════════════════════
// Avatar
// ════════════════════════════════════════════════════════════════════════════
const Avatar = ({ name, size = 36, src, tone, style }) => {
  // Derived from semantic soft surfaces; consistent in light + dark.
  const tones = [
  { bg: "var(--c-accent-soft)", fg: "var(--c-accent)" },
  { bg: "var(--c-success-soft)", fg: "var(--c-success)" },
  { bg: "var(--c-danger-soft)", fg: "var(--c-danger)" },
  { bg: "var(--c-warning-soft)", fg: "var(--c-warning)" },
  { bg: "var(--c-purple-soft)", fg: "var(--c-purple)" },
  { bg: "var(--c-bg-2)", fg: "var(--c-ink-2)" }];

  const initials = (name || "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  const idx = tone ?? (name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % tones.length : 0);
  const t = tones[idx];
  return (
    <div role="img" aria-label={name || "User"} style={{
      width: size, height: size, borderRadius: "var(--r-pill)",
      background: src ? "transparent" : t.bg,
      color: t.fg,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: "var(--fw-semibold)", letterSpacing: 0, flex: "0 0 auto",
      overflow: "hidden",
      ...style
    }}>
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span aria-hidden="true">{initials}</span>}
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// Toggle / Checkbox / Radio
// ════════════════════════════════════════════════════════════════════════════
const Toggle = ({ checked, onChange, disabled, loading, size = "md", label, style, "aria-label": ariaLabel }) => {
  const w = size === "sm" ? 32 : 40;
  const h = size === "sm" ? 18 : 22;
  const k = h - 4;
  const isDisabled = disabled || loading;
  const onKey = (e) => {
    if (isDisabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange?.(!checked);
    }
  };
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: isDisabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, ...style }}>
      <span
        role="switch"
        aria-checked={!!checked}
        aria-disabled={isDisabled || undefined}
        aria-label={!label ? ariaLabel : undefined}
        tabIndex={isDisabled ? -1 : 0}
        onKeyDown={onKey}
        onClick={() => !isDisabled && onChange?.(!checked)}
        style={{
          position: "relative", width: w, height: h,
          background: checked ? "var(--c-accent)" : "var(--c-border-strong)",
          borderRadius: "var(--r-pill)", transition: "background var(--motion-base)",
          flex: "0 0 auto", display: "inline-block"
        }}>
        
        <span aria-hidden="true" style={{
          position: "absolute", top: 2, left: checked ? w - k - 2 : 2,
          width: k, height: k, borderRadius: "var(--r-pill)", background: "var(--p-neutral-0)",
          transition: "left var(--motion-base) var(--easing-spring)",
          boxShadow: "var(--sh-1)",
          display: "inline-flex", alignItems: "center", justifyContent: "center"
        }}>
          {loading &&
          <span style={{
            width: k - 6, height: k - 6, borderRadius: "var(--r-pill)",
            border: "1.5px solid rgba(0,39,128,.25)",
            borderTopColor: "var(--c-primary)",
            animation: "spin .7s linear infinite",
            display: "inline-block"
          }} />
          }
        </span>
        <input type="checkbox" checked={!!checked} onChange={(e) => onChange?.(e.target.checked)} disabled={isDisabled}
        tabIndex={-1}
        style={{ position: "absolute", inset: 0, opacity: 0, margin: 0, cursor: "inherit" }} />
      </span>
      {label && <span style={{ fontSize: "var(--fs-body)", color: disabled ? "var(--c-muted)" : "var(--c-ink-2)" }}>{label}</span>}
    </label>);

};

const Checkbox = ({ checked, onChange, label, disabled, indeterminate, error, style, "aria-label": ariaLabel }) => {
  const filled = checked || indeterminate;
  const borderColor = disabled ? "var(--c-disabled-border)" :
  error ? "var(--c-danger)" :
  filled ? "var(--c-accent)" :
  "var(--c-border-strong)";
  const bgColor = disabled ? "var(--c-disabled-bg)" :
  filled ? "var(--c-accent)" :
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

const Radio = ({ checked, onChange, label, disabled, name, value, style, "aria-label": ariaLabel }) =>
<label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, ...style }}>
    <span style={{
    position: "relative",
    width: 18, height: 18, borderRadius: "var(--r-pill)",
    border: `1.5px solid ${checked ? "var(--c-accent)" : "var(--c-border-strong)"}`,
    background: disabled ? "var(--c-disabled-bg)" : "var(--c-surface)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flex: "0 0 auto", transition: "all var(--motion-fast)"
  }}>
      {checked && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "var(--r-pill)", background: "var(--c-accent)" }} />}
      <input
      type="radio" name={name} value={value} checked={!!checked} disabled={disabled}
      onChange={() => onChange?.(true)}
      aria-label={!label ? ariaLabel : undefined}
      style={{ position: "absolute", inset: 0, opacity: 0, margin: 0, cursor: "inherit" }} />
    
    </span>
    {label && <span style={{ fontSize: "var(--fs-body)", color: disabled ? "var(--c-muted)" : "var(--c-ink-2)" }}>{label}</span>}
  </label>;


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

const Tabs = ({ tabs, active, onChange, variant = "underline", size = "md", style, ariaLabel = "Tabs" }) => {
  const wrapRef = React.useRef(null);
  const rect = useActiveRect(wrapRef, active, [tabs.length, variant, size]);
  const ready = rect != null;

  const onKeyDown = (e) => {
    const idx = tabs.findIndex((t) => t.id === active);
    if (idx < 0) return;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % tabs.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(tabs[next].id);
      const el = wrapRef.current?.querySelector(`[data-tab-id="${CSS.escape(String(tabs[next].id))}"]`);
      el?.focus();
    }
  };

  const baseStyle = variant === "pill" ?
  { position: "relative", display: "inline-flex", padding: 4, background: "var(--c-bg-2)", borderRadius: "var(--r-sm)", gap: 2, ...style } :
  { position: "relative", display: "flex", gap: 0, borderBottom: "1px solid var(--c-border-soft)", ...style };

  return (
    <div ref={wrapRef} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} style={baseStyle}>
      {variant === "pill" &&
      <div aria-hidden="true" style={{
        position: "absolute",
        left: ready ? rect.left : 0,
        top: ready ? rect.top : 0,
        width: ready ? rect.width : 0,
        height: ready ? rect.height : 0,
        background: "var(--c-surface)",
        borderRadius: "var(--r-sm)",
        boxShadow: "var(--sh-1)",
        transition: ready ? "left var(--motion-slow) var(--easing-spring), width var(--motion-slow) var(--easing-spring), top var(--motion-slow) var(--easing-spring), height var(--motion-slow) var(--easing-spring)" : "none",
        opacity: ready ? 1 : 0,
        pointerEvents: "none"
      }} />
      }
      {variant !== "pill" &&
      <div aria-hidden="true" style={{
        position: "absolute",
        left: ready ? rect.left : 0,
        bottom: -1,
        width: ready ? rect.width : 0,
        height: 2,
        background: "var(--c-primary)",
        borderRadius: 2,
        transition: ready ? "left var(--motion-slow) var(--easing-spring), width var(--motion-slow) var(--easing-spring)" : "none",
        opacity: ready ? 1 : 0,
        pointerEvents: "none"
      }} />
      }
      {tabs.map((t) => {
        const on = t.id === active;
        const common = {
          role: "tab",
          "aria-selected": on,
          tabIndex: on ? 0 : -1,
          "data-tab-id": t.id,
          onClick: () => onChange(t.id),
          type: "button"
        };
        if (variant === "pill") {
          return (
            <button key={t.id} {...common}
            style={{
              position: "relative", zIndex: 1,
              padding: "6px 14px", fontSize: 13, fontWeight: "var(--fw-medium)", border: "none",
              borderRadius: "var(--r-sm)", cursor: "pointer", background: "transparent",
              color: on ? "var(--c-ink)" : "var(--c-muted)",
              transition: "color var(--motion-base)",
              display: "inline-flex", alignItems: "center", gap: 6
            }}>
              {t.icon && <Icon name={t.icon} size={14} aria-hidden="true" />}
              {t.label}
              {t.count != null && <span style={{ fontSize: 11, color: on ? "var(--c-muted)" : "var(--c-muted-2)", background: on ? "var(--c-bg-2)" : "transparent", padding: "1px 6px", borderRadius: "var(--r-pill)", transition: "background var(--motion-base), color var(--motion-base)" }}>{t.count}</span>}
            </button>);

        }
        return (
          <button key={t.id} {...common}
          style={{
            padding: size === "sm" ? "8px 12px" : "12px 16px",
            fontSize: size === "sm" ? 13 : "var(--fs-body)", fontWeight: "var(--fw-medium)",
            border: "none", background: "transparent",
            color: on ? "var(--c-ink)" : "var(--c-muted)",
            marginBottom: -1, cursor: "pointer",
            transition: "color var(--motion-base)",
            display: "inline-flex", alignItems: "center", gap: 6
          }}>
            {t.icon && <Icon name={t.icon} size={16} aria-hidden="true" />}
            {t.label}
            {t.count != null && <span style={{ fontSize: 11, color: "var(--c-muted)", background: "var(--c-bg-2)", padding: "1px 6px", borderRadius: "var(--r-pill)", fontWeight: "var(--fw-semibold)" }}>{t.count}</span>}
          </button>);

      })}
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// Segmented control
// ════════════════════════════════════════════════════════════════════════════
const Segmented = ({ options, value, onChange, size = "md", style, ariaLabel = "Options" }) => {
  const wrapRef = React.useRef(null);
  const rect = useActiveRect(wrapRef, value, [options.length, size]);
  const ready = rect != null;
  const onKeyDown = (e) => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx < 0) return;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % options.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + options.length) % options.length;
    if (next >= 0) {e.preventDefault();onChange(options[next].value);}
  };
  return (
    <div ref={wrapRef} role="radiogroup" aria-label={ariaLabel} onKeyDown={onKeyDown}
    style={{
      position: "relative",
      display: "inline-flex", padding: 3, background: "var(--c-bg-2)", borderRadius: "var(--r-sm)", gap: 2,
      ...style
    }}>
      <div aria-hidden="true" style={{
        position: "absolute",
        left: ready ? rect.left : 0,
        top: ready ? rect.top : 0,
        width: ready ? rect.width : 0,
        height: ready ? rect.height : 0,
        background: "var(--c-surface)",
        borderRadius: "var(--r-sm)",
        boxShadow: "var(--sh-1)",
        transition: ready ? "left var(--motion-slow) var(--easing-spring), width var(--motion-slow) var(--easing-spring), top var(--motion-slow) var(--easing-spring), height var(--motion-slow) var(--easing-spring)" : "none",
        opacity: ready ? 1 : 0,
        pointerEvents: "none"
      }} />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" data-tab-id={o.value} role="radio" aria-checked={on}
          tabIndex={on ? 0 : -1}
          onClick={() => onChange(o.value)}
          style={{
            position: "relative", zIndex: 1,
            padding: size === "sm" ? "5px 10px" : "6px 14px",
            fontSize: size === "sm" ? "var(--fs-small)" : 13,
            fontWeight: "var(--fw-medium)", border: "none", borderRadius: "var(--r-sm)", cursor: "pointer",
            background: "transparent",
            color: on ? "var(--c-ink)" : "var(--c-muted)",
            transition: "color var(--motion-base)"
          }}>
            {o.label}
          </button>);

      })}
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// Card
// ════════════════════════════════════════════════════════════════════════════
const Card = ({ children, padding = 20, hover, onClick, style, interactive, as: Tag = "div", ...rest }) => {
  const [h, setH] = React.useState(false);
  const isInteractive = !!(interactive || onClick);
  return (
    <Tag
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={onClick}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === "Enter" || e.key === " ") {e.preventDefault();onClick?.(e);}
      } : undefined}
      role={isInteractive && Tag === "div" ? "button" : undefined}
      tabIndex={isInteractive && Tag === "div" ? 0 : undefined}
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-soft)",
        borderRadius: "var(--r-lg)",
        padding,
        boxShadow: h && (hover || interactive) ? "var(--sh-2)" : "var(--sh-1)",
        transition: "box-shadow var(--motion-base), transform var(--motion-base), border-color var(--motion-base)",
        cursor: hover || interactive || onClick ? "pointer" : "default",
        transform: h && interactive ? "translateY(-1px)" : "none",
        borderColor: h && interactive ? "var(--c-border)" : "var(--c-border-soft)",
        color: "var(--c-ink)",
        ...style
      }}
      {...rest}>
      
      {children}
    </Tag>);

};

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
        <div style={{ padding: "0 20px 20px", overflow: "auto", flex: 1 }}>{children}</div>
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
const Progress = ({ value = 0, max = 100, tone = "accent", height = 6, label, style, "aria-label": ariaLabel }) => {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const tones = {
    accent: "var(--c-accent)", primary: "var(--c-primary)",
    success: "var(--c-success)", warning: "var(--c-warning)", danger: "var(--c-danger)"
  };
  return (
    <div style={style}>
      {label &&
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-small)", color: "var(--c-muted)", marginBottom: 6 }}>
          <span>{label}</span><span className="tabular">{Math.round(pct)}%</span>
        </div>
      }
      <div role="progressbar"
      aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
      aria-label={!label ? ariaLabel || "Progress" : undefined}
      style={{ height, background: "var(--c-bg-2)", borderRadius: "var(--r-pill)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: tones[tone], borderRadius: "var(--r-pill)", transition: "width var(--motion-slow) var(--easing-spring)" }} />
      </div>
    </div>);

};

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
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-labelledby={labelId}
        className="scale-in"
        style={{
          position: "absolute", top: panelTop, left: 0, right: 0, zIndex: 40,
          background: "var(--c-surface)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border-soft)",
          boxShadow: "var(--sh-3)", padding: 4, maxHeight: 300, overflow: "auto",
          margin: 0, listStyle: "none"
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
      }
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// Tooltip
// ════════════════════════════════════════════════════════════════════════════
const Tooltip = ({ children, content, placement = "top", style }) => {
  const [show, setShow] = React.useState(false);
  const tipId = useId("tt");
  const placements = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translate3d(-50%, 0, 0)", shiftFrom: "translate3d(-50%, 4px, 0)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translate3d(-50%, 0, 0)", shiftFrom: "translate3d(-50%, -4px, 0)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translate3d(0, -50%, 0)", shiftFrom: "translate3d(-4px, -50%, 0)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translate3d(0, -50%, 0)", shiftFrom: "translate3d(4px, -50%, 0)" }
  };
  const p = placements[placement];
  return (
    <span style={{ position: "relative", display: "inline-flex", ...style }}
    onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
    onFocus={() => setShow(true)} onBlur={() => setShow(false)}
    aria-describedby={show ? tipId : undefined}>
      
      {children}
      {show &&
      <span id={tipId} role="tooltip" style={{
        position: "absolute",
        bottom: p.bottom, top: p.top, left: p.left, right: p.right,
        background: "var(--p-neutral-900)", color: "var(--p-neutral-0)",
        fontSize: "var(--fs-small)", lineHeight: "var(--lh-small)",
        padding: "6px 10px", borderRadius: "var(--r-sm)", whiteSpace: "nowrap",
        pointerEvents: "none", zIndex: 50, fontWeight: "var(--fw-medium)",
        boxShadow: "var(--sh-2)",
        transform: p.transform,
        animation: "tt-in .14s ease-out both",
        "--tt-from": p.shiftFrom,
        "--tt-to": p.transform
      }}>{content}</span>
      }
    </span>);

};

// ════════════════════════════════════════════════════════════════════════════
// Breadcrumb
// ════════════════════════════════════════════════════════════════════════════
const Breadcrumb = ({ items, style }) =>
<nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, ...style }}>
    <ol style={{ display: "flex", alignItems: "center", gap: 4, listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((it, i) => {
      const isLast = i === items.length - 1;
      return (
        <li key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i > 0 && <Icon name="chevronRight" size={14} color="var(--c-muted-2)" aria-hidden="true" />}
            {it.onClick || it.href ?
          <a href={it.href || "#"}
          aria-current={isLast ? "page" : undefined}
          onClick={(e) => {if (it.onClick) {e.preventDefault();it.onClick();}}}
          style={{ color: isLast ? "var(--c-ink)" : "var(--c-muted)", fontWeight: isLast ? "var(--fw-medium)" : "var(--fw-regular)" }}>
                {it.label}
              </a> :

          <span aria-current={isLast ? "page" : undefined}
          style={{ color: isLast ? "var(--c-ink)" : "var(--c-muted)", fontWeight: isLast ? "var(--fw-medium)" : "var(--fw-regular)" }}>
                {it.label}
              </span>
          }
          </li>);

    })}
    </ol>
  </nav>;


// ════════════════════════════════════════════════════════════════════════════
// Stepper — works on light surface, sunken bg, or dark/primary background.
// Pass tone="onLight" (default) or tone="onDark" to flip the palette.
// ════════════════════════════════════════════════════════════════════════════
const Stepper = ({ steps, currentIndex, variant = "horizontal", tone = "onLight", style }) => {
  const stateOf = (i) => i < currentIndex ? "completed" : i === currentIndex ? "current" : "todo";
  const isHorizontal = variant !== "vertical";
  const onDark = tone === "onDark";

  // Token-driven palette so it adapts to light/dark theme automatically
  const palette = onDark ? {
    todoText: "rgba(255,255,255,.55)",
    activeText: "var(--p-neutral-0)",
    completedText: "var(--p-neutral-0)",
    completedBg: "var(--p-neutral-0)",
    completedFg: "var(--c-primary)",
    currentBorder: "var(--p-neutral-0)",
    todoBorder: "rgba(255,255,255,.30)",
    lineDone: "rgba(255,255,255,.55)",
    lineTodo: "rgba(255,255,255,.18)",
    numberFg: "var(--p-neutral-0)"
  } : {
    todoText: "var(--c-muted)",
    activeText: "var(--c-ink)",
    completedText: "var(--c-ink-2)",
    completedBg: "var(--c-accent)",
    completedFg: "var(--c-on-accent)",
    currentBorder: "var(--c-accent)",
    todoBorder: "var(--c-border-strong)",
    lineDone: "var(--c-accent)",
    lineTodo: "var(--c-border)",
    numberFg: "var(--c-muted)"
  };

  return (
    <div role="list" aria-label="Progress"
    style={{
      display: "flex", flexDirection: isHorizontal ? "row" : "column",
      gap: 0, alignItems: isHorizontal ? "center" : "stretch",
      ...style
    }}>
      {steps.map((s, i) => {
        const state = stateOf(i);
        const isLast = i === steps.length - 1;
        const textColor =
        state === "todo" ? palette.todoText :
        state === "current" ? palette.activeText :
        palette.completedText;
        return (
          <React.Fragment key={s.id}>
            <span role="listitem"
            aria-current={state === "current" ? "step" : undefined}
            style={{
              display: "inline-flex", alignItems: "center", gap: "var(--s-2)",
              color: textColor,
              fontSize: "var(--fs-body)", fontWeight: state === "current" ? "var(--fw-semibold)" : "var(--fw-medium)", letterSpacing: "var(--tr-body)",
              whiteSpace: "nowrap", flexShrink: 0, margin: "0px"
            }}>
              <span aria-hidden="true" style={{
                width: 22, height: 22, borderRadius: "var(--r-pill)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: state === "completed" ? palette.completedBg :
                state === "current" ? onDark ? "transparent" : "var(--c-accent-soft)" :
                "transparent",
                border: state === "completed" ? "0" :
                `1.5px solid ${state === "current" ? palette.currentBorder : palette.todoBorder}`,
                fontSize: "var(--fs-small)", fontWeight: "var(--fw-semibold)",
                color: state === "current" ? onDark ? palette.numberFg : "var(--c-accent)" : palette.numberFg,
                lineHeight: 1
              }}>
                {state === "completed" ?
                <Icon name="check" size={12} stroke={2.8} color={palette.completedFg} /> :
                i + 1}
              </span>
              <span>{s.label}</span>
              {state === "completed" && <span className="sr-only"> (completed)</span>}
            </span>
            {!isLast && isHorizontal &&
            <span aria-hidden="true" style={{
              flex: 1, minWidth: 48, height: 1, margin: "0 24px",
              background: i < currentIndex ? palette.lineDone : palette.lineTodo
            }} />
            }
          </React.Fragment>);

      })}
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// CodeInput (OTP)
// ════════════════════════════════════════════════════════════════════════════
const CodeInput = ({ length = 6, value = "", onChange, error, style, ariaLabel = "Verification code" }) => {
  const refs = React.useRef([]);
  const chars = value.split("").concat(Array(length).fill("")).slice(0, length);
  const setAt = (i, ch) => {
    const next = chars.slice();
    next[i] = ch;
    onChange?.(next.join(""));
  };
  return (
    <div role="group" aria-label={ariaLabel} style={{ display: "flex", gap: "var(--s-2)", ...style }}>
      {chars.map((c, i) =>
      <input
        key={i}
        ref={(el) => refs.current[i] = el}
        value={c}
        maxLength={1}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={`Digit ${i + 1} of ${length}`}
        aria-invalid={!!error || undefined}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(-1);
          setAt(i, v);
          if (v && refs.current[i + 1]) refs.current[i + 1].focus();
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && !c && refs.current[i - 1]) {
            refs.current[i - 1].focus();
          } else if (e.key === "ArrowLeft" && refs.current[i - 1]) {
            refs.current[i - 1].focus();
          } else if (e.key === "ArrowRight" && refs.current[i + 1]) {
            refs.current[i + 1].focus();
          }
        }}
        style={{
          width: 56, height: 64, textAlign: "center",
          fontSize: 24, fontWeight: "var(--fw-semibold)", letterSpacing: 0,
          color: "var(--c-ink)",
          background: error ? "var(--c-danger-soft)" : "var(--c-surface)",
          border: `1px solid ${error ? "var(--c-danger)" : "var(--c-border)"}`,
          borderRadius: "var(--r-md)", outline: "none",
          transition: "border-color var(--motion-base), box-shadow var(--motion-base)"
        }}
        onFocus={(e) => {
          e.target.style.borderColor = error ? "var(--c-danger)" : "var(--c-accent)";
          e.target.style.boxShadow = error ? "var(--sh-focus-danger)" : "var(--sh-focus)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? "var(--c-danger)" : "var(--c-border)";
          e.target.style.boxShadow = "none";
        }} />

      )}
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// FileUploadRow
// ════════════════════════════════════════════════════════════════════════════
const FileUploadRow = ({
  title, hint, optional, state = "idle", filename, fileSize,
  onUpload, onReplace, errorMessage, style
}) => {
  const tones = {
    idle: { bd: "var(--c-border)", bg: "var(--c-surface)", icBg: "var(--c-accent-soft)", icFg: "var(--c-primary)", style: "dashed" },
    uploaded: { bd: "var(--c-success)", bg: "var(--c-success-soft)", icBg: "var(--c-success-soft)", icFg: "var(--c-success)", style: "solid" },
    error: { bd: "var(--c-danger)", bg: "var(--c-danger-soft)", icBg: "var(--c-danger-soft)", icFg: "var(--c-danger)", style: "solid" }
  };
  const t = tones[state];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--s-3)",
      padding: "14px 16px",
      background: t.bg,
      border: `1px ${t.style} ${t.bd}`,
      borderRadius: "var(--r-md)",
      ...style
    }}>
      <span aria-hidden="true" style={{
        width: 40, height: 40, borderRadius: "var(--r-sm)",
        background: t.icBg, color: t.icFg,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flex: "0 0 40px"
      }}>
        <Icon
          name={state === "uploaded" ? "check" : state === "error" ? "alert" : "fileText"}
          size={18}
          stroke={state === "uploaded" ? 2.4 : 1.6} />
        
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--fs-body)", fontWeight: "var(--fw-semibold)", color: "var(--c-ink)" }}>
          {title}
          {optional &&
          <span style={{ color: "var(--c-muted)", fontWeight: "var(--fw-regular)", fontSize: "var(--fs-small)", marginLeft: 6 }}>
              Optional
            </span>
          }
        </div>
        <div style={{ fontSize: "var(--fs-small)", color: "var(--c-muted)", marginTop: 2 }}>
          {state === "uploaded" && filename ? `${filename}${fileSize ? " · " + fileSize : ""}` :
          state === "error" ? errorMessage || "Upload failed" :
          hint}
        </div>
      </div>
      {state === "uploaded" ?
      <button
        type="button"
        onClick={onReplace}
        style={{
          background: "transparent", border: 0,
          fontSize: 13, fontWeight: "var(--fw-semibold)", color: "var(--c-muted)",
          padding: "6px 10px", borderRadius: "var(--r-sm)", cursor: "pointer"
        }}>
        Replace</button> :

      <button
        type="button"
        onClick={onUpload}
        style={{
          background: "transparent", border: 0,
          fontSize: 13, fontWeight: "var(--fw-semibold)",
          color: state === "error" ? "var(--c-danger)" : "var(--c-accent)",
          padding: "6px 10px", borderRadius: "var(--r-sm)", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 4
        }}>
        
          <Icon name="upload" size={14} aria-hidden="true" />
          {state === "error" ? "Re-upload" : "Upload PDF"}
        </button>
      }
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// PersonRow
// ════════════════════════════════════════════════════════════════════════════
const PersonRow = ({ name, role, status, statusTone = "neutral", onEdit, style }) =>
<div style={{
  display: "flex", alignItems: "center", gap: "var(--s-3)",
  padding: 16, background: "var(--c-surface)",
  border: "1px solid var(--c-border)", borderRadius: "var(--r-md)",
  ...style
}}>
    <Avatar name={name} size={40} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: "var(--fs-body)", fontWeight: "var(--fw-semibold)", color: "var(--c-ink)" }}>{name}</div>
      {role && <div style={{ fontSize: "var(--fs-small)", color: "var(--c-muted)", marginTop: 2 }}>{role}</div>}
    </div>
    {status && <Tag tone={statusTone} size="sm" icon={statusTone === "green" ? "check" : null}>{status}</Tag>}
    {onEdit && <IconButton icon="pencil" size="sm" onClick={onEdit} title={`Edit ${name}`} />}
  </div>;


// ════════════════════════════════════════════════════════════════════════════
// SelectableListItem
// ════════════════════════════════════════════════════════════════════════════
const SelectableListItem = ({
  selected, onClick, leading, title, meta, disabled, style
}) => {
  const onKey = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {e.preventDefault();onClick?.();}
  };
  return (
    <div
      role="option"
      aria-selected={!!selected}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={onKey}
      style={{
        display: "flex", alignItems: "center", gap: "var(--s-3)",
        height: 56, padding: "0 16px",
        background: disabled ? "var(--c-disabled-bg)" : selected ? "var(--c-accent-soft)" : "var(--c-surface)",
        border: `1px solid ${selected ? "var(--c-primary)" : "var(--c-border)"}`,
        borderRadius: "var(--r-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "border-color var(--motion-fast), background var(--motion-fast)",
        ...style
      }}
      onMouseEnter={(e) => {if (!selected && !disabled) e.currentTarget.style.borderColor = "var(--c-muted-2)";}}
      onMouseLeave={(e) => {if (!selected) e.currentTarget.style.borderColor = "var(--c-border)";}}>
      
      {leading && <span aria-hidden="true" style={{ filter: disabled ? "grayscale(1)" : "none", display: "inline-flex" }}>{leading}</span>}
      <span style={{
        flex: 1, fontSize: "var(--fs-body)", fontWeight: "var(--fw-medium)",
        color: disabled ? "var(--c-muted)" : "var(--c-ink)",
        minWidth: 0, textDecoration: disabled ? "line-through" : "none"
      }}>{title}</span>
      {meta && <span style={{ fontSize: "var(--fs-small)", color: "var(--c-muted)" }}>{meta}</span>}
      <span aria-hidden="true" style={{
        width: 20, height: 20, borderRadius: "var(--r-pill)",
        border: `1.5px solid ${selected ? "var(--c-primary)" : "var(--c-border)"}`,
        background: selected ? "var(--c-primary)" : "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "var(--c-on-primary)"
      }}>
        {selected && <Icon name="check" size={12} stroke={2.4} />}
      </span>
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// Timeline
// ════════════════════════════════════════════════════════════════════════════
const Timeline = ({ children, style }) =>
<div role="list" style={{ display: "flex", flexDirection: "column", ...style }}>{children}</div>;


const TimelineStep = ({ state = "todo", title, isLast, children, style }) => {
  const dotBg = state === "done" ? "var(--c-success)" : "var(--c-surface)";
  const dotBd = state === "done" ? "var(--c-success)" : state === "current" ? "var(--c-primary)" : "var(--c-border)";
  const lineBg = state === "done" ? "var(--c-success)" :
  state === "current" ? "linear-gradient(to bottom, var(--c-primary) 0%, var(--c-border) 100%)" :
  "var(--c-border)";
  return (
    <div role="listitem" aria-current={state === "current" ? "step" : undefined}
    style={{ display: "flex", gap: "var(--s-3)", position: "relative", paddingBottom: isLast ? 0 : 24, ...style }}>
      {!isLast &&
      <span aria-hidden="true" style={{
        position: "absolute", left: 11, top: 24, bottom: 0,
        width: 1.5, background: lineBg
      }} />
      }
      <span aria-hidden="true" style={{
        flex: "0 0 24px", width: 24, height: 24, borderRadius: "var(--r-pill)",
        background: dotBg, border: `1.5px solid ${dotBd}`,
        color: state === "done" ? "var(--c-on-success)" : state === "current" ? "var(--c-primary)" : "var(--c-muted-2)",
        display: "inline-flex", alignItems: "center", justifyContent: "center", zIndex: 1
      }}>
        {state === "done" && <Icon name="check" size={12} stroke={2.4} color="currentColor" />}
        {state === "current" && <span style={{ width: 8, height: 8, borderRadius: "var(--r-pill)", background: "currentColor" }} />}
      </span>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{ fontSize: "var(--fs-body)", fontWeight: "var(--fw-semibold)", color: "var(--c-ink)", marginBottom: 4 }}>{title}</div>
        {children && <div style={{ fontSize: 13, color: "var(--c-muted)", lineHeight: "18px" }}>{children}</div>}
      </div>
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// ApplicationCard
// ════════════════════════════════════════════════════════════════════════════
const ApplicationCard = ({
  state = "review", title, meta, action, icon, onClick, style
}) => {
  const tones = {
    review: { bg: "var(--c-accent-soft)", fg: "var(--c-accent)", icon: "clock", action: "View status" },
    draft: { bg: "var(--c-warning-soft)", fg: "var(--c-warning)", icon: "pencil", action: "Continue" },
    rejected: { bg: "var(--c-danger-soft)", fg: "var(--c-danger)", icon: "x_circle", action: "View reason" },
    new: { bg: "var(--c-accent-soft)", fg: "var(--c-primary)", icon: "plus", action: null }
  };
  const t = tones[state];
  const [hover, setHover] = React.useState(false);
  const onKey = (e) => {if (e.key === "Enter" || e.key === " ") {e.preventDefault();onClick?.(e);}};
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKey}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: "var(--s-3)",
        padding: 16, background: "var(--c-surface)",
        border: `1px ${state === "new" ? "dashed" : "solid"} ${hover ? "var(--c-muted-2)" : "var(--c-border)"}`,
        borderRadius: 14, cursor: "pointer",
        transition: "border-color var(--motion-base), background var(--motion-base)",
        ...style
      }}>
      
      <span aria-hidden="true" style={{
        width: 40, height: 40, borderRadius: "var(--r-md)",
        background: t.bg, color: t.fg,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flex: "0 0 40px"
      }}>
        <Icon name={icon || t.icon} size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--fs-body)", fontWeight: "var(--fw-semibold)", color: "var(--c-ink)" }}>{title}</div>
        {meta && <div style={{ fontSize: "var(--fs-small)", color: "var(--c-muted)", marginTop: 2 }}>{meta}</div>}
      </div>
      {(action || t.action) &&
      <span style={{ fontSize: 13, fontWeight: "var(--fw-semibold)", color: state === "rejected" ? "var(--c-danger)" : "var(--c-accent)" }}>
          {action || t.action}
        </span>
      }
    </div>);

};

// ════════════════════════════════════════════════════════════════════════════
// ReviewSection
// ════════════════════════════════════════════════════════════════════════════
const ReviewSection = ({
  title, onEdit, error, errorIssues = [], errorCta = "Review details", onErrorCta, children, style
}) =>
<div style={{
  background: error ? "var(--c-warning-soft)" : "var(--c-surface)",
  border: `1px solid ${error ? "transparent" : "var(--c-border)"}`,
  borderRadius: "var(--r-lg)", padding: "16px 20px",
  ...style
}}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--s-3)", marginBottom: "var(--s-3)" }}>
      <div style={{ fontSize: "var(--fs-body)", fontWeight: "var(--fw-semibold)", color: "var(--c-ink)", letterSpacing: "var(--tr-body)" }}>{title}</div>
      {onEdit && <IconButton icon="pencil" size="sm" variant="ghost" onClick={onEdit} title={`Edit ${title}`} aria-label={`Edit ${title}`} />}
    </div>
    {error ?
  <>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
          {errorIssues.map((iss, i) =>
      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: "var(--fs-small)", color: "var(--c-muted)" }}>{iss.label}</span>
              <span style={{ fontSize: "var(--fs-body)", color: "var(--c-danger)", fontWeight: "var(--fw-medium)" }}>
                {iss.message || "There's an issue with this section"}
              </span>
            </div>
      )}
        </div>
        <div style={{ marginTop: "var(--s-3)" }}>
          <Button variant="primary" onClick={onErrorCta || onEdit}>{errorCta}</Button>
        </div>
      </> :
  children}
  </div>;


const ReviewRow = ({ k, v, error, style }) =>
<div style={{ display: "flex", flexDirection: "column", gap: 2, ...style }}>
    <span style={{ fontSize: "var(--fs-small)", color: "var(--c-muted)" }}>{k}</span>
    <span style={{
    fontSize: "var(--fs-body)", fontWeight: "var(--fw-medium)",
    color: error ? "var(--c-danger)" : "var(--c-ink)",
    display: "flex", alignItems: "center", gap: "var(--s-2)"
  }}>{v}</span>
  </div>;


// Export
Object.assign(window, {
  Button, IconButton, Spinner, Input, Tag, Badge, Avatar,
  Toggle, Checkbox, Radio, Tabs, Segmented, Card, Alert, Modal,
  Progress, Select, Tooltip, Breadcrumb,
  Stepper, CodeInput, FileUploadRow, PersonRow, SelectableListItem,
  Timeline, TimelineStep, ApplicationCard, ReviewSection, ReviewRow
});