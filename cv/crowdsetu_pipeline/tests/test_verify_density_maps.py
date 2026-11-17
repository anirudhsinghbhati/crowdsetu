from pathlib import Path

import cv2
import numpy as np
import scipy.io as sio

from scripts.verify_density_maps import verify_split


def test_verify_split_reports_error_and_writes_overlay(tmp_path: Path):
    part = tmp_path / "part_B"
    image_dir = part / "train_data" / "images"
    gt_dir = part / "train_data" / "ground-truth"
    density_dir = tmp_path / "maps" / "part_B" / "train_data"
    image_dir.mkdir(parents=True)
    gt_dir.mkdir(parents=True)
    density_dir.mkdir(parents=True)
    image = np.full((8, 8, 3), 100, dtype=np.uint8)
    cv2.imwrite(str(image_dir / "IMG_1.jpg"), image)
    density = np.zeros((8, 8), dtype=np.float32)
    density[4, 4] = 1.0
    np.save(density_dir / "IMG_1.npy", density)
    inner = np.empty((1, 1), dtype=object)
    inner[0, 0] = np.array([[4.0, 4.0]])
    outer = np.empty((1, 1), dtype=object)
    outer[0, 0] = inner
    sio.savemat(gt_dir / "GT_IMG_1.mat", {"image_info": outer})
    report = verify_split(part, "train_data", 0.01, 10, density_root=tmp_path / "maps")
    assert report["images_checked"] == 1
    assert report["mean_relative_error"] is not None
