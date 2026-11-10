/* Boot, Hauptschleife, Eingaben, Sound, Speichern. Debug-Haken: ?debug=1 -> window.MT */
(() => {
  const KEY = 'maurer_tycoon_v1', $ = s => document.querySelector(s);
  const q = new URLSearchParams(location.search), DEBUG = q.has('debug');
  const M = { acc: 0, running: false, last: 0, ready: false, autoOn: false, autoEvery: 0 };

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
    save: () => { save(); UI.toast('Gespeichert.', 'good'); },
    load: () => { if (load()) { UI.close(); UI.toast('Spielstand geladen.', 'good'); } else UI.toast('Kein Spielstand vorhanden.', 'bad'); },
    reset: () => { localStorage.removeItem(KEY); UI.U = null; SIM.newGame({}); afterLoad(); UI.open('intro'); },
    sfx: () => { UI.sfxOn = !UI.sfxOn; UI.rerender(); },
    hire: d => { SIM.S.hiresFree; const kind = d.kind || 'baustelle'; if (kind !== 'office' && d.kind !== 'polier' && !SIM.freeSlots().length) return; SIM.newCandidate(kind, true); UI.open('hire', { k: d.k ? +d.k : null, s: d.s !== undefined ? +d.s : 0, kind }); },
    reroll: () => { const r = msg(SIM.newCandidate(UI.args.kind, false)); UI.rerender(); },
    dohire: () => { const a = UI.args; const r = msg(SIM.hire(a.k, a.s)); if (r.ok) { SIM.setGoalAuto(); UI.open('staff', { tab: a.kind === 'office' ? 'off' : 'kol' }); } },
    staffback: () => { SIM.S.cand = null; UI.open('staff', {}); },
    filter: (d, el) => { SIM.setFilter(el.value); SIM.newCandidate(UI.args.kind, true); UI.rerender(); },
    worker: d => UI.open('worker', { id: +d.id }),
    fire: d => { SIM.fire(+d.id); UI.open('staff', {}); },
    newkol: () => { msg(SIM.addKolonne()); UI.rerender(); },
    lohnyes: d => { const r = msg(SIM.acceptLohn(+d.id, +d.k)); SIM.setGoalAuto(); if (r.ok) UI.close(); else UI.rerender(); },
    lohnpick: d => UI.open('lohnpick', { id: +d.id }),
    bidopen: d => { const t = SIM.S.tenders.find(x => x.id === +d.id); SIM.openCalc(t); UI.open('bid', { id: +d.id }); },
    stepb: d => { const t = SIM.S.tenders.find(x => x.id === UI.args.id), b = t.bid, C = BAL.calc, lim = { agk: C.agk, wagnis: C.wagnis, gewinn: C.gewinn, fine: [-.1, .1] }[d.key]; b[d.key] = Math.round(Math.max(lim[0], Math.min(lim[1], (b[d.key] || 0) + +d.d)) * 100) / 100; UI.rerender(); },
    epadj: d => { const t = SIM.S.tenders.find(x => x.id === UI.args.id), b = t.bid; b.adjG = b.adjG || {}; const ln = SIM.quote(t).lines.find(l => l.pid === d.pid); b.adjG[d.pid] = (b.adjG[d.pid] || 0) + (+d.d) * SIM.epStep(ln.ep); UI.rerender(); },
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
  function save() { try { localStorage.setItem(KEY, JSON.stringify(SIM.S)); } catch (e) { } }
  function load() { const raw = localStorage.getItem(KEY); if (!raw) return false; try { SIM.load(JSON.parse(raw)); afterLoad(); return true; } catch (e) { return false; } }
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
        while (M.acc >= BAL.weekMs) { M.acc -= BAL.weekMs; SIM.step(); if (M.autoOn) AUTO.run(); if (SIM.S.week % 4 === 0 && !DEBUG) save(); if (SIM.S.inbox.length) { UI.checkInbox(); if (UI.cur) break; } }
      }
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

  // ---------- Start ----------
  ART.init($('#scene'));
  ART.load(() => {
    if (DEBUG && q.get('fresh')) localStorage.removeItem(KEY);
    if (!(q.has('new')) && load()) { M.ready = true; } else { SIM.newGame({}); afterLoad(); M.ready = true; UI.open('intro'); }
    UI.flag(); window.addEventListener('resize', UI.flag);
    requestAnimationFrame(frame);
    if (q.get('open')) UI.open(q.get('open'), {});
  });
  window.addEventListener('beforeunload', () => { if (SIM.S && !DEBUG) save(); });
  if (DEBUG) window.MT = { SIM, UI, ART, AUTO, M, ACT, save, load, syncArt, errors: [],
    auto: (on, mode) => { M.autoOn = on; if (mode) AUTO.mode = mode; },
    fast: (weeks) => { for (let i = 0; i < weeks && !SIM.S.gameOver; i++) { SIM.step(); AUTO.run(); } syncArt(); UI.hud(); } };
  if (DEBUG) { window.addEventListener('error', e => (window.MT.errors.push(e.message + ' @' + e.filename + ':' + e.lineno))); window.addEventListener('unhandledrejection', e => window.MT.errors.push('rej ' + e.reason)); }
})();
