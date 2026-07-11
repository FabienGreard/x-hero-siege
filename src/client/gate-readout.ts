import type { GateSnapshot, LaneId } from "../shared/protocol";

const GATE_LANE_NAMES: Record<LaneId, string> = {
  north: "North",
  east: "East",
  south: "South",
  west: "West",
};

export type GateReadoutTone = "sealed" | "healthy" | "damaged" | "critical" | "fallen";

export interface GateReadout {
  ratio: number;
  percent: number;
  label: "SEALED" | "FALLEN" | `${number}%`;
  tone: GateReadoutTone;
  title: string;
  ariaLabel: string;
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function threatSummary(threatCount: number): string {
  const count = Math.floor(finiteNonNegative(threatCount));
  return `${count} ${count === 1 ? "threat" : "threats"}.`;
}

/** One canonical, snapshot-derived answer for every gate-health presentation. */
export function deriveGateReadout(
  gate: GateSnapshot,
  active: boolean,
  threatCount: number,
): GateReadout {
  const maxHp = gate.maxHp > 0 && Number.isFinite(gate.maxHp) ? gate.maxHp : 0;
  const hp = maxHp > 0
    ? Math.min(maxHp, finiteNonNegative(gate.hp))
    : 0;
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  const percent = ratio > 0 ? Math.max(1, Math.ceil(ratio * 100)) : 0;
  const laneName = `${GATE_LANE_NAMES[gate.lane]} Gate`;
  const threats = threatSummary(threatCount);

  let label: GateReadout["label"];
  let tone: GateReadoutTone;
  let title: string;

  if (gate.breached) {
    label = "FALLEN";
    tone = "fallen";
    title = `${laneName}: fallen. ${threats}`;
  } else if (!active) {
    label = "SEALED";
    tone = "sealed";
    title = `${laneName}: sealed. ${threats}`;
  } else {
    label = `${percent}%`;
    tone = ratio <= 0.25 ? "critical" : ratio <= 0.6 ? "damaged" : "healthy";
    title = `${laneName}: ${Math.ceil(hp)} of ${Math.ceil(maxHp)} health, ${percent}%. ${threats}`;
  }

  return {
    ratio,
    percent,
    label,
    tone,
    title,
    ariaLabel: title,
  };
}
