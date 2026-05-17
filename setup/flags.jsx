// flags.jsx — circular SVG flag icons. Default size 20px.
// Inspired by Altery Figma library (Country=* components).

const FLAG_GB = (
  <>
    <defs>
      <clipPath id="flag-gb-clip"><circle cx="20" cy="20" r="20"/></clipPath>
    </defs>
    <g clipPath="url(#flag-gb-clip)">
      <rect width="40" height="40" fill="#012169"/>
      {/* Diagonals (white) */}
      <path d="M0 0 L40 40 M40 0 L0 40" stroke="#fff" strokeWidth="8"/>
      {/* Diagonals (red, offset) */}
      <path d="M0 0 L40 40" stroke="#C8102E" strokeWidth="3.2"/>
      <path d="M40 0 L0 40" stroke="#C8102E" strokeWidth="3.2"/>
      {/* Cross (white) */}
      <rect x="16" y="0" width="8" height="40" fill="#fff"/>
      <rect x="0" y="16" width="40" height="8" fill="#fff"/>
      {/* Cross (red) */}
      <rect x="17.6" y="0" width="4.8" height="40" fill="#C8102E"/>
      <rect x="0" y="17.6" width="40" height="4.8" fill="#C8102E"/>
    </g>
  </>
);

const FLAG_US = (
  <>
    <defs>
      <clipPath id="flag-us-clip"><circle cx="20" cy="20" r="20"/></clipPath>
    </defs>
    <g clipPath="url(#flag-us-clip)">
      <rect width="40" height="40" fill="#fff"/>
      {/* 7 red stripes */}
      {[0,2,4,6,8,10,12].map(i => (
        <rect key={i} x="0" y={i * (40/13)} width="40" height={40/13} fill="#B22234"/>
      ))}
      {/* Canton (blue) */}
      <rect x="0" y="0" width="18" height={40*7/13} fill="#3C3B6E"/>
      {/* Simplified stars — 9 small white circles in a grid */}
      {Array.from({length: 3}).map((_, row) =>
        Array.from({length: 4}).map((__, col) => (
          <circle key={`${row}-${col}`} cx={2.5 + col*4.2} cy={2.5 + row*4.8} r="0.9" fill="#fff"/>
        ))
      )}
    </g>
  </>
);

const FLAG_EU = (
  <>
    <defs>
      <clipPath id="flag-eu-clip"><circle cx="20" cy="20" r="20"/></clipPath>
    </defs>
    <g clipPath="url(#flag-eu-clip)">
      <rect width="40" height="40" fill="#003399"/>
      {/* 12 stars in a circle */}
      {Array.from({length: 12}).map((_, i) => {
        const angle = (i * 30 - 90) * Math.PI / 180;
        const cx = 20 + Math.cos(angle) * 11;
        const cy = 20 + Math.sin(angle) * 11;
        return <circle key={i} cx={cx} cy={cy} r="1.6" fill="#FFCC00"/>;
      })}
    </g>
  </>
);

const FLAG_DE = (
  <>
    <defs>
      <clipPath id="flag-de-clip"><circle cx="20" cy="20" r="20"/></clipPath>
    </defs>
    <g clipPath="url(#flag-de-clip)">
      <rect width="40" height="13.33" y="0" fill="#000"/>
      <rect width="40" height="13.33" y="13.33" fill="#DD0000"/>
      <rect width="40" height="13.34" y="26.66" fill="#FFCE00"/>
    </g>
  </>
);

const FLAG_SG = (
  <>
    <defs>
      <clipPath id="flag-sg-clip"><circle cx="20" cy="20" r="20"/></clipPath>
    </defs>
    <g clipPath="url(#flag-sg-clip)">
      <rect width="40" height="20" fill="#ED2939"/>
      <rect width="40" height="20" y="20" fill="#fff"/>
      <circle cx="11" cy="10" r="5" fill="#fff"/>
      <circle cx="12.8" cy="10" r="5" fill="#ED2939"/>
      {Array.from({length: 5}).map((_, i) => {
        const angle = (i * 72 - 90) * Math.PI / 180;
        const cx = 14.5 + Math.cos(angle) * 2.2;
        const cy = 10 + Math.sin(angle) * 2.2;
        return <circle key={i} cx={cx} cy={cy} r="0.8" fill="#fff"/>;
      })}
    </g>
  </>
);

