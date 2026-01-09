import { NextRequest, NextResponse } from 'next/server';
import { collectRSSFeeds } from '@/lib/services/rss-collector';

export const runtime = 'nodejs';



export async function POST(request: NextRequest) {
    console.log("ENV CHECK", { hasDatabaseUrl: !!process.env.DATABASE_URL });

    try {
        // 1. Determine time range (hours)
        // Default: 1 hour (per user request)
        let hours = 1;

        // Check Query Param first
        const { searchParams } = new URL(request.url);
        if (searchParams.has('hours')) {
            hours = parseInt(searchParams.get('hours') || '1', 10);
        } else {
            // Check Body
            try {
                const body = await request.clone().json();
                if (body && body.hours) {
                    hours = parseInt(body.hours, 10);
                }
            } catch (e) {
                // Ignore body parse errors (e.g. from Cron)
            }
        }

        // Calculate cutoff date
        const since = new Date();
        since.setHours(since.getHours() - hours);

        console.log(`🚀 Starting RSS collection (Filter: last ${hours} hours, since ${since.toISOString()})...`);

        // 2. Check secret (Optional)
        const secret = process.env.COLLECT_ENDPOINT_SECRET;
        if (secret) {
            const authHeader = request.headers.get('authorization');
            if (authHeader !== `Bearer ${secret}`) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        // 3. Execute Collection with filter
        const result = await collectRSSFeeds(since);

        return NextResponse.json({
            success: true,
            filter: { hours, since: since.toISOString() },
            message: `Collected ${result.newItems} new items (Last ${hours}h)`,
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
