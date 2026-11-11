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
  const goodInfo = () => { try { const raw = localStorage.getItem('maurer_tycoon_v1_good'); if (!raw) return null; const o = JSON.parse(raw); return { week: o.week, cash: o.cash, d: SIM.dateStr ? SIM.dateStr(o.week) : 'Wo ' + o.week }; } catch (e) { return null; } };
  const goodBtn = cls => { const g = goodInfo(); return g ? btn('Letzten guten Stand laden · ' + g.d, 'loadgood', null, 'full ' + (cls || 'blue')) : ''; };
  const win = (title, body, opts) => { opts = opts || {}; return `<div class="win ${opts.cls || ''}" style="top:${opts.top === undefined ? 44 : opts.top}px">${`<div class="title">${px(title)}${opts.noclose ? '' : '<span class="x" data-act="close">×</span>'}</div>`}<div class="body">${body}</div></div>`; };
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

  // ---------- Kassenprognose-Box ----------
  const fcLine = (f, lbl) => { const c = f.level === 'bad' ? 'r' : f.level === 'tight' ? 'y' : 'g', t = f.level === 'bad' ? 'Gefahr: Überziehung' : f.level === 'tight' ? 'Eng: im Minus' : 'Kasse reicht';
    return `<div class="row2"><span class="pill ${c}">${t}</span><span class="sm">${lbl || ''}Tiefpunkt <b class="${f.min < 0 ? 'neg' : ''}">${fmtR(f.min)}</b>${f.minWeek ? ` in Wo +${f.minWeek}` : ''}</span></div>`; };
  const spark = (f, short) => { const v = [f.start].concat(f.path), lo = f.band ? v.map((x, i) => x - (i ? f.band[i - 1] : 0)) : v, hi = f.band ? v.map((x, i) => x + (i ? f.band[i - 1] : 0)) : v,
      mx = Math.max(...hi, 1), mn = Math.min(...lo, f.limit, 0), h = 34, w = 100, X = i => i / (v.length - 1) * w, Y = x => h - (x - mn) / Math.max(1, mx - mn) * h;
    const poly = f.band ? `<polygon fill="#26407a" fill-opacity=".14" stroke="none" points="${hi.map((x, i) => X(i) + ',' + Y(x)).join(' ')} ${lo.map((x, i) => [X(i), Y(x)]).reverse().map(a => a.join(',')).join(' ')}"/>` : '';
    const note = f.band ? (short ? `<div class="sm mut" style="font-size:13px;line-height:12px">Grau: typische Abweichung (±${fmtR(f.bandEnd)} nach ${BAL.forecast.weeks} Wo.). Ohne künftige Aufträge, Einstellungen, Ausbauten.${f.minLo < 0 && f.min >= 0 ? ` <b class="neg">Ungünstig: bis ${fmtR(f.minLo)}.</b>` : ''}</div>` : `<div class="sm mut" style="font-size:12px">Grauer Bereich = typische Abweichung (nach ${BAL.forecast.weeks} Wo. ca. ±${fmtR(f.bandEnd)}). <b>Nicht enthalten:</b> künftige Aufträge, neue Einstellungen und Ausbauten.${f.minLo < 0 && f.min >= 0 ? ` <b class="neg">Im ungünstigen Fall rutscht die Kasse bis ${fmtR(f.minLo)}.</b>` : ''}</div>`) : '';
    return `<svg viewBox="0 0 ${w} ${h}" class="spark" preserveAspectRatio="none">${poly}<line x1="0" x2="${w}" y1="${Y(0)}" y2="${Y(0)}" stroke="#8f97aa" stroke-dasharray="2 2" stroke-width=".7"/><line x1="0" x2="${w}" y1="${Y(f.limit)}" y2="${Y(f.limit)}" stroke="#e24a3c" stroke-width=".7"/><polyline fill="none" stroke="#26407a" stroke-width="1.6" points="${v.map((x, i) => X(i) + ',' + Y(x)).join(' ')}"/></svg>${note}`; };
  // Prognose für einen Auftrag (zusagt/startbereit): Kapitalbedarf + Kasse über 8 Wochen
  const fcBox = (job, lbl, kols, compact) => { if (!job) return ''; const r = SIM.forecastJob(job, kols), f = r.withJob; if (!r.kols.length) return `<div class="card fc"><div class="t">Kassenprognose</div><div class="sm mut">Keine freie Kolonne: erst wenn eine Kolonne frei wird, kann der Bau starten und Geld kosten.</div></div>`;
    return `<div class="card fc"><div class="t">Kassenprognose · ${BAL.forecast.weeks} Wochen</div><div class="row2"><span class="txt">Kapitalbedarf des Auftrags</span><b style="white-space:nowrap">${fmtR(r.need)}</b></div>${r.short ? `<div class="row2"><span class="txt neg">${f.level === 'bad' ? 'Fehlbetrag bis zur Überziehungsgrenze' : 'Fehlbetrag bis ins Plus'}</span><b class="neg" style="white-space:nowrap">${fmtR(r.short)}</b></div>` : ''}${fcLine(f, '')}${spark(f, compact)}<div class="sm mut"${compact ? ' style="font-size:14px;line-height:13px"' : ''}>${lbl ? lbl + ': ' : ''}${compact ? `Abschläge erst ${SIM.payDelay()} Wo. nach 25/50/75 %.` : `Material wird nach Baufortschritt gezahlt, Abschläge kommen erst ${SIM.payDelay()} Wochen nach 25/50/75 %.`} ${r.baseNeg ? ' <b class="neg">Kasse wäre auch ohne diesen Auftrag im Minus.</b>' : ''}${compact ? '' : ` Gestrichelt: 0 €, rot: Überziehungsgrenze ${fmtR(f.limit)}.`}</div></div>`; };
  // MT-007/033: Warnung, wenn Kran/Eisenflechter/Kolonne fehlen, und Liste der offenen Zuschläge (gewonnen, noch nicht begonnen)
  const openWon = (exclude, withTitle) => { const l = S().tenders.filter(t => t.state === 'zugesagt' && t !== exclude); if (!l.length) return '';
    return `<div class="sm" style="margin:3px 0">${withTitle ? '<b>Offene Zuschläge</b> (noch nicht begonnen): ' : ''}${l.map(t => `${t.title}${t.needK > 1 ? ' (' + t.needK + ' Kol.)' : ''}, Start bis Wo ${t.startBy} (noch ${Math.max(0, t.startBy - S().week)} Wo)`).join(' · ')}</div>`; };
  const openWonShort = exclude => { const l = S().tenders.filter(t => t.state === 'zugesagt' && t !== exclude); return l.length ? `<div class="sm mut">Offene Zuschläge: ${l.map(t => `${t.title} (Start bis Wo ${t.startBy})`).join(', ')}</div>` : ''; };
  const readyBox = (job, mode, compact) => { if (!job) return ''; const r = SIM.readiness(job), L = [];
    const own = mode === 'won' || job.state === 'zugesagt';
    if (r.miss.length) L.push(compact ? `<b>Fehlt: ${r.miss.join(', ')}</b> – ohne das kein Baustart.` : `<b>Es fehlt: ${r.miss.join(', ')}.</b> ${own ? 'Ohne das kannst du den Bau nicht starten. Stelle rechtzeitig passende Leute ein (Menü → Mitarbeiter)' : 'Gewinnst du den Auftrag, kannst du ohne das nicht starten. Erst einstellen oder lieber nicht bieten'}${own ? ', sonst droht nach ' + BAL.calc.startWindow + ' Wochen die Vertragsstrafe.' : '.'}`);
    if (r.noKol) L.push(compact ? `<b>Zu wenig Kolonnen:</b> nötig ${r.needK} (je mind. 2 Leute), du hast ${r.usable}.` : `<b>Zu wenig Kolonnen:</b> Das Projekt braucht ${r.needK} Kolonne${r.needK > 1 ? 'n' : ''} mit je mind. 2 Leuten, du hast ${r.usable}.`);
    else if (r.overbooked) L.push(compact ? `<b>Überbucht:</b> ${r.needOpen + (own ? 0 : r.needK)} Kolonnen gleichzeitig nötig, du hast ${r.usable}.` : `<b>Überbucht:</b> ${own ? 'Mit den anderen offenen Zuschlägen' : 'Mit den offenen Zuschlägen (' + r.open.length + ') und diesem Auftrag'} bräuchtest du ${r.needOpen + (own ? 0 : r.needK)} Kolonnen gleichzeitig, du hast ${r.usable}. Ein Auftrag muss warten.`);
    else if (r.busyNow) L.push(compact ? `Keine ${r.needK > 1 ? 'freien Kolonnen' : 'freie Kolonne'} im Moment; Start erst, wenn frei.` : `Aktuell ${r.free === 0 ? 'ist keine Kolonne frei' : 'ist nur ' + r.free + ' Kolonne frei'} (Lohnarbeit oder Baustelle läuft). Der Bau kann erst starten, wenn ${r.needK > 1 ? 'genug Kolonnen' : 'eine Kolonne'} frei ${r.needK > 1 ? 'sind' : 'ist'}.`);
    if (!r.open.length && !L.length) return '';
    return `<div class="card" style="background:${L.length ? '#fff0dc' : '#f4f8ff'};border-color:${L.length ? '#e09a3c' : '#9ab'}">${compact ? '' : `<div class="t">${L.length ? '⚠ Kannst du das stemmen?' : 'Offene Zuschläge'}</div>`}${L.map(x => `<div class="sm">${compact && L.length ? '⚠ ' : ''}${x}</div>`).join('')}${compact ? openWonShort(job) : openWon(job, true)}</div>`; };
  // Prognose für eine Ausgabe/Änderung (ex für SIM.forecast)
  const fcExtra = (ex, what, lbl) => { const f = SIM.forecast(ex), b = SIM.forecast(), warn = f.level !== 'ok' && f.min < b.min;
    return `<div class="card fc ${f.level === 'bad' ? 'bad' : ''}"><div class="t">Kassenprognose · ${BAL.forecast.weeks} Wochen</div>${what ? `<div class="row2"><span class="txt">${what}</span><b>${fmtR(ex.once || 0)}</b></div>` : ''}${fcLine(f, 'danach ')}${spark(f)}<div class="sm mut">Ohne diese Ausgabe: Tiefpunkt ${fmtR(b.min)}.${warn ? ' <b class="neg">Besser noch warten oder erst Kredit/Aufträge sichern.</b>' : ''} ${lbl || ''}</div></div>`; };

  // ---------- Fenster ----------
  const W = {};
  W.intro = () => win('Firma gründen', `
    <div class="row"><img class="portrait" style="width:60px;height:72px" src="assets/walk_chef_r0.png"><div class="txt">Du bist <b>der Chef</b>: ein ganz normaler Maurer mit Helm und großen Plänen. Start im Baucontainer, mit einem Transporter und <b>25.000 €</b>.</div></div>
    <div class="lbl">Dein Name</div><input type="text" id="inName" value="${S() ? S().boss : 'Max Mustermann'}" maxlength="24">
    <div class="lbl">Name deiner Firma</div><input type="text" id="inFirma" value="${S() ? S().firma : 'Rohbau Mustermann'}" maxlength="28">
    <div class="sm mut">Alle Namen im Spiel sind frei erfunden.</div>
    ${btn('Firma gründen!', 'found', null, 'full')}
    ${localStorage.getItem('maurer_tycoon_v1') ? btn('Spielstand laden', 'load', null, 'full blue') : ''}${goodBtn()}`, { noclose: true, top: 120 });

  // MT-036: Autosave stammt aus der Überziehung
  W.badsave = () => { const a = U.args, g = a.good, d = SIM.dateStr(a.week);
    return win('Achtung: Spielstand in der Überziehung', `<div class="card sel txt">Dein Autosave (<b>${d}</b>) stammt aus einer Zeit, in der die Firma <b class="neg">überzogen</b> war: Kasse <b class="neg">${fmtR(a.cash)}</b>${a.ow ? `, seit ${a.ow} ${a.ow === 1 ? 'Woche' : 'Wochen'} unter der Überziehungsgrenze` : ''}. Es kann knapp bis zur Insolvenz werden.</div>
      ${g ? `<div class="sm">Letzter guter Stand: <b>${g.d}</b>${g.cash !== undefined ? `, Kasse ${fmtR(g.cash)}` : ''}.</div>${btn('Letzten guten Stand laden · ' + g.d, 'loadgood', null, 'full blue')}` : '<div class="sm mut">Es gibt noch keinen gespeicherten guten Stand.</div>'}
      ${btn('Hier weiterspielen', 'close', null, 'full')}<div class="sm mut">Das Spiel ist pausiert. Mit x1 geht es weiter.</div>`, { noclose: true, top: 120 }); };

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
      return `<div class="h">${k.name} ${wk} <span class="mut sm"><span class="nw">≈ ${round5(cap.hours)} Std/Woche</span> · <span class="nw">Kosten ${fmtR(SIM.kolWeeklyCost(k))}/Wo</span></span></div>${[0, 1, 2].map(i => slotCard(k, i)).join('')}${polCard}`;
    }).join('');
    const st = SIM.stageDef(), desks = [];
    for (let i = 0; i < st.desks; i++) { const w = s.office[i]; desks.push(w ? workerCard(w) : `<div class="card" style="display:flex;align-items:center;justify-content:space-between;border-style:dashed"><span class="mut">Schreibtisch ${i + 1} frei</span>${btn('Besetzen', 'hire', { kind: 'office' }, 'org sm')}</div>`); }
    const office = st.desks ? desks.join('') : `<div class="card txt">In einem Einzelcontainer ist kein Platz für Büro-Personal. Baue das Büro aus (Menü → Büro ausbauen).</div>`;
    return win('Mitarbeiter', `<div class="tabs"><div class="tab ${tab === 'kol' ? 'on' : ''}" data-act="tab" data-t="kol">Kolonnen</div><div class="tab ${tab === 'off' ? 'on' : ''}" data-act="tab" data-t="off">Büro ${s.office.length}/${st.desks}</div></div>
      ${tab === 'kol' ? `<div class="sm mut">Zufällige Bewerber: Du siehst Tempo, Qualität und Ausdauer schon im Bewerber-Dialog. Dein Bewerber bleibt, bis du ihn einstellst oder neu würfelst. T = Tempo, Q = Qualität, A = Ausdauer.</div>${kols}${btn('Neue Kolonne gründen', 'newkol', null, 'blue full')}` : office}`);
  };
  const OFFICE_NUTZEN = { buero: 'Zahlungsziel deiner Kunden 4 → 2 Wochen, Chef schafft +1 Kolonne. Lohnt ab 2 Kolonnen.', einkauf: c => `Material ca. ${R(5 + .5 * SIM.stat(c, 'tempo'))} % billiger. Lohnt bei viel Bauleistung.`, kalk: 'Kalkulation und Markt-Schätzung viel genauer. Lohnt, wenn du viele Angebote machst.', bauleiter: 'Chef schafft +3 Kolonnen, +6 % Leistung in allen Kolonnen, weniger Mängel. Lohnt ab 3 Kolonnen.', sifa: 'Weniger Unfälle und Bußgelder, Ruf +.', dispo: 'Chef schafft +1 Kolonne, Kranmiete 20 % billiger.', akquise: 'Mehr Ausschreibungen pro Woche.' };
  const officeInfo = c => { const n = OFFICE_NUTZEN[c.role], txt = typeof n === 'function' ? n(c) : n || '', ex = { once: BAL.hireFeeOffice, wagesAt: i => c.monthly * (i <= BAL.probation.weeks ? BAL.probation.share : 1) / BAL.weeksPerMonth };
    return `<div class="sm"><b>Nutzen:</b> ${txt}</div><div class="sm mut">Kosten: ${fmt(c.monthly)} im Monat (≈ ${fmtR(c.monthly / BAL.weeksPerMonth)} pro Woche). Probezeit: ${BAL.probation.weeks} Wochen nur ${R(BAL.probation.share * 100)} % Gehalt.</div>${fcExtra(ex, 'Einstellungsgebühr', '')}`; };
  // MT-039: eindeutige Anzeige, ob der gezeigte Bewerber zum Region-Filter passt (nur Anzeige, Mechanik unverändert)
  const filtState = (s, c) => {
    if (!s.filter) return `<div class="sm mut">Filter aus: Bewerber aus allen Ländern. Ein Filterwechsel zieht einmal gratis einen passenden Bewerber, danach gilt er erst beim bezahlten Neu-Würfeln.</div>`;
    const lab = NAT[s.filter] ? NAT[s.filter].n : s.filter, pool = NAT[s.filter] ? [s.filter] : ALLNAT.filter(k => NAT[k].g === s.filter);
    return pool.includes(c.nat) ? `<div class="sm pos">✔ Dieser Bewerber passt zum Filter „${lab}“.</div><div class="sm mut">Neu-Würfeln zieht nur noch passende Bewerber.</div>`
      : `<div class="sm neg">⚠ Dieser Bewerber (${NAT[c.nat].n}) passt NICHT zum Filter „${lab}“.</div><div class="sm mut">Der Gratis-Tausch ist für ihn schon verbraucht. Der Filter gilt erst beim bezahlten Neu-Würfeln (${fmt(BAL.hireAdCost)}).</div>`;
  };
  W.hire = () => {
    const s = S(), a = U.args; const c = s.cand && s.cand.c;
    if (!c) return win('Anwerben', '<div class="txt">Kein Bewerber.</div>');
    const R_ = BAL.roles[c.role], tb = SIM.teamBonus(c) ? 1 : 0;
    const filt = s.pack && a.kind !== 'office' ? `<div class="lbl">Region (Nationalitäten-Paket)</div><select data-act="filter">
      <option value="">Alle Länder</option>${GROUPS.map(g => `<option value="${g}" ${s.filter === g ? 'selected' : ''}>Region: ${g}</option>`).join('')}${ALLNAT.map(k => `<option value="${k}" ${s.filter === k ? 'selected' : ''}>${NAT[k].n}</option>`).join('')}</select>${filtState(s, c)}` : '';
    const free = a.kind === 'office' ? 0 : s.hiresFree;
    return win('Bewerber', `<div class="card sel" style="display:flex;gap:8px;align-items:center">${portrait(c)}<div style="flex:1"><div class="t" style="font-size:17px">${c.name} ${flagH(c.nat, 22)}</div><div class="txt">${R_.n} · ${NAT[c.nat].n}</div>
      <div class="txt">Gehalt: <b>${fmt(c.monthly)}</b> / Monat</div><div class="sm">Eigenschaft: <b>${c.trait}</b></div></div></div>
      ${statBar('Tempo', SIM.stat(c, 'tempo'), '', tb)}${statBar('Qualität', SIM.stat(c, 'qual'), 'q', tb)}${statBar('Ausdauer', SIM.stat(c, 'aus'), 'a', tb)}
      ${tb ? `<div class="sm pos">Gleiche Herkunft wie deine Büro-Flagge: +1 auf alle Werte (Team-Bonus)</div>` : ''}
      ${R_.skills.length ? `<div class="sm">Kann: ${R_.skills.map(SIM.skillName).join(', ')}</div>` : ''}
      ${a.kind === 'office' ? officeInfo(c) : ''}
      ${filt}
      <div class="dlgbtns">${btn(a.kind === 'office' ? `Einstellen (${fmt(BAL.hireFeeOffice)})` : free ? 'Einstellen (gratis)' : `Einstellen (${fmt(BAL.hireFeeOffice / 2)})`, 'dohire', null, '')}${btn(`Neu würfeln (${fmt(BAL.hireAdCost)})`, 'reroll', null, 'org')}</div>
      ${btn('Abbrechen', 'staffback', null, 'gry full')}`);
  };
  W.firec = () => {
    const w = S().workers.find(x => x.id === U.args.id); if (!w) return W.staff();
    return win('Wirklich kündigen?', `<div class="card" style="display:flex;gap:8px">${portrait(w)}<div style="flex:1"><div class="t">${w.name}</div><div class="txt">${BAL.roles[w.role].n} · ${fmt(w.monthly)} / Monat</div></div></div>
      <div class="txt">${w.name} verlässt die Firma sofort. Der Platz wird frei.${w.cousin ? ' <b>Das ist dein Cousin: Ruf −2.</b>' : ''}</div>
      <div class="dlgbtns">${btn('Behalten', 'worker', { id: w.id }, 'blue')}${btn('Ja, kündigen', 'firego', { id: w.id }, 'red')}</div>`);
  };
  W.worker = () => {
    const w = S().workers.find(x => x.id === U.args.id); if (!w) return W.staff();
    const R_ = BAL.roles[w.role];
    return win(w.name, `<div class="card" style="display:flex;gap:8px">${portrait(w)}<div style="flex:1"><div class="t">${R_.n} ${flagH(w.nat, 20)} ${NAT[w.nat].n}</div><div class="txt">${fmt(w.monthly)} / Monat · Laune ${laune(w)} ${R(w.laune || 70)}%</div><div class="sm">Eigenschaft: ${w.trait}${w.retireAt ? ` · geht in ${Math.max(0, w.retireAt - S().week)} Wochen in Rente` : ''}</div></div></div>
      ${statBar('Tempo', SIM.stat(w, 'tempo'), '', SIM.teamBonus(w))}${statBar('Qualität', SIM.stat(w, 'qual'), 'q', SIM.teamBonus(w))}${statBar('Ausdauer', SIM.stat(w, 'aus'), 'a', SIM.teamBonus(w))}
      <div class="dlgbtns">${btn('Zurück', 'staffback', null, 'blue')}${btn('Kündigen', 'firec', { id: w.id }, 'red')}</div>`);
  };

  W.lohn = () => {
    const s = S(), free = s.kolonnen.filter(SIM.kolonneFree);
    const list = s.lohnOffers.map(o => {
      const okK = free.filter(x => SIM.membersOf(x).filter(w => !SIM.isSick(w)).length >= o.n), k = okK[0] || free[0]; const wk = k ? SIM.lohnWeekly(o, k) : 0;
      return `<div class="card"><div class="row2"><span class="t">${o.firm}</span><span class="pill y">${o.weeks} Wochen</span></div>
      <div class="txt">${o.n} Mann für ${o.weeks} Wochen · Maurer ${o.maurer} €/h, Helfer ${o.helfer} €/h</div>
      <div class="row2"><span class="sm mut">${!k ? 'Keine freie Kolonne' : okK.length ? `≈ ${fmtR(wk)} pro Woche mit ${k.name}` : `Nicht möglich: ${o.n} fitte Leute nötig, ${k.name} hat ${SIM.membersOf(k).filter(w => !SIM.isSick(w)).length}`}</span>${okK.length ? btn(okK.length > 1 ? 'Annehmen…' : 'Annehmen', okK.length > 1 ? 'lohnpick' : 'lohnyes', { id: o.id, k: okK[0].id }, 'sm') : ''}</div></div>`;
    }).join('') || '<div class="txt">Gerade keine Angebote. Kommt bald wieder.</div>';
    return win('Lohnarbeit-Angebote', `<div class="sm mut">Andere Firmen mieten deine Kolonne für einige Wochen. Sicheres Geld pro Stunde, aber kein Ruf. Deine Löhne zahlst du selbst.</div>${list}`);
  };
  W.lohnpick = () => {
    const s = S(), o = s.lohnOffers.find(x => x.id === U.args.id); if (!o) return W.lohn();
    return win('Welche Kolonne?', s.kolonnen.filter(k => SIM.kolonneFree(k) && SIM.membersOf(k).filter(w => !SIM.isSick(w)).length >= o.n).map(k => `<div class="card row2"><span class="t">${k.name} (${SIM.membersOf(k).length} Mann)</span>${btn('Schicken', 'lohnyes', { id: o.id, k: k.id }, 'sm')}</div>`).join(''));
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
      ${openWon(null, true)}${list.map(tenderCard).join('') || (s.flags.firstTender ? '<div class="txt">Gerade keine offenen Ausschreibungen.</div>' : '')}`);
  };

  W.bid = () => {
    const s = S(), t = s.tenders.find(x => x.id === U.args.id); if (!t) return W.tender();
    const C = SIM.openCalc(t), b = t.bid, q = SIM.quote(t), CF = BAL.calc;
    const ol = SIM.outlook(t), est = ol.est, tool = SIM.hasRole('kalk') || s.deko.plotter, mpos = Math.max(0, Math.min(1, (est.c - .7) / .5)) * 100;
    const bandL = Math.max(0, Math.min(1, (est.lo - .7) / .5)) * 100, bandR = Math.max(0, Math.min(1, (est.hi - .7) / .5)) * 100;
    const COL = { g: '#58c858', y: '#ffd24a', r: '#f0624c' };
    const grad = 'linear-gradient(90deg,' + Array.from({ length: 25 }, (_, i) => { const p = .70 + i * .02 + .01, wp = SIM.winProb(p), c = (p > BAL.zone.tooHigh || wp < BAL.bidding.yellow) ? COL.r : wp >= BAL.bidding.green ? COL.g : COL.y; return `${c} ${i * 4}% ${(i + 1) * 4}%`; }).join(',') + ')';
    const range = `${R(est.lo * 100)}–${R(est.hi * 100)} %`, chance = Math.round(ol.winP * 20) * 5;
    const stp = (lbl, key, val, mn, mx, stepv, fmtf) => `<div class="stp"><span class="sl">${lbl}</span><span class="step"><span class="b" data-act="stepb" data-key="${key}" data-d="${-stepv}">−</span><span class="v">${fmtf ? fmtf(val) : pct(val)}</span><span class="b" data-act="stepb" data-key="${key}" data-d="${stepv}">+</span></span></div>`;
    const rows = q.lines.map(l => { const P = BAL.pos[l.pid]; return `<tr><td style="line-height:15px">${P.n}<br><span class="mut">${num(l.qty)} ${P.u}</span></td><td class="r"><span class="step"><span class="b" data-act="epadj" data-pid="${l.pid}" data-d="-1">−</span><span class="v" style="min-width:48px;font-size:19px">${num(l.ep)}</span><span class="b" data-act="epadj" data-pid="${l.pid}" data-d="1">+</span></span></td><td class="r">${num(SIM.roundTo(l.tot, 10))}</td></tr>`; }).join('');
    // MT-042: kompakte Nebenleistungen (eine Zeile je Posten, Hinweis als Kleintext), LV-Tabelle nur auf Wunsch
    const blocks = Object.keys(t.blocks).map(k => { const bl = t.blocks[k]; return `<div class="chk ${b.blocks[k] ? 'on' : ''}" data-act="blk" data-k="${k}"><i>${b.blocks[k] ? '✓' : ''}</i><div style="flex:1;min-width:0"><div class="txt" style="font-size:19px;line-height:17px">${bl.n}</div></div><b style="font-size:19px">${fmt(SIM.nice(C.blocks[k] * q.mk * BAL.mwst))}</b></div>`; }).join('');
    const zone = [ol.level, ol.text], lvOpen = !!U.args.lv;
    const sticky = `<div class="stickysum"><div class="row2"><span class="txt"><b>Angebot (brutto)</b></span><b style="font-size:22px">${fmtR(q.total)}</b></div><div class="row2"><span class="pill ${zone[0]}">${zone[1]}</span><span class="txt">≈ ${range}</span></div></div>`;
    return win('Angebot ausfüllen', `${sticky}<div class="txt" style="font-size:19px;line-height:17px"><b>${t.title}</b> · ${t.client}</div>${readyBox(t, 'bid', true)}
      <div class="chk ${b.neben ? 'on' : ''}" data-act="neben"><i>${b.neben ? '✓' : ''}</i><div style="flex:1"><div class="txt" style="font-size:19px;line-height:17px">Lohnnebenkosten einrechnen${b.neben ? ` (+${R((CF.nebenkosten - 1) * 100)} %)` : ''}</div></div></div>
      <div class="grid2">${stp('Geschäftskosten', 'agk', b.agk, CF.agk[0], CF.agk[1], .01)}${stp('Risiko', 'wagnis', b.wagnis, CF.wagnis[0], CF.wagnis[1], .01)}${stp('Gewinn', 'gewinn', b.gewinn, CF.gewinn[0], CF.gewinn[1], .01)}${stp('Feinjustieren', 'fine', b.fine || 0, -.1, .1, .01, v => (v > 0 ? '+' : '') + pct(v))}</div>
      <div class="h">Nebenleistungen (nicht im LV – vergessen zahlst du selbst)</div>${blocks}
      <div class="meter" style="background:${grad}"><div class="band" style="left:${bandL}%;width:${bandR - bandL}%"></div><div class="mk" style="left:${mpos}%"></div></div><div class="scale"><span>70</span><span>80</span><span>90</span><span>100</span><span>110</span><span>120 %</span></div>
      <div class="sm">Deine Kosten ${fmtR(q.estSelf)} netto · Preisniveau <b>${range}</b> · Zuschlag-Chance <b>${chance} %</b> <span class="mut">(Schätzung ±${R(C.spread * 100)} %${tool ? ', mit Kalkulator/Plotter enger' : ', mit Kalkulator oder Plotter enger'}; alle Preise brutto)</span></div>
      ${btn(lvOpen ? '▾ Positionen (LV) ausblenden' : `▸ Positionen (LV) anpassen · ${q.lines.length}`, 'lvtoggle', null, 'sm blue')}
      ${lvOpen ? `<table class="tbl"><tr><th>Position / Menge</th><th class="r">Preis €</th><th class="r">Summe €</th></tr>${rows}<tr><td colspan="2"><b>Summe LV</b></td><td class="r"><b>${num(SIM.roundTo(q.lvSum, 100))}</b></td></tr></table>` : ''}
      <div class="dlgbtns">${btn('Zurück', 'open', { w: 'tender' }, 'gry')}${btn('Angebot abgeben', 'bidgo', { id: t.id })}</div>`, { cls: 'tight' });
  };

  W.jobs = () => {
    const s = S();
    const wait = s.tenders.filter(t => t.state === 'zugesagt').map(t => `<div class="card sel"><div class="row2"><span class="t">${t.title}</span><span class="pill y">Zuschlag!</span></div><div class="sm mut">${t.client} · ${fmtR(t.sumG || t.sum * 1.19)} brutto · Baustart bis Woche ${t.startBy} (${Math.max(0, t.startBy - s.week)} Wochen)</div>
      <div class="sm">Braucht: ${t.needSkills.map(SIM.skillName).join(', ') || 'nur Maurer'}${t.needK > 1 ? ` · ${t.needK} Kolonnen` : ''}</div>${(() => { const r = SIM.readiness(t); return r.miss.length ? `<div class="sm neg">⚠ Es fehlt: ${r.miss.join(', ')}</div>` : r.noKol ? `<div class="sm neg">⚠ Zu wenig Kolonnen (${r.usable} von ${r.needK})</div>` : r.busyNow ? `<div class="sm" style="color:#b86a00">Wartet: keine freie Kolonne</div>` : ''; })()}${btn('Baustart…', 'startjob', { id: t.id }, 'sm')}</div>`).join('');
    const run = s.jobs.map(j => { const p = j.done / j.hours; return `<div class="card"><div class="row2"><span class="t">${j.title}</span><span class="pill g">${R(p * 100)} %</span></div><div class="pbar"><i style="width:${p * 100}%"></i></div>
      <div class="sm mut">${j.client} · ${fmtR(j.sumG || j.sum * 1.19)} brutto · ${j.kol.map(id => (s.kolonnen.find(k => k.id === id) || {}).name).join(', ')} · Wetter: ${weatherName()}</div></div>`; }).join('');
    const bids = s.tenders.filter(t => t.state === 'geboten').map(t => `<div class="card"><div class="t">${t.title}</div><div class="sm mut">Angebot ${fmtR(t.quote.total)} brutto · Submission läuft</div></div>`).join('');
    const nW = s.tenders.filter(t => t.state === 'zugesagt').length;
    return win('Aufträge', `${nW ? `<div class="h">Offene Zuschläge (${nW}): noch nicht begonnen</div>${nW > 1 ? (() => { const need = s.tenders.filter(t => t.state === 'zugesagt').reduce((a, t) => a + (t.needK || 1), 0), have = s.kolonnen.filter(k => SIM.membersOf(k).length >= 2).length; return need > have ? `<div class="sm neg">⚠ Überbucht: ${need} Kolonnen gebraucht, ${have} vorhanden. Ein Auftrag muss warten.</div>` : ''; })() : ''}` : ''}${wait}${nW && (run || bids) ? '<div class="h">Laufend und Submission</div>' : ''}${run}${bids}${!wait && !run && !bids ? '<div class="txt">Noch keine Aufträge. Gib bei den Ausschreibungen ein Angebot ab.</div>' : ''}`);
  };
  const weatherName = () => ({ ok: 'gut', regen: 'Regen', sturm: 'Sturm', frost: 'Frost', hitze: 'Hitze' })[S().weather.kind];
  W.startjob = () => {
    const s = S(), t = s.tenders.find(x => x.id === U.args.id); if (!t) return W.jobs();
    const sel = U.args.sel || [];
    const rows = s.kolonnen.map(k => { const ms = SIM.membersOf(k), sk = [...SIM.kolSkills(k)].map(SIM.skillName).join(', '), free = SIM.kolonneFree(k), on = sel.includes(k.id);
      return `<div class="chk ${on ? 'on' : ''} ${free ? '' : 'dis'}" data-act="selkol" data-k="${k.id}"><i>${on ? '✓' : ''}</i><div style="flex:1;min-width:0"><span class="t">${k.name}</span> ${free ? '' : '<span class="pill y">beschäftigt</span>'} <span class="sm mut">${ms.length} Mann · ${sk || '–'}</span></div></div>`; }).join('');
    return win('Baustart: ' + t.title, `<div class="sm">Wähle ${t.needK > 1 ? 'mindestens ' + t.needK + ' Kolonnen' : 'eine Kolonne'}. Benötigt: ${t.needSkills.map(SIM.skillName).join(', ') || 'Maurer'}.</div>${rows}${readyBox(t, 'won', true)}${fcBox(t, sel.length ? 'Mit deiner Auswahl' : 'Mit den freien Kolonnen', sel.length ? sel : null, true)}<div class="dlgbtns">${btn('Zurück', 'open', { w: 'jobs' }, 'gry')}${btn('Los geht\'s!', 'gojob', { id: t.id })}</div>`, { cls: 'tight' });
  };

  const newKolWeekly = () => (BAL.roles.maurer.monthly * 2 + BAL.roles.helfer.monthly) / BAL.weeksPerMonth;
  const gearWarn = g => { const f = SIM.forecast({ once: g.price }); return f.level === 'ok' ? '' : `<div class="sm ${f.level === 'bad' ? 'neg' : 'mut'}">${f.level === 'bad' ? '⚠ Danach rutscht die Kasse unter die Überziehungsgrenze' : '⚠ Danach wird die Kasse eng'} (Tiefpunkt ${fmtR(f.min)}).</div>`; };
  W.fleet = () => {
    const s = S(), st = SIM.stageDef();
    const gear = Object.keys(BAL.geraete).map(id => { const g = BAL.geraete[id], own = s.geraete[id], lock = s.stage < g.stage;
      return `<div class="card ${lock ? 'dis' : ''}"><div class="row2"><span class="t">${g.n}</span>${own ? '<span class="pill g">gekauft</span>' : `<span class="pill">${fmt(g.price)}</span>`}</div><div class="sm">${g.txt}${g.rentDay ? ` Miete sonst ${fmt(g.rentDay)}/Tag.` : ''}</div>${!own ? (lock ? `<div class="sm mut">ab Büro-Stufe ${g.stage}</div>` : gearWarn(g) + btn('Kaufen', 'buygear', { id }, 'sm')) : ''}</div>`; }).join('');
    return win('Fuhrpark & Geräte', `<div class="card"><div class="t">🚚 ${s.vehicles.length} Transporter · ${s.kolonnen.length}/${st.kol} Kolonnen (Büro) · Chef schafft ${SIM.mgmtCap()}</div><div class="sm mut">Jede Kolonne braucht einen Transporter (${fmt(BAL.vehicle.transporter.price)}, ${fmt(BAL.vehicle.transporter.weekly)}/Woche Unterhalt). Mehr Kolonnen: Bürokraft (+1), Bauleiter (+3), Disponent (+1).</div>${btn('Neue Kolonne + Transporter', 'newkol', null, 'sm blue')}</div>${fcExtra({ once: s.kolonnen.length >= s.vehicles.length ? BAL.vehicle.transporter.price : 0, wagesAt: () => newKolWeekly() }, 'Neue Kolonne (Transporter)', 'Dazu ca. ' + fmtR(newKolWeekly()) + ' Löhne pro Woche für 3 Leute.')}
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
      <div class="h">Kassenprognose</div>${(() => { const f = SIM.forecast(); return `<div class="card fc">${fcLine(f, '')}${spark(f)}<div class="sm mut">Nächste ${BAL.forecast.weeks} Wochen mit offenen Rechnungen, Material, Löhnen und Fixkosten. Rot: Überziehungsgrenze.</div></div>`; })()}<div class="h">Bank</div><div class="sm">Kreditrahmen frei: <b>${fmt(SIM.creditLimit())}</b> (Zins ca. ${pct(BAL.bank.zinsWeek * 52)} im Jahr)</div>
      <div class="dlgbtns">${btn('+ 10.000 € Kredit', 'credit', { a: 10000 }, 'blue')}${btn('− 10.000 € tilgen', 'repay', { a: 10000 }, 'org')}</div>
      <div class="row2"><span class="sm mut">Projekte: ${s.stats.jobs} fertig · Gewinn ${fmtR(s.stats.profit)} · Gebote ${s.stats.wins}/${s.stats.bids} gewonnen</span></div>`);
  };

  W.office = () => {
    const s = S(), st = SIM.stageDef(), ui = SIM.upgradeInfo();
    const chk = (lbl, arr) => `<div class="row2"><span class="txt">${arr[2] ? '✔' : '✖'} ${lbl}</span><span class="${arr[2] ? 'pos' : 'neg'}">${num(arr[0])} / ${num(arr[1])}</span></div>`;
    const deko = Object.keys(BAL.deko).map(id => { const d = BAL.deko[id], own = s.deko[id], lock = d.stage && s.stage < d.stage; const ic = { kaffee: 'deko_1', tafel: 'deko_2', hund: 'deko_3', pokal: 'deko_4', plotter: 'deko_5' }[id];
      return `<div class="card ${lock ? 'dis' : ''}" style="display:flex;gap:6px;align-items:center"><img class="portrait" src="assets/${ic}.png" style="width:44px;height:44px"><div style="flex:1"><div class="t">${d.n}</div><div class="sm mut">${d.txt}</div></div>${own ? '<span class="pill g">da</span>' : lock ? `<span class="sm mut">ab St. ${d.stage}</span>` : btn(fmt(d.price), 'buydeko', { id }, 'sm')}</div>`; }).join('');
    const up = ui ? `<div class="card sel"><div class="t">Nächste Stufe: ${ui.next.n}</div>
      <div class="sm mut">Fixkosten ${fmt(st.fixed)} → <b>${fmt(ui.next.fixed)}</b> pro Monat. Bis ${ui.next.kol} ${ui.next.kol === 1 ? 'Kolonne' : 'Kolonnen'}, ${ui.next.desks} ${ui.next.desks === 1 ? 'Büroplatz' : 'Büroplätze'}. Ausbau kostet ${fmt(ui.cost)}.</div>
      ${chk('Umsatz pro Monat', ui.umsatz)}${chk('Eigenkapital', ui.ek)}${chk('Bonität', ui.bon)}
      <div class="sm mut">Vorsicht: Wer zu früh ausbaut, zahlt Fixkosten ohne genug Aufträge. Die Fixkosten steigen langsam über ${BAL.stageRamp[s.stage] || 0} Wochen.</div>
      ${fcExtra({ once: ui.cost, fixedMonthAt: i => { const f0 = SIM.fixedMonth(0), rw = Math.max(1, BAL.stageRamp[s.stage] || 1); return f0 + (ui.next.fixed - f0) * Math.min(1, i / rw); } }, 'Ausbau', '')}
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
  W.system = () => win('System', `${btn('Speichern', 'save', null, 'full')}${btn('Laden', 'load', null, 'full blue')}${goodBtn()}${btn(U.sfxOn ? 'Ton: an' : 'Ton: aus', 'sfx', null, 'full org')}${btn('Neues Spiel (Spielstand löschen)', 'reset', null, 'full red')}<div class="sm mut">Maurer Tycoon · lokaler Prototyp. Alle Firmen und Namen sind erfunden. Spielwerte in js/balance.js.</div>`);

  // ---------- Posteingang (Modals) ----------
  W.inbox = () => {
    const it = S().inbox[0]; if (!it) return '';
    const more = S().inbox.length > 1 ? `<div class="sm mut" style="text-align:center">noch ${S().inbox.length - 1} weitere Meldung(en)</div>` : '';
    if (it.kind === 'submission') {
      const rows = it.ranking.map((r, i) => `<tr style="${r.you ? 'background:#fff0c0;font-weight:700' : ''}"><td>${i + 1}.</td><td>${r.you ? '➤ ' : ''}${r.n}</td><td class="r">${pct(r.pct)}</td></tr>`).join('');
      return win('Submission: ' + it.title, `<div style="text-align:center"><span class="stamp ${it.won ? '' : 'no'}">${it.won ? 'ZUSCHLAG!' : it.excluded ? 'AUSGESCHLOSSEN' : 'ABSAGE'}</span></div>
        <div class="sm" style="text-align:center">Dein Angebot: <b>${pct(it.pct)}</b> des Auftragswertes (${fmtR(it.total)} brutto) · Auftragswert war ${fmtR(it.value)}</div>
        <table class="tbl tight2">${rows}</table>
        ${it.excluded ? `<div class="sm neg">Dein Preis war ungewöhnlich niedrig: Der Bauherr schließt solche Angebote aus. Ruf −${it.rufLoss}.</div>` : ''}${it.mind ? `<div class="sm neg">Zu billig angeboten: Der Bauherr kürzt die abgerechneten Mengen um ${R(it.mind * 100)} % (Mindermengen). Ruf −${it.rufLoss}.</div>` : ''}${it.won ? readyBox(SIM.S.tenders.find(t => t.id === it.jobId), 'won', true) + fcBox(SIM.S.tenders.find(t => t.id === it.jobId), 'Wenn du sofort startest', null, true) : ''}
        <div class="sm">${it.won ? 'Starte den Bau unter Menü → Aufträge. Du hast ' + BAL.calc.startWindow + ' Wochen Zeit.' : it.pct > BAL.zone.tooHigh ? 'Über 108 %: Das war dem Bauherrn zu teuer.' : `Der Beste lag bei ${pct(it.best)}. Beim nächsten Mal etwas enger rechnen, aber nicht unter deine Kosten.`}</div>${more}${btn('OK', 'inboxok', null, 'full')}`, { noclose: true, top: 52, cls: 'tight' });
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
    if (it.kind === 'gameover') return win('💥 ' + it.title, `<div class="txt">${it.text}</div>${goodBtn('org')}${btn('Neu anfangen', 'reset', null, 'full red')}`, { noclose: true, top: 160 });
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
  U.fx = (txt, cls, x, y) => { const e = document.createElement('div'); e.className = (U.cur ? 'fx top ' : 'fx ') + cls; if (U.cur) { x = 250 + Math.random() * 60; y = 8; } e.textContent = txt; e.style.left = x + 'px'; e.style.top = y + 'px'; $('#phone').appendChild(e); setTimeout(() => e.remove(), 1700); };
  U.hud = () => {
    const s = S(); if (!s) return;
    $('#tDate').textContent = SIM.dateStr(s.week); $('#tRep b').textContent = R(s.ruf);
    const m = $('#tMoney b'); U.shownMoney = U.shownMoney === undefined ? s.cash : U.shownMoney + (s.cash - U.shownMoney) * .25; if (Math.abs(U.shownMoney - s.cash) < 1) U.shownMoney = s.cash; m.textContent = fmt(U.shownMoney); m.style.color = s.cash < 0 ? '#d03828' : '';
    $('#goal').textContent = '🎯 ' + SIM.goalText();
    const st = SIM.stageDef(); const ss = U.saveState; $('#sub').innerHTML = `St.${s.stage} · Kol ${s.kolonnen.length}/${SIM.mgmtCap()} · EK ${num(SIM.equity())} €${ss ? (ss.err ? ' · <b style="color:#d03828">⚠ nicht gespeichert</b>' : ` · 💾 ${ss.t}`) : ''}`;
    document.querySelectorAll('#speed .b').forEach(b => b.classList.toggle('on', +b.dataset.s === s.speed));
    const nB = s.tenders.filter(t => t.state === 'zugesagt').length + SIM.freeSlots().length * (s.goal === 'hire' ? 1 : 0) + (s.goal === 'lohn' ? 1 : 0);
    const bd = $('#menuBadge'); bd.style.display = nB ? '' : 'none'; bd.textContent = nB; $('#bMenu').classList.toggle('pulse', !!nB && !U.cur);
  };
  U.flag = () => {
    const s = S(), el = $('#flagwall'); if (!s.pack || !s.flag) { el.style.display = 'none'; return; }
    el.style.display = 'block'; el.innerHTML = flagH(s.flag); ART.placeFlag(el);
  };
  return Object.assign(U, { W, fmt, flagH, goodInfo });
})();
