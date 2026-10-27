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

  // text helpers: never let a label run past the space it was given
  function fitText(c, str, maxW) { str = String(str); if (c.measureText(str).width <= maxW) return str; while (str.length > 1 && c.measureText(str + '…').width > maxW) str = str.slice(0, -1); return str.trim() + '…'; }
  function pickText(c, opts, maxW) { for (const o of opts) if (c.measureText(o).width <= maxW) return o; return fitText(c, opts[opts.length - 1], maxW); }
  // legend row that wraps to a new line instead of running off the card; returns the height used
  function legendRows(c, items, x0, y0, maxX, lh) { let x = x0, y = y0; c.textAlign = 'left'; items.forEach(([tx, col]) => { const tw = c.measureText(tx).width + 13; if (x > x0 && x + tw > maxX) { x = x0; y += lh; } c.fillStyle = col; c.fillRect(x, y - 8.5, 9, 9); c.fillStyle = '#c4d1e6'; c.fillText(fitText(c, tx, Math.max(30, maxX - x - 13)), x + 13, y); x += tw + 12; }); return y - y0 + lh; }

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
    const { c, w, h } = prep(cv); const L = 34, B = 26, R = 6;
    font(c, 10.5, 600); const lgW0 = c.measureText('People in care · avg 0.0').width + c.measureText('People waiting · avg 0.0').width + 50; const T = (lgW0 > w - 8 ? 36 : 22), pw = w - L - R, ph = h - B - T;
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
    font(c, 10.5, 600); legendRows(c, [['People in care · avg ' + S.avgIn.toFixed(1), TEAL], ['People waiting · avg ' + S.avgOut.toFixed(1), RED]], L + 2, 14, w - 4, 14);
  }

  function waitChart(cv, S) {
    const { c, w, h } = prep(cv); const L = Math.min(92, Math.max(70, w * 0.27)), R = 44, T = 20, B = 22; const pw = w - L - R; const dm = D.dims.priorities; const rowH = (h - T - B) / dm.length;
    const cols = ['#3fcf9d', '#58d29a', '#8fd36b', '#e3c251', '#f2994a', '#ff7b5c', '#ff5d6c', '#e0405e'];
    dm.forEach((p, r) => {
      const y = T + r * rowH + rowH * 0.2, bh = rowH * 0.5; const arr = S.waitByPrio[r]; let n = 0; for (let q = 0; q < 8; q++) n += arr[q];
      font(c, 11, 600); c.fillStyle = '#d5e0f3'; c.textAlign = 'right'; c.fillText(fitText(c, p.label, L - 10), L - 8, y + bh * 0.62);
      font(c, 9.5); c.fillStyle = TXT2; c.fillText(p.targetDays + ' d target', L - 8, y + bh * 0.62 + 12);
      let x = L; rr(c, L, y, pw, bh, 5); c.fillStyle = 'rgba(255,255,255,.05)'; c.fill();
      if (n) for (let q = 0; q < 8; q++) { const bw = pw * arr[q] / n; c.fillStyle = cols[q]; c.fillRect(x, y, bw, bh); x += bw; }
      let over = 0; for (let q = 4; q < 8; q++) over += arr[q];
      if (n && over < n) { const tx = L + pw * (1 - over / n); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.5; c.setLineDash([3, 2]); c.beginPath(); c.moveTo(tx, y - 4); c.lineTo(tx, y + bh + 4); c.stroke(); c.setLineDash([]); c.lineWidth = 1; }
      font(c, 11, 700); c.textAlign = 'left'; c.fillStyle = n && over / n > 0.3 ? RED : '#d5e0f3'; c.fillText(n ? Math.round(over / n * 100) + '%' : '–', L + pw + 7, y + bh * 0.68);
    });
    c.lineWidth = 1;
    font(c, 9.5); c.fillStyle = TXT2; c.textAlign = 'left'; c.fillText('just referred', L, h - 6); c.textAlign = 'right'; c.fillText(pw < 230 ? '>1.75× target →' : 'more than 1.75× the target →', L + pw, h - 6);
    c.textAlign = 'center'; c.fillStyle = '#ffb3b3'; c.fillText(pw < 230 ? '┆ = target' : '┆ = at target (1.0×)', L + pw / 2 - 20, T - 6);
    c.fillStyle = '#d5e0f3'; c.textAlign = 'left'; c.fillText('% past target', L + pw - 4 - 52, T - 6);
  }

  function timeline(cv, S, t) {
    const { c, w, h } = prep(cv); if (!months) C.refreshSeries();
    font(c, 10.5, 600); const lgItems = [['Referrals / month', 'rgba(122,167,255,.8)'], ['Attended events / month', TEAL], ['People waiting (month end)', AMB]];
    let lgW = 0; lgItems.forEach(([tx]) => { lgW += 13 + c.measureText(tx).width + 14; }); const lgRows = lgW > w - 42 ? 2 : 1;
    const L = 38, R = 8, T = 18 + (lgRows - 1) * 14, B = 22, pw = w - L - R, ph = h - T - B; const n = months.refs.length;
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
    font(c, 10.5, 600); legendRows(c, lgItems, L + 4, 12.5, w - 4, 14);
  }

  function regions(cv, S) {
    const { c, w, h } = prep(cv); const rs = D.dims.regions; const nm = (r) => r.name.replace(' Metropolitan', '');
    const T = 30, B = 6, rowH = (h - T - B) / rs.length; const padR = 6, gap = 14;
    font(c, 10.5); let lw = 0; rs.forEach((r) => { lw = Math.max(lw, c.measureText(nm(r)).width); }); lw = Math.min(Math.ceil(lw) + 12, Math.max(64, w * 0.3));
    let mxw = 30, mxe = 3; rs.forEach((r, i) => { mxw = Math.max(mxw, S.regMed[i]); const q = S.regIn[i]; if (q.n) mxe = Math.max(mxe, q.ev / q.n); });
    // each column = bar area + reserved value-label space (widest label measured, not guessed)
    font(c, 10); const lab1 = c.measureText(String(Math.round(mxw))).width + 6, lab2 = c.measureText(mxe.toFixed(1)).width + 6;
    const colW = (w - lw - padR - gap) / 2; const bar1 = Math.max(10, colW - lab1), bar2 = Math.max(10, colW - lab2);
    const x1 = lw, x2 = lw + colW + gap;
    font(c, 10, 600); c.textAlign = 'left';
    c.fillStyle = AMB; c.fillText(pickText(c, ['Median wait (days)', 'Median wait', 'Wait (days)'], colW), x1, 14);
    c.fillStyle = TEAL; c.fillText(pickText(c, ['Events per person in care', 'Events per person', 'Events / person'], colW), x2, 14);
    rs.forEach((r, i) => {
      const y = T + i * rowH + rowH * 0.18, bh = rowH * 0.58;
      font(c, 10.5); c.fillStyle = '#c6d4ec'; c.textAlign = 'right'; c.fillText(fitText(c, nm(r), lw - 8), lw - 8, y + bh * 0.8);
      const mw = S.regMed[i], l1 = Math.max(2, bar1 * mw / mxw); c.fillStyle = 'rgba(245,185,74,.85)'; rr(c, x1, y, l1, bh, 3); c.fill();
      font(c, 10); c.fillStyle = '#e3ecfb'; c.textAlign = 'left'; c.fillText(mw ? Math.round(mw) : '–', x1 + l1 + 4, y + bh * 0.8);
      const q = S.regIn[i]; const av = q.n ? q.ev / q.n : 0, l2 = Math.max(2, bar2 * av / mxe); c.fillStyle = 'rgba(79,209,197,.85)'; rr(c, x2, y, l2, bh, 3); c.fill();
      c.fillStyle = '#e3ecfb'; c.fillText(av ? av.toFixed(1) : '–', x2 + l2 + 4, y + bh * 0.8);
    });
  }

  function specChart(cv, S) {
    const { c, w, h } = prep(cv); const sp = D.dims.specialties; const idx = sp.map((s, i) => i).sort((a, b) => S.spec90[b] - S.spec90[a]);
    const T = 4, B = 4, rowH = (h - T - B) / sp.length, lw = Math.min(118, w * 0.34); const mx = Math.max(1, S.spec90[idx[0]]); font(c, 10); const vlw = c.measureText(fmt(mx)).width + 10;
    specHits = [];
    idx.forEach((si, r) => {
      const y = T + r * rowH + rowH * 0.15, bh = rowH * 0.7; const s = sp[si]; const v = S.spec90[si]; const bw = Math.max(0, w - lw - vlw - 4) * v / mx;
      font(c, 10); c.textAlign = 'right'; c.fillStyle = D.filter.spec === si ? '#fff' : '#c6d4ec'; c.fillText(fitText(c, s.name, lw - 8), lw - 6, y + bh * 0.82);
      c.fillStyle = 'hsl(' + s.hue + ',65%,58%)'; rr(c, lw, y, Math.max(2, bw), bh, 3); c.fill();
      c.fillStyle = '#e3ecfb'; c.textAlign = 'left'; c.fillText(fmt(v), lw + Math.max(2, bw) + 5, y + bh * 0.82);
      specHits.push({ y0: y - 1, y1: y + bh + 1, si });
    });
  }


  function hspChart(cv, S) {
    const { c, w, h } = prep(cv); const hs = D.dims.hsps; const T = 34, B = 8, rowH = (h - T - B) / hs.length, lw = 52;
    const cols = ['#5ad19a', '#7aa7ff', '#f5b94a', '#9aa7bd']; const labs = ['In person', 'Telehealth / phone', 'Not attended (DNA)', 'Cancelled'];
    font(c, 10, 600); legendRows(c, labs.map((l, k) => [l, cols[k]]), 4, 14, w - 4, 14);
    const tot = hs.map((_, i) => { const q = S.hsp12[i]; return q[0] + q[1] + q[2] + q[3]; }); const mx = Math.max(1, ...tot);
    font(c, 10); const vlw = Math.max(c.measureText(fmt(mx)).width, (font(c, 9), c.measureText('100% tele').width)) + 10; const pw = Math.max(20, w - lw - vlw);
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
