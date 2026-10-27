/* OutpatientFlow WA — small dependency-free canvas charts that update with the clock and filters. */
(function (g) {
  'use strict';
  const OF = (g.OF = g.OF || {}); const D = OF.Data; const C = {}; OF.Charts = C;
  const FONT = '"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif';
  const TXT = '#9fb0cb', TXT2 = '#6f819e', GRID = 'rgba(150,180,220,.12)', TEAL = '#4fd1c5', AMB = '#f5b94a', RED = '#ff6b6b', BLUE = '#7aa7ff';
  const fmt = (n) => Math.round(n).toLocaleString('en-AU');
  let months = null; let specHits = []; C.onSpec = null;

  function prep(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1); const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); c.textBaseline = 'alphabetic'; return { c, w, h };
  }
  const font = (c, px, weight) => { c.font = (weight || 400) + ' ' + px + 'px ' + FONT; };
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  C.refreshSeries = function () {
    const sr = D.series; const starts = [];
    for (let d = 0; d < D.DAYS; d++) if (D.dayToDate(d).getUTCDate() === 1) starts.push(d);
    if (starts[0] !== 0) starts.unshift(0); starts.push(D.DAYS);
    months = { starts, refs: [], att: [], wait: [], care: [] };
    for (let m = 0; m < starts.length - 1; m++) {
      const a = starts[m], b = starts[m + 1];
      months.refs.push(D.range(sr.refsC, a, b)); months.att.push(D.range(sr.attC, a, b));
      months.wait.push(sr.wait[b - 1]); months.care.push(sr.care[b - 1]);
    }
  };

  function hist(cv, S) {
    const { c, w, h } = prep(cv); const L = 34, B = 26, T = 22, R = 6, pw = w - L - R, ph = h - B - T;
    const nIn = S.inside || 1, nOut = S.waiting || 1; const bins = 12;
    let mx = 0.05; for (let i = 0; i < bins; i++) mx = Math.max(mx, S.histIn[i] / nIn, S.histOut[i] / nOut); mx = Math.ceil(mx * 20) / 20;
    font(c, 10); c.fillStyle = TXT2; c.textAlign = 'right';
    for (let k = 0; k <= 4; k++) { const v = mx * k / 4, y = T + ph - ph * k / 4; c.strokeStyle = GRID; c.beginPath(); c.moveTo(L, y); c.lineTo(L + pw, y); c.stroke(); c.fillText(Math.round(v * 100) + '%', L - 5, y + 3); }
    const bw = pw / bins;
    for (let i = 0; i < bins; i++) {
      const x = L + i * bw; const a = S.histOut[i] / nOut / mx * ph, b = S.histIn[i] / nIn / mx * ph;
      c.fillStyle = 'rgba(255,107,107,.85)'; rr(c, x + bw * 0.1, T + ph - a, bw * 0.38, Math.max(0.5, a), 3); c.fill();
      c.fillStyle = 'rgba(79,209,197,.9)'; rr(c, x + bw * 0.5, T + ph - b, bw * 0.38, Math.max(0.5, b), 3); c.fill();
      c.fillStyle = TXT2; c.textAlign = 'center'; c.fillText(i === bins - 1 ? '11+' : i, x + bw / 2, h - 10);
    }
    font(c, 10.5, 600); c.textAlign = 'left'; c.fillStyle = TEAL; c.fillRect(L + 2, 6, 9, 9); c.fillText('People in care · avg ' + S.avgIn.toFixed(1), L + 15, 14);
    c.fillStyle = RED; const x2 = L + 15 + 135 * Math.min(1, pw / 300); c.fillRect(x2, 6, 9, 9); c.fillText('People waiting · avg ' + S.avgOut.toFixed(1), x2 + 13, 14);
  }

  function waitChart(cv, S) {
    const { c, w, h } = prep(cv); const L = 92, R = 44, T = 20, B = 22; const pw = w - L - R; const dm = D.dims.priorities; const rowH = (h - T - B) / dm.length;
    const cols = ['#3fcf9d', '#58d29a', '#8fd36b', '#e3c251', '#f2994a', '#ff7b5c', '#ff5d6c', '#e0405e'];
    dm.forEach((p, r) => {
      const y = T + r * rowH + rowH * 0.2, bh = rowH * 0.5; const arr = S.waitByPrio[r]; let n = 0; for (let q = 0; q < 8; q++) n += arr[q];
      font(c, 11, 600); c.fillStyle = '#d5e0f3'; c.textAlign = 'right'; c.fillText(p.label, L - 8, y + bh * 0.62);
      font(c, 9.5); c.fillStyle = TXT2; c.fillText(p.targetDays + ' d target', L - 8, y + bh * 0.62 + 12);
      let x = L; rr(c, L, y, pw, bh, 5); c.fillStyle = 'rgba(255,255,255,.05)'; c.fill();
      if (n) for (let q = 0; q < 8; q++) { const bw = pw * arr[q] / n; c.fillStyle = cols[q]; c.fillRect(x, y, bw, bh); x += bw; }
      let over = 0; for (let q = 4; q < 8; q++) over += arr[q];
      if (n && over < n) { const tx = L + pw * (1 - over / n); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.5; c.setLineDash([3, 2]); c.beginPath(); c.moveTo(tx, y - 4); c.lineTo(tx, y + bh + 4); c.stroke(); c.setLineDash([]); c.lineWidth = 1; }
      font(c, 11, 700); c.textAlign = 'left'; c.fillStyle = n && over / n > 0.3 ? RED : '#d5e0f3'; c.fillText(n ? Math.round(over / n * 100) + '%' : '–', L + pw + 7, y + bh * 0.68);
    });
    c.lineWidth = 1;
    font(c, 9.5); c.fillStyle = TXT2; c.textAlign = 'left'; c.fillText('just referred', L, h - 6); c.textAlign = 'right'; c.fillText('more than 1.75× the target →', L + pw, h - 6);
    c.textAlign = 'center'; c.fillStyle = '#ffb3b3'; c.fillText('┆ = at target (1.0×)', L + pw / 2 - 20, T - 6);
    c.fillStyle = '#d5e0f3'; c.textAlign = 'left'; c.fillText('% past target', L + pw - 4 - 52, T - 6);
  }

  function timeline(cv, S, t) {
    const { c, w, h } = prep(cv); if (!months) C.refreshSeries();
    const L = 38, R = 8, T = 18, B = 22, pw = w - L - R, ph = h - T - B; const n = months.refs.length;
    let mx = 10; for (let i = 0; i < n; i++) mx = Math.max(mx, months.wait[i], months.att[i], months.refs[i]); mx = Math.ceil(mx / 200) * 200;
    font(c, 10); c.textAlign = 'right'; c.fillStyle = TXT2;
    for (let k = 0; k <= 4; k++) { const y = T + ph - ph * k / 4; c.strokeStyle = GRID; c.beginPath(); c.moveTo(L, y); c.lineTo(L + pw, y); c.stroke(); c.fillText(fmt(mx * k / 4), L - 5, y + 3); }
    const bw = pw / n; const sim = D.dateToDay(D.meta.simStart);
    // history shading
    const simM = months.starts.findIndex((s) => s >= sim); if (simM > 0) { c.fillStyle = 'rgba(255,255,255,.035)'; c.fillRect(L, T, simM * bw, ph); font(c, 9.5); c.textAlign = 'left'; c.fillStyle = TXT2; c.fillText('history before playback', L + 4, T + 11); }
    for (let i = 0; i < n; i++) { const hgt = months.refs[i] / mx * ph; c.fillStyle = 'rgba(122,167,255,.45)'; c.fillRect(L + i * bw + bw * 0.12, T + ph - hgt, bw * 0.76, hgt); }
    const line = (arr, col) => { c.strokeStyle = col; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath(); arr.forEach((v, i) => { const x = L + (i + 0.5) * bw, y = T + ph - v / mx * ph; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); };
    line(months.att, TEAL); line(months.wait, AMB);
    // labels
    font(c, 9.5); c.textAlign = 'center'; c.fillStyle = TXT2;
    for (let i = 0; i < n; i += Math.max(1, Math.round(n / (w < 420 ? 4 : 8)))) c.fillText(D.fmtMonth(months.starts[i]), L + (i + 0.5) * bw, h - 8);
    // clock marker
    const cm = (() => { for (let i = n - 1; i >= 0; i--) if (months.starts[i] <= t) return i + (t - months.starts[i]) / (months.starts[i + 1] - months.starts[i]); return 0; })();
    const mxp = L + cm * bw; c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(mxp, T); c.lineTo(mxp, T + ph); c.stroke(); c.setLineDash([]);
    font(c, 10.5, 600); c.textAlign = 'left'; let x = L + 4; [['Referrals / month', 'rgba(122,167,255,.8)'], ['Attended events / month', TEAL], ['People waiting (month end)', AMB]].forEach(([tx, col]) => { c.fillStyle = col; c.fillRect(x, 4, 9, 9); c.fillStyle = '#c4d1e6'; c.fillText(tx, x + 13, 12.5); x += 13 + c.measureText(tx).width + 14; });
  }

  function regions(cv, S) {
    const { c, w, h } = prep(cv); const rs = D.dims.regions; const T = 28, B = 6, rowH = (h - T - B) / rs.length; const lw = Math.min(110, w * 0.3);
    const colW = (w - lw - 10) / 2 - 8; let mxw = 30, mxe = 3; rs.forEach((r, i) => { mxw = Math.max(mxw, S.regMed[i]); const q = S.regIn[i]; if (q.n) mxe = Math.max(mxe, q.ev / q.n); });
    font(c, 10, 600); c.textAlign = 'left'; c.fillStyle = AMB; c.fillText('Median wait (days)', lw, 14); c.fillStyle = TEAL; c.fillText('Events per person in care', lw + colW + 16, 14);
    rs.forEach((r, i) => {
      const y = T + i * rowH + rowH * 0.18, bh = rowH * 0.58;
      font(c, 10.5); c.fillStyle = '#c6d4ec'; c.textAlign = 'right'; c.fillText(r.name.replace(' Metropolitan', ''), lw - 8, y + bh * 0.8);
      const mw = S.regMed[i]; c.fillStyle = 'rgba(245,185,74,.85)'; rr(c, lw, y, Math.max(2, colW * mw / mxw), bh, 3); c.fill();
      font(c, 10); c.fillStyle = '#e3ecfb'; c.textAlign = 'left'; c.fillText(mw ? Math.round(mw) : '–', lw + Math.max(2, colW * mw / mxw) + 4, y + bh * 0.8);
      const q = S.regIn[i]; const av = q.n ? q.ev / q.n : 0; const x0 = lw + colW + 16; c.fillStyle = 'rgba(79,209,197,.85)'; rr(c, x0, y, Math.max(2, colW * av / mxe), bh, 3); c.fill();
      c.fillStyle = '#e3ecfb'; c.fillText(av ? av.toFixed(1) : '–', x0 + Math.max(2, colW * av / mxe) + 4, y + bh * 0.8);
    });
  }

  function specChart(cv, S) {
    const { c, w, h } = prep(cv); const sp = D.dims.specialties; const idx = sp.map((s, i) => i).sort((a, b) => S.spec90[b] - S.spec90[a]);
    const T = 4, B = 4, rowH = (h - T - B) / sp.length, lw = Math.min(118, w * 0.34); const mx = Math.max(1, S.spec90[idx[0]]);
    specHits = [];
    idx.forEach((si, r) => {
      const y = T + r * rowH + rowH * 0.15, bh = rowH * 0.7; const s = sp[si]; const v = S.spec90[si]; const bw = (w - lw - 50) * v / mx;
      font(c, 10); c.textAlign = 'right'; c.fillStyle = D.filter.spec === si ? '#fff' : '#c6d4ec'; c.fillText(s.name.length > 18 ? s.name.slice(0, 17) + '…' : s.name, lw - 6, y + bh * 0.82);
      c.fillStyle = 'hsl(' + s.hue + ',65%,58%)'; rr(c, lw, y, Math.max(2, bw), bh, 3); c.fill();
      c.fillStyle = '#e3ecfb'; c.textAlign = 'left'; c.fillText(fmt(v), lw + Math.max(2, bw) + 5, y + bh * 0.82);
      specHits.push({ y0: y - 1, y1: y + bh + 1, si });
    });
  }


  function hspChart(cv, S) {
    const { c, w, h } = prep(cv); const hs = D.dims.hsps; const T = 34, B = 8, rowH = (h - T - B) / hs.length, lw = 52;
    const cols = ['#5ad19a', '#7aa7ff', '#f5b94a', '#9aa7bd']; const labs = ['In person', 'Telehealth / phone', 'Not attended (DNA)', 'Cancelled'];
    font(c, 10, 600); c.textAlign = 'left';
    labs.forEach((l, k) => { const lx = 4 + (k % 2) * 124, ly = 6 + (k > 1 ? 14 : 0); c.fillStyle = cols[k]; c.fillRect(lx, ly, 9, 9); c.fillStyle = '#c4d1e6'; c.fillText(l, lx + 13, ly + 8.5); });
    const tot = hs.map((_, i) => { const q = S.hsp12[i]; return q[0] + q[1] + q[2] + q[3]; }); const mx = Math.max(1, ...tot); const pw = w - lw - 62;
    hs.forEach((hp, i) => {
      const y = T + i * rowH + rowH * 0.16, bh = rowH * 0.62; const q = S.hsp12[i]; const f = (D.filter.hsp === i);
      font(c, 11, 700); c.textAlign = 'right'; c.fillStyle = f ? '#fff' : (OF.Scene.hspCol[hp.code] || '#c6d4ec'); c.fillText(hp.code, lw - 8, y + bh * 0.72);
      let xx = lw; q.forEach((v, k) => { const bw = pw * v / mx; c.fillStyle = cols[k]; c.fillRect(xx, y, bw, bh); xx += bw; });
      font(c, 10); c.textAlign = 'left'; c.fillStyle = '#e3ecfb'; c.fillText(fmt(tot[i]), xx + 5, y + bh * 0.68);
      const tele = tot[i] ? Math.round(q[1] / tot[i] * 100) : 0; font(c, 9); c.fillStyle = TXT2; c.fillText(tele + '% tele', xx + 5, y + bh * 1.05 + 1);
    });
  }

  C.draw = function (S, t) {
    const $ = (id) => document.getElementById(id);
    hist($('cHist'), S); waitChart($('cWait'), S); timeline($('cTime'), S, t); regions($('cReg'), S); specChart($('cSpec'), S); hspChart($('cHsp'), S);
  };
  C.init = function () {
    const cv = document.getElementById('cSpec');
    cv.addEventListener('click', (e) => { const r = cv.getBoundingClientRect(); const y = e.clientY - r.top; const hit = specHits.find((q) => y >= q.y0 && y <= q.y1); if (hit && C.onSpec) C.onSpec(hit.si); });
    cv.style.cursor = 'pointer';
  };
})(window);
