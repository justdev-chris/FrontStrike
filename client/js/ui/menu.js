import * as net from '../core/net.js';
import * as renderer from '../core/renderer.js';

let els = {};
let callbacks = {};
let maps = [];
let myVoteMode = null;
let myVoteMap = null;
let pausedVisible = false;

const MODES = ['dm', 'tdm', 'gungame', 'ctf'];
const MODE_LABELS = {
  dm: 'DM',
  tdm: 'TDM',
  gungame: 'GUN GAME',
  ctf: 'CTF',
};

const settings = {
  sensitivity: 2.2,
  fov: 80,
};

export function init(cbs) {
  callbacks = cbs;

  els = {
    menu:          document.getElementById('menu'),
    vote:          document.getElementById('vote'),
    paused:        document.getElementById('paused'),
    namePrompt:    document.getElementById('namePrompt'),
    settingsPanel: document.getElementById('settingsPanel'),

    playBtn:       document.getElementById('playBtn'),
    settingsBtn:   document.getElementById('settingsBtn'),
    nameInput:     document.getElementById('nameInput'),
    nameConfirm:   document.getElementById('nameConfirm'),
    nameCancel:    document.getElementById('nameCancel'),
    settingsClose: document.getElementById('settingsClose'),
    resumeBtn:     document.getElementById('resumeBtn'),

    menuMode:      document.getElementById('menuMode'),
    menuMap:       document.getElementById('menuMap'),
    menuCount:     document.getElementById('menuCount'),
    menuPlayers:   document.getElementById('menuPlayers'),

    sensSlider:    document.getElementById('sensSlider'),
    sensValue:     document.getElementById('sensValue'),
    fovSlider:     document.getElementById('fovSlider'),
    fovValue:      document.getElementById('fovValue'),

    modeVote:      document.getElementById('modeVote'),
    mapVote:       document.getElementById('mapVote'),
  };

  els.playBtn.addEventListener('click', () => {
    els.menu.classList.add('hidden');
    els.namePrompt.classList.remove('hidden');
    els.nameInput.focus();
  });

  els.nameConfirm.addEventListener('click', () => {
    const name = els.nameInput.value.trim() || 'anon';
    els.namePrompt.classList.add('hidden');
    callbacks.onPlay(name);
  });

  els.nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.nameConfirm.click();
    if (e.key === 'Escape') els.nameCancel.click();
  });

  els.nameCancel.addEventListener('click', () => {
    els.namePrompt.classList.add('hidden');
    els.menu.classList.remove('hidden');
  });

  els.settingsBtn.addEventListener('click', () => {
    els.settingsPanel.classList.remove('hidden');
    els.settingsBtn.blur();
  });

  els.settingsClose.addEventListener('click', () => {
    els.settingsPanel.classList.add('hidden');
  });

  els.sensSlider.addEventListener('input', () => {
    settings.sensitivity = parseFloat(els.sensSlider.value);
    els.sensValue.textContent = settings.sensitivity.toFixed(1);
    applySettings();
  });

  els.fovSlider.addEventListener('input', () => {
    settings.fov = parseInt(els.fovSlider.value, 10);
    els.fovValue.textContent = settings.fov;
    applySettings();
  });

  els.resumeBtn.addEventListener('click', () => {
    hidePaused();
    callbacks.onResume?.();
  });

  buildModeVoteOptions();
}

function applySettings() {
  const cam = renderer.getCamera();
  if (cam) {
    cam.fov = settings.fov;
    cam.updateProjectionMatrix();
  }
  callbacks.onSettings?.(settings);
}

export function getSettings() {
  return settings;
}

export function show()       { els.menu.classList.remove('hidden'); }
export function hide()       { els.menu.classList.add('hidden'); }

export function showPaused() {
  pausedVisible = true;
  els.paused.classList.remove('hidden');
}

export function hidePaused() {
  pausedVisible = false;
  els.paused.classList.add('hidden');
}

export function isPaused() {
  return pausedVisible;
}

export function setMaps(list) {
  maps = list;
  buildMapVoteOptions();
}

export function updateStatus(info) {
  if (els.menuMode) els.menuMode.textContent = (info.mode || 'dm').toUpperCase();
  if (els.menuMap) {
    const mapName = maps.find(m => m.id === info.mapId)?.name || info.mapId || '—';
    els.menuMap.textContent = mapName;
  }
  if (els.menuCount) els.menuCount.textContent = String(info.playerCount ?? 0);

  if (els.menuPlayers) {
    els.menuPlayers.innerHTML = '';
    if (!info.players || info.players.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'no one online';
      els.menuPlayers.appendChild(li);
    } else {
      for (const p of info.players) {
        const li = document.createElement('li');
        const teamClass = p.team === 'red' ? 'red' : p.team === 'blue' ? 'blue' : 'ffa';
        li.innerHTML =
          `<span class="roster-name">` +
            `<span class="team-dot ${teamClass}"></span>${escapeHtml(p.name)}` +
          `</span>` +
          `<span class="roster-kd">${p.kills ?? 0} / ${p.deaths ?? 0}</span>`;
        els.menuPlayers.appendChild(li);
      }
    }
  }
}

export function showVote(state) {
  els.vote.classList.remove('hidden');
  updateVoteCounts(state);
}

export function hideVote() {
  els.vote.classList.add('hidden');
  myVoteMode = null;
  myVoteMap = null;
}

function buildModeVoteOptions() {
  els.modeVote.innerHTML = '';
  for (const mode of MODES) {
    const btn = document.createElement('div');
    btn.className = 'vote-option';
    btn.dataset.mode = mode;
    btn.textContent = MODE_LABELS[mode];
    btn.addEventListener('click', () => {
      myVoteMode = mode;
      net.send({ type: 'voteMode', mode });
      markVoted(els.modeVote, btn);
    });
    els.modeVote.appendChild(btn);
  }
}

function buildMapVoteOptions() {
  els.mapVote.innerHTML = '';
  for (const m of maps) {
    const btn = document.createElement('div');
    btn.className = 'vote-option';
    btn.dataset.mapId = m.id;
    btn.textContent = m.name;
    btn.addEventListener('click', () => {
      myVoteMap = m.id;
      net.send({ type: 'voteMap', mapId: m.id });
      markVoted(els.mapVote, btn);
    });
    els.mapVote.appendChild(btn);
  }
}

function markVoted(container, chosen) {
  for (const child of container.children) {
    child.classList.toggle('voted', child === chosen);
  }
}

function updateVoteCounts(state) {
  const modeCounts = state.modeVotes || {};
  const mapCounts = state.mapVotes || {};

  for (const btn of els.modeVote.children) {
    const mode = btn.dataset.mode;
    const count = modeCounts[mode] || 0;
    btn.innerHTML = `${MODE_LABELS[mode]}<span class="count">${count}</span>`;
    btn.classList.toggle('voted', mode === myVoteMode);
  }

  for (const btn of els.mapVote.children) {
    const id = btn.dataset.mapId;
    const count = mapCounts[id] || 0;
    const name = maps.find(m => m.id === id)?.name || id;
    btn.innerHTML = `${escapeHtml(name)}<span class="count">${count}</span>`;
    btn.classList.toggle('voted', id === myVoteMap);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
