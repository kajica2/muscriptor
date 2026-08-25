"""MuScriptor inference entry point for Hugging Face ZeroGPU Spaces.

Run: `python app.py`
Hardware: zero-gpu (on-demand NVIDIA A100)
"""
from __future__ import annotations

import base64
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Optional

import gradio as gr
import numpy as np

# ZeroGPU decorator lives in the `spaces` package (preinstalled on HF GPU Spaces).
try:
    import spaces  # type: ignore
    GPU_AVAILABLE = True
except Exception:  # pragma: no cover - non-HF local dev
    spaces = None
    GPU_AVAILABLE = False


# ─── Configuration ──────────────────────────────────────────────────────────
CACHE_DIR = "/data" if os.path.exists("/data") else "./cache"
MODEL_REPO = os.environ.get("MUSCRIPTOR_REPO", "MuScriptor/muscriptor-large")
MAX_AUDIO_SECONDS = 180
TARGET_SR = 16_000
N_MELS = 128


def _gpu(duration: int):
    """Decorator shim: use `@spaces.GPU` when on HF, no-op locally."""
    if spaces is not None:
        return spaces.GPU(duration=duration)
    def _wrap(fn):
        return fn
    return _wrap


# ─── Model loading (cold start only) ─────────────────────────────────────────
print("[muscriptor] loading model from", MODEL_REPO, file=sys.stderr)
_MODEL = None
_TOKENIZER = None
_CONFIG = None


def _load_model() -> None:
    global _MODEL, _TOKENIZER, _CONFIG
    if _MODEL is not None:
        return

    from huggingface_hub import hf_hub_download
    import torch

    Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)

    model_path = hf_hub_download(
        repo_id=MODEL_REPO,
        filename="model.safetensors",
        local_dir=CACHE_DIR,
        local_dir_use_symlinks=False,
    )
    tokenizer_path = hf_hub_download(
        repo_id=MODEL_REPO,
        filename="tokenizer.json",
        local_dir=CACHE_DIR,
        local_dir_use_symlinks=False,
    )

    # MuScriptor is a custom architecture — load via its own loader when
    # available; otherwise fall back to a generic transformers stack so the
    # app still imports cleanly during scaffold bring-up.
    try:
        from muscriptor import MuScriptorForConditionalGeneration  # type: ignore
        _MODEL = MuScriptorForConditionalGeneration.from_pretrained(model_path, torch_dtype=torch.bfloat16)
    except Exception as exc:
        print(f"[muscriptor] custom loader unavailable ({exc}); using stub", file=sys.stderr)
        _MODEL = _StubModel()

    try:
        from transformers import AutoTokenizer
        _TOKENIZER = AutoTokenizer.from_pretrained(tokenizer_path)
    except Exception:
        _TOKENIZER = None


class _StubModel:
    """Placeholder used only when the real MuScriptor package isn't available.

    Returns a fixed-pitch MIDI so the Gradio UI still renders end-to-end.
    """

    def generate(self, inputs, **_):
        return [[1, 2, 3, 4]]

    def to(self, _device):
        return self

    def eval(self):
        return self


# ─── Audio extraction ────────────────────────────────────────────────────────
def _extract_audio(src: str, workdir: str) -> str:
    """mp4/mov/avi/mkv → 16kHz mono wav via ffmpeg."""
    suffix = Path(src).suffix.lower()
    if suffix in {".wav", ".mp3", ".flac", ".ogg", ".m4a"}:
        # Already audio — normalize anyway.
        out = os.path.join(workdir, "audio.wav")
        subprocess.run(
            ["ffmpeg", "-y", "-i", src, "-ac", "1", "-ar", str(TARGET_SR), out],
            check=True, capture_output=True,
        )
        return out

    out = os.path.join(workdir, "audio.wav")
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", src,
            "-vn", "-ac", "1", "-ar", str(TARGET_SR),
            "-t", str(MAX_AUDIO_SECONDS),
            out,
        ],
        check=True, capture_output=True, timeout=300,
    )
    return out


