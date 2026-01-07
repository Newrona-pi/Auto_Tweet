import { NextRequest, NextResponse } from 'next/server';
import { clusterItems } from '@/lib/services/clustering';
import { summarizeTopics } from '@/lib/services/llm-summarizer';

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Starting summarization...');

        // Step 1: Cluster items into topics
        const clusterResult = await clusterItems();

        // Step 2: Summarize top topics
        const summaryResult = await summarizeTopics(5);

        return NextResponse.json({
            success: true,
            message: `Created ${summaryResult.summariesCreated} summaries and ${summaryResult.draftsCreated} drafts`,
            data: {
                clustering: clusterResult,
                summarization: summaryResult,
            },
        });
    } catch (error) {
        console.error('Error summarizing topics:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
