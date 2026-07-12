"""Run two clean Blender builds and record semantic/export reproducibility."""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[2]
BLENDER = Path(os.environ.get("BLENDER", "/Applications/Blender.app/Contents/MacOS/Blender"))
BUILD = ROOT / "scripts/blender/build_defender_proof.py"
EXPORT = ROOT / "scripts/blender/export_defender_proof.py"
REPORT = ROOT / "art/blender/defender_greatsword_reproducibility.json"


def run_once(output_root: Path) -> dict:
    environment = os.environ.copy()
    environment["SIEGEHEART_PROOF_ROOT"] = str(output_root)
    subprocess.run(
        [str(BLENDER), "--background", "--factory-startup", "--python", str(BUILD)],
        cwd=ROOT,
        check=True,
        env=environment,
        stdout=subprocess.DEVNULL,
    )
    subprocess.run(
        [str(BLENDER), "--background", str(output_root / "art/blender/defender_greatsword_proof.blend"), "--python", str(EXPORT)],
        cwd=ROOT,
        check=True,
        env=environment,
        stdout=subprocess.DEVNULL,
    )
    manifest = json.loads((output_root / "art/blender/defender_greatsword_manifest.json").read_text(encoding="utf8"))
    return {
        "semantic_manifest_sha256": manifest["semantic_manifest_sha256"],
        "runtime_export_sha256": manifest["runtime_package"]["sha256"],
        "source_blend_sha256": manifest["source"]["sha256"],
        "render_sha256": {key: value["sha256"] for key, value in manifest["renders"].items()},
    }


with tempfile.TemporaryDirectory(prefix="siegeheart-proof-repro-") as temporary:
    temporary_root = Path(temporary)
    first = run_once(temporary_root / "run-1")
    second = run_once(temporary_root / "run-2")

detailed_samples = {
    "runs": [first, second],
    "render_hashes_stable": first["render_sha256"] == second["render_sha256"],
    "blend_container_stable": first["source_blend_sha256"] == second["source_blend_sha256"],
}
semantic_stable = first["semantic_manifest_sha256"] == second["semantic_manifest_sha256"]
runtime_stable = first["runtime_export_sha256"] == second["runtime_export_sha256"]
report = {
    "status": "PASS" if semantic_stable and runtime_stable else "FAIL",
    "cycles": 2,
    "isolated_temporary_outputs": True,
    "semantic_manifest_stable": semantic_stable,
    "semantic_manifest_sha256": first["semantic_manifest_sha256"],
    "runtime_export_stable": runtime_stable,
    "runtime_export_sha256": first["runtime_export_sha256"],
    "nondeterministic_samples": ["Blender container bytes", "Eevee PNG bytes"],
    "detailed_samples": "printed to stdout only",
    "note": "Verification never writes generated proof artifacts into the checkout. Only stable semantic/export results are tracked.",
}
if not semantic_stable or not runtime_stable:
    raise SystemExit(json.dumps({"summary": report, "samples": detailed_samples}, indent=2))
REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")
print(json.dumps({"summary": report, "samples": detailed_samples}, indent=2))
