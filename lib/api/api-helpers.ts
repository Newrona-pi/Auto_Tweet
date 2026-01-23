import { NextResponse } from 'next/server';

export function getApiKey(request: Request): string | null {
    const { searchParams } = new URL(request.url);
    return searchParams.get('key') || request.headers.get('x-api-key');
}

export function requireApiKey(request: Request): NextResponse | null {
    const key = getApiKey(request);
    if (!key || key !== process.env.FEED_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return null;
}

// Admin auth is enforced only if ADMIN_API_KEY is set
export function requireAdminKey(request: Request): NextResponse | null {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return null;

    const { searchParams } = new URL(request.url);
    const provided =
        searchParams.get('admin_key') ||
        request.headers.get('x-admin-key') ||
        request.headers.get('x-admin-api-key');

    if (!provided || provided !== adminKey) {
        return NextResponse.json({ error: 'Unauthorized (admin)' }, { status: 401 });
    }
    return null;
}

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
    return NextResponse.json({ error: message, ...(extra || {}) }, { status });
}

export async function readJson<T = any>(
    request: Request
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
    try {
        const data = (await request.json()) as T;
        return { ok: true, data };
    } catch {
        return { ok: false, response: jsonError(400, 'Invalid JSON') };
    }
}

export function toInt(value: unknown): number | null {
    const n =
        typeof value === 'number'
            ? value
            : typeof value === 'string'
                ? parseInt(value, 10)
                : NaN;
    return Number.isFinite(n) ? n : null;
}

export function nonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const s = value.trim();
    return s.length ? s : null;
}

export function parseIsoDate(value: unknown): Date | null {
    if (typeof value !== 'string') return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}
