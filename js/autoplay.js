/* Autoplay-Bot (nur Test/Debug): spielt das Spiel ueber die SIM-API. Browser: MT.auto(true) mit ?debug=1. */
const AUTO = { mode: 'smart', AB: [], run() {
  const S = SIM.S, mode = AUTO.mode;
function fillSlots(){for(const k of S.kolonnen)for(let i=0;i<3;i++)if(!k.slots[i]){
  // Bewerber würfeln bis brauchbar
  for(let t=0;t<(mode==='smart'?4:1);t++){const r=SIM.newCandidate('baustelle',t===0||S.hiresFree>0);if(!r.ok)break;const c=S.cand.c;
    const need=!k.slots.some(id=>id&&S.workers.find(w=>w.id===id).role==='maurer');
    if(c.role==='maurer'||c.role==='helfer'&&!need||c.role==='betonbauer'||t===3)break;}
  if(S.cand){const r=SIM.hire(k.id,i);if(!r.ok){S.cand=null}}}}
function ensureSkill(role){ // Betonbauer etc. in eine freie Kolonne holen (Helfer ersetzen)
  const sk=role==='betonbauer'?'beton':role;
  if(S.kolonnen.some(k=>[...SIM.kolSkills(k)].includes(sk)))return;
  const k=S.kolonnen.find(k=>SIM.kolonneFree(k)&&k.slots.some(id=>id&&S.workers.find(w=>w.id===id).role==='helfer'));
  if(!k)return; const hel=k.slots.find(id=>id&&S.workers.find(w=>w.id===id).role==='helfer');
  for(let t=0;t<30;t++){SIM.newCandidate('baustelle',true);if(S.cand.c.role===role)break;S.cand=null;}
  if(S.cand&&S.cand.c.role===role){SIM.fire(hel);SIM.hire(k.id,k.slots.indexOf(null));}else S.cand=null;}
function bot(){
  if(S.cash<9000&&SIM.creditLimit()>5000)SIM.takeCredit(Math.min(25000,SIM.creditLimit()));
  if(S.cash>60000&&S.kredit>0)SIM.repayCredit(Math.min(S.kredit,S.cash-40000));
  if(S.stage>=2&&S.ruf>=5&&mode==='smart')ensureSkill('betonbauer');
  fillSlots();
  // Zugesagte starten
  for(const t of S.tenders.filter(t=>t.state==='zugesagt')){const free=S.kolonnen.filter(k=>SIM.kolonneFree(k));const r=SIM.assignJob(t.id,free.slice(0,t.needK).map(k=>k.id));if(!r.ok&&false)console.log('  assign fail',t.title,r.msg)}
  // Lohn
  for(const k of S.kolonnen){if(SIM.kolonneFree(k)&&S.lohnOffers.length){const offs=S.lohnOffers.slice().sort((a,b)=>SIM.lohnWeekly(b,k)-SIM.lohnWeekly(a,k));for(const o of offs){if(SIM.acceptLohn(o.id,k.id).ok)break;}}}
  // Angebote
  for(const t of S.tenders.filter(t=>t.state==='offen')){
    const sk=new Set();S.kolonnen.forEach(k=>SIM.kolSkills(k).forEach(x=>sk.add(x)));
    if(t.needSkills.some(s=>!sk.has(s)))continue;if(S.kolonnen.length<t.needK)continue;
    SIM.openCalc(t);const b=t.bid;b.neben=mode==='smart';Object.keys(t.blocks).forEach(k=>b.blocks[k]=t.blocks[k].need);
    // Gewinnaufschlag so wählen, dass Gebot ~ 94-96 %
    b.fine=0;for(let f=-.1;f<=.1;f+=.01){b.fine=f;if(SIM.quote(t).pct>=.96)break;}
    if(mode==='dumb'){b.neben=false;b.blocks={};b.gewinn=.05;}
    SIM.submitBid(t.id);}
  // Inbox
  while(S.inbox.length){const it=S.inbox.shift();if(it.kind==='abrechnung'){((AUTO.AB=AUTO.AB||[])).push(it)}if(it.kind==='abrechnung'&&false)console.log('  ABR',JSON.stringify(it.real),JSON.stringify(it.calc),it.title,'pct',(it.pct*100).toFixed(1),'rev',it.revenue,'profit',it.profit,it.hints.map(h=>h.replace(/<[^>]+>/g,'')).join('|'));
    if(it.kind==='event'&&it.choices)SIM.resolveInbox(it.id,0);}
  // Polier / Büro / Kolonne / Upgrade
  if(mode==='smart'){
    const ui=SIM.upgradeInfo();
    if(ui&&ui.ok&&!AUTO.noUpgrade&&S.cash>=ui.cost+(S.stage>=2?30000:8000)){const r=SIM.upgrade(true);}
    if(S.stage>=3&&!SIM.hasRole('buero')&&S.office.length<SIM.stageDef().desks&&S.cash>40000&&S.kolonnen.length>=SIM.mgmtCap()&&S.kolonnen.length>=2){SIM.newCandidate('office',true);if(S.cand&&S.cand.c.role==='buero')SIM.hire();else S.cand=null;}
    if(S.stage>=2&&S.workers.filter(w=>w.role==='polier').length<Math.floor(S.kolonnen.length/2)&&S.cash>50000&&S.kolonnen.length>=3){SIM.newCandidate('polier',true);const k=S.kolonnen.find(k=>!k.polier);if(k)SIM.hire(k.id);else S.cand=null;}
    if(S.cash>38000+10000*S.kolonnen.length&&S.kolonnen.length<SIM.mgmtCap())SIM.addKolonne();
    if(S.stage>=3&&S.kolonnen.length>=4&&!SIM.hasRole("bauleiter")&&S.cash>50000&&S.office.length<SIM.stageDef().desks){for(let t=0;t<6;t++){SIM.newCandidate('office',true);if(S.cand.c.role==='bauleiter'){SIM.hire();break;}S.cand=null;}}
    // Spezialisten
    
  }
}

  bot();
} };
if (typeof module !== 'undefined') module.exports = AUTO;
