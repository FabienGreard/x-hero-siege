# Siegeheart devlog

This is the human-readable record of why each verified checkpoint exists. Mechanical detail and formal verification remain in the changelog, roadmap, and playtest log.

## 2026-07-11 — Darkness should frame the fight, not swallow it

The review called the whole interface hard to read: too dark, too many effects, too difficult to understand. Playing the shipped `0.1.28` build made the first part precise. Its approved concept held the citadel floor and roads in usable midtones; the real calm frame buried them beneath near-black world values, a heavy vignette, constant noise, and equally dark panel chrome. Opening Hero Stats beside a shop exposed the same compression in type: exact effects, ownership, cast returns, Attunement, and reforge consequences were technically present but had become the smallest marks on the screen.

`0.1.29` restores hierarchy before it adds anything. Sky, fog, moon, ambient light, and fire fill lift the stone and silhouettes; vignette and noise recede. The established exposure stays put, so a Death Tide still owns the brightest moment instead of every ordinary spark being tone-compressed upward. Across the decision surfaces, an eight-pixel native floor and a little redistributed space keep the useful answers readable. Flavor copy yields before effects, prices, exact projections, sockets, or objective state do. The controls legend returns as a quiet strip above the resources rather than disappearing or covering the action bar.

The most demanding shop states prove the rule. Four learned Quickening casts fit; the fourth Greaves says what Combat Stride will become; a full reforge names all six choices and the exact outgoing and incoming consequences. The lobby keeps its established composition, and the battlefield remains dark fantasy rather than turning into daylight. This is a contrast and density correction, not a redesign.

The Gravebinder frame is intentionally honest. A major cast reads better against the lifted world, but sustained Wraith contacts still accumulate too much moving aftermath and the class remains too safe and powerful. Selling, higher prices, and greater item diversity also remain open. The next cycle begins by playing this brighter shipped build and choosing one bounded weakness: contain the Host, or let the Armory buy back a slot while repricing its wares. Neither belongs hidden inside a screen-polish checkpoint.

## 2026-07-11 — A shot should go where it was released

`0.1.27` gave the wall a voice, then the next ranged replay made the player's complaint measurable. Even with perfect current aim and nothing competing for attention except the primary attack, Riftstalker and Ashcaller both lost the Nexus before one minute. Their shots were not merely small. The server kept the aim from the beginning of the windup, ignored the range written into each champion, and checked only the projectile's new point after each update. A cursor correction could be right and still produce the wrong shot; a brief server hitch could put a demon between two collision samples.

`0.1.28` makes release trustworthy. The shot takes the latest accepted aim, ends at the range the champion promises, and checks the path it actually traveled. The committed part of a ranged attack also finishes before its unchanged cooldown, leaving a small but real window to reposition at full speed. That window is not free kiting during the shot: windup and impact still stop an ordinary build, recovery keeps its established partial movement, and Attuned Fleetstep still earns the only movement inside commitment.

The power answer is deliberately different for each champion. Riftstalker's Repeater passes through the first body and strikes the next; Ashcaller's Ember stops on first contact and blooms into a smaller half-strength burst. One remains a fragile line executor, the other an explosive area controller. Across thirty normal solo runs, both now keep the Nexus alive every time, but Riftstalker still goes down far more often and gives up much more gate health. Viability no longer requires pretending the identities are equal.

The visual answer removes more than it adds. Repeater no longer borrows the same arrow used by larger abilities. Both basics become thin directional travel forms with one brief launch streak and one compact contact shard, while the old generic impact ring and seven-piece burst leave these attacks entirely. In the rendered comparison, the shot finally connects champion and target without competing with the horde, the wall, or a major cast.

This does not settle the full review. Gold pickups and additive combat aftermath can still overpower ordinary action reads; Gravebinder still has uncapped sustain and summon scaling to examine; and the Armory still needs selling, higher prices, and careful breadth. What changed is the evidence beneath the economy: every champion can now reach a 60-gold decision inside a legal solo defense, so the next shop checkpoint no longer has to price around a ranged failure.

