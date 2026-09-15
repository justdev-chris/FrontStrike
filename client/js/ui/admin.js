import { ADMIN_ACTIONS } from '/shared/protocol.js';

let els = {};
let getState = () => ({});
let send = () => {};
let aimbotEnabled = false;

export function init(opts) {
  getState = opts.getState;
  send = opts.send;

  els = {
    panel:        document.getElementById('adminPanel'),
    close:        document.getElementById('adminClose'),
    aimbot:       document.getElementById('adminAimbot'),
    weapon:       document.getElementById('adminWeapon'),
    weaponTgt:    document.getElementById('adminWeaponTarget'),
    give:         document.getElementById('adminGive'),
    slapTgt:      document.getElementById('adminSlapTarget'),
    slap:         document.getElementById('adminSlap'),
    kickTgt:      document.getElementById('adminKickTarget'),
    kick:         document.getElementById('adminKick'),
    tpTgt:        document.getElementById('adminTpTarget'),
    tpX:          document.getElementById('adminTpX'),
    tpY:          document.getElementById('adminTpY'),
    tpZ:          document.getElementById('adminTpZ'),
    tp:           document.getElementById('adminTp'),
    announceText: document.getElementById('adminAnnounceText'),
    announce:     document.getElementById('adminAnnounce'),
  };

  if (!els.panel) return;

  els.close.addEventListener('click', hide);
  els.aimbot.addEventListener('click', toggleAimbot);

  els.give.addEventListener('click', () => {
    send({
      type: 'adminAction',
      action: ADMIN_ACTIONS.GIVE_WEAPON,
      weaponId: els.weapon.value,
      targetName: els.weaponTgt.value.trim() || undefined,
    });
  });

  els.slap.addEventListener('click', () => {
    const target = els.slapTgt.value.trim();
    if (!target) return;
    send({
      type: 'adminAction',
      action: ADMIN_ACTIONS.SLAP,
      targetName: target,
    });
  });

  els.kick.addEventListener('click', () => {
    const target = els.kickTgt.value.trim();
    if (!target) return;
    send({
      type: 'adminAction',
      action: ADMIN_ACTIONS.KICK,
      targetName: target,
    });
  });

  els.tp.addEventListener('click', () => {
    const x = parseFloat(els.tpX.value);
    const y = parseFloat(els.tpY.value);
    const z = parseFloat(els.tpZ.value);
    send({
      type: 'adminAction',
      action: ADMIN_ACTIONS.TELEPORT,
      targetName: els.tpTgt.value.trim() || undefined,
      x: Number.isFinite(x) ? x : undefined,
      y: Number.isFinite(y) ? y : undefined,
      z: Number.isFinite(z) ? z : undefined,
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
  els.panel.classList.toggle('hidden');
}

export function show() {
  if (!els.panel) return;
  els.panel.classList.remove('hidden');
}

export function hide() {
  if (!els.panel) return;
  els.panel.classList.add('hidden');
}

export function isAimbotEnabled() {
  return aimbotEnabled;
}

function toggleAimbot() {
  aimbotEnabled = !aimbotEnabled;
  if (els.aimbot) {
    els.aimbot.classList.toggle('on', aimbotEnabled);
    els.aimbot.textContent = aimbotEnabled ? 'ON' : 'OFF';
  }
}
