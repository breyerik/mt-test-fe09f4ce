/* Boot, Hauptschleife, Eingaben, Sound, Speichern. Debug-Haken: ?debug=1 -> window.MT */
(() => {
  const KEY = 'maurer_tycoon_v1', $ = s => document.querySelector(s);
  const q = new URLSearchParams(location.search), DEBUG = q.has('debug');
  const M = { sinceSave: 0, acc: 0, running: false, last: 0, ready: false, autoOn: false, autoEvery: 0 };

  // ---------- Sound (WebAudio-Chiptune) ----------
  let ac = null;
  const beep = (seq) => { if (!UI.sfxOn) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); let t = ac.currentTime; seq.forEach(([f, d, type, v]) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.value = v || .05; g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d); t += d * .8; }); } catch (e) { } };
  const SFX = { coin: [[988, .06], [1319, .1]], ok: [[523, .07], [784, .1]], hire: [[392, .07], [523, .07], [659, .1]], win: [[523, .09], [659, .09], [784, .09], [1047, .22]], lose: [[300, .12, 'sawtooth'], [220, .2, 'sawtooth']], level: [[523, .09], [659, .09], [784, .09], [1047, .09], [784, .09], [1319, .3]], bad: [[200, .15, 'sawtooth']], tick: [[660, .03]] };

  // ---------- SIM-Ereignisse ----------
  SIM.on((type, d) => {
    if (type === 'toast') UI.toast(d.txt, d.kind);
    else if (type === 'money') {
      if (Math.abs(d.amt) >= 300 && !d.quiet) { UI.fx((d.amt > 0 ? '+' : '−') + (Math.round(Math.abs(d.amt) / 100) * 100).toLocaleString('de-DE') + ' €', d.amt > 0 ? 'pos' : 'neg', 40 + Math.random() * 260, 80 + Math.random() * 30); if (d.amt > 800) beep(SFX.coin); }
    } else if (type === 'sfx') beep(SFX[d.s] || SFX.ok);
  });

  // ---------- Aktionen ----------
  const msg = r => { if (r && r.ok === false && r.msg) { UI.toast(r.msg, 'bad'); beep(SFX.bad); } return r; };
  const ACT = {
    open: d => UI.open(d.w, d),
    close: () => UI.close(),
    tab: d => { UI.args.tab = d.t; UI.rerender(); },
    speed: d => { SIM.S.speed = +d.s; UI.hud(); },
    found: () => { const boss = $('#inName').value.trim() || 'Max Mustermann', firma = $('#inFirma').value.trim() || 'Rohbau Mustermann'; SIM.newGame({ boss, firma }); afterLoad(); UI.close(); UI.toast(`Willkommen, ${boss}! „${firma}“ ist gegründet.`, 'good'); beep(SFX.win); },
    save: () => { if (save(true)) UI.toast('Gespeichert ' + clock() + ' ✓', 'good'); else if (SIM.S.gameOver) UI.toast('Nach der Insolvenz wird nicht gespeichert. Lade den letzten guten Stand.', 'bad'); else UI.toast('⚠ Speichern nicht möglich: Der Browser blockiert den Speicher (privater Modus?). Spiel nicht schließen oder in normalem Tab öffnen.', 'bad'); },
    loadgood: () => { if (loadKey(KEY_GOOD)) { UI.close(); UI.toast('Letzter guter Stand geladen. Pausiert: x1 startet das Spiel.', 'good'); } else UI.toast('Kein guter Spielstand vorhanden.', 'bad'); },
    load: () => { if (load()) { UI.close(); UI.toast('Spielstand geladen. Pausiert: x1 startet das Spiel.', 'good'); checkBadSave(); } else UI.toast('Kein Spielstand vorhanden.', 'bad'); },
    reset: () => { localStorage.removeItem(KEY); localStorage.removeItem(KEY_GOOD); UI.U = null; SIM.newGame({}); afterLoad(); UI.open('intro'); },
    sfx: () => { UI.sfxOn = !UI.sfxOn; UI.rerender(); },
    hire: d => { SIM.S.hiresFree; const kind = d.kind || 'baustelle'; if (kind !== 'office' && d.kind !== 'polier' && !SIM.freeSlots().length) return; SIM.newCandidate(kind, true); UI.open('hire', { k: d.k ? +d.k : null, s: d.s !== undefined ? +d.s : 0, kind }); },
    reroll: () => { const r = msg(SIM.newCandidate(UI.args.kind, false)); UI.rerender(); },
    dohire: () => { const a = UI.args; const r = msg(SIM.hire(a.k, a.s)); if (r.ok) { SIM.setGoalAuto(); UI.open('staff', { tab: a.kind === 'office' ? 'off' : 'kol' }); } },
    staffback: () => { UI.open('staff', {}); },
    filter: (d, el) => { SIM.setFilter(el.value); const r = SIM.applyFilter(UI.args.kind); if (r.msg) UI.toast(r.msg, 'bad'); UI.rerender(); },
    worker: d => UI.open('worker', { id: +d.id }),
    firec: d => UI.open('firec', { id: +d.id }),
    firego: d => { SIM.fire(+d.id); UI.open('staff', {}); },
    newkol: () => { msg(SIM.addKolonne()); UI.rerender(); },
    lohnyes: d => { const r = msg(SIM.acceptLohn(+d.id, +d.k)); SIM.setGoalAuto(); if (r.ok) UI.close(); else UI.rerender(); },
    lohnpick: d => UI.open('lohnpick', { id: +d.id }),
    bidopen: d => { const t = SIM.S.tenders.find(x => x.id === +d.id); SIM.openCalc(t); UI.open('bid', { id: +d.id }); },
    stepb: d => { const t = SIM.S.tenders.find(x => x.id === UI.args.id), b = t.bid, C = BAL.calc, lim = { agk: C.agk, wagnis: C.wagnis, gewinn: C.gewinn, fine: [-.1, .1] }[d.key]; b[d.key] = Math.round(Math.max(lim[0], Math.min(lim[1], (b[d.key] || 0) + +d.d)) * 100) / 100; UI.rerender(); },
    epadj: d => { const t = SIM.S.tenders.find(x => x.id === UI.args.id), b = t.bid; b.adjG = b.adjG || {}; const ln = SIM.quote(t).lines.find(l => l.pid === d.pid); b.adjG[d.pid] = (b.adjG[d.pid] || 0) + (+d.d) * SIM.epStep(ln.ep); UI.rerender(); },
    lvtoggle: () => { UI.args.lv = !UI.args.lv; UI.rerender(); },
    neben: () => { const b = SIM.S.tenders.find(x => x.id === UI.args.id).bid; b.neben = !b.neben; UI.rerender(); },
    blk: d => { const b = SIM.S.tenders.find(x => x.id === UI.args.id).bid; b.blocks[d.k] = !b.blocks[d.k]; UI.rerender(); },
    bidgo: d => { const r = msg(SIM.submitBid(+d.id)); if (r.ok) { beep(SFX.ok); UI.open('tender'); } },
    startjob: d => UI.open('startjob', { id: +d.id, sel: [] }),
    selkol: d => { const sel = UI.args.sel, k = +d.k; const i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else sel.push(k); UI.rerender(); },
    gojob: d => { const r = msg(SIM.assignJob(+d.id, UI.args.sel)); if (r.ok) { SIM.setGoalAuto(); UI.close(); } },
    buygear: d => { msg(SIM.buyGear(d.id)); UI.rerender(); },
    buydeko: d => { msg(SIM.buyDeko(d.id)); syncArt(); UI.rerender(); },
    credit: d => { msg(SIM.takeCredit(+d.a)); UI.rerender(); },
    repay: d => { msg(SIM.repayCredit(+d.a)); UI.rerender(); },
    upgrade: d => { const r = msg(SIM.upgrade(d.f === '1')); if (r.ok) { syncArt(); UI.close(); } else UI.rerender(); },
    buypack: () => { SIM.buyPack('SZ'); UI.flag(); UI.open('nation'); },
    setflag: d => { SIM.setFlag(d.k); UI.flag(); UI.rerender(); },
    inboxok: () => { const it = SIM.S.inbox[0]; if (it) SIM.resolveInbox(it.id, 0); if (it && it.kind === 'stage') syncArt(); UI.U && 0; UI.cur = 'inbox'; UI.checkInbox(); },
    choice: d => { const it = SIM.S.inbox[0]; if (it) SIM.resolveInbox(it.id, +d.i); UI.cur = 'inbox'; UI.checkInbox(); }
  };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el || el.tagName === 'SELECT') return; const f = ACT[el.dataset.act]; if (f) { f(el.dataset, el); UI.hud(); }
  });
  document.addEventListener('change', e => { const el = e.target.closest('select[data-act]'); if (el) ACT[el.dataset.act](el.dataset, el); });

  // ---------- Speichern ----------
  // Zwei Slots: KEY = normaler Autosave (nie im Insolvenz-Zustand überschrieben), KEY_GOOD = letzter gesunder Stand (Kasse >= 0, nicht überzogen).
  const KEY_GOOD = KEY + '_good';
  const healthy = s => !s.gameOver && !(s.overdraftWeeks > 0) && s.cash >= 0;
  // MT-043: save() meldet das echte Ergebnis (inkl. Rücklesen), zeigt "Gespeichert HH:MM" bzw. eine Fehlermeldung und merkt sich den Zustand in UI.saveState.
  const clock = () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const setSaveState = st => { UI.saveState = st; if (UI.hud) UI.hud(); };
  function save(quiet) {
    const s = SIM.S; if (!s || s.gameOver) return false; if (quiet && UI.cur === 'intro') return false; // nie das ungegründete Spiel autospeichern
    try {
      const j = JSON.stringify(s); localStorage.setItem(KEY, j); if (healthy(s)) localStorage.setItem(KEY_GOOD, j);
      if (localStorage.getItem(KEY) !== j) throw new Error('Rücklesen fehlgeschlagen');
      M.sinceSave = 0; setSaveState({ ok: true, t: clock(), week: s.week }); return true;
    } catch (e) {
      M.sinceSave = 0; const first = !(UI.saveState && UI.saveState.err);
      setSaveState({ err: String(e && e.name || e) });
      if (first && !quiet) UI.toast('⚠ Speichern nicht möglich (privater Modus oder Speicher gesperrt?). Beim Schließen geht der Spielstand verloren.', 'bad');
      return false;
    }
  }
  // Autosave auch beim Verstecken/Schließen: iOS Safari feuert beforeunload oft NICHT (App-Wechsel, Wegwischen); pagehide/visibilitychange schon.
  function probeStorage() { try { localStorage.setItem('mt_probe', '1'); localStorage.removeItem('mt_probe'); if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { }); return true; } catch (e) { setSaveState({ err: String(e && e.name || e) }); return false; } }
  // MT-037: nach dem Laden immer pausieren (Speed 0), damit man sich orientieren kann.
  function loadKey(k) { const raw = localStorage.getItem(k); if (!raw) return false; try { const o = JSON.parse(raw); if (o.gameOver && k === KEY) return false; SIM.load(o); SIM.S.speed = 0; afterLoad(); return true; } catch (e) { return false; } }
  // MT-036: Autosave aus der Überziehung -> Hinweis und "letzten guten Stand" anbieten (UI.W.badsave)
  function checkBadSave() {
    const s = SIM.S; if (!s || healthy(s)) return;
    const g = UI.goodInfo(); UI.open('badsave', { week: s.week, cash: s.cash, ow: s.overdraftWeeks || 0, good: g });
  }
  function load() { return loadKey(KEY) || loadKey(KEY_GOOD); }
  function syncArt() { const s = SIM.S; ART.setStage(s.stage); ART.deko = s.deko; ART.dogOn = !!s.deko.hund; ART.photos = Math.min(6, s.stats.jobs); UI.flag(); }
  function afterLoad() { UI.shownMoney = SIM.S.cash; syncArt(); M.acc = 0; UI.hud(); }

  // ---------- Hauptschleife ----------
  let lastWeek = -1, visitTimer = 0;
  function frame(ts) {
    const dt = Math.min(.1, (ts - (M.last || ts)) / 1000); M.last = ts;
    const s = SIM.S;
    if (s && M.ready) {
      const paused = !!UI.cur || s.gameOver; const mul = paused ? 0 : BAL.speeds[s.speed] || 0;
      if (mul > 0) {
        M.acc += dt * 1000 * mul;
        while (M.acc >= BAL.weekMs) { M.acc -= BAL.weekMs; SIM.step(); if (M.autoOn) AUTO.run(); if (SIM.S.week % 2 === 0 && !DEBUG) save(true); if (SIM.S.inbox.length) { UI.checkInbox(); if (UI.cur) break; } }
      }
      if (!DEBUG) { M.sinceSave += dt; if (M.sinceSave > 20 && !s.gameOver) save(true); }
      if (M.autoOn && !UI.cur) { M.autoEvery += dt; if (M.autoEvery > .3) { M.autoEvery = 0; AUTO.run(); } }
      while (s.visits.length) { const v = s.visits.shift(); ART.spawn(v.who, v.txt); }
      if (!UI.cur) UI.checkInbox();
      ART.update(dt, mul || (UI.cur ? 0 : 0));
      $('#wkbar').style.width = (M.acc / BAL.weekMs * 100) + '%';
      UI.hud();
    }
    ART.draw();
    requestAnimationFrame(frame);
  }

  // MT-042: das 390x844-Layout wird verkleinert, wenn der Bildschirm kleiner ist (z.B. 375x667): immer alles sichtbar, nie Seiten-Scroll.
  function fit() {
    const vv = window.visualViewport, w = vv ? vv.width : window.innerWidth, h = vv ? vv.height : window.innerHeight, ph = $('#phone');
    const sc = Math.max(.3, Math.min(w / 390, h / 844, 1.6)); ph.style.transform = `translateX(-50%) scale(${sc})`; ph.style.top = Math.max(0, (h - 844 * sc) / 2) + 'px';
  }
  window.addEventListener('resize', fit); window.addEventListener('orientationchange', fit); if (window.visualViewport) window.visualViewport.addEventListener('resize', fit); fit();
  // ---------- Start ----------
  ART.init($('#scene'));
  ART.load(() => {
    if (DEBUG && q.get('fresh')) { localStorage.removeItem(KEY); localStorage.removeItem(KEY_GOOD); }
    if (!(q.has('new')) && load()) { M.ready = true; UI.toast('Spielstand geladen. Pausiert: x1 startet das Spiel.', 'good'); checkBadSave(); } else { SIM.newGame({}); afterLoad(); M.ready = true; UI.open('intro'); }
    UI.flag(); window.addEventListener('resize', UI.flag);
    requestAnimationFrame(frame);
    if (q.get('open')) UI.open(q.get('open'), {});
  });
  const saveQuiet = () => { if (SIM.S && !DEBUG && M.ready) save(true); };
  window.addEventListener('beforeunload', saveQuiet); window.addEventListener('pagehide', saveQuiet);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveQuiet(); });
  probeStorage();
  if (DEBUG) window.MT = { SIM, UI, ART, AUTO, M, ACT, save, load, syncArt, errors: [],
    auto: (on, mode) => { M.autoOn = on; if (mode) AUTO.mode = mode; },
    fast: (weeks) => { for (let i = 0; i < weeks && !SIM.S.gameOver; i++) { SIM.step(); AUTO.run(); } syncArt(); UI.hud(); } };
  if (DEBUG) { window.addEventListener('error', e => (window.MT.errors.push(e.message + ' @' + e.filename + ':' + e.lineno))); window.addEventListener('unhandledrejection', e => window.MT.errors.push('rej ' + e.reason)); }
})();
