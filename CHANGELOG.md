# Changelog

All notable project changes are recorded here.

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
