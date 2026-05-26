// checker-data.js — Eligibility-checker data constants
//
// Pure data, no JSX. Loaded as a classic <script> in index.html before the
// inline text/babel block that defines screens & helpers. Exports everything
// to window via Object.assign at the bottom so the inline block (and any
// future extracted helpers/screens) can read these via the standard scope
// chain (e.g. `EC_COUNTRIES` resolves to `window.EC_COUNTRIES`).

const EC_COUNTRIES = [
  // ISO 3166-1 alpha-2: UN member states + observers + dependent
  // territories. `region` routes the application to Altery's regulated
  // entity: "uk" → Altery UK (FCA), "eu" → Altery EU (CBC),
  // "mena" → Altery MENA (DFSA), "row" → fallback to Altery UK.
  { code: "AF", name: "Afghanistan", region: "row", risk: "blocked" },
  { code: "AX", name: "Aland Islands", region: "row" },
  { code: "AL", name: "Albania", region: "row" },
  { code: "DZ", name: "Algeria", region: "row" },
  { code: "AS", name: "American Samoa", region: "row" },
  { code: "AD", name: "Andorra", region: "row" },
  { code: "AO", name: "Angola", region: "row" },
  { code: "AI", name: "Anguilla", region: "row" },
  { code: "AQ", name: "Antarctica", region: "row" },
  { code: "AG", name: "Antigua and Barbuda", region: "row" },
  { code: "AR", name: "Argentina", region: "row" },
  { code: "AM", name: "Armenia", region: "row" },
  { code: "AW", name: "Aruba", region: "row" },
  { code: "AU", name: "Australia", region: "row" },
  { code: "AT", name: "Austria", region: "eu" },
  { code: "AZ", name: "Azerbaijan", region: "row" },
  { code: "BS", name: "Bahamas", region: "row" },
  { code: "BH", name: "Bahrain", region: "row" },
  { code: "BD", name: "Bangladesh", region: "row" },
  { code: "BB", name: "Barbados", region: "row" },
  { code: "BY", name: "Belarus", region: "row", risk: "blocked" },
  { code: "BE", name: "Belgium", region: "eu" },
  { code: "BZ", name: "Belize", region: "row" },
  { code: "BJ", name: "Benin", region: "row" },
  { code: "BM", name: "Bermuda", region: "row" },
  { code: "BT", name: "Bhutan", region: "row" },
  { code: "BO", name: "Bolivia", region: "row" },
  { code: "BQ", name: "Bonaire, Sint Eustatius and Saba", region: "row" },
  { code: "BA", name: "Bosnia and Herzegovina", region: "row" },
  { code: "BW", name: "Botswana", region: "row" },
  { code: "BV", name: "Bouvet Island", region: "row" },
  { code: "BR", name: "Brazil", region: "row" },
  { code: "IO", name: "British Indian Ocean Territory", region: "row" },
  { code: "BN", name: "Brunei Darussalam", region: "row" },
  { code: "BG", name: "Bulgaria", region: "eu" },
  { code: "BF", name: "Burkina Faso", region: "row" },
  { code: "BI", name: "Burundi", region: "row" },
  { code: "CV", name: "Cabo Verde", region: "row" },
  { code: "KH", name: "Cambodia", region: "row" },
  { code: "CM", name: "Cameroon", region: "row" },
  { code: "CA", name: "Canada", region: "row" },
  { code: "KY", name: "Cayman Islands", region: "row" },
  { code: "CF", name: "Central African Republic", region: "row" },
  { code: "TD", name: "Chad", region: "row" },
  { code: "CL", name: "Chile", region: "row" },
  { code: "CN", name: "China", region: "row" },
  { code: "CX", name: "Christmas Island", region: "row" },
  { code: "CC", name: "Cocos (Keeling) Islands", region: "row" },
  { code: "CO", name: "Colombia", region: "row" },
  { code: "KM", name: "Comoros", region: "row" },
  { code: "CG", name: "Congo", region: "row" },
  { code: "CD", name: "Congo, Democratic Republic of the", region: "row" },
  { code: "CK", name: "Cook Islands", region: "row" },
  { code: "CR", name: "Costa Rica", region: "row" },
  { code: "CI", name: "Cote d'Ivoire", region: "row" },
  { code: "HR", name: "Croatia", region: "eu" },
  { code: "CU", name: "Cuba", region: "row", risk: "blocked" },
  { code: "CW", name: "Curacao", region: "row" },
  { code: "CY", name: "Cyprus", region: "eu" },
  { code: "CZ", name: "Czechia", region: "eu" },
  { code: "DK", name: "Denmark", region: "eu" },
  { code: "DJ", name: "Djibouti", region: "row" },
  { code: "DM", name: "Dominica", region: "row" },
  { code: "DO", name: "Dominican Republic", region: "row" },
  { code: "EC", name: "Ecuador", region: "row" },
  { code: "EG", name: "Egypt", region: "row" },
  { code: "SV", name: "El Salvador", region: "row" },
  { code: "GQ", name: "Equatorial Guinea", region: "row" },
  { code: "ER", name: "Eritrea", region: "row" },
  { code: "EE", name: "Estonia", region: "eu" },
  { code: "SZ", name: "Eswatini", region: "row" },
  { code: "ET", name: "Ethiopia", region: "row" },
  { code: "FK", name: "Falkland Islands (Malvinas)", region: "row" },
  { code: "FO", name: "Faroe Islands", region: "row" },
  { code: "FJ", name: "Fiji", region: "row" },
  { code: "FI", name: "Finland", region: "eu" },
  { code: "FR", name: "France", region: "eu" },
  { code: "GF", name: "French Guiana", region: "row" },
  { code: "PF", name: "French Polynesia", region: "row" },
  { code: "TF", name: "French Southern Territories", region: "row" },
  { code: "GA", name: "Gabon", region: "row" },
  { code: "GM", name: "Gambia", region: "row" },
  { code: "GE", name: "Georgia", region: "row" },
  { code: "DE", name: "Germany", region: "eu" },
  { code: "GH", name: "Ghana", region: "row" },
  { code: "GI", name: "Gibraltar", region: "row" },
  { code: "GR", name: "Greece", region: "eu" },
  { code: "GL", name: "Greenland", region: "row" },
  { code: "GD", name: "Grenada", region: "row" },
  { code: "GP", name: "Guadeloupe", region: "row" },
  { code: "GU", name: "Guam", region: "row" },
  { code: "GT", name: "Guatemala", region: "row" },
  { code: "GG", name: "Guernsey", region: "row" },
  { code: "GN", name: "Guinea", region: "row" },
  { code: "GW", name: "Guinea-Bissau", region: "row" },
  { code: "GY", name: "Guyana", region: "row" },
  { code: "HT", name: "Haiti", region: "row" },
  { code: "HM", name: "Heard Island and McDonald Islands", region: "row" },
  { code: "VA", name: "Holy See", region: "row" },
  { code: "HN", name: "Honduras", region: "row" },
  { code: "HK", name: "Hong Kong", region: "row" },
  { code: "HU", name: "Hungary", region: "eu" },
  { code: "IS", name: "Iceland", region: "eu" },
  { code: "IN", name: "India", region: "row" },
  { code: "ID", name: "Indonesia", region: "row" },
  { code: "IR", name: "Iran", region: "row", risk: "blocked" },
  { code: "IQ", name: "Iraq", region: "row" },
  { code: "IE", name: "Ireland", region: "eu" },
  { code: "IM", name: "Isle of Man", region: "row" },
  { code: "IL", name: "Israel", region: "row" },
  { code: "IT", name: "Italy", region: "eu" },
  { code: "JM", name: "Jamaica", region: "row" },
  { code: "JP", name: "Japan", region: "row" },
  { code: "JE", name: "Jersey", region: "row" },
  { code: "JO", name: "Jordan", region: "row" },
  { code: "KZ", name: "Kazakhstan", region: "row" },
  { code: "KE", name: "Kenya", region: "row" },
  { code: "KI", name: "Kiribati", region: "row" },
  { code: "KP", name: "Korea, Democratic People's Republic of", region: "row", risk: "blocked" },
  { code: "KR", name: "Korea, Republic of", region: "row" },
  { code: "KW", name: "Kuwait", region: "row" },
  { code: "KG", name: "Kyrgyzstan", region: "row" },
  { code: "LA", name: "Lao People's Democratic Republic", region: "row" },
  { code: "LV", name: "Latvia", region: "eu" },
  { code: "LB", name: "Lebanon", region: "row" },
  { code: "LS", name: "Lesotho", region: "row" },
  { code: "LR", name: "Liberia", region: "row" },
  { code: "LY", name: "Libya", region: "row" },
  { code: "LI", name: "Liechtenstein", region: "eu" },
  { code: "LT", name: "Lithuania", region: "eu" },
  { code: "LU", name: "Luxembourg", region: "eu" },
  { code: "MO", name: "Macao", region: "row" },
  { code: "MG", name: "Madagascar", region: "row" },
  { code: "MW", name: "Malawi", region: "row" },
  { code: "MY", name: "Malaysia", region: "row" },
  { code: "MV", name: "Maldives", region: "row" },
  { code: "ML", name: "Mali", region: "row" },
  { code: "MT", name: "Malta", region: "eu" },
  { code: "MH", name: "Marshall Islands", region: "row" },
  { code: "MQ", name: "Martinique", region: "row" },
  { code: "MR", name: "Mauritania", region: "row" },
  { code: "MU", name: "Mauritius", region: "row" },
  { code: "YT", name: "Mayotte", region: "row" },
  { code: "MX", name: "Mexico", region: "row" },
  { code: "FM", name: "Micronesia", region: "row" },
  { code: "MD", name: "Moldova", region: "row" },
  { code: "MC", name: "Monaco", region: "row" },
  { code: "MN", name: "Mongolia", region: "row" },
  { code: "ME", name: "Montenegro", region: "row" },
  { code: "MS", name: "Montserrat", region: "row" },
  { code: "MA", name: "Morocco", region: "row" },
  { code: "MZ", name: "Mozambique", region: "row" },
  { code: "MM", name: "Myanmar", region: "row", risk: "blocked" },
  { code: "NA", name: "Namibia", region: "row" },
  { code: "NR", name: "Nauru", region: "row" },
  { code: "NP", name: "Nepal", region: "row" },
  { code: "NL", name: "Netherlands", region: "eu" },
  { code: "NC", name: "New Caledonia", region: "row" },
  { code: "NZ", name: "New Zealand", region: "row" },
  { code: "NI", name: "Nicaragua", region: "row" },
  { code: "NE", name: "Niger", region: "row" },
  { code: "NG", name: "Nigeria", region: "row" },
  { code: "NU", name: "Niue", region: "row" },
  { code: "NF", name: "Norfolk Island", region: "row" },
  { code: "MK", name: "North Macedonia", region: "row" },
  { code: "MP", name: "Northern Mariana Islands", region: "row" },
  { code: "NO", name: "Norway", region: "eu" },
  { code: "OM", name: "Oman", region: "row" },
  { code: "PK", name: "Pakistan", region: "row" },
  { code: "PW", name: "Palau", region: "row" },
  { code: "PS", name: "Palestine, State of", region: "row" },
  { code: "PA", name: "Panama", region: "row" },
  { code: "PG", name: "Papua New Guinea", region: "row" },
  { code: "PY", name: "Paraguay", region: "row" },
  { code: "PE", name: "Peru", region: "row" },
  { code: "PH", name: "Philippines", region: "row" },
  { code: "PN", name: "Pitcairn", region: "row" },
  { code: "PL", name: "Poland", region: "eu" },
  { code: "PT", name: "Portugal", region: "eu" },
  { code: "PR", name: "Puerto Rico", region: "row" },
  { code: "QA", name: "Qatar", region: "row" },
  { code: "RE", name: "Reunion", region: "row" },
  { code: "RO", name: "Romania", region: "eu" },
  { code: "RU", name: "Russian Federation", region: "row", risk: "blocked" },
  { code: "RW", name: "Rwanda", region: "row" },
  { code: "BL", name: "Saint Barthelemy", region: "row" },
  { code: "SH", name: "Saint Helena, Ascension and Tristan da Cunha", region: "row" },
  { code: "KN", name: "Saint Kitts and Nevis", region: "row" },
  { code: "LC", name: "Saint Lucia", region: "row" },
  { code: "MF", name: "Saint Martin (French part)", region: "row" },
  { code: "PM", name: "Saint Pierre and Miquelon", region: "row" },
  { code: "VC", name: "Saint Vincent and the Grenadines", region: "row" },
  { code: "WS", name: "Samoa", region: "row" },
  { code: "SM", name: "San Marino", region: "row" },
  { code: "ST", name: "Sao Tome and Principe", region: "row" },
  { code: "SA", name: "Saudi Arabia", region: "mena" },
  { code: "SN", name: "Senegal", region: "row" },
  { code: "RS", name: "Serbia", region: "row" },
  { code: "SC", name: "Seychelles", region: "row" },
  { code: "SL", name: "Sierra Leone", region: "row" },
  { code: "SG", name: "Singapore", region: "row" },
  { code: "SX", name: "Sint Maarten (Dutch part)", region: "row" },
  { code: "SK", name: "Slovakia", region: "eu" },
  { code: "SI", name: "Slovenia", region: "eu" },
  { code: "SB", name: "Solomon Islands", region: "row" },
  { code: "SO", name: "Somalia", region: "row" },
  { code: "ZA", name: "South Africa", region: "row" },
  { code: "GS", name: "South Georgia and the South Sandwich Islands", region: "row" },
  { code: "SS", name: "South Sudan", region: "row" },
  { code: "ES", name: "Spain", region: "eu" },
  { code: "LK", name: "Sri Lanka", region: "row" },
  { code: "SD", name: "Sudan", region: "row", risk: "blocked" },
  { code: "SR", name: "Suriname", region: "row" },
  { code: "SJ", name: "Svalbard and Jan Mayen", region: "row" },
  { code: "SE", name: "Sweden", region: "eu" },
  { code: "CH", name: "Switzerland", region: "row" },
  { code: "SY", name: "Syrian Arab Republic", region: "row", risk: "blocked" },
  { code: "TW", name: "Taiwan", region: "row" },
  { code: "TJ", name: "Tajikistan", region: "row" },
  { code: "TZ", name: "Tanzania", region: "row" },
  { code: "TH", name: "Thailand", region: "row" },
  { code: "TL", name: "Timor-Leste", region: "row" },
  { code: "TG", name: "Togo", region: "row" },
  { code: "TK", name: "Tokelau", region: "row" },
  { code: "TO", name: "Tonga", region: "row" },
  { code: "TT", name: "Trinidad and Tobago", region: "row" },
  { code: "TN", name: "Tunisia", region: "row" },
  { code: "TR", name: "Turkiye", region: "row" },
  { code: "TM", name: "Turkmenistan", region: "row" },
  { code: "TC", name: "Turks and Caicos Islands", region: "row" },
  { code: "TV", name: "Tuvalu", region: "row" },
  { code: "UG", name: "Uganda", region: "row" },
  { code: "UA", name: "Ukraine", region: "row" },
  { code: "AE", name: "United Arab Emirates", region: "mena" },
  { code: "GB", name: "United Kingdom", region: "uk" },
  { code: "US", name: "United States", region: "row" },
  { code: "UM", name: "United States Minor Outlying Islands", region: "row" },
  { code: "UY", name: "Uruguay", region: "row" },
  { code: "UZ", name: "Uzbekistan", region: "row" },
  { code: "VU", name: "Vanuatu", region: "row" },
  { code: "VE", name: "Venezuela", region: "row" },
  { code: "VN", name: "Viet Nam", region: "row" },
  { code: "VG", name: "Virgin Islands, British", region: "row" },
  { code: "VI", name: "Virgin Islands, U.S.", region: "row" },
  { code: "WF", name: "Wallis and Futuna", region: "row" },
  { code: "EH", name: "Western Sahara", region: "row" },
  { code: "YE", name: "Yemen", region: "row" },
  { code: "ZM", name: "Zambia", region: "row" },
  { code: "ZW", name: "Zimbabwe", region: "row" },
];

