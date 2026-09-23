/* ──────────────────────────────────────────────────────────────────────────
   view.js — the picture on screen

   Turns a render into the characters you see: the still frame, what is under
   the mouse, and the small things that move over the top — stars, rain, fire,
   rain on glass, and the vines in the conservatory.

   Uses:  render.js for the render itself; game.js for state.
   Rule:  R.render hands back buffers it will reuse, so snap() copies them at once.
   ────────────────────────────────────────────────────────────────────────── */

/* still-frame ASCII view, clickable */
let frame = null, hover = 0;
function render(){
  S.flags.L = S.loc; S.flags.matWord = matWord(); const sc = ROOMS[S.room].scene;
  frame = snap(R.render(sc, S.flags, S.view));
  sky = starClusters(frame.star, frame.chars); if (!sky.length) sky = null;
  frame.words = new Set((frame.under || []).map(u => u[0]));      // the rain doesn't fall on the mat's word
  fire = null; const me = frame;
  if (sc === 'basement' && S.flags.furnaceOpen) setTimeout(() => { if (frame === me) fire = fireVariants(sc, me, S.view); }, 30);
  frame.letterAt = S.room === 'doorstep' ? skyBox(frame.sky) : null;
  if (sc === 'conservatory'){ frame.chars0 = frame.chars.slice(); frame.obj0 = Uint8Array.from(frame.obj); frame.grow = growthCells(frame); applyGrowth(); }
  col.style.setProperty('--art', ROOM_TONE[S.room] || '#7a7a7a');
  Sound.room();
  paint(); where();
}
function where(){
  const h = held();
  const hh = listNames(h) + (S.flags.can ? (h.length ? ' and the watering can' : 'the watering can') : '');
  $('where').textContent = ROOMS[S.room].name + (seated() ? ', sitting' : '') + (hh ? '  ·  carrying ' + hh : '');
}
/* ── living light: the sky sparkles, at random; fire flickers; lamps and bulbs stay exactly as they are ── */
const fract = x => x - Math.floor(x);
const h1 = n => fract(Math.sin(n * 12.9898 + 78.233) * 43758.5453);
const SKYCH = ' .:-=+*#@';
function snap(fr){ return { chars: fr.chars.slice(), obj: Uint8Array.from(fr.obj), star: fr.star ? Uint8Array.from(fr.star) : null, sky: fr.sky ? Uint8Array.from(fr.sky) : null, objects: fr.objects, under: fr.under ? fr.under.slice() : [], glass: fr.glass ? Uint8Array.from(fr.glass) : null }; }
/* the plants, growing out past where the picture says they end: leaves appear cell by cell, nearest first, and they're clickable as whatever they grew from */
/* vines: roots crawl out of the plants one cell at a time, turning a little as they go, branching now and then,
   with thorns along them. Every cell gets a birth step, so the picture can show them growing, bit by bit. */