def _load_wav_mono(path: str) -> np.ndarray:
    import soundfile as sf
    audio, _sr = sf.read(path, dtype="float32", always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    return audio.astype(np.float32)


def _mel_spectrogram(audio: np.ndarray) -> np.ndarray:
    import torch
    import torchaudio.transforms as T

    transform = T.MelSpectrogram(
        sample_rate=TARGET_SR, n_fft=1024, hop_length=256, n_mels=N_MELS,
    )
    mel = transform(torch.from_numpy(audio))
    return (mel.clamp(min=1e-5).log10() + 5.0) / 5.0  # rough normalize to [0,1]


# ─── MIDI synthesis ──────────────────────────────────────────────────────────
def _notes_to_midi_bytes(token_ids: list[int], bpm: float = 120.0) -> bytes:
    """Convert model token IDs to a Standard MIDI File byte string.

    This is a placeholder renderer that produces a valid SMF with one track
    of quarter notes at 60, 62, 64, ... — sufficient for the UI pipeline.
    Replace with the real MuScriptor → pretty_midi conversion once the
    custom model package is wired in.
    """
    from midiutil import MIDIFile

    midi = MIDIFile(1)
    midi.addTempo(0, 0, bpm)
    midi.addTrackName(0, 0, "MuScriptor")
    pitch = 60
    for i, _tok in enumerate(token_ids or [1, 2, 3, 4]):
        midi.addNote(0, 0, pitch + (i % 12), i * 0.5, 0.45, 80)
    buf = tempfile.NamedTemporaryFile(suffix=".mid", delete=False)
    midi.writeFile(buf)
    buf.close()
    with open(buf.name, "rb") as fh:
        data = fh.read()
    os.unlink(buf.name)
    return data


# ─── GPU entry point ─────────────────────────────────────────────────────────
@_gpu(duration=180)
def transcribe_file(
    file_path: str,
    instruments: Optional[list[str]] = None,
    use_sampling: bool = False,
    temperature: float = 1.0,
) -> tuple[str, str, Optional[str], str, Optional[str]]:
    """Heavy work happens inside this decorator scope (ZeroGPU lease)."""
    import torch

    _load_model()
    started = time.time()

    workdir = tempfile.mkdtemp(prefix="muscriptor_")
    try:
        wav_path = _extract_audio(file_path, workdir)
        audio = _load_wav_mono(wav_path)
        mel = _mel_spectrogram(audio)

        # Stub inference. Real call: _MODEL.generate(...)
        token_ids = list(range(1, 17))
        midi_bytes = _notes_to_midi_bytes(token_ids)

        midi_out = os.path.join(workdir, "result.mid")
        with open(midi_out, "wb") as fh:
            fh.write(midi_bytes)

        # Piano-roll visualization payload (list of note dicts).
        roll_json = {
            "tracks": [
                {
                    "label": inst,
                    "notes": [
                        {"pitch": 60 + i, "start": i * 0.5, "end": i * 0.5 + 0.45}
                        for i in range(8)
                    ],
                }
                for inst in (instruments or ["Piano"])
            ],
            "duration": 4.0,
            "bpm": 120.0,
        }

        elapsed = time.time() - started
        status = f"OK · {elapsed:.1f}s · {len(midi_bytes)} bytes"
        return midi_out, status, midi_out, str(roll_json).replace("'", '"'), None
    finally:
        # Don't clean workdir yet — Gradio needs to serve the midi file.
        pass


# ─── Gradio UI ───────────────────────────────────────────────────────────────
def build_demo() -> gr.Blocks:
    with gr.Blocks(title="MuScriptor") as demo:
        gr.Markdown("# 🎵 MuScriptor — audio/video → MIDI")
        with gr.Row():
            with gr.Column():
                inp = gr.File(
                    label="Upload audio or video",
                    file_types=[".mp3", ".wav", ".flac", ".mp4", ".mov", ".avi", ".mkv", ".m4a"],
                )
                instruments = gr.Dropdown(
                    ["piano", "guitar", "bass", "drums", "vocals"],
                    multiselect=True, value=["piano"], label="Instruments",
                )
                use_sampling = gr.Checkbox(False, label="Use sampling decoder")
                temperature = gr.Slider(0.1, 2.0, value=1.0, step=0.1, label="Temperature")
                run = gr.Button("Transcribe", variant="primary")
            with gr.Column():
                midi_out = gr.File(label="MIDI result")
                status = gr.Textbox(label="Status", interactive=False)
                player = gr.Audio(label="Preview")
                roll = gr.JSON(label="Piano roll (raw)")
                video_preview = gr.Video(label="Source video (if video)")

        run.click(
            transcribe_file,
            inputs=[inp, instruments, use_sampling, temperature],
            outputs=[midi_out, status, player, roll, video_preview],
        )
    return demo


if __name__ == "__main__":
    demo = build_demo()
    demo.queue(max_size=8).launch(server_name="0.0.0.0", server_port=7860)