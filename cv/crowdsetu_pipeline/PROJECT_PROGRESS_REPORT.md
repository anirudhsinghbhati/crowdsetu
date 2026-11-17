# CrowdSetu Project Progress Report

**Report date:** 17 November 2026  
**Project area:** CCTV crowd-density estimation and crowd-safety alerts

## 1. Current Status

The computer-vision portion of the CrowdSetu project has been implemented as a modular Python pipeline. It can accept a video file, webcam, or RTSP stream, isolate configured monitoring zones, run CSRNet density inference, calculate crowd density, generate an alert decision, display a heatmap, and optionally send an alert to a backend API.

The training preparation and training scripts are also available. However, a trained CSRNet checkpoint, dataset files, camera calibration values, and measured validation/demo results have not yet been added to this workspace. Therefore, the software pipeline is wired end to end, but accurate real-world crowd counts still require model training or a compatible pretrained checkpoint.

## 2. Work Completed

### 2.1 CSRNet model

Implemented in `csrnet_model.py`:

- CSRNet architecture based on the VGG16 frontend and dilated-convolution backend.
- ImageNet-pretrained VGG16 frontend initialization.
- Single-channel density-map output.
- Checkpoint loading through `load_csrnet()`.
- CPU and CUDA device support.
- Evaluation mode enabled when a model is loaded.

The model estimates a continuous density map rather than detecting individual bounding boxes. Summing the map produces the estimated number of people in the processed region.

### 2.2 CCTV and OpenCV preprocessing

Implemented in `preprocessing.py`:

- Video-file, webcam, and RTSP/HTTP capture using OpenCV.
- Time-based frame sampling, currently demonstrated at approximately one frame every 1.5 seconds.
- Configurable monitoring zones using polygons.
- Polygon masking and rectangular crop extraction.
- Validation that a zone overlaps the input frame.
- BGR-to-RGB conversion.
- Image resizing to limit the maximum input dimension.
- ImageNet normalization and conversion to a PyTorch tensor.

This limits unnecessary inference on near-identical video frames and allows each camera to be divided into meaningful zones such as gates, queues, or corridors.

### 2.3 Density and alert processing

Implemented in `density_pipeline.py`:

- Inference on one configured zone at a time.
- Raw density-map summation to estimate the crowd count.
- Configurable empirical scale factor for camera calibration.
- Conversion from estimated count to people per square metre.
- Threshold-based alert generation.
- Default emergency action: stop entry at the gate and redirect incoming flow.
- Optional custom critical action through an action map.
- Structured `ZoneResult` output containing the zone, timestamp, count, density, threshold, alert state, action, and density map.
- JET-colormap heatmap overlay rendering.
- Initial perspective-weight-map helper for future camera-ground calibration work.

### 2.4 End-to-end demonstration script

Implemented in `demo_run.py`:

- Command-line video input.
- Optional CSRNet checkpoint input.
- Optional headless mode using `--no-window`.
- Example zone configuration for a queue area.
- JSON-style console output for each processed zone.
- Visual heatmap preview using OpenCV.
- Alert forwarding to a configurable backend URL.
- Graceful warning when the backend cannot be reached.
- Keyboard exit using `q` when the display window is enabled.

Example command:

```text
python demo_run.py --video path/to/test_crowd_clip.mp4
```

With a trained model:

```text
python demo_run.py --video path/to/test_crowd_clip.mp4 --checkpoint checkpoints/csrnet_best.pth
```

## 3. Training Pipeline Completed

### 3.1 Density-map generation

Implemented in `generate_density_maps.py`:

- Loading ShanghaiTech head-point annotations from MATLAB `.mat` files.
- Fixed-sigma Gaussian density-map generation.
- Geometry-adaptive Gaussian density-map generation using nearest-neighbour distances.
- Preservation of the annotated head-count signal through Gaussian density maps.
- Processing of training or test splits.
- Saving one `.npy` density map per image.

