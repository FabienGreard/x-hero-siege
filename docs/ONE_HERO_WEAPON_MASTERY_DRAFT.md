# One-hero weapon and mastery redesign

**Status:** approved migration direction

**Direction version:** 1.0

**Last updated:** 2026-07-12

**Implementation status:** not started

This document is the authoritative migration direction for replacing Siegeheart's four fixed heroes with one generic hero, purchasable weapons, weapon-specific mastery trees, and a much larger run-based item catalog. The verified `0.1.34` build remains the playable transition baseline until bounded checkpoints replace each old contract.

## Decision history

- **Draft 0.1:** established the generic Defender, five weapons, weapon-specific progression, expanded stats and items, vendors, and the artwork gate.
- **Draft 0.2:** approved the non-tree direction from 0.1 and replaced the simple fixed-skill ladders with deep weapon networks containing competing active skills, loadout choices, branch masteries, and cross-branch synergies.
- **Direction 1.0:** approved the single-Defender pivot, the low-poly/pixel-hybrid Three.js target led by the concept art and Blender production, and all five mastery-depth decisions.

## How to use this document

- **Agreed direction** records approved product requirements.
- **Recommended direction** identifies details that still require played prototype evidence rather than another up-front product decision.
- Numerical values are starting points for prototypes, not final balance promises.
- Asset volume begins only after Blender-to-Three.js conventions and the first checkpoint's silhouettes are defined; small proof assets may be produced earlier to validate that pipeline.

## Agreed direction

1. There is only one generic playable hero archetype.
2. A player's weapon, masteries, and items create the build and combat identity.
3. The initial weapon families are:
   - Greatsword
   - Bow
   - Staff
   - Greathammer
   - Daggers
4. Weapons are purchased rather than tied to a hero class.
5. Equipping a weapon grants its basic attack, but no active skill is learned automatically.
6. Active skills and their improvements are learned only through that weapon's mastery tree.
7. Every weapon has its own unique mastery tree.
8. Each hero level grants one mastery point.
9. Items remain part of the game.
10. The item catalog and supported stat vocabulary become substantially larger.
11. The result must continue to work for one to four players.
12. Artwork will be generated after the direction is approved.
13. A weapon tree must contain several competing active skills. The player chooses which skills to learn and which learned skills to equip.
14. The generic Defender, weapon purchasing, saved per-weapon allocations, universal dodge, six item slots, removal of universal Attunement, rotating advanced stock, run-based reset, elemental Staff branches, and functional prototype naming from draft 0.1 are approved.

## Product statement

Siegeheart is a one-to-four-player action RPG in which ordinary champions defend the Citadel, purchase a weapon, and turn it into a personal fighting style through a unique mastery tree. Weapons determine what the hero can do. Masteries determine how those actions evolve. Items connect the weapon build to a broader set of offensive, defensive, status, and utility stats.

The fantasy is not "choose a legendary character." It is:

> Begin as a capable but undefined defender. Become a specialized weapon master during the siege.

## Design pillars

### One readable hero

Every player uses the same neutral base body, animation rig, base statistics, and movement rules. The hero should read as a practical Citadel defender rather than a named class, chosen one, or visually prescriptive archetype.

Player identity comes from:

1. weapon silhouette;
2. mastery effects;
3. equipped items;
4. player color and name;
5. moment-to-moment decisions.

### Weapons are complete playstyles

A weapon is not a small stat modifier. It changes the primary attack, attack timing, range, action posture, and available mastery tree.

### Skills are earned and selected

The action bar begins mostly empty. The equipped weapon always provides its basic attack. A weapon tree offers many active skills, but the player can equip only three standard skills and one mastery skill at a time. Learning a skill and equipping a skill are separate decisions.

### Masteries transform actions

Each point should unlock a skill, add a new combat rule, or visibly transform an existing rule. Plain percentage nodes may support the tree, but should not dominate it.

### Items connect builds

Weapon trees are unique; items are the shared build language. Items let two players using the same weapon still create different builds through critical strikes, status effects, defense, speed, cooldowns, area, sustain, economy, and other stats.

### Multiplayer does not require roles

Every weapon must be able to clear groups, hurt elites and bosses, survive a solo run, and contribute to defense. Weapons may excel at different problems, but no player is required to select a tank, healer, or support weapon.

## The generic hero

### Working identity

Use the functional name **Defender** in systems and copy until a final world-facing term is approved. Avoid class-coded names such as Warden, Mage, Ranger, Rogue, or Champion.

### Base presentation

- Neutral medium armor with a simple Citadel tabard or scarf.
- Face and body remain readable but do not imply a specific class.
- Weapon is the dominant silhouette.
- Player color appears in a restrained cloth accent, selection ring, and small skill effects.
- Armor does not visually become heavy, magical, or stealth-oriented until items or masteries create that read.

### Prototype base statistics

| Stat | Starting value | Purpose |
|---|---:|---|
| Maximum Health | 150 | Neutral survivability baseline |
| Move Speed | 11.2 world/s | Shared traversal baseline |
| Base Armor | 0 | Created primarily by items and masteries |
| Critical Chance | 5% | Makes critical items functional immediately |
| Critical Damage | 150% | Shared critical-hit baseline |
| Dodge Charges | 1 | Recommended universal escape grammar |
| Dodge Recharge | 6s | Tunable survival baseline |

