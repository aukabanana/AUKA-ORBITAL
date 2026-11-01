// ============================================================================
// AUKA // ORBITAL ASCII & BINARY TELEMETRY (Draft 2) — N-Body Physics & Camera
// ============================================================================

function screenToWorld(sx, sy, width, height) {
  return {
    x: camera.x + (sx - width / 2) / camera.zoom,
    y: camera.y + (sy - height / 2) / camera.zoom
  };
}

function worldToScreen(wx, wy, width, height) {
  return {
    x: width / 2 + (wx - camera.x) * camera.zoom,
    y: height / 2 + (wy - camera.y) * camera.zoom
  };
}

function updateLockedCamera() {
  if (!camera.lockedTarget) {
    // Keep activeSystem synced to whichever star is closer to current camera view
    const closestStar = getClosestSystemCenter(camera.x, camera.y);
    camera.activeSystem = getSystemKeyForBody(closestStar);
    updateCameraLockBadge();
    return;
  }

  let targetX = null;
  let targetY = null;

  if (camera.lockedTarget.type === 'body') {
    const b = bodies.find(bd => bd.id === camera.lockedTarget.id);
    if (b) {
      targetX = b.x;
      targetY = b.y;
      camera.activeSystem = getSystemKeyForBody(b);
    } else {
      camera.lockedTarget = null;
    }
  } else if (camera.lockedTarget.type === 'probe') {
    const p = probes.find(pr => pr.id === camera.lockedTarget.id);
    if (p) {
      targetX = p.x;
      targetY = p.y;
      const closestStar = getClosestSystemCenter(p.x, p.y);
      camera.activeSystem = getSystemKeyForBody(closestStar);
    } else {
      camera.lockedTarget = null;
    }
  }

  if (targetX !== null && targetY !== null && camera.lockedTarget) {
    const dist = Math.hypot(targetX - camera.x, targetY - camera.y);
    // Smooth glide when switching targets; tight 1:1 lock once arrived so moving planets never jitter
    if (dist < 2.2) {
      camera.lockedTarget.lerp = 1.0;
    } else {
      camera.lockedTarget.lerp = Math.min(1.0, (camera.lockedTarget.lerp || 0.16) + 0.015);
    }
    const alpha = camera.lockedTarget.lerp || 0.18;
    camera.x += (targetX - camera.x) * alpha;
    camera.y += (targetY - camera.y) * alpha;
  }

  updateCameraLockBadge();
}

function setCameraLock(type, id, label) {
  if (!type || !id) {
    camera.lockedTarget = null;
  } else {
    camera.lockedTarget = {
      type,
      id,
      label: label || id,
      lerp: 0.18
    };
  }
  updateCameraLockBadge();
}

function unlockCameraInPlace() {
  camera.lockedTarget = null;
  updateCameraLockBadge();
  if (typeof playSpacePing === 'function') playSpacePing(420, 0.15);
}

function lockCameraToSystem(sysKey) {
  if (sysKey === 'github') {
    camera.activeSystem = 'github';
    if (camera.zoom < 0.75) camera.zoom = 1.0;
    setCameraLock('body', 'gh_core', 'gh::aukabanana');
    const ghProbe = probes.find(p => p.id === 'scribe');
    if (ghProbe) {
      selectedProbeId = ghProbe.id;
      if (typeof syncBottomBarProbe === 'function') syncBottomBarProbe();
    }
  } else if (sysKey === 'solar') {
    camera.activeSystem = 'solar';
    if (camera.zoom > 0.68) camera.zoom = 0.56;
    setCameraLock('body', 'solar_core', 'helios::sun');
  } else {
    camera.activeSystem = 'sol';
    if (camera.zoom < 0.75) camera.zoom = 1.0;
    setCameraLock('body', 'core', 'sol');
  }
  const freqMap = { sol: 523.25, github: 659.25, solar: 783.99 };
  if (typeof playSpacePing === 'function') playSpacePing(freqMap[sysKey] || 523.25, 0.22);
}

function lockCameraToActiveProbe() {
  const p = probes.find(pr => pr.id === selectedProbeId) || probes[0];
  if (!p) return;
  setCameraLock('probe', p.id, p.short);
  if (typeof playSpacePing === 'function') playSpacePing(698.46, 0.2);
}

function cycleCameraLock(step = 1) {
  const sysBodies = bodies.filter(b => getSystemKeyForBody(b) === camera.activeSystem);
  const pool = sysBodies.length > 0 ? sysBodies : bodies;

  let curIdx = -1;
  if (camera.lockedTarget && camera.lockedTarget.type === 'body') {
    curIdx = pool.findIndex(b => b.id === camera.lockedTarget.id);
  }
  const nextIdx = (curIdx + step + pool.length) % pool.length;
  const target = pool[nextIdx];
  if (target) {
    setCameraLock('body', target.id, target.name);
    if (target.isMoon && camera.zoom < 1.15) {
      camera.zoom = 1.3;
    }
    if (typeof playSpacePing === 'function') playSpacePing(587.33, 0.18);
  }
}

