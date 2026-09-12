export const MODES = ['dm', 'tdm'];

export const NET = {
  TICK_RATE: 30,
  SNAPSHOT_RATE: 20,
  INTERP_DELAY_MS: 100,
};

export const PLAYER = {
  EYE_HEIGHT: 1.7,
  RADIUS: 0.4,
  HEIGHT: 1.8,
  MOVE_SPEED: 6.5,
  SPRINT_MULT: 1.35,
  JUMP_VELOCITY: 7.5,
  GRAVITY: 22,
  MAX_HEALTH: 100,
  RESPAWN_MS: 3000,
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
