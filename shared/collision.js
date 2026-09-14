// Shared collision solver used by both server and client.
// Solid types:
//   box    { type:'box',    x, y, z, w, h, d }
//   ramp   { type:'ramp',   x, y, z, w, h, d, axis:'x'|'z', dir:1|-1 }
//          - y is the LOWEST corner of the ramp
//          - h is the height gain across the full run
//          - axis is the direction of the slope
//          - dir = +1 means height increases toward +axis
//          - dir = -1 means height increases toward -axis
//          - the ramp's footprint is w x d, centered at (x, z)
//   stairs { type:'stairs', x, y, z, w, h, d, axis:'x'|'z', dir:1|-1, steps:N }
//          - expanded into N stacked boxes at load time by expandStairs()

export const STEP_UP = 0.35;
export const GRAVITY_SNAP = 0.5;

export function expandStairs(solids) {
  const out = [];
  for (const s of solids) {
    if (s.type === 'stairs') {
      const n = Math.max(1, s.steps | 0);
      const stepH = s.h / n;
      const stepRun = (s.axis === 'x' ? s.w : s.d) / n;
      for (let i = 0; i < n; i++) {
        const yCenter = s.y + stepH * (i + 0.5);
        let off = -((s.axis === 'x' ? s.w : s.d) / 2) + stepRun * (i + 0.5);
        if (s.dir < 0) off = -off;
        const cx = s.axis === 'x' ? s.x + off : s.x;
        const cz = s.axis === 'z' ? s.z + off : s.z;
        out.push({
          type: 'box',
          x: cx, y: yCenter, z: cz,
          w: s.axis === 'x' ? stepRun : s.w,
          h: stepH,
          d: s.axis === 'z' ? stepRun : s.d,
          mat: s.mat,
        });
      }
    } else {
      out.push(s);
    }
  }
  return out;
}

export function groundHeightAt(x, z, feetY, solids) {
  let best = -Infinity;

  for (const s of solids) {
    if (s.type === 'ramp') {
      if (!insideFootprint(x, z, s)) continue;
      const surfaceY = rampHeightAt(x, z, s);
      if (surfaceY <= feetY + STEP_UP && surfaceY > best) best = surfaceY;
    } else if (s.type === 'box') {
      if (!insideFootprint(x, z, s)) continue;
      const top = s.y + s.h / 2;
      if (top <= feetY + STEP_UP && top > best) best = top;
    }
  }

  return best;
}

// Move a capsule (radius r, height h, centered at y = centerY) by delta,
// resolving collisions against all solids. `wasGrounded` should be the
// value of onGround from the previous tick — it enables snap-down to the
// ground only when the player is actually walking, not while airborne.
export function moveAndCollide(state, dx, dy, dz, radius, height, solids, wasGrounded = false) {
  let { x, y, z, vy } = state;

  const nx = x + dx;
  const nz = z + dz;

  if (!collides(nx, y, z, radius, height, solids)) {
    x = nx;
  } else {
    const stepY = tryStepUp(nx, y, z, radius, height, solids);
    if (stepY !== null) { x = nx; y = stepY; }
  }

  if (!collides(x, y, nz, radius, height, solids)) {
    z = nz;
  } else {
    const stepY = tryStepUp(x, y, nz, radius, height, solids);
    if (stepY !== null) { z = nz; y = stepY; }
  }

  y += dy;

  let onGround = false;

  const feet = y - height / 2;
  const head = y + height / 2;

  const groundY = groundHeightAt(x, z, feet, solids);
  if (groundY !== -Infinity) {
    if (feet <= groundY) {
      y = groundY + height / 2;
      onGround = true;
    } else if (wasGrounded && feet - groundY < GRAVITY_SNAP && dy <= 0) {
      // snap-down only when the player was already grounded on the previous
      // tick. Free-falling must never be snapped mid-air.
      y = groundY + height / 2;
      onGround = true;
    }
  }

  for (const s of solids) {
    if (s.type !== 'box') continue;
    if (!insideFootprint(x, z, s)) continue;
    const bottom = s.y - s.h / 2;
    if (head > bottom && y < bottom) {
      y = bottom - height / 2;
      if (vy > 0) vy = 0;
    }
  }

  const halfH = height / 2;
  if (y < halfH) {
    y = halfH;
    onGround = true;
  }

  return { x, y, z, vy, onGround };
}

