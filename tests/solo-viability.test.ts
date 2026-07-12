import { describe, expect, test } from "bun:test";
import {
  NORMAL_SOLO_SEEDS,
  NORMAL_SOLO_TARGET_GOLD_DEADLINE_SECONDS,
  runNormalSoloOpening,
} from "./support/normal-solo-controller";

describe("normal-timing Defender solo viability", () => {
  test("the Greatsword Defender can hold the opening and fund a first run item", () => {
    const results = NORMAL_SOLO_SEEDS.map((seed) => runNormalSoloOpening("defender", seed));
    expect(results).toHaveLength(30);
    expect(results.filter((result) => result.nexusAliveDefense).length).toBeGreaterThanOrEqual(28);
    expect(results.filter((result) => result.targetGoldReachedAt !== null && result.targetGoldReachedAt <= NORMAL_SOLO_TARGET_GOLD_DEADLINE_SECONDS).length).toBeGreaterThanOrEqual(28);
    expect(results.reduce((sum, result) => sum + result.kills, 0) / results.length).toBeGreaterThan(120);
    expect(results.reduce((sum, result) => sum + result.downs, 0)).toBeLessThanOrEqual(8);
  }, { timeout: 30_000 });
});
