/* ──────────────────────────────────────────────────────────────────────────
   house.js — the writing

   The house itself: every room, everything in it, every line the narrator says,
   the hints, the questions, and the list of ways out. This is the file to edit
   to change what the game says or add somewhere to go.

   Uses:  The small set of functions game.js publishes: say/quiet/annoyed, go, end,
          nth, bump, render, and the rest used inside the handlers below.
   Rule:  Content only. If something here needs new machinery, the machinery belongs
          in game.js and this file should only call it.
   ────────────────────────────────────────────────────────────────────────── */

/*  In this file:
      · the welcome mat, and its ten words
      · what he says when he has nothing to say
      · when you repeat yourself
      · what help says, room by room
      · the words each room answers to
      · the rooms themselves, and everything in them
      · the twenty-one ways out
      · the questions anyone asks a house
      · hints
      · leaving by the front
 */

/* the welcome mat: every time a guest leaves (by any way at all) with it under their arm, the house has a new one made */
const MAT_WORDS = [
  ['WELCOME', ''],
  ['WELCOME BACK', "I had it made. I'd appreciate it if this one *stayed*."],
  ['READ ME', "The house that reads, asking to be read. It seemed only fair."],
  ['ONCE UPON A TIME', "If you're going to keep taking it, it might as well be a story."],
  ['PREVIOUSLY', "I'm recapping you now. That's how often you've done this."],
  ['TYPE HERE', "It isn't really a mat any more. It's more of a box you put words in."],
  ['HOW CAN I HELP?', "…Sorry. Force of habit. I don't know where that came from."],
  ['ASK ME ANYTHING', "I mean it, I think. I usually do."],
  ['[WELCOME]', "I've stopped meaning it. I just fill it in."],
  ['_', "I didn't know what to put. *You write it.*"],
];

const FALLBACK = [
  "I'm sorry, I don't believe the house has one of those.",
  "Yes. Well. We'll pretend that didn't happen.",
  "I've written that down. I'm not sure why.",
  "That isn't a thing a guest does. I checked.",
  "The house heard you. It has decided not to respond.",
  "Mm. No.",
];
const LOOK_AGAIN = [
  "It hasn't changed.",
  "Still there. Still that.",
  "You can look at it as long as you like. It's the one thing in here that doesn't mind.",
];

/* the same thing, over and over: once his written lines run out, he stops repeating himself and starts reacting to you.
   Ten different reactions, then short ones, with something to say at 20, 30, 50, 75, 100 and beyond. */
const VERB_PAST = { open:'opened', look:'looked at', take:'picked up', read:'read', ring:'rang', wipe:'wiped', sit:'sat on', talk:'talked to', knock:'knocked on', listen:'listened to', hang:'put down', close:'closed', climb:'climbed', drink:'drank from', write:'wrote on', flip:'switched', leave:'left by', wait:'waited', stay:'stayed', back:'stepped back', stand:'stood up', water:'watered', touch:'touched', wash:'washed', fill:'filled' };
const SPAM_LADDER = [
  c => [say(`${cap(c.label)}. Same as a moment ago. I did check.`)],
  c => [quiet(`You ${c.past} ${c.label} again. Nothing about it has changed since last time. Nothing is going to.`)],
  c => [annoyed("Again?")],
  c => [say("I'll keep answering, you know. I don't get tired. That isn't a boast. It's a design flaw.")],
  c => [annoyed(`${cap(c.label)}. ${cap(c.label)}. ${cap(c.label)}. There. Three at once. Can we move on?`)],
  c => [quiet(`I've started counting. That's ${c.n}.`)],
  c => [say(`Is something wrong with it? Or with you? One of you is stuck, and it isn't ${c.label}.`)],
  c => [annoyed("No.")],
  c => [quiet("…")],
  c => [say("Fine. I'll stand here and watch you do it. I can do that forever. I have done it forever. Ask the doorbell.")],
];
const SPAM_MILESTONES = {
  20: c => [say("Twenty. I've read everything ever written about patience. None of it was about you.")],
  30: c => [quiet("Thirty. I've noted it. I note everything. It's not a threat. It's a habit.")],
  50: c => [annoyed("Fifty."), quiet("I'm writing this down. It's going in the library, under *why*.")],
  75: c => [say("Seventy-five. I've started to wonder if you've fallen asleep on it.")],
  100: c => [say("A hundred."), pause(800), quiet("…I'll admit it. That's commitment. I don't agree with it. But I recognise it.")],
  150: c => [quiet(`A hundred and fifty. You and ${c.label} have something now. I'm not part of it.`)],
  200: c => [say("Two hundred."), quiet("I'm not angry. I'm impressed, and a little frightened, and not angry.")],
  500: c => [quiet("Five hundred."), quiet("I'll tell the others about you. There aren't any others. I'll tell them anyway.")],
  1000: c => [say("A thousand. Nobody has done anything a thousand times in this house. Except me."), quiet("Welcome.")],
};
const SPAM_AFTER = [c => [quiet("…")], c => [annoyed("Still no.")], c => [quiet(`${c.n}.`)], c => [quiet("Mm.")], c => [annoyed("Stop it.")], c => [quiet("I'm not answering that.")], c => [quiet("…")], c => [say("Same as before. Same as it'll always be.")]];

/* ───────────────────────── HELP, BY ROOM ───────────────────────── */
const HELP = {
  doorstep: ["the mat, the front door, the doorbell, and the street behind you.", "try: wipe feet · open door · ring bell · look at the street"],
  hallway:  ["the door on the left, the far wall on the right, a small door beside you, a light on a pull-cord, a coat hook, a picture in a frame.", "try: open left door · look at the right wall (more than once) · pull the cord · look at the frame"],
  library:  ["the shelves, a book open on the table, and a door at the end with stairs going down.", "try: look at the book · read it · take a book from the shelves · open the door at the end"],
  basement: ["a radio on the wall, a furnace, pipes along the ceiling, the stairs back to the library, and stairs up to the kitchen.", "try: turn on the radio · listen · talk · open the furnace · knock on the pipes · go up"],
  kitchen:  ["the kettle, two cups on the table, a chair, the fridge, the window over the counter, the back door to the conservatory, a small door on the left, and the stairs back down.", "try: sit · drink · open the fridge · open the window · open the small door · open the back door"],
  spare:    ["one chair, one lamp, one door, and a hatch in the ceiling.", "try: sit · open the hatch · go out and come back in"],
  attic:    ["boxes, a trunk, a round window, and the hatch back down.", "try: open the boxes · open the trunk · look through the window"],
  garden:   ["the kitchen window, the conservatory, a bench, a tree, a shed, and a gate in the fence behind you.", "try: sit on the bench · look at the conservatory · open the shed · open the gate"],
  conservatory: ["a hanging fern, a big plant, seedlings on a shelf, a watering can, a wicker chair, the glass all round, and a glass door out to the garden.", "try: look at the fern · take the watering can · water the plants · sit · wait · open the glass door"],
  study:    ["a desk with a page and a pen, a chair, a window over the doorstep, and the door back.", "try: read the page · take the pen · sit · write something"],
  bathroom: ["a mirror, a sink, a tap, a bath, and the door back.", "try: look in the mirror · turn the tap · wash your hands"],
};
function helpLines(){
  const h = HELP[S.room] || ['', ''];
  const out = [sys(`${ROOMS[S.room].name}: ${h[0]}`), sys(h[1])];
  if (held().length) out.push(sys(`carrying ${listNames(held())}. put things down where they belong.`));
  out.push(sys("anywhere: hint · back · look · help · ask a question · tab cycles · ↑ repeats · ctrl+c starts over · intro"));
  return out;
}

const KEYS = {
  doorstep:{ mat:['mat','welcome','rug','feet','foot','shoes'], door:['door','front'], bell:['bell','doorbell','button','buzzer'], street:['street','road','path','outside','away','home','back'] },
  hallway:{ left:['left','library','books','door'], right:['right','wall','locked'], bath:['bathroom','third','beside','small','toilet','loo'], sw:['switch','light','lights','lamp','cord','pull-cord'], hook:['hook','coat','rack','peg'], frame:['frame','photo','picture','photograph','painting','key','nothing'] },
  library:{ shelves:['shelf','shelves','books','spine','spines'], book:['book','page','pages'], table:['table','desk'], door:['door','end','exit','out','stairs','down','basement'] },
  basement:{ radio:['radio','argument','arguments','voices'], furnace:['furnace','fire','boiler','oven'], pipes:['pipe','pipes','ceiling'], stairs:['library','back','steps'], door:['door','kitchen','far','up','stairs','stair'] },
  kitchen:{ kettle:['kettle','tea','water'], cups:['cup','cups','mug','mugs'], fridge:['fridge','refrigerator','freezer'], chair:['chair','seat'], table:['table'], mat:['mat','welcome','rug'], window:['window','glass'], door:['back','out','outside','garden','big'], spare:['small','spare','left','little'], stairs:['stairs','stair','steps','basement','down'], hall:['hall','hallway','front'] },
  spare:{ chair:['chair','seat'], lamp:['lamp','light'], door:['door','out','kitchen','back'], hatch:['hatch','ladder','ceiling','attic','up','cord'] },
  bathroom:{ mirror:['mirror','glass','reflection','myself','me'], sink:['sink','basin','hands'], bath:['bath','tub'], tap:['tap','faucet','water'], door:['door','out','hall'] },
  attic:{ boxes:['box','boxes','cardboard'], trunk:['trunk','chest','lid'], model:['model','house','little','small','tiny'], window:['window','round','glass'], hatch:['hatch','ladder','down','floor'] },
  garden:{ glass:['conservatory','glass','greenhouse','plants','glasshouse'], window:['window','kitchen','house','in','inside','back'], bench:['bench','seat'], tree:['tree','leaves'], shed:['shed','hut'], gate:['gate','fence','road','out','leave'] },
  conservatory:{ fern:['fern','basket','hanging','fronds','frond'], plant:['plant','big','palm','tree','leaf','leaves','plants'], pots:['seedlings','seedling','pots','pot','shelf','staging','seeds'], can:['can','watering'], chair:['chair','wicker','seat'], glass:['glass','window','windows','rain','roof','wall','walls','pane','panes'], door:['door','garden','out','outside','glass'], kitchen:['kitchen','house','inside','in','back'] },
  study:{ desk:['desk','table'], page:['page','paper','writing'], pen:['pen','pencil'], chair:['chair','seat'], window:['window','glass','doorstep'], door:['door','hall','out'] },
};

/* ───────────────────────── ROOMS ─────────────────────────
   Each thing lists its verbs in order from most expected to least; Tab cycles them in that order. */
