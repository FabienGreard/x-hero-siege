# Slice-first roadmap

This roadmap is a scope guard, not a content backlog. Work proceeds as one played, rendered, verified checkpoint at a time; expansion remains deferred until the 5–10 minute run earns it.

## `0.1.26` — Read the Time

**Status:** implemented and locally verified on 2026-07-11; push and companion-site deployment pending release proof; playable game deployment pending a configured Bun/WebSocket host and the remaining public-host gates.

- Correct the pre-purchase comprehension weakness exposed by legal normal-timing `0.1.25` play: the Warden reached the Reliquary at `29.304s` with level `3`, `153` HP, `31` gold, `31` kills, empty equipment, rank-three `E`, North `260`, and the Nexus `800`, but Quickening still answered only `Cooldown Speed 100% → 115%`. A rendered Ashcaller could already read `Q 6S`, `E 9S`, `R 12S`, and `F 38S` in Hero Stats, yet the ware never connected its price to those learned casts before commitment.
- Keep the aggregate Quickening result and add one subordinate `CAST RETURNS` treatment derived from the same canonical `deriveAbilityImpactReadout` used by current Hero Stats. Show only learned casts: zero adds no heading or reserved space, one names only that key, and four form a compact ordered `Q`/`E`/`R`/`F` grid.
- Carry the same exact fresh-cast projection into final slot-specific reforge confirmation. Quickening-in names shorter full returns, Quickening-out and `×4 → ×3` Attunement loss name longer returns, and the live accepted Hero Stats remain unchanged until the authoritative purchase succeeds.
- Preserve percentage progress on cooldowns already running, and identify these projections as full fresh-cast duration rather than remaining timer values. Preserve all ability mechanics, ranks, damage, timing, server authority, protocol, item power, prices, shops, catalog, six unrestricted slots, art, and audio.
- Compare the shipped baseline with zero-, one-, and four-learned states, the fourth-Sigil `145% → 175%` Attunement step, and both reforge directions at native `1280×720`. Typecheck, the `153`-test authoritative suite, the focused `23`-test shop and replacement gate, production bundle `main-255e98a50aaa14e6.js`, and real four-client convergence all pass on the final tree.

**Next-cycle nomination:** replay shipped `0.1.26` at normal timing and choose the highest-leverage player-visible weakness from the actual run. Focus's exact learned-cast magnitude preview is only a candidate if play exposes the same pre-purchase gap; do not infer a parallel checklist or new catalog breadth.

## `0.1.25` — Leave the Step

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host and the remaining public-host gates.

- Correct the battlefield-read weakness exposed by normal authoritative `0.1.24` play: four real Forge trips produced an Attuned four-Greaves Warden by `86.061s` with the Nexus untouched, but Combat Stride moved only `0.607` world units across windup and impact and had no renderer-specific read.
- Reuse the established cyan Attuned Fleetstep lower-chevron echo. During a moving basic windup or active impact, leave it opposite authoritative velocity by up to `0.18` hero scale; settle it home through recovery and keep the allied read quieter than the local one.
- Derive the whole treatment from each current snapshot without retained timers, events, or replayable history. Keep the Attunement transition centered so a newly earned ceremony is not displaced by movement presentation.
- Preserve Combat Stride's exact movement, timing, recovery, ability isolation, damage, cadence, aim, prices, stats, shops, routes, six unrestricted slots, Attunement, balance, and authority. This is one visual consequence for an existing earned effect, not a new mechanic or catalog obligation.
- Compare the actual `0.1.24` baseline, corrected four-copy read, unchanged three-copy threshold, and quieter allied read at native `1280×720` against the approved gameplay triptych. Prove directional strafing, recovery settling, hydration safety, clean diagnostics, typecheck, authoritative suite, production assets, and real four-client convergence.

**Next-cycle nomination:** replay shipped `0.1.25` at normal timing and choose the highest-leverage shop, item, or champion-stat weakness from actual play. If pre-purchase comprehension leads, test Quickening Sigil's exact learned-cast returns before adding another ware evolution or any catalog breadth.

## `0.1.24` — Hold Your Place

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host and the remaining public-host gates.