function growVines(obj, ids, blocked, o){
  const W = R.W, H = R.H, rnd = rng(o.seed || 7), birth = new Float32Array(W * H).fill(1e9), ch = new Array(W * H), own = new Uint8Array(W * H);
  const cells = ids.map(id => { const c = []; for (let n = 0; n < W * H; n++) if (obj[n] === id) c.push(n); return c; });
  const cen = cells.map(c => { let x = 0, y = 0; for (const n of c){ x += n % W; y += (n / W) | 0; } return c.length ? [x / c.length, y / c.length] : [W / 2, H / 2]; });
  const lay = (n, b, c, who) => { if (b < birth[n]){ birth[n] = b; ch[n] = c; own[n] = who; } };
  const stem = a => { const x = Math.cos(a), y = Math.sin(a), ax = Math.abs(x * 1.6), ay = Math.abs(y); return ay > ax * 2 ? '|' : ax > ay * 2 ? (rnd() < 0.8 ? '-' : '~') : (x * y > 0 ? '\\' : '/'); };
  const vines = [];
  for (let r = 0; r < o.roots; r++){
    const k = Math.floor(rnd() * cells.length), c = cells[k]; if (!c.length) continue;
    const n = c[Math.floor(rnd() * c.length)], i = n % W, j = (n / W) | 0;
    const a = Math.atan2(j - cen[k][1], (i - cen[k][0]) * 0.6) + (rnd() - 0.5) * 1.2;     // outward from the plant, roughly
    vines.push({ x: i, y: j, a, b: rnd() * o.stagger, len: o.len * (0.5 + rnd() * 0.7), depth: 0, who: ids[k] });
  }
  while (vines.length){
    const v = vines.pop(); let { x, y, a, b } = v, turn = (rnd() - 0.5) * 0.2;
    for (let s = 0; s < v.len; s++){
      turn = turn * 0.85 + (rnd() - 0.5) * 0.18; a += turn;
      let nx = x + Math.cos(a) * 1.6, ny = y + Math.sin(a), tries = 0;
      while (tries < 6){                                                   // something in the way: bend round it
        const ii = Math.round(nx), jj = Math.round(ny);
        if (ii >= 0 && jj >= 0 && ii < W && jj < H && !blocked(jj * W + ii)) break;
        a += (tries % 2 ? -1 : 1) * (0.6 + tries * 0.3); nx = x + Math.cos(a) * 1.6; ny = y + Math.sin(a); tries++;
      }
      if (tries >= 6) break;
      x = nx; y = ny; b += 1;
      const ii = Math.round(x), jj = Math.round(y), n = jj * W + ii, c = stem(a);
      lay(n, b, c, v.who);
      if (Math.abs(Math.cos(a)) > 0.5){ const m = n + (Math.cos(a) > 0 ? -1 : 1); if (ii > 0 && ii < W - 1) lay(m, b, c, v.who); }   // no gaps when it runs sideways
      if (s % 4 === 2 && rnd() < 0.8){                                     // a thorn, off one side
        const side = rnd() < 0.5 ? 1 : -1, px = -Math.sin(a) * side, py = Math.cos(a) * side;
        const ti = Math.round(x + px * 1.6), tj = Math.round(y + py), tn = tj * W + ti;
        if (ti >= 0 && tj >= 0 && ti < W && tj < H && !blocked(tn)) lay(tn, b + 1, Math.abs(py) > Math.abs(px) ? (py < 0 ? '^' : 'v') : (px < 0 ? '<' : '>'), v.who);
      }
      if (v.depth < o.depth && rnd() < o.branch)
        vines.push({ x, y, a: a + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.6), b, len: (v.len - s) * (0.4 + rnd() * 0.5), depth: v.depth + 1, who: v.who });
      if (ii <= 0 || jj <= 0 || ii >= W - 1 || jj >= H - 1) break;
    }
    const ti = Math.round(x), tj = Math.round(y); if (ti >= 0 && tj >= 0 && ti < W && tj < H && !blocked(tj * W + ti)) lay(tj * W + ti, b + 0.5, rnd() < 0.5 ? '*' : '&', v.who);   // a bud at the tip
  }
  const out = []; for (let n = 0; n < W * H; n++) if (birth[n] < 1e9) out.push([n, birth[n], own[n], ch[n]]);
  return out.sort((p, q) => p[1] - q[1]);
}
/* the plants in the room, growing out past where the picture says they end; what grows is clickable as whatever it grew from */
function growthCells(fr){
  const ids = ['fern','plant','pots'].map(id => fr.objects.indexOf(id)).filter(o => o > 0);
  const block = ['chair','door','can'].map(id => fr.objects.indexOf(id)).filter(o => o > 0);   // they grow round the chair, never over it
  return growVines(fr.obj, ids, n => block.includes(fr.obj[n]), { seed: 11, roots: 16, len: 34, branch: 0.07, depth: 2, stagger: 3 });
}
const GROW_STEPS = 40;                   // how far along its vines the room has got, at full growth
function applyGrowth(){
  if (!frame || !frame.grow) return;
  const reach = (S.flags.grow || 0) * GROW_STEPS;
  for (let n = 0; n < frame.chars.length; n++){ frame.chars[n] = frame.chars0[n]; frame.obj[n] = frame.obj0[n]; }
  for (const [n, b, o, c] of frame.grow){ if (b > reach) break; frame.chars[n] = c; frame.obj[n] = o; }
}
/* rain running down the glass, not falling through the air */
const RUNS = Array.from({ length: 110 }, (_, n) => [Math.floor(h1(n * 4.7) * R.W), h1(n * 9.1) * R.H, 3 + h1(n * 2.3) * 5, 2 + Math.floor(h1(n * 6.1) * 3)]);
function glassRainAt(glass, t, set){ for (const [i, y0, sp, len] of RUNS){ const j = Math.floor((y0 + t * sp) % R.H); for (let l = 0; l < len; l++){ const jj = j - l; if (jj < 0) break; const n = jj * R.W + i; if (!glass[n]) continue; set(n, l === 0 ? (h1(n) < .5 ? ':' : '|') : (l === 1 ? '|' : "'")); } } }
/* each star is a little cluster of sky cells; give each its own pace */
function starClusters(star, chars){
  const out = []; if (!star) return out;
  const seen = new Uint8Array(R.W * R.H);
  for (let n = 0; n < star.length; n++){
    if (!star[n] || seen[n]) continue;
    const cells = [], stack = [n]; seen[n] = 1;
    while (stack.length){
      const m = stack.pop(); cells.push(m); const i = m % R.W, j = (m / R.W) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++){
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= R.W || jj >= R.H) continue;
        const q = jj * R.W + ii; if (star[q] && !seen[q]){ seen[q] = 1; stack.push(q); }
      }
    }
    let c = cells[0]; for (const m of cells) if (SKYCH.indexOf(chars[m]) > SKYCH.indexOf(chars[c])) c = m;
    out.push({ cells, c, p: 0.7 + h1(c) * 2.6, o: h1(c + 7) * 6.283, big: cells.length > 4 });
  }
  return out;
}
/* the sky at time t: set(n, ch, white) for every star cell */
function skyAt(cl, t, set){
  for (const s of cl){
    const v = 0.5 + 0.5 * Math.sin(t / s.p * 6.283 + s.o) * (0.65 + 0.35 * Math.sin(t * 0.41 + s.o * 3));
    const P = s.p * 0.8, beat = Math.floor(t / P + s.o), since = t - (beat - s.o) * P;
    const flash = h1(s.c * 3.1 + beat * 1.7) < (s.big ? 0.32 : 0.2) && since < 0.45;     // now and then, one catches
    for (const m of s.cells){
      const centre = m === s.c; let ch;
      if (flash) ch = centre ? '*' : (since < 0.22 ? '+' : ':');
      else if (v < 0.2) ch = centre ? '.' : ' ';
      else if (v < 0.55) ch = centre ? ':' : '.';
      else if (v < 0.86) ch = centre ? '+' : '.';
      else ch = centre ? '*' : ':';
      set(m, ch, flash && (centre || since < 0.22));
    }
  }
}
/* fire: the same view with the furnace a little lower and a little higher; only the cells its light reaches ever change */
function fireVariants(sc, base, view){
  const LT = R.SCENES[sc].lights(S.flags);
  const v = [0.72, 1.3].map(k => snap(R.render(sc, S.flags, view, { lights: LT.map((l, n) => n === 1 ? [l[0], l[1], l[2], l[3] * k] : l) })));
  const mask = []; for (let n = 0; n < base.chars.length; n++) if (v[0].chars[n] !== base.chars[n] || v[1].chars[n] !== base.chars[n]) mask.push(n);
  return { v, mask };
}
function flame(n, t){ const i = n % R.W, j = (n / R.W) | 0; return Math.sin(i * 0.07 + t * 4.3) + Math.sin(j * 0.16 - t * 6.7) + Math.sin((i - j) * 0.05 + t * 2.9) + (h1(n + Math.floor(t * 8)) - 0.5) * 0.7; }
function fireAt(fire, base, t, set){ for (const n of fire.mask){ const f = flame(n, t); set(n, f < -1.1 ? fire.v[0].chars[n] : f > 1.1 ? fire.v[1].chars[n] : base.chars[n]); } }
let sky = null, fire = null; const glint = new Uint8Array(R.W * R.H), tint = new Uint8Array(R.W * R.H), wet = new Uint8Array(R.W * R.H);
/* rain: a few dozen thin streaks, slanting, never on a star */
const DROPS = Array.from({ length: 70 }, (_, n) => [h1(n * 3.1) * R.W * 1.3, h1(n * 7.7) * R.H, 20 + h1(n * 1.9) * 16, h1(n * 5.3)]);
function rainAt(t, set){ for (const [x0, y0, sp, w] of DROPS){ const j = Math.floor((y0 + t * sp) % R.H), i = Math.floor((x0 - j * 0.35) % (R.W * 1.3)); if (i < 0 || i >= R.W) continue; set(j * R.W + i, w < 0.3 ? ',' : '/'); if (w > 0.75 && j > 0) set((j - 1) * R.W + i, '\''); } }
function paint(){
  let fr = frame;
  if ((sky || fire || frame.glass) && !prefersReduced()){
    const t = performance.now() / 1000, chars = frame.chars.slice(); glint.fill(0); tint.fill(0); wet.fill(0);
    if (sky) skyAt(sky, t, (n, ch, w) => { chars[n] = ch; if (w) glint[n] = 1; });
    if (S.room === 'doorstep' || S.room === 'garden') rainAt(t, (n, ch) => { if ((frame.star && frame.star[n]) || (frame.words && frame.words.has(n))) return; chars[n] = ch; wet[n] = 1; });
    if (frame.letterAt && S.found.length) starLetter(frame.letterAt, t, (n, ch) => { chars[n] = ch; tint[n] = 1; wet[n] = 0; });
    if (fire) fireAt(fire, frame, t, (n, ch) => { chars[n] = ch; });
    if (frame.glass && S.room === 'conservatory') glassRainAt(frame.glass, t, (n, ch) => { if (frame.obj[n] !== frame.obj0?.[n]) return; chars[n] = ch; wet[n] = 1; });
    if (frame.under && frame.under.length && S.flags.matWord === '_' && Math.floor(t / 0.55) % 2) for (const [n, ch] of frame.under) chars[n] = ch;   // the blank mat blinks, waiting
    fr = { chars, obj: frame.obj, objects: frame.objects, glint, tint, wet };
  }
  // the wall on the right is just a wall until it isn't: no colour, no hover, though it still answers a click
  const mute = (S.room === 'hallway' && !S.flags.rightDoor) ? frame.objects.indexOf('right') : S.room === 'conservatory' ? frame.objects.indexOf('glass') : -1;
  if (mute > 0) fr = Object.assign({}, fr, { mute });
  artEl.innerHTML = R.toHTML(fr, hover === mute ? 0 : hover, null); artEl.style.cursor = hover && hover !== mute ? 'pointer' : 'default';
}
setInterval(() => { if ((sky || fire || (frame && frame.glass)) && !S.ended && !document.hidden && !prefersReduced()) paint(); }, 110);

