/* Truchet hexagonal — état du projet, interface, persistance. */
'use strict';

(function () {
const TH = window.TH;
const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};

const LS_PROJECT = 'truchet-hexagon.project.v1';
const LS_PALETTES = 'truchet-hexagon.palettes.v1';
const LS_UI = 'truchet-hexagon.ui.v1';
const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* quota, mode privé */ } };

/* ═════ données de départ ═════════════════════════════════════════════ */
const PRESETS = [
  { name: 'Corail & sauge', colors: ['#c8322d', '#4f9b8f', '#e0715f', '#a8d0c6'], bg: '#f3efe7' },
  { name: 'Bauhaus', colors: ['#d7263d', '#f4b400', '#1b4b9b', '#161616'], bg: '#f2ece0' },
  { name: 'Océan', colors: ['#0b3954', '#087e8b', '#bfd7ea', '#ff5a5f'], bg: '#f6f4ee' },
  { name: 'Terre cuite', colors: ['#7a3b2e', '#c46a3b', '#e7a977', '#3d5a40'], bg: '#efe6d8' },
  { name: 'Néon', colors: ['#ff2e88', '#00e5ff', '#ffe600', '#7c4dff'], bg: '#14121c' },
  { name: 'Pastel', colors: ['#f4a9a8', '#a7c8d8', '#e8c8a0', '#9ec1a5'], bg: '#fdf8f1' },
  { name: 'Encre', colors: ['#1d1d1f', '#4a4a50'], bg: '#f3efe7' },
];

const pct = (v) => Math.round(v * 100) + ' %';
const STYLE_DEFS = [
  { k: 'bands', panel: 'styleBands', label: 'Nombre de bandes', type: 'range', min: 1, max: 6, step: 1, def: 1 },
  { k: 'thickness', panel: 'styleBands', label: 'Épaisseur', type: 'range', min: 0.05, max: 1.2, step: 0.01, def: 0.32, fmt: pct },
  { k: 'gap', panel: 'styleBands', label: 'Écart entre bandes', type: 'range', min: 0, max: 3, step: 0.05, def: 0.5, fmt: (v) => '× ' + v.toFixed(2), show: (S) => S.bands > 1 },
  { k: 'profile', panel: 'styleBands', label: 'Profil', type: 'select', def: 'uni', show: (S) => S.bands > 1,
    options: [['uni', 'Bandes égales'], ['centre', 'Centre plus épais'], ['bords', 'Bords plus épais']] },
  { k: 'colorMode', panel: 'styleBands', label: 'Répartition des couleurs', type: 'select', def: 'curve',
    options: [['curve', 'Aléatoire (tirée par courbe)'], ['band', 'Ordre de la palette, bande par bande'], ['ribbon', 'Un ruban d’une seule couleur']] },
  { k: 'alpha', panel: 'styleBands', label: 'Opacité', type: 'range', min: 0.15, max: 1, step: 0.05, def: 1, fmt: pct },
  { k: 'outline', panel: 'styleShade', label: 'Contour', type: 'range', min: 0, max: 0.6, step: 0.02, def: 0, fmt: (v) => (v ? pct(v) : 'aucun') },
  { k: 'outlineColor', panel: 'styleShade', label: 'Couleur du contour', type: 'color', def: '#1d1d1f', show: (S) => S.outline > 0 },
  { k: 'shadow', panel: 'styleShade', label: 'Ombre portée', type: 'toggle', def: false },
  { k: 'shadowOpacity', panel: 'styleShade', label: 'Intensité', type: 'range', min: 0, max: 0.8, step: 0.05, def: 0.35, fmt: pct, show: (S) => S.shadow },
  { k: 'shadowDist', panel: 'styleShade', label: 'Distance', type: 'range', min: 0, max: 1.5, step: 0.05, def: 0.35, fmt: (v) => '× ' + v.toFixed(2), show: (S) => S.shadow },
  { k: 'shadowAngle', panel: 'styleShade', label: 'Direction', type: 'range', min: 0, max: 355, step: 5, def: 60, fmt: (v) => v + '°', show: (S) => S.shadow },
  { k: 'relief', panel: 'styleShade', label: 'Relief des bandes', type: 'range', min: 0, max: 2, step: 0.05, def: 0,
    fmt: (v) => (v ? '× ' + v.toFixed(2) : 'à plat'), show: (S) => S.shadow && S.bands > 1,
    title: 'Écart de hauteur entre la bande la plus basse et la plus haute d’un ruban : chaque bande porte son ombre sur sa voisine' },
  { k: 'shadowBlur', panel: 'styleShade', label: 'Flou', type: 'range', min: 0, max: 2, step: 0.05, def: 0.6, fmt: (v) => '× ' + v.toFixed(2), show: (S) => S.shadow },
  { k: 'palette', type: 'palette', def: PRESETS[0].colors },
];

const FORMAT_OPTS = [
  ['1:1', 'Carré 1:1'], ['4:5', 'Portrait 4:5'], ['9:16', 'Téléphone 9:16'], ['3:4', 'Portrait 3:4'],
  ['2:3', 'Portrait 2:3'], ['1:2', 'Portrait 1:2'], ['16:9', 'Écran 16:9'], ['21:9', 'Ultra-large 21:9'],
  ['4:3', 'Paysage 4:3'], ['3:2', 'Paysage 3:2'], ['5:4', 'Paysage 5:4'], ['2:1', 'Paysage 2:1'],
  ['custom', 'Taille libre…'],
];
const SETTING_DEFS = [
  { k: 'format', label: 'Format', type: 'select', def: '1:1', options: FORMAT_OPTS },
  { k: 'res', label: 'Définition', type: 'select', def: 2048, num: true, show: (s) => s.format !== 'custom',
    options: [[1024, '1K — 1024 px'], [2048, '2K — 2048 px'], [3840, '4K — 3840 px'], [8192, '8K — 8192 px']] },
  { k: 'customW', label: 'Largeur (px)', type: 'number', min: 64, max: 8192, def: 1600, show: (s) => s.format === 'custom' },
  { k: 'customH', label: 'Hauteur (px)', type: 'number', min: 64, max: 8192, def: 900, show: (s) => s.format === 'custom' },
  { k: 'density', panel: 'gridControls', label: 'Densité', type: 'range', min: 1, max: () => TH.densityMax(P.settings), step: 1, def: 8,
    fmt: (v) => v + ' hex.', title: 'Nombre d’hexagones sur le côté court du cadre' },
  { k: 'fit', panel: 'gridControls', label: 'Cadrage', type: 'segmented', def: 'bleed',
    options: [['bleed', 'Bord à bord'], ['whole', 'Hexagones entiers']] },
  { k: 'margin', label: 'Marge', type: 'range', min: 0, max: 25, step: 1, def: 0, fmt: (v) => v + ' %' },
  { k: 'bg', panel: 'gridControls', label: 'Fond', type: 'color', def: PRESETS[0].bg },
  { k: 'seed', panel: 'gridControls', label: 'Graine', type: 'number', min: 1, max: 999999, def: 7, title: 'Même graine = même grille' },
  { k: 'rotate', panel: 'gridControls', label: 'Rotations aléatoires', type: 'toggle', def: true },
  { k: 'randomShapes', panel: 'gridControls', label: 'Formes tirées au sort', type: 'toggle', def: false, title: 'Chaque case reçoit une forme au hasard ; les tuiles ne donnent plus que leur style' },
  { k: 'longArcs', panel: 'gridControls', label: '… avec les grands arcs', type: 'toggle', def: true, show: (s) => s.randomShapes },
  { k: 'showGrid', panel: 'gridControls', label: 'Afficher le quadrillage', type: 'toggle', def: false },
  { k: 'transparent', type: 'toggle', def: false },
];

