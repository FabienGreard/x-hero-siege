# Changelog

All notable project changes are recorded here.

## [0.1.24] - 2026-07-11

### Added

- Added a 15-second in-memory defender reservation that restores the same authoritative player ID, hero, position, health, level, ability ranks, cooldowns, gold, and all six run-only equipment slots after a transient disconnect or page reload.
- Added an opaque 256-bit resume token kept only in per-tab session storage, a mandatory pre-admission handshake, generation-fenced single-socket control, bounded reconnect backoff, truthful terminal states, and restrained `RECONNECTING` party language.
- Added focused handshake, token-secrecy, detach/resume, duplicate-session, expiry, abandoned-room, stale-lobby, first-input, real four-client convergence, and production-asset smoke coverage.
- Added content-fingerprinted production client bundles so immutable caching follows the bundle bytes instead of the old fixed `/assets/main.js` URL.

### Changed

- A disconnected defender now becomes inert but remains targetable and damageable during the grace window; the siege never pauses, held movement and attacks are cleared, and no immunity, AI control, or persistence is introduced.
- Reload hydration now reconciles the current authoritative run without replaying purchase receipts, Attunement ceremonies, phase or wave banners, accumulated damage feedback, or pending shop transactions; the next input sequence resumes above the retained server sequence, and the end screen keeps authoritative total run time.
- Lobby connection copy now mutates its polite live region only when the visible value changes instead of repeating unchanged status on every snapshot.
- Expired reservations release their hero and room place, transfer host authority to a connected survivor, and return a fully abandoned room to an empty lobby.
- Production HTML remains uncached while naming the exact hashed client asset; the legacy fixed asset path now returns `404` in production instead of serving stale immutable code.

### Preserved

- The four heroes, Nexus and lane rules, defense-breach-push structure, combat, controls, art, audio, shops, prices, economy, Hero Stats, six unrestricted run-only slots, items, Attunement, Combat Stride, balance, and server authority are unchanged.
- Resume state exists only in the live server process. No account, database, cookie, local-storage inventory, permanent progression, join-in-progress, matchmaking, pause, immunity, paid service, or secret was added.

## [0.1.23] - 2026-07-11

### Added

- Added Combat Stride as the first ware-specific evolution, earned by Fleetstep Greaves at the established fourth-copy Attunement threshold.
- Added one authoritative movement consequence to Hero Stats and the named `LMB` impact row, plus exact current-champion `WORLD/S` previews for the unlocking, fifth, and sixth Greaves copies.
- Added real action-cycle, purchase/reforge/reset, normal-timing Warden and Riftstalker balance, route-safety, and four-client convergence coverage for the evolution.

### Changed

- Attuned Greaves now retain `15%` of the champion's current Move Speed during primary windup and impact; idle movement remains `100%`, every recovery remains `45%`, and Combat Stride does not apply to abilities.
- Give the earned effect its own restrained cyan shop, equipment, and Action Impact language while preserving the existing Attunement ceremony and doubled fourth-copy scalar.
- Scope first-tick movement ordering to the unlocked evolution so Combat Stride begins immediately without changing established non-Attuned route or attack behavior.

### Preserved

- Primary damage, cadence, aim, impact geometry, projectiles, ability movement, recovery movement, Greaves price and scalar power, Attunement arithmetic, six unrestricted slots, both physical shops, routes, economy, controls, art, audio, and server authority.
- No new ware, vendor, stat panel, proc, active skill, slot type, currency, permanent progression, or catalog breadth was added.

## [0.1.22] - 2026-07-11

### Added

- Added one canonical full-build eligibility answer derived from the real equipment projection: a ware is offered only when at least one occupied socket can produce a changed build.
- Added a disabled `FULL STACK` state to both physical shops when their matching ware already occupies all six sockets, with explicit accessible no-change guidance.
- Added focused coverage for all four six-duplicate builds, every retained cross-ware target, and the legal `5 + 1 → 6` specialization path.

### Changed

- Make mouse activation and `1`/`2` shop shortcuts refuse an impossible same-ware reforge before any request can be sent; the player is told that no gold was spent and to choose the other local ware.
- Derive selectable socket buttons from the same canonical legal-target list as the shop card instead of reconstructing same-item eligibility in the DOM.

### Preserved

