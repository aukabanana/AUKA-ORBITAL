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
  },
  solar: {
    id: 'solar_core',
    key: 'solar',
    label: '03::SOLAR_SYS',
    x: 3150,
    y: -160
  }
};

const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
let solarSimTimeMs = Date.now();

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
  solarTimeScale: 'day', // 'real' (1:1 UTC) | 'hour' (1h/s) | 'day' (1d/s) | 'month' (30d/s)
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
  activeSystem: 'sol' // 'sol' | 'github' | 'solar'
};

let simTime = 0;
let spawnWorldCoords = null;
let zenMode = false;
let showAsciiHud = true;
let hoveredBody = null;
let hoveredBeacon = null; // 'sol' | 'github' | 'solar' | null
let mouseWorld = { x: 9999, y: 9999 };
let prevMouseRadiusFromCenter = null;
let ctfFlagsCaptured = 0;
let planetNotes = {}; // { [bodyNameOrId]: [{ text, ts, agent }] }
let planetOrbitRadii = {}; // { [bodyId]: number }
let radiusFilterMode = 'sol'; // 'sol' | 'github' | 'solar'

const STAR_GLYPHS = ['.', '·', ':', '+', '*', '0', '1'];
const bgStars = Array.from({ length: 520 }, (_, idx) => ({
  x: -1600 + Math.random() * 6600,
  y: (Math.random() - 0.5) * 3200,
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
  },
  {
    name: 'TAURUS_SOL::0x07',
    stars: [
      { x: 3820, y: -640 },
      { x: 3940, y: -560 },
      { x: 4060, y: -630 },
      { x: 3940, y: -440 },
      { x: 4040, y: -350 }
    ],
    edges: [[0, 1], [1, 2], [1, 3], [3, 4]]
  },
  {
    name: 'SCORPIUS_SOL::0x08',
    stars: [
      { x: 3780, y: 310 },
      { x: 3890, y: 370 },
      { x: 4010, y: 420 },
      { x: 4110, y: 360 },
      { x: 4150, y: 260 }
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]]
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
  },

  // ==========================================================================
  // ORBIT SYSTEM 03: REAL SOLAR SYSTEM (J2000 EPHEMERIS + PLANETARY MOONS)
  // ==========================================================================
  {
    id: 'solar_core',
    name: 'helios::sun',
    parentBodyId: null,
    fixedPos: true,
    isRealSolar: true,
    styleType: 'sun',
    mass: 3200,
    radius: 34,
    orbitRadius: 0,
    orbitSpeed: 0,
    angle: 0,
    color: '#fbbf24',
    accent: '#ea580c',
    glow: 'rgba(251, 191, 36, 0.28)',
    repoMeta: {
      fullName: 'sol::G2V_MAIN_SEQUENCE',
      branch: 'J2000_EPHEMERIS',
      commits: '4.6B_YRS',
      stack: 'SOLAR_STAR',
      description: 'Central G-type main-sequence star of the Real Solar System (8 planets, 14 moons).'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  // 1. MERCURY (87.969 days)
  {
    id: 'sol_mercury',
    name: 'mercury',
    parentBodyId: 'solar_core',
    isRealSolar: true,
    orbitalPeriodDays: 87.969,
    j2000LonDeg: 252.25,
    auDist: '0.39 AU',
    styleType: 'terran',
    mass: 520,
    radius: 10,
    orbitRadius: 115,
    orbitSpeed: 0.008,
    angle: 0,
    color: '#94a3b8',
    accent: '#64748b',
    glow: 'rgba(148, 163, 184, 0.20)',
    repoMeta: {
      fullName: 'sol::01_MERCURY',
      branch: '0.39_AU',
      commits: '87.97d',
      stack: 'TERRESTRIAL // 0_MOONS',
      description: 'Innermost rocky planet. Fastest orbital velocity (47.4 km/s), extreme thermal delta.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  // 2. VENUS (224.701 days)
  {
    id: 'sol_venus',
    name: 'venus',
    parentBodyId: 'solar_core',
    isRealSolar: true,
    orbitalPeriodDays: 224.701,
    j2000LonDeg: 181.98,
    auDist: '0.72 AU',
    styleType: 'terran',
    mass: 820,
    radius: 14,
    orbitRadius: 175,
    orbitSpeed: 0.005,
    angle: 0,
    color: '#fde047',
    accent: '#ca8a04',
    glow: 'rgba(253, 224, 71, 0.22)',
    repoMeta: {
      fullName: 'sol::02_VENUS',
      branch: '0.72_AU',
      commits: '224.70d',
      stack: 'TERRESTRIAL // 0_MOONS',
      description: 'Dense CO2 super-greenhouse atmosphere with retrograde axial rotation.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  // 3. EARTH (365.256 days) + LUNA
  {
    id: 'sol_earth',
    name: 'earth',
    parentBodyId: 'solar_core',
    isRealSolar: true,
    orbitalPeriodDays: 365.256,
    j2000LonDeg: 100.46,
    auDist: '1.00 AU',
    styleType: 'terran',
    mass: 980,
    radius: 15,
    orbitRadius: 255,
    orbitSpeed: 0.003,
    angle: 0,
    color: '#38bdf8',
    accent: '#22c55e',
    glow: 'rgba(56, 189, 248, 0.24)',
    repoMeta: {
      fullName: 'sol::03_TERRA_EARTH',
      branch: '1.00_AU',
      commits: '365.26d',
      stack: 'BIOSPHERE // 1_MOON',
      description: 'Homeworld (1.00 AU). Liquid water ocean world orbited by Luna (27.32d).'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_luna',
    name: 'luna',
    parentBodyId: 'sol_earth',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 27.322,
    j2000LonDeg: 218.32,
    styleType: 'moon',
    mass: 180,
    radius: 5,
    orbitRadius: 34,
    orbitSpeed: 0.035,
    angle: 0.4,
    color: '#e2e8f0',
    accent: '#94a3b8',
    glow: 'rgba(226, 232, 240, 0.18)',
    repoMeta: {
      fullName: 'moon::earth/luna',
      branch: '384,400_KM',
      commits: '27.32d',
      stack: 'TIDALLY_LOCKED_MOON',
      description: 'Earth natural satellite. Tidally locked synchronous rotation (27.32 days).'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  // 4. MARS (686.980 days) + PHOBOS & DEIMOS
  {
    id: 'sol_mars',
    name: 'mars',
    parentBodyId: 'solar_core',
    isRealSolar: true,
    orbitalPeriodDays: 686.980,
    j2000LonDeg: 355.45,
    auDist: '1.52 AU',
    styleType: 'terran',
    mass: 740,
    radius: 12,
    orbitRadius: 345,
    orbitSpeed: 0.002,
    angle: 0,
    color: '#f97316',
    accent: '#dc2626',
    glow: 'rgba(249, 115, 22, 0.22)',
    repoMeta: {
      fullName: 'sol::04_MARS',
      branch: '1.52_AU',
      commits: '686.98d',
      stack: 'IRON_OXIDE // 2_MOONS',
      description: 'The Red Planet. Home to Olympus Mons, Valles Marineris, and moons Phobos & Deimos.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_phobos',
    name: 'phobos',
    parentBodyId: 'sol_mars',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 0.319,
    j2000LonDeg: 45.0,
    styleType: 'moon',
    mass: 110,
    radius: 4,
    orbitRadius: 24,
    orbitSpeed: 0.08,
    angle: 1.1,
    color: '#fdba74',
    accent: '#ea580c',
    glow: 'rgba(253, 186, 116, 0.16)',
    repoMeta: {
      fullName: 'moon::mars/phobos',
      branch: '9,376_KM',
      commits: '7.65h',
      stack: 'INNER_MARS_MOON',
      description: 'Inner moon of Mars. Orbits faster than Mars rotates (period: 7.65 hours).'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_deimos',
    name: 'deimos',
    parentBodyId: 'sol_mars',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 1.263,
    j2000LonDeg: 195.0,
    styleType: 'moon',
    mass: 100,
    radius: 4,
    orbitRadius: 36,
    orbitSpeed: 0.045,
    angle: 3.8,
    color: '#cbd5e1',
    accent: '#94a3b8',
    glow: 'rgba(203, 213, 225, 0.16)',
    repoMeta: {
      fullName: 'moon::mars/deimos',
      branch: '23,463_KM',
      commits: '30.31h',
      stack: 'OUTER_MARS_MOON',
      description: 'Outer captured asteroid-like moon of Mars (period: 1.26 days).'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  // 5. JUPITER (4332.589 days) + IO, EUROPA, GANYMEDE, CALLISTO
  {
    id: 'sol_jupiter',
    name: 'jupiter',
    parentBodyId: 'solar_core',
    isRealSolar: true,
    orbitalPeriodDays: 4332.589,
    j2000LonDeg: 34.40,
    auDist: '5.20 AU',
    styleType: 'gas_giant',
    mass: 2100,
    radius: 25,
    orbitRadius: 475,
    orbitSpeed: 0.0008,
    angle: 0,
    color: '#fb923c',
    accent: '#fde68a',
    glow: 'rgba(251, 146, 60, 0.25)',
    repoMeta: {
      fullName: 'sol::05_JUPITER',
      branch: '5.20_AU',
      commits: '11.86_YRS',
      stack: 'GAS_GIANT // 4_GALILEAN',
      description: 'Largest planet in the Solar System (318 Earth masses). Hosts the 4 Galilean moons.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_io',
    name: 'io',
    parentBodyId: 'sol_jupiter',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 1.769,
    j2000LonDeg: 106.0,
    styleType: 'moon',
    mass: 160,
    radius: 5,
    orbitRadius: 38,
    orbitSpeed: 0.06,
    angle: 0.5,
    color: '#facc15',
    accent: '#ca8a04',
    glow: 'rgba(250, 204, 21, 0.18)',
    repoMeta: {
      fullName: 'moon::jupiter/io',
      branch: '421,700_KM',
      commits: '1.77d',
      stack: 'GALILEAN_VOLCANIC',
      description: 'Innermost Galilean moon. Most geologically active volcanic body in the Solar System.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_europa',
    name: 'europa',
    parentBodyId: 'sol_jupiter',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 3.551,
    j2000LonDeg: 175.0,
    styleType: 'moon',
    mass: 155,
    radius: 5,
    orbitRadius: 50,
    orbitSpeed: 0.042,
    angle: 2.1,
    color: '#7dd3fc',
    accent: '#0284c7',
    glow: 'rgba(125, 211, 252, 0.18)',
    repoMeta: {
      fullName: 'moon::jupiter/europa',
      branch: '670,900_KM',
      commits: '3.55d',
      stack: 'SUBSURFACE_OCEAN',
      description: 'Galilean ice moon harboring a vast subsurface saltwater ocean beneath its crust.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_ganymede',
    name: 'ganymede',
    parentBodyId: 'sol_jupiter',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 7.155,
    j2000LonDeg: 120.0,
    styleType: 'moon',
    mass: 210,
    radius: 6,
    orbitRadius: 64,
    orbitSpeed: 0.028,
    angle: 4.0,
    color: '#cbd5e1',
    accent: '#64748b',
    glow: 'rgba(203, 213, 225, 0.18)',
    repoMeta: {
      fullName: 'moon::jupiter/ganymede',
      branch: '1,070,400_KM',
      commits: '7.15d',
      stack: 'MAGNETOSPHERE_MOON',
      description: 'Largest moon in the Solar System (larger than Mercury) with its own magnetic field.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_callisto',
    name: 'callisto',
    parentBodyId: 'sol_jupiter',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 16.689,
    j2000LonDeg: 260.0,
    styleType: 'moon',
    mass: 190,
    radius: 5,
    orbitRadius: 78,
    orbitSpeed: 0.018,
    angle: 5.5,
    color: '#a8a29e',
    accent: '#57534e',
    glow: 'rgba(168, 162, 158, 0.16)',
    repoMeta: {
      fullName: 'moon::jupiter/callisto',
      branch: '1,882,700_KM',
      commits: '16.69d',
      stack: 'OUTER_GALILEAN',
      description: 'Outermost Galilean moon with an ancient, heavily cratered icy lithosphere.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  // 6. SATURN (10759.22 days) + ENCELADUS, RHEA, TITAN
  {
    id: 'sol_saturn',
    name: 'saturn',
    parentBodyId: 'solar_core',
    isRealSolar: true,
    orbitalPeriodDays: 10759.22,
    j2000LonDeg: 49.94,
    auDist: '9.58 AU',
    styleType: 'forge',
    mass: 1750,
    radius: 22,
    orbitRadius: 635,
    orbitSpeed: 0.0004,
    angle: 0,
    color: '#fcd34d',
    accent: '#d97706',
    glow: 'rgba(252, 211, 77, 0.24)',
    repoMeta: {
      fullName: 'sol::06_SATURN',
      branch: '9.58_AU',
      commits: '29.46_YRS',
      stack: 'RINGED_GIANT // 3_MOONS',
      description: 'Ringed gas giant with prominent icy ring system, orbited by Enceladus, Rhea & Titan.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_enceladus',
    name: 'enceladus',
    parentBodyId: 'sol_saturn',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 1.370,
    j2000LonDeg: 88.0,
    styleType: 'moon',
    mass: 120,
    radius: 4,
    orbitRadius: 42,
    orbitSpeed: 0.055,
    angle: 1.2,
    color: '#e0f2fe',
    accent: '#38bdf8',
    glow: 'rgba(224, 242, 254, 0.18)',
    repoMeta: {
      fullName: 'moon::saturn/enceladus',
      branch: '238,000_KM',
      commits: '1.37d',
      stack: 'CRYOVOLCANIC_PLUMES',
      description: 'High-albedo icy moon of Saturn ejecting water-ice geysers into the E-ring.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_rhea',
    name: 'rhea',
    parentBodyId: 'sol_saturn',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 4.518,
    j2000LonDeg: 164.0,
    styleType: 'moon',
    mass: 140,
    radius: 5,
    orbitRadius: 55,
    orbitSpeed: 0.036,
    angle: 3.1,
    color: '#cbd5e1',
    accent: '#94a3b8',
    glow: 'rgba(203, 213, 225, 0.16)',
    repoMeta: {
      fullName: 'moon::saturn/rhea',
      branch: '527,108_KM',
      commits: '4.52d',
      stack: 'ICY_SATELLITE',
      description: 'Second-largest moon of Saturn with a low-density water-ice core.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_titan',
    name: 'titan',
    parentBodyId: 'sol_saturn',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 15.945,
    j2000LonDeg: 290.0,
    styleType: 'moon',
    mass: 205,
    radius: 6,
    orbitRadius: 70,
    orbitSpeed: 0.022,
    angle: 5.0,
    color: '#fbbf24',
    accent: '#d97706',
    glow: 'rgba(251, 191, 36, 0.20)',
    repoMeta: {
      fullName: 'moon::saturn/titan',
      branch: '1,221,870_KM',
      commits: '15.95d',
      stack: 'HYDROCARBON_ATMOS',
      description: 'Largest moon of Saturn. Dense nitrogen-methane atmosphere and liquid methane seas.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  // 7. URANUS (30685.4 days) + MIRANDA & TITANIA
  {
    id: 'sol_uranus',
    name: 'uranus',
    parentBodyId: 'solar_core',
    isRealSolar: true,
    orbitalPeriodDays: 30685.4,
    j2000LonDeg: 313.23,
    auDist: '19.20 AU',
    styleType: 'cyber',
    mass: 1350,
    radius: 18,
    orbitRadius: 780,
    orbitSpeed: 0.0002,
    angle: 0,
    color: '#67e8f9',
    accent: '#06b6d4',
    glow: 'rgba(103, 232, 249, 0.22)',
    repoMeta: {
      fullName: 'sol::07_URANUS',
      branch: '19.20_AU',
      commits: '84.01_YRS',
      stack: 'ICE_GIANT // 2_MOONS',
      description: 'Ice giant with an extreme 97.77-degree axial tilt, orbited by Miranda & Titania.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_miranda',
    name: 'miranda',
    parentBodyId: 'sol_uranus',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 1.413,
    j2000LonDeg: 65.0,
    styleType: 'moon',
    mass: 115,
    radius: 4,
    orbitRadius: 34,
    orbitSpeed: 0.05,
    angle: 1.8,
    color: '#bae6fd',
    accent: '#0284c7',
    glow: 'rgba(186, 230, 253, 0.16)',
    repoMeta: {
      fullName: 'moon::uranus/miranda',
      branch: '129,390_KM',
      commits: '1.41d',
      stack: 'VERONA_RUPES',
      description: 'Inner Uranian moon featuring Verona Rupes, the tallest known cliff in the Solar System.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_titania',
    name: 'titania',
    parentBodyId: 'sol_uranus',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 8.706,
    j2000LonDeg: 210.0,
    styleType: 'moon',
    mass: 150,
    radius: 5,
    orbitRadius: 48,
    orbitSpeed: 0.026,
    angle: 4.3,
    color: '#e2e8f0',
    accent: '#67e8f9',
    glow: 'rgba(226, 232, 240, 0.18)',
    repoMeta: {
      fullName: 'moon::uranus/titania',
      branch: '435,910_KM',
      commits: '8.71d',
      stack: 'URANIAN_TITAN',
      description: 'Largest moon of Uranus, scarred by massive fault canyons and icy rifts.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  // 8. NEPTUNE (60189.0 days) + PROTEUS & TRITON (Retrograde)
  {
    id: 'sol_neptune',
    name: 'neptune',
    parentBodyId: 'solar_core',
    isRealSolar: true,
    orbitalPeriodDays: 60189.0,
    j2000LonDeg: 304.88,
    auDist: '30.05 AU',
    styleType: 'terran',
    mass: 1400,
    radius: 17,
    orbitRadius: 910,
    orbitSpeed: 0.0001,
    angle: 0,
    color: '#60a5fa',
    accent: '#2563eb',
    glow: 'rgba(96, 165, 250, 0.24)',
    repoMeta: {
      fullName: 'sol::08_NEPTUNE',
      branch: '30.05_AU',
      commits: '164.79_YRS',
      stack: 'SUPERSONIC_ICE_GIANT',
      description: 'Outermost major planet (30.05 AU) with supersonic methane winds, Proteus & Triton.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_proteus',
    name: 'proteus',
    parentBodyId: 'sol_neptune',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: 1.122,
    j2000LonDeg: 140.0,
    styleType: 'moon',
    mass: 110,
    radius: 4,
    orbitRadius: 32,
    orbitSpeed: 0.052,
    angle: 0.9,
    color: '#94a3b8',
    accent: '#475569',
    glow: 'rgba(148, 163, 184, 0.16)',
    repoMeta: {
      fullName: 'moon::neptune/proteus',
      branch: '117,647_KM',
      commits: '1.12d',
      stack: 'INNER_NEPTUNE_MOON',
      description: 'Second-largest Neptunian moon, box-like polyhedral body near the limit of hydrostatic equilibrium.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
  },
  {
    id: 'moon_triton',
    name: 'triton',
    parentBodyId: 'sol_neptune',
    isRealSolar: true,
    isMoon: true,
    orbitalPeriodDays: -5.877, // Retrograde orbit!
    j2000LonDeg: 280.0,
    styleType: 'moon',
    mass: 175,
    radius: 5,
    orbitRadius: 46,
    orbitSpeed: -0.032,
    angle: 3.6,
    color: '#f472b6',
    accent: '#db2777',
    glow: 'rgba(244, 114, 182, 0.18)',
    repoMeta: {
      fullName: 'moon::neptune/triton',
      branch: '354,759_KM',
      commits: '-5.88d_RETRO',
      stack: 'RETROGRADE_KUIPER',
      description: 'Largest moon of Neptune. Orbits in retrograde (-5.88d) with nitrogen geysers.'
    },
    ringVibration: 0,
    x: ORBIT_SYSTEMS.solar.x,
    y: ORBIT_SYSTEMS.solar.y
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

function getRootStar(body) {
  let curr = body;
  let guard = 0;
  while (curr && curr.parentBodyId && guard < 6) {
    const next = bodies.find(b => b.id === curr.parentBodyId);
    if (!next) break;
    curr = next;
    guard++;
  }
  return curr || bodies[0];
}

function getSystemKeyForBody(body) {
  const root = getRootStar(body);
  if (!root) return 'sol';
  if (root.id === 'gh_core') return 'github';
  if (root.id === 'solar_core') return 'solar';
  return 'sol';
}

function getClosestSystemCenter(wx, wy) {
  const solStar = bodies[0];
  const ghStar = bodies.find(b => b.id === 'gh_core');
  const solarStar = bodies.find(b => b.id === 'solar_core');
  let best = solStar;
  let bestDist = Math.hypot(wx - solStar.x, wy - solStar.y);

  if (ghStar) {
    const dGh = Math.hypot(wx - ghStar.x, wy - ghStar.y);
    if (dGh < bestDist) {
      bestDist = dGh;
      best = ghStar;
    }
  }
  if (solarStar) {
    const dSolar = Math.hypot(wx - solarStar.x, wy - solarStar.y);
    if (dSolar < bestDist) {
      bestDist = dSolar;
      best = solarStar;
    }
  }
  return best;
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
        tuningHz: config.tuningHz,
        solarTimeScale: config.solarTimeScale
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
