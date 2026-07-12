import { describe, expect, test } from "bun:test";
import { deriveLobbyPartyRows } from "../src/client/lobby-party-ui";

describe("Plate 5 lobby party clarity", () => {
  test("renders four duplicate Defenders with public readiness, connection, accents, and non-color markers", () => {
    const rows = deriveLobbyPartyRows([
      { id: "p1", name: "Aegis", connected: true, ready: true, accentId: "defender-1" },
      { id: "p2", name: "Bastion", connected: true, ready: false, accentId: "defender-2" },
      { id: "p3", name: "Cairn", connected: false, ready: true, accentId: "defender-3" },
      { id: "p4", name: "Dawn", connected: true, ready: true, accentId: "defender-4" },
    ], "p1");

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.name)).toEqual(["Aegis", "Bastion", "Cairn", "Dawn"]);
    expect(new Set(rows.map((row) => row.accent)).size).toBe(4);
    expect(rows.map((row) => row.marker)).toEqual(["✓", "○", "↻", "✓"]);
    expect(rows.map((row) => row.status)).toEqual([
      "READY · CONNECTED",
      "NOT READY · CONNECTED",
      "RECONNECTING",
      "READY · CONNECTED",
    ]);
    expect(rows[0]?.isLocal).toBe(true);
    expect(rows.every((row) => row.ariaLabel.includes("Citadel Defender"))).toBe(true);
  });

  test("exposes the semantic lobby list and reserves arming feed space below four party rows", async () => {
    const markup = await Bun.file(new URL("../index.html", import.meta.url)).text();
    const styles = await Bun.file(new URL("../src/client/style.css", import.meta.url)).text();

    expect(markup).toContain('<ol id="lobby-party-readiness" class="lobby-party-readiness" aria-label="Defender readiness"></ol>');
    expect(styles).toMatch(/#game-shell\[data-game-phase="arming"\] \.combat-feed\s*\{\s*top: 204px;/);
    expect(styles).toMatch(/\.lobby-party-readiness\s*\{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  });
});