- Five matching copies can still replace the one different socket to reach six, and every cross-ware reforge retains its exact legal targets, preview, confirmation, price, and authoritative acceptance.
- The four wares, six unrestricted duplicate-ready slots, Attunement, stats, item power, vendors, routes, economy, balance, controls, art, audio, and server authority are unchanged.

## [0.1.21] - 2026-07-11

### Added

- Added canonical Attunement progress to every owned ware stack: first and second matching copies now read `ATTUNEMENT 1/4` and `ATTUNEMENT 2/4`, while the established third-copy `NEXT ATTUNES` and fourth-copy `ATTUNED` states remain intact.
- Added the same progress to grouped Hero Stats equipment rows and both physical shops' owned-count badges, so commitment reads consistently before and after travel.
- Added accessible threshold explanations and canonical coverage from zero through six raw copies, including the fourth-copy double contribution and effective post-Attunement counts.

### Changed

- Derive every Armory progress label from one shared canonical helper instead of reconstructing the threshold separately in Hero Stats and shop cards.
- Keep zero-owned cards clean and give early progress a quieter treatment than `NEXT ATTUNES` and `ATTUNED`.

### Preserved

- The four-copy Attunement threshold, every ware effect and price, effective-copy arithmetic, six unrestricted slots, replacement outcomes, both physical shops, routes, economy, balance, controls, art, audio, and server authority.
- No item, stat, proc, threshold, bonus, vendor, slot type, rarity, currency, progression screen, animation, or balance change was added.

## [0.1.20] - 2026-07-11

### Added

- Added one champion-specific `LMB` row to the current-build impact surface: Iron Cleave, Repeater Shot, Ember Lance, and Soul Scythe now expose exact per-target damage and attack cadence beside `Q`/`E`/`R`/`F`.
- Added Soul Scythe's genuine `2.5` healing per struck target without presenting context-dependent pack totals or DPS.
- Added canonical primary-impact coverage for every hero and raw Edge count from zero through six, including the nonlinear fourth-copy Attunement step and real authoritative one-target impacts.

### Changed

- Broadened `ABILITY IMPACT` to `ACTION IMPACT` while preserving its compact current-build role; Tempered Edge now pulses the named primary row when an accepted purchase changes it.
- Moved Gravebinder's fixed per-target primary healing into the shared definition consumed by both server resolution and the rendered readout.

### Preserved

- Every primary's damage, cadence, geometry, projectile behavior, cleave behavior, healing, item scaling, animation, audio, and existing balance.
- All four wares, two physical shops, prices, rewards, routes, six unrestricted run-only slots, Attunement, replacement, ability-impact truth, controls, and server authority.
- No DPS estimate, range claim, pack-total claim, projection, new item, proc, stat, vendor, progression system, or balance change was added.

## [0.1.19] - 2026-07-10

### Added

- Added a compact champion-specific `ABILITY IMPACT` block to Hero Stats: every learned `Q`/`E`/`R`/`F` names its current rank, exact per-target magnitude, and effective cooldown.
- Added shared canonical impact definitions for all sixteen abilities, including secondary Warden barrier and Gravebinder healing values, plus precise labels for arrows, bolts, Cinder Wall hits, and Wraith strikes.
- Added exhaustive server/readout parity across every legal rank for all four heroes and all sixteen abilities.

### Changed

- Replaced server-only ability-magnitude constants with the shared canonical definitions, so combat resolution and the rendered champion readout cannot drift.
- Pulse the complete ability-impact block when Focus or Quickening is accepted, while leaving unlearned abilities explicitly unlearned instead of presenting speculative rank-one output.

### Preserved

- Every ability's damage, barrier, healing, summon power, rank scaling, cooldown, radius, behavior, creation-time snapshot rule, and existing balance.
- All four wares, prices, rewards, shops, routes, six unrestricted run-only slots, Attunement, replacement, controls, art, audio, and server authority.
- No new ability, stat, item, proc, tooltip mode, hover dependency, comparison screen, permanent progression, or balance change was added.

## [0.1.18] - 2026-07-10

### Added

- Added one local, non-replayable ware receipt to every directly accepted ordinary purchase and full-build reforge: the incoming ware's established shape and color bloom briefly on the hero.
- Added one exact world label and purchase toast derived from the last authoritative Hero Stats snapshot and canonical equipment projection, such as `SKILL 100% → 115%`.
- Added focused parity coverage for all four heroes and wares, ordinary and replacement projections, direct versus replay delivery, and Attunement separation.

