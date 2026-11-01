// ============================================================================
// AUKA // ORBITAL ASCII & BINARY TELEMETRY (Draft 2) — Live GitHub Orbit Sync
// ============================================================================

const GITHUB_USER = 'aukabanana';
const GITHUB_CACHE_KEY = 'auka_orbital_gh_repos_v2';
const LANG_PALETTES = {
  TypeScript: { color: '#38bdf8', accent: '#0284c7', styleType: 'cyber' },
  JavaScript: { color: '#fde047', accent: '#f59e0b', styleType: 'cyber' },
  Python:     { color: '#34d399', accent: '#059669', styleType: 'terran' },
  HTML:       { color: '#f472b6', accent: '#c084fc', styleType: 'forge' },
  CSS:        { color: '#a78bfa', accent: '#6366f1', styleType: 'terran' },
  Java:       { color: '#fb923c', accent: '#ea580c', styleType: 'forge' },
  Lua:        { color: '#60a5fa', accent: '#3b82f6', styleType: 'cyber' }
};

const FALLBACK_GH_REPOS = [
  {
    id: 'fb_1',
    name: 'aukabanana',
    full_name: 'aukabanana/aukabanana',
    default_branch: 'main',
    stargazers_count: 1,
    size: 128,
    language: 'Markdown',
    description: 'Profile README & personal telemetry configuration.'
  },
  {
    id: 'fb_2',
    name: 'portfolio-v2',
    full_name: 'aukabanana/portfolio-v2',
    default_branch: 'main',
    stargazers_count: 2,
    size: 640,
    language: 'TypeScript',
    description: 'Interactive developer portfolio & creative frontend experiments.'
  },
  {
    id: 'fb_3',
    name: 'ctf-toolkit',
    full_name: 'aukabanana/ctf-toolkit',
    default_branch: 'main',
    stargazers_count: 3,
    size: 410,
    language: 'Python',
    description: 'Scripts and utilities for CTF challenges and binary analysis.'
  },
  {
    id: 'fb_4',
    name: 'kmutt-projects',
    full_name: 'aukabanana/kmutt-projects',
    default_branch: 'main',
    stargazers_count: 1,
    size: 820,
    language: 'Java',
    description: 'Software engineering & computer science labs at KMUTT.'
  }
];

function populateGitHubOrbitBodies(repos) {
  const ghCenter = bodies.find(b => b.id === 'gh_core') || ORBIT_SYSTEMS.github;
  const baseOrbit = 145;

  repos.slice(0, 6).forEach((repo, idx) => {
    const bodyId = 'gh_' + repo.id;
    if (bodies.some(b => b.id === bodyId)) return;

    const pal = LANG_PALETTES[repo.language] || {
      color: ['#34d399', '#38bdf8', '#a78bfa', '#f472b6'][idx % 4],
      accent: '#0284c7',
      styleType: idx % 2 === 0 ? 'cyber' : 'terran'
    };

    const meta = {
      fullName: repo.full_name || `${GITHUB_USER}/${repo.name}`,
      branch: repo.default_branch || 'main',
      commits: `★${repo.stargazers_count || 0} · ${repo.size || 0}KB`,
      stack: (repo.language || 'MULTI_STACK').toUpperCase(),
      description: repo.description || 'Live @aukabanana GitHub repository in Orbit 02.',
      htmlUrl: repo.html_url
    };

    const defaultR = baseOrbit + idx * 66;
    const savedR = (typeof planetOrbitRadii !== 'undefined' && typeof planetOrbitRadii[bodyId] === 'number')
      ? planetOrbitRadii[bodyId]
      : defaultR;
    const keplerSpeed = ((idx % 2 === 0 ? 1 : -1) * (1 / Math.sqrt(savedR))) * 0.044;
    const startAngle = (idx * 1.25) % (Math.PI * 2);

    bodies.push({
      id: bodyId,
      name: repo.name.slice(0, 16),
      parentBodyId: 'gh_core',
      styleType: pal.styleType,
      mass: Math.min(1500, Math.max(850, 900 + (repo.size || 50))),
      radius: Math.min(22, Math.max(16, 16 + Math.floor(Math.log10((repo.size || 10) + 10) * 2))),
      orbitRadius: savedR,
      defaultOrbitRadius: defaultR,
      orbitSpeed: keplerSpeed,
      angle: startAngle,
      color: pal.color,
      accent: pal.accent,
      glow: 'rgba(52, 211, 153, 0.22)',
      repoMeta: meta,
      ringVibration: 0,
      x: ghCenter.x + Math.cos(startAngle) * savedR,
      y: ghCenter.y + Math.sin(startAngle) * savedR
    });
  });

  if (typeof renderPlanetRadiusSliders === 'function') {
    renderPlanetRadiusSliders();
  }

  // Assign the [scribe] probe to orbit the first GitHub repo in Orbit 02
  const firstGhRepo = bodies.find(b => b.parentBodyId === 'gh_core');
  const scribeProbe = probes.find(p => p.id === 'scribe');
  if (firstGhRepo && scribeProbe && scribeProbe.targetBodyId === 'gh_core') {
    scribeProbe.targetBodyId = firstGhRepo.id;
    scribeProbe.statusText = `gh :: ${firstGhRepo.name}`;
  }
}

