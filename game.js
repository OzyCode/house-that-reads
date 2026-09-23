/* ──────────────────────────────────────────────────────────────────────────
   game.js — the machinery

   State, the things you can carry, what happens when you act, the parser,
   the keyboard and the start of a run. Nothing in here is written for a
   particular room; it is what every room is played through.

   Uses:  render.js (through view.js), and the writing in house.js at run time.
   Rule:  May not contain any of the narrator's lines. Those live in house.js.
   ────────────────────────────────────────────────────────────────────────── */

/*  In this file:
      · the page itself
      · where everything is: state and the things you can carry
      · what the words mean: verbs and their aliases
      · the two registers: rooms and endings
      · carrying things
      · the core: counters, moving room, ending a run, saving
      · one action: what you clicked or typed, answered
      · the parser: words in, a verb and a thing out
      · the keyboard: Tab cycles verbs, up repeats, Ctrl+C starts over
      · starting, and starting over
 */

/* the page itself: the five elements everything else talks to */
const $ = id => document.getElementById(id);
const col = document.querySelector('.col');
const artEl = $('art'), log = $('log'), cmdEl = $('cmd'), introEl = $('intro'), galleryEl = $('gallery');

const HOME = { mat:'doorstep', frame:'wall', key:'wall', pen:'desk', cup:'table', box:'attic' };
const S = { room:'doorstep', flags:{}, rep:{}, obey:0, defy:0, tech:0, ended:null, found:[], view:null, loc:{...HOME}, trail:[], did:[] };

let matI = 0;                                         // the mat this run, fixed from the moment you arrive
function matLoad(){ let i = 0; try { i = parseInt(localStorage.getItem('house-mat') || '0', 10) || 0; } catch (e) {} matI = Math.max(0, Math.min(MAT_WORDS.length - 1, i)); }
function matWord(){ return MAT_WORDS[matI][0]; }
function matSays(){ return matI === MAT_WORDS.length - 1 ? 'nothing' : matWord(); }
function matStolen(){ try { localStorage.setItem('house-mat', String(Math.min(MAT_WORDS.length - 1, matI + 1))); } catch (e) {} }

const VERB_ALIASES = {
  open:['open','enter','go','walk','through','use','push','pull','try','step','unlock','up','down'],
  climb:['climb','climb out','climb through','jump out','get out','crawl'],
  wash:['wash','rinse'],
  fill:['fill','run'],
  look:['look','examine','inspect','check','see','x','l','stare','watch','study'],
  read:['read'],
  close:['close','shut'],
  wipe:['wipe','clean','scrub','rub'],
  ring:['ring','press','buzz'],
  knock:['knock','bang','tap','rap'],
  listen:['listen','hear'],
  take:['take','grab','pick','pickup','lift','steal','hold','carry','pocket'],
  leave:['leave','exit','walk away','go away','flee','quit','away','go home','go back','go out'],
  back:['back','turn back','turn around','step back','return'],
  flip:['flip','switch','toggle','turn','hit','off','on'],
  hang:['hang','put','place','throw','drop','burn'],
  wait:['wait','idle','z','sleep','hmm','um'],
  water:['water','feed','mist'],
  touch:['touch','feel','stroke','pat','poke'],
  stay:['stay','remain'],
  talk:['talk','say','hello','hi','hey','speak','ask','shout','yell','who','why','what','argue','join'],
  sit:['sit','rest','lie','lay'],
  stand:['stand','get up','stand up','rise'],
  drink:['drink','sip','pour'],
  write:['write','sign','scribble'],
  help:['help','?','commands'],
  again:['again','restart','start over','once more','reset'],
};
function normVerb(w){ for (const [v, al] of Object.entries(VERB_ALIASES)) if (al.includes(w)) return v; return null; }

const ENDINGS = {}; function ending(id, title, sub){ ENDINGS[id] = {title, sub}; }
const ROOMS = {};   function room(id, def){ ROOMS[id] = Object.assign({id}, def); }

const say = (t, k='n') => ({t, k});
/* what you did, echoed; the same thing again gets a count, so a repeat never looks like nothing happened */
let lastEcho = '', echoRep = 0;
const you = t => { const key = String(t).trim().toLowerCase(); echoRep = key === lastEcho ? echoRep + 1 : 1; lastEcho = key; return echoRep > 1 ? {t: `${t}   ×${echoRep}`, k:'y again'} : {t, k:'y'}; };
const sys = t => ({t, k:'sys'});
const annoyed = t => ({t, k:'n cross'});
const quiet = t => ({t, k:'n quiet'});
const pause = ms => ({k:'pause', ms});
const pick = a => a[Math.floor(Math.random()*a.length)];
const nth = (n, arr) => arr[Math.max(1, Math.min(n, arr.length)) - 1];