// Q5 transactional corridors — country-level multi-select per direction.
// Grouped at display time into 4 buckets matching altery.com's public
// geographic taxonomy (Europe / Asia-Pacific & Middle East / Americas
// / Africa) so the picker doesn't dump 249 flat entries on the user.
//
// Per UN geoscheme; full ISO 3166-1 alpha-2 coverage. Antarctica /
// British Indian Ocean Territory bucketed into apac_me, US Minor
// Outlying Islands into americas — practical, not contentious.
const EC_DISPLAY_REGIONS = {
  europe: [
    "AD", "AL", "AT", "AX", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE",
    "DK", "EE", "ES", "FI", "FO", "FR", "GB", "GG", "GI", "GR", "HR", "HU",
    "IE", "IM", "IS", "IT", "JE", "LI", "LT", "LU", "LV", "MC", "MD", "ME",
    "MK", "MT", "NL", "NO", "PL", "PT", "RO", "RS", "RU", "SE", "SI", "SJ",
    "SK", "SM", "UA", "VA",
  ],
  apac_me: [
    "AE", "AF", "AM", "AQ", "AS", "AU", "AZ", "BD", "BH", "BN", "BT", "CC",
    "CK", "CN", "CX", "FJ", "FM", "GE", "GU", "HK", "HM", "ID", "IL", "IN",
    "IO", "IQ", "IR", "JO", "JP", "KG", "KH", "KI", "KP", "KR", "KW", "KZ",
    "LA", "LB", "LK", "MH", "MM", "MN", "MO", "MP", "MV", "MY", "NC", "NF",
    "NP", "NR", "NU", "NZ", "OM", "PF", "PG", "PH", "PK", "PN", "PS", "PW",
    "QA", "SA", "SB", "SG", "SY", "TH", "TJ", "TK", "TL", "TM", "TO", "TR",
    "TV", "TW", "UZ", "VN", "VU", "WF", "WS", "YE",
  ],
  americas: [
    "AG", "AI", "AR", "AW", "BB", "BL", "BM", "BO", "BQ", "BR", "BS", "BZ",
    "CA", "CL", "CO", "CR", "CU", "CW", "DM", "DO", "EC", "FK", "GD", "GF",
    "GL", "GP", "GS", "GT", "GY", "HN", "HT", "JM", "KN", "KY", "LC", "MF",
    "MQ", "MS", "MX", "NI", "PA", "PE", "PM", "PR", "PY", "SR", "SV", "SX",
    "TC", "TT", "UM", "US", "UY", "VC", "VE", "VG", "VI",
  ],
  africa: [
    "AO", "BF", "BI", "BJ", "BV", "BW", "CD", "CF", "CG", "CI", "CM", "CV",
    "DJ", "DZ", "EG", "EH", "ER", "ET", "GA", "GH", "GM", "GN", "GQ", "GW",
    "KE", "KM", "LR", "LS", "LY", "MA", "MG", "ML", "MR", "MU", "MW", "MZ",
    "NA", "NE", "NG", "RE", "RW", "SC", "SD", "SH", "SL", "SN", "SO", "SS",
    "ST", "SZ", "TD", "TF", "TG", "TN", "TZ", "UG", "YT", "ZA", "ZM", "ZW",
  ],
};