- Correct the run-killing regression exposed during the normal `0.1.23` shop replay: after earning Greaves and Focus through two real physical routes, one socket loss deleted the Warden and its build, then every automatic reconnect entered hero selection and received `GAME_IN_PROGRESS` while the empty room continued to defeat.
- Keep one disconnected defender in authoritative memory for `15s`. Preserve identity, hero, host role, position, health, level, XP, ranks, cooldowns, wallet, and all six unrestricted equipment slots; neutralize held input while leaving the hero targetable and the co-op simulation unpaused.
- Resume through one server-issued 256-bit bearer token stored only in per-tab session storage. Fence stale sockets by connection generation, allow only one controller, reject invalid active-run admission, show disconnected allies as `RECONNECTING`, expire the reservation cleanly, and reset only a fully abandoned room.
- Reconcile a reload from the welcome snapshot without replaying old receipts, Attunement, damage, or phase ceremonies. Advance the client input sequence from the retained server sequence so movement works immediately after a full reload.
- Fingerprint production client assets as an inseparable delivery gate for the new handshake. Keep HTML uncached, cache only byte-addressed bundles immutably, and reject the obsolete fixed asset path.
- Preserve the complete game promise and Armory. This is bounded transport recovery, not persistence, accounts, join-in-progress, matchmaking, pausing, invulnerability, AI substitution, or a new progression system.
- Prove fresh and stale handshakes, token secrecy, active detach/resume, same-ID state retention, duplicate-tab fencing, expiry, lobby fallback, abandoned-room reset, next-sequence input, real four-client convergence, hashed production routing, native `1280×720` reload rendering, no hero-select flash, no replayed progression feedback, and clean diagnostics.

**Next-cycle nomination:** replay shipped `0.1.24` at normal timing and return to the highest-leverage shop, item, or champion-stat weakness. Recompare Combat Stride's battlefield read with the approved gameplay concept if its visual embodiment leads; otherwise test the exact pre-purchase translation of an existing ware before adding any parallel evolution or catalog breadth.

## `0.1.23` — Carry the Step

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the item-depth weakness exposed by replaying shipped `0.1.22`: four Greaves raised a Warden to `15.8` Move Speed and visibly Attuned, but the named Iron Cleave consequence remained identical and every primary windup still discarded that movement. Edge, Focus, and Quickening already reached champion-specific actions; Greaves alone stopped at a scalar.
- Give Fleetstep Greaves the first earned ware evolution at its existing fourth-copy threshold. Combat Stride retains `15%` of current authoritative Move Speed during primary windup and impact, including the established Greaves scalar; idle remains `100%`, every recovery remains `45%`, and abilities receive no Combat Stride movement.
- Derive the effect from raw authoritative equipment, name it in the grouped equipment summary, and expose its exact current-champion `WORLD/S` rate in the fourth-, fifth-, and sixth-copy shop previews, accepted receipt, and named `LMB` row. Keep the existing cyan vocabulary, Attunement ceremony, and physical movement as the payoff rather than adding another panel, meter, sound, or effect system.
- Preserve all non-Attuned movement and attack ordering, damage, cadence, impact origin, aim, projectile and melee geometry, ability displacement, price, slots, routes, economy, and catalog. One evolution deepens one established ware; it does not establish an obligation to add parallel evolutions by checklist.
- Prove raw counts zero through six for all four champions, real action phase transitions, purchase and reforge gain/loss, run reset, normal-timing Warden and high-cadence Riftstalker pressure, the existing 518-route safety gate, exact four-client action/velocity/position convergence, native `1280×720` shop/Stats fit, accessible truth, clean diagnostics, typecheck, authoritative suite, and production build.

**Next-cycle nomination:** replay shipped `0.1.23` at normal timing and choose the next highest-leverage shop, item, or champion-stat weakness from actual use. Prefer making one existing choice or current-champion consequence more concrete; do not give every ware a parallel evolution merely to complete a set.

## `0.1.22` — Every Trade Must Change

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the player-visible dead end exposed by replaying shipped `0.1.21`: at six identical wares, the matching local card still promised `REPLACE ITEM`, then opened a socket picker in which all six targets were disabled.
- Derive the legal full-build targets from the canonical equipment projection. If no socket can produce a different build, expose a disabled `FULL STACK` card and an exact no-change explanation instead of beginning a reforge.
- Give mouse, number shortcuts, visible status, accessible naming, socket selection, and post-acceptance reconciliation the same eligibility answer. An impossible activation must spend no gold and send no purchase request.
- Preserve the legal specialization edge case: five matching copies plus one different ware can still replace that one socket and reach six. Preserve every cross-ware reforge unchanged.
- Prove all four wares across both physical shops, six-matching and `5 + 1` builds, mouse and keyboard behavior, accepted authoritative reforge reconciliation, native `1280×720` fit, clean diagnostics, typecheck, production build, authoritative suite, and four-client convergence.

**Next-cycle nomination:** replay shipped `0.1.22` at normal timing and choose the next highest-leverage shop, item, or champion-stat weakness from actual use. Prefer one deeper decision or payoff for an established ware; do not add catalog breadth to compensate for a weakness in the existing four.

