# Approved game direction

## Product promise

This is a browser-first dark-fantasy pixel action RPG for one to four players. A party of legendary heroes defends the Aegis Citadel against dense demon waves, grows stronger during the assault, survives a city breach, and then pushes together into enemy territory to destroy the invasion rift.

The intended feel is fast, readable, and constantly rewarding: short travel, large hordes, immediate hit feedback, decisive abilities, visible power growth, and no unnecessary downtime or inventory administration.

## Non-negotiable pillars

1. **The city is the objective.** The Heartfire Nexus sits at the center of the Aegis Citadel. Four gates and their lanes surround it. Gates can fall; the run ends only when the Nexus is destroyed.
2. **Solo viable, four-player native.** Enemy pressure scales through active fronts, formations, and elite threats before raw health. XP is shared and rewards are personal. No tank or healer is mandatory.
3. **Exactly four heroes.** The complete roster is the Warden, Riftstalker, Ashcaller, and Gravebinder. The roster does not expand beyond four, and duplicate hero selections are never allowed.
4. **Action before administration.** Combat and movement stay responsive. Choices are compact and do not pause a multiplayer run. There is no inventory grid in the slice.
5. **Defense becomes offense.** The run has a clear reversal: defend, endure a breach, secure the city, counterattack as a group, destroy the rift.

## Visual and camera direction

- Elevated three-quarter action camera with enough view distance to read a full lane and nearby city structures.
- Dark fantasy pixel-art language rendered with technically achievable low-poly geometry, simple sprites, restrained particles, and crisp silhouettes.
- Warm Heartfire gold and human stonework contrast with cold blue shadows, corrupted violet rifts, and hot demon-red attacks.
- Dense enemies remain readable through strong silhouettes, limited effect duration, clear telegraphs, hit flashes, knockback, short hit-stop, controlled screen shake, and magnetic rewards.
- HUD stays compact: hero status and abilities at the bottom, Nexus/gate pressure at the top, and only the information needed for the current fight.
- Recurring city structures and props should vary in silhouette—walls, towers, homes, shrines, forges, barricades, carts, statues, and ruined variants—without implying a larger simulation.

The original three-image gameplay concept is approved for **camera, scale, palette, combat density, effects, and UI language only**. Its map topology is superseded: every playable defense layout must visibly center the Aegis Citadel and Heartfire Nexus, with four readable gates and routes converging on the center.

## World and run shape

```text
                    North Gate
                        |
West Gate ---- Aegis Citadel / Nexus ---- East Gate
                        |
                    South Gate
```

The full-game direction is defense → siege event → group counterattack → Rift Warden. The first slice compresses that into one on-rails 5–10 minute run:

1. Heroes spawn inside the city with exactly one fixed, clearly signalled defense lane open per starting player; inactive approaches remain visibly sealed.
2. Pressure escalates toward multiple approaches while the Nexus remains the readable loss condition.
3. Each level-up can grant a skill point that the player spends directly from the `Q`/`E`/`R`/`F` bar while play continues; points stop once no ranks remain.
4. A Gatebreaker breaches one gate and creates the run's pressure state.
5. Killing the siege threat stabilizes the Nexus and opens a short counterattack route.
6. The party pushes together and destroys the Rift source for the payoff.

## Hero roster

All heroes share the same input grammar: move, aimed primary attack, three active abilities, and one ultimate. Every hero can clear waves, hurt bosses, sustain a solo run, and protect the Nexus. Co-op value comes from complementary effects rather than mandatory roles.

### The Warden

An armored swordsman and durable frontline controller.

- **Iron Cleave:** broad melee combo.
- **Vanguard Rush:** charge, displacement, and elite interrupt.
- **Rupturing Arc:** ground shockwave and armor break.
- **War Standard:** a local offensive and defensive rally zone.
- **Last Bastion:** retaliation and repeated shockwaves.

### The Riftstalker

A mobile demon hunter using a bow, blades, traps, and precision.

