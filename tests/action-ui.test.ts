import { describe, expect, test } from "bun:test";
import { arsenalCloseFocusTarget, deriveDodgeReadout, deriveVendorPrompt } from "../src/client/action-ui";

describe("action UI contract", () => {
  test("dodge readout exposes accepted ready and recharge truth without color dependence", () => {
    expect(deriveDodgeReadout({ charges: 1, rechargeRemaining: 0, rechargeDuration: 6 })).toEqual({
      ready: true,
      progress: 0,
      status: "READY",
      cooldownText: "",
      ariaLabel: "Space, Dodge, ready.",
    });
    expect(deriveDodgeReadout({ charges: 0, rechargeRemaining: 3.25, rechargeDuration: 6 })).toEqual({
      ready: false,
      progress: 3.25 / 6,
      status: "RECHARGE",
      cooldownText: "3.3",
      ariaLabel: "Space, Dodge, 3.3 seconds until ready.",
    });
  });

  test("dodge countdown is an on-demand non-live group", async () => {
    const markup = await Bun.file(new URL("../index.html", import.meta.url)).text();
    const readout = markup.match(/<div id="dodge-readout"[^>]*>/)?.[0];
    expect(readout).toContain('role="group"');
    expect(readout).not.toContain("aria-live");
    expect(readout).not.toContain('role="status"');
  });

  test("physical Arsenal prompt changes from browse to close while open", () => {
    expect(deriveVendorPrompt({ vendorName: "Citadel Arsenal", arsenalOpen: false })).toContain("BROWSE");
    expect(deriveVendorPrompt({ vendorName: "Citadel Arsenal", arsenalOpen: true })).toBe("<kbd>B</kbd> CLOSE · CITADEL ARSENAL");
  });

  test("accepted purchase restores battlefield focus while ordinary close restores its invoker", () => {
    expect(arsenalCloseFocusTarget(true)).toBe("battlefield");
    expect(arsenalCloseFocusTarget(false)).toBe("previous");
  });

  test("battlefield focus target is semantic and never inside the aria-hidden renderer viewport", async () => {
    const markup = await Bun.file(new URL("../index.html", import.meta.url)).text();
    expect(markup).toContain('<main id="game-shell" tabindex="-1" aria-label="Siegeheart battlefield and game interface">');
    expect(markup).toContain('<div id="viewport" aria-hidden="true"></div>');
  });
});
