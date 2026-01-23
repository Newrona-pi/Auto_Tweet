import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, jsonError, readJson, nonEmptyString, toInt } from '@/lib/api/api-helpers';
import { housekeepDraftPosts } from '@/lib/services/draft-housekeeping';
import { DraftState } from '@prisma/client';

function envInt(name: string, fallback: number): number {
    const v = parseInt(process.env[name] || '', 10);
    return Number.isFinite(v) ? v : fallback;
}

export async function POST(request: Request) {
    const auth = requireApiKey(request);
    if (auth) return auth;

    // Housekeeping first
    await housekeepDraftPosts(new Date());

    const bodyRes = await readJson<any>(request);
    if (!bodyRes.ok) return bodyRes.response;
    const body = bodyRes.data;

    const draftId = toInt(body.draft_id ?? body.id);
    const clientId = nonEmptyString(body.client_id ?? body.clientId);
    if (draftId == null || !clientId) return jsonError(400, 'draft_id and client_id are required');

    const now = new Date();

    const leaseTtlMin = envInt('LEASE_TTL_MINUTES', 30);
    const leaseUntil = new Date(now.getTime() + leaseTtlMin * 60 * 1000);

    const updated = await prisma.draftPost.updateMany({
        where: {
            id: draftId,
            state: DraftState.LEASED,
            leaseOwner: clientId,
            leaseUntil: { gte: now },
            notAfter: { gte: now },
        },
        data: { leaseUntil },
    });

    if (updated.count === 0) return jsonError(409, 'Cannot renew lease');
    return NextResponse.json({ ok: true, leaseUntil: leaseUntil.toISOString() });
}
