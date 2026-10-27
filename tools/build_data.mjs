#!/usr/bin/env node
/**
 * Builds the compact file the website loads (data/synthetic.json) from two CSV extracts whose columns use the
 * element names of the NAPDC Data Specifications v1.0 (see docs/DATA-DICTIONARY-MAPPING.md).
 *
 *   node tools/build_data.mjs                                   # uses data/csv/*.csv (synthetic)
 *   node tools/build_data.mjs --referrals my_refs.csv --appointments my_apps.csv --out data/real.json --real
 *   node tools/build_data.mjs ... --real --start 2019-07-01 --end 2025-06-30 --sim-start 2023-07-01
 *
 * Dates may be DDMMYYYY (as in the Specification), DDMMYYYY HH:MM:SS, DD/MM/YYYY or YYYY-MM-DD. Unknown codes are
 * appended to the code lists (flagged auto:true) so nothing is dropped silently. Rows that cannot be used (unknown
 * establishment or district, unreadable received date) are counted and listed at the end, never dropped silently.
 * With --real and no --start / --end, the period is taken from the data (start = first of the month of the earliest
 * received date, but at most about 5.5 years before the end; end = latest received date).
 *
 * Event encoding (one integer per appointment record):  day | kind<<11 | mode<<13 | code<<17 | type<<23
 *   day 11 bits (0..2047) | kind 2 bits | mode 4 bits (0..15) | code 6 bits (0..63) | type 1 bit
 *   kind 0 attended (ATT / outcome allocated) | 1 did not attend (DNA, DNW, or non-attendance reason, or blank outcome) | 2 cancelled (outcome CAN or a cancellation code)
 *   code = index into outcomes (kind 0), nonAttendance (kind 1) or cancellation (kind 2);  type 0 NEW | 1 FOL
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGeo, loadEstablishments } from './lib_ref.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
{ const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); if (k === 'real') args.real = true; else { if (a[i + 1] === undefined || a[i + 1].startsWith('--')) die('Missing value for --' + k); args[k] = a[++i]; } } }
function die(msg) { console.error('build_data: ' + msg); process.exit(1); }
const dims = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.dims || 'config/dimensions.json'), 'utf8'));
const refFile = path.resolve(args.referrals || path.join(ROOT, 'data/csv/referrals.csv'));
const appFile = path.resolve(args.appointments || path.join(ROOT, 'data/csv/appointments.csv'));
const outFile = path.resolve(args.out || path.join(ROOT, 'data/synthetic.json'));
const isReal = !!args.real;
if (isReal && path.basename(outFile) === 'synthetic.json') die('--real must not overwrite data/synthetic.json; use --out data/real.json (git-ignored)');
for (const f of [refFile, appFile]) if (!fs.existsSync(f)) die('File not found: ' + f);
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
  const head = rows.shift().map((h) => h.replace(/^\uFEFF/, '').trim().toUpperCase());
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const refs = parseCsv(fs.readFileSync(refFile, 'utf8'));
const apps = parseCsv(fs.readFileSync(appFile, 'utf8'));
const need = (rows, file, cols) => { const have = new Set(Object.keys(rows[0] || {})); const miss = cols.filter((c) => !have.has(c)); if (miss.length) die(file + ' is missing column(s): ' + miss.join(', ')); };
if (!refs.length) die('No rows in ' + refFile);
need(refs, 'referrals file', ['ESTABLISHMENT_CODE', 'REFERRAL_ACCOUNT_NUMBER', 'REFERRAL_RECEIVED_DATE', 'REFERRAL_PRIORITY_CODE', 'DERIVED_HEALTH_DISTRICT']);
if (apps.length) need(apps, 'appointments file', ['REFERRAL_ACCOUNT_NUMBER', 'APPOINTMENT_DATE', 'APPOINTMENT_DELIVERY_MODE_CODE']);

const parseDate = (s) => {
  s = (s || '').trim(); let m;
  if ((m = /^(\d{2})(\d{2})(\d{4})(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.exec(s))) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
  if ((m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s))) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return NaN;
};
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
if (isReal && !args.start && !args.end) {
  const ts = refs.map((r) => parseDate(r.REFERRAL_RECEIVED_DATE)).filter(Number.isFinite);
  if (!ts.length) die('No readable REFERRAL_RECEIVED_DATE values');
  const hi = Math.max(...ts); const lo = Math.max(Math.min(...ts), hi - 2000 * 864e5); const d = new Date(lo);
  dims.start = isoDay(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  dims.end = isoDay(hi); // appointments after the latest received date (future bookings) fall outside the period and are counted as dropped
}
if (args.start) dims.start = args.start;
if (args.end) dims.end = args.end;
if (args['sim-start']) dims.simStart = args['sim-start'];
else if (isReal) { const s0 = Date.parse(dims.start + 'T00:00:00Z'), e0 = Date.parse(dims.end + 'T00:00:00Z'); dims.simStart = isoDay(Math.min(e0, Math.max(s0, e0 - 3 * 365 * 864e5))); }
if (!Number.isFinite(Date.parse(dims.start)) || !Number.isFinite(Date.parse(dims.end))) die('Bad --start / --end (use YYYY-MM-DD)');
const D0 = Date.parse(dims.start + 'T00:00:00Z');
const dayOf = (s) => { const t = parseDate(s); return Number.isFinite(t) ? Math.round((t - D0) / 864e5) : NaN; };
const DAYS = Math.round((Date.parse(dims.end + 'T00:00:00Z') - D0) / 864e5) + 1;
if (DAYS > 2047) die('Period is ' + DAYS + ' days; the event encoding allows 2,047 (about 5.6 years). Use --start / --end to choose a window.');
if (DAYS < 30) die('Period is only ' + DAYS + ' days; check --start / --end.');

const autoAdded = [];
const REMOTE_MODES = new Set(['TEL', 'VID', 'ELE', 'THH', 'THC', 'THS']);
const idx = (list, key = 'code', name = '', limit = 64, extra = () => ({})) => { const m = new Map(list.map((x, i) => [x[key], i])); return (code) => { if (!m.has(code)) { if (list.length >= limit) die('More than ' + limit + ' distinct ' + (name || 'codes') + ' (the event encoding cannot hold ' + code + ')'); list.push({ [key]: code, label: code, auto: true, ...extra(code) }); m.set(code, list.length - 1); autoAdded.push((name || 'code') + ' ' + code); } return m.get(code); }; };
const iSite = new Map(est.map((e, i) => [e.code, i]));
const iDist = new Map(districts.map((d, i) => [d.name, i]));
const regionIdx = Object.fromEntries(dims.regionOrder.map((r, i) => [r, i]));
const iSpec = idx(dims.specialties, 'code', 'referral/clinic category', 64, (c) => ({ name: c, hue: (c.split('').reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7) % 360), verified: false })), iSrc = idx(dims.sources, 'code', 'referral source'), iPrio = idx(dims.priorities, 'code', 'priority', 16, (c) => ({ short: c, targetDays: 365, label2: 'No target defined in this tool (365 d drawn for display)' })), iReason = idx(dims.referralReasons, 'code', 'referral reason');
const iMode = idx(dims.modes, 'code', 'delivery mode', 16, (c) => ({ remote: REMOTE_MODES.has(c) })), iOut = idx(dims.outcomes, 'code', 'outcome'), iNon = idx(dims.nonAttendance, 'code', 'non-attendance reason'), iCan = idx(dims.cancellation, 'code', 'cancellation code'), iClose = idx(dims.closeReasons, 'code', 'closure reason');
const ageIdx = (age) => (age <= 14 ? 0 : age <= 24 ? 1 : age <= 44 ? 2 : age <= 64 ? 3 : age <= 79 ? 4 : 5);

const byRef = new Map();
for (const a of apps) { const k = a.REFERRAL_ACCOUNT_NUMBER; if (!byRef.has(k)) byRef.set(k, []); byRef.get(k).push(a); }

const cols = { id: [], age: [], ageGrp: [], district: [], region: [], site: [], spec: [], src: [], prio: [], reason: [], ref: [], prior: [], end: [], endReason: [], evN: [], ev: [] };
let nEvents = 0;
const skip = { badDate: 0, unknownSite: new Map(), unknownDistrict: new Map(), beforeStart: 0, afterEnd: 0, dupRef: 0 };
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
const seenRef = new Set(); let evDropped = 0, orphanApps = 0;
const refKeys = new Set(refs.map((r) => r.REFERRAL_ACCOUNT_NUMBER));
for (const a of apps) if (!refKeys.has(a.REFERRAL_ACCOUNT_NUMBER)) orphanApps++;
for (const r of refs) {
  const ref = dayOf(r.REFERRAL_RECEIVED_DATE);
  if (!Number.isFinite(ref)) { skip.badDate++; continue; }
  if (ref >= DAYS) { skip.afterEnd++; continue; }
  if (ref < 0) { skip.beforeStart++; continue; }
  if (seenRef.has(r.REFERRAL_ACCOUNT_NUMBER)) { skip.dupRef++; continue; }
  const site = (r.ESTABLISHMENT_CODE || '').trim().padStart(4, '0');
  if (!iSite.has(site)) { bump(skip.unknownSite, r.ESTABLISHMENT_CODE); continue; }
  if (!iDist.has(r.DERIVED_HEALTH_DISTRICT)) { bump(skip.unknownDistrict, r.DERIVED_HEALTH_DISTRICT); continue; }
  seenRef.add(r.REFERRAL_ACCOUNT_NUMBER);
  const age = Math.max(0, Math.min(120, +r.DERIVED_AGE_YEARS || 0)); const di = iDist.get(r.DERIVED_HEALTH_DISTRICT);
  cols.id.push(r.DERIVED_PERSON_KEY || r.REFERRAL_ACCOUNT_NUMBER); cols.age.push(age); cols.ageGrp.push(ageIdx(age));
  cols.district.push(di); cols.region.push(regionIdx[districts[di].region]); cols.site.push(iSite.get(site));
  cols.spec.push(iSpec(r.REFERRAL_CATEGORY_CODE || 'UNK')); cols.src.push(iSrc(r.REFERRAL_SOURCE_CODE || 'UNK')); cols.prio.push(iPrio(r.REFERRAL_PRIORITY_CODE || 'UNK')); cols.reason.push(iReason(r.REFERRAL_REASON_CODE || 'UNK'));
  cols.ref.push(ref); cols.prior.push(+r.DERIVED_PRIOR_ATTENDED || 0);
  const end = r.REFERRAL_CLOSED_DATE ? dayOf(r.REFERRAL_CLOSED_DATE) : -1;
  cols.end.push(Number.isFinite(end) && end >= 0 && end < DAYS ? end : -1);
  cols.endReason.push(r.REFERRAL_REASON_FOR_CLOSURE_CODE ? iClose(r.REFERRAL_REASON_FOR_CLOSURE_CODE) : -1);
  const evs = (byRef.get(r.REFERRAL_ACCOUNT_NUMBER) || []).map((a) => {
    const out = (a.APPOINTMENT_OUTCOME_CODE || '').trim(), non = (a.APPOINTMENT_NON_ATTENDANCE_REASON_CODE || '').trim();
    const att = (a.APPOINTMENT_ATTENDANCE_CODE || '').trim(), can = (a.APPOINTMENT_CANCELLATION_CODE || '').trim();
    // cancelled: outcome CAN or a cancellation code with no attendance. DNA / DNW / a non-attendance reason / no outcome: did not attend. Otherwise attended.
    const kind = (out === 'CAN' || (can && att !== 'ATT')) ? 2 : (att === 'DNA' || att === 'DNW' || non || !out) ? 1 : 0;
    const code = kind === 0 ? iOut(out) : kind === 1 ? iNon(non || 'UNK') : iCan(can || 'UNK');
    const day = dayOf(a.APPOINTMENT_DATE);
    return { day, packed: day | (kind << 11) | (iMode((a.APPOINTMENT_DELIVERY_MODE_CODE || 'UNK').trim()) << 13) | (code << 17) | ((a.APPOINTMENT_TYPE_CODE === 'NEW' ? 0 : 1) << 23) };
  }).filter((e) => { const ok = Number.isFinite(e.day) && e.day < DAYS && e.day >= ref; if (!ok) evDropped++; return ok; }).sort((a, b) => a.day - b.day);
  cols.evN.push(evs.length); evs.forEach((e) => cols.ev.push(e.packed)); nEvents += evs.length;
}
if (!cols.id.length) die('No usable referrals. Check ESTABLISHMENT_CODE (4 digits, see docs/ESTABLISHMENTS.md) and DERIVED_HEALTH_DISTRICT (a health district name from data/reference/wa_regions.geojson).');
const out = {
  meta: {
    synthetic: !isReal,
    banner: isReal ? 'Real extract (approved use only)' : 'SYNTHETIC EXAMPLE DATA - not real WA Health data',
    generatedBy: 'tools/build_data.mjs', patients: cols.id.length, events: nEvents,
    start: dims.start, end: dims.end, simStart: dims.simStart, days: DAYS,
    encoding: 'ev = day | kind<<11 | mode<<13 | code<<17 | type<<23; evN = events per patient',
  },
  dims: {
    hsps: Object.entries(hspNames).map(([code, name]) => ({ code, name })),
    regions: dims.regionOrder.map((name) => ({ name, hsp: ['North Metro', 'East Metro', 'South Metro'].includes(name) ? { 'North Metro': 'NMHS', 'East Metro': 'EMHS', 'South Metro': 'SMHS' }[name] : 'WACHS' })),
    districts: districts.map((d) => ({ name: d.name, region: regionIdx[d.region], code: d.code, lat: +d.lat.toFixed(3), lon: +d.lon.toFixed(3) })),
    establishments: est.map((e) => ({ code: e.code, short: e.short, name: e.name, hsp: e.hspI, region: e.regionI, district: e.district, kind: e.kind, tier: e.tier, beds: e.beds, lat: e.lat, lon: e.lon, contracted: !!e.contracted, category: e.category, area: e.area, official: e.officialNadc ? 1 : 0, added: e.source === 'official-list-extract' ? 1 : 0 })),
    tiers: dims.tiers, specialties: dims.specialties.map(({ code, name, hue, verified, viaCrs }) => ({ code, name, hue, verified, viaCrs })),
    priorities: dims.priorities, sources: dims.sources.map(({ code, label, internal }) => ({ code, label, internal })), referralReasons: dims.referralReasons,
    modes: dims.modes, outcomes: dims.outcomes.map(({ code, label, ends }) => ({ code, label, ends })), nonAttendance: dims.nonAttendance.map(({ code, label }) => ({ code, label })),
    cancellation: dims.cancellation.map(({ code, label, by }) => ({ code, label, by })), closeReasons: dims.closeReasons, ageGroups: dims.ageGroups, eventKinds: dims.eventKinds,
    attribution: raw._attribution,
  },
  cols,
};
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(`Wrote ${path.relative(ROOT, outFile)}: ${cols.id.length} referral episodes, ${nEvents} appointment events, ${(fs.statSync(outFile).size / 1024).toFixed(0)} KB; period ${dims.start}..${dims.end} (${DAYS} days), simulation starts ${dims.simStart}`);
const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${JSON.stringify(k)} x${v}`).join(', ');
const notes = [];
if (skip.badDate) notes.push(`${skip.badDate} referral(s) skipped: unreadable REFERRAL_RECEIVED_DATE`);
if (skip.beforeStart) notes.push(`${skip.beforeStart} referral(s) skipped: received before ${dims.start} (use --start to include them)`);
if (skip.afterEnd) notes.push(`${skip.afterEnd} referral(s) skipped: received after ${dims.end}`);
if (skip.dupRef) notes.push(`${skip.dupRef} duplicate REFERRAL_ACCOUNT_NUMBER row(s) skipped`);
if (skip.unknownSite.size) notes.push(`referrals skipped for establishment codes not in data/reference/establishments.json: ${top(skip.unknownSite)}`);
if (skip.unknownDistrict.size) notes.push(`referrals skipped for unknown DERIVED_HEALTH_DISTRICT: ${top(skip.unknownDistrict)}`);
if (evDropped) notes.push(`${evDropped} appointment(s) dropped: unreadable date, before the referral was received, or outside the period`);
if (orphanApps) notes.push(`${orphanApps} appointment row(s) have a REFERRAL_ACCOUNT_NUMBER with no referral row`);
if (autoAdded.length) notes.push(`codes not in config/dimensions.json were added with their code as the label (auto:true): ${[...new Set(autoAdded)].join(', ')}`);
if (notes.length) console.log('Notes:\n  - ' + notes.join('\n  - '));
