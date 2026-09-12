export const C2S = {
  JOIN: 'join',
  INPUT: 'input',
  SHOOT: 'shoot',
  VOTE_MODE: 'voteMode',
  VOTE_MAP: 'voteMap',
  RESPAWN: 'respawn',
  SET_NAME: 'setName',
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
  };
}

export function publicMap(map) {
  return {
    id: map.id,
    name: map.name,
    mapSize: map.mapSize,
    obstacles: map.obstacles,
  };
}
