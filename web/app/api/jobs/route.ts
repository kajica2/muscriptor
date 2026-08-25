import { NextResponse } from 'next/server';

export const runtime = 'edge';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redis(cmd: string[]): Promise<unknown> {
    const r = await fetch(`${REDIS_URL}/${cmd.join('/')}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    return r.json();
}

export async function POST(req: Request) {
    const body = await req.json();
    const jobId = `job_${Math.random().toString(36).slice(2, 10)}`;
    const job = {
        id: jobId,
        status: 'pending',
        progress: 0,
        input: { blobUrl: body.blobUrl, filename: body.filename },
        options: body.options ?? {},
        createdAt: new Date().toISOString(),
    };
    await redis(['set', `job:${jobId}`, JSON.stringify(job)]);
    return NextResponse.json({ jobId, status: 'pending' }, { status: 202 });
}

export async function GET() {
    // No user scoping in scaffold — list everything (dev only).
    const r = await fetch(`${REDIS_URL}/scan/0/match/job:*/count/100`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const data = await r.json() as { result?: string[] };
    const ids = (data.result ?? []).filter((_, i) => i % 2 === 1);
    return NextResponse.json({ jobs: ids });
}