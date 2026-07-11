# Slice-first roadmap

This roadmap is a scope guard, not a content backlog. Work proceeds as one played, rendered, verified checkpoint at a time; expansion remains deferred until the 5–10 minute run earns it.

## `0.1.32` — Choose to Endure

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host and the remaining public-host gates.

- Resume from shipped `0.1.31` and replay its real production Forge before changing it. The higher price and buyback made each slot consequential, but the warm physical shop still offered only two scalar answers—more Basic Damage or more Move Speed—while the approved concept made a major acquisition read as a distinct choice around the hero. Item breadth remained the highest-leverage player-visible weakness.
- Remove the technical blocker before adding content. Define one canonical exhaustive item-ID set and let each ware own its primary stat and modifiers so a fifth or unknown ID can never fall through to Quickening Sigil and silently receive Cooldown Speed behavior.
- Add exactly one Forge ware: Gateward Plate costs `60`, sells for `30`, and grants `+15 Max Health` per effective copy. It uses the established fourth-copy Attunement, so raw copies zero through six contribute `0`, `15`, `30`, `45`, `75`, `90`, and `105` Max Health. Do not add armor, regeneration, a proc, an active, a new slot rule, or an additional item.
- Preserve current health percentage through every accepted Plate purchase, sale, and full-build reforge. The ordinary card names the exact Max Health step; final trade review also names current/max arithmetic and the retained percentage so capacity never disguises a heal or damage event.
- Give Gateward one restrained copper paired-plate signature around the hero's midsection and reuse the established ordinary receipt and Attunement ceremony. It adds no ring, beam, persistent particle, or audio cue and stays subordinate to hero silhouette, enemy warnings, and major casts.
- Let the existing Forge hold all three local answers simultaneously at native `1280×720`: mouse and `1`–`3` remain immediate, all cards keep the `8px` tactical-copy floor, and the panel requires no scrolling or overlap with the minimap, controls, action bar, Hero Stats, or battlefield. The Reliquary remains a distinct two-ware destination.
- Keep Gateward a capacity commitment rather than the ranged or Gravebinder fix. Across 30 matched Ashcaller seeds, Plate produced `28` clean runs, `2` downs, and `195.6` mean gate health versus Edge's `26` clean, `4` downs, and `198.6`; across 100 matched Riftstalker seeds, Plate produced `20` clean runs, `108` total downs, and `60.1` mean gate health while Edge remained stronger at `34` clean, `83` downs, and `108`. Plate offers a useful survival choice but does not erase ranged execution difficulty. Soul Scythe healing and every ability magnitude remain unchanged.
- Compare the shipped [two-card Forge](playtest/gateward-plate-before.jpg) with the final [three-card ordinary shop](playtest/gateward-plate-after.jpg), [fourth-copy Attunement](playtest/gateward-plate-attuned.jpg), [health-preserving full-build reforge](playtest/gateward-plate-reforge.jpg), and [cross-vendor sale](playtest/gateward-plate-sale.jpg). Every native frame is `1280×720`, has no viewport overflow, and produced empty browser warning/error diagnostics.
- The final production asset `main-9e93e56438b5fe60.js` is `637,990` bytes; typecheck, `200` tests with `12,872` assertions across `28` files, fixed-asset `404` smoke, focused Plate authority/reconnect coverage, and real four-client three-ware-stock plus established sale/reforge/reconnect convergence pass.

**Review evidence carried forward:** the Armory now has five distinct wares, including a first direct Max Health decision, without broad catalog growth. Plate does not make Riftstalker's difficult ranged execution safe, and Gravebinder's Soul Scythe sustain plus broader champion-skill differentiation remain explicit player-facing weaknesses.

**Technical risk carried forward:** gameplay and generic presentation still share one RNG stream and one `idCounter`. The matched Plate-versus-Edge controller results are broad final-state evidence, not exact causal deltas: item-specific effects can alter presentation calls and therefore later seeded simulation. Split gameplay and presentation randomness together before treating cross-version or cross-build same-seed differences as a strict tuning contract.

