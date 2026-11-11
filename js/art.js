/* Szene: Stufen-Hintergrund (Yuki v2), Lauffiguren, Sprechblasen, Deko-Overlays.
   Austauschbar: ART.stageSrc / ART.walkSrc zeigen auf PNGs. Neue Stufenbilder von Yuki einfach unter assets/stageN.png ablegen. */
const ART = (() => {
  const W = 720, H = 1280;
  const ART = { imgs: {}, ready: false, walkers: [], bubbles: [], t: 0, flagEl: null };
  // Koordinaten im 720x1280-Raum. door = Ort, wo Besucher hineingehen; spawn = Hofrand; inside = nur Stufe 1: Gespraechsplatz im Container.
  ART.stages = {
    1: { door: [452, 700], spawn: [650, 900], pre: [500, 800], inside: [[440, 640], [410, 590]], flag: { x: 500, y: 300, w: 78, h: 52, skew: 26 }, dog: [360, 1190], tafel: [590, 1000] },
    2: { door: [430, 800], spawn: [680, 950], pre: [520, 880], flag: { x: 368, y: 368, w: 92, h: 62, skew: 26 }, dog: [360, 1190], tafel: [610, 900] },
    3: { door: [650, 720], spawn: [560, 1000], pre: [640, 880], flag: { x: 500, y: 268, w: 96, h: 64, skew: 26 }, dog: [360, 1190], tafel: [150, 1000] },
    4: { door: [300, 640], spawn: [520, 1080], pre: [300, 860], flag: { x: 350, y: 350, w: 96, h: 66, skew: 20 }, dog: [360, 1190], tafel: [560, 1000] },
    5: { door: [275, 700], spawn: [250, 1120], pre: [100, 900], flag: { x: 345, y: 350, w: 92, h: 62, skew: 26 }, dog: [360, 1190], tafel: [150, 1060] },
    6: { door: [330, 735], spawn: [460, 1110], pre: [330, 900], flag: { x: 640, y: 320, w: 90, h: 60, skew: 26 }, dog: [360, 1190], tafel: [150, 1080] }
  };
  const FRAMES = 4, WHO = { polier: 'polier', handwerker: 'handwerker', chef: 'chef', neu: 'handwerker' };
  function load(cb) {
    const names = {}; for (let i = 1; i <= 6; i++) names['stage' + i] = `assets/stage${i}.png`;
    ['chef', 'polier', 'handwerker'].forEach(w => ['r', 'l'].forEach(d => { for (let f = 0; f < FRAMES; f++) names[`w_${w}_${d}${f}`] = `assets/walk_${w}_${d}${f}.png`; }));
    ['deko_1', 'deko_2', 'deko_3', 'deko_4', 'deko_5', 'deko_6', 'tisch_1', 'tisch_3', 'tisch_4', 'tisch_5'].forEach(n => names[n] = `assets/${n}.png`);
    let left = Object.keys(names).length; if (!left) return cb();
    for (const k in names) { const im = new Image(); im.onload = im.onerror = () => { if (--left === 0) { ART.ready = true; cb && cb(); } }; im.src = names[k]; ART.imgs[k] = im; }
  }
  ART.load = load;
  ART.init = (canvas) => {
    ART.cv = canvas; ART.cx = canvas.getContext('2d'); ART.cx.imageSmoothingEnabled = true; ART.cx.imageSmoothingQuality = 'high';
    ART.sc = canvas.width / W;
  };
  const stageCfg = () => ART.stages[ART.stage || 1];
  ART.setStage = n => { ART.stage = n; ART.walkers = ART.walkers.filter(w => false); };
  ART.spawn = (who, text, opts) => {
    const st = stageCfg(); if (!st || ART.walkers.length > 4) return;
    const w = { who: WHO[who] || 'handwerker', x: st.spawn[0], y: st.spawn[1], i: 0, state: 'in', timer: 0, text: text || '', alpha: 1, speed: 70 + Math.random() * 25, face: 'l', f: 0 };
    const path = [st.spawn, st.pre, st.door];
    if (st.inside && (ART.stage === 1)) path.push(...st.inside);
    w.path = path; w.back = path.slice().reverse().slice(1); w.target = 1; ART.walkers.push(w);
  };
  ART.update = (dt, speedMul) => {
    ART.t += dt; const st = stageCfg(); if (!st) return;
    ART.walkers.forEach(w => {
      if (speedMul <= 0) return; const d = dt * speedMul;
      if (w.state === 'in' || w.state === 'out') {
        const tgt = w.state === 'in' ? w.path[w.target] : w.back[w.target]; const dx = tgt[0] - w.x, dy = tgt[1] - w.y, dist = Math.hypot(dx, dy);
        if (dist < 2) { w.target++; const arr = w.state === 'in' ? w.path : w.back; if (w.target >= arr.length) { if (w.state === 'in') { w.state = 'talk'; w.timer = 3 + Math.random() * 1.5; } else { w.state = 'gone'; } } }
        else { const sp = w.speed * d; w.x += dx / dist * Math.min(sp, dist); w.y += dy / dist * Math.min(sp, dist); w.face = dx >= 0 ? 'r' : 'l'; w.f += d * 8; }
        // Tuer: in Stufen 2+ verschwinden Besucher am Eingang
        if (ART.stage !== 1 && w.state === 'in' && Math.hypot(w.x - st.door[0], w.y - st.door[1]) < 22) { w.alpha = Math.max(0, w.alpha - d * 3); }
      } else if (w.state === 'talk') { w.timer -= d; if (ART.stage !== 1) w.alpha = 0; if (w.timer <= 0) { w.state = 'out'; w.target = 1; w.alpha = 1; } }
    });
    ART.walkers = ART.walkers.filter(w => w.state !== 'gone');
    if (ART.dogOn) { ART.dog = ART.dog || { x: stageCfg().dog[0], dir: 1 }; ART.dog.x += ART.dog.dir * 8 * dt * (speedMul > 0 ? 1 : 0); if (Math.abs(ART.dog.x - stageCfg().dog[0]) > 40) ART.dog.dir *= -1; }
  };
  const drawImg = (name, x, y, h, alpha, anchor) => {
    const im = ART.imgs[name]; if (!im || !im.naturalWidth) return; const s = ART.sc, k = h / im.naturalHeight, w = im.naturalWidth * k;
    const cx = ART.cx; cx.globalAlpha = alpha === undefined ? 1 : alpha; cx.drawImage(im, (x - w / 2) * s, (y - h) * s, w * s, h * s); cx.globalAlpha = 1;
  };
  function bubble(text, x, y) {
    const cx = ART.cx, s = ART.sc; const f = 22 * s * .5; cx.font = `${24 * s}px VT, monospace`;
    const tw = cx.measureText(text).width + 14 * s, th = 34 * s, bx = Math.max(4, Math.min(ART.cv.width - tw - 4, x * s - tw / 2)), by = y * s - th;
    cx.fillStyle = '#fffdf4'; cx.strokeStyle = '#26407a'; cx.lineWidth = 2 * s * .5; cx.beginPath(); cx.roundRect(bx, by, tw, th, 6 * s * .5); cx.fill(); cx.stroke();
    cx.beginPath(); cx.moveTo(x * s - 5, by + th); cx.lineTo(x * s, by + th + 8 * s * .5); cx.lineTo(x * s + 5, by + th); cx.fillStyle = '#fffdf4'; cx.fill();
    cx.fillStyle = '#26304a'; cx.textBaseline = 'middle'; cx.fillText(text, bx + 7 * s, by + th / 2 + 1);
  }
  ART.draw = () => {
    const cx = ART.cx, cv = ART.cv; if (!cx) return; cx.clearRect(0, 0, cv.width, cv.height);
    const g = cx.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#3aa0e8'); g.addColorStop(1, '#8cd4ff'); cx.fillStyle = g; cx.fillRect(0, 0, cv.width, cv.height);
    const bg = ART.imgs['stage' + (ART.stage || 1)]; if (bg && bg.naturalWidth) cx.drawImage(bg, 0, 0, cv.width, cv.height);
    const st = stageCfg(); const s = ART.sc;
    if (ART.deko && ART.deko.tafel) { drawImg('deko_2', st.tafel[0], st.tafel[1], 120); // Bautafel mit Foto-Punkten
      const n = Math.min(6, ART.photos || 0); cx.fillStyle = '#c85838'; for (let i = 0; i < n; i++) { cx.fillStyle = ['#c85838', '#3a62b8', '#3cb864', '#ffc800', '#8cd4ff', '#a8b2c0'][i % 6]; cx.fillRect((st.tafel[0] - 40 + (i % 3) * 28) * s, (st.tafel[1] - 82 + Math.floor(i / 3) * 24) * s, 22 * s, 16 * s); } }
    if (ART.deko && ART.deko.hund && ART.dog) { const by = Math.abs(Math.sin(ART.t * 3)) * 0; drawImg('deko_3', ART.dog.x, st.dog[1] - by, 56); }
    // Besucher nach y sortiert
    ART.walkers.slice().sort((a, b) => a.y - b.y).forEach(w => {
      if (w.alpha <= 0) return; const fr = Math.floor(w.f) % FRAMES; drawImg(`w_${w.who}_${w.face}${fr}`, w.x, w.y, 118, w.alpha);
      if (w.text && (w.state === 'talk' || (w.state === 'in' && w.target >= w.path.length - 1))) bubble(w.text, w.x, w.y - 124);
    });
    // Sprechblasen am Eingang (ab Stufe 2: Besucher sind im Gebaeude)
    ART.walkers.filter(w => w.state === 'talk' && ART.stage !== 1 && w.text).forEach(w => bubble(w.text, st.door[0], st.door[1] - 30));
  };
  ART.placeFlag = (el, flagKey) => {
    const st = stageCfg(); const cv = ART.cv; if (!el) return; const f = st.flag, sc = cv.clientWidth / W;
    el.style.width = f.w * sc + 'px'; el.style.height = f.h * sc + 'px'; el.style.left = (f.x - f.w / 2) * sc + 'px'; el.style.top = (cv.offsetTop + (f.y - f.h / 2) * sc) + 'px';
    el.style.transform = `skewY(${f.skew}deg)`;
  };
  return ART;
})();
