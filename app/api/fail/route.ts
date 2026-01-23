import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, jsonError, readJson, nonEmptyString, toInt } from '@/lib/api/api-helpers';
import { housekeepDraftPosts } from '@/lib/services/draft-housekeeping';
import { DraftState } from '@prisma/client';

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
    const errorCode = nonEmptyString(body.error_code ?? body.errorCode);
    const reasonCode = nonEmptyString(body.reason_code ?? body.reasonCode);
    const retryable = typeof body.retryable === 'boolean' ? body.retryable : null;

    if (draftId == null || !clientId || !errorCode || !reasonCode || retryable == null) {
        return jsonError(400, 'draft_id, client_id, error_code, reason_code, retryable are required');
    }

    const now = new Date();

    const draft = await prisma.draftPost.findUnique({ where: { id: draftId } });
    if (!draft) return jsonError(404, 'Draft not found');

    const can =
        (draft.state === DraftState.RESERVED && draft.reservedBy === clientId) ||
        (draft.state === DraftState.LEASED && draft.leaseOwner === clientId);

    if (!can) return jsonError(409, 'Cannot fail (not reserved/leased by this client)');

    const nextState = retryable ? DraftState.FAILED : DraftState.QUARANTINED;

    await prisma.draftPost.update({
        where: { id: draftId },
        data: {
            state: nextState,
            retryCount: retryable ? (draft.retryCount + 1) : draft.retryCount,
            lastErrorCode: errorCode,
            lastErrorAt: now,
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

    return NextResponse.json({ ok: true, state: nextState });
}
