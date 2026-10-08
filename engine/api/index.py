"""Vercel Serverless Function entrypoint for DomoLens Engine."""
import sys
from pathlib import Path

# Add src to python path so domolens_engine is importable
src_path = str(Path(__file__).parent.parent / "src")
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from domolens_engine.api import app  # noqa: E402

__all__ = ["app"]
