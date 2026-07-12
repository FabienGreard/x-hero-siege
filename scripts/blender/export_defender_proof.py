"""Export, render, and validate the bounded Siegeheart Blender proof package."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(os.environ.get("SIEGEHEART_PROOF_ROOT", Path(__file__).resolve().parents[2])).resolve()
EXPORT_ROOT = ROOT / "public/assets/models/proof"
RENDER_ROOT = ROOT / "docs/reference/blender-proof"
MANIFEST_PATH = ROOT / "art/blender/defender_greatsword_manifest.json"
TEXTURE_PATH = ROOT / "art/blender/textures/siegeheart_palette.png"
PACKAGE_PATH = EXPORT_ROOT / "siegeheart-defender-proof.glb"

ASSETS = {
    "defender": {"collection": "ASSET_Defender", "file": "defender.glb", "triangles": 12_000, "materials": 1},
    "practice_weapon": {"collection": "ASSET_PracticeWeapon", "file": "practice-weapon.glb", "triangles": 2_500, "materials": 1},
    "greatsword": {"collection": "ASSET_Greatsword", "file": "greatsword.glb", "triangles": 2_500, "materials": 1},
    "wall": {"collection": "ASSET_Wall", "file": "citadel-wall.glb", "triangles": 3_000, "materials": 1},
    "brazier": {"collection": "ASSET_Brazier", "triangles": 1_000, "materials": 1},
    "slash": {"collection": "ASSET_Slash", "triangles": 256, "materials": 1},
}
REQUIRED_CLIPS = ["Idle", "Run", "Dodge", "Basic_Windup", "Basic_Active", "Basic_Recovery"]
RUNTIME_ROOT_SCALE = 1.33


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def triangles_for(collection: bpy.types.Collection) -> int:
    total = 0
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in collection.all_objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        total += len(mesh.loop_triangles)
        evaluated.to_mesh_clear()
    return total


def materials_for(collection: bpy.types.Collection) -> set[str]:
    return {
        slot.material.name
        for obj in collection.all_objects if obj.type == "MESH"
        for slot in obj.material_slots if slot.material
    }


def select_collection(target: bpy.types.Collection) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in target.all_objects:
        obj.hide_set(False)
        obj.select_set(True)
    selected = list(target.all_objects)
    if selected:
        bpy.context.view_layer.objects.active = selected[0]


def asset_budget(key: str, spec: dict) -> dict:
    target = bpy.data.collections[spec["collection"]]
    triangle_count = triangles_for(target)
    material_names = materials_for(target)
    if triangle_count > spec["triangles"]:
        raise RuntimeError(f"{key}: {triangle_count} triangles exceeds {spec['triangles']}")
    if len(material_names) > spec["materials"]:
        raise RuntimeError(f"{key}: {len(material_names)} materials exceeds {spec['materials']}")
    return {
        "collection": spec["collection"],
        "triangles": triangle_count,
        "triangle_ceiling": spec["triangles"],
        "materials": sorted(material_names),
        "material_ceiling": spec["materials"],
    }


def export_package() -> dict:
    bpy.ops.object.select_all(action="DESELECT")
    for spec in ASSETS.values():
        target = bpy.data.collections[spec["collection"]]
        for obj in target.all_objects:
            obj.hide_set(False)
            obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["RIG_Defender"]
    bpy.ops.export_scene.gltf(
        filepath=str(PACKAGE_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_extra_animations=True,
        export_skins=True,
        export_all_influences=False,
        export_def_bones=True,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_armature=True,
    )
    return {
        "path": PACKAGE_PATH.relative_to(ROOT).as_posix(),
        "bytes": PACKAGE_PATH.stat().st_size,
        "sha256": sha256(PACKAGE_PATH),
    }


def glb_json(path: Path) -> dict:
    with path.open("rb") as handle:
        if handle.read(4) != b"glTF":
            raise RuntimeError(f"{path}: not a binary glTF")
        version = int.from_bytes(handle.read(4), "little")
        total_length = int.from_bytes(handle.read(4), "little")
        json_length = int.from_bytes(handle.read(4), "little")
        chunk_type = handle.read(4)
        if version != 2 or total_length != path.stat().st_size or chunk_type != b"JSON":
            raise RuntimeError(f"{path}: malformed glTF header")
        return json.loads(handle.read(json_length).decode("utf8").rstrip(" \t\r\n\0"))


def validate_glb(path: Path) -> dict:
    document = glb_json(path)
    scenes = document.get("scenes", [])
    meshes = document.get("meshes", [])
    accessors = document.get("accessors", [])
    if not scenes or not meshes or not accessors:
        raise RuntimeError("runtime package lacks scene, mesh, or accessor data")
    animation_names = sorted(animation.get("name", "") for animation in document.get("animations", []))
    missing = [clip for clip in REQUIRED_CLIPS if clip not in animation_names]
    if missing:
        raise RuntimeError(f"runtime package missing clips {missing}; found {animation_names}")
    if not document.get("skins"):
        raise RuntimeError("runtime package has no skin")
    animation_accessor_indices = set()
    for animation in document.get("animations", []):
        for sampler in animation.get("samplers", []):
            animation_accessor_indices.add(sampler["input"])
            animation_accessor_indices.add(sampler["output"])
    animation_buffer_views = {
        accessors[index]["bufferView"]
        for index in animation_accessor_indices
        if "bufferView" in accessors[index]
    }
    animation_bytes = sum(document["bufferViews"][index]["byteLength"] for index in animation_buffer_views)
    return {
        "generator": document.get("asset", {}).get("generator"),
        "nodes": len(document.get("nodes", [])),
        "meshes": len(meshes),
        "skins": len(document.get("skins", [])),
        "animations": animation_names,
        "animation_bytes": animation_bytes,
        "animation_byte_ceiling": 512 * 1024,
        "images": len(document.get("images", [])),
        "materials": len(document.get("materials", [])),
    }


def duplicate_for_render(source: bpy.types.Object, name: str, target: bpy.types.Collection) -> bpy.types.Object:
    result = source.copy()
    if source.data:
        result.data = source.data.copy()
    result.name = name
    result.animation_data_clear()
    result.parent = None
    result.modifiers.clear()
    target.objects.link(result)
    return result


def duplicate_posed_defender(
    action_name: str,
    frame: int,
    render_collection: bpy.types.Collection,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Bake one authored action frame and retain its rig for bone-parented gear."""
    rig = bpy.data.objects["RIG_Defender"]
    defender = bpy.data.objects["CHR_Defender"]
    action = bpy.data.actions[action_name]
    rig.animation_data.action = action
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = defender.evaluated_get(depsgraph)
    baked_mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
    hero = bpy.data.objects.new("SHOT_Defender", baked_mesh)
    render_collection.objects.link(hero)
    return hero, rig


