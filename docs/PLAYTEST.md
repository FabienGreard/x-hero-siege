# Playtest

The purpose of this test is to judge the actual game feel, not feature completeness. A clean run should take 5–10 minutes.

## Start

```sh
bun install
bun run check
bun test
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). For co-op checks, open the URL in up to four browser windows.

Useful read-only diagnostics:

- `http://localhost:3000/health`: server health.
- `http://localhost:3000/debug/state`: authoritative room snapshot, including phase, players, hero locks, objective health, and active threats.
- `http://localhost:3000/debug/reset?accelerated=1`: reset into the short visual-QA timeline.
- `http://localhost:3000/debug/advance`: in accelerated mode, advance one authored phase for deterministic visual checks.

## Controls under test

- `WASD`: move
- Mouse: aim
- Hold left mouse: primary attack
- `Q`, `E`, `R`: active abilities
- `F`: ultimate
- `C`: toggle the non-pausing Hero Stats panel
- Click the gold `+` on an ability slot: spend a skill point directly from the action bar
- `Ctrl` + `Q`, `E`, `R`, or `F`: matching keyboard upgrade shortcut

## Golden-path run

1. Select one of the four heroes and start the run.
2. Confirm the Aegis Citadel, central Heartfire Nexus, four gates, and current threat direction are understandable without explanation.
3. Move, aim independently, attack while repositioning, and use every learned ability once.
4. Fight the opening wave and note whether common enemies die quickly with readable impact feedback.
5. Spend each earned skill point from the action bar without pausing the fight. Confirm the `+` disappears, the rank pip fills, and clicking the learned slot still casts normally.
6. Respond to the forced gate breach. Confirm pressure clearly shifts toward protecting the Nexus and that a fallen gate does not itself end the run.
7. Defeat the siege threat, follow the opened counterattack route as a group, and destroy the Rift source.
8. Confirm the victory payoff is unambiguous and the run ends cleanly.

Repeat once while allowing enemies to reach and destroy the Nexus. Confirm defeat occurs because Nexus health reaches zero, not merely because a gate falls.

## Hero checks

Run at least the opening combat with each hero:

- **Warden:** melee control and frontline durability read clearly.
- **Riftstalker:** ranged precision and mobility read clearly.
- **Ashcaller:** placed fire and explosive area damage read clearly.
- **Gravebinder:** horde-derived sustain and spirits read clearly.

Each hero must be capable of solo wave clear and boss damage. Complementary co-op effects are welcome; dependency on a healer, tank, or specific composition is a failure.

## Multiplayer checks

1. Connect two clients and attempt to reserve the same hero at nearly the same time. Exactly one request must succeed.
2. Connect four clients. Lock all four distinct heroes and confirm the fifth-player limit is not exceeded.
3. Move and attack from every client. Confirm all clients observe the same players, enemies, objective health, phase, and outcome.
4. Split across approaches during defense, then regroup for the counterattack. Confirm threat and teammate readability at both scales.
5. Confirm XP/power progression is shared fairly and no player can steal another player's required rewards.

## Feel checklist

- Input feels immediate; no obvious latency between aim, attack, cast, and impact.
- The camera never hides the hero, Nexus, or critical telegraphs.
- Enemy density creates momentum without obscuring dangerous attacks.
- Hits have visible and audible weight without excessive shake or particle clutter.
- The HUD answers: who am I, what is ready, where is pressure, and how close is the Nexus to defeat?
- Each ability rank creates a noticeable build change rather than a hidden numerical bump.
- The breach is the run's pressure peak.
- The counterattack is short, collective, and more aggressive than the defense.
- Victory and defeat are both clear.

## Record after each run

- Player count and selected heroes.
- Total run time.
- Victory or defeat and the phase where it occurred.
- Most satisfying moment.
- Most confusing or visually noisy moment.
- Any input, networking, or frame-rate issue.
- One change that would most improve the next playtest.

After verifying the slice, record the result and begin the next cycle from the newly verified build. Do not use playtest observations as permission to add deferred systems or change the approved game promise.

## Recorded verification — `0.1.6`, 2026-07-10

