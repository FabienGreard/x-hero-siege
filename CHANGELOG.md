# Changelog

All notable project changes are recorded here.

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