The universal dodge is a movement action, not a learned skill. It preserves a minimum level of responsiveness even when a new weapon tree has few unlocked actions.

## Weapon acquisition and switching

### Recommended model

1. Players begin each run with a neutral practice weapon that has only a weak basic attack and no mastery tree.
2. Before the first wave, each player receives enough personal gold to purchase one real weapon from the central Arsenal.
3. All five weapon families are always offered at the Arsenal.
4. A purchased weapon is equipped immediately and replaces the current weapon.
5. The traded weapon contributes part of its price toward the replacement.
6. A player owns only one active weapon at a time during the initial slice. There is no backpack or weapon swap hotkey.
7. Weapon purchases are permitted during preparation windows and at the Arsenal during combat, but the transaction never pauses the shared run.

### Mastery allocation across weapons

Hero level owns the total point budget. Each weapon owns a saved allocation of that budget.

Example:

- A level-5 player has five mastery points.
- Their Greatsword allocation may spend all five points in the Greatsword tree.
- If they buy a Bow for the first time, the Bow has five unspent points available.
- If they later return to the Greatsword, the saved five-point Greatsword allocation returns.
- A new level adds one unspent point to the currently equipped weapon. Other weapon allocations gain access to that point the next time they are equipped.

This makes weapon replacement viable without converting one weapon's nodes into unrelated nodes or permanently losing hero progression.

### Respecialization recommendation

- Mastery allocation may be reset only at the Arsenal.
- The first reset for a weapon is free so players can learn the system.
- Later resets cost gold.
- Resetting changes no weapon ownership and cannot occur remotely.

## Shared weapon grammar

| Input | Rule |
|---|---|
| Left mouse | Weapon basic attack; always available while a real weapon is equipped |
| Q | Equipped standard weapon skill 1 |
| E | Equipped standard weapon skill 2 |
| R | Equipped standard weapon skill 3 |
| F | Equipped weapon mastery skill |
| Space | Universal dodge |

Each weapon tree contains three interconnected branches. Every branch offers three standard active skills, passive connectors, and one mastery skill. A player may cross between branches, learn more than three standard skills, and change the equipped `Q`/`E`/`R` loadout at the Arsenal or during a level-up choice. Only one learned mastery skill may occupy `F`.

## Mastery-tree rules

### Approved tree scale

- Start the run at level 1 with one mastery point.
- Reach approximately level 8 in a successful 5–10 minute run.
- Gain exactly one point per level.
- Each weapon tree contains approximately 30 nodes.
- Every weapon offers nine standard active skills and three mastery skills.
- A normal run grants approximately eight points, so the player sees only part of one tree.
- Active-skill nodes cost one point and permanently learn that skill for the current run.
- Passive and mutation nodes cost one point and require their connected prerequisite.
- A branch mastery requires at least four previously spent points in that branch and seven total points in the weapon tree; the eighth point purchases the mastery for use in the finale.
- Learning one branch mastery locks the other two mastery skills for that weapon until respecialization.
- The player may learn more standard skills than can be equipped, creating loadout decisions rather than automatic action bars.
- Standard skill slots may be rearranged only at the Arsenal or as part of the level-up interaction; combat never pauses.

### Tree shape

```text
                           [Weapon basic]
                    /            |            \
              Branch A       Branch B       Branch C
              [Skill A1]     [Skill B1]     [Skill C1]
               /     \         /     \         /     \
          [mutation] [passive connector] [mutation] [passive]
               \     /         \     /         \     /
              [Skill A2]     [Skill B2]     [Skill C2]
                  \            / \            /
                 [cross-branch synergy nodes]
                    \          |          /
              [Skill A3]     [Skill B3]     [Skill C3]
                    |             |             |
              [Mastery A] OR [Mastery B] OR [Mastery C]
```

The full tree should read as a network, not three isolated ladders. Cross-branch nodes reward combinations such as Greatsword Guard plus Charge, Staff Fire plus Lightning, or Dagger Bleeding plus mobility. The interface assigns learned standard skills to `Q`, `E`, and `R` through simple click-then-slot selection; it does not use freeform dragging.

## Greatsword

### Identity

Balanced two-handed melee weapon with broad attacks, deliberate defense, and forward pressure. It is the most approachable weapon, but mastery choices can push it toward cleaving groups, counterattacking, or aggressive movement.

### Basic attack — Sweeping Strike

A medium-speed, wide frontal swing. Alternates left and right. Every third uninterrupted strike is a heavier finisher.

**Prototype profile:** medium damage, medium cadence, wide melee arc, minor movement during windup.

### Cleaving branch

**Standard skills**

- **Cleave:** deliver one broad high-damage swing.
- **Whirlwind:** spin while moving slowly, repeatedly striking nearby enemies at reduced per-hit power.
- **Rising Slash:** cut upward in a narrow line, launching normal enemies and heavily staggering larger targets.

**Branch nodes**