const DEFAULT_TILES = [
  { name: 'Trèfle', conns: [[0, 1], [2, 3], [4, 5]], on: true },
  { name: 'Vague', conns: [[0, 1], [2, 5], [3, 4]], on: true },
  { name: 'Tresse', conns: [[0, 3], [1, 4], [2, 5]], on: false },
  { name: 'Grands arcs', conns: [[0, 2], [1, 4], [3, 5]], on: false },
];

/* ═════ normalisation (tout ce qui vient du stockage, d'un fichier ou d'un lien) ═ */
function cleanVal(d, v) {
  switch (d.type) {
    case 'range': case 'number': {
      const hi = typeof d.max === 'function' ? 8192 : d.max;
      let n = +v;
      if (!Number.isFinite(n)) return undefined;
      n = Math.min(hi, Math.max(d.min, n));
      return d.step && d.step < 1 ? +n.toFixed(String(d.step).split('.')[1].length) : Math.round(n);
    }
    case 'select': case 'segmented': {
      if (d.k === 'colorMode' && v === 'curveBands') v = 'curve';   // nom d'une version intermédiaire
      const hit = d.options.find(([o]) => String(o) === String(v));
      return hit ? hit[0] : undefined;
    }
    case 'toggle': case 'hidden': return !!v;
    case 'color': return TH.normColor(v) || undefined;
    case 'palette': { const p = TH.normPalette(v); return p.length ? p : undefined; }
  }
  return undefined;
}
function normFrom(defs, raw, partial) {
  const o = {};
  for (const d of defs) {
    const v = raw && raw[d.k] !== undefined ? cleanVal(d, raw[d.k]) : undefined;
    if (v !== undefined) o[d.k] = v;
    else if (!partial) o[d.k] = Array.isArray(d.def) ? d.def.slice() : d.def;
  }
  return o;
}
function normTile(t, id) {
  return {
    id,
    name: String((t && t.name) || 'Tuile ' + id).slice(0, 40),
    conns: TH.normConns(t && t.conns),
    on: !(t && t.on === false),
    weight: Math.max(1, Math.min(10, Math.round(+(t && t.weight)) || 1)),
    style: normFrom(STYLE_DEFS, t && t.style, true),
  };
}
function normProject(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const tilesRaw = Array.isArray(raw.tiles) && raw.tiles.length ? raw.tiles : DEFAULT_TILES;
  const tiles = tilesRaw.slice(0, 60).map((t, i) => normTile(t, i + 1));
  const edits = {};
  if (raw.edits && typeof raw.edits === 'object') {
    for (const [k, e] of Object.entries(raw.edits)) {
      if (!/^\d+,\d+$/.test(k) || !e) continue;
      const rot = ((Math.round(+e.rot) || 0) % 6 + 6) % 6, swap = Math.max(0, Math.round(+e.swap) || 0) % 60;
      if (rot || swap) edits[k] = { rot, swap };
    }
  }
  return {
    v: 1,
    settings: normFrom(SETTING_DEFS, raw.settings, false),
    style: normFrom(STYLE_DEFS, raw.style, false),
    tiles, edits,
  };
}

/* ═════ état ══════════════════════════════════════════════════════════ */
let P = normProject(lsGet(LS_PROJECT));
let LIB = (lsGet(LS_PALETTES) || []).map((p) => ({ name: String(p && p.name || 'palette').slice(0, 40), colors: TH.normPalette(p && p.colors) }))
  .filter((p) => p.colors.length);
const ui = {
  selected: P.tiles[0].id, multi: new Set([P.tiles[0].id]), anchor: P.tiles[0].id, target: 'global', picked: null, drag: false, pointer: null, hoverHandle: null,
  hoverCell: null, L: null, view: null, k: 1,
};

const tileById = (id) => P.tiles.find((t) => t.id === id) || null;
const selTile = () => tileById(ui.selected) || P.tiles[0];
/* tuiles sélectionnées (la principale est celle que montre l'éditeur) */
const selTiles = () => P.tiles.filter((t) => ui.multi.has(t.id));
/* tuiles dont on règle le style : aucune = réglages communs */
const targetTiles = () => (ui.target === 'sel' ? selTiles() : []);
const targetTile = () => (ui.target === 'sel' ? selTile() : null);
function fixSel() {
  for (const id of [...ui.multi]) if (!tileById(id)) ui.multi.delete(id);
  if (!tileById(ui.selected)) ui.selected = (selTiles()[0] || P.tiles[0]).id;
  ui.multi.add(ui.selected);
  if (!tileById(ui.anchor)) ui.anchor = ui.selected;
}
const effStyle = (tile) => Object.assign({}, P.style, tile ? tile.style : null);
const nextTileId = () => P.tiles.reduce((m, t) => Math.max(m, t.id), 0) + 1;

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => lsSet(LS_PROJECT, P), 250);
}

/* ═════ scène : cases → courbes → traits (mis en cache) ══════════════ */
const sceneCache = new Map(), geoCache = new Map();
const cachePut = (m, k, v, max = 6) => { if (m.size >= max) m.delete(m.keys().next().value); m.set(k, v); };

function styleResolver() {
  const memo = new Map();
  return (tid) => {
    if (!memo.has(tid)) {
      const S = effStyle(tileById(tid));
      S.sig = JSON.stringify(S);
      memo.set(tid, S);
    }
    return memo.get(tid);
  };
}

function computeCells(rows, cols) {
  const s = P.settings;
  let pool = P.tiles.filter((t) => t.on);
  if (!pool.length) pool = P.tiles;
  const total = pool.reduce((a, t) => a + t.weight, 0);
  const cells = [];
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const e = P.edits[q + ',' + r] || null;
    let x = TH.rng(s.seed, q, r, 'tile')() * total, idx = 0;
    while (idx < pool.length - 1 && x >= pool[idx].weight) { x -= pool[idx].weight; idx++; }
    if (e && e.swap) idx = (idx + e.swap) % pool.length;
    const tile = pool[idx];
    let conns = s.randomShapes ? TH.randomMatching(TH.rng(s.seed, q, r, 'shape'), s.longArcs) : tile.conns;
    const rot = (s.rotate ? Math.floor(TH.rng(s.seed, q, r, 'rot')() * 6) : 0) + (e ? e.rot : 0);
    conns = TH.rotateConns(conns, rot);
    cells.push({ q, r, conns, tid: tile.id });
  }
  return cells;
}

