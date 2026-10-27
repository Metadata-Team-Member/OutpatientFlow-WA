// Build data/reference/establishments.json: EXACTLY the establishments with "Reports to NADC" = Y in the
// WA Health Establishment List, May 2026 (v0.1) - see data/reference/official_nadc_reporting_2026-05.json.
// Official code, name and Est type come from that list. The list has NO health service provider (HSP), region or coordinates,
// so those are joined from SLIP (HEALTH-001) and OpenStreetMap by code or name and are labelled non-official (hspBasis, locationStatus).
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../data/reference/', import.meta.url).pathname;
const L7 = JSON.parse(readFileSync(root + 'raw/slip_health_L7_all.json'));
const L6 = JSON.parse(readFileSync(root + 'raw/slip_health_L6_all.json'));
const OFF = JSON.parse(readFileSync(root + 'official_nadc_reporting_2026-05.json'));

const HSP_NAMES = {
  NMHS: 'North Metropolitan Health Service', SMHS: 'South Metropolitan Health Service',
  EMHS: 'East Metropolitan Health Service', CAHS: 'Child and Adolescent Health Service',
  WACHS: 'WA Country Health Service',
};
const TYPE_LABEL = { AH: 'Acute Hospital', NP: 'Nursing Post', OH: 'Other Health Care Accommodation', DS: 'Day Surgery (Other)', RC: 'Referral Code' };
const SLIP_HS = { 'North Metro': 'NMHS', 'South Metro': 'SMHS', 'East Metro': 'EMHS', WACHS: 'WACHS' };
const clean = (s) => (s ?? '').toString().trim();
const yes = (s) => clean(s) === 'Y';

// Rows from SLIP by estab_id (any layer, flag ignored: the NADC flag now comes from the official list, not SLIP).
const slip = new Map();
for (const [layer, rows] of [[7, L7], [6, L6]]) for (const r of rows) slip.set(Math.trunc(r.attributes.estab_id), { a: r.attributes, g: r.geometry, layer });