## `0.1.21` — Read the Commitment

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the early-commitment weakness exposed by shipped `0.1.20`: a normal Warden wearing one Edge and one Focus could read every exact champion consequence, yet both duplicate stacks still appeared as isolated `×1` bonuses until the shop suddenly announced the threshold at three copies.
- Add restrained `ATTUNEMENT 1/4` and `ATTUNEMENT 2/4` labels to each owned stack in Hero Stats and the matching local shop card. Preserve `NEXT ATTUNES` at three, `ATTUNED` from four onward, and no progress label at zero.
- Derive all states from one canonical armory helper and explain accessibly that the fourth matching copy contributes twice its ordinary effect.
- Keep the checkpoint presentational: no new panel, hover dependency, projection, animation, item, threshold, or power change.
- Prove all four wares from zero through six copies, mixed `1/1`, `2/2`, and `3/3` builds, Attunement gain and loss through reforge, both shops beside complete Hero Stats and Action Impact at native `1280×720`, accessibility, clean diagnostics, production build, authoritative suite, normal economy and route gates, and four-client convergence.

**Next-cycle nomination:** replay shipped `0.1.21` at normal timing and choose the next highest-leverage shop, item, or champion-stat weakness from actual use. Do not turn readable commitment into another threshold, catalog expansion, or prescribed build path.

## `0.1.20` — Read Every Strike

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the remaining champion-stat disconnect exposed by shipped `0.1.19`: the Warden's accepted Focus resolved into exact Rupturing Arc output, but `Basic Damage 30`, `Attack Rate 1.92`, and the named `Iron Cleave` primary still lived on separate surfaces.
- Broaden the existing current-build block to `ACTION IMPACT` and add one full-width `LMB` row naming each hero's primary, exact damage per target, and attacks per second. Include Soul Scythe's real fixed heal per struck target without estimating pack totals or DPS.
- Derive the row from the authoritative Hero Stats snapshot and one shared primary-impact definition. Make Gravebinder's server healing consume the same canonical constant so presentation and resolution cannot drift.
- Pulse the named primary row only when an accepted Tempered Edge purchase changes its damage. Keep Focus, Quickening, and Greaves isolated; keep ordinary shop previews and current-only `Q`/`E`/`R`/`F` truth unchanged.
- Prove all four heroes, Edge counts zero through six and the `3 → 4` Attunement jump, real one-target impact, Gravebinder healing, non-Edge isolation, native 1280×720 Stats/shop coexistence, clean diagnostics, production build, authoritative suite, and four-client convergence.

**Next-cycle nomination:** replay shipped `0.1.20` at normal timing and choose the next highest-leverage shop, item, or champion-stat weakness from actual use. Do not infer primary range, DPS, or total cleave value from a context-free readout.

## `0.1.19` — Read Every Cast

**Status:** implemented, pushed, and locally verified on 2026-07-10; companion site deployed and production assets verified byte-for-byte; playable game deployment pending a configured Bun/WebSocket host.

- Correct the champion-stat comprehension weakness exposed by shipped `0.1.18`: an Ashcaller carrying Focus and Quickening truthfully showed `Skill Power 115%` and `Cooldown Speed 115%`, but those aggregates never answered what happened to Flame Ring, Cinder Wall, Falling Star, or Worldfire.
- Add one compact `ABILITY IMPACT` block inside the existing non-pausing Hero Stats panel. For every learned ability, name the champion's cast, current rank, exact current per-target magnitude, and effective cooldown; keep rank-zero casts explicitly unlearned.
- Establish one shared canonical impact definition for all sixteen abilities and use it in both authoritative server resolution and the client readout. Include real secondary magnitudes only where they exist, without reducing complex abilities to a false total-pack claim.
- Keep the block visible beside either physical shop and pulse it when Focus or Quickening is accepted, so aggregate arcane stats reconcile into champion-specific consequences without a new screen, hover dependency, or pre-acceptance mutation.
- Prove every hero, legal ability rank, primary and secondary magnitude, effective cooldown, Focus and Quickening changes, native 1280×720 stats/shop coexistence, clean diagnostics, production build, authoritative suite, and real four-client convergence.

**Next-cycle nomination:** replay shipped `0.1.19` at normal timing and choose the next highest-leverage shop, item, or champion-stat weakness from real use. Do not turn exact current cast consequences into a speculative skill planner or expand the catalog.

## `0.1.18` — Wear the Gain

