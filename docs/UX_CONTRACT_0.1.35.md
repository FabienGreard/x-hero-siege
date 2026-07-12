# UI/UX contract — 0.1.35 Forge the First Defender

**Status:** implementation-ready acceptance contract

**Checkpoint authority:** [Decision 0002](decisions/0002-first-defender-greatsword-checkpoint.md)

**Scope owner:** Interface and UX acceptance

**Implementation owner:** Weapons and progression workstream

This contract defines what the `0.1.35` interface must communicate and how it must behave. It does not create a parallel gameplay model. Server snapshots and revision-guarded commands remain authoritative for arming, mastery allocation, loadout assignment, cooldowns, respecialization, purchases, reconnect, and run reset.

## Player-visible outcome

A player names and readies one neutral Defender, enters a short shared arming phase with a practice weapon and `100` gold, buys the only real weapon currently offered—the `100`-gold Greatsword—and sees that authoritative purchase replace the practice basic on the action belt. During the siege, level-ups expose compact mastery choices without pausing the run. `M` opens the complete Greatsword network. Learned standard skills may occupy `Q`, `E`, and `R`; one purchased branch mastery may occupy `F`; Space always represents the universal dodge. Stats, physical item shops, reconnect, and the run summary all describe the same accepted build.

Bow, Staff, Greathammer, and Daggers do not appear as cards, disabled controls, silhouettes, tabs, tooltips, or future promises in this checkpoint.

## Global interface state

The root game shell must expose one state token derived directly from the accepted snapshot:

```html
<main id="game-shell" data-game-phase="lobby|arming|defense|breach|push|victory|defeat">
```

During arming, expose a second state token rather than inventing another client-owned phase:

```html
<main data-game-phase="arming" data-arming-state="purchasing|waiting|countdown">
```

Only one administrative surface may be open at a time: Arsenal, level-up detail, mastery network, Stats, Forge, or Reliquary. The compact level-up notification may coexist with the combat HUD, but opening its detail or the mastery network closes Stats and any shop. Opening a physical shop closes the mastery network and Stats. Closing a surface returns to the battlefield; it does not reopen a previously hidden surface.

The server continues while every surface is open. Entering an interface input mode must send neutral movement and attack input immediately and must never claim that the run is paused.

## Semantic DOM contract

The implementation may extract render modules, but the following semantic surfaces, states, and accessible relationships are required. IDs may be adapted only if the implementation owner provides an equivalent stable test seam.

### One-Defender lobby

```html
<section id="defender-lobby" aria-labelledby="lobby-title">
  <h1 id="lobby-title">SIEGEHEART</h1>
  <p id="lobby-promise">One Citadel. One Defender. Your weapon writes the legend.</p>
  <label for="player-name">Your name</label>
  <input id="player-name" maxlength="18">
  <ol id="party-readiness" aria-label="Defender readiness"></ol>
  <p id="lobby-status" role="status" aria-live="polite" aria-atomic="true"></p>
  <button id="ready-button" aria-describedby="lobby-status"></button>
</section>
```

Required states:

| Snapshot state | Visible primary action | Status copy |
| --- | --- | --- |
| local player not ready | `READY` | `Enter the Citadel with a practice weapon` |
| local player ready, non-host | `CANCEL READY` | `Waiting for the host` |
| local host ready and all connected players ready | `START ARMING` | `The party is ready` |
| disconnected party reservation | unchanged local action | `{name} reconnecting` on that party row |

There is no hero grid, reservation control, selected class, availability count, or “no duplicate heroes” copy. Each party row exposes player name, readiness, connected/reconnecting state, and player accent through text plus a non-color state marker.

### Arming and physical Arsenal

The normal four-anchor HUD remains present during arming. The objective rail reads `ARM THE DEFENDERS`; the objective copy names the number armed and the countdown when one exists.

```html
<aside id="arsenal-panel"
  aria-labelledby="arsenal-title"
  aria-describedby="arsenal-status"
  aria-busy="false">
  <h2 id="arsenal-title">CITADEL ARSENAL</h2>
  <p id="arsenal-status" role="status" aria-live="polite"></p>
  <section id="current-weapon" aria-label="Current weapon"></section>
  <button id="greatsword-offer" aria-describedby="greatsword-effect greatsword-price"></button>
  <section id="arsenal-loadout" aria-label="Greatsword loadout"></section>
  <button id="greatsword-respec"></button>
</aside>
```

