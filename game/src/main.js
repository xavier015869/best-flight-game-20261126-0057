// Meridian Run — the game loop, flight model and state machine.
//
// States: title → playing ⇄ paused → over (crash / out of time / out of fuel)
//       → complete (all 16 rings). R restarts from over/complete, Space or
// Enter starts from the title. The loop is fixed-step at 60 Hz so the flight
// model feels the same on every machine.

import { CONFIG } from './config.js';
import { buildWorld, terrainHeight, nextRing } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { renderScene } from './render.js';
import { drawHUD } from './hud.js';
import { shotFromUrl, frozenShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const audio = createAudio();
const input = createInput(canvas);

function freshPlane(world) {
  return {
    x: 0,
    y: -60,
    z: terrainHeight(world, 0, -60) + 3.2,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0.3,
    fuel: CONFIG.startFuel,
  };
}

function freshRun(seed) {
  const world = buildWorld(seed);
  return {
    world,
    plane: freshPlane(world),
    state: 'title',
    score: 0,
    ringsHit: 0,
    streak: 0,
    timeLeft: CONFIG.roundSeconds,
    time: 0,
    camHeading: 0,
    message: null,
    messageUntil: 0,
    best: Number.parseInt(localStorage.getItem('meridian-run-best') ?? '0', 10) || 0,
    frozen: null,
  };
}

let run = freshRun(CONFIG.courseSeed);

// A screenshot URL freezes one composed frame and never advances it.
const { shot, seed } = shotFromUrl();
if (shot) {
  const frozen = frozenShot(shot, run.world, run.plane);
  if (frozen) {
    run.frozen = frozen;
    run.state = frozen.state;
    run.time = frozen.time;
    run.score = frozen.score ?? 0;
    run.ringsHit = frozen.ringsHit ?? 0;
    run.timeLeft = frozen.timeLeft ?? CONFIG.roundSeconds;
    run.message = frozen.message && frozen.message.text ? frozen.message : null;
    run.camHeading = run.plane.heading;
  }
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function showMessage(text, sub, color, seconds = 2.2) {
  run.message = { text, sub, color };
  run.messageUntil = run.time + seconds;
}

function startRun() {
  const best = run.best;
  const seedNow = run.world.seed;
  run = freshRun(seedNow);
  run.best = best;
  run.state = 'playing';
  input.anyKey = false;
  input.started = false;
  audio.unlock();
  audio.click();
  showMessage('TAKEOFF — FLY THE RINGS', 'Follow the gold ring · mind the sea', '#ffb347', 3);
}

function endRun(kind) {
  run.state = kind === 'complete' ? 'complete' : 'over';
  run.overAt = run.time;
  // The debrief screen speaks for itself; a stale centre message would
  // print over its title.
  run.message = null;
  // Disarm the restart keys: without this the keypress that was already held
  // would restart the flight on the very next frame and hide the debrief.
  input.anyKey = false;
  input.started = false;
  if (run.score > run.best) {
    run.best = run.score;
    localStorage.setItem('meridian-run-best', String(run.best));
  }
  if (kind === 'complete') audio.fanfare();
  else audio.crash();
}

// One fixed step of the flight model.
function step(dt) {
  const p = run.plane;
  const w = run.world;

  // Throttle.
  if (input.throttleUp) p.throttle = Math.min(1, p.throttle + CONFIG.throttleStep * dt);
  if (input.throttleDown) p.throttle = Math.max(0, p.throttle - CONFIG.throttleStep * dt);

  // Mouse steering blends with the keys: pointing steers the nose.
  let pitchIn = input.pitch;
  let rollIn = input.roll;
  const mouse = input.mouseTarget();
  if (mouse) {
    rollIn = Math.max(-1, Math.min(1, mouse.x * 1.4));
    pitchIn = Math.max(-1, Math.min(1, -mouse.y * 1.2));
  }

  // Speed follows throttle. Below stall speed the wing cannot lift: the
  // nose stays level and the plane rolls along the ground instead of
  // mushing into the terrain — a held climb key must never bleed speed away.
  const targetSpeed = CONFIG.minSpeed + (CONFIG.maxSpeed - CONFIG.minSpeed) * p.throttle;
  p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.7);
  const stalled = p.speed < CONFIG.minSpeed + 4;

  // Pitch and bank ease toward the commanded values.
  p.pitch += (pitchIn * 0.32 - p.pitch) * Math.min(1, dt * 3.2);
  p.roll += (rollIn * CONFIG.maxBank - p.roll) * Math.min(1, dt * 3.6);

  // Heading follows bank; altitude follows pitch and speed.
  p.heading += -p.roll * CONFIG.turnRate * dt * (p.speed / CONFIG.cruiseSpeed);
  const climb = stalled ? 0 : p.pitch * CONFIG.climbRate * (p.speed / CONFIG.cruiseSpeed);
  const sink = (1 - p.throttle) * 2.2;
  p.z += (climb - sink) * dt;
  const groundNow = terrainHeight(w, p.x, p.y);
  if (stalled && p.z <= groundNow + 3.4) p.z = groundNow + 3.2; // rolling
  if (p.z < 4) p.z = 4;

  // Position.
  p.x += Math.sin(p.heading) * p.speed * dt;
  p.y += Math.cos(p.heading) * p.speed * dt;

  // Fuel: throttle burns it, rings refund some.
  p.fuel -= CONFIG.fuelDrain * (0.25 + p.throttle * 0.75) * dt;

  // Camera heading chases the plane heading, smoothed.
  let dh = p.heading - run.camHeading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  run.camHeading += dh * Math.min(1, dt * 2.4);

  // Ring pass: close to the centre plane of the next ring, inside its radius.
  const ring = nextRing(w);
  if (ring) {
    const dy = p.y - ring.y;
    if (Math.abs(dy) < 14) {
      const dx = p.x - ring.x;
      const dz = p.z - ring.z;
      if (Math.hypot(dx, dz) < ring.r) {
        ring.passed = true;
        run.ringsHit += 1;
        run.streak += 1;
        const gained = CONFIG.ringScore + CONFIG.streakBonus * (run.streak - 1);
        run.score += gained;
        run.timeLeft += CONFIG.ringTimeBonus;
        p.fuel = Math.min(100, p.fuel + CONFIG.fuelPerRing);
        audio.ring();
        showMessage(
          `RING ${ring.index + 1} — CLEAN PASS`,
          `+${gained} points · streak ×${run.streak}`,
          '#ffc53d',
        );
        if (run.ringsHit === CONFIG.ringCount) {
          endRun('complete');
          return;
        }
      } else if (Math.abs(dy) < 6) {
        // Flew past the ring plane without going through: streak breaks.
        run.streak = 0;
      }
    }
  }

  // Crash: terrain or the sea.
  const ground = terrainHeight(w, p.x, p.y);
  if (p.z <= ground + CONFIG.crashAltitude) {
    showMessage('CRASHED', 'You flew into the island', '#ff6b5e', 99);
    endRun('over');
    return;
  }

  // Clock and fuel.
  run.timeLeft -= dt;
  if (run.timeLeft <= 0) {
    run.timeLeft = 0;
    endRun('over');
    return;
  }
  if (p.fuel <= 0) {
    p.fuel = 0;
    showMessage('OUT OF FUEL', 'The engine quit over the sea', '#ff6b5e', 99);
    endRun('over');
  }
}

function drawTitle(ctx, w, h) {
  ctx.fillStyle = 'rgba(8, 12, 22, 0.42)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff3c4';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 16;
  ctx.fillText('MERIDIAN RUN', w / 2, h * 0.34);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd9a0';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('Ring rally over the Coral Isles', w / 2, h * 0.34 + 36);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Fly all 16 gold rings before the clock runs out. Rings refund fuel and time.', w / 2, h * 0.62);
  ctx.fillText('Arrow keys or WASD to fly · Shift / Q throttle · Mouse steers too · P pause · M mute', w / 2, h * 0.62 + 26);
  ctx.fillStyle = '#ffc53d';
  ctx.font = 'bold 20px system-ui, sans-serif';
  const blink = Math.sin(run.time * 3) > -0.2;
  if (blink) ctx.fillText('Press SPACE to take off', w / 2, h * 0.62 + 66);
  if (run.best > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(`Best score: ${run.best}`, w / 2, h * 0.62 + 96);
  }
}

