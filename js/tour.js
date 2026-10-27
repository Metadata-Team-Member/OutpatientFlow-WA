/* OutpatientFlow WA — guided tour (6 steps). Every number in the tour text is computed from the loaded data at that moment. */
(function () {
  'use strict';
  const OF = window.OF, D = OF.Data;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString('en-AU');
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  let step = -1, timer = null, panel = null, hl = [], token = 0;

  const dayAt = (frac) => { const a = OF.UI.simStart(), b = D.DAYS - 1; return Math.round(a + (b - a) * frac); };

  // Each step: title, optional run(token) that moves the clock, highlight selectors, and text(S) that builds the body from live stats.
  const STEPS = [
    {
      title: 'Meet the characters', day: () => OF.UI.simStart(), hl: ['#sceneWrap', '#legend'],
      text: (S) => 'Every character is one <b>invented</b> referral. It starts <b>thin</b> while it waits, and gets <b>larger</b> with every attended outpatient appointment. The map, the regions and the establishment sites are real reference data (step 6 says how far each is confirmed); the people and activity are synthetic. On ' + D.fmtDate(S.day) + ' the simulation holds <b>' + fmt(S.waiting) + '</b> people waiting for a first appointment and <b>' + fmt(S.inside) + '</b> in care.',
    },
    {
      title: 'Inside the network grows, outside stays thin', play: { to: () => dayAt(0.34), speed: 40 }, hl: ['#k6', '#cHist'],
      text: (S) => 'By ' + D.fmtDate(S.day) + ' people in care have had <b>' + S.avgIn.toFixed(1) + '</b> attended events on average (including events in the 24 months before the first referral), against <b>' + S.avgOut.toFixed(1) + '</b> for people still waiting for a first appointment. That gap is the size difference between the characters in the “Inside the network” panels and the thin ones in the waiting queue.',
    },
    {
      title: 'The waiting list and the targets', day: () => dayAt(0.7), hl: ['#k2', '#k3', '#cWait'],
      text: (S) => 'On ' + D.fmtDate(S.day) + ' <b>' + fmt(S.waiting) + '</b> people are waiting for a first appointment and <b>' + fmt(S.over) + '</b> (' + pct(S.over, S.waiting) + '%) are already past their priority target (30, 90 or 365 days, Business Rules §8.1). Over the last 12 months <b>' + (S.seenAll12 ? pct(S.withinAll12, S.seenAll12) + '%' : 'n/a') + '</b> of first appointments were within target, with a median wait of <b>' + Math.round(S.medFirst) + ' days</b> (synthetic).',
    },
    {
      title: 'Did not attend, and cancelled', day: () => dayAt(0.85), hl: ['#k5'],
      text: (S) => 'In the 12 months to ' + D.fmtDate(S.day) + ' there were <b>' + fmt(S.att12) + '</b> attended, <b>' + fmt(S.dna12) + '</b> did-not-attend (DNA or did-not-wait) and <b>' + fmt(S.can12) + '</b> cancelled appointments. The did-not-attend rate is <b>' + (S.dnaRate * 100).toFixed(1) + '%</b> of attended + DNA; cancelled appointments are counted separately. Amber flashes at the doors mark a missed appointment: the character does not grow.',
    },
    {
      title: 'Telehealth and phone', day: () => dayAt(0.85), filter: { mode: 'tele' }, hl: ['#fMode', '#sceneWrap'],
      text: (S, S0) => { let tele = 0, inp = 0; S0.hsp12.forEach((h) => { inp += h[0]; tele += h[1]; });
        return 'The characters now shown all had at least one telehealth or phone appointment (a blue beam links the character to the clinic door and a “+1 video” or “+1 phone” note appears, with no walking). Across all appointments (before the filter), in the 12 months to ' + D.fmtDate(S.day) + ', <b>' + pct(tele, tele + inp) + '%</b> of attended events were telehealth or phone (delivery modes TEL, VID, THH and THC in this simulation) and <b>' + pct(inp, tele + inp) + '%</b> were in person, The “Appointments by Health Service Provider” chart further down shows only the filtered patients. The filter returns to "all" when you move on.'; },
    },
    {
      title: 'What is real and what is not', day: () => OF.UI.simStart(), hl: ['#btnEst'], end: true,
      text: () => 'Real: WA health regions and districts, the Perth map, ' + D.dims.establishments.filter((e) => e.official).length + ' establishments confirmed on the official Establishment List and ' + (D.dims.establishments.length - D.dims.establishments.filter((e) => e.official).length) + ' more from the SLIP health layer (unconfirmed). Synthetic: every person, referral, wait and appointment. The list of what a real extract needs, and the questions for the data custodian, are in "Data we\'d need" and "Establishments &amp; sources".',
    },
  ];

  function clearHl() { hl.forEach((el) => { el.classList.remove('tour-hl'); delete el.dataset.hl; }); hl = []; }
  function setHl(sels) {
    clearHl(); let first = null;
    sels.forEach((s) => { const el = document.querySelector(s); if (el) { el.classList.add('tour-hl'); el.dataset.hl = '1'; hl.push(el); if (!first) first = el; } });
    if (first) { const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; first.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }
  }
  function stopTimer() { if (timer) { cancelAnimationFrame(timer); timer = null; } }

  function render(i, S, busy, S0) {
    const st = STEPS[i];
    panel.querySelector('.t-step').textContent = 'Step ' + (i + 1) + ' of ' + STEPS.length;
    panel.querySelector('h3').textContent = st.title;
    panel.querySelector('.t-body').innerHTML = busy ? '<span class="t-wait">Playing the simulation forward…</span>' : st.text(S, S0);
    panel.querySelector('.t-back').disabled = i === 0;
    const nx = panel.querySelector('.t-next'); nx.textContent = st.end ? 'Finish' : 'Next ▸';
    panel.querySelector('.t-dots').innerHTML = STEPS.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('');
  }

  function go(i) {
    token++; const my = token; stopTimer(); step = i; const st = STEPS[i];
    OF.UI.setPlaying(false);
    OF.UI.resetFilters();
    let S0 = null; if (st.filter) { S0 = OF.UI.statsAt(st.day ? st.day() : OF.UI.simStart()); OF.UI.filters(st.filter); }
    setHl(st.hl || []);
    const finish = (day) => { if (my !== token) return; OF.UI.setPlaying(false); OF.UI.seekTo(day); render(i, OF.UI.statsAt(day), false, S0); };
    if (st.play) {
      const start = OF.UI.simStart(), to = st.play.to();
      OF.UI.seekTo(start); OF.UI.setSpeed(st.play.speed); render(i, null, true); OF.UI.setPlaying(true);
      const poll = () => { if (my !== token) return; if (window.__of.Scene.t >= to - 1 || !OF.UI.isPlaying()) { finish(Math.min(to, Math.floor(window.__of.Scene.t))); return; } timer = requestAnimationFrame(poll); };
      timer = requestAnimationFrame(poll);
    } else {
      const day = st.day(); OF.UI.seekTo(day); render(i, OF.UI.statsAt(day), false, S0);
    }
    panel.querySelector('.t-next').focus({ preventScroll: true });
  }

  function end() {
    token++; stopTimer(); clearHl(); OF.UI.resetFilters(); OF.UI.setPlaying(false); OF.UI.setSpeed(4);
    panel.hidden = true; step = -1; document.removeEventListener('keydown', onKey, true);
    const b = $('btnTour'); if (b) b.focus({ preventScroll: true });
  }
  function onKey(e) {
    if (panel.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); end(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (step > 0) go(step - 1); }
  }
  function next() { if (STEPS[step].end) end(); else go(step + 1); }

  const Tour = {
    init() {
      panel = document.createElement('section'); panel.id = 'tour'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Guided tour'); panel.setAttribute('aria-live', 'polite');
      panel.innerHTML = '<div class="t-head"><span class="t-step"></span><button class="t-x" aria-label="Close tour (Esc)">×</button></div><h3></h3><p class="t-body"></p><div class="t-foot"><div class="t-dots" aria-hidden="true"></div><span class="t-hint">← → keys, Esc closes</span><button class="btn ghost t-back">◂ Back</button><button class="btn primary t-next">Next ▸</button></div><p class="t-syn">SYNTHETIC EXAMPLE DATA</p>';
      document.body.appendChild(panel);
      panel.querySelector('.t-x').addEventListener('click', end);
      panel.querySelector('.t-back').addEventListener('click', () => { if (step > 0) go(step - 1); });
      panel.querySelector('.t-next').addEventListener('click', next);
    },
    start() { if (!panel) return; $('intro').classList.add('gone'); panel.hidden = false; document.addEventListener('keydown', onKey, true); go(0); },
  };
  OF.Tour = Tour;
})();
