/* UI: Kairosoft-artige Fenster ueber der Szene. Jedes Fenster ist eine Funktion, die HTML liefert. */
const UI = (() => {
  const $ = s => document.querySelector(s), R = x => Math.round(x);
  const fmt = n => R(n).toLocaleString('de-DE') + ' €';
  const num = n => R(n).toLocaleString('de-DE');
  const pct = x => Math.round(x * 100).toLocaleString('de-DE') + ' %';
  const fmtR = n => fmt(SIM.roundTo(n, 100)), numN = n => num(SIM.nice(n)), round5 = n => SIM.roundTo(n, 5);
  const S = () => SIM.S;
  const U = { cur: null, args: null, wasSpeed: 1, sfxOn: true };
  const flagH = (k, w) => `<span class="flag" style="background:${NAT[k].f};${w ? `width:${w}px;height:${Math.round(w * .68)}px` : ''}"></span>`;
  const win = (title, body, opts) => { opts = opts || {}; return `<div class="win" style="top:${opts.top === undefined ? 44 : opts.top}px">${`<div class="title">${px(title)}${opts.noclose ? '' : '<span class="x" data-act="close">×</span>'}</div>`}<div class="body">${body}</div></div>`; };
  const px = t => String(t).replace(/\s*\(([^)]*)\)/g, ' · $1');
  const btn = (txt, act, data, cls) => `<div class="btn ${cls || ''}" data-act="${act}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${String(v).replace(/"/g, '&quot;')}"`).join(' ')}>${px(txt)}</div>`;
  const stars = n => '★'.repeat(Math.max(0, Math.round(n)));
  const statBar = (lbl, v, cls, bonus) => `<div class="stat"><b>${lbl}</b><div class="sbar"><i class="${cls || ''}" style="width:${v * 10}%"></i></div><span>${v}${bonus ? '<small style="color:#2a8230">+1</small>' : ''}</span></div>`;
  const mini = (l, v, c) => `<span class="m"><b>${l}</b><span class="sbar"><i class="${c}" style="width:${v * 10}%"></i></span><em>${v}</em></span>`;
  const roleIcon = r => ({ buero: 'tisch_5', kalk: 'tisch_1', dispo: 'tisch_3', bauleiter: 'tisch_4' })[r];
  const faceFor = w => (w.role === 'polier' ? 'polier' : w.role === 'azubi' ? 'chef' : w.avatar % 2 ? 'handwerker' : 'chef');
  const portrait = w => {
    const ic = roleIcon(w.role); if (ic) return `<img class="portrait" src="assets/${ic}.png">`;
    return `<img class="portrait" src="assets/walk_${faceFor(w)}_r0.png">`;
  };
  const sick = w => SIM.isSick(w) ? '<span class="pill r">krank</span>' : '';
  const laune = w => (w.laune || 70) > 66 ? '😀' : (w.laune || 70) > 36 ? '😐' : '😠';

  // ---------- Fenster ----------
  const W = {};
  W.intro = () => win('Firma gründen', `
    <div class="row"><img class="portrait" style="width:60px;height:72px" src="assets/walk_chef_r0.png"><div class="txt">Du bist <b>der Chef</b>: ein ganz normaler Maurer mit Helm und großen Plänen. Start im Baucontainer, mit einem Transporter und <b>25.000 €</b>.</div></div>
    <div class="lbl">Dein Name</div><input type="text" id="inName" value="${S() ? S().boss : 'Max Mustermann'}" maxlength="24">
    <div class="lbl">Name deiner Firma</div><input type="text" id="inFirma" value="${S() ? S().firma : 'Rohbau Mustermann'}" maxlength="28">
    <div class="sm mut">Alle Namen im Spiel sind frei erfunden.</div>
    ${btn('Firma gründen!', 'found', null, 'full')}
    ${localStorage.getItem('maurer_tycoon_v1') ? btn('Spielstand laden', 'load', null, 'full blue') : ''}`, { noclose: true, top: 120 });

  W.menu = () => {
    const s = S(), nOffers = s.tenders.filter(t => t.state === 'offen').length, nAuf = s.tenders.filter(t => t.state === 'zugesagt').length + s.jobs.length;
    const it = (ic, lbl, w, badge, hl, lock) => `<div class="it ${hl ? 'hl' : ''} ${lock ? 'lock' : ''}" data-act="open" data-w="${w}"><span style="font-size:30px;line-height:34px">${ic}</span>${lbl}${badge ? `<span class="badge">${badge}</span>` : ''}</div>`;
    const free = SIM.freeSlots().length, ui = SIM.upgradeInfo();
    return win('Menü', `<div class="menu">
      ${it('👷', 'Mitarbeiter', 'staff', free || '', s.goal === 'hire')}
      ${it('🧱', 'Lohnarbeit', 'lohn', s.lohnOffers.length, s.goal === 'lohn')}
      ${it('📋', 'Ausschrei&shy;bungen', 'tender', nOffers || '', s.goal === 'bid', s.week < BAL.tendersUnlockWeek && !s.flags.firstTender)}
      ${it('🏗️', 'Aufträge', 'jobs', nAuf || '', false)}
      ${it('🚚', 'Fuhrpark & Geräte', 'fleet', '', false)}
      ${it('💶', 'Finanzen', 'fin', '', false)}
      ${it('🏢', 'Büro ausbauen', 'office', ui && ui.ok ? '!' : '', ui && ui.ok)}
      ${it('🚩', 'Upgrades', 'nation', s.pack ? '' : '2,99', false)}
      ${it('📰', 'Journal', 'log', '', false)}
      ${it('⚙️', 'System', 'system', '', false)}
    </div>`);
  };

  const slotCard = (k, i) => {
    const id = k.slots[i], w = id && S().workers.find(x => x.id === id);
    if (!w) return `<div class="card" style="display:flex;align-items:center;justify-content:space-between;min-height:56px;border-style:dashed"><span class="mut">Platz ${i + 1} frei</span>${btn('Anwerben', 'hire', { k: k.id, s: i }, 'org sm')}</div>`;
    return workerCard(w);
  };
  const workerCard = w => {
    const R_ = BAL.roles[w.role], tb = SIM.teamBonus(w) ? 1 : 0;
    return `<div class="card" data-act="worker" data-id="${w.id}" style="display:flex;gap:6px;align-items:center;cursor:pointer">${portrait(w)}<div style="flex:1;min-width:0">
      <div class="row2"><span class="t">${w.name} ${flagH(w.nat, 16)}</span><span>${laune(w)}</span></div>
      <div class="sm mut">${R_.n}${w.role === 'azubi' ? ` ${(w.lehrjahr || 0) + 1}. LJ` : ''} · ${fmt(w.monthly)}/Monat ${sick(w)}</div>
      <div class="mini">${mini('T', SIM.stat(w, 'tempo'), '')}${mini('Q', SIM.stat(w, 'qual'), 'q')}${mini('A', SIM.stat(w, 'aus'), 'a')}${tb ? '<small style="color:#2a8230">+1</small>' : ''}</div></div></div>`;
  };
  W.staff = () => {
    const s = S(), tab = U.args.tab || 'kol';
    const kols = s.kolonnen.map(k => {
      const wk = k.work ? (k.work.type === 'lohn' ? `<span class="pill y">Lohnarbeit · ${k.work.left} Wo</span>` : `<span class="pill g">Baustelle</span>`) : '<span class="pill">frei</span>';
      const pol = SIM.polierOf(k);
      const polCard = s.stage >= 2 ? (pol ? workerCard(pol) : `<div class="card" style="display:flex;align-items:center;justify-content:space-between;border-style:dashed"><span class="mut">Polier (+15 %)</span>${btn('Polier suchen', 'hire', { k: k.id, kind: 'polier' }, 'org sm')}</div>`) : '';
      const cap = SIM.kolCapacity(k);
      return `<div class="h">${k.name} ${wk} <span class="mut sm">≈ ${round5(cap.hours)} Std/Woche · Kosten ${fmtR(SIM.kolWeeklyCost(k))}/Wo</span></div>${[0, 1, 2].map(i => slotCard(k, i)).join('')}${polCard}`;
    }).join('');
    const st = SIM.stageDef(), desks = [];
    for (let i = 0; i < st.desks; i++) { const w = s.office[i]; desks.push(w ? workerCard(w) : `<div class="card" style="display:flex;align-items:center;justify-content:space-between;border-style:dashed"><span class="mut">Schreibtisch ${i + 1} frei</span>${btn('Besetzen', 'hire', { kind: 'office' }, 'org sm')}</div>`); }
    const office = st.desks ? desks.join('') : `<div class="card txt">In einem Einzelcontainer ist kein Platz für Büro-Personal. Baue das Büro aus (Menü → Büro ausbauen).</div>`;
    return win('Mitarbeiter', `<div class="tabs"><div class="tab ${tab === 'kol' ? 'on' : ''}" data-act="tab" data-t="kol">Kolonnen</div><div class="tab ${tab === 'off' ? 'on' : ''}" data-act="tab" data-t="off">Büro ${s.office.length}/${st.desks}</div></div>
      ${tab === 'kol' ? `<div class="sm mut">Zufällige Bewerber: Du siehst die Werte erst nach dem Anwerben. T = Tempo, Q = Qualität, A = Ausdauer.</div>${kols}${btn('Neue Kolonne gründen', 'newkol', null, 'blue full')}` : office}`);
  };
  W.hire = () => {
    const s = S(), a = U.args; const c = s.cand && s.cand.c;
    if (!c) return win('Anwerben', '<div class="txt">Kein Bewerber.</div>');
    const R_ = BAL.roles[c.role], tb = SIM.teamBonus(c) ? 1 : 0;
    const filt = s.pack && a.kind !== 'office' ? `<div class="lbl">Region (Nationalitäten-Paket)</div><select data-act="filter">
      <option value="">Alle Länder</option>${GROUPS.map(g => `<option value="${g}" ${s.filter === g ? 'selected' : ''}>Region: ${g}</option>`).join('')}${ALLNAT.map(k => `<option value="${k}" ${s.filter === k ? 'selected' : ''}>${NAT[k].n}</option>`).join('')}</select>` : '';
    const free = a.kind === 'office' ? 0 : s.hiresFree;
    return win('Bewerber', `<div class="card sel" style="display:flex;gap:8px;align-items:center">${portrait(c)}<div style="flex:1"><div class="t" style="font-size:17px">${c.name} ${flagH(c.nat, 22)}</div><div class="txt">${R_.n} · ${NAT[c.nat].n}</div>
      <div class="txt">Gehalt: <b>${fmt(c.monthly)}</b> / Monat</div><div class="sm">Eigenschaft: <b>${c.trait}</b></div></div></div>
      ${statBar('Tempo', SIM.stat(c, 'tempo'), '', tb)}${statBar('Qualität', SIM.stat(c, 'qual'), 'q', tb)}${statBar('Ausdauer', SIM.stat(c, 'aus'), 'a', tb)}
      ${tb ? `<div class="sm pos">Gleiche Herkunft wie deine Büro-Flagge: +1 auf alle Werte (Team-Bonus)</div>` : ''}
      ${R_.skills.length ? `<div class="sm">Kann: ${R_.skills.map(SIM.skillName).join(', ')}</div>` : ''}
      ${filt}
      <div class="dlgbtns">${btn(a.kind === 'office' ? `Einstellen (${fmt(BAL.hireFeeOffice)})` : free ? 'Einstellen (gratis)' : `Einstellen (${fmt(BAL.hireFeeOffice / 2)})`, 'dohire', null, '')}${btn(`Neu würfeln (${fmt(BAL.hireAdCost)})`, 'reroll', null, 'org')}</div>
      ${btn('Abbrechen', 'staffback', null, 'gry full')}`);
  };
  W.worker = () => {
    const w = S().workers.find(x => x.id === U.args.id); if (!w) return W.staff();
    const R_ = BAL.roles[w.role];
    return win(w.name, `<div class="card" style="display:flex;gap:8px">${portrait(w)}<div style="flex:1"><div class="t">${R_.n} ${flagH(w.nat, 20)} ${NAT[w.nat].n}</div><div class="txt">${fmt(w.monthly)} / Monat · Laune ${laune(w)} ${R(w.laune || 70)}%</div><div class="sm">Eigenschaft: ${w.trait}${w.retireAt ? ` · geht in ${Math.max(0, w.retireAt - S().week)} Wochen in Rente` : ''}</div></div></div>
      ${statBar('Tempo', SIM.stat(w, 'tempo'), '', SIM.teamBonus(w))}${statBar('Qualität', SIM.stat(w, 'qual'), 'q', SIM.teamBonus(w))}${statBar('Ausdauer', SIM.stat(w, 'aus'), 'a', SIM.teamBonus(w))}
      <div class="dlgbtns">${btn('Zurück', 'staffback', null, 'blue')}${btn('Kündigen', 'fire', { id: w.id }, 'red')}</div>`);
  };

  W.lohn = () => {
    const s = S(), free = s.kolonnen.filter(SIM.kolonneFree);
    const list = s.lohnOffers.map(o => {
      const k = free[0]; const wk = k ? SIM.lohnWeekly(o, k) : 0;
      return `<div class="card"><div class="row2"><span class="t">${o.firm}</span><span class="pill y">${o.weeks} Wochen</span></div>
      <div class="txt">${o.n} Mann für ${o.weeks} Wochen · Maurer ${o.maurer} €/h, Helfer ${o.helfer} €/h</div>
      <div class="row2"><span class="sm mut">${k ? `≈ ${fmtR(wk)} pro Woche mit ${k.name}` : 'Keine freie Kolonne'}</span>${free.length ? btn(free.length > 1 ? 'Annehmen…' : 'Annehmen', free.length > 1 ? 'lohnpick' : 'lohnyes', { id: o.id, k: free[0].id }, 'sm') : ''}</div></div>`;
    }).join('') || '<div class="txt">Gerade keine Angebote. Kommt bald wieder.</div>';
    return win('Lohnarbeit-Angebote', `<div class="sm mut">Andere Firmen mieten deine Kolonne für einige Wochen. Sicheres Geld pro Stunde, aber kein Ruf. Deine Löhne zahlst du selbst.</div>${list}`);
  };
  W.lohnpick = () => {
    const s = S(), o = s.lohnOffers.find(x => x.id === U.args.id); if (!o) return W.lohn();
    return win('Welche Kolonne?', s.kolonnen.filter(SIM.kolonneFree).map(k => `<div class="card row2"><span class="t">${k.name} (${SIM.membersOf(k).length} Mann)</span>${btn('Schicken', 'lohnyes', { id: o.id, k: k.id }, 'sm')}</div>`).join(''));
  };

  const tenderCard = t => {
    const T = BAL.tenders[t.type], miss = [];
    const sk = new Set(); S().kolonnen.forEach(k => SIM.kolSkills(k).forEach(x => sk.add(x)));
    t.needSkills.forEach(x => { if (!sk.has(x)) miss.push(SIM.skillName(x)); });
    const left = t.expires - S().week;
    let right = '';
    if (t.state === 'offen') right = btn('Angebot…', 'bidopen', { id: t.id }, 'sm');
    else if (t.state === 'geboten') right = '<span class="pill y">Submission läuft</span>';
    return `<div class="card"><div class="row2"><span class="t">${t.title}</span><span class="pill ${left <= 1 ? 'r' : ''}">${t.state === 'offen' ? `noch ${left} Wo` : t.state}</span></div>
      <div class="sm mut">${t.client} (fiktiv) · ${t.txt}</div>
      <div class="sm">${t.lv.length} Positionen · ca. ${num(SIM.roundTo(t.hours, 50))} Arbeitsstunden${t.needK > 1 ? ` · mind. ${t.needK} Kolonnen` : ''}</div>
      ${miss.length ? `<div class="sm neg">Dir fehlt: ${miss.join(', ')}</div>` : ''}
      <div class="row2" style="margin-top:3px"><span class="sm mut">Verdeckter Auftragswert</span>${right}</div></div>`;
  };
  W.tender = () => {
    const s = S(), list = s.tenders.filter(t => t.state === 'offen' || t.state === 'geboten');
    return win('Ausschreibungen', `<div class="sm mut">Du gibst ein Angebot ab. Der Bauherr kennt seinen Auftragswert, du nicht. Der billigste Bieter bekommt den Zuschlag, aber du musst alle Kosten wirklich decken.</div>
      ${s.week < BAL.tendersUnlockWeek && !s.flags.firstTender ? `<div class="card txt">Die ersten Ausschreibungen kommen nach ein paar Wochen Lohnarbeit (ab Woche ${BAL.tendersUnlockWeek}).</div>` : ''}
      ${list.map(tenderCard).join('') || (s.flags.firstTender ? '<div class="txt">Gerade keine offenen Ausschreibungen.</div>' : '')}`);
  };

  W.bid = () => {
    const s = S(), t = s.tenders.find(x => x.id === U.args.id); if (!t) return W.tender();
    const C = SIM.openCalc(t), b = t.bid, q = SIM.quote(t), CF = BAL.calc;
    const exact = SIM.hasRole('kalk') || s.deko.plotter; t.fuzz = t.fuzz === undefined ? (Math.random() - .5) * .08 : t.fuzz;
    const shown = exact ? q.pct : q.pct + t.fuzz, mpos = Math.max(0, Math.min(1, (shown - .7) / .5)) * 100;
    const stp = (lbl, key, val, mn, mx, stepv, fmtf) => `<div class="row2"><span class="txt">${lbl}</span><span class="step"><span class="b" data-act="stepb" data-key="${key}" data-d="${-stepv}">−</span><span class="v">${fmtf ? fmtf(val) : pct(val)}</span><span class="b" data-act="stepb" data-key="${key}" data-d="${stepv}">+</span></span></div>`;
    const rows = q.lines.map(l => { const P = BAL.pos[l.pid]; return `<tr><td style="line-height:15px">${P.n}<br><span class="mut">${num(l.qty)} ${P.u}</span></td><td class="r"><span class="step"><span class="b" data-act="epadj" data-pid="${l.pid}" data-d="-1">−</span><span class="v" style="min-width:48px;font-size:19px">${num(l.ep)}</span><span class="b" data-act="epadj" data-pid="${l.pid}" data-d="1">+</span></span></td><td class="r">${num(SIM.roundTo(l.tot, 10))}</td></tr>`; }).join('');
    const blocks = Object.keys(t.blocks).map(k => { const bl = t.blocks[k]; return `<div class="chk ${b.blocks[k] ? 'on' : ''}" data-act="blk" data-k="${k}"><i>${b.blocks[k] ? '✓' : ''}</i><div style="flex:1"><div class="txt">${bl.n}</div><div class="sm mut">${bl.hint}</div></div><b>${fmt(SIM.nice(C.blocks[k] * q.mk * BAL.mwst))}</b></div>`; }).join('');
    const zone = q.pct > BAL.zone.tooHigh ? ['r', 'Viel zu teuer: der Bauherr lehnt ab'] : q.pct > 1.03 ? ['y', 'Eher zu teuer'] : q.pct >= BAL.zone.best[0] ? ['g', 'Zuschlag-Bereich'] : q.pct >= BAL.zone.lowRisk ? ['y', 'Sehr billig: Zuschlag, aber knapp'] : ['r', 'Dumping: Zuschlag, aber Verlustgefahr'];
    return win('Angebot ausfüllen', `<div class="card"><div class="t">${t.title}</div><div class="sm mut">${t.client} (fiktiv) · ${t.txt}</div></div>
      <div class="sm mut">Deine Schätzung ist etwa ±${R(C.spread * 100)} % genau${SIM.hasRole('kalk') ? ' (Kalkulator)' : ''}. Alle Preise sind brutto (mit 19 % MwSt.). Der Vorschlag ergibt sich aus deiner Kalkulation: Aufwand × Lohn + Material + Aufschläge. Mit + und − änderst du den Preis in festen Schritten.</div>
      <div class="h">1 · Lohn und Aufschläge</div>
      <div class="chk ${b.neben ? 'on' : ''}" data-act="neben"><i>${b.neben ? '✓' : ''}</i><div style="flex:1"><div class="txt">Lohnnebenkosten einrechnen</div><div class="sm mut">Lohn ${CF.mittellohnBrutto} €/h${b.neben ? ` plus ${R((CF.nebenkosten - 1) * 100)} % Nebenkosten (Sozialabgaben, Urlaubskasse, Berufsgenossenschaft) = ca. ${R(CF.mittellohnBrutto * CF.nebenkosten)} €/h` : ' (ohne Nebenkosten)'}</div></div></div>
      ${stp('Allg. Geschäftskosten', 'agk', b.agk, CF.agk[0], CF.agk[1], .01)}${stp('Risiko', 'wagnis', b.wagnis, CF.wagnis[0], CF.wagnis[1], .01)}${stp('Gewinn', 'gewinn', b.gewinn, CF.gewinn[0], CF.gewinn[1], .01)}${stp('Preis fein justieren', 'fine', b.fine || 0, -.1, .1, .01, v => (v > 0 ? '+' : '') + pct(v))}
      <div class="h">2 · Leistungsverzeichnis (alle Preise brutto, Preis je Einheit anpassbar)</div>
      <table class="tbl"><tr><th>Position / Menge</th><th class="r">Preis €</th><th class="r">Summe €</th></tr>${rows}<tr><td colspan="2"><b>Summe LV</b></td><td class="r"><b>${num(SIM.roundTo(q.lvSum, 100))}</b></td></tr></table>
      <div class="h">3 · Nebenleistungen (stehen nicht im LV!)</div>
      <div class="sm mut">Was der Bauherr nicht ausschreibt, musst du selbst einrechnen. Was du vergisst, zahlst du aus eigener Tasche. Was du unnötig einrechnest, macht das Angebot teurer.</div>${blocks}
      <div class="h">4 · Dein Angebot</div>
      <div class="row2"><span class="txt">Deine Kosten (netto)</span><b>${fmtR(q.estSelf)}</b></div>
      <div class="row2"><span class="txt"><b>Angebotssumme (brutto)</b></span><b style="font-size:24px">${fmtR(q.total)}</b></div>
      <div class="meter"><div class="mk" style="left:${mpos}%"></div></div><div class="scale"><span>70</span><span>80</span><span>90</span><span>100</span><span>110</span><span>120 %</span></div>
      <div class="row2"><span class="pill ${zone[0]}">${zone[1]}</span><span class="txt">${exact ? 'Dein Angebot: <b>' + pct(q.pct) + '</b> des Auftragswertes' : 'Ungefähr bei <b>' + pct(Math.round(shown * 20) / 20) + '</b> (Kalkulator zeigt es genau)'}</span></div>
      <div class="dlgbtns">${btn('Zurück', 'open', { w: 'tender' }, 'gry')}${btn('Angebot abgeben', 'bidgo', { id: t.id })}</div>`);
  };

  W.jobs = () => {
    const s = S();
    const wait = s.tenders.filter(t => t.state === 'zugesagt').map(t => `<div class="card sel"><div class="row2"><span class="t">${t.title}</span><span class="pill y">Zuschlag!</span></div><div class="sm mut">${t.client} · ${fmtR(t.sumG || t.sum * 1.19)} brutto · Baustart bis Woche ${t.startBy} (${Math.max(0, t.startBy - s.week)} Wochen)</div>
      <div class="sm">Braucht: ${t.needSkills.map(SIM.skillName).join(', ') || 'nur Maurer'}${t.needK > 1 ? ` · ${t.needK} Kolonnen` : ''}</div>${btn('Baustart…', 'startjob', { id: t.id }, 'sm')}</div>`).join('');
    const run = s.jobs.map(j => { const p = j.done / j.hours; return `<div class="card"><div class="row2"><span class="t">${j.title}</span><span class="pill g">${R(p * 100)} %</span></div><div class="pbar"><i style="width:${p * 100}%"></i></div>
      <div class="sm mut">${j.client} · ${fmtR(j.sumG || j.sum * 1.19)} brutto · ${j.kol.map(id => (s.kolonnen.find(k => k.id === id) || {}).name).join(', ')} · Wetter: ${weatherName()}</div></div>`; }).join('');
    const bids = s.tenders.filter(t => t.state === 'geboten').map(t => `<div class="card"><div class="t">${t.title}</div><div class="sm mut">Angebot ${fmtR(t.quote.total)} brutto · Submission läuft</div></div>`).join('');
    return win('Aufträge', `${wait}${run}${bids}${!wait && !run && !bids ? '<div class="txt">Noch keine Aufträge. Gib bei den Ausschreibungen ein Angebot ab.</div>' : ''}`);
  };
  const weatherName = () => ({ ok: 'gut', regen: 'Regen', sturm: 'Sturm', frost: 'Frost', hitze: 'Hitze' })[S().weather.kind];
  W.startjob = () => {
    const s = S(), t = s.tenders.find(x => x.id === U.args.id); if (!t) return W.jobs();
    const sel = U.args.sel || [];
    const rows = s.kolonnen.map(k => { const ms = SIM.membersOf(k), sk = [...SIM.kolSkills(k)].map(SIM.skillName).join(', '), free = SIM.kolonneFree(k), on = sel.includes(k.id);
      return `<div class="chk ${on ? 'on' : ''} ${free ? '' : 'dis'}" data-act="selkol" data-k="${k.id}"><i>${on ? '✓' : ''}</i><div style="flex:1"><div class="t">${k.name} ${free ? '' : '<span class="pill y">beschäftigt</span>'}</div><div class="sm mut">${ms.length} Mann · kann: ${sk || '–'}</div></div></div>`; }).join('');
    return win('Baustart: ' + t.title, `<div class="sm">Wähle ${t.needK > 1 ? 'mindestens ' + t.needK + ' Kolonnen' : 'eine Kolonne'}. Benötigt: ${t.needSkills.map(SIM.skillName).join(', ') || 'Maurer'}.</div>${rows}<div class="dlgbtns">${btn('Zurück', 'open', { w: 'jobs' }, 'gry')}${btn('Los geht\'s!', 'gojob', { id: t.id })}</div>`);
  };

  W.fleet = () => {
    const s = S(), st = SIM.stageDef();
    const gear = Object.keys(BAL.geraete).map(id => { const g = BAL.geraete[id], own = s.geraete[id], lock = s.stage < g.stage;
      return `<div class="card ${lock ? 'dis' : ''}"><div class="row2"><span class="t">${g.n}</span>${own ? '<span class="pill g">gekauft</span>' : `<span class="pill">${fmt(g.price)}</span>`}</div><div class="sm">${g.txt}${g.rentDay ? ` Miete sonst ${fmt(g.rentDay)}/Tag.` : ''}</div>${!own ? (lock ? `<div class="sm mut">ab Büro-Stufe ${g.stage}</div>` : btn('Kaufen', 'buygear', { id }, 'sm')) : ''}</div>`; }).join('');
    return win('Fuhrpark & Geräte', `<div class="card"><div class="t">🚚 ${s.vehicles.length} Transporter · ${s.kolonnen.length}/${st.kol} Kolonnen (Büro) · Chef schafft ${SIM.mgmtCap()}</div><div class="sm mut">Jede Kolonne braucht einen Transporter (${fmt(BAL.vehicle.transporter.price)}, ${fmt(BAL.vehicle.transporter.weekly)}/Woche Unterhalt). Mehr Kolonnen: Bürokraft (+1), Bauleiter (+3), Disponent (+1).</div>${btn('Neue Kolonne + Transporter', 'newkol', null, 'sm blue')}</div>
      <div class="h">Mieten oder kaufen?</div><div class="sm mut">Ohne eigenes Gerät mietet das Spiel bei Bedarf automatisch (Mobilkran ${fmt(BAL.rent.mobilkranDay)}/Tag). Kaufen lohnt bei vielen Baustellen.</div>${gear}`);
  };

  W.fin = () => {
    const s = S(), ui = SIM.upgradeInfo(), bon = SIM.bonitaet();
    return win('Finanzen', `<table class="tbl"><tr><td>Kasse</td><td class="r"><b class="${s.cash < 0 ? 'neg' : ''}">${fmt(s.cash)}</b></td></tr>
      <tr><td>Offene Rechnungen (Forderungen)</td><td class="r">${fmtR(SIM.recvTotal())}</td></tr><tr><td>Kredit</td><td class="r">${fmtR(s.kredit)}</td></tr><tr><td>Eigenkapital</td><td class="r"><b>${fmtR(SIM.equity())}</b></td></tr>
      <tr><td>Umsatz pro Monat (Ø 3 Mon.)</td><td class="r">${fmtR(SIM.umsatzMonat())}</td></tr><tr><td>Bonität (0–100)</td><td class="r"><b>${bon}</b></td></tr>
      <tr><td>Löhne pro Woche</td><td class="r">${fmtR(SIM.weeklyWages())}</td></tr><tr><td>Fixkosten pro Woche</td><td class="r">${fmt(SIM.weeklyFixed())}</td></tr>
      <tr><td>Zahlungsziel deiner Kunden</td><td class="r">${SIM.payDelay()} Wochen${SIM.hasRole('buero') ? ' (Bürokraft)' : ''}</td></tr><tr><td>Material-Rabatt (Einkäufer)</td><td class="r">${pct(SIM.matDiscount())}</td></tr></table>
      <div class="sm mut">Wenn die Kasse unter die Überziehungsgrenze fällt (${fmtR(BAL.bank.overdraftBase + bon * BAL.bank.overdraftPerBon)}), hast du ${BAL.bank.insolvencyWeeks} Wochen bis zur Insolvenz.</div>
      <div class="h">Bank</div><div class="sm">Kreditrahmen frei: <b>${fmt(SIM.creditLimit())}</b> (Zins ca. ${pct(BAL.bank.zinsWeek * 52)} im Jahr)</div>
      <div class="dlgbtns">${btn('+ 10.000 € Kredit', 'credit', { a: 10000 }, 'blue')}${btn('− 10.000 € tilgen', 'repay', { a: 10000 }, 'org')}</div>
      <div class="row2"><span class="sm mut">Projekte: ${s.stats.jobs} fertig · Gewinn ${fmtR(s.stats.profit)} · Gebote ${s.stats.wins}/${s.stats.bids} gewonnen</span></div>`);
  };

  W.office = () => {
    const s = S(), st = SIM.stageDef(), ui = SIM.upgradeInfo();
    const chk = (lbl, arr) => `<div class="row2"><span class="txt">${arr[2] ? '✔' : '✖'} ${lbl}</span><span class="${arr[2] ? 'pos' : 'neg'}">${num(arr[0])} / ${num(arr[1])}</span></div>`;
    const deko = Object.keys(BAL.deko).map(id => { const d = BAL.deko[id], own = s.deko[id], lock = d.stage && s.stage < d.stage; const ic = { kaffee: 'deko_1', tafel: 'deko_2', hund: 'deko_3', pokal: 'deko_4', plotter: 'deko_5' }[id];
      return `<div class="card ${lock ? 'dis' : ''}" style="display:flex;gap:6px;align-items:center"><img class="portrait" src="assets/${ic}.png" style="width:44px;height:44px"><div style="flex:1"><div class="t">${d.n}</div><div class="sm mut">${d.txt}</div></div>${own ? '<span class="pill g">da</span>' : lock ? `<span class="sm mut">ab St. ${d.stage}</span>` : btn(fmt(d.price), 'buydeko', { id }, 'sm')}</div>`; }).join('');
    const up = ui ? `<div class="card sel"><div class="t">Nächste Stufe: ${ui.next.n}</div>
      <div class="sm mut">Fixkosten ${fmt(st.fixed)} → <b>${fmt(ui.next.fixed)}</b> pro Monat. Bis ${ui.next.kol} Kolonnen, ${ui.next.desks} Büroplätze. Ausbau kostet ${fmt(ui.cost)}.</div>
      ${chk('Umsatz pro Monat', ui.umsatz)}${chk('Eigenkapital', ui.ek)}${chk('Bonität', ui.bon)}
      <div class="sm mut">Vorsicht: Wer zu früh ausbaut, zahlt Fixkosten ohne genug Aufträge.</div>
      <div class="dlgbtns">${btn('Ausbauen (' + fmt(ui.cost) + ')', 'upgrade', { f: 0 }, ui.ok && ui.cashOk ? '' : 'dis')}${ui.canFinance ? btn('Finanzieren', 'upgrade', { f: 1 }, ui.ok ? 'blue' : 'dis') : ''}</div></div>` : '<div class="card txt">🏆 Höchste Stufe erreicht: Firmenzentrale!</div>';
    return win('Büro', `<img class="stageimg" src="assets/stage${s.stage}.png" style="height:150px;object-fit:cover;object-position:50% 40%"><div class="t" style="text-align:center">Stufe ${s.stage}: ${st.n}</div>${up}<div class="h">Ausstattung (kleine Boni)</div>${deko}`);
  };

  W.nation = () => {
    const s = S();
    if (!s.pack) return win('Upgrade: Nationalitäten-Paket', `<div class="card sel txt"><b>Nationalitäten-Paket</b><br>• Deine <b>Flagge hängt im Büro</b>.<br>• Anwerben nach <b>Region oder Land</b> filtern.<br>• Mitarbeiter gleicher Herkunft wie deine Flagge: <b>+1 auf alle Werte</b> (gemeinsame Sprache, ein Team).<br>• Mit Länderliste: DACH, ehemaliges Jugoslawien (inkl. Sandschak), Bulgarien, Rumänien, Moldawien, Ungarn, Ukraine, Weißrussland u. a.</div>
      <div class="card" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${['SZ', 'RS', 'BG', 'RO', 'MD', 'HU', 'UA', 'BY', 'AT'].map(k => flagH(k, 28)).join('')}</div>
      <div class="sm mut">Test-Modus: Es wird kein Geld abgebucht. Im fertigen Spiel wäre das ein echter In-App-Kauf.</div>${btn('Freischalten · 2,99 €', 'buypack', null, 'full')}`);
    return win('Nationalitäten-Paket', `<div class="sm">Deine Flagge im Büro. Gleiche Herkunft = Team-Bonus +1.</div><div class="flagpick"><div class="flags">${GROUPS.map(g => `<div class="fg">${g}</div>` + ALLNAT.filter(k => NAT[k].g === g).map(k => `<div class="fl ${k === s.flag ? 'sel' : ''}" data-act="setflag" data-k="${k}">${flagH(k, 22)}<span>${NAT[k].n}${k === 'SZ' ? ' ★' : ''}</span></div>`).join('')).join('')}</div></div>
      <div class="sm">Aktuell: <b>${s.flag ? NAT[s.flag].n : 'keine'}</b>. Beim Anwerben kannst du jetzt nach Region/Land filtern.</div>${btn('Fertig', 'close', null, 'full')}`);
  };
  W.log = () => win('Journal', `<div class="loglist">${S().log.map(l => `<div><span class="mut">${SIM.dateStr(l.w)}</span> ${l.t}</div>`).join('') || 'Noch nichts passiert.'}</div>`);
  W.system = () => win('System', `${btn('Speichern', 'save', null, 'full')}${btn('Laden', 'load', null, 'full blue')}${btn(U.sfxOn ? 'Ton: an' : 'Ton: aus', 'sfx', null, 'full org')}${btn('Neues Spiel (Spielstand löschen)', 'reset', null, 'full red')}<div class="sm mut">Maurer Tycoon · lokaler Prototyp. Alle Firmen und Namen sind erfunden. Spielwerte in js/balance.js.</div>`);

  // ---------- Posteingang (Modals) ----------
  W.inbox = () => {
    const it = S().inbox[0]; if (!it) return '';
    const more = S().inbox.length > 1 ? `<div class="sm mut" style="text-align:center">noch ${S().inbox.length - 1} weitere Meldung(en)</div>` : '';
    if (it.kind === 'submission') {
      const rows = it.ranking.map((r, i) => `<tr style="${r.you ? 'background:#fff0c0;font-weight:700' : ''}"><td>${i + 1}.</td><td>${r.you ? '➤ ' : ''}${r.n}</td><td class="r">${pct(r.pct)}</td></tr>`).join('');
      return win('Submission: ' + it.title, `<div style="text-align:center"><span class="stamp ${it.won ? '' : 'no'}">${it.won ? 'ZUSCHLAG!' : 'ABSAGE'}</span></div>
        <div class="txt" style="text-align:center">Dein Angebot lag bei <b>${pct(it.pct)}</b> des Auftragswertes (${fmtR(it.total)} brutto).<br>Der Auftragswert war ${fmtR(it.value)}.</div>
        <div class="h">Preisspiegel</div><table class="tbl">${rows}</table>
        <div class="sm">${it.won ? 'Starte den Bau unter Menü → Aufträge. Du hast ' + BAL.calc.startWindow + ' Wochen Zeit.' : it.pct > BAL.zone.tooHigh ? 'Über 108 %: Das war dem Bauherrn zu teuer.' : `Der Beste lag bei ${pct(it.best)}. Beim nächsten Mal etwas enger rechnen, aber nicht unter deine Kosten.`}</div>${more}${btn('OK', 'inboxok', null, 'full')}`, { noclose: true, top: 70 });
    }
    if (it.kind === 'abrechnung') {
      const r = it.real, c = it.calc, row = (n, a, b) => `<tr><td>${n}</td><td class="r">${numN(a)}</td><td class="r">${numN(b)}</td><td class="r ${b > a * 1.05 ? 'neg' : b < a * .95 ? 'pos' : ''}">${b - a >= 0 ? '+' : ''}${numN(b - a)}</td></tr>`;
      const realBlk = r.geraet, realNeben = r.neben + r.fix;
      return win('Abrechnung: ' + it.title, `<div style="text-align:center"><span class="stamp ${it.profit >= 0 ? '' : 'no'}">${it.profit >= 0 ? 'FERTIG' : 'VERLUST'}</span></div>
        <div class="txt" style="text-align:center">Angebot ${pct(it.pct)} des Auftragswertes · Erlös netto (ohne MwSt.) ${fmtR(it.revenue)}${it.nachtrag ? ` inkl. Nachtrag ${fmtR(it.nachtrag)}` : ''}<br>Abnahme: ${it.maengel ? '<span class="neg">Mängel entdeckt</span>' : '<span class="pos">ohne Mängel</span>'} · Ruf +${it.rufGain}</div>
        <table class="tbl"><tr><th>Kosten</th><th class="r">Du: kalkuliert</th><th class="r">Real</th><th class="r">Diff.</th></tr>
        ${row('Löhne', c.lohn, r.lohn)}${row('Material', c.mat, r.mat)}${row('Geräte, Fuhrpark, Büro', c.blk, r.geraet + realNeben)}
        <tr><td><b>Summe</b></td><td class="r"><b>${numN(c.lohn + c.mat + c.blk)}</b></td><td class="r"><b>${numN(r.lohn + r.mat + r.geraet + realNeben)}</b></td><td></td></tr></table>
        <div class="row2"><span class="txt">Erwarteter Gewinn</span><b>${fmtR(it.expected)}</b></div><div class="row2"><span class="txt"><b>Tatsächlicher Gewinn</b></span><b class="${it.profit >= 0 ? 'pos' : 'neg'}" style="font-size:24px">${fmtR(it.profit)}</b></div>
        ${it.hints.map(h => `<div class="card txt" style="background:#fffbe8">💡 ${h}</div>`).join('')}${more}${btn('OK', 'inboxok', null, 'full')}`, { noclose: true, top: 40 });
    }
    if (it.kind === 'stage') return win('🏗️ ' + it.title, `<img class="stageimg" src="assets/stage${it.stage}.png" style="height:260px;object-fit:cover;object-position:50% 45%"><div class="txt" style="text-align:center">${it.text}</div>${more}${btn('Super!', 'inboxok', null, 'full')}`, { noclose: true, top: 70 });
    if (it.kind === 'gameover') return win('💥 ' + it.title, `<div class="txt">${it.text}</div>${btn('Neu anfangen', 'reset', null, 'full red')}`, { noclose: true, top: 160 });
    const ic = { warn: '⚠️', star: '⭐', clip: '📋', home: '🏢' }[it.icon] || '📣';
    const ch = it.choices ? `<div class="dlgbtns" style="flex-direction:column">${it.choices.map((c, i) => btn(c.t, 'choice', { i }, i ? 'org' : '')).join('')}</div>` : btn('OK', 'inboxok', null, 'full');
    return win(ic + ' ' + it.title, `<div class="txt">${it.text}</div>${more}${ch}`, { noclose: true, top: 150 });
  };

  // ---------- Steuerung ----------
  U.open = (name, args) => { $('#phone').classList.add('modal'); if (!U.cur) U.prevSpeed = S() ? S().speed : 1; U.cur = name; U.args = args || {}; U.render(); };
  U.close = () => { $('#phone').classList.remove('modal'); U.cur = null; $('#layer').innerHTML = ''; $('#dim').classList.remove('on'); U.checkInbox(); };
  U.render = () => {
    if (!U.cur) return; const f = W[U.cur]; if (!f) return; const html = f(); $('#layer').innerHTML = html; $('#dim').classList.add('on');
    const sc = $('#layer .win .body'); if (sc && U._scroll) sc.scrollTop = U._scroll; U._scroll = 0;
  };
  U.rerender = () => { const sc = $('#layer .win .body'); U._scroll = sc ? sc.scrollTop : 0; U.render(); };
  U.checkInbox = () => { const s = S(); if (!s || U.cur && U.cur !== 'inbox') return; if (s.inbox.length) { if (U.cur !== 'inbox') U.open('inbox'); else U.render(); } else if (U.cur === 'inbox') U.close(); };
  U.toast = (txt, kind) => { const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.innerHTML = txt; $('#toasts').appendChild(t); while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove(); setTimeout(() => t.remove(), 3800); };
  U.fx = (txt, cls, x, y) => { const e = document.createElement('div'); e.className = 'fx ' + cls; e.textContent = txt; e.style.left = x + 'px'; e.style.top = y + 'px'; $('#phone').appendChild(e); setTimeout(() => e.remove(), 1700); };
  U.hud = () => {
    const s = S(); if (!s) return;
    $('#tDate').textContent = SIM.dateStr(s.week); $('#tRep b').textContent = R(s.ruf);
    const m = $('#tMoney b'); U.shownMoney = U.shownMoney === undefined ? s.cash : U.shownMoney + (s.cash - U.shownMoney) * .25; if (Math.abs(U.shownMoney - s.cash) < 1) U.shownMoney = s.cash; m.textContent = fmt(U.shownMoney); m.style.color = s.cash < 0 ? '#d03828' : '';
    $('#goal').textContent = '🎯 ' + SIM.goalText();
    const st = SIM.stageDef(); $('#sub').textContent = `St.${s.stage} · Kol ${s.kolonnen.length}/${SIM.mgmtCap()} · EK ${num(SIM.equity())} €`;
    document.querySelectorAll('#speed .b').forEach(b => b.classList.toggle('on', +b.dataset.s === s.speed));
    const nB = s.tenders.filter(t => t.state === 'zugesagt').length + SIM.freeSlots().length * (s.goal === 'hire' ? 1 : 0) + (s.goal === 'lohn' ? 1 : 0);
    const bd = $('#menuBadge'); bd.style.display = nB ? '' : 'none'; bd.textContent = nB; $('#bMenu').classList.toggle('pulse', !!nB && !U.cur);
  };
  U.flag = () => {
    const s = S(), el = $('#flagwall'); if (!s.pack || !s.flag) { el.style.display = 'none'; return; }
    el.style.display = 'block'; el.innerHTML = flagH(s.flag); ART.placeFlag(el);
  };
  return Object.assign(U, { W, fmt, flagH });
})();
