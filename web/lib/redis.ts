/**
 * Upstash Redis REST client.
 * Thin wrapper — most routes use fetch directly to keep edge-bundle small.
 */
export async function redisSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error('Upstash not configured');
    const cmd = ttlSeconds
        ? ['set', key, JSON.stringify(value), 'EX', String(ttlSeconds)]
        : ['set', key, JSON.stringify(value)];
    await fetch(`${url}/${cmd.map(encodeURIComponent).join('/')}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function redisGet<T = unknown>(key: string): Promise<T | null> {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
    });
    const data = (await r.json()) as { result?: string };
    return data.result ? (JSON.parse(data.result) as T) : null;
}