// ============================================================================
// AUKA // ORBITAL ASCII & BINARY TELEMETRY (Draft 2) — Web Audio Guitar Synth
// ============================================================================

let audioCtx = null;
let audioEnabled = false;
let masterGainNode = null;

// Scale & String Tuning Presets (base frequencies in standard octave)
const TUNING_PRESETS = {
  std_e: {
    id: 'std_e',
    name: 'Standard (E-A-D-G-B-E)',
    notes: [164.81, 220.00, 293.66, 392.00, 493.88, 659.25]
  },
  drop_d: {
    id: 'drop_d',
    name: 'Drop D (D-A-D-G-B-E)',
    notes: [146.83, 220.00, 293.66, 392.00, 493.88, 659.25]
  },
  dadgad: {
    id: 'dadgad',
    name: 'DADGAD (D-A-D-G-A-D)',
    notes: [146.83, 220.00, 293.66, 392.00, 440.00, 587.33]
  },
  pentatonic: {
    id: 'pentatonic',
    name: 'Penta (E-G-A-B-D-E)',
    notes: [164.81, 196.00, 220.00, 246.94, 293.66, 329.63]
  }
};

// Root Key Offsets in semitones relative to base E
const KEY_OFFSETS = {
  'C': -4,
  'D': -2,
  'E': 0,
  'F': 1,
  'G': 3,
  'A': 5,
  'B': 7
};

// Semitone names relative to E
const SEMITONE_NAMES = {
  '-12': 'E (-1)',
  '-11': 'F',
  '-10': 'F#',
  '-9': 'G',
  '-8': 'G#',
  '-7': 'A',
  '-6': 'A#',
  '-5': 'B',
  '-4': 'C',
  '-3': 'C#',
  '-2': 'D',
  '-1': 'D#',
  '0': 'E',
  '1': 'F',
  '2': 'F#',
  '3': 'G',
  '4': 'G#',
  '5': 'A',
  '6': 'A#',
  '7': 'B',
  '8': 'C (+1)',
  '9': 'C#',
  '10': 'D (+1)',
  '11': 'D#',
  '12': 'E (+1)'
};

// Active array of guitar strings (mutated in place for full backward compatibility)
let GUITAR_NOTES = [...TUNING_PRESETS.std_e.notes];

function getMasterGain() {
  if (!audioCtx) return null;
  if (!masterGainNode) {
    masterGainNode = audioCtx.createGain();
    const vol = typeof config.masterVolume === 'number' ? config.masterVolume : 0.7;
    masterGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    masterGainNode.connect(audioCtx.destination);
  }
  return masterGainNode;
}

function setMasterVolume(vol) {
  config.masterVolume = Math.max(0, Math.min(1, vol));
  if (masterGainNode && audioCtx) {
    masterGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGainNode.gain.setValueAtTime(config.masterVolume, audioCtx.currentTime);
  }
  syncAudioUI();
  if (typeof savePersistentState === 'function') savePersistentState();
}

function adjustVolumeDelta(delta) {
  const cur = typeof config.masterVolume === 'number' ? config.masterVolume : 0.7;
  setMasterVolume(Math.round((cur + delta) * 100) / 100);
}

function updateVolume(val) {
  const pct = parseInt(val, 10);
  setMasterVolume(pct / 100);
  if (audioEnabled) {
    playSpacePing(528, 0.12, 'sine');
  }
}

function getPitchMultiplier() {
  const semitones = typeof config.tuneSemitones === 'number' ? config.tuneSemitones : 0;
  let mult = Math.pow(2, semitones / 12);
  if (config.tuningHz === 432) {
    mult *= (432 / 440);
  }
  return mult;
}

function applyTuning() {
  const presetKey = config.tuningPreset && TUNING_PRESETS[config.tuningPreset] ? config.tuningPreset : 'std_e';
  const baseNotes = TUNING_PRESETS[presetKey].notes;
  const mult = getPitchMultiplier();
  for (let i = 0; i < baseNotes.length; i++) {
    GUITAR_NOTES[i] = Number((baseNotes[i] * mult).toFixed(2));
  }
  GUITAR_NOTES.length = baseNotes.length;
  syncAudioUI();
}

function setTuningKey(key) {
  if (!(key in KEY_OFFSETS)) return;
  config.tuningKey = key;
  config.tuneSemitones = KEY_OFFSETS[key];
  applyTuning();
  if (typeof savePersistentState === 'function') savePersistentState();
  if (audioEnabled) {
    playGuitarPluck(GUITAR_NOTES[0]);
  }
}

function updateTranspose(semitonesVal) {
  const st = parseInt(semitonesVal, 10);
  config.tuneSemitones = st;
  // Match key button if semitone corresponds to one of the major root notes
  let matchedKey = null;
  for (const [k, offset] of Object.entries(KEY_OFFSETS)) {
    if (offset === st) {
      matchedKey = k;
      break;
    }
  }
  config.tuningKey = matchedKey || '';
  applyTuning();
  if (typeof savePersistentState === 'function') savePersistentState();
  if (audioEnabled) {
    playGuitarPluck(GUITAR_NOTES[0]);
  }
}

function setTuningPreset(presetId) {
  if (!TUNING_PRESETS[presetId]) return;
  config.tuningPreset = presetId;
  applyTuning();
  if (typeof savePersistentState === 'function') savePersistentState();
  if (audioEnabled) {
    playGuitarPluck(GUITAR_NOTES[0]);
  }
}

