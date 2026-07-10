# Slice-first roadmap

This roadmap is a scope guard, not a content backlog. Work proceeds as one played, rendered, verified checkpoint at a time; expansion remains deferred until the 5–10 minute run earns it.

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

The progression arc remains intentionally narrow: multiple physical Citadel shops with different small inventories, run-only purchases, and exactly six unrestricted equipment slots. Any item or duplicate may occupy any slot. `0.1.7` proved the first physical vendor and visible stat payoff; `0.1.8` proves two distinct local destinations, four curated wares, nearest-vendor interaction, and a real route/build choice without a global menu. South remains intentionally underserved rather than receiving remote access. Future checkpoints must begin with rendered play and add one deeper layer at a time—replacement, salvage, build tags, duplicate depth, or one earned evolution—only when that layer is the highest-leverage weakness.

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

## Deferred beyond the slice

- Larger wave and boss catalogs.
- Broad loot rarity catalogs, recipe trees, crafting systems, and permanent equipment progression beyond the approved Armory arc.
- Permanent Citadel Renown and corruption difficulties.
- Matchmaking, public rooms, reconnection, and join-in-progress polish.
- Mobile and controller input implementations.
- Additional maps, modes, heroes, or long-form campaign content.

The hero roster remains capped at four even after expansion.