// Reverse lookup: ISO code → display region. Built once at load time.
const EC_COUNTRY_TO_REGION = (() => {
  const m = {};
  for (const [r, list] of Object.entries(EC_DISPLAY_REGIONS)) for (const c of list) m[c] = r;
  return m;
})();

// Display order for region sections inside the picker.
const EC_REGION_ORDER = ["europe", "apac_me", "americas", "africa"];

// ── Q2 industries ─────────────────────────────────────────────────
// Categories Altery actually serves per altery.com/business — plus
// explicit crypto sub-types (we onboard crypto-native businesses,
// that's a core value prop). Labels chosen to match how competitors
// and Altery itself frame these verticals publicly:
//   • "SaaS / AI / Software" — merged from separate ai + saas (most
//     AI startups self-describe as SaaS, so two options created
//     decision friction without information gain).
//   • "Marketing / Ad networks / Affiliate" — broadened from "media"
//     to capture affiliate-vertical explicitly (Payset, INXY and
//     Altery's own /business page all surface affiliate as a core
//     served niche).
//   • "Gaming / Game dev / Esports" — INXY top-tier category, also
//     on Altery's /business page under "Digital products" and
//     "Entertainment". Deliberately separate from gambling so users
//     don't conflate the two (a game-dev studio is not iGaming).
//   • "Crypto: mining / staking" — Altery's /business "Financial"
//     section explicitly lists "Cryptocurrency mining"; previous
//     six crypto sub-types missed it.
//   • "Gambling / Betting / iGaming" — added "iGaming" to the
//     blocked label so the contrast with served "Gaming" is sharp.
// Industry list — ICP-aligned flat taxonomy. Reverted from the brief
// two-level rebuild because the cascading category→subindustry UI was
// optimised for back-office CRA routing, not for the customer-facing
// "is this banking for someone like me?" question that drives the Q2
// drop-out rate. Digital-native segments lead (most common ICP), then
// adjacent verticals, then the blocked list at the end.
//
// `craKey` (optional, i18n root `ec.cra.*`) is the back-office
// Compliance/Risk Assessment category, threaded through the handoff
// payload so onboarding can route into the right KYB queue. Same
// concept that powered the rejected two-level model — we just keep
// the mapping flat instead of forcing the user to do the mapping work.
const EC_INDUSTRIES = [
  // ── Digital business segments — self-serve review path ────────────
  { value: "saas",       labelKey: "ec.ind.saas",       risk: "ok", reassureKey: "ec.q1.alert.saas", craKey: "ec.cra.it-dev" },
  { value: "apps",       labelKey: "ec.ind.apps",       risk: "ok", reassureKey: "ec.q1.alert.saas", craKey: "ec.cra.it-dev" },
  { value: "games",      labelKey: "ec.ind.games",      risk: "ok", reassureKey: "ec.q1.alert.saas", craKey: "ec.cra.it-dev" },
  { value: "edtech",     labelKey: "ec.ind.edtech",     risk: "ok", reassureKey: "ec.q1.alert.saas", craKey: "ec.cra.it-dev" },
  { value: "marketplace",labelKey: "ec.ind.marketplace",risk: "ok", reassureKey: "ec.q1.alert.marketplace", craKey: "ec.cra.ecom-marketplace" },
  { value: "ecom",       labelKey: "ec.ind.ecom",       risk: "ok", craKey: "ec.cra.online-shop" },
  // New row — covers digital-marketing agencies, SMM shops, SEO
  // boutiques, market-research firms. Old list folded these under
  // either `affiliate` (wrong — performance payouts ≠ marketing
  // agency) or `other` (no signal). Distinct row gives them a
  // first-class match and a clean CRA mapping.
  { value: "marketing",  labelKey: "ec.ind.marketing",  risk: "ok", craKey: "ec.cra.advertising" },
  // New row — freelance platforms (Upwork-like) and solo freelancers.
  // Doesn't fit `prof` (legal/accounting/healthcare) and doesn't fit
  // `creator` (content monetisation). Operationally distinct: contract
  // payouts, often multi-currency, often cross-border.
  { value: "freelance",  labelKey: "ec.ind.freelance",  risk: "ok", craKey: "ec.cra.freelance" },
  { value: "prof",       labelKey: "ec.ind.prof",       risk: "ok", craKey: "ec.cra.professional" },
  // ── Specialist review path ────────────────────────────────────────
  { value: "creator",    labelKey: "ec.ind.creator",    risk: "specialist", reassureKey: "ec.q1.alert.creator", craKey: "ec.cra.advertising" },
  { value: "affiliate",  labelKey: "ec.ind.affiliate",  risk: "specialist", craKey: "ec.cra.advertising" },
  // New row — VPN service operators. Compliance team flags these for
  // structured review (sanctions screening, traffic-source diligence)
  // before account opening. Hidden under `other` previously, which
  // skipped the specialist-tier signal.
  { value: "vpn",        labelKey: "ec.ind.vpn",        risk: "specialist", craKey: "ec.cra.vpn" },
  { value: "crypto",     labelKey: "ec.ind.crypto",     risk: "specialist", crypto: true, craKey: "ec.cra.it-dev" },
  // ── Fallback ──────────────────────────────────────────────────────
  { value: "other",      labelKey: "ec.ind.other",      risk: "ok", craKey: null },
  // ── Blocked (Fast no's, not slow no's — intro screen card 3) ──────
  { value: "gambling",   labelKey: "ec.ind.gambling",   risk: "blocked", craKey: null },
  { value: "adult",      labelKey: "ec.ind.adult",      risk: "blocked", craKey: null },
  { value: "weapons",    labelKey: "ec.ind.weapons",    risk: "blocked", craKey: null },
  { value: "lending",    labelKey: "ec.ind.lending",    risk: "blocked", craKey: null },
];

