import { NextRequest, NextResponse } from 'next/server';
import { collectRSSFeeds } from '@/lib/services/rss-collector';

export const runtime = 'nodejs';



export async function POST(request: NextRequest) {
    // Date Range Restriction Logic
    const now = new Date();
    // Check if within 2026-01-13 to 2026-01-16 (JST)
    // Note: Server time might be UTC, so we work with ISO strings or timestamp comparisons
    const startDate = new Date('2026-01-13T00:00:00+09:00');
    const endDate = new Date('2026-01-16T23:59:59+09:00');

    if (now < startDate || now > endDate) {
        console.log(`Skipping collection. Current time (${now.toISOString()}) is outside allowed range.`);
        return NextResponse.json({
            skipped: true,
            message: 'Collection skipped due to date restriction (2026/01/13-16 only).'
        });
    }

    console.log("ENV CHECK", {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        databaseUrlLen: process.env.DATABASE_URL?.length ?? 0,
        nodeEnv: process.env.NODE_ENV,
    });
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