- **Follow Through:** recovery shortens for each different enemy hit by a Greatsword skill, up to a cap.
- **Honed Arc:** increases the frontal width of Cleave and Sweeping Strike without increasing their rear coverage.
- **Sundering Edge:** the center of Cleave and Rising Slash temporarily reduces enemy Armor.
- **Endless Motion:** Whirlwind gains duration from Attack Speed but retains a strict maximum number of hits.

**Mastery — Bladestorm:** surge forward through a chosen path while delivering a sequence of large circular strikes. It is mobile wave clearing, not an invulnerable escape.

### Guarding branch

**Standard skills**

- **Guard:** brace briefly and reduce damage arriving from the aimed direction.
- **Counterstrike:** enter a short counter window; receiving a valid attack releases an immediate return slash.
- **Rallying Sweep:** strike around the hero, gain a Barrier for each enemy hit, and grant nearby allies a smaller capped Barrier.

**Branch nodes**

- **Riposte:** successfully Guarding empowers the next basic strike and skips its windup.
- **Perfect Guard:** guarding during an enemy windup interrupts normal enemies and heavily staggers elites.
- **Shared Resolve:** Rallying Sweep's ally Barrier improves, but the self Barrier remains unchanged.
- **Guarded Advance:** move slowly while Guarding and retain part of the guard effect during its recovery.

**Mastery — Unbreakable:** enter a limited defensive stance that automatically answers several blocked attacks with Sweeping Strike finishers. Damage is reduced rather than ignored.

### Execution branch

**Standard skills**

- **Charge:** rush forward and push enemies aside.
- **Impale:** deliver a narrow thrust with long melee reach and increased damage against elites.
- **Colossal Strike:** commit to one heavily telegraphed overhead blow with extreme stagger and boss damage.

**Branch nodes**

- **Momentum:** Charge travels farther and partially refunds its cooldown when it hits an elite.
- **Relentless Charge:** the first normal enemy hit is carried to the endpoint and struck by the next basic finisher.
- **Measured Blow:** Colossal Strike gains damage while its aim remains stable during windup.
- **Executioner's Reach:** Impale gains critical chance against low-health enemies and pierces through its first target.

**Mastery — Onslaught:** repeatedly reset Charge and Impale for a short duration; each enemy can trigger only one reset so a boss cannot produce an infinite loop.

### Greatsword cross-branch nodes

- **Countercharge:** a successful Guard empowers Charge to interrupt elites.
- **Sweeping Advance:** Charge's endpoint releases a weaker Cleave if Cleave is learned.
- **Stand and Deliver:** Colossal Strike gains a Barrier during windup if Rallying Sweep is learned.

## Bow

### Identity

Long-range physical weapon built around aim, spacing, piercing lines, and controlled repositioning. It should reward precision without becoming unusable in dense solo defense.

### Basic attack — Quick Shot

Fire a fast arrow toward the latest accepted aim. Holding attack repeats shots. Base arrows hit one target.

**Prototype profile:** low damage per shot, high range, fast cadence, full movement between releases.

### Precision branch

**Standard skills**

- **Power Shot:** charge briefly, then fire a high-damage piercing arrow.
- **Marked Shot:** damage one target and Expose it; a visible mark prevents permanent uptime.
- **Ricochet:** fire an arrow that turns toward a second nearby target after its first impact.

**Branch nodes**

- **Steady Aim:** Power Shot gains damage while the aim direction remains stable during windup.
- **Weak Point:** the first elite or boss struck by Power Shot takes increased critical damage.
- **Patient Hunter:** Marked Shot lasts longer when placed on an elite, but its cooldown also increases.
- **True Rebound:** Ricochet may jump one additional time if the previous hit was critical.

**Mastery — Deadeye:** enter a short precision window in which basic arrows gain pierce, critical chance, and execution damage.

### Barrage branch

**Standard skills**

- **Multishot:** release a controllable fan of arrows in the aimed direction.
- **Volley:** fire several arrows into a selected area at once.
- **Rain of Arrows:** create a persistent selected area that releases timed arrow waves.

**Branch nodes**

- **Tight Formation:** Multishot can be focused into a narrower fan with repeated central coverage.
- **Pinned Down:** repeated Barrage hits on one enemy progressively Slow it, up to a cap.
- **Prepared Ground:** Rain of Arrows lasts longer but has a longer base cooldown.
- **Endless Quiver:** killing several different enemies with one Barrage skill partially refunds another Barrage cooldown.

**Mastery — Arrow Storm:** cover a very large area with repeated directional volleys; the player can steer the storm's center slowly.

### Survival branch

**Standard skills**

- **Evasive Shot:** leap backward and fire toward the aimed direction.
- **Caltrop Trap:** place a field that damages lightly and Slows enemies crossing it.
- **Explosive Trap:** place a delayed trap that detonates when enough enemies enter or when its duration ends.

**Branch nodes**

- **Light Footing:** Evasive Shot restores the universal dodge if its arrow kills an enemy.
- **Parting Gift:** Evasive Shot drops a small Caltrop Trap if that skill is learned.
- **Barbed Ground:** enemies leaving Caltrops are briefly more vulnerable to Bleeding.
- **Controlled Blast:** Explosive Trap may be recast to detonate early at reduced power.

