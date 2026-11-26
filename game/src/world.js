// The world: a coral archipelago, one runway island, and a ring course that
// snakes through the islands. Everything is generated from CONFIG.courseSeed,
// so the world is identical on every load with the same seed.

import { CONFIG } from './config.js';
import { mulberry32, range } from './random.js';

// An island is an ellipse with a bumpy rim and a height profile built from
// two Gaussian hills, so its silhouette reads as land, not a flat disc.
function makeIsland(rng, cx, cy, rx, ry, peak) {
  const rim = [];
  const bumps = 9;
  for (let i = 0; i < bumps; i++) {
    rim.push(range(rng, 0.82, 1.18));
  }
  return {
    cx, cy, rx, ry, peak, rim,
    // Two hill centres, placed inside the island for the height function.
    hills: [
      { x: cx + range(rng, -rx * 0.35, rx * 0.35), y: cy + range(rng, -ry * 0.3, ry * 0.3), h: peak, r: Math.min(rx, ry) * 0.55 },
      { x: cx + range(rng, -rx * 0.4, rx * 0.4), y: cy + range(rng, -ry * 0.35, ry * 0.35), h: peak * 0.62, r: Math.min(rx, ry) * 0.45 },
    ],
    // Palm clusters: small dots drawn on the island's green.
    palms: Array.from({ length: Math.floor(rx / 26) + 3 }, () => ({
      x: cx + range(rng, -rx * 0.75, rx * 0.75),
      y: cy + range(rng, -ry * 0.7, ry * 0.7),
    })),
  };
}

export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const islands = [];

  // The home island holds the runway: long, flat, right on the course line.
  // Its hills sit well east and west of the strip, never on it — the plane
  // takes off northward over the sea, not into a hillside.
  const home = makeIsland(rng, 0, 130, 330, 260, 26);
  home.hills = [
    { x: -175, y: 150, h: 26, r: 130 },
    { x: 175, y: 110, h: 17, r: 105 },
  ];
  islands.push(home);

  // A chain of islands flanking the course so there is always land in view.
  const spots = [
    [-520, 900, 260, 200, 78], [480, 1150, 300, 220, 96],
    [-640, 1900, 340, 260, 120], [560, 2150, 280, 210, 88],
    [-420, 2900, 300, 230, 104], [620, 3200, 360, 250, 132],
    [-580, 3900, 320, 240, 110], [480, 4300, 300, 220, 92],
    [-460, 5000, 380, 280, 140], [540, 5400, 320, 240, 116],
    [-700, 5900, 420, 300, 150], [620, 6300, 360, 260, 128],
  ];
  for (const [x, y, rx, ry, peak] of spots) {
    islands.push(makeIsland(rng, x, y, rx, ry, peak));
  }

  // The runway: a strip on the home island, aligned with the course.
  const runway = {
    x: 0, y: 60, length: 340, width: 26, heading: 0,
    // World-space corners, computed once for the renderer.
    corners: [
      { x: -13, y: -110 }, { x: 13, y: -110 },
      { x: 13, y: 230 }, { x: -13, y: 230 },
    ],
  };

  // The ring course: a gentle slalom that weaves between the islands.
  // Rings alternate sides and heights so the pilot banks left and right.
  // Consecutive rings stay within a comfortable lateral step so the course
  // is always flyable at cruise speed.
  const rings = [];
  let side = -1;
  let prevX = 0;
  for (let i = 0; i < CONFIG.ringCount; i++) {
    side = -side;
    const y = CONFIG.ringFirstAt + i * CONFIG.ringSpacing;
    let x = side * range(rng, 60, 170) + range(rng, -24, 24);
    x = Math.max(prevX - 220, Math.min(prevX + 220, x));
    prevX = x;
    // Rings start low enough to catch straight off the runway and climb
    // gently along the course, so the opening ring is a fair first target.
    const z = 50 + i * 3 + range(rng, 0, 45) + (i % 4 === 3 ? 30 : 0);
    rings.push({ x, y, z, r: CONFIG.ringRadius, index: i, passed: false });
  }

  // Clouds drift far above the sea; a few low ones catch the sunset.
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: range(rng, -1600, 1600),
      y: range(rng, 300, 6800),
      z: range(rng, 320, 620),
      s: range(rng, 90, 260),
      warm: rng() < 0.55,
    });
  }

  return { islands, runway, rings, clouds, seed };
}

// Height of the land at a world point: 0 over the sea, the island profile
// over land. The crash check uses this.
//
// The runway strip is graded flat: the home island's hills would otherwise
// rise through the strip and make every takeoff end in the grass.
export function terrainHeight(world, x, y) {
  if (Math.abs(x) < 20 && y > -120 && y < 240) return 4;
  let h = 0;
  for (const isl of world.islands) {
    const dx = (x - isl.cx) / isl.rx;
    const dy = (y - isl.cy) / isl.ry;
    const d2 = dx * dx + dy * dy;
    if (d2 >= 1.35) continue;
    // Smooth falloff: full height inside, fading to the beach at the rim.
    const fall = Math.max(0, 1 - d2 / 1.35);
    let hill = 0;
    for (const hb of isl.hills) {
      const hx = (x - hb.x) / hb.r;
      const hy = (y - hb.y) / hb.r;
      hill += hb.h * Math.exp(-(hx * hx + hy * hy));
    }
    h = Math.max(h, hill * fall + 2.5 * fall);
  }
  return h;
}

// The next ring the pilot must fly through, or null when the course is done.
export function nextRing(world) {
  return world.rings.find((r) => !r.passed) ?? null;
}
