/* OutpatientFlow WA — the animated scene (one marker per referral).
   1 Where referrals come from (real WA health regions + Perth metro inset, establishment dots)
   2 The waiting queue (one lane per referral priority, red line = BR §8.1 target)
   3 Outpatient services: one block per Health Service Provider, one door per clinic category, plus an establishment spotlight.
   Time model: simulation clock `t` is float days since dims.start. Events (spawn / appointment / end) are pre-sorted;
   seeking rebuilds all markers instantly at their correct place. */
(function (g) {
  'use strict';
  const OF = (g.OF = g.OF || {});
  const D = OF.Data, SP = OF.Sprites;
  const Scene = {}; OF.Scene = Scene;

  let cv, ctx, wrap, dpr = 1, cssW = 800, cssH = 400, sc = 1, L = null, bg = null, K = 1;
  let agents = new Map(), list = [], effects = [], popups = [];
  let ev = null, ptr = 0;
  let stats = null, selected = -1, hover = -1, hoverSite = -1;
  let geo = null, ests = null, pulses = null;
  Scene.t = 0; Scene.colorBy = 'prio'; Scene.density = 4; Scene.animF = 1; Scene.onPick = null; Scene.onSite = null;
  Scene.hspCol = { NMHS: '#6fb1ff', EMHS: '#c58bff', SMHS: '#ffb86b', CAHS: '#ff8fb8', WACHS: '#5ad19a' };
  const PRIO_COL = ['#ff6b6b', '#f7b94a', '#4fd1c5'];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hueCss(h, s, l, a) { return 'hsla(' + h + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')'; }
  const hcol = (h) => Scene.hspCol[D.dims.hsps[h].code] || '#9db0cf';
  const fmtN = (n) => Math.round(n).toLocaleString('en-AU');

  Scene.setGeo = function (regions, metro) { geo = { regions, metro }; bg = null; if (L) { computeLayout.cache = null; } };

  /* ---------- geometry helpers ---------- */
  function polysOf(f) { return f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; }
  function bbox(features) { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; features.forEach((f) => polysOf(f).forEach((p) => p[0].forEach((q) => { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); }))); return { x0: a, x1: b, y0: c, y1: d }; }
  function pathOf(feat, proj) { const p = new Path2D(); polysOf(feat).forEach((poly) => poly.forEach((ring) => { ring.forEach((q, i) => { const xy = proj(q[0], q[1]); i ? p.lineTo(xy[0], xy[1]) : p.moveTo(xy[0], xy[1]); }); })); return p; }

  /* ---------- layout ---------- */
  function computeLayout() {
    const dm = D.dims, portrait = cssW < 760;
    const W = portrait ? 640 : 1600; K = portrait ? 1.3 : 1;
    const Lo = { portrait, W };
    const nSpec = dm.specialties.length;
    // WA map projection (equirectangular at 25°S)
    const cosφ = Math.cos(25 * Math.PI / 180), LON0 = 112.9, LON1 = 129.1, LAT0 = -13.6, LAT1 = -35.3;
    let mapPanel, mapH, yardPanel, hy, cw, ch, gx0, gy0, gap;
    if (!portrait) {
      mapPanel = { x: 16, y: 54, w: 470, h: 830 }; yardPanel = { x: 498, y: 54, w: 320, h: 830 }; mapH = 540;
      gx0 = 832; gy0 = 54; gap = 14; cw = (W - 16 - gx0 - gap) / 2; ch = (830 - gap * 2) / 3; Lo.H = 900; Lo.titleY = 34;
    } else {
      mapPanel = { x: 10, y: 38, w: 620, h: 520 }; yardPanel = { x: 10, y: 590, w: 620, h: 540 }; mapH = 490;
      gx0 = 10; gy0 = 1166; gap = 10; cw = (W - 20 - gap) / 2; ch = 250; Lo.H = gy0 + 3 * ch + 2 * gap + 12; Lo.titleY = 22; Lo.hospTitleY = gy0 - 12;
    }
    Lo.map = mapPanel; Lo.yard = yardPanel;
    const s = (mapH - 28) / (LAT0 - LAT1 + 0), sx = s * cosφ; // px per degree
    const ox = mapPanel.x + 10, oy = mapPanel.y + 26;
    Lo.proj = (lon, lat) => [ox + (lon - LON0) * sx, oy + (LAT0 - lat) * s];
    Lo.mapBottom = oy + (LAT0 - LAT1) * s;
    // Perth inset
    const metroBB = geo ? bbox(geo.metro) : { x0: 115.5, x1: 116.5, y0: -32.9, y1: -31.4 };
    const ib = portrait ? { x: ox + (LON1 - LON0) * sx + 16, y: mapPanel.y + 26, w: mapPanel.x + mapPanel.w - (ox + (LON1 - LON0) * sx + 16) - 10, h: 235 } : { x: mapPanel.x + 10, y: Lo.mapBottom - 230, w: mapPanel.w - 20, h: 230 };
    const isc = Math.min(ib.w / ((metroBB.x1 - metroBB.x0) * cosφ), ib.h / (metroBB.y1 - metroBB.y0));
    const iox = ib.x + (ib.w - (metroBB.x1 - metroBB.x0) * cosφ * isc) / 2, ioy = ib.y + (ib.h - (metroBB.y1 - metroBB.y0) * isc) / 2;
    Lo.inset = ib; Lo.insetProj = (lon, lat) => [iox + (lon - metroBB.x0) * cosφ * isc, ioy + (metroBB.y1 - lat) * isc];
    Lo.insetBox = { x: iox, y: ioy, w: (metroBB.x1 - metroBB.x0) * cosφ * isc, h: (metroBB.y1 - metroBB.y0) * isc };
    Lo.perth = Lo.proj(115.86, -31.95);
    Lo.regList = portrait ? { x: ib.x, y: ib.y + ib.h + 36, w: ib.w, rowH: 21 } : { x: ib.x + ib.w + 18, y: ib.y + 18, w: mapPanel.x + mapPanel.w - (ib.x + ib.w + 18) - 12, rowH: 22 };
    // establishments + district spawn points
    ests = dm.establishments.map((e, i) => {
      const metro = e.region <= 2; const p = (metro ? Lo.insetProj : Lo.proj)(e.lon, e.lat);
      return { i, x: p[0], y: p[1], inset: metro, r: e.kind === 'nursing_post' ? 2.1 : clamp(2.6 + Math.sqrt(e.beds || 20) / 7.5, 2.8, 7.2), pulse: 0 };
    });
    Lo.ests = ests;
    Lo.spawn = dm.districts.map((d) => { const metro = d.region <= 2; const p = (metro ? Lo.insetProj : Lo.proj)(d.lon, d.lat); return { x: p[0], y: p[1] }; });
    // lanes
    const y = Lo.yard, nP = dm.priorities.length, top = portrait ? 16 : 44, lg = 8;
    const lh = (y.h - top - 20 - lg * (nP - 1)) / nP;
    Lo.lanes = dm.priorities.map((p, i) => ({ prio: i, x: y.x + 12, y: y.y + top + i * (lh + lg), w: y.w - 24, h: lh }));
    Lo.laneX = (lane, u) => { const a = lane.x + 26, w = lane.w - 40; const uu = clamp(u, 0, 3); return a + w * (uu <= 1 ? uu * 0.62 : 0.62 + Math.min(1, (uu - 1) / 2) * 0.38); };
    // cells: 5 HSP blocks + spotlight
    Lo.cells = [];
    for (let n = 0; n < 6; n++) { Lo.cells.push({ n, x: gx0 + (n % 2) * (cw + gap), y: gy0 + Math.floor(n / 2) * (ch + gap), w: cw, h: ch }); }
    const hsps = dm.hsps;
    Lo.cells.forEach((c) => {
      if (c.n >= hsps.length) { c.spot = true; return; }
      c.hsp = c.n; const bt = c.y + (portrait ? 24 : 30);
      c.bld = { x: c.x + 10, y: bt, w: c.w - 20, h: portrait ? 56 : 62 };
      c.court = { x: c.x + 8, y: c.bld.y + c.bld.h + 10, w: c.w - 16, h: c.y + c.h - 8 - (c.bld.y + c.bld.h + 10) };
      const step = (c.bld.w - 16) / nSpec, dw = Math.min(24, step - 3);
      c.doors = dm.specialties.map((sp, k) => ({ spec: k, code: sp.code, w: dw, h: Math.min(26, c.bld.h * 0.45), x: c.bld.x + 8 + step * (k + 0.5), y: c.bld.y + c.bld.h, glow: 0, gc: '#5ad19a', kind: 'door' }));
      c.doorOf = {}; c.doors.forEach((d) => { c.doorOf[d.spec] = d; });
      c.exit = { x: c.court.x + c.court.w - 22, y: c.court.y + c.court.h - 4 };
    });
    const sp = Lo.cells[5]; Lo.spot = sp;
    return Lo;
  }

  function fz(n) { const px = Math.max(9, n * Math.min(1, cssW / 1000)); return px / sc; }
  const FONT = '"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif';

  /* ---------- static background ---------- */
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function drawBg(c) {
    const dm = D.dims;
    const gradBg = c.createLinearGradient(0, 0, 0, L.H); gradBg.addColorStop(0, '#0c1626'); gradBg.addColorStop(1, '#09111d');
    c.fillStyle = gradBg; c.fillRect(0, 0, L.W, L.H);
    const zone = (z, title) => {
      rrect(c, z.x, z.y, z.w, z.h, 14); c.fillStyle = 'rgba(20,34,58,.55)'; c.fill(); c.strokeStyle = 'rgba(140,170,220,.14)'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#9db0cf'; c.font = '700 ' + fz(11) + 'px ' + FONT; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText(title, z.x + 4, z.y - (L.portrait ? 8 : 12));
    };
    zone(L.map, '1 · WHERE REFERRALS COME FROM  (WA health regions)');
    zone(L.yard, '2 · WAITING FOR A FIRST APPOINTMENT');
    c.fillStyle = '#9db0cf'; c.font = '700 ' + fz(11) + 'px ' + FONT; c.textAlign = 'left';
    c.fillText(L.portrait ? '3 · OUTPATIENT SERVICES  (5 HSPs · ' + dm.establishments.length + ' NADC sites)' : '3 · OUTPATIENT SERVICES  (5 Health Service Providers · ' + dm.establishments.length + ' NADC sites)', 830, 30);
    // WA regions
    if (geo) {
      const regF = geo.regions.filter((f) => f.properties.level === 'region'), disF = geo.regions.filter((f) => f.properties.level === 'district');
      const hspOf = (name) => { const r = dm.regions.find((q) => q.name === name); return r ? r.hsp : 'WACHS'; };
      const hspCol = (code) => Scene.hspCol[code];
      c.lineJoin = 'round';
      disF.forEach((f) => { const col = hspCol(hspOf(f.properties.region)); const p = pathOf(f, L.proj); c.fillStyle = col + '1f'; c.fill(p, 'evenodd'); c.strokeStyle = col + '40'; c.lineWidth = 1; c.stroke(p); });
      regF.forEach((f) => { const col = hspCol(hspOf(f.properties.name)); const p = pathOf(f, L.proj); c.strokeStyle = col + 'aa'; c.lineWidth = 1.2; c.stroke(p); });
      c.font = '700 ' + fz(9) + 'px ' + FONT; c.textAlign = 'center'; c.fillStyle = 'rgba(200,220,255,.55)';
      const lab = (t, x, y, al) => { c.textAlign = al || 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(9,17,29,.85)'; c.strokeText(t, x, y); c.fillText(t, x, y); };
      const k = Math.max(0.7, Math.min(1.3, L.map.w / 360));
      regF.forEach((f) => { if (hspOf(f.properties.name) !== 'WACHS') return; const q = L.proj(f.properties.cx, f.properties.cy); const nm = f.properties.name;
        if (nm === 'South West') lab('SW', q[0] - 16 * k, q[1] + 14 * k, 'center');
        else if (nm === 'Great Southern') lab('Great Southern', q[0] + 34 * k, q[1] + 4 * k, 'left');
        else if (nm === 'Wheatbelt') lab(nm, q[0] + 22 * k, q[1] - 14 * k);
        else lab(nm, q[0], q[1]);
      });
      c.lineWidth = 1;
      const pr = L.perth, ib = L.insetBox;
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.beginPath(); c.arc(pr[0], pr[1], 9, 0, 7); c.stroke();
      c.setLineDash([3, 4]); c.beginPath(); c.moveTo(pr[0] - 4, pr[1] + 8); c.lineTo(ib.x + ib.w * 0.5, ib.y); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '700 ' + fz(9) + 'px ' + FONT; c.textAlign = 'right'; c.fillText('Perth', pr[0] - 12, pr[1] - 2);
      const ins = L.inset; rrect(c, ins.x - 2, ins.y - 2, ins.w + 4, ins.h + 4, 8); c.fillStyle = 'rgba(8,15,27,.6)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.stroke();
      c.save(); rrect(c, ins.x - 2, ins.y - 2, ins.w + 4, ins.h + 4, 8); c.clip();
      geo.metro.forEach((f) => { const col = hspCol(hspOf(f.properties.region)); const p = pathOf(f, L.insetProj); c.fillStyle = col + '30'; c.fill(p, 'evenodd'); c.strokeStyle = col + '99'; c.lineWidth = 1; c.stroke(p); });
      c.restore();
      c.fillStyle = '#9db0cf'; c.font = '700 ' + fz(9) + 'px ' + FONT; c.textAlign = 'left'; c.fillText('PERTH METRO (inset)', ins.x, ins.y - 6 + (L.portrait ? -2 : 0));
      c.fillStyle = 'rgba(150,175,215,.5)'; c.font = fz(8.5) + 'px ' + FONT; c.fillText('34 health districts → 10 regions', L.map.x + 12, L.map.y + 16);
    }
    // lanes
    L.lanes.forEach((ln) => {
      const p = dm.priorities[ln.prio]; const col = PRIO_COL[ln.prio % 3];
      rrect(c, ln.x, ln.y, ln.w, ln.h, 10); c.fillStyle = 'rgba(8,15,27,.7)'; c.fill();
      c.strokeStyle = 'rgba(140,170,220,.12)'; c.stroke();
      const bx = L.laneX(ln, 1);
      const rg = c.createLinearGradient(bx, 0, ln.x + ln.w, 0); rg.addColorStop(0, 'rgba(255,90,90,.05)'); rg.addColorStop(1, 'rgba(255,90,90,.22)');
      c.save(); rrect(c, ln.x, ln.y, ln.w, ln.h, 10); c.clip(); c.fillStyle = rg; c.fillRect(bx, ln.y, ln.x + ln.w - bx, ln.h);
      c.strokeStyle = 'rgba(140,170,220,.05)'; for (let u = 0.25; u < 1; u += 0.25) { const x = L.laneX(ln, u); c.beginPath(); c.moveTo(x, ln.y); c.lineTo(x, ln.y + ln.h); c.stroke(); }
      c.restore();
      c.setLineDash([5, 4]); c.strokeStyle = 'rgba(255,107,107,.75)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(bx, ln.y + 4); c.lineTo(bx, ln.y + ln.h - 4); c.stroke(); c.setLineDash([]);
      c.fillStyle = col; c.beginPath(); c.arc(ln.x + 12, ln.y + 13, 4, 0, 7); c.fill();
      c.fillStyle = '#d5e0f3'; c.font = '700 ' + fz(11) + 'px ' + FONT; c.textAlign = 'left'; c.fillText(p.label + ' (' + p.code + ')', ln.x + 22, ln.y + 17);
      c.fillStyle = 'rgba(255,140,140,.95)'; c.font = '600 ' + fz(9.5) + 'px ' + FONT; c.textAlign = 'right';
      c.fillText('target ' + p.targetDays + ' days', bx - 6, ln.y + ln.h - 7);
      c.fillStyle = 'rgba(255,150,150,.6)'; c.font = fz(9.5) + 'px ' + FONT; c.fillText('past target', ln.x + ln.w - 8, ln.y + ln.h - 7);
      c.fillStyle = 'rgba(150,175,215,.55)'; c.textAlign = 'left'; c.fillText('just referred', ln.x + 10, ln.y + ln.h - 7);
    });
    c.fillStyle = 'rgba(150,175,215,.55)'; c.font = fz(9) + 'px ' + FONT; c.textAlign = 'left'; c.fillText('Targets: Business Rules (Jul 2026) §8.1, 30 / 90 / 365 days.', L.yard.x + 12, L.yard.y + L.yard.h + 18);
    // HSP blocks
    L.cells.forEach((cell) => {
      rrect(c, cell.x, cell.y, cell.w, cell.h, 14); c.fillStyle = 'rgba(18,31,54,.6)'; c.fill(); c.strokeStyle = 'rgba(140,170,220,.14)'; c.stroke();
      if (cell.spot) return;
      const hp = dm.hsps[cell.hsp], col = hcol(cell.hsp);
      c.fillStyle = col; rrect(c, cell.x, cell.y + 8, 4, 18, 2); c.fill();
      const cy = cell.court; rrect(c, cy.x, cy.y, cy.w, cy.h, 10);
      const gg = c.createLinearGradient(0, cy.y, 0, cy.y + cy.h); gg.addColorStop(0, '#173a3a'); gg.addColorStop(1, '#122c33'); c.fillStyle = gg; c.fill();
      c.save(); rrect(c, cy.x, cy.y, cy.w, cy.h, 10); c.clip(); c.fillStyle = 'rgba(120,230,170,.07)';
      for (let k = 0; k < 90; k++) { const hx = D.hash(k, cell.hsp + 11) * cy.w, hy = D.hash(k, cell.hsp + 51) * cy.h; c.fillRect(cy.x + hx, cy.y + hy, 2, 2); }
      c.restore();
      c.fillStyle = 'rgba(150,175,215,.55)'; c.font = fz(9) + 'px ' + FONT; c.textAlign = 'right'; c.fillText('closed ▸', cell.exit.x + 18, cell.exit.y - 3);
      const b = cell.bld; rrect(c, b.x, b.y, b.w, b.h, 8);
      const bgd = c.createLinearGradient(0, b.y, 0, b.y + b.h); bgd.addColorStop(0, '#2a4068'); bgd.addColorStop(1, '#1a2b49'); c.fillStyle = bgd; c.fill();
      c.strokeStyle = col + '77'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(b.x + 6, b.y + 5, b.w - 12, 5);
      c.fillStyle = 'rgba(190,215,255,.1)';
      for (let rx = 0; rx < Math.floor((b.w - 20) / 14); rx++) c.fillRect(b.x + 10 + rx * 14, b.y + 14, 8, 5);
      const nE = dm.establishments.filter((e) => e.hsp === cell.hsp).length;
      c.fillStyle = '#e8f0ff'; c.font = '700 ' + fz(12) + 'px ' + FONT; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText(hp.code, cell.x + 12, cell.y + (L.portrait ? 16 : 21));
      c.fillStyle = '#8ea1c2'; c.font = fz(9.5) + 'px ' + FONT; const hw = c.measureText(hp.code).width; c.font = '700 ' + fz(12) + 'px ' + FONT; const hw2 = c.measureText(hp.code).width; c.font = '600 ' + fz(9.5) + 'px ' + FONT; if (!L.portrait) c.fillText(nE + (nE === 1 ? ' establishment' : ' establishments'), cell.x + 12 + hw2 + 8, cell.y + (L.portrait ? 16 : 21));
      cell.doors.forEach((d, n) => {
        const sp = dm.specialties[d.spec];
        const alpha = sp.verified ? 1 : 0.7;
        c.globalAlpha = alpha; c.fillStyle = hueCss(sp.hue, 58, 48); c.beginPath(); c.moveTo(d.x - d.w / 2, d.y); c.lineTo(d.x - d.w / 2, d.y - d.h + d.w / 2); c.arc(d.x, d.y - d.h + d.w / 2, d.w / 2, Math.PI, 0); c.lineTo(d.x + d.w / 2, d.y); c.closePath(); c.fill();
        c.fillStyle = 'rgba(5,12,24,.55)'; c.beginPath(); c.moveTo(d.x - d.w / 2 + 2.5, d.y); c.lineTo(d.x - d.w / 2 + 2.5, d.y - d.h + d.w / 2); c.arc(d.x, d.y - d.h + d.w / 2, d.w / 2 - 2.5, Math.PI, 0); c.lineTo(d.x + d.w / 2 - 2.5, d.y); c.closePath(); c.fill();
        const show = !L.portrait || n % 2 === 0;
        if (show) { c.fillStyle = '#dce8ff'; c.font = '700 ' + Math.max(7 / sc * 0.9, 6.6) + 'px ' + FONT; c.textAlign = 'center'; c.fillText(sp.code, d.x, d.y - d.h - 3 - (!L.portrait && n % 2 ? 10 : 0)); }
      });
      c.globalAlpha = 1;
    });
  }

  /* ---------- agents ---------- */
  function colorOf(i, tot) {
    switch (Scene.colorBy) {
      case 'stage': return SP.palette.stage[tot <= 0 ? 0 : tot <= 2 ? 1 : tot <= 5 ? 2 : 3];
      case 'spec': return SP.specColor(D.dims.specialties[D.spec[i]].hue);
      case 'region': return SP.regionColor(D.region[i]);
      case 'hsp': { const h = D.hspOfSite[D.site[i]]; const c = hcol(h); return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
      default: return SP.palette.prio[D.prio[i] % 3];
    }
  }
  Scene.colorLegend = function () {
    const dm = D.dims;
    switch (Scene.colorBy) {
      case 'stage': return [['Waiting, no attended events yet', SP.palette.stage[0]], ['1–2 events', SP.palette.stage[1]], ['3–5 events', SP.palette.stage[2]], ['6+ events', SP.palette.stage[3]]];
      case 'spec': return dm.specialties.map((s) => [s.name, SP.specColor(s.hue)]);
      case 'region': return dm.regions.map((r, i) => [r.name, SP.regionColor(i)]);
      case 'hsp': return dm.hsps.map((h, i) => { const c = hcol(i); return [h.code, [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]]; });
      default: return dm.priorities.map((p, i) => [p.label + ' (' + p.targetDays + ' d target)', SP.palette.prio[i % 3]]);
    }
  };

  function gTop() { return L.portrait ? 92 : 64; }
  function laneOf(a) { return L.lanes[D.prio[a.i] % L.lanes.length]; }
  function waitTarget(a, t) {
    const ln = laneOf(a); const u = (t - D.ref[a.i]) / D.target[D.prio[a.i]]; a.u = u;
    return [L.laneX(ln, u) + (a.jx - 0.5) * 12, ln.y + gTop() + a.jy * Math.max(6, ln.h - gTop() - 20)];
  }
  function careBase(a, t = Scene.t) {
    const c = L.cells[a.cell].court;
    const duration = Number.isFinite(a.activeDays) ? a.activeDays : (a.i != null && typeof D.activeDays === 'function' ? D.activeDays(a.i, t) : 0);
    const progress = clamp(duration / 180, 0, 1);
    const x = c.x + 14 + progress * (c.w - 28) + (a.jx - 0.5) * 8;
    const y = c.y + 18 + a.jy * Math.max(6, c.h - 26);
    return [x, y];
  }

  function makeAgent(i, st, t) {
    const a = { i, x: 0, y: 0, tx: 0, ty: 0, state: st.state === 2 ? 2 : 1, att: st.att, tot: D.prior[i] + st.att, jx: (0.5 + i * 0.7548776662) % 1, jy: (0.5 + i * 0.569840291) % 1, alpha: 1, vis: 1, mt: 0, mo: 0, wt: 2 + Math.random() * 4, ph: Math.random() * Math.PI * 2, script: [], si: 0, dead: false, pop: 1, activeDays: typeof D.activeDays === 'function' ? D.activeDays(i, t) : 0 };
    a.cell = D.hspOfSite[D.site[i]];
    a.gd = D.careLevel(a.tot);
    const cell = L.cells[a.cell]; a.door = cell.doorOf[D.spec[i]] || cell.doors[0];
    if (a.state === 1) { const p = waitTarget(a, t); a.tx = p[0]; a.ty = p[1]; } else { const p = careBase(a, t); a.tx = p[0]; a.ty = p[1]; }
    a.x = a.tx; a.y = a.ty;
    return a;
  }

  function flush(a) {
    for (; a.si < a.script.length; a.si++) { const s = a.script[a.si]; if (s.t === 'walk') { a.x = s.x; a.y = s.y; } else if (s.t === 'call') s.f(a); else if (s.t === 'fade') { a.dead = true; } }
    a.script = []; a.si = 0; a.vis = 1;
  }
  function run(a, steps) { if (a.script.length) flush(a); a.script = steps; a.si = 0; }
  const walk = (x, y, sp) => ({ t: 'walk', x, y, sp: sp || 120 });
  const hold = (d) => ({ t: 'hold', d, el: 0 });
  const call = (f) => ({ t: 'call', f });
  function pop(x, y, text, color) {
    if (popups.length >= 16) return;
    for (let k = 0; k < popups.length; k++) { const q = popups[k]; if (Math.abs(q.x - x) < 70 && Math.abs(q.y - y) < 12) return; }
    popups.push({ x, y, text, color, life: 1.6, age: 0 });
  }
  const pulse = (a) => { const e = ests[D.site[a.i]]; if (e) e.pulse = 1; };

  function attend(a) { a.att++; a.tot++; a.pop = 1.45; a.activeDays = 0; }

  function approach(a) {
    const cell = L.cells[a.cell], d = a.door, steps = [];
    if (a.state === 1) {
      if (L.portrait) { steps.push(walk(d.x, L.yard.y + L.yard.h + 6)); }
      else { steps.push(walk(L.yard.x + L.yard.w + 6, a.y)); steps.push(walk(cell.x + 6, cell.court.y + 6)); }
    }
    steps.push(walk(d.x, d.y + 10 + (a.jy * 4)));
    return steps;
  }

  function onAttend(i, k) {
    const a = agents.get(i); if (!a) return;
    const mode = D.evs[i][k + 2], tele = D.remote[mode]; const d = a.door;
    const wasWaiting = a.state === 1; pulse(a);
    if (!tele) {
      const steps = approach(a);
      steps.push(call((q) => { q.vis = 0; d.glow = 1; d.gc = '#5ad19a'; pop(d.x, d.y - d.h - 14, '+1', '#7ff0b0'); }), hold(0.45),
        call((q) => { attend(q); q.vis = 1; q.state = 2; q.mt = 1.6; q.mo = 1; }),
        walk(...careBase(a)));
      run(a, steps);
    } else {
      const steps = [];
      const md = D.dims.modes[mode];
      steps.push(call((q) => { effects.push({ type: 'beam', a: q, d, life: 1.5, age: 0, video: md.code === 'VID' || md.code === 'THH' || md.code === 'THS' }); d.glow = 1; d.gc = '#7aa7ff'; q.mt = 1.2; q.mo = 1; pop(q.x, q.y - 40 * K, '+1 ' + (md.code === 'VID' || md.code === 'THH' ? 'video' : md.code === 'TEL' ? 'phone' : 'telehealth'), '#9cc4ff'); }), hold(0.4));
      if (wasWaiting) steps.push(call((q) => { q.state = 2; }), walk(...careBase(a), 90));
      run(a, steps);
    }
  }
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  function onNonClient(i, k) {
    const a = agents.get(i); if (!a) return; const nc = D.dims.nonClient[D.evs[i][k + 3]] || { code: 'NCE', label: 'Non-client event' };
    run(a, [call((q) => { q.mt = 1.2; q.mo = 2; pop(q.x, q.y - 40 * K, nc.code === 'MCC' ? 'MCC · patient not present' : 'chart only', '#b6c1d6'); }), hold(0.4)]);
  }
  function onMiss(i, k) {
    const a = agents.get(i); if (!a) return;
    const kind = D.evs[i][k + 1], code = D.evs[i][k + 3], d = a.door;
    if (kind === 2) {
      const cc = D.dims.cancellation[code] || { label: 'Cancelled', by: 'unknown' };
      const col = cc.by === 'hospital' ? '#8fb4ff' : cc.by === 'patient' ? '#f5b94a' : '#b6c1d6';
      run(a, [call((q) => { q.mt = 1.6; q.mo = 2; pop(q.x, q.y - 42 * K, '✕ ' + short(cc.label, 22), col); }), hold(0.5)]);
      return;
    }
    const nr = D.dims.nonAttendance[code] || { label: 'DNA' };
    const steps = D.remote[D.evs[i][k + 2]] ? [] : approach(a); if (steps.length) steps.pop();
    if (steps.length) steps.push(walk(d.x, d.y + 26, 120));
    steps.push(call((q) => { q.mt = 1.6; q.mo = 3; d.glow = 1; d.gc = '#f5b94a'; pop(steps.length > 1 ? d.x : q.x, steps.length > 1 ? d.y - d.h - 14 : q.y - 42 * K, 'Did not attend · ' + short(nr.label, 20), '#f5b94a'); }));
    steps.push(walk(...(a.state === 1 ? waitTarget(a, Scene.t) : careBase(a)), 120));
    run(a, steps);
  }
  function onEnd(i) {
    const a = agents.get(i); if (!a) return;
    const rc = D.closeIdx[i] >= 0 ? D.dims.closeReasons[D.closeIdx[i]] : { code: 'TRE', label: 'Closed' };
    const cell = L.cells[a.cell]; const happy = rc.code === 'TRE' || rc.code === 'DIP';
    if (a.state === 2 && happy) run(a, [walk(cell.exit.x, cell.exit.y - 14, 70), call((q) => { q.mt = 1; q.mo = 1; pop(q.x, q.y - 40 * K, '♥ ' + short(rc.label, 20), '#ff9ec2'); }), { t: 'fade', rate: 0.9 }]);
    else run(a, [call((q) => { q.mt = 2; q.mo = 2; pop(q.x, q.y - 40 * K, short(rc.label, 22), '#a7b3c8'); }), { t: 'fade', rate: 0.9 }]);
  }

  function updateAgent(a, dt) {
    a.ph += dt * 9; a.moving = false;
    if (a.pop > 1) a.pop = Math.max(1, a.pop - dt * 1.4);
    if (a.mt > 0) { a.mt -= dt; if (a.mt <= 0) a.mo = -1; }
    const gt = D.careLevel(a.tot); a.gd += (gt - a.gd) * (1 - Math.exp(-dt * 2.5));
    if (a.si < a.script.length) {
      for (let n = 0; n < 5 && a.si < a.script.length; n++) {
        const s = a.script[a.si];
        if (s.t === 'call') { s.f(a); a.si++; continue; }
        if (s.t === 'hold') { s.el += dt * Scene.animF; if (s.el >= s.d) { a.si++; continue; } break; }
        if (s.t === 'fade') { a.alpha -= dt * s.rate * Scene.animF; if (a.alpha <= 0) { a.dead = true; } break; }
        if (s.t === 'walk') {
          const dx = s.x - a.x, dy = s.y - a.y, dist = Math.hypot(dx, dy), stp = s.sp * dt * Scene.animF;
          if (dist <= stp) { a.x = s.x; a.y = s.y; a.si++; continue; }
          a.x += dx / dist * stp; a.y += dy / dist * stp; a.moving = true; break;
        }
      }
      if (a.si >= a.script.length) { a.script = []; a.si = 0; }
      return;
    }
    if (a.state === 1) {
      const p = waitTarget(a, Scene.t); a.tx = p[0]; a.ty = p[1];
      const dx = a.tx - a.x, dy = a.ty - a.y, dist = Math.hypot(dx, dy);
      if (dist > 0.5) { const k = Math.min(1, dt * Scene.animF * (dist > 60 ? 3.2 : 4)); const stp = Math.min(dist, Math.max(dist * k, Math.min(dist, 40 * dt))); a.x += dx / dist * stp; a.y += dy / dist * stp; a.moving = true; }
    } else {
      a.activeDays = typeof D.activeDays === 'function' ? D.activeDays(a.i, Scene.t) : 0;
      a.wt -= dt;
      if (a.wt <= 0) { const p = careBase({ cell: a.cell, jx: Math.random(), jy: Math.random(), i: a.i, activeDays: a.activeDays }, Scene.t); a.tx = p[0]; a.ty = p[1]; a.wt = 2 + Math.random() * 4; }
      const dx = a.tx - a.x, dy = a.ty - a.y, dist = Math.hypot(dx, dy);
      if (dist > 1) { const stp = Math.min(dist, 24 * dt * Scene.animF); a.x += dx / dist * stp; a.y += dy / dist * stp; a.moving = true; }
      if (a.activeDays > 0) {
        const p = careBase(a, Scene.t);
        a.tx = p[0]; a.ty = p[1];
      }
    }
  }

  /* ---------- events & seeking ---------- */
  Scene.setup = function () {
    const K_ = Scene.density; const T = [], Ty = [], P = [], Kx = [];
    for (let i = 0; i < D.N; i++) {
      if (!D.pass[i] || D.hash(i, 1) >= 1 / K_) continue;
      const h = D.hash(i, 2);
      T.push(D.ref[i] + h * 0.3); Ty.push(0); P.push(i); Kx.push(-1);
      const e = D.evs[i];
      for (let k = 0; k < e.length; k += 5) { T.push(e[k] + 0.35 + D.hash(i * 7 + k, 4) * 0.3); Ty.push(1); P.push(i); Kx.push(k); }
      if (D.end[i] >= 0) { T.push(D.end[i] + 0.7 + h * 0.25); Ty.push(2); P.push(i); Kx.push(-1); }
    }
    const ord = Array.from(T.keys()).sort((a, b) => T[a] - T[b]);
    ev = { t: Float64Array.from(ord.map((o) => T[o])), ty: Uint8Array.from(ord.map((o) => Ty[o])), p: Int32Array.from(ord.map((o) => P[o])), k: Int32Array.from(ord.map((o) => Kx[o])) };
    Scene.seek(Scene.t);
  };
  Scene.seek = function (t) {
    if (!L || !ev) return;
    const tt = Math.floor(t); Scene.t = tt + 0.999;
    agents = new Map(); effects = []; popups = [];
    let lo = 0, hi = ev.t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ev.t[m] < tt + 1) lo = m + 1; else hi = m; } ptr = lo;
    const o = {};
    for (let i = 0; i < D.N; i++) {
      if (!D.pass[i] || D.hash(i, 1) >= 1 / Scene.density || tt < D.ref[i]) continue;
      D.status(i, tt, o); if (o.state === 1 || o.state === 2) agents.set(i, makeAgent(i, o, tt));
    }
    L.cells.forEach((c) => c.doors && c.doors.forEach((d) => { d.glow = 0; }));
    ests.forEach((e) => { e.pulse = 0; });
    rebuildList();
  };
  function rebuildList() { list = Array.from(agents.values()); }

  Scene.advance = function (dt, daysPerSec, playing) {
    Scene.animF = clamp(0.8 + daysPerSec / 18, 1, 2.4);
    if (!ev) return;
    if (playing) {
      const t1 = Math.min(D.DAYS - 0.01, Scene.t + dt * daysPerSec);
      if (t1 >= D.DAYS - 0.02) Scene.finished = true;
      Scene.t = t1;
      while (ptr < ev.t.length && ev.t[ptr] <= Scene.t) {
        const i = ev.p[ptr], ty = ev.ty[ptr];
        if (ty === 0) {
          if (!agents.has(i)) {
            const a = makeAgent(i, { state: D.internal[i] ? 2 : 1, att: 0 }, Scene.t);
            if (D.internal[i]) a.pop = 1.4; else { const n = L.spawn[D.district[i]]; a.x = n.x; a.y = n.y; a.alpha = 0.2; a.spawn = 1; }
            agents.set(i, a); list.push(a);
          }
        } else if (ty === 1) { const k = ev.k[ptr], kd = D.evs[i][k + 1]; if (kd === 0) onAttend(i, k); else if (kd === 3) onNonClient(i, k); else onMiss(i, k); }
        else onEnd(i);
        ptr++;
      }
    }
    let dead = false;
    for (let n = 0; n < list.length; n++) { const a = list[n]; updateAgent(a, dt); if (a.spawn) { a.alpha = Math.min(1, a.alpha + dt * 2); if (a.alpha >= 1) a.spawn = 0; } if (a.dead) dead = true; }
    if (dead) { list = list.filter((a) => !a.dead); agents.forEach((a, i) => { if (a.dead) agents.delete(i); }); }
    for (let n = effects.length - 1; n >= 0; n--) { effects[n].age += dt; if (effects[n].age > effects[n].life) effects.splice(n, 1); }
    for (let n = popups.length - 1; n >= 0; n--) { const p = popups[n]; p.age += dt; p.y -= dt * 14; if (p.age > p.life) popups.splice(n, 1); }
    L.cells.forEach((c) => c.doors && c.doors.forEach((d) => { if (d.glow > 0) d.glow = Math.max(0, d.glow - dt * 1.3); }));
    ests.forEach((e) => { if (e.pulse > 0) e.pulse = Math.max(0, e.pulse - dt * 1.1); });
  };

  /* ---------- render ---------- */
  function spriteFor(a) {
    const mood = a.mo >= 0 && a.mt > 0 ? a.mo : (a.state === 1 ? (a.u > 1 ? 2 : 0) : (a.att > 0 ? 1 : 0));
    const rgb0 = colorOf(a.i, a.tot);
    let rgb = rgb0; if (a.state === 1 && a.u > 1.2 && Scene.colorBy !== 'stage') rgb = rgb0.map((v) => Math.round(v * 0.82 + 20));
    const b = clamp(Math.round(a.gd * (SP.NB - 1)), 0, SP.NB - 1);
    return SP.get(rgb, b, mood);
  }
  Scene.siteInfo = function (si) {
    const e = D.dims.establishments[si]; const st = stats;
    return { e, waiting: st ? st.siteWait[si] : 0, inCare: st ? st.siteIn[si] : 0, att90: st ? st.site90[si] : 0 };
  };
  function siteActive(si) {
    const f = D.filter; const e = D.dims.establishments[si];
    if (f.site >= 0 && f.site !== si) return false; if (f.hsp >= 0 && f.hsp !== e.hsp) return false; return true;
  }

  Scene.render = function (now) {
    if (!L) return;
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    if (!bg) { bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height; const b = bg.getContext('2d'); b.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0); drawBg(b); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg, 0, 0); ctx.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    L.cells.forEach((c) => c.doors && c.doors.forEach((d) => { if (d.glow > 0) { const gr = ctx.createRadialGradient(d.x, d.y - d.h / 2, 2, d.x, d.y - d.h / 2, 26 * d.glow + 10); gr.addColorStop(0, d.gc + 'ff'); gr.addColorStop(1, d.gc + '00'); ctx.fillStyle = gr; ctx.fillRect(d.x - 28, d.y - d.h - 16, 56, 42); } }));
    ctx.textBaseline = 'alphabetic';
    // establishment dots
    const dm = D.dims;
    ests.forEach((p) => {
      const e = dm.establishments[p.i]; const act = siteActive(p.i); const col = hcol(e.hsp);
      ctx.globalAlpha = act ? 1 : 0.18;
      if (p.pulse > 0) { ctx.strokeStyle = col; ctx.globalAlpha = p.pulse * 0.9; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (1 - p.pulse) * 11, 0, 7); ctx.stroke(); ctx.globalAlpha = act ? 1 : 0.18; }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(5,10,20,.8)'; ctx.lineWidth = 0.8; ctx.stroke();
      if (p.i === D.filter.site || p.i === hoverSite) { ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 3, 0, 7); ctx.stroke(); }
    });
    ctx.globalAlpha = 1;
    // labels for the metro establishments with more beds in the inset
    ctx.font = '600 ' + fz(8) + 'px ' + FONT; ctx.textAlign = 'left'; const placed = [];
    ests.filter((p) => p.inset && ['TERT', 'PAED', 'WOMN', 'METR'].includes(dm.establishments[p.i].tier)).sort((a, b) => dm.establishments[b.i].beds - dm.establishments[a.i].beds).forEach((p) => {
      const t = dm.establishments[p.i].short; const w = ctx.measureText(t).width; const bx = { x: p.x + p.r + 2, y: p.y - 8, w, h: 10 };
      if (bx.x + w > L.inset.x + L.inset.w + 2) { bx.x = p.x - p.r - 2 - w; }
      if (placed.some((q) => bx.x < q.x + q.w && bx.x + bx.w > q.x && bx.y < q.y + q.h && bx.y + bx.h > q.y)) return;
      placed.push(bx); ctx.fillStyle = 'rgba(230,240,255,.85)'; ctx.fillText(t, bx.x, bx.y + 8);
    });
    if (stats) {
      L.lanes.forEach((ln) => {
        const arr = stats.waitByPrio[ln.prio]; let n = 0, over = 0; for (let q = 0; q < 8; q++) { n += arr[q]; if (q >= 4) over += arr[q]; }
        ctx.textAlign = 'right'; ctx.font = '700 ' + fz(11) + 'px ' + FONT; ctx.fillStyle = '#e3ecfb'; const t1 = fmtN(n) + ' waiting'; ctx.fillText(t1, ln.x + ln.w - 8, ln.y + 17);
        if (over) { ctx.font = fz(9.5) + 'px ' + FONT; ctx.fillStyle = '#ff9a9a'; ctx.fillText(fmtN(over) + ' past target', ln.x + ln.w - 8, ln.y + 32); }
        const sn = stats.seen12[ln.prio], wn = stats.within12[ln.prio];
        ctx.textAlign = 'left'; ctx.font = '600 ' + fz(9.5) + 'px ' + FONT; ctx.fillStyle = sn ? (wn / sn >= 0.9 ? '#7fe0b4' : wn / sn >= 0.7 ? '#f5b94a' : '#ff8b8b') : '#6f819e';
        const td = dm.priorities[ln.prio].targetDays, pc = sn ? Math.round(wn / sn * 100) : 0;
        const rw = over ? (ctx.font = fz(9.5) + 'px ' + FONT, ctx.measureText(fmtN(over) + ' past target').width) : 0;
        ctx.font = '600 ' + fz(9.5) + 'px ' + FONT;
        const room = ln.w - 22 - 8 - rw - 8;
        const opts = sn ? ['Seen ≤' + td + ' d (12 mo): ' + pc + '% of ' + fmtN(sn), 'Seen ≤' + td + ' d: ' + pc + '% of ' + fmtN(sn), '≤' + td + ' d: ' + pc + '%'] : ['No first appts in last 12 mo', 'No recent first appts'];
        let txt = opts.find((o) => ctx.measureText(o).width <= room) || opts[opts.length - 1];
        ctx.fillText(txt, ln.x + 22, ln.y + 32);
      });
      L.cells.forEach((c) => {
        if (c.spot || !c.doors) return;
        ctx.textAlign = 'right'; ctx.font = '600 ' + fz(10) + 'px ' + FONT; const nIn = fmtN(stats.hspIn[c.hsp]); const tail = ' in care · '; const wT = ctx.measureText(tail).width;
        const yy = c.y + (L.portrait ? 16 : 21); const wTxt = fmtN(stats.hspWait[c.hsp]) + ' waiting';
        ctx.fillStyle = '#e3ecfb'; ctx.fillText(wTxt, c.x + c.w - 12, yy); const w2 = ctx.measureText(wTxt).width;
        ctx.fillStyle = '#8ea1c2'; ctx.fillText(tail, c.x + c.w - 12 - w2, yy); ctx.fillStyle = '#7fe0b4'; ctx.fillText(nIn, c.x + c.w - 12 - w2 - wT, yy);
      });
      const rl = L.regList, rs = dm.regions; let mx = 1; rs.forEach((r, i) => { mx = Math.max(mx, stats.regWait[i].length); });
      ctx.font = fz(9.5) + 'px ' + FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#7f93b4'; ctx.fillText('Waiting now, by region of residence', rl.x, rl.y - 8);
      rs.forEach((r, i) => {
        const y = rl.y + i * rl.rowH, n = stats.regWait[i].length;
        ctx.fillStyle = '#c6d4ec'; ctx.font = fz(10) + 'px ' + FONT; ctx.textAlign = 'left'; ctx.fillText(r.name, rl.x, y + 11);
        const lw = Math.max(L.portrait ? 92 : 84, rs.reduce((m, q) => Math.max(m, ctx.measureText(q.name).width), 0) + 10); const bx = rl.x + lw, bw = rl.w - lw - 36;
        rrect(ctx, bx, y + 3, bw, 8, 4); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
        rrect(ctx, bx, y + 3, Math.max(3, bw * n / mx), 8, 4); ctx.fillStyle = Scene.hspCol[r.hsp]; ctx.fill();
        ctx.fillStyle = '#e3ecfb'; ctx.textAlign = 'right'; ctx.fillText(fmtN(n), rl.x + rl.w, y + 11);
      });
      drawSpotlight();
    }
    const arr = list.slice().sort((p, q) => p.y - q.y);
    for (let n = 0; n < arr.length; n++) {
      const a = arr[n]; if (!a.vis || a.dead && a.alpha <= 0) continue;
      const s = spriteFor(a); const bob = a.moving ? Math.abs(Math.sin(a.ph)) * 2.6 * K : 0;
      const sx = 1, hop = a.pop > 1 ? (a.pop - 1) * 16 * K : 0;
      ctx.globalAlpha = clamp(a.alpha, 0, 1) * 0.35; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(a.x, a.y, s.bw * 0.5 * K, 2.4 * K, 0, 0, 7); ctx.fill();
      if (a.state === 1 && a.u > 1 && !a.moving) { ctx.globalAlpha = 0.5 * a.alpha; ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(a.x, a.y, s.bw * 0.5 * K + 2, 3.8 * K, 0, 0, 7); ctx.stroke(); }
      ctx.globalAlpha = clamp(a.alpha, 0, 1);
      ctx.save(); ctx.translate(a.x, a.y - bob - hop); ctx.scale(sx, sx);
      ctx.drawImage(s.cv, -s.cx * K, -s.ground * K, s.w * K, s.h * K);
      ctx.restore();
      if (a.i === selected) { ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6 / sc * 0.8 + 0.6; ctx.beginPath(); ctx.ellipse(a.x, a.y - (s.bh * K) / 2 - 3, s.bw * K * 0.5 + 7, s.bh * K * 0.5 + 7, 0, 0, 7); ctx.stroke(); }
      else if (a.i === hover) { ctx.globalAlpha = 0.8; ctx.strokeStyle = '#9cc4ff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(a.x, a.y - (s.bh * K) / 2 - 3, s.bw * K * 0.5 + 5, s.bh * K * 0.5 + 5, 0, 0, 7); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    effects.forEach((e) => {
      if (e.type === 'beam') {
        const f = 1 - e.age / e.life; const ax = e.a.x, ay = e.a.y - 22 * K;
        ctx.save(); ctx.globalAlpha = Math.min(1, f * 1.6); ctx.strokeStyle = e.video ? '#b79cff' : '#7aa7ff'; ctx.lineWidth = 2; ctx.setLineDash([2, 7]); ctx.lineDashOffset = -e.age * 60;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + e.d.x) / 2, Math.min(ay, e.d.y) - 30, e.d.x, e.d.y - e.d.h / 2); ctx.stroke(); ctx.restore();
      }
    });
    ctx.textAlign = 'center'; ctx.font = '700 ' + fz(11) + 'px ' + FONT;
    popups.forEach((p) => { const f = 1 - p.age / p.life; const tw = ctx.measureText(p.text).width; p.x = clamp(p.x, tw / 2 + 4, L.W - tw / 2 - 4); ctx.globalAlpha = clamp(f * 1.8, 0, 1); ctx.lineWidth = 1.4; ctx.fillStyle = p.color; ctx.strokeStyle = 'rgba(8,14,26,.7)'; ctx.beginPath(); ctx.roundRect(p.x - tw / 2 - 8, p.y - 14, tw + 16, 18, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#07131f'; ctx.fillText(p.text, p.x, p.y + 3); });
    ctx.globalAlpha = 1;
  };

  function drawSpotlight() {
    const c = L.spot; const dm = D.dims; const pad = 12; let y = c.y + (L.portrait ? 18 : 22);
    ctx.textAlign = 'left'; ctx.fillStyle = '#e8f0ff'; ctx.font = '700 ' + fz(12) + 'px ' + FONT; ctx.fillText('Establishment spotlight', c.x + pad, y);
    const si = hoverSite >= 0 ? hoverSite : D.filter.site;
    y += L.portrait ? 16 : 20;
    if (si >= 0) {
      const inf = Scene.siteInfo(si), e = inf.e; const col = hcol(e.hsp);
      ctx.fillStyle = col; ctx.font = '700 ' + fz(11.5) + 'px ' + FONT; ctx.fillText(short(e.name, L.portrait ? 30 : 44), c.x + pad, y); y += L.portrait ? 14 : 16;
      ctx.fillStyle = '#9db0cf'; ctx.font = fz(9.5) + 'px ' + FONT;
      ctx.fillText('Code ' + e.code + ' · ' + dm.hsps[e.hsp].code + ' · ' + (e.type ? e.type + ' ' + e.typeLabel : 'type not in List'), c.x + pad, y); y += L.portrait ? 13 : 14;
      ctx.fillText(dm.regions[e.region].name + ' region · ' + e.district + ' district' + (e.beds ? ' · ' + e.beds + ' beds' : ''), c.x + pad, y); y += L.portrait ? 15 : 17;
      ctx.font = '600 ' + fz(10) + 'px ' + FONT; ctx.fillStyle = '#e3ecfb'; ctx.fillText(fmtN(inf.waiting) + ' waiting · ' + fmtN(inf.inCare) + ' in care · ' + fmtN(inf.att90) + ' attended (90d)', c.x + pad, y);
    } else {
      ctx.fillStyle = '#7f93b4'; ctx.font = fz(9.5) + 'px ' + FONT; ctx.fillText(L.portrait ? 'Tap a dot on the map or a name below.' : 'Hover or click a dot on the map to see an establishment.', c.x + pad, y);
    }
    ctx.fillStyle = '#9db0cf'; ctx.font = '700 ' + fz(10) + 'px ' + FONT; ctx.fillText(L.portrait ? 'Most attended, last 90 days' : 'Most attended appointments, last 90 days', c.x + pad, y + (L.portrait ? 22 : 24));
    y += L.portrait ? 30 : 32;
    const idx = stats.site90.map((v, i) => i).sort((a, b) => stats.site90[b] - stats.site90[a]);
    const rows = Math.max(5, Math.floor((c.y + c.h - 8 - y) / (L.portrait ? 16 : 17))); const rh = (c.y + c.h - 8 - y) / rows; const mx = Math.max(1, stats.site90[idx[0]]);
    L.rankHits = [];
    const lw = L.portrait ? 96 : 130;
    for (let r = 0; r < rows; r++) {
      const i = idx[r]; const v = stats.site90[i]; const yy = y + r * rh; const e = dm.establishments[i];
      if (!v) break;
      const act = D.filter.site === i;
      ctx.fillStyle = act ? '#fff' : '#c6d4ec'; ctx.font = fz(9.5) + 'px ' + FONT; ctx.textAlign = 'left'; ctx.fillText(short(e.short, 18), c.x + pad, yy + rh * 0.72);
      const bw = (c.w - 2 * pad - lw - 34) * v / mx; ctx.fillStyle = hcol(e.hsp); rrect(ctx, c.x + pad + lw, yy + rh * 0.18, Math.max(2, bw), rh * 0.56, 3); ctx.fill();
      ctx.fillStyle = '#e3ecfb'; ctx.fillText(fmtN(v), c.x + pad + lw + Math.max(2, bw) + 5, yy + rh * 0.72);
      L.rankHits.push({ x: c.x, y: yy, w: c.w, h: rh, i });
    }
  }

  /* ---------- sizing & interaction ---------- */
  Scene.resize = function () {
    const w = Math.max(300, wrap.clientWidth);
    cssW = w; dpr = Math.min(2, window.devicePixelRatio || 1);
    const Lo = computeLayout(); const h = Math.round(w * Lo.H / Lo.W); sc = w / Lo.W; cssH = h;
    cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    L = Lo; bg = null;
    if (ev) Scene.seek(Math.floor(Scene.t));
    Scene.portrait = L.portrait;
  };
  Scene.init = function (canvas, wrapEl) {
    cv = canvas; ctx = cv.getContext('2d'); wrap = wrapEl;
    const toLogical = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / sc, (e.clientY - r.top) / sc]; };
    const nearest = (x, y, rad) => { let best = -1, bd = rad * rad; for (const a of list) { if (!a.vis) continue; const hgt = 20 * K; const d = (a.x - x) ** 2 + (a.y - hgt - y) ** 2; if (d < bd) { best = a.i; bd = d; } } return best; };
    const nearSite = (x, y) => { let best = -1, bd = 1e9; ests.forEach((p) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; const rad = Math.max(p.r + 4, L.portrait ? 11 : 7); if (d < rad * rad && d < bd) { bd = d; best = p.i; } }); return best; };
    const rankAt = (x, y) => { if (!L.rankHits) return -1; const h = L.rankHits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y < r.y + r.h); return h ? h.i : -1; };
    const tip = document.getElementById('tip');
    const place = (e) => { const wr = wrap.getBoundingClientRect(); tip.hidden = false; tip.style.left = Math.min(e.clientX - wr.left + 14, wr.width - 230) + 'px'; tip.style.top = (e.clientY - wr.top + 18) + 'px'; };
    cv.addEventListener('mousemove', (e) => {
      const [x, y] = toLogical(e); const h = nearest(x, y, 22 * K); hover = h; hoverSite = -1; let cur = 'default';
      if (h >= 0) { cur = 'pointer'; const r = D.record(h, Scene.t); place(e); tip.innerHTML = '<b>' + r.spec.name + '</b> · ' + r.prio.label + '<br>' + r.site.short + ' · ' + (r.st.att + r.pri[...]
      } else {
        const s = nearSite(x, y); const rs = s < 0 ? rankAt(x, y) : -1;
        if (s >= 0) { hoverSite = s; cur = 'pointer'; const inf = Scene.siteInfo(s), q = inf.e; place(e); tip.innerHTML = '<b>' + q.name + '</b><br>Code ' + q.code + ' · ' + D.dims.hsps[q.hsp].code + '<br>' + inf.waiting + ' waiting · ' + inf.inCare + ' in care'; }
        else { tip.hidden = true; if (rs >= 0) { cur = 'pointer'; hoverSite = rs; } }
      }
      cv.style.cursor = cur;
    });
    cv.addEventListener('mouseleave', () => { hover = -1; hoverSite = -1; tip.hidden = true; });
    cv.addEventListener('click', (e) => {
      const [x, y] = toLogical(e); const h = nearest(x, y, 26 * K);
      if (h >= 0) { selected = h; if (Scene.onPick) Scene.onPick(h); return; }
      const s = nearSite(x, y); const r = s < 0 ? rankAt(x, y) : -1; const pick = s >= 0 ? s : r;
      if (pick >= 0) { if (Scene.onSite) Scene.onSite(pick); return; }
      selected = -1; if (Scene.onPick) Scene.onPick(-1);
    });
  };
  Scene.select = (i) => { selected = i; };
  Scene.setStats = (s) => { stats = s; };
  Scene.agentCount = () => list.length;
  Scene.invalidate = () => { bg = null; };
})(window);
