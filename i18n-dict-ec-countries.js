// i18n-dict-ec-countries.js — Country + corridor name translations
// Used by Eligibility Checker (and elsewhere) for localized country lists.
// Codes match EC_COUNTRIES / EC_CORRIDORS in eligibility-checker.jsx.

(function () {
  const D = window.__I18N.DICT;

  // Helper: bulk-merge a country/corridor name map into a language dict,
  // prefixed with the given namespace ("ec.country." or "ec.corridor.").
  function add(lang, prefix, map) {
    Object.keys(map).forEach((code) => {
      D[lang][prefix + code] = map[code];
    });
  }

  // ─────────────── ENGLISH (source) ─────────────────────────────────
  // Complete map for every code in EC_COUNTRIES — used as the fallback
  // for languages that don't translate the long tail.
  add("en", "ec.country.", {
    // Europe
    AD: "Andorra", AT: "Austria", BE: "Belgium", BG: "Bulgaria", HR: "Croatia",
    CY: "Cyprus", CZ: "Czechia", DK: "Denmark", EE: "Estonia", FI: "Finland",
    FR: "France", DE: "Germany", GI: "Gibraltar", GR: "Greece", GG: "Guernsey",
    HU: "Hungary", IS: "Iceland", IE: "Ireland", IM: "Isle of Man", IT: "Italy",
    JE: "Jersey", LV: "Latvia", LI: "Liechtenstein", LT: "Lithuania",
    LU: "Luxembourg", MT: "Malta", MD: "Moldova", MC: "Monaco",
    NL: "Netherlands", MK: "North Macedonia", NO: "Norway", PL: "Poland",
    PT: "Portugal", RO: "Romania", SM: "San Marino", SK: "Slovakia",
    SI: "Slovenia", ES: "Spain", SE: "Sweden", CH: "Switzerland",
    UA: "Ukraine", GB: "United Kingdom",
    // Asia & Pacific
    AM: "Armenia", AU: "Australia", AZ: "Azerbaijan", BN: "Brunei Darussalam",
    CX: "Christmas Island", CC: "Cocos (Keeling) Islands", GE: "Georgia",
    HK: "Hong Kong", JP: "Japan", KZ: "Kazakhstan", KG: "Kyrgyzstan",
    MY: "Malaysia", MH: "Marshall Islands", NR: "Nauru", NZ: "New Zealand",
    NU: "Niue", PW: "Palau", PH: "Philippines", SG: "Singapore",
    LK: "Sri Lanka", TH: "Thailand", UZ: "Uzbekistan",
    // Americas
    AI: "Anguilla", AG: "Antigua and Barbuda", AW: "Aruba", BS: "Bahamas",
    BB: "Barbados", BZ: "Belize", BM: "Bermuda", CA: "Canada",
    KY: "Cayman Islands", CR: "Costa Rica", CW: "Curaçao", DM: "Dominica",
    DO: "Dominican Republic", GD: "Grenada", HN: "Honduras", MS: "Montserrat",
    PA: "Panama", PR: "Puerto Rico", KN: "Saint Kitts and Nevis",
    LC: "Saint Lucia", VC: "Saint Vincent and the Grenadines",
    SX: "Sint Maarten", TC: "Turks and Caicos Islands", US: "United States",
    VG: "British Virgin Islands",
    // Africa & Middle East
    GH: "Ghana", IL: "Israel", MU: "Mauritius", NG: "Nigeria",
    SA: "Saudi Arabia", SC: "Seychelles", ZA: "South Africa",
    AE: "United Arab Emirates",
  });
  add("en", "ec.corridor.", {
    // Europe
    GB: "UK", EU: "EU / EEA", CH: "Switzerland", TR: "Türkiye", UA: "Ukraine",
    // APAC
    HK: "Hong Kong", SG: "Singapore", CN: "China", IN: "India",
    JP: "Japan", KR: "South Korea", AU: "Australia", APAC: "Other Asia-Pacific",
    // Middle East
    AE: "UAE", SA: "Saudi Arabia", IL: "Israel",
    // Americas
    US: "USA", CA: "Canada", LATAM: "Latin America",
    // Africa
    ZA: "South Africa", AFRICA: "Other Africa",
    // Other
    ROW: "Other / rest of world",
  });
  add("en", "ec.corridor.group.", {
    europe: "Europe", apac: "Asia & Pacific", mena: "Middle East",
    americas: "Americas", africa: "Africa", other: "Other",
  });

  // ─────────────── РУССКИЙ ──────────────────────────────────────────
  // Complete map — Russian is a primary locale for Altery.
  add("ru", "ec.country.", {
    // Europe
    AD: "Андорра", AT: "Австрия", BE: "Бельгия", BG: "Болгария",
    HR: "Хорватия", CY: "Кипр", CZ: "Чехия", DK: "Дания", EE: "Эстония",
    FI: "Финляндия", FR: "Франция", DE: "Германия", GI: "Гибралтар",
    GR: "Греция", GG: "Гернси", HU: "Венгрия", IS: "Исландия",
    IE: "Ирландия", IM: "Остров Мэн", IT: "Италия", JE: "Джерси",
    LV: "Латвия", LI: "Лихтенштейн", LT: "Литва", LU: "Люксембург",
    MT: "Мальта", MD: "Молдова", MC: "Монако", NL: "Нидерланды",
    MK: "Северная Македония", NO: "Норвегия", PL: "Польша",
    PT: "Португалия", RO: "Румыния", SM: "Сан-Марино", SK: "Словакия",
    SI: "Словения", ES: "Испания", SE: "Швеция", CH: "Швейцария",
    UA: "Украина", GB: "Великобритания",
    // Asia & Pacific
    AM: "Армения", AU: "Австралия", AZ: "Азербайджан", BN: "Бруней",
    CX: "Остров Рождества", CC: "Кокосовые острова", GE: "Грузия",
    HK: "Гонконг", JP: "Япония", KZ: "Казахстан", KG: "Киргизия",
    MY: "Малайзия", MH: "Маршалловы Острова", NR: "Науру",
    NZ: "Новая Зеландия", NU: "Ниуэ", PW: "Палау", PH: "Филиппины",
    SG: "Сингапур", LK: "Шри-Ланка", TH: "Таиланд", UZ: "Узбекистан",
    // Americas
    AI: "Ангилья", AG: "Антигуа и Барбуда", AW: "Аруба", BS: "Багамы",
    BB: "Барбадос", BZ: "Белиз", BM: "Бермуды", CA: "Канада",
    KY: "Каймановы Острова", CR: "Коста-Рика", CW: "Кюрасао",
    DM: "Доминика", DO: "Доминиканская Республика", GD: "Гренада",
    HN: "Гондурас", MS: "Монтсеррат", PA: "Панама", PR: "Пуэрто-Рико",
    KN: "Сент-Китс и Невис", LC: "Сент-Люсия",
    VC: "Сент-Винсент и Гренадины", SX: "Синт-Мартен",
    TC: "Острова Тёркс и Кайкос", US: "США",
    VG: "Британские Виргинские острова",
    // Africa & Middle East
    GH: "Гана", IL: "Израиль", MU: "Маврикий", NG: "Нигерия",
    SA: "Саудовская Аравия", SC: "Сейшелы", ZA: "ЮАР", AE: "ОАЭ",
  });
  add("ru", "ec.corridor.", {
    GB: "Великобритания", EU: "ЕС / ЕЭП", CH: "Швейцария",
    TR: "Турция", UA: "Украина",
    HK: "Гонконг", SG: "Сингапур", CN: "Китай", IN: "Индия",
    JP: "Япония", KR: "Южная Корея", AU: "Австралия",
    APAC: "Другая часть Азии и Тихого океана",
    AE: "ОАЭ", SA: "Саудовская Аравия", IL: "Израиль",
    US: "США", CA: "Канада", LATAM: "Латинская Америка",
    ZA: "ЮАР", AFRICA: "Другие страны Африки",
    ROW: "Прочие страны",
  });
  add("ru", "ec.corridor.group.", {
    europe: "Европа", apac: "Азия и Тихий океан", mena: "Ближний Восток",
    americas: "Америка", africa: "Африка", other: "Другое",
  });

  // ─────────────── DEUTSCH (top corridors only; long tail → EN) ─────
  add("de", "ec.country.", {
    GB: "Vereinigtes Königreich", IE: "Irland", DE: "Deutschland",
    NL: "Niederlande", FR: "Frankreich", ES: "Spanien", IT: "Italien",
    PL: "Polen", PT: "Portugal", CH: "Schweiz",
    AE: "Vereinigte Arabische Emirate", SG: "Singapur",
    US: "Vereinigte Staaten", HK: "Hongkong", CA: "Kanada",
    AT: "Österreich", BE: "Belgien", DK: "Dänemark", FI: "Finnland",
    GR: "Griechenland", HU: "Ungarn", IS: "Island", LU: "Luxemburg",
    NO: "Norwegen", SE: "Schweden", UA: "Ukraine", CZ: "Tschechien",
    HR: "Kroatien", CY: "Zypern", EE: "Estland", LV: "Lettland",
    LT: "Litauen", MT: "Malta", RO: "Rumänien", SK: "Slowakei",
    SI: "Slowenien", BG: "Bulgarien", MD: "Moldau", MC: "Monaco",
    MK: "Nordmazedonien", SM: "San Marino", LI: "Liechtenstein",
    AD: "Andorra", GI: "Gibraltar", GG: "Guernsey", IM: "Isle of Man",
    JE: "Jersey", JP: "Japan", KZ: "Kasachstan", KG: "Kirgisistan",
    AU: "Australien", NZ: "Neuseeland", PH: "Philippinen", TH: "Thailand",
    AM: "Armenien", AZ: "Aserbaidschan", GE: "Georgien", UZ: "Usbekistan",
    BN: "Brunei", MY: "Malaysia", SA: "Saudi-Arabien", IL: "Israel",
    ZA: "Südafrika", NG: "Nigeria", GH: "Ghana", MU: "Mauritius",
    SC: "Seychellen",
  });
  add("de", "ec.corridor.", {
    GB: "UK", EU: "EU / EWR", CH: "Schweiz", TR: "Türkei", UA: "Ukraine",
    HK: "Hongkong", SG: "Singapur", CN: "China", IN: "Indien",
    JP: "Japan", KR: "Südkorea", AU: "Australien", APAC: "Übriger asiatisch-pazifischer Raum",
    AE: "VAE", SA: "Saudi-Arabien", IL: "Israel",
    US: "USA", CA: "Kanada", LATAM: "Lateinamerika",
    ZA: "Südafrika", AFRICA: "Übriges Afrika",
    ROW: "Sonstige Länder",
  });
  add("de", "ec.corridor.group.", {
    europe: "Europa", apac: "Asien & Pazifik", mena: "Naher Osten",
    americas: "Amerika", africa: "Afrika", other: "Sonstige",
  });

  // ─────────────── NEDERLANDS ───────────────────────────────────────
  add("nl", "ec.country.", {
    GB: "Verenigd Koninkrijk", IE: "Ierland", DE: "Duitsland",
    NL: "Nederland", FR: "Frankrijk", ES: "Spanje", IT: "Italië",
    PL: "Polen", PT: "Portugal", CH: "Zwitserland",
    AE: "Verenigde Arabische Emiraten", SG: "Singapore",
    US: "Verenigde Staten", HK: "Hongkong", CA: "Canada",
    AT: "Oostenrijk", BE: "België", DK: "Denemarken", FI: "Finland",
    GR: "Griekenland", HU: "Hongarije", IS: "IJsland", LU: "Luxemburg",
    NO: "Noorwegen", SE: "Zweden", UA: "Oekraïne", CZ: "Tsjechië",
    HR: "Kroatië", CY: "Cyprus", EE: "Estland", LV: "Letland",
    LT: "Litouwen", MT: "Malta", RO: "Roemenië", SK: "Slowakije",
    SI: "Slovenië", BG: "Bulgarije", MD: "Moldavië", MC: "Monaco",
    MK: "Noord-Macedonië", SM: "San Marino", LI: "Liechtenstein",
    JP: "Japan", KZ: "Kazachstan", AU: "Australië", NZ: "Nieuw-Zeeland",
    SA: "Saoedi-Arabië", IL: "Israël", ZA: "Zuid-Afrika",
  });
  add("nl", "ec.corridor.", {
    GB: "VK", EU: "EU / EER", CH: "Zwitserland", TR: "Turkije", UA: "Oekraïne",
    HK: "Hongkong", SG: "Singapore", CN: "China", IN: "India",
    JP: "Japan", KR: "Zuid-Korea", AU: "Australië", APAC: "Overig Azië-Pacific",
    AE: "VAE", SA: "Saoedi-Arabië", IL: "Israël",
    US: "VS", CA: "Canada", LATAM: "Latijns-Amerika",
    ZA: "Zuid-Afrika", AFRICA: "Overig Afrika",
    ROW: "Overige landen",
  });
  add("nl", "ec.corridor.group.", {
    europe: "Europa", apac: "Azië & Pacific", mena: "Midden-Oosten",
    americas: "Amerika", africa: "Afrika", other: "Overig",
  });

  // ─────────────── TÜRKÇE ───────────────────────────────────────────
  add("tr", "ec.country.", {
    GB: "Birleşik Krallık", IE: "İrlanda", DE: "Almanya", NL: "Hollanda",
    FR: "Fransa", ES: "İspanya", IT: "İtalya", PL: "Polonya",
    PT: "Portekiz", CH: "İsviçre", AE: "Birleşik Arap Emirlikleri",
    SG: "Singapur", US: "Amerika Birleşik Devletleri", HK: "Hong Kong",
    CA: "Kanada", AT: "Avusturya", BE: "Belçika", DK: "Danimarka",
    FI: "Finlandiya", GR: "Yunanistan", HU: "Macaristan", IS: "İzlanda",
    LU: "Lüksemburg", NO: "Norveç", SE: "İsveç", UA: "Ukrayna",
    CZ: "Çekya", HR: "Hırvatistan", CY: "Kıbrıs", EE: "Estonya",
    LV: "Letonya", LT: "Litvanya", MT: "Malta", RO: "Romanya",
    SK: "Slovakya", SI: "Slovenya", BG: "Bulgaristan", MD: "Moldova",
    MC: "Monako", MK: "Kuzey Makedonya", AZ: "Azerbaycan",
    GE: "Gürcistan", KZ: "Kazakistan", UZ: "Özbekistan", JP: "Japonya",
    SA: "Suudi Arabistan", IL: "İsrail", ZA: "Güney Afrika",
  });
  add("tr", "ec.corridor.", {
    GB: "Birleşik Krallık", EU: "AB / AEA", CH: "İsviçre",
    TR: "Türkiye", UA: "Ukrayna",
    HK: "Hong Kong", SG: "Singapur", CN: "Çin", IN: "Hindistan",
    JP: "Japonya", KR: "Güney Kore", AU: "Avustralya",
    APAC: "Diğer Asya-Pasifik",
    AE: "BAE", SA: "Suudi Arabistan", IL: "İsrail",
    US: "ABD", CA: "Kanada", LATAM: "Latin Amerika",
    ZA: "Güney Afrika", AFRICA: "Diğer Afrika",
    ROW: "Diğer / dünya geneli",
  });
  add("tr", "ec.corridor.group.", {
    europe: "Avrupa", apac: "Asya & Pasifik", mena: "Orta Doğu",
    americas: "Amerika", africa: "Afrika", other: "Diğer",
  });

  // ─────────────── ITALIANO ─────────────────────────────────────────
  add("it", "ec.country.", {
    GB: "Regno Unito", IE: "Irlanda", DE: "Germania", NL: "Paesi Bassi",
    FR: "Francia", ES: "Spagna", IT: "Italia", PL: "Polonia",
    PT: "Portogallo", CH: "Svizzera", AE: "Emirati Arabi Uniti",
    SG: "Singapore", US: "Stati Uniti", HK: "Hong Kong", CA: "Canada",
    AT: "Austria", BE: "Belgio", DK: "Danimarca", FI: "Finlandia",
    GR: "Grecia", HU: "Ungheria", IS: "Islanda", LU: "Lussemburgo",
    NO: "Norvegia", SE: "Svezia", UA: "Ucraina", CZ: "Cechia",
    HR: "Croazia", CY: "Cipro", EE: "Estonia", LV: "Lettonia",
    LT: "Lituania", MT: "Malta", RO: "Romania", SK: "Slovacchia",
    SI: "Slovenia", BG: "Bulgaria", MD: "Moldavia", MC: "Monaco",
    MK: "Macedonia del Nord", JP: "Giappone", KZ: "Kazakistan",
    AU: "Australia", NZ: "Nuova Zelanda", SA: "Arabia Saudita",
    IL: "Israele", ZA: "Sudafrica",
  });
  add("it", "ec.corridor.", {
    GB: "Regno Unito", EU: "UE / SEE", CH: "Svizzera",
    TR: "Türkiye", UA: "Ucraina",
    HK: "Hong Kong", SG: "Singapore", CN: "Cina", IN: "India",
    JP: "Giappone", KR: "Corea del Sud", AU: "Australia",
    APAC: "Altre aree Asia-Pacifico",
    AE: "EAU", SA: "Arabia Saudita", IL: "Israele",
    US: "USA", CA: "Canada", LATAM: "America Latina",
    ZA: "Sudafrica", AFRICA: "Altre aree Africa",
    ROW: "Altri paesi",
  });
  add("it", "ec.corridor.group.", {
    europe: "Europa", apac: "Asia e Pacifico", mena: "Medio Oriente",
    americas: "Americhe", africa: "Africa", other: "Altro",
  });

  // ─────────────── ESPAÑOL ──────────────────────────────────────────
  add("es", "ec.country.", {
    GB: "Reino Unido", IE: "Irlanda", DE: "Alemania",
    NL: "Países Bajos", FR: "Francia", ES: "España", IT: "Italia",
    PL: "Polonia", PT: "Portugal", CH: "Suiza",
    AE: "Emiratos Árabes Unidos", SG: "Singapur", US: "Estados Unidos",
    HK: "Hong Kong", CA: "Canadá", AT: "Austria", BE: "Bélgica",
    DK: "Dinamarca", FI: "Finlandia", GR: "Grecia", HU: "Hungría",
    IS: "Islandia", LU: "Luxemburgo", NO: "Noruega", SE: "Suecia",
    UA: "Ucrania", CZ: "Chequia", HR: "Croacia", CY: "Chipre",
    EE: "Estonia", LV: "Letonia", LT: "Lituania", MT: "Malta",
    RO: "Rumanía", SK: "Eslovaquia", SI: "Eslovenia", BG: "Bulgaria",
    MD: "Moldavia", MC: "Mónaco", MK: "Macedonia del Norte",
    JP: "Japón", KZ: "Kazajistán", AU: "Australia", NZ: "Nueva Zelanda",
    SA: "Arabia Saudita", IL: "Israel", ZA: "Sudáfrica",
  });
  add("es", "ec.corridor.", {
    GB: "Reino Unido", EU: "UE / EEE", CH: "Suiza",
    TR: "Türkiye", UA: "Ucrania",
    HK: "Hong Kong", SG: "Singapur", CN: "China", IN: "India",
    JP: "Japón", KR: "Corea del Sur", AU: "Australia",
    APAC: "Resto de Asia-Pacífico",
    AE: "EAU", SA: "Arabia Saudita", IL: "Israel",
    US: "EE. UU.", CA: "Canadá", LATAM: "América Latina",
    ZA: "Sudáfrica", AFRICA: "Resto de África",
    ROW: "Otros países",
  });
  add("es", "ec.corridor.group.", {
    europe: "Europa", apac: "Asia y Pacífico", mena: "Oriente Medio",
    americas: "América", africa: "África", other: "Otros",
  });

  // ─────────────── POLSKI ───────────────────────────────────────────
  add("pl", "ec.country.", {
    GB: "Wielka Brytania", IE: "Irlandia", DE: "Niemcy", NL: "Holandia",
    FR: "Francja", ES: "Hiszpania", IT: "Włochy", PL: "Polska",
    PT: "Portugalia", CH: "Szwajcaria",
    AE: "Zjednoczone Emiraty Arabskie", SG: "Singapur",
    US: "Stany Zjednoczone", HK: "Hongkong", CA: "Kanada", AT: "Austria",
    BE: "Belgia", DK: "Dania", FI: "Finlandia", GR: "Grecja",
    HU: "Węgry", IS: "Islandia", LU: "Luksemburg", NO: "Norwegia",
    SE: "Szwecja", UA: "Ukraina", CZ: "Czechy", HR: "Chorwacja",
    CY: "Cypr", EE: "Estonia", LV: "Łotwa", LT: "Litwa", MT: "Malta",
    RO: "Rumunia", SK: "Słowacja", SI: "Słowenia", BG: "Bułgaria",
    MD: "Mołdawia", MC: "Monako", MK: "Macedonia Północna",
    JP: "Japonia", KZ: "Kazachstan", AU: "Australia",
    NZ: "Nowa Zelandia", SA: "Arabia Saudyjska", IL: "Izrael",
    ZA: "RPA",
  });
  add("pl", "ec.corridor.", {
    GB: "Wielka Brytania", EU: "UE / EOG", CH: "Szwajcaria",
    TR: "Türkiye", UA: "Ukraina",
    HK: "Hongkong", SG: "Singapur", CN: "Chiny", IN: "Indie",
    JP: "Japonia", KR: "Korea Południowa", AU: "Australia",
    APAC: "Pozostała Azja i Pacyfik",
    AE: "ZEA", SA: "Arabia Saudyjska", IL: "Izrael",
    US: "USA", CA: "Kanada", LATAM: "Ameryka Łacińska",
    ZA: "RPA", AFRICA: "Pozostała Afryka",
    ROW: "Pozostałe kraje",
  });
  add("pl", "ec.corridor.group.", {
    europe: "Europa", apac: "Azja i Pacyfik", mena: "Bliski Wschód",
    americas: "Ameryki", africa: "Afryka", other: "Inne",
  });

  // ─────────────── PORTUGUÊS ────────────────────────────────────────
  add("pt", "ec.country.", {
    GB: "Reino Unido", IE: "Irlanda", DE: "Alemanha",
    NL: "Países Baixos", FR: "França", ES: "Espanha", IT: "Itália",
    PL: "Polónia", PT: "Portugal", CH: "Suíça",
    AE: "Emirados Árabes Unidos", SG: "Singapura",
    US: "Estados Unidos", HK: "Hong Kong", CA: "Canadá", AT: "Áustria",
    BE: "Bélgica", DK: "Dinamarca", FI: "Finlândia", GR: "Grécia",
    HU: "Hungria", IS: "Islândia", LU: "Luxemburgo", NO: "Noruega",
    SE: "Suécia", UA: "Ucrânia", CZ: "Chéquia", HR: "Croácia",
    CY: "Chipre", EE: "Estónia", LV: "Letónia", LT: "Lituânia",
    MT: "Malta", RO: "Roménia", SK: "Eslováquia", SI: "Eslovénia",
    BG: "Bulgária", MD: "Moldávia", MC: "Mónaco",
    MK: "Macedónia do Norte", JP: "Japão", KZ: "Cazaquistão",
    AU: "Austrália", NZ: "Nova Zelândia", SA: "Arábia Saudita",
    IL: "Israel", ZA: "África do Sul",
  });
  add("pt", "ec.corridor.", {
    GB: "Reino Unido", EU: "UE / EEE", CH: "Suíça",
    TR: "Türkiye", UA: "Ucrânia",
    HK: "Hong Kong", SG: "Singapura", CN: "China", IN: "Índia",
    JP: "Japão", KR: "Coreia do Sul", AU: "Austrália",
    APAC: "Restante Ásia-Pacífico",
    AE: "EAU", SA: "Arábia Saudita", IL: "Israel",
    US: "EUA", CA: "Canadá", LATAM: "América Latina",
    ZA: "África do Sul", AFRICA: "Restante África",
    ROW: "Outros países",
  });
  add("pt", "ec.corridor.group.", {
    europe: "Europa", apac: "Ásia e Pacífico", mena: "Médio Oriente",
    americas: "Américas", africa: "África", other: "Outros",
  });

  // ─────────────── FRANÇAIS ─────────────────────────────────────────
  add("fr", "ec.country.", {
    GB: "Royaume-Uni", IE: "Irlande", DE: "Allemagne", NL: "Pays-Bas",
    FR: "France", ES: "Espagne", IT: "Italie", PL: "Pologne",
    PT: "Portugal", CH: "Suisse", AE: "Émirats arabes unis",
    SG: "Singapour", US: "États-Unis", HK: "Hong Kong", CA: "Canada",
    AT: "Autriche", BE: "Belgique", DK: "Danemark", FI: "Finlande",
    GR: "Grèce", HU: "Hongrie", IS: "Islande", LU: "Luxembourg",
    NO: "Norvège", SE: "Suède", UA: "Ukraine", CZ: "Tchéquie",
    HR: "Croatie", CY: "Chypre", EE: "Estonie", LV: "Lettonie",
    LT: "Lituanie", MT: "Malte", RO: "Roumanie", SK: "Slovaquie",
    SI: "Slovénie", BG: "Bulgarie", MD: "Moldavie", MC: "Monaco",
    MK: "Macédoine du Nord", JP: "Japon", KZ: "Kazakhstan",
    AU: "Australie", NZ: "Nouvelle-Zélande", SA: "Arabie saoudite",
    IL: "Israël", ZA: "Afrique du Sud",
  });
  add("fr", "ec.corridor.", {
    GB: "Royaume-Uni", EU: "UE / EEE", CH: "Suisse",
    TR: "Türkiye", UA: "Ukraine",
    HK: "Hong Kong", SG: "Singapour", CN: "Chine", IN: "Inde",
    JP: "Japon", KR: "Corée du Sud", AU: "Australie",
    APAC: "Reste de l'Asie-Pacifique",
    AE: "EAU", SA: "Arabie saoudite", IL: "Israël",
    US: "États-Unis", CA: "Canada", LATAM: "Amérique latine",
    ZA: "Afrique du Sud", AFRICA: "Reste de l'Afrique",
    ROW: "Autres pays",
  });
  add("fr", "ec.corridor.group.", {
    europe: "Europe", apac: "Asie et Pacifique", mena: "Moyen-Orient",
    americas: "Amériques", africa: "Afrique", other: "Autres",
  });

  // ──────────────── Missing-country backfill ──────────────────────
  // EG (Egypt) and TR (Türkiye) appear in EC_ENTITIES.mena.countries
  // as supported transfer destinations for MENA-onboarded businesses,
  // but they're not in EC_COUNTRIES (you can't register a business
  // there with Altery). The result page renders them as flags+names
  // via t("ec.country." + c), so they need translations in every
  // dict to avoid leaking raw keys like "ec.country.EG" into the UI.
  // "Türkiye" matches the corridor-side translation already in place
  // and follows the UN/Stripe convention since 2022.
  add("en", "ec.country.", { EG: "Egypt",     TR: "Türkiye" });
  add("ru", "ec.country.", { EG: "Египет",    TR: "Турция" });
  add("de", "ec.country.", { EG: "Ägypten",   TR: "Türkei" });
  add("nl", "ec.country.", { EG: "Egypte",    TR: "Turkije" });
  add("tr", "ec.country.", { EG: "Mısır",     TR: "Türkiye" });
  add("it", "ec.country.", { EG: "Egitto",    TR: "Turchia" });
  add("es", "ec.country.", { EG: "Egipto",    TR: "Türkiye" });
  add("pl", "ec.country.", { EG: "Egipt",     TR: "Turcja" });
  add("pt", "ec.country.", { EG: "Egito",     TR: "Türkiye" });
  add("fr", "ec.country.", { EG: "Égypte",    TR: "Türkiye" });

  // ─────────── Q5 / crypto-exposure question + result reroute callout ──────────
  // Strings for the new Q5 step and the result-page "Why UK, not EU?" callout
  // that appears only when an EU-incorporated company answers "yes" to crypto.
  // Kept in a single block per language so additions/edits stay together.
  // {country} interpolated at render time with the localised country name.
  Object.assign(D.en, {
    "ec.q6.title": "Does your business handle crypto?",
    "ec.q6.lead": "We mean broadly — accepting crypto payments, holding it as treasury, or running a crypto-native service all count. The answer can change which Altery entity opens your account.",
    "ec.q6.field.label": "Crypto exposure",
    "ec.q6.opt.none.title": "Fiat only",
    "ec.q6.opt.none.desc": "We don't accept, hold, or process crypto in any form.",
    "ec.q6.opt.yes.title": "Yes, crypto involved",
    "ec.q6.opt.yes.desc": "We accept crypto payments, hold digital assets, or run a crypto-native service.",
    "ec.q6.alert.reroute.title": "Heads up: this routes you to our UK entity",
    "ec.q6.alert.reroute.body": "Your {country} incorporation would normally route to Altery EU (Cyprus, CBC), but Cyprus EMI doesn't onboard crypto businesses. We'll open your account with Altery Ltd (UK, FCA-authorised), which can serve crypto operations.",
    "ec.r.reroute.title": "Why UK, not EU?",
    "ec.r.reroute.body": "Your {country} incorporation would normally route to Altery EU (Cyprus, CBC), but Cyprus EMI doesn't onboard crypto businesses. You're with Altery Ltd (UK, FCA-authorised) instead — it can serve crypto operations across Faster Payments, SEPA and SWIFT rails.",
  });
  Object.assign(D.ru, {
    "ec.q6.title": "Работает ли ваш бизнес с криптой?",
    "ec.q6.lead": "В широком смысле — приём крипто-платежей, хранение цифровых активов в казне или крипто-нативный сервис. Ответ может изменить, через какую лицензию Altery мы откроем счёт.",
    "ec.q6.field.label": "Криптовалюты",
    "ec.q6.opt.none.title": "Только фиат",
    "ec.q6.opt.none.desc": "Не принимаем, не храним и не обрабатываем криптовалюту.",
    "ec.q6.opt.yes.title": "Да, есть крипта",
    "ec.q6.opt.yes.desc": "Принимаем крипто-платежи, держим цифровые активы или ведём крипто-нативный сервис.",
    "ec.q6.alert.reroute.title": "Меняем маршрут на британскую лицензию",
    "ec.q6.alert.reroute.body": "Регистрация в стране {country} обычно ведёт к Altery EU (Кипр, CBC), но кипрская EMI не работает с крипто-бизнесом. Откроем счёт через Altery Ltd (Великобритания, FCA) — она поддерживает крипто-операции.",
    "ec.r.reroute.title": "Почему UK, а не EU?",
    "ec.r.reroute.body": "Регистрация в стране {country} обычно ведёт к Altery EU (Кипр, CBC), но кипрская EMI не работает с крипто-бизнесом. Поэтому вы у Altery Ltd (Великобритания, FCA) — она работает с криптой через Faster Payments, SEPA и SWIFT.",
  });
  Object.assign(D.de, {
    "ec.q6.title": "Arbeitet Ihr Unternehmen mit Krypto?",
    "ec.q6.lead": "Im weiten Sinne — Krypto-Zahlungen akzeptieren, digitale Vermögenswerte halten oder einen Krypto-nativen Dienst betreiben. Die Antwort kann ändern, mit welcher Altery-Einheit wir Ihr Konto eröffnen.",
    "ec.q6.field.label": "Krypto-Exposition",
    "ec.q6.opt.none.title": "Nur Fiat",
    "ec.q6.opt.none.desc": "Wir akzeptieren, halten oder verarbeiten keine Krypto-Werte.",
    "ec.q6.opt.yes.title": "Ja, mit Krypto",
    "ec.q6.opt.yes.desc": "Wir akzeptieren Krypto-Zahlungen, halten digitale Vermögenswerte oder betreiben einen Krypto-Dienst.",
    "ec.q6.alert.reroute.title": "Hinweis: Wir leiten Sie zu unserer UK-Einheit weiter",
    "ec.q6.alert.reroute.body": "Ihre Eintragung in {country} würde normalerweise zu Altery EU (Zypern, CBC) führen, aber die zypriotische EMI-Lizenz erlaubt kein Onboarding von Krypto-Unternehmen. Wir eröffnen Ihr Konto bei Altery Ltd (UK, FCA-lizenziert), die Krypto-Geschäfte abdecken kann.",
    "ec.r.reroute.title": "Warum UK statt EU?",
    "ec.r.reroute.body": "Ihre Eintragung in {country} würde normalerweise zu Altery EU (Zypern, CBC) führen, aber die zypriotische EMI-Lizenz deckt keine Krypto-Unternehmen ab. Sie sind stattdessen bei Altery Ltd (UK, FCA) — sie kann Krypto-Geschäfte über Faster Payments, SEPA und SWIFT bedienen.",
  });
  Object.assign(D.nl, {
    "ec.q6.title": "Werkt uw bedrijf met crypto?",
    "ec.q6.lead": "Bedoeld in brede zin — crypto-betalingen accepteren, digitale activa in beheer hebben of een crypto-native dienst aanbieden. Het antwoord kan veranderen via welke Altery-entiteit we uw rekening openen.",
    "ec.q6.field.label": "Crypto-blootstelling",
    "ec.q6.opt.none.title": "Alleen fiat",
    "ec.q6.opt.none.desc": "We accepteren, houden of verwerken geen crypto in enige vorm.",
    "ec.q6.opt.yes.title": "Ja, met crypto",
    "ec.q6.opt.yes.desc": "We accepteren crypto-betalingen, houden digitale activa aan of zijn een crypto-native dienst.",
    "ec.q6.alert.reroute.title": "Let op: we routeren u naar onze UK-entiteit",
    "ec.q6.alert.reroute.body": "Uw inschrijving in {country} zou normaal gesproken naar Altery EU (Cyprus, CBC) gaan, maar Cyprus EMI onboardt geen crypto-bedrijven. We openen uw rekening bij Altery Ltd (UK, FCA-vergund), die crypto-operaties wel kan ondersteunen.",
    "ec.r.reroute.title": "Waarom UK, niet EU?",
    "ec.r.reroute.body": "Uw inschrijving in {country} zou normaal naar Altery EU (Cyprus, CBC) gaan, maar Cyprus EMI dekt geen crypto-bedrijven. U bent in plaats daarvan bij Altery Ltd (UK, FCA) — zij kunnen crypto-operaties bedienen via Faster Payments, SEPA en SWIFT.",
  });
  Object.assign(D.tr, {
    "ec.q6.title": "İşletmeniz kripto ile çalışıyor mu?",
    "ec.q6.lead": "Geniş anlamda — kripto ödeme kabul etmek, dijital varlık tutmak veya kripto-yerli bir hizmet işletmek. Yanıt, Altery'nin hangi lisansıyla hesap açacağımızı değiştirebilir.",
    "ec.q6.field.label": "Kripto faaliyeti",
    "ec.q6.opt.none.title": "Sadece fiat",
    "ec.q6.opt.none.desc": "Hiçbir biçimde kripto kabul etmiyor, tutmuyor veya işlemiyoruz.",
    "ec.q6.opt.yes.title": "Evet, kripto var",
    "ec.q6.opt.yes.desc": "Kripto ödeme kabul ediyor, dijital varlık tutuyor veya kripto-yerli hizmet veriyoruz.",
    "ec.q6.alert.reroute.title": "Bilgi: Sizi UK lisansımıza yönlendiriyoruz",
    "ec.q6.alert.reroute.body": "{country} tescili normalde Altery EU (Kıbrıs, CBC) yönlendirilirdi, ancak Kıbrıs EMI lisansı kripto işletmelerini kabul etmiyor. Hesabınızı kripto faaliyetlerini destekleyen Altery Ltd (Birleşik Krallık, FCA) ile açacağız.",
    "ec.r.reroute.title": "Neden UK, EU değil?",
    "ec.r.reroute.body": "{country} tescili normalde Altery EU (Kıbrıs, CBC) olurdu, ancak Kıbrıs EMI kripto işletmelerini kapsamıyor. Bunun yerine Altery Ltd (Birleşik Krallık, FCA) ile birliktesiniz — Faster Payments, SEPA ve SWIFT üzerinden kripto operasyonlarını destekleyebilir.",
  });
  Object.assign(D.it, {
    "ec.q6.title": "La tua attività opera con crypto?",
    "ec.q6.lead": "In senso ampio — accettare pagamenti in crypto, detenere asset digitali in tesoreria o gestire un servizio crypto-nativo. La risposta può cambiare quale entità Altery aprirà il tuo conto.",
    "ec.q6.field.label": "Esposizione crypto",
    "ec.q6.opt.none.title": "Solo fiat",
    "ec.q6.opt.none.desc": "Non accettiamo, deteniamo o trattiamo crypto in alcuna forma.",
    "ec.q6.opt.yes.title": "Sì, crypto coinvolto",
    "ec.q6.opt.yes.desc": "Accettiamo pagamenti in crypto, deteniamo asset digitali o gestiamo un servizio crypto-nativo.",
    "ec.q6.alert.reroute.title": "Nota: ti indirizziamo all'entità UK",
    "ec.q6.alert.reroute.body": "La tua registrazione in {country} di norma porterebbe a Altery EU (Cipro, CBC), ma la licenza EMI di Cipro non accoglie attività crypto. Apriremo il tuo conto con Altery Ltd (UK, FCA), che può servire operazioni crypto.",
    "ec.r.reroute.title": "Perché UK, non EU?",
    "ec.r.reroute.body": "La tua registrazione in {country} di norma porterebbe a Altery EU (Cipro, CBC), ma la licenza EMI di Cipro non copre attività crypto. Sei invece con Altery Ltd (UK, FCA) — può servire operazioni crypto su Faster Payments, SEPA e SWIFT.",
  });
  Object.assign(D.es, {
    "ec.q6.title": "¿Tu empresa trabaja con cripto?",
    "ec.q6.lead": "En sentido amplio — aceptar pagos en cripto, mantener activos digitales en tesorería u ofrecer un servicio cripto-nativo. La respuesta puede cambiar qué entidad de Altery abre tu cuenta.",
    "ec.q6.field.label": "Exposición a cripto",
    "ec.q6.opt.none.title": "Solo fiat",
    "ec.q6.opt.none.desc": "No aceptamos, mantenemos ni procesamos cripto en ninguna forma.",
    "ec.q6.opt.yes.title": "Sí, con cripto",
    "ec.q6.opt.yes.desc": "Aceptamos pagos en cripto, mantenemos activos digitales o tenemos servicio cripto-nativo.",
    "ec.q6.alert.reroute.title": "Aviso: te redirigimos a nuestra entidad UK",
    "ec.q6.alert.reroute.body": "Tu constitución en {country} normalmente iría a Altery EU (Chipre, CBC), pero la licencia EMI de Chipre no admite negocios cripto. Abriremos tu cuenta con Altery Ltd (Reino Unido, FCA), que sí puede atender operaciones cripto.",
    "ec.r.reroute.title": "¿Por qué UK y no EU?",
    "ec.r.reroute.body": "Tu constitución en {country} normalmente iría a Altery EU (Chipre, CBC), pero la licencia EMI de Chipre no cubre negocios cripto. Estás con Altery Ltd (Reino Unido, FCA) — puede atender operaciones cripto en Faster Payments, SEPA y SWIFT.",
  });
  Object.assign(D.pl, {
    "ec.q6.title": "Czy Twoja firma działa z kryptowalutami?",
    "ec.q6.lead": "W szerokim sensie — przyjmowanie płatności w krypto, trzymanie aktywów cyfrowych w skarbcu lub prowadzenie usługi crypto-native. Odpowiedź może zmienić, z którą licencją Altery otworzymy konto.",
    "ec.q6.field.label": "Ekspozycja na krypto",
    "ec.q6.opt.none.title": "Tylko fiat",
    "ec.q6.opt.none.desc": "Nie przyjmujemy, nie trzymamy ani nie przetwarzamy krypto w żadnej formie.",
    "ec.q6.opt.yes.title": "Tak, krypto w grze",
    "ec.q6.opt.yes.desc": "Przyjmujemy płatności krypto, trzymamy aktywa cyfrowe lub prowadzimy usługę crypto-native.",
    "ec.q6.alert.reroute.title": "Uwaga: kierujemy do naszej brytyjskiej spółki",
    "ec.q6.alert.reroute.body": "Rejestracja w {country} zwykle prowadziłaby do Altery EU (Cypr, CBC), ale cypryjska licencja EMI nie obsługuje firm krypto. Otworzymy konto z Altery Ltd (Wielka Brytania, FCA), która obsługuje operacje krypto.",
    "ec.r.reroute.title": "Dlaczego UK, a nie EU?",
    "ec.r.reroute.body": "Rejestracja w {country} zwykle prowadziłaby do Altery EU (Cypr, CBC), ale cypryjska EMI nie obejmuje firm krypto. Zamiast tego jesteś z Altery Ltd (Wielka Brytania, FCA) — obsługuje operacje krypto przez Faster Payments, SEPA i SWIFT.",
  });
  Object.assign(D.pt, {
    "ec.q6.title": "A sua empresa lida com cripto?",
    "ec.q6.lead": "Em sentido amplo — aceitar pagamentos em cripto, manter ativos digitais em tesouraria ou operar um serviço cripto-nativo. A resposta pode mudar com qual entidade Altery abrimos a sua conta.",
    "ec.q6.field.label": "Exposição a cripto",
    "ec.q6.opt.none.title": "Apenas fiat",
    "ec.q6.opt.none.desc": "Não aceitamos, mantemos nem processamos cripto de forma alguma.",
    "ec.q6.opt.yes.title": "Sim, com cripto",
    "ec.q6.opt.yes.desc": "Aceitamos pagamentos cripto, mantemos ativos digitais ou operamos serviço cripto-nativo.",
    "ec.q6.alert.reroute.title": "Aviso: vamos encaminhá-lo para a nossa entidade UK",
    "ec.q6.alert.reroute.body": "A sua constituição em {country} normalmente iria para Altery EU (Chipre, CBC), mas a licença EMI de Chipre não aceita negócios cripto. Abriremos a sua conta com Altery Ltd (Reino Unido, FCA), que pode servir operações cripto.",
    "ec.r.reroute.title": "Porquê UK, não EU?",
    "ec.r.reroute.body": "A sua constituição em {country} normalmente iria para Altery EU (Chipre, CBC), mas a licença EMI de Chipre não cobre negócios cripto. Está antes com Altery Ltd (Reino Unido, FCA) — pode servir operações cripto em Faster Payments, SEPA e SWIFT.",
  });
  Object.assign(D.fr, {
    "ec.q6.title": "Votre entreprise traite-t-elle de la crypto ?",
    "ec.q6.lead": "Au sens large — accepter des paiements crypto, détenir des actifs numériques en trésorerie ou exploiter un service crypto-natif. La réponse peut changer quelle entité Altery ouvre votre compte.",
    "ec.q6.field.label": "Exposition crypto",
    "ec.q6.opt.none.title": "Fiat uniquement",
    "ec.q6.opt.none.desc": "Nous n'acceptons, ne détenons et ne traitons aucune crypto.",
    "ec.q6.opt.yes.title": "Oui, crypto impliquée",
    "ec.q6.opt.yes.desc": "Nous acceptons des paiements crypto, détenons des actifs numériques ou exploitons un service crypto-natif.",
    "ec.q6.alert.reroute.title": "Note : nous vous orientons vers notre entité UK",
    "ec.q6.alert.reroute.body": "Votre immatriculation en {country} mènerait normalement à Altery EU (Chypre, CBC), mais la licence EMI chypriote n'accepte pas les entreprises crypto. Nous ouvrirons votre compte avec Altery Ltd (Royaume-Uni, FCA), qui peut servir les opérations crypto.",
    "ec.r.reroute.title": "Pourquoi UK et non EU ?",
    "ec.r.reroute.body": "Votre immatriculation en {country} mènerait normalement à Altery EU (Chypre, CBC), mais la licence EMI chypriote ne couvre pas les entreprises crypto. Vous êtes plutôt avec Altery Ltd (Royaume-Uni, FCA) — elle peut servir les opérations crypto sur Faster Payments, SEPA et SWIFT.",
  });

  // ─────────── Hero crypto-fluent badge ──────────
  // Single-key inject: shown next to the entity-status pill on the
  // result page when cryptoExposure === "yes". Conveys operational
  // expertise, not mere tolerance.
  Object.assign(D.en, {
    "ec.r.crypto.fluent": "Crypto-fluent",
  });
  Object.assign(D.es, {
    "ec.r.crypto.fluent": "Cripto-experto",
  });
  Object.assign(D.fr, {
    "ec.r.crypto.fluent": "Expert crypto",
  });
  Object.assign(D.pt, {
    "ec.r.crypto.fluent": "Especialistas em cripto",
  });
  Object.assign(D.ru, {
    "ec.r.crypto.fluent": "Работаем с криптой",
  });
  Object.assign(D.de, {
    "ec.r.crypto.fluent": "Krypto-erfahren",
  });
  Object.assign(D.it, {
    "ec.r.crypto.fluent": "Esperti crypto",
  });
  Object.assign(D.tr, {
    "ec.r.crypto.fluent": "Kripto uzmanı",
  });
  Object.assign(D.pl, {
    "ec.r.crypto.fluent": "Eksperci crypto",
  });
  Object.assign(D.nl, {
    "ec.r.crypto.fluent": "Crypto-expert",
  });

  // ─────────── Plan comparison modal — full localisation ──────────
  // Modal had EN-only strings since it was first added; t() falls
  // back to EN for missing keys, so non-EN users would see mixed
  // language (translated plan name + EN section headers). Now that
  // fits is also surfaced on the main plan card (visible by default,
  // not just inside the modal), proper localisation is required.
  // 13 keys × 9 languages. Bank rail proper-nouns (SEPA, SWIFT,
  // Faster Payments) kept English since they're standard regulatory
  // terminology that the audience already recognises.
  Object.assign(D.de, {
    "ec.r.plan.compare.title": "Finden Sie den passenden Tarif",
    "ec.r.plan.compare.recommended": "Für Sie empfohlen",
    "ec.r.plan.compare.wasRecommended": "Ursprünglich empfohlen",
    "ec.r.plan.compare.switch": "Zu diesem Tarif wechseln",
    "ec.r.plan.compare.fitsHead": "Geeignet für",
    "ec.r.plan.compare.feesHead": "Gebühren & Unterschiede",
    "ec.r.plan.compare.fee.fasterPay": "UK Faster Payments",
    "ec.r.plan.compare.fee.sepa": "SEPA ausgehend",
    "ec.r.plan.compare.fee.swift": "SWIFT ausgehend",
    "ec.r.plan.compare.fee.fxMarkup": "FX-Marge (Basiswährungen)",
    "ec.r.plan.compare.fee.bulk": "Sammel- & Stapelüberweisungen",
    "ec.r.plan.compare.fee.notIncluded": "—",
    "ec.r.plan.compare.fee.footnote": "Die Preiswährung hängt vom Land der Gründung ab (GBP / EUR / USD). Die vollständige Preisliste finden Sie im Dashboard.",
    "ec.r.plan.compare.close": "Schließen",
  });
  Object.assign(D.nl, {
    "ec.r.plan.compare.title": "Vind het juiste plan voor uw behoeften",
    "ec.r.plan.compare.recommended": "Voor u aanbevolen",
    "ec.r.plan.compare.wasRecommended": "Oorspronkelijk aanbevolen",
    "ec.r.plan.compare.switch": "Overstappen naar dit plan",
    "ec.r.plan.compare.fitsHead": "Geschikt voor",
    "ec.r.plan.compare.feesHead": "Tarieven & verschillen",
    "ec.r.plan.compare.fee.fasterPay": "UK Faster Payments",
    "ec.r.plan.compare.fee.sepa": "Uitgaande SEPA",
    "ec.r.plan.compare.fee.swift": "Uitgaande SWIFT",
    "ec.r.plan.compare.fee.fxMarkup": "FX-marge (basisvaluta's)",
    "ec.r.plan.compare.fee.bulk": "Bulk- en batchoverboekingen",
    "ec.r.plan.compare.fee.notIncluded": "—",
    "ec.r.plan.compare.fee.footnote": "De prijsvaluta hangt af van het land van oprichting (GBP / EUR / USD). De volledige prijslijst is beschikbaar in het dashboard.",
    "ec.r.plan.compare.close": "Sluiten",
  });
  Object.assign(D.ru, {
    "ec.r.plan.compare.title": "Подберите план под ваши задачи",
    "ec.r.plan.compare.recommended": "Рекомендуем вам",
    "ec.r.plan.compare.wasRecommended": "Изначально рекомендовали",
    "ec.r.plan.compare.switch": "Перейти на этот план",
    "ec.r.plan.compare.fitsHead": "Подходит для",
    "ec.r.plan.compare.feesHead": "Тарифы и отличия",
    "ec.r.plan.compare.fee.fasterPay": "UK Faster Payments",
    "ec.r.plan.compare.fee.sepa": "Исходящие SEPA",
    "ec.r.plan.compare.fee.swift": "Исходящие SWIFT",
    "ec.r.plan.compare.fee.fxMarkup": "FX-маржа (базовые валюты)",
    "ec.r.plan.compare.fee.bulk": "Массовые переводы",
    "ec.r.plan.compare.fee.notIncluded": "—",
    "ec.r.plan.compare.fee.footnote": "Валюта тарифа зависит от страны регистрации (GBP / EUR / USD). Полный прайс-лист доступен в личном кабинете.",
    "ec.r.plan.compare.close": "Закрыть",
  });
  Object.assign(D.tr, {
    "ec.r.plan.compare.title": "İhtiyacınıza uygun planı bulun",
    "ec.r.plan.compare.recommended": "Sizin için önerilen",
    "ec.r.plan.compare.wasRecommended": "Başlangıçta önerilmiş",
    "ec.r.plan.compare.switch": "Bu plana geç",
    "ec.r.plan.compare.fitsHead": "Uygun",
    "ec.r.plan.compare.feesHead": "Ücretler ve farklar",
    "ec.r.plan.compare.fee.fasterPay": "UK Faster Payments",
    "ec.r.plan.compare.fee.sepa": "Giden SEPA",
    "ec.r.plan.compare.fee.swift": "Giden SWIFT",
    "ec.r.plan.compare.fee.fxMarkup": "FX marjı (temel para birimleri)",
    "ec.r.plan.compare.fee.bulk": "Toplu transferler",
    "ec.r.plan.compare.fee.notIncluded": "—",
    "ec.r.plan.compare.fee.footnote": "Fiyat para birimi tescil ülkesine bağlıdır (GBP / EUR / USD). Tam fiyat listesi panoda mevcuttur.",
    "ec.r.plan.compare.close": "Kapat",
  });
  Object.assign(D.it, {
    "ec.r.plan.compare.title": "Trova il piano giusto",
    "ec.r.plan.compare.recommended": "Consigliato per te",
    "ec.r.plan.compare.wasRecommended": "Consigliato all'inizio",
    "ec.r.plan.compare.switch": "Passa a questo piano",
    "ec.r.plan.compare.fitsHead": "Adatto a",
    "ec.r.plan.compare.feesHead": "Tariffe e differenze",
    "ec.r.plan.compare.fee.fasterPay": "UK Faster Payments",
    "ec.r.plan.compare.fee.sepa": "SEPA in uscita",
    "ec.r.plan.compare.fee.swift": "SWIFT in uscita",
    "ec.r.plan.compare.fee.fxMarkup": "Margine FX (valute base)",
    "ec.r.plan.compare.fee.bulk": "Trasferimenti in blocco",
    "ec.r.plan.compare.fee.notIncluded": "—",
    "ec.r.plan.compare.fee.footnote": "La valuta dei prezzi dipende dal paese di costituzione (GBP / EUR / USD). Listino completo disponibile nella dashboard.",
    "ec.r.plan.compare.close": "Chiudi",
  });
  Object.assign(D.es, {
    "ec.r.plan.compare.title": "Encuentra el plan adecuado",
    "ec.r.plan.compare.recommended": "Recomendado para ti",
    "ec.r.plan.compare.wasRecommended": "Recomendado originalmente",
    "ec.r.plan.compare.switch": "Cambiar a este plan",
    "ec.r.plan.compare.fitsHead": "Adecuado para",
    "ec.r.plan.compare.feesHead": "Tarifas y diferencias",
    "ec.r.plan.compare.fee.fasterPay": "UK Faster Payments",
    "ec.r.plan.compare.fee.sepa": "SEPA salientes",
    "ec.r.plan.compare.fee.swift": "SWIFT salientes",
    "ec.r.plan.compare.fee.fxMarkup": "Margen FX (divisas base)",
    "ec.r.plan.compare.fee.bulk": "Transferencias masivas",
    "ec.r.plan.compare.fee.notIncluded": "—",
    "ec.r.plan.compare.fee.footnote": "La moneda de los precios depende del país de constitución (GBP / EUR / USD). Lista de precios completa disponible en el panel.",
    "ec.r.plan.compare.close": "Cerrar",
  });
  Object.assign(D.pl, {
    "ec.r.plan.compare.title": "Znajdź odpowiedni plan",
    "ec.r.plan.compare.recommended": "Polecane dla Ciebie",
    "ec.r.plan.compare.wasRecommended": "Pierwotnie polecane",
    "ec.r.plan.compare.switch": "Przejdź na ten plan",
    "ec.r.plan.compare.fitsHead": "Odpowiedni dla",
    "ec.r.plan.compare.feesHead": "Opłaty i różnice",
    "ec.r.plan.compare.fee.fasterPay": "UK Faster Payments",
    "ec.r.plan.compare.fee.sepa": "Wychodzące SEPA",
    "ec.r.plan.compare.fee.swift": "Wychodzące SWIFT",
    "ec.r.plan.compare.fee.fxMarkup": "Marża FX (waluty bazowe)",
    "ec.r.plan.compare.fee.bulk": "Przelewy zbiorcze",
    "ec.r.plan.compare.fee.notIncluded": "—",
    "ec.r.plan.compare.fee.footnote": "Waluta cennika zależy od kraju rejestracji (GBP / EUR / USD). Pełny cennik dostępny w panelu.",
    "ec.r.plan.compare.close": "Zamknij",
  });
  Object.assign(D.pt, {
    "ec.r.plan.compare.title": "Encontre o plano certo",
    "ec.r.plan.compare.recommended": "Recomendado para você",
    "ec.r.plan.compare.wasRecommended": "Originalmente recomendado",
    "ec.r.plan.compare.switch": "Mudar para este plano",
    "ec.r.plan.compare.fitsHead": "Adequado para",
    "ec.r.plan.compare.feesHead": "Taxas e diferenças",
    "ec.r.plan.compare.fee.fasterPay": "UK Faster Payments",
    "ec.r.plan.compare.fee.sepa": "SEPA enviado",
    "ec.r.plan.compare.fee.swift": "SWIFT enviado",
    "ec.r.plan.compare.fee.fxMarkup": "Margem FX (moedas base)",
    "ec.r.plan.compare.fee.bulk": "Transferências em lote",
    "ec.r.plan.compare.fee.notIncluded": "—",
    "ec.r.plan.compare.fee.footnote": "A moeda do preço depende do país de constituição (GBP / EUR / USD). Lista de preços completa disponível no painel.",
    "ec.r.plan.compare.close": "Fechar",
  });
  Object.assign(D.fr, {
    "ec.r.plan.compare.title": "Trouvez le plan qui vous convient",
    "ec.r.plan.compare.recommended": "Recommandé pour vous",
    "ec.r.plan.compare.wasRecommended": "Recommandé à l'origine",
    "ec.r.plan.compare.switch": "Passer à ce plan",
    "ec.r.plan.compare.fitsHead": "Adapté à",
    "ec.r.plan.compare.feesHead": "Frais et différences",
    "ec.r.plan.compare.fee.fasterPay": "UK Faster Payments",
    "ec.r.plan.compare.fee.sepa": "SEPA sortants",
    "ec.r.plan.compare.fee.swift": "SWIFT sortants",
    "ec.r.plan.compare.fee.fxMarkup": "Marge de change (devises de base)",
    "ec.r.plan.compare.fee.bulk": "Virements groupés",
    "ec.r.plan.compare.fee.notIncluded": "—",
    "ec.r.plan.compare.fee.footnote": "La devise des prix dépend du pays d'immatriculation (GBP / EUR / USD). Liste de prix complète disponible sur le tableau de bord.",
    "ec.r.plan.compare.close": "Fermer",
  });

  // ─────────── Account preview SWIFT-group + support footer ──────────
  // Strings for the Sprint 3 additions: section label above the
  // SWIFT-only sub-group inside EcAccountPreview, plus the support
  // footer copy under the CTAs. Email is wrapped in a translation
  // key so future regional support addresses (welcome-eu@,
  // welcome-uk@, etc.) can be wired without touching JSX.
  Object.assign(D.en, {
    "ec.account.swiftGroupHead": "Also available via SWIFT",
    "ec.support.questionsPrefix": "Questions about this recommendation? Email",
    "ec.support.email": "welcome@altery.com",
  });
  Object.assign(D.es, {
    "ec.account.swiftGroupHead": "También disponible vía SWIFT",
    "ec.support.questionsPrefix": "¿Preguntas sobre esta recomendación? Escríbenos a",
    "ec.support.email": "welcome@altery.com",
  });
  Object.assign(D.fr, {
    "ec.account.swiftGroupHead": "Disponible aussi via SWIFT",
    "ec.support.questionsPrefix": "Des questions sur cette recommandation ? Écrivez à",
    "ec.support.email": "welcome@altery.com",
  });
  Object.assign(D.pt, {
    "ec.account.swiftGroupHead": "Também disponível via SWIFT",
    "ec.support.questionsPrefix": "Dúvidas sobre esta recomendação? Escreva para",
    "ec.support.email": "welcome@altery.com",
  });
  Object.assign(D.ru, {
    "ec.account.swiftGroupHead": "Также доступно через SWIFT",
    "ec.support.questionsPrefix": "Вопросы по рекомендации? Напишите на",
    "ec.support.email": "welcome@altery.com",
  });
  Object.assign(D.de, {
    "ec.account.swiftGroupHead": "Auch via SWIFT verfügbar",
    "ec.support.questionsPrefix": "Fragen zu dieser Empfehlung? Schreiben Sie an",
    "ec.support.email": "welcome@altery.com",
  });
  Object.assign(D.it, {
    "ec.account.swiftGroupHead": "Disponibile anche via SWIFT",
    "ec.support.questionsPrefix": "Domande sulla raccomandazione? Scrivici a",
    "ec.support.email": "welcome@altery.com",
  });
  Object.assign(D.tr, {
    "ec.account.swiftGroupHead": "SWIFT üzerinden de mevcut",
    "ec.support.questionsPrefix": "Bu öneri hakkında sorularınız mı var? E-posta:",
    "ec.support.email": "welcome@altery.com",
  });
  Object.assign(D.pl, {
    "ec.account.swiftGroupHead": "Dostępne także przez SWIFT",
    "ec.support.questionsPrefix": "Masz pytania o rekomendację? Napisz na",
    "ec.support.email": "welcome@altery.com",
  });
  Object.assign(D.nl, {
    "ec.account.swiftGroupHead": "Ook beschikbaar via SWIFT",
    "ec.support.questionsPrefix": "Vragen over deze aanbeveling? E-mail naar",
    "ec.support.email": "welcome@altery.com",
  });

  // ─────────── "Built to back your business" perks slider ──────
  // 5 real Altery Business solutions surfaced as a horizontal slider
  // on the result page. Copy + visual assets pulled directly from
  // altery.com/business. 11 keys × 10 langs = 110 strings.
  Object.assign(D.en, {
    "ec.r.perks.head": "Built to back your business",
    "ec.r.perks.multiEntity.title": "Multi-entity account",
    "ec.r.perks.multiEntity.body": "Manage one company or ten — everything in one account.",
    "ec.r.perks.multiUser.title": "Multi-user access",
    "ec.r.perks.multiUser.body": "Bring in your team, assign roles, collaborate with full visibility.",
    "ec.r.perks.currencyExchange.title": "Currency exchange",
    "ec.r.perks.currencyExchange.body": "Hold and convert 30+ currencies at near-mid-market rates.",
    "ec.r.perks.businessCards.title": "Business cards",
    "ec.r.perks.businessCards.body": "Pay like locals worldwide, with real-time spend control.",
    "ec.r.perks.permissions.title": "Granular permissions",
    "ec.r.perks.permissions.body": "Set what each team member can view, send and approve.",
  });
  Object.assign(D.es, {
    "ec.r.perks.head": "Diseñado para impulsar tu negocio",
    "ec.r.perks.multiEntity.title": "Cuenta multi-entidad",
    "ec.r.perks.multiEntity.body": "Gestiona una empresa o diez — todo en una sola cuenta.",
    "ec.r.perks.multiUser.title": "Acceso multi-usuario",
    "ec.r.perks.multiUser.body": "Incorpora a tu equipo, asigna roles y colabora con visibilidad total.",
    "ec.r.perks.currencyExchange.title": "Cambio de divisas",
    "ec.r.perks.currencyExchange.body": "Mantén y convierte 30+ divisas a tipos cercanos al mid-market.",
    "ec.r.perks.businessCards.title": "Tarjetas corporativas",
    "ec.r.perks.businessCards.body": "Paga como local en todo el mundo, con control de gasto en tiempo real.",
    "ec.r.perks.permissions.title": "Permisos granulares",
    "ec.r.perks.permissions.body": "Define qué puede ver, enviar y aprobar cada miembro del equipo.",
  });
  Object.assign(D.fr, {
    "ec.r.perks.head": "Conçu pour soutenir votre activité",
    "ec.r.perks.multiEntity.title": "Compte multi-entités",
    "ec.r.perks.multiEntity.body": "Gérez une entreprise ou dix — tout dans un seul compte.",
    "ec.r.perks.multiUser.title": "Accès multi-utilisateurs",
    "ec.r.perks.multiUser.body": "Intégrez votre équipe, attribuez des rôles, collaborez en pleine visibilité.",
    "ec.r.perks.currencyExchange.title": "Conversion de devises",
    "ec.r.perks.currencyExchange.body": "Détenez et convertissez 30+ devises à des taux proches du mid-market.",
    "ec.r.perks.businessCards.title": "Cartes professionnelles",
    "ec.r.perks.businessCards.body": "Payez comme un local partout, avec contrôle des dépenses en temps réel.",
    "ec.r.perks.permissions.title": "Permissions granulaires",
    "ec.r.perks.permissions.body": "Définissez ce que chaque membre de l'équipe peut voir, envoyer et approuver.",
  });
  Object.assign(D.pt, {
    "ec.r.perks.head": "Feito para apoiar o seu negócio",
    "ec.r.perks.multiEntity.title": "Conta multi-entidade",
    "ec.r.perks.multiEntity.body": "Gerencie uma empresa ou dez — tudo em uma conta.",
    "ec.r.perks.multiUser.title": "Acesso multi-utilizador",
    "ec.r.perks.multiUser.body": "Adicione a sua equipa, atribua funções, colabore com visibilidade total.",
    "ec.r.perks.currencyExchange.title": "Câmbio de moedas",
    "ec.r.perks.currencyExchange.body": "Mantenha e converta 30+ moedas a taxas próximas do mid-market.",
    "ec.r.perks.businessCards.title": "Cartões empresariais",
    "ec.r.perks.businessCards.body": "Pague como um local em todo o mundo, com controlo em tempo real.",
    "ec.r.perks.permissions.title": "Permissões granulares",
    "ec.r.perks.permissions.body": "Defina o que cada membro da equipa pode ver, enviar e aprovar.",
  });
  Object.assign(D.ru, {
    "ec.r.perks.head": "Создано для поддержки вашего бизнеса",
    "ec.r.perks.multiEntity.title": "Мульти-юр-лицо",
    "ec.r.perks.multiEntity.body": "Управляйте одной компанией или десятью — всё в одном аккаунте.",
    "ec.r.perks.multiUser.title": "Многопользовательский доступ",
    "ec.r.perks.multiUser.body": "Подключите команду, назначьте роли, работайте с полной видимостью.",
    "ec.r.perks.currencyExchange.title": "Обмен валют",
    "ec.r.perks.currencyExchange.body": "Храните и конвертируйте 30+ валют по курсам близким к mid-market.",
    "ec.r.perks.businessCards.title": "Корпоративные карты",
    "ec.r.perks.businessCards.body": "Платите как местный по всему миру, с контролем расходов в реальном времени.",
    "ec.r.perks.permissions.title": "Гранулярные права",
    "ec.r.perks.permissions.body": "Задайте, что каждый член команды может видеть, отправлять и подтверждать.",
  });
  Object.assign(D.de, {
    "ec.r.perks.head": "Wir stehen hinter Ihrem Geschäft",
    "ec.r.perks.multiEntity.title": "Multi-Entitäts-Konto",
    "ec.r.perks.multiEntity.body": "Ein Unternehmen oder zehn verwalten — alles in einem Konto.",
    "ec.r.perks.multiUser.title": "Multi-User-Zugang",
    "ec.r.perks.multiUser.body": "Holen Sie Ihr Team an Bord, vergeben Sie Rollen, kollaborieren Sie transparent.",
    "ec.r.perks.currencyExchange.title": "Währungstausch",
    "ec.r.perks.currencyExchange.body": "30+ Währungen halten und nahe am Mittelkurs umtauschen.",
    "ec.r.perks.businessCards.title": "Firmenkarten",
    "ec.r.perks.businessCards.body": "Zahlen wie ein Einheimischer weltweit, mit Echtzeit-Ausgabenkontrolle.",
    "ec.r.perks.permissions.title": "Granulare Berechtigungen",
    "ec.r.perks.permissions.body": "Legen Sie fest, was jedes Teammitglied sehen, senden und freigeben darf.",
  });
  Object.assign(D.it, {
    "ec.r.perks.head": "Pensato per sostenere il tuo business",
    "ec.r.perks.multiEntity.title": "Account multi-entità",
    "ec.r.perks.multiEntity.body": "Gestisci un'azienda o dieci — tutto in un solo account.",
    "ec.r.perks.multiUser.title": "Accesso multi-utente",
    "ec.r.perks.multiUser.body": "Coinvolgi il team, assegna ruoli, collabora con piena visibilità.",
    "ec.r.perks.currencyExchange.title": "Cambio valuta",
    "ec.r.perks.currencyExchange.body": "Tieni e converti 30+ valute a tassi vicini al mid-market.",
    "ec.r.perks.businessCards.title": "Carte aziendali",
    "ec.r.perks.businessCards.body": "Paga come un locale ovunque, con controllo spese in tempo reale.",
    "ec.r.perks.permissions.title": "Permessi granulari",
    "ec.r.perks.permissions.body": "Imposta cosa ogni membro del team può vedere, inviare e approvare.",
  });
  Object.assign(D.tr, {
    "ec.r.perks.head": "İşinizin arkasında olmak için tasarlandı",
    "ec.r.perks.multiEntity.title": "Çoklu şirket hesabı",
    "ec.r.perks.multiEntity.body": "Bir şirket veya on — hepsi tek bir hesapta.",
    "ec.r.perks.multiUser.title": "Çoklu kullanıcı erişimi",
    "ec.r.perks.multiUser.body": "Ekibinizi dahil edin, roller atayın, tam görünürlükle çalışın.",
    "ec.r.perks.currencyExchange.title": "Döviz dönüşümü",
    "ec.r.perks.currencyExchange.body": "30+ para birimini orta piyasaya yakın kurlarla tutun ve dönüştürün.",
    "ec.r.perks.businessCards.title": "Kurumsal kartlar",
    "ec.r.perks.businessCards.body": "Dünya çapında yerel gibi ödeyin, gerçek zamanlı harcama kontrolüyle.",
    "ec.r.perks.permissions.title": "Hassas yetkilendirme",
    "ec.r.perks.permissions.body": "Her ekip üyesinin neyi görebileceğini, gönderebileceğini ve onaylayabileceğini belirleyin.",
  });
  Object.assign(D.pl, {
    "ec.r.perks.head": "Stworzone, aby wspierać Twój biznes",
    "ec.r.perks.multiEntity.title": "Konto wielopodmiotowe",
    "ec.r.perks.multiEntity.body": "Zarządzaj jedną firmą lub dziesięcioma — wszystko w jednym koncie.",
    "ec.r.perks.multiUser.title": "Dostęp wielu użytkowników",
    "ec.r.perks.multiUser.body": "Włącz zespół, przypisz role, pracujcie razem z pełną widocznością.",
    "ec.r.perks.currencyExchange.title": "Wymiana walut",
    "ec.r.perks.currencyExchange.body": "Trzymaj i wymieniaj 30+ walut po kursach zbliżonych do mid-market.",
    "ec.r.perks.businessCards.title": "Karty firmowe",
    "ec.r.perks.businessCards.body": "Płać jak miejscowy na całym świecie, z kontrolą wydatków w czasie rzeczywistym.",
    "ec.r.perks.permissions.title": "Granularne uprawnienia",
    "ec.r.perks.permissions.body": "Ustal, co każdy członek zespołu może zobaczyć, wysłać i zatwierdzić.",
  });
  Object.assign(D.nl, {
    "ec.r.perks.head": "Gemaakt om uw bedrijf te ondersteunen",
    "ec.r.perks.multiEntity.title": "Multi-entiteit account",
    "ec.r.perks.multiEntity.body": "Beheer één bedrijf of tien — alles in één account.",
    "ec.r.perks.multiUser.title": "Multi-user toegang",
    "ec.r.perks.multiUser.body": "Voeg uw team toe, wijs rollen toe, werk samen met volledige zichtbaarheid.",
    "ec.r.perks.currencyExchange.title": "Valutawissel",
    "ec.r.perks.currencyExchange.body": "Houd en wissel 30+ valuta's tegen koersen dichtbij de midmarktprijs.",
    "ec.r.perks.businessCards.title": "Zakelijke kaarten",
    "ec.r.perks.businessCards.body": "Betaal als een local wereldwijd, met realtime uitgavencontrole.",
    "ec.r.perks.permissions.title": "Gedetailleerde rechten",
    "ec.r.perks.permissions.body": "Bepaal wat elk teamlid kan bekijken, versturen en goedkeuren.",
  });

  // ─────────── Entity-specific currency perk ──────────────
  // Renders as the first item in the plan card perks list.
  // Replaces the old EcAccountPreview panel — same information
  // (which currencies via which rails per entity) but in one
  // line of text instead of ~450px of cards. UK/EU/MENA each
  // gets jurisdiction-specific copy.
  Object.assign(D.en, {
    "ec.entity.uk.currencyPerk":   "Local IBANs in GBP & EUR · USD via SWIFT",
    "ec.entity.eu.currencyPerk":   "EUR with SEPA Instant · GBP & USD via SWIFT",
    "ec.entity.mena.currencyPerk": "Local IBANs in USD & AED · 50+ via SWIFT",
  });
  Object.assign(D.es, {
    "ec.entity.uk.currencyPerk":   "IBANs locales en GBP y EUR · USD vía SWIFT",
    "ec.entity.eu.currencyPerk":   "EUR con SEPA Instant · GBP y USD vía SWIFT",
    "ec.entity.mena.currencyPerk": "IBANs locales en USD y AED · 50+ vía SWIFT",
  });
  Object.assign(D.fr, {
    "ec.entity.uk.currencyPerk":   "IBANs locaux en GBP et EUR · USD via SWIFT",
    "ec.entity.eu.currencyPerk":   "EUR avec SEPA Instant · GBP et USD via SWIFT",
    "ec.entity.mena.currencyPerk": "IBANs locaux en USD et AED · 50+ via SWIFT",
  });
  Object.assign(D.pt, {
    "ec.entity.uk.currencyPerk":   "IBANs locais em GBP e EUR · USD via SWIFT",
    "ec.entity.eu.currencyPerk":   "EUR com SEPA Instant · GBP e USD via SWIFT",
    "ec.entity.mena.currencyPerk": "IBANs locais em USD e AED · 50+ via SWIFT",
  });
  Object.assign(D.ru, {
    "ec.entity.uk.currencyPerk":   "Локальные IBAN в GBP и EUR · USD через SWIFT",
    "ec.entity.eu.currencyPerk":   "EUR через SEPA Instant · GBP и USD через SWIFT",
    "ec.entity.mena.currencyPerk": "Локальные IBAN в USD и AED · 50+ через SWIFT",
  });
  Object.assign(D.de, {
    "ec.entity.uk.currencyPerk":   "Lokale IBANs in GBP & EUR · USD via SWIFT",
    "ec.entity.eu.currencyPerk":   "EUR mit SEPA Instant · GBP & USD via SWIFT",
    "ec.entity.mena.currencyPerk": "Lokale IBANs in USD & AED · 50+ via SWIFT",
  });
  Object.assign(D.it, {
    "ec.entity.uk.currencyPerk":   "IBAN locali in GBP e EUR · USD via SWIFT",
    "ec.entity.eu.currencyPerk":   "EUR con SEPA Instant · GBP e USD via SWIFT",
    "ec.entity.mena.currencyPerk": "IBAN locali in USD e AED · 50+ via SWIFT",
  });
  Object.assign(D.tr, {
    "ec.entity.uk.currencyPerk":   "GBP ve EUR'de yerel IBAN · USD SWIFT üzerinden",
    "ec.entity.eu.currencyPerk":   "SEPA Instant ile EUR · GBP ve USD SWIFT üzerinden",
    "ec.entity.mena.currencyPerk": "USD ve AED'de yerel IBAN · 50+ SWIFT üzerinden",
  });
  Object.assign(D.pl, {
    "ec.entity.uk.currencyPerk":   "Lokalne IBAN-y w GBP i EUR · USD przez SWIFT",
    "ec.entity.eu.currencyPerk":   "EUR przez SEPA Instant · GBP i USD przez SWIFT",
    "ec.entity.mena.currencyPerk": "Lokalne IBAN-y w USD i AED · 50+ przez SWIFT",
  });
  Object.assign(D.nl, {
    "ec.entity.uk.currencyPerk":   "Lokale IBANs in GBP en EUR · USD via SWIFT",
    "ec.entity.eu.currencyPerk":   "EUR met SEPA Instant · GBP en USD via SWIFT",
    "ec.entity.mena.currencyPerk": "Lokale IBANs in USD en AED · 50+ via SWIFT",
  });

  // ─────────── Fees modal translations ─────────────────────────
  // Strings for the EcFeesModal — section headers, row labels, and
  // footer text. Bank-product names (SEPA, SWIFT, Fedwire, ACH,
  // Faster Payments) stay verbatim across languages — they're
  // global product brands, not translatable. The SWIFT cap note
  // takes a {cap} param substituted from the active plan's perk
  // text at render time.
  Object.assign(D.en, {
    "ec.r.plan.viewFees": "View all fees",
    "ec.r.fees.head": "What you'll pay",
    "ec.r.fees.subscription": "Subscription",
    "ec.r.fees.seeAll": "See full schedule →",
    "ec.fees.title": "Full fees",
    "ec.fees.section.account": "Account",
    "ec.fees.section.outgoing": "Outgoing transfers",
    "ec.fees.section.incoming": "Incoming transfers",
    "ec.fees.section.fx": "FX & conversion",
    "ec.fees.row.opening": "Account opening",
    "ec.fees.row.monthly": "Monthly fee",
    "ec.fees.row.closure": "Account closure",
    "ec.fees.row.inactivity": "Inactivity (3+ months)",
    "ec.fees.row.internal": "Internal transfer",
    "ec.fees.row.internalIn": "Internal transfer",
    "ec.fees.row.sepa": "SEPA",
    "ec.fees.row.sepaIn": "SEPA",
    "ec.fees.row.fp": "Faster Payments",
    "ec.fees.row.fpIn": "Faster Payments",
    "ec.fees.row.fedwire": "Fedwire",
    "ec.fees.row.achUsd": "ACH (USD)",
    "ec.fees.row.swiftGbp": "SWIFT in GBP",
    "ec.fees.row.swiftEur": "SWIFT in EUR",
    "ec.fees.row.swiftUsd": "SWIFT in USD",
    "ec.fees.row.swiftIn": "SWIFT",
    "ec.fees.row.fxMarkup": "FX markup",
    "ec.fees.row.exchange": "Currency exchange",
    "ec.fees.note.swiftCap": "SWIFT fees capped at {cap} per transfer on this plan.",
    "ec.fees.footer.disclaimer": "Final pricing confirmed during onboarding.",
    "ec.fees.footer.link": "Full schedule at altery.com/fees/business →",
  });
  Object.assign(D.es, {
    "ec.r.plan.viewFees": "Ver todas las tarifas",
    "ec.r.fees.head": "Cuánto pagarás",
    "ec.r.fees.subscription": "Suscripción",
    "ec.r.fees.seeAll": "Tarifa completa →",
    "ec.fees.title": "Tarifas completas",
    "ec.fees.section.account": "Cuenta",
    "ec.fees.section.outgoing": "Transferencias salientes",
    "ec.fees.section.incoming": "Transferencias entrantes",
    "ec.fees.section.fx": "FX y conversión",
    "ec.fees.row.opening": "Apertura de cuenta",
    "ec.fees.row.monthly": "Cuota mensual",
    "ec.fees.row.closure": "Cierre de cuenta",
    "ec.fees.row.inactivity": "Inactividad (3+ meses)",
    "ec.fees.row.internal": "Transferencia interna",
    "ec.fees.row.internalIn": "Transferencia interna",
    "ec.fees.row.sepa": "SEPA",
    "ec.fees.row.sepaIn": "SEPA",
    "ec.fees.row.fp": "Faster Payments",
    "ec.fees.row.fpIn": "Faster Payments",
    "ec.fees.row.fedwire": "Fedwire",
    "ec.fees.row.achUsd": "ACH (USD)",
    "ec.fees.row.swiftGbp": "SWIFT en GBP",
    "ec.fees.row.swiftEur": "SWIFT en EUR",
    "ec.fees.row.swiftUsd": "SWIFT en USD",
    "ec.fees.row.swiftIn": "SWIFT",
    "ec.fees.row.fxMarkup": "Margen FX",
    "ec.fees.row.exchange": "Cambio de divisa",
    "ec.fees.note.swiftCap": "Tarifas SWIFT con tope de {cap} por transferencia en este plan.",
    "ec.fees.footer.disclaimer": "Tarifas finales confirmadas durante el onboarding.",
    "ec.fees.footer.link": "Tabla completa en altery.com/fees/business →",
  });
  Object.assign(D.fr, {
    "ec.r.plan.viewFees": "Voir tous les frais",
    "ec.r.fees.head": "Ce que vous paierez",
    "ec.r.fees.subscription": "Abonnement",
    "ec.r.fees.seeAll": "Tarification complète →",
    "ec.fees.title": "Frais complets",
    "ec.fees.section.account": "Compte",
    "ec.fees.section.outgoing": "Virements sortants",
    "ec.fees.section.incoming": "Virements entrants",
    "ec.fees.section.fx": "FX et conversion",
    "ec.fees.row.opening": "Ouverture de compte",
    "ec.fees.row.monthly": "Frais mensuels",
    "ec.fees.row.closure": "Clôture de compte",
    "ec.fees.row.inactivity": "Inactivité (3+ mois)",
    "ec.fees.row.internal": "Virement interne",
    "ec.fees.row.internalIn": "Virement interne",
    "ec.fees.row.sepa": "SEPA",
    "ec.fees.row.sepaIn": "SEPA",
    "ec.fees.row.fp": "Faster Payments",
    "ec.fees.row.fpIn": "Faster Payments",
    "ec.fees.row.fedwire": "Fedwire",
    "ec.fees.row.achUsd": "ACH (USD)",
    "ec.fees.row.swiftGbp": "SWIFT en GBP",
    "ec.fees.row.swiftEur": "SWIFT en EUR",
    "ec.fees.row.swiftUsd": "SWIFT en USD",
    "ec.fees.row.swiftIn": "SWIFT",
    "ec.fees.row.fxMarkup": "Marge FX",
    "ec.fees.row.exchange": "Conversion de devise",
    "ec.fees.note.swiftCap": "Frais SWIFT plafonnés à {cap} par virement sur ce plan.",
    "ec.fees.footer.disclaimer": "Tarifs finaux confirmés lors de l'onboarding.",
    "ec.fees.footer.link": "Grille complète sur altery.com/fees/business →",
  });
  Object.assign(D.pt, {
    "ec.r.plan.viewFees": "Ver todas as tarifas",
    "ec.r.fees.head": "Quanto irá pagar",
    "ec.r.fees.subscription": "Subscrição",
    "ec.r.fees.seeAll": "Tarifário completo →",
    "ec.fees.title": "Tarifas completas",
    "ec.fees.section.account": "Conta",
    "ec.fees.section.outgoing": "Transferências enviadas",
    "ec.fees.section.incoming": "Transferências recebidas",
    "ec.fees.section.fx": "FX e conversão",
    "ec.fees.row.opening": "Abertura de conta",
    "ec.fees.row.monthly": "Tarifa mensal",
    "ec.fees.row.closure": "Encerramento de conta",
    "ec.fees.row.inactivity": "Inatividade (3+ meses)",
    "ec.fees.row.internal": "Transferência interna",
    "ec.fees.row.internalIn": "Transferência interna",
    "ec.fees.row.sepa": "SEPA",
    "ec.fees.row.sepaIn": "SEPA",
    "ec.fees.row.fp": "Faster Payments",
    "ec.fees.row.fpIn": "Faster Payments",
    "ec.fees.row.fedwire": "Fedwire",
    "ec.fees.row.achUsd": "ACH (USD)",
    "ec.fees.row.swiftGbp": "SWIFT em GBP",
    "ec.fees.row.swiftEur": "SWIFT em EUR",
    "ec.fees.row.swiftUsd": "SWIFT em USD",
    "ec.fees.row.swiftIn": "SWIFT",
    "ec.fees.row.fxMarkup": "Margem de câmbio",
    "ec.fees.row.exchange": "Câmbio",
    "ec.fees.note.swiftCap": "Taxas SWIFT limitadas a {cap} por transferência neste plano.",
    "ec.fees.footer.disclaimer": "Tarifa final confirmada durante o onboarding.",
    "ec.fees.footer.link": "Tabela completa em altery.com/fees/business →",
  });
  Object.assign(D.ru, {
    "ec.r.plan.viewFees": "Все тарифы",
    "ec.r.fees.head": "Сколько будет стоить",
    "ec.r.fees.subscription": "Подписка",
    "ec.r.fees.seeAll": "Полный прайс-лист →",
    "ec.fees.title": "Все тарифы",
    "ec.fees.section.account": "Аккаунт",
    "ec.fees.section.outgoing": "Исходящие платежи",
    "ec.fees.section.incoming": "Входящие платежи",
    "ec.fees.section.fx": "FX и конверсия",
    "ec.fees.row.opening": "Открытие счёта",
    "ec.fees.row.monthly": "Месячная плата",
    "ec.fees.row.closure": "Закрытие счёта",
    "ec.fees.row.inactivity": "Неактивность (3+ мес)",
    "ec.fees.row.internal": "Внутренний перевод",
    "ec.fees.row.internalIn": "Внутренний перевод",
    "ec.fees.row.sepa": "SEPA",
    "ec.fees.row.sepaIn": "SEPA",
    "ec.fees.row.fp": "Faster Payments",
    "ec.fees.row.fpIn": "Faster Payments",
    "ec.fees.row.fedwire": "Fedwire",
    "ec.fees.row.achUsd": "ACH (USD)",
    "ec.fees.row.swiftGbp": "SWIFT в GBP",
    "ec.fees.row.swiftEur": "SWIFT в EUR",
    "ec.fees.row.swiftUsd": "SWIFT в USD",
    "ec.fees.row.swiftIn": "SWIFT",
    "ec.fees.row.fxMarkup": "FX-маржа",
    "ec.fees.row.exchange": "Конверсия валют",
    "ec.fees.note.swiftCap": "Комиссии SWIFT ограничены {cap} за перевод на этом тарифе.",
    "ec.fees.footer.disclaimer": "Финальные тарифы подтверждаются при онбординге.",
    "ec.fees.footer.link": "Полная таблица на altery.com/fees/business →",
  });
  Object.assign(D.de, {
    "ec.r.plan.viewFees": "Alle Gebühren ansehen",
    "ec.r.fees.head": "Was Sie zahlen werden",
    "ec.r.fees.subscription": "Abonnement",
    "ec.r.fees.seeAll": "Vollständige Übersicht →",
    "ec.fees.title": "Alle Gebühren",
    "ec.fees.section.account": "Konto",
    "ec.fees.section.outgoing": "Ausgehende Überweisungen",
    "ec.fees.section.incoming": "Eingehende Überweisungen",
    "ec.fees.section.fx": "FX und Wechsel",
    "ec.fees.row.opening": "Kontoeröffnung",
    "ec.fees.row.monthly": "Monatliche Gebühr",
    "ec.fees.row.closure": "Kontoschließung",
    "ec.fees.row.inactivity": "Inaktivität (3+ Monate)",
    "ec.fees.row.internal": "Interne Überweisung",
    "ec.fees.row.internalIn": "Interne Überweisung",
    "ec.fees.row.sepa": "SEPA",
    "ec.fees.row.sepaIn": "SEPA",
    "ec.fees.row.fp": "Faster Payments",
    "ec.fees.row.fpIn": "Faster Payments",
    "ec.fees.row.fedwire": "Fedwire",
    "ec.fees.row.achUsd": "ACH (USD)",
    "ec.fees.row.swiftGbp": "SWIFT in GBP",
    "ec.fees.row.swiftEur": "SWIFT in EUR",
    "ec.fees.row.swiftUsd": "SWIFT in USD",
    "ec.fees.row.swiftIn": "SWIFT",
    "ec.fees.row.fxMarkup": "FX-Aufschlag",
    "ec.fees.row.exchange": "Währungstausch",
    "ec.fees.note.swiftCap": "SWIFT-Gebühren bei diesem Tarif auf {cap} pro Überweisung gedeckelt.",
    "ec.fees.footer.disclaimer": "Endgültige Preise werden beim Onboarding bestätigt.",
    "ec.fees.footer.link": "Vollständige Übersicht auf altery.com/fees/business →",
  });
  Object.assign(D.it, {
    "ec.r.plan.viewFees": "Vedi tutte le tariffe",
    "ec.r.fees.head": "Quanto pagherai",
    "ec.r.fees.subscription": "Abbonamento",
    "ec.r.fees.seeAll": "Listino completo →",
    "ec.fees.title": "Tariffe complete",
    "ec.fees.section.account": "Conto",
    "ec.fees.section.outgoing": "Trasferimenti in uscita",
    "ec.fees.section.incoming": "Trasferimenti in entrata",
    "ec.fees.section.fx": "FX e conversione",
    "ec.fees.row.opening": "Apertura conto",
    "ec.fees.row.monthly": "Canone mensile",
    "ec.fees.row.closure": "Chiusura conto",
    "ec.fees.row.inactivity": "Inattività (3+ mesi)",
    "ec.fees.row.internal": "Bonifico interno",
    "ec.fees.row.internalIn": "Bonifico interno",
    "ec.fees.row.sepa": "SEPA",
    "ec.fees.row.sepaIn": "SEPA",
    "ec.fees.row.fp": "Faster Payments",
    "ec.fees.row.fpIn": "Faster Payments",
    "ec.fees.row.fedwire": "Fedwire",
    "ec.fees.row.achUsd": "ACH (USD)",
    "ec.fees.row.swiftGbp": "SWIFT in GBP",
    "ec.fees.row.swiftEur": "SWIFT in EUR",
    "ec.fees.row.swiftUsd": "SWIFT in USD",
    "ec.fees.row.swiftIn": "SWIFT",
    "ec.fees.row.fxMarkup": "Markup FX",
    "ec.fees.row.exchange": "Cambio valuta",
    "ec.fees.note.swiftCap": "Commissioni SWIFT con tetto di {cap} per bonifico su questo piano.",
    "ec.fees.footer.disclaimer": "Tariffe finali confermate in fase di onboarding.",
    "ec.fees.footer.link": "Tabella completa su altery.com/fees/business →",
  });
  Object.assign(D.tr, {
    "ec.r.plan.viewFees": "Tüm ücretleri gör",
    "ec.r.fees.head": "Ne ödeyeceksiniz",
    "ec.r.fees.subscription": "Abonelik",
    "ec.r.fees.seeAll": "Tüm ücretler →",
    "ec.fees.title": "Tüm ücretler",
    "ec.fees.section.account": "Hesap",
    "ec.fees.section.outgoing": "Giden transferler",
    "ec.fees.section.incoming": "Gelen transferler",
    "ec.fees.section.fx": "FX ve dönüşüm",
    "ec.fees.row.opening": "Hesap açılışı",
    "ec.fees.row.monthly": "Aylık ücret",
    "ec.fees.row.closure": "Hesap kapatma",
    "ec.fees.row.inactivity": "İnaktivite (3+ ay)",
    "ec.fees.row.internal": "İç transfer",
    "ec.fees.row.internalIn": "İç transfer",
    "ec.fees.row.sepa": "SEPA",
    "ec.fees.row.sepaIn": "SEPA",
    "ec.fees.row.fp": "Faster Payments",
    "ec.fees.row.fpIn": "Faster Payments",
    "ec.fees.row.fedwire": "Fedwire",
    "ec.fees.row.achUsd": "ACH (USD)",
    "ec.fees.row.swiftGbp": "GBP cinsi SWIFT",
    "ec.fees.row.swiftEur": "EUR cinsi SWIFT",
    "ec.fees.row.swiftUsd": "USD cinsi SWIFT",
    "ec.fees.row.swiftIn": "SWIFT",
    "ec.fees.row.fxMarkup": "FX markup",
    "ec.fees.row.exchange": "Döviz dönüşümü",
    "ec.fees.note.swiftCap": "Bu planda SWIFT ücretleri transfer başına {cap} ile sınırlıdır.",
    "ec.fees.footer.disclaimer": "Nihai fiyatlar onboarding sırasında onaylanır.",
    "ec.fees.footer.link": "Tam liste altery.com/fees/business adresinde →",
  });
  Object.assign(D.pl, {
    "ec.r.plan.viewFees": "Zobacz wszystkie opłaty",
    "ec.r.fees.head": "Ile zapłacisz",
    "ec.r.fees.subscription": "Subskrypcja",
    "ec.r.fees.seeAll": "Pełny cennik →",
    "ec.fees.title": "Pełne opłaty",
    "ec.fees.section.account": "Konto",
    "ec.fees.section.outgoing": "Przelewy wychodzące",
    "ec.fees.section.incoming": "Przelewy przychodzące",
    "ec.fees.section.fx": "FX i wymiana",
    "ec.fees.row.opening": "Otwarcie konta",
    "ec.fees.row.monthly": "Opłata miesięczna",
    "ec.fees.row.closure": "Zamknięcie konta",
    "ec.fees.row.inactivity": "Brak aktywności (3+ miesięcy)",
    "ec.fees.row.internal": "Przelew wewnętrzny",
    "ec.fees.row.internalIn": "Przelew wewnętrzny",
    "ec.fees.row.sepa": "SEPA",
    "ec.fees.row.sepaIn": "SEPA",
    "ec.fees.row.fp": "Faster Payments",
    "ec.fees.row.fpIn": "Faster Payments",
    "ec.fees.row.fedwire": "Fedwire",
    "ec.fees.row.achUsd": "ACH (USD)",
    "ec.fees.row.swiftGbp": "SWIFT w GBP",
    "ec.fees.row.swiftEur": "SWIFT w EUR",
    "ec.fees.row.swiftUsd": "SWIFT w USD",
    "ec.fees.row.swiftIn": "SWIFT",
    "ec.fees.row.fxMarkup": "Marża FX",
    "ec.fees.row.exchange": "Wymiana walut",
    "ec.fees.note.swiftCap": "Opłaty SWIFT ograniczone do {cap} za przelew w tym planie.",
    "ec.fees.footer.disclaimer": "Ostateczne ceny potwierdzane podczas onboardingu.",
    "ec.fees.footer.link": "Pełna tabela na altery.com/fees/business →",
  });
  Object.assign(D.nl, {
    "ec.r.plan.viewFees": "Bekijk alle tarieven",
    "ec.r.fees.head": "Wat je betaalt",
    "ec.r.fees.subscription": "Abonnement",
    "ec.r.fees.seeAll": "Volledig schema →",
    "ec.fees.title": "Volledige tarieven",
    "ec.fees.section.account": "Account",
    "ec.fees.section.outgoing": "Uitgaande overschrijvingen",
    "ec.fees.section.incoming": "Inkomende overschrijvingen",
    "ec.fees.section.fx": "FX en wisselen",
    "ec.fees.row.opening": "Rekeningopening",
    "ec.fees.row.monthly": "Maandelijkse kosten",
    "ec.fees.row.closure": "Rekeningsluiting",
    "ec.fees.row.inactivity": "Inactiviteit (3+ maanden)",
    "ec.fees.row.internal": "Interne overschrijving",
    "ec.fees.row.internalIn": "Interne overschrijving",
    "ec.fees.row.sepa": "SEPA",
    "ec.fees.row.sepaIn": "SEPA",
    "ec.fees.row.fp": "Faster Payments",
    "ec.fees.row.fpIn": "Faster Payments",
    "ec.fees.row.fedwire": "Fedwire",
    "ec.fees.row.achUsd": "ACH (USD)",
    "ec.fees.row.swiftGbp": "SWIFT in GBP",
    "ec.fees.row.swiftEur": "SWIFT in EUR",
    "ec.fees.row.swiftUsd": "SWIFT in USD",
    "ec.fees.row.swiftIn": "SWIFT",
    "ec.fees.row.fxMarkup": "FX-opslag",
    "ec.fees.row.exchange": "Valutawissel",
    "ec.fees.note.swiftCap": "SWIFT-kosten beperkt tot {cap} per overschrijving op dit plan.",
    "ec.fees.footer.disclaimer": "Definitieve tarieven worden bevestigd tijdens onboarding.",
    "ec.fees.footer.link": "Volledige tabel op altery.com/fees/business →",
  });
})();
