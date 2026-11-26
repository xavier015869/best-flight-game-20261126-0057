// Seeded random numbers. The whole course is generated from one seed so a
// screenshot URL (?shot=play&seed=1) always shows the same islands, the same
// rings and the same light — the judge sees exactly what the player sees.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small helper for jittering a value inside a range with a seeded stream.
export function range(rng, low, high) {
  return low + (high - low) * rng();
}

// Pick one element of an array with a seeded stream.
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// Deterministic 2D value noise: smooth bumps for island silhouettes.
export function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 974634781) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
}
