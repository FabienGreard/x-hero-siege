export interface DodgeReadout {
  ariaLabel: string;
  cooldownText: string;
  ready: boolean;
  status: "READY" | "RECHARGE";
  progress: number;
}

export function deriveDodgeReadout(input: {
  charges: number;
  rechargeRemaining: number;
  rechargeDuration: number;
}): DodgeReadout {
  const remaining = Math.max(0, input.rechargeRemaining);
  const ready = input.charges > 0;
  const progress = ready || input.rechargeDuration <= 0
    ? 0
    : Math.min(1, remaining / input.rechargeDuration);
  return {
    ready,
    progress,
    status: ready ? "READY" : "RECHARGE",
    cooldownText: ready ? "" : remaining.toFixed(remaining >= 10 ? 0 : 1),
    ariaLabel: ready
      ? "Space, Dodge, ready."
      : `Space, Dodge, ${remaining.toFixed(1)} seconds until ready.`,
  };
}

export function deriveVendorPrompt(input: {
  vendorName: string;
  arsenalOpen: boolean;
}): string {
  return `<kbd>B</kbd> ${input.arsenalOpen ? "CLOSE" : "BROWSE"} · ${input.vendorName.toUpperCase()}`;
}

export function arsenalCloseFocusTarget(acceptedWeaponPurchase: boolean): "battlefield" | "previous" {
  return acceptedWeaponPurchase ? "battlefield" : "previous";
}
