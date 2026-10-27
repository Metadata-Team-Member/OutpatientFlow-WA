/* OutpatientFlow WA — wiring: filters, KPIs, controls, clock, narration, click card, dialogs. */
(function () {
  'use strict';
  const OF = window.OF, D = OF.Data, Scene = OF.Scene, Charts = OF.Charts, SP = OF.Sprites;
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const fmt = (n) => Math.round(n).toLocaleString('en-AU');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let playing = false, speed = 4, last = 0, statAcc = 99, S = null, selectedI = -1, simStart = 0, dirty = true;

  function fillSelect(el, items, allLabel) { el.innerHTML = '<option value="-1">' + allLabel + '</option>' + items.map((x, i) => '<option value="' + i + '">' + esc(x) + '</option>').join(''); }

  function buildFilters() {
    const dm = D.dims;
    fillSelect($('fHsp'), dm.hsps.map((h) => h.code + ' · ' + h.name), 'All Health Service Providers');
    let h = '<option value="-1">All establishments (' + dm.establishments.length + ')</option>';
    dm.hsps.forEach((hp, hi) => { h += '<optgroup label="' + esc(hp.code) + '">' + dm.establishments.map((e, i) => (e.hsp === hi ? '<option value="' + i + '">' + esc(e.short + ' — ' + e.name) + '</option>' : '')).join('') + '</optgroup>'; });
    $('fSite').innerHTML = h;
    fillSelect($('fSpec'), dm.specialties.map((s) => s.name + ' (' + s.code + ')'), 'All clinic categories');
    fillSelect($('fRegion'), dm.regions.map((s) => s.name), 'All regions');
    fillSelect($('fPrio'), dm.priorities.map((s) => s.label + ' · ' + s.targetDays + ' d'), 'All priorities');
    const onChange = () => {
      D.filter.hsp = +$('fHsp').value; D.filter.site = +$('fSite').value; D.filter.spec = +$('fSpec').value; D.filter.region = +$('fRegion').value; D.filter.prio = +$('fPrio').value; D.filter.mode = $('fMode').value;
      refilter();
    };
    UI.onChange = onChange;
    ['fHsp', 'fSite', 'fSpec', 'fRegion', 'fPrio', 'fMode'].forEach((id) => $(id).addEventListener('change', () => {
      if (id === 'fSite' && +$('fSite').value >= 0) $('fHsp').value = '-1'; // an establishment already implies its HSP
      onChange();
    }));
    $('fColor').addEventListener('change', () => { Scene.colorBy = $('fColor').value; buildLegend(); });
    $('fDensity').addEventListener('change', () => { Scene.density = +$('fDensity').value; Scene.setup(); });
    $('btnReset').addEventListener('click', () => { ['fHsp', 'fSite', 'fSpec', 'fRegion', 'fPrio'].forEach((id) => ($(id).value = '-1')); $('fMode').value = 'all'; onChange(); });
    $('btnFilters').addEventListener('click', () => { const g = $('filterGrid'); const o = g.classList.toggle('open'); $('btnFilters').setAttribute('aria-expanded', o); $('btnFilters').textContent = o ? 'Filters ▴' : 'Filters ▾'; });
    Charts.onSpec = (si) => { $('fSpec').value = D.filter.spec === si ? '-1' : String(si); onChange(); };
    Scene.onSite = (si) => { $('fSite').value = D.filter.site === si ? '-1' : String(si); $('fHsp').value = '-1'; onChange(); };
  }
  const UI = {};
  function refilter() { D.applyFilter(); Charts.refreshSeries(); Scene.setup(); closeCard(); statAcc = 99; dirty = true; }

  function buildKpis() {
    $('kpis').innerHTML = [
      ['k1', 'Referrals, last 12 months'], ['k2', 'Waiting, first appointment'], ['k3', 'Seen within target (12 mo)'],
      ['k4', 'Median wait, first appt'], ['k5', 'Did-not-attend rate'], ['k6', 'Attended events per patient'],
    ].map(([id, lab]) => '<div class="kpi" id="' + id + '"><div class="lab">' + lab + '</div><div class="val">–</div><div class="note"></div></div>').join('');
  }
  function setK(id, val, note, cls) { const el = $(id); el.querySelector('.val').textContent = val; el.querySelector('.note').textContent = note || ''; el.className = 'kpi' + (cls ? ' ' + cls : '') + (el.dataset.hl ? ' tour-hl' : ''); }
  function updateKpis() {
    const s = S; const d = s.refsPrev12 ? (s.refs12 - s.refsPrev12) / s.refsPrev12 : 0; const dm = D.dims;
    setK('k1', fmt(s.refs12), S.day >= 730 ? (d >= 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(d * 100)) + '% on the 12 months before' : (S.day < 365 ? 'part year: data starts ' + D.fmtDate(0).replace(/^\d+ /, '') : 'no full prior year to compare'));
    const pOver = s.waiting ? s.over / s.waiting : 0;
    setK('k2', fmt(s.waiting), fmt(s.over) + ' past target (' + Math.round(pOver * 100) + '%)', pOver > 0.35 ? 'bad' : pOver > 0.2 ? 'warn' : '');
    const pw = s.seenAll12 ? s.withinAll12 / s.seenAll12 : null;
    const split = dm.priorities.map((p, i) => p.code + ' ' + (s.seen12[i] ? Math.round(s.within12[i] / s.seen12[i] * 100) + '%' : '–')).join(' · ');
    setK('k3', pw == null ? '–' : Math.round(pw * 100) + '%', split, pw == null ? '' : pw < 0.7 ? 'bad' : pw < 0.85 ? 'warn' : 'good');
    setK('k4', s.nFirst ? Math.round(s.medFirst) + ' days' : '–', s.nFirst ? 'received → first attended, ' + fmt(s.nFirst) + ' people' : 'no first appointments yet', s.medFirst > 120 ? 'warn' : '');
    setK('k5', (s.dnaRate * 100).toFixed(1) + '%', fmt(s.att12) + ' attended · ' + fmt(s.dna12) + ' DNA · ' + fmt(s.can12) + ' cancelled', s.dnaRate > 0.12 ? 'warn' : '');
    const el = $('k6'); el.className = 'kpi cmpk';
    const mx = Math.max(1, s.avgIn, s.avgOut);
    el.querySelector('.val').innerHTML = '<div class="cmp"><div><b style="color:#4fd1c5">' + s.avgIn.toFixed(1) + '</b><small>inside network</small><div class="bar" style="background:#4fd1c5;width:' + Math.round(s.avgIn / mx * 100) + '%"></div></div><div><b style="color:#ff8b8b">' + s.avgOut.toFixed(1) + '</b><small>waiting outside</small><div class="bar" style="background:#ff6b6b;width:' + Math.round(s.avgOut / mx * 100) + '%"></div></div></div>';
    el.querySelector('.note').textContent = 'incl. attended events in the prior 24 months';
  }

  function filterText() {
    const f = D.filter, dm = D.dims; const p = [];
    if (f.hsp >= 0) p.push(dm.hsps[f.hsp].code); if (f.site >= 0) p.push(dm.establishments[f.site].short); if (f.region >= 0) p.push('residents of ' + dm.regions[f.region].name);
    if (f.spec >= 0) p.push(dm.specialties[f.spec].name); if (f.prio >= 0) p.push(dm.priorities[f.prio].label); if (f.mode !== 'all') p.push(f.mode === 'person' ? 'in-person' : 'telehealth/phone');
    return p.length ? 'Showing: ' + p.join(' · ') + '. ' : '';
  }
  function narrate(day) {
    const dm = D.dims, s = S;
    let top = ''; if (s.site90) { let bi = -1, bv = 0; s.site90.forEach((v, i) => { if (v > bv) { bv = v; bi = i; } }); if (bi >= 0) top = ' Busiest in the last 90 days: ' + dm.establishments[bi].short + ' (' + fmt(bv) + ' attended).'; }
    const pw = s.seenAll12 ? Math.round(s.withinAll12 / s.seenAll12 * 100) : null;
    const txt = '<b>' + D.fmtDate(day) + '</b> (synthetic). ' + filterText() + fmt(s.waiting) + ' people waiting for a first appointment, ' + (s.waiting ? Math.round(s.over / s.waiting * 100) : 0) + '% already past their priority target; ' + fmt(s.inside) + ' in care.' + (pw == null ? '' : ' Of first appointments in the last 12 months, ' + pw + '% were within target.') + ' ' + fmt(s.dna12) + ' did not attend and ' + fmt(s.can12) + ' were cancelled.' + top;
    $('narr').innerHTML = txt;
    $('scene').setAttribute('aria-label', 'Synthetic outpatient flow scene. ' + $('narr').textContent);
  }

  function buildLegend() {
    const lg = $('legend'); const items = Scene.colorLegend();
    let html = '<div class="grp"><b>Colour = ' + $('fColor').selectedOptions[0].textContent + '</b>' + items.map(([n, rgb]) => '<span class="sw"><i style="background:' + SP.rgbCss(rgb) + '"></i>' + esc(n) + '</span>').join('') + '</div>';
    html += '<div class="grp"><b>Size = attended events</b><div class="sizes" id="sizes"></div></div>';
    html += '<div class="grp"><b>Moments</b><span class="sw"><i style="background:#5ad19a"></i>door glows green: attended</span><span class="sw"><i style="background:#f5b94a"></i>amber: did not attend</span><span class="sw"><i style="background:#7aa7ff"></i>blue beam: telehealth / phone</span><span class="sw"><i style="background:#8fb4ff"></i>✕ cancelled by hospital</span><span class="sw"><i style="background:#ff6b6b"></i>red dashed line: target</span></div>';
    html += '<div class="grp"><b>Map dots</b><span class="sw">size = beds</span>' + D.dims.hsps.map((h, i) => '<span class="sw"><i style="background:' + Scene.hspCol[h.code] + '"></i>' + h.code + '</span>').join('') + '</div>';
    lg.innerHTML = html;
    const host = $('sizes');
    [[0, 'none'], [2, '2'], [5, '5'], [10, '10'], [20, '20+']].forEach(([n, lab]) => {
      const b = Math.round(D.growth(n) * (SP.NB - 1)); const s = SP.get([79, 209, 197], b, n === 0 ? 2 : 1);
      const fig = document.createElement('figure'); const cv = document.createElement('canvas'); cv.width = s.w * 2; cv.height = s.h * 2; cv.style.width = s.w * 1.1 + 'px'; cv.style.height = s.h * 1.1 + 'px';
      cv.getContext('2d').drawImage(s.cv, 0, 0, cv.width, cv.height); fig.appendChild(cv); const cap = document.createElement('figcaption'); cap.textContent = lab; fig.appendChild(cap); host.appendChild(fig);
    });
  }

  /* ---------- click card ---------- */
  function openCard(i) { selectedI = i; Scene.select(i); const el = $('card'); if (i < 0) { el.hidden = true; return; } el.hidden = false; renderCard(); }
  function closeCard() { selectedI = -1; Scene.select(-1); $('card').hidden = true; }
  function renderCard() {
    if (selectedI < 0) return; const r = D.record(selectedI, Math.floor(Scene.t)); const dm = D.dims;
    let status; if (r.st.state === 0) status = 'Not yet referred'; else if (r.st.state === 3) status = 'Episode closed' + (r.close ? ' · ' + r.close.label : ''); else if (r.st.state === 2) status = r.internal ? 'In care (technical transfer)' : 'In care'; else status = 'Waiting ' + Math.round(Scene.t - r.ref) + ' days (' + Math.round((Scene.t - r.ref) / r.target * 100) + '% of ' + r.target + '-day target)';
    const dots = r.events.map((e) => {
      let col, lab;
      if (e.kind === 0) { col = dm.modes[e.mode].remote ? '#7aa7ff' : '#5ad19a'; lab = 'Attended · ' + dm.modes[e.mode].label; }
      else if (e.kind === 1) { col = '#f5b94a'; lab = 'Did not attend / wait · ' + (dm.nonAttendance[e.code] ? dm.nonAttendance[e.code].label : ''); }
      else if (e.kind === 3) { col = '#c9d3e6'; lab = 'Non-client event (never stops the wait) · ' + (dm.nonClient[e.code] ? dm.nonClient[e.code].label : ''); }
      else { col = '#9aa7bd'; lab = 'Cancelled · ' + (dm.cancellation[e.code] ? dm.cancellation[e.code].label : ''); }
      return '<i title="' + esc(D.fmtDate(e.day) + ' · ' + lab) + '" style="background:' + col + '"></i>';
    }).join('');
    $('card').innerHTML = '<h4><span>Referral ' + esc(r.id) + '</span><button class="x" aria-label="Close" id="cardX">×</button></h4><div class="syn">SYNTHETIC RECORD · NOT A REAL PERSON</div><dl>' +
      '<dt>Status</dt><dd>' + esc(status) + '</dd><dt>Clinic category</dt><dd>' + esc(r.spec.name) + ' (' + r.spec.code + ')</dd><dt>Tier 1 · Tier 2</dt><dd>' + esc(r.spec.tier1 + ' · ' + r.spec.tier2) + ' <small style="color:#8799b5">(pairing assumed)</small></dd><dt>Establishment</dt><dd>' + esc(r.site.short) + ' · ' + r.hsp.code + '</dd><dt>Priority</dt><dd>' + esc(r.prio.label) + ' (' + r.prio.code + ')</dd>' +
      '<dt>Referral source</dt><dd>' + esc(r.src.label) + '</dd><dt>Referral reason</dt><dd>' + esc(r.reason.label) + '</dd><dt>Received</dt><dd>' + D.fmtDate(r.ref) + '</dd><dt>Lives in</dt><dd>' + esc(r.district.name) + ' · ' + esc(r.region.name) + '</dd><dt>Age group</dt><dd>' + r.ageGrp + '</dd>' +
      '<dt>Attended events</dt><dd>' + (r.st.att + r.prior) + ' <small style="color:#8799b5">(' + r.prior + ' prior)</small></dd><dt>DNA · cancelled · chart only/MCC</dt><dd>' + r.st.dna + ' · ' + r.st.can + ' · ' + (r.st.nce || 0) + '</dd></dl>' +
      '<div class="tl">' + dots + '</div><div class="cap">Dots: green attended · blue telehealth/phone · amber did not attend · grey cancelled · pale non-client event (chart only / MCC). Hover a dot for the reason.</div>';
    $('cardX').addEventListener('click', closeCard);
  }

  /* ---------- establishments dialog ---------- */
  function buildEstTable() {
    const dm = D.dims; const cnt = new Int32Array(dm.establishments.length); for (let i = 0; i < D.N; i++) cnt[D.site[i]]++;
    const E = dm.establishments, n = (f) => E.filter(f).length, byT = {}; E.forEach((e) => { const k = e.type || 'none'; byT[k] = (byT[k] || 0) + 1; });
    const nLoc = n((e) => ['not-found', 'nearest-town', 'osm-similar-name'].includes(e.locationStatus)), nInf = n((e) => e.nadcColumn === 'inferred');
    $('estNote').innerHTML = '<b>' + E.length + '</b> establishments, <b>exactly those with “Reports to NADC” = Y</b> in the WA Health Establishment List, May 2026 (v0.1). Codes, names and establishment types are from that List (' + n((e) => e.mps) + ' are Multi-Purpose Services, listed in its Appendix D). The List has <b>no</b> Health Service Provider, region or coordinates: the HSP grouping, region, beds and map position here come from the WA Government SLIP layers and OpenStreetMap, are this project\'s mapping, and are not official (' + n((e) => e.hspBasis !== 'slip') + ' HSP assignments are not from the SLIP layer (Central Referral Service list or assumed, marked *); ' + nLoc + ' positions are approximate and marked ⚑' + (nInf ? '; ' + nInf + ' Reports-to-NADC marks (‡) were inferred because the extracted text did not show their column' : '') + '). Activity is synthetic and scales with site size and the invented clinic scope, so small posts have few or no rows by design. ' + esc(dm.attribution || '');
    const rows = dm.establishments.map((e, i) => ({ i, e, n: cnt[i], t: (e.code + ' ' + e.short + ' ' + e.name + ' ' + dm.hsps[e.hsp].code + ' ' + dm.regions[e.region].name + ' ' + e.district + ' ' + (e.type || '') + ' ' + (e.typeLabel || '')).toLowerCase() }));
    const draw = (q) => {
      q = (q || '').toLowerCase().trim();
      $('estBody').innerHTML = rows.filter((r) => !q || r.t.includes(q)).map((r) => '<tr data-i="' + r.i + '" tabindex="0"><td>' + esc(r.e.code) + '</td><td>' + esc(r.e.name) + (r.e.contracted ? ' <small>(contracted)</small>' : '') + (['not-found', 'nearest-town', 'osm-similar-name'].includes(r.e.locationStatus) ? ' <small class="warnk" title="' + esc(r.e.locationNote || 'Map position approximate') + '">⚑ position approximate</small>' : '') + (r.e.nadcColumn === 'inferred' ? ' <small class="warnk" title="Reports to NADC = Y inferred from extracted text">‡</small>' : '') + '</td><td>' + dm.hsps[r.e.hsp].code + (r.e.hspBasis !== 'slip' ? '*' : '') + '</td><td>' + esc(dm.regions[r.e.region].name) + '</td><td>' + esc(r.e.type ? r.e.type + ' ' + r.e.typeLabel : '–') + (r.e.mps ? ' · MPS' : '') + '</td><td>' + (r.e.beds || '–') + '</td><td>' + (r.n ? fmt(r.n) : '<span class="dim">none</span>') + '</td></tr>').join('');
    };
    draw(''); $('estSearch').addEventListener('input', () => draw($('estSearch').value));
    const pick = (tr) => { if (!tr) return; const i = +tr.dataset.i; $('dlgEst').close(); Scene.onSite(i); };
    $('estBody').addEventListener('click', (e) => pick(e.target.closest('tr')));
    $('estBody').addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(e.target.closest('tr')); });
    $('estForm').addEventListener('submit', (e) => { if (document.activeElement === $('estSearch')) e.preventDefault(); });
  }

  /* ---------- clock / controls ---------- */
  function setPlaying(p) {
    playing = p; $('playIcon').textContent = p ? '❚❚' : '▶'; $('playText').textContent = p ? 'Pause' : (Scene.finished ? 'Replay' : 'Play');
    if (p) $('intro').classList.add('gone');
  }
  function seekTo(day) { Scene.finished = false; Scene.seek(day); statAcc = 99; dirty = true; if (!playing) $('playText').textContent = 'Play'; }
  function buildTicks() {
    const el = $('ticks'); const a = simStart, b = D.DAYS - 1; el.style.position = 'relative'; el.style.height = '14px'; el.innerHTML = '';
    const y0 = D.dayToDate(0).getUTCFullYear(), y1 = D.dayToDate(b).getUTCFullYear(), MN = ['Jan', 'Apr', 'Jul', 'Oct'], mm = (b - a) < 1000 ? [0, 6] : [6];
    for (let y = y0; y <= y1; y++) for (const m of mm) { const d = D.dateToDay(y + '-' + String(m + 1).padStart(2, '0') + '-01'); if (d < a || d > b) continue; const s = document.createElement('span'); s.style.cssText = 'position:absolute;transform:translateX(-50%);left:' + ((d - a) / (b - a) * 100) + '%'; s.textContent = (m === 0 ? 'Jan ' : 'Jul ') + y; if (d === a) s.style.transform = 'none'; el.appendChild(s); }
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    Scene.advance(dt, speed, playing);
    if (playing && Scene.finished) { playing = false; setPlaying(false); }
    statAcc += dt;
    if (statAcc > (playing ? 0.2 : 0.5) || dirty) { statAcc = 0; const day = Math.floor(Scene.t); S = D.stats(day, S); Scene.setStats(S); updateKpis(); Charts.draw(S, Scene.t); narrate(day); if (selectedI >= 0) renderCard(); dirty = false;
      $('dateLabel').textContent = D.fmtDate(day); $('fyLabel').textContent = D.fy(day); if (document.activeElement !== $('slider')) $('slider').value = day; }
    Scene.render(now);
    requestAnimationFrame(frame);
  }

  async function main() {
    try {
      const base = /^[\w.-]+\.json$/.test(qs.get('data') || '') ? qs.get('data') : 'synthetic.json';
      const [, g1, g2] = await Promise.all([D.load('data/' + base), fetch('data/reference/wa_regions.geojson').then((r) => r.json()), fetch('data/reference/perth_metro.geojson').then((r) => r.json())]);
      Scene.setGeo(g1.features, g2.features);
    } catch (e) { $('loading').textContent = 'Could not load data: ' + e.message; throw e; }
    simStart = D.dateToDay(D.meta.simStart);
    document.querySelectorAll('.badge-syn,.foot-badge,.intro-badge').forEach((b) => { if (!D.meta.synthetic) b.textContent = D.meta.banner; });
    buildFilters(); buildKpis(); Charts.init(); buildEstTable();
    const portrait = innerWidth < 760; Scene.density = +(qs.get('density') || (portrait ? 12 : 8)); { const o = [...$('fDensity').options].map((x) => +x.value); Scene.density = o.reduce((a, b) => Math.abs(b - Scene.density) < Math.abs(a - Scene.density) ? b : a); $('fDensity').value = String(Scene.density); }
    if (qs.get('color')) { Scene.colorBy = qs.get('color'); $('fColor').value = Scene.colorBy; }
    Scene.init($('scene'), $('sceneWrap'));
    Scene.t = qs.get('t') ? D.dateToDay(qs.get('t')) : simStart;
    Scene.resize(); Scene.setup(); buildLegend(); Charts.refreshSeries();
    const sl = $('slider'); sl.min = simStart; sl.max = D.DAYS - 1; sl.value = simStart; buildTicks();
    let pend = null; sl.addEventListener('input', () => { if (pend) return; pend = requestAnimationFrame(() => { pend = null; seekTo(+sl.value); }); });
    $('btnPlay').addEventListener('click', () => { if (Scene.finished) { seekTo(simStart); } setPlaying(!playing); });
    $('introPlay').addEventListener('click', () => setPlaying(true));
    $('btnRestart').addEventListener('click', () => { seekTo(simStart); setPlaying(false); });
    document.querySelectorAll('.speed button').forEach((b) => b.addEventListener('click', () => { speed = +b.dataset.speed; document.querySelectorAll('.speed button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); }));
    if (qs.get('speed')) { speed = +qs.get('speed'); }
    Scene.onPick = (i) => { if (i >= 0) openCard(i); else closeCard(); };
    $('btnPrint').addEventListener('click', () => window.print()); $('btnHow').addEventListener('click', () => $('dlgHow').showModal()); $('btnData').addEventListener('click', () => $('dlgData').showModal());
    $('btnRules').addEventListener('click', () => $('dlgRules').showModal()); $('btnEst').addEventListener('click', () => { $('dlgEst').showModal(); });
    document.addEventListener('keydown', (e) => { if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.target.tagName === 'TR' || e.target.closest('#tour') || e.target.tagName === 'A') return; if (e.code === 'Space' && !document.querySelector('dialog[open]')) { e.preventDefault(); $('btnPlay').click(); } if (e.key === 'Escape') closeCard(); });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { Scene.resize(); buildLegend(); dirty = true; }, 120); });
    $('loading').style.display = 'none';
    if (qs.get('autoplay')) setPlaying(true);
    last = performance.now(); requestAnimationFrame(frame);
    OF.UI = {
      setPlaying, seekTo, simStart: () => simStart, isPlaying: () => playing,
      setSpeed: (v) => { speed = v; document.querySelectorAll('.speed button').forEach((x) => x.classList.toggle('on', +x.dataset.speed === v)); },
      statsAt: (day) => D.stats(day, null),
      filters: (o) => { const m = { hsp: 'fHsp', site: 'fSite', spec: 'fSpec', region: 'fRegion', prio: 'fPrio', mode: 'fMode' }; Object.keys(m).forEach((k) => { if (k in o) $(m[k]).value = String(o[k]); }); UI.onChange(); },
      resetFilters: () => $('btnReset').click(),
    };
    if (OF.Tour) { OF.Tour.init(); $('btnTour').addEventListener('click', () => OF.Tour.start()); $('introTour').addEventListener('click', () => OF.Tour.start()); if (qs.get('tour')) OF.Tour.start(); }
    window.__of = { D, Scene, get playing() { return playing; } };
  }
  main();
})();
