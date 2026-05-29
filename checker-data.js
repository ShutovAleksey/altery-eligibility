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

// ── Serviceable jurisdictions (corporate KYB risk appetite) ──────────
// Single source of truth aligned with the back-office compliance register
// (Corporate column). Only "Operational" jurisdictions can onboard a
// business; everything else — "Not operational", "Prohibited", sanctioned,
// or any territory absent from the register — is a hard decline. We keep
// the allow-list here (not a per-row flag) so a register refresh is a
// one-list edit instead of touching 200+ country rows. The loop below
// stamps risk:"blocked" on every country NOT in this set, which Q1
// (incorporation) reads to short-circuit to the soft-decline result.
//
// IMPORTANT: when the compliance register changes, update THIS set. A
// country moving to "Operational" → add its code; moving away → remove it.
const EC_SERVICEABLE_CC = new Set([
  "AD","AI","AG","AM","AW","AU","AT","AZ","BS","BB","BE","BZ","BM","BN","BG",
  "CA","KY","CX","CC","CR","HR","CW","CY","CZ","DK","DM","DO","EE","FI","FR",
  "GE","DE","GH","GI","GR","GD","GG","HN","HK","HU","IS","IE","IM","IL","IT",
  "JP","JE","KZ","KG","LV","LI","LT","LU","MY","MT","MH","MU","MD","MC","MS",
  "NR","NL","NZ","NG","NU","MK","NO","PW","PA","PL","PT","PR","RO","SM","SA",
  "SC","SG","SX","SK","SI","ZA","ES","LK","KN","LC","VC","SE","CH","TH","TR",
  "TC","UA","AE","GB","US","UZ","VG",
]);

// Stamp the corporate risk appetite onto every country. Mutating the
// constant array's elements is fine — they're plain objects and nothing
// has read them yet at module-eval time.
EC_COUNTRIES.forEach((c) => {
  if (!EC_SERVICEABLE_CC.has(c.code)) c.risk = "blocked";
});

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

// ─────────────────────────────────────────────────────────────────
// Chip-region taxonomy — Q5 corridor picker (region chips + outlier
// country add). Finer-grained than EC_DISPLAY_REGIONS (which stays
// 4-bucket for the country-search dropdown grouping). Seven chips
// because that's the breadth users mentally distinguish in fintech:
// UK+EEA stays one bloc; Middle East separates from APAC because of
// DFSA / Gulf compliance specifics; South Asia separates from APAC
// because of RBI / FEMA distinctness; APAC stays a single chip
// (SEA + East Asia + ANZ — fintech-standard usage); North America
// and Latin America split because their risk profiles diverge; Africa
// remains one bucket. Sanctioned countries (KP, IR, SY, CU, RU, BY,
// MM, AF, SD) appear in their geographic regions for completeness,
// but are filtered out of the outlier search picker so users can't
// add them individually.
const EC_CHIP_REGIONS = {
  "uk-eea": [
    // British Isles
    "GB", "IE", "GG", "JE", "IM", "GI",
    // EU 27
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IT", "LV", "LT", "LU", "MT", "NL", "PL",
    "PT", "RO", "SK", "SI", "ES", "SE",
    // EEA non-EU + Switzerland (fintech-grouped with EEA)
    "IS", "LI", "NO", "FO", "SJ", "AX", "CH",
    // European microstates
    "AD", "MC", "SM", "VA",
    // Non-EEA continental Europe (Eastern + Balkans)
    "UA", "MD", "AL", "BA", "ME", "MK", "RS",
    "RU", "BY",
  ],
  "middle-east": [
    "AE", "SA", "QA", "BH", "KW", "OM",
    "IL", "JO", "LB", "PS", "SY",
    "TR", "IR", "IQ", "YE",
    "AM", "AZ", "GE",
  ],
  "south-asia": [
    "IN", "PK", "BD", "LK", "NP", "BT", "MV", "AF",
    "KZ", "UZ", "KG", "TJ", "TM",
  ],
  "apac": [
    "CN", "JP", "KR", "TW", "HK", "MO", "MN", "KP",
    "ID", "MY", "SG", "TH", "VN", "PH", "BN", "KH", "LA", "MM", "TL",
    "AU", "NZ", "FJ", "PG", "NC", "PF", "WS", "TO", "VU", "SB",
    "KI", "MH", "FM", "NR", "PW", "TV", "CK", "NU", "TK", "NF", "PN", "WF",
    "AS", "GU", "MP",
    "AQ", "BV", "CX", "CC", "HM", "IO", "TF", "GS", "UM",
  ],
  "north-america": [
    "US", "CA", "GL", "PM",
  ],
  "latin-america": [
    "MX", "GT", "BZ", "SV", "HN", "NI", "CR", "PA",
    "CO", "VE", "GY", "SR", "GF", "EC", "PE", "BO", "PY", "CL",
    "AR", "UY", "BR", "FK",
    "CU", "DO", "HT", "JM", "BS", "PR", "VI", "TT", "BB",
    "GD", "LC", "VC", "DM", "AG", "KN", "BM", "KY",
    "AI", "MS", "VG", "TC", "AW", "CW", "SX", "BQ",
    "MQ", "GP", "BL", "MF",
  ],
  "africa": [
    "EG", "LY", "TN", "DZ", "MA", "EH", "SD",
    "NG", "ZA", "KE", "GH", "ET", "TZ", "UG", "RW", "CI", "SN",
    "ZM", "ZW", "AO", "BF", "BI", "BJ", "BW",
    "CD", "CF", "CG", "CM", "CV", "DJ", "ER", "GA", "GM", "GN",
    "GQ", "GW", "KM", "LR", "LS", "MG", "ML", "MR", "MU", "MW",
    "MZ", "NA", "NE", "RE", "SC", "SH", "SL", "SO", "SS", "ST",
    "SZ", "TD", "TG", "YT",
  ],
};