**Mastery — Hunt Without Rest:** for a limited duration, dodge and Evasive Shot leave traps while trap triggers improve the next basic arrow.

### Bow cross-branch nodes

- **Marked Barrage:** Barrage skills prioritize a Marked target with one central arrow.
- **Calculated Retreat:** Evasive Shot instantly reaches full Steady Aim if its arrow hits an enemy.
- **Chain Reaction:** an Explosive Trap triggered by a critical hit releases one reduced Ricochet arrow.

## Staff

### Identity

Generic arcane weapon whose tree supplies elemental and magical specialization. The weapon itself is not exclusively a fire, frost, or lightning staff; the player's mastery allocation determines its expression.

### Basic attack — Arcane Bolt

Launch a medium-speed magical bolt that bursts for small secondary damage on contact.

**Prototype profile:** medium ranged damage, moderate cadence, small splash, no innate status.

### Flame branch

**Standard spells**

- **Fireball:** launch an orb that explodes and applies Burning.
- **Flame Wall:** place a persistent burning line that catches enemies crossing it.
- **Detonate:** consume part of the remaining Burn on enemies in an area to deal immediate damage.

**Branch nodes**

- **Kindling:** Burning deals more damage for each additional Burning enemy nearby, up to a cap.
- **Combustion:** an enemy killed while Burning explodes and spreads a shorter Burn.
- **Living Flame:** Flame Wall slowly advances along its cast direction.
- **Controlled Burn:** Detonate consumes less duration but has a longer cooldown.

**Mastery — Inferno:** create a large fire zone that repeatedly applies Burning and causes Combustion to spread inward rather than outward.

### Frost branch

**Standard spells**

- **Frost Nova:** release a close-range wave that damages and Chills enemies.
- **Ice Lance:** fire a narrow projectile that gains damage against Chilled or Frozen targets.
- **Blizzard:** create a persistent storm that repeatedly Chills enemies inside it.

**Branch nodes**

- **Deep Freeze:** heavily Chilled normal enemies become Frozen briefly; elites instead receive a strong Slow.
- **Shatter:** critical hits against Frozen or strongly Chilled enemies create damaging fragments.
- **Biting Wind:** Blizzard's outer edge deals more damage while its center applies stronger Chill.
- **Cold Snap:** Ice Lance striking a Frozen enemy releases a reduced Frost Nova at that target.

**Mastery — Absolute Zero:** rapidly build Chill in a wide area, Freeze normal enemies, and convert boss immunity into heavy Stagger.

### Lightning branch

**Standard spells**

- **Chain Lightning:** strike the aimed enemy and jump to nearby targets.
- **Ball Lightning:** launch a slow orb that repeatedly shocks nearby enemies as it travels.
- **Arcane Step:** teleport a short distance and leave a delayed lightning pulse at departure and arrival.

**Branch nodes**

- **Conduction:** jumps prefer targets not yet struck and gain range through statused enemies.
- **Overload:** the final Chain Lightning jump leaves a delayed pulse at its target.
- **Charged Path:** Ball Lightning travels farther for every different enemy it shocks, up to a cap.
- **Residual Charge:** Arcane Step makes the next Staff basic chain once at reduced power.

**Mastery — Tempest:** summon a moving storm that repeatedly chooses new targets and improves Fire and Frost reactions inside it.

### Staff cross-branch nodes

- **Thermal Shock:** damaging a strongly Chilled enemy with Flame causes a small burst and clears part of the Chill.
- **Conductive Ice:** Lightning jumps farther through Chilled enemies.
- **Stormfire:** Lightning striking a Burning enemy spreads a reduced Burn to one nearby unburned target.
- **Elemental Balance:** learning at least one standard spell from all three branches improves Staff basics without increasing any individual status.

## Greathammer

### Identity

Slow, forceful melee weapon built around impact, stagger, armor, and controlling dangerous formations. It is durable through action timing rather than being a mandatory tank weapon.

### Basic attack — Crushing Blow

Deliver a slow frontal strike with high damage and stagger. Every second strike creates a small impact behind the primary target.

**Prototype profile:** high damage, slow cadence, short broad range, high stagger.

### Impact branch

**Standard skills**

- **Ground Slam:** strike the ground and release a short frontal shockwave.
- **Seismic Crush:** deliver a narrow overhead impact that leaves a delayed fault line.
- **Cyclone Sweep:** swing the hammer around the hero, pushing normal enemies toward the outer edge.

**Branch nodes**

- **Aftershock:** Ground Slam repeats a weaker shockwave after a delay.
- **Fault Line:** delayed seismic effects travel farther and reduce enemy Armor.
- **Centered Force:** enemies near Seismic Crush's center receive additional Stagger rather than inflated damage.
- **Full Circle:** Cyclone Sweep gains area from Attack Speed but keeps a fixed single-hit rule.

**Mastery — Earthquake:** repeatedly rupture a large selected area, damaging and staggering enemies in timed waves.

### Fortitude branch

**Standard skills**

- **Brace:** gain temporary Armor and displacement resistance while moving slowly.
- **Retaliation Smash:** prepare a heavy swing whose power scales with damage received during its windup.
- **Iron March:** advance slowly with increased Armor, pushing normal enemies away with each step.