### 3.2 Dataset loader

Implemented in `shanghaitech_dataset.py`:

- Pairing images with precomputed density maps.
- Random crops for training.
- Matching horizontal flips for images and density maps.
- Padding for images smaller than the crop size.
- Validation-image handling.
- ImageNet normalization.
- Sum-pooling of density targets by a factor of eight to match CSRNet output resolution while preserving total count.

### 3.3 Model training

Implemented in `train_csrnet.py`:

- PyTorch training and validation loops.
- GPU detection with CPU fallback.
- MSE density-map loss.
- SGD optimizer with momentum and weight decay.
- Validation MAE based on predicted and true total counts.
- Best-checkpoint saving.
- Periodic checkpoint saving.
- Configurable dataset paths, epochs, batch size, crop size, learning rate, and output directory.

## 4. Current System Flow

```text
Video file / webcam / RTSP stream
        |
        v
OpenCV capture and frame sampling
        |
        v
Configured polygon zone crop and mask
        |
        v
Resize, RGB conversion, ImageNet normalization
        |
        v
CSRNet density-map inference
        |
        +--> estimated count
        +--> people per square metre
        +--> threshold alert and suggested action
        +--> heatmap overlay
        +--> optional backend alert POST
```

## 5. Current Configuration and Assumptions

- The demonstration currently uses one example zone named `gate_a_queue`.
- The example zone covers the full 2560 x 1440 frame and assumes a real area of 40 square metres.
- The example density threshold is 4.0 people per square metre.
- The demo currently selects CPU explicitly; CUDA support exists in the model and training code but should be enabled for suitable hardware.
- The default scale factor is 1.0 and has not been calibrated against manual counts.
- The backend URL is unset, so alert forwarding is disabled until the teammate's API endpoint is available.
- The required Python packages are listed in `requirements.txt`.

## 6. Important Work Still Required

### Highest priority

1. Install the dependencies and verify imports in the target Python environment.
2. Obtain ShanghaiTech Part B or another compatible crowd-counting dataset.
3. Generate density maps for the selected dataset split.
4. Train CSRNet on a GPU where possible.
5. Save and test a checkpoint such as `csrnet_best.pth`.
6. Run the demo on a crowd video and record actual output values.

### Calibration and validation

1. Replace the illustrative polygon with coordinates from the selected camera/video.
2. Measure the physical area of each monitored zone.
3. Manually count people in reference frames.
4. Tune `scale_factor` per camera.
5. Compare model counts with manual counts and report MAE or another suitable metric.
6. Set alert thresholds using a documented crowd-density standard, such as Fruin pedestrian Level of Service guidance.

### Integration and deployment

1. Confirm the backend endpoint and set `BACKEND_ALERT_URL`.
2. Verify the JSON alert payload with the backend team.
3. Move zone configuration from hardcoded Python values to backend/database configuration.
4. Test RTSP connectivity and long-running capture behavior.
5. Add logging, retry policy, and operational monitoring for deployment.

### Future improvements

- Replace the single calibration factor with a homography or perspective-weight map.
- Fine-tune on images from the actual temple or venue camera angles to reduce domain shift.
- Support multiple alert levels instead of a single threshold.
- Add checkpoint resume support to the training script.
- Add automated tests for preprocessing, density-map count preservation, threshold decisions, and malformed zones.

## 7. Known Limitations

- No trained checkpoint or real crowd dataset is included in the current project folder.
- Running inference with only the ImageNet frontend and randomly initialized CSRNet backend will not produce trustworthy real crowd counts.
- A single flat pixel-to-ground relationship does not fully correct CCTV perspective distortion.
- Zone definitions, real-world areas, thresholds, and calibration values are currently illustrative.
- The demo backend integration is optional and has not been verified against a live API.
- Automated unit tests now cover configuration, smoothing, camera health, alert transitions, inference payloads, calibration math, and training splits; benchmark results are not available.