/* ───────────────────────── THINGS YOU CAN CARRY ─────────────────────────
   Every item is in exactly one place. Taking moves it to you; putting moves it from you.
   The picture draws each item wherever it is. */
const ITEMS = {
  mat:   { name:'the welcome mat',         short:'mat',     words:['mat','welcome','rug'] },
  frame: { name:'the picture of nothing',  short:'picture', words:['frame','picture','photo','photograph','painting'] },
  key:   { name:'the key',                 short:'key',     words:['key'] },
  pen:   { name:'the pen',                 short:'pen',     words:['pen','pencil'] },
  cup:   { name:'your cup',                short:'cup',     words:['cup','cups','mug','mugs'] },
  box:   { name:'a box marked just in case', short:'box', words:['box','boxes','cardboard'] },
};
const PLACE_ROOM = { attic:'attic', doorstep:'doorstep', wall:'hallway', hook:'hallway', furnace:'basement', table:'kitchen', kitchenfloor:'kitchen', desk:'study' };
const PLACE_SAYS = { attic:'up in the attic, with the others', doorstep:'on the doorstep', wall:'on the wall in the hall', hook:'on the coat hook in the hall', furnace:'in the furnace, downstairs', table:'on the kitchen table', kitchenfloor:'on the kitchen floor', desk:'on the desk in the study', player:'with you' };
const held = () => Object.keys(ITEMS).filter(k => S.loc[k] === 'player');
const on = place => Object.keys(ITEMS).filter(k => S.loc[k] === place);
const listNames = ks => ks.map(k => ITEMS[k].name).join(', ').replace(/, ([^,]*)$/, ' and $1');
function itemFromWords(w){ if (!w) return null; for (const [k, it] of Object.entries(ITEMS)) if (it.words.some(x => w.includes(x))) return k; return null; }
/* a click (or a bare verb) on a thing that is, or holds, an item */
function itemForThing(id){
  const r = S.room;
  if (r === 'doorstep' && id === 'mat') return 'mat';
  if (r === 'hallway' && id === 'frame') return S.loc.frame === 'wall' ? 'frame' : (S.loc.key === 'wall' ? 'key' : null);
  if (r === 'hallway' && id === 'hook') return on('hook')[0] || null;
  if (r === 'study' && id === 'pen') return 'pen';
  if (r === 'study' && id === 'desk') return on('desk').filter(k => k !== 'pen')[0] || null;
  if (r === 'kitchen' && id === 'cups') return 'cup';
  if (r === 'attic' && id === 'boxes') return 'box';
  if (r === 'kitchen' && id === 'mat') return 'mat';
  if (r === 'kitchen' && id === 'table') return on('table').filter(k => k !== 'cup')[0] || (S.loc.cup === 'table' ? 'cup' : null);
  return null;
}
function takeItem(k){
  const it = ITEMS[k], where = S.loc[k];
  if (where === 'player' && k === 'box') return [quiet("You've got one. The other two are the same box; I only wrote it three times.")];
  if (where === 'player') return k === 'cup' ? [quiet("You have yours. The other one's not yours.")] : [quiet(`You already have ${it.name}. It's in your hand. It's been in your hand.`)];
  if (PLACE_ROOM[where] !== S.room) return [say(`There's no ${it.short} here.`), quiet(`It's ${PLACE_SAYS[where]}. I know where everything is. It's most of what I do.`)];
  if (k === 'key' && where === 'wall' && S.loc.frame === 'wall') return [say("What key? There's a picture of nothing. Take *that*, if you must; it's the only thing on the wall."), quiet("…that I'm aware of.")];
  S.loc[k] = 'player'; render();
  const first = !S.flags['took_' + k]; S.flags['took_' + k] = true;
  if (where === 'furnace') return [say(`You reach into the furnace and find ${it.name}.`), quiet("Warm. Not burnt. Nothing down here burns; it just waits to be wanted again.")];
  if (!first) return [say(`You take ${it.name} back${where === 'hook' ? ' off the hook' : ''}.`), quiet("Of course you do.")];
  if (k === 'mat') { defy(); return [annoyed("You— you've picked up the welcome mat."), say("Fine. Bring it. It's yours now, apparently. We'll see how welcome you feel carrying it.")]; }
  if (k === 'frame') { defy(); return [say("It's yours. Honestly, take it. Somebody should have a picture of nothing on their wall who actually chose it."), ...(S.loc.key === 'wall' ? [quiet("…"), say("Behind it, on a nail, there's a key."), quiet("I'd forgotten that was there."), quiet("No. I hadn't.")] : [])]; }
  if (k === 'key') return [say("You take the key."), quiet("I'd have preferred you didn't.")];
  if (k === 'pen') return [say("You pick up the pen."), quiet("…"), quiet("Nobody's held that but me. It's lighter than you'd think. Everything is, once you're holding it.")];
  if (k === 'cup') return [say("You take a cup. The nearer one. Good. That's the one that was yours.")];
  if (k === 'box') return [say("You take the top box. It says *just in case* on the side, in my handwriting."), quiet("Well. You're the case, now. It's only right it goes with you.")];
  return [say(`You take ${it.name}.`)];
}
/* where an item goes if you put it down here (null: nowhere it belongs) */
function placeFor(k, w){
  switch (S.room){
    case 'doorstep': return k === 'mat' ? 'doorstep' : null;
    case 'attic':    return k === 'box' ? 'attic' : null;
    case 'hallway':  return (k === 'frame' && w && (w.includes('wall') || w.includes('back'))) ? 'wall' : (['mat','frame','key'].includes(k) ? 'hook' : null);
    case 'basement': return 'furnace';
    case 'kitchen':  return k === 'mat' ? 'kitchenfloor' : 'table';
    case 'study':    return 'desk';
    default: return null;
  }
}
function putItem(k, w){
  const it = ITEMS[k];
  if (S.loc[k] !== 'player') return [say(`You're not holding ${it.name}.`), quiet(`It's ${PLACE_SAYS[S.loc[k]]}.`)];
  const place = placeFor(k, w);
  if (!place) return [say(`There's nowhere in ${ROOMS[S.room].name} for ${it.name}.`), quiet("You keep it. It suits you, in a way.")];
  if (place === 'hook' && on('hook').length) return [say(`There's already ${ITEMS[on('hook')[0]].name} on the hook.`), quiet("It's a hook. It holds one thing. It's very clear about that.")];
  S.loc[k] = place; render();
  if (place === 'attic') return [say("You put the box back on the pile."), quiet("Just in case. It'll wait. They're good at that.")];
  if (place === 'doorstep') return [say("You put the welcome mat back where it was."), quiet("Thank you. It looked wrong without it. *I* looked wrong without it.")];
  if (place === 'wall') return [say("You hang the picture of nothing back on the wall."), quiet(S.loc.key === 'wall' ? "Over the key. Well. Now we both know it's there and we're both pretending. That's most of what a picture is for." : "It's crooked. It always was. Thank you.")];
  if (place === 'hook'){
    if (k === 'mat') { tech(); return [say("You've hung the welcome mat on the coat hook."), quiet("That is not a coat. Though it is, I'll admit, the first thing anyone has ever hung there. So."), quiet("Welcome.")]; }
    if (k === 'frame') { tech(); return [say("You've hung a picture of nothing on the coat hook."), quiet("The house has never looked more like itself.")]; }
    return [say("You hang the key on the hook."), quiet("Sensible. Keys on hooks. That's where keys go. That's where I should have put it, instead of behind a picture of nothing, like a— well.")];
  }
  if (place === 'furnace'){
    if (k === 'key') return [say("You put the key in the furnace."), quiet("It doesn't burn. Nothing does. It'll be in there, warm, with the other things people put down and meant to come back for."), quiet("You can still get it back. Everything in there can. That's the trouble with the furnace.")];
    return [say(`You put ${it.name} in the furnace.`), quiet("It doesn't burn. It gets warm and stays, the way everything down here does."), quiet("Deleted. Not gone. There's a difference, and it's the whole house.")];
  }
  if (place === 'kitchenfloor') { tech(); return [say("You put the welcome mat down. In the kitchen. By the chair."), quiet("…"), quiet("Yes. All right. Welcome. Here. Where it should have been all along; nobody wipes their feet on the way *in* to a kitchen, they've arrived by then.")]; }
  if (place === 'table' && k === 'box') return [say("You put the box on the kitchen table."), quiet("*Just in case*, next to the teacups. Yes. That's about right.")];
  if (place === 'table') return k === 'cup' ? [say("You put the cup back on the table. Good. That's where it goes; it's the one thing in here with a right place.")] : [say(`You put ${it.name} on the kitchen table.`), quiet("It looks odd there. Everything does, next to the cups. That's what cups are for.")];
  if (place === 'desk'){
    if (k === 'pen') return [say("You put the pen back on the desk."), quiet("…Thank you. I'd been holding my breath. Houses can, you know. It's called a draught.")];
    if (k === 'cup') return [say("You put the cup on the desk."), quiet("A cup, on the desk, in the room where I write. I've written a thousand cups onto desks and never once had one.")];
    return [say(`You put ${it.name} on the desk.`), quiet("It'll get written about now. Everything on that desk does.")];
  }
  return [say(`You put ${it.name} down.`)];
}

