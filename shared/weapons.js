// Weapon definitions. Shared by server (damage, fire rate) and client
// (viewmodel, zoom, recoil, reload animation timings).

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
    adsZoom: 65,          // FOV while aiming
    adsTimeMs: 140,
    recoilPitch: 0.009,   // radians per shot
    recoilYaw: 0.004,     // ± random
    recoilRecoverMs: 260,
    vignetteStrength: 0.35,
    hasScope: false,
    moveMultAds: 0.65,
    viewmodel: 'rifle',
    range: 200,
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
  },

  sniper: {
    id: 'sniper',
    name: 'Sniper',
    slot: 3,
    damage: 90,
    headMult: 3,
    fireRateMs: 1400,
    magSize: 5,
    reloadMs: 3200,
    auto: false,
    adsZoom: 25,          // tight FOV — full scope
    adsTimeMs: 220,
    recoilPitch: 0.055,
    recoilYaw: 0.012,
    recoilRecoverMs: 520,
    vignetteStrength: 0.9,
    hasScope: true,
    moveMultAds: 0.35,
    viewmodel: 'sniper',
    range: 400,
  },

  pistol: {
    id: 'pistol',
    name: 'Pistol',
    slot: 4,
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
  },
};

export const DEFAULT_WEAPON = 'rifle';

export const WEAPON_ORDER = ['rifle', 'smg', 'sniper', 'pistol'];

export function getWeapon(id) {
  return WEAPONS[id] || WEAPONS[DEFAULT_WEAPON];
}