function drawDebrief(ctx, w, h, complete) {
  ctx.fillStyle = 'rgba(8, 12, 22, 0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = complete ? '#7dffb0' : '#ff6b5e';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText(complete ? 'COURSE COMPLETE' : 'FLIGHT OVER', w / 2, h * 0.36);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText(`Score ${run.score}  ·  Rings ${run.ringsHit} / ${CONFIG.ringCount}  ·  Best ${run.best}`, w / 2, h * 0.36 + 44);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Press R to fly again', w / 2, h * 0.36 + 80);
}

function frame(now) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (run.frozen) {
    // Screenshot mode: render the frozen frame once and stop.
    renderScene(ctx, {
      world: run.world, plane: run.plane, camHeading: run.camHeading,
      time: run.time, w, h, nextRing: nextRing(run.world),
    });
    drawHUD(ctx, {
      w, h, plane: run.plane, score: run.score, ringsHit: run.ringsHit,
      timeLeft: run.timeLeft, state: run.state, message: run.message,
    });
    if (run.frozen.banner) {
      const b = run.frozen.banner;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(8, 12, 22, 0.45)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff3c4';
      ctx.font = 'bold 56px system-ui, sans-serif';
      ctx.fillText(b.title, w / 2, h * 0.34);
      if (b.sub) {
        ctx.fillStyle = '#ffd9a0';
        ctx.font = '600 19px system-ui, sans-serif';
        ctx.fillText(b.sub, w / 2, h * 0.34 + 34);
      }
      if (b.hint) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '15px system-ui, sans-serif';
        ctx.fillText(b.hint, w / 2, h * 0.62);
      }
      if (b.lines) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 20px system-ui, sans-serif';
        b.lines.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.34 + 44 + i * 30));
      }
    }
    return; // frozen: no animation loop
  }

  const dt = 1 / 60;
  run.time += dt;

  if (input.paused && run.state === 'playing') run.state = 'paused';
  else if (!input.paused && run.state === 'paused') run.state = 'playing';

  if (run.state === 'title' && (input.started || input.anyKey)) {
    startRun();
  } else if ((run.state === 'over' || run.state === 'complete') && input.anyKey) {
    // R or Space restarts, but only after the debrief has had a moment to read.
    if (input.started && run.time - (run.overAt ?? 0) > 0.8) {
      input.started = false;
      startRun();
    }
  }

  if (run.state === 'playing') step(dt);
  if (run.message && run.time > run.messageUntil) run.message = null;

  audio.engine(run.plane.throttle, run.plane.speed / CONFIG.maxSpeed);
  audio.setMuted(input.muted);

  renderScene(ctx, {
    world: run.world, plane: run.plane, camHeading: run.camHeading,
    time: run.time, w, h, nextRing: nextRing(run.world),
  });
  drawHUD(ctx, {
    w, h, plane: run.plane, score: run.score, ringsHit: run.ringsHit,
    timeLeft: run.timeLeft, state: run.state, message: run.message,
  });
  if (run.state === 'title') drawTitle(ctx, w, h);
  if (run.state === 'over' || run.state === 'complete') drawDebrief(ctx, w, h, run.state === 'complete');

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