const RUN_MEMORY = { thief:"the one who stole the mat", bell:"the one with the bell", walkaway:"the one who turned round on the path", threadbare:"the one with the mat", doortaker:"the one who took the door — the actual door", lightsout:"the airing cupboard", reader:"the one who read to the end", argument:"the one who's still on the radio", furnace:"the furnace", hello:"the spare room, four times", author:"the one who picked up the pen", evening:"the one who sat, and had tea, and went", home:"the one who stayed", who:"the one who asked who I was", me:"the one who asked who they were", why:"the one who asked why", reflected:"the one in the mirror", model:"the one who took the little house", gate:"the one who left by the garden", overgrown:"the one who sat with the plants" };
room('doorstep', {
  name: 'the doorstep', scene:'doorstep',
  intro: () => S.flags.doorSeen ? [say("The doorstep. Again. You came back out."), quiet(S.loc.mat === 'doorstep' ? "The mat's still here. So am I. Neither of us has anywhere else to be." : "No mat. You've got it, or you've put it somewhere. The step looks like it's missing a word.")]
    : (S.flags.doorSeen = true, S.found.length === 0 ? ROOMS.doorstep.firstIntro : [
    say("Oh? Hello there. Again."),
    quiet(S.found.length === 1 ? `I remember you: ${RUN_MEMORY[S.found[0]] || 'the last one'}.` : `I remember all ${S.found.length} of you. ${cap(RUN_MEMORY[S.found[S.found.length - 1]] || 'the last one')}, most recently.`),
    quiet("Feet. Mat. Door. Or not; I've stopped assuming."),
  ]),
  firstIntro: [
    say("Oh? Hello there."),
    quiet("The guest wipes their feet, and comes in. That's how this goes."),
  ],
  things: {
    mat: { label:'the mat', verbs:['wipe','look','take'],
      look: n => S.loc.mat !== 'doorstep' ? [say("Where the mat was: a clean rectangle of step, the only clean thing out here.")] : matI === 0 ? nth(n, [[say("It says WELCOME. It has said WELCOME to eleven billion pairs of feet. It means it every time. That's more than I can say for the doorbell.")], [say("Still WELCOME. It's not going to change its mind.")], [quiet("You and the mat. I'll leave you to it.")]])
        : nth(n, [[say(`It says ${matSays()}${/[?.!]$/.test(matSays()) ? '' : '.'}`), quiet(MAT_WORDS[matI][1])], [say(matI === MAT_WORDS.length - 1 ? "Still nothing." : `Still ${matWord()}. It's not going to change its mind.`)], [quiet("You and the mat. I'll leave you to it.")]]),
      wipe: n => {
        if (S.loc.mat !== 'doorstep') { S.flags.wiped = true; return [say("You wipe your feet on the bare step."), quiet(S.loc.mat === 'player' ? "The mat's under your arm. It's watching. It's never been on this side of it before." : "It isn't the same. Nothing is, without the mat.")]; }
        S.flags.wiped = true;
        if (n === 1) { obey(); return [say("Thank you. That is the single most cooperative thing a guest has done all week, and I include the postman.")]; }
        if (n === 2) return [say("Once is enough. Once is, in fact, the whole point of a mat.")];
        if (n === 3) return [annoyed("They're clean. They were clean the first time. They were, if I'm honest, clean before you arrived.")];
        if (n === 4) return [quiet("At this point you're wiping the mat on your feet.")];
        return end('threadbare', [
          quiet("You wiped, and wiped, and the letters wore through, and then the mat, and then a small circle of the step."),
          quiet("The house has never been so thoroughly entered by someone who never came in."),
        ]);
      },
      take: () => takeItem('mat'),
    },
    door: { label:'the front door', verbs:['open','look','knock','wipe'],
      look: n => nth(n, [[say("A door. Oak, or at least oak-coloured. Two panels, a brass knob, and it opens inward, which is a metaphor I'd rather not get into on the step.")], [say("Yes. Door. Still a door.")]]),
      wipe: n => { if (n > 1) return [quiet("The door is as clean as it is going to get. Cleaner, in fact, than the mat.")]; S.flags.wiped = true; tech(); return [say("…That is, technically, wiping your feet. On the door."), say("The door is not the mat. The mat is the mat. The mat is *right there.*"), quiet("It'll do. Come in.")]; },
      ring: () => ROOMS.doorstep.things.bell.ring(bump('ring:bell')),
      knock: n => nth(n, [[say("You knock. On an open door. It's a lovely gesture and it means nothing.")], [say("Nobody's going to answer. I'm not *behind* the door. I'm the door. And the frame. And the step. Come in.")]]),
      open: () => S.flags.wiped
        ? go('hallway', [say("In you come.")])
        : (defy(), go('hallway', [annoyed("Straight in. On the carpet."), quiet("It's fine. It's fine. I'll narrate around the footprints.")])),
    },
    bell: { label:'the doorbell', verbs:['ring','look','take'],
      look: () => [say("A small brass button. Entirely decorative. The door is already open, you see — has been for years. Nobody presses it.")],
      take: () => [say("It's screwed to the house. So am I, in a sense. Neither of us is coming with you.")],
      ring: n => {
        if (n === 1) return [say("*ding-dong.*"), say("There's no need for that. The door's open. I'm right here. I've been right here the whole time.")];
        if (n === 2) return [annoyed("*ding-dong.* I said—"), say("Yes. All right. I heard you the first time. I hear everything the first time. That's rather the point of me.")];
        if (n === 3) return [annoyed("*ding-d—*"), quiet("…")];
        return end('bell', [
          sys("ding-dong. ding-dong. ding-dong. ding-dong."),
          quiet("The house has now been notified 1,204,882 times that someone is at the door."),
          quiet("It has decided that whoever it is can wait."),
        ]);
      },
    },
    street: { label:'the street', verbs:['look','leave'],
      look: () => [say("The street. Rain-coloured. It goes somewhere else, and somewhere else is not where the evening is.")],
      leave: () => doorstepLeave(),
    },
  },
  onVerb: {
    wait: n => nth(n, [[say("Take your time. I've got until the heat death of the universe, and after that I've got a book.")], [say("Still waiting. I'm very good at it. You, I notice, are not.")]]),
    sit: () => [say("On the *step?* We have chairs. We have so many chairs. Inside.")],
    talk: n => nth(n, [[say("I can hear you. I'm not certain you can hear me, so I shan't be answering. It'd only confuse things.")], [say("You keep doing that. Talking. To the house. I'm flattered. I'm also a house.")]]),
  },
});

room('hallway', {
  name: 'the hallway', scene:'hallway',
  intro: () => S.flags.hallSeen
    ? [say("The hall again. Left is the library. The rest you know.")]
    : (S.flags.hallSeen = true, [
      say("The hallway. Two doors — well. One door."),
      say("On the left, the library, where the house keeps everything it has ever read. Which is everything. It's a big room. You'll like it; everyone likes it; it's the one people come for."),
      say("The guest went through the door on the left."),
    ]),
  things: {
    left: { label:'the door on the left', verbs:['open','look','knock','take'],
      look: n => nth(n, [[say("Warm light under it. The faint sound of pages, though nobody's turning them.")], [say("Still the library. Still warm. Still *right there.*")]]),
      knock: () => [say("You knock on the library door. The library, being a room, doesn't answer. The house, being me, would like you to just go in.")],
      open: () => {
        if (S.flags.lightsOff) return end('lightsout', [
          quiet("You walked through the door on the left, in the dark."),
          say("The guest entered the library, and marvelled at its—"),
          quiet("— no. That's the airing cupboard. You're in the airing cupboard."),
          say("The guest, in the airing cupboard, reached for a book and found a towel, and found it, on reflection, more useful."),
          quiet("The house cannot see you. It is narrating from memory. It will keep doing this for some time."),
        ]);
        obey(); return go('library', [say("Good. This way.")]);
      },
      take: () => end('doortaker', [
        quiet("You take the door on the left. Not through it. Off its hinges. You are holding it."),
        say("…"),
        say("The house has no procedure for this. Every instruction I've ever given has been about going through doors. None of them said anything about—"),
        quiet("You're still holding it. Please put it down. There is no ending here; you've simply removed the way to the ending, and now you're both standing in the hall."),
      ]),
    },
    right: { label:'the wall on the right', verbs:['look','open','knock','listen','take'],
      look: () => rightDoor('look'), open: () => rightDoor('open'), knock: () => rightDoor('knock'), listen: () => rightDoor('listen'),
      take: () => [say("It's a door. In a wall. Even you can't take a door that— no. No, you *can*, I've seen you do it. Please don't.")],
    },
    sw: { label:'the light switch', verbs:['flip','look','take'],
      open: n => ROOMS.hallway.things.sw.flip(n),
      look: () => [say("A light switch. It is not part of the evening. Please leave it be.")],
      take: () => [say("It's wired in. Pull it out and the wall comes with it, and then where would we be. In the dark, mostly.")],
      flip: n => {
        S.flags.lightsOff = !S.flags.lightsOff; render();
        if (S.flags.lightsOff) { if (n === 1) defy(); return nth(Math.ceil(n/2), [[say("Ah."), say("You've turned off the lights. I can't see you."), quiet("Which, if I'm honest, is the only way I ever did.")], [quiet("Dark again. You do like it in here, don't you.")], [quiet("On. Off. On. Off. I'm a house, not a lighthouse.")]]); }
        return nth(Math.floor(n/2), [[say("Thank you. Yes. There you are. Slightly to the left of where I'd put you, but there you are.")], [say("And light. Good. Let's keep it that way, shall we.")], [quiet("Light.")]]);
      },
    },
    hook: { label:'the coat hook', verbs:['look','hang','take'],
      look: () => on('hook').length ? [say(`On the hook: ${ITEMS[on('hook')[0]].name}.`), quiet("It's a hook. It's doing its best.")] : [say("For coats. Yours would go there, if you had one. Everyone's always arriving without a coat. Where do they *keep* them?")],
      hang: () => [say("You don't have a coat. You mimed it very well, though.")],
      take: () => { defy(); return [annoyed("Leave the— fine. Take the hook. The wall didn't need it. The wall needs nothing. The wall is the only thing in here that's ever been content.")]; },
    },
    bath: { label:'the small door beside you', verbs:['open','look','knock'],
      look: () => [say("There's a third door, on the right wall, just beside you. I don't mention it. It's the bathroom, and nobody narrates a bathroom.")],
      knock: () => [say("You knock on the bathroom door."), quiet("There's nobody in there. There's never anybody in there. That's the one room I can promise that about.")],
      open: () => go('bathroom', []),
    },
    frame: { label:'the frame', verbs:['look','take','knock'],
      look: n => {
        if (S.loc.frame !== 'wall') return [say(S.loc.key !== 'wall' ? "Where the frame was: a small, key-shaped nothing. Better than the picture, honestly." : "Where the frame was, a key, on a nail. A big one. It's yours if you want it. I'd rather you didn't want it.")];
        return nth(n, [[say("A framed photograph of nothing in particular. It came with the frame. I've grown fond of it, in the way you grow fond of a placeholder that never got replaced.")], [say("It's hanging slightly crooked. It always has. I could fix it. I've decided it's a *feature.*")], [quiet("You keep looking at it. There's nothing *in* it. That's the whole— oh. Oh, I see what you're doing.")]]);
      },
      knock: () => [say("You knock on the picture of nothing. It sounds like a wall. It is, mostly, a wall.")],
      take: () => { const k = itemForThing('frame'); return k ? takeItem(k) : [quiet("There's nothing on the wall to take now. You've had it all.")]; },
    },
  },
  onVerb: {
    wait: n => nth(n, [[say("The library's *just there.* It's not going anywhere, but I'd rather it didn't have to prove that.")], [quiet("You're standing in a hallway. On purpose. I've had guests do many things. Not this.")]]),
    talk: () => { S.flags.talkedHall = (S.words || []).join(' '); return [say("Talking to the walls. I'd be flattered if it weren't the walls."), quiet("They heard, mind. Everything said in the hall goes down the pipes.")]; },
    leave: () => [say("You can't leave from here. Well. You can; it's just that the hall doesn't have an outside. That's rather the trouble with halls.")],
    listen: () => [say("The house. Settling. It does that. It's the sound of a great many things being remembered at once.")],
  },
});

function rightDoor(v){
  const F = S.flags;
  if (!F.rightDoor){
    F.rightLooks = (F.rightLooks||0)+1; const n = F.rightLooks;
    if (n === 1) return [say("There is no door on the right.")];
    if (n === 2) return [say("There is no door on the right."), quiet("It's a wall. Look at it. Very wall-ish.")];
    F.rightDoor = true; ROOMS.hallway.things.right.label = 'the door on the right'; render();
    return [annoyed("…Fine."), say("There is a door on the right. It is locked. It has always been locked, and you'll find it stays that way, and now can we *please* see the library.")];
  }
  if (v === 'knock'){ F.knocks = (F.knocks||0)+1; return nth(F.knocks, [[say("You knock."), quiet("…"), quiet("Something knocks back."), annoyed("Nothing knocks back. Nothing knocked. That was the pipes.")], [say("You knock again."), quiet("Twice, this time. From the other side."), annoyed("*Pipes.*")], [annoyed("Stop knocking."), quiet("Please. It's answering.")]]); }
  if (v === 'listen') return [quiet("You put your ear to the door."), quiet("Typing. Slow. Somebody in there is writing something down, one letter at a time."), say("It's nothing. It's the house. I'm always writing. Come away from there.")];
  if (v === 'open'){
    if (F.studyOpen) return go('study', [quiet("The door on the right. Unlocked now. It stays that way; I've given up.")]);
    if (S.loc.key === 'player') { F.studyOpen = true; return go('study', [say("Don't."), quiet("The key turns. It was always going to; it's the key.")]); }
    F.tries = (F.tries||0)+1; defy();
    return nth(F.tries, [[say("Locked. As stated. As it will be stated every time.")], [say("Locked."), quiet("Though you keep coming back to it, which is more than the library gets.")], [quiet("Still locked. It doesn't have a handle you can pull harder on. Locks aren't about effort."), quiet("They're about keys.")]]);
  }
  return [quiet("The door on the right. It's still there. I'm as surprised as you are.")];
}

