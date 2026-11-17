"""
train_csrnet.py
------------------
Fine-tunes CSRNet on ShanghaiTech (or any dataset prepared the same way by
generate_density_maps.py + shanghaitech_dataset.py). Produces the .pth checkpoint
your demo_run.py / colab_single_cell.py has been waiting for.

Loss & optimizer choices follow the original CSRNet paper / common reproductions:
  - Loss: MSE between predicted and target density maps, summed (not averaged) over
    all pixels — this is the standard choice for density-map regression, since it
    directly penalizes count error at every location.
  - Optimizer: SGD with a very small learning rate and high momentum. CSRNet's
    frontend starts from ImageNet-pretrained VGG16 weights; a small LR avoids
    destroying that pretraining early on. (Adam with a very small LR also works
    if you find SGD unstable — see NOTES at the bottom.)

Validation metric: MAE (Mean Absolute Error) between the predicted total count
(sum of the output density map) and the true total count (number of annotated
head points) — this is the metric actually reported in crowd-counting papers,
and the one that tells you whether your checkpoint is any good.

Usage (run on Colab with a GPU runtime):
    python train_csrnet.py \
        --train_images /content/ShanghaiTech/part_B_final/train_data/images \
        --train_density /content/ShanghaiTech/part_B_final/train_data/density_maps \
        --val_images /content/ShanghaiTech/part_B_final/test_data/images \
        --val_density /content/ShanghaiTech/part_B_final/test_data/density_maps \
        --epochs 100 --batch_size 4 --lr 1e-6 --out_dir /content/checkpoints
"""

import argparse
import csv
import json
import os
import random
import time
from contextlib import nullcontext
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

try:
    from torch.utils.tensorboard import SummaryWriter
except ImportError:  # pragma: no cover - optional until training dependencies are installed
    SummaryWriter = None

from csrnet_model import CSRNet
from shanghaitech_dataset import ShanghaiTechDataset
from crowdsetu.logging import configure_logging, get_logger, log_context


logger = get_logger(__name__)


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def evaluate(model, val_loader, device) -> dict[str, float]:
    """Return count MAE and RMSE over the validation set."""
    model.eval()
    errors = []
    with torch.no_grad():
        for image, target in val_loader:
            image = image.to(device)
            target = target.to(device)
            output = model(image)
            pred_count = output.sum().item()
            true_count = target.sum().item()
            errors.append(pred_count - true_count)
    model.train()
    if not errors:
        return {"mae": 0.0, "rmse": 0.0}
    errors_array = np.asarray(errors, dtype=np.float64)
    return {
        "mae": float(np.abs(errors_array).mean()),
        "rmse": float(np.sqrt(np.square(errors_array).mean())),
    }


def save_checkpoint(path, model, optimizer, scheduler, scaler, epoch, best_mae, args):
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "scheduler_state_dict": scheduler.state_dict(),
            "scaler_state_dict": scaler.state_dict(),
            "epoch": epoch,
            "best_mae": best_mae,
            "seed": args.seed,
        },
        path,
    )


def append_csv(path, row):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    write_header = not path.exists()
    with path.open("a", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=row.keys())
        if write_header:
            writer.writeheader()
        writer.writerow(row)


def split_train_validation_filenames(filenames, validation_fraction: float, seed: int):
    if not 0.1 <= validation_fraction <= 0.2:
        raise ValueError("validation_fraction must be between 0.10 and 0.20")
    shuffled = list(filenames)
    random.Random(seed).shuffle(shuffled)
    validation_size = max(1, int(round(len(shuffled) * validation_fraction)))
    if validation_size >= len(shuffled):
        raise ValueError("training split must contain at least one training sample")
    return shuffled[validation_size:], shuffled[:validation_size]


