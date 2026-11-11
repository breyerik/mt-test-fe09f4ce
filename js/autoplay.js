/* Autoplay-Bot (nur Test/Debug): spielt das Spiel ueber die SIM-API. Browser: MT.auto(true) mit ?debug=1. */
const AUTO = { mode: 'smart', AB: [], run() {
  const S = SIM.S, mode = AUTO.mode;
function want(kind,pred,tries){ // Bewerber behalten; weitere nur per bezahltem Neu-Würfeln
  SIM.newCandidate(kind,true);
  for(let i=0;i<tries;i++){ if(pred(S.cand.c))return true; if(!SIM.newCandidate(kind,false).ok)return false; }
  return pred(S.cand.c); }
function fillSlots(){for(const k of S.kolonnen)for(let i=0;i<3;i++)if(!k.slots[i]){
  // Bewerber würfeln bis brauchbar
  const need=!k.slots.some(id=>id&&S.workers.find(w=>w.id===id).role==='maurer');
  want('baustelle',c=>c.role==='maurer'||c.role==='helfer'&&!need||c.role==='betonbauer',mode!=='dumb'?3:0);
  if(S.cand){SIM.hire(k.id,i)}}}
function ensureSkill(role){ // Betonbauer etc. in eine freie Kolonne holen (Helfer ersetzen)
  const sk=role==='betonbauer'?'beton':role;
  if(S.kolonnen.some(k=>[...SIM.kolSkills(k)].includes(sk)))return;
  const k=S.kolonnen.find(k=>SIM.kolonneFree(k)&&k.slots.some(id=>id&&S.workers.find(w=>w.id===id).role==='helfer'));
  if(!k)return; const hel=k.slots.find(id=>id&&S.workers.find(w=>w.id===id).role==='helfer');
  if(S.cash<20000)return;
  if(want('baustelle',c=>c.role===role,8)){SIM.fire(hel);SIM.hire(k.id,k.slots.indexOf(null));}}
function bot(){
  if(S.cash<9000&&SIM.creditLimit()>5000)SIM.takeCredit(Math.min(25000,SIM.creditLimit()));
  if(S.cash>60000&&S.kredit>0)SIM.repayCredit(Math.min(S.kredit,S.cash-40000));
  if(S.stage>=2&&S.ruf>=5&&mode!=='dumb')ensureSkill('betonbauer');
  fillSlots();
  // Zugesagte starten
  for(const t of S.tenders.filter(t=>t.state==='zugesagt')){const free=S.kolonnen.filter(k=>SIM.kolonneFree(k));const r=SIM.assignJob(t.id,free.slice(0,t.needK).map(k=>k.id));if(!r.ok&&false)console.log('  assign fail',t.title,r.msg)}
  // Lohn
  for(const k of S.kolonnen){if(SIM.kolonneFree(k)&&S.lohnOffers.length){const offs=S.lohnOffers.slice().sort((a,b)=>SIM.lohnWeekly(b,k)-SIM.lohnWeekly(a,k));for(const o of offs){if(SIM.acceptLohn(o.id,k.id).ok)break;}}}
  // Angebote
  for(const t of S.tenders.filter(t=>t.state==='offen')){
    const sk=new Set();S.kolonnen.forEach(k=>SIM.kolSkills(k).forEach(x=>sk.add(x)));
    if(t.needSkills.some(s=>!sk.has(s)))continue;if(S.kolonnen.length<t.needK)continue;
    SIM.openCalc(t);const b=t.bid;b.neben=mode!=='dumb';Object.keys(t.blocks).forEach(k=>b.blocks[k]=t.blocks[k].need);
    // Gewinnaufschlag: höchster Preis, bei dem die Ampel grün ist (gute Zuschlagchance und Kosten gedeckt); sonst kein Gebot
    b.fine=0;let okf=null;if(!SIM.outlook){for(let f=-.1;f<=.1;f+=.01){b.fine=f;if(SIM.quote(t).pct>=.96){okf=f;break}}if(okf===null)okf=.1}else for(let f=.12;f>=-.12;f-=.01){b.fine=f;if(SIM.outlook(t).level==='g'){okf=f;break}}
    if(okf===null&&mode!=='dumb'){continue}b.fine=okf===null?0:okf;
    if(mode==='dumb'){b.neben=false;b.blocks={};b.gewinn=.05;}
    SIM.submitBid(t.id);}
  // Inbox
  while(S.inbox.length){const it=S.inbox.shift();if(it.kind==='abrechnung'){((AUTO.AB=AUTO.AB||[])).push(it)}if(it.kind==='abrechnung'&&false)console.log('  ABR',JSON.stringify(it.real),JSON.stringify(it.calc),it.title,'pct',(it.pct*100).toFixed(1),'rev',it.revenue,'profit',it.profit,it.hints.map(h=>h.replace(/<[^>]+>/g,'')).join('|'));
    if(it.kind==='event'&&it.choices)SIM.resolveInbox(it.id,0);}
  // Polier / Büro / Kolonne / Upgrade
  if(mode==='expand'){ // "vernünftiger Spieler": baut zügig aus (Stufe 3, Büro-Team Stück für Stück, Kolonnen bis Limit), beachtet die Kassenprognose falls vorhanden
    const ok=(f,strict)=>{if(AUTO.noFC||!SIM.forecast)return true;const l=SIM.forecast(f()).level;return strict?l==='ok':l!=='bad'};
    const ui=SIM.upgradeInfo();
    if(ui&&ui.ok&&S.cash>=ui.cost+10000&&ok(()=>({once:ui.cost,fixedMonthAt:i=>{const f0=SIM.fixedMonth(0);return f0+(ui.next.fixed-f0)*Math.min(1,i/Math.max(1,BAL.stageRamp[S.stage]||1))}}),true)){SIM.upgrade(true);}
    if(S.stage>=3&&S.week%2===0&&S.cash>=25000){
      for(const r of ['buero','bauleiter','kalk','einkauf']){
        if(SIM.hasRole(r)||BAL.roles[r].stage>S.stage||S.office.length>=SIM.stageDef().desks||S.cash<20000)continue;
        if(S.kolonnen.length<BAL.roles[r].ab&&!(r==='bauleiter'&&S.kolonnen.length>=SIM.mgmtCap()))continue; // "lohnt ab N Kolonnen" (steht im Bewerber-Dialog)
        if(!ok(()=>({once:BAL.hireFeeOffice,wagesAt:i=>BAL.roles[r].monthly*(i<=8?.6:1)/4}),true))break;
        if(want('office',c=>c.role===r,4)&&ok(()=>({once:BAL.hireFeeOffice,wagesAt:i=>S.cand.c.monthly*(i<=8?.6:1)/4}),true)){SIM.hire();}
        break;
      }
    }
    if(S.stage>=2&&S.workers.filter(w=>w.role==='polier').length<Math.floor(S.kolonnen.length/2)&&S.cash>40000&&S.kolonnen.length>=3){const k=S.kolonnen.find(k=>!k.polier);if(k){SIM.newCandidate('polier',true);SIM.hire(k.id);}}
    if(S.kolonnen.length<SIM.mgmtCap()&&S.cash>30000+6000*S.kolonnen.length&&ok(()=>({once:14000,wagesAt:()=>5200}))){SIM.addKolonne();}
  }
  if(mode==='smart'){
    const ui=SIM.upgradeInfo();
    if(ui&&ui.ok&&!AUTO.noUpgrade&&S.cash>=ui.cost+(S.stage>=2?30000:8000)){const r=SIM.upgrade(true);}
    if(S.stage>=3&&!SIM.hasRole('buero')&&S.office.length<SIM.stageDef().desks&&S.cash>40000&&S.kolonnen.length>=SIM.mgmtCap()&&S.kolonnen.length>=2){if(want('office',c=>c.role==='buero',4))SIM.hire();}
    if(S.stage>=2&&S.workers.filter(w=>w.role==='polier').length<Math.floor(S.kolonnen.length/2)&&S.cash>50000&&S.kolonnen.length>=3){const k=S.kolonnen.find(k=>!k.polier);if(k){SIM.newCandidate('polier',true);SIM.hire(k.id);}}
    if(S.cash>38000+10000*S.kolonnen.length&&S.kolonnen.length<SIM.mgmtCap())SIM.addKolonne();
    if(S.stage>=3&&S.kolonnen.length>=4&&!SIM.hasRole("bauleiter")&&S.cash>50000&&S.office.length<SIM.stageDef().desks){if(want('office',c=>c.role==='bauleiter',6))SIM.hire();}
    // Spezialisten
    
  }
}

  bot();
} };
if (typeof module !== 'undefined') module.exports = AUTO;
