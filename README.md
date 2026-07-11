# X Hero Siege — playable vertical slice

A browser-first, 1–4 player co-op action RPG about defending humanity's last city from a demon invasion. Four distinct heroes protect the central Heartfire Nexus, survive a breach, then counterattack through the rift.

Version `0.1.32` is deliberately small: one 5–10 minute run that proves a readable dark-fantasy battlefield and decision hierarchy, four distinct champions including a bounded and knowable Wraith Host, trustworthy identity-specific ranged primaries, party-sized lane defense with exact active-gate durability, direct action-bar progression, truthful cooperative gold whose purchasing power and local destinations are readable from combat, two physical shops with five distinct run-only wares, exact-slot selling and atomic full-build reforging, champion-specific current consequences for every primary and learned ability, exact learned fresh-cast returns before Quickening purchases and reforges, a readable and visibly resonant six-slot build whose early duplicate commitment and meaningful threshold stay legible, one earned ware evolution that carries movement into a primary attack and leaves a restrained in-world step, knowable ordinary purchases whose accepted power lands on the hero, bounded same-run reconnect recovery, one pressure spike, and one boss payoff.

![The three-card Ironbound Forge offers Gateward Plate as a distinct Max Health commitment](docs/playtest/gateward-plate-after.jpg)

The Ironbound Forge now offers three different reasons to leave a lane: Tempered Edge for Basic Damage, Fleetstep Greaves for Move Speed, and Gateward Plate for Max Health. Each Plate effective copy grants exactly `+15 Max Health`; its fourth raw copy uses the established Attunement rule and contributes one bonus copy. Buying, selling, or reforging Plate preserves current health percentage, so capacity never disguises a heal or damage event. The copper paired-plate signature stays on the hero without adding armor, regeneration, a proc, an active, ability scaling, or new audio.

Every ware costs `60` personal gold. At either physical shop, `X` opens an exact-slot sell flow: choose any occupied slot, review the stack, Hero Stat, signature, Attunement, and wallet consequences, then confirm for `30` gold. A full six-slot build stays intact during reshaping through one atomic `60 − 30 = 30` gold net reforge. There is no remote market, bulk sale, typed inventory, or ownership change; all six run-only slots remain unrestricted and duplicate-capable.

Wraith Host raises exactly three, four, or five spirits by rank. Each can land up to three successful strikes before fading, and no Gravebinder can keep more than five active; a full newer cast dismisses the oldest spirits first. Maximum base output is therefore `216`, `360`, or `540` rather than an invisible lifetime multiplier, and Hero Stats names the current consequence as an `N×3 HIT CAP`. Every contact renders one compact green mark while the server preserves the established effect RNG and ID cadence. Soul Scythe's remaining safety is deliberately a separate balance decision.

The arena keeps playable stone and silhouettes in dark-fantasy midtones instead of crushing them beneath vignette, noise, and near-black chrome. Decision-bearing Hero Stats, shop, reforge, objective, action, and resource copy holds an `8px` native floor at `1280×720`; exact effects, compact owned counts, learned cast returns, Combat Stride evolution, and all six reforge choices fit in their densest legal layouts. Major casts remain brightest and renderer exposure stays established.

Riftstalker and Ashcaller basics now resolve toward the latest server-accepted aim at release, stop at their declared `22` and `20` world-unit ranges, and sweep the path they actually travel. Repeater Shot penetrates the nearest two bodies; Ember Lance keeps its full direct hit and adds a three-unit half-damage contact burst. Their committed action now ends before the unchanged attack cooldown, creating a real full-speed repositioning gap without granting baseline movement during windup or impact. Thin champion-colored launch, travel, and contact forms replace the old generic ranged-basic aftermath while ability arrows, single-target and Rift Heart damage, cadence, controls, and Combat Stride remain established.

City Watch names every active gate's exact authoritative health percentage inside its existing compact tile, while a calm world-space bar carries the same durability read near the physical wall. Sealed approaches remain `SEALED`, breached walls become `FALLEN`, and raw health plus threat count stay available to assistive technology. The Heartfire Nexus remains the sole dominant top bar and the only structure whose destruction ends the run.

## Run locally