### Changed

- Replace the generic gold purchase burst with an item-specific hero-centered receipt on live local events; snapshot history retains acknowledgement without manufacturing a new receipt.
- Keep the receipt below the fourth-copy Attunement ceremony in duration, scale, opacity, particle count, audio, and persistence so an ordinary trade feels accepted without diluting the earned threshold.

### Preserved

- Every item effect, Hero Stat, price, reward, vendor, route, six-slot and replacement rule, Attunement threshold, dominant signature, combat value, control, and server authority.
- No new power, proc, ware, vendor, slot type, set bonus, currency, economy change, persistent progression, central banner, ground ring, screen flash, or ally UI noise was added.

## [0.1.17] - 2026-07-10

### Added

- Added a personal local-Armory readiness state derived from the authoritative hero snapshot, active living state, current vendor stock, and each stocked ware's canonical price.
- Added `WARE READY` to the existing gold tile when an open-slot purchase is funded and `REFORGE READY` when the same wallet can reshape a full six-slot build.
- Added thin, equally weighted funded outlines around the existing shape-distinct Forge and Reliquary minimap marks, plus exact travel-to-trade accessibility copy on the gold and minimap surfaces.
- Added threshold coverage for below-price, exact-price, retained affordability, full-build reforge, vendor-specific stock, inactive, downed, unclaimed, and disconnected states.

### Changed

- Give the gold tile one short restrained wake-up only when readiness becomes actionable, then hold a quiet persistent funded treatment until the state clears.
- Clear every readiness cue immediately after spending below all stocked prices, while downed, or outside defense, breach, and push; a wallet that remains affordable truthfully remains ready.

### Preserved

- Proximity-only `B` browsing and trading, both physical routes, both distinct inventories, all prices, rewards, wares, stats, six-slot and reforge rules, combat, controls, art, audio, and server authority.
- No remote catalog, remote purchase, path arrow, route recommendation, safe-window claim, vendor, item, currency, economy change, or automation was added.

## [0.1.16] - 2026-07-10

### Added

- Added one always-visible `NEXT` result to every ordinary shop purchase while an equipment socket is open, showing the exact champion-specific Hero Stat change before gold is spent.
- Added an explicit `ATTUNES` marker to the nonlinear fourth-copy preview and kept exact results visible when a ware is unaffordable or the hero is outside purchase range.
- Added canonical preview coverage for all four heroes, all four wares, levels 1 and 4, and raw copy counts zero through five, matched against 192 real authoritative purchases.

### Changed

- Derive ordinary-purchase previews from the same equipment projection and Hero Stats functions used by server authority while keeping the live Hero Stats panel unchanged until an accepted snapshot arrives.
- Lock ordinary shop cards after one purchase request until the expected authoritative socket fills or the server rejects the trade, preventing a rapid double-click from spending twice against one displayed result.
- Reuse the same stat formatting for ordinary purchases and established full-build reforges without adding an extra confirmation to the first six purchases.

### Preserved

- Both physical shops, their distinct two-ware inventories, all item effects, universal `30`-gold price, six unrestricted run-only sockets, Attunement threshold, full-build reforge flow, routes, economy, balance, controls, art, audio, and server authority.
- No new ware, stat, effect, vendor, route, price, slot rule, confirmation step, proc, set bonus, rarity, currency, persistence, or parallel progression system was added.

## [0.1.15] - 2026-07-10

### Added

- Added an atomic Attunement transition to the existing authoritative purchase event, naming the ware, `gained` or `lost` direction, and exact raw `fromCount` and `toCount`.
- Added one hero-centered awakening when a stack crosses `3 → 4`: the established ware color and shape bloom outward, a local `ATTUNED` cue and procedural synth stinger land once, and allies receive a quieter world-only read.
- Added one cached echo sprite behind every settled Attuned signature, with a slow restrained breath; crossing `4 → 3` contracts and fades the old echo with a quieter local release cue.
- Added coverage for every ware's six ordinary purchases, gain and loss through replacement, `5 → 4` remaining Attuned, identical gain/loss event payloads across four real WebSocket clients, and direct-versus-snapshot delivery policy.

### Changed

