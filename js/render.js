/* Truchet hexagonal — cadrage, réseau de courbes, bandes, peinture (canvas & SVG).
 *
 * Tout est calculé dans le repère « unité » (rayon d'hexagone = 1) : la même
 * géométrie sert à l'aperçu écran et à l'export pleine résolution, seule la
 * transformation finale change.
 */
'use strict';

(function () {
const TH = window.TH;
const SQ3 = TH.SQ3;

/* ── cadre ─────────────────────────────────────────────────────────── */
TH.FORMATS = {
  '1:1': [1, 1], '4:5': [4, 5], '5:4': [5, 4], '3:4': [3, 4], '4:3': [4, 3],
  '2:3': [2, 3], '3:2': [3, 2], '9:16': [9, 16], '16:9': [16, 9], '21:9': [21, 9],
  '1:2': [1, 2], '2:1': [2, 1],
};
const MAX_DENSITY = 40, MAX_SIDE = 64, MAX_HEXES = 1600;

TH.framePx = function framePx(s) {
  if (s.format === 'custom') {
    const c = (v) => Math.max(64, Math.min(8192, Math.round(+v) || 64));
    return [c(s.customW), c(s.customH)];
  }
  const [p, q] = TH.FORMATS[s.format] || [1, 1];
  const res = Math.max(256, Math.min(8192, Math.round(+s.res) || 2048));
  return p >= q ? [res, Math.round((res * q) / p)] : [Math.round((res * p) / q), res];
};

/* emprise d'un réseau rows × cols, en rayons : totale, et « couverte » (sans
   les encoches de la silhouette en nid d'abeille) */
const latW = (cols, rows) => SQ3 * (cols + (rows > 1 ? 0.5 : 0));
const latH = (rows) => 1.5 * rows + 0.5;
const coverW = (cols, rows) => SQ3 * (cols - (rows > 1 ? 0.5 : 0));
const coverH = (rows) => 1.5 * rows - 0.5;

/* la densité = nombre d'hexagones sur le côté court du cadre */
function gridAt(ar, t) {
  if (ar >= 1) {
    const rows = Math.max(1, t | 0);
    const cols = Math.max(1, Math.round((ar * latH(rows)) / SQ3 - (rows > 1 ? 0.5 : 0)));
    return { rows, cols };
  }
  const cols = Math.max(1, t | 0);
  const rows = Math.max(1, Math.round(((SQ3 * (cols + 0.5)) / ar - 0.5) / 1.5));
  return { rows, cols };
}
const gridFits = (g) => g.rows <= MAX_SIDE && g.cols <= MAX_SIDE && g.rows * g.cols <= MAX_HEXES;

TH.densityMax = function densityMax(s) {
  const [w, h] = TH.framePx(s);
  let m = 1;
  for (let t = 1; t <= MAX_DENSITY; t++) if (gridFits(gridAt(w / h, t))) m = t;
  return m;
};

/* dispositif complet, en pixels du cadre final */
TH.layout = function layout(s) {
  const [W, H] = TH.framePx(s);
  const t = Math.max(1, Math.min(TH.densityMax(s), Math.round(s.density) || 1));
  const { rows, cols } = gridAt(W / H, t);
  const bleed = s.fit !== 'whole';
  const fit = bleed
    ? Math.max(W / coverW(cols, rows), H / coverH(rows))
    : Math.min(W / latW(cols, rows), H / latH(rows));
  const R = fit * (1 - (s.margin || 0) / 100);
  const ox = (W - latW(cols, rows) * R) / 2, oy = (H - latH(rows) * R) / 2;
  return { W, H, rows, cols, R, ox, oy, density: t };
};

/* view = {R, ox, oy} : passage repère unité → pixels */
TH.viewTransform = (v) => [v.R, 0, 0, v.R, v.ox + (v.R * SQ3) / 2, v.oy + v.R];

TH.cellCenter = (q, r) => [SQ3 * q + (r & 1 ? SQ3 / 2 : 0), 1.5 * r];

/* case sous un point (pixels du cadre) */
TH.cellAt = function cellAt(L, x, y) {
  const ux = (x - L.ox) / L.R - SQ3 / 2, uy = (y - L.oy) / L.R - 1;
  let best = null, bd = Infinity;
  const r0 = Math.round(uy / 1.5);
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    if (r < 0 || r >= L.rows) continue;
    const q0 = Math.round((ux - (r & 1 ? SQ3 / 2 : 0)) / SQ3);
    for (let q = q0 - 1; q <= q0 + 1; q++) {
      if (q < 0 || q >= L.cols) continue;
      const [cx, cy] = TH.cellCenter(q, r);
      const d = Math.hypot(ux - cx, uy - cy);
      if (d < bd) { bd = d; best = { q, r }; }
    }
  }
  return best && bd <= 1 ? best : null;
};

/* ── réseau : les connexions de toutes les cases s'enchaînent en courbes ── */
/* cells = [{q, r, conns, tid}] → {curves:[{pts, closed, runs:[{i0,i1,tid}], hash}]} */
TH.buildGeometry = function buildGeometry(cells) {
  const segs = [], nodes = new Map();
  const nk = (p) => Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4);
  for (const cell of cells) {
    const c = TH.cellCenter(cell.q, cell.r);
    for (const [a, b] of cell.conns) {
      const ma = TH.midPoint(a), mb = TH.midPoint(b);
      const keys = [nk([c[0] + ma[0], c[1] + ma[1]]), nk([c[0] + mb[0], c[1] + mb[1]])];
      const si = segs.length;
      segs.push({ cell, a, b, c, keys });
      keys.forEach((k, e) => {
        if (!nodes.has(k)) nodes.set(k, []);
        nodes.get(k).push([si, e]);
      });
    }
  }
  const partner = (si, e) => {
    const arr = nodes.get(segs[si].keys[e]);
    if (!arr || arr.length < 2) return null;
    return arr.find(([s, ee]) => !(s === si && ee === e)) || null;
  };

  const visited = new Uint8Array(segs.length), curves = [];
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (visited[s0]) continue;
    /* remonte jusqu'au début de la chaîne (ou fait le tour d'une boucle) */
    let start = s0, entry = 0, closed = false, guard = 0;
    while (guard++ < segs.length) {
      const p = partner(start, entry);
      if (!p) break;
      if (p[0] === s0) { closed = true; start = s0; entry = 0; break; }
      start = p[0]; entry = 1 - p[1];
    }
    /* puis la parcourt dans le sens direct */
    const seq = [];
    let cur = start, from = entry;
    guard = 0;
    while (guard++ <= segs.length) {
      seq.push([cur, from]);
      visited[cur] = 1;
      const p = partner(cur, 1 - from);
      if (!p || p[0] === start || visited[p[0]]) break;
      cur = p[0]; from = p[1];
    }
    const pts = [], runs = [];
    for (const [si, fe] of seq) {
      const s = segs[si];
      const local = TH.connPoints(s.a, s.b, fe === 0 ? s.a : s.b);
      const i0 = pts.length ? pts.length - 1 : 0;
      local.forEach((p, k) => { if (k || !pts.length) pts.push([s.c[0] + p[0], s.c[1] + p[1]]); });
      const i1 = pts.length - 1, tid = s.cell.tid;
      const last = runs[runs.length - 1];
      if (last && last.tid === tid) last.i1 = i1;
      else runs.push({ i0, i1, tid });
    }
    if (closed) pts[pts.length - 1] = pts[0];
    const f = segs[start];
    curves.push({ pts, closed, runs, hash: TH.hash32([f.cell.q, f.cell.r, f.a, f.b, closed ? 1 : 2]) });
  }
  return { curves };
};

