# Siegeheart devlog

This is the human-readable record of why each verified checkpoint exists. Mechanical detail and formal verification remain in the changelog, roadmap, and playtest log.

## 2026-07-10 — Truth before trade

Gold and equipment only create strategy when the numbers beneath them are trustworthy. Before `0.1.6`, leveling could raise health silently, the HUD could not explain a hero's combat baseline, and the finishing player alone received an enemy's gold. Turning that currency into shop power would have rewarded last-hit competition and asked players to buy against hidden rules.

This checkpoint makes the foundation explicit. The server now derives the same small set of Hero Stats used by movement, attacks, abilities, healing, barriers, and cooldown presentation. Pressing `C` opens a compact panel over live play; it reports those authoritative values without pausing or swallowing combat input.

Enemy gold is personal but cooperative. Every connected hero receives an equal share while the finisher keeps the kill credit, so defending a quieter lane does not sabotage a future build. The familiar gold and Rift Shard drops still burst from demons as visual reward, but they no longer pretend to be a second collectible payout.

No vendor or item was added yet. The next checkpoint can now introduce the first physical shop against a power model and wallet the player can actually trust.

## 2026-07-10 — A horde, not a queue

The city was receiving enough demons, but they did not look like an invasion. Every creature chose the exact center of its target, so a dense wave collapsed into a narrow road queue and then one unreadable pile at the gate or Nexus.

`0.1.5` gives each attacker a stable place in the fight. Demons fan apart while travelling, fill separate rows across a gate, and occupy approach-facing rings around the Heartfire. Wraiths also keep distinct angles when they descend on the same victim. Common demons are smaller relative to the heroes and elites, matching the approved concept's combat scale more closely.

Nothing was added to the encounter and no difficulty numbers changed. The same invasion now reads as a surrounding force rather than duplicated sprites sharing a coordinate.

## 2026-07-10 — Wraiths that actually haunt the battlefield

Gravebinder has always been described as the hero who turns a crowded graveyard into an army. Until `0.1.4`, Wraith Host did not deliver that fantasy: pressing `R` fired five green projectiles and they disappeared.

The checkpoint keeps the same button, cooldown, ranks, palette, and authoritative multiplayer rules, but changes what the player sees and feels. Wraith Host now raises a small pack of spirits that remain in the world, circle their summoner when idle, peel away toward demons, strike until a target falls, and find another victim. They can follow the counterattack all the way to the Rift Heart.

The important improvement is not additional content. It is that one of the four promised heroes now behaves more like the legend described on the selection screen.

## Checkpoint index

- `0.1.6`: made hero power inspectable and personal gold cooperative before shops.
- `0.1.5`: turned exact-point enemy queues into readable horde contact.
- `0.1.4`: made Wraith Host raise authoritative hunting spirits.
- `0.1.3`: moved skill upgrades directly onto the action bar.
- `0.1.2`: made siege space and pressure proportional to starting player count.
- `0.1.1`: established the LMB plus Q/E/R/F combat grammar and readable attack phases.
- `0.1.0`: proved the complete defense, breach, counterattack, and Rift payoff slice.
