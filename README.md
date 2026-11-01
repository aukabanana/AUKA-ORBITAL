# AUKA // ORBITAL ASCII & BINARY TELEMETRY (Draft 2)

Modular Hybrid Command Deck + Live `@aukabanana` GitHub Explorer + Realistic Solar System & Planetary Moons rendered in 100% ASCII & Binary Art.

## Orbit Systems
- **System 01 (`[01::sol]`)**: Sol Workspace Core with primary gravity well, CTF exploitation nodes, and software engineering coursework sectors.
- **System 02 (`[02::gh]`)**: Live GitHub Orbital Hub mapped to real `@aukabanana` repositories via the GitHub REST API.
- **System 03 (`[03::solar]`)**: Real Solar System with central Sun (`Helios`), all 8 major planets (Mercury to Neptune), 14 natural satellites/moons, and J2000 Ephemeris orbits in realistic time (`1:1 UTC`, `1h/s`, `1d/s`, `30d/s`).

## Project Architecture
- `index.html` — Entry point and structural HUD layout (zero emojis/icons, works directly via `file://` double-click or local server).
- `css/style.css` — Structural monospace styling, hairline borders, and slider controls.
- `js/state.js` — Global simulation state, camera lock/pan state, and `localStorage` persistence (`auka_orbital_draft2_state_v1`).
- `js/audio.js` — Web Audio API synthesizer with master volume gain, key tuning (`C`, `D`, `E`, `F`, `G`, `A`, `B`), pitch transpose (`-12` to `+12` st), guitar string presets (`std_e`, `drop_d`, `dadgad`, `pentatonic`), and 440Hz/432Hz cosmic tuning.
- `js/github.js` — Live GitHub API synchronization (`https://api.github.com/users/aukabanana/repos`) + real probe repo inspection (`/contents` file trees, `/commits`, `/readme`) and persistent per-planet task notes.
- `js/physics.js` — N-body gravity, Keplerian orbital mechanics, wormhole teleportation, and `[0xDEAD]` rogue CTF satellite interception.
- `js/renderer.js` — Pure ASCII & Binary Art renderer (celestial spheres, tilted planetary rings, 3D rotating wireframe globe on hover, deep-space constellations, and binary comets).
- `js/main.js` — Input controller (slingshot, camera pan, `Space` orbital lock, inline spawn naming, `Tab` config) and main loop.

## Controls & Features
- **Drag a Probe (`[recon]`, `[blueprint]`, `[glyph]`, `[scribe]`)**: Slingshot across gravity wells.
- **Drag Empty Space**: Pan the camera freely across the solar system.
- **Press `Space`**: Lock the camera onto the hovered planet or active probe (press `Space` or `Esc` to unlock back to `[sol]`).
- **Press `m` / `Tab`**: `m` toggles audio mute/unmute; `-` / `+` adjusts master volume; `Tab` opens the parameters inspector to adjust volume, tune keys, transpositions, and scales.
- **Hover Any Planet**: Projects a rotating 3D ASCII wireframe globe + live GitHub telemetry and saved note count.
- **Command Input Bar**:
  - Dispatch `[blueprint]` with `tree` to fetch the live GitHub file tree of the orbited repo.
  - Dispatch `[recon]` with `commits` to fetch recent GitHub commits.
  - Dispatch `[scribe]` with `readme` to fetch a live README excerpt, or type any task note to persist it onto that planet in `localStorage`.
- **Double-Click Empty Space**: Type an optional custom sector name and spawn a Kepler-orbiting `[+ singularity]`, `[+ wormhole]`, `[+ planet]`, or `[+ 0xDEAD]` satellite (auto-saved in `localStorage`).