// ── Services multi-select (Q3) ────────────────────────────────────
// What does the user want to do with Altery? Second-strongest signal
// after industry for plan-tier recommendation. Pro/Ultra services
// drive upsell; crypto rails trigger specialist review.
//
// Ordering: universal-to-specialist top to bottom. accounts/crossBorder
// are default-on (universal needs for any digital business looking at
// Altery); local/fx/cards/multiUser are common; mass/multiEntity/api
// are advanced; crypto is specialist.
//
// `tier` field semantics:
//   "core"       — available on all plans, doesn't push tier
//   "starter"    — basic feature, doesn't push above Starter
//   "pro"        — strongly hints Pro tier (mass, cards, multiEntity)
//   "ultra"      — strongly hints Ultra tier (api)
//   "specialist" — triggers specialist review path (crypto rails)
const EC_SERVICES = [
  { value: "crossBorder", titleKey: "ec.svc.crossBorder.title", bodyKey: "ec.svc.crossBorder.body", tier: "starter" },
  { value: "local",       titleKey: "ec.svc.local.title",       bodyKey: "ec.svc.local.body",       tier: "starter" },
  { value: "mass",        titleKey: "ec.svc.mass.title",        bodyKey: "ec.svc.mass.body",        tier: "pro" },
  { value: "cards",       titleKey: "ec.svc.cards.title",       bodyKey: "ec.svc.cards.body",       tier: "pro" },
  { value: "crypto",      titleKey: "ec.svc.crypto.title",      bodyKey: "ec.svc.crypto.body",      tier: "specialist" },
];

