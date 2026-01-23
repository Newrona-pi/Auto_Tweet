import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, jsonError, nonEmptyString } from '@/lib/api/api-helpers';
import { housekeepDraftPosts } from '@/lib/services/draft-housekeeping';
import { enforceFeedRateLimit } from '@/lib/services/feed-rate-limit';
import { DraftState } from '@prisma/client';

export const dynamic = 'force-dynamic';

function envInt(name: string, fallback: number): number {
    const v = parseInt(process.env[name] || '', 10);
    return Number.isFinite(v) ? v : fallback;
}

export async function GET(request: Request) {
    const auth = requireApiKey(request);
    if (auth) return auth;

    const { searchParams } = new URL(request.url);
    const clientId = nonEmptyString(searchParams.get('client_id'));
    if (!clientId) return jsonError(400, 'client_id is required');

    const now = new Date();

    await housekeepDraftPosts(now);

    const rl = await enforceFeedRateLimit(clientId, now);
    if (!rl.ok) {
        return NextResponse.json(
            { error: 'Too Many Requests', retry_after_seconds: rl.retryAfterSeconds },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
        );
    }

    const feedWindowHours = envInt('FEED_WINDOW_HOURS', 24);
    const windowStart = new Date(now.getTime() - feedWindowHours * 60 * 60 * 1000);

    const drafts = await prisma.draftPost.findMany({
        where: {
            state: DraftState.NEW,
            createdAt: { gte: windowStart },
            notAfter: { gte: now },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            summary: {
                include: {
                    topic: {
                        include: {
                            items: {
                                take: 1,
                                orderBy: { attentionScore: 'desc' },
                            },
                        },
                    },
                },
            },
        },
    });

    const responseData = drafts.map((d) => {
        const fallbackUrl = d.summary?.topic?.items?.[0]?.url ?? '';
        return {
            id: d.id,
            draft_id: d.id,
            content: d.content,
            source_url: d.sourceUrl || fallbackUrl,
            impact_score: d.impactScore,
            createdAt: d.createdAt.toISOString(),
            notAfter: d.notAfter ? d.notAfter.toISOString() : null,
        };
    });

    return NextResponse.json(responseData);
}
