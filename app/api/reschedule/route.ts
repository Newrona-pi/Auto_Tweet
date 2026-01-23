import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, jsonError, readJson, nonEmptyString, toInt, parseIsoDate } from '@/lib/api/api-helpers';
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
    const publishAt = parseIsoDate(body.publishAt);
    const executeAt = parseIsoDate(body.executeAt);
    const reasonCode = nonEmptyString(body.reason_code ?? body.reasonCode);

    if (draftId == null || !clientId || !publishAt || !executeAt || !reasonCode) {
        return jsonError(400, 'draft_id, client_id, publishAt, executeAt, reason_code are required');
    }

    const now = new Date();

    const draft = await prisma.draftPost.findUnique({ where: { id: draftId } });
    if (!draft) return jsonError(404, 'Draft not found');
    if (!draft.notAfter) return jsonError(409, 'Draft notAfter is missing');
    if (draft.notAfter < now) return jsonError(409, 'Draft expired');

    if (publishAt > draft.notAfter || executeAt > draft.notAfter) {
        return jsonError(409, 'publishAt/executeAt must be <= notAfter', { notAfter: draft.notAfter.toISOString() });
    }

    const reserveGraceMin = envInt('RESERVE_GRACE_MINUTES', 60);
    const reserveUntil = new Date(executeAt.getTime() + reserveGraceMin * 60 * 1000);

    const updated = await prisma.draftPost.updateMany({
        where: { id: draftId, state: DraftState.RESERVED, reservedBy: clientId },
        data: { publishAt, executeAt, reserveUntil },
    });

    if (updated.count === 0) return jsonError(409, 'Cannot reschedule (not reserved by this client)');
    return NextResponse.json({ ok: true, reserveUntil: reserveUntil.toISOString() });
}