// Official code -> SLIP estab_id where the official list renumbered or SLIP uses another id (matched by name and place; see docs/ESTABLISHMENTS.md).
const SLIP_ID = { 4281: 6025, 4282: 6026, 4283: 6027, 4284: 6028, 4285: 4223, 4286: 6030, 4287: 6031, 4288: 6032, 4289: 6033, 4290: 6035, 4291: 6036, 145: 645, 113: 629 };
// Official codes with no SLIP row. Coordinates found by name in OpenStreetMap (Nominatim) where possible.
const PLACE = {
  110: { lat: -31.96985, lon: 115.81569, status: 'osm-named', note: 'OpenStreetMap: "Oral Health Centre of WA (OHCWA)", 17 Monash Avenue, Nedlands.' },
  4058: { lat: -30.30541, lon: 115.04405, status: 'osm-similar-name', note: 'OpenStreetMap has "Jurien Bay Health Centre", 23 Whitfield Road, Jurien Bay, but no "Jurien Bay Hospital"; assumed to be the same site (not verified).' },
  4518: { lat: -32.52625, lon: 115.7209, status: 'nearest-town', note: 'Mandurah Community Health Centre not found by name in OpenStreetMap; placed at the centre of Mandurah.' },
  4519: { lat: -32.24741, lon: 115.81494, status: 'nearest-town', note: 'Kwinana Community Health Centre not found by name in OpenStreetMap; placed at Kwinana Town Centre.' },
  4275: { lat: -31.9523, lon: 115.8613, status: 'not-found', note: 'Location not found (organisation, not a located facility); placeholder at Perth CBD.' },
  4506: { lat: -31.9523, lon: 115.8613, status: 'not-found', note: 'Location not found (organisation, not a located facility); placeholder at Perth CBD.' },
  652: { lat: -31.9523, lon: 115.8613, status: 'not-found', note: 'Silver Chain Hospital at Home is a home-based service; no physical site located; placeholder at Perth CBD.' },
};
// HSP is NOT in the Establishment List. Non-official labels: SLIP geographic service (default), then the overrides below.
const HSP_OVERRIDE = {
  107: { hsp: 'CAHS', basis: 'crs', note: "Perth Children's Hospital is part of CAHS (DoH Central Referral Service page, 8 Sep 2026; SLIP lists it under the North Metro geographic service)." },
  642: { hsp: 'NMHS', basis: 'crs', contracted: true, note: 'Joondalup Health Campus: operated by Ramsay Health Care under a public-private arrangement; listed under NMHS on the DoH CRS page.' },
  6007: { hsp: 'EMHS', basis: 'crs', contracted: true, note: 'St John of God Midland Public Hospital: operated by St John of God Health Care under a public-private arrangement; listed under EMHS (EMHS website, DoH CRS page).' },
  612: { hsp: 'WACHS', basis: 'slip', contracted: true, note: 'Private hospital (St John of God Health Care) in the WACHS South West area; shown under WACHS from SLIP. Why it reports to the NADC is not stated in the documents.' },
  602: { hsp: 'NMHS', basis: 'slip', contracted: true, note: 'Private hospital. Shown under NMHS only because SLIP places it in the North Metro geographic service; why a private hospital reports to the NADC is not stated in the documents.' },
  145: { hsp: 'SMHS', basis: 'crs', note: 'Peel Health Campus returned to public hands (SMHS) on 13 Aug 2024 (DoH CRS page). The official list has Peel under 145; SLIP uses 645.' },
  629: { hsp: 'EMHS', basis: 'crs', contracted: true, note: 'St John of God Mt Lawley Hospital; WA Government purchased it (State ownership from 31 Aug 2026, media statement 1 May 2026); EMHS website lists it.' },
  113: { hsp: 'EMHS', basis: 'assumed', note: 'Official list has both 113 Mount Lawley Hospital and 629 St John of God Mt Lawley Hospital reporting to the NADC; assumed to be the same site (successor and predecessor code, not verified). Plotted next to 629.' },
  110: { hsp: 'NMHS', basis: 'assumed', note: 'Oral Health Centre of WA: HSP not stated anywhere in the supplied documents; shown under NMHS only because it is in Nedlands (display grouping).' },
  4275: { hsp: 'NMHS', basis: 'assumed', note: 'Non-hospital organisation; not part of any HSP so far as the documents say. Shown under NMHS purely as a display grouping.' },
  4506: { hsp: 'NMHS', basis: 'assumed', note: 'Non-hospital organisation; not part of any HSP so far as the documents say. Shown under NMHS purely as a display grouping.' },
  652: { hsp: 'NMHS', basis: 'assumed', note: 'Home-based service operated by Silver Chain (contracted); not part of any HSP so far as the documents say. Shown under NMHS purely as a display grouping.' },
  4518: { hsp: 'SMHS', basis: 'assumed', note: 'HSP not stated in the documents; Mandurah is in the SMHS catchment (Peel); display grouping.' },
  4519: { hsp: 'SMHS', basis: 'assumed', note: 'HSP not stated in the documents; Kwinana is in the SMHS catchment; display grouping.' },
  4058: { hsp: 'WACHS', basis: 'assumed', note: 'HSP not stated in the documents; Jurien Bay is a WA Country Health Service area; display grouping.' },
};
const SHORT = {
  101: 'RPH', 102: 'Fremantle', 104: 'KEMH', 105: 'SCGH', 106: 'FSH', 107: 'PCH', 203: 'Armadale', 255: 'Bentley', 239: 'Osborne Park',
  277: 'Rockingham', 454: 'Kalamunda', 642: 'Joondalup', 145: 'Peel', 629: 'SJOG Mt Lawley', 113: 'Mt Lawley', 6007: 'SJOG Midland', 612: 'SJOG Bunbury',
  131: 'Hedland', 132: 'Karratha', 201: 'Albany', 208: 'Bunbury', 226: 'Kalgoorlie', 220: 'Geraldton', 206: 'Broome', 257: 'Kununurra',
  110: 'Oral Health', 652: 'SC Home Hosp', 4107: 'Kulin', 462: 'Abrolhos', 4275: 'Hall & Prior', 4506: 'Neuro Council', 4518: 'Mandurah CHC', 4519: 'Kwinana CHC', 602: 'Bethesda', 438: 'Wyalkatchem',
};
const shortName = (code, name) => SHORT[code] || name
  .replace(/ (Memorial |Soldiers Memorial |and District )?(Hospital|Health Campus|Health Service|Health Centre|Nursing Post)$/i, '').replace(/ Memorial$/i, '').replace(/ Hospital$/i, '').trim();
const hav = (la1, lo1, la2, lo2) => { const r = Math.PI / 180, x = (lo2 - lo1) * r * Math.cos((la1 + la2) * r / 2), y = (la2 - la1) * r; return Math.hypot(x, y); };
const slipList = [...slip.values()];
const nearest = (lat, lon) => slipList.map((s) => ({ s, d: hav(lat, lon, s.a.latitude ?? s.g.y, s.a.longitude ?? s.g.x) })).sort((p, q) => p.d - q.d)[0].s;