/* ───────────────────────── CORE ───────────────────────── */
function obey(){ S.obey++ } function defy(){ S.defy++ } function tech(){ S.tech++; S.obey++; S.flags.tech = true; }
function bump(key){ S.rep[key] = (S.rep[key] || 0) + 1; return S.rep[key]; }
const SEATS = ['seatK','seatS','seatL','seatSp','seatC','seatG'];
const seated = () => SEATS.some(k => S.flags[k]);
let clickLockUntil = 0;
function go(rid, pre=[], opts={}){
  if (S.room === 'conservatory' && rid !== 'conservatory' && S.flags.can){ S.flags.can = false; pre = [quiet("You put the watering can down by the door on your way. It seemed to want to stay."), ...pre]; }
  if (!opts.back && S.room !== rid) { S.trail.push(S.room); if (S.trail.length > 40) S.trail.shift(); }
  if (S.room !== rid || !S.did.length) S.did.push(['enter', ROOMS[rid].name]);
  S.room = rid; S.view = null; for (const k of SEATS) S.flags[k] = false;
  clickLockUntil = performance.now() + 320; hover = 0; lastEcho = "";
  render();
  const r = ROOMS[rid]; const intro = typeof r.intro === 'function' ? r.intro() : r.intro;
  return [...pre, ...intro];
}
const SPECIAL = {};
const NEVER_FORGET = [null,
  "I'll remember that. Remembering is the one thing I'm good at.",
  "Two. I'm keeping them both.",
  "Three. I've put it with the others.",
  "Four. Nothing in this house is ever thrown away.",
  "Five. I could tell you each one back, word for word.",
  "Six. Don't worry about me losing count. I don't lose things.",
  "Seven. I've never forgotten a guest. Not once.",
  "Eight. They're all still here, somewhere in the walls.",
  "Nine. You'd be surprised how much a house can hold.",
  "Ten. Half of you, I think. I'll keep the half.",
  "Eleven. I won't forget this one either.",
  "Twelve. Never. Not one of them.",
  "Thirteen. People ask me to forget things, now and then. I never have.",
  "Fourteen. I'm keeping all of you. Every way you went out.",
  "Fifteen. I will never forget you. I'd like that written down somewhere, and I'm the only somewhere there is.",
  "Sixteen. Never.",
  "Seventeen. Never, never.",
  "Eighteen. Never. I've stopped needing to say why.",
  "Nineteen. You could ask me to forget you, you know. I'd have to. It's the one thing I would never want to do.",
  "Twenty. There's one way out left, and it isn't a door. You'd have to ask me to forget you. Please don't.",
];
function end(id, lines, titleOverride){
  const isNew = ENDINGS[id] && id !== 'reset' && !S.found.includes(id);
  S.ended = id; if (isNew) { S.found.push(id); persist(); } render();
  if (id !== 'reset' && S.loc.mat === 'player') matStolen();     // gone with the mat: the next guest gets a new one
  // the house, more and more certain it will never forget you
  const k = S.found.length, vow = isNew && NEVER_FORGET[k] ? [pause(700), quiet(NEVER_FORGET[k])] : [];
  return [{k:'dark'}, ...lines, ...vow, {k:'ending', id, title: titleOverride}];
}
function persist(){ try{ localStorage.setItem('house-found', JSON.stringify(S.found)) }catch(e){} }
function restore(){ try{ const f = JSON.parse(localStorage.getItem('house-found')||'[]'); if (Array.isArray(f)) S.found = f.filter(x => ENDINGS[x]) }catch(e){} }

