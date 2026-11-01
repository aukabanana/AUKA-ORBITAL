// ============================================================================
// AUKA // ORBITAL ASCII & BINARY TELEMETRY (Draft 2) — Main Controller & Loop
// ============================================================================

const canvas = document.getElementById('cosmosCanvas');
const ctx = canvas.getContext('2d');

let width = window.innerWidth;
let height = window.innerHeight;
let dpr = window.devicePixelRatio || 1;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// Load persistent state & initialize positions
loadPersistentState();
updatePlanetPositions();
if (typeof applyTuning === 'function') applyTuning();
if (typeof syncAudioUI === 'function') syncAudioUI();
syncSlidersFromConfig();

probes.forEach(p => {
  const b = bodies.find(bd => bd.id === p.targetBodyId) || bodies[0];
  p.x = b.x + Math.cos(p.orbitAngle) * p.orbitDist;
  p.y = b.y + Math.sin(p.orbitAngle) * p.orbitDist;
});

if (ctfFlagsCaptured > 0) {
  const badge = document.getElementById('ctfScoreBadge');
  if (badge) {
    badge.classList.remove('hidden');
    badge.textContent = `[FLAGS::${String(ctfFlagsCaptured).padStart(2, '0')}]`;
  }
}

function applyTheme(name) {
  config.themeName = name;
  const t = THEMES[name] || THEMES.tokyo;
  config.bgInner = t.bgInner;
  config.bgMid = t.bgMid;
  config.bgOuter = t.bgOuter;
  config.gridRgb = t.gridRgb;
  config.accentHex = t.accentHex;
  document.body.style.setProperty('--theme-accent', t.accentHex);

  const btnTokyo = document.getElementById('btnThemeTokyo');
  const btnNebula = document.getElementById('btnThemeNebula');
  if (name === 'nebula') {
    btnNebula.className = 'px-2.5 py-0.5 border border-pink-400/60 bg-pink-500/15 text-pink-300 transition';
    btnTokyo.className = 'px-2.5 py-0.5 border border-slate-800 text-slate-500 hover:text-cyan-300 transition';
  } else {
    btnTokyo.className = 'px-2.5 py-0.5 border border-cyan-400/60 bg-cyan-500/15 text-cyan-300 transition';
    btnNebula.className = 'px-2.5 py-0.5 border border-slate-800 text-slate-500 hover:text-pink-300 transition';
  }
  savePersistentState();
  playSpacePing(528, 0.2);
}

function setShaderMode(mode) {
  config.shaderMode = mode;
  document.getElementById('btnShaderHybrid').className = mode === 'hybrid_ascii'
    ? 'px-2 py-0.5 border border-purple-400/60 bg-purple-500/15 text-purple-300 transition'
    : 'px-2 py-0.5 border border-slate-800 text-slate-500 hover:text-purple-300 transition';
  document.getElementById('btnShaderBinary').className = mode === 'pure_binary'
    ? 'px-2 py-0.5 border border-emerald-400/60 bg-emerald-500/15 text-emerald-300 transition'
    : 'px-2 py-0.5 border border-slate-800 text-slate-500 hover:text-emerald-300 transition';
  document.getElementById('btnShaderDense').className = mode === 'dense_glyph'
    ? 'px-2 py-0.5 border border-cyan-400/60 bg-cyan-500/15 text-cyan-300 transition'
    : 'px-2 py-0.5 border border-slate-800 text-slate-500 hover:text-cyan-300 transition';
  savePersistentState();
  playSpacePing(600, 0.15);
}

function updateTuner() {
  config.planetSpeedMult = parseFloat(document.getElementById('slPlanetSpeed').value);
  config.probeSpeedMult = parseFloat(document.getElementById('slProbeSpeed').value);
  config.gravityMult = parseFloat(document.getElementById('slGravity').value);
  config.trailLength = parseInt(document.getElementById('slTrail').value, 10);
  const gridPct = parseInt(document.getElementById('slGrid').value, 10);
  config.gridAlpha = (gridPct / 100) * 0.11;
  config.spriteScale = parseFloat(document.getElementById('slScale').value);

  document.getElementById('valPlanetSpeed').textContent = `${config.planetSpeedMult.toFixed(1)}x`;
  document.getElementById('valProbeSpeed').textContent = `${config.probeSpeedMult.toFixed(1)}x`;
  document.getElementById('valGravity').textContent = `${config.gravityMult.toFixed(1)}x`;
  document.getElementById('valTrail').textContent = String(config.trailLength).padStart(3, '0');
  document.getElementById('valGrid').textContent = `${String(gridPct).padStart(3, '0')}%`;
  document.getElementById('valScale').textContent = `${config.spriteScale.toFixed(1)}x`;
  savePersistentState();
}

function toggleLabels() {
  config.showLabels = !config.showLabels;
  const el = document.getElementById('labelStateText');
  el.textContent = config.showLabels ? '[1]' : '[0]';
  el.className = config.showLabels ? 'text-cyan-300' : 'text-slate-600';
  savePersistentState();
}

function toggleAsciiHud() {
  showAsciiHud = !showAsciiHud;
  const el = document.getElementById('asciiHudStateText');
  el.textContent = showAsciiHud ? '[1]' : '[0]';
  el.className = showAsciiHud ? 'text-emerald-400' : 'text-slate-600';
  document.getElementById('asciiTelemetryBox').style.opacity = showAsciiHud && !zenMode ? '1' : '0';
}

function setRadiusFilter(sysKey) {
  radiusFilterMode = sysKey === 'github' ? 'github' : 'sol';
  const btnSol = document.getElementById('btnRadFilterSol');
  const btnGh = document.getElementById('btnRadFilterGh');
  if (btnSol && btnGh) {
    const isGh = radiusFilterMode === 'github';
    btnSol.className = !isGh
      ? 'text-amber-300 font-semibold transition'
      : 'text-slate-500 hover:text-amber-300 transition';
    btnGh.className = isGh
      ? 'text-emerald-300 font-semibold transition'
      : 'text-slate-500 hover:text-emerald-300 transition';
  }
  renderPlanetRadiusSliders();
}

