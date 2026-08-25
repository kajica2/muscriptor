import { NextResponse } from 'next/server';

export const runtime = 'edge';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const r = await fetch(`${REDIS_URL}/get/job:${id}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        cache: 'no-store',
    });
    const data = await r.json() as { result?: string };
    if (!data.result) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(JSON.parse(data.result));
}