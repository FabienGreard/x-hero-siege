# Decision 0001: Artwork-led battlefield interface

- Status: Approved direction
- Date: 2026-07-12
- Owners: Product and game design
- Applies to: In-run HUD first; lobby, shops, stats, and end screen later
- Visual source of truth: [`../concepts/gameplay-triptych.png`](../concepts/gameplay-triptych.png)
- Directional concept: [`../concepts/battlefield-first-hud-concept.png`](../concepts/battlefield-first-hud-concept.png)
- First implementation: [`../../src/client/style.css`](../../src/client/style.css), under `Decision 0001`

## Context

The gameplay artwork promises a dark-fantasy action game with an open battlefield and a small number of weighty, ornamental interface anchors. The current implementation contains the right information, but presents much of it as equally important tactical panels. That makes the interface feel more like a control dashboard than the artwork.

The problem is hierarchy, not missing information. We should simplify the default combat view before adding bespoke art, icons, or more systems.

## Decision

Adopt a **battlefield-first HUD** derived from the artwork. The world owns the center of the screen. Persistent interface lives at the perimeter in four anchors:

1. **Objective rail — top center.** One thin, dark metal rail shows phase, wave, Nexus health, and the current instruction.
2. **Party stack — top left.** Compact portraits and health lines appear without a large enclosing dashboard panel.
3. **Tactical seal — top right.** The lane compass and minimap read as one circular stone-and-brass instrument. Detailed lane cards are secondary to that instrument.
4. **Action belt — bottom center.** Health, basic attack, four abilities, gold, and kills form one compact silhouette inspired by the artwork's orb-and-slots composition.

This is a direction decision, not a final skin. The first implementation uses CSS and existing symbols so we can prove composition before investing in illustrated frames or icon production.

## Visual principles

### 1. The battlefield is the largest surface

- No persistent opaque panel should occupy the center.
- Edge UI should use localized shadows and gradients, not broad rectangles.
- Combat, telegraphs, enemies, and pickups must remain readable behind the HUD.

### 2. One silhouette per gameplay question

- “Are we losing?” belongs to the objective rail.
- “Where is pressure coming from?” belongs to the tactical seal.
- “What can I do now?” belongs to the action belt.
- “How is the party doing?” belongs to the party stack.
- Expanded stats and trading remain deliberate overlays, not persistent combat surfaces.

### 3. Stone, brass, ember, and glass

The artwork—not generic science-fiction chrome—sets the material language:

| Role | Direction |
| --- | --- |
| Frame | charcoal stone and blackened iron |
| Fine line | aged brass, used sparingly |
| Objective energy | cold Heartfire blue |
| Health and danger | blood red and ember orange |
| Text | warm bone white |
| Secondary text | desaturated blue-grey |

Square corners, fine inset lines, and restrained serif display text should carry the fantasy tone. Glows communicate energy or urgency only; they are not general decoration.

### 4. Calm by default, loud on change

- Persistent UI stays dark and low-contrast.
- Damage, cooldown completion, skill points, lane failure, and boss arrival may temporarily break the calm.
- Avoid looping ornament when a state change is not occurring.

### 5. Detail is progressive

- The default HUD provides state and action.
- Names, ranks, and shortcuts remain available in the action belt.
- Consequence-heavy information belongs in the existing Stats and Shop overlays.
- A smaller HUD must not make purchase, reforge, or upgrade decisions less explicit.

## Information hierarchy

### Persistent

- Nexus health, phase, wave, current objective
- Party health and level
- Lane pressure/minimap
- Player health and level
- Primary attack and learned abilities, including cooldown and rank
- Gold and kill count

### Contextual

- Skill-point prompt
- Interaction prompt
- Combat feed
- Boss health
- Connection state when changing or unhealthy

### Overlay only

- Full hero statistics and equipment consequences
- Shop inventory, purchases, selling, and reforging
- Lobby and run result

## First-iteration constraints

- Preserve the current DOM contracts and game behavior.
- Do not commission or generate final icons and frames yet.
- Do not remove tactical information solely to make a cleaner screenshot.
- Optimize first for the native `1280 x 720` playtest target.
- Keep readable focus, upgrade, cooldown, critical-health, and lane-pressure states.

## Success checks

Review the next playtest capture at `1280 x 720` and answer:

1. Does the eye land on the hero and nearest threat before the interface?
2. Can Nexus health, incoming direction, player health, and ability readiness be found in under one second?
3. Does the HUD read as four anchors rather than many unrelated panels?
4. Does the material language feel compatible with the concept artwork without pretending the low-poly world is already pixel art?
5. Can the player still understand an upgrade, purchase, sale, and reforge without guessing?

If any answer is “no,” iterate on hierarchy or composition before adding decorative detail.

## Not decided yet

- Final illustrated frame and icon production
- Whether the tactical seal keeps a square data field inside a round frame or becomes a fully round rendered minimap
- Per-hero health-orb portrait treatment
- Mana or a second resource; no empty orb is added without a gameplay resource
- Lobby, shop, stats, and end-screen art direction beyond inheriting these materials
- Typography licensing and final display face

## Iteration log

### Iteration 1 — 2026-07-12

- Reframed the default combat HUD around four anchors.
- Reduced panel fills, borders, slot sizes, helper copy, and incidental chrome.
- Shifted the palette from blue-grey technical glass toward charcoal stone, brass, bone, blood, and Heartfire blue.
- Kept all existing interactive and authoritative information contracts.
- Next review: compare a normal combat capture, a pressured-lane capture, an upgrade-ready capture, and an open-shop capture against the success checks above.