The panel opens only when the Arsenal is the nearest in-range physical vendor and the player uses its contextual prompt or `B`. `B` never opens the Arsenal remotely. If vendor interaction radii overlap, choose the nearest vendor by authoritative position, then stable vendor ID as the tie-breaker. The panel is non-modal because the world continues, but while it owns focus the client sends neutral combat input.

Required states:

| State | Offer | Status/action |
| --- | --- | --- |
| practice weapon, 100 gold | `GREATSWORD · 100 GOLD` | enabled `BUY & EQUIP` |
| purchase pending | same offer | `aria-busy=true`, all transaction controls disabled, `EQUIPPING…` |
| purchase accepted | current weapon becomes Greatsword | `GREATSWORD EQUIPPED`; no repeat-purchase action |
| another player unarmed | local Greatsword remains equipped | objective says `WAITING FOR 1 DEFENDER` and identifies the player in party readiness |
| every connected ready player armed | no new input required | authoritative shared countdown, announced once at 3 seconds and once at start |
| later Arsenal visit | current Greatsword plus learned/equipped skills | loadout and respec controls available |
| first respec available | reset control | `FREE RESET · 1 REMAINING` |
| paid respec | reset control | `RESET · 60 GOLD`, exact resulting unspent point count |

The practice weapon is explicitly `PRACTICE WEAPON · 0 TRADE-IN`. No sell control is rendered for it. There is exactly one weapon offer; do not create a one-card carousel or empty future slots.

### Combat action belt

The existing bottom-center silhouette remains the ownership seam. Its ordered controls are:

```text
Health | LMB basic | Q standard | E standard | R standard | F mastery | Space dodge | Gold/Kills
```

```html
<footer id="action-belt" aria-label="Defender actions">
  <div id="health-readout" role="status"></div>
  <div id="basic-action" role="group" aria-label="..."></div>
  <button data-combat-slot="q"></button>
  <button data-combat-slot="e"></button>
  <button data-combat-slot="r"></button>
  <button data-combat-slot="f"></button>
  <div id="dodge-action" role="group" aria-label="..."></div>
</footer>
```

`LMB` and Space are readouts, not clickable substitutes for combat input. `Q`, `E`, `R`, and `F` may be buttons for pointer activation, but their accessible names must describe the accepted slot state:

- Equipped and ready: `Q, Wide Cleave, ready.`
- Equipped and cooling down: `Q, Wide Cleave, 3.2 seconds remaining.`
- Empty standard slot: `Q, empty standard skill slot. Learn or assign a Greatsword skill.`
- Empty mastery slot: `F, no mastery equipped. Purchase a branch mastery in the Greatsword network.`
- Dodge ready: `Space, dodge ready, 1 of 1 charge.`
- Dodge recharging: `Space, dodge recharging, 2.4 seconds remaining.`

Visual state must not rely on color. Every slot uses text or shape for `EMPTY`, `READY`, cooldown seconds, `UNEQUIPPED`, and `LOCKED`. `F` has a distinct frame silhouette, not only a gold hue. Space shows a charge pip and recharge sweep but must remain quieter than `F` mastery.

The old per-slot rank `+` controls and direct `level_ability` affordance must not survive. One mastery-point badge sits above the belt and opens the compact level-up interaction; it never overlaps cooldown numerals or the player health readout.

### Compact level-up tray

Level-up creates a non-modal notification and does not steal focus:

```html
<section id="level-up-tray" aria-labelledby="level-up-title">
  <h2 id="level-up-title">MASTERY POINT AVAILABLE</h2>
  <p id="mastery-point-count" role="status" aria-live="polite"></p>
  <div id="level-up-choices" role="list"></div>
  <button id="open-mastery-network">OPEN NETWORK <kbd>M</kbd></button>
  <button id="defer-mastery">DEFER</button>
</section>
```

The tray shows at most four nodes derived as currently legal from the canonical catalog and latest accepted mastery state, prioritizing nodes newly made legal by the latest point followed by stable catalog order. This is a client preview; the allocation command and authoritative rejection remain final. If more are legal, the tray says `+N MORE IN NETWORK`; it never implies the four are the only choices. Each choice names node kind, branch, effect, cost, and prerequisite state. `DEFER` hides the expanded tray but keeps the point badge persistent.