## 2026-07-11 — A wall should say how long it can hold

The player review arrived as a connected list: the battlefield felt dark and busy, ranged attacks were hard to follow, Gravebinder felt too strong, the gate's health was unclear, and the Armory needed selling, higher prices, and more breadth. The right response was not to pour all seven into one release. Replaying `0.1.26` made the first broken decision plain. The Nexus said `100%` in one strong bar; the North gate said only `OPEN · 17`. A full wall and a wall one hit from collapse asked the same strategic question with almost the same answer.

`0.1.27` lets the wall answer. City Watch now keeps its exact footprint but trades `OPEN` for an authoritative percentage and a two-pixel fill. Near the structure, one quiet bar carries the same truth into the world. At half health it warms; at one quarter it turns critical; once the arch falls, City Watch says `FALLEN`. The Nexus never loses its place at the top. A gate is a buffer that buys time to hold, rotate, or shop; the Heartfire remains the life of the run.

The new read also sharpens the next decisions instead of pretending to solve them. Fresh all-hero diagnostics support the ranged and Gravebinder feedback strongly enough that item prices cannot be tuned from Warden-only pacing: making every ware more expensive now would simply delay the Armory most for the heroes already failing to reach it. Selling, a doubled-price candidate, and one-ware-at-a-time catalog growth remain valuable, but ranged viability and an all-four pacing gate have to make that economy evidence trustworthy first.

Nothing became tougher or safer because the wall gained a voice. Its health, enemy damage, routes, shops, prices, effects, and authority are untouched. The checkpoint removes one missing piece of information from an already noisy screen, using less visual language than a new warning system would have required.

## 2026-07-11 — A percentage is not a return time

The normal `0.1.25` Warden replay earned `31` gold and reached the Veilglass Reliquary at `29.3s` through legal combat, movement, and route timing. In the controlled rendered Ashcaller comparison, Hero Stats named Flame Ring at `6s`, Cinder Wall at `9s`, Falling Star at `12s`, and Worldfire at `38s`. The Quickening card beside it promised only `Cooldown Speed 100% → 115%`. Both surfaces were true, but the purchase still asked the player to perform denominator arithmetic while the siege continued.

`0.1.26` keeps that aggregate stat and adds the answer the champion can actually use. `Fresh Cast Cooldowns` lists only learned abilities and shows each full recharge before and after the proposed Sigil: for this Ashcaller, `Q 6 → 5.2s`, `E 9 → 7.8s`, `R 12 → 10.4s`, and `F 38 → 33s`. The same canonical translation follows Quickening into or out of a full-build reforge, while live Hero Stats remains the accepted current build until the trade succeeds.

Nothing returns sooner because the panel learned to explain it. The preview names a fresh cast's full recharge, never the live time remaining on an active cooldown; the server still preserves that active cooldown's percentage progress when the build changes. No ability, item value, timer rule, cadence, purchase flow, or source of authority changed. One established ware simply tells the truth in seconds before the gold leaves the wallet.

## 2026-07-11 — A carried step should leave a trace

`0.1.24` made Combat Stride mechanically true, but replaying the four-Greaves Warden exposed a gap between that truth and its battlefield read. The Attuned primary carried `15%` of current Move Speed through windup and impact, yet the resulting displacement was small enough to disappear under the hero in a crowded defense. The cyan signature said Fleetstep; it did not quite say that the swing had carried a step.

`0.1.25` lets Fleetstep's existing lower chevrons leave one restrained cyan echo opposite the hero's actual velocity during a moving Attuned primary windup and impact. It settles home through recovery instead of lingering, and an ally's echo stays quieter than the local defender's. Strafing reads as strafing rather than following aim, while a stationary swing, an ability, or a three-Greaves build receives nothing new.

The answer remains inside the visual language the ware already earned. There is no new particle, ring, sound, HUD meter, combat event, or parallel system; the existing signature simply separates far enough for the carried movement to survive battlefield density. Hero silhouette, enemy warnings, impact timing, and the fourth-copy awakening remain the louder truths.

## 2026-07-11 — A dropped connection should not erase a decision