async function syncGitHubRepos() {
  const statusEl = document.getElementById('ghSyncStatus');
  try {
    let repos = null;
    const cachedRaw = sessionStorage.getItem(GITHUB_CACHE_KEY);
    if (cachedRaw) {
      repos = JSON.parse(cachedRaw);
    } else {
      const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=8`);
      if (res.ok) {
        repos = await res.json();
        sessionStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify(repos));
      }
    }

    if (!Array.isArray(repos) || repos.length === 0) {
      populateGitHubOrbitBodies(FALLBACK_GH_REPOS);
      if (statusEl) statusEl.textContent = '[GH::ORBIT_02_READY]';
      return;
    }

    populateGitHubOrbitBodies(repos);

    if (statusEl) {
      statusEl.textContent = `[GH::@${GITHUB_USER.toUpperCase()}_ORBIT_02]`;
      statusEl.className = 'text-emerald-400/90';
    }
  } catch (err) {
    populateGitHubOrbitBodies(FALLBACK_GH_REPOS);
    if (statusEl) statusEl.textContent = '[GH::ORBIT_02_SIM]';
  }
}

async function buildLiveProbeDeliverable(probe, planet, taskText) {
  const lower = taskText.toLowerCase();
  const isPureCommand = ['scan', 'inspect', 'tree', 'readme', 'commits', 'status'].includes(lower);
  if (taskText && !isPureCommand) {
    addPlanetNote(planet.name, taskText, probe.short);
  }

  const meta = planet.repoMeta || {
    fullName: `aukabanana/${planet.name}`,
    branch: 'main',
    commits: '0x001F',
    stack: 'CUSTOM_NODE',
    description: 'User-spawned orbital sector.'
  };

  let liveSection = '';

  // Attempt live GitHub API lookup if this planet maps to a real repo in GH_ORBIT
  if (meta.fullName && meta.fullName.startsWith('aukabanana/')) {
    try {
      if (probe.id === 'blueprint' || lower.includes('tree') || lower.includes('file')) {
        const res = await fetch(`https://api.github.com/repos/${meta.fullName}/contents`);
        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items)) {
            const treeLines = items.slice(0, 10).map((it, i) => {
              const prefix = i === Math.min(9, items.length - 1) ? '└──' : '├──';
              const tag = it.type === 'dir' ? '[DIR] ' : '[FILE]';
              return `  ${prefix} ${tag} ${it.name}`;
            });
            liveSection = [
              `  :: LIVE_REPO_TREE (${meta.fullName})`,
              ...treeLines
            ].join('\n');
          }
        }
      } else if (probe.id === 'recon' || lower.includes('commit') || lower.includes('audit')) {
        const res = await fetch(`https://api.github.com/repos/${meta.fullName}/commits?per_page=4`);
        if (res.ok) {
          const commits = await res.json();
          if (Array.isArray(commits)) {
            const cLines = commits.map(c => {
              const sha = (c.sha || '').slice(0, 7);
              const msg = ((c.commit && c.commit.message) || '').split('\n')[0].slice(0, 42);
              return `  [${sha}] ${msg}`;
            });
            liveSection = [
              `  :: RECENT_COMMITS (${meta.fullName})`,
              ...cLines
            ].join('\n');
          }
        }
      } else if (probe.id === 'scribe' || lower.includes('readme')) {
        const res = await fetch(`https://api.github.com/repos/${meta.fullName}/readme`, {
          headers: { Accept: 'application/vnd.github.v3.raw' }
        });
        if (res.ok) {
          const text = await res.text();
          const clean = text.replace(/<[^>]+>/g, '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 6);
          liveSection = [
            `  :: LIVE_README_EXCERPT (${meta.fullName})`,
            ...clean.map(l => `  > ${l.slice(0, 54)}`)
          ].join('\n');
        }
      }
    } catch (e) {}
  }

  if (!liveSection) {
    if (probe.id === 'blueprint' || lower.includes('diagram') || lower.includes('erd')) {
      liveSection = [
        `  [auka] ----( "${taskText.slice(0, 26)}" )----> [${probe.short}]`,
        `                                            |`,
        `                                      scan_sector()`,
        `                                            v`,
        `  [auka] <---( 0110_ASCII_SCHEMA )---- [${planet.name}]`
      ].join('\n');
    } else {
      liveSection = [
        `  SECTOR  :: ${meta.fullName} (${meta.branch})`,
        `  STACK   :: ${meta.stack} // ${meta.commits}`,
        `  SUMMARY :: ${meta.description}`
      ].join('\n');
    }
  }

  const notes = getPlanetNotes(planet.name);
  const notesBlock = notes.length > 0
    ? [
        ``,
        `  :: PERSISTENT_SECTOR_NOTES [${notes.length}]`,
        ...notes.slice(0, 4).map(n => `  * [${n.ts}][${n.agent}] ${n.text}`)
      ].join('\n')
    : '';

  return [
    `+-------------------------------------------------------+`,
    `|  [0110] ${probe.short.toUpperCase()}_TELEMETRY // ${planet.name.toUpperCase().padEnd(26, ' ')} |`,
    `+-------------------------------------------------------+`,
    liveSection,
    notesBlock
  ].filter(Boolean).join('\n');
}
