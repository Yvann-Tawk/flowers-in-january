# Jana's Garden — Definitive Edition

A cozy top-down Phaser 3 game. Jana wakes on June 18th, finds Eevie's note, and follows his trail
through the garden, Nowhere Beach and the Snowy Forest, collecting flowers (each one carries a poem)
and the guardians' cipher fragments. This branch is the first playable slice: Opening + Garden,
Area 1 (Phoebe) and Area 2 (Gilmour).

Plain JavaScript, Phaser 3.60.0 from the CDN, no build step. It runs as static files on GitHub Pages.

## Run locally
```
python3 -m http.server 8765
```
then open http://localhost:8765/ (add `?debug=1` for the debug tools).

## Controls
Arrows / WASD to move · E, Space or Enter to talk / advance · I for the bag · Esc to leave a minigame.
On touch screens: on-screen arrows, E and Bag buttons; tap the dialogue box to advance.

## Where things live
```
index.html            entry point + DOM UI (dialogue box, bag, note, poem, gate panel)
css/style.css         UI styles (9-slice frames are CSS border-images, pixelated)
data/placements.json  NPCs, props, spots, exits, arrivals per map (tile coordinates)
js/
  data.js             the 24 poems + intro lines (unchanged from the original game)
  config.js           tile size, area registry, items, flowers → poems, cipher
  dialogue.js         every line of this slice (verbatim from the dialogue doc) + the note
  state.js            flags, inventory, flowers, fragments, autosave (localStorage)
  audio.js            music crossfades, sound effects, synthesized chimes
  input.js            keyboard / touch router
  ui/                 HUD, dialogue box, poem, note, bag, gate panel, title, touch, fades
  world/              map builder (layers, draw-above, collision, props), actors, player
  story/              runner (scripts + NPC state machine) and garden / beach / forest logic
  minigames/          fishing, digging, whack-a-Phoebe, sled race
  scenes/             boot (asset loading) and the world scene
  debug.js            ?debug=1 tools
assets/               maps, characters, animals, items, props, UI, music, sounds, minigame art
```

## Debug mode (`?debug=1`)
- Collision grid (red), exits (cyan), spots (magenta), arrivals (green), talk-from tiles (yellow).
- F1 beach items · F2 forest items · F3 note + fragments 01 & 28 · F4 all four fragments (gate panel).
- Teleport buttons for every map / arrival, buttons to launch each minigame and the gate panel.
- URL shortcuts: `&map=beach&x=23&y=47&dir=up` jumps straight in, `&fresh=1` starts a clean save,
  `&grid=0` hides the overlay, `&mini=Whack` / `&mini=Sled` opens a minigame.

## Hooks for later builds
- `AREAS` in `js/config.js` lists Cherry Blossoms and Dark Plains (guardian, fragment, flowers) with `ready:false`.
- Fragment slots 3 and 4 (`fragment_calabar`, `fragment_spike`) and the full gate cipher are in place;
  `Story.handlers.garden.spot.gate` has a TODO where the ending starts.
- The cabin keeper's interior map: TODO in `js/story/forest.js`.