The `0.1.23` replay began where the Armory wanted it to begin: a normal Warden left North for the Forge, returned wearing Greaves, fought for another window, then crossed the Citadel for Focus. One ordinary network drop erased the whole sentence. The server removed the defender immediately; the browser returned as a stranger after the gates had opened, so hero selection could only repeat that the siege had already begun. Gold, equipment, champion stats, and control of the run disappeared together.

`0.1.24` holds that defender's place for fifteen seconds. The live server keeps the same hero and build, clears held movement and attacks, and lets the dangerous world continue. A short opaque token lets the same browser reclaim exactly that place after a transient loss or full reload. The hero gains no shield, autopilot, pause, or permanent record; if the window closes, the reservation leaves with it.

The visible promise is deliberately small: allies see `RECONNECTING`, the returning player sees `DEFENDER RESTORED` and one quiet confirmation that the build came back, and Hero Stats simply contains the same Greaves, Focus, ranks, gold, and exact champion consequences it contained before. Old purchase receipts, Attunement awakenings, damage bursts, and wave banners do not pretend to happen again. A page reload also resumes above the server's last input number, so the first real movement is accepted instead of silently waiting for a reset counter to catch up.

The protocol change exposed an older delivery weakness during rendered verification: the production client lived forever behind one immutable filename. The corrected build gives immutable caching to the bytes, not the path, and places their hash in the HTML. That is not a second feature; it is what makes the reconnect handshake safe to ship as the client and server evolve together.

## 2026-07-11 — Speed should survive the swing

The Armory had learned to explain commitment, but replaying `0.1.22` made one ware feel shallower than the others. Four Fleetstep Greaves gave the Warden `15.8` Move Speed and a clear Attuned silhouette. Iron Cleave still read exactly as it did without them, and holding the primary discarded all of that movement during its windup. Edge changed the named strike, Focus changed named casts, and Quickening changed their return. Greaves still ended at a faster number between actions.

`0.1.23` lets the fourth Greaves carry a little of that speed into the attack. Combat Stride retains `15%` of the champion's current authoritative Move Speed during primary windup and impact. That is `2.4 WORLD/S` for the four-Greaves Warden and `2.8` for the faster Riftstalker—not enough to turn commitment into full-speed kiting, but enough for positioning to survive the swing. Recovery keeps its established `45%`, idle remains full speed, and abilities gain no input movement from the effect.

This is the first ware-specific evolution, not the first row in a checklist. It uses the fourth-copy threshold, cyan language, six unrestricted sockets, and physical hero motion that Fleetstep already owns. The shop names the exact rate before purchase, Hero Stats joins it to the champion's `LMB`, and the accepted build moves at that rate from its first Attuned attack tick. A regression gate caught an early implementation that altered every non-Attuned opening step; the shipped version scopes the ordering change to Combat Stride and leaves the established routes and attacks intact.

## 2026-07-11 — A trade must have somewhere to go

`0.1.21` made investment readable from the first copy, then a completed specialization exposed a small but absolute lie. A Warden wearing six Tempered Edges could click the matching Forge card because it still promised `REPLACE ITEM`. The next step displayed all six sockets as disabled. Nothing could be sacrificed for another Edge because every possible outcome was the same build, yet the shop had invited the player into the flow anyway.

`0.1.22` makes the offer answer the same question as the actual trade. The canonical equipment projection now supplies every socket that would produce a changed build. When that list is empty, the matching card settles into a disabled `FULL STACK` state and tells mouse, keyboard, and assistive technology to choose the other local ware. No request leaves the client and no gold can be placed at risk.

This does not turn unrestricted sockets into a typed inventory. Five Edges and one Greaves still allow the Greaves socket to become the sixth Edge, while every cross-ware reforge retains its exact targets and confirmation. The rule is narrower: if the shop offers a trade, the trade must have somewhere real to go.

## 2026-07-11 — Commitment should read before it pays off