- Present Attunement ceremonies only from the live authoritative event message. Snapshot history still reconciles persistent signatures, but initial join, reconnect, repeated snapshots, and direct state restoration cannot replay an awakening.
- Keep local purchase acknowledgement independent from one-shot presentation, so a missed live event followed by its authoritative snapshot still clears a pending six-slot reforge without replaying its toast, audio, particles, or world text.
- Anchor transition particles and world text to the actual tracked hero while keeping the existing vendor position and purchase receipt intact.

### Preserved

- Every `0.1.14` stat, item effect, threshold, price, economy window, vendor route, six-slot rule, replacement outcome, champion baseline, cooldown rule, and creation-time power rule.
- The same four signature textures, colors, hero silhouettes, selection marks, enemy telegraphs, compact HUD, controls, and procedural audio character.
- No damage, speed, cooldown, health, economy, item, slot, proc, set bonus, rarity, currency, persistence, screen flash, ground ring, central banner, or new gameplay system was added.

## [0.1.14] - 2026-07-10

### Added

- Added one duplicate-depth threshold to all four established wares: at four raw copies, the stack Attunes and the fourth copy contributes twice its ordinary listed scalar once; fifth and sixth copies resume normal increments.
- Added truthful `NEXT ATTUNES` and `ATTUNED` shop states, effective stack totals in Hero Stats, exact Attunement gain/loss in reforge previews, and a restrained intensification of the existing dominant battlefield signature.
- Added exhaustive threshold coverage across every hero and ware, every ordered six-slot build, ordinary purchases, full-build replacements, active cooldowns, creation-time ability power, real basic impact, movement, revival, reset, and co-op isolation.

### Changed

- Derive all item-scaled Hero Stats from canonical raw stack counts and the single effective-copy rule: copies `0–3` count normally, while raw copies `4–6` count as `5–7` effective copies.
- Make the fourth-copy decision legible before spending: a `×3` shop card announces the threshold, and a replacement preview names both the Attuned stack transition and resulting Attuned signature.

### Preserved

- The four established wares and listed per-copy effects, universal `30`-gold price, two distinct physical shops, exactly six unrestricted duplicate-ready run-only slots, full-price replacement, personal co-op-safe ownership, and server authority.
- Champion baselines, copies one through three, fifth- and sixth-copy increments, economy pacing, vendor routes, controls, art and audio language, telegraph hierarchy, encounter timing, and phase flow.
- No new ware, proc, set bonus, typed slot, rarity, currency, refund, salvage, inventory, persistence, permanent power, or parallel progression system was added.

## [0.1.13] - 2026-07-10

### Added

- Added an exact full-build reforge outcome to the final confirmation: outgoing and incoming effects, current-to-projected stack counts, every changed Hero Stat, and the resulting dominant battlefield signature.
- Added one canonical equipment projection shared by server purchases and read-only client previews, plus parity coverage for all 12 ordered cross-item pairings across all four heroes at levels 1 and 4.

### Changed

- Keep the live Hero Stats panel authoritative until a replacement succeeds while clearly labeling the proposed result inside the confirmation surface.
- Make the compact confirmation safe under mouse and keyboard input: hide the catalog at the final step, preserve `Enter` confirmation, prevent focused Back from spending, block Back/Escape step-back while a request is pending, and move focus before hiding a completed step.
- Give the unchanged `518`-route deterministic shop test a `30s` allowance so its pacing assertions remain reliable on slower machines.

### Preserved

- The four established item effects, universal `30`-gold price, two distinct physical shops, six unrestricted duplicate-ready run-only slots, full-price replacement, personal co-op-safe ownership, and server authority.
- Combat power, economy, routes, champion baselines, signature selection, controls, art, audio, telegraph hierarchy, and phase flow.
- No ware, stat, proc, set bonus, rank, evolution, refund, salvage, persistence, or permanent power was added.

## [0.1.12] - 2026-07-10

### Added

- Added a battlefield build signature that lets every equipped hero visibly carry the identity of their dominant ware during live play.
- Added four color-and-shape-coded coronas: warm blade ticks for Tempered Edge, lower cyan chevrons for Fleetstep Greaves, violet diamonds for Runebound Focus, and a pale broken sigil for Quickening Sigil.
- Added a canonical dominant-item helper and focused coverage for empty equipment, clear majorities, and ties resolved by the first occupied socket.

### Changed

