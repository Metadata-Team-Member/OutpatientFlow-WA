#!/usr/bin/env node
/**
 * Checks tools/build_data.mjs --real against a small FAKE extract in the documented column format.
 * It writes the fake CSVs to the OS temp folder and the output to data/real_test.json (git-ignored by data/real*.json),
 * then asserts on the result. Run: npm run test:real. Open index.html?data=real_test.json to look at it.
 * Nothing here is real data.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofw-real-'));
const estab = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference/establishments.json'), 'utf8')).establishments;
const geo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference/wa_regions.geojson'), 'utf8'));
const districts = geo.features.filter((f) => f.properties.level === 'district').map((f) => f.properties.name);
const E = estab.slice(0, 3).map((e) => e.code);
const RH = ['ESTABLISHMENT_CODE', 'REFERRAL_ACCOUNT_NUMBER', 'REFERRAL_CATEGORY_CODE', 'REFERRAL_RECEIVED_DATE', 'REFERRAL_PRIORITY_CODE', 'REFERRAL_REASON_CODE', 'REFERRAL_SOURCE_CODE', 'REFERRAL_CLOSED_DATE', 'REFERRAL_REASON_FOR_CLOSURE_CODE', 'DERIVED_PERSON_KEY', 'DERIVED_AGE_YEARS', 'DERIVED_HEALTH_DISTRICT', 'DERIVED_PRIOR_ATTENDED'];
const AH = ['ESTABLISHMENT_CODE', 'REFERRAL_ACCOUNT_NUMBER', 'APPOINTMENT_DATE', 'APPOINTMENT_TYPE_CODE', 'APPOINTMENT_DELIVERY_MODE_CODE', 'APPOINTMENT_ATTENDANCE_CODE', 'APPOINTMENT_OUTCOME_CODE', 'APPOINTMENT_NON_ATTENDANCE_REASON_CODE', 'APPOINTMENT_CANCELLATION_CODE'];
const d0 = districts[0], d1 = districts[districts.length - 1];
const refs = [
  // code, account, category, received, priority, reason, source, closed, closure, person, age, district, prior
  [E[0], 'F1', 'CAR', '05012023', 'URG', 'ASS', 'GEP', '', '', 'P1', 61, d0, 0],
  [E[1], 'F2', 'ZZZ', '2023-03-01', 'AWT', 'TRE', 'GEP', '01062023', 'TRE', 'P2', 7, d1, 0],            // new category + AWT priority + ISO date
  [E[2], 'F3', 'DER', '10/04/2023 08:30', 'NUR', 'OPM', 'GEP', '', '', 'P3', 45, d0, 2],              // slash date
  [E[0].replace(/^0/, ''), 'F4', 'CAR', '15052023 09:00:00', 'SEM', 'ASS', 'GEP', '', '', 'P4', 130, d1, 0], // code without leading 0, time part, age clamp
  ['9999', 'F5', 'CAR', '01012023', 'SEM', 'ASS', 'GEP', '', '', 'P5', 30, d0, 0],                    // unknown establishment
  [E[0], 'F6', 'CAR', '01012023', 'SEM', 'ASS', 'GEP', '', '', 'P6', 30, 'Nowhereville', 0],          // unknown district
  [E[0], 'F7', 'CAR', 'not-a-date', 'SEM', 'ASS', 'GEP', '', '', 'P7', 30, d0, 0],                    // bad date
  [E[0], 'F1', 'CAR', '05012023', 'URG', 'ASS', 'GEP', '', '', 'P1', 61, d0, 0],                       // duplicate account number
  [E[1], 'F9', 'CAR', '31072023', 'SEM', 'ASS', 'GEP', '', '', 'P9', 30, d1, 0],                       // latest received date: sets the end of the period
  [E[0], 'F8', 'CAR', '01012017', 'SEM', 'ASS', 'GEP', '', '', 'P8', 30, d0, 0],                       // before the period (see --start)
];
const modes = ['CLP', 'GCP', 'TEL', 'VID', 'THH', 'THC', 'ELE', 'HOM', 'POS', 'SLF', 'OTH', 'NSP', 'UNK'];
const apps = [
  [E[0], 'F1', '20022023', 'NEW', 'CLP', 'ATT', 'REV', '', ''],
  [E[0], 'F1', '20042023', 'FOL', 'TEL', 'DNA', '', 'FGT', ''],
  [E[0], 'F1', '20062023', 'FOL', 'CLP', '', 'CAN', '', 'NEWCAN1'],                                  // cancelled, new cancellation code
  [E[1], 'F2', '2023-05-01', 'NEW', 'ELE', 'ATT', 'DIS', '', ''],                                    // new mode, ISO date
  [E[1], 'F2', '2023-05-02', 'FOL', 'CLP', 'DNW', '', 'NEWNA1', ''],                                 // DNW, new non-attendance reason
  [E[2], 'F3', '20052023', 'NEW', 'POS', 'ATT', 'NEWOUT', '', ''],                                   // new outcome
  [E[2], 'F3', '01012020', 'NEW', 'CLP', 'ATT', 'REV', '', ''],                                      // before the referral was received: dropped
  [E[0], 'F4', 'xx', 'NEW', 'CLP', 'ATT', 'REV', '', ''],                                            // bad date: dropped
  [E[0], 'ORPHAN', '01012023', 'NEW', 'CLP', 'ATT', 'REV', '', ''],                                  // no referral row
];
modes.slice(8).forEach((m, i) => apps.push([E[0], 'F4', `${String(10 + i).padStart(2, '0')}072023`, 'FOL', m, 'ATT', 'REV', '', '']));
const csv = (h, rows) => '\uFEFF' + [h, ...rows].map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n') + '\r\n'; // BOM + CRLF on purpose
fs.writeFileSync(path.join(dir, 'refs.csv'), csv(RH, refs));
fs.writeFileSync(path.join(dir, 'apps.csv'), csv(AH, apps));

const out = path.join(ROOT, 'data/real_test.json');
const run = (extra) => execFileSync('node', [path.join(ROOT, 'tools/build_data.mjs'), '--referrals', path.join(dir, 'refs.csv'), '--appointments', path.join(dir, 'apps.csv'), '--out', out, '--real', ...extra], { encoding: 'utf8' });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

const log = run([]);
const j = JSON.parse(fs.readFileSync(out, 'utf8'));
ok(j.meta.synthetic === false && /Real extract/.test(j.meta.banner), 'banner and synthetic flag for --real');
ok(j.cols.id.length === 5, `5 usable referrals (F1 to F4, F9); got ${j.cols.id.length}`);
ok(j.meta.start === '2018-02-01' && j.meta.end === '2023-07-31', `period taken from the data: latest received date ends it; start is at most ~5.5 years earlier (got ${j.meta.start}..${j.meta.end})`);
ok(/received before 2018-02-01/.test(log), 'the 2017-01-01 referral falls before the window and is reported');
ok(/Nowhereville/.test(log) && /9999/.test(log), 'unknown district and establishment are reported');
ok(/unreadable REFERRAL_RECEIVED_DATE/.test(log) && /duplicate REFERRAL_ACCOUNT_NUMBER/.test(log), 'bad date and duplicate account are reported');
ok(/ORPHAN|no referral row/.test(log), 'orphan appointment is reported');
ok(j.dims.modes.find((m) => m.code === 'ELE')?.remote === true && j.dims.modes.find((m) => m.code === 'POS')?.remote === false, 'auto-added modes get a remote flag (ELE remote, POS not)');
ok(j.dims.modes.length <= 16, `mode count within the 4-bit field (${j.dims.modes.length})`);
ok(j.dims.priorities.some((p) => p.code === 'AWT' && p.targetDays === 365), 'auto-added priority AWT');
ok(j.dims.specialties.find((s) => s.code === 'ZZZ')?.name === 'ZZZ', 'auto-added category has a name');
// decode events like js/data.js
const ev = j.cols.ev; let p = 0; const dec = [];
for (let i = 0; i < j.cols.evN.length; i++) for (let k = 0; k < j.cols.evN[i]; k++) { const v = ev[p++]; dec.push({ i, day: v & 2047, kind: (v >> 11) & 3, mode: (v >> 13) & 15, code: (v >> 17) & 63, type: (v >> 23) & 1 }); }
const kinds = [0, 1, 2].map((k) => dec.filter((e) => e.kind === k).length);
ok(kinds[0] === 8 && kinds[1] === 2 && kinds[2] === 1, `event kinds attended/DNA+DNW/cancelled = ${kinds.join('/')} (expect 8 / 2 / 1)`);
ok(dec.every((e) => e.day >= 0 && e.day < j.meta.days), 'all event days inside the period');
ok(j.dims.cancellation.some((c) => c.code === 'NEWCAN1') && j.dims.nonAttendance.some((c) => c.code === 'NEWNA1') && j.dims.outcomes.some((c) => c.code === 'NEWOUT'), 'new outcome / non-attendance / cancellation codes appended');
// a period longer than the encoding allows fails with a clear message
let tooLong = '';
try { run(['--start', '2016-12-01', '--end', '2023-12-31']); } catch (e) { tooLong = String(e.stderr || e.message); }
ok(/2,047/.test(tooLong), 'period over 2,047 days is refused with an explanation');
// an explicit window works and keeps the 2017 referral out, with a note
const log2 = run(['--start', '2022-12-01', '--end', '2023-12-31', '--sim-start', '2023-03-01']);
const j2 = JSON.parse(fs.readFileSync(out, 'utf8'));
ok(j2.cols.id.length === 5 && j2.meta.simStart === '2023-03-01' && /received before 2022-12-01/.test(log2), 'explicit --start / --end / --sim-start work and the 2017 referral is reported');
// refusing to overwrite the synthetic file
let refused = false; try { execFileSync('node', [path.join(ROOT, 'tools/build_data.mjs'), '--referrals', path.join(dir, 'refs.csv'), '--appointments', path.join(dir, 'apps.csv'), '--out', path.join(ROOT, 'data/synthetic.json'), '--real'], { stdio: 'pipe' }); } catch { refused = true; }
ok(refused, '--real refuses to write data/synthetic.json');
fs.rmSync(dir, { recursive: true, force: true });
console.log(fails ? `\n${fails} check(s) failed` : '\nAll checks passed. Output: data/real_test.json');
process.exit(fails ? 1 : 0);
