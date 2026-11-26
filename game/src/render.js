// The chase view: a perspective camera trailing the plane over the coral sea.
// Everything is drawn with the canvas 2D API — no images, no assets — so the
// game loads from static files with zero network requests.

import { CONFIG } from './config.js';

const TAU = Math.PI * 2;

// Build the camera basis from the (smoothed) camera heading. Forward tilts
// slightly down so the horizon sits above the middle of the frame.
function cameraBasis(heading) {
  const fx = Math.sin(heading);
  const fy = Math.cos(heading);
  const fz = -0.14;
  const fl = Math.hypot(fx, fy, fz);
  const fwd = { x: fx / fl, y: fy / fl, z: fz / fl };
  // Right is horizontal, perpendicular to the heading.
  const right = { x: Math.cos(heading), y: -Math.sin(heading), z: 0 };
  // Up = right x fwd.
  const up = {
    x: right.y * fwd.z - right.z * fwd.y,
    y: right.z * fwd.x - right.x * fwd.z,
    z: right.x * fwd.y - right.y * fwd.x,
  };
  return { fwd, right, up };
}

// Project a world point to screen space. Returns null when behind the camera.
function project(cam, basis, p, w, h, focal) {
  const dx = p.x - cam.x;
  const dy = p.y - cam.y;
  const dz = p.z - cam.z;
  const f = dx * basis.fwd.x + dy * basis.fwd.y + dz * basis.fwd.z;
  if (f < 3) return null;
  const r = dx * basis.right.x + dy * basis.right.y + dz * basis.right.z;
  const u = dx * basis.up.x + dy * basis.up.y + dz * basis.up.z;
  const s = focal / f;
  return { x: w / 2 + r * s, y: h / 2 - u * s, s, f };
}

function skyGradient(ctx, w, h, horizonY) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, CONFIG.skyTop);
  g.addColorStop(Math.max(0, horizonY / h - 0.12), CONFIG.skyMid);
  g.addColorStop(Math.max(0.01, horizonY / h), CONFIG.skyLow);
  g.addColorStop(1, CONFIG.seaDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawSun(ctx, w, h, horizonY) {
  const sx = w * (0.5 + CONFIG.sunAzimuth * 0.42);
  const sy = horizonY - h * CONFIG.sunElevation * 1.4;
  const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 150);
  glow.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
  glow.addColorStop(0.25, 'rgba(255, 190, 110, 0.55)');
  glow.addColorStop(1, 'rgba(255, 160, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 160, sy - 160, 320, 320);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sx, sy, 26, 0, TAU);
  ctx.fill();
}

function drawCloud(ctx, proj, cloud, w, h, focal) {
  const p = project(proj.cam, proj.basis, cloud, w, h, focal);
  if (!p) return;
  const s = cloud.s * p.s;
  if (s < 2) return;
  ctx.fillStyle = cloud.warm ? 'rgba(255, 214, 170, 0.6)' : 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, s, s * 0.32, 0, 0, TAU);
  ctx.ellipse(p.x - s * 0.5, p.y + s * 0.08, s * 0.6, s * 0.26, 0, 0, TAU);
  ctx.ellipse(p.x + s * 0.55, p.y + s * 0.06, s * 0.55, s * 0.24, 0, 0, TAU);
  ctx.fill();
}

