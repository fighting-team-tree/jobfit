# ruff: noqa: E402
import sys
from pathlib import Path

# Ensure the server directory is in sys.path
SERVER_DIR = Path(__file__).resolve().parent.parent / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

# Force TEST_MODE to True for all pytest executions
from app.core.config import settings

settings.TEST_MODE = True
