let els = {};
const killfeedEntries = [];
const KILLFEED_MAX = 5;
const KILLFEED_TTL = 5000;
let damageTimeout = null;
let hitmarkerTimeout = null;
let respawnTimerId = null;

export function init() {
  els = {
    hud:          document.getElementById('hud'),
    healthValue:  document.getElementById('healthValue'),
    ammoValue:    document.getElementById('ammoValue'),
    killfeed:     document.getElementById('killfeed'),
    hitmarker:    document.getElementById('hitmarker'),
    damageFlash:  document.getElementById('damageFlash'),
    scoreboard:   document.getElementById('scoreboard'),
    scoreLine:    document.getElementById('scoreLine'),
    timer:        document.getElementById('timer'),
    deathOverlay: document.getElementById('deathOverlay'),
    deathKiller:  document.getElementById('deathKiller'),
    deathTimer:   document.getElementById('deathTimer'),
  };
}

export function show() { els.hud.classList.remove('hidden'); }
export function hide() { els.hud.classList.add('hidden'); }

export function update(state) {
  els.healthValue.textContent = state.health;
  els.healthValue.classList.toggle('low', state.health <= 25);

  if (state.mode === 'tdm') {
    els.scoreLine.innerHTML =
      `<span class="red">${state.scoreboard.red}</span>` +
      ` &nbsp;—&nbsp; ` +
      `<span class="blue">${state.scoreboard.blue}</span>`;
  } else {
    els.scoreLine.textContent = `KILLS ${state.kills} / DEATHS ${state.deaths}`;
  }

  if (state.phase === 'playing' && state.timeLeft > 0) {
    const s = Math.ceil(state.timeLeft / 1000);
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, '0');
    els.timer.textContent = `${m}:${sec}`;
  } else {
    els.timer.textContent = '';
  }
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
      `<span class="killer">${entry.killer}</span>` +
      ` ▸ ` +
      `<span class="victim">${entry.victim}</span>`;
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
  banner.innerHTML = `ELIMINATED <span class="victim-name">${victimName}</span>`;
  els.hud.appendChild(banner);
  setTimeout(() => banner.remove(), 1200);
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
