import type { GamePhase } from "../shared/protocol";

export type ArmingUiState = "purchasing" | "waiting" | "countdown";

export function deriveArmingUiState(input: {
  phase: GamePhase;
  armed: boolean;
  countdownEndsAt: number | null;
}): ArmingUiState | null {
  if (input.phase !== "arming") return null;
  if (input.countdownEndsAt !== null) return "countdown";
  return input.armed ? "waiting" : "purchasing";
}

export function shouldCloseArsenalAfterWeaponAcceptance(pending: boolean, armed: boolean): boolean {
  return pending && armed;
}

export function armingKeyboardAction(input: {
  phase: GamePhase;
  arsenalInRange: boolean;
  purchaseFocused: boolean;
}): "focus_purchase" | "restore_focus" | null {
  if (input.phase !== "arming") return null;
  if (input.purchaseFocused) return "restore_focus";
  return input.arsenalInRange ? "focus_purchase" : null;
}

export function reconcileArsenalOpen(input: {
  phase: GamePhase;
  arsenalInRange: boolean;
  open: boolean;
}): boolean {
  const active = input.phase === "arming" || input.phase === "defense" || input.phase === "breach" || input.phase === "push";
  return input.open && active && input.arsenalInRange;
}

export function deriveArsenalRespecView(input: {
  freeRespecUsed: boolean;
  gold: number;
  inRange: boolean;
  pending: boolean;
}): { price: 0 | 60; label: string; disabled: boolean } {
  const price = input.freeRespecUsed ? 60 : 0;
  return {
    price,
    label: input.pending ? "RESETTING…" : price === 0 ? "RESET MASTERY · FIRST FREE" : "RESET MASTERY · 60 GOLD",
    disabled: !input.inRange || input.pending || input.gold < price,
  };
}
