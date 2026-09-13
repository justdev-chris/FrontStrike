import * as THREE from 'three';
import { getCamera } from '../core/renderer.js';
import { getWeapon } from '/shared/weapons.js';

// Scope overlay: full sniper scope when the weapon has hasScope and ADS is
// engaged; a subtle vignette for everything else.

let vignetteEl = null;
let scopeEl = null;
let scopeCircleEl = null;
let scopeT = 0;        // 0 = off, 1 = fully on
let vignetteT = 0;

export function init() {
  vignetteEl = document.getElementById('adsVignette');
  scopeEl = document.getElementById('scopeOverlay');
  scopeCircleEl = document.getElementById('scopeCircle');
}

export function update(aiming, weaponId, isSniper) {
  const w = getWeapon(weaponId);
  if (!w) return;

  const dt = 1 / 60;

  // vignette applies to all weapons while aiming
  const vignetteTarget = aiming ? w.vignetteStrength : 0;
  vignetteT = approach(vignetteT, vignetteTarget, dt * 3.5);
  if (vignetteEl) {
    vignetteEl.style.opacity = vignetteT.toFixed(3);
  }

  // full scope circle only for weapons with hasScope
  const scopeTarget = aiming && w.hasScope ? 1 : 0;
  scopeT = approach(scopeT, scopeTarget, dt * 5);
  if (scopeEl) {
    if (scopeT <= 0.01) {
      scopeEl.classList.add('hidden');
    } else {
      scopeEl.classList.remove('hidden');
      scopeEl.style.opacity = scopeT.toFixed(3);
    }
  }
}

function approach(current, target, rate) {
  if (current < target) return Math.min(target, current + rate);
  if (current > target) return Math.max(target, current - rate);
  return target;
}