function renderPlanetRadiusSliders() {
  const listEl = document.getElementById('planetRadiusList');
  if (!listEl) return;

  const parentId = radiusFilterMode === 'github' ? 'gh_core' : 'core';
  const targetBodies = bodies.filter(b => !b.fixedPos && (b.parentBodyId || 'core') === parentId);

  if (targetBodies.length === 0) {
    listEl.innerHTML = `<div class="text-slate-600 text-center py-1">no orbiting bodies in sector</div>`;
    return;
  }

  listEl.innerHTML = targetBodies.map(b => {
    const radVal = Math.round(b.orbitRadius);
    return `
      <div class="grid grid-cols-12 items-center gap-3">
        <button
          type="button"
          onclick="setCameraLock('body', '${b.id}', '${b.name}')"
          class="col-span-5 text-left truncate hover:underline"
          style="color:${b.color}"
          title="Click to focus camera on [${b.name}]"
        >[${b.name}]</button>
        <input
          type="range"
          min="90"
          max="680"
          step="5"
          value="${radVal}"
          oninput="updateBodyOrbitRadius('${b.id}', this.value)"
          class="col-span-5"
        />
        <span id="valRad_${b.id}" class="col-span-2 text-right" style="color:${b.color}">${String(radVal).padStart(3, '0')}</span>
      </div>
    `;
  }).join('');
}

function updateBodyOrbitRadius(bodyId, rawVal) {
  const b = bodies.find(bd => bd.id === bodyId);
  if (!b) return;
  const newR = parseFloat(rawVal);
  if (isNaN(newR)) return;

  b.orbitRadius = newR;
  planetOrbitRadii[b.id] = newR;
  b.ringVibration = 0.35;

  const parent = getParentStar(b);
  b.x = parent.x + Math.cos(b.angle) * b.orbitRadius;
  b.y = parent.y + Math.sin(b.angle) * b.orbitRadius;

  const valEl = document.getElementById(`valRad_${b.id}`);
  if (valEl) {
    valEl.textContent = String(Math.round(newR)).padStart(3, '0');
  }
  savePersistentState();
}

function syncSlidersFromConfig() {
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setEl('slPlanetSpeed', config.planetSpeedMult ?? 1.0);
  setEl('slProbeSpeed', config.probeSpeedMult ?? 1.0);
  setEl('slGravity', config.gravityMult ?? 1.0);
  setEl('slTrail', config.trailLength ?? 48);
  const gridPct = Math.round(((config.gridAlpha ?? 0.085) / 0.11) * 100);
  setEl('slGrid', gridPct);
  setEl('slScale', config.spriteScale ?? 1.0);

  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  setTxt('valPlanetSpeed', `${(config.planetSpeedMult ?? 1.0).toFixed(1)}x`);
  setTxt('valProbeSpeed', `${(config.probeSpeedMult ?? 1.0).toFixed(1)}x`);
  setTxt('valGravity', `${(config.gravityMult ?? 1.0).toFixed(1)}x`);
  setTxt('valTrail', String(config.trailLength ?? 48).padStart(3, '0'));
  setTxt('valGrid', `${String(gridPct).padStart(3, '0')}%`);
  setTxt('valScale', `${(config.spriteScale ?? 1.0).toFixed(1)}x`);

  const lblEl = document.getElementById('labelStateText');
  if (lblEl) {
    lblEl.textContent = config.showLabels ? '[1]' : '[0]';
    lblEl.className = config.showLabels ? 'text-cyan-300' : 'text-slate-600';
  }

  if (typeof syncAudioUI === 'function') syncAudioUI();
}

function resetSettings() {
  document.getElementById('slPlanetSpeed').value = 1.0;
  document.getElementById('slProbeSpeed').value = 1.0;
  document.getElementById('slGravity').value = 1.0;
  document.getElementById('slTrail').value = 48;
  document.getElementById('slGrid').value = 75;
  document.getElementById('slScale').value = 1.0;
  config.showLabels = true;
  document.getElementById('labelStateText').textContent = '[1]';
  document.getElementById('labelStateText').className = 'text-cyan-300';

  config.masterVolume = 0.7;
  config.tuningKey = 'E';
  config.tuneSemitones = 0;
  config.tuningPreset = 'std_e';
  config.tuningHz = 440;
  if (typeof setMasterVolume === 'function') setMasterVolume(0.7);
  if (typeof applyTuning === 'function') applyTuning();
  if (typeof syncAudioUI === 'function') syncAudioUI();

  planetOrbitRadii = {};
  bodies.forEach(b => {
    if (!b.fixedPos && typeof b.defaultOrbitRadius === 'number') {
      b.orbitRadius = b.defaultOrbitRadius;
    }
  });
  renderPlanetRadiusSliders();

  camera.zoom = 1.0;
  lockCameraToSystem('sol');
  setShaderMode('hybrid_ascii');
  applyTheme('tokyo');
  updateTuner();
}

function toggleCustomizer() {
  document.getElementById('aiSelectorMenu').classList.add('hidden');
  const drawer = document.getElementById('customizerDrawer');
  const willShow = drawer.classList.contains('hidden');
  if (willShow) {
    setRadiusFilter(camera.activeSystem);
  }
  drawer.classList.toggle('hidden');
  playSpacePing(440, 0.15);
}

function toggleZenMode() {
  zenMode = !zenMode;
  document.getElementById('topHint').style.opacity = zenMode ? '0' : '1';
  document.getElementById('asciiTelemetryBox').style.opacity = (zenMode || !showAsciiHud) ? '0' : '1';
  document.getElementById('bottomHudContainer').style.opacity = zenMode ? '0' : '1';
  document.getElementById('bottomHudContainer').style.pointerEvents = 'none';
  if (!zenMode) {
    document.querySelector('#bottomHudContainer form').style.pointerEvents = 'auto';
  } else {
    document.getElementById('customizerDrawer').classList.add('hidden');
    document.getElementById('aiSelectorMenu').classList.add('hidden');
  }
}