- **Repeater Shot:** rapid ranged primary.
- **Vaulting Blade:** evasive leap with a backward attack.
- **Splitbolt:** piercing shot that divides after a kill.
- **Snarefield:** traps and exposes a clustered wave.
- **Execution Volley:** sustained lane-clearing volleys.

### The Ashcaller

A battle mage who controls lanes with fire and explosive reactions.

- **Ember Lance:** aimed projectile and ignite.
- **Flame Ring:** close eruption and pushback.
- **Cinder Wall:** persistent burning line.
- **Falling Star:** delayed, strongly telegraphed meteor.
- **Worldfire:** burning enemies chain explosions through a horde.

### The Gravebinder

A scythe-wielding occult warrior who turns dense hordes into sustain and spirits.

- **Soul Scythe:** sweeping, life-stealing primary.
- **Reap:** pulls marked enemies and executes weakened targets.
- **Bone Ward:** converts collected souls into protection.
- **Wraith Host:** raises short-lived spirits from defeated enemies.
- **Death Tide:** releases stored souls in an advancing wave.

## Hero-selection rules

- The lobby presents all four heroes and no additional slots.
- Locking a hero reserves it; the authoritative server rejects a second lock for the same hero, including simultaneous requests.
- Players may release or exchange a hero before the run begins.
- A four-player party always contains the complete roster.
- Solo and smaller parties choose freely from the same roster.
- Reconnection reservations and join-in-progress selection belong to the full direction, but are not required to prove the first slice.

## Combat and progression direction