const out = [];
for (const o of OFF.establishments) {
  const code = +o.code;
  const sid = SLIP_ID[code] ?? code;
  const hit = slip.get(sid);
  const place = PLACE[code];
  let lat, lon, status, locNote = null, base = hit;
  if (hit) {
    lat = hit.a.latitude ?? hit.g.y; lon = hit.a.longitude ?? hit.g.x;
    status = SLIP_ID[code] ? 'slip-matched-by-name' : 'slip';
    if (code === 113) { lat += 0.0006; lon += 0.0006; status = 'shared-site'; locNote = 'Plotted 60 m from 629 (same suburb, assumed same site).'; }
    if (SLIP_ID[code] && code !== 113 && code !== 145) locNote = `SLIP lists this site as estab_id ${sid} "${clean(hit.a.establishm)}".`;
  } else { lat = place.lat; lon = place.lon; status = place.status; locNote = place.note; base = nearest(lat, lon); }
  const a = base.a;
  const ov = HSP_OVERRIDE[code] || (code === 629 ? HSP_OVERRIDE[629] : null);
  const slipHsp = SLIP_HS[clean(a.hs_operati)] || null;
  const hsp = ov ? ov.hsp : slipHsp;
  const own = hit ? clean(a.est) : null;
  out.push({
    code: o.code, name: o.name, type: o.type, typeLabel: o.type ? TYPE_LABEL[o.type] : null, mps: o.mps, nadcColumn: o.nadcColumn,
    short: shortName(code, o.name),
    kind: o.type === 'AH' || code === 113 ? 'hospital' : 'nursing_post',
    slipName: hit ? clean(a.establishm) : null, slipEstabId: hit ? sid : null,
    ownership: own, category: hit ? clean(a.esy) : null, area: clean(a.esa), beds: hit ? Math.trunc(a.no_of_beds || 0) : 0,
    lat: +(+lat).toFixed(5), lon: +(+lon).toFixed(5), locationStatus: status, locationNote: locNote,
    suburb: hit ? clean(a.suburb) : clean(base.a.suburb), district: clean(a.hd_operati), region: clean(a.hr_operati), slipService: clean(a.hs_operati),
    hsp, hspBasis: ov ? ov.basis : 'slip', contracted: !!(ov && ov.contracted), hspNote: ov ? ov.note : null,
    flags: hit ? { hmds: yes(a.hmds_repor), ed: yes(a.ed_reporti), outpatient: yes(a.outpatient), mentalHealth: yes(a.mental_hea), mps: yes(a.mps) } : null,
    slipLayer: hit ? hit.layer : null, slipObjectId: hit ? a.objectid : null,
  });
}
out.sort((a, b) => a.code.localeCompare(b.code));
if (new Set(out.map((e) => e.code)).size !== out.length) throw new Error('duplicate codes');
if (out.length !== OFF.count) throw new Error('count mismatch');
for (const e of out) if (!e.hsp || !e.region) throw new Error('no hsp/region ' + e.code);
const byHsp = {};
for (const e of out) byHsp[e.hsp] = (byHsp[e.hsp] || 0) + 1;
const doc = {
  _about: 'The 125 establishments with "Reports to NADC" = Y in the WA Health Establishment List, May 2026 v0.1 (official code, name, Est type). HSP, region, district, beds and coordinates are NOT in that list: they are joined from SLIP / OpenStreetMap and labelled by hspBasis and locationStatus. See docs/ESTABLISHMENTS.md.',
  _attribution: '© Government of Western Australia, Department of Health (Establishment List, May 2026; SLIP / data.wa.gov.au HEALTH-001, licence "Not specified"). OpenStreetMap contributors (ODbL) for the few coordinates marked osm-*.',
  _retrieved: '2026-10-28', hspNames: HSP_NAMES, count: out.length, byHsp, establishments: out,
};
writeFileSync(root + 'establishments.json', JSON.stringify(doc));
console.log(out.length, byHsp);
console.log('status', out.reduce((m, e) => (m[e.locationStatus] = (m[e.locationStatus] || 0) + 1, m), {}));
console.log('basis', out.reduce((m, e) => (m[e.hspBasis] = (m[e.hspBasis] || 0) + 1, m), {}));
console.log(out.filter((e) => e.short.length > 14).map((e) => e.short));
console.log(out.filter((e) => !e.region || !e.district).map((e) => e.code));