window.addEventListener('keydown', (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName : '';
  if (activeTag === 'INPUT') {
    if (e.key === 'Escape') {
      document.activeElement.blur();
      document.getElementById('spawnPopover').classList.add('hidden');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      document.activeElement.blur();
      toggleCustomizer();
    }
    return;
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    if (zenMode) toggleZenMode();
    toggleCustomizer();
  } else if (e.key.toLowerCase() === 'h') {
    toggleZenMode();
  } else if (e.key === '1') {
    lockCameraToSystem('sol');
  } else if (e.key === '2') {
    lockCameraToSystem('github');
  } else if (e.key === '[' || e.key === 'ArrowLeft') {
    cycleCameraLock(-1);
  } else if (e.key === ']' || e.key === 'ArrowRight') {
    cycleCameraLock(1);
  } else if (e.key === ' ') {
    e.preventDefault();
    // Space: if hovering a planet, lock onto it; otherwise toggle between Sol Orbit and GitHub Orbit
    if (hoveredBody) {
      setCameraLock('body', hoveredBody.id, hoveredBody.name);
      playSpacePing(587.33, 0.2);
    } else {
      const nextSys = camera.activeSystem === 'github' ? 'sol' : 'github';
      lockCameraToSystem(nextSys);
    }
  } else if (e.key === 'Escape') {
    // Unlock camera in-place without snapping back to (0,0)
    unlockCameraInPlace();
    document.getElementById('spawnPopover').classList.add('hidden');
  } else if (e.key.toLowerCase() === 'm') {
    toggleAudio();
  } else if (e.key === '-' || e.key === '_') {
    adjustVolumeDelta(-0.05);
  } else if (e.key === '=' || e.key === '+') {
    adjustVolumeDelta(0.05);
  }
});

function renderAiMenu() {
  const menu = document.getElementById('aiSelectorMenu');
  menu.innerHTML = probes.map(p => {
    const isSel = p.id === selectedProbeId;
    return `
      <button
        type="button"
        onclick="chooseAiFromBar('${p.id}')"
        class="w-full px-2.5 py-1.5 text-left flex items-center justify-between text-xs transition ${isSel ? 'bg-slate-800/90 text-white' : 'hover:bg-slate-900/80 text-slate-400'
      }"
      >
        <span style="color:${p.color}" class="font-semibold">[${p.short}]</span>
        <span class="text-slate-500">${p.role}</span>
      </button>
    `;
  }).join('');
}

function toggleAiMenu(ev) {
  if (ev) ev.stopPropagation();
  document.getElementById('customizerDrawer').classList.add('hidden');
  const menu = document.getElementById('aiSelectorMenu');
  renderAiMenu();
  menu.classList.toggle('hidden');
  playSpacePing(480, 0.15);
}

function chooseAiFromBar(probeId) {
  selectedProbeId = probeId;
  syncBottomBarProbe();
  const p = probes.find(pr => pr.id === probeId);
  if (p) {
    setCameraLock('probe', p.id, p.short);
  }
  document.getElementById('aiSelectorMenu').classList.add('hidden');
  document.getElementById('dispatchInput').focus();
  playSpacePing(600, 0.2);
}

function syncBottomBarProbe() {
  const p = probes.find(pr => pr.id === selectedProbeId) || probes[0];
  const el = document.getElementById('activeProbeBracket');
  el.textContent = `[${p.short}]`;
  el.style.color = p.color;
}

canvas.addEventListener('mousedown', (e) => {
  document.getElementById('spawnPopover').classList.add('hidden');
  document.getElementById('aiSelectorMenu').classList.add('hidden');

  // Check if user clicked the on-canvas directional orbit beacon
  if (beaconHitBox &&
    e.clientX >= beaconHitBox.x && e.clientX <= beaconHitBox.x + beaconHitBox.w &&
    e.clientY >= beaconHitBox.y && e.clientY <= beaconHitBox.y + beaconHitBox.h) {
    lockCameraToSystem(beaconHitBox.targetSystem);
    return;
  }

  const world = screenToWorld(e.clientX, e.clientY, width, height);

  let closestProbe = null;
  let minDist = 32 / camera.zoom;
  for (const p of probes) {
    const d = Math.hypot(world.x - p.x, world.y - p.y);
    if (d < minDist) {
      minDist = d;
      closestProbe = p;
    }
  }

  if (closestProbe) {
    selectedProbeId = closestProbe.id;
    draggingProbe = closestProbe;
    dragStartScreen = { x: e.clientX, y: e.clientY };
    dragMouseWorld = world;
    syncBottomBarProbe();
    return;
  }

  for (const b of bodies) {
    const d = Math.hypot(world.x - b.x, world.y - b.y);
    if (d < (b.radius + 20) / camera.zoom) {
      const alreadyLockedHere =
        camera.lockedTarget &&
        camera.lockedTarget.type === 'body' &&
        camera.lockedTarget.id === b.id;

      // Easy Camera Lock: 1st click on any planet/star locks camera onto it;
      // 2nd click on an already-locked planet dispatches the selected probe to it!
      setCameraLock('body', b.id, b.name);
      if (alreadyLockedHere && !b.fixedPos) {
        sendSelectedProbeToPlanet(b.id);
      } else {
        playSpacePing(587.33, 0.18);
      }
      return;
    }
  }

  // Dragging empty space pans the camera and unlocks in-place
  camera.isPanning = true;
  camera.panStartScreen = { x: e.clientX, y: e.clientY };
  camera.panStartCam = { x: camera.x, y: camera.y };
});

