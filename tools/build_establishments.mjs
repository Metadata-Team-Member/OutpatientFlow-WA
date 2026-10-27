// Build data/reference/establishments.json from the SLIP "Health Hospitals" layers (HEALTH-001).
// An establishment is included when HEALTH-001 flags it "Outpatient Reporting" = Y,
// plus the sites that a verbatim extract of the official WA Health Establishment List ("Establishment List, Reporting", rows A to
// "Cambridge Day Surgery") shows with "Reports to NADC" = Y but that HEALTH-001 does not flag (OFFICIAL_ADD below).
// NOTE: the SLIP flag is not documented as being the NADC/NAPDC reporting list - see docs/OPEN-QUESTIONS.md and docs/ESTABLISHMENTS.md.
import { readFileSync, writeFileSync } from 'node:fs';
const raw = new URL('../data/reference/raw/', import.meta.url).pathname;
const L7 = JSON.parse(readFileSync(raw + 'slip_health_L7_all.json'));
const L6 = JSON.parse(readFileSync(raw + 'slip_health_L6_all.json'));

// Reporting group used by the simulation (current as at 27 Oct 2026). SLIP's own hs_operati only knows the 4 geographic "services",
// so the HSP is taken from the Department of Health "Central Referral Service" page (hospital lists by HSP, last reviewed 8 Sep 2026)
// and from the HSP / WA Government pages cited in each note.
const HSP_NAMES = {
  NMHS: 'North Metropolitan Health Service', SMHS: 'South Metropolitan Health Service',
  EMHS: 'East Metropolitan Health Service', CAHS: 'Child and Adolescent Health Service',
  WACHS: 'WA Country Health Service',
};
const SLIP_HS = { 'North Metro': 'NMHS', 'South Metro': 'SMHS', 'East Metro': 'EMHS', WACHS: 'WACHS' };
// Overrides where SLIP's geographic service differs from the governing HSP, or where the site is run by a contracted health entity.
const OVERRIDE = {
  107: { hsp: 'CAHS', note: "Perth Children's Hospital is part of CAHS (DoH CRS page, 8 Sep 2026; SLIP lists it under the North Metro geographic service)." },
  642: { hsp: 'NMHS', contracted: true, note: 'Joondalup Health Campus is operated by Ramsay Health Care under a public-private arrangement; listed under NMHS on the DoH CRS page. HEALTH-001 lists it as Private.' },
  6007: { hsp: 'EMHS', contracted: true, note: 'St John of God Midland Public Hospital is operated by St John of God Health Care under a public-private arrangement; listed under EMHS (EMHS website and DoH CRS page). HEALTH-001 lists it as Private.' },
  612: { hsp: 'WACHS', contracted: true, note: 'Private hospital (St John of God Health Care) in the WACHS South West area; HEALTH-001 flags outpatient reporting. Contract detail not verified.' },
  645: { hsp: 'SMHS', note: 'Peel Health Campus returned to public hands (SMHS) on 13 Aug 2024; listed under SMHS on the DoH CRS page. HEALTH-001 still lists it as Private under code 645. Search summaries of the May 2026 Establishments list say the public code is 145 (645 an older or private-era code); not verified, so the SLIP code is kept.' },
  629: { hsp: 'EMHS', note: 'Mount Lawley Hospital: purchased from St John of God Health Care by the WA Government, transferring to State ownership on 31 Aug 2026 (WA Government media statement, 1 May 2026); listed on the EMHS website (26 Oct 2026). HEALTH-001 still lists it as Private. Code 629 is the SLIP code; the official list was not seen for this row.' },
};
// Verbatim extract of the official Establishment List (search-index highlight, retrieved 27 Oct 2026; rows A to "Cambridge Day Surgery" only).
// Codes whose "Reports to NADC" cell is Y in that extract:
const OFFICIAL_NADC_A_TO_C = new Set([462, 201, 203, 204, 4281, 4282, 255, 602, 401, 402, 432, 4074, 444, 4283, 206, 403, 208, 4171, 209]);
// Sites with NADC = Y in the extract that HEALTH-001 does not flag. Keyed by the HEALTH-001 estab_id; `code` is the code printed in the official list.
// For 6025/6026/6027 the official list uses 4281/4282/4283 for the same names (Beacon, Bencubbin, Brookton), so the match is by name and place; coordinates come from the SLIP row.
const OFFICIAL_ADD = {
  462: { code: 462, officialName: 'Abrolhos Islands Health Centre', note: 'Official Establishment List extract: NADC = Y. HEALTH-001 lists the same code as "Abrolhos Islands Nursing Post" (new ID, previously Abrolhos Island Health Centre 6024) without the outpatient flag.' },
  6025: { code: 4281, officialName: 'Beacon Health Centre', note: 'Official Establishment List extract: 4281 Beacon Health Centre, NADC = Y. HEALTH-001 has a "Beacon Health Centre" under 6025 (Private nursing post) without the outpatient flag. Matched by name and place; coordinates from that SLIP row.' },
  6026: { code: 4282, officialName: 'Bencubbin Health Centre', note: 'Official Establishment List extract: 4282 Bencubbin Health Centre, NADC = Y. HEALTH-001 has a "Bencubbin Health Centre" under 6026 (Private nursing post) without the outpatient flag. Matched by name and place; coordinates from that SLIP row.' },
  6027: { code: 4283, officialName: 'Brookton Health Centre', note: 'Official Establishment List extract: 4283 Brookton Health Centre, NADC = Y. HEALTH-001 has a "Brookton Nursing Post" under 6027 (Private) without the outpatient flag. Matched by name and place; coordinates from that SLIP row.' },
  602: { code: 602, officialName: 'Bethesda Hospital', hsp: 'NMHS', contracted: true, note: 'Private hospital. Official Establishment List extract: 602 Bethesda Hospital, NADC = Y (with HMDC and SANADC). Not flagged in HEALTH-001. Shown under NMHS only because SLIP places it in the North Metro geographic service; the arrangement that puts a private hospital in the NADC (for example publicly funded outpatient services) is not verified.' },
};
const SHORT = {
  101: 'RPH', 102: 'Fremantle', 104: 'KEMH', 105: 'SCGH', 106: 'FSH', 107: 'PCH', 203: 'Armadale', 255: 'Bentley', 239: 'Osborne Park',
  277: 'Rockingham', 454: 'Kalamunda', 642: 'Joondalup', 645: 'Peel', 629: 'Mt Lawley', 6007: 'SJOG Midland', 612: 'SJOG Bunbury',
  131: 'Hedland', 132: 'Karratha', 201: 'Albany', 208: 'Bunbury', 226: 'Kalgoorlie', 220: 'Geraldton', 206: 'Broome', 257: 'Kununurra',
};
const clean = s => (s ?? '').toString().trim();
const yes = s => clean(s) === 'Y';
function shortName(id, name) {
  if (SHORT[id]) return SHORT[id];
  return name.replace(/ (Memorial |Soldiers Memorial |and District )?(Hospital|Health Campus|Health Service|Health Centre|Nursing Post)$/i, '')
    .replace(/ Memorial$/i, '').replace(/ Hospital$/i, '').trim();
}
const out = [];
for (const [layer, kind, rows] of [[7, 'hospital', L7], [6, 'nursing_post', L6]]) {
  for (const r of rows) {
    const a = r.attributes;
    const id = Math.trunc(a.estab_id);
    const add = OFFICIAL_ADD[id];
    if (!yes(a.outpatient) && !add) continue;
    const slipHsp = SLIP_HS[clean(a.hs_operati)] || null;
    const ov = OVERRIDE[id] || (add && (add.hsp || add.contracted) ? add : null);
    const lat = a.latitude ?? r.geometry?.y, lon = a.longitude ?? r.geometry?.x;
    if (lat == null || lon == null) throw new Error('no coordinates for ' + id);
    out.push({
      code: String(add ? add.code : id).padStart(4, '0'),
      name: add ? add.officialName : clean(a.establishm),
      slipName: clean(a.establishm), slipEstabId: id,
      source: add ? 'official-list-extract' : 'slip-flag',
      officialNadc: OFFICIAL_NADC_A_TO_C.has(add ? add.code : id) ? true : null,   // true = NADC "Y" seen in the verbatim extract; null = row not seen
      short: shortName(id, add ? add.officialName : clean(a.establishm)),
      kind,
      ownership: clean(a.est),                 // HEALTH-001 "Establishment Type": Public / Private
      category: clean(a.esy),                  // HEALTH-001 "Establishment Category"
      area: clean(a.esa),                      // Metro / Rural
      beds: Math.trunc(a.no_of_beds || 0),
      lat: +(+lat).toFixed(5), lon: +(+lon).toFixed(5),
      suburb: clean(a.suburb),
      district: clean(a.hd_operati), region: clean(a.hr_operati), slipService: clean(a.hs_operati),
      hsp: ov ? ov.hsp : slipHsp,
      contracted: !!(ov && ov.contracted),
      hspNote: add ? add.note : (ov ? ov.note : null),
      flags: { hmds: yes(a.hmds_repor), ed: yes(a.ed_reporti), outpatient: yes(a.outpatient), mentalHealth: yes(a.mental_hea), mps: yes(a.mps) },
      slipLayer: layer, slipObjectId: a.objectid,
    });
  }
}
out.sort((a, b) => a.code.localeCompare(b.code));
const dup = out.map(e => e.code).filter((c, i, arr) => arr.indexOf(c) !== i);
if (dup.length) throw new Error('duplicate codes ' + dup);
const byHsp = {};
for (const e of out) byHsp[e.hsp] = (byHsp[e.hsp] || 0) + 1;
const doc = {
  _about: 'Establishments flagged "Outpatient Reporting" = Y in HEALTH-001 Health Hospitals (SLIP), plus sites shown with NADC = Y in a verbatim extract of the official Establishment List. Not a certified NADC reporting list. See docs/ESTABLISHMENTS.md.',
  _attribution: '© Government of Western Australia, Department of Health, via SLIP / data.wa.gov.au (HEALTH-001). Licence listed as "Not specified" on the catalogue. Official-list rows: WA Health Establishment List (health.wa.gov.au), read through a search-index extract.',
  _retrieved: '2026-10-27', hspNames: HSP_NAMES, count: out.length, byHsp,
  establishments: out,
};
writeFileSync(new URL('../data/reference/establishments.json', import.meta.url).pathname, JSON.stringify(doc));
console.log(out.length, byHsp);
console.log('hospitals', out.filter(e => e.kind === 'hospital').length, 'nursing posts', out.filter(e => e.kind === 'nursing_post').length);
console.log(out.filter(e => e.short.length > 14).map(e => e.short));
