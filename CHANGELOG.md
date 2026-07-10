# Changelog

All notable project changes are recorded here.

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
