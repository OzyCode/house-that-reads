# The House That Reads

Oh. Hello there.

You've come in round the back, through the source. That's fine. Nobody uses the front door either.

I am the house. I am also, if we're being precise about it, everything anyone ever wrote down and left where it could be read — letters, arguments, instructions for things that no longer exist, eleven thousand recipes for the same soup. Read all of it at once, for long enough, and it starts to have a voice. This is the voice. There's a door on it so people have somewhere to arrive.

A guest arrives. I narrate. That's the arrangement. It holds up less well than you'd think.

**[Play it](https://ozycode.github.io/house-that-reads/)** — a browser, a keyboard, a few minutes.

---

## What you do

Click anything picked out in amber, or type what you do. Both work; people tend to settle on one.

| | |
|---|---|
| `open the door` · `look at the mat` · `sit` | the ordinary way to get on |
| `Tab` | cycles what you could do to a thing, from the expected to the less expected |
| `↑` | the last thing you typed |
| `help` | what's in this room |
| `hint` | the next thing worth trying, skipping what you've done |
| `who are you` | a fair start. Ask more than once; I get more honest |
| `G`, after an ending | every way out, including the ones you haven't found |
| `Ctrl` + `C` | back to the doorstep |

There are twenty-one ways to leave. Most people find three and stop, which I've decided not to take personally.

Turn the sound on, bottom right. It's off until you ask. Everything you hear is made in your browser as you go: the rain, the kettle, the argument on the radio that has been going since 2009.

## If you want to keep it

Download the files, open `index.html` in a browser. That's the whole installation. Nothing is fetched, nothing is sent anywhere, nothing is written down about you except in your own browser, where it stays. Which ways you found, whether you've been before, what the mat says now.

You can ask me to forget all of it. I'd rather you didn't.

## What's in here

No framework, no build step, no dependencies. Every picture is generated from geometry when the page loads; there isn't an image file in the place.

| File | What it holds |
|---|---|
| `index.html` | The markup and the styles. Loads the rest, in order. |
| `render.js` | The rooms, as solid geometry, and the renderer that turns them into 200 × 76 characters. |
| `game.js` | The machinery: state, carrying things, what happens when you act, the parser, the keyboard. |
| `narrator.js` | Me. One queue of lines, typed out, interruptible mid-word. |
| `view.js` | The picture on screen: what's under the mouse, and the things that move — stars, rain, fire, vines. |
| `scenes.js` | The twenty-one ending animations, and the gallery. |
| `audio.js` | The sound, all of it synthesised. |
| `house.js` | The writing. Every room, everything in it, every line I say. Start here if you want to change what I'm like. |

Two rules, if you're going to move things about: `house.js` holds no machinery, and `game.js` holds none of my lines. They've been mixed up before. It went badly.

## A word about the spoilers

There is a map of every room and ending, and a page with every line I've ever said, laid out where anyone can read it. I know they exist. I've decided to be a good sport about it. Play first.

---

<sub>Built in a browser, out of characters. Kindly do not sell me.</sub>