- Derive each hero's signature directly from the authoritative ordered equipment snapshot: the most copies win, and the tied ware appearing in the lowest slot wins.
- Keep the signature attached to the hero's existing pose and silhouette, with reduced intensity on allies and cached textures for all four variants.

### Preserved

- The four established item effects, Hero Stats, both physical shops, universal `30`-gold price, exactly six unrestricted duplicate-ready run-only slots, replacement rules, and personal co-op-safe ownership.
- Combat, economy, routes, hero baselines, controls, art and audio character, telegraph priority, and phase flow.
- No proc, set bonus, rarity, item rank, evolution, stat change, ware, currency, persistence, or permanent power was added.

## [0.1.11] - 2026-07-10

### Added

- Added a grouped Hero Stats build summary that names every equipped ware, counts its copies, and totals its additive effect from canonical item data.
- Added live owned-count badges to both physical shops so repeat purchases and full-build replacements expose the hero's current investment before commitment.
- Added focused coverage for empty, mixed, one-of-each, and six-duplicate loadouts, including aggregate percentage formatting without floating-point artifacts.

### Changed

- Kept build explanation presentational: the readable summary derives from the authoritative equipment snapshot and the same canonical numeric item definitions used by gameplay.
- Gave the existing `100`-seed normal-timing economy gate an explicit `20s` test allowance so slower machines do not fail its unchanged pacing assertions at Bun's default `5s` limit.

### Preserved

- Both physical shops, four established wares and effects, universal `30`-gold pricing, exactly six unrestricted duplicate-ready run-only slots, first-empty auto-equip, explicit full-build replacement, and personal co-op-safe ownership.
- Combat, economy pacing, routes, hero baselines, authority, controls, art, audio, and phase flow.
- No item, stat, effect, slot rule, inventory, rarity, recipe, persistence, or permanent power was added.

## [0.1.10] - 2026-07-10

### Added

- Added a `100`-seed normal-timing economy gate that keeps purchasing power below five wares at `85s` and reaches six-ware purchasing power between `105–120s`.
- Expanded the normal-timing shop-route gate to `518` stratified and regression seeds, preserving a first affordable retreat, controlled departure, local purchase, safe return, and untouched Nexus under the new economy.

### Changed

- Reduced repeatable defense rewards from `3/3/9` to `1/1/3` gold for imps, hounds, and brutes while preserving the Gatebreaker's defining `35` gold and the Rift Guard's later `6` gold.
- Set every ware and full-build replacement to one universal `30`-gold price.
- Made the reward table and universal ware price canonical authoritative constants shared by simulation, purchases, presentation, and tests.

### Preserved

- Both physical shops, their distinct two-item inventories, all four item effects, exactly six unrestricted duplicate-ready run-only slots, first-empty auto-equip, explicit full-build replacement, and personal co-op-safe ownership.
- Enemy health, damage, speed, spawning, XP, hero baselines, item effects, combat timing, controls, routes, art, audio, and phase flow.
- No dynamic pricing, discounts, refunds, resale, salvage, new currency, ware, catalog, tag, evolution, persistence, or permanent power was introduced.

## [0.1.9] - 2026-07-10

### Added

- Added a full-build replacement flow to both physical shops: choose one local ware, choose one occupied socket, review the exact outgoing and incoming effects, then explicitly confirm the 24-gold trade.
- Added mouse and keyboard support for the complete flow, including `1`/`2` ware selection, `1`–`6` socket selection, `Enter` confirmation, and `Escape` step-back without spending.
- Added compare-and-swap protection through the expected outgoing item so stale or repeated confirmations cannot deduct gold or replace a different socket.

### Changed

- Kept the Forge and Reliquary useful after all six unrestricted slots are occupied: a confirmed trade discards the old item without a refund, equips the selected local ware, and leaves the build at `6/6`.
- Reflowed active ability cooldown progress in both directions when Quickening Sigil enters or leaves a build, while preserving the creation-time damage of existing Splitbolts, Falling Stars, and Wraiths.
- Kept replacement authoritative for phase, living state, vendor, stock, proximity, full-loadout eligibility, funds, slot identity, price deduction, equipment, and derived Hero Stats.

### Preserved

- Auto-equipping into the first empty slot, six unrestricted duplicate-ready run-only sockets, the four-item catalog, 24-gold prices, personal co-op-safe ownership, physical vendor routes, and the established combat controls.
- No selling, refund, salvage, inventory grid, typed slot, rarity, recipe, evolution, persistent item, new stat, or new ware was introduced.

