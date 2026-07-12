# Greatsword encounter compatibility gate

**Checkpoint:** `0.1.35 — Forge the First Defender`

**Ownership:** Monsters and encounters compatibility review

**Constraint:** Freeze the `0.1.34` enemy roster, wave composition, spawn cadence, health and damage pressure, objective durability, and reward schedule. This gate measures the Greatsword against the existing run; it does not rebalance the run or implement encounter mechanics.

## Decision

The Greatsword passes only when one neutral Defender can solve every required encounter duty through more than raw damage, and four Defenders can contribute without assigning mandatory roles. Damage remains evidence, but it is reviewed beside control, stagger, interrupts, displacement, lane protection and recovery, survival, mastery timing, and objective outcomes.

The static Rift Heart is an objective-damage and finale-timing check. It is not evidence that the Greatsword solves an active boss.

## Required builds

Run each scenario with four representative allocations:

1. **Cleaving:** Cleave, Whirlwind, Rising Slash, and Bladestorm.
2. **Guarding:** Guard, Counterstrike, Rallying Sweep, and Unbreakable.
3. **Execution:** Charge, Impale, Colossal Strike, and Onslaught.
4. **Cross-branch:** at least one connected allocation that exercises Countercharge, Sweeping Advance, or Stand and Deliver while equipping exactly three standard skills.

The implementation owner supplies stable mastery IDs in the recorded artifact. The encounter gate does not duplicate allocation legality or skill mechanics.

## Validation matrix

| Duty | Normal-timing scenario | Required evidence | Failure signal |
|---|---|---|---|
| Normal groups | Opening and dense late-defense packs with all four builds | Different targets hit per action, pack clearance, danger-band population, gate damage, player HP exposure, displacement/control, downs | A legal build cannot prevent ordinary pressure from reaching the objective, or succeeds only through one oversized damage event |
| Elites | Brutes in defense and Gatebreaker in breach | Elite damage, stagger applied, windups interrupted, displacement result, player damage taken while committing, time engaged | Elite tools are tooltip-only, hard control acts like normal-enemy control, or the only answer is inflated damage |
| Stagger and control | Rising Slash, Perfect Guard, Charge, Countercharge, Colossal Strike against normal and elite targets | Authoritative outcome by source player, target class, action ID, magnitude/duration, and whether an active windup was interrupted | Visual reaction without authoritative outcome; control has no class-specific result; one action can suppress an elite indefinitely |
| Lane protection | Defender starts outside the gate while pressure advances into a fixed gate-relative danger band | Gate HP before/after, threats entering the band, time occupied, damage/control by class, Defender HP and downs | Gate survives only because the controller camps a spawn point or uses a non-public grant |
| Lane recovery | Begin recording when one or more threats enter the danger band; end when the band is empty | Recovery time, gate HP lost during the episode, breach state, control/stagger/interrupt totals, player HP cost | Pressure never clears, recovery requires a specific branch, or recovery hides unacceptable gate/Nexus loss |
| Forced breach | Full normal defense into the existing North Gatebreaker event | Breach start, Gatebreaker engagement and kill time, escort clearance, elite outcomes, downs, Nexus damage, push transition | Greatsword cannot regain space after the forced breach, or one branch is mandatory to enter push |
| Rift Heart | Normal counterattack with the eighth point deliberately spent before the finale | Mastery learned time, first `F` cast, standard/mastery objective damage, Rift Guard handling, victory/time-out, player downs | Mastery arrives after meaningful play, Rift damage exists only in one branch, or adds prevent a legal build from interacting with the Heart |
| Solo | Thirty deterministic full-run seeds per representative build, followed by a rendered normal run | Victory distribution, phase times, gate/Nexus loss, pressure episodes, downs, minimum HP ratio, contribution by target class and outcome | Any build lacks a required duty, or aggregate success conceals repeated structural failure in one phase |
| Four-player duplicates | Four Greatswords with distinct accents, fixed four-lane pressure, reconnect exercised once | Per-player normal/elite/objective damage, control/stagger/interrupt/displacement, downs, lane episodes, phase outcome, reward and snapshot convergence | One player contributes nothing outside incidental damage, one branch becomes a mandatory role, lane pressure or rewards drift, or reconnect changes contribution state |

