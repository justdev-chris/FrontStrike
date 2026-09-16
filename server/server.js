import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import { NET, MATCH } from '../shared/constants.js';
import { S2C, publicPlayer, publicMap } from '../shared/protocol.js';
import * as network from './network.js';
import * as simulation from './simulation.js';
import * as game from './game.js';
import * as players from './players.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  network.handleConnection(ws);
});

setInterval(() => {
  simulation.tick();
}, 1000 / NET.TICK_RATE);

let phaseTimer = 0;

setInterval(() => {
  const s = game.getState();
  const now = Date.now();
  const playerCount = s.players.size;

  switch (s.phase) {
    case 'lobby': {
      if (playerCount > 0) {
        game.resetVotes();
        game.setPhase('vote');
        phaseTimer = now + MATCH.VOTE_DURATION_MS;
        network.broadcastMatchState();
      }
      break;
    }

    case 'vote': {
      if (now >= phaseTimer || playerCount === 0) {
        const prevMapId = s.mapId;
        const mode = game.tallyModeVotes();
        const mapId = game.tallyMapVotes();
        game.setMode(mode);
        game.setMap(mapId);

        if (game.isTeamMode()) reassignTeamsAndRespawn();
        else respawnAll();

        game.startMatch(now);

        if (mapId !== prevMapId) {
          network.broadcast({
            type: S2C.MAP_CHANGE,
            mapId,
            map: publicMap(game.getMap()),
          });
        }

        network.broadcastMatchState();
      }
      break;
    }

    case 'playing': {
      if (playerCount === 0) {
        game.endMatch('time');
        network.broadcastMatchState();
      }
      break;
    }

    case 'ended': {
      if (now >= s.postMatchEndsAt) {
        game.setPhase('lobby');
        network.broadcastMatchState();
      }
      break;
    }
  }
}, 500);

network.startLoop();

function reassignTeamsAndRespawn() {
  const ps = [...game.getState().players.values()];
  let red = 0, blue = 0;
  for (const p of ps) {
    if (red <= blue) { p.team = 'red'; red++; }
    else             { p.team = 'blue'; blue++; }
  }
  respawnAll();
}

function respawnAll() {
  for (const p of players.getAll().values()) {
    players.respawn(p);
    network.broadcast({
      type: S2C.RESPAWN,
      player: publicPlayer(p),
    });
  }
}

server.listen(PORT, () => {
  console.log(`FrontStrike listening on http://localhost:${PORT}`);
});
