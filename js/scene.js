/* OutpatientFlow WA — the animated scene.
   Regions of WA -> waiting yard (3 urgency lanes) -> hospital buildings with one door per clinic.
   Time model: simulation clock `t` is float days since dims.start. Events (spawn / appointment / end) are
   pre-sorted; seeking rebuilds all characters instantly at their correct place. */
(function (g) {
  'use strict';
  const OF = (g.OF = g.OF || {});
  const D = OF.Data, SP = OF.Sprites;
  const Scene = {}; OF.Scene = Scene;

  const WA = [[113.9,-21.8],[114.6,-21.9],[116.7,-20.7],[118.6,-20.3],[121.0,-19.6],[122.2,-18.0],[122.9,-16.4],[123.8,-16.1],[124.4,-15.2],[125.2,-14.5],[126.0,-14.0],[127.0,-13.8],[128.0,-14.9],[129.0,-14.9],[129.0,-31.7],[126.0,-32.2],[123.6,-33.9],[121.9,-33.9],[119.5,-34.1],[117.9,-35.1],[116.0,-34.9],[115.1,-34.3],[115.6,-33.3],[115.7,-32.0],[114.9,-29.5],[114.1,-27.0],[113.5,-25.5],[113.7,-24.0],[114.1,-22.5]];

  let cv, ctx, wrap, dpr = 1, cssW = 800, cssH = 400, sc = 1, L = null, bg = null, K = 1;
  let agents = new Map(), list = [], effects = [], popups = [];
  let ev = null, ptr = 0;
  let stats = null, selected = -1, hover = -1;
  Scene.t = 0; Scene.colorBy = 'prio'; Scene.density = 4; Scene.animF = 1; Scene.onPick = null;
  const PRIO_COL = ['#ff6b6b', '#f7b94a', '#4fd1c5'];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hueCss(h, s, l, a) { return 'hsla(' + h + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')'; }

  /* ---------- layout ---------- */
  function computeLayout() {
    const dm = D.dims, portrait = cssW < 760;
    const W = portrait ? 640 : 1600, H = portrait ? 1466 : 860;
    const nS = dm.sites.length; const Lo = { portrait, W, H };
    K = portrait ? 1.3 : 1;
    if (!portrait) {
      Lo.map = { x: 16, y: 54, w: 330, h: H - 70 };
      Lo.yard = { x: 362, y: 54, w: 380, h: H - 70 };
      const hx = 758, hw = W - 16 - hx, cw = (hw - 14) / 2, ch = (H - 70 - 28) / 3;
      Lo.cells = dm.sites.map((s, i) => ({ site: i, x: hx + (i % 2) * (cw + 14), y: 54 + Math.floor(i / 2) * (ch + 14), w: cw, h: ch }));
      Lo.titleY = 34;
    } else {
      Lo.map = { x: 10, y: 38, w: 620, h: 330 };
      Lo.yard = { x: 10, y: 382, w: 620, h: 360 };
      const hy = 778, cw = (W - 20 - 10) / 2, ch = (H - hy - 10 - 20) / 3;
      Lo.cells = dm.sites.map((s, i) => ({ site: i, x: 10 + (i % 2) * (cw + 10), y: hy + Math.floor(i / 2) * (ch + 10), w: cw, h: ch }));
      Lo.titleY = 22; Lo.hospTitleY = hy - 10; Lo.hy = hy;
    }
    // map projection
    const cosφ = Math.cos(25 * Math.PI / 180), lonW = (129.3 - 112.9) * cosφ, latH = 35.4 - 13.5;
    const m = Lo.map; let s, ox, oy;
    if (!portrait) { s = Math.min((m.w - 30) / lonW, 430 / latH); ox = m.x + (m.w - lonW * s) / 2; oy = m.y + 34; }
    else { s = Math.min((m.h - 34) / latH, 290 / lonW); ox = m.x + 44; oy = m.y + 28; }
    Lo.proj = (lon, lat) => [ox + (lon - 112.9) * cosφ * s, oy + (-13.5 - lat) * s];
    Lo.mapPoly = WA.map((p) => Lo.proj(p[0], p[1]));
    Lo.nodes = dm.regions.map((r) => { const p = Lo.proj(r.lon, r.lat); return { x: p[0], y: p[1], r: r.code === 'PER' ? 9 : 7 }; });
    Lo.mapBottom = oy + latH * s;
    Lo.regList = portrait ? { x: ox + lonW * s + 30, y: m.y + 30, w: m.x + m.w - (ox + lonW * s + 30) - 8, rowH: 26 } : { x: m.x + 16, y: Lo.mapBottom + 26, w: m.w - 32, rowH: 27 };
    // lanes
    const y = Lo.yard, nP = dm.priorities.length, top = portrait ? 40 : 44, gap = 8;
    const lh = (y.h - top - 12 - gap * (nP - 1)) / nP;
    Lo.lanes = dm.priorities.map((p, i) => ({ prio: i, x: y.x + 12, y: y.y + top + i * (lh + gap), w: y.w - 24, h: lh }));
    Lo.laneX = (lane, u) => { const a = lane.x + 26, w = lane.w - 40; const uu = clamp(u, 0, 3); return a + w * (uu <= 1 ? uu * 0.62 : 0.62 + Math.min(1, (uu - 1) / 2) * 0.38); };
    // cells: building + courtyard + doors
    Lo.cells.forEach((c) => {
      const sd = dm.sites[c.site]; const bt = c.y + (portrait ? 22 : 30);
      c.bld = { x: c.x + 10, y: bt, w: c.w - 20, h: Math.max(60, c.h * (portrait ? 0.3 : 0.29)) };
      c.court = { x: c.x + 8, y: c.bld.y + c.bld.h + 10, w: c.w - 16, h: c.y + c.h - 8 - (c.bld.y + c.bld.h + 10) };
      const n = sd.specs.length, dw = Math.min(30, (c.bld.w - 16) / n - 6), step = (c.bld.w - 16) / n;
      c.doors = sd.specs.map((code, k) => { const si = dm.specialties.findIndex((q) => q.code === code); return { spec: si, code, w: dw, h: Math.min(24, c.bld.h * 0.42), x: c.bld.x + 8 + step * (k + 0.5), y: c.bld.y + c.bld.h, glow: 0, gc: '#5ad19a' }; });
      c.doorOf = {}; c.doors.forEach((d) => { c.doorOf[d.spec] = d; });
      c.exit = { x: c.court.x + c.court.w - 22, y: c.court.y + c.court.h - 4 };
    });
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
    zone(L.map, '1 · WHERE REFERRALS COME FROM');
    zone(L.yard, '2 · WAITING IN THE QUEUE');
    // hospital zone heading
    c.fillStyle = '#9db0cf'; c.font = '700 ' + fz(11) + 'px ' + FONT; c.textAlign = 'left';
    c.fillText('3 · INSIDE THE NETWORK  (six invented sites)', L.portrait ? 14 : L.cells[0].x + 4, L.portrait ? L.hospTitleY : 42);
    // WA outline
    c.beginPath(); L.mapPoly.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
    const mg = c.createLinearGradient(L.map.x, L.map.y, L.map.x, L.map.y + L.map.h); mg.addColorStop(0, '#1a2d4d'); mg.addColorStop(1, '#14233c');
    c.fillStyle = mg; c.fill(); c.strokeStyle = 'rgba(122,167,255,.4)'; c.lineWidth = 1.4; c.lineJoin = 'round'; c.stroke();
    c.fillStyle = 'rgba(150,175,215,.35)'; c.font = 'italic ' + fz(10) + 'px ' + FONT; c.textAlign = 'center';
    c.textAlign = 'left'; c.fillText('Western Australia (schematic)', L.map.x + 10, L.map.y + 16);
    // flow guide curves (map nodes -> yard)
    c.setLineDash([3, 6]); c.strokeStyle = 'rgba(122,167,255,.18)'; c.lineWidth = 1;
    L.nodes.forEach((n) => { const ex = L.yard.x + (L.portrait ? n.x * 0.6 + 100 : 4), ey = L.portrait ? L.yard.y : L.lanes[1].y + L.lanes[1].h / 2; c.beginPath(); c.moveTo(n.x, n.y); c.quadraticCurveTo((n.x + ex) / 2, L.portrait ? (n.y + ey) / 2 : n.y, ex, ey); c.stroke(); });
    c.setLineDash([]);
    L.nodes.forEach((n, i) => {
      c.fillStyle = 'rgba(79,209,197,.18)'; c.beginPath(); c.arc(n.x, n.y, n.r + 5, 0, 7); c.fill();
      c.fillStyle = '#4fd1c5'; c.beginPath(); c.arc(n.x, n.y, n.r * 0.55, 0, 7); c.fill();
      c.strokeStyle = 'rgba(79,209,197,.7)'; c.lineWidth = 1.3; c.beginPath(); c.arc(n.x, n.y, n.r, 0, 7); c.stroke();
    });
    // lanes
    L.lanes.forEach((ln) => {
      const p = dm.priorities[ln.prio]; const col = PRIO_COL[ln.prio % 3];
      rrect(c, ln.x, ln.y, ln.w, ln.h, 10); c.fillStyle = 'rgba(8,15,27,.7)'; c.fill();
      c.strokeStyle = 'rgba(140,170,220,.12)'; c.stroke();
      const bx = L.laneX(ln, 1);
      const rg = c.createLinearGradient(bx, 0, ln.x + ln.w, 0); rg.addColorStop(0, 'rgba(255,90,90,.05)'); rg.addColorStop(1, 'rgba(255,90,90,.22)');
      c.save(); rrect(c, ln.x, ln.y, ln.w, ln.h, 10); c.clip(); c.fillStyle = rg; c.fillRect(bx, ln.y, ln.x + ln.w - bx, ln.h);
      // floor tiles
      c.strokeStyle = 'rgba(140,170,220,.05)'; for (let u = 0.25; u < 1; u += 0.25) { const x = L.laneX(ln, u); c.beginPath(); c.moveTo(x, ln.y); c.lineTo(x, ln.y + ln.h); c.stroke(); }
      c.restore();
      c.setLineDash([5, 4]); c.strokeStyle = 'rgba(255,107,107,.75)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(bx, ln.y + 4); c.lineTo(bx, ln.y + ln.h - 4); c.stroke(); c.setLineDash([]);
      c.fillStyle = col; c.beginPath(); c.arc(ln.x + 12, ln.y + 13, 4, 0, 7); c.fill();
      c.fillStyle = '#d5e0f3'; c.font = '700 ' + fz(11) + 'px ' + FONT; c.textAlign = 'left'; c.fillText(p.label, ln.x + 22, ln.y + 17);
      c.fillStyle = 'rgba(255,140,140,.95)'; c.font = '600 ' + fz(9.5) + 'px ' + FONT; c.textAlign = 'right';
      c.fillText('target ' + p.targetDays + ' d', bx - 6, ln.y + ln.h - 7);
      c.fillStyle = 'rgba(255,150,150,.6)'; c.font = fz(9.5) + 'px ' + FONT; c.fillText('over target', ln.x + ln.w - 8, ln.y + ln.h - 7);
      c.fillStyle = 'rgba(150,175,215,.55)'; c.textAlign = 'left'; c.fillText('just referred', ln.x + 10, ln.y + ln.h - 7);
    });
    // hospitals
    L.cells.forEach((cell) => {
      const sd = dm.sites[cell.site];
      rrect(c, cell.x, cell.y, cell.w, cell.h, 14); c.fillStyle = 'rgba(18,31,54,.6)'; c.fill(); c.strokeStyle = 'rgba(140,170,220,.14)'; c.stroke();
      // courtyard
      const cy = cell.court; rrect(c, cy.x, cy.y, cy.w, cy.h, 10);
      const gg = c.createLinearGradient(0, cy.y, 0, cy.y + cy.h); gg.addColorStop(0, '#173a3a'); gg.addColorStop(1, '#122c33'); c.fillStyle = gg; c.fill();
      c.save(); rrect(c, cy.x, cy.y, cy.w, cy.h, 10); c.clip(); c.fillStyle = 'rgba(120,230,170,.07)';
      for (let k = 0; k < 90; k++) { const hx = D.hash(k, cell.site + 11) * cy.w, hy = D.hash(k, cell.site + 51) * cy.h; c.fillRect(cy.x + hx, cy.y + hy, 2, 2); }
      c.restore();
      // exit
      c.fillStyle = 'rgba(150,175,215,.55)'; c.font = fz(9) + 'px ' + FONT; c.textAlign = 'right'; c.fillText('discharged ▸', cell.exit.x + 18, cell.exit.y - 3);
      // building
      const b = cell.bld; rrect(c, b.x, b.y, b.w, b.h, 8);
      const bgd = c.createLinearGradient(0, b.y, 0, b.y + b.h); bgd.addColorStop(0, '#2a4068'); bgd.addColorStop(1, '#1a2b49'); c.fillStyle = bgd; c.fill();
      c.strokeStyle = 'rgba(160,190,235,.28)'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(b.x + 6, b.y + 5, b.w - 12, 6);
      c.fillStyle = 'rgba(190,215,255,.1)';
      for (let rx = 0; rx < Math.floor((b.w - 20) / 14); rx++) for (let ry = 0; ry < 2; ry++) c.fillRect(b.x + 10 + rx * 14, b.y + 16 + ry * 11, 8, 5);
      // title
      c.fillStyle = '#e8f0ff'; c.font = '700 ' + fz(12) + 'px ' + FONT; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText(sd.short || sd.name, cell.x + 12, cell.y + (L.portrait ? 16 : 21));
      // doors
      cell.doors.forEach((d) => {
        const sp = dm.specialties[d.spec];
        c.fillStyle = hueCss(sp.hue, 58, 48); c.beginPath(); c.moveTo(d.x - d.w / 2, d.y); c.lineTo(d.x - d.w / 2, d.y - d.h + d.w / 2); c.arc(d.x, d.y - d.h + d.w / 2, d.w / 2, Math.PI, 0); c.lineTo(d.x + d.w / 2, d.y); c.closePath(); c.fill();
        c.fillStyle = 'rgba(5,12,24,.55)'; c.beginPath(); c.moveTo(d.x - d.w / 2 + 3, d.y); c.lineTo(d.x - d.w / 2 + 3, d.y - d.h + d.w / 2); c.arc(d.x, d.y - d.h + d.w / 2, d.w / 2 - 3, Math.PI, 0); c.lineTo(d.x + d.w / 2 - 3, d.y); c.closePath(); c.fill();
        if ((cell.bld.w - 16) / cell.doors.length * sc >= 17 || cell.doors.indexOf(d) % 2 === 0) { c.fillStyle = '#dce8ff'; c.font = '700 ' + Math.max(7 / sc, d.w * 0.3) + 'px ' + FONT; c.textAlign = 'center'; c.fillText(sp.code, d.x, d.y - d.h - 3); }
      });
    });
  }

  /* ---------- agents ---------- */
  function colorOf(i, tot) {
    switch (Scene.colorBy) {
      case 'stage': return SP.palette.stage[tot <= 0 ? 0 : tot <= 2 ? 1 : tot <= 5 ? 2 : 3];
      case 'spec': return SP.specColor(D.dims.specialties[D.spec[i]].hue);
      case 'region': return SP.regionColor(D.region[i]);
      default: return SP.palette.prio[D.prio[i] % 3];
    }
  }
  Scene.colorLegend = function () {
    const dm = D.dims;
    switch (Scene.colorBy) {
      case 'stage': return [['Waiting, no care yet', SP.palette.stage[0]], ['1–2 events', SP.palette.stage[1]], ['3–5 events', SP.palette.stage[2]], ['6+ events', SP.palette.stage[3]]];
      case 'spec': return dm.specialties.map((s) => [s.name, SP.specColor(s.hue)]);
      case 'region': return dm.regions.map((r, i) => [r.name, SP.regionColor(i)]);
      default: return dm.priorities.map((p, i) => [p.label + ' (' + p.targetDays + ' d target)', SP.palette.prio[i % 3]]);
    }
  };

  function gTop() { return L.portrait ? 48 : 64; }
  function laneOf(a) { return L.lanes[D.prio[a.i] % L.lanes.length]; }
  function waitTarget(a, t) {
    const ln = laneOf(a); const u = (t - D.ref[a.i]) / D.target[D.prio[a.i]]; a.u = u;
    const yr = ln.h - 44 - (L.portrait ? 0 : 0);
    return [L.laneX(ln, u) + (a.jx - 0.5) * 16, ln.y + gTop() + a.jy * Math.max(6, ln.h - gTop() - 6)];
  }
  function careBase(a) { const c = L.cells[D.site[a.i]].court; return [c.x + 14 + a.jx * (c.w - 28), c.y + 18 + a.jy * Math.max(6, c.h - 26)]; }

  function makeAgent(i, st, t, fresh) {
    const a = { i, x: 0, y: 0, tx: 0, ty: 0, state: st.state === 2 ? 2 : 1, att: st.att, tot: D.prior[i] + st.att, jx: D.hash(i, 5), jy: D.hash(i, 6), ph: D.hash(i, 9) * 9, alpha: 1, pop: 1, vis: 1, script: [], si: 0, mood: -1, mt: 0, moving: false, wt: D.hash(i, 3) * 3, dead: false, u: 0, cell: D.site[i], door: null };
    a.gd = D.growth(a.tot);
    const cell = L.cells[a.cell]; a.door = cell.doorOf[D.spec[i]] || cell.doors[0];
    if (a.state === 1) { const p = waitTarget(a, t); a.tx = p[0]; a.ty = p[1]; } else { const p = careBase(a); a.tx = p[0]; a.ty = p[1]; }
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
  function pop(x, y, text, color) { if (popups.length < 260) popups.push({ x, y, text, color, life: 1.4, age: 0 }); }

  function grow(a) { a.att++; a.tot++; a.pop = 1.45; }

  function approach(a) { // waypoints from current place to the door
    const cell = L.cells[a.cell], d = a.door, steps = [];
    if (a.state === 1) {
      if (L.portrait) { steps.push(walk(d.x, L.yard.y + L.yard.h + 6)); }
      else { const ln = laneOf(a); steps.push(walk(L.yard.x + L.yard.w + 6, a.y)); steps.push(walk(cell.x + 6, cell.court.y + 6)); }
    }
    steps.push(walk(d.x, d.y + 10 + (a.jy * 4)));
    return steps;
  }

  function onAttend(i, k) {
    const a = agents.get(i); if (!a) return;
    const mode = D.evs[i][k + 2], tele = D.remote[mode]; const d = a.door;
    const wasWaiting = a.state === 1;
    if (!tele) {
      const steps = approach(a);
      steps.push(call((q) => { q.vis = 0; d.glow = 1; d.gc = '#5ad19a'; pop(d.x, d.y - d.h - 8, '+1', '#7ff0b0'); }), hold(0.45),
        call((q) => { grow(q); q.vis = 1; q.state = 2; q.mt = 1.6; q.mo = 1; }),
        walk(...careBase(a)));
      run(a, steps);
    } else {
      const steps = [];
      if (wasWaiting) {
        // stays put while connecting, then joins the network courtyard
      }
      steps.push(call((q) => { effects.push({ type: 'beam', a: q, d, life: 1.5, age: 0, video: D.dims.modes[mode].code === 'VID' }); d.glow = 1; d.gc = '#7aa7ff'; q.mt = 1.5; q.mo = 1; }), hold(1.0),
        call((q) => { grow(q); pop(q.x, q.y - 40 * K, '+1 ' + (D.dims.modes[mode].code === 'VID' ? 'video' : 'call'), '#9cc4ff'); }), hold(0.4));
      if (wasWaiting) steps.push(call((q) => { q.state = 2; }), walk(...careBase(a), 90));
      run(a, steps);
    }
  }
  function onMiss(i, k) {
    const a = agents.get(i); if (!a) return;
    const code = D.dims.attendance[D.evs[i][k + 1]].code; const d = a.door; const ox = a.x, oy = a.y;
    const steps = approach(a); steps.pop();
    steps.push(walk(d.x, d.y + 26, 120), call((q) => { q.mt = 1.6; q.mo = 3; d.glow = 1; d.gc = code === 'DNA' ? '#f5b94a' : '#9aa7bd'; pop(d.x, d.y - d.h - 8, code, code === 'DNA' ? '#f5b94a' : '#b6c1d6'); }), hold(0.7));
    steps.push(walk(...(a.state === 1 ? waitTarget(a, Scene.t) : careBase(a)), 120));
    run(a, steps);
  }
  function onEnd(i) {
    const a = agents.get(i); if (!a) return;
    const reason = D.closeIdx[i] >= 0 ? D.dims.closeReasons[D.closeIdx[i]].code : 'SEEN';
    const cell = L.cells[a.cell];
    if (a.state === 2 && reason === 'SEEN') run(a, [walk(cell.exit.x, cell.exit.y - 14, 70), call((q) => { q.mt = 1; q.mo = 1; pop(q.x, q.y - 40 * K, '♥ discharged', '#ff9ec2'); }), { t: 'fade', rate: 1.2 }]);
    else run(a, [call((q) => { q.mt = 2; q.mo = 2; pop(q.x, q.y - 40 * K, a.state === 1 ? 'left the list' : 'closed', '#a7b3c8'); }), { t: 'fade', rate: 0.9 }]);
  }

  function updateAgent(a, dt) {
    a.ph += dt * 9; a.moving = false;
    if (a.pop > 1) a.pop = Math.max(1, a.pop - dt * 1.4);
    if (a.mt > 0) { a.mt -= dt; if (a.mt <= 0) a.mo = -1; }
    const gt = D.growth(a.tot); a.gd += (gt - a.gd) * (1 - Math.exp(-dt * 2.5));
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
      if (dist > 0.5) { const k = Math.min(1, dt * Scene.animF * (dist > 60 ? 3.2 : 4)); const stp = Math.min(dist, Math.max(dist * k, Math.min(dist, 40 * dt))); a.x += dx / dist * stp; a.y += dy / dist * stp; a.moving = dist > 3 && stp / dt > 18; }
    } else {
      a.wt -= dt;
      if (a.wt <= 0) { const p = careBase({ i: a.i, jx: Math.random(), jy: Math.random() }); a.tx = p[0]; a.ty = p[1]; a.wt = 2 + Math.random() * 4; }
      const dx = a.tx - a.x, dy = a.ty - a.y, dist = Math.hypot(dx, dy);
      if (dist > 1) { const stp = Math.min(dist, 24 * dt * Scene.animF); a.x += dx / dist * stp; a.y += dy / dist * stp; a.moving = true; }
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
    L.cells.forEach((c) => c.doors.forEach((d) => { d.glow = 0; }));
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
          if (!agents.has(i)) { const st = D.status(i, Scene.t, {}); const a = makeAgent(i, { state: D.internal[i] ? 2 : 1, att: 0 }, Scene.t, true); if (D.internal[i]) { a.pop = 1.4; const c = L.cells[a.cell].court; a.y -= 0; } else { const n = L.nodes[D.region[i]]; a.x = n.x; a.y = n.y; a.alpha = 0.2; a.spawn = 1; }
            agents.set(i, a); list.push(a); }
        } else if (ty === 1) { const k = ev.k[ptr]; if (D.evs[i][k + 1] === D.ATT) onAttend(i, k); else onMiss(i, k); }
        else onEnd(i);
        ptr++;
      }
    }
    // update agents
    let dead = false;
    for (let n = 0; n < list.length; n++) { const a = list[n]; updateAgent(a, dt); if (a.spawn) { a.alpha = Math.min(1, a.alpha + dt * 2); if (a.alpha >= 1) a.spawn = 0; } if (a.dead) dead = true; }
    if (dead) { list = list.filter((a) => !a.dead); agents.forEach((a, i) => { if (a.dead) agents.delete(i); }); }
    for (let n = effects.length - 1; n >= 0; n--) { effects[n].age += dt; if (effects[n].age > effects[n].life) effects.splice(n, 1); }
    for (let n = popups.length - 1; n >= 0; n--) { const p = popups[n]; p.age += dt; p.y -= dt * 14; if (p.age > p.life) popups.splice(n, 1); }
    L.cells.forEach((c) => c.doors.forEach((d) => { if (d.glow > 0) d.glow = Math.max(0, d.glow - dt * 1.3); }));
  };

  /* ---------- render ---------- */
  function spriteFor(a) {
    const mood = a.mo >= 0 && a.mt > 0 ? a.mo : (a.state === 1 ? (a.u > 1 ? 2 : 0) : (a.att > 0 ? 1 : 0));
    const rgb0 = colorOf(a.i, a.tot);
    let rgb = rgb0; if (a.state === 1 && a.u > 1.2 && Scene.colorBy !== 'stage') rgb = rgb0.map((v) => Math.round(v * 0.82 + 20));
    const b = clamp(Math.round(a.gd * (SP.NB - 1)), 0, SP.NB - 1);
    return SP.get(rgb, b, mood);
  }

  Scene.render = function (now) {
    if (!L) return;
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    if (!bg) { bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height; const b = bg.getContext('2d'); b.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0); drawBg(b); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg, 0, 0); ctx.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    // dynamic: animated flow on region curves
    // door glows
    L.cells.forEach((c) => c.doors.forEach((d) => { if (d.glow > 0) { const gr = ctx.createRadialGradient(d.x, d.y - d.h / 2, 2, d.x, d.y - d.h / 2, 26 * d.glow + 10); gr.addColorStop(0, d.gc + 'cc'); gr.addColorStop(1, d.gc + '00'); ctx.fillStyle = gr; ctx.fillRect(d.x - 50, d.y - 60, 100, 90); } }));
    // lane counts + region/ site counters
    ctx.textBaseline = 'alphabetic';
    if (stats) {
      L.lanes.forEach((ln) => {
        const arr = stats.waitByPrio[ln.prio]; let n = 0, over = 0; for (let q = 0; q < 8; q++) { n += arr[q]; if (q >= 4) over += arr[q]; }
        ctx.textAlign = 'right'; ctx.font = '700 ' + fz(11) + 'px ' + FONT; ctx.fillStyle = '#e3ecfb'; const t1 = n.toLocaleString('en-AU') + ' waiting'; ctx.fillText(t1, ln.x + ln.w - 8, ln.y + 17);
        if (over) { const w1 = ctx.measureText(t1).width; ctx.font = fz(10) + 'px ' + FONT; ctx.fillStyle = '#ff9a9a'; ctx.fillText(over.toLocaleString('en-AU') + ' over target · ', ln.x + ln.w - 8 - w1 - 2, ln.y + 17); }
      });
      L.cells.forEach((c) => {
        ctx.textAlign = 'right'; ctx.font = '600 ' + fz(10) + 'px ' + FONT; const nIn = stats.siteIn[c.site].toLocaleString('en-AU'); const tail = ' in care'; const wT = ctx.measureText(tail).width;
        const yy = c.y + (L.portrait ? 16 : 21); const showType = !L.portrait; ctx.fillStyle = '#8ea1c2'; ctx.fillText(tail, c.x + c.w - 12, yy); ctx.fillStyle = '#7fe0b4'; ctx.fillText(nIn, c.x + c.w - 12 - wT, yy);
        if (showType) { const wN = ctx.measureText(nIn).width; ctx.fillStyle = '#6f819e'; ctx.font = fz(9.5) + 'px ' + FONT; ctx.fillText(D.dims.sites[c.site].type + ' · ', c.x + c.w - 12 - wT - wN, yy); }
      });
      // region list
      const rl = L.regList, rs = D.dims.regions; let mx = 1; rs.forEach((r, i) => { mx = Math.max(mx, stats.regWait[i].length); });
      ctx.font = fz(10) + 'px ' + FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#7f93b4'; ctx.fillText('Waiting now, by region of residence', rl.x, rl.y - 8);
      rs.forEach((r, i) => {
        const y = rl.y + i * rl.rowH, n = stats.regWait[i].length;
        ctx.fillStyle = '#c6d4ec'; ctx.font = fz(10.5) + 'px ' + FONT; ctx.textAlign = 'left'; ctx.fillText(r.name, rl.x, y + 11);
        const bx = rl.x + (L.portrait ? 135 : 118), bw = rl.w - (L.portrait ? 135 : 118) - 38;
        rrect(ctx, bx, y + 3, bw, 8, 4); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
        rrect(ctx, bx, y + 3, Math.max(3, bw * n / mx), 8, 4); ctx.fillStyle = '#4fd1c5'; ctx.fill();
        ctx.fillStyle = '#e3ecfb'; ctx.textAlign = 'right'; ctx.fillText(n.toLocaleString('en-AU'), rl.x + rl.w, y + 11);
      });
    }
    // region node labels
    ctx.font = '700 ' + fz(9) + 'px ' + FONT; ctx.fillStyle = '#a8f0e8';
    const side = { PER: -1, SWE: -1, GSO: 1, WHE: 1, GEF: 1, MID: -1, PIL: -1, KIM: -1 };
    L.nodes.forEach((n, i) => { const code = D.dims.regions[i].code; if (L.portrait) { const sd = side[code] || 1; ctx.textAlign = sd < 0 ? 'right' : 'left'; ctx.fillText(code, n.x + sd * (n.r + 7), n.y + 3); } else { ctx.textAlign = 'center'; ctx.fillText(code, n.x, n.y + n.r + 12 / sc * 0.85); } });

    // agents sorted by ground y
    const arr = list.slice().sort((p, q) => p.y - q.y);
    for (let n = 0; n < arr.length; n++) {
      const a = arr[n]; if (!a.vis || a.dead && a.alpha <= 0) continue;
      const s = spriteFor(a); const bob = a.moving ? Math.abs(Math.sin(a.ph)) * 2.6 * K : 0;
      const sx = (a.pop > 1 ? a.pop : 1);
      ctx.globalAlpha = clamp(a.alpha, 0, 1) * 0.35; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(a.x, a.y, s.bw * 0.5 * K, 2.4 * K, 0, 0, 7); ctx.fill();
      if (a.state === 1 && a.u > 1 && !a.moving) { ctx.globalAlpha = 0.5 * a.alpha; ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(a.x, a.y, s.bw * 0.5 * K + 2, 3.6 * K, 0, 0, 7); ctx.stroke(); }
      ctx.globalAlpha = clamp(a.alpha, 0, 1);
      ctx.save(); ctx.translate(a.x, a.y - bob); ctx.scale(sx, sx);
      ctx.drawImage(s.cv, -s.cx * K, -s.ground * K, s.w * K, s.h * K);
      ctx.restore();
      if (a.i === selected) { ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6 / sc * 0.8 + 0.6; ctx.beginPath(); ctx.ellipse(a.x, a.y - (s.bh * K) / 2 - 3, s.bw * K * 0.5 + 7, s.bh * K * 0.5 + 12, 0, 0, 7); ctx.stroke(); }
      else if (a.i === hover) { ctx.globalAlpha = 0.8; ctx.strokeStyle = '#9cc4ff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(a.x, a.y - (s.bh * K) / 2 - 3, s.bw * K * 0.5 + 5, s.bh * K * 0.5 + 9, 0, 0, 7); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    // effects
    effects.forEach((e) => {
      if (e.type === 'beam') {
        const f = 1 - e.age / e.life; const ax = e.a.x, ay = e.a.y - 22 * K;
        ctx.save(); ctx.globalAlpha = Math.min(1, f * 1.6); ctx.strokeStyle = e.video ? '#b79cff' : '#7aa7ff'; ctx.lineWidth = 2; ctx.setLineDash([2, 7]); ctx.lineDashOffset = -e.age * 60;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + e.d.x) / 2, Math.min(ay, e.d.y) - 30, e.d.x, e.d.y - e.d.h / 2); ctx.stroke(); ctx.restore();
      }
    });
    // popups
    ctx.textAlign = 'center'; ctx.font = '700 ' + fz(11) + 'px ' + FONT;
    popups.forEach((p) => { const f = 1 - p.age / p.life; ctx.globalAlpha = clamp(f * 1.8, 0, 1); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(5,10,20,.9)'; ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y); });
    ctx.globalAlpha = 1;
  };

  /* ---------- sizing & interaction ---------- */
  Scene.resize = function () {
    const w = Math.max(300, wrap.clientWidth); const was = L && L.portrait;
    cssW = w; dpr = Math.min(2, window.devicePixelRatio || 1);
    const Lo = computeLayout(); const h = Math.round(w * Lo.H / Lo.W); sc = w / Lo.W; cssH = h;
    cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    L = Lo; bg = null;
    if (ev) Scene.seek(Math.floor(Scene.t)); // positions depend on layout
    Scene.portrait = L.portrait;
  };
  Scene.init = function (canvas, wrapEl) {
    cv = canvas; ctx = cv.getContext('2d'); wrap = wrapEl;
    const toLogical = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / sc, (e.clientY - r.top) / sc]; };
    const nearest = (x, y, rad) => { let best = -1, bd = rad * rad; for (const a of list) { if (!a.vis) continue; const hgt = 20 * K; const d = (a.x - x) ** 2 + (a.y - hgt - y) ** 2; if (d < bd) { bd = d; best = a.i; } } return best; };
    const tip = document.getElementById('tip');
    cv.addEventListener('mousemove', (e) => {
      const [x, y] = toLogical(e); const h = nearest(x, y, 22 * K); hover = h; cv.style.cursor = h >= 0 ? 'pointer' : 'default';
      if (h >= 0) { const r = D.record(h, Scene.t); tip.hidden = false; const wr = wrap.getBoundingClientRect(); tip.style.left = Math.min(e.clientX - wr.left + 14, wr.width - 190) + 'px'; tip.style.top = (e.clientY - wr.top + 14) + 'px'; tip.innerHTML = '<b>' + r.spec.name + '</b> · ' + r.prio.label + '<br>' + (r.st.att + r.prior) + ' attended events · ' + (r.st.state === 1 ? 'waiting ' + Math.round(Scene.t - r.ref) + ' days' : 'in care'); }
      else tip.hidden = true;
    });
    cv.addEventListener('mouseleave', () => { hover = -1; tip.hidden = true; });
    cv.addEventListener('click', (e) => { const [x, y] = toLogical(e); const h = nearest(x, y, 26 * K); selected = h; if (Scene.onPick) Scene.onPick(h); });
  };
  Scene.select = (i) => { selected = i; };
  Scene.setStats = (s) => { stats = s; };
  Scene.agentCount = () => list.length;
  Scene.invalidate = () => { bg = null; };
})(window);