// Order chips render in. Mobile lays out 2-per-row, so the order also
// drives visual rhythm — anchors (UK+EEA, NA) lead each row.
const EC_CHIP_REGION_ORDER = [
  "uk-eea", "middle-east", "south-asia", "apac",
  "north-america", "latin-america", "africa",
];

// Representative country flag for each chip (visual anchor inside the
// chip). String = single flag; array = stacked flag pair (overlapping
// avatar style). UK+EEA stacks GB and EU because EEA isn't a country
// flag of its own — the stack communicates the "two-bloc" composition
// at a glance, replacing the earlier "€" symbol prefix in the label.
const EC_CHIP_REGION_FLAG = {
  "uk-eea":        ["GB", "EU"],
  "middle-east":   "AE",
  "south-asia":    "IN",
  "apac":          "SG",
  "north-america": "US",
  "latin-america": "BR",
  "africa":        "ZA",
};

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
  // Creator platforms map to the e-commerce-marketplace CRA bucket:
  // operationally they're multi-payee split-flow platforms (platform
  // → creators), same compliance shape as marketplace → sellers. Not
  // "Advertising & Marketing" — that bucket is for agencies running
  // marketing for clients, a different operational model.
  { value: "creator",    labelKey: "ec.ind.creator",    risk: "specialist", reassureKey: "ec.q1.alert.creator", craKey: "ec.cra.ecom-marketplace" },
  { value: "affiliate",  labelKey: "ec.ind.affiliate",  risk: "specialist", craKey: "ec.cra.advertising" },
  // VPN service operators. Compliance team flags these for structured
  // review (sanctions screening, traffic-source diligence) before
  // account opening. Hidden under `other` previously, which skipped
  // the specialist-tier signal.
  { value: "vpn",        labelKey: "ec.ind.vpn",        risk: "specialist", craKey: "ec.cra.vpn" },
  // Crypto gets its own CRA bucket — Travel Rule, MiCA categorisation,
  // sanctions screening on-chain, and source-of-digital-asset-funds
  // are materially different compliance work than IT-development KYB.
  // Folding crypto under "IT Support / Development" would lose that
  // signal at back-office routing time.
  { value: "crypto",     labelKey: "ec.ind.crypto",     risk: "specialist", crypto: true, craKey: "ec.cra.crypto" },
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
// `tier` field semantics (documentation only — not read at runtime, the
// actual capability gates live in ecRecommend via svcSet.has(...)):
//   "starter"    — available on Starter (and above), doesn't push tier
//   "pro"        — Pro-only capability, forces Pro (mass, api)
//   "ultra"      — Ultra-only capability, forces Ultra (multiCompany)
//   "specialist" — triggers specialist review path (crypto rails)
// Note: multiCompany maps to Altery's Multi-Company Management product
// (https://altery.com/business/solutions/multi-company-management/) —
// one login across several legal entities, with separate balances /
// IBANs / cards per company and role-based access.
// Order is intentionally Starter → Pro → Ultra: the user scrolls top-to-
// bottom and the list visually telegraphs tier escalation. Crypto sits
// in the Starter block because picking it doesn't force a tier (it
// triggers UK FCA routing instead) — same user-side effect as the other
// Starter-eligible services. mass/api/multiCompany force Pro (per the
// canonical pricing doc multi-company is available on all plans but
// the surrounding tooling — separate IBANs/cards/team-access per
// entity — sits in Pro+).
const EC_SERVICES = [
  { value: "local",        titleKey: "ec.svc.local.title",        bodyKey: "ec.svc.local.body",        tier: "starter" },
  { value: "cards",        titleKey: "ec.svc.cards.title",        bodyKey: "ec.svc.cards.body",        tier: "starter" },
  { value: "crypto",       titleKey: "ec.svc.crypto.title",       bodyKey: "ec.svc.crypto.body",       tier: "specialist" },
  { value: "crossBorder",  titleKey: "ec.svc.crossBorder.title",  bodyKey: "ec.svc.crossBorder.body",  tier: "starter" },
  { value: "mass",         titleKey: "ec.svc.mass.title",         bodyKey: "ec.svc.mass.body",         tier: "pro" },
  { value: "api",          titleKey: "ec.svc.api.title",          bodyKey: "ec.svc.api.body",          tier: "pro" },
  { value: "multiCompany", titleKey: "ec.svc.multiCompany.title", bodyKey: "ec.svc.multiCompany.body", tier: "pro" },
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
    // Plan-card perks for the result-page recommendation hero (NOT the
    // compare modal — the modal uses the unified PLAN_CAPABILITIES list
    // in checker-modals.jsx for row-by-row scan-comparability).
    perkKeys: ["ec.plan.starter.p4", "ec.plan.starter.users"],
    fees: {
      fasterPay: "£1",
      sepa:      "€2",
      swift:     "€15 + 0.5%",
      fxMarkup:  "up to 0.8%",
    },
  },
  pro: {
    id: "pro", nameKey: "ec.plan.pro", iconKey: "knight",
    price: "£100", cycleKey: "ec.plan.cycleMo",
    taglineKey: "ec.plan.pro.tagline",
    fitKey: "ec.plan.pro.fit",
    perkKeys: ["ec.plan.pro.trial", "ec.plan.pro.p3", "ec.plan.pro.am", "ec.plan.pro.users"],
    fees: {
      fasterPay: "£1",
      sepa:      "€1.5",
      swift:     "€12 + 0.35%",
      fxMarkup:  "up to 0.7%",
    },
  },
  ultra: {
    id: "ultra", nameKey: "ec.plan.ultra", iconKey: "rook",
    price: "£300", cycleKey: "ec.plan.cycleMo",
    taglineKey: "ec.plan.ultra.tagline",
    fitKey: "ec.plan.ultra.fit",
    perkKeys: ["ec.plan.ultra.trial", "ec.plan.ultra.p5", "ec.plan.ultra.am", "ec.plan.ultra.negotiatedFx", "ec.plan.ultra.users"],
    fees: {
      fasterPay: "£0.5",
      sepa:      "€1",
      swift:     "€10 + 0.20%",
      fxMarkup:  "up to 0.4%",
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
    // Public regulator reference — direct deep-link to Altery Ltd's
    // firm record on the FCA Financial Services Register. Skips the
    // search step entirely so the page lands on the firm detail
    // immediately. If FCA rotates the Salesforce record id, the URL
    // needs refresh — check by visiting and confirming Altery shows.
    regulatory: {
      refLabel: "FRN 901037",
      registerUrl: "https://register.fca.org.uk/s/firm?id=0010X00004eQAWDQA4",
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
    // Direct deep link to Altery MENA Ltd's firm-detail page on the
    // DFSA public register.
    regulatory: {
      refLabel: "DFSA register",
      registerUrl: "https://www.dfsa.ae/public-register/firms/altery-mena-ltd",
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
  // ── Traditional bank baselines (peer panels per entity region) ─────
  // Each region has 3-4 peer banks. ecBaselineFor() composes a synthetic
  // baseline from the panel by taking the median of each fee field —
  // more defensible than a single picked-bank baseline and citation-
  // backed by every panel member's pricing page. `panel: "uk|eu|mena"`
  // is the membership tag; `forEntities` on the lead bank preserves the
  // legacy single-bank lookup (test back-compat) but most consumers
  // should use the synthetic baseline.
  //
  // Values are approximate as of 2026-05; reverify quarterly against
  // each `sources[]` URL.

  // ── UK panel (median for entity.id = "uk" / "row") ───────────────
  uk_traditional: {
    id: "uk_traditional",
    name: "Barclays Business",
    type: "traditional",
    panel: "uk",
    forEntities: ["uk", "row"],   // lead — used for legacy back-compat
    asof: "2026-05-29",
    sources: ["https://www.barclays.co.uk/business-banking/accounts/rates-and-charges/"],
    fees: {
      subscriptionGbp: 8.50, subscriptionProGbp: 40, subscriptionUltraGbp: 250, localOutGbp: 0.35, sepaOutGbp: 20,
      swiftOutGbp: 25, transferInGbp: 6, fxMarkupBps: 275,
      cardMonthlyGbp: 3, cardFxMarkupBps: 275, massBatchGbp: 25,
    },
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.weeks",
      digitalNative: false, affiliate: "caseByCase",
      cryptoNative: false, multiEntity: false, docFriction: "high",
    },
  },
  uk_hsbc: {
    id: "uk_hsbc", name: "HSBC Kinetic", type: "traditional", panel: "uk",
    asof: "2026-05-29",
    sources: ["https://www.business.hsbc.uk/-/media/media/uk/pdfs/regulations/business-price-list.pdf"],
    fees: {
      subscriptionGbp: 6.50, subscriptionProGbp: 36, subscriptionUltraGbp: 220, localOutGbp: 0.40, sepaOutGbp: 18,
      swiftOutGbp: 24, transferInGbp: 5, fxMarkupBps: 250,
      cardMonthlyGbp: 4, cardFxMarkupBps: 250, massBatchGbp: 22,
    },
  },
  uk_lloyds: {
    id: "uk_lloyds", name: "Lloyds Business", type: "traditional", panel: "uk",
    asof: "2026-05-29",
    sources: ["https://www.lloydsbank.com/business/rates-charges.html"],
    fees: {
      subscriptionGbp: 7.50, subscriptionProGbp: 38, subscriptionUltraGbp: 230, localOutGbp: 0.35, sepaOutGbp: 22,
      swiftOutGbp: 25, transferInGbp: 7, fxMarkupBps: 275,
      cardMonthlyGbp: 3, cardFxMarkupBps: 275, massBatchGbp: 25,
    },
  },
  uk_natwest: {
    id: "uk_natwest", name: "NatWest Business", type: "traditional", panel: "uk",
    asof: "2026-05-29",
    sources: ["https://www.natwest.com/business/support-centre/manage-your-account/manage-your-account-charges.html"],
    fees: {
      subscriptionGbp: 8.00, subscriptionProGbp: 38, subscriptionUltraGbp: 240, localOutGbp: 0.35, sepaOutGbp: 22,
      swiftOutGbp: 22, transferInGbp: 6, fxMarkupBps: 260,
      cardMonthlyGbp: 3, cardFxMarkupBps: 260, massBatchGbp: 24,
    },
  },

  // ── EU panel (median for entity.id = "eu") ───────────────────────
  // BNP, Société Générale, Crédit Agricole, Deutsche Bank.
  // Native EUR → GBP via 1 EUR ≈ £0.85 (2026 mid).
  eu_traditional: {
    id: "eu_traditional", name: "BNP Paribas Business",
    type: "traditional", panel: "eu",
    forEntities: ["eu"],   // lead — legacy back-compat
    asof: "2026-05-29",
    sources: ["https://banqueentreprise.bnpparibas/tarifs"],
    fees: {
      subscriptionGbp: 21, subscriptionProGbp: 50, subscriptionUltraGbp: 240, localOutGbp: 0.43, sepaOutGbp: 0.43,
      swiftOutGbp: 21, transferInGbp: 0, fxMarkupBps: 275,
      cardMonthlyGbp: 7, cardFxMarkupBps: 250, massBatchGbp: 30,
    },
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.weeks",
      digitalNative: false, affiliate: "no",
      cryptoNative: false, multiEntity: false, docFriction: "high",
    },
  },
  eu_socgen: {
    id: "eu_socgen", name: "Société Générale Business",
    type: "traditional", panel: "eu",
    asof: "2026-05-29",
    sources: ["https://entreprises.sg.fr/tarifs-societe-generale-entreprises"],
    fees: {
      subscriptionGbp: 18, subscriptionProGbp: 45, subscriptionUltraGbp: 220, localOutGbp: 0.50, sepaOutGbp: 0.50,
      swiftOutGbp: 19, transferInGbp: 0, fxMarkupBps: 260,
      cardMonthlyGbp: 7, cardFxMarkupBps: 260, massBatchGbp: 28,
    },
  },
  eu_creditag: {
    id: "eu_creditag", name: "Crédit Agricole Business",
    type: "traditional", panel: "eu",
    asof: "2026-05-29",
    sources: ["https://www.credit-agricole.fr/professionnel/aide-contact/tarifs.html"],
    fees: {
      subscriptionGbp: 17, subscriptionProGbp: 42, subscriptionUltraGbp: 200, localOutGbp: 0.45, sepaOutGbp: 0.45,
      swiftOutGbp: 18, transferInGbp: 0, fxMarkupBps: 250,
      cardMonthlyGbp: 6, cardFxMarkupBps: 250, massBatchGbp: 25,
    },
  },
  eu_deutsche: {
    id: "eu_deutsche", name: "Deutsche Bank Business",
    type: "traditional", panel: "eu",
    asof: "2026-05-29",
    sources: ["https://www.deutsche-bank.de/ub.html"],
    fees: {
      subscriptionGbp: 23, subscriptionProGbp: 55, subscriptionUltraGbp: 260, localOutGbp: 0.40, sepaOutGbp: 0.40,
      swiftOutGbp: 22, transferInGbp: 0, fxMarkupBps: 280,
      cardMonthlyGbp: 8, cardFxMarkupBps: 280, massBatchGbp: 32,
    },
  },

  // ── MENA panel (median for entity.id = "mena") ───────────────────
  // Mashreq, Emirates NBD, FAB. Native AED → GBP via 1 AED ≈ £0.21.
  mena_traditional: {
    id: "mena_traditional", name: "Mashreq Business",
    type: "traditional", panel: "mena",
    forEntities: ["mena"],   // lead — legacy back-compat
    asof: "2026-05-29",
    sources: ["https://www.mashreq.com/en/uae/corporate/service-charges/"],
    fees: {
      subscriptionGbp: 42, subscriptionProGbp: 95, subscriptionUltraGbp: 280, localOutGbp: 1.05, sepaOutGbp: 21,
      swiftOutGbp: 26, transferInGbp: 4, fxMarkupBps: 300,
      cardMonthlyGbp: 11, cardFxMarkupBps: 300, massBatchGbp: 42,
    },
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.weeks",
      digitalNative: false, affiliate: "no",
      cryptoNative: false, multiEntity: false, docFriction: "high",
    },
  },
  mena_enbd: {
    id: "mena_enbd", name: "Emirates NBD Business",
    type: "traditional", panel: "mena",
    asof: "2026-05-29",
    sources: ["https://www.emiratesnbd.com/-/media/files/help-and-support-pdf/emiratesnbd_bb_schedule_of_charges.pdf"],
    fees: {
      subscriptionGbp: 37, subscriptionProGbp: 85, subscriptionUltraGbp: 250, localOutGbp: 0.85, sepaOutGbp: 19,
      swiftOutGbp: 25, transferInGbp: 4, fxMarkupBps: 285,
      cardMonthlyGbp: 10, cardFxMarkupBps: 285, massBatchGbp: 38,
    },
  },
  mena_fab: {
    id: "mena_fab", name: "First Abu Dhabi Bank (FAB) Business",
    type: "traditional", panel: "mena",
    asof: "2026-05-29",
    sources: ["https://www.bankfab.com/en-ae/business-banking/fees-and-charges"],
    fees: {
      subscriptionGbp: 32, subscriptionProGbp: 80, subscriptionUltraGbp: 240, localOutGbp: 1.00, sepaOutGbp: 20,
      swiftOutGbp: 24, transferInGbp: 4, fxMarkupBps: 290,
      cardMonthlyGbp: 9, cardFxMarkupBps: 290, massBatchGbp: 36,
    },
  },
  // ── Neobank / cross-border-fintech comparators ─────────────────
  // No full fee schedule needed — used only in qualitative matrix.
  // `qualitative` strings show what they don't do well for our ICP.
  wise: {
    id: "wise",
    name: "Wise Business",
    type: "neobank",
    asof: "2026-05-29",
    sources: [
      "https://wise.com/gb/pricing/business",
      "https://wise.com/acceptable-use-policy",
      "https://wise.com/help/articles/2932693/how-is-wise-regulated-in-each-country-and-region",
      "https://newsroom.wise.com/en-CEU/255401-wise-secures-central-bank-final-approval-for-stored-value-facilities-and-retail-payment-services-licenses-in-the-uae/",
    ],
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.days",
      digitalNative: "partial",     // accepts SaaS but not high-risk
      affiliate:     "restricted",  // many affiliate niches restricted
      cryptoNative:  false,         // explicit ban in Acceptable Use Policy
      // Wise supports multiple Business accounts under one login,
      // one account per legal entity, account switcher between them.
      // Not consolidated treasury — separate data per entity, no
      // group dashboard. "linkedOnly" is the honest middle state.
      multiEntity:   "linkedOnly",
      docFriction:   "medium",
      fxMarkup:      "from 0.33%",  // verified against wise.com/gb/pricing/business 2026-05-29
      swiftOut:      "£5-15",
      // Wise Nuqud Ltd has UAE Central Bank Retail Payment Services
      // and Card Schemes licence (May 2025). That's CBUAE consumer-
      // payments scope, not a DIFC/DFSA business-banking EMI — but
      // it IS a regulated UAE presence, so we no longer claim Altery
      // is "the only neobank with UAE licence".
      uaeLicence: "CBUAE retail payments (Wise Nuqud Ltd)",
      tariffTransparency: "partial", // pricing calculator live-quoted per route, no public corridor table
    },
  },
  revolut: {
    id: "revolut",
    name: "Revolut Business",
    type: "neobank",
    asof: "2026-05-29",
    sources: [
      "https://www.revolut.com/business/business-account-plans/",
      "https://help.revolut.com/business/help/merchant-accounts/setting-up-a-merchant-account/prohibited-and-restricted-industries-business-models-for-a-merchant-account/business/",
      "https://www.revolut.com/business/business-api/",
      "https://www.revolut.com/blog/post/is-revolut-fca-regulated/",
    ],
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.days",
      digitalNative: "partial",
      // Crypto exchanges / mining / FX-signal businesses are
      // prohibited on Revolut Business merchant accounts. (Revolut
      // offers crypto trading TO its consumer customers — different
      // product — but won't bank crypto-native operating companies.)
      cryptoNative:  false,
      affiliate:     "restricted",
      // Revolut publishes a "Link multiple Revolut Business accounts"
      // feature — accounts can be linked under one login but Revolut
      // explicitly states the linking does NOT share banking data
      // between accounts. So same linkedOnly model as Wise / Qonto.
      multiEntity:   "linkedOnly",
      docFriction:   "medium",
      // Allowance model: interbank rate within monthly cap (Basic
      // £1k, Grow £15k, Scale £60k), then ~0.6% above allowance.
      // 0% within cap can beat Altery any tier; over cap is closer.
      fxMarkup:      "0% in-cap / 0.6% above",
      swiftOut:      "£1-15",
      // Revolut Bank UK Ltd became a fully licensed UK bank in
      // March 2026 (PRA+FCA). Stronger than EMI safeguarding for
      // FSCS-protection messaging. No UAE presence.
      uaeLicence: null,
      tariffTransparency: "partial", // headline tiers public, in-cap/over-cap nuance varies by plan/country
    },
  },
  mercury: {
    id: "mercury",
    name: "Mercury",
    type: "neobank",
    asof: "2026-05-29",
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
    asof: "2026-05-29",
    sources: [
      "https://3s.money/pricing",
      "https://3s.money/dubai/",
    ],
    qualitative: {
      // 3S Money is the closest direct peer to Altery: licensed
      // EMI in UK (FCA), Luxembourg (CSSF), DIFC (DFSA — Branch
      // F007004) and HK (CED). Multi-jurisdiction is genuinely
      // theirs as much as ours. The honest Altery differentiation
      // here is PRICE POINT (3S Money €100/mo Standard + 3× balance
      // requirement vs Altery £50/mo Starter) and PUBLISHED tariff
      // (3S Money quotes FX/SWIFT in-app per relationship, not
      // public). Don't claim multi-jurisdiction as Altery-unique.
      onboardingKey: "ec.cmp.q.onboarding.days",   // RM-assisted but typically days, not weeks
      digitalNative: "partial",
      affiliate:     "caseByCase",
      cryptoNative:  "caseByCase",                  // no blanket public ban; RM-gated risk review
      multiEntity:   "linkedOnly",                  // admins access multiple entities under one login
      docFriction:   "medium",
      restriction:   "€100/mo floor + 3× balance",
      fxMarkup:      "On request",                  // not publicly disclosed
      swiftOut:      "€25-30 + intermediary",        // approx outbound SWIFT per third-party reviews
      uaeLicence: "DFSA Branch F007004 (DIFC)",
      tariffTransparency: "quoted",                  // in-app per relationship, not public
    },
  },
  payset: {
    id: "payset",
    name: "Payset",
    type: "neobank",
    asof: "2026-05-29",
    sources: [
      "https://www.payset.io/pricing",
      "https://service.payset.io/hc/en-us/articles/16190307357084-What-are-the-permitted-industries",
    ],
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.days",
      digitalNative: "partial",
      // Payset publishes a permitted-industries page that
      // EXPLICITLY lists Affiliates and Cryptocurrencies — they
      // serve both, subject to compliance review. That makes them
      // a more direct Altery competitor on high-risk willingness
      // than the rest of the neobank field.
      affiliate:     "caseByCase",
      cryptoNative:  "caseByCase",
      multiEntity:   false,
      docFriction:   "medium",
      fxMarkup:      "On request",
      swiftOut:      "from £8 + 0.3%",
      uaeLicence: null,
      tariffTransparency: "quoted",
    },
  },
  // EU-strong neobank — France/DE/ES/IT/PT licenses, B2B focused.
  // Qonto wins on UX vs traditional EU banks but, like every other
  // neobank in the comparison, can't host crypto businesses, doesn't
  // offer multi-company management, and doesn't span three regulated
  // entities the way Altery does. Goes into the EU capability table.
  qonto: {
    id: "qonto",
    name: "Qonto",
    type: "neobank",
    asof: "2026-05-29",
    sources: [
      "https://qonto.com/en/pricing",
      "https://support-fr.qonto.com/hc/en-us/articles/23947637582609-What-activities-are-prohibited-at-Qonto",
      "https://support-pt.qonto.com/hc/en-us/articles/38267512420369-Can-I-open-a-Qonto-account-if-my-main-business-is-cryptocurrencies",
    ],
    qualitative: {
      onboardingKey: "ec.cmp.q.onboarding.days",
      digitalNative: "partial",
      affiliate:     "caseByCase",
      // Qonto: mining, staking, NFTs, decentralised exchange, and
      // unregistered PSAN activity prohibited; regulated crypto
      // intermediaries CAN open if registered (e.g. AMF PSAN).
      // So bulk of crypto-native businesses are not served.
      cryptoNative:  false,
      // Qonto supports multi-organization on the user side — one
      // login, several orgs accessible via switcher. Same shape as
      // Wise / Revolut: linked but not consolidated.
      multiEntity:   "linkedOnly",
      docFriction:   "medium",
      // FX via Wise rails per public Qonto product pages (so
      // effective FX inherits Wise's ~0.33% floor for routed pairs).
      fxMarkup:      "via Wise (from 0.33%)",
      swiftOut:      "€5",   // EUR outside SEPA fixed; SEPA bundled in plan allowance
      uaeLicence: null,
      tariffTransparency: "partial", // monthly plans transparent; in-cap/over-cap less obvious
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
      // Same linkedOnly shape as Wise/Revolut/Qonto today —
      // separate balances/IBANs/cards per legal entity under one
      // login. Consolidated group treasury (cross-entity audit
      // log, group approvals) is future product. Don't overclaim.
      multiEntity:   "linkedOnly",
      docFriction:   "low",
      uaeLicence:    "DFSA EMI (DIFC)",
      tariffTransparency: "published",  // plan-tiered £50/100/300 with explicit FX + SWIFT %
      // FX/SWIFT come from the active plan — rendered dynamically
    },
  },
};

