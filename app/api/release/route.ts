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
    const reasonCode = nonEmptyString(body.reason_code ?? body.reasonCode);

    if (draftId == null || !clientId || !reasonCode) {
        return jsonError(400, 'draft_id, client_id, reason_code are required');
    }

    const now = new Date();

    const draft = await prisma.draftPost.findUnique({ where: { id: draftId } });
    if (!draft) return jsonError(404, 'Draft not found');

    const can =
        (draft.state === DraftState.LEASED && draft.leaseOwner === clientId) ||
        (draft.state === DraftState.RESERVED && draft.reservedBy === clientId);

    if (!can) return jsonError(409, 'Cannot release (not owned)');

    await prisma.draftPost.update({
        where: { id: draftId },
        data: {
            state: DraftState.NEW,
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

    return NextResponse.json({ ok: true });
}
