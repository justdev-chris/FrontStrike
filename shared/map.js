export const MAP_SIZE = 80;
export const WALL_HEIGHT = 8;

const B = (x, y, z, w, h, d, mat = 'concrete') =>
  ({ type: 'box', x, y, z, w, h, d, mat });

const R = (x, y, z, w, h, d, axis = 'x', dir = 1, mat = 'metal') =>
  ({ type: 'ramp', x, y, z, w, h, d, axis, dir, mat });

const S = (x, y, z, w, h, d, axis = 'x', dir = 1, steps = 4, mat = 'concrete') =>
  ({ type: 'stairs', x, y, z, w, h, d, axis, dir, steps, mat });

const perimeter = (mat = 'concrete') => [
  B(0,             WALL_HEIGHT / 2, -MAP_SIZE / 2, MAP_SIZE, WALL_HEIGHT, 1, mat),
  B(0,             WALL_HEIGHT / 2,  MAP_SIZE / 2, MAP_SIZE, WALL_HEIGHT, 1, mat),
  B(-MAP_SIZE / 2, WALL_HEIGHT / 2, 0,             1,        WALL_HEIGHT, MAP_SIZE, mat),
  B( MAP_SIZE / 2, WALL_HEIGHT / 2, 0,             1,        WALL_HEIGHT, MAP_SIZE, mat),
];

const SPAWNS_STANDARD = {
  red: [
    { x: -30, y: 0, z:  30, yaw: Math.PI * 0.75 },
    { x: -30, y: 0, z: -30, yaw: Math.PI * 0.25 },
    { x: -20, y: 0, z:   0, yaw: Math.PI / 2 },
    { x: -34, y: 0, z:   0, yaw: Math.PI / 2 },
  ],
  blue: [
    { x:  30, y: 0, z:  30, yaw: -Math.PI * 0.75 },
    { x:  30, y: 0, z: -30, yaw: -Math.PI * 0.25 },
    { x:  20, y: 0, z:   0, yaw: -Math.PI / 2 },
    { x:  34, y: 0, z:   0, yaw: -Math.PI / 2 },
  ],
  ffa: [
    { x: -30, y: 0, z:  30, yaw: Math.PI * 0.75 },
    { x:  30, y: 0, z:  30, yaw: -Math.PI * 0.75 },
    { x: -30, y: 0, z: -30, yaw: Math.PI * 0.25 },
    { x:  30, y: 0, z: -30, yaw: -Math.PI * 0.25 },
    { x:   0, y: 0, z:  35, yaw: Math.PI },
    { x:   0, y: 0, z: -35, yaw: 0 },
    { x:  35, y: 0, z:   0, yaw: -Math.PI / 2 },
    { x: -35, y: 0, z:   0, yaw: Math.PI / 2 },
  ],
};

const crossfire = {
  id: 'crossfire',
  name: 'Crossfire',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter('concrete'),
    B(0, 0.5, 0, 16, 1, 16, 'grate'),
    R(0, 0.0, -10, 4, 1, 4, 'z', -1, 'metal'),
    R(0, 0.0,  10, 4, 1, 4, 'z',  1, 'metal'),
    R(-10, 0.0, 0, 4, 1, 4, 'x', -1, 'metal'),
    R( 10, 0.0, 0, 4, 1, 4, 'x',  1, 'metal'),
    B(0, 4.5, 0, 14, 1, 14, 'grate'),
    R(-6, 1.0, -6, 3, 3.5, 3, 'x', -1, 'metal'),
    R( 6, 1.0,  6, 3, 3.5, 3, 'x',  1, 'metal'),
    B(-4, 2.0, 0, 1, 3, 14, 'metal'),
    B( 4, 2.0, 0, 1, 3, 14, 'metal'),
    B( 12, 0.75,  12, 3, 1.5, 3, 'wood'),
    B(-12, 0.75,  12, 3, 1.5, 3, 'wood'),
    B( 12, 0.75, -12, 3, 1.5, 3, 'wood'),
    B(-12, 0.75, -12, 3, 1.5, 3, 'wood'),
    S( 26, 0.0,  26, 8, 2, 4, 'z', -1, 6, 'concrete'),
    S(-26, 0.0,  26, 8, 2, 4, 'z', -1, 6, 'concrete'),
    S( 26, 0.0, -26, 8, 2, 4, 'z',  1, 6, 'concrete'),
    S(-26, 0.0, -26, 8, 2, 4, 'z',  1, 6, 'concrete'),
    B( 28, 2.5,  28, 5, 1, 5, 'metal'),
    B(-28, 2.5,  28, 5, 1, 5, 'metal'),
    B( 28, 2.5, -28, 5, 1, 5, 'metal'),
    B(-28, 2.5, -28, 5, 1, 5, 'metal'),
    B(  0, 4,  26, 2, 8, 2, 'metal'),
    B(  0, 4, -26, 2, 8, 2, 'metal'),
    B( 26, 4,   0, 2, 8, 2, 'metal'),
    B(-26, 4,   0, 2, 8, 2, 'metal'),
  ],
  spawns: SPAWNS_STANDARD,
  healthPacks: [
    { x:  14, y: 0, z:  14 },
    { x: -14, y: 0, z:  14 },
    { x:  14, y: 0, z: -14 },
    { x: -14, y: 0, z: -14 },
    { x:   0, y: 0, z:   0 },
  ],
};