// Single source of truth for the questionnaire length. Used by EcApp
// (state/routing), EcQuestionHeader (eyebrow), and interpolated into
// ec.q.eyebrow + ec.intro.lead translations as {total}. Adding or
// removing a question = bump this number; no string edits needed.
const TOTAL_STEPS = 5;

// Volume bands — used twice on Q4 (incoming + outgoing). `value` is the
// band midpoint in EUR; the recommendation engine reads (volIn + volOut)
// as monthly throughput. Threshold spacing follows KYB-industry norms.
const EC_VOLUME_BANDS = [
  { idx: 0, value: 25000,   labelKey: "ec.q4.vol.0" }, // Under £50k
  { idx: 1, value: 125000,  labelKey: "ec.q4.vol.1" }, // £50k – £200k
  { idx: 2, value: 350000,  labelKey: "ec.q4.vol.2" }, // £200k – £500k
  { idx: 3, value: 750000,  labelKey: "ec.q4.vol.3" }, // £500k – £1M
  { idx: 4, value: 3000000, labelKey: "ec.q4.vol.4" }, // £1M – £5M
  { idx: 5, value: 7000000, labelKey: "ec.q4.vol.5" }, // £5M+
];

// Tx-count bands — same shape as volume. `value` is the band midpoint
// transaction count; recommendation uses (txIn + txOut) total against
// the txHigh threshold (≥300 monthly).
const EC_TX_BANDS = [
  { idx: 0, value: 10,   labelKey: "ec.q4.tx.0" }, // Under 20
  { idx: 1, value: 60,   labelKey: "ec.q4.tx.1" }, // 20 – 100
  { idx: 2, value: 200,  labelKey: "ec.q4.tx.2" }, // 101 – 300
  { idx: 3, value: 650,  labelKey: "ec.q4.tx.3" }, // 301 – 1000
  { idx: 4, value: 2000, labelKey: "ec.q4.tx.4" }, // 1000+
];

// ── Fee schedule (canonical, from altery.com/fees/business) ───────
// Real Altery business-account fees. Altery's published schedule is
// region-tiered — same fees regardless of plan tier (Starter/Pro/
// Ultra), only the monthly subscription and the plan-level perks
// (FX cap, SWIFT cap) differ across tiers. Region key:
//   • "ukEu" — businesses registered in UK or any EU member state
//   • "row"  — Rest of the World (everyone else)
// Routing derived from entity.id: uk + eu entities → ukEu, mena → row.
// Values are FORMATTED strings matching altery.com display, kept
// verbatim so they survive copy review without re-translation. If
// Altery updates fees, this constant is the single source-of-truth
// to keep in sync (link: https://altery.com/fees/business).
const EC_FEE_SCHEDULE = {
  ukEu: {
    accountOpening:  "Free",
    accountClosure:  "Free",
    inactivity:      "£4.99/mo",
    internal:        "Free",
    sepa:            "€/£/$ 0.50",
    fp:              "£/$/€ 0.50",
    fedwire:         "$10 / €8.80 / £8",
    achUsd:          "1%, min $1 (>$100)",
    swiftGbpOut:     "£20",
    swiftEurOut:     "€30",
    swiftUsdOut:     "$30",
    swiftIn:         "£10 / €15 / $20",
    exchange:        "On request",
  },
  row: {
    accountOpening:  "£100",
    accountClosure:  "Free",
    inactivity:      "£9.99/mo",
    internal:        "Free",
    sepa:            "€2 / £2 / $2 + 0.10%, max €30 / £25 / $35",
    fp:              "£2 / $2.50 / €2.50 + 0.10%, max £25 / €30 / $35",
    fedwire:         "Currently unavailable",
    achUsd:          "Currently unavailable",
    swiftGbpOut:     "£30 + 0.15%, max £150",
    swiftEurOut:     "€35 + 0.15%, max €180",
    swiftUsdOut:     "$40 + 0.15%, max $200",
    swiftIn:         "£10 / €15 / $20",
    exchange:        "On request",
  },
};
// Region derivation: UK + EU entities route to UK-EU schedule;
// MENA (and any other non-EU entity) routes to RoW schedule.
function ecFeeRegion(entity) {
  if (!entity) return "ukEu";
  return entity.id === "mena" ? "row" : "ukEu";
}

