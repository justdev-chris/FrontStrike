const keys = new Set();
let mouseDX = 0;
let mouseDY = 0;
let locked = false;
let firing = false;

export function init() {
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    mouseDX += e.movementX;
    mouseDY += e.movementY;
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
  });
}

export function lock() {
  document.body.requestPointerLock();
}

export function unlock() {
  document.exitPointerLock();
}

export function isLocked() {
  return locked;
}

// returns the current frame's input + clears mouse deltas
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
