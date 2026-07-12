import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(new URL("assets/", dist), { recursive: true });
await mkdir(new URL("assets/models/proof/", dist), { recursive: true });
await mkdir(new URL("server/", dist), { recursive: true });

const [client, server] = await Promise.all([
  Bun.build({
    entrypoints: [fileURLToPath(new URL("src/client/main.ts", root))],
    outdir: fileURLToPath(new URL("assets/", dist)),
    target: "browser",
    format: "esm",
    sourcemap: "none",
    minify: true,
  }),
  Bun.build({
    entrypoints: [fileURLToPath(new URL("src/server/index.ts", root))],
    outdir: fileURLToPath(new URL("server/", dist)),
    target: "bun",
    format: "esm",
    sourcemap: "external",
    minify: false,
  }),
]);

if (!client.success || !server.success) {
  for (const log of [...client.logs, ...server.logs]) console.error(log);
  process.exit(1);
}

const defenderProofSource = new URL("public/assets/models/proof/siegeheart-defender-proof.glb", root);
const defenderProofBytes = await readFile(defenderProofSource);
const defenderProofHash = createHash("sha256").update(defenderProofBytes).digest("hex").slice(0, 16);
const defenderProofName = `siegeheart-defender-proof-${defenderProofHash}.glb`;
const defenderProofPath = `/assets/models/proof/${defenderProofName}`;
await cp(defenderProofSource, new URL(`assets/models/proof/${defenderProofName}`, dist));

const clientBundle = new URL("assets/main.js", dist);
const clientSource = await readFile(clientBundle, "utf8");
const productionClientSource = clientSource.replaceAll(
  "/assets/models/proof/siegeheart-defender-proof.glb",
  defenderProofPath,
);
await writeFile(clientBundle, productionClientSource);
const clientBytes = Buffer.from(productionClientSource);
const clientHash = createHash("sha256").update(clientBytes).digest("hex").slice(0, 16);
const fingerprintedClientName = `main-${clientHash}.js`;
await rename(clientBundle, new URL(`assets/${fingerprintedClientName}`, dist));

const productionHtml = (await readFile(new URL("index.html", root), "utf8"))
  .replace("/assets/main.js", `/assets/${fingerprintedClientName}`);

await Promise.all([
  writeFile(new URL("index.html", dist), productionHtml),
  cp(new URL("src/client/style.css", root), new URL("style.css", dist)),
]);

console.log(`Built Siegeheart client ${fingerprintedClientName}, Defender proof ${defenderProofName}, and server into ${fileURLToPath(dist)}`);