`0.1.20` completed the champion-stat sentence. In the next normal Warden run, one Edge and one Focus resolved into exact primary and cast consequences while the siege continued. The build still hid a quieter strategic sentence: each stack said only `×1` and its current percentage, then waited until three matching copies to announce that the next one Attuned. The payoff was legible; the road toward it was not.

`0.1.21` lets commitment begin with the first copy. Hero Stats and the matching local shop card now say `ATTUNEMENT 1/4`, then `ATTUNEMENT 2/4`, before the established `NEXT ATTUNES` and `ATTUNED` states take over. A mixed build reads as breadth immediately, while repeated investment starts to read as an intentional route rather than four unrelated purchases.

Nothing new happens at those early counts. One shared armory helper names the same four-copy rule both surfaces already obey, and accessibility explains why the fourth matters. No item gained power, no threshold moved, and no build path became mandatory; the existing choice simply stays visible from its beginning to its payoff.

## 2026-07-11 — A basic stat should name the strike it changes

`0.1.19` made the arcane half of a build concrete. In the next normal Warden run, one Focus reconciled `Skill Power 115%` into a rank-three Rupturing Arc at `124.2` damage every `8s`, and the compact panel stayed readable while the wave continued. The same panel still said only `Basic Damage 30` and `Attack Rate 1.92`; the action bar separately said `Iron Cleave`. Tempered Edge could change the arithmetic, but the current build never joined that arithmetic to the champion's named primary.

`0.1.20` completes that sentence without inventing DPS. `ACTION IMPACT` now begins with one full-width `LMB` row: Iron Cleave, Repeater Shot, Ember Lance, or Soul Scythe; exact damage to one target; and the authoritative attack cadence. Soul Scythe also names its genuine `2.5` heal per target. It does not claim range, pack damage, projectile travel, or sustained output that depends on positioning and enemies.

The row reads the same server-derived Hero Stats that already govern basic attacks. Gravebinder's fixed healing now comes from the same shared primary-impact definition used by the panel. A real Edge purchase moves the Warden from `30 → 36 DMG/TARGET` while `1.92/S` remains still, and the named row receives the same restrained accepted-purchase pulse as the aggregate stat. No primary behavior, item value, or balance number changed; another established ware simply reaches the hero-specific consequence it already owned.

## 2026-07-10 — Arcane power should name the cast it changes

`0.1.18` made a purchase land, but an Ashcaller wearing both Reliquary wares exposed the next abstraction. Hero Stats said `Skill Power 115%` and `Cooldown Speed 115%`; equipment repeated the same percentages. Flame Ring and Falling Star were visibly learned on the action bar, yet no surface joined those truths into the damage and recovery the current build could actually deliver.

`0.1.19` adds that join inside Hero Stats. The existing panel now names every learned champion ability, its rank, exact current per-target magnitude, and effective cooldown. In the played Ashcaller build, one Focus and one Sigil resolve into Flame Ring at `77.6` damage every `5.2s` and Falling Star at `181.1` damage every `10.4s`. A second accepted Focus updates those exact outputs to `87.8` and `204.8` without pretending Quickening changed.

The values are not client-authored descriptions. All sixteen server cast paths now read their magnitude bases from the same shared definitions used by the panel, including Warden barrier, Gravebinder healing and Wraith strikes, and per-projectile Riftstalker values. Unlearned abilities stay `UNLEARNED`; the panel is a truthful current build, not a skill planner. The result deepens the four existing wares and champions without adding a fifth item, another stat, or a parallel screen.

## 2026-07-10 — A purchase should land on the hero

`0.1.17` completed the route into the Armory: the wallet announced readiness, both physical destinations remained equally legible, each card named the exact next stat, and Hero Stats reconciled the accepted build. Normal play through one Focus and one Edge then exposed a smaller but important break in the sentence. Gold left, a combat-log line appeared, and the hero returned to battle; the ordinary decision itself barely arrived in the world. Only the fourth-copy Attunement felt like an earned equipment moment.

`0.1.18` gives ordinary acceptance one restrained receipt. The incoming ware's existing shape and color flash around the actual hero, a short matching particle lift lands, and the exact canonical result—such as `SKILL 100% → 115%`—rises once above the character and appears in the existing toast. A full-build reforge uses the same incoming-stat answer after its established exact confirmation.

