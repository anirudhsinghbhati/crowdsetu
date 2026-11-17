# CrowdSetu — CV Pipeline (OpenCV + CSRNet)

Your slice of the project: **CCTV frame → OpenCV preprocessing → CSRNet density inference
→ post-processed output (count, density/m², threshold alert)**.

## Files

| File | What it does |
|---|---|
| `csrnet_model.py` | CSRNet architecture (VGG16 frontend + dilated-conv backend) + weight loading |
| `preprocessing.py` | OpenCV: video/RTSP capture, frame sampling, zone cropping, tensor normalization |
| `density_pipeline.py` | Ties preprocessing + model together, computes count/density/alert, renders heatmap |
| `demo_run.py` | Runnable end-to-end script on a test video, emits JSON logs, optionally posts to backend |
| `src/crowdsetu/config.py` | Validates YAML camera, zone, model, runtime, and backend configuration |
| `src/crowdsetu/logging.py` | Configures structured JSON logging |

## Setup

```bash
python -m pip install -e ".[dev]"
copy .env.example .env
python demo_run.py --video path/to/test_crowd_clip.mp4 --config config/crowdsetu.example.yaml
```

The example YAML contains placeholder environment variables for the camera source and
backend URL. Replace them locally or create a separate deployment config; do not put
credentials in YAML or source files. The current example checkpoint path is illustrative
and must point to a trained checkpoint before count accuracy can be assessed.

## ShanghaiTech Dataset Layout

Download an approved ShanghaiTech Part A or Part B copy and preserve this layout. The
dataset root is the directory passed to `generate_density_maps.py` as `--dataset_root`.

```text
part_B_final/
├── train_data/
│   ├── images/
│   │   ├── IMG_1.jpg
│   │   └── ...
│   └── ground-truth/
│       ├── GT_IMG_1.mat
│       └── ...
└── test_data/
  ├── images/
  │   ├── IMG_401.jpg
  │   └── ...
  └── ground-truth/
    ├── GT_IMG_401.mat
    └── ...
```

After density-map generation, each split must also contain a `density_maps/` directory
whose file stem matches the image stem, for example `train_data/density_maps/IMG_1.npy`.
Verify the generated maps before training:

```text
python scripts/verify_density_maps.py --dataset_root path/to/part_B_final --split train_data
python scripts/verify_density_maps.py --dataset_root path/to/part_B_final --split test_data
```

The checker compares each density-map sum with the number of annotated head points and
fails when any item exceeds the default 1% relative-error tolerance. Its output is a
data-integrity check, not a model-accuracy result.

Check the active environment before running jobs:

```text
.venv\Scripts\python.exe scripts/check_env.py
```

The GPU training launcher is available as
[notebooks/train_csrnet_colab.ipynb](notebooks/train_csrnet_colab.ipynb). Update its
dataset path, run density-map verification, train with AMP, and download the checkpoint,
CSV history, TensorBoard logs, and metrics JSON from its output directory.
It installs `requirements-gpu.txt` and uses the CUDA-compatible Torch build supplied by
Colab or Kaggle; do not install the local Windows CPU Torch pin in that runtime.

Find a public crowd/festival/mall CCTV-style clip on YouTube or a dataset (see "Getting
pretrained weights" below) to test with before you have real temple footage.

## The three stages, explained

**1. OpenCV preprocessing (`preprocessing.py`)**
- Reads frames from a video file, webcam, or RTSP CCTV stream.
- Samples frames every ~1.5s instead of every frame — density doesn't change fast enough
  to justify running inference 25–30 times a second, and this keeps compute sane once
  you're running this across many cameras at 4 temples.
- Crops each frame down to a specific **zone polygon** (a gate, a queue corridor) so one
  crowded corner of the camera view doesn't distort the reading for the whole frame.
- Normalizes with ImageNet mean/std, because the CSRNet frontend is a VGG16 trained on
  ImageNet-normalized images — skip this and your density numbers will be quietly wrong.

**2. CSRNet inference (`csrnet_model.py`)**
- Outputs a **density map**, not bounding boxes — a 2D grid where each cell holds a
  fractional "amount of person" value. Summing the whole map gives you the estimated
  head count. This is why CSRNet handles packed/overlapping crowds better than
  detection-based counting (YOLO-style people detectors break down once people overlap).

**3. Output processing (`density_pipeline.py`)**
- `count = sum(density_map)`
- `density_score = count / real_area_sqm` → this is the number that actually predicts
  stampede risk, not raw count (a plaza and a narrow ramp can have the same count with
  very different danger levels).
- Compares `density_score` against a per-zone threshold → alert + suggested action.
- Also renders a JET-colormap heatmap overlay for the admin dashboard.

## Important things to flag in your report / to your team

**a) You need a trained checkpoint for real numbers.** `load_csrnet(checkpoint_path=None)`
gives you a CSRNet with only the frontend (VGG16) pretrained — the density-regression
backend is randomly initialized until you either:
- fine-tune on a crowd-counting dataset (**ShanghaiTech Part A/B** or **UCF-QNRF** are
  the standard ones used in almost every CSRNet reproduction), or
- download a community-released pretrained `.pth` checkpoint trained on one of those
  datasets, and use it as-is for your demo (fine for a college project; just cite it).

Search GitHub for "CSRNet-pytorch pretrained weights" — several public repos host
ShanghaiTech-trained checkpoints you can point `--checkpoint` at directly.

**b) Perspective/calibration matters more than the model itself for your demo's
credibility.** A raw pixel-sum from an angled CCTV camera over-counts people near the
lens and under-counts people far away. For the MVP, calibrate a single `scale_factor`
per camera by manually counting people in one test frame and dividing by the model's
raw sum for that frame. Document this as a known limitation and "Phase 2 refinement"
(a proper homography-based ground-plane weight map) — evaluators respect an
acknowledged limitation far more than an unaddressed one.

**c) Threshold values aren't arbitrary.** Rather than picking `density_threshold` by
guesswork, reference **Fruin's Level of Service (LOS) standards** for pedestrian
density (a well-known crowd-safety framework: LOS A–F bands map to people/m² and
describe walking-speed degradation and stampede risk). Cite this in your report as
the basis for wherever you set the "critical" threshold — it turns an arbitrary number
into a defensible, sourced design decision.

**d) Integration point with your teammates.** `demo_run.py`'s `push_alert_to_backend()`
is the seam where your CV output meets Garv's FastAPI backend — once he has an endpoint
like `POST /api/v1/zones/alert`, just set `BACKEND_ALERT_URL` and the JSON payload
already matches the shape described in the architecture doc (zone_id, density_score,
alert, suggested_action).

## Suggested order of work

1. Get `demo_run.py` running on any test video with the untrained/ImageNet-frontend-only
   model first — confirms your OpenCV + tensor pipeline is wired correctly end-to-end.
2. Swap in a pretrained ShanghaiTech checkpoint — confirms real density numbers look
   sane (compare against a manual headcount on a few frames).
3. Calibrate `scale_factor` per test camera angle.
4. Wire `push_alert_to_backend` once the backend endpoint exists.
5. (Stretch) Fine-tune on your own annotated frames if you can get even a small labeled
   sample from a real temple camera angle — domain gap between ShanghaiTech street
   scenes and temple courtyard/corridor cameras is real, worth mentioning either way.
