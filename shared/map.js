// Arena definitions. Each solid is one of:
//   box    { type:'box',    x, y, z, w, h, d, mat }
//   ramp   { type:'ramp',   x, y, z, w, h, d, axis:'x'|'z', dir:1|-1, mat }
//   stairs { type:'stairs', x, y, z, w, h, d, axis:'x'|'z', dir:1|-1, steps, mat }
//
// Box: (x, y, z) is the CENTER, (w, h, d) are full dimensions.
// Ramp: (x, z) is the footprint center, y is the lowest corner's Y.
//       h is total rise, axis is the slope axis, dir=+1 means height
//       increases toward +axis. Footprint is w x d.
// Stairs: same convention as ramp. steps is a count; expanded at load.

export const MAP_SIZE = 80;
export const WALL_HEIGHT = 8;

// ---- helpers ----
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

// ============================================================
// 1. CROSSFIRE — 4-fold symmetric, two floors, mid tunnel
// ============================================================
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
};

// ============================================================
// 2. PILLARS — sandstone desert with an outer ring walkway
// ============================================================
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
};

// ============================================================
// 3. BUNKER — concrete rooms + contested courtyard + catwalk
// ============================================================
const bunker = {
  id: 'bunker',
  name: 'Bunker',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter('concrete'),

    // ---- West (red) side: 3 connected rooms ----
    // Spawn room wall (with doorway gap between the two segments)
    B(-30, 3, -8, 12, 6, 1, 'concrete'),
    B(-30, 3,  8, 12, 6, 1, 'concrete'),
    // Mid room walls (with doorways)
    B(-22, 3, -14, 1, 6, 6, 'concrete'),
    B(-22, 3,  14, 1, 6, 6, 'concrete'),
    // Firing room front wall (facing courtyard), with a firing slit gap
    B(-18, 3, -12, 1, 6, 8, 'concrete'),
    B(-18, 3,  12, 1, 6, 8, 'concrete'),

    // ---- East (blue) side: mirror ----
    B( 30, 3, -8, 12, 6, 1, 'concrete'),
    B( 30, 3,  8, 12, 6, 1, 'concrete'),
    B( 22, 3, -14, 1, 6, 6, 'concrete'),
    B( 22, 3,  14, 1, 6, 6, 'concrete'),
    B( 18, 3, -12, 1, 6, 8, 'concrete'),
    B( 18, 3,  12, 1, 6, 8, 'concrete'),

    // ---- Center courtyard building (2 floors) ----
    B(0, 1.5, 0, 10, 3, 10, 'concrete'),
    B(0, 3.5, 0, 10, 1, 10, 'grate'),
    R(-7, 0.0, 0, 3, 3, 4, 'x', -1, 'metal'),
    R( 7, 0.0, 0, 3, 3, 4, 'x',  1, 'metal'),

    // ---- Corner cover in courtyard ----
    B( 14, 1,  14, 3, 2, 3, 'wood'),
    B(-14, 1,  14, 3, 2, 3, 'wood'),
    B( 14, 1, -14, 3, 2, 3, 'wood'),
    B(-14, 1, -14, 3, 2, 3, 'wood'),

    // ---- Elevated catwalk (north-south) ----
    B(0, 4.5, -18, 3, 1, 16, 'metal'),
    B(0, 4.5,  18, 3, 1, 16, 'metal'),
    B(0, 2.25, -18, 1, 4.5, 1, 'metal'),
    B(0, 2.25,  18, 1, 4.5, 1, 'metal'),
    S(-6, 0.0, -26, 3, 4.5, 6, 'z', -1, 8, 'metal'),
    S( 6, 0.0,  26, 3, 4.5, 6, 'z',  1, 8, 'metal'),
  ],
  spawns: SPAWNS_STANDARD,
};

// ============================================================
// 4. TOWER — sci-fi, climbable central tower with spiral ramps
// ============================================================
// The tower base is hollow: four walls around a walkable interior,
// with an opening on one side so you can run in.
const tower = {
  id: 'tower',
  name: 'Tower',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter('panel'),

    // ---- Hollow base (interior 10x10, wall thickness 1) ----
    B(-5.5, 2, 0, 1, 4, 12, 'panel'),   // west wall
    B( 5.5, 2, 0, 1, 4, 12, 'panel'),   // east wall
    B(0, 2, -5.5, 10, 4, 1, 'panel'),   // north wall
    // south wall has a doorway — build it as two segments
    B(-3.5, 2, 5.5, 3, 4, 1, 'panel'),
    B( 3.5, 2, 5.5, 3, 4, 1, 'panel'),

    // Roof of the base (walkable — this is level 2 of the tower)
    B(0, 4.25, 0, 12, 0.5, 12, 'grate'),

    // ---- Second tier (walls only, open top) ----
    B(-4.5, 6, 0, 1, 3, 10, 'panel'),
    B( 4.5, 6, 0, 1, 3, 10, 'panel'),
    B(0, 6, -4.5, 10, 3, 1, 'panel'),
    B(0, 6,  4.5, 10, 3, 1, 'panel'),

    // Top roof
    B(0, 8.0, 0, 10, 0.5, 10, 'metal'),

    // ---- Spiral ramps wrapping the tower (exterior) ----
    R( 0, 0.0, -8, 8, 4, 3, 'x',  1, 'metal'),
    R( 8, 2.0,  0, 3, 4, 8, 'z',  1, 'metal'),
    R( 0, 4.0,  8, 8, 4, 3, 'x', -1, 'metal'),
    R(-8, 6.0,  0, 3, 4, 8, 'z', -1, 'metal'),

    // ---- Ground-level cover ----
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
};

// ============================================================

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