/* deux jeux de caches : quelques grilles complètes (lourdes), beaucoup de vignettes */
const tileSceneCache = new Map(), tileGeoCache = new Map();
function sceneFor(cells, gridKey, small) {
  const [gc, sc0, max] = small ? [tileGeoCache, tileSceneCache, 120] : [geoCache, sceneCache, 4];
  const styleFor = styleResolver();
  let geo = gc.get(gridKey);
  if (!geo) { geo = TH.buildGeometry(cells); cachePut(gc, gridKey, geo, max); }
  const tids = [...new Set(cells.map((c) => c.tid))];
  const sk = gridKey + '#' + tids.map((t) => styleFor(t).sig).join('|');
  let sc = sc0.get(sk);
  if (!sc) {
    sc = { cells, strokes: TH.buildStrokes(geo, styleFor) };
    cachePut(sc0, sk, sc, max);
  }
  return sc;
}

function mainScene(L) {
  const cells = computeCells(L.rows, L.cols);
  const key = L.cols + 'x' + L.rows + ':' + cells.map((c) => c.tid + TH.connSig(c.conns)).join(';');
  return sceneFor(cells, key);
}

/* ═════ rendu principal ═══════════════════════════════════════════════ */
const cv = $('view'), ctx = cv.getContext('2d');
const ov = $('overlay'), octx = ov.getContext('2d');
const stage = $('stage'), frame = $('frame');

function fitFrame(L) {
  const cs = getComputedStyle(stage);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const bar = stage.querySelector('.stage-bar').offsetHeight + $('formats').offsetHeight + 24;
  const aw = Math.max(80, stage.clientWidth - padX), ah = Math.max(80, stage.clientHeight - padY - bar);
  const ar = L.W / L.H;
  let w = Math.min(aw, ah * ar), h = w / ar;
  frame.style.width = Math.round(w) + 'px';
  frame.style.height = Math.round(h) + 'px';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const bw = Math.max(1, Math.round(Math.min(L.W, 2400, w * dpr)));
  const k = bw / L.W, bh = Math.max(1, Math.round(L.H * k));
  for (const c of [cv, ov]) if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
  return k;
}

function renderMain() {
  const L = TH.layout(P.settings);
  const k = fitFrame(L);
  const view = { W: cv.width, H: cv.height, R: L.R * k, ox: L.ox * k, oy: L.oy * k };
  const sc = mainScene(L);
  TH.paint(ctx, sc, view, paintOpts());
  frame.classList.toggle('checker', P.settings.transparent);
  ui.L = L; ui.view = view; ui.k = k; ui.scene = sc;
  drawOverlay();
}

function updateInfo() {
  const L = ui.L || TH.layout(P.settings);
  const on = P.tiles.filter((t) => t.on).length;
  $('tilesCount').textContent = on + ' / ' + P.tiles.length + ' en jeu';
  $('gridInfo').textContent = L.cols + ' × ' + L.rows;
  $('frameInfo').textContent = `${L.W} × ${L.H} px · ${L.cols} × ${L.rows} hexagones · graine ${P.settings.seed}`;
  syncFrameUI();
}

function drawOverlay() {
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, ov.width, ov.height);
  const c = ui.hoverCell, v = ui.view;
  if (!c || !v) return;
  octx.setTransform(...TH.viewTransform(v));
  const [cx, cy] = TH.cellCenter(c.q, c.r);
  octx.beginPath();
  TH.hexVerts().forEach(([x, y], i) => (i ? octx.lineTo(cx + x, cy + y) : octx.moveTo(cx + x, cy + y)));
  octx.closePath();
  octx.fillStyle = 'rgba(255,255,255,0.14)';
  octx.fill();
  octx.lineWidth = 2.5 / v.R;
  octx.strokeStyle = 'rgba(0,0,0,0.45)';
  octx.stroke();
  octx.lineWidth = 1.2 / v.R;
  octx.strokeStyle = '#fff';
  octx.stroke();
}

/* ═════ vignettes & éditeur ═══════════════════════════════════════════ */
function hexPathPx(c, cx, cy, R) {
  c.beginPath();
  TH.hexVerts().forEach(([x, y], i) => (i ? c.lineTo(cx + x * R, cy + y * R) : c.moveTo(cx + x * R, cy + y * R)));
  c.closePath();
}

function paintTile(canvas, tile, cssW, cssH, Rfrac) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  const c = canvas.getContext('2d');
  const R = Math.min(W, H) * Rfrac, cx = W / 2, cy = H / 2;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  const cells = [{ q: 0, r: 0, conns: tile.conns, tid: tile.id }];
  const sc = sceneFor(cells, 'tile' + tile.id + ':' + TH.connSig(tile.conns), true);
  c.save();
  hexPathPx(c, cx, cy, R);
  c.clip();
  TH.paint(c, sc, { W, H, R, ox: cx - (R * TH.SQ3) / 2, oy: cy - R }, { bg: P.settings.bg });
  c.restore();
  hexPathPx(c, cx, cy, R);
  c.lineWidth = 1 * dpr;
  c.strokeStyle = 'rgba(128,128,128,.45)';
  c.stroke();
  return { c, R, cx, cy, dpr };
}

function renderTileGrid() {
  const box = $('tileGrid');
  box.textContent = '';
  for (const t of P.tiles) {
    const card = el('button', 'tile-card' + (ui.multi.has(t.id) ? ' sel' : '') + (t.id === ui.selected && ui.multi.size > 1 ? ' primary' : '') + (t.on ? '' : ' off'));
    card.type = 'button';
    card.title = t.name + (t.on ? '' : ' (hors jeu)') + (Object.keys(t.style).length ? ' · style propre' : '');
    const c = el('canvas');
    card.appendChild(c);
    card.appendChild(el('span', 'tile-name', t.name));
    if (Object.keys(t.style).length) card.appendChild(el('i', 'own-mark'));
    card.onclick = (e) => selectTile(t.id, e.shiftKey ? 'range' : e.ctrlKey || e.metaKey ? 'toggle' : 'single', e.ctrlKey || e.metaKey);
    box.appendChild(card);
    paintTile(c, t, 62, 62, 0.47);
  }
  const add = el('button', 'tile-card add');
  add.type = 'button';
  add.title = 'Nouvelle tuile';
  add.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span class="tile-name">Nouvelle</span>';
  add.onclick = () => addTile({ name: 'Tuile ' + (P.tiles.length + 1), conns: TH.randomMatching(Math.random, true) });
  box.appendChild(add);
}

