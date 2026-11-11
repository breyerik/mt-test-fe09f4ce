/* Maurer Tycoon – alle Spielwerte an EINER Stelle (balance.js).
   Quellen: Vegapunk (Leistungswerte, Preisbänder), Bob (Gehälter, Fixkosten, Schwellen, Kipppunkte).
   Alles gerundete SPIELWERTE zum Balancen, keine echten Angebote. 1 Spielmonat = 4 Wochen, 1 Spieljahr = 12 Monate. */
const BAL = {
  weekMs: 8000,              // Echtzeit pro Spielwoche bei x1
  speeds: [0, 1, 2, 4],      // Pause, x1, x2, x4
  mwst: 1.19,                // Angebotspreise werden BRUTTO gezeigt; intern rechnet die Firma netto
  weeksPerMonth: 4, monthsPerYear: 12,
  startMonth: 4,             // Spielstart im April (kein Frost in den ersten Wochen)
  start: { cash: 25000, ruf: 0, weeklyFreeHires: 3 },
  tendersUnlockWeek: 8,      // vorher nur Lohnarbeit (Erik: erst ein paar Wochen Lohnarbeit)
  hireAdCost: 350,           // neu würfeln (Stellenanzeige), die ersten Bewerber je Platz sind frei
  hireFeeOffice: 600,
  // Rollen. monthly = Arbeitgeber-Vollkosten je Spielmonat (Bob). prod = Leistungsfaktor in der Kolonne.
  roles: {
    helfer:   { n:'Helfer',            monthly:5800, prod:.80, skills:[],            stage:1, kol:true },
    maurer:   { n:'Maurer',            monthly:7500, prod:1.0, skills:['mauern'],    stage:1, kol:true },
    betonbauer:{n:'Betonbauer',        monthly:7800, prod:.95, skills:['mauern','beton'], stage:1, kol:true },
    eisen:    { n:'Eisenflechter',     monthly:7600, prod:.90, skills:['bewehren'],  stage:1, kol:true },
    bagger:   { n:'Baggerfahrer',      monthly:8000, prod:.85, skills:['bagger'],    stage:1, kol:true, legacy:true },   // nur für alte Spielstände, wird nicht mehr angeworben
    kran:     { n:'Kranfahrer',        monthly:8300, prod:.85, skills:['kran'],      stage:3, kol:true },
    azubi:    { n:'Azubi (Maurer)',    monthly:1900, prod:.40, skills:[],            stage:2, kol:true },
    polier:   { n:'Polier',            monthly:8000, prod:1.0, skills:['mauern'],    stage:2, kol:false, polier:true },
    buero:    { n:'Bürokraft',         monthly:4000, prod:0, skills:[], stage:2, office:true, ab:2 },
    einkauf:  { n:'Einkäufer',         monthly:5500, prod:0, skills:[], stage:3, office:true, ab:4 },
    kalk:     { n:'Kalkulator',        monthly:6000, prod:0, skills:[], stage:3, office:true, ab:3 },
    bauleiter:{ n:'Bauleiter',         monthly:6600, prod:0, skills:[], stage:3, office:true, ab:3 },
    sifa:     { n:'Sicherheitsfachkraft',monthly:4500, prod:0, skills:[], stage:3, office:true, ab:4 },
    dispo:    { n:'Disponent',         monthly:6200, prod:0, skills:[], stage:4, office:true, ab:4 },
    akquise:  { n:'Akquise / Vertrieb',monthly:6000, prod:0, skills:[], stage:4, office:true, ab:4 }
  },
  // Gewürfelte Mitarbeiter: Verteilung der Berufe beim Anwerben (Baustelle)
  hirePool: [['maurer',40],['helfer',32],['betonbauer',9],['eisen',6],['azubi',7]],
  officePool: ['buero','einkauf','kalk','bauleiter','sifa','dispo','akquise'],
  azubiWeeksPerYear: 24,     // Lehrjahr = 24 Spielwochen (3 Lehrjahre -> Gesellenprüfung)
  azubiMonthly: [1600, 1900, 2300],
  azubiProd: [.25, .40, .60],
  tempoBase: .80, tempoPer: .08,   // Leistung = base + per*Tempo
  polierBonus: .15,
  teamBonus: 1,              // +1 auf alle Werte bei gleicher Herkunft wie die Büro-Flagge (Nationalitäten-Paket)
  hoursPerWeek: 40,
  // Büro-Stufen (Bob, ergänzt auf 6 Stufen). fixed = Fixkosten je Spielmonat, cost = Ausbau-Kosten (einmalig)
  stages: [
    { id:1, n:'Baucontainer',               fixed:350,   cost:0,      kol:1, desks:0,  need:null },
    { id:2, n:'Doppelcontainer + Lager',    fixed:1100,  cost:15000,  kol:2, desks:1,  need:{ umsatz:25000,  ek:20000,  bon:25 } },
    { id:3, n:'Gemietetes Büro mit Bauhof', fixed:2600,  cost:45000,  kol:4, desks:4,  need:{ umsatz:70000,  ek:60000,  bon:45 } },
    { id:4, n:'Halle mit Büro + Fuhrpark',  fixed:6500,  cost:160000, kol:6, desks:6,  need:{ umsatz:200000, ek:180000, bon:65 }, finance:true },
    { id:5, n:'Niederlassung mit Kran',     fixed:10000, cost:300000, kol:8, desks:8,  need:{ umsatz:300000, ek:300000, bon:75 }, finance:true },
    { id:6, n:'Firmenzentrale',             fixed:14500, cost:600000, kol:10,desks:10, need:{ umsatz:450000, ek:500000, bon:85 }, finance:true }
  ],
  // Stufen-Ausbau: Fixkosten steigen nach dem Kauf linear über N Wochen auf den neuen Wert (Index = neue Stufe - 1)
  stageRamp: [0, 4, 12, 16, 20, 24],
  // Büro-Team: Probezeit mit reduziertem Gehalt, dazu klare Wirkung je Rolle (siehe ui.js)
  probation: { weeks: 8, share: .6 },
  bauleiterProd: .06,        // Bauleiter: +6 % Leistung in allen Kolonnen (Koordination)
  tenderStage3: .5,          // ab Stufe 3: zweite Chance pro Woche auf eine weitere Ausschreibung
  // Kassenprognose: Vorschau-Horizont in Wochen
  forecast: { weeks: 8 },
  bonitaet: { base:10, ekLog:13, umsatzDiv:12000, umsatzMax:25, rufMul:.3, kreditMalus:.00004 },
  bank: { zinsWeek:.0015, limitPerBon:1500, overdraftWeek:.0025, overdraftBase:2000, overdraftPerBon:300, insolvencyWeeks:8, rescue:30000 },
  // Fahrzeuge & Geräte (Kaufen oder Mieten – echte Abwägung)
  vehicle: { transporter:{ n:'Transporter', price:14000, weekly:70 }, kipper:{ n:'Kipper', price:38000, weekly:150 } },
  geraete: {
    geruest: { n:'Gerüst-Satz (EFH)',   price:22000,  stage:2, txt:'Gerüstbau kostet nur noch etwa die Hälfte.' },
    schalung:{ n:'Systemschalung',      price:45000,  stage:3, txt:'Beton-/Schalarbeit etwa 12 % schneller.' },
    turmkran:{ n:'Turmdrehkran (gebraucht)', price:120000, stage:4, rentDay:1500, txt:'Kein Mobilkran-Mietpreis mehr, ermöglicht Großprojekte.' },
    winter:  { n:'Winterbau-Ausrüstung',price:6000,   stage:2, txt:'Arbeiten bei Frost möglich (Lohn +15 %).' }
  },
  rent: { mobilkranDay:1500, entsorgung:[600,2200], fuhrWeek:70 },
  // Deko / Ausstattung mit kleinen Boni
  deko: {
    kaffee: { n:'Kaffeemaschine', price:400,  txt:'Laune +, Tempo +2 %.' },
    tafel:  { n:'Bautafel mit Fotos', price:600, txt:'Fertige Projekte hängen als Foto dran. Ruf +1 je Projekt.' },
    pokal:  { n:'Pokal-Regal',   price:1500, txt:'Kundenvertrauen: Gebote wirken 0,5 % günstiger.', stage:2 },
    hund:   { n:'Bürohund',      price:800,  txt:'Laune +, ab und zu ein Kommentar.' },
    plotter:{ n:'Plotter / Pläne', price:2500, txt:'Kalkulation genauer (-2 Prozentpunkte), Markt-Schätzung enger.', stage:2 }
  },
  // Kalkulation / Angebot
  calc: {
    mittellohnBrutto: 28,        // Mittellohn ohne Nebenkosten (€/h)
    nebenkosten: 1.8,            // Lohnnebenkosten-Faktor (SV, SOKA, BG): Brutto x 1,8 = Arbeitgeber-Vollkosten
    spreadStart: .25, spreadMin: .15, spreadPerAuftrag: .01, spreadKalk: .15, spreadKalkPerSkill: .012, plotterBonus: .02,
    agk: [.07,.12,.09], wagnis: [.02,.05,.03], gewinn: [.03,.08,.05],   // [min,max,default]
    submissionWeeks: 1, tenderLife: [4,7], startWindow: 8, vertragsstrafe: .03
  },
  // Konkurrenz (Preisspiegel): jeder Rivale hat ein festes Profil + persönlichen Versatz + schwankende Auslastung (ausgelastet = teurer)
  rivalProfiles: { aggressiv:{ mean:.95, sd:.05 }, normal:{ mean:1.00, sd:.045 }, teuer:{ mean:1.07, sd:.05 } },
  rivals: [
    { n:'Spar-Rohbau GmbH',       prof:'aggressiv' },
    { n:'Nordlicht Bau KG',       prof:'aggressiv' },
    { n:'Beispiel & Söhne Rohbau',prof:'normal' },
    { n:'Musterbau Nord GmbH',    prof:'normal' },
    { n:'Fantasie-Hochbau AG',    prof:'teuer' },
    { n:'Hansa-Beispiel Hochbau', prof:'teuer' }
  ],
  rivalLoad: { step:.15, effect:.10, off:.02 },   // Auslastung 0..1 wandert pro Woche um ±step; Preis x (1+(Last-.5)*effect); persönlicher Versatz ±off
  // Bieten: Schätzbereich, Ampel (folgt der echten Zuschlagschance), Dumping-Regeln
  bidding: { fuzzTool:.02, fuzzNone:.04, rangeTool:.03, rangeNone:.06, green:.55, yellow:.25, excludeFrom:.85, excludeFull:.70, dumpPct:.88, dumpRuf:2, mindermenge:[.03,.08] },
  zone: { best:[.92,1.03], lowRisk:.90, tooHigh:1.08 },
  rufPrice: .0008,              // je Rufpunkt: Gebot wirkt so viel günstiger
  // Lohnarbeit
  lohn: { maurer:66, helfer:52, azubi:22, rateVar:[.92,1.1], weeks:[3,8], firms:['Musterbau Nord GmbH','Beispiel & Söhne Rohbau','Fantasie-Hochbau AG','Nordlicht Bau KG','Hansa-Beispiel Hochbau','Bauhütte Mustermann'] },
  // Abrechnung / Zahlung
  pay: { delay:4, delayBuero:2, abschlaege:[.25,.5,.75], abschlagShare:.25 },
  // Schwankung real vs. Kalkulation
  real: { aufwand:[.90,1.10], material:[.96,1.07], auftragswert:[1.08,1.18] },
  maengel: { base:.38, perQual:.03, polier:.10, bauleiter:.14, cost:[.01,.05] },
  weather: { regen:.65, sturm:0, frost:0, hitze:.92, kug:.6, winterMonths:[12,1,2,3], winterExtra:.15 },
  events: { perWeek:.38 },
  // Positionen (Marktpreis netto, Anteil Material/Nachunternehmer, Aufwand Std/Einheit, benötigte Fähigkeit)
  pos: {
    // --- einfache Positionen (Leistungsverzeichnis), Betonstahl ist in Sohle/Decken eingerechnet ---
    be_k:   { n:'Baustelleneinrichtung', u:'psch.', ep:1800, mat:.30, aufw:14,   skill:null },
    be:     { n:'Baustelleneinrichtung', u:'psch.', ep:5500, mat:.30, aufw:40,   skill:null },
    be_m:   { n:'Baustelleneinrichtung', u:'psch.', ep:14500,mat:.30, aufw:90,   skill:null },
    sohle:  { n:'Sohle (Bodenplatte)',   u:'m²',    ep:160,  mat:.47, aufw:1.05, skill:'beton' },
    sohle_k:{ n:'Sohle',                u:'m²',    ep:160,  mat:.47, aufw:1.05, skill:'mauern' },
    gmauer: { n:'Gartenmauer',           u:'m²',    ep:85,   mat:.40, aufw:.75,  skill:'mauern' },
    gwand:  { n:'Garagenwände',          u:'m²',    ep:90,   mat:.38, aufw:.90,  skill:'mauern' },
    kwand:  { n:'Kellerwände',           u:'m²',    ep:330,  mat:.52, aufw:1.73, skill:'beton' },
    kdecke: { n:'Kellerdecke',           u:'m²',    ep:165,  mat:.60, aufw:.77,  skill:'beton' },
    egaussen:{n:'EG-Außenwände',         u:'m²',    ep:307,  mat:.47, aufw:2.9,  skill:'mauern' },
    eginnen:{ n:'EG-Innenwände',         u:'m²',    ep:60,   mat:.38, aufw:.60,  skill:'mauern' },
    egdecke:{ n:'EG-Decke',              u:'m²',    ep:160,  mat:.55, aufw:.97,  skill:'beton' },
    ogaussen:{n:'OG-Außenwände',         u:'m²',    ep:307,  mat:.47, aufw:2.9,  skill:'mauern' },
    oginnen:{ n:'OG-Innenwände',         u:'m²',    ep:60,   mat:.38, aufw:.60,  skill:'mauern' },
    ogdecke:{ n:'OG-Decke',              u:'m²',    ep:160,  mat:.55, aufw:.97,  skill:'beton' },
    // --- alt: nur noch für Spielstände, die vor der Vereinfachung gespeichert wurden ---
    fund_k: { n:'Fundament C25/30',      u:'m³',    ep:200,  mat:.42, aufw:1.45, legacy:true, skill:'mauern' },
    fund:   { n:'Fundamentbalken C25/30',u:'m³',    ep:200,  mat:.42, aufw:1.45, legacy:true, skill:'beton' },
    platte: { n:'Bodenplatte C25/30',    u:'m³',    ep:204,  mat:.42, aufw:1.5,  legacy:true, skill:'beton' },
    stahl:  { n:'Betonstahl BSt500',     u:'t',     ep:1850, mat:.68, aufw:5.6,  legacy:true, skill:'beton' },
    ks175:  { n:'Mauerwerk KS 17,5 cm',  u:'m²',    ep:68,   mat:.38, aufw:.68,  legacy:true, skill:'mauern' },
    ks115:  { n:'Mauerwerk KS 11,5 cm',  u:'m²',    ep:53,   mat:.38, aufw:.53,  legacy:true, skill:'mauern' },
    verbl:  { n:'Verblendmauerwerk NF',  u:'m²',    ep:149,  mat:.46, aufw:1.5,  legacy:true, skill:'mauern' },
    verf:   { n:'Verfugen Verblender',   u:'m²',    ep:20,   mat:.10, aufw:.38,  legacy:true, skill:'mauern' },
    filig:  { n:'Filigrandecke + Aufbeton',u:'m²',  ep:87,   mat:.60, aufw:.55,  legacy:true, skill:'beton' },
    geruest:{ n:'Gerüst Auf-/Abbau + Vorhaltung',u:'m²',ep:14,mat:.80, aufw:.04,  legacy:true, skill:null },
    sturz:  { n:'Sturz / Überzug',       u:'m',     ep:85,   mat:.40, aufw:.80,  legacy:true, skill:'mauern' },
    ring:   { n:'Ringanker',             u:'m',     ep:45,   mat:.40, aufw:.45,  legacy:true, skill:'mauern' },
    schorn: { n:'Schornstein',           u:'m',     ep:515,  mat:.65, aufw:2.7,  legacy:true, skill:'mauern' },
    abdeck: { n:'Mauerabdeckung',        u:'m',     ep:38,   mat:.55, aufw:.45,  legacy:true, skill:'mauern' },
    aushub: { n:'Baugrube ausheben + abfahren',u:'m³',ep:35,  mat:.30, aufw:.34,  legacy:true, skill:'bagger' },
    kstahl: { n:'Bewehrung Keller',      u:'t',     ep:1850, mat:.68, aufw:5.6,  legacy:true, skill:'bewehren' },
    treppe: { n:'Treppe Stahlbeton (Fertigteil)',u:'Stk',ep:3500,mat:.75, aufw:9,   legacy:true, skill:'beton' },
    wand:   { n:'Stahlbetonwand 20 cm',  u:'m²',    ep:190,  mat:.50, aufw:1.05, legacy:true, skill:'beton' },
    stuetze:{ n:'Stahlbetonstütze',      u:'m',     ep:200,  mat:.50, aufw:1.1,  legacy:true, skill:'beton' }
  },
  // Auftragsarten (Ausschreibungen). q = Mengenbereich, 'psch' = 1 Stück
  tenders: {
    garten: { n:'Gartenmauer',            minStage:1, w:6, needK:1, ruf:0,  txt:'Kleiner Privatauftrag.', pos:[['be_k',[1,1]],['sohle_k',[7,12]],['gmauer',[30,60]]] },
    garage: { n:'Einzelgarage gemauert',  minStage:1, w:5, needK:1, ruf:0,  txt:'Garage mit Sohle und Wänden.', pos:[['be_k',[1,1]],['sohle_k',[24,34]],['gwand',[100,130]]] },
    efh:    { n:'Einfamilienhaus (ohne Keller)', minStage:2, w:4, needK:1, ruf:8,  txt:'Einfamilienhaus, 150 m² Wohnfläche. Die Decke kommt als Fertigplatten.', pos:[['be',[1,1]],['sohle',[85,115]],['egaussen',[170,240]],['eginnen',[240,330]],['egdecke',[95,130]]], kran:true, entsorg:true },
    efhk:   { n:'Einfamilienhaus mit Keller',   minStage:3, w:3, needK:1, ruf:20, txt:'Einfamilienhaus mit Keller.', pos:[['be',[1,1]],['sohle',[85,115]],['kwand',[170,230]],['kdecke',[95,125]],['egaussen',[170,240]],['eginnen',[240,330]],['egdecke',[95,130]]], kran:true, entsorg:true, needSkills:['bewehren'] },
    mfh:    { n:'Mehrfamilienhaus (8 WE)', minStage:4, w:2, needK:2, ruf:35, txt:'Großprojekt mit Tiefgarage und drei Geschossen. Erfordert zwei Kolonnen und Kran.', pos:[['be_m',[1,1]],['sohle',[280,340]],['kwand',[380,470]],['kdecke',[280,340]],['egaussen',[280,360]],['eginnen',[600,800]],['egdecke',[280,340]],['ogaussen',[280,360]],['oginnen',[600,800]],['ogdecke',[280,340]]], kran:true, entsorg:true, turm:true, needSkills:['kran','bewehren'] }
  }
};
if (typeof module !== 'undefined') module.exports = BAL;
