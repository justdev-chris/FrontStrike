export const MAP_SIZE = 120;
export const WALL_HEIGHT = 10;

const B = (x, y, z, w, h, d, mat = 'concrete') =>
  ({ type: 'box', x, y, z, w, h, d, mat });

const R = (x, y, z, w, h, d, axis = 'x', dir = 1, mat = 'metal') =>
  ({ type: 'ramp', x, y, z, w, h, d, axis, dir, mat });

const S = (x, y, z, w, h, d, axis = 'x', dir = 1, steps = 4, mat = 'concrete') =>
  ({ type: 'stairs', x, y, z, w, h, d, axis, dir, steps, mat });

const perimeter = (mat = 'concrete') => [
  B(0, WALL_HEIGHT / 2, -MAP_SIZE / 2, MAP_SIZE, WALL_HEIGHT, 1, mat),
  B(0, WALL_HEIGHT / 2,  MAP_SIZE / 2, MAP_SIZE, WALL_HEIGHT, 1, mat),
  B(-MAP_SIZE / 2, WALL_HEIGHT / 2, 0, 1, WALL_HEIGHT, MAP_SIZE, mat),
  B( MAP_SIZE / 2, WALL_HEIGHT / 2, 0, 1, WALL_HEIGHT, MAP_SIZE, mat),
];

// ---------- Crossfire (4-fold symmetric, two floors, mid tunnel) ----------
const crossfire = {
  id: 'crossfire',
  name: 'Crossfire',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter('concrete'),

    // Ground mid platform
    B(0, 0.5, 0, 24, 1, 24, 'grate'),
    R(0, 0.0, -15, 6, 1, 6, 'z', -1, 'metal'),
    R(0, 0.0,  15, 6, 1, 6, 'z',  1, 'metal'),
    R(-15, 0.0, 0, 6, 1, 6, 'x', -1, 'metal'),
    R( 15, 0.0, 0, 6, 1, 6, 'x',  1, 'metal'),

    // Upper mid
    B(0, 4.5, 0, 20, 1, 20, 'grate'),
    R(-8, 1.0, -8, 4, 3.5, 4, 'x', -1, 'metal'),
    R( 8, 1.0,  8, 4, 3.5, 4, 'x',  1, 'metal'),

    // Tunnel through mid
    B(-6, 2.0, 0, 1, 3, 20, 'metal'),
    B( 6, 2.0, 0, 1, 3, 20, 'metal'),

    // Mid crates
    B( 18, 0.75,  18, 3, 1.5, 3, 'wood'),
    B(-18, 0.75,  18, 3, 1.5, 3, 'wood'),
    B( 18, 0.75, -18, 3, 1.5, 3, 'wood'),
    B(-18, 0.75, -18, 3, 1.5, 3, 'wood'),

    // Corner platforms with stairs
    S( 40, 0.0,  40, 10, 3, 5, 'z', -1, 8, 'concrete'),
    S(-40, 0.0,  40, 10, 3, 5, 'z', -1, 8, 'concrete'),
    S( 40, 0.0, -40, 10, 3, 5, 'z',  1, 8, 'concrete'),
    S(-40, 0.0, -40, 10, 3, 5, 'z',  1, 8, 'concrete'),
    B( 44, 3.5,  44, 6, 1, 6, 'metal'),
    B(-44, 3.5,  44, 6, 1, 6, 'metal'),
    B( 44, 3.5, -44, 6, 1, 6, 'metal'),
    B(-44, 3.5, -44, 6, 1, 6, 'metal'),

    // Outer cover, low walls
    B( 30, 1,   0, 8, 2, 2, 'wood'),
    B(-30, 1,   0, 8, 2, 2, 'wood'),
    B(  0, 1,  30, 2, 2, 8, 'wood'),
    B(  0, 1, -30, 2, 2, 8, 'wood'),

    // Cardinal pillars
    B(  0, 5,  38, 2, 10, 2, 'metal'),
    B(  0, 5, -38, 2, 10, 2, 'metal'),
    B( 38, 5,   0, 2, 10, 2, 'metal'),
    B(-38, 5,   0, 2, 10, 2, 'metal'),

    // Side lanes cover
    B( 26, 1,  26, 4, 2, 4, 'wood'),
    B(-26, 1,  26, 4, 2, 4, 'wood'),
    B( 26, 1, -26, 4, 2, 4, 'wood'),
    B(-26, 1, -26, 4, 2, 4, 'wood'),
  ],
  spawns: {
    red: [
      { x: -45, y: 0, z:  45, yaw: Math.PI * 0.75 },
      { x: -45, y: 0, z: -45, yaw: Math.PI * 0.25 },
      { x: -30, y: 0, z:   0, yaw: Math.PI / 2 },
      { x: -50, y: 0, z:   0, yaw: Math.PI / 2 },
    ],
    blue: [
      { x:  45, y: 0, z:  45, yaw: -Math.PI * 0.75 },
      { x:  45, y: 0, z: -45, yaw: -Math.PI * 0.25 },
      { x:  30, y: 0, z:   0, yaw: -Math.PI / 2 },
      { x:  50, y: 0, z:   0, yaw: -Math.PI / 2 },
    ],
    ffa: [
      { x: -45, y: 0, z:  45, yaw: Math.PI * 0.75 },
      { x:  45, y: 0, z:  45, yaw: -Math.PI * 0.75 },
      { x: -45, y: 0, z: -45, yaw: Math.PI * 0.25 },
      { x:  45, y: 0, z: -45, yaw: -Math.PI * 0.25 },
      { x:   0, y: 0, z:  52, yaw: Math.PI },
      { x:   0, y: 0, z: -52, yaw: 0 },
      { x:  52, y: 0, z:   0, yaw: -Math.PI / 2 },
      { x: -52, y: 0, z:   0, yaw: Math.PI / 2 },
    ],
  },
  healthPacks: [
    { x:  20, y: 0, z:   0 },
    { x: -20, y: 0, z:   0 },
    { x:   0, y: 0, z:  20 },
    { x:   0, y: 0, z: -20 },
    { x:  42, y: 3.5, z:  42 },
    { x: -42, y: 3.5, z:  42 },
    { x:  42, y: 3.5, z: -42 },
    { x: -42, y: 3.5, z: -42 },
  ],
};