// Real Altery plan data, from the public pricing page:
//   • Starter — £50/mo, SMEs under €100K/mo volume
//   • Pro     — £100/mo, growing businesses under €1M/mo
//   • Ultra   — £300/mo, high-volume operations above €1M/mo
// Prices are GBP (default for UK incorporation; the comparison page
// notes "based on country of incorporation: GBP, EUR, USD" — the
// pricing currency localises in production). Fees use real numbers
// pulled from the full comparison table: UK Faster Pay, SEPA, SWIFT
// (compound fee + %), FX markup, and bulk-transfer availability.
// Chess piece icons (pawn/knight/rook) match Altery's brand language —
// the chess hierarchy maps to plan tier progression.
const EC_PLANS = {
  starter: {
    id: "starter", nameKey: "ec.plan.starter", iconKey: "pawn",
    price: "£50", cycleKey: "ec.plan.cycleMo",
    taglineKey: "ec.plan.starter.tagline",
    fitKey: "ec.plan.starter.fit",
    // First perk (currency/IBAN coverage) is now rendered at the
    // entity level via entity.currencyPerkKey — entity-specific copy
    // is more accurate than the generic "Local IBANs in all base
    // currencies" we used to ship here. Remaining perks are the
    // plan-tier differentiators (SWIFT breadth, FX markup, trial).
    perkKeys: ["ec.plan.starter.p2", "ec.plan.starter.p3", "ec.plan.starter.p4"],
    fees: {
      fasterPay: "£1",
      sepa:      "€2",
      swift:     "€15 + 0.5%",
      fxMarkup:  "up to 0.8%",
      bulk:      false,
    },
  },
  pro: {
    id: "pro", nameKey: "ec.plan.pro", iconKey: "knight",
    price: "£100", cycleKey: "ec.plan.cycleMo",
    taglineKey: "ec.plan.pro.tagline",
    fitKey: "ec.plan.pro.fit",
    perkKeys: ["ec.plan.pro.p1", "ec.plan.pro.p2", "ec.plan.pro.p3", "ec.plan.pro.p4", "ec.plan.pro.p5"],
    fees: {
      fasterPay: "£1",
      sepa:      "€1",
      swift:     "€10 + 0.25%",
      fxMarkup:  "up to 0.7%",
      bulk:      true,
    },
  },
  ultra: {
    id: "ultra", nameKey: "ec.plan.ultra", iconKey: "rook",
    price: "£300", cycleKey: "ec.plan.cycleMo",
    taglineKey: "ec.plan.ultra.tagline",
    fitKey: "ec.plan.ultra.fit",
    perkKeys: ["ec.plan.ultra.p1", "ec.plan.ultra.p2", "ec.plan.ultra.p3", "ec.plan.ultra.p4", "ec.plan.ultra.p5"],
    fees: {
      fasterPay: "£0.5",
      sepa:      "€0.5",
      swift:     "€10 + 0.15%",
      fxMarkup:  "up to 0.5%",
      bulk:      true,
    },
  },
};

const EC_ENTITIES = {
  uk: {
    id: "uk",
    nameKey: "ec.entity.uk.name",
    licenceKey: "ec.entity.uk.licence",
    noteKey: "ec.entity.uk.note",
    currencyPerkKey: "ec.entity.uk.currencyPerk",
    countries: ["GB", "IE", "NL", "DE"],
    // Public regulator reference — shown in the result hero so visitors
    // can verify the licence claim without leaving the page. The deep
    // link goes to the firm's record on the FCA Financial Services
    // Register; the ref is the FCA Firm Reference Number (FRN).
    regulatory: {
      refLabel: "FRN 901037",
      registerUrl: "https://register.fca.org.uk/s/firm?id=001b000001EjC6SAAV",
    },
    accounts: [
      {
        currency: "GBP",
        type: "local",
        rails: ["Faster Payments", "BACS", "CHAPS"],
        fields: [
          { labelKey: "ec.account.sortCode",  value: "23-14-70" },
          { labelKey: "ec.account.accountNo", value: "1234 5678" },
          { labelKey: "ec.account.bic",       value: "ALTYGB22", muted: true },
        ],
      },
      {
        currency: "EUR",
        type: "iban",
        rails: ["SEPA", "SWIFT"],
        fields: [
          { labelKey: "ec.account.iban", value: "GB29 ALTY 6016 1331 9268 19" },
          { labelKey: "ec.account.bic",  value: "ALTYGB22", muted: true },
        ],
      },
      {
        currency: "USD",
        type: "swift-only",
        rails: ["SWIFT"],
        fields: [],
      },
    ],
    region: "uk",
  },
  eu: {
    id: "eu",
    nameKey: "ec.entity.eu.name",
    licenceKey: "ec.entity.eu.licence",
    noteKey: "ec.entity.eu.note",
    currencyPerkKey: "ec.entity.eu.currencyPerk",
    countries: ["DE", "FR", "NL", "IT", "ES", "IE"],
    // Central Bank of Cyprus EMI authorisation number — public on
    // CBC's e-money institutions register. Direct firm-detail deep
    // link isn't exposed by CBC, so we link to the EMI list page where
    // the number 115.1.3.61 appears against Altery EU Ltd.
    regulatory: {
      refLabel: "EMI 115.1.3.61",
      registerUrl: "https://www.centralbank.cy/en/licensing-supervision/electronic-money-institutions",
    },
    accounts: [
      {
        currency: "EUR",
        type: "iban",
        rails: ["SEPA Instant", "SEPA", "SWIFT"],
        fields: [
          { labelKey: "ec.account.iban", value: "CY17 0020 0128 0000 0012 0052 7600" },
          { labelKey: "ec.account.bic",  value: "BCYPCY2NXXX", muted: true },
        ],
      },
      {
        currency: "GBP",
        type: "swift-only",
        rails: ["SWIFT"],
        fields: [],
      },
      {
        currency: "USD",
        type: "swift-only",
        rails: ["SWIFT"],
        fields: [],
      },
    ],
    region: "eu",
  },
  mena: {
    id: "mena",
    nameKey: "ec.entity.mena.name",
    licenceKey: "ec.entity.mena.licence",
    noteKey: "ec.entity.mena.note",
    currencyPerkKey: "ec.entity.mena.currencyPerk",
    countries: ["AE", "SA", "EG", "TR"],
    // DFSA's public-firm register doesn't expose an individual
    // numeric ref through a stable deep link — the link goes to the
    // searchable register where visitors can locate Altery MENA Ltd.
    // Once DFSA publishes a stable firm-detail URL we should swap in
    // the deep link here.
    regulatory: {
      refLabel: "DFSA register",
      registerUrl: "https://www.dfsa.ae/public-register/firms",
    },
    accounts: [
      {
        currency: "USD",
        type: "iban",
        rails: ["SWIFT"],
        fields: [
          { labelKey: "ec.account.iban", value: "AE07 0331 2345 6789 0123 456" },
          { labelKey: "ec.account.bic",  value: "EBILAEAD", muted: true },
        ],
      },
      {
        currency: "AED",
        type: "iban",
        rails: ["UAEFTS", "SWIFT"],
        fields: [
          { labelKey: "ec.account.iban", value: "AE52 0331 0987 6543 2109 876" },
          { labelKey: "ec.account.bic",  value: "EBILAEAD", muted: true },
        ],
      },
      {
        currency: "EUR",
        type: "swift-only",
        rails: ["SWIFT"],
        fields: [],
      },
    ],
    region: "mena",
  },
};

