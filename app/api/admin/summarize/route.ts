import { NextRequest, NextResponse } from 'next/server';
import { clusterItems } from '@/lib/services/clustering';
import { summarizeTopics } from '@/lib/services/llm-summarizer';
import { requireAdminKey } from '@/lib/api/api-helpers';
import { housekeepDraftPosts } from '@/lib/services/draft-housekeeping';

export async function POST(request: NextRequest) {
    const admin = requireAdminKey(request);
    if (admin) return admin;

    try {
        // Run housekeeping once at the start (as per user request)
        await housekeepDraftPosts(new Date());

        console.log('Starting summarization...');
        const clusterResult = await clusterItems();
        const summaryResult = await summarizeTopics(5);
        return NextResponse.json({
            success: true,
            message: `Created ${summaryResult.summariesCreated} summaries and ${summaryResult.draftsCreated} drafts`,
            data: { clustering: clusterResult, summarization: summaryResult },
        });
    } catch (error) {
        console.error('Error summarizing topics:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