// ---------- Pillars (desert, outer ring, central obelisk) ----------
const pillars = {
  id: 'pillars',
  name: 'Pillars',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter('sand'),
    B(0, -0.5, 0, MAP_SIZE, 1, MAP_SIZE, 'sand'),

    // Inner pillar cluster
    B(-26, 4, -26, 4, 8, 4, 'sand'),
    B( 26, 3, -26, 5, 6, 5, 'sand'),
    B(-26, 5,  26, 4, 10, 4, 'sand'),
    B( 26, 4,  26, 5, 8, 5, 'sand'),

    B(-12, 6, -32, 3, 12, 3, 'sand'),
    B( 12, 6, -32, 3, 12, 3, 'sand'),
    B(-12, 6,  32, 3, 12, 3, 'sand'),
    B( 12, 6,  32, 3, 12, 3, 'sand'),
    B(-32, 6, -12, 3, 12, 3, 'sand'),
    B(-32, 6,  12, 3, 12, 3, 'sand'),
    B( 32, 6, -12, 3, 12, 3, 'sand'),
    B( 32, 6,  12, 3, 12, 3, 'sand'),

    // Center obelisk
    B(0, 4, 0, 8, 8, 8, 'panel'),
    B(0, 10, 0, 5, 4, 5, 'panel'),
    B(0, 13, 0, 3, 2, 3, 'panel'),
    R(-6, 0.0, 0, 4, 8, 5, 'x', -1, 'metal'),
    R( 6, 0.0, 0, 4, 8, 5, 'x',  1, 'metal'),

    // Outer ring walkway
    B(0, 4.0, -48, 60, 1, 5, 'sand'),
    B(0, 4.0,  48, 60, 1, 5, 'sand'),
    B(-48, 4.0, 0, 5, 1, 60, 'sand'),
    B( 48, 4.0, 0, 5, 1, 60, 'sand'),

    // Ring access stairs
    S( 0, 0.0, -40, 5, 4, 8, 'z', -1, 8, 'sand'),
    S( 0, 0.0,  40, 5, 4, 8, 'z',  1, 8, 'sand'),
    S(-40, 0.0, 0, 8, 4, 5, 'x', -1, 8, 'sand'),
    S( 40, 0.0, 0, 8, 4, 5, 'x',  1, 8, 'sand'),

    // Ground cover
    B(-22, 0.75, 0, 3, 1.5, 3, 'wood'),
    B( 22, 0.75, 0, 3, 1.5, 3, 'wood'),
    B(0, 0.75, -22, 3, 1.5, 3, 'wood'),
    B(0, 0.75,  22, 3, 1.5, 3, 'wood'),
    B(-36, 0.75, -36, 4, 1.5, 4, 'wood'),
    B( 36, 0.75, -36, 4, 1.5, 4, 'wood'),
    B(-36, 0.75,  36, 4, 1.5, 4, 'wood'),
    B( 36, 0.75,  36, 4, 1.5, 4, 'wood'),
  ],
  spawns: {
    red: [
      { x: -45, y: 0, z:  45, yaw: Math.PI * 0.75 },
      { x: -45, y: 0, z: -45, yaw: Math.PI * 0.25 },
      { x: -30, y: 0, z:   0, yaw: Math.PI / 2 },
      { x: -50, y: 0, z:   0, yaw: Math.PI / 2 },
    ],
    blue: [
      { x:  45, y: 0, z:  45, yaw: -Math.PI * 0.75 },
      { x:  45, y: 0, z: -45, yaw: -Math.PI * 0.25 },
      { x:  30, y: 0, z:   0, yaw: -Math.PI / 2 },
      { x:  50, y: 0, z:   0, yaw: -Math.PI / 2 },
    ],
    ffa: [
      { x: -45, y: 0, z:  45, yaw: Math.PI * 0.75 },
      { x:  45, y: 0, z:  45, yaw: -Math.PI * 0.75 },
      { x: -45, y: 0, z: -45, yaw: Math.PI * 0.25 },
      { x:  45, y: 0, z: -45, yaw: -Math.PI * 0.25 },
      { x:   0, y: 0, z:  52, yaw: Math.PI },
      { x:   0, y: 0, z: -52, yaw: 0 },
      { x:  52, y: 0, z:   0, yaw: -Math.PI / 2 },
      { x: -52, y: 0, z:   0, yaw: Math.PI / 2 },
    ],
  },
  healthPacks: [
    { x:  22, y: 0, z:   0 },
    { x: -22, y: 0, z:   0 },
    { x:   0, y: 0, z:  22 },
    { x:   0, y: 0, z: -22 },
    { x:  38, y: 4, z:   0 },
    { x: -38, y: 4, z:   0 },
    { x:   0, y: 4, z:  38 },
    { x:   0, y: 4, z: -38 },
  ],
};

