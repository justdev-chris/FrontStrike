export const C2S = {
  JOIN: 'join',
  INPUT: 'input',
  SHOOT: 'shoot',
  VOTE_MODE: 'voteMode',
  VOTE_MAP: 'voteMap',
  RESPAWN: 'respawn',
  SET_NAME: 'setName',
  EMOTE: 'emote',
  ADMIN_ACTION: 'adminAction',
};

export const S2C = {
  WELCOME: 'welcome',
  MAP_CHANGE: 'mapChange',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  SNAPSHOT: 'snapshot',
  SHOT: 'shot',
  DAMAGE: 'damage',
  DEATH: 'death',
  RESPAWN: 'respawn',
  MATCH_STATE: 'matchState',
  KILLFEED: 'killfeed',
  EMOTE: 'emote',
  STREAK: 'streak',
  HEALTH_PACK: 'healthPack',
  PROJECTILE_SPAWN: 'projectileSpawn',
  PROJECTILE_UPDATE: 'projectileUpdate',
  PROJECTILE_END: 'projectileEnd',
  EXPLOSION: 'explosion',
  ANNOUNCE: 'announce',
  ADMIN_RESULT: 'adminResult',
  AFFECTED: 'affected',
};

export const EMOTES = {
  wave:  { id: 'wave',  name: 'Wave',  durationMs: 3000 },
  dance: { id: 'dance', name: 'Dance', durationMs: 4000 },
  taunt: { id: 'taunt', name: 'Taunt', durationMs: 3000 },
  point: { id: 'point', name: 'Point', durationMs: 2500 },
};

export const EMOTE_KEYS = {
  Digit5: 'wave',
  Digit6: 'dance',
  Digit7: 'taunt',
  Digit8: 'point',
};

export const STREAKS = {
  3: 'KILLING SPREE',
  5: 'RAMPAGE',
  7: 'DOMINATING',
  10: 'UNSTOPPABLE',
};

export const ADMIN_ACTIONS = {
  KICK: 'kick',
  SLAP: 'slap',
  TELEPORT: 'teleport',
  GIVE_WEAPON: 'giveWeapon',
  ANNOUNCE: 'announce',
};

export function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    team: p.team,
    x: p.x, y: p.y, z: p.z,
    yaw: p.yaw,
    pitch: p.pitch,
    health: p.health,
    alive: p.alive,
    kills: p.kills,
    deaths: p.deaths,
    weaponId: p.weaponId,
    aiming: p.aiming,
    emote: p.emote,
    streak: p.streak || 0,
    sliding: !!p.sliding,
    isAdmin: !!p.isAdmin,
  };
}

export function publicMap(map) {
  return {
    id: map.id,
    name: map.name,
    mapSize: map.mapSize,
    obstacles: map.obstacles,
    healthPacks: map.healthPacks || [],
  };
}

export function publicHealthPack(hp) {
  return {
    id: hp.id,
    x: hp.x,
    y: hp.y,
    z: hp.z,
    active: hp.active,
  };
}

export function publicProjectile(pr) {
  return {
    id: pr.id,
    ownerId: pr.ownerId,
    weaponId: pr.weaponId,
    x: pr.x, y: pr.y, z: pr.z,
    vx: pr.vx, vy: pr.vy, vz: pr.vz,
  };
}