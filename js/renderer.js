// ============================================================================
// AUKA // ORBITAL ASCII & BINARY TELEMETRY (Draft 2) — Pure ASCII Renderer
// ============================================================================

const DENSE_RAMP = '@%#*+=-:.';
let beaconHitBox = null; // { x, y, w, h, targetSystem: 'sol' | 'github' }

function pickBodyGlyph(normDist, lightVal, gx, gy, styleType) {
  const animTick = Math.floor(simTime * 5 + gx * 3 + gy * 5);
  if (config.shaderMode === 'pure_binary') {
    if (normDist > 0.82) return (animTick & 1) ? '1' : '0';
    return lightVal > 0 ? '1' : '0';
  }

  if (styleType === 'sun' || styleType === 'gh_sun') {
    if (normDist < 0.38) return '@';
    if (normDist < 0.68) return (animTick & 1) ? '#' : '1';
    return (animTick % 3 === 0) ? '0' : '*';
  }

  if (config.shaderMode === 'dense_glyph') {
    const idx = Math.min(DENSE_RAMP.length - 1, Math.max(0, Math.floor((1 - (lightVal * 0.5 + 0.5)) * (DENSE_RAMP.length - 1))));
    return DENSE_RAMP[idx];
  }

  if (Math.abs(gy) % 2 === 1 && normDist < 0.78) {
    return (animTick & 1) ? '1' : '0';
  }
  if (lightVal > 0.35) return '@';
  if (lightVal > 0.05) return '#';
  if (lightVal > -0.25) return '+';
  return ':';
}

