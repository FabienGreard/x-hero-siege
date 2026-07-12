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

The four PNGs are pipeline look-development references only. They are not the
eight in-game plates and do not constitute `0.1.35` visual acceptance. The final
binary verdict remains with the production asset path described by
`docs/VISUAL_ACCEPTANCE_0.1.35.md` on the director branch.

## Ownership boundary

Asset production owns `art/**`, `public/assets/models/proof/**`,
`docs/reference/blender-proof/**`, and these Blender scripts. The canonical
palette source lives under `art/blender/textures/` and is embedded once in the
runtime GLB. Runtime loading, static serving, caching, animation state mapping,
and replacement of `createEntityVisual` remain with the exclusive checkpoint
implementation owner.