/* ── bandes ────────────────────────────────────────────────────────── */
TH.bandParams = function bandParams(S) {
  const B = Math.max(1, S.bands | 0), Kb = (B - 1) / 2;
  const lw = (SQ3 / B) * S.thickness;
  let pitch = lw * (1 + S.gap);
  /* les bandes intérieures des petits arcs (rayon 1/2) ne doivent pas s'effondrer */
  if (Kb > 0) pitch = Math.min(pitch, Math.max((0.5 - lw / 2 - 0.01) / Kb, lw));
  pitch = Math.max(pitch, lw);
  const offs = [];
  for (let j = 0; j < B; j++) offs.push((j - Kb) * pitch);
  const a = (S.shadowAngle || 0) * TH.D2R;
  return { B, lw, offs, dir: [Math.cos(a), Math.sin(a)] };
};

function profileAt(prof, j, B) {
  if (prof === 'uni' || B === 1) return 1;
  const t = (j / (B - 1)) * 2 - 1;
  return Math.max(0.2, prof === 'centre' ? 1.4 - 0.5 * t * t : 0.85 + 0.55 * t * t);
}

function normals(pts, closed) {
  const n = pts.length, N = new Array(n);
  for (let i = 0; i < n; i++) {
    let prev = pts[i - 1], next = pts[i + 1];
    if (i === 0) prev = closed ? pts[n - 2] : pts[0];
    if (i === n - 1) next = closed ? pts[1] : pts[n - 1];
    const tx = next[0] - prev[0], ty = next[1] - prev[1];
    const L = Math.hypot(tx, ty) || 1;
    N[i] = [-ty / L, tx / L];
  }
  return N;
}

const FX = ['none', 'rayures', 'pointilles'];

