"""Create deterministic train/validation filename lists for a ShanghaiTech part."""

from __future__ import annotations

import argparse
import random
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from generate_density_maps import resolve_part_dir


def create_split_lists(
    dataset_root: Path,
    part: str,
    output_dir: Path,
    validation_fraction: float,
    seed: int,
) -> tuple[Path, Path]:
    if not 0.1 <= validation_fraction <= 0.2:
        raise ValueError("validation_fraction must be between 0.10 and 0.20")
    part_dir = resolve_part_dir(dataset_root, part)
    image_dir = part_dir / "train_data" / "images"
    filenames = sorted(
        path.name for path in image_dir.iterdir() if path.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    shuffled = filenames[:]
    random.Random(seed).shuffle(shuffled)
    validation_size = max(1, int(round(len(shuffled) * validation_fraction)))
    validation = sorted(shuffled[:validation_size])
    train = sorted(shuffled[validation_size:])
    output_dir.mkdir(parents=True, exist_ok=True)
    train_path = output_dir / f"{part}_train.txt"
    val_path = output_dir / f"{part}_val.txt"
    train_path.write_text("\n".join(train) + "\n", encoding="utf-8")
    val_path.write_text("\n".join(validation) + "\n", encoding="utf-8")
    return train_path, val_path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset_root", required=True, type=Path)
    parser.add_argument("--part", required=True, choices=["part_A", "part_B"])
    parser.add_argument("--output_dir", default="splits", type=Path)
    parser.add_argument("--validation_fraction", default=0.15, type=float)
    parser.add_argument("--seed", default=42, type=int)
    args = parser.parse_args()
    train_path, val_path = create_split_lists(
        args.dataset_root, args.part, args.output_dir, args.validation_fraction, args.seed
    )
    print(f"train_file={train_path} count={len(train_path.read_text(encoding='utf-8').splitlines())}")
    print(f"validation_file={val_path} count={len(val_path.read_text(encoding='utf-8').splitlines())}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