## 8. Overall Assessment

The project has reached the **implementation-ready MVP stage** for the computer-vision pipeline. The architecture, preprocessing, training preparation, inference, alert logic, visualization, and backend integration point are present. The remaining work is primarily experimental and deployment-focused: obtain and train on data, calibrate the system for real camera views, validate accuracy, connect the backend, and document measured results.

## 9. Phase 1 Foundation Update

### Measured changes

- Added the `src/crowdsetu/` package with Pydantic configuration models and JSON logging utilities.
- Added YAML configuration for cameras, zones, polygon coordinates, real-world area, alert thresholds, calibration, model path/version, device, sampling interval, backend URL, and privacy-related frame retention.
- Added environment placeholder expansion and `.env.example`; credentials are not stored in source or YAML values.
- Removed hardcoded zones, thresholds, device selection, sampling interval, and backend URL from `demo_run.py`; the demo now loads them from validated configuration.
- Replaced `print()` output in the demo, density-map generator, and training script with structured JSON logging.
- Added pinned runtime and development dependencies, `pyproject.toml`, `Makefile`, pre-commit configuration, `.gitignore`, and GitHub Actions CI configuration.
- Added 22 focused tests covering configuration, logging, smoothing, camera health, alert transitions, inference payloads, calibration math, and training splits.
- Validation performed locally: `22 passed` with `pytest`; modified Python files passed `py_compile`.

### Assumed or unverified

- Ruff and Black CI commands are configured but not verified in this environment: Ruff is not installed in the active interpreter, and Black is blocked by a local Windows application-control DLL policy.
- Git-based checkpoint naming and commit recording are not yet verifiable because this workspace is not currently a Git repository.
- No model accuracy, venue accuracy, latency, throughput, alert rate, or hardware benchmark has been measured.

### Required before Phase 2

- Initialize or provide the project Git repository so configuration and checkpoint versions can be tied to commits.
- Provide a GPU environment for baseline training and model comparison.
- Provide ShanghaiTech A/B data or an approved download location.
- Provide real venue footage and manual point/count annotations covering day, night, rain, obstruction, and peak festival conditions.
- Provide camera IDs, zone polygons, measured zone areas, and ground-plane reference points for calibration.

## 10. Phase 2 Training Preparation Update

### Implemented, not yet measured

- Extended `train_csrnet.py` with deterministic random seeds, explicit `auto`/`cpu`/`cuda` device selection, optional CUDA AMP, and configurable data-loader workers.
- Added validation MAE and RMSE calculation from held-out image totals.
- Added `last_checkpoint.pt` with model, optimizer, scheduler, AMP scaler, epoch, best MAE, and seed state for resume.
- Kept `csrnet_best.pth` as inference-compatible model weights and periodic model-only checkpoints.
- Added `ReduceLROnPlateau` scheduling and configurable early stopping.
- Added CSV epoch history, optional TensorBoard scalar logging, and `reports/metrics.json` output after a completed training run.
- Added CLI controls for `--resume`, `--amp`, `--seed`, `--device`, `--lr_patience`, `--early_stopping_patience`, and output paths.
- Validation performed: trainer syntax compilation passed, the complete suite reached `22 passed`, and the trainer help output exposes the new options in the project virtual environment.

### Environment blockers

- No ShanghaiTech dataset or generated density maps are present, so no real training run has been performed.
- No GPU is available in the working virtual environment (`torch.cuda.is_available()` is false).
- The system interpreter cannot load PyTorch because Windows Application Control blocks `c10.dll` with `WinError 4551`.
- The project virtual environment now contains pytest and TensorBoard, and its verified Torch pin is `torch==2.14.0+cpu`.

### Still required for Phase 2 completion

- Provide ShanghaiTech Part A/B files and generated density maps.
- Provide a CUDA-enabled GPU runtime or approve a slow CPU smoke run.
- Run real training and preserve the generated `reports/metrics.json`, CSV history, TensorBoard logs, hardware details, and exact command.
- Add a stronger comparison model only after CSRNet baseline metrics are measured on the same held-out split.