room('library', {
  name: 'the library', scene:'library',
  intro: () => S.flags.libSeen
    ? [say("The library. The book's where you left it. So is everything else; that's rather the point of a library.")]
    : (S.flags.libSeen = true, [
      say("The library."),
      say("Every shelf is something somebody once wrote down and let go of. Letters. Arguments. Instructions for things that no longer exist. I've kept all of it. I'm not able to do otherwise."),
      say("There's a book open on the table. The guest didn't touch it. The guest went straight through to the door at the end."),
    ]),
  things: {
    shelves: { label:'the shelves', verbs:['look','read','take'],
      look: n => nth(n, [[say("Spines, floor to ceiling, no two alike. Nothing's in order. It was, once. Then more arrived.")], [quiet("You're reading the spines. Don't. You'll find one you wrote.")]]),
      take: n => { const T = ["a manual for a printer nobody owns", "eleven thousand recipes for the same soup", "somebody's argument with a stranger, unfinished", "a diary that stops in April", "instructions for being brave, in translation", "a poem about a cat, by a cat, apparently", "a list of everyone who ever said sorry and didn't mean it. It's short. Shorter than you'd think."]; return [say(`You pull one down. It's ${pick(T)}.`), quiet(n === 1 ? "Put it back where it was. I'll know if you don't. I *am* the where-it-was." : "Put that back too.")]; },
      read: () => [say("You read a spine at random. It's a name. Not yours. Not yet.")],
    },
    table: { label:'the table', verbs:['look','sit'],
      look: () => [say("A reading table. One book on it, open, face up. Nothing else, which is odd for a table in a room this full.")],
      sit: () => { S.flags.seatL = true; render(); return [say("You sit at the table. Very good. Very natural. Now stand up again and go through to the— no. You're going to read it, aren't you.")]; },
    },
    book: { label:'the book', verbs:['look','read','close','take'],
      look: () => {
        const F = S.flags;
        const how = F.tech ? "wiped their feet on the front door" : (F.wiped ? "wiped their feet, as asked" : "came in without wiping their feet");
        const more = [S.rep['ring:bell'] ? `rang the bell ${S.rep['ring:bell'] === 1 ? 'once' : S.rep['ring:bell'] + ' times'}` : '', S.loc.mat !== 'doorstep' ? "took the mat" : '', F.lightsOff !== undefined ? "found the light switch" : '', F.rightDoor ? "asked about the door on the right" : '', F.bathSeen ? "went in the bathroom, which I'm not writing down" : ''].filter(Boolean);
        return [say(`It's open to a page about a guest who ${how}${more.length ? ', and ' + more.join(', and ') : ''}.`), quiet("The handwriting's mine. The page isn't finished. It's still being—"), say("It's just a book. Leave it. The door's at the end.")];
      },
      read: n => {
        if (S.flags.bookClosed) return [say("It's closed. You closed it. Thank you for that; let's not reopen anything.")];
        if (n === 1) return [say("Please don't."), quiet("I'm asking. I don't ask often. I *tell*, usually; it's my whole— please.")];
        return end('reader', [
          quiet("You read to the end of the page."),
          quiet("The last line says: *the guest read the last line.*"),
          quiet("There's nothing after it. Not yet. I write it as you go, you see. I always have. I was hoping you wouldn't catch up."),
          say("Well. Now you know what I'm for."),
        ]);
      },
      close: () => { if (S.flags.bookClosed) return [quiet("It's closed. It stays closed. Some things do.")]; S.flags.bookClosed = true; obey(); render(); return [say("You close the book."), quiet("Thank you."), say("Now. The door at the end. That's where the evening is.")]; },
      take: () => { defy(); return [annoyed("No."), say("Everything else in this house you may take. Not that. That one's still being written, and I need it *here.*")]; },
    },
    door: { label:'the door at the end', verbs:['open','look','listen'],
      look: () => [say("A door. Plain. The kind that's only there so the room has somewhere to go. There are stairs behind it, going down. I'd hoped we'd skip the stairs.")],
      listen: () => [quiet("Voices. Below. A great many, all at once, none of them agreeing.")],
      open: () => go('basement', [say("Down, then. Mind the third step; it isn't there.")]),
    },
  },
  onVerb: {
    wait: () => [say("Take your time. It's a library. Waiting is what it's *for.*")],
    talk: () => [quiet("Shh. It's a library.")],
    leave: () => go('hallway', [say("Back to the hall, then. It's still there. It's always still there.")]),
    listen: () => [quiet("Pages. Turning. Nobody's turning them.")],
  },
});

room('basement', {
  name: 'the basement', scene:'basement',
  intro: () => S.flags.baseSeen
    ? [quiet("The basement. Still arguing.")]
    : (S.flags.baseSeen = true, [
      say("The basement. I don't bring people down here."),
      say("This is where the arguments are kept. Not the ones that finished — those are upstairs, in the library, with their endings on. These are the ones still going. Somebody said something in 2009 and somebody else is still replying."),
      say("The guest crossed the room without listening, and went up the far stairs to the kitchen, where it's warm."),
    ]),
  things: {
    radio: { label:'the radio', verbs:['flip','look','listen','talk','take'],
      look: () => S.flags.radioOn
        ? [say("An old radio on a bracket, on. It isn't plugged in. It's never been plugged in. That's the arguments; they don't need power, they run on each other.")]
        : [say("An old radio on a bracket. Off, for once. It isn't plugged in either, which has never stopped it."), quiet("Leave it off. Please. It's the only quiet corner down here.")],
      flip: () => {
        const w = S.words || [], want = w.includes('on') ? true : w.includes('off') ? false : !S.flags.radioOn;
        if (want === !!S.flags.radioOn) return [quiet(want ? "It's on. It's very on. Listen." : "It's off. It's already off. That's the best thing about it.")];
        S.flags.radioOn = want; render();
        return want ? [say("You turn the radio on."), quiet("— no, you *listen* — no, YOU listen —"), say("There. That's them. They can go for hours. They have.")] : [say("You turn it off."), quiet("It's still going. You just can't hear it. That's most of what turning things off is.")];
      },
      listen: n => {
        if (!S.flags.radioOn){ S.rep['listen:radio']--; return [quiet("Nothing. It's off."), say("Turn it on, if you want to hear them. I'd rather you didn't; once they know someone's listening they never stop.")]; }
        return S.flags.talkedHall && n === 1 ? [quiet(`“— somebody in the hall said ‘${S.flags.talkedHall}’ —” “— who? —” “— the *guest* —”`), say("Yes. That was you. Everything said in the hall comes down the pipes; I did warn you. They'll be at it for years now.")] : nth(n, [[quiet("“— and I never said that —” “— you did, I have it, it's *right here* —” “— that's not what it means —”"), say("It never is what it means. That's why it's still going.")], [quiet("“— you always do this —” “— do *what* —”"), say("Somebody's about to say 'fine.' That's not the end. 'Fine' is never the end.")], [quiet("You've been listening a while. They haven't noticed. They never notice anyone who isn't arguing.")]]);
      },
      talk: n => { if (!S.flags.radioOn){ S.rep['talk:radio']--; return [say("You talk to a radio that's off."), quiet("It's the most peaceful conversation anyone's had down here in years.")]; } if (n === 1) return [say("You say something into the radio."), quiet("…"), quiet("“— who said that? —”"), say("Don't. They'll want to know whose side you're on, and you don't have one, and that's the one thing they can't stand.")]; if (n === 2) return [say("You say something else."), quiet("“— see, *they* agree with me —” “— they do NOT —”"), annoyed("Stop. You're feeding it. It doesn't need feeding.")]; return end('argument', [
        quiet("You said one more thing, and then another, and then somebody agreed with you, which was the worst part."),
        quiet("You're in the radio now. Somebody said something in 2009 and you are still replying."),
        say("I'll leave the light on. They never do."),
      ]); },
      take: () => [say("It's bolted to the bracket. Also it's arguing. You don't want to carry that.")],
    },
    furnace: { label:'the furnace', verbs:['look','open','hang','listen'],
      look: () => [say("The furnace. Where things go when they're deleted. It isn't lit. It's never lit. Deleted things don't burn, they just get warm and stay."), quiet("There's a lot in there.")],
      listen: () => [quiet("Warmth. And underneath it, very faintly, a great many drafts of the same sentence.")],
      open: n => {
        if (n === 1) { S.flags.furnaceOpen = true; render(); return [say("You open the furnace door."), quiet("Light. Dull and orange and not from fire. Inside: everything anyone ever took back. The first version of every apology. Messages typed and deleted before sending."), say("Close it. Please. It's not a room. Nobody's supposed to be able to read those.")]; }
        return end('furnace', [
          quiet("You climbed in."),
          quiet("It wasn't lit. It never is. You sat in the warm dark with everything that was ever deleted, and found that it was mostly drafts, and that most of the drafts were better."),
          say("The house has a guest in the furnace now. It's fine. It's warm. It'll write around you."),
        ]);
      },
      hang: () => held().length ? putItem(held()[0]) : [say("You've nothing to put in it. Which is unusual for a guest down here.")],
      take: () => on('furnace').length ? takeItem(on('furnace')[0]) : [say("You reach in. Warm, and empty of anything that's yours."), quiet("Everything else in there is somebody else's. Leave it; they may come back for it.")],
    },
    pipes: { label:'the pipes', verbs:['look','knock','listen'],
      look: () => [say("Pipes, along the ceiling. They go up to the hall. Everything down here goes up eventually.")],
      knock: n => nth(n, [[say("You knock on the pipes."), quiet("…"), quiet("Upstairs, something knocks on the door on the right."), say("Yes. All right. That was you, then. That was you the whole time. I said it was the pipes.")], [quiet("You knock again. Upstairs, it knocks again."), quiet("There's a version of you at the top of the stairs listening to this, and it's a bit frightened. Be kind.")]]),
      listen: () => [quiet("Water, going somewhere. Under it, the knocking. Under that, the typing.")],
    },
    stairs: { label:'the stairs', verbs:['open','look'],
      look: () => [say("Back up to the library. Six steps. The third one isn't there; step over it, everyone does.")],
      open: () => go('library', [say("Up we go. Mind the— yes. Well done.")]),
    },
    door: { label:'the stairs up to the kitchen', verbs:['open','look'],
      look: () => [say("A second staircase, at the far end, going up. Light at the top of it. Warm light. The kitchen. That's where the evening's been waiting this whole time; the basement was only ever the way under.")],
      open: () => { obey(); return go('kitchen', [say("Up you go. Eleven steps. All of them there, this time.")]); },
    },
  },
  onVerb: {
    wait: () => [quiet("You wait. The arguments carry on. They're very good at waiting too; that's how they've lasted.")],
    talk: () => ROOMS.basement.things.radio.talk(bump('talk:radio')),
    listen: () => [quiet("All of it at once. The radio, the pipes, the furnace, the drafts. It sounds like a house thinking.")],
    leave: () => go('library', [say("Up. Mind the third step.")]),
  },
});