def add_posed_sword(rig: bpy.types.Object, render_collection: bpy.types.Collection) -> bpy.types.Object:
    sword = duplicate_for_render(bpy.data.objects["WPN_Greatsword_A"], "SHOT_Greatsword", render_collection)
    sword.visible_shadow = False
    sword.parent = rig
    sword.parent_type = "BONE"
    sword.parent_bone = "DEF_grip_secondary"
    sword.matrix_parent_inverse = Matrix.Identity(4)
    sword.location = (0, 0, 0)
    sword.rotation_euler = (0, 0, 0)
    return sword


def setup_render_scene() -> tuple[bpy.types.Collection, bpy.types.Object]:
    render_collection = bpy.data.collections.get("REFERENCE_RENDER") or bpy.data.collections.new("REFERENCE_RENDER")
    if render_collection not in bpy.context.scene.collection.children.values():
        bpy.context.scene.collection.children.link(render_collection)
    for child in list(render_collection.objects):
        bpy.data.objects.remove(child, do_unlink=True)
    for asset_name in ASSETS.values():
        bpy.data.collections[asset_name["collection"]].hide_render = True

    bpy.ops.object.camera_add(location=(27, -29, 34))
    camera = bpy.context.object
    camera.name = "CAM_FixedGameplay"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 18
    camera.rotation_euler = (math.radians(52), 0, math.radians(43))
    bpy.context.scene.camera = camera
    bpy.context.collection.objects.unlink(camera)
    render_collection.objects.link(camera)

    bpy.ops.object.light_add(type="AREA", location=(-8, -10, 16))
    key = bpy.context.object
    key.data.energy = 1500
    key.data.color = (0.58, 0.72, 0.9)
    key.data.shape = "DISK"
    key.data.size = 9
    bpy.context.collection.objects.unlink(key)
    render_collection.objects.link(key)
    bpy.ops.object.light_add(type="AREA", location=(8, 4, 8))
    fill = bpy.context.object
    fill.data.energy = 900
    fill.data.color = (1.0, 0.34, 0.12)
    fill.data.size = 7
    bpy.context.collection.objects.unlink(fill)
    render_collection.objects.link(fill)

    bpy.ops.mesh.primitive_plane_add(size=45, location=(0, 0, -0.02))
    ground = bpy.context.object
    ground.name = "REF_Ground"
    ground_material = bpy.data.materials.new("MAT_REF_Ground")
    ground_material.diffuse_color = (0.025, 0.035, 0.045, 1)
    ground.data.materials.append(ground_material)
    bpy.context.collection.objects.unlink(ground)
    render_collection.objects.link(ground)
    return render_collection, camera


