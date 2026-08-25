import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/webhook/hf — called by the HF Space when transcription completes.
 * Verifies HMAC signature and writes the final job state to Redis.
 */
export async function POST(req: Request) {
    const raw = await req.text();
    const sig = req.headers.get('x-hf-signature') ?? '';

    const secret = process.env.HF_API_KEY ?? '';
    if (!secret) return NextResponse.json({ error: 'HF_API_KEY not set' }, { status: 500 });

    const { createHmac } = await import('node:crypto');
    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    if (sig !== expected) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(raw) as { jobId: string; midiUrl: string; tracks: unknown[] };
    const job = {
        id: body.jobId,
        status: 'completed',
        progress: 1,
        result: { midiUrl: body.midiUrl, tracks: body.tracks },
        completedAt: new Date().toISOString(),
    };

    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    await fetch(`${url}/set/job:${body.jobId}/${encodeURIComponent(JSON.stringify(job))}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return NextResponse.json({ ok: true });
}