function drawConstellations(ctx, width, height) {
  ctx.save();
  ctx.font = '9px monospace';
  CONSTELLATIONS.forEach((con, cIdx) => {
    const pulse = 0.14 + 0.06 * Math.sin(simTime * 1.2 + cIdx);
    ctx.strokeStyle = `rgba(${config.gridRgb}, ${pulse})`;
    ctx.setLineDash([2, 5]);
    ctx.lineWidth = 1;

    con.edges.forEach(([i, j]) => {
      const a = worldToScreen(con.stars[i].x * 0.75, con.stars[i].y * 0.75, width, height);
      const b = worldToScreen(con.stars[j].x * 0.75, con.stars[j].y * 0.75, width, height);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    con.stars.forEach((st, sIdx) => {
      const scr = worldToScreen(st.x * 0.75, st.y * 0.75, width, height);
      ctx.fillStyle = `rgba(${config.gridRgb}, ${pulse * 3.2})`;
      ctx.textAlign = 'center';
      ctx.fillText(sIdx === 0 ? '*' : '+', Math.round(scr.x), Math.round(scr.y + 3));
    });

    if (config.showLabels) {
      const anchor = worldToScreen(con.stars[0].x * 0.75, con.stars[0].y * 0.75, width, height);
      ctx.fillStyle = `rgba(${config.gridRgb}, ${pulse * 2.3})`;
      ctx.textAlign = 'left';
      ctx.fillText(`+--[${con.name}]`, Math.round(anchor.x + 8), Math.round(anchor.y - 6));
    }
  });
  ctx.setLineDash([]);
  ctx.restore();
}

function drawOrbitSystemBridge(ctx, width, height) {
  const sol = bodies[0];
  const gh = bodies.find(b => b.id === 'gh_core');
  if (!sol || !gh) return;

  const sSol = worldToScreen(sol.x, sol.y, width, height);
  const sGh = worldToScreen(gh.x, gh.y, width, height);

  ctx.save();
  // Faint ASCII / Binary bridge connecting SOL_ORBIT and GH_ORBIT
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.16)';
  ctx.setLineDash([4, 8]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sSol.x, sSol.y);
  ctx.lineTo(sGh.x, sGh.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Animated binary pulse packets traveling along the inter-orbital bridge
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  for (let i = 1; i <= 5; i++) {
    const t = ((simTime * 0.08 + i * 0.2) % 1);
    const bx = sSol.x + (sGh.x - sSol.x) * t;
    const by = sSol.y + (sGh.y - sSol.y) * t;
    if (bx >= 0 && bx <= width && by >= 0 && by <= height) {
      ctx.fillStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.fillText(i % 2 === 0 ? '0110' : '::', Math.round(bx), Math.round(by - 6));
    }
  }

  // Off-screen clickable directional beacon to jump to the other orbit
  beaconHitBox = null;
  const ghOffscreen = sGh.x < 60 || sGh.x > width - 60 || sGh.y < 60 || sGh.y > height - 60;
  const solOffscreen = sSol.x < 60 || sSol.x > width - 60 || sSol.y < 60 || sSol.y > height - 60;

  if (ghOffscreen && !zenMode) {
    const boxW = 240;
    const boxH = 32;
    const bx = width - boxW - 24;
    const by = Math.max(195, Math.min(height - 150, sGh.y - boxH / 2));
    beaconHitBox = { x: bx, y: by, w: boxW, h: boxH, targetSystem: 'github' };

    const isHov = hoveredBeacon === 'github';
    ctx.font = isHov ? 'bold 11px monospace' : '11px monospace';
    ctx.fillStyle = isHov ? '#34d399' : 'rgba(52, 211, 153, 0.85)';
    ctx.textAlign = 'right';
    ctx.fillText(':: [02::gh_orbit] --->', width - 26, by + 14);
    ctx.font = '10px monospace';
    ctx.fillStyle = isHov ? '#e2e8f0' : 'rgba(148, 163, 184, 0.7)';
    ctx.fillText('[click / key:2]', width - 26, by + 27);
  } else if (solOffscreen && !zenMode) {
    const boxW = 240;
    const boxH = 32;
    const bx = 24;
    const by = Math.max(195, Math.min(height - 150, sSol.y - boxH / 2));
    beaconHitBox = { x: bx, y: by, w: boxW, h: boxH, targetSystem: 'sol' };

    const isHov = hoveredBeacon === 'sol';
    ctx.font = isHov ? 'bold 11px monospace' : '11px monospace';
    ctx.fillStyle = isHov ? '#f59e0b' : 'rgba(245, 158, 11, 0.85)';
    ctx.textAlign = 'left';
    ctx.fillText('<--- [01::sol_orbit] ::', 26, by + 14);
    ctx.font = '10px monospace';
    ctx.fillStyle = isHov ? '#e2e8f0' : 'rgba(148, 163, 184, 0.7)';
    ctx.fillText('[click / key:1]', 26, by + 27);
  }

  ctx.restore();
}

function drawCameraLockReticle(ctx, width, height) {
  if (!camera.lockedTarget) return;

  let tx = null;
  let ty = null;
  let tr = 24;
  let color = '#a78bfa';
  let subHint = '';

  if (camera.lockedTarget.type === 'body') {
    const b = bodies.find(bd => bd.id === camera.lockedTarget.id);
    if (!b) return;
    const scr = worldToScreen(b.x, b.y, width, height);
    tx = scr.x;
    ty = scr.y;
    tr = b.radius * camera.zoom * config.spriteScale * 1.45 + 14;
    color = b.color;
    if (!b.fixedPos) {
      subHint = 'click again -> send probe';
    }
  } else if (camera.lockedTarget.type === 'probe') {
    const p = probes.find(pr => pr.id === camera.lockedTarget.id);
    if (!p) return;
    const scr = worldToScreen(p.x, p.y, width, height);
    tx = scr.x;
    ty = scr.y;
    tr = 30;
    color = p.color;
  }

  if (tx === null || ty === null) return;

  ctx.save();
  ctx.font = '10px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.78;

  const topY = Math.round(ty - tr - 10);
  const botY = Math.round(ty + tr + 26);
  ctx.fillText(`+--[ CAM_LOCK :: ${camera.lockedTarget.label.toUpperCase()} ]--+`, Math.round(tx), topY);
  if (subHint) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`[${subHint}]`, Math.round(tx), botY);
  }
  ctx.restore();
}

