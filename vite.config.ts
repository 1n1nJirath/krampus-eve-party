import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os';
import fs from 'fs';
import path from 'path';

function getLanIp(): string {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push(iface.address);
      }
    }
  }
  // Prefer typical Wi-Fi / Hotspot 192.168.x.x or 172.20.x.x or 10.x.x.x
  const preferred = candidates.find(ip => ip.startsWith('192.168.') || ip.startsWith('172.20.') || ip.startsWith('10.'));
  return preferred || candidates[0] || 'localhost';
}

function krampusRealtimeServerPlugin(): Plugin {
  const stateFile = path.resolve(process.cwd(), '.krampus-state.json');
  let gameState: any = null;
  let version = 1;

  try {
    if (fs.existsSync(stateFile)) {
      const raw = fs.readFileSync(stateFile, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.teams) {
        gameState = parsed;
        version = (parsed.version || 1) + 1;
      }
    }
  } catch {
    // ignore corrupt state file
  }

  const clients = new Set<any>();

  const saveAndBroadcast = (newState: any) => {
    version += 1;
    gameState = {
      ...newState,
      version,
      serverTimestamp: Date.now(),
    };
    const payload = `data: ${JSON.stringify({ type: 'STATE_SYNC', state: gameState, serverNow: Date.now() })}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch {
        clients.delete(res);
      }
    }
    try {
      fs.writeFileSync(stateFile, JSON.stringify(gameState), 'utf-8');
    } catch {
      // ignore write errors
    }
  };

  const setupMiddleware = (middlewares: any) => {
    middlewares.use((req: any, res: any, next: any) => {
      if (!req.url) return next();
      const url = req.url.split('?')[0];

      // CORS headers for local network mobile access
      if (url.startsWith('/api/')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
      }

      if (url === '/api/info' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          lanIp: getLanIp(),
          serverNow: Date.now(),
          version,
        }));
        return;
      }

      if (url === '/api/state' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          state: gameState,
          serverNow: Date.now(),
          lanIp: getLanIp(),
          version,
        }));
        return;
      }

      if (url === '/api/events' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });
        res.write(`data: ${JSON.stringify({ type: 'CONNECTED', state: gameState, serverNow: Date.now(), lanIp: getLanIp() })}\n\n`);
        clients.add(res);
        req.on('close', () => {
          clients.delete(res);
        });
        return;
      }

      if (url === '/api/sync' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.type === 'FULL_STATE' && data.state) {
              saveAndBroadcast(data.state);
            } else if (data.type === 'TEAM_ACTION' && gameState) {
              // Atomic team action handler so 4 phones submitting simultaneously never overwrite each other!
              const now = Date.now();
              const teamId = data.teamId as string;
              const action = data.action as string;
              const payload = data.payload || {};

              const updated = structuredClone(gameState);
              updated.submissions = updated.submissions || {};
              updated.buzzerQueue = updated.buzzerQueue || [];

              if (action === 'SUBMIT_ANSWER') {
                const elapsedMs = updated.round?.timerStartedAt
                  ? Math.max(0, now - updated.round.timerStartedAt)
                  : 0;
                updated.submissions[teamId] = {
                  teamId,
                  value: payload.value,
                  secondaryValue: payload.secondaryValue,
                  submittedAt: now,
                  elapsedMs,
                  locked: true,
                };
              } else if (action === 'CLEAR_TEAM_SUBMISSION') {
                delete updated.submissions[teamId];
              } else if (action === 'REGISTER_TEAM') {
                if (updated.teams && updated.teams[teamId]) {
                  updated.teams[teamId] = {
                    ...updated.teams[teamId],
                    name: payload.name || updated.teams[teamId].name,
                    icon: payload.icon || updated.teams[teamId].icon,
                    motto: payload.motto ?? updated.teams[teamId].motto,
                    isRegistered: true,
                  };
                }
              } else if (action === 'PRESS_BUZZER') {
                const alreadyPressed = updated.buzzerQueue.some((b: any) => b.teamId === teamId);
                if (!alreadyPressed && updated.round?.status === 'ACTIVE') {
                  const firstPressTime = updated.buzzerQueue.length > 0
                    ? updated.buzzerQueue[0].pressedAt
                    : now;
                  const elapsedFromStart = updated.round?.timerStartedAt
                    ? Math.max(0, now - updated.round.timerStartedAt)
                    : 0;
                  updated.buzzerQueue.push({
                    teamId,
                    pressedAt: now,
                    deltaMs: now - firstPressTime,
                    elapsedFromStartMs: elapsedFromStart,
                    rank: updated.buzzerQueue.length + 1,
                  });
                }
              } else if (action === 'BAILOUT_SHIELD') {
                const t = updated.teams?.[teamId];
                if (t && t.shields <= 0) {
                  t.coins -= 500;
                  t.shields = 2;
                  t.candles = 2;
                  updated.transactions = updated.transactions || [];
                  updated.transactions.unshift({
                    id: `tx-${now}`,
                    timestamp: now,
                    teamId,
                    delta: -500,
                    reason: `${t.name} ไถ่เกราะเด็กดี +2 🛡️ (Naughty List Bailout)`,
                  });
                }
              } else if (action === 'SNAKE_PICK') {
                const r = updated.round;
                const doorKey = String(payload.doorKey || '');
                if (r?.gameStage === 'POLL_MINE' && r?.eightDoorsSubRound === 'SUB1_SURVIVAL' && r?.status === 'ACTIVE') {
                  const order: string[] = r.snakeDraftOrder || ['team1', 'team2', 'team3', 'team4', 'team4', 'team3', 'team2', 'team1'];
                  const idx = r.snakeDraftIndex ?? 0;
                  if (idx < order.length && order[idx] === teamId) {
                    const count = r.choiceCount || 8;
                    const doorIdx = (r.choices || []).slice(0, count).findIndex((c: any) => c.key === doorKey);
                    if (doorIdx !== -1 && !r.choices[doorIdx].isOpened) {
                      const door = r.choices[doorIdx];
                      const rank = door.rank ?? doorIdx + 1;
                      const safeMin = r.safeRankMin ?? 1;
                      const safeMax = r.safeRankMax ?? (count >= 10 ? 4 : 3);
                      const isSafe = rank >= safeMin && rank <= safeMax;
                      r.choices[doorIdx] = { ...door, isOpened: true };
                      r.lastOpenedDoorKey = doorKey;
                      const picks = [...(r.snakeDraftPicks || [])];
                      const prevSafeCount = picks.filter((p: any) => p.teamId === teamId && p.isSafe).length;
                      picks.push({ teamId, doorKey, rank, isSafe });
                      r.snakeDraftPicks = picks;
                      const t = updated.teams?.[teamId];
                      if (t) {
                        if (isSafe) {
                          t.coins += prevSafeCount >= 1 ? 500 : 300;
                        } else {
                          t.shields = Math.max(0, t.shields - 1);
                          t.candles = t.shields;
                        }
                      }
                      const nextIdx = idx + 1;
                      r.snakeDraftIndex = nextIdx;
                      const allSafeOpened = r.choices
                        .slice(0, count)
                        .filter((c: any) => (c.rank ?? 99) >= safeMin && (c.rank ?? 99) <= safeMax)
                        .every((c: any) => c.isOpened);
                      if (allSafeOpened || nextIdx >= order.length) {
                        r.status = 'REVEALED';
                        r.rewardsApplied = true;
                        r.timerStartedAt = null;
                        r.timerRemainingMs = 0;
                      }
                    }
                  }
                }
              }

              saveAndBroadcast(updated);
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, state: gameState, serverNow: Date.now() }));
          } catch (err: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: err?.message }));
          }
        });
        return;
      }

      next();
    });
  };

  return {
    name: 'krampus-realtime-server',
    configureServer(server) {
      setupMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      setupMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), krampusRealtimeServerPlugin()],
  server: {
    host: true,
    port: 5173,
  },
});
