"""Build the bounded Siegeheart Defender/Greatsword Blender source package."""

from __future__ import annotations

import math
import os
from pathlib import Path

import bpy


ROOT = Path(os.environ.get("SIEGEHEART_PROOF_ROOT", Path(__file__).resolve().parents[2])).resolve()
BLEND_PATH = ROOT / "art/blender/defender_greatsword_proof.blend"
TEXTURE_PATH = ROOT / "art/blender/textures/siegeheart_palette.png"

PALETTE = {
    "iron_shadow": (0.055, 0.065, 0.075, 1.0),
    "iron_mid": (0.16, 0.18, 0.20, 1.0),
    "iron_light": (0.36, 0.39, 0.41, 1.0),
    "steel_edge": (0.62, 0.67, 0.69, 1.0),
    "cloth_shadow": (0.025, 0.065, 0.10, 1.0),
    "cloth_mid": (0.055, 0.16, 0.24, 1.0),
    "cloth_light": (0.12, 0.31, 0.43, 1.0),
    "leather": (0.19, 0.105, 0.055, 1.0),
    "brass": (0.45, 0.29, 0.10, 1.0),
    "stone_shadow": (0.07, 0.085, 0.09, 1.0),
    "stone_mid": (0.16, 0.18, 0.18, 1.0),
    "stone_light": (0.27, 0.29, 0.28, 1.0),
    "ember": (1.0, 0.20, 0.035, 1.0),
    "ember_hot": (1.0, 0.58, 0.12, 1.0),
    # Restrained bone-white motion read with an aged-gold bias. The runtime
    # owns authoritative effect timing; this swatch keeps the source mesh in
    # the approved Citadel palette instead of cool UI-blue.
    "slash": (0.82, 0.76, 0.60, 1.0),
    "bone": (0.64, 0.57, 0.45, 1.0),
}

SWATCH_KEYS = tuple(PALETTE)


def reset() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def collection(name: str) -> bpy.types.Collection:
    result = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(result)
    return result


def activate_collection(target: bpy.types.Collection) -> None:
    bpy.context.view_layer.active_layer_collection = next(
        child for child in bpy.context.view_layer.layer_collection.children if child.collection == target
    )


