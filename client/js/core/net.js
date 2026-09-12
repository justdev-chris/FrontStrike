import { onMessage } from '../main.js';

let ws = null;
let connectResolve = null;

export function connect(name) {
  return new Promise((resolve) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}`);
    connectResolve = resolve;

    ws.onopen = () => {
      send({ type: 'join', name });
      if (connectResolve) connectResolve();
      connectResolve = null;
    };

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      onMessage(msg);
    };

    ws.onclose = () => {
      console.warn('[net] disconnected');
    };
  });
}

export function send(msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

export function isConnected() {
  return ws && ws.readyState === 1;
}
