"""
WSGI entry for production / Vercel. Loads the same env as run.py without starting the dev server.
"""
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent
load_dotenv(_ROOT / ".env")
load_dotenv(_ROOT.parent / ".env", override=False)

from app import app  # noqa: E402  — after env load
