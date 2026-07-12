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

  const clientSource = new TextDecoder().decode(assetBytes);
  const defenderPath = clientSource.match(/\/assets\/models\/proof\/siegeheart-defender-proof-([a-f0-9]{16})\.glb/)?.[0];
  assert.ok(defenderPath, "production client must reference one fingerprinted Defender proof asset");
  const defenderResponse = await fetch(`${origin}${defenderPath}`);
  assert.equal(defenderResponse.status, 200);
  assert.equal(defenderResponse.headers.get("content-type"), "model/gltf-binary");
  assert.equal(defenderResponse.headers.get("cache-control"), "public, max-age=31536000, immutable");
  const defenderBytes = new Uint8Array(await defenderResponse.arrayBuffer());
  const defenderHash = createHash("sha256").update(defenderBytes).digest("hex").slice(0, 16);
  assert.equal(defenderPath, `/assets/models/proof/siegeheart-defender-proof-${defenderHash}.glb`);

  assert.equal((await fetch(`${origin}/assets/main.js`)).status, 404);
  assert.equal((await fetch(`${origin}/assets/main-not-a-hash.js`)).status, 404);
  assert.equal((await fetch(`${origin}/assets/models/proof/siegeheart-defender-proof.glb`)).status, 404);
  assert.equal((await fetch(`${origin}/assets/models/proof/siegeheart-defender-proof-not-a-hash.glb`)).status, 404);

  console.log(JSON.stringify({
    ok: true,
    assetPath,
    bytes: assetBytes.byteLength,
    defenderPath,
    defenderBytes: defenderBytes.byteLength,
    fixedAssetStatus: 404,
  }));
} finally {
  instance.stop();
}
