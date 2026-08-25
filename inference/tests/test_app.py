"""Basic sanity tests for the inference layer (no GPU required)."""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def test_app_module_imports():
    """The app module must import without requiring a GPU or model download."""
    import app  # noqa: F401
    assert hasattr(app, "transcribe_file")
    assert hasattr(app, "build_demo")


def test_models_dataclasses():
    from models import JobStatus, TrackInfo, TranscriptionResult

    assert JobStatus.PENDING.value == "pending"
    assert JobStatus.PROCESSING.value == "processing"

    t = TrackInfo(label="Piano", program=0, is_drum=False, note_count=10, pitch_range=(60, 72))
    assert t.label == "Piano"

    r = TranscriptionResult(midi_bytes=b"", status="ok", total_notes=0)
    assert r.status == "ok"


def test_mel_shape_constant():
    import app
    assert app.N_MELS == 128
    assert app.TARGET_SR == 16_000