- `WASD` movement and mouse aim are independent.
- Hold left mouse for the primary attack; `Q`, `E`, and `R` trigger active abilities; `F` triggers the ultimate. `B` browses a physical shop only while in range, with visible number shortcuts for its wares. There is no separate Space action or global shop menu.
- Common enemies die quickly in groups. Elites create positioning problems. Boss challenge comes from telegraphs and mechanics rather than inflated health.
- Heroes begin each run with one skill point. Basic abilities can reach rank 3; the ultimate unlocks at hero level 3 and can reach rank 2. Legal upgrades appear as compact `+` controls directly on the action bar, with `Ctrl` + ability key as the keyboard shortcut. Level-ups grant points only while unpurchased ranks remain, and rank-ups must create an immediately readable increase in power without pausing multiplayer.
- Movement direction, attack direction, anticipation, impact, and recovery must remain readable from the world animation without relying on the HUD. Enemy damage never lands before a visible windup.
- Party scaling comes from one equally pressured lane per starting player, not faster global cadence or multiplayer enemy-health inflation. The chosen lane set stays fixed for the defense so players can claim and rotate between fronts deliberately.
- Defense approaches must be deep enough to intercept a wave outside the gate, retreat through the city, and reposition around the Nexus. Persistent enemy-facing furniture is avoided; attack telegraphs appear only when they carry actionable timing.
- The approved Armory arc uses multiple physical Citadel shops with different small inventories whose locations create route choices without making solo defense impractical. Purchases never pause multiplayer, use personal co-op-safe gold, and reset every run.
- The verified local shop layer is the northwest Ironbound Forge plus the northeast Veilglass Reliquary. Their four inexhaustible 30-gold wares create basic-versus-ability build axes, while repeatable defense rewards of `1/1/3` gold and preserved `35`-gold Gatebreaker and `6`-gold Rift Guard payoffs pace the first choice, full build, and later reshaping across distinct combat windows. North's equal-cost left/right retreat makes the inventory choice spatial without making solo defense depend on a long diagonal trip. East and West naturally favor different vendors; South is intentionally underserved rather than receiving global access.
- When a living hero's authoritative personal wallet can fund current local stock during an active siege phase, the compact gold tile may state `WARE READY` or `REFORGE READY` at a full build, and every affordable existing vendor mark may receive equal restrained minimap emphasis. This is funded awareness, not a safety claim or route recommendation. It stays personal, derives from actual stocked prices, clears when trading is unavailable, and never enables a remote panel, purchase, path, or inventory comparison.
- Skill Power is sampled when an immediate effect, projectile, delayed strike, or summon is created. Existing Falling Stars and Wraiths do not change damage when later equipment is bought. Cooldown Speed preserves percentage progress on remaining `Q`/`E`/`R`/`F` cooldowns and never changes basic cadence or action timing.
- A cooldown ware's ordinary-purchase and exact reforge previews translate the proposed aggregate Cooldown Speed change into current-to-projected fresh-cast full recharge times for the champion's learned `Q`/`E`/`R`/`F` abilities. Unlearned abilities are omitted rather than projected, and the preview never reports or predicts a live remaining timer. Server authority continues to preserve percentage progress on active cooldowns when equipment changes.
- Combat Stride's battlefield read stays inside Fleetstep's established cyan lower-chevron signature. During a moving Attuned primary windup and impact, one restrained step may trail opposite the hero's actual authoritative velocity, settle home through recovery, and remain quieter on allies. It never adds a particle, ring, sound, HUD meter, proc, network event, or parallel progression rule, and remains subordinate to hero silhouettes, enemy warnings, and ability telegraphs.
- Heroes have exactly six unrestricted equipment slots: any item or duplicate may occupy any slot. Hero Stats groups duplicate copies into named stacks with canonical total effects, and each local shop discloses its current owned count before purchase or replacement. Keep the catalog curated and buy/equip decisions concise; deepen replacement, salvage, build tags, duplicate ranks, and one earned evolution at a time only after rendered play proves the prior layer. Broad loot catalogs, recipe trees, crafting, permanent progression, inventory grids, and automation remain deferred.
- One canonical duplicate threshold gives those unrestricted slots depth: a stack Attunes at four raw matching wares. The fourth copy contributes twice its ordinary listed scalar exactly once; copies one through three and the fifth and sixth contribute one ordinary increment each. Raw socket count and effective scalar count remain distinct and visible. Six slots allow at most one Attuned stack, so `3/3` breadth and `4/2` specialization remain genuine alternatives rather than typed-slot requirements.
- Attunement transitions are authoritative presentation events, not inferred client milestones. A real `3 → 4` crossing awakens once at the hero in the established ware color and shape, then persists as one faint breathing echo behind the dominant signature. A `4 → 3` crossing releases it quietly. Fifth and sixth copies, `5 → 4`, initial synchronization, reconnects, repeated snapshots, previews, cancellations, and rejected trades never replay the ceremony.
- A full-price replacement must expose its exact champion-specific consequence before commitment: outgoing and incoming effects, current-to-projected stack counts, every changed Hero Stat, and the resulting dominant battlefield signature. The projection uses canonical equipment and stat derivation, while the live Hero Stats surface remains authoritative and unchanged until the server accepts the trade.
- Before all six sockets are filled, every ordinary shop card must expose its exact next champion-specific Hero Stat result from the same canonical equipment and stat derivation, including the nonlinear fourth-copy Attunement step. That result stays readable when unaffordable or out of range, but the purchase remains immediate and the live Hero Stats surface remains unchanged until server acceptance. Only one ordinary request may wait against one displayed projection; at `6/6`, the existing slot-specific reforge preview owns the answer instead.
- Every equipped hero visibly wears one restrained, shape-coded signature for the ware with the greatest socket investment; ties resolve to the ware in the lowest occupied slot, and empty equipment shows none. An Attuned dominant stack modestly intensifies the same ware signature rather than adding another visual language, and a reforge previews both entering and leaving that state. This is an authoritative presentation rule, not a proc, set bonus, rarity, item rank, or second equipment system. It remains subordinate to hero silhouettes, local selection, enemy warnings, and ability telegraphs.

## Scope guard

The slice does not add multiple modes, survival crafting, MMO roles, a large map, extensive meta-progression, broad item catalogs, monetized power, or content added only to increase duration. Any new feature must directly prove the approved 5–10 minute experience before it enters `0.1.x`.
