# Decision 0002 — First Defender migration checkpoint

**Status:** approved for implementation

**Checkpoint:** `0.1.35` — Forge the First Defender

**Decision date:** 2026-07-12

## Context

The verified `0.1.34` build still expresses Siegeheart through four reserved heroes and fixed kits. Direction 1.0 replaces that promise with one neutral Defender whose weapon, mastery allocation, equipped skills, and six run-only items create the build. Five specialist audits agree that the current client, protocol, and authoritative game loop are too tightly coupled for parallel migration edits. The first checkpoint therefore needs one implementation owner and one complete, playable vertical slice.

## Decision

`0.1.35` will replace the old hero-selection and fixed-kit contract with a generic Defender and one complete Greatsword slice. It is a synchronized protocol transition, not a compatibility layer and not a shallow preview of five unfinished weapons.

The checkpoint must deliver:

1. A neutral Defender for every player; duplicate-character restrictions and the four old public hero identities leave the playable flow.
2. A short authoritative arming phase after the lobby. Every player spawns near the physical Arsenal with a weak practice weapon, `100` personal starting gold, and no mastery tree for that practice weapon.
3. A `100`-gold Greatsword purchase that equips immediately. The practice weapon has no sell value. The arming phase advances when every connected ready player owns the Greatsword, followed by a short shared countdown; it must not create routine waiting.
4. The Greatsword basic attack, all nine approved standard skills, all three branch masteries, approximately thirty visible connected nodes, cross-branch connectors, and the approved eight-point run arc. The eighth point can buy `F` mastery before the Rift finale.
5. Three equipped standard slots on `Q`, `E`, and `R`; one equipped mastery on `F`; and universal dodge on Space.
6. A full mastery network available on `M`. General passives remain active once learned. A mutation that changes a standard skill applies only while that skill is equipped. Loadout changes occur at the Arsenal or inside the level-up interaction; the rest of combat never pauses.
7. Level-owned mastery points, revision-guarded server-authoritative allocation, and saved Greatsword allocation through reconnect. Cooldowns belong to skill IDs, continue ticking when a learned skill is unequipped, and cannot be cleared by slot reassignment.
8. One free Greatsword respecialization per run, then `60` gold per reset, only at the Arsenal.
9. Six run-only item slots and the existing physical Forge/Reliquary loop, converted to declarative item modifiers. Universal four-copy Attunement is removed; no parallel catalog expansion is required in this checkpoint.
10. The existing Citadel defense, forced breach, counterattack, Rift Heart, trading, reconnect, and one-to-four-player authority remain intact.

## Combat prototype decisions

- Universal dodge starts at one charge, `6s` recharge, approximately `5.5` world units, and approximately `0.18s` invulnerability.
- Dodge passes through enemies, respects world bounds, interrupts a basic attack, and cannot cancel a committed standard or mastery skill.
- The five future weapon families remain part of the approved direction but are hidden from the playable Arsenal until their basics and trees are real. No disabled cards or checklist promises appear in `0.1.35`.
- Player accent owns party identity. Weapon silhouette and restrained weapon effects own combat identity. Branch mastery initially changes effects and action language rather than requiring a second Defender body or rig.
- `M` may inspect the complete network anywhere. Allocation legality and loadout mutation remain server-owned.

All numerical values are prototype values that may move only from played evidence inside this checkpoint.

## Workstream ownership

### Weapons and progression — exclusive implementation owner

Own the checkpoint branch and all edits to `src/shared/protocol.ts`, `src/shared/game-data.ts`, `src/server/game.ts`, `src/client/main.ts`, the authoritative catalogs, migrations, tests, versioned evidence, and integration of approved support assets. Extract smaller modules when it reduces conflict, but do not create a second gameplay implementation path.

### Interface and UX — acceptance and bounded support

Own the semantic and rendered contract for the one-Defender lobby, arming/Arsenal handoff, `LMB/Q/E/R/F/Space` belt, compact level-up choice, `M` network, stats, shops, reconnect, and run summary. Provide a review/spec or narrowly isolated DOM/CSS contribution only after the implementation owner names a conflict-free seam. The battlefield stays dominant at `1280×720`; no nested administrative overlays or drag-only interactions.

### Monsters and encounters — compatibility gate

Freeze the current roster, wave composition, reward schedule, and numerical pressure. Review the Greatsword against normal, elite, lane recovery, objective protection, breach, and Rift Heart duties. Track damage, control/stagger, protection, downs, and recovery rather than DPS alone. Do not claim the static Rift Heart proves an active boss encounter.

### Art direction — visual acceptance

Judge the rendered slice against the gameplay triptych, battlefield-first HUD concept, and Defender-weapons concept. Prioritize silhouette, readable action weight, controlled values, environment depth, and effects hierarchy. Do not authorize additive spectacle or a whole-world art rewrite inside the gameplay checkpoint.

### Blender assets — proof package supplier

Build only the smallest source-controlled proof package needed to validate the pipeline: one neutral Defender rig, detachable Greatsword and practice weapon, idle/run/dodge/basic phases, one wall module, one brazier, a slash mesh, palette texture, export manifest, and fixed-camera reference renders. Runtime integration occurs only through the implementation owner after scale, facing, clips, material count, and performance budgets pass.

Track `.blend` sources directly. Add Git LFS only if an individual source exceeds `25 MB` or repeated asset volume proves the need. Record source, Blender version, license/provenance, triangle count, materials, textures, clips, and exported hash.

## Quality gates

The checkpoint cannot ship until all of the following are true:

- A real normal-timing solo run and a real four-player run complete the full defense-to-counterattack loop.
- The arming phase, purchase, mastery allocation, skill assignment, respec, items, dodge, reconnect, and run reset are server authoritative and converge across all clients.
- Graph validation proves stable IDs, reachable nodes, prerequisite legality, branch mastery requirements, mastery exclusion, point budgets, and saved allocation revision handling.
- Greatsword can clear groups, affect elites, protect or recover a lane, damage the Rift Heart, survive solo with skillful play, and contribute without a mandatory role.
- The mastery arrives early enough to be deliberately selected and cast before the finale.
- Native `1280×720` captures cover lobby, practice weapon, Arsenal purchase, empty and populated action belt, level-up, full network, fourth learned standard skill, `F` mastery, shop, stats, reconnect, dense combat, breach, Rift Heart, victory, and defeat. Four-player evidence includes duplicate Greatswords with distinct player accents.
- Keyboard-only operation, visible focus, non-color state cues, reduced motion, accessible announcements, and readable prerequisite copy pass.
- Concept comparisons show the current render beside the relevant approved reference whenever the leading weakness is visual.
- Typecheck, the full authoritative test suite, production build smoke, obsolete-asset `404`, and real four-client multiplayer smoke pass.
- The version, roadmap, changelog, playtest record, human-readable devlog, and companion website are updated together; the public companion is rendered and verified after deployment.

## Explicit non-goals

- Bow, Staff, Greathammer, or Daggers implementation.
- New monster species, wave compositions, active boss behavior, campaign content, persistence, accounts, matchmaking, monetization, or paid services.
- A broad environment replacement or production-volume asset pass.
- Permanent progression or rewards implied by the end screen.
- Supporting both the legacy hero protocol and the new Defender protocol in the shipped checkpoint.

## Merge rule

Only the exclusive implementation owner may assemble the checkpoint. Support work remains in its own worktree until the director reviews its evidence and names a conflict-free integration boundary. No workstream pushes, merges, deploys, or versions independently.
