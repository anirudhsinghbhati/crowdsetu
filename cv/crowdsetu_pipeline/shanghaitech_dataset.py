"""
shanghaitech_dataset.py
-------------------------
PyTorch Dataset that pairs each image with its precomputed density map
(from generate_density_maps.py) and handles the training-time details:

  - Random crop: CSRNet trains on fixed-size patches (not full images) so batches
    can be stacked. We crop the SAME region from both the image and its density map.
  - Random horizontal flip: cheap, effective augmentation — flip both image and map
    together so they stay aligned.
  - Downsampling the target: CSRNet's output is 1/8 the input resolution (three
    max-pool layers in the VGG16 frontend). The loss target must match that
    resolution. We downsample via SUM-pooling (not average/resize), which is
    important: sum-pooling preserves the total count in the density map exactly,
    while a naive resize would blur/distort the actual person-count signal.

Usage (see train_csrnet.py for full training loop):
    dataset = ShanghaiTechDataset(images_dir, density_maps_dir, crop_size=256, train=True)
    loader = DataLoader(dataset, batch_size=4, shuffle=True)
"""

import os

import cv2
import numpy as np
import torch
from torch.utils.data import Dataset

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

DOWNSAMPLE_FACTOR = 8  # matches CSRNet's 3 max-pool layers (2*2*2 = 8)


def sum_pool_downsample(density_map: np.ndarray, factor: int = DOWNSAMPLE_FACTOR) -> np.ndarray:
    """
    Downsamples a density map by summing non-overlapping factor x factor blocks,
    which exactly preserves the total count (sum of the whole map is unchanged).
    Crops off any remainder pixels that don't divide evenly by `factor`.
    """
    h, w = density_map.shape
    h_crop = (h // factor) * factor
    w_crop = (w // factor) * factor
    cropped = density_map[:h_crop, :w_crop]
    reshaped = cropped.reshape(h_crop // factor, factor, w_crop // factor, factor)
    return reshaped.sum(axis=(1, 3))


class ShanghaiTechDataset(Dataset):
    def __init__(self, images_dir: str, density_maps_dir: str, crop_size: int = 256,
                 train: bool = True, filenames=None):
        self.images_dir = images_dir
        self.density_maps_dir = density_maps_dir
        self.crop_size = crop_size
        self.train = train

        available_filenames = sorted(
            f for f in os.listdir(images_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))
        )
        self.filenames = sorted(filenames) if filenames is not None else available_filenames
        if not self.filenames:
            raise FileNotFoundError(f"No images found in {images_dir}")

    def __len__(self):
        return len(self.filenames)

    def __getitem__(self, idx):
        fname = self.filenames[idx]
        stem = os.path.splitext(fname)[0]

        image = cv2.imread(os.path.join(self.images_dir, fname))
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        density_path = os.path.join(self.density_maps_dir, f"{stem}.npy")
        density = np.load(density_path)

        if self.train:
            image, density = self._random_crop(image, density, self.crop_size)
            image, density = self._random_hflip(image, density)
        else:
            # Validation/test: use the full image, just make dimensions divisible
            # by DOWNSAMPLE_FACTOR so the model's output aligns cleanly with the target.
            h, w = image.shape[:2]
            h_new = (h // DOWNSAMPLE_FACTOR) * DOWNSAMPLE_FACTOR
            w_new = (w // DOWNSAMPLE_FACTOR) * DOWNSAMPLE_FACTOR
            image = image[:h_new, :w_new]
            density = density[:h_new, :w_new]

        target = sum_pool_downsample(density, DOWNSAMPLE_FACTOR)

        image_norm = (image.astype(np.float32) / 255.0 - IMAGENET_MEAN) / IMAGENET_STD
        image_tensor = torch.from_numpy(np.transpose(image_norm, (2, 0, 1))).float()
        target_tensor = torch.from_numpy(target).float().unsqueeze(0)  # add channel dim

        return image_tensor, target_tensor

    @staticmethod
    def _random_crop(image, density, crop_size):
        h, w = image.shape[:2]
        # Guard against images smaller than the crop size (pad if needed).
        if h < crop_size or w < crop_size:
            pad_h = max(0, crop_size - h)
            pad_w = max(0, crop_size - w)
            image = cv2.copyMakeBorder(image, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT)
            density = np.pad(density, ((0, pad_h), (0, pad_w)), mode="constant")
            h, w = image.shape[:2]

        top = np.random.randint(0, h - crop_size + 1)
        left = np.random.randint(0, w - crop_size + 1)
        image_crop = image[top:top + crop_size, left:left + crop_size]
        density_crop = density[top:top + crop_size, left:left + crop_size]
        return image_crop, density_crop

    @staticmethod
    def _random_hflip(image, density):
        if np.random.rand() < 0.5:
            image = np.ascontiguousarray(image[:, ::-1])
            density = np.ascontiguousarray(density[:, ::-1])
        return image, density
