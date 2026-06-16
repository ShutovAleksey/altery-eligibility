// Generates docs/handoff-region-countries.json — the corridor region → ISO
// country-code mapping the registration app uses to expand the handoff's
// `corridors_in` / `corridors_out` region slugs into countries, with
// SANCTIONED countries stripped (you cannot declare payment corridors with
// them, and they only sit in the chip lists for geographic completeness).
//
// Source of truth: EC_CHIP_REGIONS in checker-data.js — so the dev's expansion
// always matches the checker's chips. Regenerate after any change there:
//   node scripts/gen-corridor-countries.mjs
import { loadSandbox } from "../test/load.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// Comprehensively/partially sanctioned — excluded from every region. Mirrors
// the hard-coded risk:"blocked" sanctions set in checker-data.js EC_COUNTRIES
// (kept explicit here because the loaded EC_COUNTRIES stamps "blocked" on all
// non-serviceable countries too, which is a different, broader concept).
const SANCTIONED = new Set(["AF", "BY", "CU", "IR", "KP", "MM", "RU", "SD", "SY"]);

const w = loadSandbox();
const chipRegions = w.EC_CHIP_REGIONS;
if (!chipRegions) {
  console.error("EC_CHIP_REGIONS not found on the sandbox window — aborting.");
  process.exit(1);
}

const regions = {};
let stripped = 0;
for (const [slug, codes] of Object.entries(chipRegions)) {
  const kept = codes.filter((c) => !SANCTIONED.has(c));
  stripped += codes.length - kept.length;
  regions[slug] = kept;
}

const payload = {
  _comment:
    "Corridor region slug -> ISO 3166-1 alpha-2 country codes for the Altery eligibility-checker handoff. The checker sends corridors_in / corridors_out as region slugs (+ any individual ISO countries a user added by hand). Expand the slugs to countries with this map. Sanctioned countries are already excluded. Source: EC_CHIP_REGIONS in checker-data.js. Regenerate: node scripts/gen-corridor-countries.mjs",
  sanctioned_excluded: [...SANCTIONED].sort(),
  regions,
};

const dest = path.join(root, "docs", "handoff-region-countries.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(payload, null, 2) + "\n");

for (const [slug, codes] of Object.entries(regions)) {
  console.log(`${slug.padEnd(15)} ${codes.length} countries`);
}
console.log(`\nStripped ${stripped} sanctioned entries across all regions.`);
console.log(`Wrote ${path.relative(root, dest)}`);
