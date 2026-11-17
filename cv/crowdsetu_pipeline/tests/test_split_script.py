from pathlib import Path

from scripts.create_splits import create_split_lists


def test_create_splits_is_reproducible(tmp_path: Path):
    root = tmp_path / "ShanghaiTech"
    images = root / "part_B" / "train_data" / "images"
    images.mkdir(parents=True)
    for index in range(20):
        (images / f"IMG_{index}.jpg").write_bytes(b"")
    first = create_split_lists(root, "part_B", tmp_path / "splits1", 0.15, 42)
    second = create_split_lists(root, "part_B", tmp_path / "splits2", 0.15, 42)
    assert first[0].read_text() == second[0].read_text()
    assert first[1].read_text() == second[1].read_text()
    assert len(first[1].read_text().splitlines()) == 3
