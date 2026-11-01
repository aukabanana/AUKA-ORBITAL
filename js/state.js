// ============================================================================
// AUKA // ORBITAL ASCII & BINARY TELEMETRY (Draft 2) — Global State & Storage
// ============================================================================

const STORAGE_KEY = 'auka_orbital_draft2_state_v2';

const THEMES = {
  tokyo: {
    bgInner: '#0a0f24',
    bgMid: '#060916',
    bgOuter: '#020409',
    gridRgb: '56, 189, 248',
    accentHex: '#38bdf8'
  },
  nebula: {
    bgInner: '#1a0924',
    bgMid: '#0d0414',
    bgOuter: '#050108',
    gridRgb: '244, 114, 182',
    accentHex: '#f472b6'
  }
};

const ORBIT_SYSTEMS = {
  sol: {
    id: 'core',
    key: 'sol',
    label: '01::SOL_ORBIT',
    x: 0,
    y: 0
  },
  github: {
    id: 'gh_core',
    key: 'github',
    label: '02::GH_ORBIT',
    x: 1380,
    y: -160
  }
};

const config = {
  themeName: 'tokyo',
  shaderMode: 'hybrid_ascii', // 'hybrid_ascii' | 'pure_binary' | 'dense_glyph'
  planetSpeedMult: 1.0,
  probeSpeedMult: 1.0,
  gravityMult: 1.0,
  trailLength: 48,
  gridAlpha: 0.085,
  spriteScale: 1.0,
  showLabels: true,
  masterVolume: 0.7,
  tuningKey: 'E',
  tuneSemitones: 0,
  tuningPreset: 'std_e',
  tuningHz: 440,
  bgInner: '#0a0f24',
  bgMid: '#060916',
  bgOuter: '#020409',
  gridRgb: '56, 189, 248',
  accentHex: '#38bdf8'
};

// Camera Pan, Zoom, and Easy Orbital Lock State
const camera = {
  x: 0,
  y: 0,
  zoom: 1.0,
  isPanning: false,
  panStartScreen: { x: 0, y: 0 },
  panStartCam: { x: 0, y: 0 },
  lockedTarget: { type: 'body', id: 'core', label: 'sol', lerp: 0.18 },
  activeSystem: 'sol' // 'sol' | 'github'
};

let simTime = 0;
let spawnWorldCoords = null;
let zenMode = false;
let showAsciiHud = true;
let hoveredBody = null;
let hoveredBeacon = null; // 'sol' | 'github' | null
let mouseWorld = { x: 9999, y: 9999 };
let prevMouseRadiusFromCenter = null;
let ctfFlagsCaptured = 0;
let planetNotes = {}; // { [bodyNameOrId]: [{ text, ts, agent }] }
let planetOrbitRadii = {}; // { [bodyId]: number }
let radiusFilterMode = 'sol'; // 'sol' | 'github'

const STAR_GLYPHS = ['.', '·', ':', '+', '*', '0', '1'];
const bgStars = Array.from({ length: 340 }, (_, idx) => ({
  x: -1400 + Math.random() * 4200,
  y: (Math.random() - 0.5) * 2600,
  twinkle: Math.random() * Math.PI * 2,
  hue: Math.random() > 0.7 ? 195 : (Math.random() > 0.5 ? 275 : 42),
  glyph: STAR_GLYPHS[idx % STAR_GLYPHS.length]
}));