Allocating a passive or mutation closes the tray after the accepted revision arrives. Allocating a standard active continues to assignment:

- If an eligible standard slot is empty, offer `ASSIGN Q`, `ASSIGN E`, `ASSIGN R`, and `LEAVE UNEQUIPPED`.
- If all three are occupied, show the incoming skill beside the accepted `Q/E/R` occupants and require explicit replacement or `LEAVE UNEQUIPPED`.
- Existing skills never shift automatically.
- An allocation and a slot assignment are separate authoritative operations. A failed assignment does not roll back an already accepted node purchase.

### Complete Greatsword network (`M`)

```html
<section id="mastery-network"
  aria-labelledby="mastery-title"
  aria-describedby="mastery-summary"
  aria-busy="false">
  <header>
    <h2 id="mastery-title">GREATSWORD MASTERY</h2>
    <p id="mastery-summary"></p>
    <button id="mastery-close" aria-label="Close Greatsword mastery network">M CLOSE</button>
  </header>
  <div id="mastery-graph" role="group" aria-label="Greatsword mastery network"></div>
  <aside id="mastery-node-detail" aria-live="polite"></aside>
  <section id="mastery-loadout" aria-label="Equipped Greatsword skills"></section>
</section>
```

The visual graph is a connected network, not a parent/child hierarchy. Do not use `role="tree"` or tree-item semantics. The labeled group shows all approximately thirty nodes and every edge immediately. Nodes are real buttons with roving tabindex: exactly one node has `tabindex="0"`, all others have `tabindex="-1"`, and arrow keys move focus to the nearest spatial neighbor. DOM order remains stable catalog order grouped by branch. Every node has:

- stable node ID in `data-mastery-node`;
- branch and node-kind text;
- `aria-current="true"` when selected for detail;
- `aria-disabled="true"` plus a readable reason when unavailable;
- visible `LEARNED`, `LEGAL`, `LOCKED`, `EQUIPPED`, or `EXCLUDED` token;
- prerequisite and exclusion copy in its accessible description.

An unavailable node remains focusable through `aria-disabled="true"` so keyboard users can read its reason, but activation must be suppressed. Edges are presentation only and never the sole explanation of prerequisites. No operation depends on dragging. Selecting a learned active offers assignment only when the authoritative snapshot says loadout mutation is legal at the Arsenal or inside the active level-up interaction. Inspection and detail remain available everywhere.

Branch masteries state `4 BRANCH · 7 TOTAL REQUIRED` until legal. After one mastery is purchased, the other two state `EXCLUDED BY {mastery name}`. The accepted mastery is not automatically assigned to `F` unless the player explicitly confirms assignment.

### Stats

Stats remains a single non-modal panel opened by `C`:

```html
<aside id="defender-stats" aria-labelledby="stats-title">
  <h2 id="stats-title">DEFENDER STATS</h2>
  <p id="stats-build-summary"></p>
  <div id="stats-groups"></div>
  <section id="stats-loadout" aria-label="Greatsword loadout"></section>
  <section id="stats-equipment" aria-label="Six run-only item slots"></section>
</aside>
```

Use semantic description lists for final accepted values. For this checkpoint render only populated or baseline-relevant rows, grouped as `OFFENSE`, `SKILLS`, `STATUS`, `DEFENSE`, and `UTILITY`. Do not reproduce the full thirty-node network or all learned-but-unequipped skill descriptions. The summary names `PRACTICE WEAPON` or `GREATSWORD`, equipped `Q/E/R/F`, unspent points, and six-slot count.

### Forge and Reliquary

The existing physical, proximity-only `B` flow remains. Both shops must use the declarative accepted item effects rather than old hero-specific or Attunement language.

Required shop order:

1. vendor identity and `B CLOSE`;
2. current gold and six exact slots;
3. selected stock item and compatibility tags;
4. only changed final stats and changed special rules;
5. price or exact trade-in arithmetic;
6. confirm/cancel controls for consequence-heavy transactions.

No card may mention universal Attunement, fourth-copy awakening, or a hero-specific projection. At `6/6`, exact-slot replacement remains mandatory. Pending requests set `aria-busy=true`, disable all shop mutations, preserve the accepted inventory until the next snapshot, and announce success or rejection through the existing screen-reader-only live region.