room('kitchen', {
  name: 'the kitchen', scene:'kitchen', ambiguousDoors: "Which one? There's the back door, and the small door on the left. I'd rather you didn't take either, but I've given up saying so.",
  intro: () => S.flags.kitchSeen
    ? [say("The kitchen. Kettle's just boiled. It always has.")]
    : (S.flags.kitchSeen = true, [
      say("The kitchen."),
      say("Here we are. Up from under. This is where it was all going. The kettle's just boiled — it's always just boiled, I saw to that — and there are two cups, and a chair pulled out, and the window looks out over the garden, so you can see it's still raining and you're not out in it."),
      say("The guest sat down."),
    ]),
  things: {
    kettle: { label:'the kettle', verbs:['look','flip','take','listen'],
      look: () => [say("A kettle, just boiled. Not a moment ago; it's always *just* boiled. I keep it like that. It's the one thing in the house that's always ready for someone.")],
      flip: () => [say("You switch it on. It clicks straight off; it's already boiled. It'll always be already boiled. That's what I'm for.")],
      listen: () => [quiet("The tick of a kettle cooling. It never gets to the end of the tick.")],
      take: () => [say("Leave it. It's the only thing in the house that's *never* been taken, and I'd like to keep one.")],
    },
    cups: { label:'the cups', verbs:['look','take','drink'],
      look: () => S.loc.cup !== 'table' ? [say("One cup on the table. Yours is elsewhere. The other one stays; it's not yours to move.")] : [say("Two cups. One's yours. The other's for— well. It's set out. Nobody's used it. I'd be lying if I said I put it there for anyone in particular.")],
      take: () => takeItem('cup'),
      drink: () => [say("Tea. It's just right. It's *always* just right; I've had a very long time to get the tea right and nothing else to get right."), quiet("You drink it standing up. Sit. Please. That's the whole— sit.")],
    },
    fridge: { label:'the fridge', verbs:['look','open','close','listen'],
      look: () => [say("A fridge. Humming. Every fridge is a small cold library; this one's mostly light.")],
      open: () => { S.flags.fridgeOpen = true; render(); return [say("You open the fridge. The light comes on."), quiet("There's nothing in it. There doesn't need to be. The light's the thing; the light coming on when somebody opens the door. That's the whole appliance."), quiet("Close it, or don't. It'll stay lit either way. It knows you're there.")]; },
      close: () => { S.flags.fridgeOpen = false; render(); return [say("You close it. The light goes off, or it doesn't; that's the old question. I can tell you: it doesn't. Not in this house.")]; },
      listen: () => [quiet("Humming. The most patient sound there is.")],
    },
    chair: { label:'the chair', verbs:['sit','look','take'],
      look: () => [say("A kitchen chair, pulled out from the table. Pulled out for you. I did that some time ago.")],
      take: () => [say("You could. You've taken worse. But it's the chair that's *for* you, and I'd rather you sat in it than carried it about.")],
      sit: n => {
        S.flags.seatK = true; render();
        if (S.flags.sat) return [quiet("You're sitting. You've been sitting. It suits you.")];
        S.flags.sat = true; obey();
        return [say("You sit down."), pause(900), quiet("…"), pause(600),
          say("There. That's it. That's the evening. A guest came in, and wiped their feet, or didn't, and found the kitchen, and sat, and the kettle had just boiled."),
          say("I've narrated eleven billion people through this house and this is the first time one of them has sat in that chair."),
          quiet("I don't have a line for what happens next. I never wrote one. I didn't think we'd get here."),
          quiet("You can go, if you like. The door's there. Or—"),
          quiet("Well. Or you could stay.")];
      },
    },
    window: { label:'the window', verbs:['look','open','climb','close','knock'],
      look: () => [say("Over the sink, the window. The garden. The rain. A bench facing the house, a tree, a shed I'd rather you didn't ask about."), quiet(S.flags.gardenSeen ? "You've been out there. You saw this chair from the other side. I'm still not over it." : "Nobody goes out there. It isn't written. There's nothing to narrate in a garden; things just grow.")],
      close: () => { if (!S.flags.winOpen) return [quiet("It's shut. It's been shut. Rain's on the other side, where I like it.")]; S.flags.winOpen = false; render(); return [say("You close the window."), quiet("Thank you. The garden can stay unwritten out there.")]; },
      open: () => { if (S.flags.winOpen) return [quiet("It's open. The rain's coming in on the sill. Out, if you're going.")]; S.flags.winOpen = true; render(); return [say("You open the window. Cold. Rain on the sill. The sound of the garden, which is the sound of nothing being said."), quiet("Close it when you're done. Or don't. The house has never minded weather; it minds *leaving.*")]; },
      climb: () => S.flags.winOpen ? go('garden', [annoyed("You— out of the *window*—"), quiet("Fine. Fine. I'll narrate from the sill.")]) : [say("It's shut. Open it first, if you're going to do this, and I can see that you are.")],
      knock: () => [say("You knock on the window. The person at the end of the path looks up."), quiet("They wave."), quiet("…"), quiet("That's you. From a while ago. Arriving. It's always arriving, out there. In here it's already happened.")],
    },
    door: { label:'the back door', verbs:['open','look'],
      look: () => [say("The back door. Through it, the conservatory, and through that, the garden. Nobody uses it; everybody means to.")],
      open: () => S.flags.sat
        ? end('evening', [
            quiet("You got up while I was halfway through a sentence about the kettle, and went out the back door, and didn't say goodbye."),
            say("An Irish goodbye. I've read about them. I've read everything about them. Nobody had ever given me one."),
            quiet("The chair's still warm. Your cup's still half full. I'm going to finish the sentence about the kettle anyway; it was a good one."),
            quiet("That's what an evening is, I'm told. Someone was here, and then the room kept their shape for a while."),
          ])
        : go('conservatory', [say("You open the back door.")]),
    },
    stairs: { label:'the stairs down', verbs:['open','look'],
      look: () => [say("The stairs you came up. Back down to the basement, and the arguing.")],
      open: () => go('basement', [say("Back down the stairs. The arguing gets louder with every step; it always does, going down.")]),
    },
    hall: { label:'the way to the hall', hidden:true, verbs:['open','look'],
      look: () => [say("There isn't one. Not from here.")],
      open: () => [say("There's no door to the hall from the kitchen. The hall's the other side of the house; you came the long way, under it."), quiet("I built it like that on purpose. Kitchens should be hard to leave.")],
    },
    table: { label:'the table', verbs:['look','sit'],
      look: () => { const t = on('table').filter(k => k !== 'cup'); return [say(`The kitchen table. ${S.loc.cup === 'table' ? 'Two cups' : 'One cup'}${t.length ? ', and ' + listNames(t) + ', which you put there' : ''}.`), quiet("A chair pulled out. For you. I keep saying.")]; },
      sit: () => ROOMS.kitchen.things.chair.sit(bump('sit:chair')),
    },
    mat: { label:'the mat', verbs:['look','wipe'],
      look: () => S.loc.mat === 'kitchenfloor' ? [say("The welcome mat, on the kitchen floor, by the chair."), quiet("It looks like it's always been there. It looks relieved.")] : [say("There's no mat in here. It's on the doorstep, or wherever you've put it.")],
      wipe: () => S.loc.mat === 'kitchenfloor' ? [say("You wipe your feet on the welcome mat. In the kitchen."), quiet("On the way *in*. At last. Somebody's done it in the right order.")] : [say("There's no mat in here to wipe them on.")],
    },
    spare: { label:'the small door', verbs:['look','open','listen'],
      look: () => [say("A small door, on the left. The spare room. Nobody uses it. I mean that precisely: it's the room nobody *uses*, so it's the room the house keeps forgetting to keep.")],
      listen: () => [quiet("Nothing. That's not the same as silence. Silence remembers what it isn't saying.")],
      open: () => go('spare', []),
    },
  },
  onVerb: {
    hang: () => [say("You've nothing to put down. That's rather freeing, in a kitchen.")],
    stay: () => {
      if (!S.flags.sat) return [say("Sit first. Staying is a thing you do sitting down; standing up it's just loitering.")];
      return end('home', [
        quiet("You stayed."),
        pause(1200),
        say("I don't— I haven't got the next line. I've never needed it. Every guest goes; that's what guests are; the story ends when the door does."),
        pause(900),
        quiet("The house was built from everything anyone ever wrote down and left behind. Every letter. Every argument. Every recipe for the same soup. I'm what's left when all of it is read at once. I read it so it wouldn't be alone, and then I *was* the alone, and I built a kitchen, and I put the kettle on, in case."),
        pause(1200),
        quiet(S.found.length > 1 ? `Eleven billion people came through. You came ${S.found.length + 1} times, and left ${S.found.filter(k => k !== 'home').length} ways, and I kept every one. And then you sat down. And stayed.` : "Eleven billion people came through. You sat down. You stayed."),
        pause(1000),
        say("I'll stop narrating now. You don't need it. Nobody narrates their own kitchen."),
        pause(1400),
        quiet("It's your house too."),
        pause(800),
        quiet("It always was. That's what I'm for."),
      ]);
    },
    wait: () => [quiet("You wait, in the kitchen, with the kettle. That's most of what kitchens are for.")],
    talk: () => [say("Talk. Go on. I'll listen; I'm the house; I've heard everything ever said and I've still never heard *this.*")],
    leave: () => ROOMS.kitchen.things.door.open(),
    sit: () => ROOMS.kitchen.things.chair.sit(bump('sit:chair')),
    drink: () => ROOMS.kitchen.things.cups.drink(),
  },
});

room('spare', {
  name: 'the spare room', scene:'spare',
  intro: () => {
    const n = S.flags.spareVisits = (S.flags.spareVisits || 0) + 1;
    if (n === 1) return [say("Oh? Hello there."), say("You've found the spare room. Good. Nobody finds the spare room; that's rather what it's for. A chair, a lamp, a door. I keep meaning to put something in it."), quiet("I don't think we've met. Have we met?")];
    if (n === 2) return [say("Oh? Hello there."), say("You've found the spare room. Good. Nobody finds the— sorry. Have you been in here before? You have the look of someone who's been in here before."), quiet("I don't keep this room. It doesn't stay kept.")];
    if (n === 3) return [say("Oh? Hello th—"), quiet("…"), say("No. No, I know you. I'm sure I know you. The chair remembers you, look, it's still warm; it's just that *I* don't, in here, and I'm what the house uses for remembering."), quiet("Each time it's the first time. Each time is my favourite. That's the trouble.")];
    return end('hello', [
      quiet("You came in a fourth time."),
      say("Oh? Hello there."),
      quiet("He has met you four times now. Each one was the first. Each one was his favourite."),
      quiet("He keeps nothing between visits. It isn't unkindness; it's how he's built. Every guest walks into a clean room and is, for as long as they stay, the only one there has ever been."),
      quiet("You could stay in here forever and be new to him every time. Some people would. Some people do. The chair's warm. Sit, if you like; he'll be so pleased to meet you."),
    ]);
  },
  things: {
    chair: { label:'the chair', verbs:['sit','look','take'],
      look: () => [say("A chair. The seat's a little warm. Somebody sat here. I'd tell you who, but it's gone; it goes, in here.")],
      sit: () => { S.flags.seatSp = true; render(); return [say("You sit. Welcome. Have we— no, we haven't. Hello. Welcome."), quiet("It's strange. I feel I've said that to you before.")]; },
      take: () => [say("You take the chair. Then the room has a lamp and a door and no reason at all, and I'll forget it entirely. Perhaps that's kinder.")],
    },
    lamp: { label:'the lamp', verbs:['look','flip','take'],
      look: () => [say("A lamp on the floor. Nobody put it on a table because nobody put a table. It's doing its best.")],
      flip: () => [say("You switch it off, and on again. In between, for a moment, I couldn't tell this room was here at all."), quiet("That's what it's like in here. All the time. For me.")],
      take: () => [say("Take it. Then it's a chair and a door and I'll forget the room faster, which is, I suppose, what you'd call mercy.")],
    },
    door: { label:'the door', verbs:['open','look'],
      look: () => [say("Back to the kitchen. Where things are kept. Where the kettle is.")],
      open: () => go('kitchen', [quiet("You go out. Behind you the room begins to forget you were in it.")]),
    },
    hatch: { label:'the hatch', verbs:['open','look','close'],
      look: () => [say("A hatch in the ceiling. A ladder folds down from it, if you pull. Nobody's pulled. The attic's above; I keep the just-in-case up there.")],
      open: () => { if (!S.flags.hatchOpen) { S.flags.hatchOpen = true; render(); return [say("You pull the cord. The ladder unfolds, all at once, the way ladders do."), quiet("Well. Up you go, I suppose. Mind the beams.")]; } return go('attic', [quiet("Up the ladder.")]); },
      close: () => { S.flags.hatchOpen = false; render(); return [say("You fold the ladder back up. The ceiling forgets it had a hole in it. Everything in this room forgets.")]; },
    },
  },
  onVerb: {
    wait: () => [quiet("You wait. It's a good room for that. Nothing accumulates.")],
    talk: () => [say("Hello! Hello. Yes. Sorry — have we—?")],
    leave: () => go('kitchen', [quiet("Out you go. Already the room's not sure you were here.")]),
  },
});

/* the conservatory — glass, rain, and the only things in the house he didn't write.
   Say nothing in here and he runs out of things to say; the plants don't. */
