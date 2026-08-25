"""Inference-side data models. Mirrored in web/shared-types/."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class JobStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class TrackInfo:
    label: str
    program: int
    is_drum: bool
    note_count: int
    pitch_range: tuple[int, int]


@dataclass
class TranscriptionResult:
    midi_bytes: bytes
    status: str
    tracks: list[dict] = field(default_factory=list)
    total_notes: int = 0
    processing_time: float = 0.0
    file_type: str = "audio"