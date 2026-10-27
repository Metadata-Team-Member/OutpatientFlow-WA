/* OutpatientFlow WA — data layer.
   Loads the compact columnar JSON (see tools/build_data.mjs), applies filters and answers
   "what is the status of referral i on day t?" cheaply. Everything here is code-list driven.
   Attendance follows the NAPDC rule: an appointment is ATTENDED when an outcome is allocated (BR §5.1).
   Event kinds: 0 attended | 1 did not attend (non-attendance reason, blank outcome) | 2 cancelled (outcome CAN). */
(function (g) {
  'use strict';
  const OF = (g.OF = g.OF || {});
  const D = {};
  OF.Data = D;

  let raw, N, DAYS;
  let ref, end, prior, site, spec, region, district, prio, src, reason, ageGrp, evs, internal, hasTele, hasPerson, firstAtt, closeIdx, hspOfSite;
  let remote = [], target = [], OPM = -1;
  D.filter = { hsp: -1, site: -1, spec: -1, region: -1, prio: -1, mode: 'all' };
  D.pass = null;
  D.series = null;
  const MS = 864e5;
  let D0;

  D.hash = function (i, salt) { let h = (i * 2654435761 + (salt || 0) * 40503) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; };

  D.load = async function (url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Could not load ' + url + ' (' + r.status + ')');
    raw = await r.json();
    prepare();
    return raw;
  };

  function prepare() {
    const c = raw.cols; N = c.id.length; DAYS = raw.meta.days;
    D0 = Date.parse(raw.meta.start + 'T00:00:00Z');
    ref = Int32Array.from(c.ref); end = Int32Array.from(c.end); prior = Int16Array.from(c.prior);
    site = Int16Array.from(c.site); spec = Int16Array.from(c.spec); region = Int16Array.from(c.region); district = Int16Array.from(c.district); prio = Int16Array.from(c.prio);
    src = Int16Array.from(c.src); reason = Int16Array.from(c.reason); ageGrp = Int16Array.from(c.ageGrp); closeIdx = Int16Array.from(c.endReason);
    const dm = raw.dims;
    OPM = dm.referralReasons.findIndex((r) => r.code === 'OPM');
    hspOfSite = Int16Array.from(dm.establishments.map((e) => e.hsp));
    remote = dm.modes.map((m) => !!m.remote); target = dm.priorities.map((p) => p.targetDays);
    // unpack events: [day, kind, mode, code, type] x n, per referral
    evs = []; let p = 0;
    for (let i = 0; i < N; i++) {
      const n = c.evN[i]; const a = new Int16Array(n * 5);
      for (let k = 0; k < n; k++) { const v = c.ev[p++]; a[k * 5] = v & 2047; a[k * 5 + 1] = (v >> 11) & 3; a[k * 5 + 2] = (v >> 13) & 7; a[k * 5 + 3] = (v >> 16) & 31; a[k * 5 + 4] = (v >> 21) & 1; }
      evs.push(a);
    }
    internal = new Uint8Array(N); hasTele = new Uint8Array(N); hasPerson = new Uint8Array(N); firstAtt = new Int32Array(N).fill(99999);
    for (let i = 0; i < N; i++) {
      internal[i] = reason[i] === OPM ? 1 : 0;
      const e = evs[i];
      for (let k = 0; k < e.length; k += 5) {
        if (e[k + 1] !== 0) continue;
        if (remote[e[k + 2]]) hasTele[i] = 1; else hasPerson[i] = 1;
        if (e[k] < firstAtt[i]) firstAtt[i] = e[k];
      }
    }
    D.N = N; D.DAYS = DAYS; D.dims = dm; D.meta = raw.meta;
    D.ref = ref; D.end = end; D.prior = prior; D.site = site; D.spec = spec; D.region = region; D.district = district; D.prio = prio; D.src = src; D.reason = reason; D.evs = evs; D.internal = internal; D.target = target; D.closeIdx = closeIdx; D.remote = remote; D.hspOfSite = hspOfSite; D.firstAtt = firstAtt;
    D.ids = c.id; D.ages = c.age;
    D.applyFilter();
  }

  D.dayToDate = (d) => new Date(D0 + Math.floor(d) * MS);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  D.fmtDate = (d) => { const t = D.dayToDate(d); return t.getUTCDate() + ' ' + MON[t.getUTCMonth()] + ' ' + t.getUTCFullYear(); };
  D.fmtMonth = (d) => { const t = D.dayToDate(d); return MON[t.getUTCMonth()] + ' ' + String(t.getUTCFullYear()).slice(2); };
  D.fy = (d) => { const t = D.dayToDate(d); const y = t.getUTCFullYear() + (t.getUTCMonth() >= 6 ? 1 : 0); return 'FY' + (y - 1) + '–' + String(y).slice(2); };
  D.dateToDay = (s) => Math.round((Date.parse(s + 'T00:00:00Z') - D0) / MS);

  D.applyFilter = function () {
    const f = D.filter; const pass = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (f.hsp >= 0 && hspOfSite[site[i]] !== f.hsp) continue;
      if (f.site >= 0 && site[i] !== f.site) continue;
      if (f.spec >= 0 && spec[i] !== f.spec) continue;
      if (f.region >= 0 && region[i] !== f.region) continue;
      if (f.prio >= 0 && prio[i] !== f.prio) continue;
      if (f.mode === 'person' && !hasPerson[i]) continue;
      if (f.mode === 'tele' && !hasTele[i]) continue;
      pass[i] = 1;
    }
    D.pass = pass; buildSeries();
  };

  // Daily prefix series so KPIs and charts are O(1) per frame.
  function buildSeries() {
    const nH = raw.dims.hsps.length, nS = raw.dims.establishments.length, nP = raw.dims.priorities.length;
    const refs = new Int32Array(DAYS + 2), att = new Int32Array(DAYS + 2), dna = new Int32Array(DAYS + 2), can = new Int32Array(DAYS + 2);
    const wD = new Int32Array(DAYS + 3), iD = new Int32Array(DAYS + 3), bySpec = [], bySite = [], hspAtt = [], hspTele = [], hspDna = [], hspCan = [], seen = [], within = [];
    for (let s = 0; s < raw.dims.specialties.length; s++) bySpec.push(new Int32Array(DAYS + 2));
    for (let s = 0; s < nS; s++) bySite.push(new Int32Array(DAYS + 2));
    for (let h = 0; h < nH; h++) { hspAtt.push(new Int32Array(DAYS + 2)); hspTele.push(new Int32Array(DAYS + 2)); hspDna.push(new Int32Array(DAYS + 2)); hspCan.push(new Int32Array(DAYS + 2)); }
    for (let p = 0; p < nP; p++) { seen.push(new Int32Array(DAYS + 2)); within.push(new Int32Array(DAYS + 2)); }
    for (let i = 0; i < N; i++) {
      if (!D.pass[i]) continue;
      refs[ref[i]]++;
      const e = evs[i], h = hspOfSite[site[i]];
      for (let k = 0; k < e.length; k += 5) {
        const d = e[k], kd = e[k + 1];
        if (kd === 0) { att[d]++; bySpec[spec[i]][d]++; bySite[site[i]][d]++; (remote[e[k + 2]] ? hspTele : hspAtt)[h][d]++; }
        else if (kd === 1) { dna[d]++; hspDna[h][d]++; } else { can[d]++; hspCan[h][d]++; }
      }
      const stop = end[i] >= 0 ? end[i] : DAYS;
      if (internal[i]) { iD[ref[i]]++; iD[stop]--; }
      else {
        const fa = Math.min(firstAtt[i], stop);
        wD[ref[i]]++; wD[fa]--; if (fa < stop) { iD[fa]++; iD[stop]--; }
        if (firstAtt[i] < 99999 && firstAtt[i] >= ref[i]) { seen[prio[i]][firstAtt[i]]++; if (firstAtt[i] - ref[i] <= target[prio[i]]) within[prio[i]][firstAtt[i]]++; }
      }
    }
    const cum = (a) => { const o = new Int32Array(a.length + 1); for (let i = 0; i < a.length; i++) o[i + 1] = o[i] + a[i]; return o; };
    const wait = new Int32Array(DAYS), care = new Int32Array(DAYS);
    let w = 0, c = 0; for (let d = 0; d < DAYS; d++) { w += wD[d]; c += iD[d]; wait[d] = w; care[d] = c; }
    D.series = { refsC: cum(refs), attC: cum(att), dnaC: cum(dna), canC: cum(can), wait, care, specC: bySpec.map(cum), siteC: bySite.map(cum), hspAtt: hspAtt.map(cum), hspTele: hspTele.map(cum), hspDna: hspDna.map(cum), hspCan: hspCan.map(cum), seenC: seen.map(cum), withinC: within.map(cum) };
  }
  D.range = (cumArr, a, b) => cumArr[Math.max(0, Math.min(DAYS, Math.ceil(b)))] - cumArr[Math.max(0, Math.min(DAYS, Math.ceil(a)))];

  D.status = function (i, t, o) {
    o = o || {};
    if (t < ref[i]) { o.state = 0; o.att = 0; o.dna = 0; o.can = 0; o.tele = 0; o.last = -1; return o; }
    const e = evs[i]; let a = 0, d = 0, cn = 0, tl = 0, last = -1;
    for (let k = 0; k < e.length; k += 5) {
      if (e[k] > t) break;
      if (e[k + 1] === 0) { a++; if (remote[e[k + 2]]) tl++; } else if (e[k + 1] === 1) d++; else cn++;
      last = k;
    }
    o.att = a; o.dna = d; o.can = cn; o.tele = tl; o.last = last;
    if (end[i] >= 0 && end[i] <= t) o.state = 3; else o.state = (a > 0 || internal[i]) ? 2 : 1;
    return o;
  };

  D.growth = (n) => 1 - Math.exp(-n / 6);

  // Per-frame statistics for filtered referrals at day t.
  D.stats = function (t, S) {
    const dm = raw.dims; const nP = dm.priorities.length, nR = dm.regions.length, nS = dm.establishments.length, nH = dm.hsps.length;
    S = S || {};
    S.waiting = 0; S.inside = 0; S.over = 0;
    S.waitByPrio = []; S.waitDays = [];
    for (let p = 0; p < nP; p++) { S.waitByPrio.push(new Int32Array(8)); }
    S.regWait = []; S.regIn = []; S.siteIn = new Int32Array(nS); S.siteWait = new Int32Array(nS); S.hspIn = new Int32Array(nH); S.hspWait = new Int32Array(nH);
    for (let r = 0; r < nR; r++) { S.regWait.push([]); S.regIn.push({ n: 0, ev: 0 }); }
    S.histIn = new Int32Array(12); S.histOut = new Int32Array(12);
    let evIn = 0, evOut = 0;
    const o = {}; const day = Math.floor(t);
    const fw = []; // first-appointment waits, last 12 months
    for (let i = 0; i < N; i++) {
      if (!D.pass[i]) continue;
      if (!internal[i] && firstAtt[i] <= day && firstAtt[i] > day - 365 && firstAtt[i] >= ref[i]) fw.push(firstAtt[i] - ref[i]);
      if (t < ref[i]) continue;
      D.status(i, t, o);
      if (o.state === 3) continue;
      const tot = o.att + prior[i]; const hb = Math.min(11, tot); const h = hspOfSite[site[i]];
      if (o.state === 1) {
        S.waiting++; const w = t - ref[i]; const u = w / target[prio[i]];
        S.waitDays.push(w); S.regWait[region[i]].push(w); S.siteWait[site[i]]++; S.hspWait[h]++;
        S.waitByPrio[prio[i]][Math.min(7, Math.floor(u * 4))]++;
        if (u > 1) S.over++;
        S.histOut[hb]++; evOut += tot;
      } else {
        S.inside++; S.siteIn[site[i]]++; S.hspIn[h]++; S.regIn[region[i]].n++; S.regIn[region[i]].ev += tot;
        S.histIn[hb]++; evIn += tot;
      }
    }
    S.avgIn = S.inside ? evIn / S.inside : 0; S.avgOut = S.waiting ? evOut / S.waiting : 0;
    const wd = S.waitDays.slice().sort((a, b) => a - b); S.medWait = wd.length ? wd[wd.length >> 1] : 0;
    S.regMed = S.regWait.map((a) => { if (!a.length) return 0; a.sort((x, y) => x - y); return a[a.length >> 1]; });
    fw.sort((a, b) => a - b); S.medFirst = fw.length ? fw[fw.length >> 1] : 0; S.nFirst = fw.length;
    const sr = D.series;
    S.day = day;
    S.refs12 = D.range(sr.refsC, day - 365, day + 1); S.refsPrev12 = D.range(sr.refsC, day - 730, day - 365);
    S.att12 = D.range(sr.attC, day - 365, day + 1); S.dna12 = D.range(sr.dnaC, day - 365, day + 1); S.can12 = D.range(sr.canC, day - 365, day + 1);
    S.dnaRate = S.att12 + S.dna12 ? S.dna12 / (S.att12 + S.dna12) : 0; // DNA / (attended + DNA); cancelled appointments are not counted as scheduled-and-missed
    S.cancRate = S.att12 + S.dna12 + S.can12 ? S.can12 / (S.att12 + S.dna12 + S.can12) : 0;
    S.spec90 = sr.specC.map((c) => D.range(c, day - 90, day + 1));
    S.site90 = sr.siteC.map((c) => D.range(c, day - 90, day + 1));
    S.seen12 = sr.seenC.map((c) => D.range(c, day - 365, day + 1)); S.within12 = sr.withinC.map((c) => D.range(c, day - 365, day + 1));
    let sn = 0, wn = 0; for (let p = 0; p < nP; p++) { sn += S.seen12[p]; wn += S.within12[p]; }
    S.seenAll12 = sn; S.withinAll12 = wn;
    S.hsp12 = []; for (let h = 0; h < nH; h++) S.hsp12.push([D.range(sr.hspAtt[h], day - 365, day + 1), D.range(sr.hspTele[h], day - 365, day + 1), D.range(sr.hspDna[h], day - 365, day + 1), D.range(sr.hspCan[h], day - 365, day + 1)]);
    return S;
  };

  // Details for the click card.
  D.record = function (i, t) {
    const dm = raw.dims; const st = D.status(i, t, {});
    const e = evs[i]; const list = [];
    for (let k = 0; k < e.length; k += 5) if (e[k] <= t) list.push({ day: e[k], kind: e[k + 1], mode: e[k + 2], code: e[k + 3], type: e[k + 4] });
    const est = dm.establishments[site[i]];
    return {
      i, id: raw.cols.id[i], st, events: list, age: raw.cols.age[i], ageGrp: dm.ageGroups[ageGrp[i]], region: dm.regions[region[i]], district: dm.districts[district[i]],
      src: dm.sources[src[i]], reason: dm.referralReasons[reason[i]], prio: dm.priorities[prio[i]], spec: dm.specialties[spec[i]], site: est, hsp: dm.hsps[est.hsp], ref: ref[i], end: end[i], prior: prior[i],
      close: closeIdx[i] >= 0 ? dm.closeReasons[closeIdx[i]] : null, internal: !!internal[i], target: target[prio[i]],
    };
  };
})(window);
