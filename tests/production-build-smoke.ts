import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const builtServerUrl = new URL("../dist/server/index.js", import.meta.url).href;
const { createGameServer } = await import(builtServerUrl) as {
  createGameServer(options: { port: number; hostname: string }): {
    server: { port: number };
    stop(): void;
  };
};

const instance = createGameServer({ port: 0, hostname: "127.0.0.1" });
const origin = `http://127.0.0.1:${instance.server.port}`;

try {
  const htmlResponse = await fetch(`${origin}/`);
  assert.equal(htmlResponse.status, 200);
  assert.equal(htmlResponse.headers.get("cache-control"), "no-store");
  const html = await htmlResponse.text();
  const assetPath = html.match(/\/assets\/main-([a-f0-9]{16})\.js/)?.[0];
  assert.ok(assetPath, "production HTML must reference one fingerprinted client asset");

  const assetResponse = await fetch(`${origin}${assetPath}`);
  assert.equal(assetResponse.status, 200);
  assert.equal(assetResponse.headers.get("cache-control"), "public, max-age=31536000, immutable");
  const assetBytes = new Uint8Array(await assetResponse.arrayBuffer());
  const contentHash = createHash("sha256").update(assetBytes).digest("hex").slice(0, 16);
  assert.equal(assetPath, `/assets/main-${contentHash}.js`);

  assert.equal((await fetch(`${origin}/assets/main.js`)).status, 404);
  assert.equal((await fetch(`${origin}/assets/main-not-a-hash.js`)).status, 404);

  console.log(JSON.stringify({
    ok: true,
    assetPath,
    bytes: assetBytes.byteLength,
    fixedAssetStatus: 404,
  }));
} finally {
  instance.stop();
}
