# Visual acceptance contract — `0.1.35`

**Checkpoint:** Forge the First Defender

**Status:** approved acceptance contract

**Direction commit:** `f697cf9`
**Applies to:** the rendered Defender and Greatsword slice defined by Decision 0002

## Purpose

This contract decides whether `0.1.35` closes the first bounded part of the gap
between the playable game and the approved visual direction. It does not authorize
a whole-world art rewrite, production assets for the four deferred weapons, or a
second gameplay implementation path.

The comparison sources are:

- [`concepts/defender-weapons-concept-v1.png`](concepts/defender-weapons-concept-v1.png)
  for the neutral body, weapon silhouette, stance, and attack arcs;
- [`concepts/gameplay-triptych.png`](concepts/gameplay-triptych.png) for battlefield
  scale, density, value structure, environment depth, escalation, and effects;
- [`concepts/battlefield-first-hud-concept.png`](concepts/battlefield-first-hud-concept.png)
  for the battlefield-first composition and four peripheral HUD anchors.

Decision 0002 remains authoritative for checkpoint scope, gameplay authority,
asset supply, quality gates, and merge ownership.

## Resolved visual choices

These choices are fixed for the `0.1.35` proof and are not reopened by routine
asset or integration work:

1. **Weapon scale:** the Greatsword targets `1.3x` realistic proportions. The
   exaggeration exists to preserve its blade, guard, grip, and two-handed posture
   at gameplay distance; it may not obscure the face, feet, selection treatment,
   or enemy telegraphs.
2. **Rendering and palette:** use low-poly geometry with pixel-stable, authored
   palette textures and baked detail. The foundation is charcoal stone,
   soot-black iron, dead timber, muted Citadel-blue cloth, warm bone text, amber
   fire and aged brass, cold Heartfire cyan, deep corrupted violet, and
   enemy-danger ember red. High-frequency procedural noise and unrestricted
   gradients are not the target.
3. **Color ownership:** player accent owns restrained cloth, the selection
   treatment, and small local identifiers. Greatsword identity comes from
   geometry, posture, animation, material, and restrained weapon effects. Enemy
   red/orange remains reserved for danger and may not be borrowed for party
   identity.
4. **Mastery silhouette:** branch mastery changes effects and action language in
   `0.1.35`; it does not require a second Defender body, armor set, or permanent
   silhouette attachment. The neutral body and rig remain shared.

## Fixed capture protocol

All acceptance comparisons use a production build at native `1280 x 720`.
Baseline and candidate captures must use the same browser, device-pixel ratio,
reduced-motion state, authoritative snapshot, and fixed camera wherever the
comparison permits.

The gameplay comparison camera preserves the established elevated orthographic
grammar:

- offset: `(27, 34, 29)`;
- orthographic combat view height: `42`;
- aim look-ahead: disabled for fixed captures;
- camera target: recorded world coordinate for each plate.

Any proposed change to offset, projection, or view height fails until a direct
side-by-side proves stronger action impact without losing lane awareness,
objective visibility, or four-player readability.

Each plate records:

- commit SHA and production client asset hash;
- browser, viewport, device-pixel ratio, and reduced-motion state;
- camera position, target, projection, and orthographic view height;
- player and relevant world-object coordinates;
- server seed, simulation tick, phase, and phase elapsed time;
- player count, enemy count and kinds, active lane, and objective state;
- equipped weapon, skills, mastery allocation, items, and active effects;
- whether the frame is calm, anticipation, authoritative impact, or recovery;
- full frame, grayscale frame, solid-silhouette crop, and `2x`
  nearest-neighbour crop of the player/action area.

Do not manufacture a screenshot-only encounter. Dense, breach, multiplayer, and
Rift plates must come from legal authoritative play at normal timing.

## Prioritized comparison plates

### P0 — Plate 1: Defender and Greatsword silhouette

**Setup:** fixed combat camera, quiet Citadel floor, no enemies or combat effects.
Capture idle, three-quarter run, profile run, and ready stance with both the
practice weapon and Greatsword.

**Pass when:**

- the solid-black crop reads as one neutral, medium-armoured Defender carrying a
  two-handed Greatsword;
- blade, guard, grip, hands, head, and legs remain separable at native scale;
- the `1.3x` Greatsword dominates combat identity without turning the armour into
  a named knight class;
- practice weapon and Greatsword are unmistakably different without HUD text,
  colour, glow, or portrait;
- the Greatsword does not merge into the torso during idle or locomotion;
- player accent remains secondary to weapon geometry;
- one neutral body and rig support both weapons.

**Fail when:** any identity depends on UI or colour; the weapon obscures the face,
feet, selection treatment, or warning footprint; or the body implies one of the
retired fixed heroes.

### P0 — Plate 2: Greatsword action weight

**Setup:** identical camera and ground position. Capture the basic attack at
anticipation, committed downswing, authoritative impact, and recovery. Add one
universal dodge and one standard-skill strip.

**Pass when:**