/* ── each room has its own temperature; the same palette, leaning warm or cold ── */
const ROOM_TONE = { doorstep:'#737884', hallway:'#7a7a7a', library:'#817865', study:'#7e776b', bathroom:'#717a7f', basement:'#6b727d', kitchen:'#877a6b', spare:'#79767f', attic:'#80786a', garden:'#6f7c74', conservatory:'#6e7b69' };

/* ── the stars remember: now and then, on the doorstep, they spell the first letter of a way you've left ── */
function skyBox(skyMask){
  if (!skyMask) return null;
  const W = R.W, ok = (i0, j0) => { for (let j = j0 - 1; j < j0 + 8; j++) for (let i = i0 - 1; i < i0 + 6; i++){ if (i < 0 || j < 0 || i >= W || j >= R.H || !skyMask[j * W + i]) return false; } return true; };
  const found = [];
  for (let j = 2; j < 34; j += 1) for (let i = 2; i < W - 8; i += 2) if (ok(i, j)) found.push({ i, j });
  if (!found.length) return null;
  return found[Math.floor(found.length * 0.37) % found.length];
}
const initialOf = t => { const w = blockText(t).replace(/^(THE|OH\?) /, ''); return w[0]; };
function starLetter(at, t, set){
  const P = 13, a = t % P; if (a > 2.6) return;
  const cyc = Math.floor(t / P), id = S.found[cyc % S.found.length], L = BLOCK[initialOf(ENDINGS[id].title)]; if (!L) return;
  artEl.style.setProperty('--star', ACCENT[id] || 'var(--touch)');            // the letter is lit in that ending's own colour
  const v = Math.sin(Math.PI * a / 2.6);
  L.forEach((row, rr) => [...row].forEach((b, cc) => { if (b !== '#') return; const n = (at.j + rr) * R.W + at.i + cc; const tw = 0.75 + 0.25 * Math.sin(t * 9 + n); const q = v * tw; if (q < 0.15) return; set(n, q > 0.8 ? '*' : q > 0.5 ? '+' : q > 0.3 ? ':' : '.', q > 0.85); }));
}
function fit(){ const w = col.clientWidth, h = innerHeight * (col.classList.contains('dark') ? 0.5 : 0.58); artEl.style.fontSize = Math.min(11, w / (R.W * R.CW), h / R.H) + 'px'; }
addEventListener('resize', fit); fit();
function cellAt(e){
  const r = artEl.getBoundingClientRect(), fs = parseFloat(artEl.style.fontSize);
  const i = Math.floor((e.clientX - r.left) / (fs * R.CW)), j = Math.floor((e.clientY - r.top) / fs);
  if (!frame || i < 0 || j < 0 || i >= R.W || j >= R.H) return 0;
  const o = frame.obj[j * R.W + i]; if (o) return o;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++){
    const jj = j + dj, ii = i + di; if (jj < 0 || ii < 0 || jj >= R.H || ii >= R.W) continue;
    const oo = frame.obj[jj * R.W + ii]; if (oo) return oo;
  }
  return 0;
}
artEl.addEventListener('mousemove', e => { if (S.ended) return; const o = cellAt(e); if (o !== hover){ hover = o; paint(); } });
artEl.addEventListener('mouseleave', () => { if (hover){ hover = 0; paint(); } });