**Next-cycle nomination:** begin from locally verified `0.1.32`, then play all four champions through the real five-ware build choices and compare the leading dynamic combat weakness. Prefer one champion-promise checkpoint—Riftstalker execution readability, Ashcaller's persistent Cinder Wall identity, or Gravebinder Soul Scythe sustain—over another ware, parallel kit rewrites, or a sixth item.

## `0.1.31` — The Armory Buys Back

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host and the remaining public-host gates.

- Resume from shipped `0.1.30` and replay the real physical-shop economy before changing it. The rendered Forge still priced every decision at `30`, offered no way to undo an equipped choice, and destroyed an outgoing full-build ware without value; legal normal timing also funded a complete build and repeated reshaping too predictably.
- Raise every established ware to `60` gold without increasing rewards. Preserve a guaranteed first defining choice across all four champions, but move the third ware, full build, and repeated reshaping into later performance-dependent defense windows.
- Let either existing physical shop buy any equipped ware for exactly `30` gold while preserving its distinct incoming inventory. `X` opens a non-pausing sell mode, mouse or `1`–`6` chooses one exact occupied unrestricted slot, and `Enter` confirms only after the complete consequence is visible.
- Make the sale preview name the outgoing ware, exact slot, stack and Attunement change, affected Hero Stats, dominant signature, open socket, and wallet arithmetic. Empty slots remain disabled, `Escape` backs out, and accepted or rejected requests return to truthful current state without a bulk, drag, or remote inventory surface.
- Keep six-slot reshaping atomic: a local stocked ware still replaces one reviewed occupied slot in one server transaction, now for `BUY 60 − TRADE-IN 30 = 30 GOLD NET`. The build never exposes an intermediate hole, and same-ware, stale-slot, remote, inactive, downed, or underfunded requests remain non-mutating.
- Preserve active `Q`/`E`/`R`/`F` cooldown percentage when Quickening enters or leaves, never touch LMB cadence or current action timing, never rewrite already-created Focus-scaled effects, and release Attunement or Combat Stride only when the resulting raw stack falls below four.
- Keep global purchasing-power cues honest: an incomplete build needs `60` for `WARE READY`; a complete build needs `30` and a legal stocked change for `REFORGE READY`. Selling remains a deliberate local action and does not make both shops glow remotely.
- One hundred normal-timing Warden defenses fund the first `60` by `42.6s` at latest, reach `180` at `116.8s` at latest, and finish with `286`/`383`/`411` minimum/median/maximum gold. Only `78/100` reach the `360` needed for six ordinary wares before defense ends, and only `40/100` reach `390` for a subsequent reforge.
- All `518` stratified current-tree `60`-gold Reliquary routes remain viable: affordability lands at `38.833`/`40.306`/`42.033`/`43.617s` minimum/mean/p95/maximum; return-gate health is `146`/`227.990`/`260` minimum/mean/p95 with an untouched `800` Nexus, no downs, and at worst `-14` player HP across the route.
- Native `1280×720` sale confirmation, accepted cross-vendor sale, and full-build reforge renders expose `60`, `+30`, and `30 NET` without clipping, viewport overflow, warning, or error diagnostics. The final production asset `main-6015af4b11019435.js` is `636,176` bytes; typecheck, `193` tests with `10,903` assertions across `27` files, fixed-asset smoke, and real four-client sale/reforge/reconnect convergence pass.

**Review evidence carried forward:** selling and higher prices are now addressed without weakening local-shop strategy or the six unrestricted slots. The catalog still has only four wares, Soul Scythe still makes Gravebinder unusually safe, and the four kits can gain stronger identities only through one champion promise at a time rather than parallel ability rewrites.