function drawIsland(ctx, proj, isl, w, h, focal) {
  // Beach rim: a bumpy ellipse at sea level.
  const rimPts = [];
  for (let i = 0; i < isl.rim.length; i++) {
    const a = (i / isl.rim.length) * TAU;
    const rr = isl.rim[i];
    const px = isl.cx + Math.cos(a) * isl.rx * rr;
    const py = isl.cy + Math.sin(a) * isl.ry * rr;
    const p = project(proj.cam, proj.basis, { x: px, y: py, z: 2 }, w, h, focal);
    if (p) rimPts.push(p);
  }
  if (rimPts.length < 3) return;
  ctx.fillStyle = CONFIG.sand;
  ctx.beginPath();
  ctx.moveTo(rimPts[0].x, rimPts[0].y);
  for (const p of rimPts) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fill();

  // Green interior, slightly smaller and higher.
  const inner = [];
  for (let i = 0; i < isl.rim.length; i++) {
    const a = (i / isl.rim.length) * TAU;
    const rr = isl.rim[i] * 0.78;
    const px = isl.cx + Math.cos(a) * isl.rx * rr;
    const py = isl.cy + Math.sin(a) * isl.ry * rr;
    const p = project(proj.cam, proj.basis, { x: px, y: py, z: 7 }, w, h, focal);
    if (p) inner.push(p);
  }
  if (inner.length >= 3) {
    ctx.fillStyle = CONFIG.hillGreen;
    ctx.beginPath();
    ctx.moveTo(inner[0].x, inner[0].y);
    for (const p of inner) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
  }

  // Hills: shaded triangles rising from the green.
  for (const hb of isl.hills) {
    const base = project(proj.cam, proj.basis, { x: hb.x, y: hb.y, z: 7 }, w, h, focal);
    const peak = project(proj.cam, proj.basis, { x: hb.x, y: hb.y, z: 7 + hb.h }, w, h, focal);
    if (!base || !peak) continue;
    const half = hb.r * base.s * 0.9;
    ctx.fillStyle = CONFIG.palmGreen;
    ctx.beginPath();
    ctx.moveTo(base.x - half, base.y);
    ctx.lineTo(peak.x, peak.y);
    ctx.lineTo(base.x + half, base.y);
    ctx.closePath();
    ctx.fill();
    // Sunlit flank.
    ctx.fillStyle = 'rgba(255, 220, 150, 0.35)';
    ctx.beginPath();
    ctx.moveTo(peak.x, peak.y);
    ctx.lineTo(base.x + half, base.y);
    ctx.lineTo(base.x, base.y);
    ctx.closePath();
    ctx.fill();
  }

  // Palm dots.
  ctx.fillStyle = '#1e5c33';
  for (const palm of isl.palms) {
    const p = project(proj.cam, proj.basis, { x: palm.x, y: palm.y, z: 9 }, w, h, focal);
    if (!p || p.s < 0.15) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.2, 2.2 * p.s), 0, TAU);
    ctx.fill();
  }
}

