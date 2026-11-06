import os
import sys
from pathlib import Path
import tempfile
import pytest

# Ensure backend root is in python path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Use temporary DB for tests
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db_path = temp_db.name
temp_db.close()

os.environ["DATABASE_PATH"] = temp_db_path
os.environ["ENABLE_SIMULATION"] = "false" # Keep simulation off during tests for predictability

from app.database import init_db
from app.main import app
from fastapi.testclient import TestClient

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    init_db()
    yield
    try:
        os.remove(temp_db_path)
    except Exception:
        pass

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
