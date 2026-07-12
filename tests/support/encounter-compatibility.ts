export type EncounterPhase =
  | "arming"
  | "defense"
  | "breach"
  | "push"
  | "victory"
  | "defeat";

export type EncounterTargetClass = "normal" | "elite" | "objective";

export type EncounterOutcome =
  | "damage"
  | "stagger"
  | "interrupt"
  | "displace"
  | "control";

export interface EncounterTelemetryEvent {
  at: number;
  sourcePlayerId: string;
  actionId: string;
  targetId: string;
  targetClass: EncounterTargetClass;
  outcome: EncounterOutcome;
  magnitude?: number;
  duration?: number;
}

export interface EncounterPlayerFrame {
  id: string;
  hp: number;
  maxHp: number;
  downed: boolean;
}

export interface EncounterLaneFrame {
  lane: string;
  gateHp: number;
  gateMaxHp: number;
  breached: boolean;
  /** Threats inside the gate-relative danger band defined by the test driver. */
  dangerBandThreats: number;
}

export interface EncounterFrame {
  at: number;
  phase: EncounterPhase;
  players: readonly EncounterPlayerFrame[];
  lanes: readonly EncounterLaneFrame[];
  nexusHp: number;
  nexusMaxHp: number;
  riftHeartHp: number;
  riftHeartMaxHp: number;
}

export interface ContributionSummary {
  damage: Record<EncounterTargetClass, number>;
  stagger: Record<EncounterTargetClass, number>;
  interrupts: Record<EncounterTargetClass, number>;
  displacements: Record<EncounterTargetClass, number>;
  controlApplications: Record<EncounterTargetClass, number>;
  controlSeconds: Record<EncounterTargetClass, number>;
  outcomeEventsByAction: Record<string, number>;
}

export interface PressureEpisode {
  lane: string;
  startedAt: number;
  recoveredAt: number;
  recoverySeconds: number;
  gateHpLost: number;
  breached: boolean;
}

export interface EncounterRunSummary {
  outcome: "victory" | "defeat" | "incomplete";
  durationSeconds: number;
  phaseStartedAt: Partial<Record<EncounterPhase, number>>;
  phaseDurations: Partial<Record<EncounterPhase, number>>;
  nexusHpLost: number;
  laneGateHpLost: Record<string, number>;
  pressureEpisodes: PressureEpisode[];
  openPressureEpisodes: Array<Omit<PressureEpisode, "recoveredAt" | "recoverySeconds">>;
  playerDowns: Record<string, number>;
  playerMinimumHpRatio: Record<string, number>;
  contribution: Record<string, ContributionSummary>;
}

export interface PublicEncounterSnapshotLike {
  phase: EncounterPhase;
  phaseElapsed: number;
  players: readonly EncounterPlayerFrame[];
  gates: ReadonlyArray<{
    lane: string;
    position: { x: number; z: number };
    hp: number;
    maxHp: number;
    breached: boolean;
  }>;
  enemies: ReadonlyArray<{
    lane: string;
    position: { x: number; z: number };
  }>;
  nexus: { hp: number; maxHp: number };
  riftHeart: { hp: number; maxHp: number };
}

/**
 * Converts the structural, public snapshot fields into an encounter frame.
 * The danger band is a measurement boundary around each gate, not a gameplay
 * range and not an instruction to the server director.
 */
export function encounterFrameFromPublicSnapshot(
  snapshot: PublicEncounterSnapshotLike,
  runElapsed: number,
  dangerBandRadius: number,
): EncounterFrame {
  if (dangerBandRadius < 0) throw new Error("Danger-band radius cannot be negative.");
  return {
    at: runElapsed,
    phase: snapshot.phase,
    players: snapshot.players,
    lanes: snapshot.gates.map((gate) => ({
      lane: gate.lane,
      gateHp: gate.hp,
      gateMaxHp: gate.maxHp,
      breached: gate.breached,
      dangerBandThreats: snapshot.enemies.filter((enemy) =>
        enemy.lane === gate.lane &&
        Math.hypot(
          enemy.position.x - gate.position.x,
          enemy.position.z - gate.position.z,
        ) <= dangerBandRadius
      ).length,
    })),
    nexusHp: snapshot.nexus.hp,
    nexusMaxHp: snapshot.nexus.maxHp,
    riftHeartHp: snapshot.riftHeart.hp,
    riftHeartMaxHp: snapshot.riftHeart.maxHp,
  };
}

interface ActivePressureEpisode {
  lane: string;
  startedAt: number;
  startedGateHp: number;
  latestGateHp: number;
  breached: boolean;
}

function zeroByTargetClass(): Record<EncounterTargetClass, number> {
  return { normal: 0, elite: 0, objective: 0 };
}

function emptyContribution(): ContributionSummary {
  return {
    damage: zeroByTargetClass(),
    stagger: zeroByTargetClass(),
    interrupts: zeroByTargetClass(),
    displacements: zeroByTargetClass(),
    controlApplications: zeroByTargetClass(),
    controlSeconds: zeroByTargetClass(),
    outcomeEventsByAction: {},
  };
}

/**
 * Pure consumer for authoritative encounter observations. It owns no gameplay
 * rules, uses no RNG, and can be fed by a test-only server adapter without
 * changing the public multiplayer protocol.
 */
export class EncounterCompatibilityRecorder {
  private firstFrame: EncounterFrame | null = null;
  private lastFrame: EncounterFrame | null = null;
  private readonly phaseStartedAt: Partial<Record<EncounterPhase, number>> = {};
  private readonly phaseDurations: Partial<Record<EncounterPhase, number>> = {};
  private readonly startingGateHp = new Map<string, number>();
  private readonly playerDowns = new Map<string, number>();
  private readonly playerWasDown = new Map<string, boolean>();
  private readonly playerMinimumHpRatio = new Map<string, number>();
  private readonly contribution = new Map<string, ContributionSummary>();
  private readonly activePressure = new Map<string, ActivePressureEpisode>();
  private readonly pressureEpisodes: PressureEpisode[] = [];
  private lastEventAt: number | null = null;