The approved concept's midpoint lets power acquisition live around the hero through a bright central halo and readable reward text. Siegeheart borrows that hierarchy without copying its spectacle. The ordinary receipt is shorter, smaller, quieter, and non-persistent; it adds no ground ring, beam, new sound, or ally interface. Attunement still owns the larger bloom, stinger, count language, and settled echo. Replayed snapshot history acknowledges the trade but cannot pretend the old choice just happened.

## 2026-07-10 — Gold should say when it becomes a route choice

`0.1.16` made the decision inside each shop exact. Normal play then exposed the missing link outside those walls. The Warden could hold 87 gold—enough for two more wares—while the combat HUD showed only `87` and two tiny static symbols near the Nexus. Nothing said that the wallet had crossed from scorekeeping into a new choice between the warm Forge and cool Reliquary.

`0.1.17` gives the existing surfaces one restrained answer. The gold tile changes to `WARE READY`, or `REFORGE READY` when all six sockets are occupied, and wakes once before settling. Both existing shop shapes receive a thin funded outline on the minimap. Neither is favored: martial west and arcane east remain the player's strategic decision, and the horde still decides whether this is actually a safe moment to leave.

The cue reads the local authoritative hero, current stock, and real prices. It disappears while downed, outside the active siege, or after spending below affordability; it stays when enough gold remains. There is no remote panel, item recommendation, arrow, new sound, or new economy rule. Gold simply admits when it can do something, then points back to the two places where the player must still go.

## 2026-07-10 — The next copy should answer one exact question

Attunement made a fourth copy meaningful, but ordinary shopping still asked the player to translate a generic percentage into champion-specific power. A Warden carrying three Tempered Edges could read `+20% Basic Damage` and `NEXT ATTUNES`; only after spending did the live panel reveal that the real step was `48 → 60`. Curiously, the later full-build reforge already gave a better answer than the first six purchases.

`0.1.16` puts that answer directly on each local card. Edge says what happens to Basic Damage, Greaves to Move Speed, Focus to Skill Power, and Sigil to Cooldown Speed. The fourth copy names the larger Attunement jump before it happens. The answer remains visible when gold is short, so a route and earning window can be planned around real power rather than a hidden calculation.

The shop still buys in one click. Hero Stats remains the accepted present, not a speculative future, and only changes when the server's snapshot confirms the ware. A narrow pending lock makes that promise honest under a rapid double-click: one displayed result can fund only one request. Once all six sockets are occupied, the ordinary answer disappears because the sacrificed socket matters, and the established exact reforge confirmation takes over unchanged. No new item or rule was needed; the existing choice simply became knowable at the moment it is made.

## 2026-07-10 — The fourth copy should arrive in the world

`0.1.14` gave the Armory its first real commitment threshold. The shop announced it, the stats reconciled it, and the fourth copy changed the outcome of a fight. Yet closing the panels left almost the same hero behind. A few signature pixels grew slightly larger and brighter; the moment itself passed with the same gold spark and chirp as an ordinary first copy.

`0.1.15` lets the server name the crossing and the battlefield answer once. The ware's existing shape blooms from the hero in its established color, a short synth contour lands for the buyer, and a faint second copy of the same signature settles behind the first. Reforging back below four contracts that echo rather than celebrating it. Allies get a quieter world read, not another toast or sound in their own interface.

The approved concept uses beams, halos, and expanded effects to make growth live around the hero. Siegeheart borrows that principle without copying the spectacle: no giant lightning field, ground ring, banner, or new visual vocabulary. A fifth copy does not fire the moment again, and a reconnect does not pretend an old decision just happened. The fourth copy now feels earned because the existing world acknowledges it.

That separation also protects the decision itself. If a live ceremony packet is missed, the next authoritative snapshot still finishes the accepted reforge in the shop and clears its pending state; it simply refuses to manufacture a late celebration.

## 2026-07-10 — The fourth copy should feel like commitment

