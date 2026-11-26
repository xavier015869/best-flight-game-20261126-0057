// Screenshot staging: ?shot=start|play|ring|end (&seed=1) freezes the game in
// a chosen, fully deterministic moment so the four screenshots are real
// renders of the game's own code, reproducible on any machine.
//
//   start — the title screen: the plane parked on the runway at golden hour.
//   play  — mid-flight, banking toward the next ring, instruments lit.
//   ring  — a close pass: the plane centred in the next ring's glow.
//   end   — the debrief screen after the course is finished.
//
// When a shot is active the loop renders exactly one frozen frame and then
// stops advancing time, so a screenshot never catches a half-drawn frame.

import { CONFIG } from './config.js';
import { nextRing, terrainHeight } from './world.js';

export const SHOTS = ['start', 'play', 'ring', 'end'];

export function shotFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  const seed = Number.parseInt(q.get('seed') ?? '', 10);
  return {
    shot: SHOTS.includes(shot) ? shot : null,
    seed: Number.isFinite(seed) ? seed : CONFIG.courseSeed,
  };
}

// Returns a frozen view-model for the requested shot, or null when no shot
// was requested. The caller renders it once and never advances the clock.
export function frozenShot(shot, world, plane) {
  if (!shot) return null;
  const ring = nextRing(world);
  switch (shot) {
    case 'start': {
      // Parked on the runway, nose to the course, engine idling.
      plane.x = 0;
      plane.y = -60;
      plane.z = terrainHeight(world, 0, -60) + 3.2;
      plane.heading = 0;
      plane.pitch = 0;
      plane.roll = 0;
      plane.speed = 0;
      plane.throttle = 0.25;
      return {
        state: 'title',
        time: 0.6,
        message: null,
        banner: {
          title: 'MERIDIAN RUN',
          sub: 'Ring rally over the Coral Isles — fly every ring, beat the clock',
          hint: 'Arrow keys or WASD to fly · Shift throttle up · Q throttle down · P pause',
        },
      };
    }
    case 'play': {
      // Mid-course, on final approach to the third ring, banked into the turn.
      // Rings 1 and 2 are already flown, so the gold ring ahead is ring 3.
      world.rings[0].passed = true;
      world.rings[1].passed = true;
      const target = world.rings[2];
      plane.x = target.x - 90;
      plane.y = target.y - 260;
      plane.z = target.z + 12;
      plane.heading = Math.atan2(target.x - plane.x, target.y - plane.y);
      plane.pitch = 0.1;
      plane.roll = 0.5;
      plane.speed = 68;
      plane.throttle = 0.72;
      plane.fuel = 78;
      return {
        state: 'playing',
        time: 2.4,
        score: 200,
        ringsHit: 2,
        timeLeft: 118,
        message: null,
        banner: null,
      };
    }
    case 'ring': {
      // Threading the fourth ring: the plane is dead centre in the glow.
      // Rings 1–3 are already flown, so the gold ring ahead is ring 4, and
      // the plane rides 21 m above the ring's centre so the ring's projected
      // centre lands exactly on the plane's screen position.
      world.rings[0].passed = true;
      world.rings[1].passed = true;
      world.rings[2].passed = true;
      const target = world.rings[3];
      plane.x = target.x - 42;
      plane.y = target.y - 150;
      plane.z = target.z + 21;
      plane.heading = Math.atan2(target.x - plane.x, target.y - plane.y);
      plane.pitch = 0;
      plane.roll = -0.18;
      plane.speed = 74;
      plane.throttle = 0.8;
      plane.fuel = 71;
      return {
        state: 'playing',
        time: 3.1,
        score: 300,
        ringsHit: 3,
        timeLeft: 112,
        message: { text: 'RING 4 — CLEAN PASS', sub: '+100 · streak ×3', color: '#ffc53d' },
        banner: null,
      };
    }
    case 'end': {
      // Debrief after a finished course: the plane turns back south so the
      // archipelago fills the backdrop instead of empty sea.
      const last = world.rings[world.rings.length - 1];
      plane.x = last.x;
      plane.y = last.y + 260;
      plane.z = last.z + 40;
      plane.heading = Math.PI;
      plane.pitch = 0.06;
      plane.roll = 0;
      plane.speed = 55;
      plane.throttle = 0.4;
      plane.fuel = 22;
      for (const r of world.rings) r.passed = true;
      return {
        state: 'complete',
        time: 4.2,
        score: 1840,
        ringsHit: 16,
        timeLeft: 23,
        message: null,
        banner: {
          title: 'COURSE COMPLETE',
          lines: ['16 / 16 rings · 1,840 points', 'Best pilot of the Coral Isles — press R to fly again'],
        },
      };
    }
    default:
      return null;
  }
}