**Status:** implemented, pushed, and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the transaction-feedback weakness exposed by normal `0.1.17` play: routes, previews, stats, sockets, and persistent signatures were clear, but an ordinary accepted purchase landed mainly as a small combat-log sentence while the fourth copy alone had a memorable world response.
- On each directly delivered local ordinary purchase or reforge, bloom the incoming ware's established shape and color once on the actual hero, add a restrained matching burst, and repeat the exact canonical incoming Hero Stat change above the hero and in the existing toast.
- Reconstruct that result from the last authoritative player snapshot and the same canonical equipment projection and Hero Stats functions used by shop previews and server outcomes. Never speculate before acceptance or mutate live stats early.
- Keep snapshot history and reconnect acknowledgement non-transient. Keep allies quiet for ordinary purchases. Preserve the larger, longer, audible, persistent Attunement ceremony exclusively for the fourth-copy threshold.
- Prove all four wares and heroes, first-empty purchases, full-build replacements, direct-versus-replayed delivery, Attunement separation, 1280×720 hierarchy under real siege pressure, clean diagnostics, production build, authoritative suite, and four-client convergence.

**Next-cycle nomination:** replay shipped `0.1.18` at normal timing and choose the next highest-leverage shop, item, or champion-stat weakness from real use. Do not infer balance from a controller deliberately held at a vendor for visual capture.

## `0.1.17` — Read the Retreat

**Status:** implemented, pushed, and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the route-awareness weakness exposed by shipped `0.1.16`: the local shops now answer every purchase exactly once reached, but away from them an actionable wallet remained a plain number and both strategic destinations stayed tiny static minimap marks.
- Derive readiness per local player from active, living authoritative state and the actual prices of each vendor's current stock; never infer it from global party state or hard-code a universal price.
- Change the compact gold label to `WARE READY` when any socket is open and `REFORGE READY` at `6/6`. Give the tile one short non-central wake-up when the state appears, then keep a restrained funded treatment.
- Outline every currently affordable local vendor's existing minimap shape equally. Keep the Forge warm and the Reliquary cool; do not select the nearest, recommend an inventory, draw a path, or imply that the retreat is safe.
- Clear the cue below every stocked price, while downed, or outside active trade phases. If a purchase leaves enough gold for another local trade, keep the cue truthful.
- Prove `29.99 → 30`, `60 → 30`, `30 → 0`, open and full builds, down/revive, remote `B`, both vendors under real threat density, accessibility, native 1280×720 fit, normal route continuity, typecheck, production build, authoritative suite, and four-client convergence.

**Next-cycle nomination:** replay shipped `0.1.17` under normal timing and choose the highest-leverage remaining shop, item, or champion-stat weakness from actual use. Do not turn funded awareness into navigation automation or use controller-limited purchasing as evidence for economy tuning.

## `0.1.16` — Know the Next Copy

**Status:** implemented, pushed, and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the purchase-comprehension weakness exposed by shipped `0.1.15`: ordinary shop cards named a generic per-copy percentage and Attunement proximity, but did not reveal the exact champion-specific result before an immediate purchase. Exact knowledge arrived only after spending or later at the full-build reforge step.
- While any socket is open, show one compact `NEXT` line on every local ware: the affected Hero Stat's exact current-to-projected value, plus `ATTUNES` only when the purchase crosses `×3 → ×4`.
- Keep the projection visible through insufficient-gold and out-of-range states so a player can understand what they are saving or routing toward; keep live Hero Stats authoritative until the server accepts the purchase.
- Preserve immediate mouse and `1`/`2` buying. Lock ordinary cards only while one request awaits its matching authoritative socket or a purchase error, so a rapid double-click cannot spend twice against one preview.
- At `6/6`, remove the ordinary projection because the outgoing socket is unknown and return unchanged to the established slot-specific exact reforge flow.
- Prove both physical shops, affordable and disabled cards, the fourth-copy nonlinear step, 192 canonical preview-to-server purchase matches, one real double-click producing one purchase, full-build reforge continuity, native 1280×720 layout, typecheck, production build, authoritative suite, and four-client convergence.

**Next-cycle nomination:** replay shipped `0.1.16` under normal timing and select the highest-leverage remaining player-visible shop, item, or champion-stat weakness. Prefer deeper use and payoff for the four established wares over another vendor, catalog expansion, or parallel equipment system.

## `0.1.15` — Attunement Ignites

**Status:** implemented, pushed, and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the world-feedback weakness exposed by shipped `0.1.14`: panels made `×3 → ×4` exact and mechanically meaningful, but the battlefield changed by only a slight signature scale and opacity adjustment that could not reliably carry the threshold without UI.
- Extend the existing authoritative purchase event with one exact `gained` or `lost` Attunement transition and raw copy counts; ordinary fifth/sixth copies and `5 → 4` replacements remain non-events.
- Let a live `3 → 4` event bloom the same ware-shaped signature around the hero, use the existing pixel-burst and procedural-audio languages, then settle into one faint breathing echo. Let `4 → 3` contract quietly.
- Keep the echo behind the established signature and hero silhouette, reduce it further on allies, and never compete with selection marks, enemy windups, ability effects, or phase banners.
- Prove gain, loss, all four signature shapes, owner/ally difference, initial already-Attuned state, repeated snapshots, fifth-copy silence, exact four-client event convergence, snapshot-only recovery from a dropped live event, 1280×720 combat hierarchy, clean diagnostics, production build, and unchanged balance gates.