function drawRunway(ctx, proj, runway, w, h, focal) {
  // The strip is drawn in short segments along its length: the near end sits
  // behind the camera when the plane is parked on it, and a segment whose
  // corners are behind the camera is skipped instead of dropping the runway.
  const SEGMENTS = 10;
  const y0 = -110;
  const y1 = 230;
  for (let i = 0; i < SEGMENTS; i++) {
    const a = y0 + ((y1 - y0) * i) / SEGMENTS;
    const b = y0 + ((y1 - y0) * (i + 1)) / SEGMENTS;
    const pts = [
      { x: -13, y: a }, { x: 13, y: a },
      { x: 13, y: b }, { x: -13, y: b },
    ].map((c) => project(proj.cam, proj.basis, { x: c.x, y: c.y, z: 3 }, w, h, focal));
    if (pts.some((p) => !p || p.f < 30)) continue;
    ctx.fillStyle = i % 2 === 0 ? '#3a3f46' : '#34383f';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
  }
  // Centreline dashes, one per segment so the near ones survive too.
  ctx.strokeStyle = '#f6ead2';
  for (let i = 0; i < SEGMENTS; i++) {
    const a = y0 + ((y1 - y0) * i) / SEGMENTS + 8;
    const b = y0 + ((y1 - y0) * (i + 1)) / SEGMENTS - 8;
    const pa = project(proj.cam, proj.basis, { x: 0, y: a, z: 3.4 }, w, h, focal);
    const pb = project(proj.cam, proj.basis, { x: 0, y: b, z: 3.4 }, w, h, focal);
    if (!pa || !pb || pa.f < 30 || pb.f < 30) continue;
    ctx.lineWidth = Math.max(1, 2.5 * pa.s);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  // Threshold bars.
  ctx.fillStyle = '#f6ead2';
  for (const y of [-96, 206]) {
    const l = project(proj.cam, proj.basis, { x: -9, y, z: 3.4 }, w, h, focal);
    const r = project(proj.cam, proj.basis, { x: 9, y, z: 3.4 }, w, h, focal);
    if (l && r) ctx.fillRect(l.x, l.y - 2, r.x - l.x, 4);
  }
}

function drawRing(ctx, proj, ring, isNext, time, w, h, focal) {
  // Sample the torus circle in world space and project it: robust at any angle.
  const pts = [];
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const p = project(proj.cam, proj.basis, {
      x: ring.x + Math.cos(a) * ring.r,
      y: ring.y,
      z: ring.z + Math.sin(a) * ring.r,
    }, w, h, focal);
    if (p) pts.push(p);
  }
  if (pts.length < 6) return;
  const pulse = isNext ? 0.75 + 0.25 * Math.sin(time * 4) : 0.45;
  ctx.save();
  ctx.globalAlpha = isNext ? 0.95 : 0.5;
  ctx.strokeStyle = isNext ? CONFIG.ringGold : CONFIG.ringBlue;
  ctx.lineWidth = Math.max(2, 7 * pts[0].s);
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 18 * pulse;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  // Index label beneath the next ring, clear of the centre message above it.
  if (isNext) {
    const c = project(proj.cam, proj.basis, { x: ring.x, y: ring.y, z: ring.z - ring.r - 16 }, w, h, focal);
    if (c) {
      ctx.fillStyle = CONFIG.ringGold;
      ctx.font = `bold ${Math.max(13, 15 * c.s)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${ring.index + 1}`, c.x, c.y);
    }
  }
}