- Began from pushed `0.1.5` and played a normal-speed Riftstalker opening at 1280×720. Reaching level 2 silently changed maximum health from 125 to 133 and produced 24 gold, but the player had no readable way to inspect either the hero's combat baseline or what progression had changed.
- Replayed the implemented checkpoint as Warden and Riftstalker. The `C` panel displayed authoritative basic damage, maximum health, attacks per second, movement speed, skill power, and cooldown speed directly from the live snapshot.
- Held movement and primary attack with the panel open, then ranked and cast `Q`. The hero continued moving and attacking, the ability learned and entered cooldown, and the panel remained visible without pausing or taking focus. `C` toggles it and `Escape` closes it.
- Enemy gold is now divided equally among every connected player in fixed-point units while only the finishing hero receives kill credit. Deterministic one-, two-, three-, and four-player coverage proves the Gatebreaker's 35 gold is conserved exactly, including repeated three-player fractional payouts, and no lane or last hit can steal required purchasing power.
- Solo gold income is unchanged. Gold and Rift Shard drops remain visible, expire naturally, and cannot be collected for duplicate credit; only healing drops retain proximity consumption. Starting a new run resets all wallets.
- Typecheck, 31 server tests with 398 assertions, the real four-client WebSocket smoke test, production build, and rendered browser diagnostics passed.
- Saved evidence: [truthful Hero Stats during live Nexus defense](playtest/truth-before-trade.jpg).

## Recorded verification — `0.1.5`, 2026-07-10

- Began from pushed `0.1.4` at 1280×720 and compared live breach contact against the first two approved concept panels. The server still sent every enemy and wraith to one exact target coordinate, producing a north-road queue and one oversized red/cyan pile at the Nexus.
- The first narrow slot pass still overlapped heavily at breach density. The verified pass uses stable per-entity gate rows, approach-facing Nexus rings, player engagement angles, and modest travel separation; common imp and hound silhouettes were reduced toward the concept's hero-to-horde scale.
- Replayed a normal-speed Warden run and held movement to meet the first wave at the north gate. More than fifty live threats remained individually locatable across the road and gate mouth instead of merging into a single column; the local hero and gate opening remained readable.
- Raw enemy count, cadence, health, damage, lane allocation, and attack timing were unchanged. An unattended run still lost the Nexus, proving the checkpoint changed contact readability rather than difficulty.
- Deterministic coverage proves simultaneous north-gate attackers occupy more than four world units of lateral space while still damaging the gate. Wraith coverage proves the three rank-one spirits remain separated while moving.
- At the configured 260-enemy cap, 300 authoritative 30 Hz updates averaged 1.098 ms in the local Bun runtime.
- Typecheck, 23 server tests with 293 assertions, the real four-client WebSocket smoke test, and production build passed. Browser console warnings/errors: none.
- Saved comparison evidence: [tight contact before final spacing](playtest/contact-spacing-before.jpg) and [dispersed north-gate horde](playtest/contact-spacing-after.jpg).

## Recorded verification — `0.1.4`, 2026-07-10

- Began from pushed commit `1d19f78` and replayed the current Gravebinder opening at 1440×900 with keyboard and mouse.
- Confirmed the player-visible mismatch recorded in the roadmap: Wraith Host rank 1 emitted five generic soul projectiles even though the hero fantasy promises summoned spirits.
- Replayed the implemented checkpoint in the accelerated visual-QA timeline. Casting Wraith Host raised three distinct green wraiths around the Gravebinder; they separated from the hero, acquired nearby demons, pursued them, struck repeatedly, and retargeted.
- The summons remained readable against the cyan Heartfire Nexus and red demon horde. The run recorded 13 kills after the host entered combat without adding a second HUD or obscuring enemy telegraphs.
- Authoritative coverage proves rank-1 Wraith Host creates three persistent summon snapshots owned by the caster, creates no projectile fan, and moves the spirits independently over subsequent ticks.
- Typecheck, 22 server tests with 285 assertions, the real four-client WebSocket smoke test, and production build passed. Game deployment verification remains pending a configured Bun/WebSocket host.
- Saved evidence: [authoritative Wraith Host summons](playtest/wraith-host-summons.jpg).

## Recorded verification — `0.1.3`, 2026-07-10

- Played the untouched `0.1.2` Warden run first at 1440×900 with keyboard and mouse. The initial point opened a separate 350px choice panel while the actual action slots remained disabled; spending through that panel then allowed a normal `Q` cast.
- Replayed `0.1.3` at the same viewport. The old panel is absent; Q/E/R expose compact gold `+` controls inside the existing bar, while the level-3 ultimate remains correctly locked.
- Clicked the Vanguard Rush `+` in live play and confirmed rank 1, zero remaining points, zero cooldown, and no action state—the upgrade did not cast. Clicking the main Q tile immediately afterward cast normally and entered its 5.7-second cooldown.
- Repeated the upgrade with the actual `Ctrl+Q` keyboard input; the rank changed without starting an action or cooldown.
- Authoritative simulations prove all four heroes can bank at most their eleven remaining ranks, and a fully maxed `3/3/3/2` build stays at zero points on later level-ups.
- Typecheck, 21 server tests with 274 assertions, the real four-client WebSocket smoke test, and production build passed. Browser console warnings/errors: none.
- Saved evidence: [inline action-bar upgrades](playtest/inline-skill-upgrades.png).
- Deliberately not changed in this checkpoint: Gravebinder summons remain the next separate hero-fantasy issue recorded in the roadmap.