**Branch nodes**

- **Hold Fast:** taking a heavy hit during Brace reduces one equipped Impact skill's cooldown.
- **Immovable:** Brace ends with a pulse whose Stagger scales with damage absorbed.
- **Measured Retaliation:** Retaliation Smash cannot be interrupted by normal enemies after absorbing damage.
- **Marching Wall:** Iron March grants nearby allies minor displacement resistance without granting Armor.

**Mastery — Juggernaut:** temporarily accelerate Crushing Blow, gain Armor, and make every basic impact produce a bounded shockwave.

### Disruption branch

**Standard skills**

- **Leap Slam:** leap to a target point and stagger enemies on landing.
- **Hammer Throw:** throw the hammer through enemies; it returns and can hit each enemy once in each direction.
- **Upheaval:** strike beneath enemies in a line, pulling normal enemies toward the impact center.

**Branch nodes**

- **Heavy Landing:** enemies near Leap Slam's center are briefly Stunned.
- **Seismic Ring:** Leap Slam sends a delayed outer ring back toward its center.
- **Returning Force:** catching Hammer Throw improves the next basic strike and shortens its windup.
- **Gather the Horde:** Upheaval's pull strengthens against groups but weakens against isolated elites.

**Mastery — Cataclysm:** perform three aimed impacts in sequence—pull, launch, and collapse—letting the player reshape one formation.

### Greathammer cross-branch nodes

- **Fortified Landing:** Brace remains partially active during Leap Slam.
- **Crushing Return:** Hammer Throw releases an Aftershock when caught if Ground Slam is learned.
- **No Escape:** Iron March pushes enemies toward an active Upheaval center instead of directly away.

## Daggers

### Identity

Fast close-range weapon built around movement, repeated hits, critical strikes, and damage-over-time effects. Its defense comes from repositioning and short invulnerability windows rather than high health.

### Basic attack — Twin Slash

Alternate rapid short-range strikes. Every fourth hit attacks with both daggers and applies one stack of Bleeding.

**Prototype profile:** low damage per hit, very fast cadence, narrow melee reach, strong on-hit scaling.

### Flurry branch

**Standard skills**

- **Flurry:** deliver several rapid strikes in the aimed direction.
- **Lunge:** thrust through a short line and deal increased damage to the first enemy hit.
- **Rupture:** consume Bleeding stacks from one target for immediate damage.

**Branch nodes**

- **Unrelenting:** each Flurry critical increases the critical chance of its remaining strikes.
- **Deep Cut:** Lunge applies additional Bleeding to its first target.
- **Measured Rupture:** Rupture consumes fewer Bleeding stacks but gains a longer cooldown.
- **Open Wound:** consuming maximum Bleeding briefly increases damage taken from Dagger basics.

**Mastery — Killing Spree:** enter a short state in which kills extend the duration and improve Attack Speed, with a strict maximum duration.

### Thrown-blade branch

**Standard skills**

- **Fan of Knives:** throw daggers in a broad circle around the hero.
- **Knife Volley:** throw several daggers in a narrow aimed cone.
- **Blade Trap:** place a trap that releases rotating knives when enemies enter.

**Branch nodes**

- **Serrated Knives:** thrown-blade skills apply Bleeding and pass through their first target.
- **Returning Blades:** Fan and Volley daggers return and can hit each enemy once more.
- **Focused Volley:** Knife Volley narrows and gains critical chance against its central target.
- **Patient Trap:** Blade Trap gains power while waiting, up to a visible cap.

**Mastery — Thousand Blades:** fill a selected area with repeated crossing knife lines that inherit Projectile and Bleeding stats.

### Agility branch

**Standard skills**

- **Dash:** pass through enemies with a short invulnerability window and damage them.
- **Backstep:** evade backward, then make the next basic attack a lunging twin strike.
- **Smoke Bomb:** create a brief area that Slows enemies while improving the hero's dodge recharge and critical chance inside it.

**Branch nodes**

- **Cut Through:** killing an enemy with Dash restores one universal dodge charge.
- **Shadow Trail:** Dash leaves a brief trail that increases enemy damage taken from Bleeding.
- **Opportunist:** Backstep's empowered strike gains critical damage against attacking enemies.
- **Vanishing Act:** leaving Smoke Bomb grants a short burst of Move Speed rather than invisibility.

**Mastery — Blade Dance:** rapidly move between nearby enemies and strike each one, preferring unmarked targets before repeating.

### Dagger cross-branch nodes

- **Serrated Escape:** Dash through a Bleeding enemy to release a reduced Fan of Knives at the endpoint.
- **Hidden Blades:** Backstep causes the next Knife Volley to originate from the hero's previous position as well.
- **Blood in the Smoke:** Rupturing an enemy inside Smoke Bomb restores a bounded amount of health.

## Shared combat vocabulary

Weapon trees and items should share a limited, explicit set of combat terms.

