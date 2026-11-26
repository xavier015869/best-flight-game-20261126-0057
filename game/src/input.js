// Input: keyboard, mouse steering and a pause/mute row. The game never needs
// more than the arrow keys (or WASD) plus throttle keys, so it plays on any
// desktop keyboard; the mouse steers by pointing where the nose should go.

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, active: false, inside: false };

  const state = {
    pitch: 0, // -1 (nose down) .. +1 (nose up)
    roll: 0, // -1 (bank left) .. +1 (bank right)
    throttleUp: false,
    throttleDown: false,
    paused: false,
    muted: false,
    started: false, // becomes true on the first steering key
    anyKey: false,
  };

  function recompute() {
    const up = keys.has('ArrowUp') || keys.has('KeyW');
    const down = keys.has('ArrowDown') || keys.has('KeyS');
    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    state.pitch = (up ? 1 : 0) - (down ? 1 : 0);
    state.roll = (right ? 1 : 0) - (left ? 1 : 0);
    state.throttleUp = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyE');
    state.throttleDown = keys.has('KeyQ') || keys.has('ControlLeft');
    if (up || down || left || right) state.started = true;
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      state.anyKey = true;
      state.started = true;
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyP') {
      state.paused = !state.paused;
      return;
    }
    if (e.code === 'KeyM') {
      state.muted = !state.muted;
      return;
    }
    if (e.code === 'Enter') {
      state.anyKey = true;
      state.started = true;
      return;
    }
    keys.add(e.code);
    state.anyKey = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    recompute();
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    recompute();
  });

  // Mouse: hold the left button and the nose chases the pointer.
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = (e.clientY - rect.top) / rect.height;
    mouse.inside = true;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouse.active = true;
      state.started = true;
    }
  });
  window.addEventListener('mouseup', () => {
    mouse.active = false;
  });
  canvas.addEventListener('mouseleave', () => {
    mouse.inside = false;
    mouse.active = false;
  });

  // Expose the pointer target so the flight model can steer toward it.
  state.mouseTarget = () => {
    if (!mouse.active || !mouse.inside) return null;
    return { x: (mouse.x - 0.5) * 2, y: (mouse.y - 0.5) * 2 };
  };

  return state;
}
