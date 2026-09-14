export const NET = {
  TICK_RATE: 30,
  SNAPSHOT_RATE: 20,
  INTERP_DELAY_MS: 100,
};

export const PLAYER = {
  EYE_HEIGHT: 1.7,
  RADIUS: 0.4,
  HEIGHT: 1.8,
  CROUCH_HEIGHT: 1.0,
  MOVE_SPEED: 6.5,
  SPRINT_MULT: 1.35,
  JUMP_VELOCITY: 7.5,
  GRAVITY: 22,
  MAX_HEALTH: 100,
  RESPAWN_MS: 3000,
};

export const SLIDE = {
  TRIGGER_MIN_SPEED: 5.5,        // must be moving at least this fast to start
  DURATION_MS: 700,
  INITIAL_BOOST: 1.55,           // velocity multiplier at slide start
  FRICTION: 0.94,                // per-tick decay
  MIN_SPEED_TO_KEEP: 2.0,        // slide ends if it drops below this
  CAMERA_DROP: 0.6,              // how much lower the camera is while sliding
  COOLDOWN_MS: 400,
};

export const REGEN = {
  DELAY_MS: 5000,                // no damage for this long before regen starts
  HP_PER_SEC: 10,
};

export const WEAPON = {
  NAME: 'rifle',
  DAMAGE_BODY: 25,
  DAMAGE_HEAD: 50,
  FIRE_RATE_MS: 120,
  RANGE: 200,
  COOLDOWN_MS: 120,
};

export const MATCH = {
  DURATION_MS: 10 * 60 * 1000,
  KILL_LIMIT: 30,
  VOTE_DURATION_MS: 15 * 1000,
  POST_MATCH_MS: 10 * 1000,
};

export const ADMIN = {
  NAME: 'justdev-chris',
};

export const NAME_TAGS = {
  MAX_DIST: 60,
  FADE_START: 40,
};