const ed = $('editorCanvas');
const ED_R = 0.4;
function edGeom() {
  const w = ed.clientWidth || 280;
  return { w, h: Math.round(w * 0.86) };
}
function renderEditor() {
  const t = selTile();
  const { w, h } = edGeom();
  ed.style.height = h + 'px';
  const { c, R, cx, cy, dpr } = paintTile(ed, t, w, h, ED_R);
  /* tracé de construction : l'axe de chaque connexion */
  c.save();
  c.lineWidth = 1.5 * dpr;
  c.setLineDash([4 * dpr, 4 * dpr]);
  c.strokeStyle = 'rgba(20,20,24,.55)';
  for (const [a, b] of t.conns) {
    const pts = TH.connPoints(a, b, a);
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(cx + x * R, cy + y * R) : c.moveTo(cx + x * R, cy + y * R)));
    c.stroke();
  }
  c.restore();
  /* fil élastique pendant une liaison */
  if (ui.picked !== null && ui.pointer) {
    const [mx, my] = TH.midPoint(ui.picked);
    c.beginPath();
    c.moveTo(cx + mx * R, cy + my * R);
    c.lineTo(ui.pointer[0] * dpr, ui.pointer[1] * dpr);
    c.lineWidth = 2 * dpr;
    c.strokeStyle = getCss('--accent');
    c.stroke();
  }
  /* poignées */
  const used = new Set(t.conns.flat());
  for (let i = 0; i < 6; i++) {
    const [mx, my] = TH.midPoint(i), x = cx + mx * R, y = cy + my * R;
    const picked = ui.picked === i, hov = ui.hoverHandle === i;
    c.beginPath();
    c.arc(x, y, (picked ? 10 : hov ? 9 : 7.5) * dpr, 0, Math.PI * 2);
    c.fillStyle = picked ? getCss('--accent') : used.has(i) ? '#1d1d1f' : '#ffffff';
    c.fill();
    c.lineWidth = 2 * dpr;
    c.strokeStyle = picked ? '#fff' : used.has(i) ? '#ffffff' : '#1d1d1f';
    c.stroke();
  }
  ed._geo = { R: R / dpr, cx: cx / dpr, cy: cy / dpr };
}

