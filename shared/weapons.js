export const WEAPONS = {
  rifle: {
    id: 'rifle',
    name: 'Rifle',
    slot: 1,
    damage: 25,
    headMult: 2,
    fireRateMs: 120,
    magSize: 30,
    reloadMs: 2200,
    auto: true,
    adsZoom: 65,
    adsTimeMs: 140,
    recoilPitch: 0.009,
    recoilYaw: 0.004,
    recoilRecoverMs: 260,
    vignetteStrength: 0.35,
    hasScope: false,
    moveMultAds: 0.65,
    viewmodel: 'rifle',
    range: 200,
    sound: 'gunshot_rifle',
    projectile: false,
  },

  smg: {
    id: 'smg',
    name: 'SMG',
    slot: 2,
    damage: 15,
    headMult: 1.6,
    fireRateMs: 70,
    magSize: 40,
    reloadMs: 1800,
    auto: true,
    adsZoom: 70,
    adsTimeMs: 110,
    recoilPitch: 0.006,
    recoilYaw: 0.006,
    recoilRecoverMs: 200,
    vignetteStrength: 0.28,
    hasScope: false,
    moveMultAds: 0.75,
    viewmodel: 'smg',
    range: 120,
    sound: 'gunshot_smg',
    projectile: false,
  },

  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    slot: 3,
    damage: 12,                   // per pellet
    headMult: 1.5,
    pellets: 8,
    spreadRad: 0.075,             // cone half-angle
    fireRateMs: 800,
    magSize: 6,
    reloadMs: 2600,
    auto: false,
    adsZoom: 72,
    adsTimeMs: 180,
    recoilPitch: 0.045,
    recoilYaw: 0.008,
    recoilRecoverMs: 420,
    vignetteStrength: 0.32,
    hasScope: false,
    moveMultAds: 0.6,
    viewmodel: 'shotgun',
    range: 35,
    sound: 'gunshot_shotgun',
    projectile: false,
  },

  sniper: {
    id: 'sniper',
    name: 'Sniper',
    slot: 4,
    damage: 90,
    headMult: 3,
    fireRateMs: 1400,
    magSize: 5,
    reloadMs: 3200,
    auto: false,
    adsZoom: 25,
    adsTimeMs: 220,
    recoilPitch: 0.055,
    recoilYaw: 0.012,
    recoilRecoverMs: 520,
    vignetteStrength: 0.9,
    hasScope: true,
    moveMultAds: 0.35,
    viewmodel: 'sniper',
    range: 400,
    sound: 'gunshot_sniper',
    projectile: false,
  },

  pistol: {
    id: 'pistol',
    name: 'Pistol',
    slot: 5,
    damage: 30,
    headMult: 2,
    fireRateMs: 260,
    magSize: 12,
    reloadMs: 1500,
    auto: false,
    adsZoom: 68,
    adsTimeMs: 130,
    recoilPitch: 0.014,
    recoilYaw: 0.003,
    recoilRecoverMs: 280,
    vignetteStrength: 0.3,
    hasScope: false,
    moveMultAds: 0.8,
    viewmodel: 'pistol',
    range: 150,
    sound: 'gunshot_pistol',
    projectile: false,
  },

  rpg: {
    id: 'rpg',
    name: 'RPG',
    slot: 9,
    adminOnly: true,
    damage: 0,                    // direct hit is irrelevant, explosion does damage
    headMult: 1,
    fireRateMs: 2000,
    magSize: 1,
    reloadMs: 3500,
    auto: false,
    adsZoom: 70,
    adsTimeMs: 200,
    recoilPitch: 0.08,
    recoilYaw: 0.01,
    recoilRecoverMs: 600,
    vignetteStrength: 0.4,
    hasScope: false,
    moveMultAds: 0.5,
    viewmodel: 'rpg',
    range: 400,
    sound: 'gunshot_rpg',
    projectile: true,

    projectileSpeed: 30,          // units/sec
    projectileGravity: 0,         // straight-line rocket
    explosionRadius: 6,
    explosionDamage: 120,         // at center, falls off to 0 at radius
    selfDamageMult: 0.5,          // shooter takes half damage
  },
};

export const DEFAULT_WEAPON = 'rifle';

export const WEAPON_ORDER = ['rifle', 'smg', 'shotgun', 'sniper', 'pistol'];

export function getWeapon(id) {
  return WEAPONS[id] || WEAPONS[DEFAULT_WEAPON];
}

export function isAdminWeapon(id) {
  return !!WEAPONS[id]?.adminOnly;
}