const pillars = {
  id: 'pillars',
  name: 'Pillars',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter('sand'),
    B(0, -0.5, 0, MAP_SIZE, 1, MAP_SIZE, 'sand'),
    B(-18, 3, -18, 3, 6, 3, 'sand'),
    B( 18, 2, -18, 4, 4, 4, 'sand'),
    B(-18, 4,  18, 3, 8, 3, 'sand'),
    B( 18, 3,  18, 4, 6, 4, 'sand'),
    B( -8, 5, -22, 2, 10, 2, 'sand'),
    B(  8, 5, -22, 2, 10, 2, 'sand'),
    B( -8, 5,  22, 2, 10, 2, 'sand'),
    B(  8, 5,  22, 2, 10, 2, 'sand'),
    B(-22, 5,  -8, 2, 10, 2, 'sand'),
    B(-22, 5,   8, 2, 10, 2, 'sand'),
    B( 22, 5,  -8, 2, 10, 2, 'sand'),
    B( 22, 5,   8, 2, 10, 2, 'sand'),
    B(0, 3, 0, 6, 6, 6, 'panel'),
    B(0, 7.5, 0, 4, 3, 4, 'panel'),
    B(0, 10, 0, 2, 2, 2, 'panel'),
    R(-4, 0.0, 0, 3, 6, 4, 'x', -1, 'metal'),
    R( 4, 0.0, 0, 3, 6, 4, 'x',  1, 'metal'),
    B(0, 3.0, -30, 40, 1, 4, 'sand'),
    B(0, 3.0,  30, 40, 1, 4, 'sand'),
    B(-30, 3.0, 0, 4, 1, 40, 'sand'),
    B( 30, 3.0, 0, 4, 1, 40, 'sand'),
    S( 0, 0.0, -24, 4, 3, 6, 'z', -1, 6, 'sand'),
    S( 0, 0.0,  24, 4, 3, 6, 'z',  1, 6, 'sand'),
    S(-24, 0.0, 0, 6, 3, 4, 'x', -1, 6, 'sand'),
    S( 24, 0.0, 0, 6, 3, 4, 'x',  1, 6, 'sand'),
    B(-14, 0.75, 0, 3, 1.5, 3, 'wood'),
    B( 14, 0.75, 0, 3, 1.5, 3, 'wood'),
    B(0, 0.75, -14, 3, 1.5, 3, 'wood'),
    B(0, 0.75,  14, 3, 1.5, 3, 'wood'),
  ],
  spawns: SPAWNS_STANDARD,
  healthPacks: [
    { x:  14, y: 0, z:   0 },
    { x: -14, y: 0, z:   0 },
    { x:   0, y: 0, z:  14 },
    { x:   0, y: 0, z: -14 },
    { x:  24, y: 3, z:   0 },
    { x: -24, y: 3, z:   0 },
  ],
};

