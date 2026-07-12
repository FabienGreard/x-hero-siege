# Siegeheart Blender proof package

This directory owns the bounded source package for the `0.1.35` Defender and
Greatsword checkpoint. It is support work for that checkpoint, not a separate
release and not a production-volume asset library.

## Locked conventions

- Blender `5.1.2` is the reference authoring and export version.
- One Blender unit equals one Siegeheart world unit.
- Source scenes are Z-up. glTF export performs the standard conversion to
  Three.js Y-up.
- Gameplay-facing assets point toward local `+X`, matching the existing local
  strike/projectile direction.
- Character origins sit at ground contact between the feet. Weapon origins sit
  at the primary grip. Environment modules use a lower-left grid corner.
- Runtime transforms must arrive with unit scale.
- Player color belongs to cloth and the selection ring. Weapon identity belongs
  to geometry and restrained effects.
- Ordinary mastery nodes do not alter the Defender silhouette.
- The Greatsword is authored at `1.3x` realistic proportion. The approved
  look-development range is `1.25x` to `1.4x`, calibrated only from the fixed
  gameplay camera.
- Materials use a pixel-stable authored palette texture, baked value/AO bands,
  nearest filtering, and restrained roughness.

## Hard proof ceilings

| Asset | Triangle ceiling | Material ceiling |
| --- | ---: | ---: |
| Defender | 12,000 | 1 |
| Practice weapon | 2,500 | 1 |
| Greatsword | 2,500 | 1 |
| Wall module | 3,000 | 1 |
| Brazier | 1,000 | 1 |
| Slash mesh | 256 | 1 |

The Defender uses at most four bone influences per vertex. Defender plus weapon
must remain at or below two draw calls. The proof uses one 256x256 RGBA palette
atlas, stays below 1 MiB of decoded texture memory, 3 MiB transferred runtime
assets, and 512 KiB of animation data.

## Runtime-distance weapon revision

The production `0.1.35` practice and Arsenal captures showed that both original
cross-sections collapsed at gameplay distance. Authored X extents remain
unchanged; only silhouette-bearing dimensions changed:

- Greatsword blade width grows from `0.46 -> 0.31` to `0.82 -> 0.60` world
  units, thickness from `0.14` to `0.22`, guard span from `0.92` to `1.32`,
  grip radius from `0.10` to `0.15`, and pommel radius from `0.19` to `0.26`.
  The later raised dark fuller at X `0.98–3.78` was removed after the legal
  native runtime frame made its two bright sides read as twin rails. The broad
  main blade now remains one uninterrupted surface at gameplay distance.
- Practice blade becomes a `0.44 -> 0.22` taper at `0.16` thickness, with a
  `0.94` guard, `0.13` grip radius, `0.16` pommel, and narrow dark fuller. Its
  `2.43`-unit overall extent remains plainly inferior to the Greatsword's
  unchanged `4.49`-unit overall extent.

Node names, primary-grip origin, local `+X`, material, atlas, rig, sockets, and
all animation clips remain unchanged.

## Native-scale Defender and action revision

The next legal runtime proof kept the broad blade but exposed a merged dark
body column, an ambiguous two-hand hold, an idle-like basic windup, and an
upright Dodge during the authoritative invulnerability window. The bounded
source correction therefore:

- spaces the two hands sequentially along the hilt and clears the guard from
  the torso without changing weapon dimensions or sockets;
- widens the leg centerlines, narrows and lifts the tabard value, raises shin
  value, preserves light feet, and adds one restrained brass belt break;
- keeps both hands on the weapon during Idle and Run while the chest and legs
  carry locomotion;
- gives Basic a rear/outboard load, one unique planted contact extension, and
  a quieter settling recovery; and
- holds a compressed, directional Dodge from frames `1–5` (the first
  approximately `0.18 s` at 24 fps), with the blade trailing clear of the feet,
  before rising in recovery.

The export writes both native-scale and close action references for source
look-development. Authoritative timing and final binary acceptance still come
from the in-game plates.

The later hollow second-sword report does not reproduce in the isolated source
proof. The GLB intentionally retains separate `WPN_Practice_A` and
`WPN_Greatsword_A` roots; runtime is assumed to reparent both and make their
visibility mutually exclusive. The fixed-camera source proofs attach only the
equipped Greatsword and show the runtime `1.33` shared scale plus selection ring
for Idle, two Run views, early Windup, Dodge frame 1, Dodge frame 5, and Dodge
recovery, with matching solid silhouettes. Capture-state or runtime visibility
diagnosis remains outside this asset-only package.

## Reproduction

From the repository root:

```sh
BLENDER=/Applications/Blender.app/Contents/MacOS/Blender
"$BLENDER" --background --factory-startup \
  --python scripts/blender/build_defender_proof.py
"$BLENDER" --background art/blender/defender_greatsword_proof.blend \
  --python scripts/blender/export_defender_proof.py
```

The first command reproducibly rebuilds the semantic Blender scene and palette.
The second exports the stable glTF package, renders fixed-camera references,
validates the contract, and writes the manifest with SHA-256 hashes. Blender
container bytes and Eevee PNG samples may vary between headless runs as recorded
in the reproducibility report.

To prove deterministic runtime export semantics, run:

```sh
python3 scripts/blender/check_defender_reproducibility.py
```

The checker runs both cycles in isolated temporary output roots, prints detailed
per-run samples to stdout, and updates only the stable tracked summary. Running
it against a clean checkout leaves the checkout clean.

The fixed-camera PNG suite is pipeline look-development reference only. It is
not the eight in-game plates and does not constitute `0.1.35` visual acceptance.
The final binary verdict remains with the production asset path described by
`docs/VISUAL_ACCEPTANCE_0.1.35.md` on the director branch.

## Ownership boundary

Asset production owns `art/**`, `public/assets/models/proof/**`,
`docs/reference/blender-proof/**`, and these Blender scripts. The canonical
palette source lives under `art/blender/textures/` and is embedded once in the
runtime GLB. Runtime loading, static serving, caching, animation state mapping,
and replacement of `createEntityVisual` remain with the exclusive checkpoint
implementation owner.