## Cohorts and review order

1. **Deterministic contact fixtures:** one normal enemy, one elite, one active windup, one displacement boundary, and the Rift Heart. These prove semantics, not balance.
2. **Opening cohort:** retain the existing thirty deterministic seeds and 120-second public-action boundary so the new Defender can be compared with the `0.1.34` transition baseline.
3. **Full-run cohort:** thirty seeds for each representative build. Record arming, defense, breach, push, victory/defeat, mastery acquisition and first mastery cast.
4. **Four-player cohort:** one deterministic run for each homogeneous representative build, one cross-build run, and the real four-client smoke. Every player uses Greatsword; no role is preassigned.
5. **Rendered acceptance:** native `1280×720` normal pressure, dense pressure, breach, and Rift Heart captures. Confirm enemy windups and class reads survive the Greatsword's densest effects.

Numerical pass bands are set only after the first legal full-run cohort is recorded. The frozen `0.1.34` values are comparison evidence, not automatic targets for a different combat system. Any proposed pressure or reward change becomes a later director decision.

## Instrumentation contract

[`tests/support/encounter-compatibility.ts`](../tests/support/encounter-compatibility.ts) is a pure consumer. It records frames and authoritative contribution events without importing the public protocol, consuming RNG, allocating gameplay IDs, or defining skill behavior.

The structural `encounterFrameFromPublicSnapshot` adapter covers phase timing, player health/downs, objective health, and gate-relative danger-band occupancy without importing a protocol type. Use a fixed `28`-world-unit radius around each gate for the compatibility cohort. This radius is an observation boundary only; it must not change targeting, spawning, controller decisions, or director pressure.

Contribution needs one narrow test-only authoritative event seam because public snapshots cannot attribute control to a player:

```ts
interface EncounterTelemetryEvent {
  at: number;
  sourcePlayerId: string;
  actionId: string;
  targetId: string;
  targetClass: "normal" | "elite" | "objective";
  outcome: "damage" | "stagger" | "interrupt" | "displace" | "control";
  magnitude?: number;
  duration?: number;
}
```

The adapter must be test-only or server-internal, preserve authoritative event order, and consume no random draw or gameplay ID. It must not enter the WebSocket protocol. Damage reports resolved damage, not requested damage; control reports the resolved class-specific outcome, not the input intent. `outcomeEventsByAction` counts target-resolution events, not casts: one multi-target Cleave intentionally contributes several events. The gate must not infer cast counts unless the implementation owner later supplies a stable authoritative action-instance identifier.

## Artifact format

Each recorded run exports one summary with:

- seed, controller/build ID, player count, allocation revision and equipped skill IDs;
- terminal outcome and phase timings;
- gate/Nexus loss and pressure-recovery episodes;
- per-player downs and minimum health ratio;
- per-player contribution split by normal, elite, and objective targets;
- separate damage, stagger, interrupt, displacement, and control totals;
- mastery learned time, equipped time, and first cast time supplied by the progression harness;
- authoritative tick convergence and reconnect result supplied by the multiplayer harness.

Keep raw event logs only for failed or selected representative seeds. Aggregate summaries are the review surface; rendered evidence remains required before checkpoint approval.

## Review gate

The encounter reviewer reports:

1. whether each build covers groups, elites, protection/recovery, breach, and Rift duties;
2. whether non-damage outcomes are real, bounded, and class-correct;
3. whether mastery arrives early enough to be deliberately used;
4. whether solo failures are mechanical, controller-related, or pressure-related;
5. whether four-player contribution remains broad without mandatory roles;
6. whether any requested tuning would violate the frozen checkpoint boundary.

The director decides any tuning or encounter-content follow-up. This gate cannot authorize either.