**Next-cycle nomination:** replay shipped `0.1.15` at normal timing and choose the next highest-leverage player-visible shop, ware, or champion-stat weakness. Do not add another duplicate threshold or broaden the catalog until play proves that deeper mechanical value beats polishing the established choices.

## `0.1.14` — Attune the Fourth

**Status:** implemented, pushed, and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the mechanical weakness exposed by shipped `0.1.13`: unrestricted duplicates were readable and visible, but copies one through six remained the same linear scalar choice, so a `3/3` build and a `4/2` build lacked a memorable strategic distinction.
- Attune a stack at four raw matching wares. The fourth copy contributes its normal listed scalar twice exactly once; fifth and sixth copies add one normal increment each.
- Announce the threshold at `×3`, expose raw and effective totals in Hero Stats, preview Attunement gain or loss before a full-build reforge, and modestly intensify the established dominant signature without adding another icon language.
- Keep all four wares, prices, physical shops, routes, unrestricted sockets, personal ownership, and authoritative stat derivation intact. Six slots mathematically allow at most one Attuned stack.
- Prove every hero and ware across raw counts `0–6`, all `4,096` ordered full builds, real effect paths, cooldown and creation-time invariants, replacement gain/loss, co-op isolation, four-client convergence, normal balance, maximum movement, and 1280×720 combat readability.

**Next-cycle nomination:** replay shipped `0.1.14` at normal timing and select the highest-leverage player-visible weakness from the real run. Judge whether Attunement's battlefield embodiment now trails its mechanical payoff before considering any additional item depth; do not pre-commit or broaden the catalog.

## `0.1.13` — Know the Reforge

**Status:** implemented, pushed, and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the decision weakness exposed by shipped `0.1.12`: a destructive `30`-gold replacement named generic outgoing and incoming effects but did not reveal the exact champion-specific result before spending.
- Show current-to-projected stack counts, every changed Hero Stat, and the resulting dominant battlefield signature in the final compact confirmation.
- Derive that preview from one canonical equipment projection and the same canonical Hero Stats model used by server authority; keep the live Hero Stats panel unchanged until the server accepts the trade.
- Preserve the established catalog, effects, price, six unrestricted run-only sockets, two physical routes, dominant-signature rule, combat, economy, and controls.
- Prove signature-changing and signature-preserving reforges, mouse and keyboard confirmation, cancellation without spending, safe pending/focus behavior, 1280×720 combat readability, exact server parity, production build, real four-client convergence, and clean rendered diagnostics.

**Next-cycle nomination:** replay shipped `0.1.13` and choose between deeper duplicate payoff and deeper signature embodiment only if one is the highest-leverage player-visible weakness; do not pre-commit to either or add catalog breadth.

## `0.1.12` — Wear the Build

**Status:** implemented, pushed, and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the visual weakness exposed by shipped `0.1.11`: panels explained a build, but the battlefield hero looked identical with zero equipment and a committed six-slot loadout.
- Give every equipped hero one restrained, shape-coded corona for the ware with the greatest socket investment; ties resolve to the ware occupying the lowest slot.
- Keep all four identities readable without relying on color alone: Edge blades, Greaves chevrons, Focus diamonds, and a broken Quickening sigil.
- Attach the signature to the existing hero pose behind the silhouette, show allies at reduced intensity, and show nothing for empty equipment.
- Keep the checkpoint presentational and derive it from the authoritative ordered equipment snapshot without changing item power, build rules, combat, economy, or shop behavior.
- Prove empty, tied, majority-changing replacement, all four item variants, action-pose attachment, 1280×720 telegraph hierarchy, typecheck, authoritative tests, production build, real four-client convergence, and clean rendered diagnostics.

**Next-cycle nomination:** replay shipped `0.1.12` at normal timing and choose the next highest-leverage player-visible shop, item, or Hero Stats weakness. Prefer a deeper decision or payoff over catalog breadth.

## `0.1.11` — Read the Build

**Status:** implemented, pushed, and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the presentation weakness exposed by shipped `0.1.10`: six socket symbols communicated capacity and legality, but made the actual build and duplicate investment difficult to read.
- Group equipped wares in Hero Stats by first-equipped order, showing each name, copy count, and canonical total effect.
- Show the current owned count directly on every local shop card so repeat-purchase and replacement decisions are readable before commitment.
- Keep this layer presentational: authoritative equipment snapshots and canonical item definitions remain the only source of truth.
- Preserve both physical shops, four established effects, universal `30`-gold price, six unrestricted duplicate-ready run-only sockets, full-build replacement, economy pacing, routes, combat, controls, art, audio, and phase flow.
- Prove empty, mixed, and six-duplicate summaries; shop and replacement readability at 1280×720; accessible labels; typecheck, authoritative tests, production build, four-client smoke, and clean rendered diagnostics.