### Reconnect

Connection state remains a polite status at the lower left. On loss:

- held movement and attack become neutral;
- every transactional surface sets `aria-busy=true` and disables mutation controls;
- local pending previews remain visibly `AWAITING REALM`, but are not presented as accepted;
- no additional local allocation, assignment, purchase, sale, or reset is queued.

On a successful resume, the next accepted snapshot replaces every preview with the server state: weapon, gold, mastery revision, learned nodes, equipped `Q/E/R/F`, cooldowns keyed by skill ID, dodge charge/recharge, items, stats, and phase. Administrative surfaces close, focus returns to the game canvas, and a single `Defender restored` announcement fires. Purchase, mastery, item, and awakening transients do not replay from snapshot history.

On revision mismatch, update from the returned/latest snapshot, keep the network open if the connection stayed healthy, focus the originally requested node, and announce `Mastery changed on the server. Review the updated network.`

### Run summary

```html
<section id="run-summary" aria-labelledby="run-summary-title" aria-live="assertive">
  <h2 id="run-summary-title"></h2>
  <p id="run-outcome"></p>
  <dl id="run-statistics"></dl>
  <section id="run-build" aria-label="Final run build"></section>
  <button id="play-again"></button>
</section>
```

The build section shows final weapon, equipped `Q/E/R/F`, mastery branch if purchased, mastery points spent, and six item slots. It explicitly labels the build `THIS RUN`. It shows no experience bar, unlock reward, inventory carryover, permanent currency, or language that implies persistence. Only the host can reset; non-hosts receive `WAITING FOR HOST` and remain in the same party.

## Keyboard and focus contract

| Input | Closed combat UI | Relevant interface open |
| --- | --- | --- |
| `WASD`, mouse, `LMB` | movement, aim, primary | neutralized while an administrative surface owns focus |
| `Q/E/R/F` | cast accepted equipped skill | do not cast while typing or while the surface owns focus |
| `Space` | dodge | activates focused button only when focus is on a button; otherwise dodge |
| `B` | open only the nearest in-range physical Arsenal/Forge/Reliquary; never open a remote vendor | close current physical shop |
| `C` | open Stats | close Stats |
| `M` | open network and focus selected/root node | close network and restore canvas focus |
| `Escape` | no gameplay action | cancel current confirmation first; otherwise close current surface |
| `Tab` / `Shift+Tab` | enter visible contextual UI when present | cycle only the current surface, then its close control |
| arrows | no gameplay action | move among mastery nodes by nearest spatial neighbor; update detail without purchase |
| `Enter` | no gameplay action | activate focused control; never bypass a required confirmation |

Opening `M` focuses the last selected mastery node, or the root node on first open. Opening `B` or `C` focuses the surface heading or last meaningful control. Closing restores focus to the game canvas. A level-up notification never steals focus. Pointer and keyboard paths must result in the same confirmations and server messages.

Focus is never placed on an unavailable node or disabled transaction after a snapshot update. If the focused element becomes unavailable, move focus to its node detail/summary, not an unrelated purchase.

## Native 1280×720 composition limits

These limits apply before responsive scaling:

| Surface | Maximum footprint | Required clear area |
| --- | --- | --- |
| persistent four-anchor HUD | existing Decision 0001 composition | center battlefield remains free of opaque panels |
| level-up tray | `680×116`, centered above action belt, bottom at least `96px` | hero health, cooldown numerals, tactical seal, and objective rail remain visible |
| mastery network | left-aligned, maximum `880×548`, top `72px`, bottom at least `100px` | at least `384px` of battlefield remains visible on the right; tactical seal and action belt remain unobscured |
| Stats | maximum `360×500`, left `16px`, bottom at least `96px` | objective rail, tactical seal, and action belt remain visible |
| Arsenal/Forge/Reliquary | maximum `460×510`, right `18px`, bottom at least `96px` | objective rail, party stack, player health, and action belt remain visible |
| run summary | maximum `560×440`, centered | background may dim but must retain the final battlefield silhouette |

No surface may introduce a second modal, nested drawer, hover card outside its bounds, or body-level scrollbar. The mastery graph may pan inside one controlled viewport, but node detail and loadout remain fixed. The graph must open at a scale where all nodes and edges are visible; zoom is optional enhancement, not required to understand the network.