// ── Comparator banks for result-page cost-projection ──────────────
//
// Two purposes:
//   (1) Pick the traditional bank baseline for the money panel — fee
//       schedule used to compute the side-by-side comparison number.
//   (2) Provide qualitative attributes for the matrix below the money
//       panel — speed, acceptance, crypto, multi-entity etc.
//
// Selection rationale (per founder direction): pick traditional banks
// that are EXPENSIVE and SLOW — Barclays / BNP Paribas / Mashreq —
// because that's where Altery's value proposition (fast + accepting +
// digital-first + crypto + low FX) shows the widest delta. Neobank
// comparators (Wise / Revolut / Mercury / 3S Money / Payset) round out
// the qualitative matrix to demonstrate that on multiple non-fee axes
// (acceptance, crypto, multi-entity), Altery wins even where neobanks
// match on fees.
//
// All fee numbers normalised to EUR for math consistency with rec.
// monthlyVolume (which is EUR). Conversion at standard rates documented
// inline. Re-validate quarterly against `asof` dates.
//
// ── Hero identifier ───────────────────────────────────────────────
// Picks the most operationally relevant account from the entity
// (always accounts[0] in our data; ordered by relevance per entity).
// For UK it's GBP local (sort code + account number), for EU it's
// the SEPA-reachable IBAN, for MENA it's USD/AE-IBAN. Skipped for
// SWIFT-only primaries — we don't fake a local-rail identifier.
function ecHeroIdentifier(entity) {
  const acct = entity?.accounts?.[0];
  if (!acct || acct.type === "swift-only") return null;
  if (acct.type === "iban") {
    const f = acct.fields.find((x) => x.labelKey === "ec.account.iban");
    return f ? { currency: acct.currency, value: f.value, kind: "iban" } : null;
  }
  if (acct.type === "local") {
    const sort = acct.fields.find((x) => x.labelKey === "ec.account.sortCode")?.value;
    const accountNo = acct.fields.find((x) => x.labelKey === "ec.account.accountNo")?.value;
    const value = [sort, accountNo].filter(Boolean).join(" · ");
    return value ? { currency: acct.currency, value, kind: "local" } : null;
  }
  return null;
}

// Mask the trailing portion of an account identifier with vertically
// centred middle dots (·····). The dots themselves communicate "this
// isn't your real number" while preserving the IBAN/sort-code format
// as a trust signal. Splits on whitespace, replaces the last token:
// with `n` dots if the token is short (≤n), or with `last (length-n)
// chars + n dots` if longer.
//   UK GBP local  "23-14-70 · 1234 5678"  → "23-14-70 · 1234 ····"
//   UK EUR IBAN   "GB29 ALTY ... 9268 19" → "GB29 ALTY ... 9268 ····"
function maskTailDots(s, n = 4) {
  if (!s) return s;
  const parts = s.split(/(\s+)/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] && !/^\s+$/.test(parts[i])) {
      const t = parts[i];
      parts[i] = t.length > n
        ? t.slice(0, -n) + "·".repeat(n)
        : "·".repeat(n);
      break;
    }
  }
  return parts.join("");
}