function drawTiltedAsciiRing(ctx, scrX, scrY, rxRadius, ryRadius, color, backHalf) {
  const steps = 22;
  ctx.font = '10px monospace';
  ctx.fillStyle = color;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2 + simTime * 0.8;
    const sinA = Math.sin(a);
    if (backHalf && sinA >= 0) continue;
    if (!backHalf && sinA < 0) continue;

    const lx = Math.cos(a) * rxRadius;
    const ly = sinA * ryRadius;
    const tx = lx * 0.92 - ly * -0.38;
    const ty = lx * -0.38 + ly * 0.92;

    const ch = config.shaderMode === 'pure_binary'
      ? ((i & 1) ? '1' : '0')
      : (i % 2 === 0 ? '=' : '-');
    ctx.globalAlpha = backHalf ? 0.35 : 0.82;
    ctx.fillText(ch, Math.round(scrX + tx), Math.round(scrY + ty));
  }
  ctx.globalAlpha = 1.0;
}

function drawBinaryCoronaRing(ctx, scrX, scrY, ringRadius, color, speedSign = 1, count = 16) {
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + simTime * 0.45 * speedSign;
    const rx = scrX + Math.cos(a) * ringRadius;
    const ry = scrY + Math.sin(a) * ringRadius;
    const glyph = config.shaderMode === 'dense_glyph'
      ? (i % 2 === 0 ? '+' : '·')
      : (((i + Math.floor(simTime * 4)) % 2 === 0) ? '1' : '0');
    ctx.globalAlpha = 0.24 + 0.24 * Math.sin(simTime * 3 + i);
    ctx.fillText(glyph, Math.round(rx), Math.round(ry));
  }
  ctx.globalAlpha = 1.0;
}