def train(args):
    seed_everything(args.seed)
    device = args.device if args.device != "auto" else ("cuda" if torch.cuda.is_available() else "cpu")
    if device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("--device cuda was requested but CUDA is unavailable")
    amp_enabled = args.amp and device == "cuda"
    logger.info("training started", **log_context(device=device, epochs=args.epochs, seed=args.seed))
    if device == "cpu":
        logger.warning("no GPU detected; training on CPU may be extremely slow")

    os.makedirs(args.out_dir, exist_ok=True)
    os.makedirs(os.path.dirname(args.metrics_path) or ".", exist_ok=True)
    writer = SummaryWriter(args.tensorboard_dir) if SummaryWriter else None
    if writer is None:
        logger.warning("TensorBoard is unavailable; CSV logging remains enabled")

    all_filenames = ShanghaiTechDataset(
        args.train_images, args.train_density, crop_size=args.crop_size, train=True
    ).filenames
    train_filenames, validation_filenames = split_train_validation_filenames(
        all_filenames, args.validation_fraction, args.seed
    )
    train_dataset = ShanghaiTechDataset(
        args.train_images,
        args.train_density,
        crop_size=args.crop_size,
        train=True,
        filenames=train_filenames,
    )
    val_dataset = ShanghaiTechDataset(
        args.train_images,
        args.train_density,
        crop_size=args.crop_size,
        train=False,
        filenames=validation_filenames,
    )
    test_dataset = None
    if args.test_images and args.test_density:
        test_dataset = ShanghaiTechDataset(args.test_images, args.test_density, train=False)
    elif args.test_images or args.test_density:
        raise ValueError("--test_images and --test_density must be provided together")

    # batch_size=1 for validation: full images have different sizes, can't be
    # stacked into a batch after the (factor-of-8) crop alignment step.
    generator = torch.Generator()
    generator.manual_seed(args.seed)
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        drop_last=True,
        generator=generator,
    )
    val_loader = DataLoader(
        val_dataset, batch_size=1, shuffle=False, num_workers=args.num_workers
    )
    test_loader = (
        DataLoader(test_dataset, batch_size=1, shuffle=False, num_workers=args.num_workers)
        if test_dataset is not None
        else None
    )

    logger.info(
        "datasets loaded",
        **log_context(
            train_images=len(train_dataset),
            validation_images=len(val_dataset),
            test_images=len(test_dataset) if test_dataset else 0,
        ),
    )

    model = CSRNet(load_weights=False).to(device)  # ImageNet-pretrained frontend, fresh backend
    criterion = nn.MSELoss(reduction="sum")
    optimizer = torch.optim.SGD(model.parameters(), lr=args.lr, momentum=0.95, weight_decay=5e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=args.lr_patience
    )
    scaler = torch.amp.GradScaler("cuda", enabled=amp_enabled)

    best_mae = float("inf")
    start_epoch = 1
    best_path = os.path.join(args.out_dir, "csrnet_best.pth")
    resume_path = args.resume
    if resume_path:
        checkpoint = torch.load(resume_path, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint["model_state_dict"])
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        scheduler.load_state_dict(checkpoint["scheduler_state_dict"])
        scaler.load_state_dict(checkpoint.get("scaler_state_dict", {}))
        start_epoch = int(checkpoint["epoch"]) + 1
        best_mae = float(checkpoint["best_mae"])
        logger.info("training resumed", **log_context(path=resume_path, epoch=start_epoch))

    epochs_without_improvement = 0
    for epoch in range(start_epoch, args.epochs + 1):
        model.train()
        epoch_loss = 0.0
        start = time.time()

        for image, target in train_loader:
            image = image.to(device)
            target = target.to(device)

            autocast_context = (
                torch.amp.autocast(device_type="cuda", dtype=torch.float16)
                if amp_enabled
                else nullcontext()
            )
            with autocast_context:
                output = model(image)
                loss = criterion(output, target)

            optimizer.zero_grad()
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            epoch_loss += loss.item()

        metrics = evaluate(model, val_loader, device)
        scheduler.step(metrics["mae"])
        elapsed = time.time() - start
        train_loss = epoch_loss / max(len(train_loader), 1)
        row = {
            "epoch": epoch,
            "train_loss": train_loss,
            "val_mae": metrics["mae"],
            "val_rmse": metrics["rmse"],
            "learning_rate": optimizer.param_groups[0]["lr"],
            "elapsed_seconds": elapsed,
        }
        append_csv(args.csv_path, row)
        if writer:
            writer.add_scalar("train/loss", train_loss, epoch)
            writer.add_scalar("validation/mae", metrics["mae"], epoch)
            writer.add_scalar("validation/rmse", metrics["rmse"], epoch)
            writer.add_scalar("train/learning_rate", optimizer.param_groups[0]["lr"], epoch)
        logger.info(
            "epoch complete",
            **log_context(
                epoch=epoch,
                epochs=args.epochs,
                train_loss=train_loss,
                validation_mae=metrics["mae"],
                validation_rmse=metrics["rmse"],
                learning_rate=optimizer.param_groups[0]["lr"],
                elapsed_seconds=elapsed,
            ),
        )

        if metrics["mae"] < best_mae:
            best_mae = metrics["mae"]
            torch.save(model.state_dict(), best_path)
            logger.info("new best checkpoint saved", **log_context(mae=best_mae, path=best_path))
            epochs_without_improvement = 0
        else:
            epochs_without_improvement += 1

        save_checkpoint(
            os.path.join(args.out_dir, "last_checkpoint.pt"),
            model,
            optimizer,
            scheduler,
            scaler,
            epoch,
            best_mae,
            args,
        )

        if epoch % args.checkpoint_every == 0:
            periodic_path = os.path.join(args.out_dir, f"csrnet_epoch{epoch}.pth")
            torch.save(model.state_dict(), periodic_path)

        if epochs_without_improvement >= args.early_stopping_patience:
            logger.info("early stopping triggered", **log_context(epoch=epoch))
            break

    model.load_state_dict(torch.load(best_path, map_location=device, weights_only=True))
    validation_metrics = evaluate(model, val_loader, device)
    test_metrics = evaluate(model, test_loader, device) if test_loader is not None else None
    logger.info(
        "training complete",
        **log_context(best_validation_mae=validation_metrics["mae"], test_metrics=test_metrics),
    )
    if writer:
        writer.close()
    with open(args.metrics_path, "w", encoding="utf-8") as metrics_file:
        json.dump(
            {
                "status": "measured_after_training",
                "validation": validation_metrics,
                "test": test_metrics or {"status": "not_run", "reason": "test split not provided"},
                "dataset": {
                    "train_images": args.train_images,
                    "validation_fraction": args.validation_fraction,
                    "test_images": args.test_images,
                },
                "hardware": {"device": device, "amp": amp_enabled},
                "seed": args.seed,
            },
            metrics_file,
            indent=2,
        )


