"""Round-trip and hash validation for the exported proof package."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "art/blender/defender_greatsword_manifest.json"
REPORT_PATH = ROOT / "art/blender/defender_greatsword_validation.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf8"))
for record in [manifest["source"], manifest["texture"], manifest["runtime_package"], *manifest["renders"].values()]:
    path = ROOT / record["path"]
    if not path.is_file() or sha256(path) != record["sha256"]:
        raise RuntimeError(f"hash mismatch: {record['path']}")

package = ROOT / manifest["runtime_package"]["path"]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(package))
required_objects = {
    "CHR_Defender",
    "RIG_Defender",
    "WPN_Practice_A",
    "WPN_Greatsword_A",
    "ENV_Citadel_Wall_Straight_A",
    "PRP_Brazier_A",
    "VFX_Greatsword_Slash_A",
}
missing_objects = sorted(required_objects - set(bpy.data.objects.keys()))
required_clips = {"Idle", "Run", "Dodge", "Basic_Windup", "Basic_Active", "Basic_Recovery"}
missing_clips = sorted(required_clips - set(bpy.data.actions.keys()))
if missing_objects or missing_clips:
    raise RuntimeError(f"roundtrip missing objects={missing_objects} clips={missing_clips}")

budgets = manifest["delivery_budgets"]
checks = {
    "runtime_transfer": budgets["transferred_runtime_bytes"] <= budgets["transferred_runtime_byte_ceiling"],
    "animation_transfer": budgets["animation_bytes"] <= budgets["animation_byte_ceiling"],
    "decoded_texture": budgets["decoded_texture_bytes"] <= budgets["decoded_texture_byte_ceiling"],
    "single_skin": manifest["gltf_validation"]["skins"] == 1,
    "single_material": manifest["gltf_validation"]["materials"] == 1,
    "single_atlas": manifest["gltf_validation"]["images"] == 1,
    "bone_influences": manifest["contract"]["max_bone_influences"] <= 4,
    "defender_weapon_draw_calls": manifest["contract"]["draw_calls_defender_plus_weapon"] <= 2,
}
checks.update({
    f"{name}_triangles": record["triangles"] <= record["triangle_ceiling"]
    for name, record in manifest["assets"].items()
})
if not all(checks.values()):
    raise RuntimeError(f"proof budget validation failed: {checks}")

report = {
    "status": "PASS_ASSET_PIPELINE_PROOF",
    "visual_acceptance": "NOT_EVALUATED_REQUIRES_EIGHT_IN_GAME_PLATES",
    "roundtrip_objects": sorted(required_objects),
    "roundtrip_clips": sorted(required_clips),
    "checks": checks,
    "runtime_export_sha256": manifest["runtime_package"]["sha256"],
    "semantic_manifest_sha256": manifest["semantic_manifest_sha256"],
}
REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")
print(json.dumps(report, indent=2))
