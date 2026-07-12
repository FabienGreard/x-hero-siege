import { describe, expect, test } from "bun:test";
import type { AuthoritativeTelemetryEvent } from "../src/server/game";
import type { SkillId } from "../src/shared/weapon-data";
import { configureGreatsword, createArmedDefenders, spawnTestEnemy } from "./support/defender-fixture";
import { VENDOR_DEFINITIONS } from "../src/shared/armory-data";

const aim = { x: 0, z: -1 } as const;
type TestAim = { readonly x: number; readonly z: number };

function resolve(game: ReturnType<typeof createArmedDefenders>, skillId: SkillId): void {
  (game as unknown as { resolveGreatswordSkill(player: unknown, skillId: SkillId, aim: TestAim): void })
    .resolveGreatswordSkill(game.players.get("p1")!, skillId, aim);
}

function enemy(game: ReturnType<typeof createArmedDefenders>, id: string) {
  return (game as unknown as { enemies: Map<string, { hp: number; maxHp: number; position: { x: number; z: number }; staggerFor: number; exposedFor: number; elite: boolean }> }).enemies.get(id)!;
}

describe("authoritative Greatsword mechanics", () => {
  test("Cleave applies Honed Arc, Follow Through, and equipped-only Sundering Edge", () => {
    const game = createArmedDefenders();
    configureGreatsword(game, "p1", ["cleave", "honed_arc", "follow_through", "sundering_edge"], { ability1: "cleave" });
    const first = spawnTestEnemy(game, "imp", { x: 0, z: -4 });
    const wide = spawnTestEnemy(game, "imp", { x: 4.8, z: -4 });
    enemy(game, first).hp = enemy(game, first).maxHp = 500;
    enemy(game, wide).hp = enemy(game, wide).maxHp = 500;
    resolve(game, "cleave");
    expect(enemy(game, first).exposedFor).toBe(3);
    expect(enemy(game, wide).hp).toBeLessThan(enemy(game, wide).maxHp);
    expect(game.players.get("p1")!.skillRecoveryMultiplier).toBe(0.55);

    configureGreatsword(game, "p1", ["cleave", "sundering_edge"], { ability1: null });
    enemy(game, first).exposedFor = 0;
    resolve(game, "cleave");
    expect(enemy(game, first).exposedFor).toBe(0);
  });

  test("Whirlwind and Endless Motion unfold in deterministic authoritative time", () => {
    const events: AuthoritativeTelemetryEvent[] = [];
    const game = createArmedDefenders(1, { telemetry: (event) => events.push(event) });
    configureGreatsword(game, "p1", ["whirlwind", "endless_motion"], { ability1: "whirlwind" });
    const id = spawnTestEnemy(game, "brute", { x: 0, z: -3 });
    resolve(game, "whirlwind");
    expect(enemy(game, id).hp).toBe(enemy(game, id).maxHp);
    game.update(0.01);
    const firstHp = enemy(game, id).hp;
    expect(firstHp).toBeLessThan(enemy(game, id).maxHp);
    game.update(0.1);
    expect(enemy(game, id).hp).toBe(firstHp);
    game.update(0.1);
    expect(enemy(game, id).hp).toBeLessThan(firstHp);
    expect(events.filter((event) => event.actionId === "whirlwind" && event.outcome === "damage").length).toBeGreaterThanOrEqual(2);
  });

  test("timed Greatsword strikes snapshot Skill Power and the next cast uses the current build", () => {
    const game = createArmedDefenders();
    configureGreatsword(game, "p1", ["whirlwind"], { ability1: "whirlwind" });
    const player = game.players.get("p1")!;
    player.equipment = ["runebound_focus", null, null, null, null, null];
    resolve(game, "whirlwind");
    const internal = game as unknown as { greatswordStrikes: Array<{ damage: number; skillId: SkillId }> };
    for (const strike of internal.greatswordStrikes) expect(strike.damage).toBeCloseTo(31.05);

    player.position = { ...VENDOR_DEFINITIONS.ironbound_forge.position };
    expect(game.handleMessage("p1", {
      type: "sell_item", vendorId: "ironbound_forge", slotIndex: 0, expectedItemId: "runebound_focus",
    }).ok).toBe(true);
    for (const strike of internal.greatswordStrikes) expect(strike.damage).toBeCloseTo(31.05);
    for (let index = 0; index < 6; index += 1) game.update(0.1);
    resolve(game, "whirlwind");
    expect(internal.greatswordStrikes.map((strike) => strike.damage)).toEqual([27, 27, 27]);
  });

  test("Rising Slash uses swept contacts and class-correct displacement versus elite stagger", () => {
    const events: AuthoritativeTelemetryEvent[] = [];
    const game = createArmedDefenders(1, { telemetry: (event) => events.push(event) });
    configureGreatsword(game, "p1", ["rising_slash", "sundering_edge"], { ability1: "rising_slash" });
    const normal = spawnTestEnemy(game, "imp", { x: 0, z: -5 });
    const elite = spawnTestEnemy(game, "brute", { x: 1, z: -6 });
    enemy(game, normal).hp = enemy(game, normal).maxHp = 500;
    enemy(game, elite).hp = enemy(game, elite).maxHp = 500;
    resolve(game, "rising_slash");
    expect(enemy(game, normal).position.z).toBeLessThan(-5);
    expect(enemy(game, elite).position.z).toBe(-6);
    expect(enemy(game, elite).staggerFor).toBeCloseTo(0.65);
    expect(events.some((event) => event.targetId === normal && event.outcome === "displace")).toBe(true);
    expect(events.some((event) => event.targetId === elite && event.outcome === "stagger")).toBe(true);
  });

  test("Guard is directional, expires, and activates Riposte, Perfect Guard, Guarded Advance, and Countercharge", () => {
    const game = createArmedDefenders();
    configureGreatsword(game, "p1", ["guard", "riposte", "perfect_guard", "guarded_advance", "charge", "countercharge"], { ability1: "guard", ability2: "charge" });
    const player = game.players.get("p1")!;
    player.position = { x: 0, z: 0 };
    const front = spawnTestEnemy(game, "imp", { x: 0, z: -2 });
    resolve(game, "guard");
    const hp = player.hp;
    (game as unknown as { damagePlayer(player: unknown, amount: number, source: unknown): void }).damagePlayer(player, 20, enemy(game, front));
    expect(player.hp).toBeGreaterThan(hp - 10);
    expect(player.riposteReady).toBe(true);
    expect(player.counterchargeReady).toBe(true);
    player.move = { x: 0, z: -1 };
    game.update(0.1);
    expect(player.velocity.z).toBeLessThan(0);

    player.guardRemaining = 0;
    player.position = { x: 0, z: 0 };
    const expiredHp = player.hp;
    (game as unknown as { damagePlayer(player: unknown, amount: number, source: unknown): void }).damagePlayer(player, 20, enemy(game, front));
    expect(player.hp).toBe(expiredHp - 20);
  });

  test("Counterstrike misses without a received hit, responds once inside its window, and expires", () => {
    const game = createArmedDefenders();
    configureGreatsword(game, "p1", ["counterstrike"], { ability1: "counterstrike" });
    const id = spawnTestEnemy(game, "brute", { x: 0, z: -2 });
    const target = enemy(game, id);
    resolve(game, "counterstrike");
    expect(target.hp).toBe(target.maxHp);
    (game as unknown as { damagePlayer(player: unknown, amount: number, source: unknown): void }).damagePlayer(game.players.get("p1")!, 10, target);
    const after = target.hp;
    expect(after).toBeLessThan(target.maxHp);
    (game as unknown as { damagePlayer(player: unknown, amount: number, source: unknown): void }).damagePlayer(game.players.get("p1")!, 10, target);
    expect(target.hp).toBe(after);
    resolve(game, "counterstrike");
    for (let index = 0; index < 6; index += 1) game.update(0.1);
    const expired = target.hp;
    (game as unknown as { damagePlayer(player: unknown, amount: number, source: unknown): void }).damagePlayer(game.players.get("p1")!, 10, target);
    expect(target.hp).toBe(expired);
  });

  test("Rallying Sweep grants bounded self and Shared Resolve ally barriers", () => {
    const game = createArmedDefenders(2);
    configureGreatsword(game, "p1", ["rallying_sweep", "shared_resolve"], { ability1: "rallying_sweep" });
    game.players.get("p1")!.position = { x: 0, z: 0 };
    game.players.get("p2")!.position = { x: 1, z: 0 };
    spawnTestEnemy(game, "brute", { x: 0, z: -3 });
    resolve(game, "rallying_sweep");
    expect(game.players.get("p1")!.barrier).toBeGreaterThan(0);
    expect(game.players.get("p2")!.barrier).toBeGreaterThan(4);
  });

  test("Charge sweeps contacts, carries one normal, refunds Momentum on elite, and consumes Countercharge", () => {
    const game = createArmedDefenders();
    configureGreatsword(game, "p1", ["charge", "momentum", "relentless_charge", "countercharge", "cleave", "sweeping_advance"], { ability1: "charge", ability2: "cleave" });
    const player = game.players.get("p1")!;
    player.position = { x: 0, z: 0 };
    player.counterchargeReady = true;
    player.cooldownsBySkillId.charge = 6;
    const normal = spawnTestEnemy(game, "imp", { x: 0, z: -3 });
    const elite = spawnTestEnemy(game, "brute", { x: 0.5, z: -7 });
    enemy(game, normal).hp = enemy(game, normal).maxHp = 500;
    enemy(game, elite).hp = enemy(game, elite).maxHp = 500;
    resolve(game, "charge");
    expect(player.position.z).toBeLessThanOrEqual(-10);
    expect(enemy(game, normal).position.z).toBeLessThan(player.position.z);
    expect(enemy(game, elite).staggerFor).toBeCloseTo(1.25);
    expect(player.cooldownsBySkillId.charge).toBe(4);
    expect(player.counterchargeReady).toBe(false);
  });

  test("Impale has elite identity and Executioner's Reach executes weakened distant contacts", () => {
    const game = createArmedDefenders();
    configureGreatsword(game, "p1", ["impale", "executioners_reach"], { ability1: "impale" });
    const normal = spawnTestEnemy(game, "imp", { x: 0, z: -8 });
    const elite = spawnTestEnemy(game, "brute", { x: 0, z: -10.5 });
    enemy(game, normal).hp = enemy(game, normal).maxHp = 500;
    enemy(game, elite).hp = enemy(game, elite).maxHp * 0.3;
    resolve(game, "impale");
    expect(enemy(game, normal).hp).toBeLessThan(enemy(game, normal).maxHp);
    expect((game as unknown as { enemies: Map<string, unknown> }).enemies.has(elite)).toBe(false);
  });

  test("Colossal Strike commits aim, applies Measured Blow, real stagger, and Stand and Deliver at windup", () => {
    const game = createArmedDefenders();
    configureGreatsword(game, "p1", ["colossal_strike", "measured_blow", "rallying_sweep", "stand_and_deliver"], { ability1: "colossal_strike", ability2: "rallying_sweep" });
    const player = game.players.get("p1")!;
    player.position = { x: 0, z: 0 };
    player.aim = { ...aim };
    const id = spawnTestEnemy(game, "brute", { x: 0, z: -6 });
    enemy(game, id).hp = enemy(game, id).maxHp = 500;
    expect(game.handleMessage("p1", { type: "cast", slot: "ability1" }).ok).toBe(true);
    expect(player.barrier).toBe(25);
    for (let index = 0; index < 7; index += 1) game.update(0.1);
    expect(enemy(game, id).hp).toBeLessThan(enemy(game, id).maxHp);
    expect(enemy(game, id).staggerFor).toBeGreaterThan(0);
  });

  test("Bladestorm and Onslaught schedule both strikes and movement over active time", () => {
    for (const skillId of ["bladestorm", "onslaught"] as const) {
      const game = createArmedDefenders();
      configureGreatsword(game, "p1", [skillId], { ultimate: skillId });
      const player = game.players.get("p1")!;
      player.position = { x: 0, z: 0 };
      const id = spawnTestEnemy(game, "brute", { x: 0, z: skillId === "bladestorm" ? -4 : -5 });
      resolve(game, skillId);
      expect(player.position.z).toBe(0);
      expect(enemy(game, id).hp).toBe(enemy(game, id).maxHp);
      game.update(0.01);
      const firstPosition = player.position.z;
      expect(firstPosition).toBeLessThan(0);
      game.update(0.1);
      expect(player.position.z).toBe(firstPosition);
      game.update(0.1);
      if (skillId === "onslaught") game.update(0.1);
      expect(player.position.z).toBeLessThan(firstPosition);
    }
  });

  test("Unbreakable is a bounded three-response stance with expiry", () => {
    const game = createArmedDefenders();
    configureGreatsword(game, "p1", ["unbreakable"], { ultimate: "unbreakable" });
    const player = game.players.get("p1")!;
    player.position = { x: 0, z: 0 };
    const id = spawnTestEnemy(game, "brute", { x: 0, z: -2 });
    resolve(game, "unbreakable");
    const target = enemy(game, id);
    expect(target.hp).toBe(target.maxHp);
    for (let index = 0; index < 4; index += 1) {
      (game as unknown as { damagePlayer(player: unknown, amount: number, source: unknown): void }).damagePlayer(player, 10, target);
    }
    expect(player.unbreakableResponses).toBe(0);
    expect(player.unbreakableRemaining).toBe(0);
    const hp = target.hp;
    (game as unknown as { damagePlayer(player: unknown, amount: number, source: unknown): void }).damagePlayer(player, 10, target);
    expect(target.hp).toBe(hp);
  });
});
