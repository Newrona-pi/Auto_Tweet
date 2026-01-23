import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, jsonError, readJson, nonEmptyString, toInt, parseIsoDate } from '@/lib/api/api-helpers';
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
    const snoozeUntil = parseIsoDate(body.snoozeUntil);
    const reasonCode = nonEmptyString(body.reason_code ?? body.reasonCode);

    if (draftId == null || !clientId || !snoozeUntil || !reasonCode) {
        return jsonError(400, 'draft_id, client_id, snoozeUntil, reason_code are required');
    }

    const now = new Date();

    const draft = await prisma.draftPost.findUnique({ where: { id: draftId } });
    if (!draft) return jsonError(404, 'Draft not found');
    if (draft.notAfter && snoozeUntil > draft.notAfter) {
        return jsonError(409, 'snoozeUntil must be <= notAfter', { notAfter: draft.notAfter.toISOString() });
    }

    const can =
        draft.state === DraftState.NEW ||
        (draft.state === DraftState.LEASED && draft.leaseOwner === clientId) ||
        (draft.state === DraftState.RESERVED && draft.reservedBy === clientId);

    if (!can) return jsonError(409, 'Cannot snooze (not allowed for this state/owner)');

    await prisma.draftPost.update({
        where: { id: draftId },
        data: {
            state: DraftState.SNOOZED,
            snoozeUntil,
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
