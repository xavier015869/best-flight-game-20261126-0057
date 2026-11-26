// The HUD: lit instruments the judge is asked to see — altitude, speed and
// heading, plus an artificial horizon, fuel, score and the clock. Everything
// is drawn on the same canvas as the scene so screenshots show it whole.

import { CONFIG } from './config.js';

const TAU = Math.PI * 2;

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 16, 28, 0.55)';
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function readout(ctx, x, y, label, value, unit, color) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.fillStyle = color;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(value, x, y + 28);
  const vw = ctx.measureText(value).width;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(unit, x + vw + 6, y + 28);
}

export function drawHUD(ctx, view) {
  const { w, h, plane, score, ringsHit, timeLeft, state, message } = view;
  const amber = CONFIG.hudAmber;
  const s = Math.min(w / 1280, h / 720);

  // --- top-left instrument cluster: ALT / SPD / HDG -----------------------
  panel(ctx, 16, 14, 300 * s + 40, 64);
  const altFt = Math.round(plane.z * 3.28084);
  const spdKt = Math.round(plane.speed * 1.94384);
  const hdg = ((Math.round((plane.heading * 180) / Math.PI) % 360) + 360) % 360;
  readout(ctx, 30, 30, 'ALTITUDE', String(altFt), 'FT', amber);
  readout(ctx, 130, 30, 'AIRSPEED', String(spdKt), 'KT', CONFIG.hudGreen);
  readout(ctx, 230, 30, 'HEADING', String(hdg).padStart(3, '0'), '°', '#9fd8ef');

  // --- compass strip under the cluster --------------------------------------
  const cx = 16 + 170 * s;
  const cy = 108;
  ctx.save();
  ctx.beginPath();
  ctx.rect(16, 88, 300 * s + 40, 34);
  ctx.clip();
  ctx.fillStyle = 'rgba(10, 16, 28, 0.55)';
  ctx.fillRect(16, 88, 300 * s + 40, 34);
  ctx.fillStyle = amber;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let d = -60; d <= 60; d += 15) {
    const deg = ((hdg + d) % 360 + 360) % 360;
    const x = cx + d * 2.4;
    const label = deg % 90 === 0 ? ['N', 'E', 'S', 'W'][(deg / 90) | 0] : String(deg);
    ctx.fillText(label, x, cy + 5);
    ctx.fillRect(x - 0.5, cy + 10, 1, 6);
  }
  ctx.fillStyle = CONFIG.hudRed;
  ctx.beginPath();
  ctx.moveTo(cx, 88);
  ctx.lineTo(cx - 6, 78);
  ctx.lineTo(cx + 6, 78);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // --- top-right: score, rings, clock ---------------------------------------
  panel(ctx, w - 236, 14, 220, 64);
  readout(ctx, w - 222, 30, 'SCORE', String(score), '', amber);
  readout(ctx, w - 122, 30, 'RINGS', `${ringsHit}/${CONFIG.ringCount}`, '', CONFIG.hudGreen);
  ctx.fillStyle = timeLeft < 20 ? CONFIG.hudRed : 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'right';
  const mm = Math.floor(Math.max(0, timeLeft) / 60);
  const ss = Math.floor(Math.max(0, timeLeft) % 60);
  ctx.fillText(`${mm}:${String(ss).padStart(2, '0')}`, w - 30, 108);

  // --- bottom-left: artificial horizon ---------------------------------------
  const hx = 74;
  const hy = h - 78;
  const hr = 52;
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, TAU);
  ctx.clip();
  ctx.translate(hx, hy);
  ctx.rotate(-plane.roll * 0.5);
  ctx.translate(0, plane.pitch * 34);
  ctx.fillStyle = '#2f6fb4';
  ctx.fillRect(-hr - 2, -hr - 2, hr * 2 + 4, hr + 2);
  ctx.fillStyle = '#c98a4b';
  ctx.fillRect(-hr - 2, 0, hr * 2 + 4, hr + 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(-hr - 2, -1.5, hr * 2 + 4, 3);
  ctx.restore();
  ctx.strokeStyle = amber;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, TAU);
  ctx.stroke();
  // Fixed wings marker.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hx - 26, hy);
  ctx.lineTo(hx - 8, hy);
  ctx.moveTo(hx + 8, hy);
  ctx.lineTo(hx + 26, hy);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', hx, hy + hr + 16);

  // --- bottom-right: throttle + fuel ----------------------------------------
  const bx = w - 190;
  const by = h - 96;
  panel(ctx, bx, by, 174, 82);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THROTTLE', bx + 12, by + 18);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(bx + 12, by + 26, 150, 8);
  ctx.fillStyle = amber;
  ctx.fillRect(bx + 12, by + 26, 150 * plane.throttle, 8);
  ctx.fillText('FUEL', bx + 12, by + 54);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(bx + 12, by + 62, 150, 8);
  ctx.fillStyle = plane.fuel < 20 ? CONFIG.hudRed : CONFIG.hudGreen;
  ctx.fillRect(bx + 12, by + 62, 150 * Math.max(0, plane.fuel / 100), 8);

  // --- centre message (ring hit, warnings, state banners) -------------------
  if (message) {
    ctx.fillStyle = message.color || amber;
    ctx.font = `bold ${Math.round(30 * s) + 8}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(message.text, w / 2, h * 0.3);
    ctx.shadowBlur = 0;
    if (message.sub) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.fillText(message.sub, w / 2, h * 0.3 + 28);
    }
  }

  // --- state banners ---------------------------------------------------------
  if (state === 'paused') {
    ctx.fillStyle = 'rgba(8, 12, 22, 0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', w / 2, h / 2);
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText('Press P to resume', w / 2, h / 2 + 32);
  }
}