window.addEventListener('mousemove', (e) => {
  if (camera.isPanning) {
    const movePx = Math.hypot(e.clientX - camera.panStartScreen.x, e.clientY - camera.panStartScreen.y);
    if (movePx > 4 && camera.lockedTarget) {
      camera.lockedTarget = null;
    }
    const dx = (e.clientX - camera.panStartScreen.x) / camera.zoom;
    const dy = (e.clientY - camera.panStartScreen.y) / camera.zoom;
    camera.x = camera.panStartCam.x - dx;
    camera.y = camera.panStartCam.y - dy;
    updateCameraLockBadge();
    return;
  }

  // Check hover on directional orbit beacon
  if (beaconHitBox &&
    e.clientX >= beaconHitBox.x && e.clientX <= beaconHitBox.x + beaconHitBox.w &&
    e.clientY >= beaconHitBox.y && e.clientY <= beaconHitBox.y + beaconHitBox.h) {
    hoveredBeacon = beaconHitBox.targetSystem;
    canvas.style.cursor = 'pointer';
  } else {
    hoveredBeacon = null;
  }

  const world = screenToWorld(e.clientX, e.clientY, width, height);
  mouseWorld = world;

  if (draggingProbe) {
    dragMouseWorld = world;
  }

  hoveredBody = null;
  for (const b of bodies) {
    const d = Math.hypot(world.x - b.x, world.y - b.y);
    if (d < (b.radius + 22) / camera.zoom) {
      hoveredBody = b;
      break;
    }
  }

  if (!hoveredBeacon) {
    canvas.style.cursor = hoveredBody ? 'pointer' : 'crosshair';
  }

  // Harmonic guitar-string orbit strumming around whichever star system cursor is near
  const activeStar = getClosestSystemCenter(world.x, world.y);
  const currR = Math.hypot(world.x - activeStar.x, world.y - activeStar.y);
  if (prevMouseRadiusFromCenter !== null &&
    Math.abs(currR - prevMouseRadiusFromCenter) > 1.5 &&
    Math.abs(currR - prevMouseRadiusFromCenter) < 85) {
    bodies.forEach((b, idx) => {
      if (b.orbitRadius <= 0 || b.parentBodyId !== activeStar.id) return;
      const crossed =
        (prevMouseRadiusFromCenter < b.orbitRadius && currR >= b.orbitRadius) ||
        (prevMouseRadiusFromCenter > b.orbitRadius && currR <= b.orbitRadius);
      if (crossed && b.ringVibration < 0.45) {
        b.ringVibration = 1.0;
        playGuitarPluck(GUITAR_NOTES[idx % GUITAR_NOTES.length]);
      }
    });
  }
  prevMouseRadiusFromCenter = currR;
});

window.addEventListener('mouseup', (e) => {
  if (camera.isPanning) {
    camera.isPanning = false;
    return;
  }
  if (!draggingProbe) return;
  const moveScreenDist = Math.hypot(e.clientX - dragStartScreen.x, e.clientY - dragStartScreen.y);

  if (moveScreenDist < 6) {
    // Clicking a probe locks camera onto it & beams its current sector report
    setCameraLock('probe', draggingProbe.id, draggingProbe.short);
    const b = bodies.find(bd => bd.id === draggingProbe.targetBodyId) || bodies[0];
    const homeStar = getParentStar(b);
    draggingProbe.mode = 'ORBIT';
    draggingProbe.statusText = `0110 -> ${homeStar.name}`;
    spawnThrusterParticles(draggingProbe.x, draggingProbe.y, -(draggingProbe.x - b.x), -(draggingProbe.y - b.y), '#34d399', 32);
    spawnLaserPacket(draggingProbe.x, draggingProbe.y, homeStar.x, homeStar.y, '#34d399', () => {
      showMissionDeliverable(draggingProbe, b, 'inspect');
    });
    playSpaceChord([261.63, 392.00, 523.25, 659.25], 0.8);
  } else {
    const pullX = draggingProbe.x - dragMouseWorld.x;
    const pullY = draggingProbe.y - dragMouseWorld.y;
    draggingProbe.mode = 'FREE_GRAVITY';
    draggingProbe.vx = pullX * 0.055;
    draggingProbe.vy = pullY * 0.055;
    draggingProbe.statusText = 'slingshot_vec';
    spawnThrusterParticles(draggingProbe.x, draggingProbe.y, draggingProbe.vx, draggingProbe.vy, draggingProbe.color, 30);
    playSpaceChord([330, 495, 660], 0.6);
  }
  draggingProbe = null;
});

canvas.addEventListener('dblclick', (e) => {
  const world = screenToWorld(e.clientX, e.clientY, width, height);

  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i];
    if (b.fixedPos) continue;
    const d = Math.hypot(world.x - b.x, world.y - b.y);
    if (d < (b.radius + 18) / camera.zoom) {
      spawnThrusterParticles(b.x, b.y, 0, 0, b.color, 50);
      spawnThrusterParticles(b.x, b.y, 1, 1, '#fef08a', 30);
      spawnFloatingText(b.x, b.y, `[SUPERNOVA :: ${b.name}]`, b.color);
      bodies.splice(i, 1);
      delete planetOrbitRadii[b.id];
      renderPlanetRadiusSliders();
      savePersistentState();
      playSpaceChord([146.83, 220, 293.66], 0.8);
      return;
    }
  }

  spawnWorldCoords = world;
  const pop = document.getElementById('spawnPopover');
  const nameInp = document.getElementById('spawnNameInput');
  if (nameInp) nameInp.value = '';
  pop.style.left = `${Math.min(width - 210, Math.max(210, e.clientX))}px`;
  pop.style.top = `${Math.min(height - 90, Math.max(70, e.clientY))}px`;
  pop.classList.remove('hidden');
  if (nameInp) setTimeout(() => nameInp.focus(), 20);
  playSpacePing(587.33, 0.2);
});