## [0.1.8] - 2026-07-10

### Added

- Turned the northeast Citadel shell into the physical Veilglass Reliquary with a tall shrine silhouette, arched facade, masked curator, glass displays, cold shop sigil, and a distinct minimap marker.
- Added two curated 24-gold wares: Runebound Focus for additive-from-base Skill Power and Quickening Sigil for additive-from-base Cooldown Speed.
- Routed the new Skill Power path through the existing authoritative creation-time sampling so projectiles, Falling Stars, and Wraiths never change damage after they are created.
- Added a `100`-seed, normal-timing solo route gate that requires real earned gold, a controlled outbound danger band, a local purchase, and a defensible return to North.

### Changed

- Generalized local trading from one hard-coded Forge to the nearest in-range vendor, with one shared non-pausing panel that changes district, catalog, theme, shortcuts, range checks, and accessibility copy.
- Preserved remaining `Q`/`E`/`R`/`F` cooldown progress when Quickening Sigil is equipped; basic cadence and action timing remain unchanged.
- Moved the proposed Reliquary from southeast to northeast after normal-speed route play proved the diagonal trip breached North. After rejecting a second replay with only a one-hit gate margin, the verified rendered route controlled outbound pressure and returned in `9.53s` with North `260 → 253` and the Nexus untouched; `100/100` seeded normal-timing routes returned without a down or Nexus damage.

### Preserved

- The Ironbound Forge, both established Forge effects and prices, exactly six unrestricted duplicate-ready run-only slots, personal co-op-safe gold, baseline hero balance, controls, phase flow, art language, and procedural audio character.
- No global catalog, pause, inventory grid, typed slot, scarce stock, selling, salvage, rarity, recipe, evolution, persistence, or permanent power was introduced.

## [0.1.7] - 2026-07-10

### Added

- Turned the northwest Citadel building into the physical Ironbound Forge with a counter, smith, anvil, brazier, hammer sign, warm shop sigil, and minimap marker.
- Added two curated 24-gold wares: Tempered Edge for additive-from-base Basic Damage and Fleetstep Greaves for additive-from-base Move Speed.
- Added exactly six unrestricted, ordered, run-only equipment slots; any item or duplicate can occupy any open slot.
- Added a proximity-only, non-pausing `B` trade panel with mouse and `1`/`2` purchasing, affordability states, live Hero Stats comparison, sockets, sound, toast, stat pulse, and world feedback.

### Changed

- Made the server authoritative for vendor stock, phase, living state, distance, fixed-point price deduction, equipment capacity, purchases, and item-derived stats.
- Routed equipped Basic Damage and Move Speed through the existing canonical stat seam so real attacks and displacement match the displayed values.

### Preserved

- Every unequipped `0.1.6` hero baseline, cooperative gold rule, skill progression, controls, encounter timing, phase flow, art language, and procedural audio character.
- No inventory grid, typed slots, scarce stock, random loot, selling, salvage, recipes, evolution, persistence, or second decorative vendor was introduced.

## [0.1.6] - 2026-07-10

### Changed

- Added one canonical server-derived Hero Stats model for maximum health, movement speed, basic damage, attack interval, skill power, and cooldown recovery.
- Routed combat, movement, healing, barriers, ability magnitude, and cooldown presentation through those authoritative values while retaining the existing snapshot compatibility projection.
- Added a compact, non-pausing `C` Hero Stats panel that reads the server snapshot directly and closes outside active play.
- Made personal gold cooperative: every enemy reward is divided equally among connected players in exact fixed-point units while kill credit remains with the finishing hero.
- Made gold and Rift Shard drops honest visual feedback instead of proximity-consumable objects that could imply or grant a second reward.

### Preserved

- Every hero's baseline health, movement, basic damage, attack cadence, ability rank scaling, cooldowns, controls, and solo gold income.
- Four-hero authority, fixed player-sized lanes, central Nexus pressure, breach, counterattack, Rift payoff, art language, and procedural audio.

## [0.1.5] - 2026-07-10

### Changed

