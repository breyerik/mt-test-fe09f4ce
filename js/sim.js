/* Maurer Tycoon – Simulation (ohne DOM, auch in Node testbar). Alle Zahlen kommen aus BAL (balance.js). */
const SIM = (() => {
  let S = null, _seed = null;
  const rnd = () => { if (_seed === null) return Math.random(); _seed |= 0; _seed = _seed + 0x6D2B79F5 | 0; let t = Math.imul(_seed ^ _seed >>> 15, 1 | _seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rr = (a, b) => a + rnd() * (b - a), ri = (a, b) => Math.floor(rr(a, b + 1));
  const pick = a => a[Math.floor(rnd() * a.length)], chance = p => rnd() < p;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const R = x => Math.round(x), R2 = x => Math.round(x * 100) / 100;
  const roundTo = (x, st) => Math.round(x / st) * st;
  const nice = x => roundTo(x, x < 1000 ? 10 : 100);
  const epStep = ep => ep >= 5000 ? 500 : ep >= 1000 ? 100 : ep >= 200 ? 10 : 5;
  const wpick = tbl => { let t = tbl.reduce((s, e) => s + e[1], 0), r = rnd() * t; for (const e of tbl) { if ((r -= e[1]) <= 0) return e[0]; } return tbl[0][0]; };
  const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const uid = () => ++S.nextId;
  const hooks = { fn: null };
  const emit = (type, data) => { if (hooks.fn) hooks.fn(type, data || {}); };
  const log = txt => { S.log.unshift({ w: S.week, t: txt }); if (S.log.length > 40) S.log.pop(); };
  const toast = (txt, kind) => { log(txt); emit('toast', { txt, kind: kind || 'info' }); };
  const money = (amt, label, flow) => { S.cash += amt; if (flow !== false) emit('money', { amt, label }); };
  const stageDef = () => BAL.stages[S.stage - 1];

  // ---------- Datum ----------
  function dateOf(w) { const m0 = BAL.startMonth - 1 + Math.floor(w / BAL.weeksPerMonth); return { y: 1 + Math.floor(m0 / 12), m: m0 % 12 + 1, wk: w % BAL.weeksPerMonth + 1 }; }
  const dateStr = w => { const d = dateOf(w); return `J${d.y} ${MONTHS[d.m - 1]} W${d.wk}`; };
  const isWinter = w => BAL.weather.winterMonths.includes(dateOf(w).m);

  // ---------- Start ----------
  function newGame(opts) {
    opts = opts || {};
    if (opts.seed !== undefined) _seed = opts.seed;
    S = { v: 1, week: 0, nextId: 0, boss: opts.boss || 'Max Mustermann', firma: opts.firma || 'Rohbau Mustermann',
      cash: BAL.start.cash, ruf: BAL.start.ruf, stage: 1, pack: false, flag: null, filter: null,
      workers: [], office: [], kolonnen: [], vehicles: [], geraete: {}, deko: {}, kredit: 0, overdraftWeeks: 0,
      tenders: [], lohnOffers: [], bids: [], jobs: [], recv: [], inbox: [], log: [], done: [], pending: [],
      revHist: [], earnedTotal: 0, stats: { bids: 0, wins: 0, jobs: 0, lohnWeeks: 0, hires: 0, profit: 0, rerolls: 0 },
      calcXp: 0, hiresFree: BAL.start.weeklyFreeHires, cand: null, matIdx: 1, matIdxUntil: 0, weather: { kind: 'ok', m: 1 },
      sound: true, goal: 'hire', flags: { stageNotified: 1, firstTender: false, firstJob: false, yearEnd: 0 }, visits: [], ev: {}, speed: 1, gameOver: false };
    const v = { id: uid(), type: 'transporter' }; S.vehicles.push(v);
    S.kolonnen.push({ id: uid(), name: 'Kolonne A', slots: [null, null, null], polier: null, vehicle: v.id, work: null });
    for (let i = 0; i < 3; i++) genLohnOffer();
    return S;
  }
  function load(obj) { S = obj; return S; }

  // ---------- Mitarbeiter ----------
  const skillsOf = w => BAL.roles[w.role].skills;
  const teamBonus = w => (S.pack && S.flag && w.nat === S.flag) ? BAL.teamBonus : 0;
  const stat = (w, k) => Math.min(10, w[k] + teamBonus(w));
  const isSick = w => w.sickUntil && w.sickUntil > S.week;
  const roleProd = w => w.role === 'azubi' ? BAL.azubiProd[w.lehrjahr || 0] : BAL.roles[w.role].prod;
  const effOf = w => BAL.tempoBase + BAL.tempoPer * stat(w, 'tempo');
  const monthlyOf = w => w.monthly;
  function natPool() {
    if (!S.pack || !S.filter) return BASEPOOL;
    if (NAT[S.filter]) return [S.filter];
    const g = ALLNAT.filter(k => NAT[k].g === S.filter); return g.length ? g : BASEPOOL;
  }
  function rollCandidate(kind) {
    const nat = pick(natPool()), N = NAT[nat];
    const role = kind === 'office' ? pick(BAL.officePool.filter(r => BAL.roles[r].stage <= S.stage && !(S.office.length >= stageDef().desks))) || 'buero'
      : kind === 'polier' ? 'polier' : wpick(BAL.hirePool.filter(e => BAL.roles[e[0]].stage <= S.stage));
    const R_ = BAL.roles[role];
    const base = () => clamp(Math.round(5.3 + gauss() * 1.7), 2, 9);
    const adj = role === 'helfer' ? -1 : role === 'azubi' ? -2 : 0;
    const c = { id: uid(), name: pick(N.nm) + ' ' + LASTI[ri(0, LASTI.length - 1)] + '.', nat, role, tempo: clamp(base() + adj, 1, 10), qual: clamp(base() + adj, 1, 10), aus: clamp(base() + adj, 1, 10),
      trait: pick(TRAITS)[0], laune: 70, lehrjahr: 0, avatar: ri(0, 3), since: S.week };
    if (R_.office) { c.tempo = c.qual = c.aus = clamp(Math.round(5 + gauss() * 1.8), 2, 10); c.skill = c.tempo; }
    const sum = c.tempo + c.qual + c.aus;
    let m = R_.monthly * clamp(1 + (sum - 16.5) * .018, .8, 1.3);
    if (role === 'azubi') m = BAL.azubiMonthly[0];
    if (c.trait === 'Günstig') m *= .92;
    c.monthly = Math.round(m / 100) * 100;
    return c;
  }
  function newCandidate(kind, free) {
    if (!free && S.cash < BAL.hireAdCost) return { ok: false, msg: 'Zu wenig Geld für eine neue Stellenanzeige.' };
    if (!free) { money(-BAL.hireAdCost, 'Stellenanzeige'); S.stats.rerolls++; }
    S.cand = { kind, c: rollCandidate(kind) };
    return { ok: true, cand: S.cand };
  }
  function freeSlots() { const out = []; S.kolonnen.forEach(k => k.slots.forEach((s, i) => { if (!s) out.push([k.id, i]); })); return out; }
  function hire(kolId, slot) {
    const cd = S.cand; if (!cd) return { ok: false, msg: 'Kein Bewerber.' };
    const c = cd.c;
    if (cd.kind === 'office') {
      if (S.office.length >= stageDef().desks) return { ok: false, msg: 'Kein freier Schreibtisch.' };
      if (S.cash < BAL.hireFeeOffice) return { ok: false, msg: 'Zu wenig Geld.' };
      money(-BAL.hireFeeOffice, 'Einstellung'); S.office.push(c); S.workers.push(c);
    } else if (cd.kind === 'polier') {
      const k = S.kolonnen.find(x => x.id === kolId); if (!k) return { ok: false, msg: 'Keine Kolonne gewählt.' };
      S.workers.push(c); k.polier = c.id; c.kolonne = k.id;
    } else {
      const k = S.kolonnen.find(x => x.id === kolId); if (!k || k.slots[slot]) return { ok: false, msg: 'Platz nicht frei.' };
      if (S.hiresFree > 0) S.hiresFree--; else { if (S.cash < BAL.hireFeeOffice / 2) return { ok: false, msg: 'Zu wenig Geld.' }; money(-BAL.hireFeeOffice / 2, 'Einstellung'); }
      S.workers.push(c); k.slots[slot] = c.id; c.kolonne = k.id;
    }
    S.stats.hires++; S.cand = null; S.visits.push({ who: 'neu', txt: c.name + ' fängt an!' });
    toast(`${c.name} (${BAL.roles[c.role].n}) eingestellt.`, 'good'); emit('sfx', { s: 'hire' });
    return { ok: true, worker: c };
  }
  function removeWorker(id, why) {
    const w = S.workers.find(x => x.id === id); if (!w) return;
    S.workers = S.workers.filter(x => x.id !== id); S.office = S.office.filter(x => x.id !== id);
    S.kolonnen.forEach(k => { k.slots = k.slots.map(s => s === id ? null : s); if (k.polier === id) k.polier = null; });
    if (why) log(`${w.name} (${BAL.roles[w.role].n}) ist weg: ${why}`);
  }
  function fire(id) { const w = S.workers.find(x => x.id === id); if (!w) return { ok: false }; if (w.cousin) { S.ruf = Math.max(0, S.ruf - 2); } removeWorker(id, 'gekündigt'); return { ok: true }; }
  function moveWorker(wid, kolId, slot) { // von Kolonne in anderen freien Platz
    const w = S.workers.find(x => x.id === wid); if (!w || BAL.roles[w.role].office || w.role === 'polier') return { ok: false };
    const k = S.kolonnen.find(x => x.id === kolId); if (!k || k.slots[slot]) return { ok: false };
    S.kolonnen.forEach(o => o.slots = o.slots.map(s => s === wid ? null : s)); k.slots[slot] = wid; w.kolonne = kolId; return { ok: true };
  }

  // ---------- Kolonnen ----------
  const hasRole = r => S.office.some(w => w.role === r);
  const countRole = r => S.office.filter(w => w.role === r).length;
  const officeSkill = r => { const w = S.office.find(x => x.role === r); return w ? stat(w, 'skill' in w ? 'tempo' : 'tempo') : 0; };
  function mgmtCap() { return Math.min(stageDef().kol, 2 + (hasRole('buero') ? 1 : 0) + 3 * countRole('bauleiter') + (hasRole('dispo') ? 1 : 0)); }
  const membersOf = k => k.slots.map(id => S.workers.find(w => w.id === id)).filter(Boolean);
  const polierOf = k => k.polier ? S.workers.find(w => w.id === k.polier) : null;
  const kolSkills = k => { const s = new Set(); membersOf(k).forEach(w => skillsOf(w).forEach(x => s.add(x))); const p = polierOf(k); if (p) s.add('mauern'); return s; };
  const kolWeeklyCost = k => (membersOf(k).reduce((a, w) => a + monthlyOf(w), 0) + (polierOf(k) ? monthlyOf(polierOf(k)) * (polierShare(polierOf(k))) : 0)) / BAL.weeksPerMonth;
  const polierShare = p => 1 / Math.max(1, S.kolonnen.filter(k => k.polier === p.id).length);
  function kolCapacity(k) {
    const ms = membersOf(k).filter(w => !isSick(w)); let h = 0;
    ms.forEach(w => { const lau = .9 + .2 * (w.laune || 70) / 100; h += BAL.hoursPerWeek * roleProd(w) * effOf(w) * lau; });
    const p = polierOf(k); let mult = 1; if (p && !isSick(p)) mult += BAL.polierBonus;
    if (S.deko.kaffee) mult += .02;
    return { hours: h * mult, n: ms.length };
  }
  const kolonneFree = k => !k.work && !!k.vehicle;
  function addKolonne() {
    const have = S.kolonnen.length, cap = mgmtCap();
    if (have >= stageDef().kol) return { ok: false, msg: `In dieser Büro-Stufe sind höchstens ${stageDef().kol} Kolonnen möglich.` };
    if (have >= cap) return { ok: false, msg: `Du schaffst nur ${cap} Kolonnen. Mehr geht mit Bürokraft (3), Bauleiter (+3) oder Disponent.` };
    const price = BAL.vehicle.transporter.price; if (S.cash < price) return { ok: false, msg: 'Transporter kostet ' + price + ' €.' };
    money(-price, 'Transporter'); const v = { id: uid(), type: 'transporter' }; S.vehicles.push(v);
    S.kolonnen.push({ id: uid(), name: 'Kolonne ' + 'ABCDEFGHIJ'[S.kolonnen.length], slots: [null, null, null], polier: null, vehicle: v.id, work: null });
    toast('Neue Kolonne gegründet.', 'good'); return { ok: true };
  }
  function assignPolier(kolId, pid) { const k = S.kolonnen.find(x => x.id === kolId), p = S.workers.find(x => x.id === pid); if (!k || !p || p.role !== 'polier') return { ok: false }; if (S.kolonnen.filter(o => o.polier === pid).length >= 2 && k.polier !== pid) return { ok: false, msg: 'Ein Polier führt höchstens 2 Kolonnen.' }; k.polier = pid; return { ok: true }; }

  // ---------- Lohnarbeit ----------
  function genLohnOffer() {
    const n = chance(.65) ? 3 : 2, wk = ri(...BAL.lohn.weeks), f = rr(...BAL.lohn.rateVar);
    S.lohnOffers.push({ id: uid(), firm: pick(BAL.lohn.firms), n, weeks: wk, f: R2(f), maurer: roundTo(BAL.lohn.maurer * f, 2), helfer: roundTo(BAL.lohn.helfer * f, 2), expires: S.week + ri(4, 8) });
  }
  const lohnRate = (o, w) => w.role === 'helfer' ? o.helfer : w.role === 'azubi' ? roundTo(BAL.lohn.azubi * o.f, 2) : o.maurer;
  function lohnWeekly(o, k) { return membersOf(k).filter(w => !isSick(w)).reduce((a, w) => a + BAL.hoursPerWeek * lohnRate(o, w), 0); }
  function acceptLohn(offerId, kolId) {
    const o = S.lohnOffers.find(x => x.id === offerId), k = S.kolonnen.find(x => x.id === kolId);
    if (!o || !k) return { ok: false, msg: 'Nicht gefunden.' };
    if (!kolonneFree(k)) return { ok: false, msg: k.name + ' ist gerade beschäftigt.' };
    const ms = membersOf(k).filter(w => !isSick(w)); if (ms.length < o.n) return { ok: false, msg: `Es werden ${o.n} Leute gebraucht, ${k.name} hat ${ms.length}.` };
    k.work = { type: 'lohn', firm: o.firm, left: o.weeks, offer: o };
    S.lohnOffers = S.lohnOffers.filter(x => x !== o); S.visits.push({ who: 'polier', txt: 'Polier von ' + o.firm + ' holt die Kolonne ab' });
    toast(`${k.name} arbeitet jetzt bei ${o.firm} (${o.weeks} Wochen).`, 'good'); emit('sfx', { s: 'ok' }); if (S.goal === 'lohn') S.goal = 'play';
    return { ok: true };
  }

  // ---------- Ausschreibungen ----------
  function genTender(typeId) {
    const T = BAL.tenders[typeId], mfh = typeId === 'mfh';
    const lv = [];
    T.pos.forEach(([pid, q]) => lv.push({ pid, qty: q[0] === q[1] ? q[0] : ri(q[0], q[1]) }));
    const hid = { k: {}, aufw: {}, mat: {}, ep: {} };
    let market = 0, hours = 0;
    lv.forEach(l => { const P = BAL.pos[l.pid]; hid.ep[l.pid] = P.ep * rr(.96, 1.04); hid.aufw[l.pid] = rr(...BAL.real.aufwand); hid.mat[l.pid] = rr(...BAL.real.material); market += l.qty * hid.ep[l.pid]; hours += l.qty * P.aufw * hid.aufw[l.pid]; });
    const q = pid => (lv.find(l => l.pid === pid) || { qty: 0 }).qty;
    const blocks = {
      kran:    { n: 'Mobilkran (für die Decken)', need: !!T.kran, cost: T.kran ? Math.ceil((q('egdecke') + q('kdecke') + q('ogdecke')) / 45) * BAL.rent.mobilkranDay * (mfh ? 1.6 : 1) : 0, typical: 3000, hint: 'Die Deckenplatten müssen mit dem Kran gesetzt werden.' },
      entsorg: { n: 'Entsorgung / Container', need: !!T.entsorg, cost: T.entsorg ? ri(...BAL.rent.entsorgung) : 0, typical: 1200, hint: 'Bauschutt und Abfall müssen abgefahren werden.' },
      fuhr:    { n: 'Fuhrpark & Kleingerät', need: true, cost: 0, typical: 0, hint: 'Transporter, Diesel, Kleingerät über die Bauzeit.' }
    };
    const wks = hours / (BAL.hoursPerWeek * 3 * .93); blocks.fuhr.cost = R(wks * BAL.rent.fuhrWeek * (T.needK || 1)); blocks.fuhr.typical = blocks.fuhr.cost;
    let needCost = 0; Object.values(blocks).forEach(b => { if (b.need) needCost += b.cost; });
    const awG = (v => roundTo(v, v < 20000 ? 100 : 500))((market + needCost * 1.1) * rr(...BAL.real.auftragswert) * BAL.mwst), auftragswert = awG / BAL.mwst;
    const skills = new Set(T.needSkills || []); lv.forEach(l => { const s = BAL.pos[l.pid].skill; if (s) skills.add(s); });
    if (typeId !== 'mfh' && typeId !== 'efh' && typeId !== 'efhk') { /* kleine Aufträge: nur mauern */ }
    const job = { id: uid(), kind: 'tender', type: typeId, title: T.n, txt: T.txt, client: pick(BAUHERREN), state: 'offen', posted: S.week, expires: S.week + ri(...BAL.calc.tenderLife),
      lv, blocks, auftragswert, awG, hours: R(hours), done: 0, needK: T.needK, needSkills: [...skills], hid, bid: null, calc: null, costs: { lohn: 0, mat: 0, geraet: 0, neben: 0, fix: 0 }, matTotal: 0, paid: {}, kol: [], nachtrag: 0 };
    job.matTotal = lv.reduce((a, l) => a + l.qty * BAL.pos[l.pid].ep * BAL.pos[l.pid].mat * hid.mat[l.pid], 0);
    return job;
  }
  function tenderTypes() {
    const out = [];
    for (const id in BAL.tenders) { const T = BAL.tenders[id]; if (S.stage >= T.minStage && S.ruf >= T.ruf) out.push([id, T.w]); }
    return out;
  }
  function maybeNewTender() {
    if (S.week < BAL.tendersUnlockWeek) return;
    const open = S.tenders.filter(t => t.state === 'offen').length;
    const p = (.75 + (hasRole("akquise") ? .25 : 0) + S.stage * .05) * (open >= 5 ? 0 : 1);
    if (!S.flags.firstTender || chance(p)) {
      const tt = tenderTypes(); if (!tt.length) return;
      const first = !S.flags.firstTender; const t = genTender(first ? 'garten' : wpick(tt)); S.tenders.push(t);
      if (first) { S.flags.firstTender = true; if (S.goal !== 'hire') S.goal = 'bid'; S.inbox.push({ id: uid(), kind: 'info', icon: 'clip', title: 'Erste Ausschreibung!', text: 'Ein Bauherr sucht jemanden für eine ' + t.title + '. Du kannst ein eigenes <b>Angebot</b> abgeben: Menü → Ausschreibungen.<br><br>Je genauer du rechnest, desto besser. Lohn ist nicht nur der Stundenlohn, und im Leistungsverzeichnis steht nicht alles.' }); }
      else toast('Neue Ausschreibung: ' + t.title, 'info');
    }
  }
  // Kalkulations-Streuung (Kalkulator-Skill senkt die Fehlerquote)
  function calcSpread() {
    const C = BAL.calc; let s = Math.max(C.spreadMin, C.spreadStart - C.spreadPerAuftrag * S.calcXp);
    const k = S.office.find(w => w.role === 'kalk'); if (k) s = Math.max(.03, C.spreadKalk - C.spreadKalkPerSkill * stat(k, 'tempo'));
    if (S.deko.plotter) s = Math.max(.03, s - C.plotterBonus);
    return s;
  }
  function openCalc(job) {
    if (job.calc) return job.calc; const sp = calcSpread(), C = { spread: sp, lines: {}, blocks: {} };
    job.lv.forEach(l => { const P = BAL.pos[l.pid]; C.lines[l.pid] = { eh: l.qty * P.aufw * (1 + rr(-sp, sp)), em: l.qty * P.ep * P.mat * (1 + rr(-sp / 2, sp / 2)) * S.matIdx }; });
    for (const k in job.blocks) { const b = job.blocks[k]; C.blocks[k] = nice((b.need ? b.cost : b.typical) * (b.need ? (1 + rr(-sp, sp)) : 1)); }
    job.calc = C; job.bid = { adjG: {}, neben: false, blocks: {}, agk: BAL.calc.agk[2], wagnis: BAL.calc.wagnis[2], gewinn: BAL.calc.gewinn[2], fine: 0 }; return C;
  }
  function autoEP(job, pid) {
    const b = job.bid, c = job.calc.lines[pid], l = job.lv.find(x => x.pid === pid);
    const wage = BAL.calc.mittellohnBrutto * (b.neben ? BAL.calc.nebenkosten : 1);
    return (c.eh * wage + c.em) / l.qty * (1 + b.agk + b.wagnis + b.gewinn) * (1 + (b.fine || 0));
  }
  // Brutto-Preis je Einheit (gerundet) = automatischer Vorschlag + Aufschlag des Spielers in festen Euro-Schritten
  function epGross(job, pid) { const auto = autoEP(job, pid) * BAL.mwst; return Math.max(5, roundTo(auto, epStep(auto)) + ((job.bid.adjG || {})[pid] || 0)); }
  function quote(job) {
    const b = job.bid, lines = []; let lvSum = 0, estLohn = 0, estMat = 0;
    const wage = BAL.calc.mittellohnBrutto * (b.neben ? BAL.calc.nebenkosten : 1);
    job.lv.forEach(l => { const c = job.calc.lines[l.pid], ep = epGross(job, l.pid), tot = ep * l.qty; lines.push({ pid: l.pid, qty: l.qty, ep, tot }); lvSum += tot; estLohn += c.eh * wage; estMat += c.em; });
    const mk = (1 + b.agk + b.wagnis + b.gewinn) * (1 + (b.fine || 0)); let blk = 0, estBlk = 0; const blkLines = {};
    for (const k in b.blocks) if (b.blocks[k]) { blkLines[k] = nice(job.calc.blocks[k] * mk * BAL.mwst); blk += blkLines[k]; estBlk += job.calc.blocks[k]; }
    const total = roundTo(lvSum + blk, 100), pct = total / (job.awG || job.auftragswert * BAL.mwst), totalNet = total / BAL.mwst;
    return { lines, blkLines, lvSum, blk, total, totalNet, pct, estLohn: R(estLohn), estMat: R(estMat), estBlk, estSelf: R(estLohn + estMat + estBlk), mk };
  }
  function submitBid(jobId) {
    const job = S.tenders.find(t => t.id === jobId); if (!job || job.state !== 'offen') return { ok: false };
    const q = quote(job); job.state = 'geboten'; job.quote = q; job.bidWeek = S.week;
    S.bids.push({ jobId, due: S.week + BAL.calc.submissionWeeks }); S.stats.bids++;
    toast('Angebot abgegeben. Submission in ' + BAL.calc.submissionWeeks + ' Wochen.', 'info'); if (S.goal === 'bid') S.goal = 'play2';
    return { ok: true, quote: q };
  }
  function resolveBid(b) {
    const job = S.tenders.find(t => t.id === b.jobId); if (!job) return;
    const q = job.quote, nR = S.stage >= 3 ? 4 : 3, rivals = BAL.rivals.slice(0, nR).map(r => ({ n: r.n, pct: R2(clamp(r.mean + gauss() * r.sd, .72, 1.25) * 100) / 100 }));
    const eff = q.pct * (1 - S.ruf * BAL.rufPrice - (S.deko.pokal ? .005 : 0));
    const best = Math.min(...rivals.map(r => r.pct));
    const won = q.pct <= BAL.zone.tooHigh && eff < best;
    const ranking = rivals.concat([{ n: S.firma, pct: R2(q.pct), you: true }]).sort((a, b) => a.pct - b.pct);
    S.calcXp++;
    const res = { id: uid(), kind: 'submission', jobId: job.id, title: job.title, won, pct: q.pct, ranking, total: q.total, value: job.awG || R(job.auftragswert * BAL.mwst), best };
    if (won) {
      job.state = 'zugesagt'; job.sum = R(q.totalNet ?? q.total); job.sumG = q.total; job.startBy = S.week + BAL.calc.startWindow; S.stats.wins++; job.client = job.client;
      S.visits.push({ who: 'polier', txt: 'Zuschlag! Bauherr kommt vorbei' });
      if (job.sum > 50000 && chance(.4) && !S.ev.cousin) S.pending.push({ at: S.week + 1, ev: 'cousin', jobId: job.id });
    } else { job.state = 'abgelehnt'; S.tenders = S.tenders.filter(t => t !== job); }
    S.inbox.push(res); emit('sfx', { s: won ? 'win' : 'lose' });
  }
  function assignJob(jobId, kolIds) {
    const job = S.jobs.find(j => j.id === jobId) || S.tenders.find(t => t.id === jobId); if (!job || job.state !== 'zugesagt') return { ok: false, msg: 'Nicht startbereit.' };
    const ks = kolIds.map(id => S.kolonnen.find(k => k.id === id)).filter(Boolean);
    if (ks.length < job.needK) return { ok: false, msg: `Dieses Projekt braucht mindestens ${job.needK} Kolonne(n).` };
    if (ks.some(k => !kolonneFree(k))) return { ok: false, msg: 'Eine Kolonne ist beschäftigt.' };
    if (ks.some(k => membersOf(k).length < 2)) return { ok: false, msg: 'Jede Kolonne braucht mindestens 2 Leute.' };
    const sk = new Set(); ks.forEach(k => kolSkills(k).forEach(x => sk.add(x)));
    const miss = job.needSkills.filter(s => !sk.has(s) && !(s === 'kran' && S.geraete.turmkran));
    if (miss.length) return { ok: false, msg: 'Es fehlt: ' + miss.map(skillName).join(', ') + '. Stelle passende Leute ein (Kolonne).' };
    job.state = 'läuft'; job.startedWeek = S.week; job.kol = ks.map(k => k.id); ks.forEach(k => k.work = { type: 'job', id: job.id });
    S.tenders = S.tenders.filter(t => t !== job); S.jobs.push(job); if (!S.flags.firstJob) { S.flags.firstJob = true; if (S.goal !== 'hire') S.goal = 'stage2'; }
    S.visits.push({ who: 'handwerker', txt: 'Los geht\'s: ' + job.title }); toast('Baustart: ' + job.title, 'good'); emit('sfx', { s: 'ok' }); return { ok: true };
  }
  const skillName = s => ({ mauern: 'Maurer', beton: 'Betonbauer', bewehren: 'Eisenflechter', bagger: 'Baggerfahrer', kran: 'Kranfahrer' }[s] || s);

  // ---------- Wetter & Ereignisse ----------
  function rollWeather() {
    const d = dateOf(S.week), W = BAL.weather; let kind = 'ok', m = 1;
    const winter = W.winterMonths.includes(d.m);
    if (winter && chance(d.m === 1 || d.m === 2 ? .26 : .12)) { kind = 'frost'; m = 0; }
    else if (chance(.10)) { kind = 'regen'; m = W.regen; }
    else if (chance(.03)) { kind = 'sturm'; m = 0; }
    else if ([6, 7, 8].includes(d.m) && chance(.12)) { kind = 'hitze'; m = W.hitze; }
    S.weather = { kind, m };
    if (kind !== 'ok') log({ frost: 'Frostwoche: Mauern und Betonieren ruhen.', regen: 'Regenwoche: nur 65 % Leistung.', sturm: 'Sturm: Arbeitsstopp.', hitze: 'Hitzewelle: Leistung sinkt.' }[kind]);
  }
  const EVENTS = {
    stahl:   { w: 6, ok: () => S.matIdxUntil < S.week, run() { S.matIdx = 1.12; S.matIdxUntil = S.week + 8; return { icon: 'warn', title: 'Stahlpreis +20 %', text: 'Der Stahlpreis ist gesprungen. Material wird für ca. 8 Wochen rund 12 % teurer. Auch deine Kalkulationen sind betroffen.' }; } },
    bg:      { w: 2.5, ok: () => S.stage >= 2 && S.week > 40 && S.week - (S.ev.bgLast || -99) > 35 && S.jobs.length + S.kolonnen.filter(k => k.work).length > 0, run() { S.ev.bgLast = S.week; if (hasRole('sifa')) { S.ruf = Math.min(100, S.ruf + 1); return { icon: 'star', title: 'BG-Kontrolle bestanden', text: 'Die Berufsgenossenschaft kontrolliert die Baustellen. Dank deiner Sicherheitsfachkraft gibt es keine Beanstandung. Ruf +1.' }; } S.ev.bgLast = S.week; const f = roundTo(ri(800, 2500), 100); money(-f, 'Bußgeld'); return { icon: 'warn', title: 'BG-Kontrolle: Bußgeld', text: `Fehlende Schutzausrüstung auf der Baustelle: <b>${f.toLocaleString('de-DE')} €</b> Bußgeld. Eine Sicherheitsfachkraft hätte das verhindert.` }; } },
    aender:  { w: 7, ok: () => S.jobs.length > 0, run() { const j = pick(S.jobs); const val = roundTo(j.sum * rr(.03, .06), 100); if (hasRole('bauleiter')) { j.nachtrag += val; return { icon: 'clip', title: 'Bauherr ändert alles', text: `${j.client} will bei „${j.title}" Änderungen. Dein Bauleiter schreibt sofort einen <b>Nachtrag</b>: +${val.toLocaleString('de-DE')} € extra.` }; } return { icon: 'clip', title: 'Bauherr ändert alles', text: `${j.client} will bei „${j.title}" Änderungen. Was tust du? Ohne Bauleiter ist ein Nachtrag riskant.`, choices: [{ t: 'Nachtrag anmelden (50 %)', act: 'nachtrag', arg: { id: j.id, val } }, { t: 'Einfach machen', act: 'umsonst', arg: { id: j.id } }] }; } },
    poachPolier: { w: 3, ok: () => S.workers.some(w => w.role === 'polier'), run() { const p = pick(S.workers.filter(w => w.role === 'polier')); return { icon: 'warn', title: 'Rivale wirbt Polier ab', text: `Ein Konkurrent will ${p.name} abwerben. Mit +10 % Gehalt bleibt er.`, choices: [{ t: 'Gehalt +10 %', act: 'raise', arg: { id: p.id } }, { t: 'Gehen lassen', act: 'letgo', arg: { id: p.id } }] }; } },
    sick:    { w: 8, ok: () => S.workers.length > 0, run() { const w = pick(S.workers.filter(x => !BAL.roles[x.role].office)); if (!w) return null; const wk = ri(1, 3); w.sickUntil = S.week + wk; return { icon: 'warn', title: 'Krankmeldung', text: `${w.name} ist ${wk} Woche(n) krank.` }; } },
    richtfest:{ w: 0, ok: () => false, run() { return null; } },
    meister: { w: 2, ok: () => S.stage >= 2 && !S.ev.meister, run() { S.ev.meister = 1; const c = rollCandidate('baustelle'); c.role = 'maurer'; c.name = 'Alter Meister Heinz'; c.nat = 'DE'; c.tempo = 9; c.qual = 9; c.aus = 6; c.monthly = 9500; c.meister = true; c.retireAt = S.week + 40; c.trait = 'Erfahrung'; return { icon: 'star', title: 'Der alte Meister', text: 'Ein Maurermeister kurz vor der Rente (Tempo 9, Qualität 9) bietet sich an. Er bleibt nur etwa 40 Wochen, kostet <b>9.500 €</b> im Monat. Ein freier Platz in einer Kolonne wird gebraucht.', choices: [{ t: 'Einstellen', act: 'hireCand', arg: { c } }, { t: 'Nein danke', act: 'none' }] }; } },
    rufbonus:{ w: 3, ok: () => S.stats.jobs > 0, run() { S.ruf = Math.min(100, S.ruf + 1); return { icon: 'star', title: 'Weiterempfehlung', text: 'Ein zufriedener Bauherr empfiehlt dich weiter. Ruf +1.' }; } },
    mahnung: { w: 3, ok: () => S.stage >= 2 && !hasRole('buero') && S.week > 20, run() { money(-450, 'Mahngebühr'); return { icon: 'warn', title: 'Mahnung vom Finanzamt', text: 'Eine Meldung ging im Papierkram unter: <b>450 €</b> Säumniszuschlag. Eine Bürokraft würde sowas abfangen.' }; } },
    boerse:  { w: 1.5, ok: () => S.ruf >= 30 && !S.ev.koenig, run() { S.ev.koenig = 1; const c = rollCandidate('baustelle'); c.role = 'maurer'; c.name = 'Mauerkönig Jens'; c.nat = 'DE'; c.tempo = 10; c.qual = 9; c.aus = 8; c.monthly = 9300; c.trait = 'Schnelle Hände'; return { icon: 'star', title: 'Talent auf der Jobbörse', text: 'Ein legendärer Maurer („Mauerkönig") ist auf Jobsuche: Tempo 10, Qualität 9. Gehalt <b>9.300 €</b> im Monat.', choices: [{ t: 'Einstellen', act: 'hireCand', arg: { c } }, { t: 'Zu teuer', act: 'none' }] }; } },
    hitze:   { w: 0, ok: () => false, run() { return null; } }
  };
  function rollEvent() {
    if (!chance(BAL.events.perWeek) || S.week < 6) return;
    const tbl = Object.entries(EVENTS).filter(([k, e]) => e.w > 0 && e.ok()).map(([k, e]) => [k, e.w]); if (!tbl.length) return;
    const k = wpick(tbl), ev = EVENTS[k].run(); if (!ev) return;
    S.inbox.push(Object.assign({ id: uid(), kind: 'event', key: k }, ev));
  }
  function resolveChoice(item, idx) {
    const ch = item.choices && item.choices[idx]; if (!ch) return;
    const a = ch.arg || {};
    switch (ch.act) {
      case 'nachtrag': { const j = S.jobs.find(x => x.id === a.id); if (j) { if (chance(.5)) { j.nachtrag += a.val; toast(`Nachtrag genehmigt: +${a.val.toLocaleString('de-DE')} €`, 'good'); } else { S.ruf = Math.max(0, S.ruf - 1); toast('Nachtrag abgelehnt, Ruf -1.', 'bad'); } } break; }
      case 'umsonst': { const j = S.jobs.find(x => x.id === a.id); if (j) { j.hours = R(j.hours * 1.03); S.ruf = Math.min(100, S.ruf + 1); toast('Du machst es ohne Nachtrag: mehr Arbeit, Ruf +1.', 'info'); } break; }
      case 'raise': { const w = S.workers.find(x => x.id === a.id); if (w) { w.monthly = R(w.monthly * 1.1); toast(w.name + ' bleibt (+10 % Gehalt).', 'good'); } break; }
      case 'letgo': { const w = S.workers.find(x => x.id === a.id); if (w) removeWorker(w.id, 'zur Konkurrenz gewechselt'); S.ruf = Math.max(0, S.ruf - 1); break; }
      case 'hireCand': { const c = a.c, k = S.kolonnen.find(x => x.slots.includes(null)); if (!k) { toast('Kein freier Platz in den Kolonnen!', 'bad'); S.inbox.push({ id: uid(), kind: 'info', icon: 'warn', title: 'Kein Platz', text: 'Keine Kolonne hat einen freien Platz. Das Angebot ist weg.' }); break; } const i = k.slots.indexOf(null); S.workers.push(c); k.slots[i] = c.id; c.kolonne = k.id; toast(c.name + ' ist da!', 'good'); break; }
      case 'cousinYes': { const k = S.kolonnen.find(x => x.slots.includes(null)); const c = rollCandidate('baustelle'); c.role = 'helfer'; c.tempo = 3; c.qual = 3; c.aus = 4; c.monthly = 4200; c.name = 'Cousin ' + c.name; c.cousin = true; c.trait = 'Cousin vom Bauherrn'; if (k) { const i = k.slots.indexOf(null); S.workers.push(c); k.slots[i] = c.id; c.kolonne = k.id; toast('Der Cousin fängt an. Billig, aber... na ja.', 'info'); } else toast('Kein Platz frei. Bauherr ist sauer: Ruf -2.', 'bad'), S.ruf = Math.max(0, S.ruf - 2); break; }
      case 'cousinNo': S.ruf = Math.max(0, S.ruf - 3); toast('Der Bauherr ist beleidigt: Ruf -3.', 'bad'); break;
      case 'party': { if (S.cash >= 600) { money(-600, 'Richtfest'); S.workers.forEach(w => w.laune = Math.min(100, (w.laune || 70) + 20)); S.ruf = Math.min(100, S.ruf + 2); toast('Richtfest! Laune und Ruf steigen.', 'good'); emit('sfx', { s: 'win' }); } break; }
      case 'pruefung': { const w = S.workers.find(x => x.id === a.id); if (w) { w.role = 'maurer'; w.monthly = 6800; w.tempo = Math.min(10, w.tempo + 2); w.qual = Math.min(10, w.qual + 2); w.aus = Math.min(10, w.aus + 1); w.lehrjahr = 0; toast(w.name + ' ist jetzt Geselle!', 'good'); } break; }
    }
  }
  function resolveInbox(id, choiceIdx) {
    const i = S.inbox.findIndex(x => x.id === id); if (i < 0) return; const it = S.inbox[i];
    S.inbox.splice(i, 1); if (it.choices) resolveChoice(it, choiceIdx || 0);
  }
  function runPending() {
    S.pending = S.pending.filter(p => {
      if (p.at > S.week) return true;
      if (p.ev === 'cousin') { S.ev.cousin = 1; S.inbox.push({ id: uid(), kind: 'event', icon: 'warn', title: 'Der Cousin vom Bauherrn', text: 'Der Bauherr möchte, dass sein Cousin auf der Baustelle mitarbeitet („der kann das schon!"). Er ist billig, aber er kann wenig (Tempo 3, Qualität 3).', choices: [{ t: 'Einstellen', act: 'cousinYes' }, { t: 'Ablehnen (Ruf -3)', act: 'cousinNo' }] }); }
      if (p.ev === 'maengel') { const j = p.job; const c = roundTo(j.sum * rr(...BAL.maengel.cost), 100); money(-c, 'Mängelbeseitigung'); S.ruf = Math.max(0, S.ruf - 2); S.inbox.push({ id: uid(), kind: 'event', icon: 'warn', title: 'Mängelrüge', text: `Der Bauherr von „${j.title}" rügt Mängel. Beseitigung kostet <b>${c.toLocaleString('de-DE')} €</b> (${R(c / j.sum * 1000) / 10} % der Auftragssumme), Ruf -2.` }); }
      return false;
    });
  }

  // ---------- Finanzen ----------
  const vehicleValue = () => S.vehicles.length * BAL.vehicle.transporter.price * .7;
  const geraeteValue = () => Object.keys(S.geraete).reduce((a, k) => a + BAL.geraete[k].price * .7, 0);
  const buildingValue = () => S.stage >= 4 ? BAL.stages[S.stage - 1].cost * .8 : 0;
  const recvTotal = () => S.recv.reduce((a, r) => a + r.amt, 0);
  const equity = () => R(S.cash + vehicleValue() + geraeteValue() + buildingValue() + recvTotal() - S.kredit);
  function umsatzMonat() { const h = S.revHist.slice(-12); return R(h.reduce((a, b) => a + b, 0) / 12 * BAL.weeksPerMonth); }
  function bonitaet() {
    const B = BAL.bonitaet, ek = Math.max(1000, equity());
    return clamp(Math.round(B.base + B.ekLog * Math.log10(ek / 1000) + Math.min(B.umsatzMax, umsatzMonat() / B.umsatzDiv) + S.ruf * B.rufMul - S.kredit * B.kreditMalus), 0, 100);
  }
  const fixedMonth = () => stageDef().fixed;
  const weeklyFixed = () => fixedMonth() / BAL.weeksPerMonth + S.vehicles.length * BAL.vehicle.transporter.weekly + Object.keys(S.geraete).length * 40;
  const weeklyWages = () => S.workers.reduce((a, w) => a + monthlyOf(w), 0) / BAL.weeksPerMonth;
  const creditLimit = () => Math.max(0, roundTo(bonitaet() * BAL.bank.limitPerBon - S.kredit, 500));
  function takeCredit(amt) { if (amt > creditLimit()) return { ok: false, msg: 'Die Bank gibt dir höchstens ' + creditLimit().toLocaleString('de-DE') + ' € mehr.' }; S.kredit += amt; money(amt, 'Kredit'); return { ok: true }; }
  function repayCredit(amt) { amt = Math.min(amt, S.kredit, Math.max(0, S.cash)); if (amt <= 0) return { ok: false }; S.kredit -= amt; money(-amt, 'Tilgung'); return { ok: true }; }
  function upgradeInfo() {
    const nx = BAL.stages[S.stage]; if (!nx) return null;
    const u = umsatzMonat(), ek = equity(), bon = bonitaet(), n = nx.need;
    return { next: nx, umsatz: [u, n.umsatz, u >= n.umsatz], ek: [ek, n.ek, ek >= n.ek], bon: [bon, n.bon, bon >= n.bon], cost: nx.cost, cashOk: S.cash >= nx.cost, canFinance: !!nx.finance, ok: u >= n.umsatz && ek >= n.ek && bon >= n.bon };
  }
  function upgrade(finance) {
    const u = upgradeInfo(); if (!u) return { ok: false, msg: 'Höchste Stufe erreicht.' }; if (!u.ok) return { ok: false, msg: 'Schwellen noch nicht erreicht.' };
    let pay = u.cost;
    if (S.cash < pay) { if (finance && u.canFinance) { const need = pay - S.cash; if (need > creditLimit() + 0) return { ok: false, msg: 'Bank gibt dafür nicht genug Kredit. Bonität steigern!' }; S.kredit += pay - Math.max(0, S.cash); S.cash += pay - Math.max(0, S.cash); } else return { ok: false, msg: 'Zu wenig Geld (' + pay.toLocaleString('de-DE') + ' € nötig).' }; }
    S.cash -= pay; S.stage++; emit('money', { amt: -pay, label: 'Ausbau' }); S.flags.stageNotified = S.stage;
    S.inbox.push({ id: uid(), kind: 'stage', stage: S.stage, title: 'Neue Büro-Stufe!', text: `<b>${BAL.stages[S.stage - 1].n}</b>. Fixkosten jetzt ${BAL.stages[S.stage - 1].fixed.toLocaleString('de-DE')} € im Monat. Bis zu ${BAL.stages[S.stage - 1].kol} Kolonnen und ${BAL.stages[S.stage - 1].desks} Büroplätze.` });
    emit('sfx', { s: 'level' }); S.visits.push({ who: 'polier', txt: 'Neues Büro! Glückwunsch!' }); if (S.goal === 'stage2' && S.stage >= 2) S.goal = 'free';
    return { ok: true };
  }
  function buyGear(id) {
    const g = BAL.geraete[id]; if (!g || S.geraete[id]) return { ok: false }; if (S.stage < g.stage) return { ok: false, msg: 'Erst ab Büro-Stufe ' + g.stage };
    if (S.cash < g.price) return { ok: false, msg: 'Zu wenig Geld.' }; money(-g.price, g.n); S.geraete[id] = 1; toast(g.n + ' gekauft.', 'good'); return { ok: true };
  }
  function buyDeko(id) {
    const d = BAL.deko[id]; if (!d || S.deko[id]) return { ok: false }; if (d.stage && S.stage < d.stage) return { ok: false, msg: 'Erst ab Büro-Stufe ' + d.stage };
    if (S.cash < d.price) return { ok: false, msg: 'Zu wenig Geld.' }; money(-d.price, d.n); S.deko[id] = 1; toast(d.n + ' aufgestellt.', 'good'); emit('sfx', { s: 'ok' }); return { ok: true };
  }
  function buyPack(flag) { S.pack = true; S.flag = flag || S.flag || 'DE'; S.filter = null; toast('Nationalitäten-Paket freigeschaltet (Test-Kauf).', 'good'); emit('sfx', { s: 'win' }); return { ok: true }; }
  function setFlag(k) { if (!S.pack || !NAT[k]) return { ok: false }; S.flag = k; return { ok: true }; }
  function setFilter(k) { if (!S.pack) return { ok: false }; S.filter = k || null; return { ok: true }; }

  // ---------- Wochenschritt ----------
  function step() {
    if (S.gameOver) return;
    S.week++; const d = dateOf(S.week); let earned = 0;
    rollWeather(); const W = S.weather;
    if (S.matIdxUntil && S.matIdxUntil <= S.week) { S.matIdx = 1; S.matIdxUntil = 0; log('Stahlpreis normalisiert.'); }
    // Mitarbeiter
    S.workers.slice().forEach(w => {
      if (BAL.roles[w.role].office) return;
      w.laune = clamp((w.laune || 70) + (S.deko.kaffee ? .8 : -.2) + (S.deko.hund ? .6 : 0) + (w.trait === 'Sturkopf' ? -.4 : 0) + (S.pack && S.flag === w.nat ? .5 : 0) + rr(-1.5, 1.5), 0, 100);
      if (!isSick(w) && chance(.008 + (10 - w.aus) * .002 * (w.trait === 'Ausdauernd' ? .5 : 1))) { w.sickUntil = S.week + ri(1, 2); }
      if (w.role === 'azubi' && S.week - w.since >= BAL.azubiWeeksPerYear * ((w.lehrjahr || 0) + 1)) {
        if ((w.lehrjahr || 0) >= 2) { S.inbox.push({ id: uid(), kind: 'event', icon: 'star', title: 'Gesellenprüfung!', text: `${w.name} besteht die Prüfung als Maurer mit Bestnote. Ein Star-Maurer ist geboren!`, choices: [{ t: 'Als Geselle übernehmen', act: 'pruefung', arg: { id: w.id } }] }); w.since = S.week + 999; }
        else { w.lehrjahr = (w.lehrjahr || 0) + 1; w.monthly = BAL.azubiMonthly[w.lehrjahr]; w.tempo = Math.min(10, w.tempo + 1); w.qual = Math.min(10, w.qual + 1); log(w.name + ' ist jetzt im ' + (w.lehrjahr + 1) + '. Lehrjahr.'); }
      }
      if (w.retireAt && S.week >= w.retireAt) { removeWorker(w.id, 'Ruhestand'); S.inbox.push({ id: uid(), kind: 'info', icon: 'star', title: 'Ruhestand', text: `${w.name} geht in Rente. Danke für alles!` }); }
      else if (w.laune < 12 && chance(.15)) { removeWorker(w.id, 'hat gekündigt (Laune im Keller)'); toast(w.name + ' hat gekündigt!', 'bad'); }
    });
    // Arbeit
    const winterGear = !!S.geraete.winter, frost = W.kind === 'frost';
    S.kolonnen.forEach(k => {
      if (!k.work) return;
      const cost = kolWeeklyCost(k), mem = membersOf(k);
      if (k.work.type === 'lohn') {
        const o = k.work.offer; let inc = lohnWeekly(o, k);
        money(inc, 'Lohnarbeit', false); earned += inc; S.stats.lohnWeeks++; k.work.left--;
        emit('money', { amt: inc, label: 'Lohnarbeit ' + o.firm });
        if (k.work.left <= 0) { toast(`${k.name}: Lohnarbeit bei ${o.firm} beendet.`, 'info'); k.work = null; S.visits.push({ who: 'polier', txt: 'Lohnarbeit fertig' }); }
      } else {
        const j = S.jobs.find(x => x.id === k.work.id); if (!j) { k.work = null; return; }
        let mult = W.m; if (frost && winterGear) mult = 1;
        j._cap = j._cap || {}; const cap = kolCapacity(k).hours * mult * (S.geraete.schalung && j.type !== 'garten' ? 1.06 : 1);
        j._cap[k.id] = cap; j._cost = j._cost || {}; j._cost[k.id] = cost * (frost && winterGear ? 1 + BAL.weather.winterExtra : 1);
        if (frost && !winterGear) { if (isWinter(S.week)) { const kug = cost * BAL.weather.kug; money(kug, 'Kurzarbeitergeld', false); j._cost[k.id] -= kug; } }
      }
    });
    // Aufträge fortschreiben
    S.jobs.slice().forEach(j => {
      const cap = Object.values(j._cap || {}).reduce((a, b) => a + b, 0); j._cap = {};
      const used = Math.min(cap, j.hours - j.done), frac = cap > 0 ? used / cap : 1;
      j.costs.lohn += Object.values(j._cost || {}).reduce((a, b) => a + b, 0) * frac; j._cost = {};
      const prev = j.done / j.hours; j.done = Math.min(j.hours, j.done + cap); const prog = j.done / j.hours;
      const dFrac = prog - prev;
      const mat = j.matTotal * dFrac * S.matIdx * (1 - matDiscount()); money(-mat, 'Material', false); j.costs.mat += mat;
      const gotEarned = j.sum * dFrac; earned += gotEarned;
      const gear = (k, th, base, cb) => { if (!j.paid[k] && prog >= th) { j.paid[k] = 1; const c = cb(base); if (c > 0) { money(-c, k, false); j.costs.geraet += c; } } };
      const rb = j.blocks;
      gear('kran', .6, rb.kran.cost, c => (rb.kran.need && !S.geraete.turmkran) ? c * (hasRole('dispo') ? .8 : 1) : 0);
      if (rb.bagger) gear('bagger', .1, rb.bagger.cost, c => rb.bagger.need ? c : 0); // nur für ältere Spielstände
      gear('entsorg', .9, rb.entsorg.cost, c => rb.entsorg.need ? c : 0);
      if (!j.paid.fuhr) { j.fuhrW = (j.fuhrW || 0) + 1; j.costs.neben += BAL.rent.fuhrWeek * j.kol.length; }
      BAL.pay.abschlaege.forEach((th, i) => { if (!j.paid['a' + i] && prog >= th) { j.paid['a' + i] = 1; S.recv.push({ due: S.week + payDelay(), amt: R(j.sum * BAL.pay.abschlagShare), txt: 'Abschlag ' + (i + 1) + ' ' + j.title }); } });
      if (j.done >= j.hours - .01) finishJob(j);
    });
    S.revHist.push(earned); if (S.revHist.length > 60) S.revHist.shift(); S.earnedTotal += earned;
    // Zahlungseingänge
    S.recv = S.recv.filter(r => { if (r.due <= S.week) { money(r.amt, r.txt); return false; } return true; });
    // laufende Kosten
    const wages = weeklyWages(), fix = weeklyFixed(); const costs = wages + fix;
    money(-costs, 'Löhne + Fixkosten', false); emit('money', { amt: -R(costs), label: 'Löhne & Fixkosten', quiet: true });
    if (S.kredit > 0) money(-S.kredit * BAL.bank.zinsWeek, 'Zinsen', false);
    if (S.cash < 0) { money(S.cash * BAL.bank.overdraftWeek, 'Überziehungszinsen', false); }
    // Lohn-Angebote & Ausschreibungen
    S.lohnOffers = S.lohnOffers.filter(o => o.expires > S.week); while (S.lohnOffers.length < 3 + (S.stage >= 3 ? 1 : 0)) genLohnOffer();
    S.tenders.forEach(t => { if (t.state === 'offen' && t.expires <= S.week) { t.state = 'weg'; log('Ausschreibung abgelaufen: ' + t.title); } });
    S.tenders = S.tenders.filter(t => t.state !== 'weg');
    S.tenders.filter(t => t.state === 'zugesagt' && t.startBy < S.week).forEach(t => { const pen = roundTo(t.sum * BAL.calc.vertragsstrafe, 100); money(-pen, 'Vertragsstrafe'); S.ruf = Math.max(0, S.ruf - 3); S.tenders = S.tenders.filter(x => x !== t); S.inbox.push({ id: uid(), kind: 'info', icon: 'warn', title: 'Baustart verpasst', text: `Du hast „${t.title}" nicht rechtzeitig begonnen: Vertragsstrafe <b>${pen.toLocaleString('de-DE')} €</b>, Ruf -3.` }); });
    maybeNewTender();
    S.bids.filter(b => b.due <= S.week).forEach(resolveBid); S.bids = S.bids.filter(b => b.due > S.week);
    rollEvent(); runPending();
    // Stufe-Check
    const ui = upgradeInfo(); if (ui && ui.ok && (S.flags.upgradeHint || 0) < S.stage + 1) { S.flags.upgradeHint = S.stage + 1; S.inbox.push({ id: uid(), kind: 'info', icon: 'home', title: 'Büro ausbauen möglich!', text: `Du erfüllst alle Bedingungen für <b>${ui.next.n}</b> (Kosten ${ui.cost.toLocaleString('de-DE')} €). Menü → Büro.` }); emit('sfx', { s: 'level' }); }
    setGoalAuto();
    // Pleite?
    const lim = BAL.bank.overdraftBase + bonitaet() * BAL.bank.overdraftPerBon;
    if (S.cash < -lim) { S.overdraftWeeks++; if (S.overdraftWeeks === 1) S.inbox.push({ id: uid(), kind: 'info', icon: 'warn', title: 'Konto überzogen!', text: `Die Bank macht Druck: Dein Konto liegt bei ${R(S.cash).toLocaleString('de-DE')} €. Du hast ${BAL.bank.insolvencyWeeks} Wochen, um ins Plus zu kommen (Aufträge annehmen, Leute entlassen, Kredit).` }); if (S.overdraftWeeks >= BAL.bank.insolvencyWeeks && (S.flags.rescue || 0) < S.stage) { S.flags.rescue = S.stage; S.overdraftWeeks = 0; S.kredit += BAL.bank.rescue; S.cash += BAL.bank.rescue; S.ruf = Math.max(0, S.ruf - 3); emit('money', { amt: BAL.bank.rescue, label: 'Überbrückungskredit' }); S.inbox.push({ id: uid(), kind: 'info', icon: 'warn', title: 'Die Bank hilft noch einmal', text: `Deine Hausbank gewährt einen <b>Überbrückungskredit über ${BAL.bank.rescue.toLocaleString('de-DE')} €</b> (Ruf −3). Das gibt es nur einmal pro Büro-Stufe. Jetzt Kosten senken: Leute entlassen, Kolonnen auslasten, nur sichere Aufträge.` }); } else if (S.overdraftWeeks >= BAL.bank.insolvencyWeeks) { S.gameOver = true; S.inbox.push({ id: uid(), kind: 'gameover', title: 'Insolvenz', text: 'Die Bank dreht den Geldhahn zu. Die Firma ist pleite. Nächster Versuch?' }); } } else S.overdraftWeeks = 0;
    // Jahresabschluss
    if (d.m === 3 && d.wk === 4 && S.flags.yearEnd < d.y) { S.flags.yearEnd = d.y; yearEnd(d.y); }
    emit('week', {});
  }
  const matDiscount = () => { const e = S.office.find(w => w.role === 'einkauf'); return e ? (5 + .5 * stat(e, 'tempo')) / 100 : 0; };
  const payDelay = () => hasRole('buero') ? BAL.pay.delayBuero : BAL.pay.delay;
  function finishJob(j) {
    S.jobs = S.jobs.filter(x => x !== j); S.kolonnen.forEach(k => { if (k.work && k.work.type === 'job' && k.work.id === j.id) k.work = null; });
    const ks = j.kol.map(id => S.kolonnen.find(k => k.id === id)).filter(Boolean), ms = ks.flatMap(membersOf);
    const avgQ = ms.length ? ms.reduce((a, w) => a + stat(w, 'qual'), 0) / ms.length : 5, pol = ks.some(k => polierOf(k));
    const pM = clamp(BAL.maengel.base - BAL.maengel.perQual * avgQ - (pol ? BAL.maengel.polier : 0) - (hasRole('bauleiter') ? BAL.maengel.bauleiter : 0), .02, .6);
    const maengel = chance(pM);
    const rest = R(j.sum * (1 - BAL.pay.abschlagShare * BAL.pay.abschlaege.length)) + R(j.nachtrag); S.recv.push({ due: S.week + payDelay(), amt: rest, txt: 'Schlussrechnung ' + j.title });
    const fixAlloc = R(weeklyFixed() * (S.week - j.startedWeek) / Math.max(1, S.kolonnen.length)); j.costs.fix = fixAlloc;
    const real = { lohn: R(j.costs.lohn), mat: R(j.costs.mat), geraet: R(j.costs.geraet), neben: R(j.costs.neben), fix: fixAlloc };
    const q = j.quote, calc = { lohn: q.estLohn, mat: q.estMat, blk: q.estBlk, ag: R((q.totalNet ?? q.total) - q.estSelf) };
    const revenue = j.sum + R(j.nachtrag); const realTotal = real.lohn + real.mat + real.geraet + real.neben + real.fix;
    const profit = revenue - realTotal, expected = (q.totalNet ?? q.total) - q.estSelf;
    const rufGain = maengel ? 0 : clamp(Math.round(j.sum / 25000) + 1, 1, 6) + (S.deko.tafel ? 1 : 0);
    S.ruf = clamp(S.ruf + rufGain + (maengel ? 0 : 0), 0, 100); S.stats.jobs++; S.stats.profit += profit;
    S.done.push({ title: j.title, sum: revenue, profit, w: S.week, seed: j.id });
    const forgot = []; for (const k in j.blocks) { const b = j.blocks[k]; if (b.need && !j.quote.lines && false) { } }
    const bidBlocks = j.bid.blocks;
    ['kran', 'bagger', 'entsorg'].forEach(k => { const b = j.blocks[k]; if (b && b.need && !bidBlocks[k]) forgot.push({ k, n: b.n, amt: nice(k === 'kran' && S.geraete.turmkran ? 0 : b.cost) }); });
    const hints = [];
    { const be = q.lines.find(l => l.pid.startsWith('be')); if (be) { const P = BAL.pos[be.pid], H = j.hid; const fair = be.qty * (P.aufw * H.aufw[be.pid] * BAL.calc.mittellohnBrutto * BAL.calc.nebenkosten + P.ep * P.mat * H.mat[be.pid]); if (be.tot / BAL.mwst < fair * .9) hints.push('<b>Baustelleneinrichtung</b> zu billig angesetzt: Container, Strom, Zaun und Schilder kosten ca. ' + (Math.round(fair / 100) * 100).toLocaleString('de-DE') + ' €.'); } }
    forgot.filter(f => f.amt > 0).forEach(f => hints.push(`<b>${f.n}</b> vergessen: ${f.amt.toLocaleString('de-DE')} € zahlst du selbst!`));
    if (!j.bid.neben) hints.push('Löhne zu niedrig angesetzt: <b>Lohnnebenkosten (ca. +80 %)</b> nicht eingerechnet.');
    if (real.lohn > calc.lohn * 1.15 && j.bid.neben) hints.push('Die Bauzeit war länger als gedacht (Wetter, Krankheit oder Leistung): Löhne höher als kalkuliert.');
    if (real.mat > calc.mat * 1.08) hints.push('Material war teurer als kalkuliert (Preissteigerung, Verschnitt).');
    if (profit > expected * .9 && profit > 0 && !hints.length) hints.push('Sauber kalkuliert! Fast alles kam so, wie du gerechnet hast.');
    if (profit < 0) hints.push('Verlust! Auch bei einem Zuschlag musst du die Kosten wirklich decken.');
    S.inbox.push({ id: uid(), kind: 'abrechnung', hours: j.hours, weeks: S.week - j.startedWeek, title: j.title, client: j.client, pct: q.pct, revenue, calc, real, profit, expected, maengel, rufGain, hints, nachtrag: R(j.nachtrag), sum: j.sum, qa: R(avgQ * 10) / 10 });
    if (maengel) S.pending.push({ at: S.week + 3, ev: 'maengel', job: { title: j.title, sum: j.sum } });
    if (j.sum >= 60000 && chance(.7)) S.inbox.push({ id: uid(), kind: 'event', icon: 'star', title: 'Richtfest!', text: `„${j.title}" ist fertig. Feiern mit der Mannschaft (600 €): Laune +20, Ruf +2.`, choices: [{ t: 'Richtfest feiern', act: 'party' }, { t: 'Weiter arbeiten', act: 'none' }] });
    S.visits.push({ who: 'polier', txt: 'Baustelle fertig: ' + j.title }); emit('sfx', { s: profit > 0 ? 'win' : 'lose' });
  }
  function yearEnd(y) {
    const prof = S.stats.profit - (S.flags.lastProfit || 0); S.flags.lastProfit = S.stats.profit;
    S.inbox.push({ id: uid(), kind: 'info', icon: 'star', title: 'Jahresabschluss ' + y, text: `Umsatz im letzten Monat: ${roundTo(umsatzMonat(), 100).toLocaleString('de-DE')} €<br>Eigenkapital: <b>${roundTo(equity(), 100).toLocaleString('de-DE')} €</b><br>Ruf: ★ ${R(S.ruf)}<br>Abgeschlossene Projekte: ${S.stats.jobs}<br>Gewinn aus Projekten (Jahr): <b class="${prof >= 0 ? 'pos' : 'neg'}">${R(prof).toLocaleString('de-DE')} €</b><br>${prof > 40000 ? '🏆 Du bist „Baufirma des Jahres"!' : 'Weiter so!'}` });
  }
  function setGoalAuto() {
    // Ziel-Anzeige (Tutorial-Kette)
    const g = S.goal; if (g === 'play' && S.flags.firstTender) S.goal = 'bid'; if (g === 'hire' && S.workers.filter(w => !BAL.roles[w.role].office).length >= 3) S.goal = 'lohn';
  }
  // ---------- Hilfen für UI ----------
  function goalText() {
    const n = S.workers.filter(w => !BAL.roles[w.role].office).length, ui = upgradeInfo();
    switch (S.goal) {
      case 'hire': return `Stelle 3 Mitarbeiter ein (${n}/3)`;
      case 'lohn': return 'Nimm ein Lohnarbeit-Angebot an';
      case 'play': return 'Lass die Wochen laufen: Deine Kolonne verdient Geld';
      case 'bid': return 'Gib dein erstes Angebot ab (Ausschreibungen)';
      case 'play2': return 'Warte auf die Submission (Wochen laufen lassen)';
      case 'stage2': case 'free': default:
        if (!ui) return 'Du hast die Firmenzentrale erreicht! Baue das Imperium aus.';
        return `Ziel: Stufe ${S.stage + 1} · Umsatz ${ui.umsatz[2] ? '✔' : '✖'}  EK ${ui.ek[2] ? '✔' : '✖'}  Bonität ${ui.bon[2] ? '✔' : '✖'}`;
    }
  }
  const api = { roundTo, nice, epStep, epGross, get S() { return S; }, newGame, load, step, hooks, on: fn => hooks.fn = fn, seed: n => _seed = n, rnd, rr, ri, pick, R, R2, clamp,
    dateOf, dateStr, MONTHS, isWinter, stageDef, skillsOf, stat, teamBonus, isSick, roleProd, effOf, monthlyOf, rollCandidate, newCandidate, hire, fire, moveWorker, freeSlots, removeWorker,
    mgmtCap, membersOf, polierOf, kolSkills, kolWeeklyCost, kolCapacity, kolonneFree, addKolonne, assignPolier, acceptLohn, lohnWeekly, lohnRate, genTender, openCalc, autoEP, quote, calcSpread, submitBid, assignJob, skillName,
    resolveInbox, equity, umsatzMonat, bonitaet, weeklyFixed, weeklyWages, creditLimit, takeCredit, repayCredit, upgradeInfo, upgrade, buyGear, buyDeko, buyPack, setFlag, setFilter, goalText, hasRole, matDiscount, payDelay, recvTotal, setGoalAuto, toast, log, natPool };
  return api;
})();
if (typeof module !== 'undefined') module.exports = SIM;
