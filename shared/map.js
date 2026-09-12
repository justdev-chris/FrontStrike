export const MAP_SIZE = 80;
export const WALL_HEIGHT = 8;

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

const wall = (x, z, w = 1, d = 1, h = WALL_HEIGHT) =>
  ({ x, y: h / 2, z, w, h, d });

const box = (x, y, z, w, h, d) => ({ x, y, z, w, h, d });

const perimeter = () => [
  { x: 0,             y: WALL_HEIGHT / 2, z: -MAP_SIZE / 2, w: MAP_SIZE, h: WALL_HEIGHT, d: 1 },
  { x: 0,             y: WALL_HEIGHT / 2, z:  MAP_SIZE / 2, w: MAP_SIZE, h: WALL_HEIGHT, d: 1 },
  { x: -MAP_SIZE / 2, y: WALL_HEIGHT / 2, z: 0,             w: 1,        h: WALL_HEIGHT, d: MAP_SIZE },
  { x:  MAP_SIZE / 2, y: WALL_HEIGHT / 2, z: 0,             w: 1,        h: WALL_HEIGHT, d: MAP_SIZE },
];

// 1. Crossfire
const crossfire = {
  id: 'crossfire',
  name: 'Crossfire',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter(),
    box(0, 0.5, 0, 14, 1, 14),
    box(0, 1.5, 0, 8, 1, 8),
    box( 10, 0.75,  10, 3, 1.5, 3),
    box(-10, 0.75,  10, 3, 1.5, 3),
    box( 10, 0.75, -10, 3, 1.5, 3),
    box(-10, 0.75, -10, 3, 1.5, 3),
    box(  0, 3,  20, 2, 6, 2),
    box(  0, 3, -20, 2, 6, 2),
    box( 20, 3,   0, 2, 6, 2),
    box(-20, 3,   0, 2, 6, 2),
    box( 28, 1,  28, 8, 2, 2),
    box(-28, 1,  28, 8, 2, 2),
    box( 28, 1, -28, 8, 2, 2),
    box(-28, 1, -28, 8, 2, 2),
  ],
  spawns: SPAWNS_STANDARD,
};

// 2. Pillars
const pillars = {
  id: 'pillars',
  name: 'Pillars',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter(),
    ...[-24, -8, 8, 24].flatMap(x =>
      [-24, -8, 8, 24].map(z => box(x, 2, z, 2, 4, 2))
    ),
    box(0, 0.5, 0, 10, 1, 10),
    box(0, 1.5, 0, 6, 1, 6),
    box(0, 2.5, 0, 2, 1, 2),
    box( 16, 1, 0, 2, 2, 6),
    box(-16, 1, 0, 2, 2, 6),
    box(0, 1,  16, 6, 2, 2),
    box(0, 1, -16, 6, 2, 2),
  ],
  spawns: SPAWNS_STANDARD,
};

// 3. Bunker
const bunker = {
  id: 'bunker',
  name: 'Bunker',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter(),
    wall(-30, -10, 1, 20),
    wall(-30,  10, 1, 20),
    wall(-22, -20, 16, 1),
    wall(-22,  20, 16, 1),
    wall( 30, -10, 1, 20),
    wall( 30,  10, 1, 20),
    wall( 22, -20, 16, 1),
    wall( 22,  20, 16, 1),
    box(0, 0.75, 0, 4, 1.5, 4),
    box(0, 2.25, 0, 3, 1.5, 3),
    box( 8, 1,  8, 2, 2, 2),
    box(-8, 1,  8, 2, 2, 2),
    box( 8, 1, -8, 2, 2, 2),
    box(-8, 1, -8, 2, 2, 2),
    wall(0, -25, 20, 1, 3),
    wall(0,  25, 20, 1, 3),
  ],
  spawns: SPAWNS_STANDARD,
};

// 4. Tower
const tower = {
  id: 'tower',
  name: 'Tower',
  mapSize: MAP_SIZE,
  obstacles: [
    ...perimeter(),
    box(0, 1, 0, 12, 2, 12),
    box(0, 3, 0, 8,  2, 8),
    box(0, 5, 0, 4,  2, 4),
    box( 22, 1,   0, 4, 2, 2),
    box(-22, 1,   0, 4, 2, 2),
    box(  0, 1,  22, 2, 2, 4),
    box(  0, 1, -22, 2, 2, 4),
    box( 18, 1,  18, 6, 2, 1),
    box(-18, 1,  18, 6, 2, 1),
    box( 18, 1, -18, 6, 2, 1),
    box(-18, 1, -18, 6, 2, 1),
  ],
  spawns: SPAWNS_STANDARD,
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
