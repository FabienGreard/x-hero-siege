# 0.1.35 test migration inventory

This checkpoint removes the four-hero/fixed-kit/Attunement product contracts without narrowing Bun or TypeScript test discovery. Preserved siege, multiplayer, reconnect, economy, item, shop, and delivery technology remains covered through the Defender path.

## Retired suites and named replacements

| Previous suite | Retired contract | Replacement coverage |
| --- | --- | --- |
| `ability-impact.test.ts` | Fixed hero ability ranks and four fixed kits | `greatsword-mechanics.test.ts`, `defender-authority.test.ts`, `shop-preview.test.ts` skill-ID projections |
| `primary-impact.test.ts`, `ranged-primary.test.ts` | Four hero-specific primary attacks and ranged identities | Greatsword basic timing in `server-game.test.ts`; Greatsword contribution in `defender-authority.test.ts`; solo controller/viability |
| `cinder-wall.test.ts`, `splitbolt.test.ts`, `wraith-host.test.ts` | Ashcaller, Riftstalker, and Gravebinder kit mechanics | All twelve Greatsword skills, timed contacts, control, passives, and mutations in `greatsword-mechanics.test.ts` |
| `attunement.test.ts` | Universal four-copy Attunement | Raw linear six-slot modifiers in `defender-items.test.ts`; negative public-surface check; preserved exact transactions in replacement/selling suites |
| `combat-stride*.test.ts` | Attunement-only Combat Stride | Greatsword movement retention and timed movement in `greatsword-mechanics.test.ts`; fixed-dt movement/item assertions in `armory.test.ts` |

## Preserved behavioral systems

- Siege world: `server-game.test.ts` retains stable gate spread, 1–4 player per-lane pressure equality, enemy-cap fairness, wave HP scaling, disconnect lane allocation, mandatory Gatebreaker reservation, run-time freeze, telegraphs, and defense to breach to push invariants.
- Multiplayer: `multiplayer-smoke.ts` covers four duplicate Defenders, arming convergence, input sequence continuity, personal wallets/items, exact-slot replacement, mastery/loadout/cooldown/dodge convergence, reconnect exactness, and full phase convergence.
- Reconnect: `reconnect.test.ts` covers token secrecy, invalid/tokenless rejection, expiry, abandoned-room reset, exact accepted Defender state, stale-controller fencing, and non-replayed transient state.
- Shops/items/economy: armory, Reliquary, Gateward, projection, replacement, selling, readiness, preview, pacing, route, and solo suites remain enabled and migrated to Greatsword/Defender fixtures.
- Event delivery: `event-delivery.test.ts` retains the local/ally and direct/replay purchase/sale matrix without the retired Attunement transition.
- Player authority: `defender-authority.test.ts` covers arming, physical Arsenal purchase, graph legality, saved revisioned allocation, explicit Q/E/R/F assignment, respec, cooldown identity, dodge, and test-only telemetry.
- Timed item consequences: `greatsword-mechanics.test.ts` proves scheduled strikes retain their accepted Skill Power after a Runebound Focus sale while the next cast uses the current build.
- Client contracts: `arming-ui.test.ts`, `vendor-routing.test.ts`, `administrative-surfaces.test.ts`, and `pending-revision.test.ts` cover arming vocabulary, physical B routing, exclusive overlays, and immediate rollback after an unsent revision mutation.

The Blender proof and runtime loader are intentionally outside this authority/test milestone.