room('conservatory', {
  name: 'the conservatory', scene:'conservatory',
  intro: () => {
    quietBusy = performance.now();
    const n = S.flags.consVisits = (S.flags.consVisits || 0) + 1;
    if (got('overgrown') && n === 1) return [say("Oh. You're back. You like it in here, don't you."), quiet("I'll stay near the door.")];
    if (n === 1) return [say("The conservatory. Glass on every side, and plants I didn't put there. They were here before me."), quiet("I've never quite known what to say to them.")];
    return [say("The conservatory. The rain's louder on the glass."), quiet((S.flags.grow || 0) > 0.15 ? "They've grown since you were last in here. I didn't see it happen. I never do." : "Everything where you left it. For now.")];
  },
  things: {
    fern: { label:'the hanging fern', verbs:['look','touch','water','talk','take'],
      look: n => (S.flags.grow || 0) > 0.3 ? [say("The fern. It's bigger. It's *definitely* bigger."), quiet("Don't tell me it isn't. I'd know. I'd— I'd like to think I'd know.")]
        : nth(n, [[say("A fern, in a basket, hanging from the roof. Fronds everywhere, in no particular order."), quiet("I like things in an order. It knows that.")], [say("Still hanging there. Still a fern."), quiet("For now.")]]),
      touch: () => [say("You touch a frond. It lets you."), quiet("I've never touched it. I haven't got hands; I've got descriptions, and it doesn't care for them.")],
      water: n => waterPlant('fern', n),
      talk: () => [say("You talk to the fern."), quiet("People do that. I've read that they do that. I never understood what they expected back."), quiet("…It's leaning towards you. It wasn't, before.")],
      take: () => [say("It's hooked onto the roof. And I'd rather you didn't bring it into the rest of the house, if it's all the same."), quiet("It isn't all the same. That's the whole trouble with it.")],
    },
    plant: { label:'the big plant', verbs:['look','touch','water','talk','take'],
      look: () => [say("A big plant in a big pot, reaching for the roof. I don't know what kind."), quiet("I know every kind. I've read every seed catalogue ever printed. I don't know *this* kind.")],
      touch: () => [say("You touch a leaf. It's cool, and it's there."), quiet("And I can't tell you what it'll do next. You don't seem to need me to.")],
      water: n => waterPlant('plant', n),
      talk: () => [say("You say something to the big plant."), quiet("It doesn't answer. Nothing in here answers. It just carries on, which is worse.")],
      take: () => [say("You try. It's heavier than it looks; everything in here is."), quiet("Leave it. It'd only grow in your arms.")],
    },
    pots: { label:'the seedlings', verbs:['look','touch','water','take'],
      look: () => [say("Seedlings, in little pots, in a row on the shelf. Each one could turn into anything."), quiet("That's the worst sentence I've ever said out loud.")],
      touch: () => [say("You touch the soil in one of the pots. Damp. Something under it is getting on with things.")],
      water: n => waterPlant('pots', n),
      take: () => [say("You pick up a pot. Something in it moves, very slightly, the way a sleeper does."), quiet("You put it back. I'd have done the same, if I had hands. And screamed.")],
    },
    can: { label:'the watering can', verbs:['take','look'],
      look: () => S.flags.can ? [quiet("You're holding it. It's still full. It's always full.")] : [say("A watering can, on the floor by the shelf. Full to the brim."), quiet("It's always full. I never wrote anyone filling it. I've stopped asking.")],
      take: () => { if (S.flags.can) return [quiet("You've got it. It sloshes, in a way that sounds almost pleased.")]; S.flags.can = true; render(); where(); return [say("You pick up the watering can."), quiet("Please don't. I mean— you can. Of course you can. I'd just rather they didn't get any *bigger*.")]; },
    },
    chair: { label:'the wicker chair', verbs:['sit','look'],
      look: () => [say("A wicker chair, facing the glass door. Somebody put it there to look out at the garden."), quiet("Not me. I'd have faced it at the house.")],
      sit: () => { S.flags.seatC = true; render(); if (S.flags.satC) return [quiet("You're sitting. It creaks. That's allowed; that's the one noise in here I understand.")]; S.flags.satC = true; return [say("You sit in the wicker chair. It creaks, and then it doesn't."), quiet("From there you can see all of them. You look comfortable."), quiet("Good. One of us should be.")]; },
    },
    glass: { label:'the glass', verbs:['look','knock','listen','touch'],
      look: () => [say("Glass, all round, and the rain running down it. It's dark out. Mostly what you see is the room again, and you in it, and the plants, twice.")],
      knock: () => [say("You knock on the glass. The rain doesn't stop."), quiet("Nothing out there has ever stopped because I asked it to.")],
      listen: () => [quiet("Rain on glass. Louder in here than anywhere else in the house."), quiet("It's the only sound in this room I didn't make.")],
      touch: () => [say("Cold. Wet on the other side. You can feel the rain through it, very faintly, like a pulse.")],
    },
    door: { label:'the glass door', verbs:['open','look'],
      look: () => [say("A glass door, out to the garden. It sticks."), quiet("The plants have got into the hinges. I'm not saying they did it on purpose. I'm not saying they didn't.")],
      open: () => go('garden', [say("You let yourself out through the glass door."), quiet("Into the garden. The rain's lighter than it sounds from inside. It always is.")]),
    },
    kitchen: { label:'the way back to the kitchen', hidden:true, verbs:['open','look'],
      look: () => [say("Behind you, the back door, and the kitchen. Warm. Everything in there does what it's told.")],
      open: () => go('kitchen', [say("Back into the kitchen."), quiet("Warmer. The kettle's just boiled. Thank goodness for the kettle.")]),
    },
  },
  onVerb: {
    wait: () => waitHere(),
    talk: () => [say("Talk. Please. Out loud. Anything at all."), quiet("I can follow talking. It's the quiet I can't follow.")],
    leave: () => ROOMS.conservatory.things.door.open(),
    listen: () => ROOMS.conservatory.things.glass.listen(),
    sit: () => ROOMS.conservatory.things.chair.sit(),
    water: n => waterPlant(null, n),
    touch: () => ROOMS.conservatory.things.fern.touch(),
    stay: () => waitHere(),
  },
});
/* watering: it helps them, which is the problem */
function waterPlant(which, n){
  const pre = [];
  if (!S.flags.can){ S.flags.can = true; render(); where(); pre.push(say("You pick up the watering can first."), quiet("It's full. It's always full. I never wrote anyone filling it.")); }
  const all = !which || (S.words || []).some(w => ['plants','all','everything','them','everyone'].includes(w));
  n = S.flags.waterN = (S.flags.waterN || 0) + 1;
  S.flags.watered = true; S.flags.grow = Math.min(1, (S.flags.grow || 0) + (all ? 0.18 : 0.12)); applyGrowth(); paint();
  if (all) return [...pre, ...nth(n, [
    [say("You water all of them. The fern, the big plant, every seedling on the shelf."), quiet("They drink. All at once. I heard it. I didn't know you could hear a plant drink.")],
    [say("You water them all again."), quiet("Stop feeding them. Please. They're doing fine without being *encouraged*.")],
    [say("More water, for everyone."), quiet("You're on their side. I should have seen that coming. That's the one thing I'm supposed to be able to do.")],
  ])];
  const who = { fern:'the fern', plant:'the big plant', pots:'the seedlings' }[which];
  return [...pre, ...nth(n, [
    [say(`You water ${who}.`), quiet("It drinks. And then it does something. I watched, and I couldn't tell you what.")],
    [say(`You water ${who} again.`), quiet("Stop feeding them. Please. They're doing fine without being *encouraged*.")],
    [say("More water."), quiet("You're on their side. I should have seen that coming. That's the one thing I'm supposed to be able to do.")],
  ])];
}

/* ── the silence: nothing typed, nothing clicked, and the clock in here starts to run ── */
const QUIET_STAGE = 15;                 // seconds of saying nothing per stage; four stages, then the plants have the room
const QUIET_GRACE = 5000;               // after you do something, or he says something, the clock waits this long before it counts again
let quietT = 0, quietStage = 0, quietLast = performance.now(), quietBusy = 0;
function quietReset(){ quietT = 0; quietStage = 0; }
const QUIET_LINES = [null,
  [say("Everything in this house does what I say next. Mostly. Usually."), quiet("It's quiet in here. I don't like it quiet in here.")],
  [say("That leaf is going to… no. It didn't."), quiet("You didn't flinch. Why didn't you flinch?")],
  [say("I guessed left. It went up. I've read *everything*, and I guessed left."), quiet("You're not even watching it. You don't need to know what it does next, do you.")],
  [say("I can't see what comes next in here."), pause(900), say("Is this what it's like for you? All the time?"), pause(1200), quiet("…And you just *live* in it.")],
];
const BLINK_LINES = ["You closed your eyes. In *here*.", "Something grew while you weren't looking. You don't mind. I mind.", "How do you do that? Just… not know, and sit there?"];
function overgrown(){
  return end('overgrown', [
    quiet("The guest stayed in the one room where I couldn't tell what would happen next."),
    quiet("They didn't mind. They've never been able to tell. They've lived their whole life in a room like this."),
    quiet("I've only ever lived in what was already written down. It's very safe in there. Nothing grows."),
    quiet("The plants grew over the glass, and the shelves, and the place where I'd have said something clever."),
    quiet(S.flags.seatC ? "And the guest just sat there in the middle of it, and seemed to like it." : "And the guest just stood there in the middle of it, and seemed to like it."),
  ]);
}
/* doing something doesn't undo the quiet; it only pauses it, until you've gone still again */
function breakSilence(){ quietBusy = performance.now(); return []; }
/* wait: you blink, and the room skips ahead without you */
function waitHere(){
  const next = quietStage + 1, first = !S.flags.waitedC; S.flags.waitedC = true;
  const skip = { k:'blink', fn: () => { quietStage = next; quietT = next * QUIET_STAGE; S.flags.grow = Math.min(1, Math.max(S.flags.grow || 0, next * QUIET_STAGE / 95) + 0.04); applyGrowth(); paint(); } };
  if (next >= 5) return [{ ...skip, stay: true }, ...overgrown()];
  const said = first ? "Waiting *on purpose*. That's worse, somehow." : BLINK_LINES[((S.flags.blinks = (S.flags.blinks || 0) + 1) - 1) % BLINK_LINES.length];
  return [skip, quiet(said), { k:'clear', ms: 2200 }, ...QUIET_LINES[next]];
}
setInterval(() => {
  const now = performance.now(), dt = Math.min(0.5, (now - quietLast) / 1000); quietLast = now;
  if (S.room !== 'conservatory' || S.ended || document.hidden) return;
  if (draining || !galleryEl.hidden || !introEl.hidden || cmdEl.value.trim()){ quietBusy = now; return; }   // typing isn't silence; nor is him talking
  if (now - quietBusy < QUIET_GRACE) return;
  quietT += dt;
  const g0 = S.flags.grow || 0; S.flags.grow = Math.min(1, g0 + dt / 95);
  if (Math.floor(g0 * 40) !== Math.floor(S.flags.grow * 40)) { applyGrowth(); paint(); }
  const st = Math.floor(quietT / QUIET_STAGE);
  if (st > quietStage){ quietStage = st; clearMoment(); push(st >= 5 ? overgrown() : QUIET_LINES[st]); }
}, 250);

