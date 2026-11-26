// Meridian Run — the hand-in program for best-flight-game-20261126-0057.
//
// It copies game/ and screenshots/ from beside this file into /output and
// writes /output/dossier.json with buildDossier from vendor/makefun-game.ts,
// exactly as the kit's competition.yaml describes. Outside the grader's
// container, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Node 22 standard library only; nothing is installed before it runs.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The game itself: static files under game/, every reference inside game/.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

// The screenshots: 3 or 4 real renders of the game's own code, the first by
// name being the cover the judge sees largest.
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier: the judge's view of the game — its screenshots and a text of
// its source, capped so the judge reads it in one call. The caps mirror the
// scorer's own limits (reference/gate.json): at most 4 screenshots of at
// most 256 KiB, at most 993 files and 48 MiB under game/, paths under 1,000
// bytes, and a dossier text of at most 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// A one-line receipt on stdout so a local run shows what it handed in.
console.log(`meridian-run: wrote game/ + screenshots/ + dossier.json to ${out}`);
