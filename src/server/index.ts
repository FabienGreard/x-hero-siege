import { GameWorld } from "./game";
import { parseClientMessage, type ServerMessage } from "../shared/protocol";
import { fileURLToPath } from "node:url";

interface SocketData {
  connectionId: string;
  playerId: string | null;
  resumeToken: string | null;
  generation: number;
}

interface CreateServerOptions {
  port?: number;
  hostname?: string;
  accelerated?: boolean;
  reconnectGraceMs?: number;
}

interface ReconnectSession {
  token: string;
  playerId: string;
  generation: number;
  connectionId: string | null;
  socket: Bun.ServerWebSocket<SocketData> | null;
  expiresAt: number | null;
}

const DEFAULT_RECONNECT_GRACE_MS = 15_000;
const HANDSHAKE_TIMEOUT_MS = 5_000;

function createResumeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

const root = new URL("../../", import.meta.url);
const builtRoot = new URL("../", import.meta.url);
const runningBuiltServer = fileURLToPath(import.meta.url).includes("/dist/server/");
const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });

export function createGameServer(options: CreateServerOptions = {}) {
  const game = new GameWorld({ accelerated: options.accelerated });
  const requestedGraceMs = options.reconnectGraceMs ?? DEFAULT_RECONNECT_GRACE_MS;
  const reconnectGraceMs = Number.isFinite(requestedGraceMs)
    ? Math.max(0, Math.floor(requestedGraceMs))
    : DEFAULT_RECONNECT_GRACE_MS;
  const sessionsByToken = new Map<string, ReconnectSession>();
  const handshakeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let lastTick = performance.now();
  let snapshotAccumulator = 0;
  let stopping = false;

  const clearHandshakeTimer = (connectionId: string): void => {
    const timer = handshakeTimers.get(connectionId);
    if (timer) clearTimeout(timer);
    handshakeTimers.delete(connectionId);
  };

  const sendError = (socket: Bun.ServerWebSocket<SocketData>, code: string, message: string): void => {
    socket.send(JSON.stringify({ type: "error", code, message } satisfies ServerMessage));
  };

  const ownsCurrentSession = (socket: Bun.ServerWebSocket<SocketData>): ReconnectSession | null => {
    const { resumeToken, playerId, generation, connectionId } = socket.data;
    if (!resumeToken || !playerId) return null;
    const session = sessionsByToken.get(resumeToken);
    return session &&
      session.playerId === playerId &&
      session.generation === generation &&
      session.connectionId === connectionId
      ? session
      : null;
  };

  let server: Bun.Server<SocketData>;

  const publishSnapshot = (): void => {
    if (stopping) return;
    server.publish("game", JSON.stringify({ type: "snapshot", snapshot: game.getSnapshot() } satisfies ServerMessage));
  };

  const expireSessions = (now: number): void => {
    let changed = false;
    for (const [token, session] of sessionsByToken) {
      if (session.expiresAt === null || now < session.expiresAt) continue;
      sessionsByToken.delete(token);
      game.removePlayer(session.playerId);
      changed = true;
    }
    if (!changed) return;
    if (game.players.size === 0 && game.phase !== "lobby") game.reset(game.accelerated);
    publishSnapshot();
  };

  const bindSession = (
    socket: Bun.ServerWebSocket<SocketData>,
    session: ReconnectSession,
    resumed: boolean,
    name: string,
  ): void => {
    const previousSocket = session.socket;
    session.generation += 1;
    session.connectionId = socket.data.connectionId;
    session.socket = socket;
    session.expiresAt = null;
    socket.data.playerId = session.playerId;
    socket.data.resumeToken = session.token;
    socket.data.generation = session.generation;
    clearHandshakeTimer(socket.data.connectionId);

    game.setPlayerConnected(session.playerId, true);
    if (!resumed) game.setPlayerName(session.playerId, name);
    socket.subscribe("game");

    if (previousSocket && previousSocket !== socket) {
      sendError(previousSocket, "SESSION_REPLACED", "This defender continued from another connection.");
      previousSocket.close(4001, "Session replaced");
    }

    socket.send(JSON.stringify({
      type: "welcome",
      playerId: session.playerId,
      websocketPath: "/ws",
      resumeToken: session.token,
      resumed,
      resumeWindowMs: reconnectGraceMs,
      snapshot: game.getSnapshot(),
    } satisfies ServerMessage));
    publishSnapshot();
  };

  const acceptHello = (
    socket: Bun.ServerWebSocket<SocketData>,
    name: string,
    requestedToken?: string,
  ): void => {
    expireSessions(performance.now());

    const existing = requestedToken ? sessionsByToken.get(requestedToken) : undefined;
    if (existing && game.players.has(existing.playerId)) {
      bindSession(socket, existing, true, name);
      return;
    }
    if (requestedToken && existing) {
      sessionsByToken.delete(requestedToken);
    }
    if (requestedToken && game.phase !== "lobby") {
      clearHandshakeTimer(socket.data.connectionId);
      sendError(socket, "SESSION_EXPIRED", "The reconnect window for this defender has expired.");
      socket.close(1008, "Session expired");
      return;
    }

    const playerId = crypto.randomUUID();
    const result = game.addPlayer(playerId, name);
    if (!result.ok) {
      clearHandshakeTimer(socket.data.connectionId);
      sendError(socket, result.code!, result.message!);
      socket.close(1013, result.message);
      return;
    }

    let token = createResumeToken();
    while (sessionsByToken.has(token)) token = createResumeToken();
    const session: ReconnectSession = {
      token,
      playerId,
      generation: 0,
      connectionId: null,
      socket: null,
      expiresAt: null,
    };
    sessionsByToken.set(token, session);
    bindSession(socket, session, false, name);
  };

  server = Bun.serve<SocketData>({
    port: options.port ?? Number(Bun.env.PORT ?? 3000),
    hostname: options.hostname ?? Bun.env.HOST ?? "0.0.0.0",
    async fetch(request, bunServer) {
      const url = new URL(request.url);

      if (url.pathname === "/ws") {
        if (url.searchParams.get("debug") === "1" && game.phase === "lobby" && game.players.size === 0) {
          game.reset(true);
        }
        const upgraded = bunServer.upgrade(request, {
          data: {
            connectionId: crypto.randomUUID(),
            playerId: null,
            resumeToken: null,
            generation: 0,
          },
        });
        return upgraded ? undefined : new Response("WebSocket upgrade failed", { status: 400 });
      }

      if (url.pathname === "/health") {
        return json({
          ok: true,
          phase: game.phase,
          players: game.players.size,
          accelerated: game.accelerated,
          uptime: process.uptime(),
        });
      }

      if (url.pathname === "/debug/state") return json(game.getSnapshot());

      if (url.pathname === "/debug/reset" && (request.method === "POST" || request.method === "GET")) {
        const accelerated = url.searchParams.get("accelerated");
        game.reset(accelerated === null ? game.accelerated : accelerated === "1" || accelerated === "true");
        return json({ ok: true, snapshot: game.getSnapshot() });
      }

      if (url.pathname === "/debug/advance" && (request.method === "POST" || request.method === "GET")) {
        const result = game.debugAdvance();
        return json({ ...result, snapshot: game.getSnapshot() }, result.ok ? 200 : 409);
      }

      if (url.pathname === "/" || url.pathname === "/index.html") {
        return new Response(Bun.file(new URL("index.html", runningBuiltServer ? builtRoot : root)), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      }

      if (url.pathname === "/style.css") {
        return new Response(Bun.file(new URL(runningBuiltServer ? "style.css" : "src/client/style.css", runningBuiltServer ? builtRoot : root)), {
          headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-store" },
        });
      }

      const builtClientAsset = runningBuiltServer && /^\/assets\/main-[a-f0-9]{16}\.js$/.test(url.pathname);
      if (url.pathname === "/assets/main.js" || builtClientAsset) {
        if (runningBuiltServer) {
          if (!builtClientAsset) return new Response("Not found", { status: 404 });
          const asset = Bun.file(new URL(url.pathname.slice(1), builtRoot));
          if (!await asset.exists()) return new Response("Not found", { status: 404 });
          return new Response(asset, {
            headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=31536000, immutable" },
          });
        }
        const build = await Bun.build({
          entrypoints: [fileURLToPath(new URL("src/client/main.ts", root))],
          target: "browser",
          format: "esm",
          minify: false,
          sourcemap: "inline",
        });
        if (!build.success) {
          return new Response(build.logs.map(String).join("\n"), { status: 500 });
        }
        const output = build.outputs.find((item) => item.path.endsWith(".js"));
        if (!output) return new Response("Client bundle missing", { status: 500 });
        return new Response(output, {
          headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
        });
      }

      const devDefenderProof = "/assets/models/proof/siegeheart-defender-proof.glb";
      const builtDefenderProof = runningBuiltServer && /^\/assets\/models\/proof\/siegeheart-defender-proof-[a-f0-9]{16}\.glb$/.test(url.pathname);
      if (url.pathname === devDefenderProof || builtDefenderProof) {
        if (runningBuiltServer && !builtDefenderProof) return new Response("Not found", { status: 404 });
        const asset = Bun.file(runningBuiltServer
          ? new URL(url.pathname.slice(1), builtRoot)
          : new URL(`public${devDefenderProof}`, root));
        if (!await asset.exists()) return new Response("Not found", { status: 404 });
        return new Response(asset, {
          headers: {
            "content-type": "model/gltf-binary",
            "cache-control": runningBuiltServer ? "public, max-age=31536000, immutable" : "no-store",
          },
        });
      }

      return new Response("Not found", { status: 404 });
    },
    websocket: {
      open(socket) {
        const connectionId = socket.data.connectionId;
        handshakeTimers.set(connectionId, setTimeout(() => {
          if (socket.data.playerId === null) {
            sendError(socket, "HANDSHAKE_REQUIRED", "Send hello before entering the war table.");
            socket.close(1008, "Handshake required");
          }
          handshakeTimers.delete(connectionId);
        }, HANDSHAKE_TIMEOUT_MS));
      },
      message(socket, raw) {
        const message = parseClientMessage(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
        if (!message) {
          if (socket.data.playerId === null) {
            clearHandshakeTimer(socket.data.connectionId);
            sendError(socket, "HANDSHAKE_REQUIRED", "Send a valid hello before entering the war table.");
            socket.close(1008, "Handshake required");
            return;
          }
          sendError(socket, "BAD_MESSAGE", "Malformed client message.");
          return;
        }
        if (socket.data.playerId === null) {
          if (message.type !== "hello") {
            clearHandshakeTimer(socket.data.connectionId);
            sendError(socket, "HANDSHAKE_REQUIRED", "Send hello before entering the war table.");
            socket.close(1008, "Handshake required");
            return;
          }
          acceptHello(socket, message.name, message.resumeToken);
          return;
        }
        if (message.type === "hello") {
          sendError(socket, "ALREADY_CONNECTED", "This connection has already entered the war table.");
          return;
        }
        const session = ownsCurrentSession(socket);
        if (!session) {
          sendError(socket, "SESSION_REPLACED", "This defender continued from another connection.");
          socket.close(4001, "Session replaced");
          return;
        }
        const result = game.handleMessage(session.playerId, message);
        if (!result.ok) {
          sendError(socket, result.code!, result.message!);
        } else if (result.pong) {
          socket.send(JSON.stringify({ type: "pong", ...result.pong } satisfies ServerMessage));
        }
      },
      close(socket) {
        clearHandshakeTimer(socket.data.connectionId);
        const session = ownsCurrentSession(socket);
        if (!session) return;
        session.connectionId = null;
        session.socket = null;
        session.expiresAt = performance.now() + reconnectGraceMs;
        game.setPlayerConnected(session.playerId, false);
        publishSnapshot();
      },
    },
  });

  const timer = setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastTick) / 1000);
    lastTick = now;
    expireSessions(now);
    game.update(dt);
    for (const event of game.takePendingEvents()) {
      server.publish("game", JSON.stringify({ type: "event", event } satisfies ServerMessage));
    }
    snapshotAccumulator += dt;
    if (snapshotAccumulator >= 1 / 15) {
      snapshotAccumulator = 0;
      server.publish("game", JSON.stringify({ type: "snapshot", snapshot: game.getSnapshot() } satisfies ServerMessage));
    }
  }, 1000 / 30);

  return {
    game,
    server,
    stop: () => {
      stopping = true;
      clearInterval(timer);
      for (const handshakeTimer of handshakeTimers.values()) clearTimeout(handshakeTimer);
      handshakeTimers.clear();
      sessionsByToken.clear();
      server.stop(true);
    },
  };
}

if (import.meta.main) {
  const instance = createGameServer({ accelerated: Bun.env.DEBUG_SLICE === "1" });
  console.log(`Siegeheart listening on http://${instance.server.hostname}:${instance.server.port}${instance.game.accelerated ? " (accelerated)" : ""}`);
}
