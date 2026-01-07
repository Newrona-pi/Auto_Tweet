import { NextRequest, NextResponse } from 'next/server';
import { collectRSSFeeds } from '@/lib/services/rss-collector';

export async function POST(request: NextRequest) {
    try {
        // Optional: Check endpoint secret if configured
        const secret = process.env.COLLECT_ENDPOINT_SECRET;
        if (secret) {
            const authHeader = request.headers.get('authorization');
            if (authHeader !== `Bearer ${secret}`) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        console.log('🚀 Starting RSS collection...');
        const result = await collectRSSFeeds();

        return NextResponse.json({
            success: true,
            message: `Collected ${result.newItems} new items`,
            data: result,
        });
    } catch (error) {
        console.error('Error collecting RSS feeds:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
