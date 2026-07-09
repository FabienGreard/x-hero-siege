import { GameWorld } from "./game";
import { parseClientMessage, type ServerMessage } from "../shared/protocol";
import { fileURLToPath } from "node:url";

interface SocketData {
  playerId: string;
}

interface CreateServerOptions {
  port?: number;
  hostname?: string;
  accelerated?: boolean;
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
  let lastTick = performance.now();
  let snapshotAccumulator = 0;

  const server = Bun.serve<SocketData>({
    port: options.port ?? Number(Bun.env.PORT ?? 3000),
    hostname: options.hostname ?? Bun.env.HOST ?? "0.0.0.0",
    async fetch(request, bunServer) {
      const url = new URL(request.url);

      if (url.pathname === "/ws") {
        if (url.searchParams.get("debug") === "1" && game.phase === "lobby" && game.players.size === 0) {
          game.reset(true);
        }
        const upgraded = bunServer.upgrade(request, {
          data: { playerId: crypto.randomUUID() },
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

      if (url.pathname === "/assets/main.js") {
        if (runningBuiltServer) {
          return new Response(Bun.file(new URL("assets/main.js", builtRoot)), {
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

      return new Response("Not found", { status: 404 });
    },
    websocket: {
      open(socket) {
        const result = game.addPlayer(socket.data.playerId, `Hero ${game.players.size + 1}`);
        if (!result.ok) {
          socket.send(JSON.stringify({ type: "error", code: result.code!, message: result.message! } satisfies ServerMessage));
          socket.close(1013, result.message);
          return;
        }
        socket.subscribe("game");
        socket.send(JSON.stringify({
          type: "welcome",
          playerId: socket.data.playerId,
          websocketPath: "/ws",
          snapshot: game.getSnapshot(),
        } satisfies ServerMessage));
        server.publish("game", JSON.stringify({ type: "snapshot", snapshot: game.getSnapshot() } satisfies ServerMessage));
      },
      message(socket, raw) {
        const message = parseClientMessage(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
        if (!message) {
          socket.send(JSON.stringify({ type: "error", code: "BAD_MESSAGE", message: "Malformed client message." } satisfies ServerMessage));
          return;
        }
        const result = game.handleMessage(socket.data.playerId, message);
        if (!result.ok) {
          socket.send(JSON.stringify({ type: "error", code: result.code!, message: result.message! } satisfies ServerMessage));
        } else if (result.pong) {
          socket.send(JSON.stringify({ type: "pong", ...result.pong } satisfies ServerMessage));
        }
      },
      close(socket) {
        game.removePlayer(socket.data.playerId);
        server.publish("game", JSON.stringify({ type: "snapshot", snapshot: game.getSnapshot() } satisfies ServerMessage));
      },
    },
  });

  const timer = setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastTick) / 1000);
    lastTick = now;
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
      clearInterval(timer);
      server.stop(true);
    },
  };
}

if (import.meta.main) {
  const instance = createGameServer({ accelerated: Bun.env.DEBUG_SLICE === "1" });
  console.log(`Siegeheart listening on http://${instance.server.hostname}:${instance.server.port}${instance.game.accelerated ? " (accelerated)" : ""}`);
}