**Technical risk carried forward:** the four current wares still feed a hardcoded derived-stat fallback that treats the final known branch as Quickening. Adding a fifth ware before replacing that fallback with exhaustive item-owned modifiers risks silently granting the wrong stat. Generic presentation effects and gameplay also continue sharing RNG and one ID stream.

**Next-cycle nomination:** begin from shipped `0.1.31` and play the four current item routes and complete-build choices. If catalog repetition remains the highest-leverage visible weakness, first make item stat derivation exhaustive, then compare the approved shop concepts with the rendered two-card vendors and ship one identity-bearing fifth ware at one physical shop. Do not add several items, another slot system, Soul Scythe tuning, or parallel champion-kit changes in that checkpoint.

## `0.1.30` — Bound the Host

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host and the remaining public-host gates.

- Correct the highest-leverage dynamic weakness carried from shipped `0.1.29`: Wraith Host appended `3`/`4`/`5` summons with no owner cap, and every Wraith struck every `0.72s` until a `7.25–9.75s` lifetime expired. Base lifetime output reached roughly `720`, `1,350`, and `2,340` damage by rank while every contact rendered a generic impact plus souls ring and two seven-particle bursts. Idle orbit could emit the same false contact read without damaging anything.
- Give each server-owned Wraith a maximum of three successful strikes and dismiss it immediately after the third. Keep the short lifetime and older-spirit cap eviction as earlier exits, preserve per-strike damage and creation-time Skill Power, and never spend the budget while orbiting without an enemy or active Rift Heart.
- Cap active Wraiths at five per owner. A new cast always raises its complete `3`/`4`/`5` rank-sized Host; if overlap would exceed the cap, deterministic insertion order dismisses the oldest owned Wraiths first. Maximum rank totals become `216`, `360`, and `540` base damage, and repeated casts cannot accumulate parallel armies.
- Keep the two established server effect calls, RNG draws, IDs, and ordering for every real enemy or Rift contact. Tag the generic companion effect for client suppression and retag the short soul contact as `wraith_impact`, rendered once as a compact green crossed mark with no particle burst. Untagged impacts, Rift hits, and Gravebinder's major soul casts remain unchanged.
- Make the limit visible in canonical Hero Stats: Wraith Host now reads `24/30/36 DMG / 3×3, 4×3, or 5×3 HIT CAP`, with the rank-sized Host, up-to-three limit, and five-active cap in its accessible description. The rank description states that no more than five remain and each spirit fades after its third strike.
- Compare the shipped sustained-contact frame with controlled current contact and stats renders at native `1280×720`. The `5×3 HIT CAP` row fits without clipping, world and HUD remain exactly `1280×720`, and fresh browser warning/error diagnostics are empty.
- Preserve viability without pretending full class parity is solved. Thirty normal current-tree Gravebinder openings remain `30/30` Nexus-alive, `30/30` no-down, and `30/30` intact-gate runs; mean kills move from `211.6` to `207.7`, 60 gold remains funded in every run at `40.7s` mean and `42.8s` latest, and minimum observed health falls from `149` to `131`. Soul Scythe sustain remains a separate candidate.
- The final production asset `main-72fd5d2507d7224f.js`, `181` tests with `10,630` assertions across `26` files, fixed-asset smoke, and real four-client convergence pass. All clients agree on the five-Wraith cap; three peers retain the exact summon IDs during Gravebinder's disconnect reservation, and all four converge on the same IDs after resume.

**Review evidence carried forward:** Wraith Host output and contact accumulation are now bounded, but Soul Scythe still makes Gravebinder unusually forgiving and the four skill kits can be differentiated further only one promised hook at a time. The Armory still lacks selling, wares remain too cheap, and catalog breadth is insufficient.

**Technical risk carried forward:** generic presentation effects and gameplay still share both RNG and one ID counter. This checkpoint preserves the established two draws and IDs at every real Wraith contact and hides only tagged companions; split both streams together before treating exact cross-version seeded wave deltas as balance truth. A fifth ware remains blocked by the hardcoded four-item stat fallback, which risks treating unknown equipment as Quickening.