// ─────────────────────────────────────────────────────────────────
// Capability matrix — three-section "where Altery wins / where we're
// equal / where the bank may still serve you better" structure.
// Replaces the dense 6-column-attribute matrix that used to live on
// the result page and was moved to the PDF. The bank-wins section is
// the trust-driver: no competitor concedes anything. CFO reading
// "where the bank may still win" notices that the rest of the numbers
// are honest by association.
//
// `showIf` (optional) gates a row on a rec.* property — only render
// when that path on the recommendation is truthy. Used to keep the
// crypto-rails row out of the matrix for non-crypto businesses.
// ─────────────────────────────────────────────────────────────────
// Hidden bank costs — items banks DON'T publish on their pricing
// pages but DO charge customers. Two universal categories:
//   1. FX additional spread — banks publish e.g. 2.75% markup, but
//      their real total spread (wholesale-to-retail gap on top of
//      published markup) typically adds 50 bps. Customer never sees
//      the wholesale rate, so the gap stays invisible.
//   2. Correspondent SWIFT — when a SWIFT transfer hops through a
//      correspondent bank, each correspondent takes a chunk out of
//      the principal. Typical chain has 1-2 correspondents at
//      $15-30 each; we use £18 as a conservative average.
//
// Both are applied to the bank baseline ONLY in the "realistic"
// track of ecComputeCostBreakdown. The "conservative" track stays
// on published rates so each cell remains independently citation-
// backed (used for the headline savings range). Altery has no
// hidden costs to add — published markup is the worst case.
const EC_BANK_HIDDEN_COSTS = {
  fxAdditionalBps:       50,   // +0.50% on top of published markup
  swiftCorrespondentGbp: 18,   // typical correspondent fee per SWIFT tx
};

