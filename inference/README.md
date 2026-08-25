---
title: MuScriptor Inference API
emoji: 🧠
colorFrom: purple
colorTo: indigo
sdk: gradio
sdk_version: "5.12.0"
app_file: app.py
python_version: "3.12"
startup_duration_timeout: 30m
hardware: "zero-gpu"
---

# MuScriptor Video & Audio Transcription

Transcribe MP3 / WAV / FLAC / MP4 / MOV / AVI / MKV → MIDI using the MuScriptor 1.3B parameter model on ZeroGPU.

## Endpoints

- `POST /api/predict` — Gradio native (used by the Vercel frontend via `HF_SPACE_URL`)
- Web UI: upload a file, get back `(midi_path, status, player_src, roll_json, video_preview)`

## Limits

- Max 180s audio per request (`@spaces.GPU(duration=180)`)
- 100MB upload cap (Vercel Blob upstream limit)
- Output: 1-4 MIDI tracks, base64-encoded for the Vercel API consumer

## Secrets

| Name         | Required | Purpose                          |
| ------------ | -------- | -------------------------------- |
| `HF_TOKEN`   | optional | Download gated weights if needed |
| `REDIS_URL`  | optional | Job state persistence            |
| `API_KEY`    | optional | Authenticate Vercel → HF calls   |