- every phase is distinguishable from a still frame;
- feet plant before impact and the hips, shoulders, hands, and blade all carry
  the motion;
- blade travel forms one continuous, readable arc;
- visual contact aligns with the authoritative impact tick within one rendered
  frame;
- recovery communicates commitment without disguising when control returns;
- dodge has a distinct low directional posture and cannot be confused with run,
  hit stun, or attack recovery;
- the standard skill is louder than the basic but quieter than `F` mastery.

**Fail when:** the action reads as a floating weapon, sprite rotation,
uniform-speed sweep, or effect-only damage; feet slide against authoritative
position; or any hit effect arrives before server impact.

### P0 — Plate 3: Dense solo combat

**Setup:** fixed camera on a normal active lane at the highest representative
density produced by the unchanged encounter. Include common enemies, one
elite/heavy windup, a basic attack, one standard skill, pickups, gate state, and
the normal HUD.

**Pass when:**

- the Defender and nearest actionable threat are read before UI ornament;
- Greatsword orientation and current action remain readable through the crowd;
- the heavy windup retains an uninterrupted warning edge and danger colour;
- player, enemies, ground, and telegraphs occupy distinguishable grayscale value
  bands;
- an ordinary basic effect does not erase the body or warning footprint;
- Nexus state, active lane, health, and ready skills are found within one second;
- no pickup, ambient effect, or persistent structure glow is brighter than the
  active high-priority warning.

**Fail when:** the Defender disappears in grayscale, additive aftermath becomes
the first read, attack and enemy-warning timing become ambiguous, or HUD surfaces
materially reduce the playable centre.

### P0 — Plate 4: Four-player accents

**Setup:** the same dense-combat camera with four duplicate Greatsword Defenders
at comparable depth. Capture calm movement and simultaneous attacks.

**Pass when:**

- every player is distinguishable through restrained cloth accent, selection
  treatment, and name rather than different weapon shapes;
- the local player remains identifiable without relying exclusively on hue;
- all four retain one shared Greatsword-family silhouette;
- allied effects are quieter than local effects and enemy warnings;
- colour-blind simulation preserves local-player and enemy-danger separation.

**Fail when:** identity requires coloured weapons or permanent auras, accents
overpower armour/materials, allied slashes obscure warnings, or overlapping
players become indistinguishable.

### P1 — Plate 5: Lobby and physical Arsenal

**Setup:** fixed lobby composition followed by a fixed gameplay camera centred on
the Arsenal interaction. Capture lobby, practice-weapon arrival, unopened
Arsenal, Greatsword offer, accepted purchase, armed party, and shared countdown.

**Pass when:**

- lobby contains one Defender identity and no legacy hero names, reservations,
  portraits, or duplicate restrictions;
- party readiness is clear without presenting future weapons as disabled
  promises;
- the Arsenal is recognisable in the world before its UI opens;
- only the practice weapon and implemented Greatsword appear in acquisition;
- the purchase keeps enough battlefield context to prove multiplayer continues;
- equip feedback emphasises the new silhouette without full-screen spectacle;
- countdown remains secondary to the newly armed party.

**Fail when:** the Greatsword is another class card; Bow, Staff, Greathammer, or
Daggers appear as disabled inventory; the Arsenal depends on a marker or overlay
for identity; or purchase spectacle exceeds mastery/finale intensity.

### P1 — Plate 6: Materials and environment depth

**Setup:** fixed camera on the Arsenal/Citadel lane boundary without combat
effects. Include Defender, wall proof module, brazier, road, building/shop edge,
and distant fortification.

**Pass when:**

- stone, blackened iron, timber, cloth, blade metal, and fire remain distinct in
  both grayscale and colour;
- three depth bands read clearly: quiet playable floor, lane-edge structures and
  props, dense non-playable perimeter;
- cool moonlight and warm inhabited light create a legible focal route;
- baked/contact darkening anchors feet, wall, brazier, and props;
- surface variation comes from authored palette texture, material response, and
  lighting rather than high-frequency noise;
- the proof wall integrates with current topology without implying a broad
  environment replacement.

**Fail when:** all surfaces share one grey response, brazier glow lifts the whole
scene instead of one local pool, props create false collision/navigation reads,
or the proof asset makes unchanged surroundings unusably inconsistent.

### P1 — Plate 7: Breach

**Setup:** fixed camera between the failed gate and Heartfire Nexus at the first
inner-city rush. Capture pressure before failure, the breach event, and retreat.

**Pass when:**

- the fallen gate creates an unmistakable opening and route toward the Nexus;
- breach red/ember briefly outranks standard skills without defeating HUD
  legibility;
- Defender, escape corridor, heavy threat, and Nexus form one visual chain;
- Greatsword recovery and dodge remain readable during retreat;
- damage/debris deepens the event without contradicting collision;
- the objective rail communicates loss state without duplicating the centre.

**Fail when:** Nexus ornament dominates the breach, debris lies about traversal,
banner/shake/particles/effects make the event unreadable, or the safe retreat
direction cannot be found from the world.