function drawAsciiCelestialBody(ctx, scrX, scrY, radius, body) {
  const charStepX = 7.5;
  const charStepY = 8.5;
  const stepsX = Math.max(2, Math.floor(radius / charStepX));
  const stepsY = Math.max(2, Math.floor(radius / charStepY));

  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (body.styleType === 'rogue') {
    const glitch = (Math.floor(simTime * 8) & 1) ? '0xDEAD' : '101101';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#fb7185';
    ctx.fillText('x---x', Math.round(scrX), Math.round(scrY - 11));
    ctx.fillStyle = '#fde047';
    ctx.fillText(`<[${glitch}]>`, Math.round(scrX), Math.round(scrY));
    ctx.fillStyle = '#fb7185';
    ctx.fillText('x---x', Math.round(scrX), Math.round(scrY + 11));
    drawBinaryCoronaRing(ctx, scrX, scrY, radius + 12, '#fb7185', -1.8, 10);
    ctx.textBaseline = 'alphabetic';
    return;
  }

  if (body.styleType === 'blackhole') {
    const ringCount = 28;
    for (let i = 0; i < ringCount; i++) {
      const a = (i / ringCount) * Math.PI * 2 - simTime * 1.6;
      const rx = Math.cos(a) * (radius * 1.45);
      const ry = Math.sin(a) * (radius * 0.58);
      const rotX = rx * 0.92 - ry * 0.38;
      const rotY = rx * 0.38 + ry * 0.92;
      const bit = config.shaderMode === 'dense_glyph'
        ? (i % 2 === 0 ? '%' : '#')
        : (((i + Math.floor(simTime * 8)) & 1) ? '1' : '0');
      ctx.fillStyle = (i % 3 === 0) ? '#fde047' : body.color;
      ctx.globalAlpha = 0.85;
      ctx.fillText(bit, Math.round(scrX + rotX), Math.round(scrY + rotY));
    }
    ctx.fillStyle = '#f97316';
    ctx.globalAlpha = 0.95;
    ctx.fillText('(0x00)', Math.round(scrX), Math.round(scrY));
    ctx.globalAlpha = 1.0;
    ctx.textBaseline = 'alphabetic';
    return;
  }

  if (body.styleType === 'wormhole') {
    const glyphs = config.shaderMode === 'pure_binary' ? ['0', '1'] : ['{', '}', '<', '>', '0', '1', '*'];
    const rings = [radius * 0.65, radius * 1.15];
    rings.forEach((rr, rIdx) => {
      const count = rIdx === 0 ? 10 : 16;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + simTime * (rIdx === 0 ? 1.8 : -1.2);
        const gx = scrX + Math.cos(a) * rr;
        const gy = scrY + Math.sin(a) * rr;
        ctx.fillStyle = (i % 2 === 0) ? body.color : body.accent;
        ctx.globalAlpha = 0.85;
        ctx.fillText(glyphs[(i + rIdx) % glyphs.length], Math.round(gx), Math.round(gy));
      }
    });
    ctx.fillStyle = '#ffffff';
    ctx.fillText('<>', Math.round(scrX), Math.round(scrY));
    ctx.globalAlpha = 1.0;
    ctx.textBaseline = 'alphabetic';
    return;
  }

  const hasRing = body.styleType === 'cyber' || body.styleType === 'forge' || body.styleType === 'gh_sun';
  if (hasRing) {
    drawTiltedAsciiRing(ctx, scrX, scrY, radius * 1.65, radius * 0.52, body.accent || body.color, true);
  }

  for (let gy = -stepsY; gy <= stepsY; gy++) {
    for (let gx = -stepsX; gx <= stepsX; gx++) {
      const dx = gx * charStepX;
      const dy = gy * charStepY;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;

      const norm = dist / radius;
      const light = (-dx * 0.55 - dy * 0.55) / radius;
      const ch = pickBodyGlyph(norm, light, gx, gy, body.styleType);

      if (body.styleType === 'sun') {
        ctx.fillStyle = norm < 0.45 ? '#fef08a' : (norm < 0.78 ? '#f59e0b' : '#ea580c');
        ctx.globalAlpha = 0.95;
      } else if (body.styleType === 'gh_sun') {
        ctx.fillStyle = norm < 0.45 ? '#a7f3d0' : (norm < 0.78 ? '#34d399' : '#38bdf8');
        ctx.globalAlpha = 0.95;
      } else {
        ctx.fillStyle = light < -0.25 ? (body.accent || '#334155') : body.color;
        ctx.globalAlpha = light < -0.35 ? 0.55 : 0.92;
      }
      ctx.fillText(ch, Math.round(scrX + dx), Math.round(scrY + dy));
    }
  }

  if (hasRing) {
    drawTiltedAsciiRing(ctx, scrX, scrY, radius * 1.65, radius * 0.52, body.color, false);
  }

  const isStar = body.styleType === 'sun' || body.styleType === 'gh_sun';
  drawBinaryCoronaRing(
    ctx,
    scrX,
    scrY,
    radius + (isStar ? 13 : 9),
    body.color,
    isStar ? 0.65 : -0.5,
    isStar ? 22 : 12
  );

  ctx.globalAlpha = 1.0;
  ctx.textBaseline = 'alphabetic';
}

