import { NextRequest, NextResponse } from 'next/server';
import { collectRSSFeeds } from '@/lib/services/rss-collector';
import { clusterItems } from '@/lib/services/clustering';
import { summarizeTopics } from '@/lib/services/llm-summarizer';
import { postToX } from '@/lib/services/poster';
import { prisma } from '@/lib/prisma';

// Secret key to prevent unauthorized access (simple protection)
// In production, this should be an environment variable like CRON_SECRET
const AUTH_KEY = 'autopilot-secret-key-123';

export async function GET(request: NextRequest) {
    return handleAutopilot(request);
}

export async function POST(request: NextRequest) {
    return handleAutopilot(request);
}

async function handleAutopilot(request: NextRequest) {
    try {
        // 1. Authentication Check
        const authHeader = request.headers.get('Authorization');
        const urlParams = request.nextUrl.searchParams;
        const key = authHeader?.replace('Bearer ', '') || urlParams.get('key');

        if (key !== AUTH_KEY) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        console.log('🤖 Autopilot sequence started...');
        const logs: string[] = [];

        // 2. COLLECT
        logs.push('Phase 1: Collection');
        // Collect from last 6 hours by default to ensure freshness
        const last6Hours = new Date(Date.now() - 6 * 60 * 60 * 1000);
        const collectionResult = await collectRSSFeeds(last6Hours);
        logs.push(`Collected ${collectionResult.newItems} new items.`);

        // 3. GENERATE (Cluster -> Summarize)
        logs.push('Phase 2: Generation');
        const clusterResult = await clusterItems();
        logs.push(`Clustered unclustered items into ${clusterResult.topicsCreated} new topics.`);

        // We want to generate drafts prioritizing freshness (which is now default in summarizeTopics)
        const summaryResult = await summarizeTopics(5);
        logs.push(`Generated ${summaryResult.summariesCreated} new summaries and ${summaryResult.draftsCreated} drafts.`);

        if (summaryResult.draftsCreated === 0) {
            return NextResponse.json({
                success: true,
                message: 'No new drafts could be created (maybe no new fresh topics).',
                logs
            });
        }

        // 4. SELECT (Auto-Selection)
        logs.push('Phase 3: Selection');

        // Strategy: Get the latest created UNPOSTED draft
        // The summarization logic we just ran creates drafts for "fresh" topics.
        // We pick the very first one that hasn't been posted yet.
        const candidateDraft = await prisma.draftPost.findFirst({
            where: { posted: false },
            include: { summary: { include: { topic: true } } },
            orderBy: { createdAt: 'desc' }, // Latest draft first
        });

        if (!candidateDraft) {
            return NextResponse.json({
                success: true,
                message: 'Drafts were created but could not be retrieved?',
                logs
            });
        }

        logs.push(`Selected draft ID ${candidateDraft.id} about "${candidateDraft.summary.topic.name}"`);

        // 5. POST
        logs.push('Phase 4: Posting');
        const postResult = await postToX(candidateDraft.content);

        if (postResult.success) {
            // Mark as posted
            await prisma.draftPost.update({
                where: { id: candidateDraft.id },
                data: {
                    posted: true,
                    postedAt: new Date()
                }
            });
            logs.push(`✅ Posted successfully! Post ID: ${postResult.id}`);

            return NextResponse.json({
                success: true,
                message: 'Autopilot completed successfully',
                data: {
                    draft: candidateDraft.content,
                    postId: postResult.id
                },
                logs
            });
        } else {
            logs.push(`❌ Posting failed: ${JSON.stringify(postResult.error)}`);
            return NextResponse.json({
                success: false,
                message: 'Posting failed',
                error: postResult.error,
                logs
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Autopilot error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
