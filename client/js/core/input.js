const keys = new Set();
let mouseDX = 0;
let mouseDY = 0;
let locked = false;
let firing = false;
let mouseAiming = false;
let toggleAiming = false;
let scoreboardHeld = false;

let reloadRequested = false;
let pendingSwitch = null;
let pendingEmote = null;

const MAX_DELTA = 100;

const WEAPON_KEYS = {
  Digit1: 'rifle',
  Digit2: 'smg',
  Digit3: 'shotgun',
  Digit4: 'sniper',
  Digit5: 'pistol',
  Digit0: 'rpg',
};

const EMOTE_KEYS = {
  Digit6: 'wave',
  Digit7: 'dance',
  Digit8: 'taunt',
  Digit9: 'point',
};

export function init() {
  window.addEventListener('keydown', (e) => {
    // toggle aim with Q
    if (e.code === 'KeyQ') {
      e.preventDefault();
      toggleAiming = !toggleAiming;
      return;
    }

    keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'Tab') {
      e.preventDefault();
      scoreboardHeld = true;
    }
    if (e.code === 'KeyR') {
      reloadRequested = true;
    }
    if (WEAPON_KEYS[e.code]) {
      pendingSwitch = WEAPON_KEYS[e.code];
    }
    if (EMOTE_KEYS[e.code]) {
      pendingEmote = EMOTE_KEYS[e.code];
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
    mouseAiming = false;
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
    if (e.button === 2) mouseAiming = true;
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) firing = false;
    if (e.button === 2) mouseAiming = false;
  });

  document.addEventListener('contextmenu', (e) => {
    if (locked) e.preventDefault();
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === document.body;
    if (!locked) {
      firing = false;
      mouseAiming = false;
    }
  });

  document.addEventListener('pointerlockerror', () => {
    locked = false;
    window.dispatchEvent(new CustomEvent('fs-lock-failed'));
  });
}

export function lock() {
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
    crouch: keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC'),
    fire: firing,
    aim: mouseAiming || toggleAiming,
    reload: reloadRequested,
    switchWeapon: pendingSwitch,
    emote: pendingEmote,
    dx: mouseDX,
    dy: mouseDY,
  };

  if (keys.has('KeyW')) s.forward += 1;
  if (keys.has('KeyS')) s.forward -= 1;
  if (keys.has('KeyD')) s.right += 1;
  if (keys.has('KeyA')) s.right -= 1;

  mouseDX = 0;
  mouseDY = 0;
  reloadRequested = false;
  pendingSwitch = null;
  pendingEmote = null;

  return s;
}