/* geo + styleFor(tid) → liste ordonnée de traits à peindre */
TH.buildStrokes = function buildStrokes(geo, styleFor, opts = {}) {
  const out = [];
  for (const c of geo.curves) {
    if (c.pts.length < 2) continue;
    const N = normals(c.pts, c.closed);
    /* deux tronçons voisins de même style ne font qu'un chemin */
    const runs = [];
    for (const rn of c.runs) {
      const S = styleFor(rn.tid), last = runs[runs.length - 1];
      if (last && last.S.sig === S.sig) last.i1 = rn.i1;
      else runs.push({ i0: rn.i0, i1: rn.i1, S });
    }
    const whole = runs.length === 1;
    const palOff = TH.mulberry32(c.hash)();
    for (const rn of runs) {
      const S = rn.S, P = TH.bandParams(S), pal = S.palette.length ? S.palette : ['#888888'];
      const sub = whole ? c.pts : c.pts.slice(rn.i0, rn.i1 + 1);
      const subN = whole ? N : N.slice(rn.i0, rn.i1 + 1);
      if (sub.length < 2) continue;
      const off0 = Math.floor(palOff * pal.length);
      for (let j = 0; j < P.B; j++) {
        const d = P.offs[j];
        const pts = d === 0 ? sub : sub.map((p, i) => [p[0] + subN[i][0] * d, p[1] + subN[i][1] * d]);
        const ci = S.colorMode === 'band' ? j : off0 + j;
        let fx = S.fx;
        if (opts.fxRandom) fx = FX[Math.floor(TH.rng(c.hash, j, 'fx')() * FX.length)];
        let k = 0;
        for (const p of pts) k += p[0] * P.dir[0] + p[1] * P.dir[1];
        out.push({
          pts, closed: whole && c.closed, S, P, fx,
          color: pal[ci % pal.length],
          w: P.lw * profileAt(S.profile, j, P.B),
          sign: c.hash & 1 ? 1 : -1,
          key: k / pts.length + j * 1e-6,
        });
      }
    }
  }
  /* on peint d'abord ce qui est loin dans le sens de la lumière : chaque ruban
     projette son ombre sur ceux d'en dessous, de façon cohérente */
  out.sort((a, b) => b.key - a.key);
  return out;
};

/* ── peinture canvas ───────────────────────────────────────────────── */
function pathOf(s) {
  if (s.path) return s.path;
  const p = new Path2D(), pts = s.closed ? s.pts.slice(0, -1) : s.pts;
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  if (s.closed) p.closePath();
  return (s.path = p);
}

function gridPath(cells) {
  const p = new Path2D(), V = TH.hexVerts();
  for (const cell of cells) {
    const [cx, cy] = TH.cellCenter(cell.q, cell.r);
    V.forEach(([x, y], i) => (i ? p.lineTo(cx + x, cy + y) : p.moveTo(cx + x, cy + y)));
    p.closePath();
  }
  return p;
}

const fxDash = (fx, w) => {
  if (fx === 'rayures') { const a = Math.max(w * 0.45, 0.01), b = Math.max(w * 0.85, 0.02); return { dash: [a, b], period: a + b, width: w, color: 'rgba(0,0,0,0.5)', cap: 'butt' }; }
  if (fx === 'pointilles') { const b = Math.max(w * 1.05, 0.03); return { dash: [0.001, b], period: b + 0.001, width: w * 0.35, color: 'rgba(255,255,255,0.85)', cap: 'round' }; }
  return null;
};