function setSolarTimeScale(mode) {
  const valid = ['real', 'hour', 'day', 'month'];
  if (!valid.includes(mode)) return;
  config.solarTimeScale = mode;
  if (mode === 'real') {
    solarSimTimeMs = Date.now();
    bodies.forEach(b => { b._moonInitialized = false; });
  }
  updateCameraLockBadge();
  if (typeof savePersistentState === 'function') savePersistentState();
  if (typeof playSpacePing === 'function') playSpacePing(620, 0.15);
}

function syncSolarTimeNow() {
  solarSimTimeMs = Date.now();
  bodies.forEach(b => { b._moonInitialized = false; });
  updatePlanetPositions();
  if (typeof playSpacePing === 'function') playSpacePing(880, 0.2);
}

function updateCameraLockBadge() {
  const btnSol = document.getElementById('btnOrbitSol');
  const btnGh = document.getElementById('btnOrbitGh');
  const btnSolar = document.getElementById('btnOrbitSolar');
  const btnProbe = document.getElementById('btnCamProbe');
  const btnFree = document.getElementById('btnCamFree');

  if (btnSol && btnGh) {
    const sys = camera.activeSystem;
    btnSol.className = sys === 'sol'
      ? 'cursor-pointer text-amber-300 font-semibold'
      : 'cursor-pointer text-slate-500 hover:text-amber-300';
    btnGh.className = sys === 'github'
      ? 'cursor-pointer text-emerald-300 font-semibold'
      : 'cursor-pointer text-slate-500 hover:text-emerald-300';
    if (btnSolar) {
      btnSolar.className = sys === 'solar'
        ? 'cursor-pointer text-cyan-300 font-semibold'
        : 'cursor-pointer text-slate-500 hover:text-cyan-300';
    }
  }

  const timeModes = [
    { id: 'btnTimeReal', key: 'real' },
    { id: 'btnTimeHour', key: 'hour' },
    { id: 'btnTimeDay', key: 'day' },
    { id: 'btnTimeMonth', key: 'month' }
  ];
  timeModes.forEach(tm => {
    const el = document.getElementById(tm.id);
    if (!el) return;
    const isAct = (config.solarTimeScale || 'day') === tm.key;
    el.className = isAct
      ? 'cursor-pointer text-amber-300 font-semibold'
      : 'cursor-pointer text-slate-500 hover:text-cyan-300';
  });

  if (btnProbe) {
    const isProbeLocked = camera.lockedTarget && camera.lockedTarget.type === 'probe';
    btnProbe.className = isProbeLocked
      ? 'cursor-pointer text-cyan-300 font-semibold'
      : 'cursor-pointer text-slate-500 hover:text-cyan-300';
  }

  if (btnFree) {
    const isFree = !camera.lockedTarget;
    btnFree.className = isFree
      ? 'cursor-pointer text-purple-300 font-semibold'
      : 'cursor-pointer text-slate-500 hover:text-purple-300';
  }
}

function updatePlanetPositions() {
  const dtSec = 0.016;
  const scaleMode = config.solarTimeScale || 'day';
  let deltaDays = 0;

  if (scaleMode === 'real') {
    const now = Date.now();
    deltaDays = (now - solarSimTimeMs) / 86400000;
    solarSimTimeMs = now;
  } else {
    const daysPerRealSec = scaleMode === 'hour' ? (1 / 24) : (scaleMode === 'month' ? 30 : 1);
    deltaDays = daysPerRealSec * dtSec * config.planetSpeedMult;
    solarSimTimeMs += deltaDays * 86400000;
  }

  const daysSinceJ2000 = (solarSimTimeMs - J2000_EPOCH_MS) / 86400000;

  bodies.forEach(b => {
    if (b.ringVibration > 0.005) {
      b.ringVibration *= 0.95;
    } else {
      b.ringVibration = 0;
    }
    if (b.fixedPos) return;
    const parent = getParentStar(b);
    if (b.orbitRadius > 0) {
      if (b.isRealSolar && b.orbitalPeriodDays) {
        const j2000Rad = ((b.j2000LonDeg || 0) * Math.PI) / 180;
        if (!b.isMoon || scaleMode === 'real' || scaleMode === 'hour' || !b._moonInitialized) {
          b.angle = j2000Rad + (2 * Math.PI * daysSinceJ2000) / b.orbitalPeriodDays;
          b._moonInitialized = true;
        } else {
          const rawDelta = (2 * Math.PI * deltaDays) / b.orbitalPeriodDays;
          const sign = Math.sign(rawDelta);
          const mag = Math.abs(rawDelta);
          const stepRad = mag > 0.024 ? 0.024 + Math.log1p((mag - 0.024) * 10) * 0.009 : mag;
          b.angle += sign * stepRad;
        }
      } else {
        b.angle += b.orbitSpeed * config.planetSpeedMult;
      }
      b.x = parent.x + Math.cos(b.angle) * b.orbitRadius;
      b.y = parent.y + Math.sin(b.angle) * b.orbitRadius;
    } else {
      b.x = parent.x;
      b.y = parent.y;
    }
  });
}

