/* Truchet hexagonal — géométrie et hasard reproductible.
 *
 * Hexagone « pointe en haut », rayon (= côté) 1. Les milieux d'arêtes sont
 * numérotés 0..5 dans le sens des angles 0°, 60°, 120°… Une tuile relie ces
 * milieux deux à deux. Selon l'écart d entre les deux arêtes :
 *   d = 1  arêtes voisines   → petit arc de 120°, centré sur le sommet commun, rayon 1/2
 *   d = 2  une arête entre    → grand arc de 60°, centré hors de la tuile, rayon 3/2
 *   d = 3  arêtes opposées   → segment droit passant par le centre
 * Dans les trois cas le tracé arrive perpendiculairement à l'arête, en son
 * milieu : c'est ce qui garantit le raccord avec la tuile voisine quelle que
 * soit la rotation de chacune.
 */
'use strict';

const TH = (window.TH = window.TH || {});

const SQ3 = Math.sqrt(3);
const D2R = Math.PI / 180;
TH.SQ3 = SQ3;
TH.D2R = D2R;

/* ── géométrie d'une tuile (rayon 1, centre à l'origine) ── */
TH.hexVerts = function hexVerts() {
  const v = [];
  for (let k = 0; k < 6; k++) {
    const a = (30 + 60 * k) * D2R;
    v.push([Math.cos(a), Math.sin(a)]);
  }
  return v;
};

TH.midPoint = function midPoint(i) {
  const a = 60 * i * D2R, ap = SQ3 / 2;
  return [ap * Math.cos(a), ap * Math.sin(a)];
};

/* écart (1, 2 ou 3) entre deux arêtes et arête de départ dans le sens direct */
TH.connSpan = function connSpan(a, b) {
  let d = (b - a + 6) % 6, i = a;
  if (d > 3) { d = 6 - d; i = b; }
  return { i, d };
};

TH.connGeom = function connGeom(a, b) {
  const { i, d } = TH.connSpan(a, b);
  if (d === 3) return { kind: 'line', d };
  if (d === 1) {
    const t = (60 * i + 30) * D2R;
    return { kind: 'arc', d, c: [Math.cos(t), Math.sin(t)], rad: 0.5 };
  }
  const t = 60 * (i + 1) * D2R;
  return { kind: 'arc', d, c: [SQ3 * Math.cos(t), SQ3 * Math.sin(t)], rad: 1.5 };
};

/* points échantillonnés le long d'une connexion, de l'arête `from` vers l'autre */
TH.connPoints = function connPoints(a, b, from) {
  const A = TH.midPoint(from === b ? b : a), B = TH.midPoint(from === b ? a : b);
  const g = TH.connGeom(a, b);
  if (g.kind === 'line') return [A, [0, 0], B];
  const a1 = Math.atan2(A[1] - g.c[1], A[0] - g.c[0]);
  const a2 = Math.atan2(B[1] - g.c[1], B[0] - g.c[0]);
  let da = a2 - a1;
  while (da <= -Math.PI) da += 2 * Math.PI;
  while (da > Math.PI) da -= 2 * Math.PI;
  const n = 24, pts = [];
  for (let k = 0; k <= n; k++) {
    const t = a1 + (da * k) / n;
    pts.push([g.c[0] + g.rad * Math.cos(t), g.c[1] + g.rad * Math.sin(t)]);
  }
  pts[0] = A; pts[n] = B;            // extrémités exactes : raccord sans jour
  return pts;
};

/* ── connexions : normalisation, rotation, signature ── */
TH.normConns = function normConns(list) {
  const out = [], used = new Set();
  if (!Array.isArray(list)) return out;
  for (const c of list) {
    let a, b;
    if (Array.isArray(c)) [a, b] = c;
    else if (c && typeof c === 'object') ({ a, b } = c);
    a = +a; b = +b;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) continue;
    if (a < 0 || a > 5 || b < 0 || b > 5 || used.has(a) || used.has(b)) continue;
    used.add(a); used.add(b);
    out.push(a < b ? [a, b] : [b, a]);
  }
  return out.sort((x, y) => x[0] - y[0]);
};