**Next-cycle nomination:** replay shipped `0.1.11` at normal timing and choose the next highest-leverage player-visible shop, item, or Hero Stats weakness without adding catalog breadth or a parallel system.

## `0.1.10` — Weight of Gold

**Status:** implemented, pushed, and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Correct the purchasing-power weakness exposed by normal `0.1.9` play: an efficient route filled all six sockets by `51.63s`, retained `42` gold, and had accumulated `402` gold by `84.65s`, enough for ten additional full-price replacements.
- Reduce repeatable imp, hound, and brute rewards to `1/1/3` gold while preserving the Gatebreaker's defining `35`-gold payoff and the Rift Guard's later `6` gold.
- Charge one universal `30` gold for every ware and replacement so the first safe retreat earns one defining choice, six slots arrive near the siege midpoint, and each later reshape needs a fresh combat window.
- Keep reward division, wallet ownership, prices, proximity, purchases, capacity, equipment, and effects authoritative and exact for one through four players.
- Preserve both physical shops, their four existing effects, six unrestricted duplicate-ready run-only sockets, all combat and encounter tuning, controls, art, audio, and phase flow.
- Prove normal solo pacing, the Reliquary route across `518` stratified and regression seeds, exact co-op conservation, real four-client convergence, production build, rendered shop presentation, and clean diagnostics.

**Next-cycle nomination:** replay shipped `0.1.10` at normal timing and choose the next highest-leverage player-visible shop, item, or Hero Stats weakness. Deepen the established loop before adding catalog breadth or a parallel system.

## `0.1.9` — Reshape the Six

**Status:** implemented, pushed, and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Keep both physical shops strategically relevant after all six unrestricted sockets are occupied: select one ware from the local vendor, select one occupied socket, inspect the outgoing and incoming effects, and explicitly confirm.
- Charge the same full 24-gold price, consume the old item without a refund, and leave the build at exactly `6/6`; reject a same-item no-op without spending.
- Preserve the pre-full rule: every purchase still auto-equips into the first empty socket, and unrestricted duplicates remain legal.
- Keep replacement authoritative for phase, living state, vendor, stock, range, full-loadout eligibility, funds, slot identity, price deduction, equipment, and derived Hero Stats. Bind confirmation to the expected outgoing item so stale or repeated input cannot alter a different socket.
- Reflow existing ability cooldown progress when Quickening Sigil enters or leaves a build, preserve creation-time damage for existing projectiles, delayed attacks, and summons, and keep every player's wallet and equipment isolated in co-op.
- Prove the compact non-pausing flow with mouse and keyboard at 1280×720, including cancellation, same-item rejection, real stat changes, six-slot continuity, authoritative tests, production build, and four real WebSocket clients.

**Next-cycle nomination:** replay the full `0.1.9` shop loop under normal siege pressure and judge whether the four established wares still produce meaningful endgame tradeoffs. Select the next bounded depth checkpoint only from that rendered weakness; do not pre-commit to more catalog or systems.

## `0.1.8` — two roads to power

**Status:** implemented and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host.

- Convert the northeast Citadel shell into the Veilglass Reliquary, visually distinct from the warm northwest Forge and locally accessible only inside its seven-unit radius.
- Offer exactly two additional 24-gold wares: Runebound Focus (`+15%` Skill Power) and Quickening Sigil (`+15%` Cooldown Speed).
- Make North's equal-cost left/right retreat a build choice: Forge for Basic Damage or movement, Reliquary for ability magnitude or frequency. East naturally favors the Reliquary and West the Forge; do not claim equal South-lane coverage.
- Generalize the single compact `B` panel to the nearest in-range vendor without adding tabs, a global selector, a catalog grid, or pausing multiplayer.
- Preserve creation-time power for projectiles, delayed attacks, and summons; preserve remaining cooldown progress when Recovery changes; keep all stock, range, price, equipment, capacity, and effects authoritative.
- Reject a strategically interesting location if real play makes solo defense impractical. The first southeast pass breached North; after an over-permissive northeast replay was rejected, the corrected normal rendered route controlled the real outbound danger band and returned with North `260 → 253` and the Nexus untouched. A `100`-seed normal-timing sweep completed every route without a down or Nexus damage.

## `0.1.7` — the First Forge

**Status:** implemented and locally verified on 2026-07-10; companion site deployed and live-render verified; playable game deployment pending a configured host.

