"""Print and validate the CrowdSetu Python/ML environment."""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
for path in (PROJECT_ROOT, SRC_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))


def main() -> int:
    print(f"python={sys.version.split()[0]}")
    try:
        import torch

        print(f"torch={torch.__version__}")
        print(f"cuda_available={torch.cuda.is_available()}")
        print(f"cuda_version={torch.version.cuda}")
        if torch.cuda.is_available():
            print(f"cuda_device={torch.cuda.get_device_name(0)}")
    except Exception as error:
        print(f"torch_error={type(error).__name__}: {error}")
        return 1

    modules = [
        "csrnet_model",
        "preprocessing",
        "density_pipeline",
        "demo_run",
        "generate_density_maps",
        "shanghaitech_dataset",
        "train_csrnet",
        "crowdsetu.config",
        "crowdsetu.logging",
        "crowdsetu.smoothing",
        "crowdsetu.camera_health",
        "crowdsetu.alerts",
        "crowdsetu.inference",
        "crowdsetu.payloads",
        "scripts.calibrate_scale",
    ]
    failures = []
    for module_name in modules:
        try:
            importlib.import_module(module_name)
            print(f"import_ok={module_name}")
        except Exception as error:
            failures.append(module_name)
            print(f"import_failed={module_name}: {type(error).__name__}: {error}")

    if failures:
        print(f"status=failed modules={','.join(failures)}")
        return 1
    print("status=ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
