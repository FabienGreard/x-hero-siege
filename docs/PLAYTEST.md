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
- `B`: browse or close a physical shop while in authoritative range
- `1` / `2`: buy and auto-equip the matching visible ware; at `6/6`, select the incoming ware
- `1`–`6`: after selecting a replacement ware, choose the occupied socket to replace
- `Enter`: confirm the reviewed replacement; `Escape` backs out one replacement step without spending
- Click the gold `+` on an ability slot: spend a skill point directly from the action bar
- `Ctrl` + `Q`, `E`, `R`, or `F`: matching keyboard upgrade shortcut

## Golden-path run

1. Select one of the four heroes and start the run.
2. Confirm the Aegis Citadel, central Heartfire Nexus, four gates, and current threat direction are understandable without explanation.
3. Move, aim independently, attack while repositioning, and use every learned ability once.
4. Fight the opening wave and note whether common enemies die quickly with readable impact feedback.
5. Spend each earned skill point from the action bar without pausing the fight. Confirm the `+` disappears, the rank pip fills, and clicking the learned slot still casts normally.
6. Earn at least 30 gold, read the real outbound pressure, and create a safe retreat window rather than shopping while enemies are already striking the gate.
7. Visit the northwest Ironbound Forge. Confirm its warm landmark, minimap marker, proximity prompt, and travel cost are readable; open it with `B`, buy by mouse or `1`/`2`, and verify Basic Damage or Move Speed changes in Hero Stats while enemies continue acting. The build summary must name the ware, show `×1`, and expose its canonical total effect.
8. Re-establish the lane, earn another 30 gold, and create a second safe window before visiting the northeast Veilglass Reliquary. Confirm its cool shrine and marker cannot be confused with the Forge; buy one ware and verify Skill Power changes real ability output or Cooldown Speed shortens `Q`/`E`/`R`/`F` recovery without changing LMB cadence. Each shop card's owned count must reconcile with the six visible sockets.
9. Leave each vendor's range and confirm the panel closes. Press `B` remotely, then enter the other vendor's range and reopen it; only that physical shop's two wares and their current owned counts should appear.
10. Fill all six sockets, confirm the wallet cannot immediately fund another trade, then earn a fresh 30 gold and reshape the build at one physical shop. Select a local ware by mouse or `1`/`2`, select an occupied socket by mouse or `1`–`6`, review the exact outgoing and incoming effects, and confirm explicitly. Verify gold falls by 30, the old item is discarded, the chosen stat and grouped totals update, both affected shop-owned counts remain truthful, and the build remains `6/6`. Back out once with `Escape`, then try a same-item replacement and confirm neither path spends gold.
11. Respond to the forced gate breach. Confirm pressure clearly shifts toward protecting the Nexus and that a fallen gate does not itself end the run.
12. Defeat the siege threat, follow the opened counterattack route as a group, and destroy the Rift source.
13. Confirm the victory payoff is unambiguous and the run ends cleanly.

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

## Recorded verification — `0.1.11`, 2026-07-10