TH.rotateConns = function rotateConns(conns, k) {
  k = ((k % 6) + 6) % 6;
  return TH.normConns(conns.map(([a, b]) => [(a + k) % 6, (b + k) % 6]));
};

TH.connSig = (conns) => conns.map(([a, b]) => '' + a + b).join('.');

/* forme canonique à rotation près : deux tuiles qui ne diffèrent que par une
   rotation donnent la même grille (quand les rotations sont aléatoires) */
TH.canonical = function canonical(conns) {
  let best = null;
  for (let k = 0; k < 6; k++) {
    const s = TH.connSig(TH.rotateConns(conns, k));
    if (best === null || s < best) best = s;
  }
  return best;
};

/* les 15 appariements parfaits des 6 milieux */
TH.ALL_MATCHINGS = (function () {
  const out = [];
  (function rec(rest, acc) {
    if (!rest.length) { out.push(TH.normConns(acc)); return; }
    const [a, ...others] = rest;
    others.forEach((b, i) => rec(others.filter((_, j) => j !== i), acc.concat([[a, b]])));
  })([0, 1, 2, 3, 4, 5], []);
  return out;
})();

TH.hasLongArc = (conns) => conns.some(([a, b]) => TH.connSpan(a, b).d === 2);

TH.matchingsPool = function matchingsPool(withLong) {
  return TH.ALL_MATCHINGS.filter((m) => withLong || !TH.hasLongArc(m));
};

TH.randomMatching = function randomMatching(rnd = Math.random, withLong = true) {
  const pool = TH.matchingsPool(withLong);
  return pool[Math.floor(rnd() * pool.length)].map((c) => c.slice());
};

/* une forme par classe de rotation */
TH.baseShapes = function baseShapes(withLong = true) {
  const seen = new Map();
  for (const m of TH.matchingsPool(withLong)) {
    const k = TH.canonical(m);
    if (!seen.has(k)) seen.set(k, m);
  }
  return [...seen.values()];
};

/* ── hasard reproductible : FNV-1a + finaliseur, puis mulberry32 ── */
TH.hash32 = function hash32(parts) {
  let h = 0x811c9dc5;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= 0x2c;
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
};

TH.mulberry32 = function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

TH.rng = (...parts) => TH.mulberry32(TH.hash32(parts));

/* ── couleurs ── */
TH.normColor = function normColor(v) {
  if (typeof v !== 'string') return null;
  let s = v.trim().toLowerCase();
  if (!s) return null;
  if (s[0] !== '#') s = '#' + s;
  if (/^#[0-9a-f]{3}$/.test(s)) s = '#' + [...s.slice(1)].map((c) => c + c).join('');
  return /^#[0-9a-f]{6}$/.test(s) ? s : null;
};

TH.MAX_COLORS = 32;
TH.normPalette = function normPalette(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const v of list) {
    const c = TH.normColor(v);
    if (c && !out.includes(c)) out.push(c);
  }
  return out.slice(0, TH.MAX_COLORS);
};

/* lit une palette collée : {colors:[…]}, {palette:[…]}, […], ou des #hex dans du texte */
TH.parsePalette = function parsePalette(txt) {
  txt = (txt || '').trim();
  if (!txt) throw new Error('rien à importer');
  let data = null;
  try { data = JSON.parse(txt); } catch (e) { /* on tentera les #hex du texte */ }
  let raw = null, name = null;
  if (Array.isArray(data)) raw = data;
  else if (data && typeof data === 'object') {
    raw = data.colors || data.palette || data.colours || null;
    if (typeof data.name === 'string' && data.name.trim()) name = data.name.trim();
  }
  if (!Array.isArray(raw)) raw = txt.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g);
  const colors = TH.normPalette(raw || []);
  if (!colors.length) throw new Error('aucune couleur #hex trouvée');
  return { colors, name };
};
