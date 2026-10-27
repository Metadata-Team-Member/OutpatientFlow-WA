#!/usr/bin/env node
/**
 * OutpatientFlow WA - SYNTHETIC data generator
 * -------------------------------------------
 * Produces fake, deterministic (seeded) referral + appointment extracts whose COLUMN NAMES mirror the
 * WA Health Non-Admitted Data Collection (NADC). Nothing here is real. It exists so the visualisation can be
 * built and tuned before any real extract is requested.
 *
 *   node tools/generate_synthetic.mjs [--patients 10000] [--seed 20261027]
 *   -> data/csv/referrals.csv , data/csv/appointments.csv   (git-ignored, regenerate any time)
 *   then: node tools/build_data.mjs  -> data/synthetic.json (what the website loads)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const N = +(args.patients || 10000);
const SEED = +(args.seed || 20261027);
const dims = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/dimensions.json'), 'utf8'));

// ---------- seeded random helpers ----------
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED);
const u = () => rnd();
const normal = () => { let a = 0, b = 0; while (!a) a = u(); b = u(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); };
const logn = (median, sigma) => median * Math.exp(sigma * normal());
const pick = (arr, w) => { const tot = w.reduce((s, x) => s + x, 0); let r = u() * tot; for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; } return arr[arr.length - 1]; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- calendar ----------
const D0 = Date.UTC(...dims.start.split('-').map((v, i) => (i === 1 ? +v - 1 : +v)));
const DAYS = Math.round((Date.UTC(...dims.end.split('-').map((v, i) => (i === 1 ? +v - 1 : +v))) - D0) / 864e5);
const fmt = (d) => new Date(D0 + d * 864e5).toISOString().slice(0, 10);
const isWeekend = (d) => { const w = new Date(D0 + d * 864e5).getUTCDay(); return w === 0 || w === 6; };
const nextWeekday = (d) => { while (isWeekend(d)) d++; return d; };

// ---------- illustrative behaviour tables (ALL INVENTED) ----------
const SPEC = {
  //        share meanAtt interval dna  tele  waitF  ageMix(0-14,15-24,25-44,45-64,65-79,80+)
  CAR: { share: 9,  att: 4.2, iv: 75, dna: 0.07, tele: 0.10, wait: 0.9, age: [1, 1, 4, 8, 9, 4] },
  ORT: { share: 12, att: 3.0, iv: 45, dna: 0.09, tele: 0.05, wait: 1.5, age: [3, 5, 9, 10, 8, 3] },
  OPH: { share: 8,  att: 3.2, iv: 90, dna: 0.08, tele: 0.02, wait: 1.4, age: [2, 1, 3, 7, 11, 6] },
  DER: { share: 8,  att: 2.8, iv: 80, dna: 0.11, tele: 0.14, wait: 1.3, age: [3, 4, 9, 8, 6, 3] },
  END: { share: 6,  att: 6.2, iv: 95, dna: 0.10, tele: 0.28, wait: 1.1, age: [1, 2, 7, 10, 7, 2] },
  NEU: { share: 6,  att: 4.5, iv: 85, dna: 0.09, tele: 0.20, wait: 1.3, age: [2, 2, 7, 9, 8, 4] },
  ENT: { share: 8,  att: 2.5, iv: 60, dna: 0.10, tele: 0.06, wait: 1.5, age: [6, 3, 6, 6, 5, 2] },
  GAS: { share: 7,  att: 3.6, iv: 90, dna: 0.09, tele: 0.14, wait: 1.2, age: [1, 2, 7, 9, 7, 3] },
  REN: { share: 3,  att: 9.0, iv: 70, dna: 0.06, tele: 0.18, wait: 0.7, age: [0, 1, 3, 8, 9, 5] },
  RES: { share: 6,  att: 4.8, iv: 85, dna: 0.08, tele: 0.18, wait: 1.0, age: [2, 1, 4, 8, 9, 4] },
  PAE: { share: 8,  att: 4.0, iv: 70, dna: 0.13, tele: 0.14, wait: 1.1, age: [1, 0, 0, 0, 0, 0] },
  WOM: { share: 7,  att: 3.0, iv: 55, dna: 0.09, tele: 0.12, wait: 1.0, age: [0, 3, 10, 5, 3, 1] },
  MEN: { share: 8,  att: 8.0, iv: 40, dna: 0.18, tele: 0.34, wait: 0.8, age: [3, 6, 8, 6, 3, 1] },
  PAI: { share: 4,  att: 6.5, iv: 50, dna: 0.12, tele: 0.24, wait: 1.1, age: [0, 1, 5, 9, 6, 2] },
};
const REG = {
  PER: { share: 77, wait: 1.0, dna: 1.0, tele: 1.0, att: 1.0, ind: 0.026, remote: 0 },
  SWE: { share: 6,  wait: 1.1, dna: 1.1, tele: 1.4, att: 0.95, ind: 0.03, remote: 0 },
  GSO: { share: 2.5, wait: 1.15, dna: 1.1, tele: 1.7, att: 0.92, ind: 0.05, remote: 1 },
  WHE: { share: 3.2, wait: 1.2, dna: 1.15, tele: 1.7, att: 0.9, ind: 0.04, remote: 1 },
  GEF: { share: 3.0, wait: 1.3, dna: 1.25, tele: 2.0, att: 0.85, ind: 0.12, remote: 1 },
  MID: { share: 3.3, wait: 1.25, dna: 1.2, tele: 1.9, att: 0.87, ind: 0.10, remote: 1 },
  PIL: { share: 2.4, wait: 1.45, dna: 1.35, tele: 2.4, att: 0.8, ind: 0.16, remote: 2 },
  KIM: { share: 2.6, wait: 1.5, dna: 1.4, tele: 2.6, att: 0.78, ind: 0.38, remote: 2 },
};
const SITEW = { // region -> site weight
  PER: { 'SYN-A': 1.3, 'SYN-B': 1.15, 'SYN-C': 0.8, 'SYN-D': 1.0, 'SYN-E': 0, 'SYN-F': 0 },
  SWE: { 'SYN-A': 0.35, 'SYN-B': 0.3, 'SYN-C': 0.1, 'SYN-D': 0.15, 'SYN-E': 3, 'SYN-F': 0 },
  GSO: { 'SYN-A': 0.5, 'SYN-B': 0.4, 'SYN-C': 0.1, 'SYN-D': 0.2, 'SYN-E': 1.6, 'SYN-F': 0 },
  WHE: { 'SYN-A': 1, 'SYN-B': 0.9, 'SYN-C': 0.3, 'SYN-D': 0.4, 'SYN-E': 0.4, 'SYN-F': 0 },
  GEF: { 'SYN-A': 1, 'SYN-B': 0.8, 'SYN-C': 0.2, 'SYN-D': 0.4, 'SYN-E': 0, 'SYN-F': 1.4 },
  MID: { 'SYN-A': 1, 'SYN-B': 0.8, 'SYN-C': 0.2, 'SYN-D': 0.4, 'SYN-E': 0, 'SYN-F': 1.2 },
  PIL: { 'SYN-A': 0.7, 'SYN-B': 0.6, 'SYN-C': 0.1, 'SYN-D': 0.3, 'SYN-E': 0, 'SYN-F': 3 },
  KIM: { 'SYN-A': 0.6, 'SYN-B': 0.5, 'SYN-C': 0.1, 'SYN-D': 0.3, 'SYN-E': 0, 'SYN-F': 3 },
};
const SRC_W = { GEP: 50, PRN: 3, SPR: 13, MEP: 3, NPR: 2, AHP: 2, MHC: 2.5, OTH: 3.5, SLF: 0.8, OPH: 9, EMD: 6, INW: 5 };
const PRIO_W = { URG: 14, SEM: 31, ROU: 55 };
const PRIO_WAITMED = { URG: 0.42, SEM: 0.52, ROU: 0.55 }; // median wait as fraction of target (external referrals)
const FINAL = [['DIS', 38], ['RGP', 40], ['RAS', 6], ['RWL', 8], ['ADM', 2], ['ROH', 3], ['REA', 3]];
const POSTCODES = []; const pcIndex = {};
dims.regions.forEach((r) => r.postcodes.forEach((p) => { if (pcIndex[p] == null) { pcIndex[p] = POSTCODES.length; POSTCODES.push(p); } }));

const sites = dims.sites;
const specs = dims.specialties.map((s) => s.code);
const regionsArr = dims.regions.map((r) => r.code);
const prioTarget = Object.fromEntries(dims.priorities.map((p) => [p.code, p.targetDays]));
const srcInternal = Object.fromEntries(dims.sources.map((s) => [s.code, s.internal]));

// referral volume by day: gentle growth, summer/winter dips, quiet Christmas
function dayWeight(d) {
  const dt = new Date(D0 + d * 864e5); const m = dt.getUTCMonth(); const dom = dt.getUTCDate();
  let w = 1 + 0.03 * (d / 365);
  if (m === 11 && dom > 20) w *= 0.35; if (m === 0 && dom < 8) w *= 0.45;
  if (isWeekend(d)) w *= 0.12;
  return w;
}
const dayCum = []; let acc = 0; for (let d = 0; d < DAYS; d++) { acc += dayWeight(d); dayCum.push(acc); }
function drawRefDay() { const r = u() * acc; let lo = 0, hi = DAYS - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (dayCum[mid] < r) lo = mid + 1; else hi = mid; } return lo; }
// waiting-time pressure over the 4 years: builds up, peaks mid-2025, eases a little
function pressure(d) { const x = d / DAYS; return 0.85 + 0.55 * Math.sin(Math.PI * Math.min(1, x * 1.15)) + (x > 0.8 ? -0.1 : 0); }

const refRows = []; const appRows = []; let appId = 1;
const header = {
  ref: ['REF_ID', 'PER_PERSON_ID', 'REF_SOURCE_CODE', 'REF_PRIORITY_CODE', 'REF_RECEIVED_DATE', 'REF_DISCHARGE_DATE', 'REF_CLOSURE_REASON_CODE', 'CLINIC_CATEGORY_CODE', 'ESTABLISHMENT_ID', 'PER_ADDRESS_POSTCODE', 'PER_REGION_CODE', 'PER_AGE_YEARS', 'PER_INDIGENOUS_STATUS_CODE', 'PRIOR_ATTENDED_24M'],
  app: ['APP_ID', 'REF_ID', 'APP_DATE', 'APP_ATTENDANCE_CODE', 'APP_OUTCOME_CODE', 'APP_NON_ATTENDANCE_REASON_CODE', 'APP_DELIVERY_TYPE_CODE', 'APP_NEW_FOLLOWUP_CODE', 'CLINIC_CATEGORY_CODE', 'ESTABLISHMENT_ID'],
};

for (let n = 1; n <= N; n++) {
  const refId = 'SYN-R' + String(n).padStart(6, '0');
  const pid = 'SYN-P' + String(n).padStart(6, '0');
  const region = pick(regionsArr, regionsArr.map((c) => REG[c].share)); const R = REG[region];
  const spec = pick(specs, specs.map((c) => SPEC[c].share)); const S = SPEC[spec];
  const src = pick(Object.keys(SRC_W), Object.values(SRC_W).map((w, i) => { const c = Object.keys(SRC_W)[i]; if (c === 'MHC' && spec !== 'MEN') return w * 0.2; if (c === 'SPR' && R.remote === 2) return w * 0.5; return w; }));
  const internal = srcInternal[src];
  const prio = pick(['URG', 'SEM', 'ROU'], [PRIO_W.URG * (internal ? 1.6 : 1), PRIO_W.SEM, PRIO_W.ROU * (internal ? 0.6 : 1)]);
  const siteOptions = sites.filter((s) => s.specs.includes(spec));
  const site = pick(siteOptions, siteOptions.map((s) => SITEW[region][s.id] + 0.001));
  const ageGrp = pick(dims.ageGroups, S.age.map((w) => w + 0.01));
  const [a0, a1] = [[0, 14], [15, 24], [25, 44], [45, 64], [65, 79], [80, 95]][dims.ageGroups.indexOf(ageGrp)];
  const age = Math.floor(a0 + u() * (a1 - a0 + 1));
  const indRoll = u(); const ind = indRoll < R.ind ? pick(['1', '2', '3'], [92, 3, 5]) : indRoll < R.ind + 0.02 ? '9' : '4';
  const postcode = dims.regions.find((r) => r.code === region).postcodes[Math.floor(u() * dims.regions.find((r) => r.code === region).postcodes.length)];
  const refDay = drawRefDay();
  const target = prioTarget[prio];
  const prior = internal ? Math.min(8, Math.round(logn(2.4, 0.7))) : (u() < 0.3 ? 1 + Math.floor(u() * 3) : 0);

  // ---- wait for first appointment ----
  const medFrac = PRIO_WAITMED[prio] * S.wait * R.wait * pressure(refDay) * (internal ? 0.2 : 1);
  let wait = Math.max(1, Math.round(logn(medFrac * target, internal ? 0.75 : 0.8)));
  wait = Math.min(wait, Math.round(target * 4));
  let closedWithoutSeen = false; let closeDay = null; let closeReason = null;
  const pClose = internal ? 0.01 : 0.04 + 0.04 * R.remote + (wait > target ? 0.05 : 0);
  if (u() < pClose) { closedWithoutSeen = true; closeDay = nextWeekday(refDay + Math.max(5, Math.round(wait * (0.35 + 0.6 * u())))); closeReason = pick(['PRQ', 'UTC', 'ELS', 'DEC'], [45, 25, 24, 6]); }
  const firstDay = nextWeekday(refDay + wait);

  const events = [];
  let refDischarge = null; let finalReason = null;
  if (!closedWithoutSeen) {
    let nAtt = Math.max(1, Math.round(logn(S.att * (internal ? 1.25 : 1) * R.att * 0.9, 0.7)));
    nAtt = Math.min(nAtt, 26);
    const dnaP = clamp(S.dna * R.dna * (internal ? 0.6 : 1), 0, 0.45);
    const teleP = clamp(S.tele * R.tele, 0, 0.8);
    let day = firstDay; let attended = 0; let consecDNA = 0; let first = true; let abandoned = false;
    let safety = 0;
    while (attended < nAtt && safety++ < 60) {
      if (day > DAYS - 1) break;
      const mode = u() < (first ? teleP * 0.55 : teleP) ? (u() < 0.5 ? 'VID' : 'TEL') : ((spec === 'PAI' || spec === 'RES') && u() < 0.12 ? 'GCP' : 'CLP');
      const remote = mode === 'TEL' || mode === 'VID';
      const thisDna = dnaP * (remote ? 0.6 : 1) * (first ? 1.15 : 1);
      const roll = u();
      if (roll < thisDna) {
        events.push({ day, att: 'DNA', mode, outcome: 'NSP', nf: first ? 'NEW' : 'FUP' });
        consecDNA++;
        if (consecDNA >= 2 && u() < 0.55) { abandoned = true; refDischarge = nextWeekday(day + 7 + Math.floor(u() * 21)); finalReason = 'DNA'; break; }
        day = nextWeekday(day + 14 + Math.floor(u() * 35));
      } else if (roll < thisDna + 0.008) {
        events.push({ day, att: 'DNW', mode: 'CLP', outcome: 'NSP', nf: first ? 'NEW' : 'FUP' });
        day = nextWeekday(day + 10 + Math.floor(u() * 25));
      } else {
        attended++; consecDNA = 0;
        const last = attended >= nAtt;
        const outcome = last ? pick(FINAL.map((f) => f[0]), FINAL.map((f) => f[1])) : (u() < 0.9 ? 'REV' : 'REA');
        events.push({ day, att: 'ATT', mode, outcome, nf: first ? 'NEW' : 'FUP' });
        first = false;
        if (last) { refDischarge = day; finalReason = 'SEEN'; break; }
        day = nextWeekday(day + Math.max(7, Math.round(logn(S.iv, 0.45))));
      }
    }
    if (refDischarge != null && refDischarge > DAYS - 1) { refDischarge = null; finalReason = null; }
  } else { refDischarge = closeDay; finalReason = closeReason; }
  if (refDischarge != null && refDischarge > DAYS - 1) { refDischarge = null; finalReason = null; }

  refRows.push([refId, pid, src, prio, fmt(refDay), refDischarge != null ? fmt(refDischarge) : '', finalReason || '', spec, site.id, postcode, region, age, ind, prior]);
  for (const e of events) {
    if (e.day > DAYS - 1) continue;
    appRows.push([ 'SYN-APP' + String(appId++).padStart(7, '0'), refId, fmt(e.day), e.att, e.outcome, e.att === 'ATT' ? '' : (e.att === 'DNA' ? 'UNK' : ''), e.mode, e.nf, spec, site.id ]);
  }
}
const csvDir = path.join(ROOT, 'data/csv'); fs.mkdirSync(csvDir, { recursive: true });
const toCsv = (h, rows) => [h.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';
fs.writeFileSync(path.join(csvDir, 'referrals.csv'), toCsv(header.ref, refRows));
fs.writeFileSync(path.join(csvDir, 'appointments.csv'), toCsv(header.app, appRows));
// tiny sample that IS committed so people can see the shape
const sampleDir = path.join(ROOT, 'data/sample'); fs.mkdirSync(sampleDir, { recursive: true });
fs.writeFileSync(path.join(sampleDir, 'referrals.sample.csv'), toCsv(header.ref, refRows.slice(0, 25)));
const sampleIds = new Set(refRows.slice(0, 25).map((r) => r[0]));
fs.writeFileSync(path.join(sampleDir, 'appointments.sample.csv'), toCsv(header.app, appRows.filter((r) => sampleIds.has(r[1]))));
console.log(`SYNTHETIC: ${refRows.length} referrals, ${appRows.length} appointments, seed ${SEED}, ${dims.start}..${dims.end}`);