function confirmQuickSpawn(type) {
  document.getElementById('spawnPopover').classList.add('hidden');
  if (!spawnWorldCoords) return;

  const nameInp = document.getElementById('spawnNameInput');
  const rawCustomName = nameInp ? nameInp.value.trim().slice(0, 16) : '';

  const parentStar = getClosestSystemCenter(spawnWorldCoords.x, spawnWorldCoords.y);
  const relX = spawnWorldCoords.x - parentStar.x;
  const relY = spawnWorldCoords.y - parentStar.y;
  const orbitR = Math.hypot(relX, relY);
  const startAngle = Math.atan2(relY, relX);
  const keplerSpeed = (1 / Math.sqrt(Math.max(80, orbitR))) * 0.042;

  if (type === 'rogue') {
    bodies.push({
      id: 'rogue_' + Date.now(),
      name: rawCustomName || '0xDEAD',
      parentBodyId: parentStar.id,
      styleType: 'rogue',
      mass: 420,
      radius: 14,
      orbitRadius: orbitR,
      orbitSpeed: -keplerSpeed * 1.15,
      angle: startAngle,
      color: '#fb7185',
      accent: '#f59e0b',
      glow: 'rgba(251, 113, 133, 0.28)',
      repoMeta: { fullName: 'rogue::0xDEAD', branch: 'encrypted::flag', commits: '0xDEAD', stack: 'ROGUE_NODE' },
      ringVibration: 1.0,
      isCustom: true,
      x: spawnWorldCoords.x,
      y: spawnWorldCoords.y
    });
    spawnThrusterParticles(spawnWorldCoords.x, spawnWorldCoords.y, 1, 1, '#fb7185', 35);
  } else if (type === 'wormhole') {
    const idA = 'wh_a_' + Date.now();
    const idB = 'wh_b_' + Date.now();
    const baseName = rawCustomName || 'gate';
    bodies.push(
      {
        id: idA, partnerId: idB, name: `${baseName}-a`, parentBodyId: parentStar.id, styleType: 'wormhole',
        mass: 750, radius: 18,
        orbitRadius: orbitR, orbitSpeed: keplerSpeed, angle: startAngle,
        color: '#e879f9', accent: '#38bdf8',
        glow: 'rgba(232, 121, 249, 0.26)',
        repoMeta: { fullName: `${baseName}::wormhole-a`, branch: 'wormhole::a', commits: '0xFF01', stack: 'EINSTEIN_ROSEN' },
        ringVibration: 1.0,
        isCustom: true,
        x: spawnWorldCoords.x, y: spawnWorldCoords.y
      },
      {
        id: idB, partnerId: idA, name: `${baseName}-b`, parentBodyId: parentStar.id, styleType: 'wormhole',
        mass: 750, radius: 18,
        orbitRadius: orbitR, orbitSpeed: keplerSpeed, angle: startAngle + Math.PI,
        color: '#38bdf8', accent: '#e879f9',
        glow: 'rgba(56, 189, 248, 0.26)',
        repoMeta: { fullName: `${baseName}::wormhole-b`, branch: 'wormhole::b', commits: '0xFF02', stack: 'EINSTEIN_ROSEN' },
        ringVibration: 1.0,
        isCustom: true,
        x: parentStar.x - relX, y: parentStar.y - relY
      }
    );
    spawnThrusterParticles(spawnWorldCoords.x, spawnWorldCoords.y, 1, 1, '#e879f9', 35);
  } else if (type === 'blackhole') {
    const bhName = rawCustomName || ('sgr-' + Math.floor(Math.random() * 90 + 10));
    bodies.push({
      id: 'bh_' + Date.now(),
      name: bhName,
      parentBodyId: parentStar.id,
      styleType: 'blackhole',
      mass: 3200,
      radius: 22,
      orbitRadius: orbitR,
      orbitSpeed: -keplerSpeed * 0.75,
      angle: startAngle,
      color: '#f97316',
      accent: '#ec4899',
      glow: 'rgba(249, 115, 22, 0.3)',
      repoMeta: { fullName: `singularity/${bhName}`, branch: 'event/horizon', commits: '0x0000', stack: 'SINGULARITY' },
      ringVibration: 1.0,
      isCustom: true,
      x: spawnWorldCoords.x,
      y: spawnWorldCoords.y
    });
    spawnThrusterParticles(spawnWorldCoords.x, spawnWorldCoords.y, 1, 1, '#f97316', 45);
  } else {
    const plName = rawCustomName || ('node-' + Math.floor(Math.random() * 90 + 10));
    bodies.push({
      id: 'pl_' + Date.now(),
      name: plName,
      parentBodyId: parentStar.id,
      styleType: 'cyber',
      mass: 1100,
      radius: 19,
      orbitRadius: orbitR,
      defaultOrbitRadius: orbitR,
      orbitSpeed: keplerSpeed,
      angle: startAngle,
      color: '#38bdf8',
      accent: '#34d399',
      glow: 'rgba(56, 189, 248, 0.25)',
      repoMeta: { fullName: `aukabanana/${plName}`, branch: 'feat/orbital', commits: '0x0019', stack: 'CUSTOM_SECTOR' },
      ringVibration: 1.0,
      isCustom: true,
      x: spawnWorldCoords.x,
      y: spawnWorldCoords.y
    });
    spawnThrusterParticles(spawnWorldCoords.x, spawnWorldCoords.y, 1, 1, '#38bdf8', 35);
  }
  renderPlanetRadiusSliders();
  savePersistentState();
  playSpaceChord([261.63, 392, 523.25], 0.8);
}

window.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  camera.zoom = Math.max(0.45, Math.min(2.4, camera.zoom * factor));
}, { passive: false });

