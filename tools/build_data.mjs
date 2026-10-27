#!/usr/bin/env node
/**
 * Builds the compact file the website loads (data/synthetic.json) from two CSV extracts whose columns use the
 * element names of the NAPDC Data Specifications v1.0 (see docs/DATA-DICTIONARY-MAPPING.md).
 *
 *   node tools/build_data.mjs                                   # uses data/csv/*.csv (synthetic)
 *   node tools/build_data.mjs --referrals my_refs.csv --appointments my_apps.csv --out data/real.json --real
 *
 * Dates may be DDMMYYYY (as in the Specification) or YYYY-MM-DD. Unknown codes are appended to the code lists
 * (flagged auto:true) so nothing is dropped silently.
 *
 * Event encoding (one integer per appointment record):  day | kind<<11 | mode<<13 | code<<16 | type<<21
 *   kind 0 attended (outcome allocated) | 1 did not attend (non-attendance reason, blank outcome) | 2 cancelled (outcome CAN)
 *   code = index into outcomes (kind 0), nonAttendance (kind 1) or cancellation (kind 2);  type 0 NEW | 1 FOL
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGeo, loadEstablishments } from './lib_ref.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), v.startsWith('--real') ? true : arr[i + 1]]] : a), []));
const dims = JSON.parse(fs.readFileSync(path.join(ROOT, args.dims || 'config/dimensions.json'), 'utf8'));
const refFile = args.referrals || path.join(ROOT, 'data/csv/referrals.csv');
const appFile = args.appointments || path.join(ROOT, 'data/csv/appointments.csv');
const outFile = args.out || path.join(ROOT, 'data/synthetic.json');
const isReal = !!args.real;
const { est, hspNames, raw } = loadEstablishments(ROOT, dims);
const { districts } = loadGeo(ROOT, dims);

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
const parseDate = (s) => (/^\d{8}$/.test(s) ? Date.UTC(+s.slice(4), +s.slice(2, 4) - 1, +s.slice(0, 2)) : Date.parse(s + 'T00:00:00Z'));
const dayOf = (s) => Math.round((parseDate(s) - D0) / 864e5);
const DAYS = dayOf(dims.end) + 1;

const idx = (list, key = 'code') => { const m = new Map(list.map((x, i) => [x[key], i])); return (code) => { if (!m.has(code)) { list.push({ [key]: code, label: code, auto: true }); m.set(code, list.length - 1); } return m.get(code); }; };
const iSite = new Map(est.map((e, i) => [e.code, i]));
const iDist = new Map(districts.map((d, i) => [d.name, i]));
const regionIdx = Object.fromEntries(dims.regionOrder.map((r, i) => [r, i]));
const iSpec = idx(dims.specialties), iSrc = idx(dims.sources), iPrio = idx(dims.priorities), iReason = idx(dims.referralReasons);
const iMode = idx(dims.modes), iOut = idx(dims.outcomes), iNon = idx(dims.nonAttendance), iCan = idx(dims.cancellation), iClose = idx(dims.closeReasons);
const ageIdx = (age) => (age <= 14 ? 0 : age <= 24 ? 1 : age <= 44 ? 2 : age <= 64 ? 3 : age <= 79 ? 4 : 5);

const byRef = new Map();
for (const a of apps) { const k = a.REFERRAL_ACCOUNT_NUMBER; if (!byRef.has(k)) byRef.set(k, []); byRef.get(k).push(a); }

const cols = { id: [], age: [], ageGrp: [], district: [], region: [], site: [], spec: [], src: [], prio: [], reason: [], ref: [], prior: [], end: [], endReason: [], evN: [], ev: [] };
let nEvents = 0, skipped = 0;
for (const r of refs) {
  const ref = dayOf(r.REFERRAL_RECEIVED_DATE);
  if (ref >= DAYS) continue;
  if (!iSite.has(r.ESTABLISHMENT_CODE) || !iDist.has(r.DERIVED_HEALTH_DISTRICT)) { skipped++; continue; }
  const age = +r.DERIVED_AGE_YEARS || 0; const di = iDist.get(r.DERIVED_HEALTH_DISTRICT);
  cols.id.push(r.DERIVED_PERSON_KEY || r.REFERRAL_ACCOUNT_NUMBER); cols.age.push(age); cols.ageGrp.push(ageIdx(age));
  cols.district.push(di); cols.region.push(regionIdx[districts[di].region]); cols.site.push(iSite.get(r.ESTABLISHMENT_CODE));
  cols.spec.push(iSpec(r.REFERRAL_CATEGORY_CODE)); cols.src.push(iSrc(r.REFERRAL_SOURCE_CODE)); cols.prio.push(iPrio(r.REFERRAL_PRIORITY_CODE)); cols.reason.push(iReason(r.REFERRAL_REASON_CODE));
  cols.ref.push(ref); cols.prior.push(+r.DERIVED_PRIOR_ATTENDED || 0);
  const end = r.REFERRAL_CLOSED_DATE ? dayOf(r.REFERRAL_CLOSED_DATE) : -1;
  cols.end.push(end >= 0 && end < DAYS ? end : -1);
  cols.endReason.push(r.REFERRAL_REASON_FOR_CLOSURE_CODE ? iClose(r.REFERRAL_REASON_FOR_CLOSURE_CODE) : -1);
  const evs = (byRef.get(r.REFERRAL_ACCOUNT_NUMBER) || []).map((a) => {
    const out = a.APPOINTMENT_OUTCOME_CODE || '', non = a.APPOINTMENT_NON_ATTENDANCE_REASON_CODE || '';
    const kind = out === 'CAN' ? 2 : non || !out ? 1 : 0;
    const code = kind === 0 ? iOut(out) : kind === 1 ? iNon(non || 'UNK') : iCan(a.APPOINTMENT_CANCELLATION_CODE || 'UNK');
    const day = dayOf(a.APPOINTMENT_DATE);
    return { day, packed: day | (kind << 11) | (iMode(a.APPOINTMENT_DELIVERY_MODE_CODE) << 13) | (code << 16) | ((a.APPOINTMENT_TYPE_CODE === 'NEW' ? 0 : 1) << 21) };
  }).filter((e) => e.day < DAYS && e.day >= ref).sort((a, b) => a.day - b.day);
  cols.evN.push(evs.length); evs.forEach((e) => cols.ev.push(e.packed)); nEvents += evs.length;
}
const out = {
  meta: {
    synthetic: !isReal,
    banner: isReal ? 'Real extract (approved use only)' : 'SYNTHETIC EXAMPLE DATA - not real WA Health data',
    generatedBy: 'tools/build_data.mjs', patients: cols.id.length, events: nEvents,
    start: dims.start, end: dims.end, simStart: dims.simStart, days: DAYS,
    encoding: 'ev = day | kind<<11 | mode<<13 | code<<16 | type<<21; evN = events per patient',
  },
  dims: {
    hsps: Object.entries(hspNames).map(([code, name]) => ({ code, name })),
    regions: dims.regionOrder.map((name) => ({ name, hsp: ['North Metro', 'East Metro', 'South Metro'].includes(name) ? { 'North Metro': 'NMHS', 'East Metro': 'EMHS', 'South Metro': 'SMHS' }[name] : 'WACHS' })),
    districts: districts.map((d) => ({ name: d.name, region: regionIdx[d.region], code: d.code, lat: +d.lat.toFixed(3), lon: +d.lon.toFixed(3) })),
    establishments: est.map((e) => ({ code: e.code, short: e.short, name: e.name, hsp: e.hspI, region: e.regionI, district: e.district, kind: e.kind, tier: e.tier, beds: e.beds, lat: e.lat, lon: e.lon, contracted: !!e.contracted, category: e.category, area: e.area })),
    tiers: dims.tiers, specialties: dims.specialties.map(({ code, name, hue, verified, viaCrs }) => ({ code, name, hue, verified, viaCrs })),
    priorities: dims.priorities, sources: dims.sources.map(({ code, label, internal }) => ({ code, label, internal })), referralReasons: dims.referralReasons,
    modes: dims.modes, outcomes: dims.outcomes.map(({ code, label, ends }) => ({ code, label, ends })), nonAttendance: dims.nonAttendance.map(({ code, label }) => ({ code, label })),
    cancellation: dims.cancellation.map(({ code, label, by }) => ({ code, label, by })), closeReasons: dims.closeReasons, ageGroups: dims.ageGroups, eventKinds: dims.eventKinds,
    attribution: raw._attribution,
  },
  cols,
};
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(`Wrote ${path.relative(ROOT, outFile)}: ${cols.id.length} referral episodes, ${nEvents} appointment events, ${(fs.statSync(outFile).size / 1024).toFixed(0)} KB${skipped ? ', skipped ' + skipped : ''}`);