const EC_CAPABILITY_MATRIX = {
  alteryWins: [
    { titleKey: "ec.cap.win.fx",            detailKey: "ec.cap.win.fx.detail" },
    { titleKey: "ec.cap.win.swift",         detailKey: "ec.cap.win.swift.detail" },
    { titleKey: "ec.cap.win.onboarding",    detailKey: "ec.cap.win.onboarding.detail" },
    { titleKey: "ec.cap.win.transparency",  detailKey: "ec.cap.win.transparency.detail" },
    { titleKey: "ec.cap.win.kybSpecialist", detailKey: "ec.cap.win.kybSpecialist.detail" },
    { titleKey: "ec.cap.win.crypto",        detailKey: "ec.cap.win.crypto.detail",
      showIf: "cryptoActive" },
  ],
  comparable: [
    { titleKey: "ec.cap.equal.localPay",  detailKey: "ec.cap.equal.localPay.detail" },
    { titleKey: "ec.cap.equal.cards",     detailKey: "ec.cap.equal.cards.detail" },
    { titleKey: "ec.cap.equal.multiUser", detailKey: "ec.cap.equal.multiUser.detail" },
  ],
  bankWins: [
    { titleKey: "ec.cap.bank.cash",     detailKey: "ec.cap.bank.cash.detail" },
    { titleKey: "ec.cap.bank.credit",   detailKey: "ec.cap.bank.credit.detail" },
    { titleKey: "ec.cap.bank.assetFin", detailKey: "ec.cap.bank.assetFin.detail" },
    { titleKey: "ec.cap.bank.branches", detailKey: "ec.cap.bank.branches.detail" },
  ],
};

// Export all names to window so other scripts can reference them
// unqualified.
Object.assign(window, {
  EC_COUNTRIES, EC_DISPLAY_REGIONS, EC_COUNTRY_TO_REGION, EC_REGION_ORDER, EC_INDUSTRIES,
  EC_CHIP_REGIONS, EC_CHIP_REGION_ORDER, EC_CHIP_REGION_FLAG,
  EC_CAPABILITY_MATRIX, EC_BANK_HIDDEN_COSTS,
  EC_SERVICES, TOTAL_STEPS,
  EC_VOLUME_BANDS, EC_TX_BANDS, EC_FEE_SCHEDULE, EC_PLANS, EC_ENTITIES,
  EC_COMPARATORS, ecHeroIdentifier, maskTailDots, ecFeeRegion,
});