Requires [Bun](https://bun.sh/).

```sh
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Up to four browser clients can join the same local run.

## Controls

- `WASD`: move
- Mouse: aim
- Hold left mouse: primary attack
- `Q`, `E`, `R`: active abilities
- `F`: ultimate
- `C`: toggle the non-pausing Hero Stats panel
- `B`: browse or close a physical shop while in range
- `X`: while a physical shop is open, choose one equipped item to sell for 30 gold
- `1`–`3`: buy and auto-equip the matching visible shop item; at `6/6`, select the incoming ware
- `1`–`6`: while selling or reshaping a full build, select the exact occupied socket
- `Enter`: confirm a reviewed sale or replacement; `Escape` backs out without spending
- Click the gold `+` on a skill slot, or press `Ctrl` + `Q`/`E`/`R`/`F`, to spend a skill point

Level-ups grant skill points only while purchasable ranks remain. Upgrades happen directly on the action bar; the ultimate becomes available at hero level 3, and a fully maxed build stops receiving unusable points.

The northwest Ironbound Forge sells Basic Damage, Move Speed, and Max Health; the northeast Veilglass Reliquary sells Skill Power and Cooldown Speed. Every inexhaustible ware costs 60 personal gold, auto-equips into the first of six unrestricted run-only slots, allows duplicates, and immediately updates the authoritative Hero Stats panel after server acceptance. Either shop buys any equipped ware for 30 gold through the explicit `X` sell mode, while a full build can atomically trade one exact occupied slot toward local stock for the same 30-gold net cost. When the local authoritative wallet can fund current stock, the gold tile says `WARE READY` or `REFORGE READY` at `6/6`, and both affordable physical shop shapes receive equal restrained minimap outlines. This identifies purchasing power and destinations without claiming a safe window, choosing a route, opening a remote catalog, or relaxing proximity-only `B`. Hero Stats now resolves Max Health, Basic Damage, and Attack Rate into the champion's current authoritative build; every Plate trade preserves the displayed health percentage and shows the exact current/max arithmetic before commitment. It also joins aggregate Basic Damage and Attack Rate to each champion's named primary, exact current per-target damage, and cadence; Soul Scythe names its real per-target healing without receiving any scaling from Plate. The same current-build surface resolves Skill Power and Cooldown Speed into every learned champion ability's exact current per-target magnitude and effective cooldown, while unlearned skills remain explicitly unlearned. Those values come from canonical definitions shared with authoritative resolution. Hero Stats also groups duplicates into named stacks, while every ordinary local shop card discloses the current owned count and exact next champion-specific Hero Stat result—even when the ware is unaffordable. Hero Stats spells out `ATTUNEMENT 1/4` or `ATTUNEMENT 2/4`; the corresponding local card compresses the same state to `×1/4` or `×2/4`, while its accessible description retains the complete wording. The live panel remains the current accepted state until the purchase succeeds; then one short item-colored, item-shaped receipt lands on the hero and repeats the exact incoming stat change in the world and toast. Reconnects and snapshot history never manufacture that transient. A fourth matching ware **Attunes** its stack: that fourth copy contributes twice its ordinary listed effect once, while the fifth and sixth resume normal increments. This makes `3/3` breadth and `4/2` specialization meaningfully different without typed slots or a second progression system. Fleetstep Greaves deepen that established commitment with the first earned ware evolution: at four copies, Combat Stride retains `15%` of the champion's current Move Speed during primary windup and impact. The Forge previews the exact current-champion `WORLD/S` rate, and the named `LMB` row keeps it visible; recovery, abilities, damage, cadence, and aim retain their established behavior. While that movement is active, Fleetstep's existing cyan lower chevrons leave one restrained step opposite the hero's actual velocity during moving primary windup and impact, settle home through recovery, and remain quieter on allies. The read adds no new particle, ring, audio, HUD, or gameplay system. Crossing `×3 → ×4` ignites the larger server-authored, ware-colored awakening around the hero and settles into a faint second echo of the same signature; a `×4 → ×3` sale or reforge releases it quietly, while fifth copies, reconnects, and repeated snapshots never replay the ceremony. On the battlefield, every equipped hero wears the color-and-shape signature of the ware with the most socket investment, and a tie below four follows the first occupied socket. The first safe retreat earns one defining ware; completing all six sockets requires sustained defense, and reshaping a full build requires a fresh earning window. At `6/6`, ordinary previews yield to the exact slot-specific reforge flow: select one local ware and one occupied socket. A ware that already fills all six sockets becomes a disabled `FULL STACK` truth instead of opening an impossible all-disabled picker; mouse and number shortcuts announce the no-change result without sending or spending. Five matching copies plus one different ware still retain that one legal path to six, and every cross-ware target remains available. Before a reforge, the confirmation shows the exact outgoing and incoming effects, stack and Attunement changes, affected Hero Stats, resulting battlefield signature, and `BUY 60 − TRADE-IN 30 = 30 GOLD NET`; the build remains `6/6` throughout. North defenders choose left or right at equal travel cost, while East and West naturally favor different vendors; there is no global shop menu or inventory screen.

Quickening Sigil keeps its aggregate Cooldown Speed projection, then translates it into exact current-to-projected fresh-cast cooldowns for every learned `Q`/`E`/`R`/`F` ability. Unlearned abilities stay omitted, and the final full-build reforge confirmation gives the same learned-cast answer whenever Quickening enters or leaves. These are read-only full-recharge projections: live remaining timers, preserved active-cooldown progress, LMB cadence, ability timing, item power, and server authority do not change.

If a connection drops, the live server holds that defender's exact run state for 15 seconds. A page reload or short network interruption restores the same identity, gold, equipment, stats, ranks, cooldowns, and host role while the siege keeps moving; held input is neutralized and the hero remains vulnerable. The token lives only in per-tab session storage and the reservation only in server memory—there are no accounts, permanent inventories, or join-in-progress semantics. Production HTML names a content-fingerprinted client bundle so an immutable cache cannot pair an old client protocol with a new server.

## Verification

```sh
bun run check
bun test
bun run smoke:production
bun run smoke:multiplayer
```

Runtime diagnostics are available at `/health` and `/debug/state`.

## Project notes

- [Approved game direction](docs/GAME_DIRECTION.md)
- [Slice-first roadmap](docs/ROADMAP.md)
- [Playtest script](docs/PLAYTEST.md)
- [Changelog](CHANGELOG.md)
- [Human-readable devlog](docs/DEVLOG.md)
- [Live companion website](https://fabiengreard.github.io/x-hero-siege/) and [source](site/index.html)