function toggleTuningHz() {
  config.tuningHz = config.tuningHz === 432 ? 440 : 432;
  applyTuning();
  if (typeof savePersistentState === 'function') savePersistentState();
  if (audioEnabled) {
    playSpacePing(config.tuningHz === 432 ? 432 : 440, 0.25, 'triangle');
  }
}

function syncAudioUI() {
  const volPct = Math.round((config.masterVolume ?? 0.7) * 100);
  const st = config.tuneSemitones ?? 0;
  const keyLabel = SEMITONE_NAMES[String(st)] || `st:${st}`;

  // Sliders and badges
  const slVol = document.getElementById('slVolume');
  if (slVol && parseInt(slVol.value, 10) !== volPct) slVol.value = volPct;
  const valVol = document.getElementById('valVolume');
  if (valVol) valVol.textContent = `${String(volPct).padStart(3, '0')}%`;

  const slTrans = document.getElementById('slTranspose');
  if (slTrans && parseInt(slTrans.value, 10) !== st) slTrans.value = st;
  const valTrans = document.getElementById('valTranspose');
  if (valTrans) {
    const sign = st > 0 ? '+' : '';
    valTrans.textContent = `${sign}${st} st [${keyLabel}]`;
  }

  // Audio bottom status & vol badge
  const audioStateEl = document.getElementById('audioStateText');
  if (audioStateEl) {
    audioStateEl.textContent = audioEnabled ? '[1]' : '[0]';
    audioStateEl.className = audioEnabled ? 'text-emerald-400 font-semibold' : 'text-slate-500';
  }
  const audioVolBadge = document.getElementById('audioVolBadge');
  if (audioVolBadge) {
    audioVolBadge.textContent = audioEnabled ? `(${volPct}%)` : '(muted)';
    audioVolBadge.className = audioEnabled ? 'text-xs text-emerald-400/80' : 'text-xs text-slate-600';
  }

  // Key buttons
  const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  keys.forEach(k => {
    const btn = document.getElementById(`btnKey_${k}`);
    if (!btn) return;
    const isSelected = config.tuningKey === k || KEY_OFFSETS[k] === st;
    btn.className = isSelected
      ? 'px-1.5 py-0.5 border border-amber-400/80 bg-amber-500/20 text-amber-300 text-xs font-semibold transition'
      : 'px-1.5 py-0.5 border border-slate-800 text-slate-500 hover:text-amber-300 text-xs transition';
  });

  // Preset buttons
  ['std_e', 'drop_d', 'dadgad', 'pentatonic'].forEach(pId => {
    const btn = document.getElementById(`btnPreset_${pId}`);
    if (!btn) return;
    const isSelected = (config.tuningPreset || 'std_e') === pId;
    btn.className = isSelected
      ? 'px-2 py-0.5 border border-cyan-400/80 bg-cyan-500/20 text-cyan-300 text-xs font-semibold transition'
      : 'px-2 py-0.5 border border-slate-800 text-slate-500 hover:text-cyan-300 text-xs transition';
  });

  // Hz button
  const btnHz = document.getElementById('btnTuningHz');
  if (btnHz) {
    const is432 = config.tuningHz === 432;
    btnHz.textContent = `[${is432 ? '432hz' : '440hz'}]`;
    btnHz.className = is432
      ? 'text-xs text-pink-400 font-semibold hover:text-white transition'
      : 'text-xs text-purple-300 hover:text-white transition';
  }
}

function toggleAudio(forceState = null) {
  const targetState = forceState !== null ? forceState : !audioEnabled;
  if (targetState) {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    getMasterGain();
    setMasterVolume(config.masterVolume ?? 0.7);
    audioEnabled = true;
    syncAudioUI();
    playSpaceChord([220, 330, 440, 659.25], 0.8);
  } else {
    audioEnabled = false;
    syncAudioUI();
  }
}

function playSpacePing(freq = 528, duration = 0.35, type = 'triangle', applyPitch = true) {
  if (!audioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const tunedFreq = applyPitch ? freq * getPitchMultiplier() : freq;
    osc.type = type;
    osc.frequency.setValueAtTime(tunedFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(tunedFreq * 1.25, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    const master = getMasterGain();
    if (master) {
      gain.connect(master);
    } else {
      gain.connect(audioCtx.destination);
    }
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { }
}

function playGuitarPluck(freq = 220, isRaw = false) {
  if (!audioEnabled || !audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const finalFreq = isRaw ? freq * getPitchMultiplier() : freq;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(finalFreq, now);
    osc2.frequency.setValueAtTime(finalFreq * 2, now);
    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    osc1.connect(gain);
    osc2.connect(gain);
    const master = getMasterGain();
    if (master) {
      gain.connect(master);
    } else {
      gain.connect(audioCtx.destination);
    }
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.15);
    osc2.stop(now + 1.15);
  } catch (e) { }
}

function playSpaceChord(freqs, duration = 0.9) {
  if (!audioEnabled || !audioCtx) return;
  freqs.forEach((f, i) => {
    setTimeout(() => playSpacePing(f, duration, i % 2 === 0 ? 'triangle' : 'sine'), i * 50);
  });
}
