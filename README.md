# Flowers in January

A cozy top-down Phaser 3 game. Jana wakes on June 18th, finds Eevie's note, and follows his trail
through the garden, Nowhere Beach, the Snowy Forest, the Cherry Blossoms and the Dark Plains,
collecting 24 flowers (each one carries a poem) and the four guardians' cipher fragments, until the
gate at the bottom of the garden opens.

Plain JavaScript, Phaser 3.60.0 from the CDN, no build step. It runs as static files on GitHub Pages.

## Run locally
```
python3 -m http.server 8765
```
then open http://localhost:8765/ (add `?debug=1` for the debug tools).

## Controls
Arrows / WASD to move · E, Space or Enter to talk / advance · I for the bag · F for the flowers ·
Esc to go back or leave a minigame.
Controller (Xbox / PlayStation / Switch Pro): d-pad or left stick to move, A / ✕ to talk and confirm,
B / ○ to go back, Y / △ or Start for the bag, X / □ for the flowers, Select / Share for music on/off.
On touch screens: on-screen arrows, E and Bag buttons; tap the dialogue box to advance.

## Dialogue
Every line comes from `Flowers_in_January_Dialogue.xlsx` (tab `Dialogue`). After editing the sheet:
```
node tools/xlsx_to_dialogue.js path/to/Flowers_in_January_Dialogue.xlsx
```
This rewrites `js/dialogue.js` (one row = one box; no dependencies, the xlsx is read with Node's zlib).

## Where things live
```
index.html            entry point + DOM UI (dialogue box, bag, note / letter, poem, gate panel)
css/style.css         UI styles (9-slice frames are CSS border-images, pixelated; PixelAE font)
data/placements.json  NPCs, props, spots, exits, arrivals, interiors, guardian houses, ending home
tools/                xlsx_to_dialogue.js
js/
  data.js             the 24 poems (unchanged from the original game)
  dialogue.js         GENERATED from the spreadsheet
  config.js           tile size, areas, items, cipher, flowers → poems (read from the sheet), map fixes
  state.js            flags, inventory, flowers, fragments, autosave (localStorage)
  audio.js            front end that sends audio events to the AudioScene
  input.js            keyboard / touch router
  ui/                 HUD, dialogue box, poem, note + letter, bag, gate panel, title, touch, fades, credits
  world/              map builder (outdoor maps, interiors, ending maps), actors, player, lighting
  story/              lines (sheet lookup), runner, guardians, garden / beach / forest / blossom / plains, ending
  minigames/          fishing, digging, whack-a-Phoebe, sled race, sleeve match, vase shuffle
  scenes/             boot, audio (the one persistent audio manager), world
  debug.js            ?debug=1 tools
assets/               maps, interiors, characters, animals, items, props, UI, music, sounds, minigame art
```

## Audio
All music and sound goes through one `AudioScene` (`js/scenes/audio_scene.js`), launched once from Boot
and never stopped. Other code only emits `audio:music`, `audio:sfx`, `audio:loop` events.

## Debug mode (`?debug=1`)
- Collision grid (red), exits (cyan), spots (magenta), arrivals (green), talk-from tiles (yellow).
- F1 beach items · F2 forest items · F3 blossom items · F4 plains items.
- Buttons: teleports to every map, interior and ending map; every minigame; gate panel; letter; credits;
  "4 fragments + 24 flowers" to try the gate and the ending.
- URL shortcuts: `&map=beach&x=23&y=47&dir=up` jumps straight in, `&fresh=1` starts a clean save,
  `&grid=0` hides the overlay, `&mini=Whack|Sled|Sleeves|Shuffle` opens a minigame.

## Hooks for later
- The cabin keeper's own interior (`js/story/forest.js`, TODO).
- The gramophone can play one of Eevie's tracks once one exists (`js/story/blossom.js`).