/* scene = {cells, strokes}, view = {W, H, R, ox, oy}, opts = {bg, showGrid, phase} */
TH.paint = function paint(ctx, scene, view, opts) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = opts.bg;
  ctx.fillRect(0, 0, view.W, view.H);
  ctx.setTransform(...TH.viewTransform(view));
  ctx.lineJoin = 'round';
  const R = view.R, minW = 0.6 / R, phase = opts.phase || 0;
  const noShadow = () => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0; };

  for (const s of scene.strokes) {
    const S = s.S, P = s.P, path = pathOf(s), w = Math.max(s.w, minW);
    ctx.globalAlpha = S.alpha;
    ctx.lineCap = 'butt';
    ctx.setLineDash([]);
    if (S.shadow) {
      /* l'ombre canvas ne suit pas la transformation : on la passe en pixels */
      ctx.shadowColor = `rgba(0,0,0,${S.shadowOpacity})`;
      ctx.shadowOffsetX = P.lw * S.shadowDist * P.dir[0] * R;
      ctx.shadowOffsetY = P.lw * S.shadowDist * P.dir[1] * R;
      ctx.shadowBlur = P.lw * S.shadowBlur * R;
    }
    if (S.outline > 0) {
      ctx.lineWidth = w + 2 * S.outline * P.lw;
      ctx.strokeStyle = S.outlineColor;
      ctx.stroke(path);
      noShadow();
    }
    ctx.lineWidth = w;
    ctx.strokeStyle = s.color;
    ctx.stroke(path);
    noShadow();

    const fx = fxDash(s.fx, w);
    if (fx) {
      ctx.globalAlpha = S.alpha * 0.55;
      ctx.setLineDash(fx.dash);
      ctx.lineDashOffset = s.sign * phase * fx.period;
      ctx.lineCap = fx.cap;
      ctx.lineWidth = fx.width;
      ctx.strokeStyle = fx.color;
      ctx.stroke(path);
    }
  }
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  noShadow();

  if (opts.showGrid) {
    if (!scene.grid) scene.grid = gridPath(scene.cells);
    ctx.strokeStyle = opts.bg;
    ctx.lineWidth = Math.max(0.045, 1.2 / R);
    ctx.stroke(scene.grid);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

/* ── export SVG ────────────────────────────────────────────────────── */
TH.toSVG = function toSVG(scene, view, opts) {
  const f = (v) => +v.toFixed(4);
  const [a, , , d, e, ff] = TH.viewTransform(view);
  const R = view.R;
  /* zone de filtre en coordonnées unité : tout le cadre, avec de la marge */
  const fy0 = f(-ff / R - 2);
  const fbx = f(-e / R - 2), fw = f(view.W / R + 4), fh = f(view.H / R + 4);
  const filters = new Map();
  const filterId = (S, P) => {
    const dx = f(P.lw * S.shadowDist * P.dir[0]), dy = f(P.lw * S.shadowDist * P.dir[1]);
    const sd = f((P.lw * S.shadowBlur) / 2), op = S.shadowOpacity;
    const k = [dx, dy, sd, op].join('_');
    if (!filters.has(k)) {
      filters.set(k, `<filter id="sh${filters.size}" filterUnits="userSpaceOnUse" x="${fbx}" y="${fy0}" width="${fw}" height="${fh}">` +
        `<feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${sd}" flood-color="#000" flood-opacity="${op}"/></filter>`);
    }
    return 'sh' + [...filters.keys()].indexOf(k);
  };
  const dOf = (s) => {
    const pts = s.closed ? s.pts.slice(0, -1) : s.pts;
    return 'M' + pts.map((p) => f(p[0]) + ' ' + f(p[1])).join('L') + (s.closed ? 'Z' : '');
  };
  const body = [];
  for (const s of scene.strokes) {
    const S = s.S, P = s.P, w = f(Math.max(s.w, 0.6 / R)), dd = dOf(s);
    const sh = S.shadow ? ` filter="url(#${filterId(S, P)})"` : '';
    const g = [];
    if (S.outline > 0) g.push(`<path d="${dd}" stroke="${S.outlineColor}" stroke-width="${f(w + 2 * S.outline * P.lw)}"${sh}/>`);
    g.push(`<path d="${dd}" stroke="${s.color}" stroke-width="${w}"${S.outline > 0 ? '' : sh}/>`);
    const fx = fxDash(s.fx, w);
    if (fx) {
      const col = s.fx === 'rayures' ? 'stroke="#000" stroke-opacity="0.5"' : 'stroke="#fff" stroke-opacity="0.85"';
      g.push(`<path d="${dd}" ${col} stroke-width="${f(fx.width)}" stroke-linecap="${fx.cap}" stroke-dasharray="${fx.dash.map(f).join(' ')}" opacity="0.55"/>`);
    }
    body.push(S.alpha < 1 ? `<g opacity="${S.alpha}">${g.join('')}</g>` : g.join(''));
  }
  if (opts.showGrid) {
    const V = TH.hexVerts();
    const dg = scene.cells.map((c) => {
      const [cx, cy] = TH.cellCenter(c.q, c.r);
      return 'M' + V.map(([x, y]) => f(cx + x) + ' ' + f(cy + y)).join('L') + 'Z';
    }).join('');
    body.push(`<path d="${dg}" stroke="${opts.bg}" stroke-width="${f(Math.max(0.045, 1.2 / R))}"/>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${view.W}" height="${view.H}" viewBox="0 0 ${view.W} ${view.H}">\n` +
    `<defs><clipPath id="frame"><rect width="${view.W}" height="${view.H}"/></clipPath>${[...filters.values()].join('')}</defs>\n` +
    `<rect width="${view.W}" height="${view.H}" fill="${opts.bg}"/>\n` +
    `<g clip-path="url(#frame)"><g transform="matrix(${f(a)} 0 0 ${f(d)} ${f(e)} ${f(ff)})" fill="none" stroke-linejoin="round" stroke-linecap="butt">\n` +
    body.join('\n') + `\n</g></g>\n</svg>\n`;
};
})();