function sendSelectedProbeToPlanet(bodyId) {
  const p = probes.find(pr => pr.id === selectedProbeId) || probes[0];
  const b = bodies.find(bd => bd.id === bodyId);
  if (!p || !b) return;

  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const dist = Math.hypot(dx, dy) || 1;

  // If crossing between SOL_ORBIT and GH_ORBIT, warp along the bridge to final approach
  if (dist > 560) {
    spawnLaserPacket(p.x, p.y, b.x, b.y, p.color);
    p.x = b.x - (dx / dist) * 145;
    p.y = b.y - (dy / dist) * 145;
    p.trail = [];
  }

  const ndx = b.x - p.x;
  const ndy = b.y - p.y;
  const ndist = Math.hypot(ndx, ndy) || 1;
  p.targetBodyId = b.id;
  p.mode = 'FREE_GRAVITY';
  p.vx = (ndx / ndist) * 5.2;
  p.vy = (ndy / ndist) * 5.2;
  p.statusText = `-> ${b.name}`;

  spawnThrusterParticles(p.x, p.y, ndx / ndist, ndy / ndist, p.color, 28);
  playSpaceChord([293.66, 440, 587.33], 0.7);
}

function dispatchMission(ev) {
  ev.preventDefault();
  document.getElementById('aiSelectorMenu').classList.add('hidden');
  const inputEl = document.getElementById('dispatchInput');
  const taskText = inputEl.value.trim();
  if (!taskText) return;

  const p = probes.find(pr => pr.id === selectedProbeId) || probes[0];
  const lower = taskText.toLowerCase();

  // Default target is the currently camera-locked planet, or the probe's current target
  let targetBody = null;
  if (camera.lockedTarget && camera.lockedTarget.type === 'body') {
    const lockedB = bodies.find(b => b.id === camera.lockedTarget.id);
    if (lockedB && !lockedB.fixedPos) targetBody = lockedB;
  }
  if (!targetBody) {
    targetBody = bodies.find(b => b.id === p.targetBodyId && !b.fixedPos) || bodies[1] || bodies[0];
  }

  // Match any orbiting repo/planet name mentioned in the command across both orbits
  for (const b of bodies) {
    if (!b.fixedPos && lower.includes(b.name.toLowerCase())) {
      targetBody = b;
      break;
    }
  }

  // Lock camera onto the target planet so user watches the mission unfold
  setCameraLock('body', targetBody.id, targetBody.name);

  p.targetBodyId = targetBody.id;
  p.activeTask = taskText;
  p.scanProgress = 0;
  p.statusText = taskText.slice(0, 22);

  const dx = targetBody.x - p.x;
  const dy = targetBody.y - p.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (dist > 560) {
    spawnLaserPacket(p.x, p.y, targetBody.x, targetBody.y, p.color);
    p.x = targetBody.x - (dx / dist) * 140;
    p.y = targetBody.y - (dy / dist) * 140;
    p.trail = [];
  }

  const ndx = targetBody.x - p.x;
  const ndy = targetBody.y - p.y;
  const ndist = Math.hypot(ndx, ndy) || 1;

  if (ndist > targetBody.radius + 70) {
    p.mode = 'FREE_GRAVITY';
    p.vx = (ndx / ndist) * 5.2;
    p.vy = (ndy / ndist) * 5.2;
  } else {
    p.mode = 'ORBIT';
  }

  spawnThrusterParticles(p.x, p.y, ndx / ndist, ndy / ndist, p.color, 36);
  playSpaceChord([293.66, 440, 587.33, 880], 0.8);
  inputEl.value = '';
}

async function showMissionDeliverable(probe, planet, taskText) {
  const drawer = document.getElementById('missionResultDrawer');
  document.getElementById('resTag').textContent = '[0110::PACKET_RX]';
  document.getElementById('resTitle').textContent = `${probe.short} -> ${planet.name} :: ${taskText}`;
  document.getElementById('resCodeBox').textContent = ':: decrypting live sector telemetry...';
  drawer.classList.remove('hidden');

  const output = await buildLiveProbeDeliverable(probe, planet, taskText);
  document.getElementById('resCodeBox').textContent = output;
  playSpaceChord([329.63, 493.88, 659.25, 987.77], 1.0);
}

function approveDeliverable() {
  const drawer = document.getElementById('missionResultDrawer');
  if (drawer.classList.contains('hidden')) return;
  drawer.classList.add('hidden');
  const p = probes.find(pr => pr.id === selectedProbeId) || probes[0];
  p.statusText = '0x01 :: ack_ok';
  spawnThrusterParticles(p.x, p.y, 1, 1, '#34d399', 40);
  playSpaceChord([261.63, 392.00, 523.25, 783.99], 1.0);
}