- Make the northwest Ironbound Forge a recognizable physical destination rather than a global menu or anonymous building.
- Let a hero earn personal gold, retreat to the Forge, inspect two contrasting 24-gold wares, buy by mouse or `1`/`2`, auto-equip, and return to combat while the siege continues.
- Establish exactly six unrestricted run-only slots immediately; duplicates occupy separate slots and stack additively from the hero's verified base stat.
- Offer only Tempered Edge (`+20%` Basic Damage) and Fleetstep Greaves (`+10%` Move Speed), both inexhaustible and personal.
- Keep stock, proximity, phase, living state, price, deduction, capacity, equipment, and effects authoritative on the server.
- Prove one local detour and trade loop without claiming multiple-shop route choice, replacement, salvage, rarity, recipes, or permanent progression.

## `0.1.6` — truth before trade

**Status:** implemented and locally verified on 2026-07-10; deployment verification pending a configured game host.

- Establish one canonical, server-derived source for maximum health, movement speed, basic damage, attack cadence, skill power, and cooldown recovery.
- Expose those values in one compact `C` panel without pausing play, stealing combat input, or inferring authority on the client.
- Divide every enemy's personal gold reward evenly among connected players so lane assignment and last hits cannot distort purchasing power.
- Keep dropped gold and Rift Shards as honest combat feedback rather than a second, proximity-consumable reward path.
- Preserve all current hero baselines, solo income, skill ranks, controls, visual language, encounter balance, and phase flow.
- Verify the live rendered panel during movement and casting, one-to-four-player reward accounting, production build, and real four-client state.

## Approved Armory arc

The progression arc remains intentionally narrow: multiple physical Citadel shops with different small inventories, run-only purchases, and exactly six unrestricted equipment slots. Any item or duplicate may occupy any slot. `0.1.7` proved the first physical vendor and visible stat payoff; `0.1.8` proved two distinct local destinations, four curated wares, nearest-vendor interaction, and a real route/build choice without a global menu; `0.1.9` keeps those destinations useful at `6/6` through one explicit, full-price replacement decision; `0.1.10` makes those choices carry weight by pacing the first ware, full six-slot build, and later replacements across distinct combat windows; `0.1.11` makes each completed build and duplicate investment legible without changing its rules; `0.1.12` lets that investment visibly live on the battlefield without adding power; `0.1.13` makes the exact champion-specific result of an irreversible reforge knowable before spending; `0.1.14` makes four matching wares a real commitment by doubling only the fourth copy's ordinary scalar once; `0.1.15` makes that commitment arrive once and remain visible in the battlefield without changing its power; `0.1.16` makes every ordinary purchase as champion-specific and knowable as the established reforge without slowing the first six choices; `0.1.17` makes actionable personal gold and its two physical destinations readable from combat without choosing the retreat for the player. South remains intentionally underserved rather than receiving remote access. Future checkpoints must begin with rendered play and add one deeper layer at a time only when that layer is the highest-leverage weakness.

## `0.1.5` — authoritative contact spacing

**Status:** implemented and locally verified on 2026-07-10; deployment verification pending a configured game host.

- Give enemies deterministic engagement slots around players, gates, and the Nexus instead of one exact shared destination.
- Add restrained local separation during travel without introducing navigation, physics, or pathfinding scope.
- Keep Wraith Host spirits individually legible when several attack the same prey.
- Match the approved concept's common-demon scale more closely while retaining large elite silhouettes.
- Preserve counts, cadence, health, damage, attack timing, controls, camera, and encounter content.
- Verify gate damage, telegraph readability, solo and four-client state, high-density update cost, and the real rendered formation.

## `0.1.4` — Wraith Host summon fantasy

**Status:** implemented and locally verified on 2026-07-10; deployment verification pending a configured game host.

- Replace the five-projectile placeholder with persistent, authoritative wraith minions.
- Give summoned spirits independent acquisition, pursuit, repeated strikes, retargeting, idle orbiting, expiry, and Rift Heart interaction.
- Render a distinct Gravebinder-aligned spirit silhouette without obscuring enemies or the Nexus.
- Preserve the hero's established controls, cooldown, rank progression, sustain identity, and multiplayer authority boundary.
- Validate server ownership, real rendered motion, horde readability, multiplayer snapshots, and production build.

## `0.1.3` — action-bar skill progression

**Status:** implemented, verified, and stopped for player review on 2026-07-10.

- Remove the separate skill-choice panel and make the established `Q`/`E`/`R`/`F` bar the only upgrade surface.
- Show a compact gold `+` only on legal upgrades; keep the rest of each slot dedicated to casting.
- Keep `Q`/`E`/`R`/`F` as cast inputs and add `Ctrl` + ability key as the matching keyboard upgrade shortcut.
- Cap banked points against remaining ranks so fully maxed builds never receive an unusable point or prompt.
- Verify direct mouse upgrade, keyboard upgrade, and normal casting at 1440×900; stop here for review.