**Next-cycle nomination:** begin from shipped `0.1.30` and play legal shop routes at the first, sixth, and post-build earning windows. If the reported economy weakness remains leading, ship `The Armory Buys Back` as one checkpoint: `60`-gold wares, `30`-gold exact-slot selling at either physical shop, and a `30`-gold net full-build reforge. Do not add a fifth item or rebalance Soul Scythe in the same cycle.

## `0.1.29` — Read the Screen

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host and the remaining public-host gates.

- Correct the highest-leverage weakness reproduced from shipped `0.1.28`: at native `1280×720`, the approved concept held playable stone in clear midtones while the real build crushed the world beneath strong vignette, noise, and near-black panel chrome. Decision-bearing shop and Hero Stats copy also collapsed below a practical reading floor in ordinary, evolution, Reliquary, and six-slot reforge states.
- Raise the static world hierarchy with brighter sky and fog, modestly stronger cool and warm scene fill, and lighter noise and vignette overlays. Preserve established renderer exposure and tone mapping so a major Death Tide remains the brightest authored event and ordinary combat does not gain another effect.
- Establish an `8px` native floor for tactical copy across Hero Stats, shops, reforge, objectives, actions, and resources. Keep only the compact controls strip deliberately subordinate at `7px`, reposition it above the resource HUD, and preserve the keyboard/mouse input reference without obscuring the action bar or an open vendor.
- Widen Hero Stats and redistribute existing density: compact shop ownership into `×N/4`, `NEXT`, `ATTUNED`, or `STRIDE`; stack long Combat Stride and reforge outcomes; let tertiary ware flavor yield; and keep exact effects, prices, current-to-projected results, six sockets, City Watch, and accessibility descriptions intact.
- Compare shipped calm and lobby baselines plus the approved gameplay triptych with real calm, dense combat, Gravebinder full-kit, Forge, Reliquary, Greaves evolution, and six-slot reforge states. The final `1280×720` layouts expose every targeted decision string without horizontal clipping, preserve the untouched lobby composition, and produce empty warning/error diagnostics.
- Keep this checkpoint presentation-only: no mechanic, damage, heal, summon, enemy, objective, price, catalog, slot, Attunement, Combat Stride, protocol, RNG call, effect geometry/count, audio, control, camera, or server-authority change. The final production asset `main-3d95edab7057619a.js`, `176` tests with `10,569` assertions across `25` files, production smoke, and real four-client convergence pass.

**Review evidence carried forward:** the screen now has a usable static hierarchy, but Gravebinder's Wraith contact pile remains dynamically additive and its full kit remains substantially safer and stronger than the roster. The Armory still needs selling, higher prices, and careful breadth. The retained economy candidate is `60` gold per ware with `30`-gold exact-slot selling at either physical shop; do not combine that work with Gravebinder containment or a fifth ware.

**Technical risk carried forward:** Wraith Host has no owner cap and each summon can keep attacking until lifetime expiry; generic cosmetic effect rotation also consumes gameplay RNG. Bound summons without changing seeded wave truth by separating presentation randomness or using broad final-state gates before removing generic Wraith impact effects. Item diversity remains gated on replacing the hardcoded four-ware stat fallback, which currently risks treating an unknown item as Quickening.

**Next-cycle nomination:** begin from the shipped `0.1.29` render and play legal Gravebinder full-kit and physical-shop routes again. Choose the single leading weakness between `Bound the Host`—exactly three strikes per Wraith, at most five active Wraiths per owner, one compact Wraith impact—and `The Armory Buys Back`—`60`-gold wares with `30`-gold exact-slot selling at either shop. Keep Soul Scythe sustain and any fifth ware as later bounded decisions.

