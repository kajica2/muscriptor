'use client';

import { useCallback, useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [midiUrl, setMidiUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const onPick = useCallback((f: File | null) => {
    setFile(f);
    setStatus('');
    setProgress(0);
    setMidiUrl(null);
    setJobId(null);
  }, []);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setStatus('Uploading…');
    try {
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        }),
      });
      const { uploadUrl, blobUrl, jobId: jid } = await upRes.json();
      setJobId(jid);

      const put = await fetch(uploadUrl, { method: 'PUT', body: file });
      if (!put.ok) throw new Error('Blob upload failed');

      setStatus('Transcribing…');
      const evt = new EventSource(`/api/jobs/${jid}/stream`);
      evt.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.progress != null) setProgress(data.progress);
          if (data.status) setStatus(data.status);
          if (data.type === 'result' && data.midiUrl) {
            setMidiUrl(data.midiUrl);
            setStatus('Done');
            evt.close();
            setBusy(false);
          }
          if (data.type === 'complete') {
            evt.close();
            setBusy(false);
          }
        } catch {}
      };
      evt.onerror = () => { evt.close(); setBusy(false); };
    } catch (err) {
      setStatus(String(err));
      setBusy(false);
    }
  };

  return (
    <main className="container">
      <div className="hero">
        <h1>MuScriptor</h1>
        <p>Drop an audio or video file. Get MIDI back.</p>
      </div>

      <div className="card">
        <div
          className={`drop ${drag ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            onPick(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <input
            type="file"
            accept="audio/*,video/*"
            style={{ display: 'none' }}
            id="file-input"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <label htmlFor="file-input" className="muted">
            {file ? file.name : 'Drag & drop or click to choose (mp3, wav, flac, mp4, mov, avi, mkv, m4a)'}
          </label>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn" onClick={submit} disabled={!file || busy}>
            {busy ? 'Working…' : 'Transcribe'}
          </button>
          {status && <span className="muted">{status}</span>}
        </div>

        {progress > 0 && (
          <div className="progress"><div style={{ width: `${progress * 100}%` }} /></div>
        )}

        {midiUrl && (
          <div style={{ marginTop: 20 }}>
            <a className="btn" href={midiUrl} download="result.mid">Download MIDI</a>
          </div>
        )}
      </div>

      <div className="card muted">
        Job ID: {jobId ?? '—'}
      </div>
    </main>
  );
}