// ---------- Bunker (rooms + courtyard + catwalk) ----------
const bunker = {
  id: 'bunker',
  name: 'Bunker',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter('concrete'),

    // ---- West (red) side: 4 connected rooms ----
    B(-45, 3, -12, 18, 6, 1, 'concrete'),
    B(-45, 3,  12, 18, 6, 1, 'concrete'),
    B(-34, 3, -20, 1, 6, 8, 'concrete'),
    B(-34, 3,  20, 1, 6, 8, 'concrete'),
    B(-24, 3, -20, 1, 6, 8, 'concrete'),
    B(-24, 3,  20, 1, 6, 8, 'concrete'),
    B(-16, 3, -18, 1, 6, 12, 'concrete'),
    B(-16, 3,  18, 1, 6, 12, 'concrete'),

    // ---- East (blue) side: mirror ----
    B( 45, 3, -12, 18, 6, 1, 'concrete'),
    B( 45, 3,  12, 18, 6, 1, 'concrete'),
    B( 34, 3, -20, 1, 6, 8, 'concrete'),
    B( 34, 3,  20, 1, 6, 8, 'concrete'),
    B( 24, 3, -20, 1, 6, 8, 'concrete'),
    B( 24, 3,  20, 1, 6, 8, 'concrete'),
    B( 16, 3, -18, 1, 6, 12, 'concrete'),
    B( 16, 3,  18, 1, 6, 12, 'concrete'),

    // ---- Center courtyard building (2 floors) ----
    B(0, 2, 0, 16, 4, 16, 'concrete'),
    B(0, 4.5, 0, 16, 1, 16, 'grate'),
    R(-11, 0.0, 0, 4, 4, 6, 'x', -1, 'metal'),
    R( 11, 0.0, 0, 4, 4, 6, 'x',  1, 'metal'),

    // Courtyard cover
    B( 22, 1,  22, 4, 2, 4, 'wood'),
    B(-22, 1,  22, 4, 2, 4, 'wood'),
    B( 22, 1, -22, 4, 2, 4, 'wood'),
    B(-22, 1, -22, 4, 2, 4, 'wood'),

    // Catwalk (north-south)
    B(0, 5.5, -28, 4, 1, 24, 'metal'),
    B(0, 5.5,  28, 4, 1, 24, 'metal'),
    B(0, 2.75, -28, 1, 5.5, 1, 'metal'),
    B(0, 2.75,  28, 1, 5.5, 1, 'metal'),
    S(-9, 0.0, -40, 4, 5.5, 8, 'z', -1, 10, 'metal'),
    S( 9, 0.0,  40, 4, 5.5, 8, 'z',  1, 10, 'metal'),
  ],
  spawns: {
    red: [
      { x: -50, y: 0, z:  30, yaw: Math.PI * 0.75 },
      { x: -50, y: 0, z: -30, yaw: Math.PI * 0.25 },
      { x: -40, y: 0, z:   0, yaw: Math.PI / 2 },
      { x: -52, y: 0, z:   0, yaw: Math.PI / 2 },
    ],
    blue: [
      { x:  50, y: 0, z:  30, yaw: -Math.PI * 0.75 },
      { x:  50, y: 0, z: -30, yaw: -Math.PI * 0.25 },
      { x:  40, y: 0, z:   0, yaw: -Math.PI / 2 },
      { x:  52, y: 0, z:   0, yaw: -Math.PI / 2 },
    ],
    ffa: [
      { x: -50, y: 0, z:  45, yaw: Math.PI * 0.75 },
      { x:  50, y: 0, z:  45, yaw: -Math.PI * 0.75 },
      { x: -50, y: 0, z: -45, yaw: Math.PI * 0.25 },
      { x:  50, y: 0, z: -45, yaw: -Math.PI * 0.25 },
      { x:   0, y: 0, z:  52, yaw: Math.PI },
      { x:   0, y: 0, z: -52, yaw: 0 },
      { x:  52, y: 0, z:   0, yaw: -Math.PI / 2 },
      { x: -52, y: 0, z:   0, yaw: Math.PI / 2 },
    ],
  },
  healthPacks: [
    { x: -40, y: 0, z:   0 },
    { x:  40, y: 0, z:   0 },
    { x:   0, y: 0, z: -38 },
    { x:   0, y: 0, z:  38 },
    { x:   0, y: 4.5, z: 0 },
    { x: -28, y: 0, z:  28 },
    { x:  28, y: 0, z: -28 },
    { x:   0, y: 5.5, z: 0 },
  ],
};

