import { describe, test } from "bun:test";
import { HERO_IDS } from "../src/shared/game-data";
import type { HeroId } from "../src/shared/protocol";
import {
  NORMAL_SOLO_SEEDS,
  NORMAL_SOLO_TARGET_GOLD,
  NORMAL_SOLO_TARGET_GOLD_DEADLINE_SECONDS,
  runNormalSoloOpening,
  type NormalSoloResult,
} from "./support/normal-solo-controller";

interface ViabilityFloor {
  nexusAliveDefenseRuns: number;
  zeroDownRuns: number;
  medianNexusHp: number;
  meanNorthGateHp: number;
  totalDowns: number;
  meanKills: number;
  fundedByDeadlineRuns: number;
}

const VIABILITY_FLOORS: Record<HeroId, ViabilityFloor> = {
  warden: {
    nexusAliveDefenseRuns: 29,
    zeroDownRuns: 28,
    medianNexusHp: 700,
    meanNorthGateHp: 240,
    totalDowns: 2,
    meanKills: 195,
    fundedByDeadlineRuns: 30,
  },
  riftstalker: {
    nexusAliveDefenseRuns: 30,
    zeroDownRuns: 4,
    medianNexusHp: 700,
    meanNorthGateHp: 55,
    totalDowns: 35,
    meanKills: 175,
    fundedByDeadlineRuns: 30,
  },
  ashcaller: {
    nexusAliveDefenseRuns: 30,
    zeroDownRuns: 18,
    medianNexusHp: 700,
    meanNorthGateHp: 165,
    totalDowns: 12,
    meanKills: 185,
    fundedByDeadlineRuns: 30,
  },
  gravebinder: {
    nexusAliveDefenseRuns: 29,
    zeroDownRuns: 28,
    medianNexusHp: 700,
    meanNorthGateHp: 240,
    totalDowns: 2,
    meanKills: 200,
    fundedByDeadlineRuns: 30,
  },
};

interface ViabilitySummary extends ViabilityFloor {
  heroId: HeroId;
  completedRuns: number;
  intactGateRuns: number;
  meanFirstTargetGoldSeconds: number;
  latestFirstTargetGoldSeconds: number;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor((sorted.length - 1) / 2)]!;
}

function summarize(heroId: HeroId, results: NormalSoloResult[]): ViabilitySummary {
  const fundedTimes = results.flatMap((result) =>
    result.targetGoldReachedAt === null ? [] : [result.targetGoldReachedAt]
  );
  return {
    heroId,
    completedRuns: results.length,
    nexusAliveDefenseRuns: results.filter((result) => result.nexusAliveDefense).length,
    medianNexusHp: median(results.map((result) => result.nexusHp)),
    meanNorthGateHp: mean(results.map((result) => result.northGateHp)),
    intactGateRuns: results.filter(
      (result) => result.northGateHp > 0 && !result.northGateBreached,
    ).length,
    totalDowns: results.reduce((sum, result) => sum + result.downs, 0),
    zeroDownRuns: results.filter((result) => result.downs === 0).length,
    meanKills: mean(results.map((result) => result.kills)),
    fundedByDeadlineRuns: results.filter(
      (result) =>
        result.targetGoldReachedAt !== null &&
        result.targetGoldReachedAt <= NORMAL_SOLO_TARGET_GOLD_DEADLINE_SECONDS,
    ).length,
    meanFirstTargetGoldSeconds: mean(fundedTimes),
    latestFirstTargetGoldSeconds: Math.max(...fundedTimes),
  };
}