function collides(x, y, z, radius, height, solids) {
  const feet = y - height / 2;
  const head = y + height / 2;

  for (const s of solids) {
    if (s.type === 'ramp') {
      if (!insideFootprint(x, z, s)) continue;
      const surfaceY = rampHeightAt(x, z, s);
      if (feet < surfaceY && feet + height > surfaceY) return true;
      continue;
    }

    if (x + radius <= s.x - s.w / 2) continue;
    if (x - radius >= s.x + s.w / 2) continue;
    if (z + radius <= s.z - s.d / 2) continue;
    if (z - radius >= s.z + s.d / 2) continue;
    if (head <= s.y - s.h / 2) continue;
    if (feet >= s.y + s.h / 2) continue;
    return true;
  }
  return false;
}

function tryStepUp(x, y, z, radius, height, solids) {
  const feet = y - height / 2;
  const targetFeet = feet + STEP_UP;
  const targetCenterY = targetFeet + height / 2;

  if (collides(x, targetCenterY, z, radius, height, solids)) return null;

  const groundY = groundHeightAt(x, z, targetFeet, solids);
  if (groundY === -Infinity) return null;
  if (groundY > targetFeet) return null;

  return groundY + height / 2;
}

function insideFootprint(x, z, s) {
  return (
    x > s.x - s.w / 2 && x < s.x + s.w / 2 &&
    z > s.z - s.d / 2 && z < s.z + s.d / 2
  );
}

function rampHeightAt(x, z, s) {
  const axisLen = s.axis === 'x' ? s.w : s.d;
  const along = s.axis === 'x'
    ? (x - (s.x - s.w / 2))
    : (z - (s.z - s.d / 2));

  let t = along / axisLen;
  if (s.dir < 0) t = 1 - t;

  return s.y + s.h * t;
}

export function raycastSolids(origin, dir, maxT, solids) {
  let bestT = maxT;
  let bestSolid = null;

  for (const s of solids) {
    let t;
    if (s.type === 'ramp') {
      t = rayRamp(origin, dir, s);
    } else {
      t = rayBox(origin, dir, s);
    }
    if (t === null) continue;
    if (t < 0) continue;
    if (t >= bestT) continue;
    bestT = t;
    bestSolid = s;
  }

  if (!bestSolid) return null;

  return {
    t: bestT,
    solid: bestSolid,
    point: {
      x: origin.x + dir.x * bestT,
      y: origin.y + dir.y * bestT,
      z: origin.z + dir.z * bestT,
    },
  };
}

function rayBox(o, d, s) {
  const minX = s.x - s.w / 2, maxX = s.x + s.w / 2;
  const minY = s.y - s.h / 2, maxY = s.y + s.h / 2;
  const minZ = s.z - s.d / 2, maxZ = s.z + s.d / 2;

  let tmin = 0, tmax = Infinity;

  for (const [ov, dv, mn, mx] of [
    [o.x, d.x, minX, maxX],
    [o.y, d.y, minY, maxY],
    [o.z, d.z, minZ, maxZ],
  ]) {
    if (Math.abs(dv) < 1e-8) {
      if (ov < mn || ov > mx) return null;
    } else {
      let t1 = (mn - ov) / dv;
      let t2 = (mx - ov) / dv;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

function rayRamp(o, d, s) {
  const bbox = {
    x: s.x, z: s.z,
    y: s.y + s.h / 2,
    w: s.w, h: s.h, d: s.d,
  };
  const tBox = rayBox(o, d, bbox);
  if (tBox === null) return null;

  const px = o.x + d.x * tBox;
  const py = o.y + d.y * tBox;
  const pz = o.z + d.z * tBox;

  const surfaceY = rampHeightAt(px, pz, s);
  const tol = 0.15;
  if (py < surfaceY - tol || py > surfaceY + tol) return null;
  return tBox;
}

export function centerFromFeet(feetY, height) {
  return feetY + height / 2;
}