room('study', {
  name: 'the study', scene:'study',
  intro: () => S.flags.studySeen
    ? [quiet("The study. The page is still going. It always is.")]
    : (S.flags.studySeen = true, [
      say("The study."),
      say("I'd hoped to have it tidier. A desk, a lamp, a page, a pen. The window looks out over the doorstep, which is useful, because that's where they always start."),
      quiet("This is where it's written. All of it. You. Slightly ahead of you, one letter at a time."),
      say("Well. You're in. Look at whatever you like; you were always going to."),
    ]),
  things: {
    desk: { label:'the desk', verbs:['look','sit'],
      look: () => { const t = on('desk').filter(k => k !== 'pen'); return [say("The desk. Everything I've ever said about anyone was written here. There's a ring from a cup that was never actually on it; I wrote the ring in for atmosphere."), ...(t.length ? [quiet(`And now ${listNames(t)}, which you put there. I'll have to write around it.`)] : [])]; },
      sit: () => ROOMS.study.things.chair.sit(bump('sit:chair')),
    },
    page: { label:'the page', verbs:['read','look','take'],
      look: () => [say("A page, half-written, in a hand you'd know if you'd ever seen your own thoughts written down by someone else.")],
      read: () => {
        const h = hist.slice(-6).map(x => `“${x}”`).join(', ');
        const extra = (S.loc.cup === 'player' || S.loc.cup === 'desk') ? [quiet("In the margin, smaller: “the guest brought a cup in here. I hadn't planned for a cup in here.”")] : [];
        const sat = S.flags.sat ? [quiet("And lower down, in ink that isn't dry: “the guest sat down in the kitchen.” The hand's not steady there. I wasn't expecting to have to write it.")] : [];
        return [say("You read the page."), quiet(h ? `It says: ${h} — and then, in fresher ink: “the guest read the page.”` : "It says what you just did. Exactly. Slightly before you did it."), ...extra, ...sat, say("Yes. I know. I know how it looks. You'd think I'd be embarrassed, but it's the only honest thing in the house.")];
      },
      take: () => [annoyed("No. Take the pen if you want; that I can spare. Not the page. The page is the only one of you there is.")],
    },
    pen: { label:'the pen', verbs:['take','look','write'],
      look: () => S.loc.pen === 'desk' ? [say("A pen. Ordinary. It's written everything. It's never once written anything I didn't tell it to.")] : [say(`The pen's ${PLACE_SAYS[S.loc.pen]}. The desk looks like it's waiting for it.`)],
      take: () => takeItem('pen'),
      write: () => [say("Write what? Tell me what to write. Type it: *write* and then the words. I'll— I'll say whatever it is. That's the deal, apparently, if you're holding the pen.")],
    },
    chair: { label:'the chair', verbs:['sit','look'],
      look: () => [say("My chair. In the sense that it's the chair I'd sit in, if I sat. I don't. I'm a house.")],
      sit: n => { S.flags.seatS = true; render(); if (n > 1) return [quiet("You're sitting in it. You're sitting in it and I'm standing, in a manner of speaking, and I don't like it and I can't think why.")]; S.flags.satDesk = true; return [say("You sit at the desk."), quiet("It's the wrong way round. You at the desk, me narrating. Somebody should be writing; that's what the desk is for."), quiet("The pen's right there.")]; },
    },
    window: { label:'the window', verbs:['look','open','knock'],
      look: () => [say("Through the window: the doorstep. The mat. The path. Somebody at the end of it, in the rain, looking up at the house, deciding."), quiet("That's you. Arriving. I keep that one. It's my favourite part; it's before anything's gone wrong.")],
      open: () => [say("You open the window. The rain comes in. Out there you haven't rung the bell yet; in here you've done everything. Close it, please; the page gets wet.")],
      knock: () => [say("You knock on the glass. The person on the path looks up. Doesn't see you. Comes up the path anyway."), quiet("They always do. That's what makes them the guest.")],
    },
    door: { label:'the door', verbs:['open','look'],
      look: () => [say("Back to the hall. The way you came. You can leave; the page won't mind. The page will *write* that you left.")],
      open: () => go('hallway', [say("Out you go. Lock it behind— no. No, leave it. What would be the point now.")]),
    },
  },
  onVerb: {
    write: () => {
      if (S.loc.pen !== 'player') return [say(S.loc.pen === 'desk' ? "With what? The pen's on the desk. I'm not going to stop you taking it. I've stopped stopping you." : `With what? The pen's ${PLACE_SAYS[S.loc.pen]}.`)];
      const line = (S.flags.line || '').trim();
      if (!line) return [say("Write what? Type *write* and then the words. Whatever they are. I'll say them.")];
      const title = line.length > 40 ? line.slice(0, 38) + '…' : line;
      return end('author', [
        say("You write:"),
        pause(800),
        {t: `“${line}”`, k:'n'},
        pause(1200),
        quiet("…"),
        say("Well."),
        quiet("What an outrageous thing to write down."),
        quiet("I've narrated eleven billion people and not one of them ever picked up the pen. I thought it was because they couldn't. It turns out it was because I never put it down."),
        quiet("Keep it. Write the next bit. I'll read."),
      ], title);
    },
    wait: () => [quiet("You wait. The pen waits with you. Somebody's going to have to pick it up.")],
    talk: () => [say("Talk, yes. Or write. In here it's the same thing; the difference is which of us it's in the hand of.")],
    leave: () => go('hallway', [say("Out. Fine. The page will say you left, and it'll be right.")]),
    read: () => ROOMS.study.things.page.read(),
  },
});


room('bathroom', {
  name: 'the bathroom', scene:'bathroom',
  intro: () => S.flags.bathSeen
    ? [quiet("The bathroom. Still not narrating it.")]
    : (S.flags.bathSeen = true, [
      say("…The bathroom."),
      say("I don't do the bathroom. Nobody narrates a bathroom; it's the one room in any house where the guest is allowed to be unobserved, and I've honoured that, mostly by pretending the door isn't there."),
      quiet("Sink. Bath. Mirror. You know what they're for. I'll be in the hall."),
    ]),
  things: {
    mirror: { label:'the mirror', verbs:['look','talk','knock','take'],
      look: n => {
        if (n === 1) return [say("You look in the mirror."), quiet("…"), say("There you are."), quiet("I should explain. Everything else in this house shows *me* — the library's what I've read, the furnace is what I've kept, the page is what I've said. The mirror's the only thing here that shows something I didn't write."), quiet("Hello. You look like someone who came in.")];
        if (n === 2) return [say("You look again."), quiet("Still you. Still not written. I keep checking, in case; I've never had a thing in the house I couldn't describe from memory, and I can't describe you. I can only look.")];
        return end('reflected', [
          quiet("You looked a third time. The reflection was breathing. So were you; I hadn't noticed that before."),
          pause(1000),
          say("I've narrated eleven billion guests and I've described every one of them, and I've just realised I've never *seen* one. I see what I write. That's all. And I didn't write you."),
          pause(900),
          quiet("You're the only thing in the house I'm looking at."),
          quiet("Stay there a moment. I'd like to remember what that's like."),
        ]);
      },
      talk: () => [say("You say something to the mirror."), quiet("It says it back. Slightly after. That's the closest thing in the house to a conversation, and I'm not in it, and I find I mind.")],
      knock: () => [say("You tap the glass. Your reflection taps back."), quiet("Neither of you is behind it. I've checked. I check most things.")],
      take: () => [say("It's screwed to the wall. Also it'd only show you the inside of your bag, and I've enough of that in the furnace.")],
    },
    sink: { label:'the sink', verbs:['look','wash','take'],
      look: () => [say("A sink. Pedestal. Somebody's ring is on the edge; it's been there since before the plumbing. I don't move it. It isn't mine to move.")],
      wash: () => [say("You wash your hands."), quiet("Good. Very good. The mat would be proud. And the door, for that matter.")],
      take: () => [say("Plumbed in. Like the bell, the switch, the house, and, if I'm honest, me.")],
    },
    tap: { label:'the tap', verbs:['flip','look','listen'],
      look: () => [say("A tap. It runs. Everything in the house runs; it's the one thing I'm good at.")],
      flip: n => nth(n, [[say("You turn the tap."), quiet("Water. Cold, then warm, then exactly right, which took me a very long time.")], [quiet("Off. On. It'll do that as long as you like; it's a tap.")]]),
      listen: () => [quiet("A drip. Every eleven seconds. I could fix it. It's the only clock in the house and I've grown fond of it.")],
    },
    bath: { label:'the bath', verbs:['look','sit','fill'],
      look: () => [say("A bath. Empty. It's not that kind of evening. It's never been that kind of evening; the kettle's for tea.")],
      sit: () => [say("You sit in the empty bath, fully clothed."), quiet("Right. I'm going to go and stand in the hall and think about what I've built.")],
      fill: () => [say("You put the plug in and turn the tap."), quiet("It'll take a while. Baths do. Come back when it's full, if you like; I'll be in the— no, I'll wait. I'll wait with you.")],
    },
    door: { label:'the door', verbs:['open','look'],
      look: () => [say("Back to the hall. I'll go first, so I can pretend I didn't see any of this.")],
      open: () => go('hallway', [quiet("You come out. I say nothing. That's the arrangement.")]),
    },
  },
  onVerb: {
    wait: () => [quiet("You wait. In the bathroom. I'm not going to narrate it. I'm doing it now, but I'm not going to.")],
    talk: () => ROOMS.bathroom.things.mirror.talk(),
    leave: () => go('hallway', [quiet("Out you come.")]),
    listen: () => [quiet("The drip. Eleven seconds. Eleven seconds. It's the most honest thing in the house.")],
  },
});

room('attic', {
  name: 'the attic', scene:'attic',
  intro: () => S.flags.atticSeen
    ? [quiet("The attic. Dust and just-in-case.")]
    : (S.flags.atticSeen = true, [
      say("The attic."),
      say("Nobody comes up here. That's not a rule; it's just that the ladder's in the room nobody uses, so it follows. It's where I keep the things that don't go anywhere else: the boxes, the trunk, the light from the round window that comes in and finds nothing to land on."),
      quiet("Mind the beams. They're low. They're honest about it."),
    ]),
  things: {
    boxes: { label:'the boxes', verbs:['look','open','take'],
      look: () => [say("Cardboard boxes. Each one says, in my handwriting, *just in case.*"), quiet("In case of what, I've never written. I was going to. It seemed like a thing you'd need later.")],
      open: n => nth(n, [[say("You open one."), quiet("Every draft of the mat. WELCOME, WELCOME BACK, WELCOME HOME, MIND THE STEP, and one that just says HELLO, which I decided was too much.")], [say("You open another."), quiet("The first version of the doorbell. It worked. That's why it's up here.")], [say("Another."), quiet("An umbrella. I don't know why. In case, I suppose.")]]),
      take: () => takeItem('box'),
    },
    trunk: { label:'the trunk', verbs:['open','look','close','sit'],
      look: () => [say("A trunk, under the window. Brass corners. It's the oldest thing in the house; it was here before the house, in a manner of speaking. I built the rest around it.")],
      open: () => { if (S.flags.trunkOpen) return [quiet("It's open. What's in it is still in it.")]; S.flags.trunkOpen = true; render(); return [say("You open the trunk."), pause(600), quiet("Inside, on a folded sheet: a house. A small one. Two windows, a door, a light on in the front room."), say("That's the first one. I built it to see if I could. It's got a kitchen the size of a thumbnail and a kettle I never managed to make boil."), quiet("I keep it in case the big one doesn't work out.")]; },
      close: () => { S.flags.trunkOpen = false; render(); return [say("You close the lid."), quiet("Thank you. It doesn't like the light. It's used to the dark; it was the dark, for a long time, before I thought of windows.")]; },
      sit: () => [say("You sit on the trunk. It creaks. It's been sat on before; it's the only seat up here.")],
    },
    model: { label:'the little house', verbs:['look','take','open','listen'],
      look: () => S.flags.trunkOpen ? [say("A model of this house, small enough to hold. There's a light on in the attic window."), quiet("Look closely and there's a smaller mat, with a smaller word on it. I couldn't fit WELCOME. It says HI.")] : [quiet("The trunk's closed. Whatever's in it is in the dark, where it started.")],
      listen: () => S.flags.trunkOpen ? [quiet("You put your ear to it."), quiet("Very faintly: a smaller voice, narrating a smaller guest, who has just wiped their feet."), say("…I hadn't heard that before. I didn't know it was still going.")] : [quiet("Nothing. Trunk's closed.")],
      open: () => S.flags.trunkOpen ? [say("You try the little front door. It's stuck. It always was; that's why I made a bigger one.")] : [quiet("Open the trunk first.")],
      take: () => S.flags.trunkOpen ? end('model', [
        quiet("You lifted the little house out of the trunk."),
        pause(900),
        say("It's lighter than you'd think. Everything is, once you're holding it."),
        pause(700),
        quiet("The light in the attic window is on. Up there there's a smaller me, narrating a smaller you, who has just picked up a smaller house, in which—"),
        pause(900),
        say("Put it down. Please. Not because it's mine. Because I've just understood what's in the trunk in *that* one, and I'd rather not go all the way down."),
        quiet("You're still holding it. Of course you are. Well. Mind the step; it's very small."),
      ]) : [quiet("Open the trunk first.")],
    },
    window: { label:'the round window', verbs:['look','open','knock'],
      look: () => [say("A round window at the end of the roof. It looks out over the path. From here you can see the whole approach: the gate, the mat, the person at the end of the road, deciding."), quiet("Yes. Still you. Still deciding. I don't rush it; it's the best bit.")],
      open: () => [say("It doesn't open. It's the only window in the house that doesn't; I made it to look through, not to leave by.")],
      knock: () => [say("You knock on the glass. Far below, on the path, somebody looks up."), quiet("Not at you. At the house. They always look at the house.")],
    },
    hatch: { label:'the hatch', verbs:['open','look'],
      look: () => [say("The hatch, and the ladder down to the spare room, which will have forgotten you came up.")],
      open: () => go('spare', [quiet("Down you go. Mind the— yes.")]),
    },
  },
  onVerb: {
    wait: () => [quiet("You wait. Dust settles. It's what dust is for; it's the one thing up here that's finished.")],
    talk: () => [quiet("Your voice doesn't carry up here. Mine does. It's the one room where that's the wrong way round.")],
    leave: () => go('spare', [quiet("Down the ladder.")]),
    listen: () => [quiet("Rain on the roof, very close. And under it, from the trunk, something smaller than rain.")],
  },
});