const CONSTELLATIONS = [
  {
    name: 'CYGNUS::0x01',
    stars: [
      { x: -680, y: -420 },
      { x: -580, y: -350 },
      { x: -490, y: -280 },
      { x: -640, y: -270 },
      { x: -520, y: -430 }
    ],
    edges: [[0, 1], [1, 2], [3, 1], [1, 4]]
  },
  {
    name: 'LYRA::0x02',
    stars: [
      { x: 540, y: -440 },
      { x: 610, y: -390 },
      { x: 650, y: -310 },
      { x: 570, y: -290 },
      { x: 530, y: -370 }
    ],
    edges: [[0, 1], [1, 4], [1, 2], [2, 3], [3, 4]]
  },
  {
    name: 'CASSIOPEIA::0x03',
    stars: [
      { x: -690, y: 290 },
      { x: -610, y: 370 },
      { x: -540, y: 320 },
      { x: -470, y: 390 },
      { x: -390, y: 310 }
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]]
  },
  {
    name: 'ORION::0x04',
    stars: [
      { x: 520, y: 240 },
      { x: 640, y: 260 },
      { x: 565, y: 340 },
      { x: 590, y: 350 },
      { x: 615, y: 360 },
      { x: 535, y: 450 },
      { x: 650, y: 460 }
    ],
    edges: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 6]]
  },
  {
    name: 'OCTANS_GH::0x05',
    stars: [
      { x: 1750, y: -560 },
      { x: 1860, y: -490 },
      { x: 1940, y: -580 },
      { x: 1840, y: -380 }
    ],
    edges: [[0, 1], [1, 2], [1, 3]]
  },
  {
    name: 'VELA_GH::0x06',
    stars: [
      { x: 1720, y: 180 },
      { x: 1850, y: 240 },
      { x: 1960, y: 160 },
      { x: 1890, y: 70 },
      { x: 1760, y: 90 }
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]
  }
];

