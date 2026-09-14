let els = {};
const killfeedEntries = [];
const KILLFEED_MAX = 5;
const KILLFEED_TTL = 5000;
let damageTimeout = null;
let hitmarkerTimeout = null;
let respawnTimerId = null;
let scoreboardVisible = false;
let emoteTimeout = null;
let streakTimeout = null;

// animated team scores
let displayRedScore = 0;
let displayBlueScore = 0;
let targetRedScore = 0;
let targetBlueScore = 0;

export function init() {
  els = {
    hud:           document.getElementById('hud'),
    healthValue:   document.getElementById('healthValue'),
    ammoValue:     document.getElementById('ammoValue'),
    ammoMag:       document.getElementById('ammoMag'),
    ammoReserve:   document.getElementById('ammoReserve'),
    weaponName:    document.getElementById('weaponName'),
    reloadBar:     document.getElementById('reloadBar'),
    killfeed:      document.getElementById('killfeed'),
    hitmarker:     document.getElementById('hitmarker'),
    damageFlash:   document.getElementById('damageFlash'),
    scoreboard:    document.getElementById('scoreboard'),
    scoreLine:     document.getElementById('scoreLine'),
    timer:         document.getElementById('timer'),
    deathOverlay:  document.getElementById('deathOverlay'),
    deathKiller:   document.getElementById('deathKiller'),
    deathTimer:    document.getElementById('deathTimer'),
    tabScoreboard: document.getElementById('tabScoreboard'),
    tabRed:        document.getElementById('tabRed'),
    tabBlue:       document.getElementById('tabBlue'),
    tabFFA:        document.getElementById('tabFFA'),
    tabMode:       document.getElementById('tabMode'),
    tabRedScore:   document.getElementById('tabRedScore'),
    tabBlueScore:  document.getElementById('tabBlueScore'),
    emoteIndicator: document.getElementById('emoteIndicator'),
    streakBanner:  document.getElementById('streakBanner'),
  };
}

export function show() { els.hud.classList.remove('hidden'); }
export function hide() { els.hud.classList.add('hidden'); }

export function update(state) {
  els.healthValue.textContent = state.health;
  els.healthValue.classList.toggle('low', state.health <= 25);

  if (state.mode === 'tdm') {
    targetRedScore = state.scoreboard.red;
    targetBlueScore = state.scoreboard.blue;
    animateScores();
    els.scoreLine.innerHTML =
      `<span class="red">${displayRedScore}</span>` +
      ` <span class="vs">—</span> ` +
      `<span class="blue">${displayBlueScore}</span>`;
  } else {
    els.scoreLine.textContent = `KILLS ${state.kills} / DEATHS ${state.deaths}`;
  }

  if (state.phase === 'playing' && state.timeLeft > 0) {
    const s = Math.ceil(state.timeLeft / 1000);
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, '0');
    els.timer.textContent = `${m}:${sec}`;
  } else if (state.phase === 'ended' && state.timeLeft <= 0) {
    els.timer.textContent = 'MATCH OVER';
  } else {
    els.timer.textContent = '';
  }

  if (els.ammoMag && state.magAmmo !== undefined) {
    els.ammoMag.textContent = state.magAmmo;
    els.ammoReserve.textContent = '∞';
    if (els.weaponName) {
      els.weaponName.textContent = (state.weaponId || '').toUpperCase();
    }
    if (els.reloadBar) {
      els.reloadBar.classList.toggle('active', !!state.reloading);
    }
  }

  if (scoreboardVisible) updateScoreboard(state);
}

function animateScores() {
  if (displayRedScore < targetRedScore) displayRedScore++;
  else if (displayRedScore > targetRedScore) displayRedScore--;
  if (displayBlueScore < targetBlueScore) displayBlueScore++;
  else if (displayBlueScore > targetBlueScore) displayBlueScore--;
}

export function addKillfeed(killerId, victimId, weapon, players) {
  const killerName = players?.get(killerId)?.name || `#${killerId}`;
  const victimName = players?.get(victimId)?.name || `#${victimId}`;

  const entry = {
    killer: killerName,
    victim: victimName,
    weapon,
    expires: performance.now() + KILLFEED_TTL,
  };
  killfeedEntries.push(entry);
  while (killfeedEntries.length > KILLFEED_MAX) killfeedEntries.shift();
  renderKillfeed();
}

function renderKillfeed() {
  if (!els.killfeed) return;
  els.killfeed.innerHTML = '';
  const now = performance.now();
  for (const entry of killfeedEntries) {
    if (entry.expires <= now) continue;
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML =
      `<span class="killer">${escapeHtml(entry.killer)}</span>` +
      ` ▸ ` +
      `<span class="victim">${escapeHtml(entry.victim)}</span>`;
    els.killfeed.appendChild(div);
  }
}

