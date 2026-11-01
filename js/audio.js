// ============================================================================
// AUKA // ORBITAL ASCII & BINARY TELEMETRY (Draft 2) — Web Audio Guitar Synth
// ============================================================================

let audioCtx = null;
let audioEnabled = false;
// Guitar Pentatonic / Quartal Tuning for Orbit Strings (E2, A2, D3, G3, B3, E4)
const GUITAR_NOTES = [164.81, 220.00, 293.66, 392.00, 493.88, 659.25];

function toggleAudio() {
  const el = document.getElementById('audioStateText');
  if (!audioEnabled) {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    audioEnabled = true;
    el.textContent = '[1]';
    el.className = 'text-emerald-400';
    playSpaceChord([220, 330, 440, 659.25], 0.8);
  } else {
    audioEnabled = false;
    el.textContent = '[0]';
    el.className = 'text-slate-500';
  }
}

function playSpacePing(freq = 528, duration = 0.35, type = 'triangle') {
  if (!audioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function playGuitarPluck(freq = 220) {
  if (!audioEnabled || !audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);
    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.15);
    osc2.stop(now + 1.15);
  } catch (e) {}
}

function playSpaceChord(freqs, duration = 0.9) {
  if (!audioEnabled || !audioCtx) return;
  freqs.forEach((f, i) => {
    setTimeout(() => playSpacePing(f, duration, i % 2 === 0 ? 'triangle' : 'sine'), i * 50);
  });
}
