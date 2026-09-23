/* ──────────────────────────────────────────────────────────────────────────
   scenes.js — the endings, drawn

   A character grid with a tone per cell, the helpers for drawing on it, one
   animation per ending, and the gallery that shows them all.

   Uses:  render.js and view.js (still frames, twinkle, flicker).
   Rule:  Each animation gets a Grid and a time in seconds; it draws, it does not think.
   ────────────────────────────────────────────────────────────────────────── */

/* ───────────────────────── ENDING SCENES ─────────────────────────
   Some endings get their own picture: drawn on the same 200×76 grid, animated,
   often over a still frame of the room the ending happened in. */
const GW = R.W, GH = R.H;
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/* a grid of characters, each with a tone: 0 plain · 1 amber · 2 white · 3 dim */
function Grid(base){ this.c = base ? base.c.slice() : new Array(GW * GH).fill(' '); this.k = base ? Uint8Array.from(base.k) : new Uint8Array(GW * GH); this.star = (base && base.star) || null; }
Grid.prototype.put = function(i, j, ch, k = 0){ i = Math.round(i); j = Math.round(j); if (!(i >= 0 && j >= 0 && i < GW && j < GH)) return; const n = j * GW + i; this.c[n] = ch; this.k[n] = k; };
Grid.prototype.text = function(i, j, s, k = 0){ i = Math.round(i); for (let n = 0; n < s.length; n++) if (s[n] !== ' ') this.put(i + n, j, s[n], k); };
/* words over a picture: clear the cells under them (and one either side) so they read */
Grid.prototype.label = function(i, j, s, k = 0){ i = Math.round(i); this.put(i - 1, j, ' ', 0); for (let n = 0; n < s.length; n++) this.put(i + n, j, s[n], k); this.put(i + s.length, j, ' ', 0); };
Grid.prototype.dim = function(){ for (let n = 0; n < this.k.length; n++) if (this.k[n] === 0) this.k[n] = 3; return this; };
Grid.prototype.html = function(){
  const cls = ['', 'o', 'hi', 'd']; let out = '';
  for (let j = 0; j < GH; j++){
    let row = '', open = 0;
    for (let i = 0; i < GW; i++){
      const n = j * GW + i, k = this.k[n];
      if (k !== open){ if (open) row += '</span>'; if (k) row += '<span class="' + cls[k] + '">'; open = k; }
      const c = this.c[n]; row += c === '<' ? '&lt;' : (c === '&' ? '&amp;' : c);
    }
    if (open) row += '</span>';
    out += row + (j < GH - 1 ? '\n' : '');
  }
  return out;
};
/* a still frame of a room, from a chosen camera, as a Grid base; `glow` marks objects to draw amber */
function still(scene, cam, opts = {}, glow = []){
  const F = Object.assign({ L: S.loc }, S.flags, opts.flags || {});
  const fr = R.render(scene, F, null, Object.assign({ cam }, opts));
  const ids = glow.map(g => fr.objects.indexOf(g));
  return { c: fr.chars.slice(), k: Uint8Array.from(fr.obj, o => ids.includes(o) ? 1 : 0), obj: Uint8Array.from(fr.obj), objects: fr.objects, star: fr.star ? Uint8Array.from(fr.star) : null };
}
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const BLOCK = {
  A:['.###.','#...#','#...#','#####','#...#','#...#','#...#'], B:['####.','#...#','#...#','####.','#...#','#...#','####.'],
  C:['.###.','#...#','#....','#....','#....','#...#','.###.'], D:['####.','#...#','#...#','#...#','#...#','#...#','####.'],
  E:['#####','#....','#....','####.','#....','#....','#####'], F:['#####','#....','#....','####.','#....','#....','#....'],
  G:['.###.','#...#','#....','#.###','#...#','#...#','.###.'], H:['#...#','#...#','#...#','#####','#...#','#...#','#...#'],
  I:['#####','..#..','..#..','..#..','..#..','..#..','#####'], J:['..###','...#.','...#.','...#.','...#.','#..#.','.##..'],
  K:['#...#','#..#.','#.#..','##...','#.#..','#..#.','#...#'], L:['#....','#....','#....','#....','#....','#....','#####'],
  M:['#...#','##.##','#.#.#','#.#.#','#...#','#...#','#...#'], N:['#...#','##..#','#.#.#','#.#.#','#..##','#...#','#...#'],
  O:['.###.','#...#','#...#','#...#','#...#','#...#','.###.'], P:['####.','#...#','#...#','####.','#....','#....','#....'],
  Q:['.###.','#...#','#...#','#...#','#.#.#','#..#.','.##.#'], R:['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
  S:['.####','#....','#....','.###.','....#','....#','####.'], T:['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
  U:['#...#','#...#','#...#','#...#','#...#','#...#','.###.'], V:['#...#','#...#','#...#','#...#','#...#','.#.#.','..#..'],
  W:['#...#','#...#','#...#','#.#.#','#.#.#','##.##','#...#'], X:['#...#','#...#','.#.#.','..#..','.#.#.','#...#','#...#'],
  Y:['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..'], Z:['#####','....#','...#.','..#..','.#...','#....','#####'],
  '0':['.###.','#..##','#.#.#','#.#.#','##..#','#...#','.###.'], '1':['..#..','.##..','..#..','..#..','..#..','..#..','.###.'],
  '2':['.###.','#...#','....#','...#.','..#..','.#...','#####'], '3':['####.','....#','....#','.###.','....#','....#','####.'],
  '4':['...#.','..##.','.#.#.','#..#.','#####','...#.','...#.'], '5':['#####','#....','####.','....#','....#','#...#','.###.'],
  '6':['.###.','#....','#....','####.','#...#','#...#','.###.'], '7':['#####','....#','...#.','..#..','.#...','.#...','.#...'],
  '8':['.###.','#...#','#...#','.###.','#...#','#...#','.###.'], '9':['.###.','#...#','#...#','.####','....#','....#','.###.'],
  ',':['.....','.....','.....','.....','.....','..#..','.#...'], '-':['.....','.....','.....','.###.','.....','.....','.....'],
  '.':['.....','.....','.....','.....','.....','.....','..#..'], '?':['.###.','#...#','....#','...#.','..#..','.....','..#..'],
  '!':['..#..','..#..','..#..','..#..','..#..','.....','..#..'], "'":['..#..','..#..','.#...','.....','.....','.....','.....'],
  '"':['.#.#.','.#.#.','.....','.....','.....','.....','.....'], ':':['.....','..#..','.....','.....','.....','..#..','.....'],
  ';':['.....','..#..','.....','.....','.....','..#..','.#...'], '(':['...#.','..#..','.#...','.#...','.#...','..#..','...#.'],
  ')':['.#...','..#..','...#.','...#.','...#.','..#..','.#...'], '/':['....#','....#','...#.','..#..','.#...','#....','#....'],
  '&':['.##..','#..#.','.##..','.#...','#.#.#','#..#.','.##.#'], ' ':['.....','.....','.....','.....','.....','.....','.....'],
};
const blockWidth = (str, sx = 1) => str.length * 6 * sx - sx;
const blockText = s => s.toUpperCase().replace(/[‘’`]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, '-').replace(/…/g, '...');
/* draw a word in big letters, centred on (ci, cj) */
function block(g, str, ci, cj, sx = 1, ch = '@', k = 2, sy = 1){
  let x = Math.round(ci - blockWidth(str, sx) / 2); const y = Math.round(cj - 3.5 * sy);
  for (const c of str){ (BLOCK[c] || BLOCK[' ']).forEach((row, r) => [...row].forEach((b, cc) => { if (b === '#') for (let a = 0; a < sx; a++) for (let e = 0; e < sy; e++) g.put(x + cc * sx + a, y + r * sy + e, ch, k); })); x += 6 * sx; }
}
/* clear a dark band behind big letters so they read over a picture */
function blockBand(g, str, ci, cj, sx = 1, pad = 2){ const w = blockWidth(str, sx), x0 = Math.round(ci - w / 2) - pad * 2, y0 = Math.round(cj - 3.5) - pad; for (let j = y0; j < y0 + 7 + pad * 2; j++) for (let i = x0; i < x0 + w + pad * 4; i++) g.put(i, j, ' ', 0); }
/* the lit cells of a line of big letters, left to right (for writing it, or aiming steam at it) */
function blockCells(str, ci, cj, sx = 1){
  const out = []; let x = Math.round(ci - blockWidth(str, sx) / 2); const y = Math.round(cj - 3.5);
  for (const c of str){ const rows = BLOCK[c] || BLOCK[' ']; for (let cc = 0; cc < 5; cc++) for (let a = 0; a < sx; a++) for (let r = 0; r < 7; r++) if (rows[r][cc] === '#') out.push([x + cc * sx + a, y + r]); x += 6 * sx; }
  return out;
}
/* small helpers for the scenes */
const ctext = (g, j, s, k = 0) => g.text(Math.round((GW - s.length) / 2), j, s, k);
function wrapWords(s, n){ const out = []; let line = ''; for (const w of s.split(/\s+/).filter(Boolean)){ if (line && (line + ' ' + w).length > n){ out.push(line); line = w; } else line = line ? line + ' ' + w : w; } if (line) out.push(line); return out; }
function bboxOf(st, id){ const o = st.objects.indexOf(id); let i0 = GW, j0 = GH, i1 = -1, j1 = -1; for (let n = 0; n < st.obj.length; n++) if (st.obj[n] === o){ const i = n % GW, j = (n / GW) | 0; if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j; } return i1 < 0 ? null : { i0, j0, i1, j1, ci: (i0 + i1) / 2, cj: (j0 + j1) / 2 }; }
const FADE = '@#*+=-:.';
const fadeCh = a => a >= 1 ? ' ' : FADE[Math.max(0, Math.floor(a * FADE.length))];     // 0 bright … 1 gone
function dimAll(g, keep = -1){ for (let n = 0; n < g.k.length; n++) if (g.k[n] !== keep) g.k[n] = 3; return g; }
/* a person, as spans per row: [[centre offset, half-width], …] in units of height; used standing still or walking */
function figureSpans(f, sway = 0){
  if (f < 0.15) return [[0, 0.07]];
  if (f < 0.2) return [[0, 0.04]];
  if (f < 0.58) return [[0, 0.15 - (f - 0.2) * 0.08]];
  const swing = sway * 0.05 * (f - 0.58) / 0.42; return [[-0.05 + swing, 0.03], [0.05 - swing, 0.03]];
}
function drawFigure(g, fi, fj, h, ch, k = 0, sway = 0){
  for (let row = 0; row < Math.ceil(h); row++){
    const f = row / h, j = fj - h + row;
    for (const [cx, w] of figureSpans(f, sway)){
      const wc = Math.max(0.5, w * h / 0.6), ci = fi + cx * h / 0.6;
      for (let i = Math.round(ci - wc); i <= Math.round(ci + wc); i++) g.put(i, j, typeof ch === 'function' ? ch(f, i, j) : ch, k);
    }
  }
}

const ENDING_ART = {

  /* THE BELL — ding-dong, faster and faster, until the house decides whoever it is can wait */
  bell: {
    setup(){
      const cam = { x: 0.45, y: 1.45, z: -1.6, tx: 0.95, ty: 1.3, tz: 0 };
      const lit = still('doorstep', cam, {}, ['bell']);
      const dark = still('doorstep', cam, { lights: [[0.95, 1.35, -0.3, 0.12]], ambient: 0.001 }, ['bell']);
      const b = R.project('doorstep', {}, cam, [0.95, 1.35, -0.07]) || { i: GW * 0.5, j: GH * 0.5 };
      const births = []; let tt = 0.2, p = 0.95;
      while (tt < 9.2){ births.push(tt); tt += p; p = Math.max(0.07, p * 0.84); }
      const r = rng(11); const jit = births.map(() => [r() - 0.5, r(), r()]);
      return { lit, dark, bi: b.i, bj: b.j, births, jit };
    },
    draw(g, t, st){
      const off = t > 9.6;
      Object.assign(g, new Grid(off ? st.dark : st.lit));
      if (off) g.dim();
      const W2 = 1 / 0.6;                                             // one row of height is this many columns wide
      st.births.forEach((b, n) => {
        const a = t - b; if (a < 0) return;
        // the ring: out from the button, fading as it goes
        if (a < 1.8 && !off){
          const r = 1.5 + a * 22, ch = a < 0.3 ? '@' : a < 0.7 ? '*' : a < 1.2 ? '+' : '.', k = a < 0.7 ? 1 : 3;
          const steps = Math.max(24, Math.floor(r * 9));
          for (let s = 0; s < steps; s++){ const an = s / steps * Math.PI * 2; g.put(st.bi + Math.cos(an) * r * W2 * 0.6, st.bj + Math.sin(an) * r * 0.6, ch, k); }
        }
        // the words: the first few are huge; then there are too many to be anything but small
        if (a < 3.2 && (!off || a < 0.6)){
          const [dx, sp, side] = st.jit[n], word = n % 2 ? 'DONG' : 'DING';
          if (n < 5){
            const i = st.bi + (n % 2 ? 1 : -1) * (26 + n * 4) + dx * 8, j = st.bj - 6 - a * 5;
            block(g, word, i, j, 2, a < 0.5 ? '@' : a < 1.2 ? '#' : a < 2 ? '+' : '.', a < 1.2 ? 2 : 3);
          } else {
            const spread = 10 + n * 2.6, i = st.bi + dx * spread / 0.6 + (side - 0.5) * a * 22, j = st.bj - 2 - a * (6 + sp * 12);
            g.text(i - 4, j, word.toLowerCase() + '-' + (n % 2 ? 'ding' : 'dong'), a < 0.4 ? 2 : a < 1.6 ? 1 : 3);
          }
        }
      });
      // the count: one, then a great many
      const x = Math.min(1, t / 9.2), count = t > 9.2 ? 1204882 : Math.max(1, Math.floor(1204882 * (Math.exp(x * 9) - 1) / (Math.exp(9) - 1)));
      for (let j = 0; j < 12; j++) for (let i = 58; i < 142; i++) g.put(i, j, ' ', 0);        // a dark band for the number to sit in
      g.text((GW - 8) / 2, 1, 'notified', 3);
      block(g, count.toLocaleString('en-US'), GW / 2, 6.5, 1, '#', off ? 3 : 2);
    },
  },

  /* THE GUEST WHO WASN'T — seen from the doorway: someone going back down the path, in the rain */
  walkaway: {
    setup(){
      const cam = { x: 0, y: 1.55, z: -0.4, tx: 0, ty: 1.2, tz: -9 };
      const base = still('doorstep', cam);
      const r = rng(5), drops = [];
      for (let n = 0; n < 340; n++) drops.push([r() * GW * 1.3, r() * GH, 26 + r() * 22, r()]);
      return { cam, base, drops };
    },
    draw(g, t, st){
      Object.assign(g, new Grid(st.base));
      // the walker: feet at z, 1.7 tall, getting smaller
      const z = -2.3 - t * 1.05, sway = Math.sin(t * 5.2);
      const feet = R.project('doorstep', {}, st.cam, [0.05 * sway, 0, z]), head = R.project('doorstep', {}, st.cam, [0.05 * sway, 1.72, z]);
      if (feet && head){
        const h = feet.j - head.j, bright = Math.max(0, 1 - t / 9);
        const ramp = ' .:-=+*#@', ch = f => ramp[Math.max(1, Math.round(bright * f * (ramp.length - 1)))];
        if (h < 1.2){ if (t < 11) g.put(feet.i, feet.j - 0.5, '.', 3); }
        else for (let row = 0; row < Math.ceil(h); row++){
          const f = row / h, j = head.j + row;
          let spans = [];
          if (f < 0.15) spans = [[0, 0.07]];                                          // head
          else if (f < 0.2) spans = [[0, 0.04]];                                      // neck
          else if (f < 0.58) spans = [[0, 0.15 - (f - 0.2) * 0.08]];                  // coat
          else { const swing = sway * 0.05 * (f - 0.58) / 0.42; spans = [[-0.05 + swing, 0.03], [0.05 - swing, 0.03]]; }   // legs
          for (const [cx, w] of spans){
            const wc = Math.max(0.5, w * h / 0.6), ci = feet.i + cx * h / 0.6;
            for (let i = Math.round(ci - wc); i <= Math.round(ci + wc); i++) g.put(i, j, ch(f < 0.58 ? 0.8 : 0.6), f < 0.15 ? 0 : 0);
          }
        }
      }
      // rain: arrives, then stays
      const heavy = ease(t / 2.5);
      st.drops.forEach(([x0, y0, sp, w], n) => {
        if (w > heavy) return;
        const j = (y0 + t * sp) % GH, i = (x0 - j * 0.35) % (GW * 1.3);
        g.put(i, j, '/', 3); if (n % 3 === 0) g.put(i + 0.35, j - 1, '/', 3);
      });
    },
  },

  /* THREADBARE — WELCOME, wiped, and wiped, until it isn't there and neither is a small circle of the step */
  threadbare: {
    setup(){
      const FONT = {
        W:['#...#','#...#','#...#','#.#.#','#.#.#','##.##','#...#'], E:['#####','#....','#....','####.','#....','#....','#####'],
        L:['#....','#....','#....','#....','#....','#....','#####'], C:['.###.','#...#','#....','#....','#....','#...#','.###.'],
        O:['.###.','#...#','#...#','#...#','#...#','#...#','.###.'], M:['#...#','##.##','#.#.#','#.#.#','#...#','#...#','#...#'],
        B:['####.','#...#','#...#','####.','#...#','#...#','####.'], A:['.###.','#...#','#...#','#####','#...#','#...#','#...#'],
        K:['#...#','#..#.','#.#..','##...','#.#..','#..#.','#...#'], R:['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
        D:['####.','#...#','#...#','#...#','#...#','#...#','####.'], N:['#...#','##..#','#.#.#','#.#.#','#..##','#...#','#...#'],
        U:['#...#','#...#','#...#','#...#','#...#','#...#','.###.'], P:['####.','#...#','#...#','####.','#....','#....','#....'],
        I:['#####','..#..','..#..','..#..','..#..','..#..','#####'], T:['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
        V:['#...#','#...#','#...#','#...#','#...#','.#.#.','..#..'], S:['.####','#....','#....','.###.','....#','....#','####.'],
        Y:['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..'], H:['#...#','#...#','#...#','#####','#...#','#...#','#...#'],
        G:['.###.','#...#','#....','#.###','#...#','#...#','.###.'], '?':['.###.','#...#','....#','...#.','..#..','.....','..#..'],
        '[':['###..','#....','#....','#....','#....','#....','###..'], ']':['..###','....#','....#','....#','....#','....#','..###'],
        '_':['.....','.....','.....','.....','.....','.....','#####'], ' ':['.....','.....','.....','.....','.....','.....','.....'],
      };
      const x0 = 30, x1 = 170, y0 = 20, y1 = 58, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const word = matWord(), letter = new Uint8Array(GW * GH), sy = 2;
      let sx = 2, gap = 3, tw = word.length * 5 * sx + (word.length - 1) * gap;
      if (tw > x1 - x0 - 8){ sx = 1; gap = 2; tw = word.length * 5 + (word.length - 1) * gap; }    // long mats get narrower letters
      let lx = Math.round(cx - tw / 2); const ly = Math.round(cy - 7 * sy / 2);
      for (const ch of word){ (FONT[ch] || FONT[' ']).forEach((row, r) => [...row].forEach((b, c) => { if (b === '#') for (let a = 0; a < sx; a++) for (let e = 0; e < sy; e++) letter[(ly + r * sy + e) * GW + lx + c * sx + a] = 1; })); lx += 5 * sx + gap; }
      const r = rng(3), noise = Float32Array.from({ length: GW * GH }, () => r());
      return { x0, x1, y0, y1, cx, cy, letter, noise };
    },
    draw(g, t, st){
      const { x0, x1, y0, y1, cx, cy, letter, noise } = st;
      const R0 = 13 * ease((t - 1.5) / 6.5);                      // the worn-through circle: small, and it stops
      const grind = Math.min(1, t / 9);                           // everything else, slowly
      const weave = '=-:. ', ink = '@#*+=:. ', stone = '_.,:;';
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++){
        const n = j * GW + i, dx = (i - cx) * 0.6, dy = j - cy, dist = Math.sqrt(dx * dx + dy * dy);
        const onMat = i >= x0 && i <= x1 && j >= y0 && j <= y1;
        if (dist < R0 - 2 + noise[n] * 4){                        // worn through: the step shows, and in the middle, not even that
          if (dist < R0 * 0.45 - 1) continue;
          g.put(i, j, stone[Math.floor(noise[n] * stone.length)], 0); continue;
        }
        if (!onMat){ if ((i + j * 3) % 7 === 0 && noise[n] < 0.35) g.put(i, j, '.', 3); continue; }   // the step around it
        const edge = i === x0 || i === x1 || j === y0 || j === y1;
        const near = Math.max(0, 1 - (dist - R0) / 18);           // wear gathers near the hole
        const wear = Math.max(0, Math.min(0.999, grind * 0.45 + near * 0.65 + noise[n] * 0.2 - 0.12));
        if (letter[n]){ const q = Math.floor(wear * ink.length); g.put(i, j, ink[q], q < 4 ? 1 : 0); }
        else if (edge){ const q = Math.floor(wear * 4); g.put(i, j, '#*+.'[q], q < 2 ? 0 : 3); }
        else { const q = Math.floor(wear * weave.length); g.put(i, j, j % 2 ? weave[q] : (q ? weave[q] : '-'), q < 2 ? 0 : 3); }
      }
      // the foot, scrubbing, until there's nothing left to scrub
      if (t < 8.6){
        const fi = cx + Math.sin(t * 7.5) * 28, fj = cy + Math.cos(t * 3.7) * 3;
        for (let j = -4; j <= 4; j++) for (let i = -14; i <= 14; i++){
          const e = (i / 14) ** 2 + (j / 4.2) ** 2; if (e > 1) continue;
          g.put(fi + i, fj + j, e > 0.72 ? '#' : (i > 6 ? '%' : '='), 2);
        }
      }
    },
  },

  /* THE DOOR TAKER — the left door comes off its hinges and into your hands; behind it, nothing was ever built */
  doortaker: {
    setup(){
      const cam = { x: 0, y: 1.5, z: 1.0, tx: 0, ty: 1.48, tz: 2.0 };
      const gone = still('hallway', cam, { flags: { doorGone: true } });
      const c0 = R.project('hallway', {}, cam, [-1.38, 2.1, 5.0]), c1 = R.project('hallway', {}, cam, [-0.52, 0, 5.0]);
      if (c0 && c1) for (let j = Math.ceil(c0.j); j < c1.j; j++) for (let i = Math.ceil(c0.i); i < c1.i; i++){ const n = j * GW + i; if (!gone.obj[n]) gone.c[n] = ' '; }   // nothing behind it. nothing was ever built there
      return { cam, withDoor: still('hallway', cam, {}, ['left']), gone };
    },
    draw(g, t, st){
      Object.assign(g, new Grid(t < 1.2 ? st.withDoor : st.gone));
      if (t < 1.2) return;
      const lift = ease((t - 1.2) / 3.4), wob = Math.sin(t * 2.1) * 0.025 * lift;
      const cx = -0.95 + 1.45 * lift, cy = 1.05 + 0.1 * lift + wob, cz = 5.36 - 1.9 * lift;
      const yaw = 0.6 * lift + wob, roll = -0.06 * lift;
      const cyw = Math.cos(yaw), syw = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll);
      for (let v = 0; v <= 1.0001; v += 0.011) for (let u = 0; u <= 1.0001; u += 0.011){
        const lx = (u - 0.5) * 0.84, ly = (v - 0.5) * 2.1;
        const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr;
        const p = R.project('hallway', {}, st.cam, [cx + rx * cyw, cy + ry, cz - rx * syw]); if (!p) continue;
        const edge = u < 0.04 || u > 0.96 || v < 0.02 || v > 0.98;
        const inU = u > 0.19 && u < 0.81, lo = v > 0.11 && v < 0.49, hi = v > 0.58 && v < 0.88;
        const panel = inU && (lo || hi), rim = panel && (u < 0.24 || u > 0.76 || (lo && (v < 0.14 || v > 0.46)) || (hi && (v < 0.61 || v > 0.85)));
        const knob = Math.hypot((u - 0.85) * 0.84, (v - 0.47) * 2.1) < 0.04;
        g.put(p.i, p.j, knob ? '@' : edge ? '#' : rim ? '=' : panel ? '.' : ':', knob ? 2 : 1);
      }
    },
  },

  /* NARRATED FROM MEMORY — in the dark, the library he's describing comes up out of nothing; then it gives way, once, to the airing cupboard you're actually in */
  lightsout: {
    setup(){
      const lib = still('library', null, {});
      const T = new Grid(), r = rng(8);
      for (let j = 0; j < GH; j++){ T.put(22, j, '|', 3); T.put(178, j, '|', 3); }
      [20, 42, 64].forEach(sj => {
        for (let i = 22; i <= 178; i++){ T.put(i, sj, i % 3 ? '=' : '-', 3); T.put(i, sj + 1, i % 3 ? '-' : ' ', 3); }
        let x = 28;
        while (x < 165){
          const w = 18 + Math.floor(r() * 12), n = 3 + Math.floor(r() * 3);
          for (let q = 0; q < n; q++){
            const j = sj - 1 - q * 3, dx = Math.round((r() - 0.5) * 2);
            T.text(x + dx, j, '(' + '~'.repeat(w - 2) + ')', 0);
            T.text(x + dx + 1, j - 1, '_'.repeat(w - 2), 0);
            T.text(x + dx, j - 2, '(' + '='.repeat(w - 2) + ')', 3);
          }
          x += w + 4 + Math.floor(r() * 6);
        }
      });
      const noise = Float32Array.from({ length: GW * GH }, () => r()), noise2 = Float32Array.from({ length: GW * GH }, () => r());
      return { lib, T, noise, noise2 };
    },
    draw(g, t, st){
      const seen = ease((t - 0.3) / 2.6);            // the library, remembered, surfacing in the dark
      const truth = 0.95 * ease((t - 4.2) / 4.5);     // then the towels, which were there all along
      for (let n = 0; n < GW * GH; n++){
        if (st.noise[n] < truth){ g.c[n] = st.T.c[n]; g.k[n] = st.T.k[n]; }
        else if (st.noise2[n] < seen){ g.c[n] = st.lib.c[n]; g.k[n] = 3; }
      }
    },
  },

  /* THE LAST LINE — the page, written as you went; its last line is you reading it; after that, nothing yet */
  reader: {
    setup(){
      const past = { open:'opened', look:'looked at', take:'took', read:'read', ring:'rang', wipe:'wiped', sit:'sat on', talk:'talked to', knock:'knocked on', listen:'listened to', hang:'put down', close:'closed', climb:'climbed', drink:'drank from', write:'wrote on', turn:'turned', stand:'stood up', back:'went back', help:'asked for help' };
      const lines = ['the guest came to the door.'];
      for (const [v, what] of S.did.slice(-40)){
        if (v === 'enter'){ if (what !== ROOMS.doorstep.name) lines.push(`the guest went into ${what}.`); continue; }
        const pv = past[v] || (v + 'ed'), bare = !what || ['stand','back','help'].includes(v);
        lines.push(`the guest ${bare ? pv.replace(/ (at|on|to|from)$/, '') + (v === 'look' ? ' around' : '') : pv + ' ' + what}.`);
      }
      lines.push('the guest read the last line.');
      const W2 = 60, flow = []; lines.forEach(l => wrapWords(l, W2).forEach(x => flow.push(x)));
      const before = ["the guest before you rang twice and went away.", "a guest wiped their feet, as asked.", "a guest took the mat. they always come back for", "the one after that read the spines and cried a", "little, which I have written down, and won't say.", "a guest sat in the kitchen for eleven minutes.", "a guest asked who I was. I said the house.", "a guest came in.", "a guest came in.", "a guest came in, and left by the back.", "a guest stood in the hall and said nothing at all,", "which I also wrote down.", "then you."];
      const rightN = Math.min(16, flow.length), left = before.concat(flow.slice(0, flow.length - rightN)).slice(-25), right = flow.slice(flow.length - rightN);
      return { left, right };
    },
    draw(g, t, st){
      const L0 = 30, L1 = 97, R0 = 103, R1 = 170, top = i => 12 - Math.round(2 * Math.sin(Math.PI * (i < 100 ? (i - L0) / (L1 - L0) : (i - R0) / (R1 - R0)))), bot = 68;
      for (let i = L0; i <= R1; i++){ if (i > L1 && i < R0) continue; g.put(i, top(i), '_', 0); g.put(i, bot, '-', 3); }
      for (let j = 11; j < bot; j++){ g.put(L0 - 1, j, '(', 3); g.put(R1 + 1, j, ')', 3); g.put(100, j, '|', 3); }
      st.left.forEach((l, n) => g.text(L0 + 3, 16 + n * 2, l, 3));
      let clock = 0.6;                                     // the right page writes itself, at reading speed
      st.right.forEach((l, n) => {
        const last = n === st.right.length - 1, shown = Math.max(0, Math.min(l.length, Math.floor((t - clock) * 34)));
        g.text(R0 + 3, 16 + n * 2, l.slice(0, shown), last ? 2 : 0);
        if (shown > 0 && shown < l.length) g.put(R0 + 3 + shown, 16 + n * 2, '_', 1);
        clock += l.length / 34 + (last ? 0 : 0.25);
        if (last && shown === l.length){
          const cj = 16 + (n + 1) * 2;                       // and then the cursor, waiting, on a line with nothing on it
          if (Math.floor((t - clock) * 1.6) % 2 === 0) g.put(R0 + 3, cj, '_', 1);
        }
      });
    },
  },

  /* STILL REPLYING — the radio, and everything it's still saying, piling up; one light left on */
  argument: {
    setup(){
      const F = { radioOn: true }, cam = R.cameraFor('basement', Object.assign({ L: S.loc }, S.flags, F), 'radio');
      const base = still('basement', cam, { flags: F }, ['radio']);
      const b = bboxOf(base, 'radio') || { ci: GW / 2, cj: GH / 2 };
      const Q = ["— I never said that —", "— you did, it's right here —", "— that's not what it means —", "— source? —", "— read it again —", "— fine —", "— who said that? —", "— see, they agree with me —", "— they do NOT —", "— you always do this —", "— do *what* —", "— in 2009 you said —", "— that's out of context —", "— everyone knows —", "— nobody said that —", "— ok but —", "— reply —", "— edited —", "— still waiting —", "— lol —"];
      if (S.flags.talkedHall) Q.push(`— somebody said '${String(S.flags.talkedHall).slice(0, 30)}' —`);
      const r = rng(21), frags = []; let tt = 0.3, p = 0.7;
      while (tt < 10){ const an = r() * Math.PI * 2; frags.push({ b: tt, s: Q[Math.floor(r() * Q.length)], dx: Math.cos(an), dy: Math.sin(an), d: 0.35 + r() * 0.65 }); tt += p; p = Math.max(0.06, p * 0.9); }
      return { base, bi: b.ci, bj: b.cj, frags };
    },
    draw(g, t, st){
      const off = t > 11;
      Object.assign(g, new Grid(st.base));
      if (!off) for (let w = 0; w < 3; w++){                 // it's still talking
        const a = ((t * 1.4 + w / 3) % 1), rr = 4 + a * 26, ch = a < 0.35 ? ')' : a < 0.7 ? ':' : '.';
        for (let s = -6; s <= 6; s++){ const an = s / 14; g.put(st.bi + Math.cos(an) * rr / 0.6, st.bj + Math.sin(an) * rr * 0.9, ch, 3); g.put(st.bi - Math.cos(an) * rr / 0.6, st.bj + Math.sin(an) * rr * 0.9, ch === ')' ? '(' : ch, 3); }
      }
      st.frags.forEach(f => {
        const a = t - f.b; if (a < 0) return;
        const k = ease(a / 1.4), i = st.bi + f.dx * f.d * 95 * k - f.s.length / 2, j = st.bj + f.dy * f.d * 34 * k;
        g.label(i, j, f.s, a < 0.5 ? 2 : a < 3 ? 0 : 3);
      });
      // years go by; the voices sink into the wall; the radio's light stays on, because he leaves it on
      if (off){ const glow = Math.sin(t * 1.4) > -0.4; for (let n = 0; n < GW * GH; n++){ if (g.c[n] !== st.base.c[n]) g.k[n] = 3; else if (st.base.k[n] === 1) g.k[n] = glow ? 1 : 0; } }
    },
  },

  /* MOSTLY DRAFTS — the furnace, open, and the same sentence rising out of it, over and over, a little different each time */
  furnace: {
    setup(){
      const F = { furnaceOpen: true }, cam = null;
      const base = still('basement', cam, { flags: F }, ['furnace']);
      const LT = R.SCENES.basement.lights(Object.assign({ L: S.loc }, S.flags, F));
      const lv = [0.72, 1.3].map(k => still('basement', cam, { flags: F, lights: LT.map((l, n) => n === 1 ? [l[0], l[1], l[2], l[3] * k] : l) }, ['furnace']));
      const mask = []; for (let n = 0; n < GW * GH; n++) if (lv[0].c[n] !== base.c[n] || lv[1].c[n] !== base.c[n]) mask.push(n);
      // the mouth: wherever it glows brightest
      let si = 0, sj = 0, sn = 0; const fo = base.objects.indexOf('furnace');
      for (let n = 0; n < GW * GH; n++) if (base.obj[n] === fo && base.c[n] === '@'){ si += n % GW; sj += (n / GW) | 0; sn++; }
      const m = sn ? { i: si / sn, j: sj / sn } : (R.project('basement', {}, cam, [1.2, 0.72, 3.95]) || { i: GW / 2, j: GH * 0.6 });
      const D = ["the guest came in.", "the guest came in, at last.", "a guest came in.", "someone came in.", "the guest came in and I", "you came in.", "the guest came in (again).", "came in.", "the guest came in. I was glad.", "the guest came in; I didn't say", "the guest arrived.", "the guest, who had come in,", "the guest came in, and the house was", "in came the guest.", "the guest came in. good.", "they came in.", "the guest came in, which was", "the guest came in and sat down in the"];
      const r2 = rng(12), noise = Float32Array.from({ length: GW * GH }, () => r2());
      return { base, mi: m.i, mj: m.j, D, fire: { v: lv.map(x => ({ chars: x.c })), mask }, noise };
    },
    draw(g, t, st){
      Object.assign(g, new Grid(st.base));
      // the glow moves; nothing burns
      fireAt(st.fire, { chars: st.base.c }, t, (n, ch) => { g.c[n] = ch; });
      // and the room goes dark around it: it was never lit, only warm
      const dark = ease((t - 0.8) / 6.5);
      for (let n = 0; n < GW * GH; n++){ if (g.k[n] === 1) continue; if (st.noise[n] < dark * 0.97) g.c[n] = ' '; else if (dark > 0.05) g.k[n] = 3; }
      // drafts, forever: each one rises, drifts, cools
      const every = 0.55, first = Math.max(0, Math.floor((t - 6.5) / every));
      for (let q = first; q <= t / every; q++){
        const a = t - q * every, s = st.D[(q * 7) % st.D.length], side = ((q * 37) % 11 - 5) / 5;
        if (a < 0 || a > 6.5) continue;
        const i = st.mi + side * a * 9 - s.length / 2 + Math.sin(a * 1.3 + q) * 3, j = st.mj - 2 - a * 7;
        if (j < 0) continue;
        g.label(i, j, s, a < 1.2 ? 1 : a < 3.2 ? 0 : 3);
      }
    },
  },

  /* OH? HELLO THERE — every visit he greets you as new; your visits go up, what he remembers of you never does */
  hello: {
    setup(){ return { base: dimAll(new Grid(still('spare', null, {}, ['chair'])), 1) }; },
    draw(g, t, st){
      Object.assign(g, new Grid(st.base));
      const P = 3.8, c = Math.floor(t / P), a = t - c * P, s = 'OH? HELLO THERE.';
      const cj = 26, shown = Math.min(s.length, Math.floor(a / 0.07)), fade = Math.max(0, (a - 2.4) / 1.1);
      if (fade < 1){ blockBand(g, s, GW / 2, cj + 1, 1, 2); block(g, s.slice(0, shown).padEnd(s.length, ' '), GW / 2, cj, 1, fadeCh(fade * 0.95), fade < 0.4 ? 2 : 0); }
      if (a > 1.2 && fade < 0.5) g.label(Math.round((GW - 18) / 2), cj + 6, 'for the first time', 3);
      // the two counts, side by side: yours keeps going; his starts over every time
      const visits = c + 4, knows = a > 0.5 && fade < 0.35 ? 1 : 0, wiping = fade > 0.35 && fade < 1;
      const left = `visits  ${String(visits).padStart(3, ' ')}`, right = `he remembers you  ${wiping ? '·' : knows}`;
      const w = left.length + 10 + right.length, x = Math.round((GW - w) / 2), j = 58;
      for (let i = x - 3; i < x + w + 3; i++) for (let jj = j - 2; jj <= j + 2; jj++) g.put(i, jj, ' ', 0);
      g.text(x, j, left, 0); g.text(x + left.length + 10, j, right, knows ? 2 : 3);
      if (wiping){ const wx = x + left.length + 10 + Math.round((right.length + 2) * (fade - 0.35) / 0.65); for (let jj = j - 1; jj <= j + 1; jj++) g.put(wx, jj, '|', 1); }
    },
  },

  /* YOUR LINE — what you wrote, written large, by the pen, which then does not come back */
  author: {
    setup(){
      const base = dimAll(new Grid(still('study', null, { flags: { seatS: true } })));
      let line = blockText((S.flags.line || '…').trim()); if (line.length > 120) line = line.slice(0, 117) + '...';
      let rows = wrapWords(line, 27); if (rows.length > 4) rows = rows.slice(0, 4);
      const top = Math.round(GH / 2 - rows.length * 5.5 + 3.5);
      const cells = []; rows.forEach((r, n) => blockCells(r, GW / 2, top + n * 11, 1).forEach(([i, j]) => cells.push([i, j, cells.length])));
      // write order: left to right, row by row, a column at a time
      if (!cells.length) cells.push([Math.round(GW / 2), top, 0]);     // a line with nothing drawable in it: the pen still needs somewhere to rest
      cells.sort((A, B) => (Math.floor((A[1] - top + 3) / 11) - Math.floor((B[1] - top + 3) / 11)) || (A[0] - B[0]) || (A[1] - B[1]));
      return { base, cells, rows, top };
    },
    draw(g, t, st){
      Object.assign(g, new Grid(st.base));
      const x0 = 14, x1 = GW - 15, y0 = st.top - 7, y1 = st.top + st.rows.length * 11 - 2;
      for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) g.put(i, j, (j === y0 || j === y1) ? '-' : (i === x0 || i === x1) ? ':' : ' ', 3);
      const rate = Math.max(40, st.cells.length / 7), n = Math.min(st.cells.length, Math.floor(Math.max(0, t - 0.8) * rate));
      for (let q = 0; q < n; q++){ const [i, j] = st.cells[q], age = (n - q) / rate; g.put(i, j, age < 0.25 ? '@' : '#', age < 0.4 ? 1 : 2); }
      // the pen: at the last stroke while writing; afterwards, lying on the page, put down
      let pi, pj;
      if (n < st.cells.length){ const c = st.cells[Math.max(0, n - 1)]; pi = c[0] + 1; pj = c[1] + Math.sin(t * 20) * 0.4; }
      else { const a = ease((t - 0.8 - st.cells.length / rate) / 1.2), c = st.cells[st.cells.length - 1]; pi = c[0] + 1 + a * 14; pj = c[1] + a * (y1 - 2 - c[1]); }
      for (let s = 0; s < 12; s++) g.put(pi + 1 + s, pj - 1 - s * 0.55, s < 2 ? '/' : s < 9 ? '/' : '#', s < 2 ? 2 : 1);
      g.put(pi, pj, '.', 2);
    },
  },

  /* THE IRISH GOODBYE — the kitchen after you: the back door open on the rain, your cup still steaming, the chair losing its warmth */
  evening: {
    setup(){
      const F = { seatK: false }, base = still('kitchen', null, { flags: F }, ['chair']);
      const door = bboxOf(base, 'door'), cup = bboxOf(base, 'cups');
      const r = rng(6), drops = []; for (let n = 0; n < 90; n++) drops.push([r(), r(), 0.6 + r() * 0.8]);
      return { base, door, cup, drops };
    },
    draw(g, t, st){
      Object.assign(g, new Grid(st.base));
      const cool = ease((t - 2) / 8);                                  // the chair, still warm, then not
      for (let n = 0; n < GW * GH; n++) if (st.base.k[n] === 1 && ((n * 7919) % 100) / 100 < cool) g.k[n] = 0;
      if (st.door){                                                      // the back door, left open: night, rain
        const { i0, i1, j0, j1 } = st.door, w = i1 - i0 - 2, h = j1 - j0 - 1;
        for (let j = j0 + 1; j < j1; j++) for (let i = i0 + 2; i < i1 - 1; i++) g.put(i, j, ' ', 0);
        st.drops.forEach(([x, y, sp]) => { const jj = j0 + 1 + ((y * h + t * sp * 14) % h), ii = i0 + 2 + x * w; g.put(ii, jj, '/', 3); });
        for (let i = i0 + 2; i < i1 - 1; i++) g.put(i, j1 - 1, (i + Math.floor(t * 3)) % 4 ? '.' : ',', 3);
      }
      if (st.cup){                                                       // your cup, half full, still warm
        const si = st.cup.i0 + (st.cup.i1 - st.cup.i0) * 0.25, sj = st.cup.j0 - 1, fadeS = 1 - ease((t - 6) / 8);
        for (let q = 0; q < 10; q++){ const a = ((t * 0.45 + q / 10) % 1); if (a > fadeS) continue; g.put(si + Math.sin(a * 6 + q + t) * (1 + a * 3), sj - a * 12, a < 0.4 ? '~' : '.', 3); }
      }
    },
  },

  /* HOME — from your chair: the kitchen getting warmer, the tea in both cups steaming; nobody says anything */
  home: {
    setup(){
      const F = { seatK: true };
      const cool = still('kitchen', null, { flags: F }, []);
      const warm = still('kitchen', null, { flags: F, lights: [[0, 2.6, 1.6, 3.2], [1.9, 1.9, 1.4, 0.9], [-0.45, 1.4, 1.9, 0.7]], exposure: 0.85 }, ['cups', 'chair', 'table']);
      const cb = bboxOf(cool, 'cups'), cols = [];
      if (cb){                                                            // find each cup: columns with cup cells, split where there's a gap
        const o = cool.objects.indexOf('cups'), has = i => { for (let j = cb.j0; j <= cb.j1; j++) if (cool.obj[j * GW + i] === o) return true; return false; };
        let run = null; for (let i = cb.i0; i <= cb.i1 + 1; i++){ if (i <= cb.i1 && has(i)){ if (!run) run = [i, i]; else run[1] = i; } else if (run){ let top = GH; for (let x = run[0]; x <= run[1]; x++) for (let j = cb.j0; j <= cb.j1; j++) if (cool.obj[j * GW + x] === o){ top = Math.min(top, j); break; } cols.push({ i: (run[0] + run[1]) / 2, j: top - 1, w: run[1] - run[0] }); run = null; } }
      }
      const r = rng(9), noise = Float32Array.from({ length: GW * GH }, () => r());
      return { cool, warm, noise, cups: cols.filter(c => c.w >= 3).slice(0, 2) };
    },
    draw(g, t, st){
      const mix = ease((t - 2) / 7);
      for (let n = 0; n < GW * GH; n++){ const s = st.noise[n] < mix ? st.warm : st.cool; g.c[n] = s.c[n]; g.k[n] = s.k[n]; }
      st.cups.forEach((c, m) => {
        for (let q = 0; q < 12; q++){
          const a = ((t * 0.42 + q / 12 + m * 0.37) % 1), j = c.j - a * 16, i = c.i + Math.sin(a * 6.5 + q * 0.9 + t * 0.7 + m) * (1 + a * 4);
          g.put(i, j, a < 0.35 ? '(' : a < 0.65 ? '~' : '.', a < 0.45 ? 0 : 3);
          if (q % 3 === 0) g.put(i + 1, j, a < 0.4 ? ')' : '.', 3);
        }
      });
    },
  },

  /* THE ONE WHO ANSWERS — wherever somebody asks, the house is there; nowhere else */
  who: {
    setup(){
      const base = still(ROOMS[S.room].scene, null, {});        // wherever they asked from
      const r = rng(13), ev = []; let tt = 0.4, p = 1.1;
      while (tt < 10){ ev.push({ b: tt, i: 25 + r() * 150, j: 10 + r() * 56, life: 2.8 }); tt += p; p = Math.max(0.14, p * 0.86); }
      ev.push({ b: 11.2, i: GW / 2, j: GH / 2, life: 1e9, big: true });
      return { base, ev };
    },
    draw(g, t, st){
      for (const e of st.ev){
        const a = t - e.b; if (a < 0 || a > e.life) continue;
        const fade = e.big ? 0 : ease((a - 1.6) / 1.2), R0 = (e.big ? 34 : 13) * ease(a / (e.big ? 3 : 0.6)) * (1 - fade);
        for (let j = Math.floor(e.j - R0); j <= e.j + R0; j++) for (let i = Math.floor(e.i - R0 / 0.6); i <= e.i + R0 / 0.6; i++){
          if (i < 0 || j < 0 || i >= GW || j >= GH) continue;
          const d = Math.hypot((i - e.i) * 0.6, j - e.j); if (d > R0) continue;
          const n = j * GW + i; g.c[n] = st.base.c[n]; g.k[n] = d > R0 * 0.7 ? 3 : 0;
        }
        const q = 'who are you?';
        if (a < 2.2 || e.big) g.label(e.i - q.length / 2, e.j, q, a < 1 || e.big ? 2 : 3);
      }
    },
  },

  /* THE ONE WHO CAME IN — every answer in the library is someone else's, and they fall away; what's left is a doorway, and you in it */
  me: {
    setup(){
      const A = ["a teacher", "my mother's daughter", "tired", "from nowhere in particular", "a nurse, nights", "still looking", "not who I was", "the funny one", "an engineer, mostly", "somebody's dad", "fine, thanks", "the one who stayed", "a Leo", "left-handed", "between jobs", "a good person, I think", "the youngest", "a lot, apparently", "sorry", "whatever you need", "the one who left", "a writer, technically", "nobody", "a work in progress", "the second one", "just visiting"];
      const r = rng(17), frags = [];
      for (let j = 1; j < GH - 1; j += 2){ let i = Math.floor(r() * -20); while (i < GW){ const s = 'I am ' + A[Math.floor(r() * A.length)] + '.'; frags.push({ i, j, s, fall: 0.8 + r() * 6.5 + Math.abs(i + s.length / 2 - GW / 2) / GW * 1.5 }); i += s.length + 3; } }
      return { frags, inside: cameIn() };
    },
    draw(g, t, st){
      for (const f of st.frags){ const a = t - f.fall; const j = a > 0 ? f.j + 30 * a * a : f.j; if (j < GH) g.text(f.i, j, f.s, a > 0 ? 3 : 0); }
      const on = ease((t - 7.5) / 2.5); if (on <= 0) return;
      const di0 = 86, di1 = 114, dj0 = 16, dj1 = 64, light = '.:-=+'[Math.min(4, Math.floor(on * 5))];
      for (let j = dj0; j <= dj1; j++) for (let i = di0; i <= di1; i++) g.put(i, j, (i === di0 || i === di1 || j === dj0) ? '#' : light, i === di0 || i === di1 || j === dj0 ? 3 : 1);
      for (let j = dj1 + 1; j < GH; j++){ const w = (j - dj1) * 2.2; for (let i = Math.round(di0 - w); i <= di1 + w; i++) if ((i + j) % 2 === 0 || j - dj1 < 3) g.put(i, j, j - dj1 < 4 ? ':' : '.', j - dj1 < 5 ? 1 : 3); }
      if (st.inside){ drawFigure(g, 100, dj1, 36, ' ', 0); if (t > 10.5) ctext(g, 7, 'the one who came in', 1); }   // you: the shape where the light isn't
      else { drawFigure(g, 100, dj1 - 1, 15, ' ', 0); if (t > 10.5) ctext(g, 7, "the one who didn't come in", 1); }   // you, small, out on the step: seen through the door, never through it
    },
  },

  /* ENOUGH — the kettle's steam, for a moment, spelling it */
  why: {
    setup(){
      const base = still('kitchen', null, {}, ['kettle']);
      const kb = bboxOf(base, 'kettle') || { ci: 150, j0: 32 };
      const cells = blockCells('ENOUGH', GW / 2, 14, 2), r = rng(4);
      const P = cells.map(([i, j]) => ({ i, j, d: r() * 3.2, w: r() * 6.28 }));
      const noise = Float32Array.from({ length: GW * GH }, () => r());
      return { base, si: kb.ci, sj: kb.j0 - 1, P, noise };
    },
    draw(g, t, st){
      Object.assign(g, new Grid(st.base));
      const clear = ease((t - 2) / 3) * (1 - ease((t - 10) / 3)), w = blockWidth('ENOUGH', 2) / 2 + 8;      // the air around the word goes still
      for (let j = 5; j < 24; j++) for (let i = Math.round(GW / 2 - w); i < GW / 2 + w; i++){ const n = j * GW + i; if (st.noise[n] < clear * (1 - Math.max(0, Math.abs(i - GW / 2) - w + 8) / 8)) { g.c[n] = ' '; g.k[n] = 0; } }
      for (const p of st.P){
        const a = (t - 0.5 - p.d) / 2.2; if (a < 0) continue;
        const k = ease(Math.min(1, a)), lift = Math.max(0, t - 9.5);
        const i = st.si + (p.i - st.si) * k + Math.sin(a * 5 + p.w) * 3 * (1 - k) + Math.sin(t + p.w) * lift * 1.5;
        const j = st.sj + (p.j - st.sj) * k - lift * (2 + p.w * 0.6);
        if (j < 0) continue;
        const gone = Math.min(1, lift / 3.5);
        g.put(i, j, k < 1 ? '.' : gone > 0 ? fadeCh(0.35 + gone * 0.65) : ('#*'[Math.floor(t * 3 + p.w) % 2]), k < 1 || gone > 0.3 ? 3 : 2);
      }
      for (let q = 0; q < 14; q++){ const a = ((t * 0.6 + q / 14) % 1); g.put(st.si + Math.sin(a * 6 + q) * (1 + a * 5), st.sj - a * 14, a < 0.5 ? '~' : '.', 3); }
    },
  },

  /* UNWRITTEN — the mirror, and in it the one guest he never wrote; the room goes, the reflection stays */
  reflected: {
    setup(){
      const cam = R.cameraFor('bathroom', Object.assign({ L: S.loc }, S.flags), 'mirror');
      const base = still('bathroom', cam, {}, ['mirror']);
      const b = bboxOf(base, 'mirror') || { i0: 70, i1: 130, j0: 10, j1: 50 };
      const r = rng(2), noise = Float32Array.from({ length: GW * GH }, () => r());
      return { base, b, noise };
    },
    draw(g, t, st){
      const { i0, i1, j0, j1 } = st.b, gone = ease((t - 5) / 4);
      for (let n = 0; n < GW * GH; n++){
        const i = n % GW, j = (n / GW) | 0, inM = i >= i0 && i <= i1 && j >= j0 && j <= j1;
        if (inM){ g.c[n] = st.base.c[n]; g.k[n] = t > 4 ? 1 : st.base.k[n]; continue; }
        if (st.noise[n] < gone) continue;
        g.c[n] = st.base.c[n]; g.k[n] = st.base.k[n];
      }
      const x0 = i0 + 2, x1 = i1 - 2, y0 = j0 + 1, y1 = j1 - 1;
      for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) g.put(i, j, ' ', 0);
      // a head and shoulders, lit from above and to the left; no face, just someone there, breathing
      const w = x1 - x0, h = y1 - y0, ci = (x0 + x1) / 2, b = Math.sin(t / 4.6 * 6.283);
      const ry = h * 0.21, rx = ry / 0.6 * 0.85, hy = y0 + ry + h * 0.1 - 0.25 * b, js = hy + ry + 1.6 - 0.55 * b, swell = 1 + 0.035 * b;
      const Lx = -0.45, Ly = -0.55, Lz = 0.7, RAMP = ' .:-=+*#%@', s = ease(t / 2.5), tone = t > 4 ? 2 : 0;
      const shade = (nx, ny, nz, k) => { const d = Math.max(0, (nx * Lx + ny * Ly + nz * Lz) / 1.004); return RAMP[Math.max(1, Math.min(9, Math.round((0.1 + 0.9 * d) * k * 9)))]; };
      for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++){
        if (st.noise[j * GW + i] >= s) continue;
        const dx = (i - ci) / rx, dy = (j - hy) / ry, hr = dx * dx + dy * dy, ax = Math.abs(i - ci);
        let ch = null;
        if (hr < 1) ch = shade(dx, dy, Math.sqrt(1 - hr), 1);
        else if (j > hy + ry * 0.75 && j < js + 1.5 && ax < rx * 0.4){ const nx = (i - ci) / (rx * 0.4); ch = shade(nx, 0, Math.sqrt(Math.max(0, 1 - nx * nx)), 0.55); }   // neck, in the chin's shadow
        else if (j >= js){
          const half = Math.min(w / 2 - 1, (rx * 0.95 + (j - js) * rx * 0.8) * swell);
          if (ax <= half){ const nx = (i - ci) / half, top = Math.max(0, 1 - (j - js) / 3.2), ny = -0.85 * top; ch = shade(nx * 0.9, ny, Math.sqrt(Math.max(0.02, 1 - nx * nx * 0.81 - ny * ny)), 0.8 + 0.08 * b); }
        }
        if (ch && ch !== ' ') g.put(i, j, ch, tone);
      }
    },
  },

  /* FORGOTTEN — the tally coming down to nothing, one way out at a time */
  reset: {
    setup(){
      const had = (S.flags.wiped || []).slice();
      return { had, total: Object.keys(ENDINGS).length, step: Math.min(1.5, 9 / Math.max(1, had.length)), start: 8.5 };
    },
    draw(g, t, st){
      const gone = Math.max(0, Math.min(st.had.length, Math.floor((t - st.start) / st.step)));
      const left = st.had.length - gone, done = t > st.start + st.had.length * st.step + 0.6;
      // the count, large, in the middle
      block(g, String(left), GW / 2, 22, 6, '#', left ? 2 : 3, 4);
      ctext(g, 40, `of ${st.total} ways out, remembered`, 3);
      // the one just let go of, in its own light, drifting up and out
      st.had.forEach((id, n) => {
        const a = t - st.start - n * st.step; if (a < 0 || a > 2.4) return;
        const title = (ENDINGS[id] || { title: id }).title, j = Math.round(48 - a * 6), fade = a / 2.4;
        g.label(Math.round((GW - title.length) / 2), j, fade < .75 ? title : title.replace(/[a-z]/g, (c, i) => (i + Math.floor(a * 9)) % 3 ? ' ' : c), fade < .35 ? 2 : fade < .7 ? 0 : 3);
      });
      if (done){
        ctext(g, 52, 'nothing remembered', 3);
        const b = 0.5 + 0.5 * Math.sin(t * 1.6);
        if (b > 0.5) ctext(g, 58, 'the doorstep is new again', 1);
      }
    },
  },

  /* THE THIEF — from the doorway, no mat on the step: someone hurrying down the path with it under their arm, into the dark */
  thief: {
    setup(){
      const cam = { x: 0, y: 1.55, z: -0.4, tx: 0, ty: 1.2, tz: -9 };
      const base = still('doorstep', cam, { flags: {} });
      const r = rng(9), drops = []; for (let n = 0; n < 260; n++) drops.push([r() * GW * 1.3, r() * GH, 26 + r() * 22, r()]);
      const noise = Float32Array.from({ length: GW * GH }, () => r());
      return { cam, base, drops, noise };
    },
    draw(g, t, st){
      Object.assign(g, new Grid(st.base));
      const dark = ease((t - 1.5) / 6);                                   // the dark comes up the path after them
      for (let n = 0; n < GW * GH; n++){ if (st.noise[n] < dark * 0.9) g.c[n] = ' '; else if (dark > 0.1) g.k[n] = 3; }
      const z = -2.1 - t * 1.9 - t * t * 0.08, sway = Math.sin(t * 8.5);  // quick, and getting quicker
      const feet = R.project('doorstep', {}, st.cam, [0.05 * sway, 0, z]), head = R.project('doorstep', {}, st.cam, [0.05 * sway, 1.72, z]);
      if (feet && head){
        const h = feet.j - head.j, bright = Math.max(0, 1 - t / 6), ramp = ' .:-=+*#@', ch = f => ramp[Math.max(1, Math.round(bright * f * (ramp.length - 1)))];
        if (h >= 1.2){
          drawFigure(g, feet.i, feet.j, h, f => ch(f < .58 ? .8 : .6), 0, sway);
          // the mat, rolled up and held upright under one arm, swinging a little with the walk
          const mj = Math.round(head.j + h * 0.22), mh = Math.max(2, Math.round(h * 0.42)), mw = Math.max(1, Math.round(h * 0.09 / 0.6));
          const mi = feet.i + Math.round(h * 0.15 / 0.6) + Math.round(sway * h * 0.02);
          for (let jj = 0; jj < mh; jj++) for (let ii = 0; ii < mw; ii++){
            const end = jj === 0 || jj === mh - 1, side = mw > 2 && (ii === 0 || ii === mw - 1);
            g.put(mi + ii, mj + jj, end ? (bright > .45 ? '@' : 'o') : side ? '|' : (bright > .45 ? '#' : ':'), bright > .3 ? 1 : 3);
          }
        } else if (t < 8) g.put(feet.i, feet.j - 0.5, '.', 3);
      }
      const heavy = ease(t / 2);
      st.drops.forEach(([x0, y0, sp, w], n) => { if (w > heavy) return; const j = (y0 + t * sp) % GH, i = (x0 - j * 0.35) % (GW * 1.3); g.put(i, j, '/', 3); });
    },
  },

  /* THE FIRST DRAFT — the little house, with a lit window, with a littler house in it, and so on down; he stops before the bottom */
  model: {
    setup(){ return {}; },
    draw(g, t, st){
      const q = 0.16, W0 = 120, cx0 = 100, by0 = 66;
      // window of a house of width w, base (cx, by): [x0, x1, y0, y1] and the inner house's base/width
      // the attic window, up in the gable
      const win = (cx, by, w) => { const hh = 0.26 * w, rh = 0.18 * w, top = by - hh; return { x0: cx - 0.09 * w, x1: cx + 0.09 * w, y0: top - rh * 0.72, y1: top - rh * 0.1 }; };
      const inner = (cx, by, w) => { const o = win(cx, by, w); return { cx: (o.x0 + o.x1) / 2, by: o.y1, w: q * w }; };
      // fixed point of the nesting, to zoom into
      const a = inner(0, 0, 1); const Px = a.cx / (1 - q) * W0 + cx0, Py = a.by / (1 - q) * W0 + by0;
      const depth = 1.35 * ease((t - 1) / 9), Z = Math.pow(1 / q, depth);
      const e = ease(depth / 1.35), Cx = Px + (GW / 2 - Px) * e, Cy = Py + (GH * 0.55 - Py) * e;
      const T = (x, y) => [Cx + (x - Px) * Z, Cy + (y - Py) * Z];
      const line = (x0, y0, x1, y1, ch, k) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1; if (n > 800) return; for (let s = 0; s <= n; s++) g.put(x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n, ch, k); };
      const house = (cx, by, w, lvl) => {
        const [sx, sy] = T(cx, by), sw = w * Z; if (sw < 2 || sw > 6000) return;
        const hh = 0.26 * sw, rh = 0.18 * sw, L = sx - sw / 2, Rr = sx + sw / 2, top = sy - hh, k = lvl > 3 ? 1 : 0;
        if (sw < 6){ g.put(sx, sy - 1, '^', 1); g.put(sx, sy, 'n', 1); return; }
        for (let j = Math.max(0, Math.floor(top - rh)); j <= Math.min(GH - 1, sy); j++) for (let i = Math.max(0, Math.floor(L - 2)); i <= Math.min(GW - 1, Rr + 2); i++){
          const inWall = j > top && j < sy && i > L && i < Rr, rf = j <= top && j > top - rh && Math.abs(i - sx) < (sw / 2 + 2) * (1 - (top - j) / rh);
          if (inWall || rf) g.put(i, j, ' ', 0);
        }
        line(L, top, L, sy, '|', k); line(Rr, top, Rr, sy, '|', k); line(L - 1, sy, Rr + 1, sy, '_', k);
        line(L - 2, top, sx, top - rh, '/', k); line(sx, top - rh, Rr + 2, top, '\\', k); line(L - 2, top, Rr + 2, top, '_', 3);
        const dw = sw * 0.06, dh = hh * 0.6; line(sx - dw, sy, sx - dw, sy - dh, '|', k); line(sx + dw, sy, sx + dw, sy - dh, '|', k); line(sx - dw, sy - dh, sx + dw, sy - dh, '_', k);
        const lw = (x0, x1, y0, y1, lit) => { for (let j = Math.ceil(y0); j <= y1; j++) for (let i = Math.ceil(x0); i <= x1; i++) g.put(i, j, lit ? (i + j) % 3 ? '.' : ':' : ' ', 1); line(x0, y0, x1, y0, '-', k); line(x0, y1, x1, y1, '-', k); line(x0, y0, x0, y1, '|', k); line(x1, y0, x1, y1, '|', k); };
        lw(sx - 0.36 * sw, sx - 0.22 * sw, sy - hh * 0.78, sy - hh * 0.42, false); lw(sx + 0.16 * sw, sx + 0.3 * sw, sy - hh * 0.78, sy - hh * 0.42, false);
        const o = win(sx, sy, sw); lw(o.x0, o.x1, o.y0, o.y1, true);
        const n = inner(cx, by, w); house(n.cx, n.by, n.w, lvl + 1);
      };
      house(cx0, by0, W0, 0);
    },
  },

  /* OVERGROWN — the plants take the room, cell by cell, from the pots outward; they go round the guest, who doesn't mind */
  overgrown: {
    setup(){
      const cam = { x: 0, y: 1.5, z: 0.05, tx: -0.2, ty: 1.28, tz: 1.8 };
      const base = still('conservatory', cam, { flags: { can: false, seatC: false, grow: 0 } });
      const ids = ['fern','plant','pots'].map(id => base.objects.indexOf(id)), chair = base.objects.indexOf('chair');
      const P = p => R.project('conservatory', {}, cam, p) || { i: GW / 2, j: GH / 2 };
      const hd = P([-0.3, 1.33, 1.8]), sh = P([-0.3, 1.03, 1.8]), px = (sh.j - hd.j) / 0.3;   // rows per metre, here
      const you = new Uint8Array(GW * GH), keep = new Uint8Array(GW * GH);
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++){
        const n = j * GW + i, hx = (i - hd.i) * R.CW / (0.1 * px), hy = (j - hd.j) / (0.12 * px);
        if (hx * hx + hy * hy < 1) you[n] = 2;                                                  // head
        else if (j > hd.j + 0.1 * px && j < sh.j + 0.14 * px){                                    // shoulders, above the chair back
          const w = (0.13 + 0.09 * Math.min(1, (j - hd.j - 0.1 * px) / (0.08 * px))) * px / R.CW;
          if (Math.abs(i - hd.i) < w) you[n] = 1;
        }
        if (base.obj[n] === chair) keep[n] = 1;                                        // the chair stays clear; whoever was in it is up to you
      }
      // a thin clearing round you and the chair: the plants come close, and stop
      const ring = new Uint8Array(GW * GH);
      for (let n = 0; n < GW * GH; n++) if (keep[n]){ const i = n % GW, j = (n / GW) | 0; for (let dj = -1; dj <= 1; dj++) for (let di = -3; di <= 3; di++){ const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < GW && jj < GH && !keep[jj * GW + ii]) ring[jj * GW + ii] = 1; } }
      for (let n = 0; n < GW * GH; n++) if (ring[n]) keep[n] = 2;
      // the vines: many more roots, and they go on until they reach the edges, round the chair and the guest
      const vines = growVines(base.obj, ids.filter(o => o > 0), n => keep[n] > 0, { seed: 5, roots: 26, len: 170, branch: 0.06, depth: 3, stagger: 8 });
      return { base, you, keep, vines, chair };
    },
    draw(g, t, st){
      Object.assign(g, new Grid(st.base));
      const reach = Math.max(0, t - 1.5) * 4.5;                               // a steady crawl, cell by cell
      for (let n = 0; n < GW * GH; n++){
        if (st.keep[n] === 2){ g.k[n] = 3; continue; }
        if (st.keep[n]){ g.k[n] = 0; continue; }                                                   // the chair stays yours
        if (t > 2 && h1(n * 5.7) * 9 < t - 2) g.k[n] = 3;                                          // what he built, going dim
      }
      for (const [n, b, , c] of st.vines){ if (b > reach) break; g.c[n] = c; g.k[n] = 1; }
    },
  },

  /* THE BACK WAY — the house from the gate: the window still lit, and him still narrating a guest who isn't there */
  gate: {
    setup(){
      const cam = { x: 1.0, y: 1.55, z: 7.1, tx: 0.45, ty: 1.75, tz: -0.9 };
      const base = still('garden', cam, {}, ['window']);
      const w = R.project('garden', {}, cam, [0.4, 1.7, -0.9]) || { i: GW / 2, j: 30 };
      const L = ["the guest is in the kitchen.", "the guest is sitting down.", "the kettle has just boiled.", "the guest is upstairs, I think.", "the guest is very quiet tonight.", "the guest is reading.", "the guest is in the hall.", "the guest has gone to the spare room.", "the guest is fine.", "the guest is still here."];
      return { base, wi: w.i, wj: w.j, L };
    },
    draw(g, t, st){
      Object.assign(g, new Grid(st.base));
      const every = 1.9;
      for (let q = Math.max(0, Math.floor((t - 9) / every)); q <= t / every; q++){
        const a = t - q * every, s = st.L[q % st.L.length]; if (a < 0 || a > 9) continue;
        const shown = Math.min(s.length, Math.floor(a * 26)), j = st.wj - 3 - a * 3.2, i = st.wi - s.length / 2 + Math.sin(a * 0.8 + q) * 6;
        if (j < 0) continue;
        if (shown) g.label(i, j, s.slice(0, shown), a < 2 ? 1 : a < 5 ? 0 : 3);
      }
    },
  },
};

/* each ending has its own light */
const ACCENT = { thief:'#9a7fc9', reset:'#8f8f95', bell:'#d9c27a', walkaway:'#7fa3c9', threadbare:'#b9a07e', doortaker:'#c98b5a', lightsout:'#8d9db2', reader:'#dcd2aa', argument:'#d97a64', furnace:'#c65a3c', hello:'#b8a4d8', author:'#86a8dc', evening:'#77b1ae', home:'#e3a765', who:'#c9c9c9', me:'#ead9a2', why:'#a9c7ba', reflected:'#a7c7da', model:'#e5b85a', gate:'#93b98c', overgrown:'#7fbf6a' };
let sceneTimer = null;
/* the doorstep picture grows in under the first words, slowly, and they settle where they normally live */
function darkFirst(){ col.classList.add('instant', 'opening'); void col.offsetHeight; requestAnimationFrame(() => requestAnimationFrame(() => col.classList.remove('instant'))); }
const openingLines = intro => intro.length > 1 ? [intro[0], { k:'reveal' }, ...intro.slice(1)] : [...intro, { k:'reveal' }];
function openingDone(){ if (col.classList.contains('opening')){ col.classList.remove('opening'); fit(); } }
function stopEndingScene(){ if (sceneTimer) { clearInterval(sceneTimer); sceneTimer = null; } col.classList.remove('scene'); artEl.style.removeProperty('--accent'); fit(); }
function startEndingScene(id){
  stopEndingScene();
  const sc = ENDING_ART[id]; if (!sc) return false;
  if (ACCENT[id]) artEl.style.setProperty('--accent', ACCENT[id]);
  Sound.ending(id);
  const st = sc.setup(), t0 = performance.now();
  if (id === 'reset') Sound.forget(st.start, st.step * st.had.length);          // the tape sinks exactly as the count falls
  const skies = new WeakMap();
  const done = (END_T[id] || 12) + 8;                            // it has finished; there is nothing left to draw
  const frame = () => {
    const t = (performance.now() - t0) / 1000;
    if (document.hidden || !galleryEl.hidden) return;             // nobody is looking
    if (t > done){ clearInterval(sceneTimer); sceneTimer = null; return; }
    const g = new Grid(); sc.draw(g, t, st);
    if (g.star){                                                   // any sky in the picture keeps sparkling
      let cl = skies.get(g.star); if (!cl){ cl = starClusters(g.star, g.c); skies.set(g.star, cl); }
      skyAt(cl, t, (n, ch, w) => { if (g.k[n] === 0 && " .:'+*".includes(g.c[n])){ g.c[n] = ch; if (w) g.k[n] = 2; } });
    }
    artEl.innerHTML = g.html();
  };
  if (prefersReduced()){ const g = new Grid(); sc.draw(g, 14, st); artEl.innerHTML = g.html(); }
  else { frame(); sceneTimer = setInterval(frame, 90); }
  col.classList.add('scene'); fit();
  return true;
}

/* ── every way out: a small still of each ending; the ones you haven't found are shapes in the dark ── */
const END_ROOM = { thief:'doorstep', reset:'doorstep', bell:'doorstep', walkaway:'doorstep', threadbare:'doorstep', doortaker:'hallway', lightsout:'hallway', reader:'library', argument:'basement', furnace:'basement', evening:'kitchen', home:'kitchen', hello:'spare', author:'study', reflected:'bathroom', model:'attic', gate:'garden', overgrown:'conservatory', who:'hallway', me:'hallway', why:'kitchen' };
const END_FLAGS = { thief:{},  lightsout:{ lightsOff:true }, evening:{ sat:true }, home:{ sat:true, seatK:true }, author:{ line:'the kettle was on' }, argument:{ radioOn:true } };
const END_T = { thief:3.2, reset:14, bell:6.5, walkaway:6, threadbare:12, doortaker:8, lightsout:12, reader:14, argument:9, furnace:9, hello:1.7, author:12, evening:10, home:12, who:14, me:12, why:6.5, reflected:9, model:12, gate:8, overgrown:30 };
const galleryCache = {};
function galleryGrid(id){
  if (galleryCache[id]) return galleryCache[id];
  const saved = { room:S.room, flags:S.flags, loc:S.loc, did:S.did, view:S.view, ended:S.ended };
  try {
    Object.assign(S, { room: END_ROOM[id], flags: Object.assign({}, END_FLAGS[id] || {}), loc: id === 'thief' ? { ...HOME, mat: 'player' } : { ...HOME }, did: [['enter', 'the hallway']], view: null });
    const sc = ENDING_ART[id], st = sc.setup(), g = new Grid(); sc.draw(g, END_T[id] || 12, st);
    return (galleryCache[id] = g);
  } finally { Object.assign(S, saved); }
}
let galleryGen = 0;
function openGallery(){
  if (!galleryEl.hidden) return;
  const ids = Object.keys(ENDINGS), got = ids.filter(i => S.found.includes(i)).length;   // Forgotten is always last, and always dark
  $('gcount').textContent = `${got} of ${ids.length} found`;
  const where = id => id === 'reset' ? 'the only one you can never keep' : ['who','me','why'].includes(id) ? 'anywhere, if you ask' : 'somewhere ' + (['doorstep'].includes(END_ROOM[id]) ? 'on ' : 'in ') + ROOMS[END_ROOM[id]].name;
  $('tiles').innerHTML = ids.map(id => { const f = S.found.includes(id); return `<figure class="tile${f ? '' : ' lost'}" data-id="${id}" style="--accent:${ACCENT[id]}"><div class="frame"><span class="wait">drawing…</span></div><figcaption><span class="tt">${f ? ENDINGS[id].title : '? ? ?'}</span><span class="ts">${f ? ENDINGS[id].sub : where(id)}</span></figcaption></figure>`; }).join('');
  galleryEl.hidden = false; $('gclose').focus();
  const tiles = [...$('tiles').children], mine = ++galleryGen;
  (function next(k){
    if (galleryEl.hidden || mine !== galleryGen || k >= tiles.length) return;
    const tile = tiles[k], id = tile.dataset.id, g = galleryGrid(id), f = S.found.includes(id);
    let html;
    if (f) html = g.html();
    else { const d = new Grid(); for (let n = 0; n < g.c.length; n++) if (g.c[n] !== ' ') { d.c[n] = (n % 3) ? '.' : ':'; d.k[n] = 3; } html = d.html(); }
    const box = tile.querySelector('.frame'), fs = box.clientWidth / (R.W * R.CW);
    box.innerHTML = `<pre style="font-size:${fs}px">${html}</pre>`;
    setTimeout(() => next(k + 1), 20);
  })(0);
}
function closeGallery(){ galleryEl.hidden = true; cmdEl.focus(); }
$('gclose').addEventListener('click', closeGallery);
// G, once an ending has happened, from anywhere on the page
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key !== 'g' && e.key !== 'G') return;
  if (!S.ended || !galleryEl.hidden || !introEl.hidden || document.activeElement === cmdEl) return;
  e.preventDefault(); skipLine = true; openGallery();
});
galleryEl.addEventListener('keydown', e => { if (e.key === 'Escape'){ e.preventDefault(); closeGallery(); } });
document.addEventListener('keydown', e => { if (!galleryEl.hidden && e.key === 'Escape'){ e.preventDefault(); closeGallery(); } }, true);
