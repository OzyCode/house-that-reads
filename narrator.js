/* ──────────────────────────────────────────────────────────────────────────
   narrator.js — the voice

   One queue of lines, typed out one character at a time. An action can cut
   the current line off mid-word, so every wait checks whether the line it
   is typing still belongs to the newest action.

   Uses:  The log element, and the page's dark/opening classes.
   Rule:  gen is the generation token: interrupt() moves it on, and any drain loop
          holding an older one abandons its work rather than writing into the log.
   ────────────────────────────────────────────────────────────────────────── */

/* the log: only the current moment lives here */
let queue = [], draining = false, skipLine = false, gen = 0, fadeTimer = null;
function clearMoment(){ clearTimeout(fadeTimer); [...log.children].forEach(el => el.remove()); }
function armFade(){ clearTimeout(fadeTimer); fadeTimer = setTimeout(() => [...log.children].forEach(el => { if (!el.classList.contains('ending')) el.classList.add('faded'); }), 14000); }
/* a new action: drop whatever was still waiting to be said, and stop the line being typed */
function interrupt(){ gen++; queue = []; skipLine = false; }
function push(lines){ queue.push(...lines); if (!draining) drain(); }
/* the fade to black always plays out in full, however fast anyone clicks; only a restart cuts it short */
async function holdFirm(ms, my){ const t0 = performance.now(); while (performance.now() - t0 < ms){ if (my !== gen) return; await sleep(Math.min(40, ms)); } }
async function hold(ms, my){ const t0 = performance.now(); while (performance.now() - t0 < ms){ if (my !== gen || skipLine) return; await sleep(Math.min(40, ms)); } }
async function drain(){
  draining = true; clearTimeout(fadeTimer);
  const my = gen;
  while (queue.length && my === gen){
    const L = queue.shift();
    const slow = col.classList.contains('dark');
    if (L.k === 'ending'){ renderEnding(L.id, L.title); continue; }
    if (L.k === 'dark'){ col.classList.add('dark'); col.classList.remove('blink'); clearMoment(); const ring = S.ended === 'reset' ? 0 : Sound.play('ending'); await holdFirm(prefersReduced() ? 0 : 1500, my); skipLine = false; await hold(prefersReduced() ? 0 : 600, my); if (my !== gen) break; startEndingScene(S.ended); await hold(ring ? Math.max(1800, ring * 1000 - 2100) : (prefersReduced() ? 0 : 1800), my); skipLine = false; continue; }
    if (L.k === 'reveal'){ await holdFirm(prefersReduced() ? 0 : 1900, my); openingDone(); await holdFirm(prefersReduced() ? 0 : 3000, my); skipLine = false; continue; }
    if (L.k === 'blink'){ col.classList.add('blink'); clearMoment(); await holdFirm(prefersReduced() ? 0 : 1500, my); if (my !== gen){ if (!S.ended) col.classList.remove('blink'); break; } if (L.fn) L.fn(); if (!L.stay) col.classList.remove('blink'); await holdFirm(prefersReduced() ? 0 : 500, my); skipLine = false; continue; }
    if (L.k === 'clear'){ if (!prefersReduced()) await hold(L.ms, my); if (my !== gen) break; skipLine = false; clearMoment(); await hold(prefersReduced() ? 0 : 400, my); skipLine = false; continue; }
    if (L.k === 'pause'){ if (!prefersReduced()) await hold(L.ms, my); skipLine = false; continue; }
    if (slow) for (const old of log.querySelectorAll('.line:not(.leaving)')){ old.classList.add('leaving'); setTimeout(() => old.remove(), 450); }   // in an ending, one line at a time, under the picture
    const el = document.createElement('div'); el.className = 'line ' + L.k; log.appendChild(el);
    if (L.k.startsWith('n') && !prefersReduced()){
      const caret = document.createElement('span'); caret.className = 'caret';
      const node = document.createTextNode(''); el.appendChild(node); el.appendChild(caret);
      let txt = '', tall = 0;
      const T = tempo(L, slow), chars = [...L.t]; let stress = false;
      for (let ci = 0; ci < chars.length; ci++){ const ch = chars[ci]; if (my !== gen || skipLine) break; if (ch === '*') stress = !stress; txt += ch; node.data = txt; if (el.offsetHeight !== tall){ tall = el.offsetHeight; log.scrollTop = log.scrollHeight; } await sleep(beat(chars, ci, T, stress)); }
      if (my !== gen) break;
      setRich(el, L.t); const skipped = skipLine; skipLine = false;
      await hold(skipped ? 120 : (slow ? 700 : T.after), my);
    } else { L.k.startsWith('n') ? setRich(el, L.t) : (el.textContent = L.t); }
    log.scrollTop = log.scrollHeight;
  }
  draining = false;
  if (my !== gen){ if (queue.length) drain(); return; }
  armFade();
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* how he speaks a line: cross is quick and clipped, quiet is slow with long silences, plain is in between.
   Short lines are said deliberately; a line that trails off (…) is slower; stressed words (*like this*) are leaned on. */
function tempo(L, slow){
  const k = L.k, t = L.t.trim(), cross = k.includes('cross'), hush = k.includes('quiet');
  const T = cross ? { cd: 13, stop: 110, ell: 300, after: 180 } : hush ? { cd: 25, stop: 420, ell: 780, after: 420 } : { cd: 19, stop: 240, ell: 520, after: 280 };
  if (t.replace(/[*\u2026]/g, '').length < 16) T.cd *= 1.45;
  if (/\u2026/.test(t)) T.cd *= 1.15;
  if (cross && /[!?]$/.test(t)) T.cd *= .85;
  if (slow){ T.cd *= 1.75; T.stop *= 1.4; T.ell *= 1.3; }
  return T;
}
function beat(chars, i, T, stress){
  const ch = chars[i], next = chars[i + 1] || '', last = i === chars.length - 1;
  if (ch === '\u2026') return last && chars.length === 1 ? T.ell * 1.6 : T.ell;                       // a trailing-off: a real pause
  if (ch === '.' && next === '.') return T.ell / 3;                                             // ... typed out
  if (/[.!?]/.test(ch)) return last ? T.cd : (/[\s*)"\u2019\u201d]/.test(next) ? T.stop : T.cd);          // a pause after every sentence
  if (ch === '\u2014') return T.stop * .6;
  if (/[;:]/.test(ch)) return T.stop * .6;
  if (ch === ',') return T.stop * .4;
  if (ch === '*') return 0;
  return stress ? T.cd * 1.6 : T.cd;
}
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
const prefersReduced = () => REDUCED.matches;
function setRich(el, t){ el.textContent=''; t.split(/(\*[^*]+\*)/).forEach(p => { if (p.startsWith('*') && p.endsWith('*')) { const s=document.createElement('span'); s.className='stress'; s.textContent=p.slice(1,-1); el.appendChild(s); } else el.appendChild(document.createTextNode(p)); }); }
const overlaid = () => !introEl.hidden || !galleryEl.hidden;      // an overlay is open: the game underneath is out of reach
document.addEventListener('click', e => { if (overlaid() || artEl.contains(e.target)) return; if (draining) skipLine = true; $('cmd').focus(); });

function renderEnding(id, title){
  const e = ENDINGS[id] || SPECIAL[id];
  const el = document.createElement('div'); el.className = 'ending';
  el.innerHTML = `<div class="t"></div><div class="s"></div><div class="k"></div>`;
  el.querySelector('.t').textContent = title || e.title;
  if (ACCENT[id]) el.querySelector('.t').style.color = ACCENT[id];
  el.querySelector('.s').textContent = e.sub;
  el.querySelector('.k').textContent = `${S.found.length} of ${Object.keys(ENDINGS).length} endings · G to see them all · enter to go back to the door`;
  if (id === 'reset') el.querySelector('.k').textContent = `0 of ${Object.keys(ENDINGS).length} endings · the only one you can never keep · enter to knock again`;
  log.appendChild(el); log.scrollTop = log.scrollHeight;
}