function updateProbesPhysics() {
  probes.forEach(p => {
    const targetBody = bodies.find(bd => bd.id === p.targetBodyId) || bodies[0];

    if (draggingProbe !== p) {
      if (p.mode === 'FREE_GRAVITY') {
        const activeStar = getClosestSystemCenter(p.x, p.y);
        const prevR = Math.hypot(p.x - activeStar.x, p.y - activeStar.y);
        const { ax, ay, closestBody, minDist } = computeGravity(p.x, p.y);
        p.vx += ax;
        p.vy += ay;
        p.x += p.vx;
        p.y += p.vy;
        const newR = Math.hypot(p.x - activeStar.x, p.y - activeStar.y);

        bodies.forEach((b, idx) => {
          if (b.orbitRadius <= 0 || b.parentBodyId !== activeStar.id) return;
          if ((prevR < b.orbitRadius && newR >= b.orbitRadius) || (prevR > b.orbitRadius && newR <= b.orbitRadius)) {
            if (b.ringVibration < 0.4) {
              b.ringVibration = 0.9;
              playGuitarPluck(GUITAR_NOTES[idx % GUITAR_NOTES.length]);
            }
          }
        });

        if (closestBody.styleType === 'rogue' && minDist < closestBody.radius + 36) {
          interceptRogueSatellite(p, closestBody);
          return;
        }

        if (closestBody.styleType === 'wormhole' && minDist < closestBody.radius + 18) {
          const partner = bodies.find(b => b.id === closestBody.partnerId);
          if (partner && (!p.lastTeleport || simTime - p.lastTeleport > 1.2)) {
            p.x = partner.x + (Math.random() - 0.5) * 20;
            p.y = partner.y + (Math.random() - 0.5) * 20;
            p.lastTeleport = simTime;
            p.trail = [];
            p.statusText = `0xFF -> ${partner.name}`;
            spawnThrusterParticles(p.x, p.y, p.vx, p.vy, '#e879f9', 40);
            playSpaceChord([440, 659.25, 880, 1174.66], 0.8);
          }
        }

        const speed = Math.hypot(p.vx, p.vy);
        if (closestBody.styleType !== 'wormhole' && closestBody.styleType !== 'rogue' && minDist < closestBody.radius + 48 && speed < 6.8) {
          p.targetBodyId = closestBody.id;
          p.mode = 'ORBIT';
          p.orbitDist = Math.max(closestBody.radius + 32, minDist);
          p.orbitAngle = Math.atan2(p.y - closestBody.y, p.x - closestBody.x);
          p.statusText = p.activeTask ? `scan :: ${closestBody.name}` : `lock :: ${closestBody.name}`;
          spawnThrusterParticles(p.x, p.y, p.vx, p.vy, p.color, 18);
          playSpacePing(660, 0.3);
        }
      } else {
        if (targetBody.styleType === 'rogue') {
          interceptRogueSatellite(p, targetBody);
          return;
        }
        p.orbitAngle += p.orbitAngularVel * config.probeSpeedMult;
        p.x = targetBody.x + Math.cos(p.orbitAngle) * p.orbitDist;
        p.y = targetBody.y + Math.sin(p.orbitAngle) * p.orbitDist;

        if (p.activeTask) {
          p.scanProgress += 0.009 * Math.max(0.5, config.probeSpeedMult);
          if (Math.random() < 0.08) {
            spawnLaserPacket(p.x, p.y, targetBody.x, targetBody.y, p.color);
          }
          if (p.scanProgress >= 1.0) {
            const finishedTask = p.activeTask;
            const homeStar = getParentStar(targetBody);
            p.activeTask = null;
            p.scanProgress = 0;
            p.statusText = `rx :: ${targetBody.name}`;
            spawnLaserPacket(p.x, p.y, homeStar.x, homeStar.y, '#34d399', () => {
              showMissionDeliverable(p, targetBody, finishedTask);
            });
          }
        }
      }
    }

    if (config.trailLength === 0) {
      p.trail = [];
    } else {
      p.trail.push({ x: p.x, y: p.y });
      while (p.trail.length > config.trailLength) p.trail.shift();
    }
  });
}

let lastAsciiTick = 0;

