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

        // 5. POST - DISABLED (PULL STRATEGY ADOPTED)
        // We no longer post directly to X API from here.
        // Instead, we just leave the draft as "posted: false" (or maybe we should mark it as ready? 
        // For now, let's just Log and NOT mark as posted, so the Pull API can pick it up).

        // Actually, if we don't mark as posted, the Pull API will pick it up.
        // But if we run this Autopilot again, it might pick the SAME draft again as "candidateDraft".
        // To avoid this loop, maybe we should have a 'status' field, but for now, 
        // let's assume the Pull API will run frequently enough, OR we just let it accumulate.

        // BETTER STRATEGY: 
        // The Prompt asked to "Generate Draft -> Save -> Ensure published is false".
        // This is already done by summarizeTopics.
        // So we just stop here.

        logs.push('Phase 4: Posting (SKIPPED)');
        logs.push('NOTE: Direct API posting is disabled. Draft is ready for Playwright Pull.');

        /* 
        // --- OLD POSTING LOGIC ---
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
        */

        return NextResponse.json({
            success: true,
            message: 'Autopilot completed (Generation only). Ready for Pull.',
            data: {
                draft: candidateDraft.content,
                status: 'pending_pull'
            },
            logs
        });

    } catch (error) {
        console.error('Autopilot error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