## 11. Environment and Dry-Run Update

### Measured in `.venv`

- Kept the existing working runtime instead of recreating it: runtime strings are `torch 2.14.0+cpu` and `torchvision 0.29.0+cpu`, while package metadata is pinned as `torch==2.14.0` and `torchvision==0.29.0` so `pip check` resolves correctly.
- Installed the missing pinned runtime/development packages in `.venv`, including Pydantic, PyYAML, OpenCV, SciPy, pytest, and TensorBoard.
- `pip check` reported no broken requirements.
- `scripts/check_env.py` reported Python 3.11.0, Torch 2.14.0+cpu, CUDA unavailable, and successful imports for all project modules.
- The notebook JSON parsed successfully and the new scripts compiled successfully.

### Synthetic dry run only

- Created 10 temporary random images and matching synthetic density maps outside the repository.
- Ran one CPU epoch using 7 training images, 1 deterministic holdout image, and 2 synthetic test images.
- Confirmed JSON training logs, validation MAE/RMSE calculation, best checkpoint, periodic checkpoint, resumable checkpoint, CSV history, TensorBoard event output, and `metrics.json` creation.
- The synthetic validation values are smoke-test artifacts and must not be reported as ShanghaiTech or venue accuracy.

### Added tooling

- `scripts/check_env.py` prints Python, Torch, CUDA, and module-import status.
- `scripts/verify_density_maps.py` checks density-map sums against ShanghaiTech `.mat` head counts, applies a default 1% tolerance, and reports worst offenders.
- `notebooks/train_csrnet_colab.ipynb` provides GPU/AMP training, density-map verification, checkpoint resume, and downloadable output paths.
- `requirements-gpu.txt` keeps the notebook's non-Torch dependencies separate from the verified Windows CPU Torch pin.
- README now documents the exact ShanghaiTech directory layout.

### Still required from the project team

- Provide the real ShanghaiTech Part A/B files and confirm the licensed/downloaded source.
- Provide a CUDA-enabled Colab/Kaggle or local GPU runtime for meaningful training speed and GPU validation.
- Run the notebook on the real dataset and preserve its actual `metrics.json`, hardware, split, and command details.
- Provide manually annotated venue frames for camera-specific accuracy and false-alarm/missed-alert measurements.

## 13. ShanghaiTech Dataset Validation Update

### Measured dataset inspection

- `[MEASURED]` Dataset root used: `dataset/ShanghaiTech`.
- `[MEASURED]` Detected folder names: `part_A` and `part_B`; no files were renamed.
- `[MEASURED]` Part A: 300 training images and 300 training `.mat` files; 182 test images and 182 test `.mat` files; zero missing or unpaired files.
- `[MEASURED]` Part B: 400 training images and 400 training `.mat` files; 316 test images and 316 test `.mat` files; zero missing or unpaired files.
- `[MEASURED]` Three `.mat` files from each part loaded successfully. Each exposed `image_info` with shape `(1, 1)` and the existing loader returned `(N, 2)` floating-point `(x, y)` head points. No loader correction was required.

### Measured density-map generation

- `[MEASURED]` Part B fixed-sigma maps generated externally under `dataset/density_maps/part_B`; 400 train maps completed in 19.732 seconds and 316 test maps completed in 15.823 seconds before the edge correction.
- `[MEASURED]` Part A geometry-adaptive maps generated externally under `dataset/density_maps/part_A`; 300 train maps completed in 45.672 seconds and 182 test maps completed in 19.502 seconds.
- `[MEASURED]` Generation is resumable by default and supports `--overwrite`; the source dataset folders were not modified.
- `[MEASURED]` A valid edge annotation such as `x=1023.863` in a 1024-pixel image initially rounded to index 1024 and was dropped. The generator was corrected to clamp valid rounded coordinates; Part B test maps were regenerated with `--overwrite` in 12.630 seconds.