`0.1.13` made every reforge knowable, but it also made the remaining sameness easy to see. Six unrestricted sockets allowed any distribution, yet copies one through six were identical increments. A `3/3` build and a `4/2` build changed arithmetic without creating a moment where the player had clearly committed to one answer.

`0.1.14` gives that moment to the fourth matching ware. The first three copies stay exactly as learned. The fourth contributes its ordinary effect twice once, then the fifth and sixth return to ordinary increments. In six slots, only one stack can reach that threshold, so the player can choose breadth or specialize without typed sockets, set recipes, or a second progression screen.

The shops teach the rule before gold leaves the wallet, Hero Stats reconciles raw copies with effective power, and a reforge names both gaining and losing Attunement. The battlefield keeps the same four signature shapes and colors; an Attuned signature simply carries a little more presence. One existing decision now has a peak instead of a catalog growing sideways.

## 2026-07-10 — Know what thirty gold buys

`0.1.12` made a committed build visible on the hero, but its most consequential shop decision was still partly blind. The reforge confirmation could say that Focus left and Edge entered; it did not say that this Warden would move from two Focuses to one, two Edges to three, Basic Damage `42 → 48`, Skill Power `130% → 115%`, and a violet signature to a warm one. Spending a fresh combat window's gold still required arithmetic and knowledge of a hidden tie-break.

`0.1.13` puts that exact answer inside the final confirmation. It shows the two affected stacks, every changed Hero Stat, and the signature that will appear in battle if the server accepts the trade. The current Hero Stats panel deliberately does not change early: it remains the champion's authoritative state, while the compact shop block is clearly the proposed outcome.

No item became stronger and no new rule appeared. One shared equipment projection now powers both the server's purchase path and the client's read-only question, and parity tests prove that question receives the same answer for all 12 ordered item pairings across every champion at levels 1 and 4. Thirty gold now buys the same decision, but the player can understand it before making it.

## 2026-07-10 — Power should live on the hero

`0.1.11` made a six-slot build understandable, but only while reading a panel. Closing Hero Stats returned the same battlefield silhouette whether the Warden carried no equipment or had committed the entire run to one kind of power. The numbers had identity; the hero did not wear it.

`0.1.12` gives every equipped hero one restrained build signature. Edge investment appears as warm blade ticks, Greaves as low cyan chevrons, Focus as violet diamonds, and Quickening as a pale broken sigil. The ware with the most occupied sockets leads; if two are tied, the first equipped one preserves the build's history and wins the silhouette.

This is deliberately not a set bonus, proc, rarity, or new source of power. The signature reads the same authoritative six slots the game already owns, changes when a real replacement changes their leader, and stays behind the hero and combat telegraphs. A committed build is now visible in motion without opening another surface.

## 2026-07-10 — A build should read like a decision

`0.1.10` gave each purchase time and weight, but a completed build still collapsed into six tiny socket symbols. The symbols showed that a slot was occupied; they did not tell the player whether the hero had committed to two Edges, two Focuses, or how much those duplicates contributed in total.

`0.1.11` teaches the existing Hero Stats panel to explain that answer. Equipped wares are grouped into named stacks with copy counts and total bonuses, while each local shop card shows how many copies the hero already owns. A replacement decision can now be read against the build before a socket is sacrificed.

No power or rule changed. The shops, four effects, 30-gold pacing, six unrestricted sockets, duplicate freedom, and authoritative stats are exactly the same; the decisions they already create are simply legible while the siege continues.

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

- `0.1.17`: made funded personal gold and both physical Armory routes readable from combat.
- `0.1.16`: made every ordinary local purchase reveal its exact next champion-stat result before spending.
- `0.1.15`: made the authoritative Attunement crossing arrive once and resonate on the battlefield.
- `0.1.14`: made the fourth matching ware a visible commitment between broad and specialist builds.
- `0.1.13`: made every irreversible reforge's exact champion result knowable before spending.
- `0.1.12`: made authoritative socket investment visible on every equipped battlefield hero.
- `0.1.11`: made six-slot build identity and duplicate totals readable at a glance.
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
