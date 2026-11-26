# best-flight-game-20261126-0057

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/xavier015869/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/xavier015869/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Meridian Run — Ring Rally over the Coral Isles.** A complete flight game that runs in a desktop browser from static files, no network request.

You fly a little red prop plane at golden hour over a coral archipelago: chase view over recognisable island terrain, the aircraft in frame with its instruments lit, a runway on the home island, and glowing target rings ahead. Altitude, speed and heading read on the HUD, with a compass strip, an artificial horizon, fuel and throttle gauges, and the clock.

## How to play

- **Goal:** fly all 16 gold rings before the 150-second clock runs out. Each ring scores 100 points plus a streak bonus, refunds fuel and adds 4 seconds.
- **Controls:** Arrow keys or WASD to pitch and bank, Shift throttle up, Q throttle down, mouse (hold left button) steers the nose, P pause, M mute.
- **Hazards:** the sea and the islands are both solid — fly into either and the flight is over. Fuel burns with throttle; rings are the only refuel.

## The game

- `game/` — the playable game: `index.html` plus ES modules under `game/src/` (one clear job each: flight model, world generation, chase-view renderer, HUD instruments, input, synthesized WebAudio, screenshot staging). No libraries, no images, no network: every pixel and sound is drawn or synthesized by the code.
- `screenshots/` — 4 real renders of the game's own code, staged with `?shot=start|play|ring|end&seed=1` so every shot is deterministic.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Play it locally

```sh
# serve game/ (any static server) and open http://localhost:8080
python3 -m http.server 8080 --directory game
# or: npx serve game
```

Play more make.fun bounties: https://make.fun/r/9d3wsaqp
