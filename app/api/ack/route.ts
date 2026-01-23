import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, jsonError, readJson, nonEmptyString, toInt } from '@/lib/api/api-helpers';
import { housekeepDraftPosts } from '@/lib/services/draft-housekeeping';
import { AckKind, DraftState } from '@prisma/client';

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
    const ackKindStr = nonEmptyString(body.ack_kind ?? body.ackKind);
    const resultRef = nonEmptyString(body.result_ref ?? body.resultRef);
    const reasonCode = nonEmptyString(body.reason_code ?? body.reasonCode);

    if (draftId == null || !clientId || !ackKindStr || !resultRef || !reasonCode) {
        return jsonError(400, 'draft_id, client_id, ack_kind, result_ref, reason_code are required');
    }

    const ackKind = ackKindStr === 'PUBLISHED' ? AckKind.PUBLISHED : ackKindStr === 'SCHEDULED' ? AckKind.SCHEDULED : null;
    if (!ackKind) return jsonError(400, 'ack_kind must be PUBLISHED or SCHEDULED');

    const now = new Date();

    const draft = await prisma.draftPost.findUnique({ where: { id: draftId } });
    if (!draft) return jsonError(404, 'Draft not found');

    const can =
        (draft.state === DraftState.RESERVED && draft.reservedBy === clientId) ||
        (draft.state === DraftState.LEASED && draft.leaseOwner === clientId);

    if (!can) return jsonError(409, 'Cannot ack (not reserved/leased by this client)');

    await prisma.draftPost.update({
        where: { id: draftId },
        data: {
            state: DraftState.ACKED,
            ackKind,
            resultRef,
            posted: true,
            postedAt: ackKind === AckKind.PUBLISHED ? now : null,
            leaseOwner: null,
            leaseUntil: null,
            reservedBy: null,
            reserveUntil: null,
        },
    });

    return NextResponse.json({ ok: true });
}
