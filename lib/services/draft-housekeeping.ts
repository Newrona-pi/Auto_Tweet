import { prisma } from '@/lib/prisma';
import { DraftState } from '@prisma/client';

function envInt(name: string, fallback: number): number {
    const v = parseInt(process.env[name] || '', 10);
    return Number.isFinite(v) ? v : fallback;
}

export async function housekeepDraftPosts(now = new Date()): Promise<void> {
    const failCooldownMin = envInt('FAIL_REOFFER_COOLDOWN_MINUTES', 10);
    const failThreshold = new Date(now.getTime() - failCooldownMin * 60 * 1000);

    // 1) Expire anything past notAfter
    await prisma.draftPost.updateMany({
        where: {
            state: { in: [DraftState.NEW, DraftState.LEASED, DraftState.RESERVED, DraftState.SNOOZED, DraftState.FAILED] },
            notAfter: { lt: now },
        },
        data: {
            state: DraftState.EXPIRED,
            leaseOwner: null,
            leaseUntil: null,
            reservedBy: null,
            publishAt: null,
            executeAt: null,
            mode: null,
            reserveUntil: null,
            snoozeUntil: null,
        },
    });

    // 2) Lease timeout -> NEW
    await prisma.draftPost.updateMany({
        where: { state: DraftState.LEASED, leaseUntil: { lt: now } },
        data: { state: DraftState.NEW, leaseOwner: null, leaseUntil: null },
    });

    // 3) Reserve timeout -> NEW
    await prisma.draftPost.updateMany({
        where: { state: DraftState.RESERVED, reserveUntil: { lt: now } },
        data: {
            state: DraftState.NEW,
            reservedBy: null,
            publishAt: null,
            executeAt: null,
            mode: null,
            reserveUntil: null,
        },
    });

    // 4) Snooze timeout -> NEW
    await prisma.draftPost.updateMany({
        where: { state: DraftState.SNOOZED, snoozeUntil: { lte: now }, notAfter: { gte: now } },
        data: { state: DraftState.NEW, snoozeUntil: null },
    });

    // 5) FAILED reoffer -> NEW (cooldown applied)
    await prisma.draftPost.updateMany({
        where: {
            state: DraftState.FAILED,
            retryCount: { lte: 1 },
            notAfter: { gte: now },
            lastErrorAt: { lte: failThreshold },
        },
        data: { state: DraftState.NEW },
    });

    // 6) FAILED too many -> QUARANTINED
    await prisma.draftPost.updateMany({
        where: { state: DraftState.FAILED, retryCount: { gte: 2 } },
        data: { state: DraftState.QUARANTINED },
    });
}
