const keys = new Set();
let mouseDX = 0;
let mouseDY = 0;
let locked = false;
let firing = false;
let scoreboardHeld = false;

const MAX_DELTA = 100;

export function init() {
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'Tab') {
      e.preventDefault();
      scoreboardHeld = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'Tab') {
      scoreboardHeld = false;
    }
  });

  window.addEventListener('blur', () => {
    scoreboardHeld = false;
    keys.clear();
    firing = false;
  });

  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    let dx = e.movementX;
    let dy = e.movementY;
    if (dx >  MAX_DELTA) dx =  MAX_DELTA;
    if (dx < -MAX_DELTA) dx = -MAX_DELTA;
    if (dy >  MAX_DELTA) dy =  MAX_DELTA;
    if (dy < -MAX_DELTA) dy = -MAX_DELTA;
    mouseDX += dx;
    mouseDY += dy;
  });

  document.addEventListener('mousedown', (e) => {
    if (!locked) return;
    if (e.button === 0) firing = true;
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) firing = false;
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === document.body;
    if (!locked) firing = false;
  });

  document.addEventListener('pointerlockerror', () => {
    // browser refused the lock (usually cooldown after ESC); report it
    locked = false;
    window.dispatchEvent(new CustomEvent('fs-lock-failed'));
  });
}

export function lock() {
  // if we're already locked, don't spam the browser
  if (locked) return;
  const el = document.body;
  const req = el.requestPointerLock();
  if (req && typeof req.catch === 'function') {
    req.catch(() => {
      window.dispatchEvent(new CustomEvent('fs-lock-failed'));
    });
  }
}

export function unlock() {
  if (!locked) return;
  document.exitPointerLock();
}

export function isLocked() {
  return locked;
}

export function isScoreboardHeld() {
  return scoreboardHeld;
}

export function sample() {
  const s = {
    forward: 0,
    right: 0,
    jump: keys.has('Space'),
    sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    fire: firing,
    dx: mouseDX,
    dy: mouseDY,
  };

  if (keys.has('KeyW')) s.forward += 1;
  if (keys.has('KeyS')) s.forward -= 1;
  if (keys.has('KeyD')) s.right += 1;
  if (keys.has('KeyA')) s.right -= 1;

  mouseDX = 0;
  mouseDY = 0;
  return s;
}