  recordFrame(frame: EncounterFrame): void {
    if (this.lastFrame && frame.at < this.lastFrame.at) {
      throw new Error("Encounter frames must be recorded in chronological order.");
    }

    if (!this.firstFrame) this.firstFrame = frame;
    if (this.phaseStartedAt[frame.phase] === undefined) this.phaseStartedAt[frame.phase] = frame.at;
    if (this.lastFrame && this.lastFrame.phase !== frame.phase) {
      this.phaseDurations[this.lastFrame.phase] =
        frame.at - (this.phaseStartedAt[this.lastFrame.phase] ?? this.lastFrame.at);
    }

    for (const player of frame.players) {
      const wasDown = this.playerWasDown.get(player.id) ?? false;
      if (!this.playerDowns.has(player.id)) this.playerDowns.set(player.id, 0);
      if (player.downed && !wasDown) {
        this.playerDowns.set(player.id, (this.playerDowns.get(player.id) ?? 0) + 1);
      }
      this.playerWasDown.set(player.id, player.downed);
      const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 0;
      this.playerMinimumHpRatio.set(
        player.id,
        Math.min(this.playerMinimumHpRatio.get(player.id) ?? 1, hpRatio),
      );
      if (!this.contribution.has(player.id)) this.contribution.set(player.id, emptyContribution());
    }

    for (const lane of frame.lanes) {
      if (!this.startingGateHp.has(lane.lane)) this.startingGateHp.set(lane.lane, lane.gateHp);
      const active = this.activePressure.get(lane.lane);
      if (lane.dangerBandThreats > 0) {
        if (active) {
          active.latestGateHp = lane.gateHp;
          active.breached ||= lane.breached;
        } else {
          this.activePressure.set(lane.lane, {
            lane: lane.lane,
            startedAt: frame.at,
            startedGateHp: lane.gateHp,
            latestGateHp: lane.gateHp,
            breached: lane.breached,
          });
        }
      } else if (active) {
        this.pressureEpisodes.push({
          lane: lane.lane,
          startedAt: active.startedAt,
          recoveredAt: frame.at,
          recoverySeconds: frame.at - active.startedAt,
          gateHpLost: Math.max(0, active.startedGateHp - lane.gateHp),
          breached: active.breached || lane.breached,
        });
        this.activePressure.delete(lane.lane);
      }
    }

    this.lastFrame = frame;
  }

  recordEvent(event: EncounterTelemetryEvent): void {
    if (this.lastEventAt !== null && event.at < this.lastEventAt) {
      throw new Error("Encounter telemetry events must be recorded in chronological order.");
    }
    if (event.magnitude !== undefined && event.magnitude < 0) {
      throw new Error("Encounter event magnitude cannot be negative.");
    }
    if (event.duration !== undefined && event.duration < 0) {
      throw new Error("Encounter event duration cannot be negative.");
    }
    const summary = this.contribution.get(event.sourcePlayerId) ?? emptyContribution();
    this.contribution.set(event.sourcePlayerId, summary);
    this.lastEventAt = event.at;
    summary.outcomeEventsByAction[event.actionId] =
      (summary.outcomeEventsByAction[event.actionId] ?? 0) + 1;
    const magnitude = event.magnitude ?? 1;
    if (event.outcome === "damage") summary.damage[event.targetClass] += magnitude;
    if (event.outcome === "stagger") summary.stagger[event.targetClass] += magnitude;
    if (event.outcome === "interrupt") summary.interrupts[event.targetClass] += 1;
    if (event.outcome === "displace") summary.displacements[event.targetClass] += magnitude;
    if (event.outcome === "control") {
      summary.controlApplications[event.targetClass] += 1;
      summary.controlSeconds[event.targetClass] += event.duration ?? 0;
    }
  }

  finish(at = this.lastFrame?.at ?? 0): EncounterRunSummary {
    if (!this.firstFrame || !this.lastFrame) throw new Error("Cannot finish an encounter run without frames.");
    this.phaseDurations[this.lastFrame.phase] =
      at - (this.phaseStartedAt[this.lastFrame.phase] ?? this.lastFrame.at);

    const laneGateHpLost: Record<string, number> = {};
    for (const lane of this.lastFrame.lanes) {
      laneGateHpLost[lane.lane] = Math.max(
        0,
        (this.startingGateHp.get(lane.lane) ?? lane.gateHp) - lane.gateHp,
      );
    }

    return {
      outcome: this.lastFrame.phase === "victory" || this.lastFrame.phase === "defeat"
        ? this.lastFrame.phase
        : "incomplete",
      durationSeconds: at - this.firstFrame.at,
      phaseStartedAt: { ...this.phaseStartedAt },
      phaseDurations: { ...this.phaseDurations },
      nexusHpLost: Math.max(0, this.firstFrame.nexusHp - this.lastFrame.nexusHp),
      laneGateHpLost,
      pressureEpisodes: [...this.pressureEpisodes],
      openPressureEpisodes: [...this.activePressure.values()].map((episode) => ({
        lane: episode.lane,
        startedAt: episode.startedAt,
        gateHpLost: Math.max(0, episode.startedGateHp - episode.latestGateHp),
        breached: episode.breached,
      })),
      playerDowns: Object.fromEntries(this.playerDowns),
      playerMinimumHpRatio: Object.fromEntries(this.playerMinimumHpRatio),
      contribution: Object.fromEntries(this.contribution),
    };
  }
}
