/* OutpatientFlow WA — wiring: filters, KPIs, controls, clock, click card, legend. */
(function () {
  'use strict';
  const OF = window.OF, D = OF.Data, Scene = OF.Scene, Charts = OF.Charts, SP = OF.Sprites;
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const fmt = (n) => Math.round(n).toLocaleString('en-AU');
  let playing = false, speed = 4, last = 0, statAcc = 99, S = null, selectedI = -1, simStart = 0, dirty = true;

  function fillSelect(el, items, allLabel, val) { el.innerHTML = '<option value="-1">' + allLabel + '</option>' + items.map((x, i) => '<option value="' + i + '">' + x + '</option>').join(''); }

  function buildFilters() {
    const dm = D.dims;
    fillSelect($('fSite'), dm.sites.map((s) => s.name), 'All hospitals');
    fillSelect($('fSpec'), dm.specialties.map((s) => s.name), 'All specialties');
    fillSelect($('fRegion'), dm.regions.map((s) => s.name), 'All regions');
    fillSelect($('fPrio'), dm.priorities.map((s) => s.label), 'All categories');
    const onChange = () => {
      D.filter.site = +$('fSite').value; D.filter.spec = +$('fSpec').value; D.filter.region = +$('fRegion').value; D.filter.prio = +$('fPrio').value; D.filter.mode = $('fMode').value;
      refilter();
    };
    ['fSite', 'fSpec', 'fRegion', 'fPrio', 'fMode'].forEach((id) => $(id).addEventListener('change', onChange));
    $('fColor').addEventListener('change', () => { Scene.colorBy = $('fColor').value; buildLegend(); });
    $('fDensity').addEventListener('change', () => { Scene.density = +$('fDensity').value; Scene.setup(); });
    $('btnReset').addEventListener('click', () => { ['fSite', 'fSpec', 'fRegion', 'fPrio'].forEach((id) => ($(id).value = '-1')); $('fMode').value = 'all'; onChange(); });
    $('btnFilters').addEventListener('click', () => { const g = $('filterGrid'); const o = g.classList.toggle('open'); $('btnFilters').setAttribute('aria-expanded', o); $('btnFilters').textContent = o ? 'Filters ▴' : 'Filters ▾'; });
    Charts.onSpec = (si) => { $('fSpec').value = D.filter.spec === si ? '-1' : String(si); onChange(); };
  }
  function refilter() { D.applyFilter(); Charts.refreshSeries(); Scene.setup(); closeCard(); statAcc = 99; dirty = true; }

  function buildKpis() {
    $('kpis').innerHTML = [
      ['k1', 'Referrals received, last 12 months'], ['k2', 'Waiting for care now'], ['k3', 'Median wait so far'],
      ['k4', 'Attended events, last 12 months'], ['k5', 'Did-not-attend rate'], ['k6', 'Attended events per patient'],
    ].map(([id, lab]) => '<div class="kpi" id="' + id + '"><div class="lab">' + lab + '</div><div class="val">–</div><div class="note"></div></div>').join('');
  }
  function setK(id, val, note, cls) { const el = $(id); el.querySelector('.val').textContent = val; el.querySelector('.note').textContent = note || ''; el.className = 'kpi' + (cls ? ' ' + cls : ''); }
  function updateKpis() {
    const s = S; const d = s.refsPrev12 ? (s.refs12 - s.refsPrev12) / s.refsPrev12 : 0;
    setK('k1', fmt(s.refs12), s.refsPrev12 ? (d >= 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(d * 100)) + '% on the 12 months before' : 'first year of data');
    const pOver = s.waiting ? s.over / s.waiting : 0;
    setK('k2', fmt(s.waiting), fmt(s.over) + ' past indicative target (' + Math.round(pOver * 100) + '%)', pOver > 0.35 ? 'bad' : pOver > 0.2 ? 'warn' : '');
    setK('k3', s.waiting ? Math.round(s.medWait) + ' days' : '–', 'of people still in the queue', s.medWait > 150 ? 'warn' : '');
    setK('k4', fmt(s.att12), fmt(s.inside) + ' people in care now');
    setK('k5', (s.dnaRate * 100).toFixed(1) + '%', fmt(s.dna12) + ' did not attend in 12 months', s.dnaRate > 0.1 ? 'warn' : '');
    const el = $('k6'); el.className = 'kpi cmpk'; el.querySelector('.val').innerHTML = '';
    const mx = Math.max(1, s.avgIn, s.avgOut);
    el.querySelector('.val').innerHTML = '<div class="cmp"><div><b style="color:#4fd1c5">' + s.avgIn.toFixed(1) + '</b><small>inside network</small><div class="bar" style="background:#4fd1c5;width:' + Math.round(s.avgIn / mx * 100) + '%"></div></div><div><b style="color:#ff8b8b">' + s.avgOut.toFixed(1) + '</b><small>waiting outside</small><div class="bar" style="background:#ff6b6b;width:' + Math.round(s.avgOut / mx * 100) + '%"></div></div></div>';
    el.querySelector('.note').textContent = 'includes attended events in the prior 24 months';
  }

  function buildLegend() {
    const lg = $('legend'); const items = Scene.colorLegend();
    let html = '<div class="grp"><b>Colour = ' + $('fColor').selectedOptions[0].textContent + '</b>' + items.map(([n, rgb]) => '<span class="sw"><i style="background:' + SP.rgbCss(rgb) + '"></i>' + n + '</span>').join('') + '</div>';
    html += '<div class="grp"><b>Size = attended events</b><div class="sizes" id="sizes"></div></div>';
    html += '<div class="grp"><b>Moments</b><span class="sw"><i style="background:#5ad19a"></i>Door glows green: attended</span><span class="sw"><i style="background:#f5b94a"></i>amber: did not attend</span><span class="sw"><i style="background:#7aa7ff"></i>blue beam: telehealth</span><span class="sw"><i style="background:#ff6b6b"></i>red dashed line: indicative target</span></div>';
    lg.innerHTML = html;
    const host = $('sizes');
    [[0, 'none'], [2, '2'], [5, '5'], [10, '10'], [20, '20+']].forEach(([n, lab]) => {
      const b = Math.round(D.growth(n) * (SP.NB - 1)); const s = SP.get([79, 209, 197], b, n === 0 ? 2 : 1);
      const fig = document.createElement('figure'); const cv = document.createElement('canvas'); cv.width = s.w * 2; cv.height = s.h * 2; cv.style.width = s.w * 1.1 + 'px'; cv.style.height = s.h * 1.1 + 'px';
      cv.getContext('2d').drawImage(s.cv, 0, 0, cv.width, cv.height); fig.appendChild(cv); const cap = document.createElement('figcaption'); cap.textContent = lab; fig.appendChild(cap); host.appendChild(fig);
    });
  }

  /* ---------- click card ---------- */
  function openCard(i) {
    selectedI = i; Scene.select(i); const el = $('card');
    if (i < 0) { el.hidden = true; return; }
    el.hidden = false; renderCard();
  }
  function closeCard() { selectedI = -1; Scene.select(-1); $('card').hidden = true; }
  function renderCard() {
    if (selectedI < 0) return; const r = D.record(selectedI, Math.floor(Scene.t)); const dm = D.dims;
    let status; if (r.st.state === 0) status = 'Not yet referred'; else if (r.st.state === 3) status = 'Episode closed' + (r.close ? ' · ' + r.close.label : ''); else if (r.st.state === 2) status = r.st.att ? 'In care' : 'In care (referred from inside the hospital)'; else status = 'Waiting ' + Math.round(Scene.t - r.ref) + ' days (' + Math.round((Scene.t - r.ref) / r.target * 100) + '% of target)';
    const dots = r.events.map((e) => { const a = dm.attendance[e.att].code; const col = a === 'ATT' ? (dm.modes[e.mode].remote ? '#7aa7ff' : '#5ad19a') : a === 'DNA' ? '#f5b94a' : '#9aa7bd'; return '<i title="' + D.fmtDate(e.day) + ' · ' + dm.attendance[e.att].label + ' · ' + dm.modes[e.mode].label + '" style="background:' + col + '"></i>'; }).join('');
    $('card').innerHTML = '<h4><span>Referral ' + r.id + '</span><button class="x" aria-label="Close" id="cardX">×</button></h4><div class="syn">SYNTHETIC RECORD · NOT A REAL PERSON</div><dl>' +
      '<dt>Status</dt><dd>' + status + '</dd><dt>Specialty</dt><dd>' + r.spec.name + '</dd><dt>Hospital</dt><dd>' + r.site.short + '</dd><dt>Urgency</dt><dd>' + r.prio.label + '</dd>' +
      '<dt>Referral source</dt><dd>' + r.src.label + '</dd><dt>Received</dt><dd>' + D.fmtDate(r.ref) + '</dd><dt>Lives in</dt><dd>' + r.region.name + ' (' + r.postcode + ')</dd><dt>Age group</dt><dd>' + r.ageGrp + '</dd>' +
      '<dt>Attended events</dt><dd>' + (r.st.att + r.prior) + ' <small style="color:#6b7d99">(' + r.prior + ' prior)</small></dd><dt>Did not attend</dt><dd>' + r.st.dna + '</dd></dl>' +
      '<div class="tl">' + dots + '</div><div class="cap">Dots: green attended · blue telehealth · amber DNA · grey did not wait. Only fields from the data requirements log are shown.</div>';
    $('cardX').addEventListener('click', closeCard);
  }

  /* ---------- clock / controls ---------- */
  function setPlaying(p) {
    playing = p; $('playIcon').textContent = p ? '❚❚' : '▶'; $('playText').textContent = p ? 'Pause' : (Scene.finished ? 'Replay' : 'Play');
    if (p) $('intro').classList.add('gone');
  }
  function seekTo(day) { Scene.finished = false; Scene.seek(day); statAcc = 99; dirty = true; if (!playing) $('playText').textContent = 'Play'; }
  function buildTicks() {
    const el = $('ticks'); const a = simStart, b = D.DAYS - 1; el.style.position = 'relative'; el.style.height = '14px'; el.innerHTML = '';
    for (let y = 2023; y <= 2026; y++) { const d = D.dateToDay(y + '-07-01'); if (d > b) continue; const s = document.createElement('span'); s.style.cssText = 'position:absolute;transform:translateX(-50%);left:' + ((d - a) / (b - a) * 100) + '%'; s.textContent = d === a ? 'Jul ' + y : 'Jul ' + y; if (d === a) s.style.transform = 'none'; el.appendChild(s); }
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    Scene.advance(dt, speed, playing);
    if (playing && Scene.finished) { playing = false; setPlaying(false); }
    statAcc += dt;
    if (statAcc > (playing ? 0.18 : 0.5) || dirty) { statAcc = 0; const day = Math.floor(Scene.t); S = D.stats(day, S); Scene.setStats(S); updateKpis(); Charts.draw(S, Scene.t); if (selectedI >= 0) renderCard(); dirty = false;
      $('dateLabel').textContent = D.fmtDate(day); $('fyLabel').textContent = D.fy(day); if (document.activeElement !== $('slider')) $('slider').value = day; }
    Scene.render(now);
    requestAnimationFrame(frame);
  }

  async function main() {
    try { await D.load('data/' + (/^[\w.-]+\.json$/.test(qs.get('data') || '') ? qs.get('data') : 'synthetic.json')); } catch (e) { $('loading').textContent = 'Could not load data: ' + e.message; throw e; }
    simStart = D.dateToDay(D.meta.simStart);
    document.querySelectorAll('.badge-syn,.foot-badge,.intro-badge').forEach((b) => { if (!D.meta.synthetic) b.textContent = D.meta.banner; });
    buildFilters(); buildKpis(); Charts.init();
    const portrait = innerWidth < 760; Scene.density = +(qs.get('density') || (portrait ? 12 : 8)); $('fDensity').value = String(Scene.density);
    if (qs.get('color')) { Scene.colorBy = qs.get('color'); $('fColor').value = Scene.colorBy; }
    Scene.init($('scene'), $('sceneWrap'));
    Scene.t = qs.get('t') ? D.dateToDay(qs.get('t')) : simStart;
    Scene.resize(); Scene.setup(); buildLegend(); Charts.refreshSeries();
    const sl = $('slider'); sl.min = simStart; sl.max = D.DAYS - 1; sl.value = simStart; buildTicks();
    let pend = null; sl.addEventListener('input', () => { if (pend) return; pend = requestAnimationFrame(() => { pend = null; seekTo(+sl.value); }); });
    $('btnPlay').addEventListener('click', () => { if (Scene.finished) { seekTo(simStart); } setPlaying(!playing); });
    $('introPlay').addEventListener('click', () => setPlaying(true));
    $('btnRestart').addEventListener('click', () => { seekTo(simStart); setPlaying(false); });
    document.querySelectorAll('.speed button').forEach((b) => b.addEventListener('click', () => { speed = +b.dataset.speed; document.querySelectorAll('.speed button').forEach((x) => x.classList.toggle('on', x === b)); }));
    if (qs.get('speed')) { speed = +qs.get('speed'); }
    Scene.onPick = (i) => { if (i >= 0) openCard(i); else closeCard(); };
    $('btnHow').addEventListener('click', () => $('dlgHow').showModal()); $('btnData').addEventListener('click', () => $('dlgData').showModal());
    document.addEventListener('keydown', (e) => { if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return; if (e.code === 'Space') { e.preventDefault(); $('btnPlay').click(); } if (e.key === 'Escape') closeCard(); });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { Scene.resize(); buildLegend(); dirty = true; }, 120); });
    $('loading').style.display = 'none';
    if (qs.get('autoplay')) setPlaying(true);
    last = performance.now(); requestAnimationFrame(frame);
    window.__of = { D, Scene, get playing() { return playing; } };
  }
  main();
})();