def create_palette() -> bpy.types.Image:
    TEXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    size = 256
    image = bpy.data.images.new("TEX_SiegeheartPalette", width=size, height=size, alpha=True)
    pixels = [0.0] * (size * size * 4)
    for index, key in enumerate(SWATCH_KEYS):
        sx = (index % 4) * 64
        sy = (index // 4) * 64
        color = PALETTE[key]
        for y in range(sy, sy + 64):
            for x in range(sx, sx + 64):
                shade = 0.82 if y < sy + 4 else 1.08 if y >= sy + 60 else 1.0
                detail = 0.92 if (x + y + index) % 11 == 0 else 1.0
                offset = (y * size + x) * 4
                pixels[offset : offset + 4] = [
                    min(1.0, color[0] * shade * detail),
                    min(1.0, color[1] * shade * detail),
                    min(1.0, color[2] * shade * detail),
                    color[3],
                ]
    image.pixels.foreach_set(pixels)
    image.filepath_raw = str(TEXTURE_PATH)
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


def create_material(image: bpy.types.Image) -> bpy.types.Material:
    material = bpy.data.materials.new("MAT_SiegeheartPalette")
    material.use_nodes = True
    material.diffuse_color = PALETTE["iron_mid"]
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Closest"
    shader.inputs["Roughness"].default_value = 0.72
    shader.inputs["Metallic"].default_value = 0.08
    links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    links.new(output.inputs["Surface"], shader.outputs["BSDF"])
    return material


def swatch_uv(key: str) -> tuple[float, float]:
    index = SWATCH_KEYS.index(key)
    return ((index % 4) * 0.25 + 0.125, (index // 4) * 0.25 + 0.125)


def mesh_from_parts(
    name: str,
    parts: list[dict],
    material: bpy.types.Material,
    target_collection: bpy.types.Collection,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    face_swatches: list[str] = []
    vertex_bones: list[str | None] = []

    def add_box(center, size, swatch, bone=None, bevel=0.0):
        cx, cy, cz = center
        sx, sy, sz = (value * 0.5 for value in size)
        start = len(vertices)
        vertices.extend([
            (cx - sx, cy - sy, cz - sz), (cx + sx, cy - sy, cz - sz),
            (cx + sx, cy + sy, cz - sz), (cx - sx, cy + sy, cz - sz),
            (cx - sx, cy - sy, cz + sz), (cx + sx, cy - sy, cz + sz),
            (cx + sx, cy + sy, cz + sz), (cx - sx, cy + sy, cz + sz),
        ])
        vertex_bones.extend([bone] * 8)
        local_faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        faces.extend(tuple(start + i for i in face) for face in local_faces)
        face_swatches.extend([swatch + ("_shadow" if False else "")] * len(local_faces))

    def add_prism(center, radius, depth, sides, swatch, bone=None, axis="z"):
        start = len(vertices)
        cx, cy, cz = center
        for side in (-1, 1):
            for index in range(sides):
                angle = math.tau * index / sides
                point = [cx + math.cos(angle) * radius, cy + math.sin(angle) * radius, cz + side * depth * 0.5]
                if axis == "x":
                    point = [cx + side * depth * 0.5, cy + math.cos(angle) * radius, cz + math.sin(angle) * radius]
                elif axis == "y":
                    point = [cx + math.cos(angle) * radius, cy + side * depth * 0.5, cz + math.sin(angle) * radius]
                vertices.append(tuple(point))
                vertex_bones.append(bone)
        faces.append(tuple(start + i for i in range(sides - 1, -1, -1)))
        faces.append(tuple(start + sides + i for i in range(sides)))
        face_swatches.extend([swatch, swatch])
        for index in range(sides):
            faces.append((start + index, start + (index + 1) % sides, start + sides + (index + 1) % sides, start + sides + index))
            face_swatches.append(swatch)

    def add_frustum(center, bottom_size, top_size, height, swatch, bone=None):
        cx, cy, cz = center
        bx, by = (value * 0.5 for value in bottom_size)
        tx, ty = (value * 0.5 for value in top_size)
        hz = height * 0.5
        start = len(vertices)
        vertices.extend([
            (cx - bx, cy - by, cz - hz), (cx + bx, cy - by, cz - hz),
            (cx + bx, cy + by, cz - hz), (cx - bx, cy + by, cz - hz),
            (cx - tx, cy - ty, cz + hz), (cx + tx, cy - ty, cz + hz),
            (cx + tx, cy + ty, cz + hz), (cx - tx, cy + ty, cz + hz),
        ])
        vertex_bones.extend([bone] * 8)
        local_faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        faces.extend(tuple(start + i for i in face) for face in local_faces)
        face_swatches.extend([swatch] * len(local_faces))

    def add_segment(start_point, end_point, start_radius, end_radius, sides, swatch, bone=None):
        sx, sy, sz = start_point
        ex, ey, ez = end_point
        dx, dy, dz = ex - sx, ey - sy, ez - sz
        length = math.sqrt(dx * dx + dy * dy + dz * dz)
        direction = (dx / length, dy / length, dz / length)
        reference = (0.0, 0.0, 1.0) if abs(direction[2]) < 0.9 else (0.0, 1.0, 0.0)
        ux = direction[1] * reference[2] - direction[2] * reference[1]
        uy = direction[2] * reference[0] - direction[0] * reference[2]
        uz = direction[0] * reference[1] - direction[1] * reference[0]
        u_length = math.sqrt(ux * ux + uy * uy + uz * uz)
        u = (ux / u_length, uy / u_length, uz / u_length)
        v = (
            direction[1] * u[2] - direction[2] * u[1],
            direction[2] * u[0] - direction[0] * u[2],
            direction[0] * u[1] - direction[1] * u[0],
        )
        base = len(vertices)
        for point, radius in ((start_point, start_radius), (end_point, end_radius)):
            for index in range(sides):
                angle = math.tau * index / sides
                offset = tuple((u[axis] * math.cos(angle) + v[axis] * math.sin(angle)) * radius for axis in range(3))
                vertices.append(tuple(point[axis] + offset[axis] for axis in range(3)))
                vertex_bones.append(bone)
        faces.append(tuple(base + i for i in range(sides - 1, -1, -1)))
        faces.append(tuple(base + sides + i for i in range(sides)))
        face_swatches.extend([swatch, swatch])
        for index in range(sides):
            faces.append((base + index, base + (index + 1) % sides, base + sides + (index + 1) % sides, base + sides + index))
            face_swatches.append(swatch)

    def add_blade(start_x, end_x, width_start, width_end, thickness, swatch, bone=None):
        start = len(vertices)
        ws = width_start * 0.5
        we = width_end * 0.5
        ht = thickness * 0.5
        vertices.extend([
            (start_x, -ws, -ht), (start_x, ws, -ht), (start_x, ws, ht), (start_x, -ws, ht),
            (end_x, -we, -ht), (end_x, we, -ht), (end_x, we, ht), (end_x, -we, ht),
        ])
        vertex_bones.extend([bone] * 8)
        local_faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        faces.extend(tuple(start + i for i in face) for face in local_faces)
        face_swatches.extend([swatch] * len(local_faces))

    for part in parts:
        if part["kind"] == "box":
            add_box(part["center"], part["size"], part["swatch"], part.get("bone"))
        elif part["kind"] == "prism":
            add_prism(part["center"], part["radius"], part["depth"], part["sides"], part["swatch"], part.get("bone"), part.get("axis", "z"))
        elif part["kind"] == "frustum":
            add_frustum(part["center"], part["bottom_size"], part["top_size"], part["height"], part["swatch"], part.get("bone"))
        elif part["kind"] == "segment":
            add_segment(part["start"], part["end"], part["start_radius"], part["end_radius"], part["sides"], part["swatch"], part.get("bone"))
        else:
            add_blade(part["start_x"], part["end_x"], part["width_start"], part["width_end"], part["thickness"], part["swatch"], part.get("bone"))

    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon, swatch in zip(mesh.polygons, face_swatches):
        uv = swatch_uv(swatch)
        for loop_index in polygon.loop_indices:
            uv_layer.data[loop_index].uv = uv
        polygon.use_smooth = False
    obj = bpy.data.objects.new(name, mesh)
    target_collection.objects.link(obj)
    obj["siegeheart_forward"] = "+X"
    obj["siegeheart_units"] = "1 BU = 1 world unit"
    obj["vertex_bones"] = [bone or "" for bone in vertex_bones]
    return obj


def create_rig(target: bpy.types.Collection) -> bpy.types.Object:
    armature = bpy.data.armatures.new("RIG_Defender")
    rig = bpy.data.objects.new("RIG_Defender", armature)
    target.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    bones = {
        "DEF_root": ((0, 0, 0), (0, 0, 0.35), None),
        "DEF_pelvis": ((0, 0, 1.7), (0, 0, 2.25), "DEF_root"),
        "DEF_spine": ((0, 0, 2.1), (0, 0, 3.1), "DEF_pelvis"),
        "DEF_chest": ((0, 0, 2.9), (0, 0, 3.65), "DEF_spine"),
        "DEF_neck": ((0, 0, 3.55), (0, 0, 4.0), "DEF_chest"),
        "DEF_head": ((0, 0, 3.95), (0, 0, 4.55), "DEF_neck"),
        "DEF_upperarm_l": ((0, 0.48, 3.45), (0.40, 0.40, 3.03), "DEF_chest"),
        "DEF_forearm_l": ((0.40, 0.40, 3.03), (0.86, 0.18, 2.54), "DEF_upperarm_l"),
        "DEF_hand_l": ((0.86, 0.18, 2.54), (1.30, 0.05, 2.40), "DEF_forearm_l"),
        "DEF_upperarm_r": ((0, -0.48, 3.45), (0.40, -0.40, 3.03), "DEF_chest"),
        "DEF_forearm_r": ((0.40, -0.40, 3.03), (0.86, -0.18, 2.54), "DEF_upperarm_r"),
        "DEF_hand_r": ((0.86, -0.18, 2.54), (1.08, -0.04, 2.42), "DEF_forearm_r"),
        "DEF_thigh_l": ((0, 0.58, 1.85), (0, 0.58, 0.95), "DEF_pelvis"),
        "DEF_shin_l": ((0, 0.58, 0.95), (0.08, 0.58, 0.18), "DEF_thigh_l"),
        "DEF_foot_l": ((0.08, 0.58, 0.18), (0.55, 0.58, 0.12), "DEF_shin_l"),
        "DEF_thigh_r": ((0, -0.58, 1.85), (0, -0.58, 0.95), "DEF_pelvis"),
        "DEF_shin_r": ((0, -0.58, 0.95), (0.08, -0.58, 0.18), "DEF_thigh_r"),
        "DEF_foot_r": ((0.08, -0.58, 0.18), (0.55, -0.58, 0.12), "DEF_shin_r"),
        "DEF_grip_secondary": ((1.00, 0.00, 2.40), (1.24, 0.00, 2.40), "DEF_hand_l"),
    }
    created = {}
    for name, (head, tail, parent) in bones.items():
        bone = armature.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        created[name] = bone
        if parent:
            bone.parent = created[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.select_set(False)
    rig.show_in_front = True
    rig["primary_weapon_socket"] = "DEF_hand_r"
    rig["secondary_weapon_socket"] = "DEF_grip_secondary"
    return rig


def bind_mesh(mesh: bpy.types.Object, rig: bpy.types.Object) -> None:
    assignments = list(mesh.get("vertex_bones", []))
    del mesh["vertex_bones"]
    for bone_name in sorted(set(assignments)):
        if bone_name:
            mesh.vertex_groups.new(name=bone_name)
    for index, bone_name in enumerate(assignments):
        if bone_name:
            mesh.vertex_groups[bone_name].add([index], 1.0, "REPLACE")
    modifier = mesh.modifiers.new("Armature", "ARMATURE")
    modifier.object = rig
    mesh.parent = rig


def create_defender(target: bpy.types.Collection, material: bpy.types.Material) -> tuple[bpy.types.Object, bpy.types.Object]:
    rig = create_rig(target)
    parts = [
        {"kind": "frustum", "center": (0, 0, 2.86), "bottom_size": (0.62, 0.92), "top_size": (0.78, 1.28), "height": 1.46, "swatch": "iron_mid", "bone": "DEF_chest"},
        {"kind": "frustum", "center": (0.38, 0, 2.66), "bottom_size": (0.08, 0.30), "top_size": (0.08, 0.44), "height": 1.55, "swatch": "cloth_mid", "bone": "DEF_spine"},
        {"kind": "prism", "center": (0.02, 0, 3.58), "radius": 0.52, "depth": 0.22, "sides": 8, "swatch": "cloth_shadow", "bone": "DEF_neck"},
        {"kind": "frustum", "center": (0, 0, 1.98), "bottom_size": (0.54, 0.78), "top_size": (0.62, 0.94), "height": 0.48, "swatch": "leather", "bone": "DEF_pelvis"},
        {"kind": "frustum", "center": (0.30, 0, 1.48), "bottom_size": (0.08, 0.24), "top_size": (0.08, 0.28), "height": 0.95, "swatch": "cloth_mid", "bone": "DEF_pelvis"},
        {"kind": "box", "center": (0.33, 0, 2.02), "size": (0.08, 0.88, 0.14), "swatch": "brass", "bone": "DEF_pelvis"},
        {"kind": "prism", "center": (0, 0, 4.12), "radius": 0.44, "depth": 0.72, "sides": 8, "swatch": "bone", "bone": "DEF_head"},
        {"kind": "prism", "center": (0, 0, 4.35), "radius": 0.49, "depth": 0.48, "sides": 8, "swatch": "iron_shadow", "bone": "DEF_head"},
        {"kind": "box", "center": (0.43, 0, 4.26), "size": (0.10, 0.62, 0.16), "swatch": "iron_light", "bone": "DEF_head"},
        {"kind": "prism", "center": (0.02, 0.60, 3.43), "radius": 0.38, "depth": 0.34, "sides": 6, "swatch": "iron_light", "bone": "DEF_upperarm_l"},
        {"kind": "prism", "center": (0.02, -0.60, 3.43), "radius": 0.38, "depth": 0.34, "sides": 6, "swatch": "iron_light", "bone": "DEF_upperarm_r"},
    ]
    segment_specs = [
        ((0, 0.50, 3.35), (0.40, 0.40, 3.03), 0.28, 0.23, "iron_mid", "DEF_upperarm_l"),
        ((0.40, 0.40, 3.03), (0.86, 0.18, 2.54), 0.23, 0.18, "leather", "DEF_forearm_l"),
        ((0.86, 0.18, 2.54), (1.30, 0.05, 2.40), 0.19, 0.14, "iron_light", "DEF_hand_l"),
        ((0, -0.50, 3.35), (0.40, -0.40, 3.03), 0.28, 0.23, "iron_mid", "DEF_upperarm_r"),
        ((0.40, -0.40, 3.03), (0.86, -0.18, 2.54), 0.23, 0.18, "leather", "DEF_forearm_r"),
        ((0.86, -0.18, 2.54), (1.08, -0.04, 2.42), 0.19, 0.14, "iron_light", "DEF_hand_r"),
        ((0, 0.58, 1.82), (0.02, 0.58, 0.96), 0.28, 0.23, "iron_mid", "DEF_thigh_l"),
        ((0.02, 0.58, 0.96), (0.08, 0.58, 0.22), 0.23, 0.18, "iron_mid", "DEF_shin_l"),
        ((0, -0.58, 1.82), (0.02, -0.58, 0.96), 0.28, 0.23, "iron_mid", "DEF_thigh_r"),
        ((0.02, -0.58, 0.96), (0.08, -0.58, 0.22), 0.23, 0.18, "iron_mid", "DEF_shin_r"),
    ]
    parts.extend({"kind": "segment", "start": start, "end": end, "start_radius": sr, "end_radius": er, "sides": 6, "swatch": sw, "bone": bone} for start, end, sr, er, sw, bone in segment_specs)
    parts.extend([
        # Small light greave faces preserve the approved iron-mid shins while
        # keeping each leg readable against the dark tabard at gameplay scale.
        {"kind": "box", "center": (0.19, 0.58, 0.60), "size": (0.08, 0.22, 0.52), "swatch": "iron_light", "bone": "DEF_shin_l"},
        {"kind": "box", "center": (0.19, -0.58, 0.60), "size": (0.08, 0.22, 0.52), "swatch": "iron_light", "bone": "DEF_shin_r"},
        {"kind": "frustum", "center": (0.34, 0.58, 0.14), "bottom_size": (0.72, 0.30), "top_size": (0.52, 0.26), "height": 0.24, "swatch": "iron_light", "bone": "DEF_foot_l"},
        {"kind": "frustum", "center": (0.34, -0.58, 0.14), "bottom_size": (0.72, 0.30), "top_size": (0.52, 0.26), "height": 0.24, "swatch": "iron_light", "bone": "DEF_foot_r"},
    ])
    mesh = mesh_from_parts("CHR_Defender", parts, material, target)
    bind_mesh(mesh, rig)
    mesh["visual_height"] = 4.66
    mesh["max_bone_influences"] = 1
    return mesh, rig


def create_weapon(name: str, target: bpy.types.Collection, material: bpy.types.Material, greatsword: bool) -> bpy.types.Object:
    if greatsword:
        # 1.3x a realistic two-handed sword, calibrated to an approximately
        # body-height gameplay silhouette rather than a fantasy oversized blade.
        parts = [
            {"kind": "prism", "center": (0.34, 0, 0), "radius": 0.15, "depth": 0.68, "sides": 8, "axis": "x", "swatch": "leather"},
            {"kind": "box", "center": (0.76, 0, 0), "size": (0.16, 1.32, 0.24), "swatch": "brass"},
            {"kind": "blade", "start_x": 0.79, "end_x": 3.72, "width_start": 0.82, "width_end": 0.60, "thickness": 0.22, "swatch": "steel_edge"},
            {"kind": "blade", "start_x": 3.72, "end_x": 4.30, "width_start": 0.60, "width_end": 0.05, "thickness": 0.18, "swatch": "iron_light"},
            {"kind": "prism", "center": (-0.08, 0, 0), "radius": 0.26, "depth": 0.22, "sides": 8, "axis": "x", "swatch": "brass"},
        ]
    else:
        parts = [
            {"kind": "prism", "center": (0.34, 0, 0), "radius": 0.13, "depth": 0.68, "sides": 6, "axis": "x", "swatch": "leather"},
            {"kind": "box", "center": (0.78, 0, 0), "size": (0.15, 0.94, 0.18), "swatch": "iron_mid"},
            {"kind": "blade", "start_x": 0.84, "end_x": 2.05, "width_start": 0.44, "width_end": 0.22, "thickness": 0.16, "swatch": "iron_light"},
            {"kind": "blade", "start_x": 2.05, "end_x": 2.28, "width_start": 0.22, "width_end": 0.03, "thickness": 0.14, "swatch": "steel_edge"},
            {"kind": "blade", "start_x": 1.00, "end_x": 2.06, "width_start": 0.10, "width_end": 0.06, "thickness": 0.19, "swatch": "iron_shadow"},
            {"kind": "prism", "center": (-0.06, 0, 0), "radius": 0.16, "depth": 0.18, "sides": 6, "axis": "x", "swatch": "iron_mid"},
        ]
    obj = mesh_from_parts(name, parts, material, target)
    obj["origin_contract"] = "primary grip"
    obj["proportion_scale"] = 1.3 if greatsword else 1.0
    return obj


def create_environment(target: bpy.types.Collection, material: bpy.types.Material) -> None:
    wall_parts = [
        {"kind": "box", "center": (4.5, 1.35, 1.35), "size": (9, 2.2, 2.7), "swatch": "stone_mid"},
        {"kind": "box", "center": (4.5, 1.35, 2.92), "size": (9.35, 2.55, 0.44), "swatch": "stone_light"},
    ]
    for x in (0.55, 2.55, 4.5, 6.45, 8.45):
        wall_parts.append({"kind": "box", "center": (x, 1.35, 3.52), "size": (1.05, 1.05, 0.78), "swatch": "stone_mid"})
    wall = mesh_from_parts("ENV_Citadel_Wall_Straight_A", wall_parts, material, target)
    wall["origin_contract"] = "lower-left grid corner"
    wall.location = (0, 0, 0)

    brazier_parts = [
        {"kind": "box", "center": (0, 0, 0.62), "size": (0.52, 0.52, 1.24), "swatch": "iron_shadow"},
        {"kind": "prism", "center": (0, 0, 1.34), "radius": 0.78, "depth": 0.4, "sides": 8, "swatch": "iron_mid"},
        {"kind": "prism", "center": (0, 0, 1.72), "radius": 0.34, "depth": 0.65, "sides": 6, "swatch": "ember"},
        {"kind": "prism", "center": (0.02, 0, 1.96), "radius": 0.18, "depth": 0.42, "sides": 5, "swatch": "ember_hot"},
    ]
    mesh_from_parts("PRP_Brazier_A", brazier_parts, material, target)


def create_slash(target: bpy.types.Collection, material: bpy.types.Material) -> None:
    vertices = []
    faces = []
    steps = 12
    for i in range(steps + 1):
        angle = -0.72 + 1.44 * i / steps
        for radius in (2.2, 3.05):
            vertices.append((math.cos(angle) * radius, math.sin(angle) * radius, 0.18 + 0.08 * math.sin(i / steps * math.pi)))
    for i in range(steps):
        a = i * 2
        faces.append((a, a + 2, a + 3, a + 1))
    mesh = bpy.data.meshes.new("VFX_Greatsword_Slash_A_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv = swatch_uv("slash")
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            uv_layer.data[loop_index].uv = uv
    obj = bpy.data.objects.new("VFX_Greatsword_Slash_A", mesh)
    target.objects.link(obj)
    obj["origin_contract"] = "cast origin; local +X is strike direction"


def pose_key(
    rig: bpy.types.Object,
    frame: int,
    rotations: dict[str, tuple[float, float, float]],
    location=(0, 0, 0),
    bone_locations: dict[str, tuple[float, float, float]] | None = None,
) -> None:
    rig.location = location
    rig.keyframe_insert("location", frame=frame)
    for bone_name, rotation in rotations.items():
        bone = rig.pose.bones[bone_name]
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = rotation
        bone.keyframe_insert("rotation_euler", frame=frame)
    for bone_name, bone_location in (bone_locations or {}).items():
        bone = rig.pose.bones[bone_name]
        bone.location = bone_location
        bone.keyframe_insert("location", frame=frame)


def create_actions(rig: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = rig
    rig.animation_data_create()
    clips = {
        "Idle": (24, [
            (1, {"DEF_chest": (0, 0.025, 0)}),
            (12, {"DEF_chest": (0, -0.025, 0)}),
            (24, {"DEF_chest": (0, 0.025, 0)}),
        ]),
        "Run": (16, [
            (1, {
                "DEF_pelvis": (0.04, 0.10, -0.10), "DEF_spine": (-0.03, -0.08, 0.10),
                "DEF_chest": (-0.04, -0.12, 0.16), "DEF_thigh_l": (0, 0.96, 0.12),
                "DEF_thigh_r": (0, -0.78, -0.08), "DEF_shin_l": (0, -0.52, 0),
                "DEF_shin_r": (0, 0.34, 0), "DEF_foot_l": (0, 0.18, 0),
                "DEF_foot_r": (0, -0.12, 0), "DEF_grip_secondary": (-0.04, 0.04, -0.10),
            }, {
                "DEF_pelvis": (0.08, 0, -0.06), "DEF_thigh_l": (0, 0.16, 0),
                "DEF_thigh_r": (0, -0.16, 0),
            }),
            (8, {
                "DEF_pelvis": (-0.04, -0.10, 0.10), "DEF_spine": (0.03, 0.08, -0.10),
                "DEF_chest": (0.04, 0.12, -0.16), "DEF_thigh_l": (0, -0.78, -0.08),
                "DEF_thigh_r": (0, 0.96, 0.12), "DEF_shin_l": (0, 0.34, 0),
                "DEF_shin_r": (0, -0.52, 0), "DEF_foot_l": (0, -0.12, 0),
                "DEF_foot_r": (0, 0.18, 0), "DEF_grip_secondary": (0.04, -0.04, 0.10),
            }, {
                "DEF_pelvis": (0.08, 0, -0.06), "DEF_thigh_l": (0, 0.16, 0),
                "DEF_thigh_r": (0, -0.16, 0),
            }),
            (16, {
                "DEF_pelvis": (0.04, 0.10, -0.10), "DEF_spine": (-0.03, -0.08, 0.10),
                "DEF_chest": (-0.04, -0.12, 0.16), "DEF_thigh_l": (0, 0.96, 0.12),
                "DEF_thigh_r": (0, -0.78, -0.08), "DEF_shin_l": (0, -0.52, 0),
                "DEF_shin_r": (0, 0.34, 0), "DEF_foot_l": (0, 0.18, 0),
                "DEF_foot_r": (0, -0.12, 0), "DEF_grip_secondary": (-0.04, 0.04, -0.10),
            }, {
                "DEF_pelvis": (0.08, 0, -0.06), "DEF_thigh_l": (0, 0.16, 0),
                "DEF_thigh_r": (0, -0.16, 0),
            }),
        ]),
        "Dodge": (10, [
            # Authority begins invulnerability almost at clip frame one. Hold
            # the decisive compressed silhouette through frame five (~0.18s).
            (1, {
                "DEF_pelvis": (0.08, -0.30, -0.06),
                "DEF_spine": (0.04, -0.82, -0.08), "DEF_chest": (0.16, -0.28, -0.18),
                "DEF_neck": (0, 0.34, 0), "DEF_thigh_l": (0, 1.08, 0.16),
                "DEF_thigh_r": (0, 0.58, -0.14), "DEF_shin_l": (0, -0.78, 0),
                "DEF_shin_r": (0, -0.46, 0), "DEF_upperarm_l": (0.16, -0.34, -0.26),
                "DEF_forearm_l": (0, 0.18, -0.22), "DEF_upperarm_r": (0.12, -0.24, -0.18),
                "DEF_forearm_r": (0, 0.14, -0.16), "DEF_grip_secondary": (0.24, 0.20, -0.20),
            }, {
                "DEF_pelvis": (0.34, -0.10, -0.28), "DEF_spine": (1.40, -0.92, -0.80),
                "DEF_hand_l": (0, 0, 0), "DEF_hand_r": (0, 0, 0),
            }),
            (5, {
                "DEF_pelvis": (0.08, -0.30, -0.06),
                "DEF_spine": (0.04, -0.82, -0.08), "DEF_chest": (0.16, -0.28, -0.18),
                "DEF_neck": (0, 0.34, 0), "DEF_thigh_l": (0, 1.08, 0.16),
                "DEF_thigh_r": (0, 0.58, -0.14), "DEF_shin_l": (0, -0.78, 0),
                "DEF_shin_r": (0, -0.46, 0), "DEF_upperarm_l": (0.16, -0.34, -0.26),
                "DEF_forearm_l": (0, 0.18, -0.22), "DEF_upperarm_r": (0.12, -0.24, -0.18),
                "DEF_forearm_r": (0, 0.14, -0.16), "DEF_grip_secondary": (0.24, 0.20, -0.20),
            }, {
                "DEF_pelvis": (0.34, -0.10, -0.28), "DEF_spine": (1.40, -0.92, -0.80),
                "DEF_hand_l": (0, 0, 0), "DEF_hand_r": (0, 0, 0),
            }),
            (10, {
                "DEF_spine": (0, -0.08, 0), "DEF_chest": (0, -0.04, 0),
                "DEF_neck": (0, 0.04, 0), "DEF_thigh_l": (0, 0.18, 0),
                "DEF_thigh_r": (0, -0.08, 0), "DEF_shin_l": (0, -0.12, 0),
                "DEF_shin_r": (0, 0.06, 0), "DEF_upperarm_l": (0.08, -0.20, -0.18),
                "DEF_forearm_l": (0, 0.12, -0.12), "DEF_upperarm_r": (0.06, -0.15, -0.12),
                "DEF_forearm_r": (0, 0.10, -0.10), "DEF_grip_secondary": (0.10, -0.40, -0.20),
            }, {
                "DEF_spine": (0, -0.12, 0), "DEF_hand_l": (0, 0, 1.20),
                "DEF_hand_r": (0, 0, 1.20),
            }),
        ]),
        "Basic_Windup": (9, [
            (1, {"DEF_chest": (0, 0, 0), "DEF_upperarm_l": (0, 0, 0), "DEF_upperarm_r": (0, 0, 0)}),
            (9, {
                "DEF_pelvis": (0.04, -0.18, -0.12), "DEF_spine": (0.04, -0.20, -0.16),
                "DEF_chest": (0.12, -0.28, -0.54), "DEF_upperarm_l": (-0.18, 0.18, -0.62),
                "DEF_forearm_l": (0.12, 0.28, -0.34), "DEF_upperarm_r": (-0.24, 0.12, -0.48),
                "DEF_forearm_r": (0.08, 0.22, -0.26), "DEF_thigh_l": (0, 0.26, 0.08),
                "DEF_thigh_r": (0, -0.16, -0.04), "DEF_shin_l": (0, -0.22, 0),
                "DEF_grip_secondary": (-0.10, 0.12, -0.22),
            }),
        ]),
        "Basic_Active": (5, [
            (1, {
                "DEF_pelvis": (0.04, -0.18, -0.12), "DEF_spine": (0.04, -0.20, -0.16),
                "DEF_chest": (0.12, -0.28, -0.54), "DEF_upperarm_l": (-0.18, 0.18, -0.62),
                "DEF_forearm_l": (0.12, 0.28, -0.34), "DEF_upperarm_r": (-0.24, 0.12, -0.48),
                "DEF_forearm_r": (0.08, 0.22, -0.26), "DEF_thigh_l": (0, 0.26, 0.08),
                "DEF_thigh_r": (0, -0.16, -0.04), "DEF_shin_l": (0, -0.22, 0),
                "DEF_grip_secondary": (-0.10, 0.12, -0.22),
            }),
            (5, {
                "DEF_pelvis": (-0.04, 0.18, 0.16), "DEF_spine": (-0.04, 0.22, 0.22),
                "DEF_chest": (-0.10, 0.34, 0.62), "DEF_upperarm_l": (0.14, -0.20, 0.78),
                "DEF_forearm_l": (-0.10, -0.10, 0.30), "DEF_upperarm_r": (0.18, -0.16, 0.64),
                "DEF_forearm_r": (-0.08, -0.06, 0.24), "DEF_thigh_l": (0, -0.18, -0.06),
                "DEF_thigh_r": (0, 0.30, 0.08), "DEF_shin_r": (0, -0.24, 0),
                "DEF_grip_secondary": (0.08, -0.10, 0.28),
            }),
        ]),
        "Basic_Recovery": (10, [
            (1, {
                "DEF_pelvis": (-0.04, 0.18, 0.16), "DEF_spine": (-0.04, 0.22, 0.22),
                "DEF_chest": (-0.10, 0.34, 0.62), "DEF_upperarm_l": (0.14, -0.20, 0.78),
                "DEF_forearm_l": (-0.10, -0.10, 0.30), "DEF_upperarm_r": (0.18, -0.16, 0.64),
                "DEF_forearm_r": (-0.08, -0.06, 0.24), "DEF_thigh_l": (0, -0.18, -0.06),
                "DEF_thigh_r": (0, 0.30, 0.08), "DEF_shin_r": (0, -0.24, 0),
                "DEF_grip_secondary": (0.08, -0.10, 0.28),
            }),
            (5, {
                "DEF_pelvis": (-0.02, 0.10, 0.08), "DEF_spine": (-0.02, 0.12, 0.10),
                "DEF_chest": (-0.05, 0.18, 0.34), "DEF_upperarm_l": (0.08, -0.10, 0.46),
                "DEF_forearm_l": (-0.04, -0.05, 0.18), "DEF_upperarm_r": (0.10, -0.08, 0.38),
                "DEF_forearm_r": (-0.04, -0.03, 0.14), "DEF_thigh_l": (0, -0.08, 0),
                "DEF_thigh_r": (0, 0.14, 0.03), "DEF_grip_secondary": (0.04, -0.05, 0.16),
            }),
            (10, {
                "DEF_pelvis": (0, 0, 0), "DEF_spine": (0, 0, 0), "DEF_chest": (0, 0, 0),
                "DEF_upperarm_l": (0, 0, 0), "DEF_forearm_l": (0, 0, 0),
                "DEF_upperarm_r": (0, 0, 0), "DEF_forearm_r": (0, 0, 0),
                "DEF_thigh_l": (0, 0, 0), "DEF_thigh_r": (0, 0, 0),
                "DEF_shin_l": (0, 0, 0), "DEF_shin_r": (0, 0, 0),
                "DEF_grip_secondary": (0, 0, 0),
            }),
        ]),
    }
    for name, (end_frame, keys) in clips.items():
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        action.frame_start = 1
        action.frame_end = end_frame
        rig.animation_data.action = action
        for bone in rig.pose.bones:
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = (0, 0, 0)
            bone.location = (0, 0, 0)
        for key in keys:
            frame, rotations, *location_maps = key
            pose_key(rig, frame, rotations, bone_locations=location_maps[0] if location_maps else None)
        rig.animation_data.action = None
    rig["clips"] = list(clips)
    rig["clip_fps"] = 24


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.world = bpy.data.worlds.new("SiegeheartWorld")
    scene.world.color = (0.012, 0.018, 0.026)
    scene.render.fps = 24
    scene["fixed_camera_contract"] = "Orthographic approximation of runtime camera (27,34,29), 1280x720"
    scene["proof_checkpoint"] = "0.1.35"


def main() -> None:
    reset()
    configure_scene()
    image = create_palette()
    material = create_material(image)
    defender_collection = collection("ASSET_Defender")
    practice_collection = collection("ASSET_PracticeWeapon")
    greatsword_collection = collection("ASSET_Greatsword")
    wall_collection = collection("ASSET_Wall")
    brazier_collection = collection("ASSET_Brazier")
    slash_collection = collection("ASSET_Slash")

    create_defender(defender_collection, material)
    create_actions(bpy.data.objects["RIG_Defender"])
    create_weapon("WPN_Practice_A", practice_collection, material, False)
    create_weapon("WPN_Greatsword_A", greatsword_collection, material, True)
    create_environment(wall_collection, material)
    # Move the brazier object from the wall collection into its export collection.
    brazier = wall_collection.objects.get("PRP_Brazier_A")
    if brazier:
        wall_collection.objects.unlink(brazier)
        brazier_collection.objects.link(brazier)
    create_slash(slash_collection, material)

    for obj in bpy.context.scene.objects:
        obj.select_set(False)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    for backup in BLEND_PATH.parent.glob(BLEND_PATH.name + "[0-9]"):
        backup.unlink()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), compress=True)
    print(f"BUILT_SOURCE {BLEND_PATH}")


if __name__ == "__main__":
    main()