function drawPlane(ctx, w, h, plane, time) {
  // The aircraft sits in frame, slightly below centre, banking with roll.
  const px = w / 2;
  const py = h * 0.58 - plane.pitch * 60;
  const bank = plane.roll * 0.5;
  const scale = Math.min(w, h) / 720;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(bank);
  ctx.scale(scale, scale);
  const propA = time * 40;
  ctx.fillStyle = 'rgba(220, 225, 235, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, -6, 7, 46, propA % Math.PI, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -6, 7, 46, (propA % Math.PI) + Math.PI / 2, 0, TAU);
  ctx.fill();

  // Wings: broad, cream with red tips, set low on the fuselage so the tail
  // reads from behind.
  ctx.fillStyle = CONFIG.planeCream;
  ctx.beginPath();
  ctx.moveTo(-10, 2);
  ctx.lineTo(-122, 18);
  ctx.lineTo(-114, 34);
  ctx.lineTo(-8, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, 2);
  ctx.lineTo(122, 18);
  ctx.lineTo(114, 34);
  ctx.lineTo(8, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CONFIG.planeRed;
  ctx.fillRect(-122, 18, 14, 13);
  ctx.fillRect(108, 18, 14, 13);

  // Tail: a red fin and a wide cream stabiliser, the parts a chaser sees.
  ctx.fillStyle = CONFIG.planeRed;
  ctx.beginPath();
  ctx.moveTo(-7, 30);
  ctx.lineTo(-30, 58);
  ctx.lineTo(-22, 60);
  ctx.lineTo(0, 38);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(7, 30);
  ctx.lineTo(30, 58);
  ctx.lineTo(22, 60);
  ctx.lineTo(0, 38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CONFIG.planeCream;
  ctx.fillRect(-52, 48, 104, 9);

  // Fuselage: slim red body with a cream cheatline and a lit cockpit.
  ctx.fillStyle = CONFIG.planeRed;
  ctx.beginPath();
  ctx.ellipse(0, 8, 11, 46, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = CONFIG.planeCream;
  ctx.fillRect(-11, -2, 22, 5);
  ctx.fillStyle = '#9fd8ef';
  ctx.beginPath();
  ctx.ellipse(0, -18, 7, 13, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-3, -22, 3, 5, 0.3, 0, TAU);
  ctx.fill();
  // Nose cone and spinner.
  ctx.fillStyle = '#2b2f36';
  ctx.beginPath();
  ctx.ellipse(0, -38, 6, 8, 0, 0, TAU);
  ctx.fill();
  // Navigation lights, blinking.
  const blink = Math.sin(time * 6) > 0;
  if (blink) {
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.arc(-118, 19, 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4dff88';
    ctx.beginPath();
    ctx.arc(118, 19, 4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function renderScene(ctx, view) {
  const { world, plane, camHeading, time, w, h } = view;
  const focal = CONFIG.focal * (w / CONFIG.viewWidth);
  const basis = cameraBasis(camHeading);
  const cam = {
    x: plane.x - Math.sin(camHeading) * CONFIG.cameraBehind,
    y: plane.y - Math.cos(camHeading) * CONFIG.cameraBehind,
    z: plane.z + CONFIG.cameraAbove,
  };
  const proj = { cam, basis };

  // Horizon line: project a point far ahead at camera height.
  const horizonPt = project(cam, basis, {
    x: cam.x + Math.sin(camHeading) * 9000,
    y: cam.y + Math.cos(camHeading) * 9000,
    z: cam.z,
  }, w, h, focal);
  const horizonY = horizonPt ? horizonPt.y : h * 0.42;

  skyGradient(ctx, w, h, horizonY);
  drawSun(ctx, w, h, horizonY);

  // Sea: the lower gradient already covers it; add sun glitter.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#ffd9a0';
  ctx.lineWidth = 2;
  const glitterX = w * (0.5 + CONFIG.sunAzimuth * 0.42);
  for (let i = 0; i < 14; i++) {
    const gy = horizonY + 12 + i * i * 0.9 + ((i * 37) % 40);
    const gw = 26 + ((i * 53) % 60);
    if (gy > h) break;
    ctx.beginPath();
    ctx.moveTo(glitterX - gw / 2, gy);
    ctx.lineTo(glitterX + gw / 2, gy);
    ctx.stroke();
  }
  ctx.restore();

  // Clouds, far to near.
  const clouds = [...world.clouds].sort((a, b) => b.y - a.y);
  for (const c of clouds) drawCloud(ctx, proj, c, w, h, focal);

  // Islands, far to near.
  const islands = [...world.islands].sort((a, b) => b.cy - a.cy);
  for (const isl of islands) drawIsland(ctx, proj, isl, w, h, focal);

  drawRunway(ctx, proj, world.runway, w, h, focal);

  // Rings, far to near, next ring glowing gold.
  const rings = [...world.rings].sort((a, b) => b.y - a.y);
  for (const ring of rings) {
    if (ring.passed) continue;
    drawRing(ctx, proj, ring, view.nextRing === ring, time, w, h, focal);
  }

  // The plane's shadow on the sea far below: a soft dark ellipse that
  // shrinks and fades as the plane climbs, grounding it in the scene.
  const shadow = project(cam, basis, { x: plane.x, y: plane.y, z: 1.5 }, w, h, focal);
  if (shadow) {
    const fade = Math.max(0, 1 - plane.z / 260);
    ctx.fillStyle = `rgba(6, 20, 34, ${0.28 * fade})`;
    // The shadow is the plane's own wingspan (~11 m) projected at the sea's
    // distance, so it shrinks and fades as the plane climbs.
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, 5.5 * shadow.s + 4, 1.6 * shadow.s + 2, 0, 0, TAU);
    ctx.fill();
  }

  drawPlane(ctx, w, h, plane, time);
}