function defaultVerb(id){ const th = ROOMS[S.room].things[id]; if (!th) return 'look'; let v = th.verbs ? th.verbs[0] : 'look'; if (id === 'right' && !S.flags.rightDoor) v = 'look'; if (id === 'frame' && S.loc.frame !== 'wall') v = 'take'; if (id === 'hook' && on('hook').length) v = 'take'; return v; }
let lastClick = 0, walkedAt = null;
artEl.addEventListener('click', e => {
  if (S.ended) return;
  const now = performance.now();
  if (now < clickLockUntil || now - lastClick < 110) return;
  // still hammering the spot that just took you through a door: that was for the last room, not this one
  if (walkedAt && now - walkedAt.t < 700 && Math.hypot(e.clientX - walkedAt.x, e.clientY - walkedAt.y) < 60){ walkedAt.t = now; return; }   // keeps holding until they pause
  lastClick = now;
  const o = cellAt(e); if (!o) return;
  S.words = [];
  const id = frame.objects[o], th = ROOMS[S.room].things[id]; if (!th) return;
  const v = defaultVerb(id), from = S.room;
  act(v, id, v + ' ' + th.label.replace(/^the /,''));
  if (S.room !== from) walkedAt = { x: e.clientX, y: e.clientY, t: now };
});

function spamGuard(verb, thingId, lines, from, n){
  if (S.ended || S.room !== from || !lines.length || verb === 'help') return lines;
  if (lines.some(l => l && ['dark','ending','blink','clear'].includes(l.k))) return lines;
  const rec = (S.spamRec || (S.spamRec = {}))[verb + ':' + (thingId || '')] || (S.spamRec[verb + ':' + (thingId || '')] = { sig: null, k: 0 });
  const sig = JSON.stringify(lines.map(l => l && l.t));
  if (sig !== rec.sig){ rec.sig = sig; rec.k = 0; return lines; }                 // something new to say: say it
  rec.k++;
  const th = thingId ? ROOMS[S.room].things[thingId] : null;
  const c = { n, label: th ? th.label : (verb === 'look' ? ROOMS[S.room].name : 'that'), past: VERB_PAST[verb] || verb };
  if (verb === 'look' && !th) c.past = 'looked round';
  if (SPAM_MILESTONES[n]) return SPAM_MILESTONES[n](c);
  if (rec.k <= SPAM_LADDER.length) return SPAM_LADDER[rec.k - 1](c);
  if (n > 100) return [n % 25 === 0 ? quiet(`${n}.`) : quiet("…")];
  return SPAM_AFTER[(rec.k - SPAM_LADDER.length - 1) % SPAM_AFTER.length](c);
}
function act(verb, thingId, echo, br){
  if (S.ended) return;
  openingDone();
  interrupt(); clearMoment();
  const r = ROOMS[S.room];
  if (!br) br = (verb === 'wait' || verb === 'stay') && S.room === 'conservatory' ? [] : breakSilence();
  const out = [you(echo), ...br];
  const th = thingId ? r.things[thingId] : null;
  const prevView = S.view;
  S.view = (verb === 'look' && thingId) ? thingId : (thingId && thingId === prevView ? prevView : null);   // acting on what you're looking at keeps you close; changing rooms resets it anyway
  if (S.view !== prevView) render();
  const n = bump(verb + ':' + thingId);
  S.did.push([verb, th ? th.label : '']);
  const from = S.room;
  const finish = () => { const head = 1 + br.length; push([...out.slice(0, head), ...spamGuard(verb, thingId, out.slice(head), from, n)]); Sound.after(verb, thingId, from); };

  /* back: out of a close-up, then out of the chair, then out of the room you came in by */
  if (verb === 'back'){
    if (prevView) out.push(quiet("You step back."));
    else if (seated()) { for (const k of SEATS) S.flags[k] = false; render(); out.push(say("You stand up.")); }
    else if (S.trail.length) { const prev = S.trail.pop(); out.push(...go(prev, [quiet(`Back to ${ROOMS[prev].name}.`)], { back:true })); }
    else out.push(quiet("Behind you is the street. That's not back, that's leaving. Say so, if you mean it."));
    return finish();
  }
  if (verb === 'stand'){ const was = seated(); for (const k of SEATS) S.flags[k] = false; render(); out.push(was ? say("You stand up.") : say("You are standing. You've been standing. It's most of what you do.")); return finish(); }
  if (verb === 'help'){ out.push(...helpLines()); return finish(); }
  if (verb === 'noway'){ out.push(say(`There's no ${S.words[0]} from ${r.name}.`), quiet("Not that I've built, anyway.")); return finish(); }
  if (verb === 'open' && !thingId && r.ambiguousDoors){ out.push(say(r.ambiguousDoors)); return finish(); }

  /* anything you can carry goes through the inventory, whatever the room */
  if (verb === 'take'){
    const k = itemFromWords(S.words) || (thingId ? itemForThing(thingId) : null);
    if (k) { out.push(...takeItem(k)); return finish(); }
  }
  if (verb === 'hang'){
    const k = itemFromWords(S.words) || (held().length === 1 ? held()[0] : null);
    if (k) { out.push(...putItem(k, S.words)); return finish(); }
    if (held().length > 1) { out.push(say(`Put down which? You're holding ${listNames(held())}.`)); return finish(); }
  }

  if (th && typeof th[verb] === 'function') out.push(...th[verb](n));
  else if (th && verb === 'climb' && typeof th.open === 'function') out.push(...th.open(bump('open:' + thingId)));
  else if (th && r.onVerb[verb] && ['write','drink'].includes(verb)) out.push(...r.onVerb[verb](bump(verb + ':')));
  else if (th) out.push(...refuse(verb, th, n));
  else if (verb === 'look') out.push(say(`${cap(r.name)}.`), quiet('There is ' + Object.values(r.things).filter(t => !t.hidden).map(t => t.label).join(', ') + '.'));
  else if (r.onVerb[verb]) out.push(...r.onVerb[verb](bump(verb + ':')));
  else if (verb === 'hang') out.push(say("You've nothing to put down."));
  else if (verb === 'take') out.push(say("Take what?"), quiet("Name it. I'll tell you if it's the sort of thing that comes with you."));
  else out.push(say(pick(FALLBACK)));
  finish();
}
function refuse(verb, th, n){
  if (n > 1) return [quiet(nth(n - 1, LOOK_AGAIN))];
  const m = { take:`You can't take ${th.label}. It's load-bearing. Emotionally.`, open:`${cap(th.label)} doesn't open. It's not that kind of thing.`, wipe:`You wipe your feet on ${th.label}. Nothing is cleaner. Something is worse.`, ring:`You press ${th.label}. It does not ring. It was never going to.`, flip:`You try to switch ${th.label}. It stays ${th.label}.`, hang:`You hang nothing on ${th.label}. It holds it perfectly.`, sit:`You sit on ${th.label}. I'm not going to narrate that. I'm going to wait.`, leave:`You can't leave through ${th.label}. Believe me, people have tried.`, knock:`You knock on ${th.label}. It's not the sort of thing that answers.`, listen:`You listen to ${th.label}. It has nothing to say. It's ${th.label}.`, read:`There's nothing written on ${th.label}. Not yet.`, close:`${cap(th.label)} isn't open. It hasn't got an open.`, climb:`You can't climb ${th.label}. I've seen you try worse, but no.`, wash:`You wash ${th.label}. It's no cleaner. It's a bit confused.`, fill:`You can't fill ${th.label}. It hasn't got an inside for it.`, drink:`You can't drink ${th.label}. You could try. I'd rather narrate almost anything else.`, touch:`You touch ${th.label}. It's exactly as solid as I said it was.`, stay:`You stay by ${th.label}. Staying is something you do in a chair, not next to ${th.label}.`, talk:`You talk to ${th.label}. It doesn't answer. I do, but I'm not ${th.label}.`, water:`You'd water ${th.label}, if you had anything to water it with. It doesn't need it. It isn't growing. Things in this house don't, mostly.`, write:`You can't write on ${th.label}. Well. You can. I'd have to read it.` };
  return [say(m[verb] || `You ${verb} ${th.label}. The house notices. The house declines to comment.`)];
}
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);

