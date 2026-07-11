import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(new URL("assets/", dist), { recursive: true });
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

const clientBundle = new URL("assets/main.js", dist);
const clientBytes = await readFile(clientBundle);
const clientHash = createHash("sha256").update(clientBytes).digest("hex").slice(0, 16);
const fingerprintedClientName = `main-${clientHash}.js`;
await rename(clientBundle, new URL(`assets/${fingerprintedClientName}`, dist));

const productionHtml = (await readFile(new URL("index.html", root), "utf8"))
  .replace("/assets/main.js", `/assets/${fingerprintedClientName}`);

await Promise.all([
  writeFile(new URL("index.html", dist), productionHtml),
  cp(new URL("src/client/style.css", root), new URL("style.css", dist)),
]);

console.log(`Built Siegeheart client ${fingerprintedClientName} and server into ${fileURLToPath(dist)}`);