def point_camera(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def fixed_camera(camera: bpy.types.Object, target: tuple[float, float, float], ortho_scale: float) -> None:
    # Blender source Z-up maps the runtime camera (27, 34, 29) to
    # (27, -29, 34). Preserve that exact view vector for every reference.
    camera.location = (target[0] + 27, target[1] - 29, target[2] + 34)
    camera.data.ortho_scale = ortho_scale
    point_camera(camera, target)


def accent_material(source: bpy.types.Material, name: str, color: tuple[float, float, float]) -> bpy.types.Material:
    material = source.copy()
    material.name = name
    texture_node = next(node for node in material.node_tree.nodes if node.type == "TEX_IMAGE")
    source_image = texture_node.image
    image = source_image.copy()
    image.name = name + "_Palette"
    pixels = list(image.pixels)
    for swatch_index, value_scale in ((4, 0.5), (5, 0.78), (6, 1.0)):
        sx = (swatch_index % 4) * 64
        sy = (swatch_index // 4) * 64
        for y in range(sy, sy + 64):
            for x in range(sx, sx + 64):
                offset = (y * image.size[0] + x) * 4
                pixels[offset : offset + 4] = [
                    min(1.0, color[0] * value_scale),
                    min(1.0, color[1] * value_scale),
                    min(1.0, color[2] * value_scale),
                    1.0,
                ]
    image.pixels.foreach_set(pixels)
    texture_node.image = image
    return material


def add_selection_ring(
    render_collection: bpy.types.Collection,
    name: str,
    position: tuple[float, float, float],
    color: tuple[float, float, float],
) -> None:
    bpy.ops.mesh.primitive_torus_add(major_radius=0.78, minor_radius=0.045, major_segments=24, minor_segments=4, location=position)
    ring = bpy.context.object
    ring.name = name
    ring_material = bpy.data.materials.new(name + "_Material")
    ring_material.diffuse_color = (*color, 1.0)
    ring.data.materials.append(ring_material)
    bpy.context.collection.objects.unlink(ring)
    render_collection.objects.link(ring)


def silhouette_material() -> bpy.types.Material:
    material = bpy.data.materials.get("MAT_ProofSilhouette") or bpy.data.materials.new("MAT_ProofSilhouette")
    material.diffuse_color = (0.006, 0.006, 0.006, 1.0)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    if shader:
        shader.inputs["Base Color"].default_value = (0.006, 0.006, 0.006, 1.0)
        shader.inputs["Roughness"].default_value = 1.0
    return material


def render_reference(name: str, arrangement: str, render_collection: bpy.types.Collection, camera: bpy.types.Object) -> dict:
    transient = [obj for obj in list(render_collection.objects) if obj.name.startswith("SHOT_")]
    for obj in transient:
        bpy.data.objects.remove(obj, do_unlink=True)

    defender_source = bpy.data.objects["CHR_Defender"]
    sword_source = bpy.data.objects["WPN_Greatsword_A"]
    practice_source = bpy.data.objects["WPN_Practice_A"]
    action_reference = {
        "basic_windup": ("Basic_Windup", 9),
        "basic_active": ("Basic_Active", 5),
        "basic_recovery": ("Basic_Recovery", 5),
        "dodge_before": ("Idle", 1),
        "dodge_active": ("Dodge", 3),
        "dodge_recovery": ("Dodge", 8),
        "idle_native": ("Idle", 1),
        "run_three_quarter_native": ("Run", 1),
        "run_profile_native": ("Run", 1),
        "windup_ready_native": ("Basic_Windup", 4),
        "dodge_frame_1_native": ("Dodge", 1),
        "dodge_mid_native": ("Dodge", 5),
        "dodge_recovery_native_fixed": ("Dodge", 8),
    }
    silhouette = arrangement.endswith("_silhouette")
    action_key = arrangement.removesuffix("_silhouette").removesuffix("_close")
    if action_key in action_reference:
        action_name, frame = action_reference[action_key]
        hero, rig = duplicate_posed_defender(action_name, frame, render_collection)
        sword = add_posed_sword(rig, render_collection)
        yaw = math.radians(47) if action_key == "run_profile_native" else 0.0
        hero.rotation_euler.z = yaw
        rig.rotation_euler = (0, 0, yaw)
        if action_key.endswith("_native") or action_key == "dodge_recovery_native_fixed":
            hero.scale = (RUNTIME_ROOT_SCALE,) * 3
            rig.scale = (RUNTIME_ROOT_SCALE,) * 3
            add_selection_ring(render_collection, "SHOT_Ring", (0, 0, 0.035), (0.44, 0.73, 0.86))
        if silhouette:
            black = silhouette_material()
            hero.data.materials.clear()
            hero.data.materials.append(black)
            sword.data.materials.clear()
            sword.data.materials.append(black)
        fixed_camera(camera, (0, 0, 2.2), 8.2 if arrangement.endswith("_close") else 42)
    elif arrangement == "neutral":
        hero = duplicate_for_render(defender_source, "SHOT_Defender", render_collection)
        hero.location = (0, 0, 0)
        weapon = duplicate_for_render(practice_source, "SHOT_Practice", render_collection)
        weapon.location = (0.86, -0.12, 2.52)
        weapon.rotation_euler = (0, math.radians(-8), math.radians(68))
        fixed_camera(camera, (0, 0, 2.2), 8.2)
    elif arrangement == "greatsword":
        hero = duplicate_for_render(defender_source, "SHOT_Defender", render_collection)
        sword = duplicate_for_render(sword_source, "SHOT_Greatsword", render_collection)
        sword.visible_shadow = False
        sword.location = (0.86, -0.12, 2.52)
        sword.rotation_euler = (0, math.radians(-8), math.radians(68))
        fixed_camera(camera, (0, 0, 2.2), 8.2)
    elif arrangement == "greatsword_native":
        hero = duplicate_for_render(defender_source, "SHOT_Defender", render_collection)
        sword = duplicate_for_render(sword_source, "SHOT_Greatsword", render_collection)
        sword.visible_shadow = False
        sword.location = (0.86, -0.12, 2.52)
        sword.rotation_euler = (0, math.radians(-8), math.radians(68))
        fixed_camera(camera, (0, 0, 2.2), 42)
    elif arrangement == "four_player":
        positions = [(-5.0, -2.7, 0), (0, -1.5, 0), (5.0, 0.3, 0), (0, 4.0, 0)]
        accents = [(0.15, 0.48, 0.78), (0.76, 0.22, 0.18), (0.30, 0.68, 0.34), (0.62, 0.30, 0.78)]
        source_material = defender_source.data.materials[0]
        for index, (position, accent) in enumerate(zip(positions, accents)):
            hero = duplicate_for_render(defender_source, f"SHOT_Defender_{index}", render_collection)
            hero.location = position
            hero.data.materials[0] = accent_material(source_material, f"MAT_SHOT_Accent_{index}", accent)
            add_selection_ring(render_collection, f"SHOT_Ring_{index}", (position[0], position[1], 0.03), accent)
            sword = duplicate_for_render(sword_source, f"SHOT_Greatsword_{index}", render_collection)
            sword.visible_shadow = False
            sword.location = (position[0] + 0.86, position[1] - 0.12, 2.52)
            sword.rotation_euler = (0, math.radians(-8), math.radians(68))
        fixed_camera(camera, (0, 0.5, 1.5), 20)
    else:
        wall_source = bpy.data.objects["ENV_Citadel_Wall_Straight_A"]
        brazier_source = bpy.data.objects["PRP_Brazier_A"]
        slash_source = bpy.data.objects["VFX_Greatsword_Slash_A"]
        wall = duplicate_for_render(wall_source, "SHOT_Wall", render_collection)
        wall.location = (-4.5, 4.0, 0)
        brazier = duplicate_for_render(brazier_source, "SHOT_Brazier", render_collection)
        brazier.location = (-4.5, 1.0, 0)
        hero = duplicate_for_render(defender_source, "SHOT_Defender", render_collection)
        hero.location = (1.0, 0, 0)
        sword = duplicate_for_render(sword_source, "SHOT_Greatsword", render_collection)
        sword.visible_shadow = False
        sword.location = (1.86, -0.12, 2.52)
        sword.rotation_euler = (0, math.radians(-8), math.radians(68))
        slash = duplicate_for_render(slash_source, "SHOT_Slash", render_collection)
        slash.location = (1.0, 0, 0.05)
        fixed_camera(camera, (0, 1.5, 1.4), 18)

    path = RENDER_ROOT / f"{name}.png"
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    if action_key in action_reference:
        bpy.data.objects["RIG_Defender"].animation_data.action = None
        bpy.data.objects["RIG_Defender"].rotation_euler = (0, 0, 0)
        bpy.data.objects["RIG_Defender"].scale = (1, 1, 1)
        bpy.context.scene.frame_set(1)
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size, "sha256": sha256(path)}


def validate_source() -> dict:
    rig = bpy.data.objects["RIG_Defender"]
    clips = sorted(action.name for action in bpy.data.actions if action.name in REQUIRED_CLIPS)
    if clips != sorted(REQUIRED_CLIPS):
        raise RuntimeError(f"source clips mismatch: {clips}")
    defender = bpy.data.objects["CHR_Defender"]
    max_influences = max(
        (sum(1 for group in vertex.groups if group.weight > 0) for vertex in defender.data.vertices),
        default=0,
    )
    if max_influences > 4:
        raise RuntimeError(f"Defender has {max_influences} bone influences per vertex")
    sword = bpy.data.objects["WPN_Greatsword_A"]
    if abs(float(sword["proportion_scale"]) - 1.3) > 0.001:
        raise RuntimeError("Greatsword proportion is not locked to 1.3x")
    return {
        "units": "1 Blender unit = 1 Siegeheart world unit",
        "source_up": "+Z",
        "gltf_up": "+Y",
        "forward": "+X",
        "character_origin": "ground contact between feet",
        "weapon_origin": "primary grip",
        "greatsword_proportion": 1.3,
        "max_bone_influences": max_influences,
        "draw_calls_defender_plus_weapon": 2,
        "clips": clips,
        "clip_fps": int(rig["clip_fps"]),
    }


def main() -> None:
    EXPORT_ROOT.mkdir(parents=True, exist_ok=True)
    RENDER_ROOT.mkdir(parents=True, exist_ok=True)
    for obsolete in EXPORT_ROOT.glob("*.glb"):
        obsolete.unlink()
    source_contract = validate_source()
    assets = {key: asset_budget(key, spec) for key, spec in ASSETS.items()}
    runtime_package = export_package()
    validation = validate_glb(ROOT / runtime_package["path"])
    render_collection, camera = setup_render_scene()
    renders = {
        "neutral": render_reference("defender-practice-fixed-camera", "neutral", render_collection, camera),
        "greatsword": render_reference("defender-greatsword-fixed-camera", "greatsword", render_collection, camera),
        "greatsword_native": render_reference("defender-greatsword-native-scale", "greatsword_native", render_collection, camera),
        "four_player": render_reference("four-defenders-fixed-camera", "four_player", render_collection, camera),
        "kit": render_reference("proof-kit-fixed-camera", "kit", render_collection, camera),
        "basic_windup_native": render_reference("defender-basic-windup-native-scale", "basic_windup", render_collection, camera),
        "basic_active_native": render_reference("defender-basic-active-native-scale", "basic_active", render_collection, camera),
        "basic_recovery_native": render_reference("defender-basic-recovery-native-scale", "basic_recovery", render_collection, camera),
        "dodge_before_native": render_reference("defender-dodge-before-native-scale", "dodge_before", render_collection, camera),
        "dodge_active_native": render_reference("defender-dodge-active-native-scale", "dodge_active", render_collection, camera),
        "dodge_recovery_native": render_reference("defender-dodge-recovery-native-scale", "dodge_recovery", render_collection, camera),
        "basic_windup_close": render_reference("defender-basic-windup-close", "basic_windup_close", render_collection, camera),
        "basic_active_close": render_reference("defender-basic-active-close", "basic_active_close", render_collection, camera),
        "basic_recovery_close": render_reference("defender-basic-recovery-close", "basic_recovery_close", render_collection, camera),
        "dodge_before_close": render_reference("defender-dodge-before-close", "dodge_before_close", render_collection, camera),
        "dodge_active_close": render_reference("defender-dodge-active-close", "dodge_active_close", render_collection, camera),
        "dodge_recovery_close": render_reference("defender-dodge-recovery-close", "dodge_recovery_close", render_collection, camera),
        "idle_native_fixed": render_reference("defender-idle-native-fixed", "idle_native", render_collection, camera),
        "run_three_quarter_native_fixed": render_reference("defender-run-three-quarter-native-fixed", "run_three_quarter_native", render_collection, camera),
        "run_profile_native_fixed": render_reference("defender-run-profile-native-fixed", "run_profile_native", render_collection, camera),
        "windup_ready_native_fixed": render_reference("defender-windup-ready-native-fixed", "windup_ready_native", render_collection, camera),
        "dodge_frame_1_native_fixed": render_reference("defender-dodge-frame-1-native-fixed", "dodge_frame_1_native", render_collection, camera),
        "dodge_mid_native_fixed": render_reference("defender-dodge-mid-native-fixed", "dodge_mid_native", render_collection, camera),
        "dodge_recovery_native_fixed": render_reference("defender-dodge-recovery-native-fixed", "dodge_recovery_native_fixed", render_collection, camera),
        "idle_silhouette": render_reference("defender-idle-silhouette", "idle_native_silhouette", render_collection, camera),
        "run_three_quarter_silhouette": render_reference("defender-run-three-quarter-silhouette", "run_three_quarter_native_silhouette", render_collection, camera),
        "run_profile_silhouette": render_reference("defender-run-profile-silhouette", "run_profile_native_silhouette", render_collection, camera),
        "windup_ready_silhouette": render_reference("defender-windup-ready-silhouette", "windup_ready_native_silhouette", render_collection, camera),
        "dodge_frame_1_silhouette": render_reference("defender-dodge-frame-1-silhouette", "dodge_frame_1_native_silhouette", render_collection, camera),
        "dodge_mid_silhouette": render_reference("defender-dodge-mid-silhouette", "dodge_mid_native_silhouette", render_collection, camera),
        "dodge_recovery_silhouette": render_reference("defender-dodge-recovery-silhouette", "dodge_recovery_native_fixed_silhouette", render_collection, camera),
    }
    source_path = ROOT / "art/blender/defender_greatsword_proof.blend"
    texture = {
        "path": TEXTURE_PATH.relative_to(ROOT).as_posix(),
        "bytes": TEXTURE_PATH.stat().st_size,
        "sha256": sha256(TEXTURE_PATH),
        "dimensions": [256, 256],
        "decoded_bytes": 256 * 256 * 4,
        "decoded_byte_ceiling": 1024 * 1024,
        "filter": "nearest",
        "treatment": "authored palette with baked AO/value/detail bands",
    }
    manifest = {
        "package": "siegeheart-defender-greatsword-proof",
        "checkpoint": "0.1.35",
        "support_only": True,
        "acceptance_contract": {
            "path": "docs/VISUAL_ACCEPTANCE_0.1.35.md",
            "reviewed_from_origin_master": "6ffd1062fc4f8c88afe6dd3998be72d42fdac7d8",
            "status": "pipeline proof only; not visual acceptance",
        },
        "blender": bpy.app.version_string,
        "source": {
            "path": source_path.relative_to(ROOT).as_posix(),
            "bytes": source_path.stat().st_size,
            "sha256": sha256(source_path),
        },
        "contract": source_contract,
        "geometry_revision": {
            "reason": "production gameplay captures required one broad blade plus native-scale body, grip, action, and dodge separation",
            "authored_length_changed": False,
            "defender": {
                "two_handed_grip": "hands separated sequentially along the hilt; guard and grip clear the torso",
                "lower_body": "wider leg centerlines, narrower tabard, mid-value shins, light feet, restrained brass belt",
                "idle_run": "locked two-hand arm posture with chest counter-rotation and clearer profile stride",
                "triangle_delta_from_3a52aa9": 24,
            },
            "animation_revision": {
                "basic": "rear/outboard two-hand load, unique planted contact extension, quieter settling recovery",
                "dodge": "low directional silhouette from frame 1 through frame 5 with one trailing equipped blade clear of feet and ring",
                "hollow_artifact_diagnosis": "not reproduced in the isolated source proof: the GLB keeps separate WPN_Practice_A and WPN_Greatsword_A roots, and the proof attaches only WPN_Greatsword_A; runtime is assumed to enforce mutually exclusive node visibility",
                "authoritative_timing_changed": False,
                "clip_names_or_ranges_changed": False,
            },
            "greatsword": {
                "overall_x_extent": 4.49,
                "blade_width": [0.82, 0.60],
                "blade_thickness": 0.22,
                "guard_span": 1.32,
                "grip_radius": 0.15,
                "pommel_radius": 0.26,
                "raised_fuller_removed": {
                    "x_extent": [0.98, 3.78],
                    "width": [0.18, 0.12],
                    "thickness": 0.25,
                    "swatch": "iron_mid",
                    "reason": "native runtime read split the blade into twin rails",
                },
            },
            "practice_weapon": {
                "overall_x_extent": 2.43,
                "blade_width": [0.44, 0.22],
                "blade_thickness": 0.16,
                "guard_span": 0.94,
                "grip_radius": 0.13,
                "pommel_radius": 0.16,
                "fuller_width": [0.10, 0.06],
            },
            "preserved": ["node names", "primary grip origin", "+X forward", "rig", "six clips", "one material", "one atlas"],
        },
        "texture": texture,
        "assets": assets,
        "runtime_package": runtime_package,
        "gltf_validation": validation,
        "delivery_budgets": {
            "transferred_runtime_bytes": runtime_package["bytes"],
            "transferred_runtime_byte_ceiling": 3 * 1024 * 1024,
            "animation_bytes": validation["animation_bytes"],
            "animation_byte_ceiling": 512 * 1024,
            "decoded_texture_bytes": texture["decoded_bytes"],
            "decoded_texture_byte_ceiling": 1024 * 1024,
        },
        "renders": renders,
        "plate_support": {
            "plate_1_silhouette": "pipeline lookdev only: practice and Greatsword fixed-camera references",
            "plate_2_action_weight": "source clips and slash mesh supplied; authoritative in-game timing required",
            "plate_3_dense_solo": "requires implementation owner runtime integration",
            "plate_4_four_player": "accent/silhouette lookdev only; legal dense in-game plate required",
            "plate_5_lobby_arsenal": "requires implementation owner runtime integration",
            "plate_6_materials_environment": "wall/brazier/Defender pipeline lookdev only",
            "plate_7_breach": "requires implementation owner runtime integration",
            "plate_8_rift_mastery": "requires implementation owner runtime integration",
            "binary_visual_acceptance": "NOT_EVALUATED",
        },
        "provenance": "art/provenance/defender-greatsword-proof.json",
        "runtime_integration": {
            "owner": "0.1.35 exclusive implementation owner",
            "required_seam": "Named loader/static-asset/animation-state seam requested after director review",
            "forbidden_here": ["protocol edits", "server simulation edits", "renderer replacement", "build or route edits"],
            "benchmark_gate": {
                "status": "blocked pending named runtime seam",
                "required": "300-frame legal dense four-player plate plus cold/warm local production asset readiness",
                "frame_p95_ms": 16.7,
                "frame_p99_ms": 25,
                "candidate_p95_delta_ms": 2,
                "sustained_frame_max_ms": 33,
                "asset_ready_max_ms": 500
            }
        },
    }
    if runtime_package["bytes"] > 3 * 1024 * 1024:
        raise RuntimeError("runtime package exceeds 3 MiB transferred ceiling")
    if validation["animation_bytes"] > 512 * 1024:
        raise RuntimeError("animation data exceeds 512 KiB ceiling")
    if texture["decoded_bytes"] > 1024 * 1024:
        raise RuntimeError("decoded proof textures exceed 1 MiB ceiling")
    semantic_payload = {
        "checkpoint": manifest["checkpoint"],
        "contract": manifest["contract"],
        "assets": manifest["assets"],
        "geometry_revision": manifest["geometry_revision"],
        "gltf_validation": manifest["gltf_validation"],
        "delivery_budgets": manifest["delivery_budgets"],
        "texture_contract": {
            "dimensions": texture["dimensions"],
            "decoded_bytes": texture["decoded_bytes"],
            "filter": texture["filter"],
            "treatment": texture["treatment"],
        },
        "plate_support": manifest["plate_support"],
        "runtime_integration": manifest["runtime_integration"],
    }
    manifest["semantic_manifest_sha256"] = hashlib.sha256(
        json.dumps(semantic_payload, sort_keys=True, separators=(",", ":")).encode("utf8")
    ).hexdigest()
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
    print(json.dumps({"ok": True, "manifest": str(MANIFEST_PATH), "runtime_package": runtime_package}, indent=2))


if __name__ == "__main__":
    main()