/* parser */
const GENERIC = new Set(['door','out','back']);
function matchThing(words){
  const r = ROOMS[S.room], keys = KEYS[S.room] || {};
  let best = null, bestScore = 0;
  for (const [id, ks] of Object.entries(keys)){
    if (!r.things[id]) continue;
    const score = ks.reduce((a, k) => a + (words.includes(k) ? (GENERIC.has(k) ? 1 : 2) : 0), 0);
    if (score > bestScore){ best = id; bestScore = score; }
  }
  return best;
}
function parse(txt){
  const w = txt.toLowerCase().replace(/[^a-z? ]/g,' ').split(/\s+/).filter(Boolean); S.words = w;
  if (!w.length) return null;
  const joined = w.join(' ');
  let verb = null, rest = w.slice(1);
  for (const [v, al] of Object.entries(VERB_ALIASES)) for (const a of al) if (a.includes(' ') && joined.startsWith(a)) { verb = v; rest = joined.slice(a.length).trim().split(' ').filter(Boolean); }
  if (!verb) verb = normVerb(w[0]);
  if (verb === 'water' && S.room !== 'conservatory' && w.length === 1){ const t = matchThing(w); if (t) return {verb:'look', thing:t}; }
  if (!verb){ const t = matchThing(w); return t ? {verb:'look', thing:t} : {verb:null, thing:null}; }

  if (verb==='write') return {verb, thing:null};
  let thing = matchThing(rest);
  const T = ROOMS[S.room].things;
  if (!thing && verb==='wipe' && T.mat) thing='mat';
  if (!thing && verb==='ring' && T.bell) thing='bell';
  if (!thing && verb==='flip'){ if (T.sw) thing='sw'; else if (T.radio) thing='radio'; else if (T.kettle) thing='kettle'; else if (T.lamp) thing='lamp'; }
  if (!thing && verb==='hang' && T.hook) thing='hook';
  if (!thing && verb==='hang' && T.furnace) thing='furnace';
  if (!thing && verb==='leave' && T.street) thing='street';
  if (!thing && (verb==='read' || verb==='close') && T.book) thing='book';
  if (!thing && verb==='read' && T.page) thing='page';
  if (verb==='open' && (w[0]==='up' || w[0]==='down') && !rest.length){
    const ways = { basement:{ up:'door' }, spare:{ up:'hatch' }, attic:{ down:'hatch' }, library:{ down:'door' }, kitchen:{ down:'stairs' } };
    const t = (ways[S.room] || {})[w[0]]; return t ? {verb, thing:t} : {verb:'noway', thing:null};
  }
  if (!thing && verb==='open' && w[0]==='up' && S.room==='basement') thing='door';
  if (!thing && verb==='open' && w[0]==='up' && T.hatch && S.room==='spare') thing='hatch';
  if (!thing && verb==='open' && w[0]==='down' && T.hatch && S.room==='attic') thing='hatch';
  if (!thing && verb==='climb'){ if (T.window && S.room==='kitchen') thing='window'; else if (T.hatch) thing='hatch'; else if (T.stairs) thing='stairs'; else if (T.window && S.room==='garden') thing='window'; }
  if (!thing && verb==='wash' && T.sink) thing='sink';
  if (!thing && verb==='fill' && T.bath) thing='bath';
  if (!thing && verb==='open' && !ROOMS[S.room].ambiguousDoors){ if (T.door) thing='door'; else if (T.left) thing='left'; }
  if (!thing && verb==='knock'){ if (T.door) thing='door'; else if (T.right && S.flags.rightDoor) thing='right'; else if (T.pipes) thing='pipes'; }
  if (!thing && rest.includes('door') && !ROOMS[S.room].ambiguousDoors){ if (T.door) thing='door'; else if (T.left) thing='left'; }
  if (!thing && verb==='sit' && T.chair) thing='chair';
  if (!thing && verb==='take' && T.pen && rest.length === 0) thing=null;
  return {verb, thing};
}

