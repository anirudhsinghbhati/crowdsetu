import os
import sys
import json
from pathlib import Path
from typing import List

# Base directory of the backend package
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Read .env if present
env_file = BASE_DIR / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

SECRET_KEY = os.getenv("SECRET_KEY", "crowdsetu-super-secret-key-change-in-production-2026")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "crowdsetu.db"))
ENABLE_SIMULATION = os.getenv("ENABLE_SIMULATION", "true").lower() in ("true", "1", "yes")
SIMULATION_INTERVAL_SECONDS = float(os.getenv("SIMULATION_INTERVAL_SECONDS", "1.5"))

cors_env = os.getenv("CORS_ORIGINS", '["*"]')
try:
    CORS_ORIGINS: List[str] = json.loads(cors_env)
except Exception:
    CORS_ORIGINS = ["*"]
