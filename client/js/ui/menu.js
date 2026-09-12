import * as net from '../core/net.js';

let els = {};
let callbacks = {};
let maps = [];
let myVoteMode = null;
let myVoteMap = null;

export function init(cbs) {
  callbacks = cbs;

  els = {
    menu:       document.getElementById('menu'),
    vote:       document.getElementById('vote'),
    paused:     document.getElementById('paused'),
    nameInput:  document.getElementById('nameInput'),
    playBtn:    document.getElementById('playBtn'),
    resumeBtn:  document.getElementById('resumeBtn'),
    modeVote:   document.getElementById('modeVote'),
    mapVote:    document.getElementById('mapVote'),
  };

  els.playBtn.addEventListener('click', () => {
    const name = els.nameInput.value.trim() || 'anon';
    callbacks.onPlay(name);
  });

  els.nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.playBtn.click();
  });

  els.resumeBtn.addEventListener('click', () => {
    hidePaused();
    callbacks.onResume?.();
  });

  buildModeVoteOptions();
}

export function show()       { els.menu.classList.remove('hidden'); }
export function hide()       { els.menu.classList.add('hidden'); }
export function showPaused() { els.paused.classList.remove('hidden'); }
export function hidePaused() { els.paused.classList.add('hidden'); }

export function setMaps(list) {
  maps = list;
  buildMapVoteOptions();
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
  for (const mode of ['dm', 'tdm']) {
    const btn = document.createElement('div');
    btn.className = 'vote-option';
    btn.dataset.mode = mode;
    btn.textContent = mode.toUpperCase();
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
    btn.innerHTML = `${mode.toUpperCase()}<span class="count">${count}</span>`;
    btn.classList.toggle('voted', mode === myVoteMode);
  }

  for (const btn of els.mapVote.children) {
    const id = btn.dataset.mapId;
    const count = mapCounts[id] || 0;
    const name = maps.find(m => m.id === id)?.name || id;
    btn.innerHTML = `${name}<span class="count">${count}</span>`;
    btn.classList.toggle('voted', id === myVoteMap);
  }
}