## `0.1.28` — Trust the Shot

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host and the remaining public-host gates.

- Correct the ranged-combat failure reproduced after shipped `0.1.27`: with primary-only legal input and perfect current target aim, Riftstalker lost the Nexus around `0:56` with `32` kills and Ashcaller around `0:55` with `31`. Their declared `22`/`20` range was unused, aim froze at windup start, a `0.1s` step could tunnel through enemies, and tiny travel forms disappeared beneath oversized generic impact aftermath.
- Resolve ranged basics toward the latest server-accepted aim at release, stop them at the champion's canonical range, give only those basics an honest `0.75` collision envelope, and sweep traveled segments in deterministic nearest-first order. Keep Warden and Gravebinder committed to windup direction.
- End ranged active and recovery occupancy before the established cooldown expires, turning the saved time into full-speed idle positioning rather than faster attacks or free movement inside commitment. Preserve Combat Stride's `15%` movement advantage during primary windup and impact.
- Deepen the two ranged identities without making their skill kits more alike: Repeater Shot penetrates the nearest two bodies; Ember Lance keeps its full direct hit and releases a three-unit half-damage burst around first contact. Preserve basic damage, cadence, and one-target or Rift Heart output.
- Give Repeater Shot its own projectile kind so Vaulting Blade and Execution Volley retain the established `arrow`. Replace circular travel dominance and the generic ring-plus-particle impact on ranged basics with brief champion-colored launch streaks, thin directional cores and tails, and compact yaw-aligned contact shards. Keep enemy flash, damage numbers, audio, and restrained shake.
- Establish one legal, normal-timing, thirty-seed, 120-second all-four viability gate before the Armory is repriced. The current tree keeps all `30/30` Riftstalker and Ashcaller Nexus defenses alive while Riftstalker remains deliberately fragile: `7/30` no-down runs and `89.4` mean North-gate health versus Ashcaller's `21/30` no-down runs and `184.8` mean gate health. Both fund a 60-gold first choice in every run before `75s`, averaging `43.2s` and `43.6s` respectively.
- Compare the shipped Ashcaller baseline and approved gameplay triptych with native `1280×720` Riftstalker and Ashcaller combat. Ordinary attacks now read as thin direction and contact beneath the champion, enemies, gate state, and major effects. The final production asset `main-6bfcf1963209c5f3.js`, `176` tests with `10,569` assertions across `25` files, production smoke, real four-client convergence, exact viewport fit, and empty warning/error diagnostics pass.

**Review evidence carried forward:** exact gate durability and ranged-primary trust are now addressed. The same review still identifies overall darkness and additive effect clutter, Gravebinder sustain and Wraith Host scaling, insufficient skill differentiation, missing selling, prices that feel too cheap, and insufficient item breadth. The new all-four affordability gate makes the retained `60`-gold price and `30`-gold sellback candidate testable across the roster; catalog growth remains one ware at a time after the hardcoded four-item stat fallback is removed.

**Technical risk carried forward:** generic cosmetic effect rotation still consumes the gameplay RNG stream, while the new directional ranged-primary impacts do not. Seeded wave composition can therefore shift when presentation call counts change. The final-tree gate asserts broad survival, identity, and economy floors rather than treating cross-version exact seed deltas as balance truth; separate simulation and presentation randomness before exact seeded comparisons become a long-term tuning contract.

**Next-cycle nomination:** begin from the shipped `0.1.28` render and compare a legal Gravebinder full-kit run with the roster and the approved gameplay concept. Choose between the confirmed Gravebinder power/readability gap and the now-unblocked physical-shop economy as the single leading weakness; if the Armory leads, test `60`-gold wares with exact-slot `30`-gold selling at either physical shop before adding item breadth. Do not combine balance, selling, repricing, and a fifth ware into one checkpoint.

## `0.1.27` — Read the Wall

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host and the remaining public-host gates.