| Term | Draft rule |
|---|---|
| Armor | Reduces incoming physical damage with diminishing returns |
| Armor Break | Temporarily reduces a target's Armor |
| Barrier | Temporary health depleted before normal health |
| Bleeding | Physical damage over time; stacks to a defined cap |
| Burning | Elemental damage over time; refresh behavior must be explicit |
| Chill | Movement and action-speed reduction |
| Critical Hit | Multiplies eligible direct damage by Critical Damage |
| Exposed | Increases damage received from all players; does not stack |
| Frozen | Brief normal-enemy disable; elites and bosses receive a strong Slow instead |
| Life Steal | Heals from eligible direct weapon damage, subject to a per-second cap |
| Slow | Reduces movement speed; strongest value wins |
| Stagger | Interrupts or delays an enemy action according to its resistance |
| Stun | Prevents action briefly; bosses convert it to Stagger damage |

## Item-system direction

### Recommended structure

- Keep **six unrestricted equipment slots** for the first redesign. A large catalog should create selection pressure, not a larger inventory panel.
- Items remain run-only and reset after the run.
- Duplicate items are allowed unless an item is explicitly Unique.
- Remove the current universal four-copy Attunement rule. A larger catalog should reward combinations rather than asking players to buy four copies of the same scalar.
- Each item has one clear primary stat. Advanced items may add one secondary stat or one distinctive rule.
- Items work with every weapon unless their text explicitly names a combat tag such as Projectile, Melee, Status, or Summon.
- Shops show exact projected stat changes before purchase or replacement.
- A full build still uses exact-slot replacement and trade-in rather than a temporary seventh slot.

### Item tiers

| Tier | Draft purpose | Draft price |
|---|---|---:|
| Common | One dependable stat | 50 gold |
| Advanced | Stronger or dual-stat direction | 80 gold |
| Relic | Build-changing rule; usually Unique | 120 gold |

Prices are placeholders. Economy should be tuned only after weapon and mastery pacing is playable.

## Expanded stat vocabulary

### Core offense

- Weapon Damage
- Attack Speed
- Critical Chance
- Critical Damage
- Armor Penetration
- Elite Damage
- Boss Damage
- Damage to full-health enemies
- Execute threshold

### Skills

- Skill Damage
- Cooldown Recovery
- Area Size
- Skill Duration
- Projectile Speed
- Projectile Count
- Chain Count
- Summon Damage
- Summon Duration

### Status

- Status Chance
- Status Damage
- Status Duration
- Bleed Damage
- Burn Damage
- Chill Strength
- Damage to statused enemies

### Defense and sustain

- Maximum Health
- Armor
- Barrier Capacity
- Health Regeneration
- Life Steal
- Healing Received
- Dodge Recharge
- Damage Reduction while moving
- Damage Reduction while stationary
- Crowd-control Resistance

### Mobility and utility

- Move Speed
- Pickup Radius
- Gold Gain
- Experience Gain
- Weapon-swap discount
- Shop reroll discount

### Guardrails

- Cooldown Recovery, Armor, Life Steal, Dodge Recharge, crowd control, and economy bonuses require caps or diminishing returns.
- Separate additive and multiplicative modifiers in the stat model.
- Tooltips must show final values, not require the player to infer stacking formulas.
- Avoid stats that only function for one weapon unless the item is clearly tagged and stocked appropriately.
- Economy and Experience bonuses must trade immediate combat strength for future value; they should never become mandatory first purchases.

## Draft item catalog

The following catalog is intentionally broader than the first implemented shop stock. It establishes the desired stat space and names; it does not require all items to ship simultaneously.

### Common items

| Item | Primary effect | Build purpose |
|---|---|---|
| Tempered Edge | +Weapon Damage | Universal direct damage |
| Duelist Gloves | +Attack Speed | Fast attacks and on-hit builds |
| Keen Lens | +Critical Chance | Critical foundation |
| Executioner's Mark | +Critical Damage | Critical specialization |
| Piercing Wedge | +Armor Penetration | Armored elites and bosses |
| Runebound Focus | +Skill Damage | Active-skill builds |
| Quickening Sigil | +Cooldown Recovery | More frequent skills |
| Expansive Glyph | +Area Size | Cleaves, zones, and slams |
| Lingering Hourglass | +Skill Duration | Zones, buffs, and summons |
| Windcut Feather | +Projectile Speed | Bow, Staff, and thrown blades |
| Gateward Plate | +Maximum Health | Universal durability |
| Riveted Mail | +Armor | Physical durability |
| Veilglass Buckle | +Barrier Capacity | Barrier builds |
| Vitality Band | +Health Regeneration | Recovery between fights |
| Leeching Fang | +Life Steal | Aggressive sustain |
| Fleetstep Greaves | +Move Speed | Repositioning and routing |
| Wayfinder Charm | +Pickup Radius | Reward collection under pressure |
| Scholar's Knot | +Experience Gain | Earlier mastery points |
| Gilded Token | +Gold Gain | Earlier purchases |
| Steadfast Cord | +Crowd-control Resistance | Reliability under elite pressure |

### Advanced items