### P1 — Plate 8: Rift finale and mastery

**Setup:** fixed counterattack camera at the Rift Heart. Capture arrival,
Greatsword `F` mastery anticipation, authoritative impact, Rift damage, collapse,
and the post-collapse victory tableau.

**Pass when:**

- Rift corruption owns the initial scene and `F` mastery temporarily takes focus
  at impact;
- mastery descends visibly from Greatsword posture, blade path, materials, and
  effect motif rather than an unrelated spell;
- mastery is louder than basic and standard skills while leaving the Rift Heart
  readable;
- damage and collapse remain authoritative and temporally legible;
- the victory overlay preserves the collapsed-Rift tableau;
- presentation does not imply an active boss absent from gameplay.

**Fail when:** full-screen additive effects hide the Rift, the Greatsword
silhouette disappears at its defining moment, collapse precedes authoritative
victory, the end surface hides the payoff, or the frame promises boss/campaign or
permanent-reward content outside `0.1.35`.

## Global value and effects hierarchy

Every plate preserves this priority:

1. lethal enemy warning or immediate objective failure;
2. local Defender silhouette and committed action;
3. `F` mastery, breach, or Rift collapse while active;
4. standard skill;
5. basic attack and hit confirmation;
6. pickups, allied effects, ambient magic, and UI ornament.

A lower tier may never obscure a higher tier beyond the brief contact frame.
Highlights may clip only in compact emissive cores. Ground, armour, blade, enemy
body, and warning footprint retain internal value detail. Grayscale review must
preserve navigation, action timing, and threat comprehension.

## Proof-package acceptance

The Blender proof package passes only when:

- scale, axes, forward direction, origins, detachable weapon socket, skeleton,
  clips, material slots, and exported hashes match the manifest;
- its complete scope is one neutral Defender rig, practice weapon, Greatsword,
  idle/run/dodge/basic phases, one wall module, one brazier, one slash mesh, and
  one palette texture;
- no runtime asset introduces collision, timing, displacement, damage, or other
  authority;
- triangle counts, draw calls, textures, materials, animation memory, exported
  size, and load time are measured against the budgets below before integration;
- the package remains pipeline proof rather than five-weapon or whole-world
  production.

### Asset and material ceilings

| Asset | Rendered triangles | Mesh/material ceiling |
| --- | ---: | --- |
| Defender | `<= 12,000` | one skinned mesh, one material |
| Practice weapon | `<= 2,500` | one material |
| Greatsword | `<= 2,500` | one material |
| Wall module | `<= 3,000` | one material |
| Brazier | `<= 1,000` | one material |
| Slash mesh | `<= 256` | proof effect mesh only |

Additional hard ceilings:

- no more than four bone influences per vertex;
- Defender plus equipped weapon renders in no more than two draw calls;
- use one `256 x 256` RGBA palette atlas by default;
- all decoded proof textures together remain `<= 1 MiB`;
- a `512 x 512` texture requires fixed-camera evidence and director approval;
- complete proof runtime assets remain `<= 3 MiB` transferred;
- animation data remains `<= 512 KiB` transferred.

### Runtime and delivery budgets

Measure the identical legal dense four-player plate on the reference Mac at
`1280 x 720` after warmup:

- `p95 <= 16.7 ms` across `300` consecutive frames;
- `p99 <= 25 ms` across the same sample;
- candidate `p95` no more than `2 ms` slower than the current procedural
  baseline;
- no sustained frame above `33 ms`;
- asset fetch, decode, and scene readiness from the local production server in
  `< 500 ms`.

The evidence record includes:

- reference Mac hardware, browser/version, viewport, and device-pixel ratio;
- the legal authoritative state and fixed-camera metadata for the sampled plate;
- all `300` consecutive frame times and computed `p95`/`p99`;
- matching procedural-baseline and candidate measurements;
- cold and warm asset fetch, decode, and scene-ready timings;
- draw calls and rendered triangles for every proof asset and the complete plate;
- encoded and decoded texture bytes;
- animation/clip bytes;
- transferred runtime-asset bytes;
- source and exported asset hashes.

Any ceiling or runtime miss blocks integration or requires a director-approved
scope reduction. A miss is not waived and measurement is not deferred until
after asset adoption.

## Binary verdict

Visual acceptance has no conditional shipping state.

- **PASS:** all four P0 plates and all four P1 plates pass from the production
  asset path; solo and four-player evidence use the approved runtime integration;
  fixed-camera metadata is complete; and no explicit non-goal enters the render.
- **FAIL:** any silhouette, authority timing, danger readability, fixed-camera,
  duplicate-player, Arsenal, material/depth, breach-route, or finale-payoff
  criterion fails.

A failed criterion must be corrected or explicitly removed from `0.1.35` by the
director. Art direction may provide review evidence or a separately approved,
conflict-free support seam, but the exclusive implementation owner retains all
gameplay integration and final assembly ownership.