Decision-bearing copy is at least `10px` at native size. Tertiary key labels may retain the established `8px` floor. Normal text meets `4.5:1` contrast, focus/state outlines meet `3:1`, and every state has a non-color cue. Reduced-motion mode removes pulses, moving glows, graph travel, and countdown scale animation while retaining the state change through text and static contrast.

## Semantic state requirements and wire boundary

Names below describe the state the UI must be able to consume, not a requirement to serialize every field in every snapshot. Only run-specific accepted state must cross the authoritative snapshot boundary. Static graph topology, graph coordinates, prerequisite/exclusion rules, display descriptions, skill copy, and offer metadata may come from one canonical shared catalog imported by client and server. The client may derive legal, unavailable, and excluded presentation from that catalog plus the latest accepted run state, while authoritative command validation and rejection remain final.

The implementation owner may rename or normalize these fields while preserving one-to-one meaning and stable tests. The minimum run-specific accepted state is:

```ts
type WeaponId = "practice" | "greatsword";
type StandardSlot = "q" | "e" | "r";
type MasterySlot = "f";
type SkillId = string;       // stable catalog ID, never a display label
type MasteryNodeId = string; // stable catalog ID, never an array index
type MasteryBranchId = "cleaving" | "guarding" | "execution";

interface ArmingSnapshot {
  armedPlayerIds: string[];
  countdownEndsAt: number | null; // server time, null while purchasing/waiting
}

interface DodgeSnapshot {
  charges: number;
  maxCharges: number;
  rechargeRemaining: number;
  rechargeDuration: number;
  invulnerable: boolean;
}

interface MasteryAcceptedState {
  weaponId: "greatsword";
  revision: number;
  pointBudget: number;
  learnedNodeIds: MasteryNodeId[];
  equipped: {
    q: SkillId | null;
    e: SkillId | null;
    r: SkillId | null;
    f: SkillId | null;
  };
  loadoutMutationContext: "none" | "arsenal" | "level_up";
  freeRespecUsed: boolean;
}

interface PlayerSnapshot {
  identity: "defender";
  accentId: string;
  weaponId: WeaponId;
  mastery: MasteryAcceptedState | null; // null for practice weapon
  cooldownsBySkillId: Partial<Record<SkillId, number>>;
  dodge: DodgeSnapshot;
  equipment: EquipmentSlots; // exactly six run-only slots
  // existing identity, position, health, level, XP, gold, stats, kills,
  // readiness, connection, action, and last accepted input fields remain.
}

interface LobbySnapshot {
  hostId: string | null;
  maxPlayers: 4;
  canStart: boolean;
  // No claimedHeroes or availableHeroes projection.
}

interface GameSnapshot {
  phase: "lobby" | "arming" | "defense" | "breach" | "push" | "victory" | "defeat";
  arming: ArmingSnapshot | null;
  // Existing objective, party, world, event, and timing fields remain.
  // The run's physical vendor projection includes citadel_arsenal with its
  // accepted position and interaction radius for nearest-in-range selection.
}

interface ActionSnapshot {
  kind: "basic" | "skill" | "dodge" | "enemy_attack";
  skillId?: SkillId; // required when kind is skill
  // Existing phase, duration, remaining, and direction fields remain.
}
```

The canonical Greatsword catalog shared with the client and server exposes, for each node: stable ID, branch, kind (`active`, `passive`, `mutation`, or `mastery`), skill ID where applicable, name, short effect, full accessible description, cost, prerequisite IDs, exclusion IDs, branch-spend requirement, total-spend requirement, graph coordinates, and stable semantic order. Skill definitions expose stable ID, name, tags, cooldown, action-bar short name, and accessible effect text. The same canonical vendor catalog identifies the Greatsword offer as `100` gold, the practice weapon trade-in as `0`, and the paid respec as `60` gold; those constants do not need repeated snapshot serialization.

From the catalog plus accepted state, the client derives a view model containing spent/unspent points, legal node IDs, unavailable reasons, mastery exclusions, armed/waiting player lists, and current respec price. This derived model is never proof that an operation succeeded. A server rejection or newer revision always replaces it.

Required client operations:

