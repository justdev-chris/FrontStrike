// shared collision solver used by both server and client
// solid types:
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
// boxes use center coords. ramps/stais use footprint-center + y as low edge

export const STEP_UP = 0.35;
export const GRAVITY_SNAP = 0.5;   // how far below feet we look to stay grounded

// expand any 'stairs' solids into a list of boxes. Returns a new array.
// called once per map at load; caches the result on the map object.
export function expandStairs(solids) {
  const out = [];
  for (const s of solids) {
    if (s.type === 'stairs') {
      const n = Math.max(1, s.steps | 0);
      const stepH = s.h / n;
      const stepRun = (s.axis === 'x' ? s.w : s.d) / n;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const yCenter = s.y + stepH * (i + 0.5);
        // position along the slope axis
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

// height of the ground under a point, given a list of expanded solids.
// returns the highest surface <= feetY + tolerance. -Infinity if none.
export function groundHeightAt(x, z, feetY, solids) {
  let best = -Infinity;

  for (const s of solids) {
    if (s.type === 'ramp') {
      if (!insideRampFootprint(x, z, s)) continue;
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

// move a capsule (radius r, height h, centered at y = centerY) by delta,
// resolving collisions against all solids. Returns the new state
// { x, y, z, vy, onGround }.
export function moveAndCollide(state, dx, dy, dz, radius, height, solids) {
  let { x, y, z, vy } = state;

  // ---- horizontal: try to move, step up if blocked ----
  const nx = x + dx;
  const nz = z + dz;

  // resolve on X then Z separately so we slide along walls
  if (!collides(nx, y, z, radius, height, solids)) {
    x = nx;
  } else {
    // try step-up on X
    const stepY = tryStepUp(nx, y, z, radius, height, solids);
    if (stepY !== null) { x = nx; y = stepY; }
  }

  if (!collides(x, y, nz, radius, height, solids)) {
    z = nz;
  } else {
    const stepY = tryStepUp(x, y, nz, radius, height, solids);
    if (stepY !== null) { z = nz; y = stepY; }
  }

  // ---- vertical ----
  y += dy;
  vy = dy < 0 ? vy : vy; // caller controls vy externally

  let onGround = false;

  const feet = y - height / 2;
  const head = y + height / 2;

  // ground check: find highest surface under us at or below feet
  const groundY = groundHeightAt(x, z, feet, solids);
  if (groundY !== -Infinity) {
    if (feet <= groundY) {
      y = groundY + height / 2;
      onGround = true;
    } else if (feet - groundY < GRAVITY_SNAP && dy <= 0) {
      // small snap-down so we don't float on stairs
      y = groundY + height / 2;
      onGround = true;
    }
  }

  // ceiling check
  for (const s of solids) {
    if (s.type !== 'box') continue;
    if (!insideFootprint(x, z, s)) continue;
    const bottom = s.y - s.h / 2;
    if (head > bottom && y < bottom) {
      y = bottom - height / 2;
      if (vy > 0) vy = 0;
    }
  }

  // floor of the world
  const halfH = height / 2;
  if (y < halfH) {
    y = halfH;
    onGround = true;
  }

  return { x, y, z, vy, onGround };
}

// do we overlap any solid at this position?
function collides(x, y, z, radius, height, solids) {
  const feet = y - height / 2;
  const head = y + height / 2;

  for (const s of solids) {
    if (s.type === 'ramp') {
      if (!insideRampFootprint(x, z, s)) continue;
      const surfaceY = rampHeightAt(x, z, s);
      // ramp acts as ground; it doesn't block from the side beyond feet level
      if (feet < surfaceY && feet + height > surfaceY) return true;
      continue;
    }

    // box
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

// if we're blocked but there's a surface just above our feet we can stand on,
// return the new center-Y. Otherwise null.
function tryStepUp(x, y, z, radius, height, solids) {
  const feet = y - height / 2;
  const targetFeet = feet + STEP_UP;
  const targetCenterY = targetFeet + height / 2;

  // must not be blocked at the raised position
  if (collides(x, targetCenterY, z, radius, height, solids)) return null;

  // must have ground at the raised position
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

function insideRampFootprint(x, z, s) {
  return insideFootprint(x, z, s);
}

// height (Y of the walking surface) at a point on a ramp.
function rampHeightAt(x, z, s) {
  const axisLen = s.axis === 'x' ? s.w : s.d;
  const along = s.axis === 'x'
    ? (x - (s.x - s.w / 2))    // 0 .. w
    : (z - (s.z - s.d / 2));   // 0 .. d

  let t = along / axisLen;     // 0 .. 1
  if (s.dir < 0) t = 1 - t;

  return s.y + s.h * t;
}

// ray vs all solids. Returns { t, point, solid } for the nearest hit,
// or null if nothing within maxT.
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

// ray vs ramp: approximate by clipping to the ramp's bounding box and
// then checking that the hit point satisfies the plane equation.
function rayRamp(o, d, s) {
  // bounding box of the ramp (footprint + vertical extent)
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
  // tolerance so a ray grazing the slope still registers
  const tol = 0.15;
  if (py < surfaceY - tol || py > surfaceY + tol) return null;
  return tBox;
}

// Convenience: center-Y of a capsule standing on ground g.
export function centerFromFeet(feetY, height) {
  return feetY + height / 2;
}
