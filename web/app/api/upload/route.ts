import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB — Vercel Blob limit

const ALLOWED = new Set([
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac',
    'audio/mp4', 'audio/x-m4a', 'audio/ogg',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
]);

export async function POST(req: Request) {
    const body = await req.json();
    const { filename, contentType, size } = body as {
        filename: string; contentType: string; size: number;
    };

    if (!filename || !contentType || typeof size !== 'number') {
        return NextResponse.json({ error: 'filename, contentType, size required' }, { status: 400 });
    }
    if (size > MAX_BYTES) {
        return NextResponse.json({ error: 'file too large (max 100 MB)' }, { status: 413 });
    }
    if (!ALLOWED.has(contentType)) {
        return NextResponse.json({ error: `unsupported content type: ${contentType}` }, { status: 415 });
    }

    const jobId = `job_${randomUUID().slice(0, 8)}`;
    const blob = await put(`uploads/${jobId}/${filename}`, new Blob(), {
        access: 'public',
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ uploadUrl: blob.url, blobUrl: blob.url, jobId });
}