**Resolved in `0.1.4`:** Gravebinder's Wraith Host now uses authoritative summon/minion behavior.

## `0.1.2` — player-count-native siege space

**Status:** implemented, verified, and stopped for player review on 2026-07-09.

- Freeze one active defense lane per starting player from wave one through the breach.
- Scale total pressure through lane count while keeping per-lane spawn cadence and enemy health consistent with solo.
- Deepen the city, gates, approaches, and counterattack road without changing the approved camera language or central Nexus.
- Visibly seal inactive approaches and remove persistent monster direction markers while preserving attack windups.
- Verified solo and four-player topology at 1440×900 with keyboard and mouse; stopped here for review.

**Recorded at this checkpoint:** Gravebinder's Wraith Host did not yet deliver its promised summon fantasy, and a fully maxed hero could receive an unusable skill point. The point-cap issue is resolved in `0.1.3`; Gravebinder remains deferred.

## `0.1.1` — readable combat grammar

**Status:** implemented, verified, and stopped for player review on 2026-07-09.

- Keep the approved camera, Citadel, Nexus pressure, density, and phase flow.
- Reduce the action language to LMB primary plus four large `Q`/`E`/`R`/`F` ability slots; remove Space dodge.
- Replace the generic run talent with one skill point per hero level and visible per-ability ranks.
- Add authoritative hero windup/impact/recovery and enemy windup-before-damage states.
- Give Warden charge, wave, standard, and ultimate distinct world silhouettes.
- Verified before/after at 1440×900 with keyboard and mouse; stopped here for review.

## `0.1.0` — first playable vertical slice

**Status:** playable, verified, and stopped for player review on 2026-07-09.

### Foundation

- Browser-first client with an elevated three-quarter camera and compact HUD.
- Authoritative Bun multiplayer room for 1–4 local browser clients.
- Central Aegis Citadel, visible Heartfire Nexus, and four readable gates.
- Server-enforced selection of exactly four unique heroes with no duplicates.

### Playable proof

- All four heroes selectable and recognizably different under one shared control layout.
- Fast movement, aimed primary attacks, dodge, three abilities, and an ultimate.
- Dense but readable demon combat with hit flashes, knockback, impact audio, restrained shake, and clear telegraphs.
- A short defense sequence that escalates into one forced gate-breach pressure state.
- One non-pausing, three-way talent choice with an immediately readable build effect.
- A short group counterattack and one Rift payoff encounter.
- Nexus destruction defeat state and Rift destruction victory state.

### Verification gate

- Type and automated tests pass.
- One-, two-, and four-client rooms share authoritative state.
- Simultaneous duplicate hero selection cannot succeed.
- A complete run is playable from hero selection to victory or defeat in 5–10 minutes.
- Camera, performance, effects, HUD, and threat readability receive a manual browser playtest.
- `/health` and `/debug/state` expose enough information to diagnose a run without changing gameplay.

## Checkpoint operating gate

The first playable has been reviewed and ongoing technical and gameplay direction is authorized. Begin each checkpoint by playing the latest verified build, choose the highest-leverage player-visible weakness, implement one bounded improvement, and validate the real rendered result before versioning it. Do not begin deferred work or change the approved promise as a consequence of routine playtest findings.

Keep evaluating these questions against the actual build:

1. Does movement and attacking feel immediately satisfying?
2. Is the central Nexus objective always clear?
3. Do the four heroes feel meaningfully different?
4. Does the breach create exciting pressure rather than confusion?
5. Does the counterattack and Rift destruction feel like a payoff?
6. Is the camera close enough for impact and wide enough for co-op awareness?

Do not schedule expansion until those answers support it in the actual build.

## Playable-hosting quality gate

Content-fingerprinted immutable client assets and bounded in-memory defender resume shipped in `0.1.24`. Before claiming a public playable deployment, disable or protect debug mutation routes; enforce WebSocket Origin, payload-size, and input-rate limits; and prove the supported room and snapshot scale. A configured Bun/WebSocket target must then pass the complete rendered run and diagnostics live. Until those gates pass, only the companion site is deployed.

## Deferred beyond the slice

- Larger wave and boss catalogs.
- Broad loot rarity catalogs, recipe trees, crafting systems, and permanent equipment progression beyond the approved Armory arc.
- Permanent Citadel Renown and corruption difficulties.
- Matchmaking, public rooms, join-in-progress, and reconnection beyond the bounded same-run recovery window.
- Mobile and controller input implementations.
- Additional maps, modes, heroes, or long-form campaign content.

The hero roster remains capped at four even after expansion.