### Measured final density verification

- `[MEASURED]` Part A train: 300/300 within 1%; mean relative error `8.848923695598742e-05`; maximum `0.003663115449004121`.
- `[MEASURED]` Part A test: 182/182 within 1%; mean relative error `0.00011264279566561423`; maximum `0.003164460387410997`.
- `[MEASURED]` Part B train: 400/400 within 1%; mean relative error `7.675886768133408e-05`; maximum `0.009524027506510416`.
- `[MEASURED]` Part B test after correction: 316/316 within 1%; mean relative error `1.46148465322632e-07`; maximum `6.539481026785714e-07`.
- `[MEASURED]` Reports were saved under `reports/density_verification_*.json`; four overlays per part were saved under `reports/samples/`.

### Measured reproducibility and GPU bundle

- `[MEASURED]` With seed 42 and validation fraction 0.15, split lists contain Part B 340 train / 60 validation and Part A 255 train / 45 validation filenames.
- `[MEASURED]` The Part B GPU bundle contains 2,170 files and is `642,485,064` bytes. Its manifest contains no `.venv`, checkpoints, runs, Part A, or unrelated dataset entries.
- `[ASSUMED]` The bundle size may change if files are regenerated or compressed differently; the measured size above applies to this exact archive.

### Still required from the project team

- `[MEASURED]` No GPU training was started on this machine; `.venv` reports CUDA unavailable.
- `[ASSUMED]` A Kaggle or Colab CUDA runtime is required for practical training.
- `[ASSUMED]` Real MAE/RMSE, latency, calibration, false-alarm rate, and missed-alert rate are still unknown until a GPU training run and venue annotations are provided.
- `[ASSUMED]` Next actions: upload `crowdsetu_part_B_gpu_bundle.zip`, select a CUDA runtime, set the notebook dataset and checkpoint/output paths, and start training with resume enabled.

## 12. Current CV Feature Update

Every item in this section is explicitly classified. `[MEASURED]` means verified by the
current `.venv` test run or a local smoke test. `[ASSUMED]` means a configurable design
default that still requires data or venue authority confirmation.

- `[MEASURED]` Zone polygons reject duplicate points, zero-area/collinear shapes, non-positive areas, and inverted thresholds through Pydantic validation.
- `[MEASURED]` Per-zone EMA/median smoothing supports warm-up and robust spike/drop rejection; unit tests cover spikes, drops, and warm-up.
- `[MEASURED]` Camera health detects blank, blocked, frozen, too-dark, and overexposed synthetic frames and blocks crowd alerts for invalid health states.
- `[MEASURED]` Alert state transitions support normal/watch/warning/critical levels, consecutive-sample escalation, hysteresis, cooldown, deduplication, and rate-of-change recommendations.
- `[ASSUMED]` Default density thresholds are Fruin LOS-inspired placeholders and must be confirmed with venue authorities; no Fruin-derived safety claim is measured here.
- `[MEASURED]` `InferenceService.process_frame(camera_id, frame)` returns count, density, model version, camera health, alert level, and a human-operator recommendation without physical actuation.
- `[MEASURED]` `AlertPayload` validates the documented versioned JSON contract in `docs/alert_payload.md`.
- `[MEASURED]` Synthetic calibration math reports fitted scale factor, MAE, bias, and produces a calibration plot path; no venue calibration has been performed.
- `[MEASURED]` Training uses a deterministic 10-20% holdout and evaluates an optional test split once after training; the synthetic smoke run exercised this path.
- `[ASSUMED]` Synthetic smoke-test values are not model accuracy and must not be used in the project results section.
- `[ASSUMED]` Real MAE/RMSE, false-negative rate, false-alarm rate, calibration bias, latency, and robustness remain unknown until real datasets, GPU runs, and venue annotations are provided.
