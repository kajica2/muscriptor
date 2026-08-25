import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
const HF_SPACE_URL = process.env.HF_SPACE_URL ?? 'https://kaidjuric-muscriptor-video.hf.space';
const HF_API_KEY = process.env.HF_API_KEY ?? '';

/**
 * SSE stream for transcription progress.
 * Polls Redis for job state and forwards updates to the client.
 * In a production build this would push from the HF webhook; for scaffold
 * we poll every 1s until status === 'completed' | 'failed' | 'cancelled'.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const stream = new ReadableStream({
        async start(controller) {
            const enc = new TextEncoder();
            const send = (obj: object) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

            send({ type: 'status', status: 'queued', progress: 0 });

            for (let i = 0; i < 180; i++) {
                await new Promise((r) => setTimeout(r, 1000));
                try {
                    const r = await fetch(`${REDIS_URL}/get/job:${id}`, {
                        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
                        cache: 'no-store',
                    });
                    const data = await r.json() as { result?: string };
                    if (data.result) {
                        const job = JSON.parse(data.result) as { status: string; progress: number };
                        send({ type: 'status', status: job.status, progress: job.progress });
                        if (job.status === 'completed') {
                            send({ type: 'result', midiUrl: `https://blob.vercel-storage.com/results/${id}.mid` });
                            send({ type: 'complete', duration: i + 1 });
                            break;
                        }
                        if (job.status === 'failed' || job.status === 'cancelled') {
                            send({ type: 'error', status: job.status });
                            break;
                        }
                    }
                } catch (err) {
                    send({ type: 'error', detail: String(err) });
                }
            }
            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}