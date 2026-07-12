import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const prefix = process.argv[2];
if (!prefix) throw new Error("Usage: bun scripts/process-visual-evidence.ts <plate-prefix>");

const absolutePrefix = resolve(prefix);
const metadata = JSON.parse(await readFile(`${absolutePrefix}-metadata.json`, "utf8")) as {
  playerScreen: { x: number; y: number };
  darkBounds: { minX: number; minY: number; maxX: number; maxY: number; pixels: number };
};
const cropSize = 360;
const cropX = Math.round(metadata.playerScreen.x - cropSize / 2);
const cropY = Math.round(metadata.playerScreen.y - cropSize / 2);
const silhouetteCropWidth = 300;
const silhouetteCropHeight = 240;
const silhouetteCropX = Math.round(metadata.playerScreen.x - silhouetteCropWidth / 2);
const silhouetteCropY = Math.round(metadata.playerScreen.y - silhouetteCropHeight / 2);
if (
  Math.abs(silhouetteCropX + silhouetteCropWidth / 2 - metadata.playerScreen.x) > 1
  || Math.abs(silhouetteCropY + silhouetteCropHeight / 2 - metadata.playerScreen.y) > 1
) {
  throw new Error("Silhouette crop center does not match the recorded player coordinate.");
}
if (Math.abs(cropX + cropSize / 2 - metadata.playerScreen.x) > 1 || Math.abs(cropY + cropSize / 2 - metadata.playerScreen.y) > 1) {
  throw new Error("Crop center does not match the recorded player coordinate.");
}
if (metadata.darkBounds.pixels < 100 ||
  metadata.darkBounds.maxX < cropX || metadata.darkBounds.minX > cropX + cropSize ||
  metadata.darkBounds.maxY < cropY || metadata.darkBounds.minY > cropY + cropSize) {
  throw new Error("Recorded silhouette bounds do not intersect the player crop.");
}

function ffmpeg(args: string[]): string {
  const result = Bun.spawnSync([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr));
  return new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr);
}

const fullPath = absolutePrefix + ".png";
const grayscalePath = absolutePrefix + "-grayscale.png";
const cropPath = absolutePrefix + "-crop-2x.png";
const silhouetteFullPath = absolutePrefix + "-silhouette-full.png";
const silhouettePath = absolutePrefix + "-silhouette.png";

ffmpeg(["-i", fullPath, "-vf", "format=gray", grayscalePath]);
ffmpeg([
  "-i", fullPath,
  "-vf", `crop=${cropSize}:${cropSize}:${cropX}:${cropY},scale=720:720:flags=neighbor`,
  cropPath,
]);
ffmpeg([
  "-i", silhouetteFullPath,
  // The full silhouette render is a processing intermediate. Keep the full
  // horizontal weapon arc, while excluding the known off-centre lower
  // health/selection artifact from the retained local-player proof crop.
  "-vf", `crop=${silhouetteCropWidth}:${silhouetteCropHeight}:${silhouetteCropX}:${silhouetteCropY}`,
  silhouettePath,
]);

const signal = ffmpeg([
  "-i", silhouettePath,
  "-vf", "signalstats,metadata=print:file=-",
  "-f", "null", "-",
]);
const yMin = Number(signal.match(/lavfi\.signalstats\.YMIN=([0-9.]+)/)?.[1]);
const yMax = Number(signal.match(/lavfi\.signalstats\.YMAX=([0-9.]+)/)?.[1]);
if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMin > 16 || yMax < 235) {
  throw new Error(`Silhouette crop lacks validated black and white pixels (YMIN=${yMin}, YMAX=${yMax}).`);
}

console.log(JSON.stringify({ ok: true, prefix, crop: { x: cropX, y: cropY, size: cropSize }, darkBounds: metadata.darkBounds, yMin, yMax }));