// ---------- Tower (sci-fi, hollow base, spiral ramps) ----------
const tower = {
  id: 'tower',
  name: 'Tower',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter('panel'),

    // Hollow base
    B(-8.5, 3, 0, 1, 6, 18, 'panel'),
    B( 8.5, 3, 0, 1, 6, 18, 'panel'),
    B(0, 3, -8.5, 16, 6, 1, 'panel'),
    B(-5.5, 3, 8.5, 5, 6, 1, 'panel'),
    B( 5.5, 3, 8.5, 5, 6, 1, 'panel'),
    B(0, 6.25, 0, 18, 0.5, 18, 'grate'),

    // Second tier
    B(-7, 9, 0, 1, 5, 15, 'panel'),
    B( 7, 9, 0, 1, 5, 15, 'panel'),
    B(0, 9, -7, 15, 5, 1, 'panel'),
    B(0, 9,  7, 15, 5, 1, 'panel'),
    B(0, 12, 0, 15, 0.5, 15, 'metal'),

    // Exterior spiral ramps
    R( 0, 0.0, -12, 12, 6, 4, 'x',  1, 'metal'),
    R( 12, 3.0,  0, 4, 6, 12, 'z',  1, 'metal'),
    R( 0, 6.0,  12, 12, 6, 4, 'x', -1, 'metal'),
    R(-12, 9.0,  0, 4, 6, 12, 'z', -1, 'metal'),

    // Ground cover
    B( 30, 1.5,  0, 6, 3, 3, 'panel'),
    B(-30, 1.5,  0, 6, 3, 3, 'panel'),
    B( 0, 1.5,  30, 3, 3, 6, 'panel'),
    B( 0, 1.5, -30, 3, 3, 6, 'panel'),

    B( 28, 1,  28, 8, 2, 1, 'panel'),
    B(-28, 1,  28, 8, 2, 1, 'panel'),
    B( 28, 1, -28, 8, 2, 1, 'panel'),
    B(-28, 1, -28, 8, 2, 1, 'panel'),

    // Additional cover further out
    B( 40, 1,  0, 5, 2, 5, 'panel'),
    B(-40, 1,  0, 5, 2, 5, 'panel'),
    B( 0, 1,  40, 5, 2, 5, 'panel'),
    B( 0, 1, -40, 5, 2, 5, 'panel'),
  ],
  spawns: {
    red: [
      { x: -48, y: 0, z:  30, yaw: Math.PI * 0.75 },
      { x: -48, y: 0, z: -30, yaw: Math.PI * 0.25 },
      { x: -38, y: 0, z:   0, yaw: Math.PI / 2 },
      { x: -52, y: 0, z:   0, yaw: Math.PI / 2 },
    ],
    blue: [
      { x:  48, y: 0, z:  30, yaw: -Math.PI * 0.75 },
      { x:  48, y: 0, z: -30, yaw: -Math.PI * 0.25 },
      { x:  38, y: 0, z:   0, yaw: -Math.PI / 2 },
      { x:  52, y: 0, z:   0, yaw: -Math.PI / 2 },
    ],
    ffa: [
      { x: -48, y: 0, z:  45, yaw: Math.PI * 0.75 },
      { x:  48, y: 0, z:  45, yaw: -Math.PI * 0.75 },
      { x: -48, y: 0, z: -45, yaw: Math.PI * 0.25 },
      { x:  48, y: 0, z: -45, yaw: -Math.PI * 0.25 },
      { x:   0, y: 0, z:  52, yaw: Math.PI },
      { x:   0, y: 0, z: -52, yaw: 0 },
      { x:  52, y: 0, z:   0, yaw: -Math.PI / 2 },
      { x: -52, y: 0, z:   0, yaw: Math.PI / 2 },
    ],
  },
  healthPacks: [
    { x:  30, y: 0, z:   0 },
    { x: -30, y: 0, z:   0 },
    { x:   0, y: 0, z:  30 },
    { x:   0, y: 0, z: -30 },
    { x:   0, y: 6.25, z: 0 },
    { x:   0, y: 12, z: 0 },
    { x:  40, y: 0, z:   0 },
    { x: -40, y: 0, z:   0 },
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