const bodies = [
  // ==========================================================================
  // ORBIT SYSTEM 01: SOL WORKSPACE CORE (0, 0)
  // ==========================================================================
  {
    id: 'core',
    name: 'sol',
    parentBodyId: null,
    fixedPos: true,
    styleType: 'sun',
    mass: 2600,
    radius: 30,
    orbitRadius: 0,
    orbitSpeed: 0,
    angle: 0,
    color: '#f59e0b',
    accent: '#ea580c',
    glow: 'rgba(245, 158, 11, 0.24)',
    repoMeta: {
      fullName: 'system::sol_core',
      branch: 'main',
      commits: '0xFFFF',
      stack: 'SOLAR_KERNEL',
      description: 'Primary gravitational star of the Auka Agent Workspace.'
    },
    ringVibration: 0,
    x: 0, y: 0
  },
  {
    id: 'ctf',
    name: 'ctf-vault',
    parentBodyId: 'core',
    styleType: 'cyber',
    mass: 950,
    radius: 19,
    orbitRadius: 170,
    orbitSpeed: 0.0035,
    angle: 0.8,
    color: '#38bdf8',
    accent: '#0284c7',
    glow: 'rgba(56, 189, 248, 0.22)',
    repoMeta: {
      fullName: 'sector::ctf-vault',
      branch: 'pwn/writeups',
      commits: '0x004A',
      stack: 'SEC_EXPLOIT',
      description: 'Cybersecurity writeups, binary exploitation & reverse engineering.'
    },
    ringVibration: 0,
    x: 0, y: 0
  },
  {
    id: 'kmutt',
    name: 'kmutt',
    parentBodyId: 'core',
    styleType: 'terran',
    mass: 1150,
    radius: 21,
    orbitRadius: 280,
    orbitSpeed: -0.0022,
    angle: 2.9,
    color: '#a78bfa',
    accent: '#34d399',
    glow: 'rgba(167, 139, 250, 0.22)',
    repoMeta: {
      fullName: 'sector::kmutt-se',
      branch: 'se/uml-arch',
      commits: '0x008C',
      stack: 'SYS_DESIGN',
      description: 'KMUTT Software Engineering coursework, UML/ERD schemas & systems.'
    },
    ringVibration: 0,
    x: 0, y: 0
  },
  {
    id: 'forge',
    name: 'blender',
    parentBodyId: 'core',
    styleType: 'forge',
    mass: 850,
    radius: 18,
    orbitRadius: 385,
    orbitSpeed: 0.0015,
    angle: 5.1,
    color: '#f472b6',
    accent: '#c084fc',
    glow: 'rgba(244, 114, 182, 0.22)',
    repoMeta: {
      fullName: 'sector::blender-forge',
      branch: 'mesh/ascii-3d',
      commits: '0x0031',
      stack: 'WIREFRAME_LAB',
      description: '3D modeling, wireframe shaders, and UI/UX visual experiments.'
    },
    ringVibration: 0,
    x: 0, y: 0
  },
  {
    id: 'rogue_init',
    name: '0xDEAD',
    parentBodyId: 'core',
    styleType: 'rogue',
    mass: 420,
    radius: 14,
    orbitRadius: 475,
    orbitSpeed: -0.0029,
    angle: 1.7,
    color: '#fb7185',
    accent: '#f59e0b',
    glow: 'rgba(251, 113, 133, 0.28)',
    repoMeta: {
      fullName: 'rogue::0xDEAD',
      branch: 'encrypted::flag',
      commits: '0xDEAD',
      stack: 'ROGUE_NODE',
      description: 'Encrypted rogue CTF target. Slingshot a probe to intercept.'
    },
    ringVibration: 0,
    x: 0, y: 0
  },

  // ==========================================================================
  // ORBIT SYSTEM 02: GITHUB ORBITAL HUB (@AUKABANANA) AT (1380, -160)
  // ==========================================================================
  {
    id: 'gh_core',
    name: 'gh::aukabanana',
    parentBodyId: null,
    fixedPos: true,
    styleType: 'gh_sun',
    mass: 2500,
    radius: 28,
    orbitRadius: 0,
    orbitSpeed: 0,
    angle: 0,
    color: '#34d399',
    accent: '#38bdf8',
    glow: 'rgba(52, 211, 153, 0.26)',
    repoMeta: {
      fullName: 'github.com/aukabanana',
      branch: 'LIVE_HUB',
      commits: 'PUBLIC_API',
      stack: 'GITHUB_STAR',
      description: 'Dedicated secondary orbital system hosting live @aukabanana GitHub repositories.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.github.x,
    y: ORBIT_SYSTEMS.github.y
  }
];

const probes = [
  {
    id: 'recon',
    short: 'recon',
    role: 'sec_ops // commits',
    statusText: '0x01 · ctf-vault',
    color: '#38bdf8',
    targetBodyId: 'ctf',
    orbitDist: 48,
    orbitAngle: 0,
    orbitAngularVel: 0.042,
    mode: 'ORBIT',
    x: 0, y: 0, vx: 0, vy: 0,
    trail: [],
    activeTask: null,
    scanProgress: 0
  },
  {
    id: 'blueprint',
    short: 'blueprint',
    role: 'file_tree // arch_map',
    statusText: '0x02 · kmutt',
    color: '#a78bfa',
    targetBodyId: 'kmutt',
    orbitDist: 54,
    orbitAngle: 2.1,
    orbitAngularVel: -0.036,
    mode: 'ORBIT',
    x: 0, y: 0, vx: 0, vy: 0,
    trail: [],
    activeTask: null,
    scanProgress: 0
  },
  {
    id: 'glyph',
    short: 'glyph',
    role: 'ascii_3d // mesh_sig',
    statusText: '0x03 · blender',
    color: '#f472b6',
    targetBodyId: 'forge',
    orbitDist: 46,
    orbitAngle: 4.0,
    orbitAngularVel: 0.048,
    mode: 'ORBIT',
    x: 0, y: 0, vx: 0, vy: 0,
    trail: [],
    activeTask: null,
    scanProgress: 0
  },
  {
    id: 'scribe',
    short: 'scribe',
    role: 'readme // gh_telemetry',
    statusText: 'sync :: gh_orbit',
    color: '#34d399',
    targetBodyId: 'gh_core',
    orbitDist: 62,
    orbitAngle: 1.57,
    orbitAngularVel: 0.032,
    mode: 'ORBIT',
    x: ORBIT_SYSTEMS.github.x,
    y: ORBIT_SYSTEMS.github.y,
    vx: 0, vy: 0,
    trail: [],
    activeTask: null,
    scanProgress: 0
  }
];

let selectedProbeId = 'recon';
let draggingProbe = null;
let dragStartScreen = { x: 0, y: 0 };
let dragMouseWorld = { x: 0, y: 0 };

const particles = [];
const laserPackets = [];
const comets = [];
const floatingTexts = [];
const PARTICLE_GLYPHS = ['0', '1', '*', '+', ':', '#', '@'];

function getParentStar(body) {
  if (!body || !body.parentBodyId) return bodies[0];
  return bodies.find(b => b.id === body.parentBodyId) || bodies[0];
}

function getClosestSystemCenter(wx, wy) {
  const ghStar = bodies.find(b => b.id === 'gh_core');
  const solStar = bodies[0];
  if (!ghStar) return solStar;
  const dSol = Math.hypot(wx - solStar.x, wy - solStar.y);
  const dGh = Math.hypot(wx - ghStar.x, wy - ghStar.y);
  return dGh < dSol ? ghStar : solStar;
}

function savePersistentState() {
  try {
    const customBodies = bodies.filter(b => b.isCustom);
    const payload = {
      config: {
        themeName: config.themeName,
        shaderMode: config.shaderMode,
        planetSpeedMult: config.planetSpeedMult,
        probeSpeedMult: config.probeSpeedMult,
        gravityMult: config.gravityMult,
        trailLength: config.trailLength,
        gridAlpha: config.gridAlpha,
        spriteScale: config.spriteScale,
        showLabels: config.showLabels,
        masterVolume: config.masterVolume,
        tuningKey: config.tuningKey,
        tuneSemitones: config.tuneSemitones,
        tuningPreset: config.tuningPreset,
        tuningHz: config.tuningHz
      },
      ctfFlagsCaptured,
      planetNotes,
      planetOrbitRadii,
      customBodies
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {}
}

function loadPersistentState() {
  // Record defaultOrbitRadius on initial bodies before applying overrides
  bodies.forEach(b => {
    if (typeof b.defaultOrbitRadius !== 'number') {
      b.defaultOrbitRadius = b.orbitRadius;
    }
  });

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.config) {
      Object.assign(config, data.config);
    }
    if (typeof data.ctfFlagsCaptured === 'number') {
      ctfFlagsCaptured = data.ctfFlagsCaptured;
    }
    if (data.planetNotes && typeof data.planetNotes === 'object') {
      planetNotes = data.planetNotes;
    }
    if (data.planetOrbitRadii && typeof data.planetOrbitRadii === 'object') {
      planetOrbitRadii = data.planetOrbitRadii;
    }
    if (Array.isArray(data.customBodies)) {
      data.customBodies.forEach(cb => {
        if (typeof cb.defaultOrbitRadius !== 'number') {
          cb.defaultOrbitRadius = cb.orbitRadius;
        }
        if (!bodies.some(b => b.id === cb.id)) {
          bodies.push(cb);
        }
      });
    }
    // Apply saved per-planet orbit radius overrides
    bodies.forEach(b => {
      if (!b.fixedPos && typeof planetOrbitRadii[b.id] === 'number') {
        b.orbitRadius = planetOrbitRadii[b.id];
      }
    });
  } catch (e) {}
}

function addPlanetNote(planetName, text, agentShort) {
  const key = planetName.toLowerCase();
  if (!planetNotes[key]) planetNotes[key] = [];
  planetNotes[key].unshift({
    text,
    agent: agentShort,
    ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  if (planetNotes[key].length > 12) planetNotes[key].pop();
  savePersistentState();
}

function getPlanetNotes(planetName) {
  return planetNotes[planetName.toLowerCase()] || [];
}