function computeGravity(px, py) {
  let ax = 0;
  let ay = 0;
  let closestBody = bodies[0];
  let minDist = Infinity;

  for (const b of bodies) {
    const dx = b.x - px;
    const dy = b.y - py;
    const distSq = dx * dx + dy * dy + 550;
    const dist = Math.sqrt(distSq);
    if (dist < minDist) {
      minDist = dist;
      closestBody = b;
    }
    const force = (b.mass * 0.17 * config.gravityMult) / distSq;
    ax += (dx / dist) * force;
    ay += (dy / dist) * force;
  }
  return { ax, ay, closestBody, minDist };
}

function predictTrajectory(startX, startY, vx, vy, steps = 60) {
  const pts = [];
  let x = startX;
  let y = startY;
  let cvx = vx;
  let cvy = vy;

  for (let i = 0; i < steps; i++) {
    const { ax, ay } = computeGravity(x, y);
    cvx += ax * 1.2;
    cvy += ay * 1.2;
    x += cvx * 1.2;
    y += cvy * 1.2;
    pts.push({ x, y });
  }
  return pts;
}

function spawnFloatingText(x, y, text, color = '#34d399') {
  floatingTexts.push({ x, y, text, color, life: 1.0 });
}

function spawnThrusterParticles(x, y, vx, vy, color, count = 24) {
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 1.4;
    const speed = Math.random() * 3.6 + 1.2;
    const angle = Math.atan2(-vy, -vx) + spread;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: Math.random() * 0.025 + 0.018,
      color,
      glyph: PARTICLE_GLYPHS[i % PARTICLE_GLYPHS.length]
    });
  }
}

function spawnLaserPacket(fromX, fromY, toX, toY, color, onArrive = null) {
  laserPackets.push({
    fromX, fromY, toX, toY,
    progress: 0,
    speed: 0.032,
    color,
    bits: Array.from({ length: 6 }, () => (Math.random() > 0.5 ? '1' : '0')).join(''),
    onArrive
  });
}

function spawnBinaryComet() {
  const center = ORBIT_SYSTEMS[camera.activeSystem] || ORBIT_SYSTEMS.sol;
  const side = Math.random() > 0.5 ? 1 : -1;
  const startX = center.x + side * 780;
  const startY = center.y + (Math.random() - 0.5) * 560;
  const aimX = center.x + (Math.random() - 0.5) * 180;
  const aimY = center.y + (Math.random() - 0.5) * 180;
  const angle = Math.atan2(aimY - startY, aimX - startX);
  const speed = 5.4;

  comets.push({
    x: startX,
    y: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    tail: [],
    bits: '01101001',
    color: '#fde047'
  });
  playSpacePing(740, 0.25);
}

function interceptRogueSatellite(probe, rogueBody) {
  const idx = bodies.indexOf(rogueBody);
  if (idx === -1) return;

  const homeStar = getRootStar(rogueBody);
  bodies.splice(idx, 1);
  ctfFlagsCaptured++;
  savePersistentState();

  const badge = document.getElementById('ctfScoreBadge');
  if (badge) {
    badge.classList.remove('hidden');
    badge.textContent = `[FLAGS::${String(ctfFlagsCaptured).padStart(2, '0')}]`;
  }

  spawnThrusterParticles(rogueBody.x, rogueBody.y, 0, 0, '#34d399', 55);
  spawnThrusterParticles(rogueBody.x, rogueBody.y, 1, 1, '#fde047', 35);
  const flagHex = Math.floor(Math.random() * 0xfff + 0x100).toString(16).toUpperCase();
  const flagStr = `AUKA{0RB1T_PWN_0x${flagHex}}`;

  spawnFloatingText(rogueBody.x, rogueBody.y, `[FLAG_CAPTURED :: ${flagStr}]`, '#34d399');
  probe.statusText = `pwned :: 0x${flagHex}`;
  probe.targetBodyId = homeStar.id === 'gh_core' ? 'gh_core' : (homeStar.id === 'solar_core' ? 'sol_earth' : 'ctf');
  probe.mode = 'ORBIT';

  spawnLaserPacket(rogueBody.x, rogueBody.y, homeStar.x, homeStar.y, '#34d399', () => {
    const drawer = document.getElementById('missionResultDrawer');
    document.getElementById('resTag').textContent = '[0xDEAD::FLAG_DECRYPTED]';
    document.getElementById('resTitle').textContent = `${probe.short} -> ${flagStr}`;
    document.getElementById('resCodeBox').textContent = [
      `+-------------------------------------------------------+`,
      `|  [!] ROGUE_SATELLITE_INTERCEPTED // 0xDEAD            |`,
      `+-------------------------------------------------------+`,
      `  AGENT   :: [${probe.short}]`,
      `  FLAG    :: ${flagStr}`,
      `  TOTAL   :: ${ctfFlagsCaptured} FLAG(S) ARCHIVED TO LOCAL_STORAGE`
    ].join('\n');
    drawer.classList.remove('hidden');
  });

  playSpaceChord([329.63, 440, 659.25, 880], 1.0);
}