function animate() {
  simTime += 0.016;

  // 1. Update all planet and probe positions first
  updatePlanetPositions();
  updateProbesPhysics();

  // 2. Update locked camera AFTER physics so locked planets/probes have zero jitter
  updateLockedCamera();

  if (simTime - lastAsciiTick > 0.06) {
    lastAsciiTick = simTime;
    updateAsciiRadarWidget();
  }

  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, Math.max(width, height) * 0.75);
  bgGrad.addColorStop(0, config.bgInner);
  bgGrad.addColorStop(0.5, config.bgMid);
  bgGrad.addColorStop(1, config.bgOuter);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  for (const s of bgStars) {
    const scr = worldToScreen(s.x * 0.75, s.y * 0.75, width, height);
    if (scr.x < 0 || scr.x > width || scr.y < 0 || scr.y > height) continue;
    const alpha = 0.22 + 0.55 * Math.sin(simTime * 2 + s.twinkle);
    ctx.fillStyle = `hsla(${s.hue}, 85%, 80%, ${alpha})`;
    const ch = config.shaderMode === 'pure_binary'
      ? ((s.twinkle > 3.14) ? '1' : '0')
      : s.glyph;
    ctx.fillText(ch, Math.round(scr.x), Math.round(scr.y));
  }

  drawConstellations(ctx, width, height);
  drawWarpedAsciiGrid(ctx, width, height);
  drawOrbitSystemBridge(ctx, width, height);

  // Draw each planet's orbit ring centered on its own parent star (SOL or GH_CORE)
  bodies.forEach(b => {
    if (!b.fixedPos && b.orbitRadius > 0) {
      const parent = getParentStar(b);
      const centerScr = worldToScreen(parent.x, parent.y, width, height);
      drawAsciiOrbitRing(ctx, centerScr, b, width, height);
    }
  });

  bodies.forEach(b => {
    const scr = worldToScreen(b.x, b.y, width, height);
    if (scr.x < -120 || scr.x > width + 120 || scr.y < -120 || scr.y > height + 120) return;
    const r = b.radius * camera.zoom * config.spriteScale;

    const aura = ctx.createRadialGradient(scr.x, scr.y, r * 0.2, scr.x, scr.y, r * 2.6);
    aura.addColorStop(0, b.glow);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(scr.x, scr.y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();

    drawAsciiCelestialBody(ctx, scr.x, scr.y, r * 1.18, b);

    if (config.showLabels) {
      ctx.font = '12px monospace';
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.9;
      ctx.textAlign = 'center';
      ctx.fillText(`[${b.name}]`, Math.round(scr.x), Math.round(scr.y + r * 1.35 + 16));
      ctx.globalAlpha = 1.0;
    }
  });

  drawCameraLockReticle(ctx, width, height);

  if (hoveredBody) {
    drawHoveredPlanetWireframe(ctx, hoveredBody, width, height);
  }

  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  for (let i = comets.length - 1; i >= 0; i--) {
    const c = comets[i];
    const { ax, ay } = computeGravity(c.x, c.y);
    c.vx += ax * 0.35;
    c.vy += ay * 0.35;
    c.x += c.vx;
    c.y += c.vy;

    c.tail.push({ x: c.x, y: c.y });
    if (c.tail.length > 26) c.tail.shift();

    for (let t = 0; t < c.tail.length; t++) {
      const ts = worldToScreen(c.tail[t].x, c.tail[t].y, width, height);
      ctx.fillStyle = t > c.tail.length - 6 ? '#fde047' : '#38bdf8';
      ctx.globalAlpha = (t / c.tail.length) * 0.75;
      const tailChar = t % 3 === 0 ? ((t & 1) ? '1' : '0') : (t > c.tail.length - 8 ? '=' : '-');
      ctx.fillText(tailChar, Math.round(ts.x), Math.round(ts.y));
    }
    ctx.globalAlpha = 1.0;

    const cs = worldToScreen(c.x, c.y, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('*01*', Math.round(cs.x), Math.round(cs.y));

    if (Math.abs(c.x - camera.x) > 1800 || Math.abs(c.y - camera.y) > 1300) {
      comets.splice(i, 1);
    }
  }

  // Render probes
  probes.forEach(p => {
    const targetBody = bodies.find(bd => bd.id === p.targetBodyId) || bodies[0];

    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < p.trail.length; i += 4) {
      const tScr = worldToScreen(p.trail[i].x, p.trail[i].y, width, height);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = (i / Math.max(1, p.trail.length)) * 0.58;
      const trailChar = config.shaderMode === 'dense_glyph'
        ? (i % 8 === 0 ? '+' : '·')
        : ((i & 4) ? '1' : '0');
      ctx.fillText(trailChar, Math.round(tScr.x), Math.round(tScr.y));
    }
    ctx.globalAlpha = 1.0;

    const pScr = worldToScreen(p.x, p.y, width, height);
    const tScr = worldToScreen(targetBody.x, targetBody.y, width, height);

    if (p.mode !== 'FREE_GRAVITY') {
      drawBinaryRadarCone(ctx, pScr, tScr, 38 * camera.zoom * config.spriteScale, p.color, !!p.activeTask);
    }

    const isSel = p.id === selectedProbeId;
    const bx = Math.round(pScr.x);
    const by = Math.round(pScr.y);

    drawAsciiProbe(ctx, bx, by, p, isSel);

    if (config.showLabels) {
      ctx.font = '12px monospace';
      ctx.fillStyle = isSel ? p.color : 'rgba(203, 213, 225, 0.78)';
      ctx.textAlign = 'left';
      ctx.fillText(p.short, bx + 28, by + 3);

      if (isSel && p.statusText) {
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.82)';
        ctx.fillText(p.statusText, bx + 28, by + 16);
      }
    }

    if (p.activeTask) {
      const totalBars = 8;
      const filled = Math.round(p.scanProgress * totalBars);
      const asciiBar = '[' + '|'.repeat(filled) + '·'.repeat(Math.max(0, totalBars - filled)) + ']';
      ctx.font = '10px monospace';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'left';
      ctx.fillText(asciiBar, bx + 28, by + 28);
    }
  });

  if (draggingProbe) {
    const pScr = worldToScreen(draggingProbe.x, draggingProbe.y, width, height);
    const mScr = worldToScreen(dragMouseWorld.x, dragMouseWorld.y, width, height);

    ctx.beginPath();
    ctx.moveTo(pScr.x, pScr.y);
    ctx.lineTo(mScr.x, mScr.y);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.stroke();

    const vx = (draggingProbe.x - dragMouseWorld.x) * 0.055;
    const vy = (draggingProbe.y - dragMouseWorld.y) * 0.055;
    const curve = predictTrajectory(draggingProbe.x, draggingProbe.y, vx, vy, 65);

    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    curve.forEach((pt, idx) => {
      if (idx % 3 === 0) {
        const s = worldToScreen(pt.x, pt.y, width, height);
        ctx.fillStyle = config.accentHex;
        ctx.fillText((idx & 1) ? '1' : '0', Math.round(s.x), Math.round(s.y));
      }
    });

    if (curve.length > 0) {
      const endS = worldToScreen(curve[curve.length - 1].x, curve[curve.length - 1].y, width, height);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('( X )', Math.round(endS.x), Math.round(endS.y));
    }
  }

  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  for (let i = laserPackets.length - 1; i >= 0; i--) {
    const pkt = laserPackets[i];
    pkt.progress += pkt.speed;
    if (pkt.progress >= 1) {
      if (pkt.onArrive) pkt.onArrive();
      laserPackets.splice(i, 1);
      continue;
    }
    const a = worldToScreen(pkt.fromX, pkt.fromY, width, height);
    const b = worldToScreen(pkt.toX, pkt.toY, width, height);
    const cx = a.x + (b.x - a.x) * pkt.progress;
    const cy = a.y + (b.y - a.y) * pkt.progress;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = pkt.color;
    ctx.globalAlpha = 0.22 * (1 - pkt.progress);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = pkt.color;
    ctx.fillText(pkt.bits, Math.round(cx), Math.round(cy));
  }

  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life -= pt.decay;
    if (pt.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    const scr = worldToScreen(pt.x, pt.y, width, height);
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = pt.life;
    const ch = config.shaderMode === 'pure_binary'
      ? ((i & 1) ? '1' : '0')
      : pt.glyph;
    ctx.fillText(ch, Math.round(scr.x), Math.round(scr.y));
    ctx.globalAlpha = 1.0;
  }

  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y -= 0.45;
    ft.life -= 0.012;
    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
      continue;
    }
    const scr = worldToScreen(ft.x, ft.y, width, height);
    ctx.fillStyle = ft.color;
    ctx.globalAlpha = ft.life;
    ctx.fillText(ft.text, Math.round(scr.x), Math.round(scr.y));
    ctx.globalAlpha = 1.0;
  }

  requestAnimationFrame(animate);
}

syncBottomBarProbe();
updateCameraLockBadge();
updateAsciiRadarWidget();
syncGitHubRepos();
setTimeout(spawnBinaryComet, 2200);
setInterval(() => {
  if (comets.length < 2 && Math.random() < 0.65) spawnBinaryComet();
}, 9500);
animate();
