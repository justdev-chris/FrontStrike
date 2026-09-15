import { ADMIN_ACTIONS } from '/shared/protocol.js';

let els = {};
let getState = () => ({});
let send = () => {};
let aimbotEnabled = false;
let godmodeEnabled = false;
let noReloadEnabled = false;
let panelOpen = false;

export function init(opts) {
  getState = opts.getState;
  send = opts.send;

  els = {
    panel:       document.getElementById('adminPanel'),
    close:       document.getElementById('adminClose'),
    aimbot:      document.getElementById('adminAimbot'),
    godmode:     document.getElementById('adminGodmode'),
    noReload:    document.getElementById('adminNoReload'),
    speed:       document.getElementById('adminSpeed'),
    speedValue:  document.getElementById('adminSpeedValue'),
    weapon:      document.getElementById('adminWeapon'),
    weaponTgt:   document.getElementById('adminWeaponTarget'),
    give:        document.getElementById('adminGive'),
    slapTgt:     document.getElementById('adminSlapTarget'),
    slap:        document.getElementById('adminSlap'),
    kickTgt:     document.getElementById('adminKickTarget'),
    kick:        document.getElementById('adminKick'),
    tpTgt:       document.getElementById('adminTpTarget'),
    tpX:         document.getElementById('adminTpX'),
    tpY:         document.getElementById('adminTpY'),
    tpZ:         document.getElementById('adminTpZ'),
    tp:          document.getElementById('adminTp'),
    announceText: document.getElementById('adminAnnounceText'),
    announce:    document.getElementById('adminAnnounce'),
  };

  if (!els.panel) return;

  els.close.addEventListener('click', hide);
  els.aimbot.addEventListener('click', toggleAimbot);
  els.godmode.addEventListener('click', toggleGodmode);
  els.noReload.addEventListener('click', toggleNoReload);

  els.speed.addEventListener('input', () => {
    const v = parseFloat(els.speed.value);
    els.speedValue.textContent = v.toFixed(1) + 'x';
    send({
      type: 'adminAction',
      action: ADMIN_ACTIONS.SET_SPEED,
      mult: v,
    });
  });

  els.give.addEventListener('click', () => {
    send({
      type: 'adminAction',
      action: ADMIN_ACTIONS.GIVE_WEAPON,
      weaponId: els.weapon.value,
      targetName: els.weaponTgt.value.trim() || undefined,
    });
  });

  els.slap.addEventListener('click', () => {
    send({
      type: 'adminAction',
      action: ADMIN_ACTIONS.SLAP,
      targetName: els.slapTgt.value.trim(),
    });
  });

  els.kick.addEventListener('click', () => {
    send({
      type: 'adminAction',
      action: ADMIN_ACTIONS.KICK,
      targetName: els.kickTgt.value.trim(),
    });
  });

  els.tp.addEventListener('click', () => {
    send({
      type: 'adminAction',
      action: ADMIN_ACTIONS.TELEPORT,
      targetName: els.tpTgt.value.trim() || undefined,
      x: parseFloat(els.tpX.value),
      y: parseFloat(els.tpY.value),
      z: parseFloat(els.tpZ.value),
    });
  });

  els.announce.addEventListener('click', () => {
    const text = els.announceText.value.trim();
    if (!text) return;
    send({
      type: 'adminAction',
      action: ADMIN_ACTIONS.ANNOUNCE,
      text,
    });
    els.announceText.value = '';
  });
}

export function toggle() {
  if (!els.panel) return;
  if (panelOpen) hide();
  else show();
}

export function show() {
  if (!els.panel) return;
  els.panel.classList.remove('hidden');
  panelOpen = true;
  window.dispatchEvent(new CustomEvent('fs-admin-toggled', { detail: { open: true } }));
}

export function hide() {
  if (!els.panel) return;
  els.panel.classList.add('hidden');
  panelOpen = false;
  window.dispatchEvent(new CustomEvent('fs-admin-toggled', { detail: { open: false } }));
}

export function isOpen() {
  return panelOpen;
}

function toggleAimbot() {
  aimbotEnabled = !aimbotEnabled;
  els.aimbot.classList.toggle('on', aimbotEnabled);
  els.aimbot.textContent = aimbotEnabled ? 'ON' : 'OFF';
  window.dispatchEvent(new CustomEvent('fs-aimbot', { detail: { enabled: aimbotEnabled } }));
}

export function isAimbotEnabled() {
  return aimbotEnabled;
}

function toggleGodmode() {
  godmodeEnabled = !godmodeEnabled;
  els.godmode.classList.toggle('on', godmodeEnabled);
  els.godmode.textContent = godmodeEnabled ? 'ON' : 'OFF';
  send({
    type: 'adminAction',
    action: ADMIN_ACTIONS.SET_GODMODE,
    enabled: godmodeEnabled,
  });
}

export function isGodmodeEnabled() {
  return godmodeEnabled;
}

function toggleNoReload() {
  noReloadEnabled = !noReloadEnabled;
  els.noReload.classList.toggle('on', noReloadEnabled);
  els.noReload.textContent = noReloadEnabled ? 'ON' : 'OFF';
  send({
    type: 'adminAction',
    action: ADMIN_ACTIONS.SET_NORELOAD,
    enabled: noReloadEnabled,
  });
}

export function isNoReloadEnabled() {
  return noReloadEnabled;
}
