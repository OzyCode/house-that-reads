/* ───────────── ASCII raymarcher ─────────────
   Rooms are signed-distance fields. A camera stands where the player stands.
   Each character cell fires a ray; brightness → character; the object it hit → clickable. */
const R = (() => {
  const W = 200, H = 76, CW = 0.6;
  const RAMP  = " .:-=+*#@";
  const FLOOR = " .,:~=*#@";
  const MATR  = " .:+*@";
  const ASPECT = (W * CW) / H;

  let M = 0, O = 0;
  /* where every carryable item is; set once per frame from F.L (the game's inventory) */
  const HOME = { mat:'doorstep', frame:'wall', key:'wall', pen:'desk', cup:'table', box:'attic' };
  let L = HOME;
  function locs(F){ if (F && F.L) return F.L; const l = Object.assign({}, HOME); if (F && F.frameTaken) l.frame = 'player'; return l; }
  const A = [0.80, 0.50, 0.62, 1, 0.40, 1, 0.12, 0.70, 0.90, 0.55, 0.30, 1, 0.07];   // 12: night glass
  const EMIT = { 3: 1.0, 5: 0.45, 11: 0.75 };

  function sdBox(px, py, pz, bx, by, bz) {
    const qx = Math.abs(px) - bx, qy = Math.abs(py) - by, qz = Math.abs(pz) - bz;
    const ex = qx > 0 ? qx : 0, ey = qy > 0 ? qy : 0, ez = qz > 0 ? qz : 0;
    const mx = qx > qy ? (qx > qz ? qx : qz) : (qy > qz ? qy : qz);
    return Math.sqrt(ex * ex + ey * ey + ez * ez) + (mx < 0 ? mx : 0);
  }
  /* frustum along +y from y=0 (radius r1) to y=h (radius r2) */
  function sdCone(px, py, pz, h, r1, r2) {
    const q = Math.sqrt(px * px + pz * pz);
    const t = Math.max(0, Math.min(1, py / h)); const r = r1 + (r2 - r1) * t;
    const dSide = (q - r) * Math.cos(Math.atan2(r1 - r2, h)); const dCap = Math.max(-py, py - h);
    return Math.max(dSide, dCap);
  }
  const hash = (a, b) => { let h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

  /* A panelled door set into a wall facing -z, centred at (cx, 0, wz), width 2*hw, height ht.
     Returns [d, m, o] for the door parts; the recess itself is carved by the caller. */
  function doorParts(x, y, z, cx, wz, hw, ht, depth, oid, lit, F) {
    let d = 1e9, m = 0, o = 0;
    let t = sdBox(x - cx, y - ht / 2, z - (wz + depth), hw, ht / 2, 0.035);          // leaf
    t = Math.max(t, -sdBox(x - cx, y - ht * 0.72, z - (wz + depth - 0.03), hw * 0.62, ht * 0.16, 0.02)); // upper panel
    t = Math.max(t, -sdBox(x - cx, y - ht * 0.30, z - (wz + depth - 0.03), hw * 0.62, ht * 0.19, 0.02)); // lower panel
    if (t < d) { d = t; m = 2; o = oid; }
    const kx = x - (cx + hw * 0.7), ky = y - ht * 0.47, kz = z - (wz + depth - 0.07);
    t = Math.sqrt(kx * kx + ky * ky + kz * kz) - 0.05; if (t < d) { d = t; m = 8; o = oid; }  // knob
    // architrave (frame proud of the wall)
    let a = sdBox(x - cx, y - ht / 2 - 0.06, z - wz, hw + 0.13, ht / 2 + 0.13, 0.05);
    a = Math.max(a, -sdBox(x - cx, y - ht / 2, z - wz, hw + 0.01, ht / 2 + 0.01, 0.2));
    if (a < d) { d = a; m = 10; o = oid; }
    if (lit) { t = sdBox(x - cx, y - 0.02, z - (wz + depth / 2), hw, 0.015, depth / 2); if (t < d) { d = t; m = 3; o = oid; } }
    M = m; O = o; return d;
  }

  const SCENES = {};

  SCENES.doorstep = {
    cam: { x: 0, y: 1.5, z: -5.2, tx: 0, ty: 1.63, tz: -4.21 }, fov: 0.72, sky: true,
    objects: [null, 'door', 'mat', 'bell', 'street'],
    lights: () => [[0, 2.6, -0.6, 5.5], [-2.6, 2.1, -0.4, 2.0], [2.6, 2.1, -0.4, 2.0]],
    ambient: () => 0.005, exposure: 0.55,
    text: (F) => L.mat === 'doorstep' ? [{ p: [0, 0.03, -1.35], s: (F && F.matWord != null) ? F.matWord : 'WELCOME' }] : [],
    at: { door:[0,1.1,0.3], mat:[0,0.02,-1.35], bell:[0.95,1.35,-0.05], street:[0,1.2,-10] },
    map(x, y, z) {
      let d = y, m = 1, o = z < -2.6 ? 4 : 0;
      let f = sdBox(x, y - 2.5, z - 3, 5, 2.5, 3);
      f = Math.max(f, -sdBox(x, y - 1.1, z + 0.02, 0.6, 1.1, 0.45));                 // deep door recess
      f = Math.max(f, -sdBox(x - 2.6, y - 2.1, z + 0.05, 0.52, 0.62, 0.2));
      f = Math.max(f, -sdBox(x + 2.6, y - 2.1, z + 0.05, 0.52, 0.62, 0.2));
      if (f < d) { d = f; m = 0; o = 0; }
      let t = doorParts(x, y, z, 0, 0, 0.58, 2.2, 0.4, 1, false); if (t < d) { d = t; m = M; o = O; }
      t = Math.min(sdBox(x - 2.6, y - 2.1, z - 0.12, 0.5, 0.6, 0.03), sdBox(x + 2.6, y - 2.1, z - 0.12, 0.5, 0.6, 0.03));
      if (t < d) { d = t; m = 3; o = 0; }
      t = Math.min(sdBox(x - 2.6, y - 2.1, z - 0.06, 0.5, 0.025, 0.03), sdBox(x - 2.6, y - 2.1, z - 0.06, 0.025, 0.6, 0.03),
                   sdBox(x + 2.6, y - 2.1, z - 0.06, 0.5, 0.025, 0.03), sdBox(x + 2.6, y - 2.1, z - 0.06, 0.025, 0.6, 0.03));
      if (t < d) { d = t; m = 6; o = 0; }
      t = Math.max((Math.abs(x) * 0.5 + (y - 5) - 2.9) / 1.118, 4.95 - y, Math.abs(z - 3) - 3.4); if (t < d) { d = t; m = 9; o = 0; }
      t = sdBox(x, y - 0.1, z + 0.5, 1.4, 0.1, 0.5); if (t < d) { d = t; m = 7; o = 0; }             // step
      if (L.mat === 'doorstep') { t = sdBox(x, y - 0.015, z + 1.35, 0.75, 0.02, 0.4); if (t < d) { d = t; m = 4; o = 2; } }   // mat
      t = sdBox(x - 0.95, y - 1.35, z + 0.02, 0.09, 0.14, 0.04); if (t < d) { d = t; m = 8; o = 3; }  // bell plate
      const bx = x - 0.95, by = y - 1.35, bz = z + 0.07;
      t = Math.sqrt(bx * bx + by * by + bz * bz) - 0.04; if (t < d) { d = t; m = 3; o = 3; }
      const lx = x, ly = y - 2.6, lz = z + 0.35;
      t = Math.sqrt(lx * lx + ly * ly + lz * lz) - 0.11; if (t < d) { d = t; m = 3; o = 0; }
      t = Math.min(sdBox(x - 1.3, y - 0.04, z + 4, 0.06, 0.04, 3.2), sdBox(x + 1.3, y - 0.04, z + 4, 0.06, 0.04, 3.2));
      if (t < d) { d = t; m = 7; o = 0; }
      M = m; O = o; return d;
    },
  };

  /* hallway: two doors on the far wall, facing you */
  SCENES.hallway = {
    cam: { x: 0, y: 1.5, z: 1.0, tx: 0, ty: 1.48, tz: 2.0 }, fov: 0.62, sky: false,
    objects: [null, 'left', 'right', 'sw', 'hook', 'frame', 'bath'],
    at: { left:[-0.95,1.05,5.3], right:[0.95,1.05,5.3], sw:[0,1.9,3.4], hook:[-1.6,1.75,3.2], frame:[0,1.55,5.0], bath:[1.7,1.0,2.4] },
    lights: (F) => F.lightsOff ? [[-0.95, 0.06, 4.8, 0.9]] : [[0, 1.35, 3.6, 3.0], [0, 2.75, -0.2, 1.0], [-0.95, 0.06, 4.8, 0.35]],
    ambient: (F) => F.lightsOff ? 0.015 : 0.15, exposure: 0.45, shadows: false,
    map(x, y, z, F) {
      const WZ = 5.0;
      let d = -sdBox(x, y - 1.5, z - 1.5, 1.7, 1.5, 4);
      let m = y < 0.03 ? 1 : (y > 2.97 ? 7 : 0);
      let o = (!F.rightDoor && m === 0 && z > WZ - 0.05 && x > 0.4 && y < 2.5) ? 2 : 0;      // "the wall on the right", until it isn't
      d = Math.max(d, -sdBox(x + 0.95, y - 1.05, z - WZ - (F.doorGone ? 4 : 0.02), 0.44, 1.07, F.doorGone ? 4 : 0.4));   // left recess (no door: just the dark)
      if (F.rightDoor) d = Math.max(d, -sdBox(x - 0.95, y - 1.05, z - WZ - 0.02, 0.44, 1.07, 0.4));
      let t;
      if (F.doorGone) {
        t = sdBox(x + 0.95, y - 1.11, z - WZ, 0.55, 1.18, 0.05); t = Math.max(t, -sdBox(x + 0.95, y - 1.05, z - WZ, 0.43, 1.06, 0.2));
        if (t < d) { d = t; m = 10; o = 1; }
      } else { t = doorParts(x, y, z, -0.95, WZ, 0.42, 2.1, 0.36, 1, true, F); if (t < d) { d = t; m = M; o = O; } }
      if (F.rightDoor) { t = doorParts(x, y, z, 0.95, WZ, 0.42, 2.1, 0.36, 2, false, F); if (t < d) { d = t; m = M; o = O; } }
      if (L.frame === 'wall') {
        t = sdBox(x, y - 1.55, z - WZ + 0.03, 0.3, 0.24, 0.04); if (t < d) { d = t; m = 6; o = 5; }   // frame
        t = sdBox(x, y - 1.55, z - WZ + 0.05, 0.24, 0.18, 0.04); if (t < d) { d = t; m = 8; o = 5; }  // picture of nothing
      } else if (L.key === 'wall') {
        // a big old key on a nail: ring, shaft, two teeth — bright so it can't be missed
        let kr = sdBox(x, y - 1.72, z - WZ + 0.03, 0.09, 0.09, 0.025); kr = Math.max(kr, -sdBox(x, y - 1.72, z - WZ + 0.03, 0.045, 0.045, 0.1));
        if (kr < d) { d = kr; m = 3; o = 5; }
        t = sdBox(x, y - 1.44, z - WZ + 0.03, 0.03, 0.2, 0.025); if (t < d) { d = t; m = 3; o = 5; }   // shaft
        t = Math.min(sdBox(x + 0.06, y - 1.27, z - WZ + 0.03, 0.06, 0.025, 0.025), sdBox(x + 0.05, y - 1.34, z - WZ + 0.03, 0.05, 0.02, 0.025));
        if (t < d) { d = t; m = 3; o = 5; }                                                             // teeth
      }
      // on the hook: one thing at most
      if (L.mat === 'hook') { t = sdBox(x + 1.6, y - 1.3, z - 3.2, 0.03, 0.36, 0.24); if (t < d) { d = t; m = 4; o = 4; } }
      if (L.frame === 'hook') { t = sdBox(x + 1.6, y - 1.42, z - 3.2, 0.03, 0.22, 0.28); if (t < d) { d = t; m = 6; o = 4; } t = sdBox(x + 1.58, y - 1.42, z - 3.2, 0.03, 0.16, 0.22); if (t < d) { d = t; m = 8; o = 4; } }
      if (L.key === 'hook') { t = sdBox(x + 1.55, y - 1.5, z - 3.2, 0.02, 0.16, 0.035); if (t < d) { d = t; m = 3; o = 4; } t = sdBox(x + 1.55, y - 1.68, z - 3.2, 0.02, 0.06, 0.06); if (t < d) { d = t; m = 3; o = 4; } }
      t = sdBox(x + 1.69, y - 1.75, z - 3.2, 0.012, 0.09, 0.05); if (t < d) { d = t; m = 8; o = 4; }   // hook plate
      t = sdBox(x + 1.60, y - 1.68, z - 3.2, 0.09, 0.018, 0.018); if (t < d) { d = t; m = 8; o = 4; }  // arm out
      t = sdBox(x + 1.52, y - 1.73, z - 3.2, 0.018, 0.06, 0.018); if (t < d) { d = t; m = 8; o = 4; }  // tip up
      t = sdBox(x - 1.68, y - 1.0, z - 2.4, 0.05, 1.0, 0.42); if (t < d) { d = t; m = 2; o = 6; }              // bathroom door, right wall
      t = sdBox(x - 1.66, y - 1.0, z - 2.4, 0.03, 1.1, 0.52); t = Math.max(t, -sdBox(x - 1.66, y - 1.0, z - 2.4, 0.1, 1.0, 0.42)); if (t < d) { d = t; m = 10; o = 6; }
      const bx2 = x - 1.62, by2 = y - 1.0, bz2 = z - 2.1;
      t = Math.sqrt(bx2 * bx2 + by2 * by2 + bz2 * bz2) - 0.04; if (t < d) { d = t; m = 8; o = 6; }
      t = sdBox(x, y - 2.3, z - 3.4, 0.012, 0.42, 0.012); if (t < d) { d = t; m = 8; o = 3; }             // pull cord
      const sx = x, sy = y - 1.84, sz = z - 3.4;
      t = Math.sqrt(sx * sx + sy * sy + sz * sz) - 0.05; if (t < d) { d = t; m = 8; o = 3; }               // its knob
      const lx = x, ly = y - 2.84, lz = z - 3.4, lz2 = z + 0.2;
      t = Math.min(Math.sqrt(lx * lx + ly * ly + lz * lz), Math.sqrt(lx * lx + ly * ly + lz2 * lz2)) - 0.16;
      if (t < d) { d = t; m = F.lightsOff ? 6 : 3; o = 0; }
      t = Math.min(sdBox(x, y - 2.94, z - 3.4, 0.02, 0.06, 0.02), sdBox(x, y - 2.94, z + 0.2, 0.02, 0.06, 0.02)); if (t < d) { d = t; m = 6; o = 0; }
      M = m; O = o; return d;
    },
  };

  SCENES.library = {
    cam: { x: 0, y: 1.5, z: -1.2, tx: 0, ty: 1.46, tz: -0.2 }, fov: 0.66, sky: false,
    objects: [null, 'shelves', 'book', 'table', 'door'],
    at: { shelves:[2.5,1.9,3], book:[0,0.83,1.6], table:[0,0.78,1.6], door:[0,1.05,7.8] },
    seated: F => F.seatL ? { x:0, y:1.15, z:0.55, tx:0, ty:0.8, tz:1.7 } : null,
    lights: () => [[0, 3.3, 1.5, 4.5], [0, 3.3, 5.5, 3.5]],
    ambient: () => 0.01, exposure: 1.05,
    map(x, y, z, F) {
      const WZ = 7.5;
      let d = -sdBox(x, y - 1.9, z - 2.75, 2.6, 1.9, 4.75); let m = y < 0.03 ? 1 : (y > 3.77 ? 7 : 0), o = 0;
      const ax = Math.abs(x);
      if (ax > 1.6 && z > -1.5 && z < WZ - 0.3) {
        const sy = 0.42, si = Math.floor(y / sy), ly = y - (si + 0.5) * sy;
        let sh = sdBox(ax - 2.45, y - si * sy, z - 3, 0.28, 0.015, 4.4); if (sh < d) { d = sh; m = 6; o = 1; }
        const bz = 0.085, bi = Math.floor(z / bz), lz = z - (bi + 0.5) * bz;
        const h = 0.13 + 0.18 * hash(bi, si), dep = 0.15 + 0.08 * hash(si, bi);
        if (si >= 0 && si < 9) {
          const bk = sdBox(ax - (2.6 - dep), ly + sy / 2 - h - 0.015, lz, dep, h, bz / 2 - 0.006);
          if (bk < d) { d = bk; m = hash(bi * 3, si * 7) > 0.5 ? 9 : 2; o = 1; }
        }
      }
      // table, near the player
      let t = sdBox(x, y - 0.78, z - 1.6, 0.95, 0.03, 0.55); if (t < d) { d = t; m = 6; o = 3; }
      t = Math.min(sdBox(x - 0.85, y - 0.38, z - 1.15, 0.03, 0.38, 0.03), sdBox(x + 0.85, y - 0.38, z - 1.15, 0.03, 0.38, 0.03),
                   sdBox(x - 0.85, y - 0.38, z - 2.05, 0.03, 0.38, 0.03), sdBox(x + 0.85, y - 0.38, z - 2.05, 0.03, 0.38, 0.03));
      if (t < d) { d = t; m = 6; o = 3; }
      // the open book: two leaves and a spine
      const bo = F.bookClosed;
      if (!bo) {
        t = Math.min(sdBox(x - 0.22, y - 0.83, z - 1.6, 0.2, 0.012, 0.28), sdBox(x + 0.22, y - 0.83, z - 1.6, 0.2, 0.012, 0.28));
        if (t < d) { d = t; m = 8; o = 2; }
        t = sdBox(x, y - 0.84, z - 1.6, 0.02, 0.02, 0.28); if (t < d) { d = t; m = 6; o = 2; }
      } else { t = sdBox(x - 0.1, y - 0.84, z - 1.6, 0.2, 0.03, 0.28); if (t < d) { d = t; m = 6; o = 2; } }
      // a door out, on the far wall
      d = Math.max(d, -sdBox(x, y - 1.05, z - WZ - 0.02, 0.44, 1.07, 0.4));
      t = doorParts(x, y, z, 0, WZ, 0.42, 2.1, 0.36, 4, false, F); if (t < d) { d = t; m = M; o = O; }
      const lx = x, ly2 = y - 3.55, lz = z - 1.5, lz2 = z - 5.5;
      t = Math.min(Math.sqrt(lx * lx + ly2 * ly2 + lz * lz) - 0.18, Math.sqrt(lx * lx + ly2 * ly2 + lz2 * lz2) - 0.18);
      if (t < d) { d = t; m = 3; o = 0; }
      M = m; O = o; return d;
    },
  };


  /* the study — behind the door on the right */
  SCENES.study = {
    cam: { x: 0, y: 1.6, z: -0.9, tx: 0, ty: 1.35, tz: 0.07 }, fov: 0.66, sky: false,
    objects: [null, 'desk', 'page', 'pen', 'chair', 'window', 'door'],
    at: { desk:[-0.6,0.76,3.0], page:[-0.45,0.8,2.9], pen:[-0.05,0.83,2.9], chair:[-0.6,0.5,2.1], window:[-0.9,1.9,4.0], door:[1.05,1.05,4.3] },
    seated: F => F.seatS ? { x:-0.6, y:1.2, z:2.1, tx:-0.51, ty:0.87, tz:3.04 } : null,
    lights: (F) => F.seatS ? [[-0.3, 1.6, 2.2, 2.4]] : [[-0.85, 1.2, 2.2, 2.4]],
    ambient: () => 0.03, exposure: 0.8, shadows: false,
    map(x, y, z, F) {
      const WZ = 4.0;
      let d = -sdBox(x, y - 1.5, z - 1.5, 1.7, 1.5, 2.5); let m = y < 0.03 ? 1 : (y > 2.97 ? 7 : 0), o = 0;
      // window on the far wall (left), a pale rectangle
      let t = sdBox(x + 0.9, y - 1.9, z - WZ + 0.02, 0.45, 0.35, 0.03); if (t < d) { d = t; m = 5; o = 5; }
      t = Math.min(sdBox(x + 0.9, y - 1.9, z - WZ + 0.04, 0.45, 0.02, 0.03), sdBox(x + 0.9, y - 1.9, z - WZ + 0.04, 0.02, 0.35, 0.03)); if (t < d) { d = t; m = 6; o = 5; }
      t = sdBox(x + 0.9, y - 1.9, z - WZ + 0.02, 0.52, 0.42, 0.03); t = Math.max(t, -sdBox(x + 0.9, y - 1.9, z - WZ, 0.45, 0.35, 0.1)); if (t < d) { d = t; m = 10; o = 5; }
      // desk under the window
      t = sdBox(x + 0.6, y - 0.76, z - 3.0, 0.85, 0.03, 0.5); if (t < d) { d = t; m = 6; o = 1; }
      t = Math.min(sdBox(x + 1.4, y - 0.37, z - 2.55, 0.03, 0.37, 0.03), sdBox(x + 1.4, y - 0.37, z - 3.45, 0.03, 0.37, 0.03), sdBox(x - 0.2, y - 0.37, z - 2.55, 0.03, 0.37, 0.03), sdBox(x - 0.2, y - 0.37, z - 3.45, 0.03, 0.37, 0.03));
      if (t < d) { d = t; m = 6; o = 1; }
      t = sdBox(x + 0.45, y - 0.8, z - 2.9, 0.3, 0.014, 0.38); if (t < d) { d = t; m = 8; o = 2; }          // the page
      if (L.pen === 'desk') { t = sdBox(x + 0.05, y - 0.83, z - 2.9, 0.035, 0.03, 0.26); if (t < d) { d = t; m = 8; o = 3; } }   // the pen
      if (L.cup === 'desk') { t = sdBox(x + 1.0, y - 0.86, z - 2.85, 0.07, 0.08, 0.07); if (t < d) { d = t; m = 8; o = 1; } }
      if (L.key === 'desk') { t = sdBox(x + 0.3, y - 0.8, z - 3.25, 0.16, 0.012, 0.03); if (t < d) { d = t; m = 3; o = 1; } }
      if (L.frame === 'desk') { t = sdBox(x + 1.05, y - 1.0, z - 3.35, 0.2, 0.18, 0.02); if (t < d) { d = t; m = 6; o = 1; } }
      if (L.box === 'desk') { t = sdBox(x + 1.0, y - 0.95, z - 3.2, 0.2, 0.17, 0.18); if (t < d) { d = t; m = 2; o = 1; } }
      if (L.mat === 'desk') { t = sdBox(x + 0.6, y - 0.8, z - 3.0, 0.6, 0.012, 0.3); if (t < d) { d = t; m = 4; o = 1; } }
      t = sdCone(x + 1.2, y - 0.79, z - 3.2, 0.03, 0.11, 0.09); if (t < d) { d = t; m = 6; o = 0; }        // lamp base
      t = sdBox(x + 1.2, y - 0.98, z - 3.2, 0.012, 0.18, 0.012); if (t < d) { d = t; m = 6; o = 0; }         // stem
      t = sdCone(x + 1.2, y - 1.08, z - 3.2, 0.3, 0.26, 0.1); t = Math.max(t, -sdCone(x + 1.2, y - 1.06, z - 3.2, 0.3, 0.24, 0.08));
      if (t < d) { d = t; m = 11; o = 0; }                                                                   // shade (glows warm)
      const lx = x + 1.2, ly = y - 1.2, lz = z - 3.2;
      t = Math.sqrt(lx * lx + ly * ly + lz * lz) - 0.07; if (t < d) { d = t; m = 3; o = 0; }                // bulb
      // chair, pulled out from the desk
      t = sdBox(x + 0.6, y - 0.46, z - 2.1, 0.24, 0.025, 0.24); if (t < d) { d = t; m = 6; o = 4; }
      t = sdBox(x + 0.6, y - 0.8, z - 1.87, 0.24, 0.32, 0.02); if (t < d) { d = t; m = 6; o = 4; }
      t = Math.min(sdBox(x + 0.84, y - 0.22, z - 1.86, 0.02, 0.22, 0.02), sdBox(x + 0.36, y - 0.22, z - 1.86, 0.02, 0.22, 0.02), sdBox(x + 0.84, y - 0.22, z - 2.34, 0.02, 0.22, 0.02), sdBox(x + 0.36, y - 0.22, z - 2.34, 0.02, 0.22, 0.02));
      if (t < d) { d = t; m = 6; o = 4; }
      // door out, far wall right
      d = Math.max(d, -sdBox(x - 1.05, y - 1.05, z - WZ - 0.02, 0.44, 1.07, 0.4));
      t = doorParts(x, y, z, 1.05, WZ, 0.42, 2.1, 0.36, 6, false, F); if (t < d) { d = t; m = M; o = O; }
      M = m; O = o; return d;
    },
  };

  /* the basement — below the library */
  SCENES.basement = {
    cam: { x: 0, y: 1.4, z: -0.6, tx: 0, ty: 1.33, tz: 0.4 }, fov: 0.7, sky: false,
    objects: [null, 'stairs', 'furnace', 'radio', 'pipes', 'door'],
    at: { stairs:[-1.75,1.3,1.4], furnace:[1.2,0.8,4.2], radio:[2.0,1.45,2.0], pipes:[0.5,2.25,2.0], door:[-0.6,1.2,4.9] },
    lights: (F) => [[0, 2.15, 1.6, 1.55], [1.2, 0.7, 3.9, F.furnaceOpen ? 0.75 : 0], [2.0, 1.45, 2.0, F.radioOn ? 0.5 : 0], [-0.6, 2.6, 4.6, 0.9]],
    ambient: () => 0.03, exposure: 0.9, shadows: false,
    map(x, y, z, F) {
      const WZ = 5.0;
      let d = -sdBox(x, y - 1.2, z - 2, 2.2, 1.2, 3); let m = y < 0.03 ? 1 : (y > 2.37 ? 7 : 0), o = 0;
      // stairs up along the left wall
      d = Math.max(d, -sdBox(x + 1.75, y - 3.2, z - 2.6, 0.5, 1.0, 0.9));                        // opening in the ceiling above the stairs (dark)
      for (let i = 0; i < 9; i++) { const t = sdBox(x + 1.75, y - (0.12 + i * 0.24), z - (0.2 + i * 0.3), 0.42, 0.12, 0.15); if (t < d) { d = t; m = 7; o = 1; } }
      for (let i = 0; i < 5; i++) { const t = sdBox(x + 1.33, y - 1.2, z - (0.2 + i * 0.6), 0.015, 1.2, 0.015); if (t < d) { d = t; m = 6; o = 1; } } // posts, floor to ceiling
      // furnace, far wall right: a squat iron box with a door and a slit of glow
      let t = sdBox(x - 1.2, y - 0.8, z - 4.6, 0.6, 0.8, 0.4); if (t < d) { d = t; m = 6; o = 2; }
      t = sdBox(x - 1.2, y - 0.7, z - 4.18, 0.35, 0.4, 0.03); if (t < d) { d = t; m = F.furnaceOpen ? 5 : 10; o = 2; }
      if (!F.furnaceOpen) { t = sdBox(x - 1.2, y - 0.5, z - 4.16, 0.28, 0.02, 0.02); if (t < d) { d = t; m = 5; o = 2; } }
      t = sdBox(x - 1.2, y - 2.0, z - 4.6, 0.12, 0.4, 0.12); if (t < d) { d = t; m = 6; o = 2; }           // flue
      // radio on a bracket, right wall
      t = sdBox(x - 2.0, y - 1.45, z - 2.0, 0.2, 0.13, 0.1); if (t < d) { d = t; m = 2; o = 3; }
      t = sdBox(x - 2.0, y - 1.3, z - 2.0, 0.22, 0.015, 0.14); if (t < d) { d = t; m = 6; o = 3; }
      const rx = x - 1.79, ry = y - 1.45, rz = z - 2.08;
      t = Math.sqrt(rx * rx + ry * ry + rz * rz) - 0.025; if (t < d) { d = t; m = F.radioOn ? 3 : 8; o = 3; }
      // pipes along the ceiling
      t = Math.min(sdBox(x - 0.5, y - 2.25, z - 2, 0.06, 0.06, 3), sdBox(x - 0.7, y - 2.25, z - 2, 0.04, 0.04, 3), sdBox(x + 0.4, y - 2.25, z - 2, 0.05, 0.05, 3));
      if (t < d) { d = t; m = 9; o = 4; }
      // a bulb
      const bx = x, by = y - 2.15, bz = z - 1.6;
      t = Math.sqrt(bx * bx + by * by + bz * bz) - 0.07; if (t < d) { d = t; m = 3; o = 0; }
      t = sdBox(x, y - 2.3, z - 1.6, 0.01, 0.1, 0.01); if (t < d) { d = t; m = 6; o = 0; }
      // stairs up to the kitchen, through an opening in the far wall, lit from above
      d = Math.max(d, -sdBox(x + 0.6, y - 1.6, z - WZ - 0.6, 0.55, 1.6, 1.0));
      for (let i = 0; i < 7; i++) { const t = sdBox(x + 0.6, y - (0.12 + i * 0.24), z - (WZ - 0.9 + i * 0.26), 0.5, 0.12, 0.13); if (t < d) { d = t; m = 7; o = 5; } }
      t = sdBox(x + 0.6, y - 3.1, z - WZ + 0.3, 0.5, 0.02, 0.5); if (t < d) { d = t; m = 3; o = 5; }          // light from the kitchen at the top
      M = m; O = o; return d;
    },
  };

  /* the kitchen — where the evening was meant to happen */
  SCENES.kitchen = {
    cam: { x: 0, y: 1.5, z: -0.8, tx: 0, ty: 1.45, tz: 0.2 }, fov: 0.7, sky: false,
    objects: [null, 'kettle', 'cups', 'fridge', 'chair', 'window', 'door', 'spare', 'table', 'mat'],
    at: { kettle:[1.62,1.1,1.0], cups:[-0.45,0.85,2.1], fridge:[1.25,0.95,3.85], chair:[-0.45,0.5,1.35], window:[1.98,1.9,1.4], door:[-1.1,1.0,4.8], spare:[-1.98,1.0,2.6], table:[-0.45,0.8,2.1], mat:[-0.45,0.02,0.85] },
    seated: F => F.seatK ? { x:-0.45, y:1.15, z:1.35, tx:0.35, ty:0.9, tz:3.8 } : null,
    lights: (F) => [[0, 2.6, 1.6, 3.2], [1.9, 1.9, 1.4, 0.9], [1.3, 1.0, 3.6, F.fridgeOpen ? 0.8 : 0]],
    ambient: () => 0.035, exposure: 0.85, shadows: false,
    map(x, y, z, F) {
      const WZ = 4.5;
      let d = -sdBox(x, y - 1.4, z - 1.55, 2.0, 1.4, 2.75); let m = y < 0.03 ? 1 : (y > 2.77 ? 7 : 0), o = 0;
      // counter along the right wall
      let t = sdBox(x - 1.7, y - 0.45, z - 1.5, 0.3, 0.45, 1.6); if (t < d) { d = t; m = 7; o = 0; }
      t = sdBox(x - 1.7, y - 0.92, z - 1.5, 0.32, 0.02, 1.62); if (t < d) { d = t; m = 8; o = 0; }
      // kettle on the counter
      const kx = x - 1.62, ky = y - 1.1, kz = z - 1.0;
      t = Math.sqrt(kx * kx + ky * ky + kz * kz) - 0.14; if (t < d) { d = t; m = 8; o = 1; }
      t = sdBox(x - 1.45, y - 1.16, z - 1.0, 0.08, 0.015, 0.015); if (t < d) { d = t; m = 8; o = 1; }
      t = sdBox(x - 1.62, y - 1.27, z - 1.0, 0.02, 0.04, 0.02); if (t < d) { d = t; m = 6; o = 1; }
      // window over the counter
      if (!F.winOpen) {
        t = sdBox(x - 1.99, y - 1.9, z - 1.4, 0.02, 0.4, 0.55); if (t < d) { d = t; m = 5; o = 5; }
        t = Math.min(sdBox(x - 1.97, y - 1.9, z - 1.4, 0.02, 0.4, 0.02), sdBox(x - 1.97, y - 1.9, z - 1.4, 0.02, 0.02, 0.55)); if (t < d) { d = t; m = 6; o = 5; }
      } else {
        d = Math.max(d, -sdBox(x - 2.1, y - 1.9, z - 1.4, 0.3, 0.4, 0.55));                                   // the opening, out to the dark
        t = sdBox(x - 1.99, y - 1.9, z - 1.4, 0.04, 0.44, 0.6); t = Math.max(t, -sdBox(x - 1.99, y - 1.9, z - 1.4, 0.2, 0.4, 0.55)); if (t < d) { d = t; m = 6; o = 5; } // frame
        t = sdBox(x - 1.7, y - 1.9, z - 0.84, 0.28, 0.4, 0.015); if (t < d) { d = t; m = 5; o = 5; }            // casement, swung in on its hinge
        t = sdBox(x - 1.7, y - 1.9, z - 0.83, 0.28, 0.02, 0.02); if (t < d) { d = t; m = 6; o = 5; }
        for (let r = 0; r < 9; r++) {                                                                         // rain beyond the sill
          const rx = 2.35 + (r % 3) * 0.22, rz = 0.95 + (r * 0.37) % 0.9, ry = 1.9 + ((r * 0.53) % 0.7) - 0.35;
          t = sdBox(x - rx, y - ry, z - rz, 0.006, 0.09, 0.006); if (t < d) { d = t; m = 3; o = 5; }
        }
      }
      // fridge, far wall right
      if (!F.fridgeOpen) {
        t = sdBox(x - 1.25, y - 0.95, z - 4.15, 0.36, 0.95, 0.32); if (t < d) { d = t; m = 8; o = 3; }         // fridge, shut
        t = sdBox(x - 0.95, y - 1.1, z - 3.82, 0.015, 0.3, 0.015); if (t < d) { d = t; m = 6; o = 3; }         // handle
      } else {
        let fb = sdBox(x - 1.25, y - 0.95, z - 4.17, 0.36, 0.95, 0.30);
        fb = Math.max(fb, -sdBox(x - 1.25, y - 0.97, z - 3.95, 0.30, 0.88, 0.30));                            // cavity
        if (fb < d) { d = fb; m = 8; o = 3; }
        t = sdBox(x - 1.25, y - 0.97, z - 4.44, 0.29, 0.86, 0.01); if (t < d) { d = t; m = 3; o = 3; }         // lit back
        t = Math.min(sdBox(x - 1.25, y - 0.7, z - 4.2, 0.29, 0.01, 0.24), sdBox(x - 1.25, y - 1.25, z - 4.2, 0.29, 0.01, 0.24)); if (t < d) { d = t; m = 8; o = 3; } // shelves
        t = sdBox(x - 0.87, y - 0.95, z - 3.52, 0.02, 0.93, 0.34); if (t < d) { d = t; m = 8; o = 3; }         // door, swung open
        t = sdBox(x - 0.83, y - 1.1, z - 3.35, 0.015, 0.3, 0.015); if (t < d) { d = t; m = 6; o = 3; }         // handle
      }
      // table and two cups
      t = sdBox(x + 0.45, y - 0.75, z - 2.1, 0.62, 0.03, 0.42); if (t < d) { d = t; m = 6; o = 8; }
      t = Math.min(sdBox(x - 0.1, y - 0.36, z - 1.75, 0.03, 0.36, 0.03), sdBox(x + 1.0, y - 0.36, z - 1.75, 0.03, 0.36, 0.03), sdBox(x - 0.1, y - 0.36, z - 2.45, 0.03, 0.36, 0.03), sdBox(x + 1.0, y - 0.36, z - 2.45, 0.03, 0.36, 0.03));
      if (t < d) { d = t; m = 6; o = 0; }
      t = sdBox(x + 0.7, y - 0.85, z - 2.2, 0.08, 0.07, 0.08); if (t < d) { d = t; m = 8; o = 2; }                         // the other cup
      if (L.cup === 'table') { t = sdBox(x + 0.2, y - 0.85, z - 2.0, 0.08, 0.07, 0.08); if (t < d) { d = t; m = 8; o = 2; } } // yours
      if (L.pen === 'table') { t = sdBox(x + 0.55, y - 0.8, z - 1.85, 0.14, 0.018, 0.02); if (t < d) { d = t; m = 8; o = 8; } }
      if (L.key === 'table') { t = sdBox(x + 0.9, y - 0.8, z - 1.95, 0.14, 0.015, 0.03); if (t < d) { d = t; m = 3; o = 8; } }
      if (L.frame === 'table') { t = sdBox(x + 0.1, y - 0.8, z - 2.35, 0.22, 0.015, 0.18); if (t < d) { d = t; m = 6; o = 8; } }
      if (L.box === 'table') { t = sdBox(x + 0.75, y - 0.95, z - 2.0, 0.2, 0.17, 0.18); if (t < d) { d = t; m = 2; o = 8; } }
      if (L.mat === 'kitchenfloor') { t = sdBox(x + 0.45, y - 0.015, z - 0.85, 0.45, 0.02, 0.28); if (t < d) { d = t; m = 4; o = 9; } }
      // chair at the table, facing away from the player
      t = sdBox(x + 0.45, y - 0.46, z - 1.35, 0.22, 0.025, 0.22); if (t < d) { d = t; m = 6; o = 4; }
      t = sdBox(x + 0.45, y - 0.78, z - 1.14, 0.22, 0.3, 0.02); if (t < d) { d = t; m = 6; o = 4; }
      t = Math.min(sdBox(x + 0.67, y - 0.22, z - 1.14, 0.02, 0.22, 0.02), sdBox(x + 0.23, y - 0.22, z - 1.14, 0.02, 0.22, 0.02), sdBox(x + 0.67, y - 0.22, z - 1.56, 0.02, 0.22, 0.02), sdBox(x + 0.23, y - 0.22, z - 1.56, 0.02, 0.22, 0.02));
      if (t < d) { d = t; m = 6; o = 4; }
      // door to the hall, far wall left; spare-room door on the left wall
      d = Math.max(d, -sdBox(x + 1.1, y - 1.0, z - WZ - 0.02, 0.42, 1.0, 0.4));
      t = doorParts(x, y, z, -1.1, WZ, 0.4, 2.0, 0.36, 6, false, F); if (t < d) { d = t; m = M; o = O; }
      t = sdBox(x + 1.98, y - 1.0, z - 2.6, 0.05, 1.0, 0.42); if (t < d) { d = t; m = 2; o = 7; }
      t = sdBox(x + 1.96, y - 1.0, z - 2.6, 0.03, 1.1, 0.52); t = Math.max(t, -sdBox(x + 1.96, y - 1.0, z - 2.6, 0.1, 1.0, 0.42)); if (t < d) { d = t; m = 10; o = 7; }
      const hx = x + 1.92, hy = y - 1.0, hz = z - 2.3;
      t = Math.sqrt(hx * hx + hy * hy + hz * hz) - 0.04; if (t < d) { d = t; m = 8; o = 7; }
      // ceiling light
      const cx2 = x, cy2 = y - 2.65, cz2 = z - 1.6;
      t = Math.sqrt(cx2 * cx2 + cy2 * cy2 + cz2 * cz2) - 0.14; if (t < d) { d = t; m = 3; o = 0; }
      M = m; O = o; return d;
    },
  };

  /* the spare room — the room that forgets */
  SCENES.spare = {
    cam: { x: 0, y: 1.45, z: -0.7, tx: 0, ty: 1.39, tz: 0.3 }, fov: 0.7, sky: false,
    objects: [null, 'chair', 'lamp', 'door', 'hatch'],
    at: { chair:[-0.2,0.5,1.3], lamp:[0.7,1.0,1.4], door:[0,1.0,3.1], hatch:[0,2.55,1.2] },
    seated: F => F.seatSp ? { x:-0.2, y:1.15, z:1.3, tx:0.1, ty:1.0, tz:3.1 } : null,
    lights: () => [[0.7, 1.15, 1.4, 2.2]],
    ambient: () => 0.02, exposure: 0.9, shadows: false,
    map(x, y, z, F) {
      const WZ = 2.8;
      let d = -sdBox(x, y - 1.3, z - 1.0, 1.4, 1.3, 1.8); let m = y < 0.03 ? 1 : (y > 2.57 ? 7 : 0), o = 0;
      // one chair, facing the door
      let t = sdBox(x + 0.2, y - 0.46, z - 1.3, 0.22, 0.025, 0.22); if (t < d) { d = t; m = 6; o = 1; }
      t = sdBox(x + 0.2, y - 0.78, z - 1.09, 0.22, 0.3, 0.02); if (t < d) { d = t; m = 6; o = 1; }
      t = Math.min(sdBox(x + 0.42, y - 0.22, z - 1.09, 0.02, 0.22, 0.02), sdBox(x - 0.02, y - 0.22, z - 1.09, 0.02, 0.22, 0.02), sdBox(x + 0.42, y - 0.22, z - 1.51, 0.02, 0.22, 0.02), sdBox(x - 0.02, y - 0.22, z - 1.51, 0.02, 0.22, 0.02));
      if (t < d) { d = t; m = 6; o = 1; }
      // a lamp on the floor
      t = sdCone(x - 0.7, y, z - 1.4, 0.04, 0.16, 0.13); if (t < d) { d = t; m = 6; o = 2; }                   // floor lamp base
      t = sdBox(x - 0.7, y - 0.55, z - 1.4, 0.012, 0.55, 0.012); if (t < d) { d = t; m = 6; o = 2; }            // stem
      t = sdCone(x - 0.7, y - 1.0, z - 1.4, 0.3, 0.24, 0.12); t = Math.max(t, -sdCone(x - 0.7, y - 0.98, z - 1.4, 0.3, 0.22, 0.1));
      if (t < d) { d = t; m = 11; o = 2; }                                                                        // shade (glows warm)
      const lx = x - 0.7, ly = y - 1.12, lz = z - 1.4;
      t = Math.sqrt(lx * lx + ly * ly + lz * lz) - 0.06; if (t < d) { d = t; m = 3; o = 2; }                     // bulb
      // door, far wall
      d = Math.max(d, -sdBox(x, y - 1.0, z - WZ - 0.02, 0.4, 1.0, 0.4));
      t = doorParts(x, y, z, 0, WZ, 0.38, 2.0, 0.36, 3, false, F); if (t < d) { d = t; m = M; o = O; }
      // hatch in the ceiling, a framed square (open = dark)
      t = sdBox(x, y - 2.58, z - 1.2, 0.42, 0.02, 0.42); t = Math.max(t, -sdBox(x, y - 2.58, z - 1.2, 0.34, 0.1, 0.34)); if (t < d) { d = t; m = 6; o = 4; }
      if (F.hatchOpen) d = Math.max(d, -sdBox(x, y - 3.0, z - 1.2, 0.34, 0.5, 0.34)); else { t = sdBox(x, y - 2.585, z - 1.2, 0.34, 0.012, 0.34); if (t < d) { d = t; m = 2; o = 4; } }
      M = m; O = o; return d;
    },
  };


  /* the bathroom — off the hallway, unmentioned */
  SCENES.bathroom = {
    cam: { x: 0, y: 1.5, z: -0.6, tx: 0, ty: 1.4, tz: 0.5 }, fov: 0.7, sky: false,
    objects: [null, 'mirror', 'sink', 'bath', 'tap', 'door'],
    at: { mirror:[0,1.75,2.55], sink:[0,0.85,2.3], bath:[1.1,0.5,1.2], tap:[0.15,1.0,2.45], door:[-1.0,1.0,2.6] },
    lights: () => [[0, 2.35, 1.0, 2.6], [0, 1.9, 2.3, 0.6]],
    ambient: () => 0.03, exposure: 0.85, shadows: false,
    map(x, y, z, F) {
      const WZ = 2.6;
      let d = -sdBox(x, y - 1.25, z - 0.8, 1.6, 1.25, 1.8); let m = y < 0.03 ? 1 : (y > 2.47 ? 7 : 8), o = 0;   // tiled: bright walls
      // sink on a pedestal, far wall
      let t = sdBox(x, y - 0.85, z - 2.35, 0.3, 0.06, 0.22); t = Math.max(t, -sdBox(x, y - 0.9, z - 2.35, 0.24, 0.06, 0.16)); if (t < d) { d = t; m = 8; o = 2; }
      t = sdBox(x, y - 0.4, z - 2.4, 0.12, 0.4, 0.12); if (t < d) { d = t; m = 8; o = 2; }
      t = sdBox(x - 0.15, y - 0.98, z - 2.5, 0.015, 0.08, 0.015); if (t < d) { d = t; m = 6; o = 4; }             // tap
      t = sdBox(x - 0.1, y - 1.06, z - 2.45, 0.07, 0.012, 0.012); if (t < d) { d = t; m = 6; o = 4; }
      // mirror above the sink: a pale rectangle in a frame
      t = sdBox(x, y - 1.75, z - WZ + 0.03, 0.42, 0.3, 0.03); if (t < d) { d = t; m = 6; o = 1; }
      t = sdBox(x, y - 1.75, z - WZ + 0.05, 0.36, 0.24, 0.03); if (t < d) { d = t; m = 5; o = 1; }
      // bath along the right wall
      t = sdBox(x - 1.1, y - 0.3, z - 1.2, 0.45, 0.3, 0.9); t = Math.max(t, -sdBox(x - 1.1, y - 0.4, z - 1.2, 0.38, 0.3, 0.82)); if (t < d) { d = t; m = 8; o = 3; }
      // door, far wall left
      d = Math.max(d, -sdBox(x + 1.0, y - 1.0, z - WZ - 0.02, 0.4, 1.0, 0.4));
      t = doorParts(x, y, z, -1.0, WZ, 0.38, 2.0, 0.36, 5, false, F); if (t < d) { d = t; m = M; o = O; }
      const lx = x, ly = y - 2.4, lz = z - 1.0;
      t = Math.sqrt(lx * lx + ly * ly + lz * lz) - 0.1; if (t < d) { d = t; m = 3; o = 0; }
      M = m; O = o; return d;
    },
  };

  /* the attic — through the hatch above the spare room */
  SCENES.attic = {
    cam: { x: 0, y: 1.3, z: -1.4, tx: 0, ty: 0.75, tz: 0.2 }, fov: 0.72, sky: false,
    objects: [null, 'boxes', 'trunk', 'window', 'hatch', 'model'],
    at: { boxes:[-1.1,0.5,1.6], trunk:[0.9,0.35,2.2], window:[0,1.5,4.4], hatch:[0,0.02,0.1], model:[0.9,0.5,2.2] },
    lights: () => [[0, 1.9, 1.2, 1.6], [0, 1.5, 4.2, 0.5]],
    ambient: () => 0.02, exposure: 0.9, shadows: false,
    map(x, y, z, F) {
      // a roof-shaped room: floor, two sloped planes meeting at y=2.4, end walls at z=-2 and z=4.5
      const k = 0.9, roof = (2.4 - y - Math.abs(x) * k) / Math.sqrt(1 + k * k);
      let d = Math.min(y, roof, z + 2.0, 4.5 - z); let m = y < 0.03 ? 1 : 9, o = 0;
      if (roof < y && roof < z + 2.0 && roof < 4.5 - z) m = 9; else if (y <= roof) m = 1;
      // rafters
      for (let i = 0; i < 6; i++) { const t = Math.max(Math.abs(z - (-1.4 + i * 1.1)) - 0.04, roof - 0.08); if (t < d) { d = t; m = 6; o = 0; } }
      // boxes, left
      let t = Math.min(sdBox(x + 1.1, y - 0.3, z - 1.6, 0.35, 0.3, 0.35), sdBox(x + 0.4, y - 0.25, z - 2.6, 0.3, 0.25, 0.3));
      if (L.box === 'attic') t = Math.min(t, sdBox(x + 1.15, y - 0.85, z - 1.5, 0.28, 0.25, 0.28));   // the top one: the one you can take
      if (t < d) { d = t; m = 2; o = 1; }
      // trunk, right (opens)
      t = sdBox(x - 0.9, y - 0.3, z - 2.2, 0.5, 0.3, 0.35); if (F.trunkOpen) t = Math.max(t, -sdBox(x - 0.9, y - 0.45, z - 2.2, 0.44, 0.3, 0.29)); if (t < d) { d = t; m = 6; o = 2; }
      if (F.trunkOpen) {
        t = sdBox(x - 0.9, y - 0.75, z - 2.58, 0.5, 0.3, 0.03); if (t < d) { d = t; m = 6; o = 2; }        // lid up
        // the model of the house, sitting inside: a small facade with a roof and a lit window
        t = sdBox(x - 0.9, y - 0.5, z - 2.2, 0.32, 0.2, 0.2); if (t < d) { d = t; m = 0; o = 5; }
        t = Math.max((Math.abs(x - 0.9) * 0.6 + (y - 0.7) - 0.19) / 1.166, 0.69 - y, Math.abs(z - 2.2) - 0.22); if (t < d) { d = t; m = 9; o = 5; }
        t = Math.min(sdBox(x - 0.78, y - 0.52, z - 1.99, 0.06, 0.06, 0.01), sdBox(x - 1.02, y - 0.52, z - 1.99, 0.06, 0.06, 0.01)); if (t < d) { d = t; m = 3; o = 5; }
      } else { t = sdBox(x - 0.9, y - 0.62, z - 2.2, 0.5, 0.03, 0.35); if (t < d) { d = t; m = 6; o = 2; } }
      // round window at the far end (a disc)
      t = Math.max(Math.sqrt(x * x + (y - 1.5) * (y - 1.5)) - 0.35, Math.abs(z - 4.45) - 0.03); if (t < d) { d = t; m = 5; o = 3; }
      t = Math.max(Math.abs(Math.sqrt(x * x + (y - 1.5) * (y - 1.5)) - 0.37) - 0.03, Math.abs(z - 4.42) - 0.03); if (t < d) { d = t; m = 6; o = 3; }
      // hatch in the floor, near the player (dark)
      t = sdBox(x, y - 0.03, z - 0.1, 0.42, 0.03, 0.42); t = Math.max(t, -sdBox(x, y - 0.03, z - 0.1, 0.34, 0.1, 0.34)); if (t < d) { d = t; m = 6; o = 4; }   // hatch frame
      d = Math.max(d, -sdBox(x, y + 0.5, z - 0.1, 0.34, 0.55, 0.34));                                                        // the drop, dark
      const lx = x, ly = y - 1.9, lz = z - 1.2;
      t = Math.sqrt(lx * lx + ly * ly + lz * lz) - 0.07; if (t < d) { d = t; m = 3; o = 0; }
      t = sdBox(x, y - 2.1, z - 1.2, 0.01, 0.2, 0.01); if (t < d) { d = t; m = 6; o = 0; }
      M = m; O = o; return d;
    },
  };

  /* the conservatory — glass on a low brick wall, off the kitchen's back door; the plants were here first */
  SCENES.conservatory = {
    cam: { x: 0, y: 1.55, z: -0.75, tx: 0, ty: 1.42, tz: 0.25 }, fov: 0.74, sky: false,
    objects: [null, 'fern', 'plant', 'pots', 'can', 'chair', 'glass', 'door'],
    at: { fern:[-0.75,1.95,1.7], plant:[1.3,1.1,1.6], pots:[-1.55,0.9,1.7], can:[-0.95,0.2,0.55], chair:[-0.3,0.55,1.75], glass:[1.95,1.5,1.2], door:[0.3,1.05,3.35] },
    seated: F => F.seatC ? { x:-0.1, y:1.1, z:-0.35, tx:-0.05, ty:1.28, tz:0.8 } : null,      // low down, where you can see all of them
    lights: () => [[0, 2.4, 0.9, 2.6], [0, 1.9, -1.1, 1.2], [0, 1.4, 4.5, 0.35]],
    ambient: () => 0.05, exposure: 1.15, shadows: false,
    map(x, y, z, F) {
      const ax = Math.abs(x), FZ = 3.4, roof = (y - 2.3 - (2.0 - ax) * 0.42) / 1.084;
      const shell = Math.max(sdBox(x, y - 1.6, z - (FZ - 1.3) / 2, 2.0, 1.6, (FZ + 1.3) / 2), roof);
      let d = -shell, m = 12, o = 6;
      if (y < 0.03) { m = 1; o = 0; }                                                  // tiles
      else if (z < -1.24) { m = 0; o = 0; }                                            // the back of the house
      else if (z > FZ - 0.05 && Math.abs(x - 0.3) < 0.47 && y < 2.12) {                               // the glass door, out to the garden
        o = 7; m = (Math.abs(x - 0.3) > 0.41 || y > 2.06 || (y > 1.02 && y < 1.08)) ? 10 : 12;
      }
      else if (y < 0.6) { m = 0; o = 6; }                                             // the low brick wall the glass stands on
      else {
        const bar = (v, step) => { const f = ((v % step) + step) % step; return f < 0.035 || f > step - 0.035; };
        const onRoof = y > 2.28 && ax < 1.98;
        if (Math.abs(y - 0.62) < 0.035 || Math.abs(y - 2.3) < 0.04) m = 7;              // sill and eaves (white-painted, like every conservatory)
        else if (onRoof) { if (bar(z + 1.3, 0.6) || ax < 0.04) m = 7; }                   // roof bars and ridge
        else if (z > FZ - 0.05) { if (bar(x + 2.0, 0.5)) m = 7; }                         // far end mullions
        else if (bar(z + 1.3, 0.6)) m = 7;                                                // side mullions
      }
      let t;
      // staging along the left: a shelf of seedlings in pots
      t = sdBox(x + 1.6, y - 0.72, z - 1.7, 0.28, 0.025, 1.1); if (t < d) { d = t; m = 6; o = 3; }
      t = Math.min(sdBox(x + 1.37, y - 0.36, z - 0.7, 0.025, 0.36, 0.025), sdBox(x + 1.37, y - 0.36, z - 2.7, 0.025, 0.36, 0.025), sdBox(x + 1.83, y - 0.36, z - 0.7, 0.025, 0.36, 0.025), sdBox(x + 1.83, y - 0.36, z - 2.7, 0.025, 0.36, 0.025)); if (t < d) { d = t; m = 6; o = 3; }
      for (let k = 0; k < 5; k++) {
        const pz = 0.8 + k * 0.45;
        t = sdCone(x + 1.6, y - 0.745, z - pz, 0.15, 0.075, 0.1); if (t < d) { d = t; m = 2; o = 3; }
        const r = 0.07 + (k % 3) * 0.025, hy = 0.96 + (k % 2) * 0.05;
        t = Math.sqrt((x + 1.6) ** 2 + (y - hy) ** 2 * 1.4 + (z - pz) ** 2) - r; if (t < d) { d = t; m = 9; o = 3; }
      }
      // the big plant, front right: a pot, and more of it than there should be
      t = sdCone(x - 1.3, y, z - 1.6, 0.5, 0.26, 0.33); if (t < d) { d = t; m = 2; o = 2; }
      t = sdBox(x - 1.3, y - 0.8, z - 1.6, 0.03, 0.35, 0.03); if (t < d) { d = t; m = 6; o = 2; }
      {
        const B = [[1.3, 1.15, 1.6, 0.4], [1.0, 1.5, 1.7, 0.33], [1.55, 1.6, 1.45, 0.34], [1.25, 1.95, 1.75, 0.3], [1.7, 1.2, 1.9, 0.26]];
        for (const [bx, by, bz, br] of B) { t = Math.sqrt((x - bx) ** 2 + (y - by) ** 2 * 1.3 + (z - bz) ** 2) - br; if (t < d) { d = t; m = 9; o = 2; } }
      }
      // the fern, hanging from the roof in a basket
      t = sdBox(x + 0.75, y - 2.55, z - 1.7, 0.008, 0.3, 0.008); if (t < d) { d = t; m = 8; o = 1; }
      t = Math.max(Math.sqrt((x + 0.75) ** 2 + (y - 2.2) ** 2 + (z - 1.7) ** 2) - 0.19, y - 2.24); if (t < d) { d = t; m = 2; o = 1; }
      {
        const B = [[-0.75, 2.02, 1.7, 0.24], [-1.03, 1.86, 1.75, 0.16], [-0.47, 1.84, 1.65, 0.17], [-0.75, 1.72, 1.9, 0.14], [-0.8, 1.78, 1.48, 0.15]];
        for (const [bx, by, bz, br] of B) { t = Math.sqrt((x - bx) ** 2 + (y - by) ** 2 * 1.6 + (z - bz) ** 2) - br; if (t < d) { d = t; m = 9; o = 1; } }
      }
      // a wicker chair in the middle, facing the glass door (not drawn while you're the one sitting in it)
      if (!F.seatC) {
      t = sdBox(x + 0.3, y - 0.45, z - 1.75, 0.28, 0.04, 0.26); if (t < d) { d = t; m = 6; o = 5; }
      t = sdBox(x + 0.3, y - 0.8, z - 1.5, 0.3, 0.32, 0.03); if (t < d) { d = t; m = 6; o = 5; }
      t = Math.min(sdBox(x + 0.03, y - 0.62, z - 1.75, 0.03, 0.16, 0.25), sdBox(x + 0.57, y - 0.62, z - 1.75, 0.03, 0.16, 0.25)); if (t < d) { d = t; m = 6; o = 5; }
      t = Math.min(sdBox(x + 0.05, y - 0.2, z - 1.52, 0.025, 0.22, 0.025), sdBox(x + 0.55, y - 0.2, z - 1.52, 0.025, 0.22, 0.025), sdBox(x + 0.05, y - 0.2, z - 1.98, 0.025, 0.22, 0.025), sdBox(x + 0.55, y - 0.2, z - 1.98, 0.025, 0.22, 0.025)); if (t < d) { d = t; m = 6; o = 5; }
      }
      // the watering can, on the floor by the shelf, unless you've got it
      if (!F.can) {
        t = sdBox(x + 0.95, y - 0.15, z - 0.55, 0.12, 0.15, 0.08); if (t < d) { d = t; m = 8; o = 4; }
        t = sdBox(x + 0.73, y - 0.24, z - 0.55, 0.11, 0.015, 0.015); if (t < d) { d = t; m = 8; o = 4; }
        t = sdBox(x + 0.95, y - 0.36, z - 0.55, 0.08, 0.015, 0.012); if (t < d) { d = t; m = 8; o = 4; }
      }
      // the handle of the glass door
      const hx = x - 0.63, hy = y - 1.0, hz = z - (FZ - 0.04);
      t = Math.sqrt(hx * hx + hy * hy + hz * hz) - 0.04; if (t < d) { d = t; m = 8; o = 7; }
      M = m; O = o; return d;
    },
  };

  /* the garden — out of the kitchen window; the back of the house behind you */
  SCENES.garden = {
    cam: { x: 0.6, y: 1.5, z: 5.4, tx: 0.53, ty: 1.49, tz: 4.4 }, fov: 0.75, sky: true,
    views: { tree: { x: 0.2, y: 1.6, z: 4.6, tx: 2.2, ty: 1.7, tz: 3.4 } },
    seated: F => F.seatG ? { x:-1.2, y:1.1, z:2.62, tx:-0.7, ty:1.95, tz:-1.0 } : null,      // on the bench, looking back at the house
    objects: [null, 'bench', 'tree', 'shed', 'window', 'gate', 'glass'],
    at: { bench:[-1.2,0.5,2.6], tree:[2.2,1.8,3.4], shed:[-2.4,1.0,5.2], window:[0.4,1.7,-0.9], gate:[1.0,1.0,7.6], glass:[-2.3,1.2,0.95] },
    lights: () => [[0.4, 1.7, 4.2, 2.0], [0, 6, 3, 1.2]],
    ambient: () => 0.025, exposure: 1.25,
    map(x, y, z, F) {
      let d = y, m = 1, o = 0;                                                       // wet grass
      // the back wall of the house, behind the player, with the kitchen window in it
      let w = sdBox(x, y - 1.6, z + 1.2, 4, 1.6, 0.3); w = Math.max(w, -sdBox(x - 0.4, y - 1.7, z + 0.9, 0.55, 0.4, 0.2)); if (w < d) { d = w; m = 0; o = 0; }
      let t = sdBox(x - 0.4, y - 1.7, z + 1.0, 0.5, 0.35, 0.02); if (t < d) { d = t; m = 3; o = 4; }     // lit kitchen window
      t = Math.min(sdBox(x - 0.4, y - 1.7, z + 0.97, 0.5, 0.02, 0.02), sdBox(x - 0.4, y - 1.7, z + 0.97, 0.02, 0.35, 0.02)); if (t < d) { d = t; m = 6; o = 4; }
      // the conservatory, a glass lean-to against the back of the house, lit from inside
      t = Math.max(sdBox(x + 2.3, y - 1.2, z + 0.05, 1.0, 1.2, 0.95), (y - 2.4 + (z + 0.05) * 0.35) / 1.06);
      if (t < d) { d = t; o = 6; const f = v => { const q = ((v % 0.5) + 0.5) % 0.5; return q < 0.035 || q > 0.465; };
        m = y < 0.5 ? 0 : (f(x + 3.3) || f(z + 1.0) || Math.abs(y - 0.52) < 0.04 || (x > -1.36 && x < -1.24 && y < 2.0) ? 6 : 5); }
      // bench
      t = sdBox(x + 1.2, y - 0.45, z - 2.6, 0.55, 0.03, 0.2); if (t < d) { d = t; m = 6; o = 1; }
      t = sdBox(x + 1.2, y - 0.75, z - 2.78, 0.55, 0.22, 0.02); if (t < d) { d = t; m = 6; o = 1; }   // backrest on the far side: it faces the house
      t = Math.min(sdBox(x + 1.7, y - 0.22, z - 2.6, 0.03, 0.22, 0.18), sdBox(x + 0.7, y - 0.22, z - 2.6, 0.03, 0.22, 0.18)); if (t < d) { d = t; m = 6; o = 1; }
      // tree: trunk and a blobby crown
      t = Math.max(Math.sqrt((x - 2.2) * (x - 2.2) + (z - 3.4) * (z - 3.4)) - 0.16, Math.abs(y - 1.0) - 1.0); if (t < d) { d = t; m = 6; o = 2; }
      const cx = x - 2.2, cy = y - 2.6, cz = z - 3.4;
      t = Math.min(Math.sqrt(cx * cx + cy * cy + cz * cz) - 0.9, Math.sqrt((cx - 0.5) ** 2 + (cy - 0.4) ** 2 + (cz + 0.3) ** 2) - 0.6, Math.sqrt((cx + 0.5) ** 2 + (cy + 0.2) ** 2 + (cz - 0.4) ** 2) - 0.55);
      if (t < d) { d = t; m = 9; o = 2; }
      // shed, back left, with a locked door
      t = sdBox(x + 2.4, y - 1.0, z - 5.2, 0.9, 1.0, 0.7); if (t < d) { d = t; m = 2; o = 3; }
      t = Math.max((Math.abs(x + 2.4) * 0.6 + (y - 2.0) - 0.55) / 1.166, 1.98 - y, Math.abs(z - 5.2) - 0.8); if (t < d) { d = t; m = 9; o = 3; }
      t = sdBox(x + 2.4, y - 0.8, z - 4.48, 0.3, 0.8, 0.03); if (t < d) { d = t; m = 6; o = 3; }
      // fence and gate at the far end
      for (let i = -6; i <= 6; i++) { const t2 = sdBox(x - i * 0.55, y - 0.6, z - 7.6, 0.03, 0.6, 0.03); if (t2 < d) { d = t2; m = 6; o = 0; } }
      t = Math.min(sdBox(x, y - 0.9, z - 7.6, 3.4, 0.03, 0.03), sdBox(x, y - 0.4, z - 7.6, 3.4, 0.03, 0.03)); if (t < d) { d = t; m = 6; o = 0; }
      t = sdBox(x - 1.0, y - 0.65, z - 7.62, 0.45, 0.6, 0.04); if (t < d) { d = t; m = 10; o = 5; }
      M = m; O = o; return d;
    },
  };

  /* ── renderer ── */
  const depth = new Float32Array(W * H), bright = new Float32Array(W * H);
  const mat = new Uint8Array(W * H), obj = new Uint8Array(W * H);
  const chars = new Array(W * H); const star = new Uint8Array(W * H), skym = new Uint8Array(W * H);

  /* camera for this frame: a close-up on `focus`, else the seat, else the room's own */
  function cameraFor(S, F, focus) {
    const base = (S.seated && S.seated(F)) || { x: S.cam.x, y: S.cam.y, z: S.cam.z, tx: S.cam.tx != null ? S.cam.tx : S.cam.x, ty: S.cam.ty, tz: S.cam.tz != null ? S.cam.tz : S.cam.z + 5.5 };
    if (focus && S.views && S.views[focus]) return S.views[focus];
    if (focus && S.at && S.at[focus]) {
      const p = S.at[focus];
      L = locs(F);
      // walk toward the thing, but never end up inside something
      for (let k = focus === 'street' ? 0.25 : 0.62; k >= 0; k -= 0.08) {
        const cx = base.x + (p[0] - base.x) * k, cz = base.z + (p[2] - base.z) * k;
        const cy = Math.min(2.2, Math.max(0.9, p[1] < 1.0 ? p[1] + 0.9 : p[1] + 0.25));
        if (S.map(cx, cy, cz, F) > 0.3) return { x: cx, y: cy, z: cz, tx: p[0], ty: p[1], tz: p[2] };
      }
      return Object.assign({}, base, { tx: p[0], ty: p[1], tz: p[2] });
    }
    return base;
  }

  /* trace the scene into buffers of size Wd×Hd. opts may override cam, lights, ambient, exposure, fov. */
  function trace(S, F, Wd, Hd, buf, opts) {
    L = locs(F);
    const map = S.map; const TANH = (opts && opts.fov) || S.fov || 0.7;
    const C = (opts && opts.cam) || cameraFor(S, F, opts && opts.focus);
    const cx = C.x, cy = C.y, cz = C.z;
    const LT = (opts && opts.lights) || S.lights(F), amb = (opts && opts.ambient != null) ? opts.ambient : S.ambient(F);
    const expo = (opts && opts.exposure != null) ? opts.exposure : (S.exposure || 1);
    const ASP = (Wd * (opts && opts.cw != null ? opts.cw : CW)) / Hd;
    let fx = C.tx - cx, fy = C.ty - cy, fz = C.tz - cz; { const l = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1; fx /= l; fy /= l; fz /= l; }
    let rx = fz, ry = 0, rz = -fx; { const l = Math.sqrt(rx * rx + rz * rz) || 1; rx /= l; rz /= l; }
    const ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
    const { depth, bright, mat, obj } = buf;
    for (let j = 0; j < Hd; j++) {
      for (let i = 0; i < Wd; i++) {
        const u = ((i + 0.5) / Wd * 2 - 1) * ASP * TANH, v = (1 - (j + 0.5) / Hd * 2) * TANH;
        let dx = fx + u * rx + v * ux, dy = fy + u * ry + v * uy, dz = fz + u * rz + v * uz;
        const inv = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz); dx *= inv; dy *= inv; dz *= inv;
        let dist = 0, hit = false, px = 0, py = 0, pz = 0, mm = 0, oo = 0;
        for (let s = 0; s < 110; s++) {
          px = cx + dx * dist; py = cy + dy * dist; pz = cz + dz * dist;
          const d = map(px, py, pz, F);
          if (d < 0.003) { hit = true; mm = M; oo = O; break; }
          dist += d; if (dist > 40) break;
        }
        const k = j * Wd + i;
        if (!hit) { depth[k] = 99; bright[k] = 0; mat[k] = 255; obj[k] = 0;
          if (S.sky && dy > 0.02) { const hh = hash(Math.floor(dx * 300), Math.floor(dy * 300)); bright[k] = hh > 0.996 ? 0.6 : hh > 0.985 ? 0.3 : hh > 0.968 ? 0.16 : 0; }
          continue;
        }
        depth[k] = dist; mat[k] = mm; obj[k] = oo;
        if (EMIT[mm] !== undefined) { bright[k] = EMIT[mm]; continue; }
        const e = 0.01;
        const nx = map(px + e, py, pz, F) - map(px - e, py, pz, F);
        const ny = map(px, py + e, pz, F) - map(px, py - e, pz, F);
        const nz = map(px, py, pz + e, F) - map(px, py, pz - e, F);
        const ninv = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
        const Nx = nx * ninv, Ny = ny * ninv, Nz = nz * ninv;
        let b = amb;
        for (let li = 0; li < LT.length; li++) {
          const lx = LT[li][0] - px, ly = LT[li][1] - py, lz = LT[li][2] - pz;
          const ld = Math.sqrt(lx * lx + ly * ly + lz * lz), il = 1 / ld;
          const ndl = Nx * lx * il + Ny * ly * il + Nz * lz * il;
          if (ndl <= 0) continue;
          let sh = 1;
          if (li === 0 && S.shadows !== false) {
            let st = 0.05, ox = px + Nx * 0.02, oy = py + Ny * 0.02, oz = pz + Nz * 0.02;
            for (let s = 0; s < 28 && st < ld - 0.1; s++) {
              const dd = map(ox + lx * il * st, oy + ly * il * st, oz + lz * il * st, F);
              if (dd < 0.002) { sh = 0.15; break; }
              sh = Math.min(sh, 14 * dd / st); st += Math.max(dd, 0.04);
            }
          }
          b += ndl * LT[li][3] / (1 + 0.35 * ld * ld) * sh;
        }
        b *= A[mm] * expo; b *= Math.exp(-dist * 0.05);
        bright[k] = b;
      }
    }
    return { C, rx, ry, rz, ux, uy, uz, fx, fy, fz, ASP, TANH };
  }

  function render(sceneId, F, focus, opts) {
    const S = SCENES[sceneId];
    const cam = trace(S, F, W, H, { depth, bright, mat, obj }, Object.assign({ focus }, opts || {}));
    const { C, rx, ry, rz, ux, uy, uz, fx, fy, fz, ASP, TANH } = cam;
    const sm = new Float32Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i; let acc = 0, n = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const jj = j + dj, ii = i + di; if (jj < 0 || jj >= H || ii < 0 || ii >= W) continue;
        const kk = jj * W + ii; if (mat[kk] !== mat[k] || Math.abs(depth[kk] - depth[k]) > 0.3 + depth[k] * 0.08) continue;
        acc += bright[kk]; n++;
      }
      sm[k] = n ? acc / n : bright[k];
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, dk = depth[k], b = sm[k], mm = mat[k];
      const dl = i > 0 ? depth[k - 1] : dk, dr = i + 1 < W ? depth[k + 1] : dk;
      const du = j > 0 ? depth[k - W] : dk, dd = j + 1 < H ? depth[k + W] : dk;
      const thr = 0.6 + dk * 0.14;
      const eH = Math.abs(dr - 2 * dk + dl) > thr && (dk < dr || dk < dl);
      const eV = Math.abs(dd - 2 * dk + du) > thr && (dk < dd || dk < du);
      if (dk < 90 && (eH || eV)) chars[k] = eH && !eV ? '|' : (eV && !eH ? '_' : '+');
      else { const ramp = mm === 1 ? FLOOR : (mm === 4 ? MATR : RAMP); chars[k] = ramp[Math.round(Math.min(1, b) ** 0.7 * (ramp.length - 1))]; }
    }
    for (let k = 0; k < W * H; k++) { star[k] = (mat[k] === 255 && bright[k] > 0) ? 1 : 0; skym[k] = mat[k] === 255 ? 1 : 0; }
    const texts = typeof S.text === 'function' ? S.text(F) : (S.text || []), under = [];
    for (const T of texts) {
      const wx = T.p[0] - C.x, wy = T.p[1] - C.y, wz = T.p[2] - C.z;
      const vx = wx * rx + wy * ry + wz * rz, vy = wx * ux + wy * uy + wz * uz, vz = wx * fx + wy * fy + wz * fz;
      if (vz > 0.2) {
        const su = vx / vz / (ASP * TANH), sv = vy / vz / TANH;
        const ci = Math.round((su + 1) / 2 * W - T.s.length / 2), cj = Math.round((1 - sv) / 2 * H);
        if (cj >= 0 && cj < H) for (let n = 0; n < T.s.length; n++) if (ci + n >= 0 && ci + n < W) { under.push([cj * W + ci + n, chars[cj * W + ci + n]]); chars[cj * W + ci + n] = T.s[n]; }
      }
    }
    let glass = null; for (let k = 0; k < W * H; k++) if (mat[k] === 12) { if (!glass) glass = new Uint8Array(W * H); glass[k] = 1; }
    return { chars, obj, star, sky: skym, objects: S.objects, under, glass };
  }

  /* pixel render at any size, for the viewer: returns {bright, obj, depth, mat} */
  function renderPixels(sceneId, F, Wd, Hd, opts) {
    const S = SCENES[sceneId];
    const buf = { depth: new Float32Array(Wd * Hd), bright: new Float32Array(Wd * Hd), mat: new Uint8Array(Wd * Hd), obj: new Uint8Array(Wd * Hd) };
    trace(S, F, Wd, Hd, buf, Object.assign({ cw: 1 }, opts || {}));
    return Object.assign(buf, { objects: S.objects });
  }

  function toText(fr) {
    let out = '';
    for (let j = 0; j < H; j++) { let row = ''; for (let i = 0; i < W; i++) row += fr.chars[j * W + i]; out += row + (j < H - 1 ? '\n' : ''); }
    return out;
  }
  const TWINKLE = " .'.*.+.";
  function toHTML(fr, hi, phase) {
    let out = '';
    for (let j = 0; j < H; j++) {
      let row = '', open = '';
      for (let i = 0; i < W; i++) {
        const k = j * W + i, ob = fr.obj[k], cls = (fr.tint && fr.tint[k]) ? 'st' : (fr.glint && fr.glint[k]) ? 'hi' : (fr.wet && fr.wet[k]) ? 'rn' : (ob === 0 || ob === fr.mute) ? '' : (ob === hi ? 'hi' : 'o');
        if (cls !== open) { if (open) row += '</span>'; if (cls) row += '<span class="' + cls + '">'; open = cls; }
        let c = fr.chars[k];
        if (phase != null && fr.star && fr.star[k]) c = TWINKLE[Math.floor(hash(k, phase) * TWINKLE.length)];
        row += c === '<' ? '&lt;' : (c === '&' ? '&amp;' : c);
      }
      if (open) row += '</span>';
      out += row + (j < H - 1 ? '\n' : '');
    }
    return out;
  }
  function project(sceneId, F, cam, p) {
    const S = SCENES[sceneId], C = cam || cameraFor(S, F, null), TANH = S.fov || 0.7;
    let fx = C.tx - C.x, fy = C.ty - C.y, fz = C.tz - C.z; { const l = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1; fx /= l; fy /= l; fz /= l; }
    let rx = fz, ry = 0, rz = -fx; { const l = Math.sqrt(rx * rx + rz * rz) || 1; rx /= l; rz /= l; }
    const ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
    const wx = p[0] - C.x, wy = p[1] - C.y, wz = p[2] - C.z;
    const vx = wx * rx + wy * ry + wz * rz, vy = wx * ux + wy * uy + wz * uz, vz = wx * fx + wy * fy + wz * fz;
    if (vz < 0.05) return null;
    return { i: (vx / vz / (ASPECT * TANH) + 1) / 2 * W, j: (1 - vy / vz / TANH) / 2 * H, depth: vz };
  }
  return { render, renderPixels, project, cameraFor: (id, F, focus) => cameraFor(SCENES[id], F, focus), toText, toHTML, SCENES, W, H, CW };
})();