## Recorded verification — `0.1.2`, 2026-07-09

- Played the untouched `0.1.1` Gravebinder run first at 1440×900 with keyboard and mouse. Solo pressure collapsed into a short north-side queue, and persistent ground direction lines repeated under every demon; the unattended Nexus fell in 29 seconds.
- The authoritative audit found that wave one already used one lane per player, but later waves rotated that set and multiplayer also accelerated global spawn cadence plus added 20% enemy health per extra player. Four-player health throughput was about 9.8 times solo instead of a proportional four times.
- Replayed `0.1.2` at the same viewport. A solo run immediately reports `1 ROAD OPEN`, keeps North active, marks East/South/West sealed in the compass and minimap, and uses visible portcullis wards on inactive gates.
- Gates moved from 36 to 52 world units from the Nexus, spawns from 78 to 112, and the Rift Heart from 112 to 160 north. The camera and minimap followed the expanded world while the central Nexus remained the anchor.
- Used `1`, mouse aim, and `Q` in live play; Vanguard Rush reached rank 1, entered cooldown, and the run retained the same fixed North topology. Persistent monster-facing markers were absent while authoritative windup/impact/recovery states remained intact.
- One-to-four-player simulations prove exactly `[North]`, `[North, East]`, `[North, East, South]`, and all four lanes, stable across wave changes and disconnects. Each active lane receives the solo spawn cadence and same-health enemies; the safety cap accepts only whole lane batches and always reserves room for the Gatebreaker.
- Typecheck, 19 server tests with 226 assertions, the real four-client WebSocket smoke test, and production build passed. Browser console warnings/errors: none.
- Saved evidence: [before](playtest/player-scaled-siege-before.png), [deployment after](playtest/player-scaled-siege-after.png), and [cleaner horde after](playtest/player-scaled-siege-battle.png).
- Deliberately not changed in this checkpoint: Gravebinder still needed an authoritative summon/minion system, and fully maxed heroes could still receive an unusable skill point. The point issue is resolved in `0.1.3`; Gravebinder remains recorded in the roadmap.

## Recorded verification — `0.1.1`, 2026-07-09

- Played the untouched `0.1.0` build first at 1440×900 with keyboard and mouse. The recurring failure was one unreadable combat language: six cramped action tiles, overlapping circular skills, gliding actors, and contact damage without visible attack phases.
- Replayed `0.1.1` at the same viewport and inputs. The HUD exposes one compact LMB primary readout and exactly four large `Q`/`E`/`R`/`F` slots; no Space action remains.
- Selected the Warden, started a live run, spent the initial point on Vanguard Rush with `1`, and confirmed the server changed only `Q` to rank 1 and consumed the point. Pressing Space left position, cooldowns, and action state unchanged.
- A live `Q` cast entered cooldown and moved the Warden about ten world units toward the mouse aim. Live enemy snapshots showed facing plus windup/recovery phases; the server test confirms damage cannot land before the windup completes.
- A held LMB basic can be interrupted by Q/E/R/F, while a second ability cannot overlap the first. This keeps attack-hold responsive without removing committed ability timing.
- The browser console reported no warnings or errors. Typecheck, 12 server tests with 99 assertions, the four-client multiplayer smoke test, and production build all passed.
- Saved comparison evidence: [before](playtest/readable-combat-before.png) and [after](playtest/readable-combat-after.png).

## Recorded verification — `0.1.0`, 2026-07-09

- Browser hero selection, ready/start flow, central Nexus defense, Warden abilities, talent presentation, breach pressure, defeat, replay, counterattack presentation, Rift victory, and terminal reset were exercised.
- The live combat run reached level 4, killed 31 demons, exposed the talent choice, and correctly lost when the unattended Nexus reached zero.
- Accelerated debug stepping was then used only to inspect the authored counterattack and Rift-collapse presentation deterministically.
- Four real WebSocket clients claimed all four unique heroes, rejected a duplicate Warden claim, readied, and received the same defense snapshot.
- Browser console warnings/errors: none.
- Saved evidence: [breach combat](playtest/vertical-slice-breach.png) and [Rift victory](playtest/vertical-slice-victory.png).