const FLAGS = {
  GBP: FLAG_GB,
  GB: FLAG_GB,
  USD: FLAG_US,
  US: FLAG_US,
  EUR: FLAG_EU,
  EU: FLAG_EU,
  DE: FLAG_DE,
  SG: FLAG_SG,
};

// Available SVG files in assets/flags/ — each is a 40×40 circular flag
const FLAG_FILES = new Set([
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX",
  "AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ",
  "BR","BS","BT","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL",
  "CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO",
  "DZ","EC","EE","EG","EH","ER","ES","ET","EU","FI","FJ","FK","FM","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS",
  "GT","GU","GW","GY","HK","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO",
  "IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP",
  "KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR",
  "MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL",
  "NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN",
  "PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD",
  "SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX",
  "SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT",
  "TV","TW","TZ","UA","UG","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU",
  "WF","WS","YE","YT","ZA","ZM","ZW",
]);

// Currency → country mapping for places where we render fiat flags
const CURRENCY_TO_COUNTRY = {
  GBP: "GB", USD: "US", EUR: "EU", AUD: "AU", CAD: "CA", CHF: "CH",
  CNY: "CN", DKK: "DK", HKD: "HK", IDR: "ID", INR: "IN", JPY: "JP",
  KRW: "KR", MXN: "MX", MYR: "MY", NOK: "NO", NZD: "NZ", PHP: "PH",
  PLN: "PL", RUB: "RU", SAR: "SA", SEK: "SE", SGD: "SG", THB: "TH",
  TRY: "TR", UAH: "UA", VND: "VN", ZAR: "ZA",
};

const Flag = ({ code, size = 20, style }) => {
  if (!code) return null;
  const upper = String(code).toUpperCase();
  const country = CURRENCY_TO_COUNTRY[upper] || upper;

  // Prefer real SVG asset
  if (FLAG_FILES.has(country)) {
    // In bundled/standalone builds the real path is replaced by a Blob URL
    // exposed via window.__resources["flag_XX"]; fall back to the relative
    // path in normal dev mode.
    const src = (window.__resources && window.__resources[`flag_${country}`])
      || `assets/flags/${country}.svg`;
    return (
      <img
        src={src}
        width={size} height={size}
        alt=""
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: size, height: size,
          borderRadius: "50%",
          display: "inline-block",
          verticalAlign: "middle",
          objectFit: "cover",
          ...style,
        }}
      />
    );
  }

  // Fallback to hand-rolled SVG (kept for currencies that map to a flag we
  // already inlined, e.g. EUR/USD/GBP — rare; the asset path above covers them)
  const legacy = FLAGS[upper] || FLAGS[country];
  if (legacy) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        style={{ flex: "0 0 auto", borderRadius: "50%", ...style }}
        aria-hidden="true"
      >
        {legacy}
      </svg>
    );
  }

  // Unknown code → 2-letter badge disc. Deterministic color from code so
  // adjacent countries don't collide. Keeps layout stable AND legible without
  // shipping a real flag SVG for every ISO code.
  const seed = (country.charCodeAt(0) * 31 + (country.charCodeAt(1) || 0)) % 360;
  const bg = `hsl(${seed} 32% 88%)`;
  const fg = `hsl(${seed} 38% 28%)`;
  return (
    <span
      aria-hidden="true"
      style={{
        flex: "0 0 auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size, height: size,
        borderRadius: "50%",
        background: bg,
        color: fg,
        fontSize: Math.max(8, Math.round(size * 0.42)),
        fontWeight: 700,
        letterSpacing: "0.02em",
        fontFamily: "var(--ff-sans, Inter, system-ui, sans-serif)",
        lineHeight: 1,
        userSelect: "none",
        ...style,
      }}
    >
      {country.slice(0, 2)}
    </span>
  );
};

Object.assign(window, { Flag });