setInterval(() => {
  if (!els.killfeed) return;
  const now = performance.now();
  let dirty = false;
  for (let i = killfeedEntries.length - 1; i >= 0; i--) {
    if (killfeedEntries[i].expires <= now) {
      killfeedEntries.splice(i, 1);
      dirty = true;
    }
  }
  if (dirty) renderKillfeed();
}, 1000);

export function showHitmarker() {
  els.hitmarker.classList.remove('hidden');
  clearTimeout(hitmarkerTimeout);
  hitmarkerTimeout = setTimeout(() => {
    els.hitmarker.classList.add('hidden');
  }, 100);
}

export function flashDamage() {
  els.damageFlash.classList.add('active');
  clearTimeout(damageTimeout);
  damageTimeout = setTimeout(() => {
    els.damageFlash.classList.remove('active');
  }, 60);
}

export function showKill(victimName) {
  const banner = document.createElement('div');
  banner.className = 'kill-banner';
  banner.innerHTML = `ELIMINATED <span class="victim-name">${escapeHtml(victimName)}</span>`;
  els.hud.appendChild(banner);
  setTimeout(() => banner.remove(), 1200);
}

export function showStreak(playerName, label) {
  if (!els.streakBanner) return;
  els.streakBanner.innerHTML =
    `<div class="streak-player">${escapeHtml(playerName)}</div>` +
    `<div class="streak-label">${escapeHtml(label)}</div>`;
  els.streakBanner.classList.remove('hidden');
  // restart animation
  els.streakBanner.classList.remove('play');
  void els.streakBanner.offsetWidth;
  els.streakBanner.classList.add('play');
  clearTimeout(streakTimeout);
  streakTimeout = setTimeout(() => {
    els.streakBanner.classList.add('hidden');
    els.streakBanner.classList.remove('play');
  }, 2500);
}

export function showDeath(killerName, respawnMs) {
  if (!els.deathOverlay) return;
  els.deathOverlay.classList.remove('hidden');
  els.deathKiller.textContent = killerName ? `killed by ${killerName}` : 'you died';

  const endAt = performance.now() + respawnMs;
  clearInterval(respawnTimerId);
  respawnTimerId = setInterval(() => {
    const remain = Math.max(0, endAt - performance.now());
    els.deathTimer.textContent = (remain / 1000).toFixed(1) + 's';
    if (remain <= 0) {
      clearInterval(respawnTimerId);
      respawnTimerId = null;
    }
  }, 100);
}

export function hideDeath() {
  if (!els.deathOverlay) return;
  els.deathOverlay.classList.add('hidden');
  clearInterval(respawnTimerId);
  respawnTimerId = null;
}

export function showScoreboard() {
  scoreboardVisible = true;
  els.tabScoreboard.classList.remove('hidden');
}

export function hideScoreboard() {
  scoreboardVisible = false;
  els.tabScoreboard.classList.add('hidden');
}

export function showEmote(emoteId) {
  if (!els.emoteIndicator) return;
  els.emoteIndicator.textContent = emoteId;
  els.emoteIndicator.classList.remove('hidden');
  clearTimeout(emoteTimeout);
  emoteTimeout = setTimeout(() => {
    els.emoteIndicator.classList.add('hidden');
  }, 1500);
}

export function hideEmote() {
  if (!els.emoteIndicator) return;
  els.emoteIndicator.classList.add('hidden');
  clearTimeout(emoteTimeout);
  emoteTimeout = null;
}

function updateScoreboard(state) {
  if (!els.tabRed || !els.tabBlue || !els.tabFFA) return;

  const players = [...state.players.values()];
  players.sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    return a.deaths - b.deaths;
  });

  if (state.mode === 'tdm') {
    els.tabScoreboard.classList.remove('ffa');
    els.tabMode.textContent = 'TEAM DEATHMATCH';
    els.tabRedScore.textContent = state.scoreboard.red;
    els.tabBlueScore.textContent = state.scoreboard.blue;

    renderColumn(els.tabRed, players.filter(p => p.team === 'red'), state);
    renderColumn(els.tabBlue, players.filter(p => p.team === 'blue'), state);
  } else {
    els.tabScoreboard.classList.add('ffa');
    els.tabMode.textContent = 'DEATHMATCH';
    renderColumn(els.tabFFA, players, state);
  }
}

function renderColumn(container, players, state) {
  container.innerHTML = '';
  if (players.length === 0) {
    const row = document.createElement('div');
    row.className = 'sb-row empty';
    row.textContent = '—';
    container.appendChild(row);
    return;
  }
  for (const p of players) {
    const row = document.createElement('div');
    row.className = 'sb-row';
    if (p.id === state.myId) row.classList.add('self');
    if (!p.alive) row.classList.add('dead');

    row.innerHTML =
      `<span class="sb-name">${escapeHtml(p.name)}</span>` +
      `<span class="sb-kd">${p.kills} / ${p.deaths}</span>`;

    container.appendChild(row);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