function diagnosticLine(summary: ViabilitySummary): string {
  return [
    summary.heroId.padEnd(11),
    `survive ${String(summary.nexusAliveDefenseRuns).padStart(2)}/${summary.completedRuns}`,
    `nexus p50 ${summary.medianNexusHp.toFixed(0).padStart(3)}`,
    `gate avg ${summary.meanNorthGateHp.toFixed(1).padStart(5)}`,
    `intact ${String(summary.intactGateRuns).padStart(2)}/${summary.completedRuns}`,
    `downs ${String(summary.totalDowns).padStart(2)}`,
    `clean ${String(summary.zeroDownRuns).padStart(2)}/${summary.completedRuns}`,
    `kills avg ${summary.meanKills.toFixed(1).padStart(5)}`,
    `60g<=75s ${String(summary.fundedByDeadlineRuns).padStart(2)}/${summary.completedRuns}`,
    `60g avg/max ${summary.meanFirstTargetGoldSeconds.toFixed(1)}/${summary.latestFirstTargetGoldSeconds.toFixed(1)}s`,
  ].join(" | ");
}

describe("normal-timing all-hero solo viability", () => {
  test("every hero can defend and fund a 60-gold first choice within its intended risk profile", () => {
    const summaries = HERO_IDS.map((heroId) => summarize(
      heroId,
      NORMAL_SOLO_SEEDS.map((seed) => runNormalSoloOpening(heroId, seed)),
    ));
    const failures: string[] = [];

    for (const summary of summaries) {
      const floor = VIABILITY_FLOORS[summary.heroId];
      if (summary.nexusAliveDefenseRuns < floor.nexusAliveDefenseRuns) {
        failures.push(
          `${summary.heroId}: ${summary.nexusAliveDefenseRuns} Nexus-alive defenses; needs ${floor.nexusAliveDefenseRuns}.`,
        );
      }
      if (summary.medianNexusHp < floor.medianNexusHp) {
        failures.push(
          `${summary.heroId}: median Nexus HP ${summary.medianNexusHp.toFixed(0)}; needs ${floor.medianNexusHp}.`,
        );
      }
      if (summary.zeroDownRuns < floor.zeroDownRuns) {
        failures.push(
          `${summary.heroId}: ${summary.zeroDownRuns} no-down runs; needs ${floor.zeroDownRuns}.`,
        );
      }
      if (summary.meanNorthGateHp < floor.meanNorthGateHp) {
        failures.push(
          `${summary.heroId}: mean North gate HP ${summary.meanNorthGateHp.toFixed(1)}; needs ${floor.meanNorthGateHp}.`,
        );
      }
      if (summary.totalDowns > floor.totalDowns) {
        failures.push(
          `${summary.heroId}: ${summary.totalDowns} downs; allows at most ${floor.totalDowns}.`,
        );
      }
      if (summary.meanKills < floor.meanKills) {
        failures.push(
          `${summary.heroId}: mean kills ${summary.meanKills.toFixed(1)}; needs ${floor.meanKills}.`,
        );
      }
      if (summary.fundedByDeadlineRuns < floor.fundedByDeadlineRuns) {
        failures.push(
          `${summary.heroId}: ${summary.fundedByDeadlineRuns} runs reached ${NORMAL_SOLO_TARGET_GOLD} gold by ${NORMAL_SOLO_TARGET_GOLD_DEADLINE_SECONDS}s; needs ${floor.fundedByDeadlineRuns}.`,
        );
      }
    }

    const riftstalker = summaries.find((summary) => summary.heroId === "riftstalker")!;
    const ashcaller = summaries.find((summary) => summary.heroId === "ashcaller")!;
    if (
      riftstalker.zeroDownRuns >= ashcaller.zeroDownRuns ||
      riftstalker.meanNorthGateHp >= ashcaller.meanNorthGateHp ||
      riftstalker.totalDowns <= ashcaller.totalDowns
    ) {
      failures.push(
        "Ranged identities collapsed: Riftstalker must remain more fragile than Ashcaller across clean runs, gate health, and downs.",
      );
    }

    if (failures.length > 0) {
      throw new Error([
        "Normal solo viability floor failed:",
        ...failures.map((failure) => `- ${failure}`),
        "",
        "Full 30-seed diagnostics:",
        ...summaries.map(diagnosticLine),
      ].join("\n"));
    }
  }, { timeout: 30_000 });
});
