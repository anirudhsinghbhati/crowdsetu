"""Create an explicit Part B GPU upload bundle without unrelated workspace files."""

from __future__ import annotations

import argparse
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


CODE_FILES = [
    "csrnet_model.py",
    "preprocessing.py",
    "density_pipeline.py",
    "generate_density_maps.py",
    "shanghaitech_dataset.py",
    "train_csrnet.py",
    "requirements-gpu.txt",
    "README.md",
    "notebooks/train_csrnet_colab.ipynb",
    "scripts/check_env.py",
    "scripts/verify_density_maps.py",
    "scripts/calibrate_scale.py",
    "scripts/create_splits.py",
    "docs/alert_payload.md",
    "src/crowdsetu/__init__.py",
    "src/crowdsetu/config.py",
    "src/crowdsetu/logging.py",
    "src/crowdsetu/smoothing.py",
    "src/crowdsetu/camera_health.py",
    "src/crowdsetu/alerts.py",
    "src/crowdsetu/inference.py",
    "src/crowdsetu/payloads.py",
]


def add_file(archive: ZipFile, root: Path, path: Path, archive_name: str) -> None:
    if not path.is_file():
        raise FileNotFoundError(f"Required bundle file is missing: {path}")
    archive.write(path, archive_name)


def create_bundle(project_root: Path, dataset_root: Path, density_root: Path, output: Path) -> int:
    part_dir = dataset_root / "part_B"
    if not part_dir.is_dir():
        part_dir = dataset_root / "part_B_final"
    if not part_dir.is_dir():
        raise FileNotFoundError("Could not find part_B or part_B_final")
    output.parent.mkdir(parents=True, exist_ok=True)
    files_added = 0
    with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
        for relative in CODE_FILES:
            add_file(archive, project_root, project_root / relative, relative.replace("\\", "/"))
            files_added += 1
        for split in ("train_data", "test_data"):
            for category, source_dir in (
                ("images", part_dir / split / "images"),
                ("ground-truth", part_dir / split / "ground-truth"),
                ("density_maps", density_root / "part_B" / split),
            ):
                for path in sorted(source_dir.iterdir()):
                    if path.is_file():
                        archive_name = f"dataset/part_B/{split}/{category}/{path.name}"
                        archive.write(path, archive_name)
                        files_added += 1
    return files_added


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project_root", default=".", type=Path)
    parser.add_argument("--dataset_root", required=True, type=Path)
    parser.add_argument("--density_root", required=True, type=Path)
    parser.add_argument("--output", default="crowdsetu_part_B_gpu_bundle.zip", type=Path)
    args = parser.parse_args()
    count = create_bundle(args.project_root.resolve(), args.dataset_root.resolve(), args.density_root.resolve(), args.output.resolve())
    print(f"files={count}")
    print(f"output={args.output.resolve()}")
    print(f"bytes={args.output.stat().st_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