const EC_COMPARATORS = {
  // ── Traditional bank baselines (one per entity region) ──────────
  uk_traditional: {
    id: "uk_traditional",
    name: "Barclays Business",
    type: "traditional",
    forEntities: ["uk", "row"],
    asof: "2026-05-23",
    sources: [
      "https://www.barclays.co.uk/business-banking/accounts/pricing/",
    ],
    // Money — native GBP (Barclays publishes in £).
    fees: {
      subscriptionGbp:    8.50,   // £8.50 monthly fee
      localOutGbp:        0.35,   // £0.35 per electronic payment
      sepaOutGbp:         20,     // £20 SEPA outgoing
      swiftOutGbp:        25,     // £25 SWIFT outgoing
      transferInGbp:      6,      // £6 incoming
      fxMarkupBps:        275,    // 2.75% standard variable spread
      cardMonthlyGbp:     3,      // £3 per card
      cardFxMarkupBps:    275,
      massBatchGbp:       25,     // £25 estimated per batch
    },
    qualitative: {
      onboardingKey:   "ec.cmp.q.onboarding.weeks",
      digitalNative:   false,
      affiliate:       "caseByCase",
      cryptoNative:    false,
      multiEntity:     false,
      docFriction:     "high",
    },
  },
  eu_traditional: {
    id: "eu_traditional",
    name: "BNP Paribas Business",
    type: "traditional",
    forEntities: ["eu"],
    asof: "2026-05-23",
    sources: [
      "https://group.bnpparibas/uploads/file/business_tarif.pdf",
    ],
    // BNP native EUR — converted to GBP via 1 EUR ≈ £0.85 (2026 mid).
    fees: {
      subscriptionGbp:    21,     // €25 → £21
      localOutGbp:        0.43,   // €0.50 → £0.43
      sepaOutGbp:         0.43,
      swiftOutGbp:        21,     // €25 flat
      transferInGbp:      0,      // SEPA in free
      fxMarkupBps:        275,    // 2.75% average
      cardMonthlyGbp:     7,      // €8 → £7
      cardFxMarkupBps:    250,
      massBatchGbp:       30,     // €35 → £30
    },
    qualitative: {
      onboardingKey:   "ec.cmp.q.onboarding.weeks",
      digitalNative:   false,
      affiliate:       "no",
      cryptoNative:    false,
      multiEntity:     false,
      docFriction:     "high",
    },
  },
  mena_traditional: {
    id: "mena_traditional",
    name: "Mashreq Business",
    type: "traditional",
    forEntities: ["mena"],
    asof: "2026-05-23",
    sources: [
      "https://www.mashreqbank.com/uae/en/business/sme/business-banking",
    ],
    // Mashreq native AED — converted to GBP via 1 AED ≈ £0.21 (2026 mid).
    fees: {
      subscriptionGbp:    42,     // AED 200 → £42
      localOutGbp:        1.05,   // AED 5 → £1.05
      sepaOutGbp:         21,     // International ≈ AED 100 → £21
      swiftOutGbp:        26,     // AED 125 → £26
      transferInGbp:      4,      // AED 20 → £4
      fxMarkupBps:        300,    // 3.00% — MENA traditional spread
      cardMonthlyGbp:     11,     // AED 50 → £11
      cardFxMarkupBps:    300,
      massBatchGbp:       42,     // AED 200 → £42
    },
    qualitative: {
      onboardingKey:   "ec.cmp.q.onboarding.weeks",
      digitalNative:   false,
      affiliate:       "no",
      cryptoNative:    false,
      multiEntity:     false,
      docFriction:     "high",
    },
  },
  // ── Neobank / cross-border-fintech comparators ─────────────────
  // No full fee schedule needed — used only in qualitative matrix.
  // `qualitative` strings show what they don't do well for our ICP.
  wise: {
    id: "wise",
    name: "Wise Business",
    type: "neobank",
    asof: "2026-05-23",
    sources: ["https://wise.com/help/articles/2978049/where-can-i-use-wise"],
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.days",
      digitalNative: "partial",     // accepts SaaS but not high-risk
      affiliate:     "restricted",  // many affiliate niches restricted
      cryptoNative:  false,         // explicitly banned
      multiEntity:   false,
      docFriction:   "medium",
      fxMarkup:      "0.43-0.65%",
      swiftOut:      "£5-15",
    },
  },
  revolut: {
    id: "revolut",
    name: "Revolut Business",
    type: "neobank",
    asof: "2026-05-23",
    sources: ["https://help.revolut.com/en-US/business/help/setting-up-an-account/is-my-business-eligible/"],
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.days",
      digitalNative: "partial",
      affiliate:     "no",
      cryptoNative:  false,
      multiEntity:   false,
      docFriction:   "medium",
      fxMarkup:      "0-1.0%",     // free up to plan limit
      swiftOut:      "£1-15",
    },
  },
  mercury: {
    id: "mercury",
    name: "Mercury",
    type: "neobank",
    asof: "2026-05-23",
    sources: ["https://support.mercury.com/hc/en-us/articles/28770467511060"],
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.days",
      digitalNative: true,           // built for digital
      affiliate:     "partial",
      cryptoNative:  false,
      multiEntity:   false,
      docFriction:   "low",
      restriction:   "US-only",      // hard limit for non-US bizzes
      fxMarkup:      "1.0%",
      swiftOut:      "$5",
    },
  },
  three_s_money: {
    id: "three_s_money",
    name: "3S Money",
    type: "neobank",
    asof: "2026-05-23",
    sources: ["https://3s.money/help-centre/getting-started/is-my-business-eligible-for-a-3s-money-international-business-account"],
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.weeks",  // 2-3 weeks despite digital flow
      digitalNative: "partial",
      affiliate:     "caseByCase",
      cryptoNative:  false,                        // crypto prohibited
      multiEntity:   false,
      docFriction:   "medium",
      restriction:   "£100k/yr min + opening fee", // hard barrier for early-stage
      fxMarkup:      "1.0-1.5%",
      swiftOut:      "£15-25",
    },
  },
  payset: {
    id: "payset",
    name: "Payset",
    type: "neobank",
    asof: "2026-05-23",
    sources: ["https://www.payset.io/multi-currency-account/"],
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.days",
      digitalNative: "partial",
      affiliate:     "restricted",
      cryptoNative:  false,
      multiEntity:   false,
      docFriction:   "medium",
      fxMarkup:      "0.5-1.5%",
      swiftOut:      "£10-20",
    },
  },
  // ── Altery — the reference row in both panels ───────────────────
  altery: {
    id: "altery",
    name: "Altery",
    type: "self",
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.sameDay",
      digitalNative: true,
      affiliate:     true,
      cryptoNative:  true,
      multiEntity:   true,
      docFriction:   "low",
      // FX/SWIFT come from the active plan — rendered dynamically
    },
  },
};

// Export all names to window so other scripts can reference them
// unqualified.
Object.assign(window, {
  EC_COUNTRIES, EC_DISPLAY_REGIONS, EC_COUNTRY_TO_REGION, EC_REGION_ORDER, EC_INDUSTRIES,
  EC_SERVICES, TOTAL_STEPS,
  EC_VOLUME_BANDS, EC_TX_BANDS, EC_FEE_SCHEDULE, EC_PLANS, EC_ENTITIES,
  EC_COMPARATORS, ecHeroIdentifier, maskTailDots, ecFeeRegion,
});