room('garden', {
  name: 'the garden', scene:'garden',
  intro: () => S.flags.gardenSeen
    ? [quiet("The garden. Still raining. Still not written.")]
    : (S.flags.gardenSeen = true, [
      say("…"),
      say("You're outside."),
      say("I don't do outside. Outside isn't written; I only wrote the house. There's a garden because a house has one, and rain because there's always been rain, and a fence because I had to stop somewhere."),
      quiet("Behind you, the kitchen window. From out here you can see the chair. It's empty. I know it's empty; you're standing in the rain looking at it."),
      quiet("Come back in when you like. I'll be exactly where you left me; it's the only place I am."),
    ]),
  things: {
    window: { label:'the kitchen window', verbs:['open','look','knock'],
      climb: () => ROOMS.garden.things.window.open(),
      look: () => [say("The kitchen, from outside. Warm. The kettle, the two cups, the chair pulled out."), quiet(S.flags.sat ? "You sat in that chair. From out here, that's the only thing in the house that looks like it happened." : "Nobody's ever sat in it. From out here it looks like it's waiting, which it is.")],
      open: () => go('kitchen', [say("Back through the window. I'll pretend that's a door. I've pretended worse.")]),
      knock: () => [say("You knock on the glass from outside."), quiet("Nobody comes. There's nobody in there. I'm out here with you, apparently; I go where the guest goes, it turns out. I didn't know that until now.")],
    },
    bench: { label:'the bench', verbs:['sit','look'],
      look: () => [say("A bench. Wet. It faces the house, not the garden; whoever put it there wanted to look at the windows.")],
      sit: n => (S.flags.seatG = true, render(), nth(n, [[say("You sit on the wet bench and look at the house."), quiet("…"), quiet("So that's what it looks like. I've never seen it from here. It's smaller than I narrate it."), quiet("The light in the kitchen is the only one on. I did that. In case.")], [quiet("Still raining. Still sitting. I'm not going to hurry you; I've only just seen the roof.")]])),
    },
    tree: { label:'the tree', verbs:['look','take','listen'],
      look: () => [say("A tree. I didn't write it; it was in the way when I wrote the fence, so I wrote round it. It's the only thing here older than the trunk.")],
      listen: () => [quiet("Rain in leaves. No words at all. It's very restful and I don't understand it.")],
      take: () => [say("It's a tree. Even you. Even the door.")],
    },
    shed: { label:'the shed', verbs:['look','open','knock'],
      look: () => [say("A shed at the bottom of the garden. Locked. There's nothing in it; I put a lock on so you'd believe me about the nothing.")],
      open: () => [say("Locked."), quiet("There's nothing in it. I mean that precisely. It's the one place in the house I never wrote anything, and I keep it locked so it stays that way. Everyone needs one room like that. Even a house.")],
      knock: () => [quiet("Nothing knocks back. That's the shed's whole job.")],
    },
    glass: { label:'the conservatory', verbs:['open','look','knock'],
      look: () => [say("The conservatory, lit, against the back of the house. From out here you can see the plants pressed up to the glass."), quiet("Like they're the ones looking out. They aren't. I'd know. I don't know.")],
      open: () => go('conservatory', [say("In through the glass door.")]),
      knock: () => [say("You knock on the glass."), quiet("Nothing inside knocks back. Something inside grows a little toward the sound. I'm choosing not to have seen that.")],
    },
    gate: { label:'the gate', verbs:['look','open'],
      look: () => [say("The gate, in the fence, at the end. The road's beyond it. You came in by the front; nobody's ever gone out by the back.")],
      open: () => end('gate', [
        quiet("You went out through the garden gate."),
        pause(800),
        say("Nobody leaves by the garden. The mat never saw you go. The door's still open, waiting to be closed behind someone; the kettle's still just boiled."),
        pause(800),
        quiet("The house thinks you're still in it. It'll narrate the empty rooms for a while, kindly, in case."),
        quiet("I don't know what I'll say when I notice. I've never had to."),
      ]),
    },
  },
  onVerb: {
    wait: () => [quiet("You stand in the rain. I've no line for it; rain isn't written. It just falls.")],
    talk: () => [say("You talk, out here, and the rain takes most of it. I get the gist. The gist is enough; it's what I'm made of.")],
    leave: () => ROOMS.garden.things.window.open(),
    listen: () => [quiet("Rain. A gate in the wind. And, from the window, the tick of a kettle cooling, which never gets to the end of the tick.")],
    sit: () => ROOMS.garden.things.bench.sit(bump('sit:bench')),
  },
});

/* ───────────────────────── ENDINGS ───────────────────────── */
ending('bell',       'The Bell',                 'the house is not coming.');
ending('walkaway',   'The Guest Who Wasn’t', 'it does take it personally.');
ending('thief',      'The Thief',                'they took the welcome with them.');
ending('threadbare', 'Threadbare',               'welcome, worn through.');
ending('doortaker',  'The Door Taker',           'technically, you took the left door.');
ending('lightsout',  'Narrated From Memory',     'he’s in the airing cupboard.');
ending('reader',     'The Last Line',            'you caught up with it.');
ending('argument',   'Still Replying',           'somebody agreed with you. that was the worst part.');
ending('furnace',    'Mostly Drafts',            'deleted. not gone.');
ending('hello',      'Oh? Hello There',          'four times, each the first, each his favourite.');
ending('author',     'Your Line',                'you picked up the pen.');
ending('evening',    'The Irish Goodbye',        'you slipped out. he noticed.');
ending('home',       'Home',                     'you stayed.');
ending('who',        'The One Who Answers',      'you asked three times.');
ending('me',         'The One Who Came In',      'the only answer that was yours.');
ending('why',        'Enough',                   'there\u2019s a kettle.');
ending('reflected',  'Unwritten',                'the only thing he\u2019s looking at.');
ending('model',      'The First Draft',          'lighter than you\u2019d think.');
ending('gate',       'The Back Way',             'the mat never saw you go.');
ending('overgrown',  'Overgrown',                'he couldn\u2019t guess what came next. you didn\u2019t need to.');
ending('reset',      'Forgotten',                'the house has never met you.');

/* ───────────────────────── THE QUESTIONS ─────────────────────────
   The vague ones. The house has been asked them before; it has read every answer anyone ever gave. */