const bunker = {
  id: 'bunker',
  name: 'Bunker',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter('concrete'),
    B(-30, 3, -8, 12, 6, 1, 'concrete'),
    B(-30, 3,  8, 12, 6, 1, 'concrete'),
    B(-22, 3, -14, 1, 6, 6, 'concrete'),
    B(-22, 3,  14, 1, 6, 6, 'concrete'),
    B(-18, 3, -12, 1, 6, 8, 'concrete'),
    B(-18, 3,  12, 1, 6, 8, 'concrete'),
    B( 30, 3, -8, 12, 6, 1, 'concrete'),
    B( 30, 3,  8, 12, 6, 1, 'concrete'),
    B( 22, 3, -14, 1, 6, 6, 'concrete'),
    B( 22, 3,  14, 1, 6, 6, 'concrete'),
    B( 18, 3, -12, 1, 6, 8, 'concrete'),
    B( 18, 3,  12, 1, 6, 8, 'concrete'),
    B(0, 1.5, 0, 10, 3, 10, 'concrete'),
    B(0, 3.5, 0, 10, 1, 10, 'grate'),
    R(-7, 0.0, 0, 3, 3, 4, 'x', -1, 'metal'),
    R( 7, 0.0, 0, 3, 3, 4, 'x',  1, 'metal'),
    B( 14, 1,  14, 3, 2, 3, 'wood'),
    B(-14, 1,  14, 3, 2, 3, 'wood'),
    B( 14, 1, -14, 3, 2, 3, 'wood'),
    B(-14, 1, -14, 3, 2, 3, 'wood'),
    B(0, 4.5, -18, 3, 1, 16, 'metal'),
    B(0, 4.5,  18, 3, 1, 16, 'metal'),
    B(0, 2.25, -18, 1, 4.5, 1, 'metal'),
    B(0, 2.25,  18, 1, 4.5, 1, 'metal'),
    S(-6, 0.0, -26, 3, 4.5, 6, 'z', -1, 8, 'metal'),
    S( 6, 0.0,  26, 3, 4.5, 6, 'z',  1, 8, 'metal'),
  ],
  spawns: SPAWNS_STANDARD,
  healthPacks: [
    { x: -26, y: 0, z:   0 },
    { x:  26, y: 0, z:   0 },
    { x:   0, y: 0, z: -22 },
    { x:   0, y: 0, z:  22 },
    { x:   0, y: 4.5, z: 0 },
  ],
};

const tower = {
  id: 'tower',
  name: 'Tower',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter('panel'),
    B(-5.5, 2, 0, 1, 4, 12, 'panel'),
    B( 5.5, 2, 0, 1, 4, 12, 'panel'),
    B(0, 2, -5.5, 10, 4, 1, 'panel'),
    B(-3.5, 2, 5.5, 3, 4, 1, 'panel'),
    B( 3.5, 2, 5.5, 3, 4, 1, 'panel'),
    B(0, 4.25, 0, 12, 0.5, 12, 'grate'),
    B(-4.5, 6, 0, 1, 3, 10, 'panel'),
    B( 4.5, 6, 0, 1, 3, 10, 'panel'),
    B(0, 6, -4.5, 10, 3, 1, 'panel'),
    B(0, 6,  4.5, 10, 3, 1, 'panel'),
    B(0, 8.0, 0, 10, 0.5, 10, 'metal'),
    R( 0, 0.0, -8, 8, 4, 3, 'x',  1, 'metal'),
    R( 8, 2.0,  0, 3, 4, 8, 'z',  1, 'metal'),
    R( 0, 4.0,  8, 8, 4, 3, 'x', -1, 'metal'),
    R(-8, 6.0,  0, 3, 4, 8, 'z', -1, 'metal'),
    B( 20, 1,  0, 4, 2, 2, 'panel'),
    B(-20, 1,  0, 4, 2, 2, 'panel'),
    B( 0, 1,  20, 2, 2, 4, 'panel'),
    B( 0, 1, -20, 2, 2, 4, 'panel'),
    B( 18, 1,  18, 6, 2, 1, 'panel'),
    B(-18, 1,  18, 6, 2, 1, 'panel'),
    B( 18, 1, -18, 6, 2, 1, 'panel'),
    B(-18, 1, -18, 6, 2, 1, 'panel'),
  ],
  spawns: SPAWNS_STANDARD,
  healthPacks: [
    { x:  20, y: 0, z:   0 },
    { x: -20, y: 0, z:   0 },
    { x:   0, y: 0, z:  20 },
    { x:   0, y: 0, z: -20 },
    { x:   0, y: 4.5, z: 0 },
  ],
};

export const MAPS = {
  crossfire,
  pillars,
  bunker,
  tower,
};

export const DEFAULT_MAP = 'crossfire';

export function getMap(id) {
  return MAPS[id] || MAPS[DEFAULT_MAP];
}