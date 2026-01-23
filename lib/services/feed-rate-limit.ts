import { prisma } from '@/lib/prisma';

function envInt(name: string, fallback: number): number {
    const v = parseInt(process.env[name] || '', 10);
    return Number.isFinite(v) ? v : fallback;
}

export async function enforceFeedRateLimit(
    clientId: string,
    now = new Date()
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
    const minIntervalSec = envInt('FEED_MIN_INTERVAL_SECONDS', 30);
    const threshold = new Date(now.getTime() - minIntervalSec * 1000);

    await prisma.apiClient.upsert({
        where: { clientId },
        update: {},
        create: { clientId },
    });

    const updated = await prisma.apiClient.updateMany({
        where: {
            clientId,
            OR: [{ lastFeedAt: null }, { lastFeedAt: { lte: threshold } }],
        },
        data: { lastFeedAt: now },
    });

    if (updated.count === 0) {
        const rec = await prisma.apiClient.findUnique({ where: { clientId } });
        const last = rec?.lastFeedAt;
        const retryAfter = last
            ? Math.max(1, Math.ceil((minIntervalSec * 1000 - (now.getTime() - last.getTime())) / 1000))
            : minIntervalSec;
        return { ok: false, retryAfterSeconds: retryAfter };
    }
    return { ok: true };
}