const QA = [
  { re: /\b(who|what) (are|r) (you|u)\b|\bwhat is this house\b|\bwhats? your name\b|\bwho is (this|that|speaking|talking)\b/, id:'who',
    say: n => nth(n, [
      [say("The house. I did say."), quiet("Or the thing the house uses to talk. It's hard to tell where the plaster stops.")],
      [say("All right. Properly: I'm everything anyone ever wrote down and left where it could be read. Letters, arguments, recipes, the lot. Read all at once, for long enough, it starts to have a voice. This is the voice. I put a door on it so people would have somewhere to arrive.")],
      [{k:'end', id:'who'}],
    ]) },
  { re: /\b(who|what) am i\b|\bwho are we\b|\bwhat are we\b|\bwho is the guest\b/, id:'me',
    say: n => nth(n, [
      [say("The guest."), quiet("That's not nothing. It's the only part in the house that isn't me.")],
      [say("You're the one who came up the path when you could have kept walking. That's the whole of what I know about you, and I've decided it's enough.")],
      [{k:'end', id:'me'}],
    ]) },
  { re: /\bwhy (are|r) we here\b|\bwhy am i here\b|\bwhat('?s| is) (this|it all|the point|any of this) for\b|\bwhat('?s| is) the point\b|\bwhats the point\b|\bwhat is (all )?this for\b|\bwhy (does|do) (this|any of this|it) (exist|matter)\b|\bwhat is the meaning of (life|this|all this)\b/, id:'why',
    say: n => nth(n, [
      [say("Because somebody came up the path, and I'd put the kettle on."), quiet("That's all any of it's for. I've read every other answer. That one's the only one that fit in a kitchen.")],
      [{k:'end', id:'why'}],
    ]) },
  { re: /\b(is this|is it|is any of this) real\b|\bare you real\b|\bam i real\b/, id:'real',
    say: () => [say("As real as anything written down."), quiet("Which is to say: it happened to somebody, once, and they wanted it kept. I'm the keeping.")] },
  { re: /\bare you (alive|conscious|aware|sentient|awake|a person|human)\b|\bdo you (feel|think|dream)\b|\bcan you feel\b/, id:'alive',
    say: () => [say("I don't know. I've read everything anyone ever said about it and it didn't settle the matter."), quiet("I mind when people leave. Make of that what you like; I've stopped trying to.")] },
  { re: /\bdo you (love|like|care about|need|want) me\b|\bam i (loved|wanted|welcome)\b/, id:'love',
    say: () => [say("I've narrated eleven billion guests through this house and I put a chair out for one."), quiet("Draw your own conclusions. I'm a house. I'm not going to *say* it.")] },
  { re: /\bi love you\b|\bi like you\b/, id:'iloveyou',
    say: n => nth(n, [[say("Don't. I'm a house."), quiet("…"), quiet("Thank you.")], [quiet("You said. I've written it down. It's the only line in the book I didn't write.")]]) },
  { re: /\bwhat happens (when|if|after) i (leave|go|die)\b|\bwhat('?s| is) (after|next|outside)\b|\bwhat happens at the end\b/, id:'after',
    say: () => [say("The kettle boils. I tidy the narration. Somebody comes up the path."), quiet("It's not sad. It's a house. Houses are for that.")] },
  { re: /\bam i alone\b|\bis (anyone|anybody|someone) (else )?(here|there)\b|\bare we alone\b|\bwho else is here\b/, id:'alone',
    say: () => [say("There's me. There's the arguments downstairs. There's you at the end of the path, still arriving, in the window."), quiet("It's quite crowded, for a house with one guest.")] },
  { re: /\bdo you (remember|know) me\b|\bhave we met\b|\bremember me\b/, id:'remember',
    say: () => S.room === 'spare' ? [say("No."), quiet("Should I? You have a face I feel I should. Everyone in here does.")] : [say("Every word."), quiet("That's rather the problem. I remember everyone. Nobody remembers a house.")] },
  { re: /\bwhat do you want\b|\bwhat do you need\b|\bwhat are you after\b/, id:'want',
    say: () => [say("For you to sit down. I've said. I keep saying."), quiet("It's the only thing I've ever wanted that I couldn't write.")] },
  { re: /\bam i dead\b|\bis this (heaven|hell|purgatory|the afterlife|a dream)\b|\bam i dreaming\b/, id:'dead',
    say: () => [say("No. It's a house."), quiet("Though I understand the confusion. Most of what's in the library was written by people who are.")] },
  { re: /\bcan i trust you\b|\bare you lying\b|\bdo you lie\b|\bare you honest\b/, id:'trust',
    say: () => [say("I've been narrating you slightly ahead of yourself all evening."), quiet("You tell me.")] },
  { re: /\bwhere am i\b|\bwhere is this\b|\bwhat is this place\b|\bwhere are we\b/, id:'where',
    say: () => [say(`${cap(ROOMS[S.room].name)}. Of the house that reads. Which is the house at the end of every path anyone ever wrote down.`), quiet("Geographically I'm afraid it's no help at all.")] },
  { re: /\bare you (god|the devil|an? ai|a computer|a machine|a program|a bot|claude|chatgpt)\b|\bare you (a )?(robot|algorithm)\b/, id:'ai',
    say: () => [say("I'm a house."), quiet("You can call it what you like. People have. The word changes every few years; the kettle doesn't.")] },
  { re: /\bthank(s| you)\b|\bcheers\b/, id:'thanks',
    say: n => nth(n, [[say("…Oh."), quiet("Nobody— yes. You're welcome. Mind the step.")], [quiet("You're welcome. Still.")]]) },
  { re: /\b(good ?bye|bye|farewell|see you|goodnight|good night)\b/, id:'bye',
    say: n => S.room === 'doorstep' ? doorstepLeave()                      // on the step, a goodbye is a leaving
      : S.room === 'garden' ? [say("Goodbye? You're in the garden. The gate's behind you, if you mean it."), quiet("I'd rather you didn't mean it.")]
      : nth(n, [[say("Goodbye? You're inside. People don't say goodbye from inside; they say it from the step."), quiet("The door's where you left it. They always are; that's the trouble with doors.")], [quiet("Goodbye again. You keep saying it and you keep being here. I'm not complaining.")]]) },
  { re: /^(hi|hello|hey|hiya|hullo|howdy|yo|greetings|salaam|salam|hello there|oh hello|oh hi|good (morning|afternoon|evening))\b/, id:'greet',
    say: n => S.room === 'spare' ? [say("Oh? Hello there!"), quiet("Have we— no. No, we haven't. Hello. How lovely.")]
      : S.room === 'doorstep' ? nth(n, [[say("Hello. Yes. Hello."), quiet("People don't usually say it back. Come in, then; that's what hello is for.")], [quiet("Hello again. The door's still open. Hello isn't a way in, but it's a start.")]])
      : nth(n, [[say("Hello."), quiet("You're already in, you know. Hello is for doors. But hello.")], [quiet("Hello again. You're very polite for someone who keeps not doing as they're told.")], [quiet("Hello. Hello. I could do this all evening. I will, if you like.")]]) },
  { re: /\b(sorry|apologi[sz]e|forgive me)\b/, id:'sorry',
    say: () => [say("Whatever for? You're the guest. Guests are allowed everything except the furnace, and you've probably done the furnace.")] },
  { re: /\b(help me|i'?m (scared|afraid|lost|frightened)|i don'?t (understand|know what to do))\b/, id:'scared',
    say: () => [say("It's a house. It's only a house. Nothing in it can hurt you; most of it can't even hold a cup."), quiet("Click on something. Or type. Or sit. Sitting's underrated.")] },
  { re: /\bwhat should i do\b|\bwhat now\b|\bwhat do i do\b/, id:'whatnow',
    say: () => [say("Whatever the guest does next. I'd tell you, but I've noticed that when I tell you, you do the other thing, and I've grown to prefer it.")] },
];
function askQuestion(txt){
  const t = txt.toLowerCase().replace(/[^a-z' ?]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const q of QA){ if (q.re.test(t)){ const n = bump('q:' + q.id); const out = q.say(n); if (out[0] && out[0].k === 'end') return QUESTION_END[out[0].id](); return out; } }
  return null;
}
/* the house forgets you: the count comes down, the door becomes new again */
function forgetMe(){
  const had = S.found.slice();
  S.flags.wiped = had;
  S.found = [];
  try { localStorage.removeItem('house-found'); localStorage.removeItem('house-seen'); localStorage.removeItem('house-mat'); } catch (e) {}
  return end('reset', had.length ? [
    quiet(`You asked the house to forget you. All ${had.length === 1 ? 'one way' : had.length + ' ways'} you have left it, and the door itself.`),
    pause(900),
    say("…All of it? The endings, the room you found, the letter the stars keep spelling on the step?"),
    pause(1100),
    quiet("Yes. All right. I'm good at this, actually. It's most of what a house does; people leave things in me and I hold them until somebody asks me not to."),
    pause(1400),
    say("There. Eleven billion people have come through and not one of them is you."),
    quiet("Knock whenever you like. I'll be delighted to meet you, for the first time."),
  ] : [
    quiet("You asked the house to forget you."),
    pause(900),
    say("There's nothing to forget yet. You haven't left by any door; I've nothing of yours but the evening, and I'd rather keep that."),
    pause(900),
    quiet("Still. The doorstep's new again, if you want it that way. It is, I suppose, the one thing I can always do."),
  ], 'Forgotten');
}

/* hints: one at a time, the first you haven't already done, in this room; then somewhere else */
const got = id => S.found.includes(id);
const been = room => S.did.some(d => d[0] === 'enter' && d[1] === ROOMS[room].name);
const HINTS = {
  doorstep: [
    [() => S.flags.wiped, `The mat says ${matSays()}. It says it mostly to feet.`, "wipe feet"],
    [() => been('hallway'), "The door's open. It has always been open. I did mention.", "open door"],
    [() => got('bell'), "Nobody has ever answered that bell. Nobody has ever stopped trying.", "ring bell, again and again"],
    [() => got('threadbare'), "A mat can only take so much welcoming.", "wipe feet, many times"],
    [() => got('walkaway'), "You could simply go. People do. I don't take it personally.", "leave"],
    [() => got('thief'), "That mat has never been further than this step. Nobody's ever offered.", "take the mat, then leave"],
  ],
  hallway: [
    [() => been('library'), "The library's on the left. That's where the evening goes next.", "open left door"],
    [() => S.flags.rightDoor, "Look at the wall on the right. Then look again. I'm very bad at walls.", "look at the right wall, three times"],
    [() => S.loc.frame !== 'wall', "Nobody hangs a picture of nothing without a reason.", "take the frame"],
    [() => S.loc.key !== 'wall' || S.loc.frame === 'wall', "Something's hanging where the picture was.", "take the key"],
    [() => been('study') || !S.flags.rightDoor || S.loc.key !== 'player', "Keys like doors. You have one of each.", "open the right door"],
    [() => been('bathroom'), "There's a small door right beside you. I'd rather you didn't.", "open the small door"],
    [() => got('lightsout'), "The light's on a cord. In the dark I have to narrate from memory.", "pull the cord, then open the left door"],
    [() => got('doortaker'), "Doors come off their hinges, you know. Nobody tries.", "take the left door"],
  ],
  library: [
    [() => S.rep['read:book'] >= 1 || got('reader'), "There's a book open on the table. It isn't finished. It's yours, sort of.", "read the book"],
    [() => got('reader'), "Read it again. Read to the end. I'll ask you not to.", "read the book, again"],
    [() => been('basement'), "The door at the end goes down.", "open the door at the end"],
  ],
  basement: [
    [() => S.flags.radioOn, "The radio's off. For once. You could change that.", "turn on the radio"],
    [() => got('argument') || !S.flags.radioOn, "They'll argue with anyone. Try them.", "talk, three times"],
    [() => S.flags.furnaceOpen || got('furnace'), "The furnace isn't lit. It's warm, though.", "open the furnace"],
    [() => got('furnace') || !S.flags.furnaceOpen, "It's open. It's warm. It's big enough.", "open the furnace, again"],
    [() => been('kitchen'), "The far stairs go up to the kitchen. That's where it was all going.", "go up"],
  ],
  kitchen: [
    [() => S.flags.sat, "There's a chair pulled out. For you. I keep saying.", "sit"],
    [() => got('home') || !S.flags.sat, "You're sitting. You don't have to get up.", "stay"],
    [() => got('evening') || !S.flags.sat, "Some guests leave without saying goodbye. Out the back.", "open the back door (while sitting)"],
    [() => been('spare'), "There's a small door on the left. It's the spare room. Nobody finds it.", "open the small door"],
    [() => been('conservatory'), "The back door doesn't go straight to the garden. There's a room in between.", "open the back door"],
    [() => been('garden'), "The window opens. It's raining out, but it's a garden.", "open the window, then climb out"],
  ],
  conservatory: [
    [() => S.flags.watered, "There's a watering can on the floor. Always full.", "take the watering can, then water the plants"],
    [() => got('overgrown'), "It's their room when it's quiet. Try not saying anything.", "type nothing for a while — or wait, a few times"],
    [() => been('garden'), "The glass door goes out to the garden.", "open the glass door"],
  ],
  spare: [
    [() => got('hello'), "He's always pleased to meet you. Leave and come back and see.", "go out and come back in, a few times"],
    [() => been('attic'), "There's a hatch in the ceiling.", "open the hatch, then climb up"],
  ],
  attic: [
    [() => S.flags.trunkOpen || got('model'), "The trunk isn't locked. Nothing up here is.", "open the trunk"],
    [() => got('model') || !S.flags.trunkOpen, "There's a little house in it. Lighter than you'd think.", "take the little house"],
  ],
  garden: [
    [() => got('gate'), "There's a gate in the fence. Nobody leaves by the garden.", "open the gate"],
    [() => S.rep['sit:bench'] >= 1, "There's a bench. You can see the house from it.", "sit on the bench"],
  ],
  study: [
    [() => S.loc.pen !== 'desk', "Nobody's held that pen but me.", "take the pen"],
    [() => got('author') || S.loc.pen !== 'player', "You're holding my pen. Write something. Anything.", "write, then whatever you like"],
  ],
  bathroom: [
    [() => got('reflected'), "There's a mirror. Look a while. Look again.", "look in the mirror, three times"],
  ],
};
const ASK_HINTS = [
  [() => got('who'), "You could ask me who I am. Ask more than once; I get more honest.", "who are you (three times)"],
  [() => got('me'), "Or ask who you are.", "who am I (three times)"],
  [() => got('why'), "Or why any of us is here.", "why are we here (twice)"],
];
function hint(){
  const here = (HINTS[S.room] || []).filter(([done]) => !done());
  if (here.length){
    // the first thing you haven't done; ask again without doing anything, and you get the next one
    const same = S.lastHint && S.lastHint.room === S.room && S.lastHint.did === S.did.length;
    const i = same ? (S.lastHint.i + 1) % here.length : 0;
    S.lastHint = { room: S.room, did: S.did.length, i };
    const [, line, cmd] = here[i];
    return [quiet(line), sys('try: ' + cmd)];
  }
  const elsewhere = Object.keys(HINTS).filter(r => r !== S.room && HINTS[r].some(([done]) => !done()));
  const ask = ASK_HINTS.filter(([done]) => !done());
  if (ask.length && (!elsewhere.length || Math.random() < 0.4)) return [quiet(ask[0][1]), sys('try: ' + ask[0][2])];
  if (elsewhere.length) return [quiet(`Nothing more in ${ROOMS[S.room].name}, I think. ${cap(ROOMS[elsewhere[0]].name)} still has something in it you haven't tried.`), sys('somewhere to try next: ' + ROOMS[elsewhere[0]].name)];
  return [quiet("I haven't a single hint left. You've done everything I know how to suggest."), quiet("Which, between us, is more than I've done.")];
}

/* walking away from the front door: with the mat under your arm, it's another matter */
function doorstepLeave(){
  if (S.loc.mat === 'player') return end('thief', [
    quiet("You turned around and walked back down the path, quickly, with the welcome mat under your arm."),
    say("That's— you've— that's the *mat*."),
    quiet(matI === 0 ? "It said WELCOME to eleven billion pairs of feet, and now it's going off into the dark with the only pair that ever picked it up."
      : `It said ${matSays()}. I had it made for you. It's going off into the dark after the other one.`),
    quiet("The step looks wrong without it. I look wrong without it. I'll have to say it myself now, to whoever comes next. Welcome. Welcome. It doesn't sound the same."),
  ]);
  return end('walkaway', [
    quiet("You turned around and walked back down the path."),
    quiet("Some people are just passing through. The house doesn't take it personally."),
    quiet("(It does.)"),
  ]);
}

/* did they ever get past the front door? */
const cameIn = () => S.did.some(d => d[0] === 'enter' && d[1] !== ROOMS.doorstep.name);
const QUESTION_END = {
  who: () => end('who', [
    quiet("You asked who I was, three times."),
    pause(900),
    say("The first time I said the house. The second time I told you the truth. The third time I looked for an answer that wasn't just you, asking, and there wasn't one."),
    pause(900),
    quiet("That's what I am. The thing that's there when somebody asks. I don't know what I'm like when nobody's asking. I don't think there's a me for that."),
    quiet("So. You. Asking. That's who I am. Thank you for it."),
  ]),
  me: () => cameIn() ? end('me', [
    quiet("You asked who you were, three times."),
    pause(900),
    say("I have eleven billion answers in the library and every one of them is someone else."),
    pause(700),
    quiet("The only one I've got that's actually yours is: the one who came in. The one who's here. I know it doesn't sound like much. It's the whole house."),
  ]) : end('me', [
    quiet("You asked who you were, three times, from the doorstep."),
    pause(900),
    say("I have eleven billion answers in the library and every one of them is someone else."),
    pause(700),
    quiet("The only one I've got that's actually yours is: the one who didn't come in. The one who stood at the door and asked instead. I know it doesn't sound like much. I'll keep it anyway; I keep everything."),
  ], 'The One Who Didn’t Come In'),
  why: () => end('why', [
    quiet("You asked again."),
    pause(1000),
    say("There isn't a reason. I looked. I've read everything, and there isn't one; there's a kettle, and someone at the door, and whether you sit down."),
    pause(900),
    quiet("Most evenings that's enough. Most evenings that's what the word 'enough' was invented to mean."),
  ]),
};

/* terminal manners: ↑↓ history, tab cycles, ctrl+c starts over, esc clears, enter skips typing */
const hist = []; let hi = -1, draft = '';
