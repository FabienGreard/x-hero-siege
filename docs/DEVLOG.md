# Siegeheart devlog

This is the human-readable record of why each verified checkpoint exists. Mechanical detail and formal verification remain in the changelog, roadmap, and playtest log.

## 2026-07-10 — Gold should carry weight

`0.1.9` made a full build changeable, but normal play exposed a deeper problem: the wallet had become a faucet. An efficient Warden filled all six sockets before the first minute and soon held enough gold to replace the entire build repeatedly. The item decisions were real; their cost was not.

`0.1.10` changes only that purchasing rhythm. Common defense rewards become smaller, every ware costs 30 gold, and the exceptional Gatebreaker payout still buys one item with a little left over. The first safe retreat now earns one defining choice, a complete build arrives near the siege midpoint, and reshaping it requires another honest stretch of combat.

Nothing new competes with that loop. The two shops, four wares, six unrestricted sockets, duplicate freedom, replacement flow, item effects, routes, combat, art, and audio remain intact. Gold now creates anticipation between decisions instead of erasing the decisions through abundance.

## 2026-07-10 — Six choices, not six locks

The six unrestricted sockets gave the Armory a clear shape, but normal play exposed a bad ending to that shape. The Warden filled all six slots in just over a minute, still had 111 gold and a healthy defense, then found both physical shops permanently disabled. A complete build had stopped being a build decision.

`0.1.9` keeps the limit and removes the dead end. At a full loadout, the Forge or Reliquary now offers only its own local wares. The player chooses the incoming item, chooses the occupied socket to give up, sees the exact old and new effects, and confirms the trade. It costs the normal 24 gold, discards the old item without a refund, and leaves all six sockets occupied. There is no backpack, sale value, salvage currency, or new catalog behind it.

The confirmation step matters because combat keeps moving. A second press of `1` must not silently turn “select Tempered Edge” into “destroy socket one.” The client therefore separates browsing, socket choice, and confirmation, while the server checks the item that was actually expected in that socket before it spends anything. Cancelled, stale, repeated, and same-item choices are safe.

The resulting decisions are visible in the same Hero Stats panel the game already trusts. Trading Quickening Sigil for Tempered Edge raised Basic Damage while giving up Cooldown Speed; trading Runebound Focus for Fleetstep Greaves raised Move Speed while giving up Skill Power. The shops have more depth without becoming menus, and a full build can change its answer when the siege changes its question.

## 2026-07-10 — Two roads, not one menu

The First Forge made gold useful, but it did not yet make the Citadel strategic. Every build visited the same northwest counter. Adding more cards to that counter would have created catalog breadth without asking the player to read the city.

`0.1.8` gives the Forge a counterpart. The Veilglass Reliquary is a cold, vertical shrine with a masked curator, glass displays, and an ability-focused inventory. The Forge still asks whether basics or movement matter more; the Reliquary asks whether the next cast should be stronger or arrive sooner. Both use the same six unrestricted sockets and the same personal 24-gold economy.

The important design work was spatial. The first Reliquary stood southeast, diagonally opposite the Forge. On paper that served more co-op lanes. In a normal Warden run, however, the shop trip took long enough for an otherwise healthy North gate to fall. The building moved northeast instead. North now receives an equal-cost left/right build choice, East and West naturally favor different vendors, and South remains honestly underserved rather than gaining a remote menu.

The first northeast replay still left the gate one hit from failure. It passed the shallow test of “not breached,” but failed the real question: would a competent solo defender choose this route? That proof was rejected and replayed against every inbound threat, not only demons already inside the wall.

The accepted normal rendered run shows the intended answer. After pushing the outbound danger band, the Warden reached the Reliquary, bought, and returned in 9.53 seconds; North moved only from 260 to 253 and the Nexus stayed untouched. Across 100 deterministic normal-timing rolls, every route returned with the Nexus intact and the hero standing. The tension now comes from reading pressure and making a window, not gambling the entire gate on a menu trip.

## 2026-07-10 — A reason to retreat

`0.1.6` made gold fair and power readable, but it also made the next absence obvious: the wallet went up and nothing in the city cared. A shop button would have made gold functional, yet it would have ignored Siegeheart's strongest spatial idea—the Citadel is a place worth defending.

`0.1.7` turns the anonymous northwest building into the Ironbound Forge. Its brazier, counter, smith, hammer sign, and small gold sigil are visible before any prompt appears. Reaching it means deliberately leaving the shortest north-gate route, but the detour remains short enough for a solo defender.

Inside range, `B` opens a compact trade panel while the horde keeps moving. The first 24 gold now asks a real question: make every basic attack hit harder with Tempered Edge, or move between pressure and safety faster with Fleetstep Greaves. The purchase fills one of six equal sockets and changes the same authoritative Hero Stat the simulation consumes. Buying another copy fills another unrestricted slot; there is no backpack, slot type, pause, or permanent inventory hiding behind the choice.

This is one Forge, not yet a network of strategic shops. It proves that earning, retreating, choosing, equipping, and returning to battle can work as one continuous action-game loop. The next cycle must play that loop before deciding whether a second location or deeper item behavior creates more value.

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

- `0.1.10`: made each ware and later reshape require a distinct, earned combat window.
- `0.1.9`: kept both local shops useful at six slots through one explicit full-price replacement decision.
- `0.1.8`: turned one shop into a real local route and build choice without adding a global catalog.
- `0.1.7`: made the first physical Forge turn personal gold into visible run-only power.
- `0.1.6`: made hero power inspectable and personal gold cooperative before shops.
- `0.1.5`: turned exact-point enemy queues into readable horde contact.
- `0.1.4`: made Wraith Host raise authoritative hunting spirits.
- `0.1.3`: moved skill upgrades directly onto the action bar.
- `0.1.2`: made siege space and pressure proportional to starting player count.
- `0.1.1`: established the LMB plus Q/E/R/F combat grammar and readable attack phases.
- `0.1.0`: proved the complete defense, breach, counterattack, and Rift payoff slice.