function handleAt(x, y) {
  const g = ed._geo;
  if (!g) return null;
  for (let i = 0; i < 6; i++) {
    const [mx, my] = TH.midPoint(i);
    if (Math.hypot(x - (g.cx + mx * g.R), y - (g.cy + my * g.R)) < 16) return i;
  }
  return null;
}
function edPos(e) {
  const r = ed.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
function connect(a, b) {
  const t = selTile();
  t.conns = TH.normConns(t.conns.filter(([x, y]) => x !== a && y !== a && x !== b && y !== b).concat([[a, b]]));
  tilesChanged();
}
function release(a) {
  const t = selTile();
  t.conns = t.conns.filter(([x, y]) => x !== a && y !== a);
  tilesChanged();
}
ed.addEventListener('pointerdown', (e) => {
  const p = edPos(e), h = handleAt(...p);
  ui.pointer = p;
  if (h === null) { ui.picked = null; renderEditor(); return; }
  ed.setPointerCapture(e.pointerId);
  if (ui.picked === null) { ui.picked = h; ui.drag = true; }
  else if (ui.picked === h) { release(h); ui.picked = null; }
  else { connect(ui.picked, h); ui.picked = null; }
  renderEditor();
});
ed.addEventListener('pointermove', (e) => {
  const p = edPos(e), h = handleAt(...p);
  ui.pointer = p;
  if (h !== ui.hoverHandle || ui.picked !== null) { ui.hoverHandle = h; renderEditor(); }
  ed.style.cursor = h !== null ? 'pointer' : 'default';
});
ed.addEventListener('pointerup', (e) => {
  const h = handleAt(...edPos(e));
  if (ui.drag && ui.picked !== null && h !== null && h !== ui.picked) { connect(ui.picked, h); ui.picked = null; }
  ui.drag = false;
  renderEditor();
});
ed.addEventListener('pointerleave', () => { ui.hoverHandle = null; ui.pointer = null; renderEditor(); });

function syncEditorFields() {
  const t = selTile();
  if (document.activeElement !== $('tileName')) $('tileName').value = t.name;
  $('tileOn').checked = t.on;
  $('tileWeight').value = t.weight;
  $('tileWeightVal').textContent = '× ' + t.weight;
  $('tileDel').disabled = P.tiles.length <= ui.multi.size;
  const n = ui.multi.size;
  $('selInfo').hidden = n < 2;
  $('selInfo').textContent = `${n} tuiles sélectionnées. L'interrupteur, la fréquence, Dupliquer et Supprimer s'appliquent à toutes ; la forme dessinée ici est celle de « ${t.name} ».`;
  $('styleSel').textContent = n > 1 ? `Sélection (${n})` : `« ${t.name} »`;
}

/* ═════ actions sur les tuiles ════════════════════════════════════════ */
/* mode : 'single' (clic), 'toggle' (Ctrl clic), 'range' (Maj clic, ajouté à la sélection avec Ctrl) */
function selectTile(id, mode = 'single', keep = false) {
  if (mode === 'toggle') {
    if (ui.multi.has(id) && ui.multi.size > 1) {
      ui.multi.delete(id);
      ui.anchor = id;
      id = ui.selected === id ? selTiles().pop().id : ui.selected;
    } else { ui.multi.add(id); ui.anchor = id; }
  } else if (mode === 'range') {
    const ids = P.tiles.map((t) => t.id);
    let a = ids.indexOf(ui.anchor), b = ids.indexOf(id);
    if (a < 0) a = b;
    if (!keep) ui.multi.clear();
    ids.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((x) => ui.multi.add(x));
  } else {
    ui.multi = new Set([id]);
    ui.anchor = id;
  }
  ui.selected = id;
  ui.picked = null;
  refreshTiles();
  syncStyle();
}
function addTile(t) {
  const tile = normTile(t, nextTileId());
  P.tiles.push(tile);
  selectTile(tile.id);
  tilesChanged();
  return tile;
}
function tilesChanged() {
  save();
  refreshTiles();
  requestRender();
}
function refreshTiles() {
  fixSel();
  renderTileGrid();
  renderEditor();
  syncEditorFields();
  updateInfo();
}

$('tileName').addEventListener('input', (e) => {
  selTile().name = e.target.value.slice(0, 40) || 'Sans nom';
  save();
  renderTileGrid();
  syncEditorFields();
});
$('tileOn').addEventListener('change', (e) => { selTiles().forEach((t) => (t.on = e.target.checked)); tilesChanged(); });
$('tileWeight').addEventListener('input', (e) => { selTiles().forEach((t) => (t.weight = +e.target.value)); tilesChanged(); });
$('tileRandom').onclick = () => {
  const t = selTile(), was = TH.connSig(t.conns);
  do t.conns = TH.randomMatching(Math.random, true); while (TH.connSig(t.conns) === was);
  tilesChanged();
};
$('tileRotate').onclick = () => { const t = selTile(); t.conns = TH.rotateConns(t.conns, 1); tilesChanged(); };
$('tileClear').onclick = () => { selTile().conns = []; tilesChanged(); };
$('tileDup').onclick = () => {
  const copies = selTiles().filter(() => P.tiles.length < 60).map((t) => {
    const c = normTile({ name: (t.name + ' (copie)').slice(0, 40), conns: t.conns, on: t.on, weight: t.weight, style: t.style }, nextTileId());
    P.tiles.push(c);
    return c.id;
  });
  if (!copies.length) return;
  ui.multi = new Set(copies);
  ui.selected = ui.anchor = copies[copies.length - 1];
  tilesChanged();
  syncStyle();
};
$('tileDel').onclick = () => {
  const gone = selTiles();
  if (P.tiles.length <= gone.length) return;
  const i = P.tiles.indexOf(gone[0]);
  P.tiles = P.tiles.filter((t) => !ui.multi.has(t.id));
  ui.selected = P.tiles[Math.max(0, Math.min(i, P.tiles.length) - 1)].id;
  ui.multi = new Set([ui.selected]);
  ui.anchor = ui.selected;
  P.edits = {};
  tilesChanged();
  syncStyle();
  toast(gone.length > 1 ? `${gone.length} tuiles supprimées` : `« ${gone[0].name} » supprimée`);
};
$('tileAddBase').onclick = () => {
  const have = new Set(P.tiles.map((t) => TH.canonical(t.conns)));
  let n = 0;
  for (const m of TH.baseShapes(true)) {
    if (have.has(TH.canonical(m)) || P.tiles.length >= 60) continue;
    P.tiles.push(normTile({ name: 'Forme ' + (P.tiles.length + 1), conns: m, on: false }, nextTileId()));
    n++;
  }
  tilesChanged();
  toast(n ? `${n} forme${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''} (hors jeu : activez-les au choix)` : 'Toutes les formes de base sont déjà là');
};

/* ═════ contrôles génériques ══════════════════════════════════════════ */
const controls = [];
function getCss(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

function buildControl(d, bind) {
  const isToggle = d.type === 'toggle';
  const row = el(isToggle ? 'label' : 'div', 'field ' + d.type);
  const lab = el(isToggle ? 'span' : 'label', 'lab', d.label);
  if (d.title) row.title = d.title;
  const id = 'c_' + d.k;
  if (!isToggle) lab.htmlFor = id;
  row.appendChild(lab);
  let dot = null;
  if (bind.overridden) {
    dot = el('button', 'override-dot');
    dot.type = 'button';
    dot.title = 'Réglage propre à cette tuile — cliquer pour revenir au réglage commun';
    dot.onclick = (e) => { e.preventDefault(); bind.reset(d.k); };
    lab.appendChild(dot);
  }
  let input, out = null, sync;
  const parse = (v) => (d.num || d.type === 'range' || d.type === 'number' ? +v : v);
  if (d.type === 'range') {
    input = el('input'); input.type = 'range'; input.step = d.step; input.min = d.min;
    out = el('output');
    input.oninput = () => bind.set(d.k, parse(input.value));
    row.append(input, out);
  } else if (d.type === 'number') {
    input = el('input'); input.type = 'number'; input.min = d.min; input.max = d.max;
    input.onchange = () => { const v = cleanVal(d, input.value); if (v !== undefined) bind.set(d.k, v); else sync(); };
    row.appendChild(input);
  } else if (d.type === 'select') {
    input = el('select');
    for (const [v, t] of d.options) { const o = el('option', null, t); o.value = v; input.appendChild(o); }
    input.onchange = () => bind.set(d.k, parse(input.value));
    row.appendChild(input);
  } else if (d.type === 'toggle') {
    const sw = el('span', 'switch');
    input = el('input'); input.type = 'checkbox';
    sw.append(input, el('span'));
    input.onchange = () => bind.set(d.k, input.checked);
    row.appendChild(sw);
  } else if (d.type === 'color') {
    input = el('input'); input.type = 'color';
    out = el('output');
    input.oninput = () => bind.set(d.k, input.value);
    row.append(input, out);
  } else if (d.type === 'segmented') {
    input = el('div', 'seg');
    input.setAttribute('role', 'radiogroup');
    for (const [v, t] of d.options) {
      const b = el('button', null, t); b.type = 'button'; b.dataset.v = v;
      b.onclick = () => bind.set(d.k, v);
      input.appendChild(b);
    }
    row.appendChild(input);
  }
  input.id = id;
  sync = () => {
    const S = bind.all(), v = S[d.k];
    row.hidden = d.show ? !d.show(S) : false;
    if (d.type === 'range') {
      const max = typeof d.max === 'function' ? d.max() : d.max;
      if (+input.max !== max) input.max = max;
      if (document.activeElement !== input || +input.value !== v) input.value = v;
      out.textContent = d.fmt ? d.fmt(+v) : v;
    } else if (d.type === 'toggle') input.checked = !!v;
    else if (d.type === 'segmented') [...input.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    else if (d.type === 'color') { if (input.value !== v) input.value = v; out.textContent = v; }
    else if (document.activeElement !== input) input.value = v;
    if (dot) dot.hidden = !bind.overridden(d.k);
    row.classList.toggle('own', !!(dot && bind.overridden(d.k)));
  };
  const c = { d, row, sync };
  controls.push(c);
  return c;
}

/* réglages de style : communs, ou propres à une tuile */
const styleBind = {
  all: () => effStyle(targetTile()),
  set: (k, v) => setStyleVal(k, v),
  overridden: (k) => targetTiles().some((t) => k in t.style),
  reset: (k) => { const ts = targetTiles(); if (ts.length) { ts.forEach((t) => delete t.style[k]); styleChanged(); } },
};
function setStyleVal(k, v) {
  const ts = targetTiles();
  if (ts.length) ts.forEach((t) => (t.style[k] = Array.isArray(v) ? v.slice() : v));
  else P.style[k] = v;
  styleChanged();
}
function styleChanged() {
  save();
  syncStyle();
  renderTileGrid();
  renderEditor();
  syncEditorFields();
  requestRender();
}

const settingsBind = {
  all: () => P.settings,
  set: (k, v) => {
    P.settings[k] = v;
    if (k === 'bg' && P.settings.transparent) {
      P.settings.transparent = false;           // choisir une couleur, c'est vouloir la voir
      toast('Fond transparent désactivé');
    }
    if (k === 'format' || k === 'res' || k === 'customW' || k === 'customH') {
      P.settings.density = Math.min(P.settings.density, TH.densityMax(P.settings));
    }
    if (k === 'density' || k === 'seed' || k === 'format' || k === 'res' || k === 'customW' || k === 'customH' || k === 'randomShapes' || k === 'fit') P.edits = {};
    save();
    syncSettings();
    if (k === 'bg') { renderTileGrid(); renderEditor(); }
    requestRender();
    updateInfo();
  },
};

for (const d of STYLE_DEFS) if (d.panel) $(d.panel).appendChild(buildControl(d, styleBind).row);
for (const d of SETTING_DEFS) if (d.panel) $(d.panel).appendChild(buildControl(d, settingsBind).row);
const styleControls = controls.filter((c) => STYLE_DEFS.includes(c.d));
const settingControls = controls.filter((c) => SETTING_DEFS.includes(c.d));

/* fond transparent (réglé dans Exporter) : le dire là où l'on choisit le fond */
const bgNote = el('div', 'bg-note');
bgNote.append(el('span', null, 'Fond transparent : la couleur n’est pas utilisée. '));
const bgNoteBtn = el('button', 'link', 'Remettre le fond');
bgNoteBtn.type = 'button';
bgNoteBtn.onclick = () => settingsBind.set('transparent', false);
bgNote.appendChild(bgNoteBtn);
$('c_bg').closest('.field').after(bgNote);

function syncSettings() {
  settingControls.forEach((c) => c.sync());
  syncFrameUI();
}
function syncStyle() {
  styleControls.forEach((c) => c.sync());
  renderPalette();
  renderPresets();
  const ts = targetTiles();
  $('styleReset').hidden = !ts.some((t) => Object.keys(t.style).length);
  $('targetHint').hidden = !ts.length;
  document.querySelector('h3 .override-dot[data-key="palette"]').hidden = !ts.some((t) => t.style.palette);
  $('styleAll').setAttribute('aria-pressed', String(ui.target !== 'sel'));
  $('styleSel').setAttribute('aria-pressed', String(ui.target === 'sel'));
}

$('styleAll').onclick = () => { ui.target = 'global'; syncStyle(); };
$('styleSel').onclick = () => { ui.target = 'sel'; syncStyle(); };
$('styleReset').onclick = () => {
  const ts = targetTiles();
  ts.forEach((t) => (t.style = {}));
  styleChanged();
  toast(ts.length > 1 ? `${ts.length} tuiles suivent de nouveau les réglages communs` : `« ${ts[0].name} » suit de nouveau les réglages communs`);
};
document.querySelector('h3 .override-dot[data-key="palette"]').onclick = () => styleBind.reset('palette');

/* ═════ palette ═══════════════════════════════════════════════════════ */
function curPalette() { return effStyle(targetTile()).palette; }
function renderPalette() {
  const box = $('palette'), pal = curPalette(), sig = pal.join(',');
  if (box.dataset.sig === sig) return;          // ne pas fermer un sélecteur de couleur ouvert
  box.dataset.sig = sig;
  box.textContent = '';
  pal.forEach((col, i) => {
    const chip = el('div', 'chip');
    const inp = el('input');
    inp.type = 'color'; inp.value = col; inp.title = col;
    inp.oninput = () => {
      const p = curPalette().slice();
      p[i] = inp.value;
      box.dataset.sig = p.join(',');
      setStyleVal('palette', p);
    };
    chip.appendChild(inp);
    if (pal.length > 1) {
      const x = el('button', 'chip-x', '×');
      x.type = 'button';
      x.title = 'Retirer cette couleur';
      x.onclick = () => setStyleVal('palette', curPalette().filter((_, j) => j !== i));
      chip.appendChild(x);
    }
    box.appendChild(chip);
  });
  if (pal.length < TH.MAX_COLORS) {
    const add = el('button', 'chip add', '+');
    add.type = 'button';
    add.title = 'Ajouter une couleur';
    add.onclick = () => {
      const p = curPalette();
      const h = TH.rng(p.join(), 'add')();
      const col = '#' + [0, 1, 2].map((k) => Math.floor(60 + 180 * TH.rng(h, k)()).toString(16).padStart(2, '0')).join('');
      setStyleVal('palette', p.concat([col]));
    };
    box.appendChild(add);
  }
}

function presetRow(p, removable) {
  const row = el('div', 'preset');
  const b = el('button', 'preset-apply');
  b.type = 'button';
  const sw = el('span', 'swatches');
  if (p.bg) { const s = el('i', 'bgsw'); s.style.background = p.bg; sw.appendChild(s); }
  for (const c of p.colors) { const s = el('i'); s.style.background = c; sw.appendChild(s); }
  b.append(sw, el('span', 'preset-name', p.name));
  b.title = 'Appliquer' + (p.bg ? ' (avec son fond)' : '');
  b.onclick = () => {
    setStyleVal('palette', p.colors.slice());
    if (p.bg && !targetTile()) settingsBind.set('bg', p.bg);
  };
  if (curPalette().join() === p.colors.join()) row.classList.add('on');
  row.appendChild(b);
  if (removable) {
    const x = el('button', 'preset-x', '×');
    x.type = 'button';
    x.title = 'Supprimer cette palette enregistrée';
    x.onclick = () => { LIB.splice(LIB.indexOf(p), 1); lsSet(LS_PALETTES, LIB); renderPresets(); };
    row.appendChild(x);
  }
  return row;
}
function renderPresets() {
  const box = $('presets');
  box.textContent = '';
  PRESETS.forEach((p) => box.appendChild(presetRow(p, false)));
  if (LIB.length) {
    box.appendChild(el('div', 'presets-sep', 'Mes palettes'));
    LIB.forEach((p) => box.appendChild(presetRow(p, true)));
  }
}

$('palShuffle').onclick = () => {
  const p = curPalette().slice();
  for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  setStyleVal('palette', p);
};
$('palSave').onclick = () => {
  $('palImportForm').hidden = true;
  $('palSaveForm').hidden = !$('palSaveForm').hidden;
  if (!$('palSaveForm').hidden) $('palSaveName').focus();
};
function savePalette() {
  const name = $('palSaveName').value.trim() || 'Palette ' + (LIB.length + 1);
  const hit = LIB.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (hit) hit.colors = curPalette().slice(); else LIB.push({ name, colors: curPalette().slice() });
  lsSet(LS_PALETTES, LIB);
  $('palSaveName').value = '';
  $('palSaveForm').hidden = true;
  renderPresets();
  toast(`Palette « ${name} » enregistrée`);
}
$('palSaveOk').onclick = savePalette;
$('palSaveName').onkeydown = (e) => { if (e.key === 'Enter') savePalette(); };
$('palImportBtn').onclick = () => {
  $('palSaveForm').hidden = true;
  $('palImportForm').hidden = !$('palImportForm').hidden;
  if (!$('palImportForm').hidden) $('palImportText').focus();
};
$('palImportOk').onclick = () => {
  try {
    const r = TH.parsePalette($('palImportText').value);
    const name = r.name || 'Importée ' + (LIB.length + 1);
    LIB.push({ name, colors: r.colors });
    lsSet(LS_PALETTES, LIB);
    setStyleVal('palette', r.colors.slice());
    $('palImportText').value = '';
    $('palImportMsg').textContent = '';
    $('palImportForm').hidden = true;
    toast(`« ${name} » importée : ${r.colors.length} couleurs`);
  } catch (err) {
    $('palImportMsg').textContent = err.message;
  }
};

/* ═════ clics sur la grille ═══════════════════════════════════════════ */
function cellFromEvent(e) {
  if (!ui.L) return null;
  const r = ov.getBoundingClientRect();
  const x = ((e.clientX - r.left) * (ov.width / r.width)) / ui.k;
  const y = ((e.clientY - r.top) * (ov.height / r.height)) / ui.k;
  return TH.cellAt(ui.L, x, y);
}
ov.addEventListener('pointermove', (e) => {
  const c = cellFromEvent(e);
  if ((c && ui.hoverCell && c.q === ui.hoverCell.q && c.r === ui.hoverCell.r) || (!c && !ui.hoverCell)) return;
  ui.hoverCell = c;
  drawOverlay();
});
ov.addEventListener('pointerleave', () => { ui.hoverCell = null; drawOverlay(); });
ov.addEventListener('contextmenu', (e) => {
  const c = cellFromEvent(e);
  if (!c) return;
  e.preventDefault();
  editCell(c, 'reset');
});
ov.addEventListener('click', (e) => {
  const c = cellFromEvent(e);
  if (!c) return;
  if (e.ctrlKey || e.metaKey) {
    const cell = ui.scene && ui.scene.cells.find((x) => x.q === c.q && x.r === c.r);
    if (cell) {
      selectTile(cell.tid);
      const sec = document.querySelector('.section[data-id="tiles"]');
      sec.open = true;
      $('editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    return;
  }
  editCell(c, e.altKey ? 'reset' : e.shiftKey ? 'swap' : 'rot');
});
function editCell(c, how) {
  const k = c.q + ',' + c.r, e = P.edits[k] || { rot: 0, swap: 0 };
  if (how === 'reset') delete P.edits[k];
  else {
    if (how === 'rot') e.rot = (e.rot + 1) % 6;
    else e.swap = (e.swap + 1) % 60;
    P.edits[k] = e;
  }
  save();
  requestRender();
}

/* ═════ rendu différé ═════════════════════════════════════════════════ */
let pending = 0;
function requestRender() {
  if (pending) return;
  pending = requestAnimationFrame(() => { pending = 0; renderMain(); updateInfo(); });
}
new ResizeObserver(() => { requestRender(); renderEditor(); }).observe(stage);

/* ═════ barre du haut : nouvelle grille, export, projet ═══════════════ */
function shuffle() {
  settingsBind.set('seed', Math.floor(Math.random() * 999999) + 1);
}
$('btnShuffle').onclick = shuffle;

function download(blob, name) {
  const a = el('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function fullView() {
  const L = TH.layout(P.settings);
  return { L, view: { W: L.W, H: L.H, R: L.R, ox: L.ox, oy: L.oy } };
}
const baseName = () => { const L = TH.layout(P.settings); return `truchet-hex-${L.W}x${L.H}-${P.settings.seed}`; };

const paintOpts = () => ({ bg: P.settings.bg, transparent: P.settings.transparent, showGrid: P.settings.showGrid });

function exportPNG() {
  toast('Préparation de l’image…');
  setTimeout(() => {
    const { L, view } = fullView();
    const c = el('canvas');
    c.width = L.W; c.height = L.H;
    TH.paint(c.getContext('2d'), mainScene(L), view, paintOpts());
    c.toBlob((b) => {
      if (!b) { toast('Image trop grande pour ce navigateur : essayez une définition plus basse'); return; }
      download(b, baseName() + '.png');
      toast(`PNG ${L.W} × ${L.H} px exporté`);
    }, 'image/png');
  }, 30);
}
function exportSVG() {
  const { L, view } = fullView();
  const svg = TH.toSVG(mainScene(L), view, paintOpts());
  download(new Blob([svg], { type: 'image/svg+xml' }), baseName() + '.svg');
  toast('SVG exporté');
}

/* ═════ cadre : pastilles de format au-dessus de l'image, fenêtre Export ═ */
const FORMAT_CHIPS = ['1:1', '4:5', '3:4', '2:3', '9:16', '16:9', '3:2', '4:3', '21:9', 'custom'];
const RES_CHIPS = [[1024, '1K'], [2048, '2K'], [3840, '4K'], [8192, '8K']];
function chipRow(box, items, get, set) {
  const btns = items.map(([v, label]) => {
    const b = el('button', null, label);
    b.type = 'button';
    b.onclick = () => set(v);
    box.appendChild(b);
    return [v, b];
  });
  return () => btns.forEach(([v, b]) => b.setAttribute('aria-pressed', String(get() === v)));
}
const frameSyncs = [
  chipRow($('formatChips'), FORMAT_CHIPS.map((f) => [f, f === 'custom' ? 'Libre' : f]), () => P.settings.format, (v) => settingsBind.set('format', v)),
  chipRow($('resChips'), RES_CHIPS, () => P.settings.res, (v) => settingsBind.set('res', v)),
];
const marginCtl = buildControl(SETTING_DEFS.find((d) => d.k === 'margin'), settingsBind);
const transpCtl = buildControl({ k: 'transparent', label: 'Fond transparent', type: 'toggle' }, settingsBind);
$('exportControls').append(marginCtl.row, transpCtl.row);
for (const id of ['customW', 'customH', 'expW', 'expH']) {
  const k = id.endsWith('W') ? 'customW' : 'customH';
  $(id).addEventListener('change', (e) => {
    const v = cleanVal(SETTING_DEFS.find((d) => d.k === k), e.target.value);
    if (v !== undefined) settingsBind.set(k, v); else syncFrameUI();
  });
}
function syncFrameUI() {
  frameSyncs.forEach((f) => f());
  marginCtl.sync();
  transpCtl.sync();
  bgNote.hidden = !P.settings.transparent;
  $('c_bg').closest('.field').classList.toggle('dim', P.settings.transparent);
  const custom = P.settings.format === 'custom';
  $('customSize').hidden = !custom;
  $('resRow').hidden = custom;
  $('expCustom').hidden = !custom;
  for (const [id, k] of [['customW', 'customW'], ['customH', 'customH'], ['expW', 'customW'], ['expH', 'customH']]) {
    if (document.activeElement !== $(id)) $(id).value = P.settings[k];
  }
  const L = TH.layout(P.settings);
  $('expName').textContent = `${baseName()}.png · ${L.W} × ${L.H} px`;
}
const expDlg = $('exportDlg');
$('btnExport').onclick = () => { syncFrameUI(); expDlg.showModal(); };
$('expClose').onclick = () => expDlg.close();
expDlg.addEventListener('click', (e) => { if (e.target === expDlg) expDlg.close(); });
$('expPNG').onclick = () => { expDlg.close(); exportPNG(); };
$('expSVG').onclick = () => { expDlg.close(); exportSVG(); };

/* lien de partage : projet compressé dans l'adresse */
const b64u = {
  enc: (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
};
async function pipe(bytes, Stream) {
  const s = new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function shareLink() {
  const json = new TextEncoder().encode(JSON.stringify(P));
  let token;
  if (window.CompressionStream) token = 'z' + b64u.enc(await pipe(json, CompressionStream));
  else token = 'j' + b64u.enc(json);
  return location.origin + location.pathname + '#p=' + token;
}
async function readLink(hash) {
  const m = /#p=([zj])([\w-]+)/.exec(hash);
  if (!m) return null;
  let bytes = b64u.dec(m[2]);
  if (m[1] === 'z') bytes = await pipe(bytes, DecompressionStream);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function loadProject(raw, msg) {
  P = normProject(raw);
  ui.selected = P.tiles[0].id;
  ui.multi = new Set([ui.selected]);
  ui.anchor = ui.selected;
  ui.target = 'global';
  ui.picked = null;
  save();
  syncAll();
  if (msg) toast(msg);
}

async function menuAction(act) {
  if (act === 'png') exportPNG();
  else if (act === 'svg') exportSVG();
  else if (act === 'projects') openProjects();
  else if (act === 'share') {
    const url = await shareLink();
    try { await navigator.clipboard.writeText(url); toast('Lien copié dans le presse-papiers'); }
    catch (e) { window.prompt('Copiez ce lien :', url); }
  } else if (act === 'reset') {
    if (window.confirm('Revenir au projet de départ ? Les tuiles et réglages actuels seront perdus (vos palettes enregistrées sont conservées).')) {
      loadProject(null, 'Projet réinitialisé');
    }
  }
}
/* ═════ projets enregistrés ═══════════════════════════════════════════
   Un projet = un nom, une date, une vignette et l'état complet (tuiles, style,
   cadre, retouches de cases). Ils restent dans le navigateur et peuvent être
   écrits dans un fichier .json / relus depuis un fichier.                    */
const LS_PROJECTS = 'truchet-hexagon.projects.v1';
const FILE_TAG = 'truchet-hexagon';
const dlg = $('projectsDlg');

function cleanProjects(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((p) => p && typeof p.name === 'string' && p.project && typeof p.project === 'object')
    .map((p) => ({
      name: p.name.trim().slice(0, 60) || 'Sans nom',
      savedAt: isNaN(Date.parse(p.savedAt)) ? new Date().toISOString() : p.savedAt,
      thumb: typeof p.thumb === 'string' && p.thumb.startsWith('data:image/') ? p.thumb : '',
      project: normProject(p.project),
    }));
}
let PROJECTS = cleanProjects(lsGet(LS_PROJECTS));
function persistProjects() {
  try { localStorage.setItem(LS_PROJECTS, JSON.stringify(PROJECTS)); return true; }
  catch (e) { toast('Impossible d’enregistrer dans ce navigateur : utilisez « Exporter le fichier »'); return false; }
}
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();
function upsertProject(p) {
  PROJECTS = [p].concat(PROJECTS.filter((q) => !sameName(q.name, p.name)));
}

function thumbOf() {
  const max = 112, k = max / Math.max(cv.width, cv.height);
  const c = el('canvas');
  c.width = Math.max(1, Math.round(cv.width * k));
  c.height = Math.max(1, Math.round(cv.height * k));
  const x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.drawImage(cv, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

function renderProjects() {
  const list = $('projList');
  list.textContent = '';
  $('projExport').disabled = !PROJECTS.length;
  if (!PROJECTS.length) {
    list.appendChild(el('li', 'empty', 'Aucun projet enregistré. Donnez un nom à l’image en cours et enregistrez-la.'));
    return;
  }
  for (const p of PROJECTS) {
    const li = el('li');
    const img = el('img');
    img.alt = '';
    if (p.thumb) img.src = p.thumb;
    const meta = el('div', 'meta');
    const L = TH.layout(p.project.settings);
    const when = new Date(p.savedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    meta.append(el('strong', null, p.name), el('span', null, `${when} · ${L.W} × ${L.H} · ${p.project.tiles.length} tuiles`));
    const open = el('button', 'btn sm', 'Ouvrir');
    open.type = 'button';
    open.onclick = () => {
      loadProject(JSON.parse(JSON.stringify(p.project)), `« ${p.name} » ouvert`);
      $('projName').value = p.name;
      dlg.close();
    };
    const del = el('button', 'btn sm ghost danger', 'Supprimer');
    del.type = 'button';
    del.onclick = () => {
      if (!del.dataset.armed) { del.dataset.armed = '1'; del.textContent = 'Confirmer ?'; return; }
      PROJECTS = PROJECTS.filter((q) => q !== p);
      persistProjects();
      renderProjects();
    };
    li.append(img, meta, open, del);
    list.appendChild(li);
  }
}

function saveProject() {
  const name = ($('projName').value.trim() || `Projet ${P.settings.seed}`).slice(0, 60);
  const exists = PROJECTS.some((q) => sameName(q.name, name));
  upsertProject({ name, savedAt: new Date().toISOString(), thumb: thumbOf(), project: JSON.parse(JSON.stringify(P)) });
  if (persistProjects()) toast(exists ? `« ${name} » mis à jour` : `« ${name} » enregistré`);
  renderProjects();
}

function openProjects() {
  renderProjects();
  dlg.showModal();
  $('projName').focus();
}

$('btnProjects').onclick = openProjects;
$('projSave').onclick = saveProject;
$('projName').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); saveProject(); } };
$('projClose').onclick = () => dlg.close();
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
$('projExport').onclick = () => {
  const txt = JSON.stringify({ app: FILE_TAG, version: 1, projects: PROJECTS }, null, 1);
  download(new Blob([txt], { type: 'application/json' }), 'truchet-hexagon-projets.json');
};
$('projImport').onclick = () => $('fileOpen').click();
$('fileOpen').onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    let incoming;
    if (data && data.app === FILE_TAG) incoming = cleanProjects(data.projects);
    else if (data && (data.tiles || data.settings)) {
      /* un projet seul (ancien export) : on le range sous le nom du fichier */
      incoming = cleanProjects([{ name: f.name.replace(/\.json$/i, ''), savedAt: new Date().toISOString(), project: data }]);
    } else throw new Error();
    if (!incoming.length) { toast('Ce fichier ne contient aucun projet'); return; }
    incoming.reverse().forEach(upsertProject);
    persistProjects();
    renderProjects();
    toast(`${incoming.length} projet${incoming.length > 1 ? 's' : ''} importé${incoming.length > 1 ? 's' : ''}`);
  } catch (err) {
    toast('Fichier illisible : ce n’est pas un fichier de projets Truchet hexagonal');
  }
};

/* menus déroulants */
document.querySelectorAll('.menu').forEach((m) => {
  const btn = m.querySelector('.btn');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !m.classList.contains('open');
    document.querySelectorAll('.menu.open').forEach((x) => x.classList.remove('open'));
    m.classList.toggle('open', open);
  });
  m.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
    m.classList.remove('open');
    menuAction(b.dataset.act);
  }));
});
document.addEventListener('click', () => document.querySelectorAll('.menu.open').forEach((x) => x.classList.remove('open')));

/* clavier */
document.addEventListener('keydown', (e) => {
  if (dlg.open || $('exportDlg').open) return;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox';
  if (e.key === 'Escape') {
    if (dlg.open || $('exportDlg').open) return;
    document.querySelectorAll('.menu.open').forEach((x) => x.classList.remove('open'));
    if (ui.picked !== null) { ui.picked = null; renderEditor(); }
    return;
  }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'n' || e.key === 'N') shuffle();
});

/* toast */
let toastTimer = 0;
function toast(msg) {
  const t = $('toast'), d = [$('projectsDlg'), $('exportDlg')].find((x) => x.open);
  const host = d || document.body;        // une fenêtre modale passe au-dessus de tout
  if (t.parentNode !== host) host.appendChild(t);
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* sections repliables : on se souvient de leur état */
const uiPrefs = lsGet(LS_UI) || {};
document.querySelectorAll('.section').forEach((s) => {
  if (uiPrefs[s.dataset.id] === false) s.open = false;
  s.addEventListener('toggle', () => {
    uiPrefs[s.dataset.id] = s.open;
    lsSet(LS_UI, uiPrefs);
    if (s.dataset.id === 'tiles' && s.open) renderEditor();
  });
});

/* ═════ démarrage ═════════════════════════════════════════════════════ */
function syncAll() {
  [sceneCache, geoCache, tileSceneCache, tileGeoCache].forEach((m) => m.clear());
  syncSettings();
  syncStyle();
  refreshTiles();
  requestRender();
}

/* accès pour la console du navigateur (débogage) */
TH.app = { get project() { return P; }, shareLink, readLink, svg: () => { const { L, view } = fullView(); return TH.toSVG(mainScene(L), view, paintOpts()); } };

(async function init() {
  if (location.hash.startsWith('#p=')) {
    try {
      const raw = await readLink(location.hash);
      if (raw) { P = normProject(raw); ui.selected = ui.anchor = P.tiles[0].id; ui.multi = new Set([ui.selected]); save(); toast('Projet chargé depuis le lien'); }
    } catch (e) { toast('Lien de partage illisible'); }
    history.replaceState(null, '', location.pathname + location.search);
  }
  syncAll();
})();
})();