```ts
{ type: "buy_weapon"; arsenalId: "citadel_arsenal"; weaponId: "greatsword" }
{ type: "allocate_mastery"; weaponId: "greatsword"; nodeId: MasteryNodeId; expectedRevision: number }
{ type: "assign_skill"; weaponId: "greatsword"; slot: "q" | "e" | "r" | "f"; skillId: SkillId | null; expectedRevision: number }
{ type: "respec_mastery"; arsenalId: "citadel_arsenal"; weaponId: "greatsword"; expectedRevision: number }
```

The UI may preview these operations but does not mutate accepted values until the server snapshot/event advances the revision. Rejections need stable codes for at least revision mismatch, prerequisite unmet, no points, mastery exclusion, invalid skill/slot, loadout mutation unavailable, out of range, insufficient gold, and run inactive. Human-readable server copy accompanies the code, but focus recovery keys off the stable code.

## Rendered acceptance matrix

Every row requires a native `1280×720` capture plus DOM/accessibility assertions.

| Evidence | Required accepted state |
| --- | --- |
| one-player lobby | neutral Defender, no hero cards, ready/host state readable |
| four-player lobby | four names, accents, readiness, and reconnect marker without uniqueness language |
| practice weapon | `100` gold, practice LMB, empty `Q/E/R/F`, ready Space dodge |
| Arsenal purchase | only Greatsword offered; exact `100` cost; pending and accepted states captured |
| arming wait/countdown | armed count converges for four players; countdown is server-time based |
| empty Greatsword belt | Greatsword LMB plus empty `Q/E/R/F` and Space |
| compact level-up | point badge, no focus theft, up to four choices and accurate `+N MORE` |
| full network | all nodes/edges visible, legal/locked reasons, right battlefield strip preserved |
| fourth standard skill | explicit replace-or-leave-unassigned choice; no automatic shift |
| branch mastery | exclusion of other masteries, deliberate `F` assignment, cast before finale |
| respec | free first reset, paid `60` reset, Arsenal proximity, revision convergence |
| Forge and Reliquary | six exact slots, declarative deltas, no Attunement language |
| Stats | Greatsword build summary, five stat groups, `Q/E/R/F`, points, and `0/6` then `6/6` |
| reconnect | accepted weapon, graph revision, loadout, skill cooldowns, dodge, items, and phase restored |
| dense combat/breach/Rift | four anchors readable with no administrative surface open; action belt states remain legible |
| victory and defeat | final run build marked `THIS RUN`; host/non-host reset behavior |
| keyboard-only | lobby through purchase, allocation, assignment, respec, shop, Stats, and reset without pointer |
| reduced motion | equivalent static state cues and announcements; no essential information in animation |

## Integration boundaries and conflicts to avoid

The interface workstream may own this contract, acceptance fixtures, screenshots, and narrowly isolated semantic/CSS support only after the implementation owner names the seam. The implementation owner owns all changes to `src/client/main.ts`, `src/shared/protocol.ts`, `src/shared/game-data.ts`, `src/server/game.ts`, catalogs, tests, and checkpoint integration.

The hottest conflict is `src/client/main.ts`, which currently owns lobby rendering, connection state, Stats, shops, action-bar updates, keyboard input, and run summary in one module. Do not create a competing client entry point or compatibility adapter. If extraction is desired, the implementation owner should create the new module boundary and then request a bounded UI contribution.

The second conflict is the global cascade in `src/client/style.css`. New selectors should use checkpoint-specific namespaces such as `.defender-lobby-*`, `.arsenal-*`, `.level-up-*`, `.mastery-*`, and `.run-summary-*`; do not overload legacy `.hero-card`, `.ability-upgrade`, or hero-color semantics. Final icon/frame art and Three.js model integration remain outside this contract.

## Acceptance stop conditions

UI acceptance fails if any of the following is true:

- a future weapon is visible;
- a legacy public hero identity or duplicate restriction remains in playable UI;
- the client presents an unaccepted purchase, allocation, loadout, reset, or item mutation as final;
- a slot reassignment clears a skill-ID cooldown;
- a level-up or network pauses the server, steals focus without player input, requires dragging, or automatically rearranges skills;
- Stats, a shop, and the mastery network can stack;
- prerequisite, exclusion, affordability, pending, cooldown, or ownership state depends on color alone;
- reconnect replays transient rewards or loses the accepted build;
- the 1280×720 mastery network covers the tactical seal, action belt, or entire battlefield;
- the run summary implies permanent progression.
