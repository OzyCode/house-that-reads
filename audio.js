/* ──────────────────────────────────────────────────────────────────────────
   audio.js — the sound, made here

   One Web Audio graph: continuous layers mixed per room, short sounds for the
   things you do, and the two endings with a sound of their own. Nothing is
   recorded; every settings block below was tuned in its own lab page.

   Uses:  game.js for which room you are in and what has happened.
   Rule:  Silent means idle: turning sound off stops the scheduler and suspends the graph.
   ────────────────────────────────────────────────────────────────────────── */

/* ── sound: off until you ask; everything is made here, no recordings. rain, a room's hum, the kettle, the radio's murmur, a tap ── */
/* ── sound: off until you ask. tuned in the Sound Lab: a drizzle outside every room, each room's own mix, and a short sound for each thing you do ── */
const SOUND = {"master":0.3,"layers":{"rain":{"on":true,"gain":0.15,"hiss":0.35,"rumble":0,"low":700,"high":9000,"drops":6,"dropGain":0.45,"dropPitch":5200,"dropDecay":0.022},"hum":{"on":true,"gain":0.07,"pitch":55,"overtone":0.25,"tone":260},"kettle":{"on":true,"gain":0.05,"tone":5200,"wobble":0.4},"radio":{"on":true,"gain":0.16,"voice":1150,"focus":1.3,"syllables":6,"pauses":0.3},"furnace":{"on":true,"gain":0.18,"tone":170,"crackle":2}},"rooms":{"doorstep":{"rain":1,"hum":0,"kettle":0,"radio":0,"furnace":0,"walls":9000},"hallway":{"rain":0.35,"hum":0.5,"kettle":0,"radio":0,"furnace":0,"walls":900},"library":{"rain":0.2,"hum":0.4,"kettle":0,"radio":0,"furnace":0,"walls":700},"study":{"rain":0.3,"hum":0.2,"kettle":0,"radio":0,"furnace":0,"walls":1200},"bathroom":{"rain":0.15,"hum":0.3,"kettle":0,"radio":0,"furnace":0,"walls":600},"basement":{"rain":0.05,"hum":1,"kettle":0,"radio":1,"furnace":1,"walls":400},"kitchen":{"rain":0.45,"hum":0.2,"kettle":1,"radio":0,"furnace":0,"walls":1500},"spare":{"rain":0.25,"hum":0.2,"kettle":0,"radio":0,"furnace":0,"walls":900},"attic":{"rain":0.9,"hum":0,"kettle":0,"radio":0,"furnace":0,"walls":2600},"garden":{"rain":1,"hum":0,"kettle":0,"radio":0,"furnace":0,"walls":12000},"conservatory":{"rain":0,"hum":0,"kettle":0,"radio":0,"furnace":0,"glass":1,"walls":5200}},"events":{"bell":{"on":true,"gain":0.35,"pitch":1,"length":1,"brightness":1},"footstep":{"on":true,"gain":0.5,"pitch":1,"length":1,"brightness":1},"door":{"on":true,"gain":0.5,"pitch":1,"length":1,"brightness":1},"drip":{"on":true,"gain":0.25,"pitch":1,"length":1,"brightness":1},"kettle":{"on":true,"gain":0.75,"pitch":1,"length":1,"brightness":1},"radio":{"on":true,"gain":0.75,"pitch":1,"length":1,"brightness":1},"furnace":{"on":true,"gain":0.3,"pitch":1,"length":1,"brightness":1},"page":{"on":true,"gain":0.71,"pitch":1,"length":1,"brightness":1},"ending":{"on":true,"gain":0.3,"pitch":1,"length":1,"brightness":1}}};
/* the conservatory's own rain: drops on the panes, rain on the glass roof, water running down, the odd heavy drip. Tuned in Rain on Glass. */
const GLASS = {"master": 0.6, "inside": 5750, "taps": {"on": 1, "rate": 25.5, "pitch": 5550, "spread": 0.1, "q": 2.2, "decay": 68, "ring": 0, "ringPitch": 1400, "gain": 1, "width": 0.2}, "wash": {"on": 1, "gain": 0.18, "low": 320, "high": 8750, "flutter": 0.54}, "runs": {"on": 1, "gain": 0.1, "center": 1580, "q": 7.8, "wobble": 0.88}, "drips": {"on": 1, "rate": 0.11, "pitch": 535, "gain": 0.46}};
/* the sound of being forgotten: the ending chime on a tape that loses power, sinking as the count falls to nothing. Tuned in The Sound of Forgetting. */
const FORGET = {"version":"tape","pitch":1,"length":1,"brightness":1,"drift":1,"noise":0,"gain":0.3};
const FORGET_TRIM = 0.25;              // measured: at this level it peaks as loud as the usual ending chime
const GLASS_TRIM = 0.096;                // measured: at this level the conservatory is as loud as the rain on the doorstep
const Sound = (() => {
  let meter = null, schedule = null, ctx = null, on = false, out, nodes = {}, bufs = {}, tick = null, drip = null, amb = true, room = null, lastT = 0;
  try { on = localStorage.getItem('house-sound') === 'on'; } catch (e) {}
  const G = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const F = (type, f, q) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; };
  const glide = (param, v, t = .25) => param.setTargetAtTime(v, ctx.currentTime, t / 3);
  function noiseBuf(kind){
    const len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,last=0;
    for (let i = 0; i < len; i++){ const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w * .5;
      else if (kind === 'pink'){ b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.969*b2+w*.153852; b3=.8665*b3+w*.3104856; b4=.55*b4+w*.5329522; b5=-.7616*b5-w*.016898; d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11; b6=w*.115926; }
      else { last = (last + .02 * w) / 1.02; d[i] = last * 3.2; } }
    return b;
  }
  const loopSrc = kind => { const s = ctx.createBufferSource(); s.buffer = bufs[kind]; s.loop = true; s.start(0, Math.random() * 3); return s; };
  function build(){
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    ['white','pink','brown'].forEach(k => bufs[k] = noiseBuf(k));
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6; comp.knee.value = 8; comp.attack.value = .005; comp.release.value = .2;
    out = G(0); out.connect(comp); comp.connect(ctx.destination);
    meter = ctx.createAnalyser(); meter.fftSize = 2048; out.connect(meter);        // how loud a room is, before the limiter (for tuning)
    const r = nodes.rain = { walls: F('lowpass', 9000), lvl: G(0), hiss: G(0), rumble: G(0), low: F('highpass', 700), high: F('lowpass', 9000), drops: G(1) };
    loopSrc('pink').connect(r.hiss); loopSrc('brown').connect(r.rumble); r.hiss.connect(r.low); r.rumble.connect(r.low); r.low.connect(r.high); r.high.connect(r.walls); r.drops.connect(r.walls); r.walls.connect(r.lvl); r.lvl.connect(out);
    const h = nodes.hum = { lvl: G(0), o1: ctx.createOscillator(), o2: ctx.createOscillator(), ov: G(0), tone: F('lowpass', 260) };
    h.o1.connect(h.tone); h.o2.connect(h.ov); h.ov.connect(h.tone); h.tone.connect(h.lvl); h.lvl.connect(out); h.o1.start(); h.o2.start();
    const k = nodes.kettle = { lvl: G(0), tone: F('highpass', 5200), wob: G(1) }; loopSrc('white').connect(k.tone); k.tone.connect(k.wob); k.wob.connect(k.lvl); k.lvl.connect(out);
    const rd = nodes.radio = { lvl: G(0), band: F('bandpass', 1150, 1.3), env: G(0) }; loopSrc('pink').connect(rd.band); rd.band.connect(rd.env); rd.env.connect(rd.lvl); rd.lvl.connect(out);
    const fu = nodes.furnace = { lvl: G(0), tone: F('lowpass', 170), crack: G(1) }; loopSrc('brown').connect(fu.tone); fu.tone.connect(fu.lvl); fu.crack.connect(fu.lvl); fu.lvl.connect(out);
    const Q = GLASS, gl = nodes.glass = { lvl: G(0), inside: F('lowpass', Q.inside), wHP: F('highpass', Q.wash.low), wLP: F('lowpass', Q.wash.high), wAM: G(1), wG: G(Q.wash.on ? Q.wash.gain * 2 : 0),
      rBP: F('bandpass', Q.runs.center, Q.runs.q), rAM: G(1), rG: G(Q.runs.on ? Q.runs.gain * 2 : 0), level: 0, wob: 0, gust: 0 };
    loopSrc('white').connect(gl.wHP); gl.wHP.connect(gl.wLP); gl.wLP.connect(gl.wAM); gl.wAM.connect(gl.wG); gl.wG.connect(gl.inside);
    loopSrc('white').connect(gl.rBP); gl.rBP.connect(gl.rAM); gl.rAM.connect(gl.rG); gl.rG.connect(gl.inside);
    gl.inside.connect(gl.lvl); gl.lvl.connect(out);
    const L = SOUND.layers;
    glide(r.hiss.gain, L.rain.hiss); glide(r.rumble.gain, L.rain.rumble); glide(r.low.frequency, L.rain.low); glide(r.high.frequency, L.rain.high);
    h.o1.frequency.value = L.hum.pitch; h.o2.frequency.value = L.hum.pitch * 2; glide(h.ov.gain, L.hum.overtone); glide(h.tone.frequency, L.hum.tone);
    glide(k.tone.frequency, L.kettle.tone); rd.band.Q.value = L.radio.focus; glide(fu.tone.frequency, L.furnace.tone);
    lastT = ctx.currentTime;
    tick = setInterval(schedule = () => {                        // drops, crackles, syllables, the kettle's wobble
      const now = ctx.currentTime, dt = Math.min(.2, now - lastT); lastT = now;
      if (L.rain.on && L.rain.drops > 0) for (let i = poisson(L.rain.drops * dt); i > 0; i--) dropAt(now + Math.random() * dt);
      if (L.furnace.on && L.furnace.crackle > 0) for (let i = poisson(L.furnace.crackle * dt); i > 0; i--) crackleAt(now + Math.random() * dt);
      if (L.radio.on && Math.random() < L.radio.syllables * dt){ glide(rd.env.gain, Math.random() > L.radio.pauses ? .5 + Math.random() * .5 : 0, .06); glide(rd.band.frequency, L.radio.voice * (.75 + Math.random() * .5), .05); }
      if (L.kettle.on) glide(k.wob.gain, 1 - L.kettle.wobble * Math.random() * .8, .4);
      if (gl.level > .01){                                         // the conservatory: drops, drips, the wandering trickle, gusts
        if (Q.taps.on) for (let i = poisson(Q.taps.rate * dt); i > 0; i--) glassTap(now + .02 + Math.random() * dt);
        if (Q.drips.on) for (let i = poisson(Q.drips.rate * dt); i > 0; i--) glassDrip(now + .02 + Math.random() * dt);
        gl.wob += (Math.random() * 2 - 1) * .2 - gl.wob * .032;
        glide(gl.rBP.frequency, Math.max(120, Q.runs.center * Math.pow(2, gl.wob * Q.runs.wobble)), .3);
        glide(gl.rAM.gain, 1 - Q.runs.wobble * .25 * (1 + Math.sin(now * 1.7 + gl.wob)), .25);
        gl.gust += (Math.random() * 2 - 1) * .08 - gl.gust * .016;
        glide(gl.wAM.gain, Math.max(.15, 1 - Q.wash.flutter * (.5 + gl.gust)), 1);
      }
    }, 40);
  }
  function poisson(l){ let n = 0, p = Math.exp(-l), c = p; const u = Math.random(); while (u > c && n < 20){ n++; p *= l / n; c += p; } return n; }
  function burstTo(dest, t, kind, type, freq, q, attack, decay, gain){ const s = ctx.createBufferSource(); s.buffer = bufs[kind]; const f = F(type, freq, q), g = ctx.createGain(); s.onended = () => { s.disconnect(); f.disconnect(); g.disconnect(); }; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + attack + decay); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 3); s.stop(t + attack + decay + .05); }
  const dropAt = t => { const L = SOUND.layers.rain; burstTo(nodes.rain.drops, t, 'white', 'bandpass', L.dropPitch * (.6 + Math.random() * .8), 3, .002, L.dropDecay * (.6 + Math.random()), L.dropGain * (.3 + Math.random() * .7)); };
  function glassTap(t){
    const T = GLASS.taps, f = T.pitch * Math.pow(2, (Math.random() * 2 - 1) * T.spread), v = T.gain * 2 * (.35 + Math.random() * .65), dec = T.decay / 1000 * (.6 + Math.random() * .8);
    const s = ctx.createBufferSource(); s.buffer = bufs.white; const bp = F('bandpass', f, T.q), g = ctx.createGain(); s.onended = () => { s.disconnect(); bp.disconnect(); g.disconnect(); };
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .0015); g.gain.exponentialRampToValueAtTime(.0001, t + dec + .004);
    const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : G(1); if (pn.pan) pn.pan.value = (Math.random() * 2 - 1) * T.width;
    s.connect(bp); bp.connect(g); g.connect(pn); pn.connect(nodes.glass.inside); s.start(t, Math.random() * 3, dec + .05);
    if (T.ring > .001){ const o = ctx.createOscillator(), rg = ctx.createGain(); o.frequency.value = T.ringPitch * (.9 + Math.random() * .2); rg.gain.setValueAtTime(0, t); rg.gain.linearRampToValueAtTime(v * T.ring * .25, t + .002); rg.gain.exponentialRampToValueAtTime(.0001, t + .09 + dec * 2); o.connect(rg); rg.connect(pn); o.start(t); o.stop(t + .2 + dec * 2); }
  }
  function glassDrip(t){
    const D = GLASS.drips, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(D.pitch * 1.9, t); o.frequency.exponentialRampToValueAtTime(D.pitch, t + .035);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(D.gain, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .16);
    o.connect(g); g.connect(nodes.glass.inside); o.start(t); o.stop(t + .2);
  }
  /* held under the Forgotten picture: the chime rings out, then sags and slows in step with the count, and stops at zero */
  function forget(start, span){
    if (!on || !ctx) return 0;
    const Fg = FORGET, L = Fg.length, t0 = ctx.currentTime + .05, depth = .25 + Fg.drift * .6;
    const sag0 = t0 + Math.max(1.6 * L, start), sag1 = sag0 + Math.max(3, span + .6);
    [[220, 0], [330, .7 * L], [277, 1.4 * L]].forEach(([f, dt]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = F('lowpass', 2600 * Fg.brightness), s = t0 + dt, peak = Fg.gain * .7 * FORGET_TRIM;
      o.frequency.setValueAtTime(f * Fg.pitch, sag0); o.frequency.exponentialRampToValueAtTime(f * Fg.pitch * (1 - depth * .95), sag1);
      lp.frequency.setValueAtTime(2600 * Fg.brightness, sag0); lp.frequency.exponentialRampToValueAtTime(140, sag1);
      g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(peak, s + .25); g.gain.setValueAtTime(peak, sag0);
      g.gain.linearRampToValueAtTime(peak * .45, sag1 - .1); g.gain.exponentialRampToValueAtTime(.0001, sag1 + .12);   // the motor gives out
      o.connect(lp); lp.connect(g); g.connect(out); o.start(s); o.stop(sag1 + .3);
    });
    if (Fg.noise > .005){ const n = ctx.createBufferSource(); n.buffer = bufs.white; n.loop = true; const g = ctx.createGain(), lp = F('lowpass', 5000 * Fg.brightness); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Fg.noise * .12, t0 + .4); g.gain.setValueAtTime(Fg.noise * .12, sag1 - .3); g.gain.exponentialRampToValueAtTime(.0001, sag1 + .2); n.connect(lp); lp.connect(g); g.connect(out); n.start(t0); n.stop(sag1 + .3); }
    return sag1 - t0;
  }
  const crackleAt = t => burstTo(nodes.furnace.crack, t, 'white', 'bandpass', 900 + Math.random() * 2500, 2, .002, .03 + Math.random() * .05, .35 + Math.random() * .4);
  /* one short sound per thing you do */
  function tone(t, { type = 'sine', f0, f1 = f0, attack = .005, decay = .3, gain = .3, filter = 20000 }){
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = F('lowpass', filter); o.type = type; o.onended = () => { o.disconnect(); lp.disconnect(); g.disconnect(); };
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + decay * .9);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + attack + decay);
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + attack + decay + .05);
  }
  const burst = (t, o) => burstTo(out, t, o.kind || 'white', o.type || 'bandpass', o.freq || 2000, o.q || 1, o.attack || .003, o.decay || .08, o.gain || .3);
  const RECIPES = {
    bell: (t, p, l, b, v) => { [[0, 1], [.48, .8]].forEach(([dt, r]) => { tone(t + dt, { f0: 880 * p * r, decay: 1.4 * l, gain: v, filter: 6000 * b }); tone(t + dt, { type:'triangle', f0: 880 * p * r * 2.01, decay: .5 * l, gain: v * .25, filter: 7000 * b }); }); return 1.9 * l; },
    footstep: (t, p, l, b, v) => { [0, .42].forEach(dt => { burst(t + dt, { kind:'brown', type:'lowpass', freq: 380 * b, decay: .07 * l, gain: v * 2 }); burst(t + dt + .01, { type:'bandpass', freq: 1800 * p, q: 1.5, decay: .025 * l, gain: v * .25 }); }); return .6; },
    door: (t, p, l, b, v) => { const o = ctx.createOscillator(), g = ctx.createGain(), lp = F('lowpass', 900 * b), lfo = ctx.createOscillator(), lg = G(7 * p); o.type = 'sawtooth'; o.frequency.value = 92 * p; lfo.frequency.value = 11; lfo.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v * .35, t + .08); g.gain.exponentialRampToValueAtTime(.0001, t + .7 * l); o.connect(lp); lp.connect(g); g.connect(out); o.start(t); lfo.start(t); o.stop(t + .8 * l); lfo.stop(t + .8 * l); burst(t + .7 * l, { kind:'brown', type:'lowpass', freq: 220 * b, decay: .12, gain: v * 2 }); return .9 * l; },
    drip: (t, p, l, b, v) => { tone(t, { f0: 1500 * p, f1: 620 * p, decay: .14 * l, gain: v, filter: 8000 * b }); return .2; },
    kettle: (t, p, l, b, v) => { burst(t, { type:'bandpass', freq: 3200 * p, q: 4, decay: .012 * l, gain: v * 1.4 }); tone(t, { f0: 140 * p, decay: .05 * l, gain: v * .6 }); return .1; },
    radio: (t, p, l, b, v) => { for (let i = 0; i < 14; i++) burst(t + Math.random() * .35 * l, { type:'bandpass', freq: (1500 + Math.random() * 2500) * p, q: 2, decay: .015, gain: v * (.3 + Math.random() * .7) }); burst(t + .3 * l, { kind:'pink', type:'bandpass', freq: 1100 * p, q: 1.2, decay: .5 * l, gain: v * .5 * b }); return .9 * l; },
    furnace: (t, p, l, b, v) => { tone(t, { f0: 180 * p, decay: .6 * l, gain: v * .7, filter: 3000 * b }); tone(t, { f0: 427 * p, decay: .35 * l, gain: v * .4, filter: 3000 * b }); burst(t, { kind:'brown', type:'lowpass', freq: 300 * b, decay: .15 * l, gain: v * 1.5 }); return .7 * l; },
    page: (t, p, l, b, v) => { const s = ctx.createBufferSource(); s.buffer = bufs.white; const f = F('bandpass', 3500 * p, .8), g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v * .5, t + .08 * l); g.gain.exponentialRampToValueAtTime(.0001, t + .28 * l); f.frequency.setValueAtTime(1800 * p * b, t); f.frequency.exponentialRampToValueAtTime(5200 * p * b, t + .25 * l); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + .35 * l); return .35 * l; },
    ending: (t, p, l, b, v) => { [[220, 0], [330, .9], [277, 1.8]].forEach(([f, dt]) => tone(t + dt, { attack: .4, f0: f * p, decay: 3 * l, gain: v * .7, filter: 2500 * b })); return 1.8 + .4 + 3 * l; },
  };
  /* play a sound; returns how long it rings, in seconds (0 if it didn't play) */
  function play(k){ if (!on || !ctx || !SOUND.events[k] || !SOUND.events[k].on) return 0; const e = SOUND.events[k]; return RECIPES[k](ctx.currentTime + .02, e.pitch, e.length, e.brightness, e.gain); }
  function mix(target){
    if (!on || !ctx) return;
    const L = SOUND.layers, lv = (k, x) => L[k].on ? L[k].gain * x : 0;
    for (const k of ['rain','hum','kettle','radio','furnace']) glide(nodes[k].lvl.gain, lv(k, target[k] || 0), 1.2);
    if (target.walls) glide(nodes.rain.walls.frequency, target.walls, .8);
    nodes.glass.level = target.glass || 0;                       // matched by ear-meter to the rain outside (doorstep, garden)
    glide(nodes.glass.lvl.gain, nodes.glass.level * GLASS_TRIM, 1.2);
  }
  function roomNow(){
    if (!on || !ctx) return;
    const R = Object.assign({}, SOUND.rooms[S.room] || {});
    if (S.room === 'basement'){ if (!S.flags.radioOn) R.radio = 0; if (!S.flags.furnaceOpen) R.furnace = 0; }
    mix(R);
    clearInterval(drip); drip = null;
    if (S.room === 'bathroom') drip = setInterval(() => { if (Math.random() < .45) play('drip'); }, 2600);
    room = S.room;
  }
  function ending(id){
    if (!on || !ctx) return;
    clearInterval(drip); drip = null;
    const outside = ['walkaway','evening','gate','threadbare','bell'].includes(id);
    mix({ glass: id === 'overgrown' ? 1 : 0, rain: outside ? 1 : 0, walls: outside ? 9000 : 600, radio: id === 'argument' ? 1 : 0, furnace: id === 'furnace' ? 1 : 0, kettle: id === 'home' || id === 'why' ? 1 : 0, hum: 0 });
  }
  /* after you do something: the sound that goes with it */
  function after(verb, thing, from){
    if (!on || !ctx || S.ended) return;
    if (S.room !== from){ play(['open','climb'].includes(verb) ? 'door' : 'footstep'); if (verb === 'open' || verb === 'climb') setTimeout(() => play('footstep'), 700); return; }
    if (verb === 'ring' && thing === 'bell') return play('bell');
    if (thing === 'kettle') return play('kettle');
    if (thing === 'radio' && verb === 'flip') return play('radio');
    if (thing === 'furnace' && verb === 'open') return play('furnace');
    if ((thing === 'book' || thing === 'page') && (verb === 'read' || verb === 'look')) return play('page');
    if (verb === 'open' && ['fridge','window','trunk','hatch','shed'].includes(thing)) return play('door');
    if (verb === 'water' && S.flags.can) return play('drip');
  }
  function toggle(){
    on = !on;
    try {
      if (on){ if (!ctx) build(); else if (!tick) tick = setInterval(schedule, 40); ctx.resume(); glide(out.gain, SOUND.master, .8); if (S.ended) ending(S.ended); else roomNow(); }
      else if (ctx){ glide(out.gain, 0, .4); clearInterval(drip); drip = null; clearInterval(tick); tick = null; setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 800); }   // off means idle, not just silent
    } catch (e) { on = false; }
    try { localStorage.setItem('house-sound', on ? 'on' : 'off'); } catch (e) {}      // only once we know it worked
    btn();
  }
  const btn = () => { const b = $('snd'); b.textContent = on ? 'sound on' : 'sound off'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); };
  // browsers only let sound start from a click or key; if it was left on, it comes back with the first one
  const wake = () => { if (on && !ctx){ try { build(); ctx.resume(); glide(out.gain, SOUND.master, .8); roomNow(); } catch (e) {} } };
  document.addEventListener('pointerdown', wake, { once: true }); document.addEventListener('keydown', wake, { once: true });
  const level = () => { if (!meter) return 0; const d = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(d); let e = 0; for (const x of d) e += x * x; return Math.sqrt(e / d.length); };
  return { level, forget, room: roomNow, ending, after, play, toggle, btn, get on(){ return on && !!ctx; } };
})();
$('snd').addEventListener('click', e => { e.stopPropagation(); Sound.toggle(); cmdEl.focus(); });
Sound.btn();