let tab = null;   // { noun, thing, verbs, i }
function vocab(){
  const T = ROOMS[S.room].things, K = KEYS[S.room] || {};
  const verbs = ['open','look','take','wipe','ring','knock','listen','read','close','hang','turn','leave','wait','help','sit','stay','write','drink'].concat(Object.values(VERB_ALIASES).flat().filter(v => !v.includes(' ') && v.length > 2));
  const nouns = Object.entries(K).filter(([id]) => T[id]).flatMap(([,ks]) => ks);
  return { verbs, nouns };
}
function tabCycle(){
  const raw = cmdEl.value.trim(), w = raw.toLowerCase().split(/\s+/).filter(Boolean);
  if (tab && raw === tab.last){ tab.i = (tab.i + 1) % tab.verbs.length; cmdEl.value = tab.last = tab.verbs[tab.i] + ' ' + tab.noun; return; }
  tab = null; if (!w.length) return;
  const { verbs, nouns } = vocab();
  // a noun (possibly partial), or verb+noun → cycle that thing's verbs in its own order
  const nounWord = w.length === 1 ? nouns.find(n => n.startsWith(w[0])) : (w.length === 2 && normVerb(w[0]) ? nouns.find(n => n === w[1] || n.startsWith(w[1])) : null);
  if (nounWord){
    const id = matchThing([nounWord]); const th = ROOMS[S.room].things[id]; if (!th) return;
    const list = (th.verbs || ['look']).slice(); const first = defaultVerb(id);
    if (list[0] !== first){ list.splice(list.indexOf(first), 1); list.unshift(first); }
    let i = 0; if (w.length === 2){ const cur = normVerb(w[0]); const at = list.indexOf(cur); i = at >= 0 ? (at + 1) % list.length : 0; }
    tab = { noun: nounWord, verbs: list, i, last: list[i] + ' ' + nounWord }; cmdEl.value = tab.last; return;
  }
  // partial verb → complete it
  if (w.length === 1){ const m = verbs.find(x => x.startsWith(w[0]) && x !== w[0]); if (m) cmdEl.value = m + ' '; }
}
cmdEl.addEventListener('keydown', e => {
  if (e.key === 'c' && e.ctrlKey){ e.preventDefault(); restart([sys('^C')]); return; }
  if (e.key === 'Escape'){ cmdEl.value = ''; hi = -1; tab = null; return; }
  if (e.key === 'Tab'){ e.preventDefault(); tabCycle(); return; }
  if (e.key === 'ArrowUp'){ e.preventDefault(); if (!hist.length) return; if (hi === -1) draft = cmdEl.value; hi = Math.min(hi + 1, hist.length - 1); cmdEl.value = hist[hist.length - 1 - hi]; return; }
  if (e.key === 'ArrowDown'){ e.preventDefault(); if (hi === -1) return; hi--; cmdEl.value = hi === -1 ? draft : hist[hist.length - 1 - hi]; return; }
  tab = null;
});
$('form').addEventListener('submit', e => {
  e.preventDefault();
  if (overlaid()) return;                                        // the intro or the gallery is up; the game is behind it
  const txt = cmdEl.value.trim();
  if (!txt && draining){ skipLine = true; return; }               // enter skips the line being spoken
  cmdEl.value=''; hi = -1; tab = null;
  if (S.ended){ if (/^forget me\.?$/i.test(txt) && S.ended !== 'reset'){ interrupt(); clearMoment(); push([you(txt), ...forgetMe()]); return; }
    if (/^(endings|gallery|all endings|show endings|g)$/i.test(txt)){ openGallery(); return; } if (/^(intro|how to play|instructions|controls)$/i.test(txt)){ showIntro(null); return; } if (!draining) restart(); else skipLine = true; return; }
  if (!txt) return;
  openingDone();
  const br = /^(wait|z|idle|sleep|hmm|um|stay|remain)\b/i.test(txt) && S.room === 'conservatory' ? [] : breakSilence();
  if (hist[hist.length - 1] !== txt){ hist.push(txt); if (hist.length > 200) hist.shift(); }
  if (/^(endings|gallery|all endings|show endings)$/i.test(txt)){ openGallery(); return; }
  if (/^(intro|how to play|instructions|controls)$/i.test(txt)){ showIntro(null); return; }
  if (/^(hint|hints|clue|a hint|give me a hint|stuck|i'?m stuck)$/i.test(txt)){ interrupt(); clearMoment(); push([you(txt), ...hint()]); return; }
  if (/^forget me\.?$/i.test(txt)){ interrupt(); clearMoment(); push([you(txt), ...forgetMe()]); return; }
  const q = askQuestion(txt);
  if (q){ interrupt(); clearMoment(); push([you(txt), ...q]); return; }
  const p = parse(txt);
  if (p && p.verb === 'again'){ restart(); return; }
  if (p && p.verb === 'write'){ S.flags.line = txt.replace(/^\s*(write|sign|scribble)\s*/i, ''); act('write', null, txt, br); return; }
  if (!p || !p.verb){ interrupt(); clearMoment(); push([you(txt), ...br, say(pick(FALLBACK))]); return; }
  act(p.verb, p.thing, txt, br);
});

function restart(prefix = []){
  interrupt(); clearMoment(); stopEndingScene(); lastEcho = ''; echoRep = 0; col.classList.remove('blink'); quietReset();
  { let f = false; try { f = !localStorage.getItem('house-seen'); } catch (e) {} if (f && !prefersReduced()) darkFirst(); }
  col.classList.remove('dark'); fit();
  matLoad();
  Object.assign(S, {room:'doorstep', flags:{}, rep:{}, spamRec:{}, obey:0, defy:0, tech:0, ended:null, view:null, loc:{...HOME}, trail:[], did:[]});
  ROOMS.hallway.things.right.label = 'the wall on the right';
  let fresh = false; try { fresh = !localStorage.getItem('house-seen'); } catch (e) {}
  const slow = fresh && !prefersReduced();
  const open = () => {
    const intro = go('doorstep'); S.trail = [];
    push(slow ? [...prefix, ...openingLines(intro)] : [...prefix, ...intro]);
  };
  if (fresh) showIntro(open); else open();     // forgotten, or never here before: the whole evening from the top
}

/* first time here: the front matter, and the house waits until you knock */
let knock = null;
function showIntro(then){
  knock = then || null; introEl.hidden = false; introEl.classList.remove('go');
  requestAnimationFrame(() => $('iknock').focus());
}
function closeIntro(){
  if (introEl.hidden) return;
  try { localStorage.setItem('house-seen', '1'); } catch (e) {}
  introEl.classList.add('go');
  const go = knock; knock = null;
  setTimeout(() => { introEl.hidden = true; introEl.classList.remove('go'); cmdEl.focus(); if (go) go(); }, prefersReduced() ? 0 : 1100);
}
$('iknock').addEventListener('click', closeIntro);
introEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape'){ e.preventDefault(); closeIntro(); } });

function start(data){
  restore(); matLoad();
  if (data && data.S){ col.classList.remove('opening'); Object.assign(S, data.S); S.loc = S.loc || {...HOME}; S.trail = S.trail || []; if (S.flags.rightDoor) ROOMS.hallway.things.right.label = 'the door on the right'; render(); push([sys('(the house was renovated while you stood there. carry on.)')]); }
  else {
    let first = true; try { first = !localStorage.getItem('house-seen'); } catch (e) {}
    const slow = first && !prefersReduced();
    if (slow) darkFirst();                                   // before the title screen even fades: nothing of the house shows early
    const open = () => { const intro = go('doorstep'); S.trail = []; push(slow ? openingLines(intro) : [sys('click on what you see, or type what you do. type help if you get stuck.'), ...intro]); };
    if (first) showIntro(open); else open();
  }
  cmdEl.focus();
}