- Replaced exact-point enemy convergence with deterministic engagement slots around heroes, gates, and the Heartfire Nexus.
- Added modest local separation while enemies travel so identical paths fan into a horde instead of merging into one queue.
- Spread simultaneous gate attackers across lateral positions and depth rows, and Nexus attackers across approach-facing rings.
- Gave Wraith Host spirits distinct approach angles around shared prey and the Rift Heart.
- Reduced common imp and hound silhouettes toward the approved concept's hero-to-horde scale while preserving large elite silhouettes.

### Preserved

- Enemy counts, spawn cadence, health, damage, wave scaling, lane allocation, attack windups, hero controls, camera, objective rules, and phase flow.

## [0.1.4] - 2026-07-10

### Changed

- Replaced Gravebinder's Wraith Host projectile fan with three or more short-lived authoritative spirit summons.
- Made each wraith acquire nearby demons, move independently, strike repeatedly, retarget after a kill, orbit its owner while idle, and attack the Rift Heart during the counterattack.
- Added distinct green wraith bodies, eyes, glow, motion, spawn bursts, and strike effects to the rendered battlefield.
- Added summon state to multiplayer snapshots and a focused authoritative regression test.

### Preserved

- Gravebinder sustain identity, shared Q/E/R/F controls, direct action-bar progression, fixed player-sized lanes, central Nexus pressure, breach, counterattack, and the approved visual language.

## [0.1.3] - 2026-07-10

### Changed

- Removed the duplicate skill-choice panel and placed legal `+` upgrades directly on the existing `Q`/`E`/`R`/`F` action slots.
- Kept normal slot clicks and `Q`/`E`/`R`/`F` focused on casting, with `Ctrl` + ability key as the keyboard rank-up shortcut.
- Capped authoritative banked points against the hero's remaining ability ranks so a fully maxed build never receives an unusable prompt.

### Preserved

- Compact combat HUD, immediate casting, per-rank power gains, four unique heroes, player-sized lanes, central Nexus pressure, breach, and Rift payoff.

## [0.1.2] - 2026-07-09

### Changed

- Fixed the defense topology to one stable active lane per starting player instead of rotating open fronts between waves.
- Made multiplayer difficulty proportional through lane count, removing compounded spawn-cadence and enemy-health multipliers.
- Expanded the playable city, gate approaches, spawn roads, and counterattack route for meaningful repositioning space.
- Sealed inactive approaches visibly and removed persistent monster direction markers while preserving timed attack telegraphs.

### Preserved

- Central Nexus loss condition, four unique heroes, readable Q/E/R/F combat, breach pressure, counterattack, and Rift payoff.

## [0.1.1] - 2026-07-09

### Changed

- Focused the action language on LMB primary plus three abilities and one ultimate.
- Removed the Space dodge action and its HUD tile.
- Replaced the global one-time talent choice with level-earned skill points and per-ability ranks.
- Added explicit facing, windup, impact, and recovery states so hero and demon attacks read in motion.
- Gave ranked abilities priority over a held basic attack so LMB never swallows a Q/E/R/F cast.
- Separated Warden charge, wave, standard, and bastion effects into distinct combat silhouettes.

### Preserved

- Four unique heroes, central Nexus defense, four gates, enemy density, camera, breach, counterattack, and Rift payoff.

## [0.1.0] - 2026-07-09

### Added

- First 5–10 minute browser-first vertical-slice contract.
- 1–4 player authoritative co-op direction.
- Central Aegis Citadel, four gates, and Heartfire Nexus defend-or-lose objective.
- Exactly four unique heroes: Warden, Riftstalker, Ashcaller, and Gravebinder.
- Server-enforced no-duplicate hero selection.
- Shared action controls with aimed primary attacks, dodge, three abilities, and an ultimate.
- Compressed defense, breach, group counterattack, and Rift payoff run structure.
- One three-way, build-changing talent choice per run.
- Runtime health and state-debugging contract plus repeatable playtest notes.
- Orthographic Three.js battlefield with procedural pixel-style heroes, enemies, city structures, lighting, effects, minimap, and compact HUD.
- Authoritative defense, Gatebreaker breach, counterattack, Rift Heart victory, Nexus defeat, and host replay states.
- Automated six-test simulation suite and real four-client WebSocket smoke test.
- Saved browser playtest evidence with clean console verification.
- Approved visual-language notes and a narrow post-build review gate.

### Deferred

- Broad item, recipe, crafting, meta-progression, mode, and content systems pending review of the playable slice.