| Item | Effects | Build purpose |
|---|---|---|
| Serrated Whetstone | Weapon hits can apply Bleeding; +Bleed Damage | Physical status build |
| Ember Vial | Direct skill hits can apply Burning; +Burn Damage | Fire and status crossover |
| Frostbound Shard | Skill hits apply Chill; +damage to Chilled enemies | Control build |
| Stormcoil | Critical hits can chain a reduced lightning hit | Critical-area hybrid |
| Hunter's Crest | +Elite Damage and +Armor Penetration | Elite hunter |
| Riftglass Scope | +Projectile Speed and +Critical Chance at long range | Precision ranged build |
| Brawler's Wraps | +Melee Damage and +Armor while near several enemies | Close-range survival |
| Echo Prism | Small chance for a non-mastery skill to repeat at reduced power | Skill-frequency build |
| Guardian Core | Gain a Barrier after taking a large hit; internal cooldown | Burst protection |
| Bloodbound Loop | +Life Steal at low health; reduced healing from pickups | Risk-reward sustain |
| Traveler's Spurs | +Move Speed and reduced universal dodge recharge | Mobility build |
| Commander's Seal | +Summon Damage and +Summon Duration | Future summon-compatible builds |

### Relics

Relics are Unique: only one copy of each may be equipped.

| Relic | Build-changing rule |
|---|---|
| Heartfire Brand | Every several weapon hits releases a small radial pulse; pulse cadence is fixed and readable |
| Mirror of the Rift | The first skill cast after a long idle period echoes at reduced power |
| Last Gate Emblem | Taking lethal damage instead leaves the hero at low health and grants a Barrier; once per run |
| Crown of Embers | Statused enemies that die spread part of their remaining status duration |
| Giant's Knuckle | Staggering an elite creates a shockwave; strict target cooldown |
| Black Arrowhead | Projectiles gain one pierce but deal reduced damage after piercing |
| Dancer's Thread | Spending a dodge charge empowers the next weapon hit and briefly increases Move Speed |
| Hourglass of War | Skill cooldowns recover faster while a gate is under active pressure |
| Soul Lantern | Enemy deaths fill a meter; at full charge, the next learned skill gains increased area and damage |
| Empty Scabbard | Gain Weapon Damage for each empty equipment slot; intended for low-item challenge builds |

## Vendors and stock

### Recommended vendor layout

1. **Arsenal:** all five weapons, weapon replacement, and mastery respecialization.
2. **Forge:** weapon damage, attack speed, critical, Armor, Maximum Health, and melee-oriented stock.
3. **Reliquary:** skill, cooldown, area, duration, status, projectile, and summon-oriented stock.
4. **Quartermaster:** movement, sustain, utility, economy, and mixed defensive stock.

Common stock can be stable while Advanced items and Relics rotate between runs. The player should always be able to find basic damage and survival, while specialized combinations vary.

### Stock rules to prototype

- All five weapons are always available.
- Each item vendor shows four to six wares.
- Common essentials are guaranteed.
- Advanced items use a controlled random pool.
- At most one Relic is offered per vendor per run.
- Personal purchases do not remove stock for other players.
- Shop locations remain physical route decisions.

## Example builds

### Greatsword counterfighter

- Guard → Riposte → Perfect Guard
- Cleave → Sundering Cleave
- Colossal Strike
- Armor, Critical Damage, and cooldown items

The player stands close to elite pressure, converts readable enemy windups into counterattacks, and saves the final mastery for priority targets.

### Bow mobile barrage

- Volley → Rain of Arrows
- Evasive Shot → Parting Shot
- Arrow Storm
- Area Size, Skill Duration, Move Speed, and Chill items

The player controls one approach through placed pressure and repeatedly creates distance.

### Staff elemental spread

- Fireball → Combustion
- Chain Lightning → Overload
- Elemental Storm
- Status Damage, Skill Damage, Area Size, and Crown of Embers

The player prepares groups with statuses and turns deaths into spreading reactions.

### Greathammer disruption

- Ground Slam → Fault Line
- Leap Slam → Heavy Landing
- Earthquake
- Armor Penetration, Area Size, Armor, and Giant's Knuckle

The player interrupts formations and creates space without becoming a mandatory tank.

### Daggers critical bleed

- Flurry → Finisher
- Fan of Knives → Returning Blades
- Killing Spree
- Attack Speed, Critical Chance, Bleed Damage, and Life Steal

The player accumulates repeated-hit value, consumes Bleeding for burst, and survives by maintaining tempo.

## Interface direction

### In combat

- The action bar shows the weapon basic, three equipped standard skills, one mastery slot, and the universal dodge.
- Empty slots invite the player to learn or equip a skill without implying that a particular branch owns that input.
- Level-up presents a compact choice notification without pausing the run.
- The player may defer a point and continue fighting.
- A full tree is available through a non-pausing panel.
- Legal nodes are immediately readable; unavailable nodes state their prerequisite.
- Learning a standard skill while all three standard slots are full opens a compact replace-or-leave-unassigned choice.
- A newly learned skill may be assigned to `Q`, `E`, or `R`; existing skills shift only through explicit confirmation.
- Passive nodes apply immediately and do not occupy the action bar.

### At the Arsenal

