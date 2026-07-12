import { describe, expect, test } from "bun:test";
import { armingKeyboardAction, deriveArmingUiState, deriveArsenalRespecView, reconcileArsenalOpen } from "../src/client/arming-ui";

describe("arming UI view model", () => {
  test("uses only purchasing, waiting, and countdown while arming", () => {
    expect(deriveArmingUiState({ phase: "lobby", armed: false, countdownEndsAt: null })).toBeNull();
    expect(deriveArmingUiState({ phase: "arming", armed: false, countdownEndsAt: null })).toBe("purchasing");
    expect(deriveArmingUiState({ phase: "arming", armed: true, countdownEndsAt: null })).toBe("waiting");
    expect(deriveArmingUiState({ phase: "arming", armed: true, countdownEndsAt: 123 })).toBe("countdown");
  });

  test("later Arsenal visits expose exact free and paid reset states without remote mutation", () => {
    expect(deriveArsenalRespecView({ freeRespecUsed: false, gold: 0, inRange: true, pending: false })).toEqual({
      price: 0, label: "RESET MASTERY · FIRST FREE", disabled: false,
    });
    expect(deriveArsenalRespecView({ freeRespecUsed: true, gold: 60, inRange: true, pending: false })).toEqual({
      price: 60, label: "RESET MASTERY · 60 GOLD", disabled: false,
    });
    expect(deriveArsenalRespecView({ freeRespecUsed: true, gold: 100, inRange: false, pending: false }).disabled).toBe(true);
    expect(deriveArsenalRespecView({ freeRespecUsed: true, gold: 100, inRange: true, pending: true }).label).toBe("RESETTING…");
  });

  test("B focuses only the in-range Arsenal and close restores the previous focus", () => {
    expect(armingKeyboardAction({ phase: "arming", arsenalInRange: false, purchaseFocused: false })).toBeNull();
    expect(armingKeyboardAction({ phase: "arming", arsenalInRange: true, purchaseFocused: false })).toBe("focus_purchase");
    expect(armingKeyboardAction({ phase: "arming", arsenalInRange: true, purchaseFocused: true })).toBe("restore_focus");
    expect(armingKeyboardAction({ phase: "defense", arsenalInRange: true, purchaseFocused: false })).toBeNull();
  });

  test("physical Arsenal panel transitions hidden to open to pending or accepted and closes remotely", () => {
    expect(reconcileArsenalOpen({ phase: "arming", arsenalInRange: true, open: false })).toBe(false);
    expect(reconcileArsenalOpen({ phase: "arming", arsenalInRange: true, open: true })).toBe(true);
    expect(deriveArmingUiState({ phase: "arming", armed: false, countdownEndsAt: null })).toBe("purchasing");
    expect(deriveArmingUiState({ phase: "arming", armed: true, countdownEndsAt: null })).toBe("waiting");
    expect(reconcileArsenalOpen({ phase: "arming", arsenalInRange: false, open: true })).toBe(false);
    expect(reconcileArsenalOpen({ phase: "defense", arsenalInRange: true, open: true })).toBe(true);
    expect(reconcileArsenalOpen({ phase: "victory", arsenalInRange: true, open: true })).toBe(false);
  });
});