function drawHoveredPlanetWireframe(ctx, body, width, height) {
  const scr = worldToScreen(body.x, body.y, width, height);
  const r = body.radius * camera.zoom * config.spriteScale * 1.35;

  ctx.save();
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const latSteps = 5;
  const lonSteps = 10;
  const rotY = simTime * 1.4;
  const tiltX = 0.35;

  for (let latI = -latSteps + 1; latI < latSteps; latI++) {
    const lat = (latI / latSteps) * (Math.PI / 2);
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);

    for (let lonI = 0; lonI < lonSteps; lonI++) {
      const lon = (lonI / lonSteps) * Math.PI * 2 + rotY;
      const vx = cosLat * Math.sin(lon);
      const vy = sinLat * Math.cos(tiltX) - cosLat * Math.cos(lon) * Math.sin(tiltX);
      const vz = sinLat * Math.sin(tiltX) + cosLat * Math.cos(lon) * Math.cos(tiltX);

      if (vz < -0.1) continue;
      const px = scr.x + vx * (r + 8);
      const py = scr.y + vy * (r + 8);
      ctx.fillStyle = vz > 0.4 ? '#ffffff' : body.color;
      ctx.globalAlpha = 0.4 + vz * 0.55;
      ctx.fillText(vz > 0.5 ? '+' : '·', Math.round(px), Math.round(py));
    }
  }

  const cardX = Math.round(scr.x + r + 26);
  const cardY = Math.round(scr.y - r - 14);

  ctx.strokeStyle = body.color;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(scr.x + r * 0.7, scr.y - r * 0.7);
  ctx.lineTo(cardX - 6, cardY + 6);
  ctx.lineTo(cardX + 130, cardY + 6);
  ctx.stroke();

  const meta = body.repoMeta || { fullName: body.name, branch: 'main', commits: '0x001F', stack: 'ORBIT_NODE' };
  const notesCount = getPlanetNotes(body.name).length;
  const isLockedHere = camera.lockedTarget && camera.lockedTarget.type === 'body' && camera.lockedTarget.id === body.id;
  const actionHint = isLockedHere ? '[click -> send probe]' : '[click -> lock cam]';
  const lines = [
    `:: SECTOR [${body.name.toUpperCase()}]`,
    `repo   : ${meta.fullName || body.name}`,
    `stack  : ${meta.stack} // ${meta.commits}`,
    `action : ${actionHint} [notes:${notesCount}]`
  ];

  ctx.fillStyle = 'rgba(6, 9, 20, 0.92)';
  ctx.fillRect(cardX - 4, cardY + 10, 236, 64);
  ctx.strokeStyle = body.color;
  ctx.strokeRect(cardX - 4, cardY + 10, 236, 64);

  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1.0;
  lines.forEach((ln, idx) => {
    ctx.fillStyle = idx === 0 ? body.color : (idx === 3 ? '#fde047' : '#cbd5e1');
    ctx.fillText(ln.slice(0, 36), cardX + 4, cardY + 23 + idx * 13);
  });

  ctx.restore();
}

function getProbeAsciiArt(probeId) {
  const bitA = (Math.floor(simTime * 5) & 1) ? '1' : '0';
  const bitB = bitA === '1' ? '0' : '1';

  if (config.shaderMode === 'pure_binary') {
    return [
      ` ${bitA}${bitB} `,
      `${bitB}${bitA}${bitA}${bitB}`,
      ` ${bitB}${bitA} `
    ];
  }

  switch (probeId) {
    case 'recon':
      return [
        `  /^\\  `,
        `<[${bitA}:${bitB}]>`,
        `  v^v  `
      ];
    case 'blueprint':
      return [
        ` +---+ `,
        ` |#${bitA}#| `,
        ` +---+ `
      ];
    case 'glyph':
      return [
        `  /\\   `,
        ` {${bitA}${bitB}}  `,
        `  \\/   `
      ];
    case 'scribe':
    default:
      return [
        `  _I_  `,
        ` (${bitA}|${bitB}) `,
        `  -^-  `
      ];
  }
}

function drawAsciiProbe(ctx, bx, by, probe, isSel) {
  const rows = getProbeAsciiArt(probe.id);
  ctx.font = isSel ? 'bold 11px monospace' : '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lineH = 10 * config.spriteScale;
  rows.forEach((line, idx) => {
    const yOff = (idx - 1) * lineH;
    ctx.fillStyle = idx === 1 ? probe.color : (isSel ? '#e2e8f0' : '#94a3b8');
    ctx.fillText(line, bx, Math.round(by + yOff));
  });

  if (isSel && config.showLabels) {
    ctx.font = '11px monospace';
    ctx.fillStyle = probe.color;
    ctx.globalAlpha = 0.7;
    ctx.fillText('┌         ┐', bx, Math.round(by - lineH * 1.55));
    ctx.fillText('└         ┘', bx, Math.round(by + lineH * 1.55));
    ctx.globalAlpha = 1.0;
  }
  ctx.textBaseline = 'alphabetic';
}

