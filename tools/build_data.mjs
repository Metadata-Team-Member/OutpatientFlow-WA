#!/usr/bin/env node
/**
 * Builds the compact file the website loads (data/synthetic.json) from two CSV extracts that follow the
 * column layout in docs/DATA-REQUIREMENTS.md (section 6 "Suggested extract format").
 *
 *   node tools/build_data.mjs                                   # uses data/csv/*.csv (synthetic)
 *   node tools/build_data.mjs --referrals my_refs.csv --appointments my_apps.csv --out data/real.json --real
 *
 * The code lists come from config/dimensions.json. Unknown codes are kept (added to the lists) so nothing is dropped silently.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), v.startsWith('--real') ? true : arr[i + 1]]] : a), []));
const dims = JSON.parse(fs.readFileSync(path.join(ROOT, args.dims || 'config/dimensions.json'), 'utf8'));
const refFile = args.referrals || path.join(ROOT, 'data/csv/referrals.csv');
const appFile = args.appointments || path.join(ROOT, 'data/csv/appointments.csv');
const outFile = args.out || path.join(ROOT, 'data/synthetic.json');
const isReal = !!args.real;

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const refs = parseCsv(fs.readFileSync(refFile, 'utf8'));
const apps = parseCsv(fs.readFileSync(appFile, 'utf8'));

const D0 = Date.parse(dims.start + 'T00:00:00Z');
const dayOf = (s) => Math.round((Date.parse(s + 'T00:00:00Z') - D0) / 864e5);
const DAYS = dayOf(dims.end) + 1;

// index helpers (add unknown codes on the fly)
const idx = (list, key = 'code') => { const m = new Map(list.map((x, i) => [x[key], i])); return (code, label) => { if (!m.has(code)) { list.push({ [key]: code, label: label || code, auto: true }); m.set(code, list.length - 1); } return m.get(code); }; };
const iSite = idx(dims.sites, 'id'), iSpec = idx(dims.specialties), iReg = idx(dims.regions), iSrc = idx(dims.sources), iPrio = idx(dims.priorities);
const iMode = idx(dims.modes), iOut = idx(dims.outcomes), iAtt = idx(dims.attendance), iClose = idx(dims.closeReasons), iInd = idx(dims.indigenous);
const ageIdx = (age) => (age <= 14 ? 0 : age <= 24 ? 1 : age <= 44 ? 2 : age <= 64 ? 3 : age <= 79 ? 4 : 5);
const postcodes = []; const pcMap = new Map();
const iPc = (p) => { if (!pcMap.has(p)) { pcMap.set(p, postcodes.length); postcodes.push(p); } return pcMap.get(p); };

const byRef = new Map();
for (const a of apps) { const k = a.REF_ID; if (!byRef.has(k)) byRef.set(k, []); byRef.get(k).push(a); }

const cols = { id: [], age: [], ageGrp: [], ind: [], region: [], pc: [], src: [], prio: [], spec: [], site: [], ref: [], prior: [], end: [], endReason: [], ev: [] };
let nEvents = 0;
for (const r of refs) {
  const ref = dayOf(r.REF_RECEIVED_DATE);
  if (ref >= DAYS) continue;
  const age = +r.PER_AGE_YEARS || 0;
  cols.id.push(r.PER_PERSON_ID || r.REF_ID); cols.age.push(age); cols.ageGrp.push(ageIdx(age));
  cols.ind.push(iInd(r.PER_INDIGENOUS_STATUS_CODE || '9')); cols.region.push(iReg(r.PER_REGION_CODE)); cols.pc.push(iPc(r.PER_ADDRESS_POSTCODE));
  cols.src.push(iSrc(r.REF_SOURCE_CODE)); cols.prio.push(iPrio(r.REF_PRIORITY_CODE)); cols.spec.push(iSpec(r.CLINIC_CATEGORY_CODE)); cols.site.push(iSite(r.ESTABLISHMENT_ID));
  cols.ref.push(ref); cols.prior.push(+r.PRIOR_ATTENDED_24M || 0);
  const end = r.REF_DISCHARGE_DATE ? dayOf(r.REF_DISCHARGE_DATE) : -1;
  cols.end.push(end >= 0 && end < DAYS ? end : -1);
  cols.endReason.push(r.REF_CLOSURE_REASON_CODE ? iClose(r.REF_CLOSURE_REASON_CODE) : -1);
  const evs = (byRef.get(r.REF_ID) || []).map((a) => [dayOf(a.APP_DATE), iAtt(a.APP_ATTENDANCE_CODE), iMode(a.APP_DELIVERY_TYPE_CODE), iOut(a.APP_OUTCOME_CODE || 'NSP'), a.APP_NEW_FOLLOWUP_CODE === 'NEW' ? 0 : 1]).filter((e) => e[0] < DAYS && e[0] >= ref).sort((a, b) => a[0] - b[0]);
  cols.ev.push(evs.flat()); nEvents += evs.length;
}
const out = {
  meta: {
    synthetic: !isReal,
    banner: isReal ? 'Real extract (approved use only)' : 'SYNTHETIC EXAMPLE DATA - not real WA Health data',
    generatedBy: 'tools/build_data.mjs', patients: cols.id.length, events: nEvents,
    start: dims.start, end: dims.end, simStart: dims.simStart, days: DAYS,
  },
  dims: { sites: dims.sites, specialties: dims.specialties, regions: dims.regions, sources: dims.sources, priorities: dims.priorities, modes: dims.modes, outcomes: dims.outcomes, attendance: dims.attendance, closeReasons: dims.closeReasons, ageGroups: dims.ageGroups, indigenous: dims.indigenous, postcodes },
  cols,
};
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(`Wrote ${path.relative(ROOT, outFile)}: ${cols.id.length} referral episodes, ${nEvents} appointment events, ${(fs.statSync(outFile).size / 1024).toFixed(0)} KB`);
