/**
 * Hugging Face Space client.
 *
 * Calls the Gradio /api/predict endpoint exposed by inference/app.py.
 * Supports a synthetic stub when HF_API_KEY is missing — useful for local dev.
 */
export interface TranscribeOptions {
    instruments?: string[];
    useSampling?: boolean;
    temperature?: number;
}

export interface TranscribeResult {
    midiUrl?: string;
    status: string;
    tracks?: Array<{ label: string; notes: number }>;
}

export async function callHfSpace(
    blobUrl: string,
    filename: string,
    options: TranscribeOptions,
): Promise<TranscribeResult> {
    const url = process.env.HF_SPACE_URL;
    const key = process.env.HF_API_KEY;
    if (!url) throw new Error('HF_SPACE_URL not configured');

    if (!key) {
        // Local-dev stub: pretend transcription succeeded immediately.
        return {
            status: 'stub:no-api-key',
            tracks: options.instruments?.map((label) => ({ label, notes: 16 })) ?? [],
        };
    }

    const r = await fetch(`${url}/api/predict`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            fn_index: 0,
            data: [blobUrl, options.instruments ?? [], options.useSampling ?? false, options.temperature ?? 1.0],
        }),
    });
    if (!r.ok) throw new Error(`HF Space ${r.status}`);
    const data = await r.json() as { data?: unknown[] };
    return { status: 'ok', tracks: [] };
}