if __name__ == "__main__":
    configure_logging()
    parser = argparse.ArgumentParser()
    parser.add_argument("--train_images", required=True)
    parser.add_argument("--train_density", required=True)
    parser.add_argument("--test_images", default=None)
    parser.add_argument("--test_density", default=None)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch_size", type=int, default=4)
    parser.add_argument("--crop_size", type=int, default=256)
    parser.add_argument("--lr", type=float, default=1e-6)
    parser.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    parser.add_argument("--amp", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--validation_fraction", type=float, default=0.15)
    parser.add_argument("--num_workers", type=int, default=2)
    parser.add_argument("--lr_patience", type=int, default=5)
    parser.add_argument("--early_stopping_patience", type=int, default=15)
    parser.add_argument("--resume", default=None, help="Full last_checkpoint.pt to resume")
    parser.add_argument("--checkpoint_every", type=int, default=20,
                         help="Save a periodic checkpoint every N epochs, in addition to the best one")
    parser.add_argument("--out_dir", "--checkpoint_dir", dest="out_dir", default="./checkpoints")
    parser.add_argument("--csv_path", default="./reports/training_history.csv")
    parser.add_argument("--tensorboard_dir", default="./reports/tensorboard")
    parser.add_argument("--metrics_path", default="./reports/metrics.json")
    args = parser.parse_args()

    train(args)

"""
NOTES on training in practice:

- Time budget: Part B has ~400 training images. At crop_size=256, batch_size=4,
  expect roughly 1-3 minutes/epoch on a Colab T4 GPU. 100-150 epochs is a reasonable
  target for a usable (not state-of-the-art) checkpoint — a few hours total, doable
  in one or two Colab sessions. Colab free tier disconnects after periods of
  inactivity, so periodic checkpointing (--checkpoint_every) matters: if you get
  disconnected, resume from the last saved .pth rather than starting over.

- If SGD with lr=1e-6 seems too slow to converge (train_loss barely moving after
  ~10 epochs), try Adam instead:
      optimizer = torch.optim.Adam(model.parameters(), lr=1e-5)
  Adam tends to be more forgiving of learning-rate choice, at some cost to final
  accuracy compared to a well-tuned SGD schedule — a reasonable trade for a
  project timeline.

- Expect val_MAE somewhere in the range of high single digits to ~15-20 for Part B
  with a modest training budget (published CSRNet results on Part B reach ~10-11
  MAE with full training — don't expect to match that exactly on limited Colab time,
  and it's fine to report your actual number honestly rather than the paper's).
"""
