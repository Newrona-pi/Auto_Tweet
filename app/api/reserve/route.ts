import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, jsonError, readJson, nonEmptyString, toInt, parseIsoDate } from '@/lib/api/api-helpers';
import { housekeepDraftPosts } from '@/lib/services/draft-housekeeping';
import { DraftMode, DraftState } from '@prisma/client';

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
    const modeStr = nonEmptyString(body.mode);
    const publishAt = parseIsoDate(body.publishAt);
    const executeAt = parseIsoDate(body.executeAt);

    if (draftId == null || !clientId || !modeStr || !publishAt || !executeAt) {
        return jsonError(400, 'draft_id, client_id, mode, publishAt, executeAt are required');
    }

    const mode = modeStr === 'DIRECT' ? DraftMode.DIRECT : modeStr === 'SCHEDULE' ? DraftMode.SCHEDULE : null;
    if (!mode) return jsonError(400, 'mode must be DIRECT or SCHEDULE');

    if (mode === DraftMode.DIRECT && publishAt.getTime() !== executeAt.getTime()) {
        return jsonError(400, 'DIRECT requires executeAt == publishAt');
    }
    if (mode === DraftMode.SCHEDULE && !(executeAt.getTime() < publishAt.getTime())) {
        return jsonError(400, 'SCHEDULE requires executeAt < publishAt');
    }

    const now = new Date();

    const draft = await prisma.draftPost.findUnique({ where: { id: draftId } });
    if (!draft) return jsonError(404, 'Draft not found');
    if (!draft.notAfter) return jsonError(409, 'Draft notAfter is missing (regen drafts after deploy)');
    if (draft.notAfter < now) return jsonError(409, 'Draft expired');

    if (publishAt > draft.notAfter || executeAt > draft.notAfter) {
        return jsonError(409, 'publishAt/executeAt must be <= notAfter', { notAfter: draft.notAfter.toISOString() });
    }

    const reserveGraceMin = envInt('RESERVE_GRACE_MINUTES', 60);
    const reserveUntil = new Date(executeAt.getTime() + reserveGraceMin * 60 * 1000);

    if (draft.state === DraftState.RESERVED && draft.reservedBy === clientId &&
        draft.publishAt?.getTime() === publishAt.getTime() && draft.executeAt?.getTime() === executeAt.getTime()) {
        return NextResponse.json({ ok: true, reserveUntil: draft.reserveUntil?.toISOString() ?? null });
    }

    const updated = await prisma.draftPost.updateMany({
        where: {
            id: draftId,
            state: DraftState.LEASED,
            leaseOwner: clientId,
            leaseUntil: { gte: now },
            notAfter: { gte: now },
        },
        data: {
            state: DraftState.RESERVED,
            reservedBy: clientId,
            mode,
            publishAt,
            executeAt,
            reserveUntil,
            leaseOwner: null,
            leaseUntil: null,
        },
    });

    if (updated.count === 0) return jsonError(409, 'Cannot reserve (not leased by this client)');
    return NextResponse.json({ ok: true, reserveUntil: reserveUntil.toISOString() });
}
