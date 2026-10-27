#!/usr/bin/env node
/**
 * OutpatientFlow WA - SYNTHETIC data generator (round 2)
 * ------------------------------------------------------
 * Produces fake, deterministic (seeded) referral + appointment extracts. Column names follow the data element
 * names of the WA Health NAPDC Data Specifications v1.0 (1 July 2021) - e.g. REFERRAL_RECEIVED_DATE,
 * APPOINTMENT_OUTCOME_CODE - and code values come from its Appendix B/C. Columns starting DERIVED_ are NOT NADC
 * elements: they stand in for things a real extract would derive (person key, age, health district).
 * Establishments are the 112 SLIP "outpatient reporting" facilities in data/reference/establishments.json.
 * Everything else (volumes, waits, DNA rates, who goes where) is an INVENTED model - see config/dimensions.json.
 *
 *   node tools/generate_synthetic.mjs [--patients 10000] [--seed 20261027]
 *   -> data/csv/referrals.csv , data/csv/appointments.csv   (git-ignored, regenerate any time)
 *   then: node tools/build_data.mjs  -> data/synthetic.json (what the website loads)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGeo, loadEstablishments, tierOf } from './lib_ref.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const N = +(args.patients || 11000);
const SEED = +(args.seed || 20261027);
const dims = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/dimensions.json'), 'utf8'));
const { est, hspIndex } = loadEstablishments(ROOT, dims);
const { districts, regionIdx } = loadGeo(ROOT, dims);

// ---------- seeded random helpers ----------
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED);
const u = () => rnd();
const normal = () => { let a = 0, b = 0; while (!a) a = u(); b = u(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); };
const logn = (median, sigma) => median * Math.exp(sigma * normal());
const pickW = (items, wf) => { let tot = 0; const w = items.map((x, i) => { const v = wf(x, i); tot += v; return v; }); let r = u() * tot; for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- calendar ----------
const ymd = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const D0 = ymd(dims.start);
const DAYS = Math.round((ymd(dims.end) - D0) / 864e5) + 1;
const ddmmyyyy = (d) => { const t = new Date(D0 + d * 864e5); return String(t.getUTCDate()).padStart(2, '0') + String(t.getUTCMonth() + 1).padStart(2, '0') + t.getUTCFullYear(); };
const isWeekend = (d) => { const w = new Date(D0 + d * 864e5).getUTCDay(); return w === 0 || w === 6; };
const nextWeekday = (d) => { while (isWeekend(d)) d++; return d; };

function dayWeight(d) {
  const dt = new Date(D0 + d * 864e5); const m = dt.getUTCMonth(); const dom = dt.getUTCDate();
  let w = 1 + 0.03 * (d / 365);
  if (m === 11 && dom > 20) w *= 0.35; if (m === 0 && dom < 8) w *= 0.45;
  if (isWeekend(d)) w *= 0.12;
  return w;
}
const dayCum = []; let acc = 0; for (let d = 0; d < DAYS; d++) { acc += dayWeight(d); dayCum.push(acc); }
function drawRefDay() { const r = u() * acc; let lo = 0, hi = DAYS - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (dayCum[mid] < r) lo = mid + 1; else hi = mid; } return lo; }
// invented: waiting-time pressure builds over the four years, peaks around mid-2025, eases a little
function pressure(d) { const x = d / DAYS; return 0.85 + 0.55 * Math.sin(Math.PI * Math.min(1, x * 1.15)) + (x > 0.8 ? -0.1 : 0); }

// ---------- geography helpers ----------
const km = (a, b) => { const dx = (a.lon - b.lon) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180) * 111.2, dy = (a.lat - b.lat) * 111.2; return Math.hypot(dx, dy); };
const specs = dims.specialties;
// district weights: region share spread across its districts with a fixed jitter
const dJit = districts.map((d, i) => 0.8 + 0.4 * ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1);
const regCount = {}; districts.forEach((d) => { regCount[d.region] = (regCount[d.region] || 0) + 1; });
const dW = districts.map((d, i) => dims.regionShare[d.region] / regCount[d.region] * dJit[i]);
const dRegion = districts.map((d) => regionIdx[d.region]);
const metro = (rName) => /Metro$/.test(rName);

// site weight for a (district, specialty, age) combination, precomputed per district x specialty x isChild
const siteW = new Map();
function siteWeights(di, si, child) {
  const key = di * 100 + si * 2 + (child ? 1 : 0);
  let c = siteW.get(key); if (c) return c;
  const d = districts[di], sp = specs[si]; const dMetro = metro(d.region);
  const w = est.map((e) => {
    const scope = (dims.scopeByTier[e.tier] || {})[sp.code] || 0; if (!scope) return 0;
    let ageF = 1;
    if (e.tier === 'PAED') ageF = child ? 8 : 0; else if (child && sp.code !== 'PAE') ageF = e.tier === 'TERT' ? 0.3 : 0.5; else if (child && e.tier !== 'PAED') ageF = 0.4;
    if (!ageF) return 0;
    const cap = Math.pow(Math.max(e.mbeds, 12), 0.85);
    const dist = km(d, e);
    const lam = e.tier === 'TERT' || e.tier === 'PAED' || e.tier === 'WOMN' ? (dMetro ? 30 : 60) : (dMetro ? 14 : 40);
    const local = !dMetro && !metro(e.region) ? 5 : 1; // invented: regional residents mostly use a local service where one exists
    return cap * scope * ageF * local / (1 + Math.pow(dist / lam, 2));
  });
  c = { w, tot: w.reduce((a, b) => a + b, 0) }; siteW.set(key, c); return c;
}
function pickSite(di, si, child) {
  const { w, tot } = siteWeights(di, si, child); let r = u() * tot;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return w.findIndex((x) => x > 0);
}

const srcAll = dims.sources.filter((s) => s.w > 0);
const prioCodes = dims.priorities.map((p) => p.code);
const prioTarget = Object.fromEntries(dims.priorities.map((p) => [p.code, p.targetDays]));
const finalOut = Object.entries(dims.finalOutcomeWeights);
const outMap = Object.fromEntries(dims.outcomes.map((o) => [o.code, o]));
const ageRanges = [[0, 14], [15, 24], [25, 44], [45, 64], [65, 79], [80, 95]];
const REMOTE_MODES = ['TEL', 'VID'];

const refRows = []; const appRows = []; let appId = 1;
const header = {
  ref: ['ESTABLISHMENT_CODE', 'REFERRAL_ACCOUNT_NUMBER', 'REFERRAL_CATEGORY_CODE', 'REFERRAL_CREATED_DATE', 'REFERRAL_RECEIVED_DATE', 'REFERRAL_PRIORITY_CODE', 'REFERRAL_REASON_CODE', 'REFERRAL_SOURCE_CODE', 'REFERRAL_STATUS_CODE', 'REFERRAL_CLOSED_DATE', 'REFERRAL_REASON_FOR_CLOSURE_CODE', 'DERIVED_PERSON_KEY', 'DERIVED_AGE_YEARS', 'DERIVED_HEALTH_DISTRICT', 'DERIVED_PRIOR_ATTENDED'],
  app: ['ESTABLISHMENT_CODE', 'REFERRAL_ACCOUNT_NUMBER', 'APPOINTMENT_ACCOUNT_NUMBER', 'CLINIC_CATEGORY_CODE', 'APPOINTMENT_DATE', 'APPOINTMENT_TYPE_CODE', 'APPOINTMENT_DELIVERY_MODE_CODE', 'APPOINTMENT_SESSION_TYPE_CODE', 'APPOINTMENT_ATTENDANCE_CODE', 'APPOINTMENT_OUTCOME_CODE', 'APPOINTMENT_NON_ATTENDANCE_REASON_CODE', 'APPOINTMENT_CANCELLATION_CODE', 'APPOINTMENT_CANCELLATION_DATE'],
};

for (let n = 1; n <= N; n++) {
  const refNo = 'SYN' + String(n).padStart(8, '0');
  const di = pickW(districts, (d, i) => dW[i]).idx;
  const dist = districts[di]; const R = dims.regionFactor[dist.region];
  const spI = specs.indexOf(pickW(specs, (s) => s.share)); const S = specs[spI];
  const ageGrp = pickW([0, 1, 2, 3, 4, 5], (g) => S.age[g] + 0.01);
  const child = ageGrp === 0;
  const opm = u() < dims.opmShare;
  const siI = pickSite(di, spI, child); const site = est[siI];
  const distKm = km(dist, site);
  const srcW = (s) => { if (s.code === 'MHC' && S.code !== 'PSY') return s.w * 0.1; if (s.code === 'SPR' && R.tele > 2) return s.w * 0.5; if (site.tier === 'POST' && s.internal) return s.w * 0.1; return s.w; };
  const src = opm ? dims.sources.find((s) => s.code === 'CON') : pickW(srcAll, srcW);
  const internal = src.internal;
  const prio = pickW(prioCodes, (c) => dims.priorityWeight[c] * (c === 'URG' && internal && !opm ? 1.6 : 1) * (c === 'NUR' && internal && !opm ? 0.6 : 1) * (opm && c === 'URG' ? 0.1 : 1));
  const reason = opm ? 'OPM' : u() < 0.62 ? 'ASS' : 'TRE';
  const [a0, a1] = ageRanges[ageGrp]; const age = Math.floor(a0 + u() * (a1 - a0 + 1));
  const refDay = drawRefDay(); const target = prioTarget[prio];
  const prior = opm ? Math.min(8, Math.max(1, Math.round(logn(2.8, 0.55)))) : (u() < 0.22 ? 1 + Math.floor(u() * 3) : 0);

  // ---- wait for the first appointment ----
  const medFrac = dims.priorityWaitMedianFraction[prio] * S.wait * R.wait * dims.tierWaitFactor[site.tier] * pressure(refDay) * (opm ? 0.2 : internal ? 0.55 : 1);
  let wait = Math.max(1, Math.round(logn(medFrac * target, opm ? 0.7 : 0.8)));
  wait = Math.min(wait, Math.round(target * 4));
  let closeDay = null, closeReason = null; let events = [];
  const pClose = opm ? 0.01 : 0.04 + 0.025 * (R.wait > 1.2 ? 1 : 0) + (wait > target ? 0.05 : 0);
  if (u() < pClose) {
    const cr = pickW([['AUD', wait > target ? 40 : 8], ['PDT', 30], ['DEC', 4], ['TFC', 14]], (x) => x[1])[0];
    closeReason = cr; closeDay = nextWeekday(refDay + Math.max(5, Math.round(wait * (0.35 + 0.6 * u()))));
  } else {
    let nAtt = Math.max(1, Math.round(logn(S.att * (opm ? 1.2 : 1) * R.att * 0.9, 0.7))); nAtt = Math.min(nAtt, 26);
    const dnaP = clamp(S.dna * R.dna * (opm ? 0.6 : 1), 0, 0.45);
    const cancP = clamp(0.085 * (opm ? 1.1 : 1), 0, 0.3);
    const farBoost = 1 + clamp((distKm - 80) / 250, 0, 1.4);
    const teleP = clamp(S.tele * R.tele * farBoost, 0, 0.85);
    let day = nextWeekday(refDay + wait); let attended = 0, consecDNA = 0, consecCan = 0, safety = 0;
    while (attended < nAtt && safety++ < 70) {
      if (day > DAYS - 1) break;
      const first = attended === 0 && !opm; const type = first ? 0 : 1;
      let mode = 'CLP';
      if (u() < (first ? teleP * 0.55 : teleP)) {
        const regional = !metro(dist.region);
        const r = u();
        mode = regional && distKm > 100 ? (r < 0.3 ? 'TEL' : r < 0.6 ? 'VID' : r < 0.88 ? 'THH' : 'THC') : (r < 0.5 ? 'TEL' : 'VID');
      } else if ((S.code === 'PSY' || S.code === 'PHY') && u() < 0.1) mode = 'GCP';
      const remote = ['TEL', 'VID', 'THH', 'THC'].includes(mode);
      const roll = u(); const thisDna = dnaP * (remote ? 0.6 : 1) * (first ? 1.15 : 1);
      if (roll < thisDna) {
        const rs = pickW(dims.nonAttendance, (x) => x.w).code;
        events.push({ day, kind: 1, mode, code: rs, type, att: u() < 0.07 ? 'DNW' : 'DNA' });
        consecDNA++;
        if (consecDNA >= 2 && u() < 0.55) { closeReason = 'DIP'; closeDay = nextWeekday(day + 7 + Math.floor(u() * 21)); break; }
        day = nextWeekday(day + 14 + Math.floor(u() * 35));
      } else if (roll < thisDna + cancP) {
        const cc = pickW(dims.cancellation, (x) => x.w).code;
        events.push({ day, kind: 2, mode, code: cc, type, cdate: Math.max(refDay, day - Math.floor(1 + u() * 14)) });
        consecCan++;
        if (consecCan >= 3 && u() < 0.4) { closeReason = 'PDT'; closeDay = nextWeekday(day + 7 + Math.floor(u() * 14)); break; }
        day = nextWeekday(day + 10 + Math.floor(u() * 25));
      } else {
        attended++; consecDNA = 0; consecCan = 0;
        const last = attended >= nAtt;
        const out = last ? pickW(finalOut, (x) => x[1])[0] : (u() < 0.9 ? 'REV' : 'REA');
        events.push({ day, kind: 0, mode, code: out, type });
        if (last) { closeReason = outMap[out].close; closeDay = day + Math.floor(u() * 7); break; }
        day = nextWeekday(day + Math.max(7, Math.round(logn(S.iv, 0.45))));
      }
    }
  }
  events = events.filter((e) => e.day <= DAYS - 1);
  if (closeDay != null && closeDay > DAYS - 1) { closeDay = null; closeReason = null; }
  const attendedAny = events.some((e) => e.kind === 0);
  const status = closeDay != null ? 'CL' : attendedAny || opm ? 'OP' : 'WL';

  refRows.push([site.code, refNo, S.code, ddmmyyyy(refDay), ddmmyyyy(refDay), prio, reason, src.code, status, closeDay != null ? ddmmyyyy(closeDay) : '', closeReason || '', 'P' + String(n).padStart(7, '0'), age, dist.name, prior]);
  for (const e of events) {
    appRows.push([site.code, refNo, 'SYNA' + String(appId++).padStart(7, '0'), S.code, ddmmyyyy(e.day), e.type === 0 ? 'NEW' : 'FOL', e.mode, e.mode === 'GCP' ? 'GRP' : 'IND',
      e.kind === 0 ? 'ATT' : e.kind === 1 ? e.att : '',
      e.kind === 0 ? e.code : e.kind === 2 ? 'CAN' : '', e.kind === 1 ? e.code : '', e.kind === 2 ? e.code : '', e.kind === 2 ? ddmmyyyy(e.cdate) : '']);
  }
}
const csvDir = path.join(ROOT, 'data/csv'); fs.mkdirSync(csvDir, { recursive: true });
const toCsv = (h, rows) => [h.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';
fs.writeFileSync(path.join(csvDir, 'referrals.csv'), toCsv(header.ref, refRows));
fs.writeFileSync(path.join(csvDir, 'appointments.csv'), toCsv(header.app, appRows));
// small samples that ARE committed so people can see the shape (first 25 referrals + their appointments)
const sampleDir = path.join(ROOT, 'data/sample'); fs.mkdirSync(sampleDir, { recursive: true });
fs.writeFileSync(path.join(sampleDir, 'referrals.sample.csv'), toCsv(header.ref, refRows.slice(0, 25)));
const sampleIds = new Set(refRows.slice(0, 25).map((r) => r[1]));
fs.writeFileSync(path.join(sampleDir, 'appointments.sample.csv'), toCsv(header.app, appRows.filter((r) => sampleIds.has(r[1]))));
console.log(`SYNTHETIC: ${refRows.length} referrals, ${appRows.length} appointments, seed ${SEED}, ${dims.start}..${dims.end}`);