- Began from shipped `0.1.10` and compared its full-build and replacement frames with the approved gameplay triptych. The six colored socket symbols communicated capacity and legality, but not the build's names, duplicate investment, or total effects; reconstructing the hero's actual answer required memorizing four symbols and doing arithmetic.
- Kept the authoritative equipment and stats unchanged. Hero Stats now groups occupied sockets by first-equipped order and derives each stack's name, copy count, and total effect from the canonical numeric item definitions rather than parsing presentation copy.
- In the rendered mixed `6/6` Warden build, the panel read Runebound Focus `×2` / `+30% Skill Power`, Tempered Edge `×2` / `+40% Basic Damage`, Fleetstep Greaves `×1` / `+10% Move Speed`, and Quickening Sigil `×1` / `+15% Cooldown Speed`. The same server snapshot produced Basic Damage `42`, Move Speed `11.6`, Skill Power `130%`, and Cooldown Speed `115%`.
- At the Ironbound Forge, the two local cards read `2 OWNED` for Tempered Edge and `1 OWNED` for Fleetstep Greaves. Selecting Edge for a full-build replacement preserved those counts, exposed only legal outgoing sockets, and kept the aggregate summary visible; accessible button labels reported the same copy counts and next action.
- Empty equipment adds no redundant panel row. One-of-each and six-duplicate summaries are covered directly; six copies render `+120% Basic Damage`, `+60% Move Speed`, `+90% Skill Power`, or `+90% Cooldown Speed` without floating-point artifacts.
- The production bundle was exercised through normal hero selection and a server-owned six-slot visual-QA fixture at 1280×720. Hero Stats, the shop catalog, and the replacement-selection state fit together without clipping or overlap, and browser warning/error logs were empty. Reusing the old local origin reproduced the already-tracked immutable-client cache risk, so the accepted frame loaded the current production assets through an explicit cache-isolated URL; no public playable deployment is claimed.
- Typecheck, `73` tests with `1,549` assertions, the production build, and the real four-client WebSocket replacement-convergence smoke test passed. The companion site deployed through [Pages workflow run 29092451175](https://github.com/FabienGreard/x-hero-siege/actions/runs/29092451175) and passed live DOM, image, 1280×720 rendering, and warning/error verification at [fabiengreard.github.io/x-hero-siege](https://fabiengreard.github.io/x-hero-siege/). Playable-game deployment remains pending a configured Bun/WebSocket host.
- Saved evidence: [grouped champion build](playtest/read-the-build-stats.jpg), [owned counts beside the live build](playtest/read-the-build-shop.jpg), and [duplicate-aware replacement selection](playtest/read-the-build-replace.jpg). The three frames use a server-owned deterministic loadout for visual QA; they do not replace the normal `0.1.10` economy telemetry preserved above.

## Recorded verification — `0.1.10`, 2026-07-10

- Began from pushed `0.1.9` and replayed its economy at normal timing. An efficient two-shop circuit completed a mixed `6/6` build at `51.63s` with `42` gold still banked. By `84.65s`, the run had accumulated `402` gold in total—enough for the six purchases plus ten replacements at the established `24`-gold price—so route and replacement choices had almost no economic weight.
- Kept the shops, catalog, slots, effects, routes, combat, and encounter intact. Repeatable imp, hound, and brute rewards changed from `3/3/9` to `1/1/3`; the Gatebreaker remained `35`, the Rift Guard remained `6`, and every ware or replacement changed from `24` to `30`.
- In the normal, unfrozen authoritative run, the first defining purchase landed at `31.54s`, three sockets were occupied at `85.72s`, the build reached `6/6` at `115.70s` with `0` gold, and the Heartfire Nexus remained `800/800`. After another combat window, replacing Quickening Sigil with Tempered Edge at `134.59s` changed gold `31 → 1`, Basic Damage `42 → 48`, and Cooldown Speed `115% → 100%`; the Warden returned to the fight at `139.24s` with the Nexus still `800/800`.
- Frozen rendered reenactments verified the same authoritative UI states without standing siege pressure: the first purchase displayed the universal `30`-gold price, changed gold `38 → 8`, and changed Basic Damage `30 → 36`; the full-build and replacement preview remained compact at 1280×720. Browser warning and error logs were empty.
- `518/518` stratified and regression shop routes afforded the first ware in `21.48–26.00s` and departed in `21.48–46.85s` (`24.35s` average, `30.82s` p95) with `30–69` gold. Every local purchase returned in `8.92–10.73s`; North retained `155–260` health (`218.78` average), the Nexus stayed at `800`, the Warden remained standing, and no route cost more than `7` net health.
- Across `100` deterministic normal defenses, every wallet remained below five-ware purchasing power at `85s` and reached the `180` gold required for six wares between `105–120s`. Exact one-to-four-player tests conserve every `1`, `3`, `35`, and `6` payout without last-hit competition.
- Typecheck, `69` tests with `1,545` assertions, the real four-client WebSocket economy and replacement convergence smoke test, and the production build passed. The companion site deployed through [Pages workflow run 29090711147](https://github.com/FabienGreard/x-hero-siege/actions/runs/29090711147) and passed live DOM, image, 1280×720 rendering, and warning/error verification at [fabiengreard.github.io/x-hero-siege](https://fabiengreard.github.io/x-hero-siege/). Playable-game deployment remains pending a configured Bun/WebSocket host.
- Saved evidence: [first 30-gold purchase](playtest/weight-of-gold-first.jpg), [six-slot midpoint build](playtest/weight-of-gold-full.jpg), [replacement preview](playtest/weight-of-gold-replace-preview.jpg), and [the confirmed replacement](playtest/weight-of-gold-after.jpg). The frozen frames reenact exact states recorded in the normal unfrozen run; they are visual-QA evidence rather than substitutes for its telemetry.

## Recorded verification — `0.1.9`, 2026-07-10

- Began by replaying the pushed `0.1.8` rendered build at normal timing. At `64.4975s`, the Warden had naturally earned a full mixed `6/6` loadout with North at `223`, the Nexus at `800`, `111` gold, and `85` kills. A seventh valid local purchase was rejected with `EQUIPMENT_FULL`. Both shop cards then remained blocked despite enough gold and more than two minutes of defense remaining, making full equipment a terminal state instead of a continuing build decision.
- Kept the six-slot promise and deepened that exact dead end. Before `6/6`, a purchase still auto-equips into the first empty unrestricted socket. At `6/6`, selecting a local ware now highlights eligible occupied sockets, selecting a socket reveals the exact old-to-new stat comparison, and a separate button or `Enter` confirms the 24-gold replacement. The old item is discarded without a refund and the loadout remains full.
- Replayed the new flow at 1280×720 in a protected rendered room using the exact loadout and wallet earned in the normal run. With the mouse, replacing Quickening Sigil with Tempered Edge changed gold `111 → 87`, Basic Damage `42 → 48`, and Cooldown Speed `115% → 100%`. With the keyboard, replacing Runebound Focus with Fleetstep Greaves changed gold `87 → 63`, Move Speed `11.6 → 12.6`, and Skill Power `130% → 115%`. Both trades remained `6/6`.
- `Escape` returned safely from the confirmation step without spending. A double-tap of `1` could not turn ware selection into an accidental destructive trade, and a same-item socket remained ineligible without deducting gold. The confirmation panel occupied `top 288.906`, `bottom 608`, and `height 319.094` inside the 1280×720 document with no overflow; browser warning and error logs were empty.
- The server owns phase, living state, vendor, stock, range, full-loadout eligibility, funds, slot, price deduction, equipment, and derived stats. Each request includes the expected outgoing item, so a stale or repeated confirmation is rejected before spending. Quickening Sigil reflows remaining active-ability cooldown progress in either direction, while existing Splitbolts, Falling Stars, and Wraiths preserve their creation-time damage. Replacement remains personal under co-op.
- Typecheck, 66 tests with 997 assertions, the real four-client WebSocket replacement-convergence smoke test, and the production build passed. The protected verification harness remained in Wave `2` with North at `260` and the Nexus at `800`. GitHub Pages workflow `29066925516` succeeded; the public HTML, CSS, and checkpoint image matched the committed site byte-for-byte, and the live `0.1.9` card rendered at 1280×720 with no overflow or browser warnings/errors. Playable-game deployment remains pending a configured Bun/WebSocket host.
- Saved evidence: [the pre-change blocked full-loadout panel](playtest/reforge-before.jpg) and [the new explicit replacement confirmation](playtest/reforge-after.jpg). Both are protected visual-QA captures, not normal-route evidence. The before frame was left unattended long enough to show a gate-fallen banner; the normal-run health and timing proof is recorded separately above.

## Recorded verification — `0.1.8`, 2026-07-10

- Began from pushed `0.1.7` and replayed the rendered Forge loop at 1280×720. The first physical vendor was readable and functional, but one location offered no route comparison: every funded hero made the same retreat and saw the same two-item answer.
- Compared the approved concept's warm market props and cool crystal shrine language with the live Citadel. Replaced one existing shell rather than adding a menu, extra district, inventory grid, or decorative vendor.
- The first implementation placed the Reliquary southeast. A default 210-second, normal-speed Warden run earned its gold from real kills and completed the local purchase round trip in `11.12s`, but North fell from `176 → 0` while the Nexus remained untouched. That location was rejected rather than weakening the siege or making trade remote.
- Moved the same shop to the northeast mirror of the Forge. The first replay departed while demons immediately outside North were already committed to the gate; although the `6.02s` trip technically left `22` health, release review rejected that one-hit margin rather than calling it acceptable tension.
- Replayed the corrected route at normal `210`-second defense timing in the rendered client with only legal Warden input and earned gold. The defender attacked only inside real cleave range, pushed the most advanced threat, and departed only after the outbound danger band was controlled: at `22.81s`, North was `260`, Nexus `800`, the Warden `199` health, and the wallet held `96` gold from `32` kills. The nearest imp was `49.61` units from North with a straight-line `9.19s` ETA. Runebound Focus was bought locally; the Warden returned in `9.53s` with North `253`, Nexus `800`, health unchanged, and the item equipped. The rendered route therefore cost one seven-damage hit, not the gate.
- Repeated the same non-accelerated route rule across `100` deterministic seeds. All `100/100` purchases and returns completed in `8.33–9.70s`; North retained `176–260` health (`218.35` average), the Nexus remained `800` every time, no hero was downed, and trip health loss was at most `7`. This makes pressure control—not a lucky roll or a moved shop—the verified strategic requirement.
- Captured the saved normal-siege return image from a separate frozen rendered replay of that rule so its visible state is auditable: Wave `1/5`, `31` kills, `69` gold after the 24-gold purchase, Runebound Focus in slot one, Skill Power `115%`, and Nexus `100%`. Its authoritative return record was `9.53s`, North `260 → 232`, Nexus `800`, Warden `199` health, and no down; it illustrates the verified envelope rather than pretending to be the stricter seven-damage sample above.
- In a protected one-enemy visual-QA room, the Ashcaller reached the Reliquary with a 48-gold test wallet. Keyboard `1` bought Runebound Focus and changed Skill Power `100% → 115%`; mouse bought Quickening Sigil and changed Cooldown Speed `100% → 115%`. Both items filled the shared first two of six unrestricted slots while the siege continued.
- Pressing remote `B` left the panel closed. After the Reliquary purchase, walking beyond the close threshold dismissed the panel; reaching the Forge and pressing `B` reopened the same panel with only Tempered Edge and Fleetstep Greaves. No Reliquary card or stale vendor state survived the transition.
- Authoritative coverage proves real Rupturing Arc output changes `72 → 82.8`, Quickening preserves remaining `Q`/`E`/`R`/`F` cooldown progress without touching LMB cadence, six duplicates reach `190%`, a seventh cross-shop purchase is atomic, simultaneous different-vendor purchases stay personal, and existing Splitbolts, Falling Stars, and Wraiths retain creation-time damage.
- Typecheck, 57 tests with 761 assertions, production build, the real four-client WebSocket smoke with both vendor inventories, and browser warnings/errors all passed. The suite now preserves the `100`-seed normal route margin and creation-time Splitbolt damage explicitly. GitHub Pages workflow `29065250633` succeeded; the public HTML, CSS, and 1280×720 checkpoint image matched the committed site byte-for-byte, and the live `0.1.8` card passed rendered verification without overflow. Playable-game deployment remains pending a configured Bun/WebSocket host.
- Saved comparison evidence: [`0.1.7` single-shop before](playtest/first-forge-after.jpg), [two-road Reliquary catalog](playtest/two-roads-after.jpg), and [normal-siege returned loadout from the separate frozen replay](playtest/two-roads-route.jpg).

## Recorded verification — `0.1.7`, 2026-07-10

- Began from pushed `0.1.6` and played the normal-speed Warden opening at 1280×720. Pressing `B` remotely did nothing; the northwest building was an anonymous shell, and even a truthful gold counter offered no player decision.
- Compared that gap with the approved concept's warm market props, gold economy language, compact bottom HUD, and readable city silhouettes. Rebuilt the existing northwest structure as the Ironbound Forge rather than adding a disconnected menu or second decorative vendor.
- The Forge sits about 24.7 world units from the Nexus: roughly 2.35 seconds for a baseline Warden and a 1.45-second detour on the direct north-gate route. Three live Vanguard Rush casts reached its gold sigil and proximity-only `[B]` prompt.
- Opened the non-pausing trade panel in a deterministic visual-QA runtime with one active enemy and a 48-gold test wallet. The Nexus continued falling from 100% to 80% and then 66% while the panel remained open, proving the room did not pause.
- Bought Tempered Edge with keyboard `1`: gold changed `48 → 24`, socket one filled, and authoritative Basic Damage changed `30 → 36`. Bought Fleetstep Greaves by mouse: gold changed `24 → 0`, socket two filled, and Move Speed changed `10.5 → 11.55` (`11.6` displayed).
- Cast `Q` while the Forge panel was open. The Warden moved beyond the ten-unit close threshold, Vanguard Rush entered cooldown, and both trade and comparison panels closed automatically without swallowing the cast.
- Authoritative tests prove a real earned 35-gold Gatebreaker reward buys a 24-gold ware; actual fixed-tick displacement changes `1.05 → 1.155`; a real Warden basic hit changes `30 → 36`; all four heroes derive both wares correctly; duplicates fill six unrestricted slots; the seventh purchase is atomic; equipment survives revival, isolates allies, and resets with the run.
- Typecheck, 45 tests with 565 assertions, the real four-client WebSocket smoke test, production build, and browser warnings/errors all passed. The companion site deployed and passed live rendered verification; playable game deployment remains pending a configured Bun/WebSocket host.
- Saved evidence: [anonymous courtyard before](playtest/first-forge-before.jpg) and [equipped First Forge loop](playtest/first-forge-after.jpg).

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