- Weapon cards show basic attack style, range, speed, difficulty, and three branch summaries.
- Replacing a weapon previews the complete action-bar change.
- The current weapon's trade-in value and net price are explicit.
- A new weapon reports how many mastery points are waiting to be allocated.
- The Arsenal shows every learned standard skill beside the three equipped slots and allows deliberate loadout changes.
- Respecialization resets learned nodes and loadout together, then returns the complete point budget.

### Item presentation

- Character Stats groups final values into Offense, Skills, Status, Defense, and Utility.
- Item comparisons show only changed final stats and changed special rules.
- Tags explain compatibility: `MELEE`, `PROJECTILE`, `STATUS`, `SUMMON`, `CRITICAL`, and `UNIVERSAL`.
- Exact-slot replacement remains available at a full build.

## Multiplayer rules

- Multiple players may use the same weapon.
- Weapon and item stock is personal and inexhaustible.
- Mastery choices are personal.
- Effects use the player's accent color where ownership matters.
- Statuses from multiple players share explicit stacking rules.
- Exposed does not stack; the strongest or longest valid application wins.
- Damage-over-time effects track ownership for rewards and statistics.
- Enemy pressure continues to scale through active fronts and formations rather than raw multiplayer health inflation.

## Migration from the current game

### Replace

- Four hero identities and hero reservation.
- Hero-specific base stats.
- Fixed hero skill kits.
- Direct rank upgrades on the `Q`/`E`/`R`/`F` bar.
- Five-item catalog.
- Universal duplicate Attunement.
- Hero-specific item projections.

### Preserve where useful

- Server-authoritative actions, damage, purchases, progression, and snapshots.
- One-to-four-player session model.
- Citadel, gates, Nexus, waves, breach, and counterattack run shape.
- Physical shop routing.
- Exact-slot item replacement and trade-in.
- Existing readable projectile, wall, summon, movement, impact, and telegraph technology.
- Reconnect behavior.

### Potential mechanical reuse

Existing hero abilities may be used as prototype technology, but their old names and class ownership should not constrain the new design:

- Warden technology can prototype Greatsword and Greathammer actions.
- Riftstalker technology can prototype Bow and Dagger projectiles or movement.
- Ashcaller technology can prototype Staff zones and statuses.
- Gravebinder technology can prototype future summons and sustain items.

## Proposed implementation sequence

1. Establish the migration contracts, ownership boundaries, and Blender-to-Three.js pipeline.
2. Replace hero selection and protocol identity with the generic Defender through a bounded playable checkpoint.
3. Add weapon ownership, purchase, equip, trade-in, and snapshot data.
4. Implement one complete vertical weapon: Greatsword basic, its nine standard skills, three mastery skills, connectors, and loadout management.
5. Add the generic mastery graph, point budget, saved per-weapon allocations, and UI.
6. Replace the item stat model and implement a small representative catalog.
7. Add Bow, Staff, Greathammer, and Daggers one at a time.
8. Expand item stock only after the five weapon loops are readable.
9. Rebalance XP, gold, shops, and enemy pressure using full-run evidence.
10. Generate and integrate approved artwork.

## Artwork gate and future brief

Do not produce disconnected asset volume. Establish one Blender-to-Three.js pipeline, validate it with the first approved checkpoint, then create one consistent visual package rather than unrelated images.

### Planned artwork set

1. Generic Defender turnaround or concept sheet.
2. Five weapon silhouette sheets at the same scale.
3. One mastery-tree icon family per weapon.
4. Shared item icon language for Common, Advanced, and Relic items.
5. Arsenal and vendor presentation concepts.
6. One gameplay keyframe showing four generic Defenders with distinct weapon builds.

### Visual constraints to approve first

- Exact pixel-art versus low-poly/pixel-hybrid treatment.
- Hero body proportions and camera readability.
- Weapon scale and exaggeration.
- Color ownership: weapon family colors versus player colors.
- Whether mastery branches alter the hero silhouette or only effects.
- Item icon border and rarity language.

## Resolved mastery decisions

1. **Loadout timing:** equipped skills change at the Arsenal or during a level-up interaction, not remotely anywhere outside combat.
2. **Learned but unequipped skills:** general connected passives remain active; mutations tied to one skill apply only while that skill is equipped.
3. **Mastery access:** four prior points in one branch and seven total weapon points unlock the eighth-point purchase of that branch's `F` mastery.
4. **Tree visibility:** the complete approximately 30-node network is visible immediately.
5. **Level-up cadence:** a successful run grants approximately eight points, and the mastery must arrive early enough to use before the finale.

## Current recommendation summary

- One neutral Defender shared by all players.
- Five purchasable weapon families with unrestricted duplicates in multiplayer.
- Weapon grants only its basic attack.
- Every weapon tree offers nine standard skills, three mutually exclusive mastery skills, passive connectors, and cross-branch synergies.
- The player may learn more skills than fit on the bar and equips three standard skills on `Q`/`E`/`R` plus one mastery on `F`.
- Approximately eight mastery points during a successful run.
- Hero level owns the point budget; each weapon saves its own allocation.
- Six item slots, a larger shared catalog, and no universal duplicate Attunement.
- Stable Common stock, rotating Advanced items and Relics.
- Blender-led production follows the approved concept-art direction and begins with pipeline proof before asset volume.