- Correct the missing defensive decision exposed by the shipped `0.1.26` replay and player review: the top objective truthfully named Nexus health, but City Watch reduced an active front to `OPEN · threat`, the minimap treated its gate as merely intact or breached, and the physical gate communicated durability only through a subtle crystal scale. A full and one-hit-from-fallen wall therefore read almost alike while the player was deciding whether to hold, rotate, or leave for a local shop.
- Derive one canonical gate readout from the authoritative `hp`, `maxHp`, `breached`, active-lane, and threat snapshot. Keep each existing `20px` City Watch tile, replace `OPEN` with an exact clamped percentage, add one restrained two-pixel fill, name `SEALED` and `FALLEN` explicitly, and expose raw health plus threat count through the existing title and accessible label.
- Add one calm world-space bar above every active gate. Let healthy, pressured, critical, and empty states change by fill and color without a pulse, particle, banner, sound, or second warning language. Keep the Heartfire Nexus as the sole dominant top bar and the only objective whose loss ends the run.
- Preserve gate durability, enemy damage and targeting, lane allocation, phase rules, routes, shops, prices, catalog, six unrestricted slots, champion stats, abilities, art, audio, controls, protocol, and server authority. This checkpoint reveals an existing resource; it does not rebalance or duplicate it.
- Compare the approved gameplay triptych and the shipped `OPEN · threat` baseline with real native `1280×720` full, half, critical, fallen, four-front, and shop-open renders. The final production bundle `main-680c295ef9e435bb.js`, `162` tests with `10,223` assertions across `23` files, production smoke, and real four-client convergence pass with no warning/error logs or overflow.

**Review evidence carried forward:** the same intake identified under-signalled and mechanically unforgiving ranged primaries, Gravebinder sustain and Wraith Host scaling, overly additive effects and undersized interface text, missing selling, insufficient catalog breadth, and prices that feel too cheap. Fresh all-hero diagnostics show that Warden and Gravebinder currently survive the same legal full-kit controller while Riftstalker survives only half its runs and Ashcaller none; therefore higher prices cannot be finalized against Warden-only pacing without deepening the ranged disadvantage. The economy audit retains a `60`-gold, `30`-gold sellback candidate and one-ware-at-a-time catalog growth, but neither is approved for implementation until all-four solo viability is a real gate.

**Next-cycle nomination:** replay shipped `0.1.27` with Riftstalker and Ashcaller and bound the next checkpoint around ranged-primary viability and readability if the reported weakness remains the highest-leverage failure. Make canonical range real, improve deterministic server-owned aim/collision forgiveness, and redistribute existing launch/projectile/impact contrast rather than adding spectacle. Establish an all-four normal-timing solo gate before repricing wares, then address Gravebinder with identity-preserving sustain and summon caps before deepening one promised skill hook at a time.

## `0.1.26` — Read the Time

**Status:** implemented, pushed, and locally verified on 2026-07-11; companion site deployed and live-render verified; playable game deployment pending a configured Bun/WebSocket host and the remaining public-host gates.

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

The later verified depth remains on that same spine: `0.1.18` makes acceptance land on the hero; `0.1.19` and `0.1.20` translate aggregate stats into named cast and primary consequences; `0.1.21` exposes commitment from the first copy; `0.1.22` removes impossible no-change offers; `0.1.23` and `0.1.25` let Attuned Greaves carry and visibly leave a restrained Combat Stride; `0.1.24` preserves the same live build through a bounded reconnect; `0.1.26` names learned Quickening returns; `0.1.29` keeps the densest decisions readable; `0.1.31` establishes `60`-gold purchases, `30`-gold exact-slot selling, and `30`-gold net reforging; and `0.1.32` adds Gateward Plate as one exhaustive, health-percentage-preserving fifth ware rather than broad catalog expansion. The current boundary is five wares across two local shops, not an invitation to add a sixth without a new played weakness.

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