function drawWarpedAsciiGrid(ctx, width, height) {
  if (config.gridAlpha <= 0.001) return;
  const spacing = 64;
  // Dynamically compute cols & rows from viewport size and zoom so grid always fills 100% of screen edge-to-edge
  const cols = Math.ceil((width / 2) / (spacing * camera.zoom)) + 2;
  const rows = Math.ceil((height / 2) / (spacing * camera.zoom)) + 2;
  const gridCenterX = Math.round(camera.x / spacing) * spacing;
  const gridCenterY = Math.round(camera.y / spacing) * spacing;

  function warpPoint(wx, wy) {
    let dxTotal = 0;
    let dyTotal = 0;
    for (const b of bodies) {
      const dx = b.x - wx;
      const dy = b.y - wy;
      const distSq = dx * dx + dy * dy + 2000;
      if (distSq > 900000) continue;
      const pull = Math.min(38, (b.mass * 0.48 * config.gravityMult) / Math.sqrt(distSq));
      const angle = Math.atan2(dy, dx);
      dxTotal += Math.cos(angle) * pull;
      dyTotal += Math.sin(angle) * pull;
    }
    return worldToScreen(wx + dxTotal, wy + dyTotal, width, height);
  }

  // Horizontal warped grid lines
  ctx.strokeStyle = `rgba(${config.gridRgb}, ${config.gridAlpha * 0.55})`;
  ctx.lineWidth = 1;
  for (let r = -rows; r <= rows; r++) {
    ctx.beginPath();
    for (let c = -cols; c <= cols; c++) {
      const pt = warpPoint(gridCenterX + c * spacing, gridCenterY + r * spacing);
      if (c === -cols) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  // Vertical warped grid lines
  ctx.strokeStyle = `rgba(${config.gridRgb}, ${config.gridAlpha * 0.32})`;
  for (let c = -cols; c <= cols; c++) {
    ctx.beginPath();
    for (let r = -rows; r <= rows; r++) {
      const pt = warpPoint(gridCenterX + c * spacing, gridCenterY + r * spacing);
      if (r === -rows) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  ctx.font = '9px monospace';
  ctx.fillStyle = `rgba(${config.gridRgb}, ${Math.min(0.45, config.gridAlpha * 2.4)})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const startR = -rows + ((-rows) & 1);
  const startC = -cols + ((-cols) & 1);
  for (let r = startR; r <= rows; r += 2) {
    for (let c = startC; c <= cols; c += 2) {
      const wx = gridCenterX + c * spacing;
      const wy = gridCenterY + r * spacing;
      const pt = warpPoint(wx, wy);
      if (pt.x < -10 || pt.x > width + 10 || pt.y < -10 || pt.y > height + 10) continue;
      const worldGridIdx = Math.round(wx / spacing) + Math.round(wy / spacing);
      const glyph = config.shaderMode === 'pure_binary'
        ? ((worldGridIdx & 2) ? '1' : '0')
        : '+';
      ctx.fillText(glyph, Math.round(pt.x), Math.round(pt.y));
    }
  }
  ctx.textBaseline = 'alphabetic';
}

function drawAsciiOrbitRing(ctx, centerScr, body, width, height) {
  const radiusPx = body.orbitRadius * camera.zoom;
  const vib = body.ringVibration || 0;
  const circumference = 2 * Math.PI * radiusPx;
  const stepCount = Math.max(32, Math.min(130, Math.floor(circumference / 16)));

  ctx.font = vib > 0.08 ? '10px monospace' : '9px monospace';
  ctx.fillStyle = body.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.22 + vib * 0.58;

  for (let i = 0; i < stepCount; i++) {
    const a = (i / stepCount) * Math.PI * 2;
    const standingWave = vib > 0.01
      ? Math.sin(a * 14 + simTime * 34) * vib * 7.5 * camera.zoom
      : 0;
    const rCurrent = radiusPx + standingWave;
    const ox = centerScr.x + Math.cos(a) * rCurrent;
    const oy = centerScr.y + Math.sin(a) * rCurrent;
    if (ox < -10 || ox > width + 10 || oy < -10 || oy > height + 10) continue;

    let ch;
    if (vib > 0.15) {
      ch = (i % 2 === 0) ? '~' : ((i & 1) ? '1' : '0');
    } else if (config.shaderMode === 'pure_binary') {
      ch = (i & 1) ? '1' : '0';
    } else {
      ch = (i % 4 === 0) ? ':' : '·';
    }
    ctx.fillText(ch, Math.round(ox), Math.round(oy));
  }
  ctx.globalAlpha = 1.0;
  ctx.textBaseline = 'alphabetic';
}

function drawBinaryRadarCone(ctx, pScr, tScr, radius, color, isScanning) {
  const angleToPlanet = Math.atan2(tScr.y - pScr.y, tScr.x - pScr.x);
  ctx.font = '9px monospace';
  ctx.fillStyle = isScanning ? '#34d399' : color;
  ctx.textAlign = 'center';
  const layers = 3;
  for (let l = 1; l <= layers; l++) {
    const dist = (l / layers) * radius;
    for (let s = -1; s <= 1; s++) {
      const a = angleToPlanet + s * 0.16;
      const bx = pScr.x + Math.cos(a) * dist;
      const by = pScr.y + Math.sin(a) * dist;
      const bit = config.shaderMode === 'dense_glyph'
        ? ':'
        : (((l + s + Math.floor(simTime * 8)) & 1) ? '1' : '0');
      ctx.globalAlpha = isScanning ? 0.6 : 0.26;
      ctx.fillText(bit, Math.round(bx), Math.round(by));
    }
  }
  ctx.globalAlpha = 1.0;
}

function updateAsciiRadarWidget() {
  if (!showAsciiHud || zenMode) return;
  const sysStar = camera.activeSystem === 'github'
    ? (bodies.find(b => b.id === 'gh_core') || bodies[0])
    : bodies[0];
  const p = probes.find(pr => pr.id === selectedProbeId) || probes[0];
  const b = bodies.find(bd => bd.id === p.targetBodyId) || sysStar;
  const dist = Math.round(Math.hypot(p.x - b.x, p.y - b.y));
  const angleDeg = Math.round(((Math.atan2(p.y - sysStar.y, p.x - sysStar.x) * 180) / Math.PI + 360) % 360);

  // Expanded 23x11 dot-matrix radar (more pixels to show bodies clearly)
  const cols = 23;
  const rows = 11;
  const grid = Array.from({ length: rows }, () => Array(cols).fill('·'));
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  grid[cy][cx] = '@';

  bodies.forEach(bd => {
    if (bd.id === sysStar.id) return;
    if (bd.parentBodyId && bd.parentBodyId !== sysStar.id) return;
    const gx = Math.round(cx + ((bd.x - sysStar.x) / 510) * (cols / 2 - 1));
    const gy = Math.round(cy + ((bd.y - sysStar.y) / 510) * (rows / 2 - 1));
    if (gy >= 0 && gy < rows && gx >= 0 && gx < cols) {
      grid[gy][gx] = bd.styleType === 'blackhole' ? '%' : (bd.styleType === 'rogue' ? 'X' : 'O');
    }
  });

  const px = Math.round(cx + ((p.x - sysStar.x) / 510) * (cols / 2 - 1));
  const py = Math.round(cy + ((p.y - sysStar.y) / 510) * (rows / 2 - 1));
  if (py >= 0 && py < rows && px >= 0 && px < cols) {
    grid[py][px] = '*';
  }

  const sysTag = camera.activeSystem === 'github' ? '02::GH_ORBIT' : '01::SOL_ORBIT';
  const camTag = camera.lockedTarget
    ? ('CAM::' + camera.lockedTarget.label.toUpperCase()).slice(0, 29)
    : 'CAM::FREE';
  const topBorder = (`+--[ RADAR // ${sysTag} ]`).padEnd(48, '-') + '+';
  const midBorder = (`+--[ ${camTag.padEnd(29, ' ')} R:${String(dist).padStart(3, '0')} ]`).padEnd(48, '-') + '+';

  const lines = [
    topBorder,
    ...grid.map(r => `| ${r.join(' ')} |`),
    midBorder
  ];
  const widget = document.getElementById('asciiArtWidget');
  if (widget) widget.textContent = lines.join('\n');

  const binOctet = ((Math.floor(simTime * 10) + dist) & 0xff).toString(2).padStart(8, '0');
  const hexVal = ((angleDeg * 7) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const streamEl = document.getElementById('binaryStreamLine');
  if (streamEl) streamEl.textContent = `0x${hexVal} :: ${binOctet} ${(dist & 0xff).toString(2).padStart(8, '0')}`;
}
